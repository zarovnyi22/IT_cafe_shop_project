
-- Вимикаємо перевірку ключів на момент створення, щоб уникнути помилок залежностей
SET FOREIGN_KEY_CHECKS = 0;

-- =========================================================
-- 1. ТАБЛИЦІ ДОВІДНИКІВ ТА ПЕРСОНАЛУ
-- =========================================================

-- Таблиця категорій
CREATE TABLE IF NOT EXISTS categories (
    category_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL 
);

-- Таблиця співробітників
CREATE TABLE IF NOT EXISTS employees (
    employee_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    role ENUM('Barista', 'Admin') NOT NULL,
    phone VARCHAR(20),
    is_active BOOLEAN DEFAULT TRUE
) ;

-- =========================================================
-- 2. СКЛАД ТА МЕНЮ
-- =========================================================

-- Таблиця інгредієнтів
CREATE TABLE IF NOT EXISTS ingredients (
    ingredient_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    current_stock DECIMAL(10, 2) DEFAULT 0.00,
    unit VARCHAR(20) NOT NULL COMMENT 'kg, l, pcs',
    warning_threshold DECIMAL(10, 2) DEFAULT 0.00 
) ;

-- Таблиця товарів (Меню)
CREATE TABLE IF NOT EXISTS products (
    product_id INT AUTO_INCREMENT PRIMARY KEY,
    category_id INT NOT NULL,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    
    FOREIGN KEY (category_id) REFERENCES categories(category_id) ON DELETE RESTRICT
);

-- Таблиця рецептів (Технологічні карти)
-- Зв'язує продукт з інгредієнтами для списання
CREATE TABLE IF NOT EXISTS recipes (
    recipe_id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    ingredient_id INT NOT NULL,
    quantity_required DECIMAL(10, 2) NOT NULL,
    
    FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE,
    FOREIGN KEY (ingredient_id) REFERENCES ingredients(ingredient_id) ON DELETE RESTRICT
);

-- Таблиця поставок (спрощена)
CREATE TABLE IF NOT EXISTS supplies (
    supply_id INT AUTO_INCREMENT PRIMARY KEY,
    ingredient_id INT NOT NULL,
    quantity_added DECIMAL(10, 2) NOT NULL,
    cost DECIMAL(10, 2),
    supply_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (ingredient_id) REFERENCES ingredients(ingredient_id) ON DELETE CASCADE
);

-- =========================================================
-- 3. ПРОДАЖІ
-- =========================================================

-- Таблиця замовлень (Шапка чеку)
CREATE TABLE IF NOT EXISTS orders (
    order_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NOT NULL,
    order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    total_amount DECIMAL(10, 2) NOT NULL,
    payment_method ENUM('Cash', 'Card', 'App') DEFAULT 'Card',
    status ENUM('Paid', 'Cancelled') DEFAULT 'Paid',
    
    FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE RESTRICT
);

-- Таблиця деталей замовлення (Товари в чеку)
CREATE TABLE IF NOT EXISTS order_details (
    detail_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    order_id BIGINT NOT NULL,
    product_id INT NOT NULL,
    quantity INT DEFAULT 1,
    price_at_sale DECIMAL(10, 2) NOT NULL,
    
    FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE RESTRICT
);

-- Вмикаємо перевірку ключів назад
SET FOREIGN_KEY_CHECKS = 1;

USE coffee_shop_db;

-- 1. ВИМИКАЄМО ЗАХИСТ ЗВ'ЯЗКІВ ДЛЯ ОЧИЩЕННЯ
SET FOREIGN_KEY_CHECKS = 0;

-- Очищаємо таблиці (скидаємо ID на 1)
TRUNCATE TABLE order_details;
TRUNCATE TABLE orders;
TRUNCATE TABLE supplies;
TRUNCATE TABLE recipes;
TRUNCATE TABLE products;
TRUNCATE TABLE ingredients;
TRUNCATE TABLE categories;
TRUNCATE TABLE employees;

SET FOREIGN_KEY_CHECKS = 1;

select * from products;
-- =========================================================
-- 2. ЗАПОВНЮЄМО ДОВІДНИКИ
-- =========================================================

-- Категорії
INSERT INTO categories (name) VALUES 
('Кава'),          -- ID 1
('Чаї та Напої'),  -- ID 2
('Десерти'),       -- ID 3
('Випічка');       -- ID 4

