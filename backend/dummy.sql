BEGIN;

-- ============================================================================
-- 1. STAFF (Employees & Attendance)
-- ============================================================================

INSERT INTO employees (first_name, last_name, employee_email, contact_number, employee_status, employee_role, work_schedule) 
VALUES 
    ('Alice', 'Smith', 'alice.smith@cafe.com', '+15550101', 'active', 'manager', 'Mon-Fri 08:00-16:00'),
    ('Bob', 'Jones', 'bob.jones@cafe.com', '+15550102', 'active', 'cashier', 'Mon-Fri 12:00-20:00'),
    ('Charlie', 'Brown', 'charlie.brown@cafe.com', '+15550103', 'inactive', 'cashier', 'Sat-Sun 09:00-17:00'),
    ('Diana', 'Prince', 'diana.prince@cafe.com', '+15550104', 'active', 'cashier', 'Mon-Fri 06:00-14:00'),
    ('Evan', 'Wright', 'evan.wright@cafe.com', '+15550105', 'active', 'manager', 'Tue-Sat 10:00-18:00'),
    ('Fiona', 'Gallagher', 'fiona.g@cafe.com', '+15550106', 'active', 'cashier', 'Wed-Sun 14:00-22:00'),
    ('George', 'Clark', 'george.clark@cafe.com', '+15550107', 'active', 'cashier', 'Mon-Fri 07:00-15:00'),
    ('Hannah', 'Abbott', 'hannah.a@cafe.com', '+15550108', 'active', 'cashier', 'Thu-Mon 11:00-19:00'),
    ('Ian', 'Malcolm', 'ian.malcolm@cafe.com', '+15550109', 'active', 'manager', 'Mon-Fri 09:00-17:00'),
    ('Julia', 'Roberts', 'julia.r@cafe.com', '+15550110', 'active', 'cashier', 'Fri-Tue 13:00-21:00');

-- 100 Attendance Logs
INSERT INTO attendance_logs (employee_id, time_in, time_out) 
VALUES 
    (1, NOW() - INTERVAL '1 day 8 hours', NOW() - INTERVAL '1 day'),
    (2, NOW() - INTERVAL '1 day 4 hours', NOW() - INTERVAL '1 day - 4 hours'),
    (1, NOW() - INTERVAL '4 hours', NULL);

INSERT INTO attendance_logs (employee_id, time_in, time_out)
SELECT
    1 + (i % 10) AS employee_id,
    (NOW() - ((101 - i) * INTERVAL '1 day'))::DATE + TIME '08:00:00' AS time_in,
    (NOW() - ((101 - i) * INTERVAL '1 day'))::DATE + TIME '16:30:00' AS time_out
FROM generate_series(4, 100) AS i;

-- ============================================================================
-- 2. CUSTOMERS (100 Entities)
-- ============================================================================

INSERT INTO customers (first_name, last_name, university_id, customer_email, contact_number, profile_picture) 
VALUES 
    ('John', 'Doe', 'UNI-2024-0001', 'john.doe@univ.edu', '+15550201', 'https://example.com/profiles/johndoe.jpg'),
    ('Jane', 'Miller', 'UNI-2024-0002', 'jane.miller@univ.edu', '+15550202', NULL),
    ('Alex', 'Taylor', 'UNI-2024-0003', 'alex.taylor@gmail.com', '+15550203', NULL);

