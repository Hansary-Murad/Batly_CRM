require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const pool = require('./config/db');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'batly-secret';

// AUTH MIDDLEWARE
const auth = async (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'Требуется авторизация' });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Невалидный токен' });
  }
};

// HEALTH
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// LOGIN
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log('🔐 Login attempt:', email);

    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1 AND is_active = TRUE',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Пользователь не найден' });
    }

    const user = result.rows[0];
    const isValid = await bcrypt.compare(password, user.password_hash);

    if (!isValid) {
      return res.status(401).json({ error: 'Неверный пароль' });
    }

    await pool.query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRY || '24h' }
    );

    console.log('✅ Login successful!');
    res.json({
      token,
      user: { id: user.id, email: user.email, role: user.role, position: user.position }
    });
  } catch (err) {
    console.error('❌ Login error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// ================================================================
// DASHBOARD
// ================================================================
app.get('/api/dashboard', auth, async (req, res) => {
  try {
    const debtResult = await pool.query(`
      SELECT 
        COALESCE(SUM(CASE WHEN currency = 'TMT' THEN amount - COALESCE(paid_amount, 0) ELSE 0 END), 0) as debt_tmt,
        COALESCE(SUM(CASE WHEN currency = 'USD' THEN amount - COALESCE(paid_amount, 0) ELSE 0 END), 0) as debt_usd
      FROM invoices
      WHERE status != 'paid'
    `);

    const transitResult = await pool.query(`
      SELECT 
        COALESCE(SUM(CASE WHEN currency = 'TMT' THEN purchase_cost + COALESCE(logistics_cost, 0) + COALESCE(customs_fee, 0) ELSE 0 END), 0) as transit_tmt,
        COALESCE(SUM(CASE WHEN currency = 'USD' THEN purchase_cost + COALESCE(logistics_cost, 0) + COALESCE(customs_fee, 0) ELSE 0 END), 0) as transit_usd
      FROM shipments
      WHERE status IN ('ordered', 'in_transit', 'customs')
    `);

    const profitResult = await pool.query(`
      WITH monthly_revenue AS (
        SELECT 
          COALESCE(SUM(CASE WHEN currency = 'TMT' THEN amount ELSE 0 END), 0) as rev_tmt,
          COALESCE(SUM(CASE WHEN currency = 'USD' THEN amount ELSE 0 END), 0) as rev_usd
        FROM invoices
        WHERE status = 'paid'
          AND EXTRACT(MONTH FROM payment_date) = EXTRACT(MONTH FROM CURRENT_DATE)
          AND EXTRACT(YEAR FROM payment_date) = EXTRACT(YEAR FROM CURRENT_DATE)
      ),
      monthly_expenses AS (
        SELECT 
          COALESCE(SUM(CASE WHEN currency = 'TMT' THEN purchase_cost + COALESCE(logistics_cost, 0) + COALESCE(customs_fee, 0) ELSE 0 END), 0) as exp_tmt,
          COALESCE(SUM(CASE WHEN currency = 'USD' THEN purchase_cost + COALESCE(logistics_cost, 0) + COALESCE(customs_fee, 0) ELSE 0 END), 0) as exp_usd
        FROM shipments
        WHERE status = 'arrived'
          AND EXTRACT(MONTH FROM actual_arrival) = EXTRACT(MONTH FROM CURRENT_DATE)
          AND EXTRACT(YEAR FROM actual_arrival) = EXTRACT(YEAR FROM CURRENT_DATE)
      )
      SELECT 
        COALESCE(rev_tmt - exp_tmt, 0) as profit_tmt,
        COALESCE(rev_usd - exp_usd, 0) as profit_usd
      FROM monthly_revenue, monthly_expenses
    `);

    const overdueResult = await pool.query(`
      SELECT COUNT(*) as count
      FROM invoices
      WHERE status != 'paid'
        AND due_date < CURRENT_DATE
        AND (amount - COALESCE(paid_amount, 0)) > 0
    `);

    res.json({
      totalDebt: {
        tmt: parseFloat(debtResult.rows[0]?.debt_tmt) || 0,
        usd: parseFloat(debtResult.rows[0]?.debt_usd) || 0
      },
      goodsInTransit: {
        tmt: parseFloat(transitResult.rows[0]?.transit_tmt) || 0,
        usd: parseFloat(transitResult.rows[0]?.transit_usd) || 0
      },
      monthlyProfit: {
        tmt: parseFloat(profitResult.rows[0]?.profit_tmt) || 0,
        usd: parseFloat(profitResult.rows[0]?.profit_usd) || 0
      },
      overduePayments: parseInt(overdueResult.rows[0]?.count) || 0
    });
  } catch (err) {
    console.error('❌ Dashboard error:', err);
    res.status(500).json({ error: 'Ошибка загрузки дашборда' });
  }
});

// ================================================================
// CLIENTS
// ================================================================
app.get('/api/clients', auth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        c.*,
        COALESCE(
          (SELECT SUM(i.amount - i.paid_amount) 
           FROM invoices i
           JOIN orders o ON i.order_id = o.id
           WHERE o.client_id = c.id AND i.status != 'paid'
          ), 0
        ) as current_debt
      FROM clients c
      WHERE c.is_active = TRUE
      ORDER BY c.company_name ASC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('❌ Get clients error:', err);
    res.status(500).json({ error: 'Ошибка загрузки клиентов' });
  }
});