-- Інгредієнти
-- Увага: точність DECIMAL(10,2), тому пишемо 10.00, а не 10.000
INSERT INTO ingredients (name, current_stock, unit, warning_threshold) VALUES 
('Зерно Арабіка 100%', 10.00, 'kg', 1.00),     -- ID 1
('Зерно Бленд', 5.00, 'kg', 0.50),             -- ID 2
('Молоко 2.5%', 40.00, 'l', 5.00),             -- ID 3
('Молоко Безлактозне', 10.00, 'l', 2.00),      -- ID 4
('Сироп Карамель', 5.00, 'l', 0.50),           -- ID 5
('Чай Ерл Грей', 2.00, 'kg', 0.20),            -- ID 6
('Стакан паперовий S', 500.00, 'pcs', 50.00),  -- ID 7
('Стакан паперовий L', 500.00, 'pcs', 50.00),  -- ID 8
('Круасан (заморозка)', 100.00, 'pcs', 10.00), -- ID 9
('Цукор стік', 1000.00, 'pcs', 100.00);        -- ID 10

-- Співробітники
-- Увага: Ролі тільки 'Admin' або 'Barista'
INSERT INTO employees (name, role, phone) VALUES 
('Олена Адмін', 'Admin', '+380991234567'),   -- ID 1 (Була Менеджером)
('Іван Бариста', 'Barista', '+380997654321'), -- ID 2
('Петро Стажер', 'Barista', '+380630000000'); -- ID 3


-- =========================================================
-- 3. ЗАПОВНЮЄМО МЕНЮ (ПРОДУКТИ)
-- =========================================================

INSERT INTO products (category_id, name, description, price) VALUES 
(1, 'Еспресо', 'Класичний шот, 30мл', 40.00),           -- ID 1
(1, 'Американо', 'Еспресо з гарячою водою', 45.00),     -- ID 2
(1, 'Капучино', 'Еспресо + спінене молоко', 60.00),     -- ID 3
(1, 'Лате', 'Багато молока, трохи кави', 65.00),        -- ID 4
(1, 'Лате Карамель', 'Солодкий лате з сиропом', 75.00), -- ID 5
(2, 'Чай Чорний', 'Класичний Ерл Грей', 35.00),         -- ID 6
(4, 'Круасан класичний', 'Французька випічка', 55.00),  -- ID 7
(3, 'Чізкейк', 'Нью-Йорк', 90.00);                      -- ID 8


-- =========================================================
-- 4. ЗАПОВНЮЄМО РЕЦЕПТИ
-- Увага: Округлили вагу до 2 знаків (0.02 замість 0.018), 
-- щоб відповідати вашому типу DECIMAL(10, 2)
-- =========================================================

INSERT INTO recipes (product_id, ingredient_id, quantity_required) VALUES 
-- Еспресо (ID 1): ~20г кави + стаканчик S
(1, 1, 0.02), 
(1, 7, 1.00),

-- Американо (ID 2): ~20г кави + стаканчик L
(2, 1, 0.02), 
(2, 8, 1.00),

-- Капучино (ID 3): ~20г кави + 0.15л молока + стаканчик S
(3, 1, 0.02), 
(3, 3, 0.15),
(3, 7, 1.00),

-- Лате (ID 4): ~20г кави + 0.25л молока + стаканчик L
(4, 1, 0.02), 
(4, 3, 0.25),
(4, 8, 1.00),

-- Лате Карамель (ID 5): + 0.02л сиропу
(5, 1, 0.02), 
(5, 3, 0.25), 
(5, 5, 0.02),
(5, 8, 1.00),

-- Чай (ID 6): 0.01кг чаю (мінімальне значення для DECIMAL 10,2)
(6, 6, 0.01),
(6, 8, 1.00),

-- Круасан (ID 7)
(7, 9, 1.00);


-- =========================================================
-- 5. ЗАПОВНЮЄМО ПОСТАВКИ
-- =========================================================

INSERT INTO supplies (ingredient_id, quantity_added, cost, supply_date) VALUES 
(1, 10.00, 4500.00, NOW()), 
(3, 50.00, 1500.00, NOW()),
(7, 1000.00, 2000.00, NOW());


-- =========================================================
-- 6. ЗАПОВНЮЄМО ІСТОРІЮ ПРОДАЖІВ
-- =========================================================

-- ЧЕК 1
INSERT INTO orders (employee_id, total_amount, payment_method, status, order_date) 
VALUES (2, 45.00, 'Cash', 'Paid', NOW());

INSERT INTO order_details (order_id, product_id, quantity, price_at_sale) 
VALUES (1, 2, 1, 45.00);

-- ЧЕК 2
INSERT INTO orders (employee_id, total_amount, payment_method, status, order_date) 
VALUES (3, 130.00, 'Card', 'Paid', NOW());

INSERT INTO order_details (order_id, product_id, quantity, price_at_sale) VALUES 
(2, 5, 1, 75.00),
(2, 7, 1, 55.00);

-- ЧЕК 3
INSERT INTO orders (employee_id, total_amount, payment_method, status, order_date) 
VALUES (2, 255.00, 'App', 'Paid', NOW());

INSERT INTO order_details (order_id, product_id, quantity, price_at_sale) VALUES 
(3, 3, 2, 60.00), 
(3, 8, 1, 90.00), 
(3, 2, 1, 45.00);