INSERT INTO customers (first_name, last_name, university_id, customer_email, contact_number, profile_picture)
SELECT
    (ARRAY[
        'Liam','Noah','Oliver','James','Elijah','William','Henry','Lucas','Benjamin','Theodore',
        'Emma','Charlotte','Amelia','Sophia','Isabella','Ava','Mia','Evelyn','Harper','Luna'
    ])[1 + ((i - 1) % 20)] AS first_name,
    (ARRAY[
        'Smith','Johnson','Williams','Brown','Jones','Garcia','Miller','Davis','Rodriguez','Martinez',
        'Hernandez','Lopez','Gonzalez','Wilson','Anderson','Thomas','Taylor','Moore','Jackson','Martin'
    ])[1 + (((i - 1) * 7) % 20)] AS last_name,
    'UNI-2024-' || LPAD(i::TEXT, 4, '0') AS university_id,
    'student' || i || '@univ.edu' AS customer_email,
    '+15550' || LPAD((200 + i)::TEXT, 4, '0') AS contact_number,
    CASE 
        WHEN i % 5 = 0 THEN 'https://example.com/profiles/avatar_' || i || '.jpg' 
        ELSE NULL 
    END AS profile_picture
FROM generate_series(4, 100) AS i;

-- ============================================================================
-- 3. MENU & RECIPES (Categories, Products, Ingredients)
-- ============================================================================

INSERT INTO categories (category_name) 
VALUES 
    ('Espresso Drinks'),
    ('Cold Brew & Teas'),
    ('Bakery & Pastries'),
    ('Tea & Infusions'),
    ('Sandwiches & Savory');

INSERT INTO products (category_id, product_name, description, price, is_available) 
VALUES 
    (1, 'Caffe Latte', 'Double shot espresso with steamed milk and light foam', 4.50, TRUE),
    (1, 'Americano', 'Double shot espresso diluted with hot water', 3.50, TRUE),
    (2, 'Vanilla Cold Brew', 'Steeped cold brew infused with vanilla syrup', 5.00, TRUE),
    (3, 'Butter Croissant', 'Flaky, buttery baked croissant', 3.00, TRUE),
    (1, 'Caramel Macchiato', 'Espresso with vanilla syrup, steamed milk, and caramel drizzle', 5.25, TRUE),
    (1, 'Mocha', 'Espresso with rich chocolate sauce and steamed milk', 4.95, TRUE),
    (2, 'Iced Matcha Latte', 'Ceremonial grade matcha whisked with oat milk over ice', 5.50, TRUE),
    (4, 'Earl Grey Tea', 'Black tea flavored with bergamot oil', 3.25, TRUE),
    (5, 'Turkey & Pesto Panini', 'Smoked turkey breast, provolone, and basil pesto on sourdough', 7.50, TRUE);

INSERT INTO ingredients (ingredient_name, unit_of_measure, current_quantity, minimum_stock_level, is_active) 
VALUES 
    ('Espresso Beans', 'g', 5000.00, 1000.00, TRUE),
    ('Whole Milk', 'ml', 15000.00, 3000.00, TRUE),
    ('Vanilla Syrup', 'ml', 2500.00, 500.00, TRUE),
    ('Croissant Dough (Frozen)', 'pcs', 40.00, 10.00, TRUE),
    ('Caramel Sauce', 'ml', 3000.00, 600.00, TRUE),
    ('Chocolate Syrup', 'ml', 4000.00, 800.00, TRUE),
    ('Matcha Powder', 'g', 1000.00, 200.00, TRUE),
    ('Earl Grey Tea Bags', 'pcs', 150.00, 30.00, TRUE),
    ('Sourdough Bread', 'pcs', 60.00, 15.00, TRUE);

INSERT INTO product_ingredients (product_id, ingredient_id, quantity_required) 
VALUES 
    (1, 1, 18.00),   -- Latte: 18g Espresso
    (1, 2, 250.00),  -- Latte: 250ml Milk
    (2, 1, 18.00),   -- Americano: 18g Espresso
    (3, 1, 20.00),   -- Cold Brew: 20g Espresso
    (3, 3, 30.00),   -- Cold Brew: 30ml Vanilla
    (4, 4, 1.00),    -- Croissant: 1 frozen dough
    (5, 1, 18.00),   -- Caramel Macchiato: 18g Espresso
    (5, 2, 200.00),  -- Caramel Macchiato: 200ml Milk
    (5, 5, 25.00),   -- Caramel Macchiato: 25ml Caramel Sauce
    (6, 1, 18.00),   -- Mocha: 18g Espresso
    (6, 2, 200.00),  -- Mocha: 200ml Milk
    (6, 6, 30.00),   -- Mocha: 30ml Chocolate Syrup
    (7, 7, 5.00),    -- Matcha Latte: 5g Matcha
    (7, 2, 250.00),  -- Matcha Latte: 250ml Milk
    (8, 8, 1.00),    -- Earl Grey: 1 tea bag
    (9, 9, 2.00);    -- Panini: 2 slices Sourdough

