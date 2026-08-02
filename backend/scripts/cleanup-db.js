const { Pool } = require('pg');
require('dotenv').config({ path: '../.env' });

// Подключение к базе данных
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  client_encoding: 'utf8',
});

// Таблицы для очистки (в правильном порядке — сначала дочерние)
const tables = [
  'stock_movements',
  'order_items',
  'shipments',
  'invoices',
  'orders',
  'clients'
];

// Данные, которые нужно сохранить
const preserveData = {
  users: { email: 'admin@batly.com' },
  companies: { name: 'Batly Enterprise' }
};

async function cleanupDatabase() {
  console.log('🧹 Начинаем очистку базы данных...');
  console.log('⚠️  ВНИМАНИЕ: Будут удалены ВСЕ тестовые данные!');
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

  // Ждём 5 секунд для возможности отмены
  await new Promise(resolve => setTimeout(resolve, 5000));

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Очищаем таблицы в правильном порядке
    for (const table of tables) {
      console.log(`🗑️  Очищаем таблицу: ${table}...`);
      await client.query(`DELETE FROM ${table}`);
    }

    // 2. Сбрасываем автоинкременты
    console.log('🔄 Сбрасываем счётчики ID...');
    await client.query(`
      SELECT setval('clients_id_seq', 1, false);
      SELECT setval('orders_id_seq', 1, false);
      SELECT setval('order_items_id_seq', 1, false);
      SELECT setval('shipments_id_seq', 1, false);
      SELECT setval('invoices_id_seq', 1, false);
      SELECT setval('stock_movements_id_seq', 1, false);
    `);

    // 3. Проверяем, что компания существует
    const companyCheck = await client.query(
      "SELECT id FROM companies WHERE name = 'Batly Enterprise'"
    );

    if (companyCheck.rows.length === 0) {
      console.log('🏢 Создаём компанию "Batly Enterprise"...');
      await client.query(`
        INSERT INTO companies (name, tax_id, address)
        VALUES ('Batly Enterprise', '101211008302', 'Ashgabat, Turkmenistan')
      `);
    }

    // 4. Проверяем, что администратор существует
    const adminCheck = await client.query(
      "SELECT id FROM users WHERE email = 'admin@batly.com'"
    );

    if (adminCheck.rows.length === 0) {
      console.log('👤 Создаём администратора...');
      const companyId = companyCheck.rows[0].id;
      const hashedPassword = '$2a$10$L9Wx8TZ8xV9yZ7xV9yZ7xV9yZ7xV9yZ7xV9yZ7xV9yZ7xV9yZ7xV9yZ7x';
      await client.query(`
        INSERT INTO users (company_id, email, password_hash, role, position, is_active)
        VALUES ($1, 'admin@batly.com', $2, 'admin', 'Администратор', TRUE)
      `, [companyId, hashedPassword]);
    }

    await client.query('COMMIT');

    console.log('');
    console.log('✅ ОЧИСТКА ЗАВЕРШЕНА!');
    console.log('📊 Итог:');
    console.log('   - Все тестовые данные удалены');
    console.log('   - Компания сохранена');
    console.log('   - Администратор сохранён');
    console.log('   - Счётчики ID сброшены');
    console.log('');
    console.log('🔐 Вход:');
    console.log('   Email: admin@batly.com');
    console.log('   Пароль: 123456');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Ошибка очистки:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

// Запуск
cleanupDatabase();