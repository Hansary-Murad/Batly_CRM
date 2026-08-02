-- ================================================================
-- BATLY ENTERPRISE — СХЕМА БАЗЫ ДАННЫХ
-- ================================================================

-- Удаляем старые таблицы (если есть)
DROP TABLE IF EXISTS stock_movements CASCADE;
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS shipments CASCADE;
DROP TABLE IF EXISTS invoices CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS clients CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS companies CASCADE;

-- 1. КОМПАНИИ
CREATE TABLE companies (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    tax_id VARCHAR(50),
    address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. ПОЛЬЗОВАТЕЛИ
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'manager',
    position VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

-- 3. КЛИЕНТЫ
CREATE TABLE clients (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
    company_name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255),
    phone VARCHAR(50),
    email VARCHAR(255),
    tax_id VARCHAR(50),
    address TEXT,
    credit_limit DECIMAL(15,2) DEFAULT 0,
    current_debt DECIMAL(15,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    UNIQUE(company_id, company_name)
);

-- 4. ТОВАРЫ
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    quantity DECIMAL(15,4) DEFAULT 0,
    price DECIMAL(15,2) DEFAULT 0,
    unit VARCHAR(20) DEFAULT 'pcs',
    min_quantity DECIMAL(15,4) DEFAULT 0,
    category VARCHAR(100),
    barcode VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    UNIQUE(company_id, name)
);

-- 5. ЗАКАЗЫ
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
    client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
    total_amount DECIMAL(15,2) DEFAULT 0,
    currency VARCHAR(10) DEFAULT 'USD',
    status VARCHAR(50) DEFAULT 'pending',
    notes TEXT,
    order_date DATE DEFAULT CURRENT_DATE,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. ПОЗИЦИИ ЗАКАЗА