-- ============================================================================
-- 4. INVENTORY & STOCK MOVEMENTS (100 Movements)
-- ============================================================================

INSERT INTO stock_movements (ingredient_id, employee_id, quantity_change, reason, moved_at) 
VALUES 
    (1, 1, 5000.00, 'delivery', NOW() - INTERVAL '7 days'),
    (2, 1, 20000.00, 'delivery', NOW() - INTERVAL '7 days'),
    (2, 2, -500.00, 'waste', NOW() - INTERVAL '2 days'),
    (1, 2, -18.00, 'sale', NOW() - INTERVAL '1 hour');

INSERT INTO stock_movements (ingredient_id, employee_id, quantity_change, reason, moved_at)
SELECT
    1 + (i % 9) AS ingredient_id,
    1 + (i % 10) AS employee_id,
    CASE 
        WHEN (i % 4) = 0 THEN 2500.00
        WHEN (i % 4) = 1 THEN -18.00
        WHEN (i % 4) = 2 THEN -250.00
        ELSE 100.00
    END AS quantity_change,
    (ARRAY['delivery', 'sale', 'waste', 'adjustment']::stock_movement_reason[])[1 + (i % 4)] AS reason,
    NOW() - ((101 - i) * INTERVAL '2 hours') AS moved_at
FROM generate_series(5, 100) AS i;

-- ============================================================================
-- 5. SUPPLY CHAIN (Suppliers, Deliveries, Delivery Items)
-- ============================================================================

INSERT INTO suppliers (supplier_name, contact_person, supplier_email, contact_number, supplier_address, is_active) 
VALUES 
    ('RoastCo Wholesalers', 'David Lee', 'orders@roastco.com', '+15550301', '100 Industrial Pkwy, City', TRUE),
    ('Valley Dairy Farms', 'Sarah Connor', 'supply@valleydairy.com', '+15550302', '456 Farm Route, Town', TRUE),
    ('Artisan Bakery Supply', 'Marco Rossi', 'marco@artisanbakery.com', '+15550303', '78 Flour Mill Rd, City', TRUE),
    ('Organic Teas & Syrups', 'Elena Rostova', 'elena@organicteas.com', '+15550304', '12 Spice Way, Town', TRUE);

INSERT INTO supplier_ingredients (supplier_id, ingredient_id, unit_price) 
VALUES 
    (1, 1, 0.02),
    (2, 2, 0.002),
    (4, 3, 0.01),
    (3, 4, 0.85),
    (4, 5, 0.015),
    (4, 6, 0.012),
    (4, 7, 0.08),
    (4, 8, 0.20),
    (3, 9, 0.40);

INSERT INTO deliveries (supplier_id, employee_id, delivery_date) 
VALUES 
    (1, 1, CURRENT_DATE - INTERVAL '7 days'),
    (2, 1, CURRENT_DATE - INTERVAL '3 days'),
    (3, 5, CURRENT_DATE - INTERVAL '2 days'),
    (4, 5, CURRENT_DATE - INTERVAL '1 day');

