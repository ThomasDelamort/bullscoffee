DO $$ BEGIN CREATE TYPE employee_status AS ENUM ('active', 'inactive');
EXCEPTION
WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN CREATE TYPE employee_role AS ENUM ('cashier', 'manager');
EXCEPTION
WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN CREATE TYPE order_status AS ENUM ('pending', 'completed', 'cancelled');
EXCEPTION
WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN CREATE TYPE payment_method AS ENUM ('cash', 'card', 'e_wallet');
EXCEPTION
WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN CREATE TYPE stock_movement_reason AS ENUM ('delivery', 'sale', 'waste', 'adjustment');
EXCEPTION
WHEN duplicate_object THEN null;
END $$;

-- ============================ STAFF ============================

CREATE TABLE IF NOT EXISTS employees (
    employee_id SERIAL PRIMARY KEY,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    employee_email VARCHAR(100) NOT NULL UNIQUE,
    contact_number VARCHAR(20),
    employee_status employee_status NOT NULL DEFAULT 'active',
    employee_role employee_role NOT NULL DEFAULT 'cashier',
    work_schedule VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS attendance_logs (
    log_id SERIAL PRIMARY KEY,
    employee_id INT NOT NULL REFERENCES employees(employee_id),
    time_in TIMESTAMPTZ NOT NULL,
    time_out TIMESTAMPTZ,
    CHECK (time_out IS NULL OR time_out > time_in)
);

-- ============================ SALES ============================

CREATE TABLE IF NOT EXISTS customers (
    customer_id SERIAL PRIMARY KEY,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    university_id VARCHAR(50) UNIQUE,
    customer_email VARCHAR(100) NOT NULL UNIQUE,
    contact_number VARCHAR(20),
    profile_picture VARCHAR(150),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================ MENU ==============================

CREATE TABLE IF NOT EXISTS categories (
    category_id SERIAL PRIMARY KEY,
    category_name VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS products (
    product_id SERIAL PRIMARY KEY,
    category_id INT NOT NULL REFERENCES categories(category_id),
    product_name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
    is_available BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ========================== INVENTORY ==========================

CREATE TABLE IF NOT EXISTS ingredients (
    ingredient_id SERIAL PRIMARY KEY,
    ingredient_name VARCHAR(100) NOT NULL UNIQUE,
    unit_of_measure VARCHAR(20) NOT NULL,
    current_quantity DECIMAL(10, 2) NOT NULL DEFAULT 0.00 CHECK (current_quantity >= 0),
    minimum_stock_level DECIMAL(10, 2) NOT NULL DEFAULT 0.00 CHECK (minimum_stock_level >= 0),
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS product_ingredients (
    product_id INT NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
    ingredient_id INT NOT NULL REFERENCES ingredients(ingredient_id),
    quantity_required DECIMAL(10, 2) NOT NULL CHECK (quantity_required > 0),
    PRIMARY KEY (product_id, ingredient_id)
);

CREATE TABLE IF NOT EXISTS stock_movements (
    movement_id SERIAL PRIMARY KEY,
    ingredient_id INT NOT NULL REFERENCES ingredients(ingredient_id),
    employee_id INT NOT NULL REFERENCES employees(employee_id),
    quantity_change DECIMAL(10, 2) NOT NULL CHECK (quantity_change <> 0),
    reason stock_movement_reason NOT NULL,
    moved_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================ SALES (cont.) ============================

CREATE TABLE IF NOT EXISTS orders (
    order_id SERIAL PRIMARY KEY,
    customer_id INT REFERENCES customers(customer_id),
    employee_id INT NOT NULL REFERENCES employees(employee_id),
    ordered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    discount_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00 CHECK (discount_amount >= 0),
    total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00 CHECK (total_amount >= 0),
    order_status order_status NOT NULL DEFAULT 'pending'
);

CREATE TABLE IF NOT EXISTS order_items (
    order_item_id SERIAL PRIMARY KEY,
    order_id INT NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
    product_id INT NOT NULL REFERENCES products(product_id),
    quantity INT NOT NULL CHECK (quantity > 0),
    selling_price DECIMAL(10, 2) NOT NULL CHECK (selling_price >= 0)
);

CREATE TABLE IF NOT EXISTS payments (
    payment_id SERIAL PRIMARY KEY,
    order_id INT NOT NULL REFERENCES orders(order_id),
    amount_paid DECIMAL(10, 2) NOT NULL CHECK (amount_paid > 0),
    payment_method payment_method NOT NULL,
    paid_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =========================== SUPPLY ============================

CREATE TABLE IF NOT EXISTS suppliers (
    supplier_id SERIAL PRIMARY KEY,
    supplier_name VARCHAR(100) NOT NULL UNIQUE,
    contact_person VARCHAR(50),
    supplier_email VARCHAR(100),
    contact_number VARCHAR(20) NOT NULL,
    supplier_address VARCHAR(150),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS supplier_ingredients (
    supplier_id INT NOT NULL REFERENCES suppliers(supplier_id) ON DELETE CASCADE,
    ingredient_id INT NOT NULL REFERENCES ingredients(ingredient_id) ON DELETE CASCADE,
    unit_price DECIMAL(10, 2) NOT NULL CHECK (unit_price >= 0),
    PRIMARY KEY (supplier_id, ingredient_id)
);

CREATE TABLE IF NOT EXISTS deliveries (
    delivery_id SERIAL PRIMARY KEY,
    supplier_id INT NOT NULL REFERENCES suppliers(supplier_id),
    employee_id INT NOT NULL REFERENCES employees(employee_id),
    delivery_date DATE NOT NULL
);

CREATE TABLE IF NOT EXISTS delivery_items (
    delivery_id INT NOT NULL REFERENCES deliveries(delivery_id) ON DELETE CASCADE,
    ingredient_id INT NOT NULL REFERENCES ingredients(ingredient_id),
    quantity_received DECIMAL(10, 2) NOT NULL CHECK (quantity_received > 0),
    unit_cost DECIMAL(10, 2) NOT NULL CHECK (unit_cost >= 0),
    PRIMARY KEY (delivery_id, ingredient_id)
);