app.post('/api/clients', auth, async (req, res) => {
  try {
    const { company_name, contact_person, phone, email, tax_id, credit_limit } = req.body;

    if (!company_name) {
      return res.status(400).json({ error: 'Название компании обязательно' });
    }

    const companyResult = await pool.query(
      'SELECT id FROM companies WHERE name = $1',
      ['Batly Enterprise']
    );

    const companyId = companyResult.rows[0]?.id || 1;

    const result = await pool.query(
      `INSERT INTO clients (company_id, company_name, contact_person, phone, email, tax_id, credit_limit, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE)
       RETURNING *`,
      [companyId, company_name, contact_person, phone, email, tax_id, credit_limit || 0]
    );

    console.log(`✅ Client created: ${company_name}`);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('❌ Create client error:', err);
    res.status(500).json({ error: 'Ошибка создания клиента' });
  }
});

app.delete('/api/clients/:id', auth, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { id } = req.params;

    const checkResult = await client.query(
      'SELECT current_debt FROM clients WHERE id = $1 AND is_active = TRUE',
      [id]
    );

    if (checkResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Клиент не найден' });
    }

    const debt = parseFloat(checkResult.rows[0].current_debt) || 0;

    if (debt > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: `Нельзя удалить клиента с долгами (${debt})` });
    }

    await client.query(
      'UPDATE clients SET is_active = FALSE, deleted_at = NOW() WHERE id = $1',
      [id]
    );

    await client.query('COMMIT');
    res.json({ message: 'Клиент скрыт' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Delete client error:', err);
    res.status(500).json({ error: 'Ошибка удаления клиента' });
  } finally {
    client.release();
  }
});

// ================================================================
// ORDERS
// ================================================================
app.get('/api/orders', auth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        o.*,
        c.company_name as client_name
      FROM orders o
      JOIN clients c ON o.client_id = c.id
      WHERE c.is_active = TRUE
      ORDER BY o.order_date DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('❌ Get orders error:', err);
    res.status(500).json({ error: 'Ошибка загрузки заказов' });
  }
});

