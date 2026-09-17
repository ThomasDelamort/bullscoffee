DO $$ BEGIN CREATE TYPE employee_status AS ENUM ('active', 'inactive');
EXCEPTION
WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN CREATE TYPE payment_method AS ENUM ('cash', 'card', 'mobile_wallet');
EXCEPTION
WHEN duplicate_object THEN null;
END $$;
CREATE TABLE IF NOT EXISTS employees (
    employee_id SERIAL PRIMARY KEY,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    employee_email VARCHAR(100) NOT NULL UNIQUE,
    contact_number VARCHAR(20),
    employee_status employee_status NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS managers (
    employee_id INT PRIMARY KEY REFERENCES employees(employee_id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS cashiers (
    employee_id INT PRIMARY KEY REFERENCES employees(employee_id) ON DELETE CASCADE,
    manager_id INT NOT NULL REFERENCES managers(employee_id),
    work_schedule VARCHAR(50) NOT NULL
);
CREATE TABLE IF NOT EXISTS inventory_staff (
    employee_id INT PRIMARY KEY REFERENCES employees(employee_id) ON DELETE CASCADE,
    manager_id INT NOT NULL REFERENCES managers(employee_id),
    work_schedule VARCHAR(50) NOT NULL
);
CREATE TABLE IF NOT EXISTS customers (
    customer_id SERIAL PRIMARY KEY,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    university_id VARCHAR(50) UNIQUE,
    customer_email VARCHAR(100) NOT NULL UNIQUE,
    contact_number VARCHAR(20),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS products (
    product_id SERIAL PRIMARY KEY,
    product_name VARCHAR(100) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
    category VARCHAR(50) NOT NULL,
    is_available BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS ingredients (
    ingredient_id SERIAL PRIMARY KEY,
    ingredient_name VARCHAR(100) NOT NULL,
    unit_of_measure VARCHAR(20) NOT NULL,
    current_quantity DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    minimum_stock_level DECIMAL(10, 2) NOT NULL DEFAULT 0.00
);
CREATE TABLE IF NOT EXISTS product_ingredients (
    product_id INT NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
    ingredient_id INT NOT NULL REFERENCES ingredients(ingredient_id) ON DELETE CASCADE,
    quantity_required DECIMAL(10, 2) NOT NULL CHECK (quantity_required > 0),
    PRIMARY KEY (product_id, ingredient_id)
);
CREATE TABLE IF NOT EXISTS suppliers (
    supplier_id SERIAL PRIMARY KEY,
    supplier_name VARCHAR(100) NOT NULL,
    contact_person VARCHAR(50),
    contact_number VARCHAR(20) NOT NULL,
    supplier_email VARCHAR(100),
    address VARCHAR(150),
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
    received_by INT NOT NULL REFERENCES inventory_staff(employee_id),
    delivery_date DATE NOT NULL
);
CREATE TABLE IF NOT EXISTS delivery_items (
    delivery_id INT NOT NULL REFERENCES deliveries(delivery_id) ON DELETE CASCADE,
    ingredient_id INT NOT NULL REFERENCES ingredients(ingredient_id) ON DELETE CASCADE,
    quantity_received DECIMAL(10, 2) NOT NULL CHECK (quantity_received > 0),
    unit_cost DECIMAL(10, 2) NOT NULL CHECK (unit_cost >= 0),
    PRIMARY KEY (delivery_id, ingredient_id)
);
CREATE TABLE IF NOT EXISTS orders (
    order_id SERIAL PRIMARY KEY,
    customer_id INT NOT NULL REFERENCES customers(customer_id),
    cashier_id INT NOT NULL REFERENCES cashiers(employee_id),
    order_date DATE NOT NULL,
    order_time TIME NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    order_status VARCHAR(20) NOT NULL DEFAULT 'pending'
);
CREATE TABLE IF NOT EXISTS order_items (
    order_item_id SERIAL PRIMARY KEY,
    order_id INT NOT NULL REFERENCES orders(order_id),
    product_id INT NOT NULL REFERENCES products(product_id),
    quantity INT NOT NULL CHECK (quantity > 0),
    selling_price DECIMAL(10, 2) NOT NULL CHECK (selling_price >= 0)
);
CREATE TABLE IF NOT EXISTS payments (
    order_id INT PRIMARY KEY REFERENCES orders(order_id) ON DELETE CASCADE,
    payment_date TIMESTAMPTZ NOT NULL,
    amount_paid DECIMAL(10, 2) NOT NULL CHECK (amount_paid >= 0),
    payment_method payment_method NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS logs (
    log_id SERIAL PRIMARY KEY,
    employee_id INT NOT NULL REFERENCES employees(employee_id),
    time_in TIMESTAMP NOT NULL,
    time_out TIMESTAMP
);