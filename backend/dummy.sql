-- ============================ STAFF ============================

INSERT INTO employees (first_name, last_name, employee_email, contact_number, employee_status, employee_role, work_schedule) 
VALUES 
    ('Alice', 'Smith', 'alice.smith@cafe.com', '+15550101', 'active', 'manager', 'Mon-Fri 08:00-16:00'),
    ('Bob', 'Jones', 'bob.jones@cafe.com', '+15550102', 'active', 'cashier', 'Mon-Fri 12:00-20:00'),
    ('Charlie', 'Brown', 'charlie.brown@cafe.com', '+15550103', 'inactive', 'cashier', 'Sat-Sun 09:00-17:00');

INSERT INTO attendance_logs (employee_id, time_in, time_out) 
VALUES 
    (1, NOW() - INTERVAL '1 day 8 hours', NOW() - INTERVAL '1 day'),
    (2, NOW() - INTERVAL '1 day 4 hours', NOW() - INTERVAL '1 day - 4 hours'),
    (1, NOW() - INTERVAL '4 hours', NULL);

-- ============================ CUSTOMERS ============================

INSERT INTO customers (first_name, last_name, university_id, customer_email, contact_number, profile_picture) 
VALUES 
    ('John', 'Doe', 'UNI-2024-001', 'john.doe@univ.edu', '+15550201', 'https://example.com/profiles/johndoe.jpg'),
    ('Jane', 'Miller', 'UNI-2024-002', 'jane.miller@univ.edu', '+15550202', NULL),
    ('Alex', 'Taylor', NULL, 'alex.taylor@gmail.com', '+15550203', NULL);

-- ============================ MENU ==============================

INSERT INTO categories (category_name) 
VALUES 
    ('Espresso Drinks'),
    ('Cold Brew & Teas'),
    ('Bakery & Pastries');

INSERT INTO products (category_id, product_name, description, price, is_available) 
VALUES 
    (1, 'Caffe Latte', 'Double shot espresso with steamed milk and light foam', 4.50, TRUE),
    (1, 'Americano', 'Double shot espresso diluted with hot water', 3.50, TRUE),
    (2, 'Vanilla Cold Brew', 'Steeped cold brew infused with vanilla syrup', 5.00, TRUE),
    (3, 'Butter Croissant', 'Flaky, buttery baked croissant', 3.00, TRUE);

-- ========================== INVENTORY ==========================

INSERT INTO ingredients (ingredient_name, unit_of_measure, current_quantity, minimum_stock_level, is_active) 
VALUES 
    ('Espresso Beans', 'g', 5000.00, 1000.00, TRUE),
    ('Whole Milk', 'ml', 15000.00, 3000.00, TRUE),
    ('Vanilla Syrup', 'ml', 2500.00, 500.00, TRUE),
    ('Croissant Dough (Frozen)', 'pcs', 40.00, 10.00, TRUE);

INSERT INTO product_ingredients (product_id, ingredient_id, quantity_required) 
VALUES 
    (1, 1, 18.00),   -- Latte: 18g Espresso
    (1, 2, 250.00),  -- Latte: 250ml Milk
    (2, 1, 18.00),   -- Americano: 18g Espresso
    (3, 1, 20.00),   -- Cold Brew: 20g Espresso
    (3, 3, 30.00),   -- Cold Brew: 30ml Vanilla
    (4, 4, 1.00);    -- Croissant: 1 frozen dough

INSERT INTO stock_movements (ingredient_id, employee_id, quantity_change, reason, moved_at) 
VALUES 
    (1, 1, 5000.00, 'delivery', NOW() - INTERVAL '7 days'),
    (2, 1, 20000.00, 'delivery', NOW() - INTERVAL '7 days'),
    (2, 2, -500.00, 'waste', NOW() - INTERVAL '2 days'),
    (1, 2, -18.00, 'sale', NOW() - INTERVAL '1 hour');

-- ============================ SALES ============================

INSERT INTO orders (customer_id, employee_id, ordered_at, discount_amount, total_amount, order_status) 
VALUES 
    (1, 2, NOW() - INTERVAL '2 hours', 0.00, 8.00, 'completed'),
    (2, 2, NOW() - INTERVAL '1 hour', 0.50, 4.00, 'completed'),
    (3, 1, NOW() - INTERVAL '10 minutes', 0.00, 3.00, 'pending');

INSERT INTO order_items (order_id, product_id, quantity, selling_price) 
VALUES 
    (1, 1, 1, 4.50), -- Order 1: 1 x Latte
    (1, 2, 1, 3.50), -- Order 1: 1 x Americano
    (2, 1, 1, 4.50), -- Order 2: 1 x Latte ($4.50 minus $0.50 discount)
    (3, 4, 1, 3.00); -- Order 3: 1 x Croissant

INSERT INTO payments (order_id, amount_paid, payment_method, paid_at) 
VALUES 
    (1, 8.00, 'card', NOW() - INTERVAL '2 hours'),
    (2, 4.00, 'e_wallet', NOW() - INTERVAL '1 hour');

-- =========================== SUPPLY ============================

INSERT INTO suppliers (supplier_name, contact_person, supplier_email, contact_number, supplier_address, is_active) 
VALUES 
    ('RoastCo Wholesalers', 'David Lee', 'orders@roastco.com', '+15550301', '100 Industrial Pkwy, City', TRUE),
    ('Valley Dairy Farms', 'Sarah Connor', 'supply@valleydairy.com', '+15550302', '456 Farm Route, Town', TRUE);

INSERT INTO supplier_ingredients (supplier_id, ingredient_id, unit_price) 
VALUES 
    (1, 1, 0.02), -- Espresso Beans: $0.02 / g
    (2, 2, 0.002),-- Whole Milk: $0.002 / ml
    (1, 3, 0.01); -- Vanilla Syrup: $0.01 / ml

INSERT INTO deliveries (supplier_id, employee_id, delivery_date) 
VALUES 
    (1, 1, CURRENT_DATE - INTERVAL '7 days'),
    (2, 1, CURRENT_DATE - INTERVAL '3 days');

INSERT INTO delivery_items (delivery_id, ingredient_id, quantity_received, unit_cost) 
VALUES 
    (1, 1, 5000.00, 0.02),
    (1, 3, 3000.00, 0.01),
    (2, 2, 20000.00, 0.002);