app.post('/api/orders', auth, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { client_id, items, notes, currency = 'USD' } = req.body;

    if (!client_id || !items || items.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Клиент и позиции обязательны' });
    }

    const clientCheck = await client.query(
      'SELECT id FROM clients WHERE id = $1 AND is_active = TRUE',
      [client_id]
    );

    if (clientCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Клиент не найден' });
    }

    let totalAmount = 0;
    for (const item of items) {
      totalAmount += (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0);
    }

    const orderResult = await client.query(
      `INSERT INTO orders (client_id, total_amount, currency, status, notes, order_date)
       VALUES ($1, $2, $3, 'pending', $4, CURRENT_DATE)
       RETURNING *`,
      [client_id, totalAmount, currency, notes]
    );

    const orderId = orderResult.rows[0].id;

    for (const item of items) {
      const qty = parseFloat(item.quantity) || 0;
      const price = parseFloat(item.unit_price) || 0;
      const totalPrice = qty * price;

      await client.query(
        `INSERT INTO order_items (order_id, name, quantity, unit, unit_price, total_price)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [orderId, item.name || 'Товар', qty, item.unit || 'pcs', price, totalPrice]
      );
    }

    await client.query(
      `INSERT INTO invoices (order_id, client_id, amount, currency, status, issue_date, due_date)
       VALUES ($1, $2, $3, $4, 'pending', CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days')`,
      [orderId, client_id, totalAmount, currency]
    );

    await client.query('COMMIT');

    const result = await client.query('SELECT * FROM orders WHERE id = $1', [orderId]);

    console.log(`✅ Order created: #${orderId}`);
    res.status(201).json({
      message: 'Order created',
      order: result.rows[0]
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Create order error:', err);
    res.status(500).json({ error: 'Ошибка создания заказа' });
  } finally {
    client.release();
  }
});

// ================================================================
// INVOICES
// ================================================================
app.get('/api/invoices', auth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        i.*,
        c.company_name as client_name
      FROM invoices i
      JOIN orders o ON i.order_id = o.id
      JOIN clients c ON o.client_id = c.id
      WHERE c.is_active = TRUE
      ORDER BY i.due_date ASC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('❌ Get invoices error:', err);
    res.status(500).json({ error: 'Ошибка загрузки счетов' });
  }
});

// ================================================================
// PAY INVOICE
// ================================================================
app.put('/api/invoices/pay/:id', auth, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const { paid_amount } = req.body;

    const invoiceResult = await client.query(
      'SELECT * FROM invoices WHERE id = $1 AND status != $2',
      [id, 'paid']
    );

    if (invoiceResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Счёт не найден или уже оплачен' });
    }

    const invoice = invoiceResult.rows[0];
    const amount = parseFloat(paid_amount) || invoice.amount;

    await client.query(
      `UPDATE invoices 
       SET paid_amount = $1, status = 'paid', payment_date = CURRENT_DATE
       WHERE id = $2`,
      [amount, id]
    );

    await client.query(
      `UPDATE clients 
       SET current_debt = GREATEST(0, current_debt - $1)
       WHERE id = $2`,
      [amount, invoice.client_id]
    );

    await client.query('COMMIT');

    console.log(`✅ Invoice #${id} paid: $${amount}`);
    res.json({ message: 'Payment registered', status: 'paid' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Pay invoice error:', err);
    res.status(500).json({ error: 'Ошибка оплаты' });
  } finally {
    client.release();
  }
});

// ================================================================
// SHIPMENTS
// ================================================================
app.get('/api/shipments', auth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        s.*,
        c.company_name as client_name
      FROM shipments s
      JOIN orders o ON s.order_id = o.id
      JOIN clients c ON o.client_id = c.id
      WHERE c.is_active = TRUE
      ORDER BY s.expected_arrival ASC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('❌ Get shipments error:', err);
    res.status(500).json({ error: 'Ошибка загрузки поставок' });
  }
});

app.post('/api/shipments', auth, async (req, res) => {
  try {
    const { order_id, supplier_name, purchase_cost, logistics_cost, customs_fee, currency, tracking_number, expected_arrival } = req.body;

    if (!order_id || !supplier_name || !purchase_cost) {
      return res.status(400).json({ error: 'Заказ, поставщик и стоимость обязательны' });
    }

    const result = await pool.query(
      `INSERT INTO shipments (order_id, supplier_name, purchase_cost, logistics_cost, customs_fee, currency, tracking_number, expected_arrival, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'ordered')
       RETURNING *`,
      [order_id, supplier_name, purchase_cost, logistics_cost || 0, customs_fee || 0, currency || 'USD', tracking_number, expected_arrival]
    );

    console.log(`✅ Shipment created: #${result.rows[0].id}`);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('❌ Create shipment error:', err);
    res.status(500).json({ error: 'Ошибка создания поставки' });
  }
});