CREATE TABLE order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    quantity DECIMAL(15,4) NOT NULL,
    unit VARCHAR(20) DEFAULT 'pcs',
    unit_price DECIMAL(15,2) NOT NULL,
    total_price DECIMAL(15,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. СЧЕТА (ИНВОЙСЫ)
CREATE TABLE invoices (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
    order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
    client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
    amount DECIMAL(15,2) NOT NULL,
    paid_amount DECIMAL(15,2) DEFAULT 0,
    currency VARCHAR(10) DEFAULT 'USD',
    status VARCHAR(50) DEFAULT 'pending',
    issue_date DATE DEFAULT CURRENT_DATE,
    due_date DATE,
    payment_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. ПОСТАВКИ
CREATE TABLE shipments (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
    order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
    supplier_name VARCHAR(255) NOT NULL,
    purchase_cost DECIMAL(15,2) DEFAULT 0,
    logistics_cost DECIMAL(15,2) DEFAULT 0,
    customs_fee DECIMAL(15,2) DEFAULT 0,
    currency VARCHAR(10) DEFAULT 'USD',
    status VARCHAR(50) DEFAULT 'ordered',
    tracking_number VARCHAR(100),
    expected_arrival DATE,
    actual_arrival DATE,
    notes TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 9. ДВИЖЕНИЯ СКЛАДА
CREATE TABLE stock_movements (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
    quantity_change DECIMAL(15,4) NOT NULL,
    reason VARCHAR(50) NOT NULL,
    reference_id INTEGER,
    reference_type VARCHAR(50),
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ================================================================
-- ИНДЕКСЫ
-- ================================================================
CREATE INDEX idx_clients_company_id ON clients(company_id);
CREATE INDEX idx_clients_is_active ON clients(is_active);
CREATE INDEX idx_orders_company_id ON orders(company_id);
CREATE INDEX idx_orders_client_id ON orders(client_id);
CREATE INDEX idx_invoices_company_id ON invoices(company_id);
CREATE INDEX idx_invoices_client_id ON invoices(client_id);
CREATE INDEX idx_shipments_company_id ON shipments(company_id);
CREATE INDEX idx_products_company_id ON products(company_id);

-- ================================================================
-- НАЧАЛЬНЫЕ ДАННЫЕ
-- ================================================================

-- Компания
INSERT INTO companies (name, tax_id, address) 
VALUES ('Batly Enterprise', '101211008302', 'Ashgabat, Turkmenistan')
ON CONFLICT (id) DO NOTHING;

-- Администратор (пароль: 123456)
INSERT INTO users (company_id, email, password_hash, role, position) 
VALUES (
    (SELECT id FROM companies WHERE name = 'Batly Enterprise'),
    'admin@batly.com',
    '$2a$10$L9Wx8TZ8xV9yZ7xV9yZ7xV9yZ7xV9yZ7xV9yZ7xV9yZ7xV9yZ7xV9yZ7x',
    'admin',
    'Администратор'
) ON CONFLICT (email) DO NOTHING;

-- Клиент Dragon Oil
INSERT INTO clients (company_id, company_name, contact_person, phone, email, address, credit_limit, current_debt, is_active)
VALUES (
    (SELECT id FROM companies WHERE name = 'Batly Enterprise'),
    'Dragon Oil Turkmenistan Limited',
    'John Doe',
    '+99312345678',
    'info@dragonoil.com',
    'Hazar-Balkanabad High Road, 9th km Hazar, 745030, Turkmenistan',
    50000,
    1040.00,
    TRUE
) ON CONFLICT (company_id, company_name) DO NOTHING;

-- Клиент Batly Sowda
INSERT INTO clients (company_id, company_name, contact_person, phone, email, address, credit_limit, current_debt, is_active)
VALUES (
    (SELECT id FROM companies WHERE name = 'Batly Enterprise'),
    'Batly Sowda I.E',
    'Jane Smith',
    '+99363560070',
    'info@batlysowda.com',
    'Ashgabat city, Kopetdag district, 1958 (N.Andalyp) Street, 70, Postal Code: 744000',
    10000,
    0,
    TRUE
) ON CONFLICT (company_id, company_name) DO NOTHING;

-- Товар
INSERT INTO products (company_id, name, quantity, price, unit, category)
VALUES (
    (SELECT id FROM companies WHERE name = 'Batly Enterprise'),
    'TUBING, STRUCTURAL, SQUARE HOLLOW SECTION',
    200,
    50.20,
    'pcs',
    'Steel'
) ON CONFLICT (company_id, name) DO NOTHING;

-- Заказ для Dragon Oil
INSERT INTO orders (company_id, client_id, total_amount, currency, status, order_date, notes)
VALUES (
    (SELECT id FROM companies WHERE name = 'Batly Enterprise'),
    (SELECT id FROM clients WHERE company_name = 'Dragon Oil Turkmenistan Limited'),
    10040.00,
    'USD',
    'pending',
    '2026-05-24',
    'Test order'
);

-- Позиции заказа
INSERT INTO order_items (order_id, name, quantity, unit, unit_price, total_price)
VALUES (
    (SELECT id FROM orders WHERE notes = 'Test order' LIMIT 1),
    'TUBING, STRUCTURAL, SQUARE HOLLOW SECTION',
    200,
    'EACH',
    50.20,
    10040.00
);

-- Счёт
INSERT INTO invoices (company_id, order_id, client_id, amount, paid_amount, currency, status, issue_date, due_date)
VALUES (
    (SELECT id FROM companies WHERE name = 'Batly Enterprise'),
    (SELECT id FROM orders WHERE notes = 'Test order' LIMIT 1),
    (SELECT id FROM clients WHERE company_name = 'Dragon Oil Turkmenistan Limited'),
    10040.00,
    0,
    'USD',
    'pending',
    '2026-05-24',
    '2026-06-23'
);

-- Поставка
INSERT INTO shipments (company_id, order_id, supplier_name, purchase_cost, logistics_cost, customs_fee, currency, status, tracking_number, expected_arrival, actual_arrival)
VALUES (
    (SELECT id FROM companies WHERE name = 'Batly Enterprise'),
    (SELECT id FROM orders WHERE notes = 'Test order' LIMIT 1),
    'Batly Sowda I.E',
    8500.00,
    1000.00,
    540.00,
    'USD',
    'arrived',
    'BTL-2026-020',
    '2026-05-24',
    '2026-05-24'
);

-- Проверка
SELECT '✅ Company:' || name FROM companies;
SELECT '✅ Admin:' || email FROM users WHERE email = 'admin@batly.com';
SELECT '✅ Clients:' || company_name FROM clients;
SELECT '✅ Orders:' || id || ' - $' || total_amount FROM orders;
SELECT '✅ Invoices:' || id || ' - $' || amount FROM invoices;
SELECT '✅ Shipments:' || id || ' - ' || supplier_name FROM shipments;