INSERT INTO delivery_items (delivery_id, ingredient_id, quantity_received, unit_cost) 
VALUES 
    (1, 1, 5000.00, 0.02),
    (1, 3, 3000.00, 0.01),
    (2, 2, 20000.00, 0.002),
    (3, 4, 50.00, 0.85),
    (3, 9, 40.00, 0.40),
    (4, 5, 2000.00, 0.015),
    (4, 7, 500.00, 0.08);

-- ============================================================================
-- 6. SALES (100 Orders, Order Items, Payments)
-- ============================================================================

INSERT INTO orders (customer_id, employee_id, ordered_at, discount_amount, total_amount, order_status) 
VALUES 
    (1, 2, NOW() - INTERVAL '2 hours', 0.00, 8.00, 'completed'),
    (2, 2, NOW() - INTERVAL '1 hour', 0.50, 4.00, 'completed'),
    (3, 1, NOW() - INTERVAL '10 minutes', 0.00, 3.00, 'pending');

INSERT INTO orders (customer_id, employee_id, ordered_at, discount_amount, total_amount, order_status)
SELECT
    1 + ((i - 1) % 100) AS customer_id,
    1 + ((i - 1) % 10) AS employee_id,
    NOW() - ((101 - i) * INTERVAL '40 minutes') AS ordered_at,
    CASE WHEN i % 7 = 0 THEN 0.75 ELSE 0.00 END AS discount_amount,
    ROUND((3.50 + ((i % 5) * 1.50))::NUMERIC, 2) AS total_amount,
    (ARRAY['completed', 'completed', 'completed', 'completed', 'pending', 'cancelled']::order_status[])[1 + (i % 6)] AS order_status
FROM generate_series(4, 100) AS i;

-- Primary order items
INSERT INTO order_items (order_id, product_id, quantity, selling_price) 
VALUES 
    (1, 1, 1, 4.50),
    (1, 2, 1, 3.50),
    (2, 1, 1, 4.50),
    (3, 4, 1, 3.00);

INSERT INTO order_items (order_id, product_id, quantity, selling_price)
SELECT
    o.order_id,
    p.product_id,
    1 + (o.order_id % 2) AS quantity,
    p.price AS selling_price
FROM orders o
JOIN products p ON p.product_id = (1 + (o.order_id % 9))
WHERE o.order_id >= 4;

-- Second line item for every 3rd order
INSERT INTO order_items (order_id, product_id, quantity, selling_price)
SELECT
    o.order_id,
    4 AS product_id,
    1 AS quantity,
    3.00 AS selling_price
FROM orders o
WHERE o.order_id >= 4 AND o.order_id % 3 = 0;

-- Payments for all completed orders
INSERT INTO payments (order_id, amount_paid, payment_method, paid_at) 
VALUES 
    (1, 8.00, 'card', NOW() - INTERVAL '2 hours'),
    (2, 4.00, 'e_wallet', NOW() - INTERVAL '1 hour');

INSERT INTO payments (order_id, amount_paid, payment_method, paid_at)
SELECT
    o.order_id,
    o.total_amount,
    (ARRAY['cash', 'card', 'e_wallet']::payment_method[])[1 + (o.order_id % 3)] AS payment_method,
    o.ordered_at + INTERVAL '2 minutes' AS paid_at
FROM orders o
WHERE o.order_status = 'completed' AND o.order_id >= 4;

COMMIT;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
SELECT 
    (SELECT COUNT(*) FROM employees)            AS employee_count,
    (SELECT COUNT(*) FROM customers)            AS customer_count,
    (SELECT COUNT(*) FROM orders)               AS order_count,
    (SELECT COUNT(*) FROM order_items)          AS order_item_count,
    (SELECT COUNT(*) FROM payments)             AS payment_count,
    (SELECT COUNT(*) FROM attendance_logs)      AS attendance_count,
    (SELECT COUNT(*) FROM stock_movements)      AS stock_movement_count,
    (SELECT COUNT(*) FROM products)             AS product_count,
    (SELECT COUNT(*) FROM ingredients)          AS ingredient_count;