// ================================================================
// UPDATE SHIPMENT STATUS
// ================================================================
app.put('/api/shipments/:id/status', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['ordered', 'in_transit', 'customs', 'arrived', 'delivered'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Неверный статус' });
    }

    let updateQuery = 'UPDATE shipments SET status = $1, updated_at = NOW()';
    const params = [status, id];

    if (status === 'arrived') {
      updateQuery += ', actual_arrival = CURRENT_DATE';
    }

    updateQuery += ' WHERE id = $2 RETURNING *';

    const result = await pool.query(updateQuery, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Поставка не найдена' });
    }

    console.log(`✅ Shipment #${id} status updated to: ${status}`);
    res.json({ message: 'Status updated', shipment: result.rows[0] });
  } catch (err) {
    console.error('❌ Update shipment status error:', err);
    res.status(500).json({ error: 'Ошибка обновления статуса' });
  }
});

// ================================================================
// PRODUCTS
// ================================================================
app.get('/api/products', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM products WHERE is_active = TRUE ORDER BY name ASC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('❌ Get products error:', err);
    res.status(500).json({ error: 'Ошибка загрузки товаров' });
  }
});

// ================================================================
// ✅ USERS (УПРАВЛЕНИЕ ПЕРСОНАЛОМ) - ДОБАВЛЕНО
// ================================================================

// Получить всех сотрудников (только админ)
app.get('/api/users', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Доступ запрещён' });
    }

    const result = await pool.query(`
      SELECT 
        id, 
        email, 
        role, 
        position, 
        is_active,
        last_login,
        created_at
      FROM users 
      ORDER BY id ASC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('❌ Get users error:', err);
    res.status(500).json({ error: 'Ошибка загрузки сотрудников' });
  }
});

// Создать сотрудника (только админ)
app.post('/api/users', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Доступ запрещён' });
    }

    const { email, password, role = 'manager', position = 'Сотрудник' } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email и пароль обязательны' });
    }

    const validRoles = ['admin', 'manager', 'viewer'];
    const normalizedRole = validRoles.includes(role) ? role : 'manager';
    
    const companyResult = await pool.query(
      'SELECT id FROM companies WHERE name = $1',
      ['Batly Enterprise']
    );
    const companyId = companyResult.rows[0]?.id || 1;

    const passwordHash = await bcrypt.hash(password, 10);
    
    const result = await pool.query(
      `INSERT INTO users (company_id, email, password_hash, role, position, is_active)
       VALUES ($1, $2, $3, $4, $5, TRUE)
       RETURNING id, email, role, position`,
      [companyId, email, passwordHash, normalizedRole, position]
    );
    
    console.log(`✅ New user created: ${email} (${normalizedRole})`);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ error: 'Email уже занят' });
    }
    console.error('❌ Create user error:', err);
    res.status(500).json({ error: 'Ошибка создания сотрудника' });
  }
});

// Обновить сотрудника (только админ)
app.put('/api/users/:id', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Доступ запрещён' });
    }

    const { id } = req.params;
    const { role, position } = req.body;

    const validRoles = ['admin', 'manager', 'viewer'];
    if (role && !validRoles.includes(role)) {
      return res.status(400).json({ error: 'Недопустимая роль' });
    }

    const result = await pool.query(
      `UPDATE users 
       SET role = COALESCE($1, role), 
           position = COALESCE($2, position),
           updated_at = NOW()
       WHERE id = $3 AND id != $4
       RETURNING id, email, role, position`,
      [role, position, id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    
    console.log(`✅ User #${id} updated: role=${role || 'unchanged'}, position=${position || 'unchanged'}`);
    res.json(result.rows[0]);
  } catch (err) {
    console.error('❌ Update user error:', err);
    res.status(500).json({ error: 'Ошибка обновления сотрудника' });
  }
});

