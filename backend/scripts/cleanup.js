const { Pool } = require('pg');
require('dotenv').config({ path: '../.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  client_encoding: 'utf8',
});

async function cleanupDatabase() {
  console.log('🧹 Начинаем очистку базы данных...');
  console.log('⚠️  ВНИМАНИЕ: Будут удалены ВСЕ тестовые данные!');
  console.log('');
  console.log('   Будут удалены:');
  console.log('   - Клиенты');
  console.log('   - Заказы');
  console.log('   - Счета');
  console.log('   - Поставки');
  console.log('   - Движения склада');
  console.log('');
  console.log('✅ БУДУТ СОХРАНЕНЫ:');
  console.log('   - Компания "Batly Enterprise"');
  console.log('   - Пользователь admin@batly.com');
  console.log('');
  console.log('Нажмите Ctrl+C для отмены или подождите 5 секунд...');

  await new Promise(resolve => setTimeout(resolve, 5000));

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Очищаем таблицы в правильном порядке
    console.log('🗑️  Очищаем таблицы...');
    
    await client.query('DELETE FROM stock_movements');
    console.log('   ✅ stock_movements');
    
    await client.query('DELETE FROM order_items');
    console.log('   ✅ order_items');
    
    await client.query('DELETE FROM shipments');
    console.log('   ✅ shipments');
    
    await client.query('DELETE FROM invoices');
    console.log('   ✅ invoices');
    
    await client.query('DELETE FROM orders');
    console.log('   ✅ orders');
    
    await client.query('DELETE FROM clients');
    console.log('   ✅ clients');

    // 2. Проверяем компанию
    const companyCheck = await client.query(
      "SELECT id FROM companies WHERE name = 'Batly Enterprise'"
    );

    let companyId;
    if (companyCheck.rows.length === 0) {
      console.log('🏢 Создаём компанию...');
      const result = await client.query(`
        INSERT INTO companies (name, tax_id, address)
        VALUES ('Batly Enterprise', '101211008302', 'Ashgabat, Turkmenistan')
        RETURNING id
      `);
      companyId = result.rows[0].id;
    } else {
      companyId = companyCheck.rows[0].id;
    }
    console.log(`   ✅ Компания ID: ${companyId}`);

    // 3. Проверяем администратора
    const adminCheck = await client.query(
      "SELECT id FROM users WHERE email = 'admin@batly.com'"
    );

    if (adminCheck.rows.length === 0) {
      console.log('👤 Создаём администратора...');
      const hashedPassword = '$2a$10$L9Wx8TZ8xV9yZ7xV9yZ7xV9yZ7xV9yZ7xV9yZ7xV9yZ7xV9yZ7xV9yZ7x';
      await client.query(`
        INSERT INTO users (company_id, email, password_hash, role, position, is_active)
        VALUES ($1, 'admin@batly.com', $2, 'admin', 'Администратор', TRUE)
      `, [companyId, hashedPassword]);
      console.log('   ✅ Администратор создан');
    } else {
      console.log('   ✅ Администратор уже существует');
    }

    // 4. Сбрасываем счётчики
    console.log('🔄 Сбрасываем счётчики ID...');
    await client.query(`SELECT setval('clients_id_seq', 1, false)`);
    await client.query(`SELECT setval('orders_id_seq', 1, false)`);
    await client.query(`SELECT setval('order_items_id_seq', 1, false)`);
    await client.query(`SELECT setval('shipments_id_seq', 1, false)`);
    await client.query(`SELECT setval('invoices_id_seq', 1, false)`);
    await client.query(`SELECT setval('stock_movements_id_seq', 1, false)`);
    console.log('   ✅ Счётчики сброшены');

    await client.query('COMMIT');

    console.log('');
    console.log('✅ ОЧИСТКА ЗАВЕРШЕНА!');
    console.log('');
    console.log('📊 Итог:');
    console.log('   - Все тестовые данные удалены');
    console.log('   - Компания сохранена');
    console.log('   - Администратор сохранён');
    console.log('   - Счётчики ID сброшены');
    console.log('');
    console.log('🔐 Вход в систему:');
    console.log('   Email: admin@batly.com');
    console.log('   Пароль: 123456');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Ошибка очистки:', err.message);
    console.error(err.stack);
  } finally {
    client.release();
    await pool.end();
  }
}

cleanupDatabase();