// Удалить сотрудника (только админ)
app.delete('/api/users/:id', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Доступ запрещён' });
    }

    const userId = parseInt(req.params.id);
    
    if (userId === req.user.id) {
      return res.status(400).json({ error: 'Нельзя удалить свой аккаунт' });
    }

    const checkResult = await pool.query(
      'SELECT id FROM users WHERE id = $1',
      [userId]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    await pool.query(
      'UPDATE users SET is_active = FALSE, deleted_at = NOW() WHERE id = $1',
      [userId]
    );

    console.log(`✅ User #${userId} deleted by admin #${req.user.id}`);
    res.json({ message: 'Сотрудник удалён' });
  } catch (err) {
    console.error('❌ Delete user error:', err);
    res.status(500).json({ error: 'Ошибка удаления сотрудника' });
  }
});

// ================================================================
// ANALYTICS
// ================================================================
app.get('/api/analytics/revenue-trend', auth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        TO_CHAR(DATE_TRUNC('month', payment_date), 'YYYY-MM') as month,
        COALESCE(SUM(amount), 0) as revenue
      FROM invoices
      WHERE status = 'paid'
        AND payment_date >= CURRENT_DATE - INTERVAL '6 months'
      GROUP BY DATE_TRUNC('month', payment_date)
      ORDER BY month ASC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('❌ Revenue trend error:', err);
    res.status(500).json({ error: 'Ошибка загрузки динамики' });
  }
});

app.get('/api/analytics/top-clients', auth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        c.company_name,
        COUNT(o.id) as total_orders,
        COALESCE(SUM(i.amount), 0) as total_revenue
      FROM clients c
      LEFT JOIN orders o ON c.id = o.client_id
      LEFT JOIN invoices i ON o.id = i.order_id
      WHERE i.status = 'paid'
        AND c.is_active = TRUE
      GROUP BY c.id, c.company_name
      ORDER BY total_revenue DESC
      LIMIT 5
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('❌ Top clients error:', err);
    res.status(500).json({ error: 'Ошибка загрузки топ-клиентов' });
  }
});

app.get('/api/analytics/top-products', auth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        oi.name as product_name,
        SUM(oi.quantity) as total_sold,
        SUM(oi.total_price) as total_revenue
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      JOIN clients c ON o.client_id = c.id
      WHERE c.is_active = TRUE
      GROUP BY oi.name
      ORDER BY total_revenue DESC
      LIMIT 10
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('❌ Top products error:', err);
    res.status(500).json({ error: 'Ошибка загрузки топ-товаров' });
  }
});

app.get('/api/analytics/logistics-stats', auth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_shipments,
        COALESCE(ROUND(AVG(EXTRACT(EPOCH FROM (actual_arrival - expected_arrival)) / 86400)::numeric, 1), 0) as avg_delay_days,
        COALESCE(ROUND(SUM(CASE WHEN actual_arrival <= expected_arrival THEN 1 ELSE 0 END)::numeric * 100.0 / NULLIF(COUNT(*), 0), 1), 0) as on_time_percentage
      FROM shipments
      WHERE status = 'arrived'
        AND actual_arrival IS NOT NULL
        AND expected_arrival IS NOT NULL
    `);
    res.json(result.rows[0] || { total_shipments: 0, avg_delay_days: 0, on_time_percentage: 0 });
  } catch (err) {
    console.error('❌ Logistics stats error:', err);
    res.status(500).json({ error: 'Ошибка загрузки статистики логистики' });
  }
});

// ================================================================
// EXPORT EXCEL
// ================================================================
app.get('/api/documents/export-excel', auth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        CONCAT('Inv-', LPAD(i.id::text, 5, '0')) as invoice_id,
        TO_CHAR(i.issue_date, 'DD.MM.YYYY') as date,
        CONCAT('DTL', LPAD(o.id::text, 7, '0')) as reference,
        c.company_name as client,
        CONCAT(i.currency, ' ', TO_CHAR(i.amount, 'FM999,999,999,999.00')) as total,
        i.status,
        CONCAT(i.currency, ' ', TO_CHAR(i.paid_amount, 'FM999,999,999,999.00')) as paid,
        CONCAT(i.currency, ' ', TO_CHAR(i.amount - i.paid_amount, 'FM999,999,999,999.00')) as remaining,
        TO_CHAR(i.due_date, 'DD.MM.YYYY') as due_date
      FROM invoices i
      JOIN orders o ON i.order_id = o.id
      JOIN clients c ON o.client_id = c.id
      ORDER BY i.id DESC
    `);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Batly Sowda';
    const ws = workbook.addWorksheet('Invoices');

    ws.columns = [
      { header: 'INVOICE #', key: 'invoice_id', width: 16 },
      { header: 'DATE', key: 'date', width: 14 },
      { header: 'REFERENCE', key: 'reference', width: 16 },
      { header: 'CLIENT', key: 'client', width: 35 },
      { header: 'TOTAL', key: 'total', width: 18 },
      { header: 'STATUS', key: 'status', width: 14 },
      { header: 'PAID', key: 'paid', width: 18 },
      { header: 'REMAINING', key: 'remaining', width: 18 },
      { header: 'DUE DATE', key: 'due_date', width: 14 }
    ];

    ws.addRows(result.rows);

    const header = ws.getRow(1);
    header.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
    header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A3A5C' } };
    header.alignment = { vertical: 'middle', horizontal: 'center' };
    header.height = 28;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=batly_invoices_${new Date().toISOString().split('T')[0]}.xlsx`);
    await workbook.xlsx.write(res);
    res.end();

    console.log(`✅ Excel export completed: ${result.rows.length} invoices`);
  } catch (err) {
    console.error('❌ Excel export error:', err);
    res.status(500).json({ error: 'Ошибка экспорта' });
  }
});

// ================================================================
// PDF GENERATION (INVOICE)
// ================================================================
app.get('/api/documents/invoice/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const invoiceResult = await pool.query(
      `SELECT i.*, c.company_name as client_name 
       FROM invoices i
       JOIN orders o ON i.order_id = o.id
       JOIN clients c ON o.client_id = c.id
       WHERE i.id = $1`,
      [id]
    );

    if (invoiceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const invoice = invoiceResult.rows[0];

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice_${id}.pdf`);
    doc.pipe(res);

    doc.fontSize(20).text('INVOICE', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Invoice #: ${invoice.id}`);
    doc.text(`Client: ${invoice.client_name}`);
    doc.text(`Amount: $${invoice.amount}`);
    doc.text(`Status: ${invoice.status}`);
    doc.text(`Issue Date: ${invoice.issue_date}`);
    doc.text(`Due Date: ${invoice.due_date}`);

    doc.end();
    console.log(`✅ PDF generated for invoice #${id}`);
  } catch (err) {
    console.error('❌ PDF error:', err);
    res.status(500).json({ error: 'Ошибка генерации PDF' });
  }
});

// ================================================================
// PDF GENERATION (DELIVERY ACT)
// ================================================================
app.get('/api/documents/act/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const orderResult = await pool.query(
      `SELECT o.*, c.company_name as client_name 
       FROM orders o
       JOIN clients c ON o.client_id = c.id
       WHERE o.id = $1`,
      [id]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orderResult.rows[0];

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=delivery_act_${id}.pdf`);
    doc.pipe(res);

    doc.fontSize(20).text('DELIVERY ACT', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Order #: ${order.id}`);
    doc.text(`Client: ${order.client_name}`);
    doc.text(`Amount: $${order.total_amount}`);
    doc.text(`Status: ${order.status}`);
    doc.text(`Date: ${order.order_date}`);

    doc.end();
    console.log(`✅ Delivery Act PDF generated for order #${id}`);
  } catch (err) {
    console.error('❌ PDF error:', err);
    res.status(500).json({ error: 'Ошибка генерации PDF' });
  }
});

// ================================================================
// START
// ================================================================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Backend running on http://localhost:${PORT}`);
  console.log(`📊 API: http://localhost:${PORT}/api/health`);
  console.log(`🔐 Login: admin@batly.com / 123456`);
  console.log(`🗄️  Database: PostgreSQL connected`);
});

module.exports = app;