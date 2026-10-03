DO $$ BEGIN CREATE TYPE employee_status AS ENUM ('active', 'inactive');
EXCEPTION
WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN CREATE TYPE employee_role AS ENUM ('cashier', 'manager', 'admin');
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
DO $$ BEGIN CREATE TYPE item_size AS ENUM ('tall', 'grade', 'venti');
EXCEPTION
WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN CREATE TYPE feedback_status AS ENUM ('new', 'reviewed');
EXCEPTION
WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN CREATE TYPE discount_kind AS ENUM ('percent', 'fixed');
EXCEPTION
WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN CREATE TYPE discount_eligibility AS ENUM ('none', 'university_id', 'government_id');
EXCEPTION
WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN CREATE TYPE document_kind AS ENUM ('pdf', 'log');
EXCEPTION
WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN CREATE TYPE order_source AS ENUM ('counter', 'kiosk');
EXCEPTION
WHEN duplicate_object THEN null;
END $$;

-- ============================ STAFF ============================

CREATE TABLE IF NOT EXISTS employees (
    employee_id SERIAL PRIMARY KEY,
    clerk_id VARCHAR(255) UNIQUE NOT NULL,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    employee_email VARCHAR(255) NOT NULL UNIQUE,
    contact_number VARCHAR(20),
    profile_picture VARCHAR(255),
    employee_status employee_status NOT NULL DEFAULT 'active',
    employee_role employee_role NOT NULL DEFAULT 'cashier',
    work_schedule VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Self-heals databases created before clerk_id existed on this table:
-- CREATE TABLE IF NOT EXISTS above is a no-op once the table exists, so a
-- column added to this schema later never reaches an already-created table.
ALTER TABLE employees ADD COLUMN IF NOT EXISTS clerk_id VARCHAR(255) UNIQUE NOT NULL;

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
    clerk_id VARCHAR(255) UNIQUE NOT NULL,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    university_id VARCHAR(50) UNIQUE,
    customer_email VARCHAR(255) NOT NULL UNIQUE,
    contact_number VARCHAR(20),
    profile_picture VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Self-heals databases created before clerk_id existed on this table (see
-- the identical note on the employees table above).
ALTER TABLE customers ADD COLUMN IF NOT EXISTS clerk_id VARCHAR(255) UNIQUE NOT NULL;

-- ============================ MENU ==============================

CREATE TABLE IF NOT EXISTS categories (
    category_id SERIAL PRIMARY KEY,
    category_name VARCHAR(50) NOT NULL UNIQUE,
    image_url VARCHAR(255),
    category_banner VARCHAR(255)
);

-- Self-heals databases created before image_url existed on this table (see
-- the identical note on the employees table above).
ALTER TABLE categories ADD COLUMN IF NOT EXISTS image_url VARCHAR(255);

CREATE TABLE IF NOT EXISTS products (
    product_id SERIAL PRIMARY KEY,
    category_id INT NOT NULL REFERENCES categories(category_id),
    product_name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    image_url VARCHAR(255),
    price DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
    is_available BOOLEAN NOT NULL DEFAULT TRUE,
    has_sizes BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE products ADD COLUMN IF NOT EXISTS has_sizes BOOLEAN NOT NULL DEFAULT FALSE;

-- ========================== INVENTORY ==========================

CREATE TABLE IF NOT EXISTS ingredients (
    ingredient_id SERIAL PRIMARY KEY,
    ingredient_name VARCHAR(100) NOT NULL UNIQUE,
    unit_of_measure VARCHAR(20) NOT NULL,
    image_url VARCHAR(255),
    current_quantity DECIMAL(10, 2) NOT NULL DEFAULT 0.00 CHECK (current_quantity >= 0),
    minimum_stock_level DECIMAL(10, 2) NOT NULL DEFAULT 0.00 CHECK (minimum_stock_level >= 0),
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- Self-heals databases created before image_url existed on this table (see
-- the identical note on the employees table above).
ALTER TABLE ingredients ADD COLUMN IF NOT EXISTS image_url VARCHAR(255);

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
    employee_id INT REFERENCES employees(employee_id),
    ordered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    discount_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00 CHECK (discount_amount >= 0),
    total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00 CHECK (total_amount >= 0),
    order_status order_status NOT NULL DEFAULT 'pending'
);

-- Kiosk orders are placed by customers with no cashier involved, so
-- employee_id stays NULL until someone at the counter completes or cancels
-- the order (see transitionPendingOrder). Self-heals databases created when
-- the column was NOT NULL.
ALTER TABLE orders ALTER COLUMN employee_id DROP NOT NULL;

-- Rows that predate this column can't be told apart, so they read as counter.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_source order_source NOT NULL DEFAULT 'counter';

CREATE TABLE IF NOT EXISTS order_items (
    order_item_id SERIAL PRIMARY KEY,
    order_id INT NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
    product_id INT NOT NULL REFERENCES products(product_id),
    quantity INT NOT NULL CHECK (quantity > 0),
    size item_size,
    selling_price DECIMAL(10, 2) NOT NULL CHECK (selling_price >= 0),
    special_instructions TEXT
);
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS size item_size;
CREATE INDEX IF NOT EXISTS order_items_order_id_idx ON order_items (order_id);

CREATE TABLE IF NOT EXISTS payments (
    payment_id SERIAL PRIMARY KEY,
    order_id INT NOT NULL REFERENCES orders(order_id),
    amount_paid DECIMAL(10, 2) NOT NULL CHECK (amount_paid > 0),
    payment_method payment_method NOT NULL,
    paid_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Every order row sums its payments to work out the balance due.
CREATE INDEX IF NOT EXISTS payments_order_id_idx ON payments (order_id);

-- PayMongo's id (pay_...) for a payment taken online; NULL for one taken at
-- the counter. Unique, so a webhook PayMongo retries is only recorded once.
ALTER TABLE payments ADD COLUMN IF NOT EXISTS paymongo_payment_id VARCHAR(64) UNIQUE;

-- One row: which PayMongo methods checkout offers, set from the admin
-- Payment Gateway page. The API keys aren't here; they live in backend/.env.
CREATE TABLE IF NOT EXISTS payment_settings (
    settings_id INT PRIMARY KEY DEFAULT 1 CHECK (settings_id = 1),
    enabled_methods TEXT[] NOT NULL DEFAULT ARRAY['gcash', 'paymaya', 'grab_pay', 'qrph', 'card'],
    send_email_receipt BOOLEAN NOT NULL DEFAULT TRUE
);
INSERT INTO payment_settings (settings_id) VALUES (1) ON CONFLICT DO NOTHING;

-- =========================== SUPPLY ============================

CREATE TABLE IF NOT EXISTS suppliers (
    supplier_id SERIAL PRIMARY KEY,
    supplier_name VARCHAR(100) NOT NULL UNIQUE,
    contact_person VARCHAR(50),
    supplier_email VARCHAR(255) NOT NULL,
    contact_number VARCHAR(20),
    image_url VARCHAR(255),
    supplier_address VARCHAR(150),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Self-heals databases created before image_url existed on this table (see
-- the identical note on the employees table above).
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS image_url VARCHAR(255);

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

-- =========================== FEEDBACK ============================

CREATE TABLE IF NOT EXISTS feedback (
    feedback_id SERIAL PRIMARY KEY,
    customer_id INT REFERENCES customers(customer_id),
    order_id INT REFERENCES orders(order_id),
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT NOT NULL,
    status feedback_status NOT NULL DEFAULT 'new',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =========================== DISCOUNTS ===========================

CREATE TABLE IF NOT EXISTS discounts (
    discount_id SERIAL PRIMARY KEY,
    discount_name VARCHAR(100) NOT NULL UNIQUE,
    kind discount_kind NOT NULL,
    value DECIMAL(10, 2) NOT NULL CHECK (value > 0),
    eligibility discount_eligibility NOT NULL DEFAULT 'none',
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- Which preset produced orders.discount_amount; NULL for none or a custom
-- amount. Declared here because discounts is created after orders. No ON
-- DELETE: a discount that's been used is switched off, not deleted, so past
-- orders keep its name.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_id INT REFERENCES discounts(discount_id);

-- =========================== DOCUMENTS ===========================

-- PDFs and CSV logs stored in S3 (bulls-coffee/pdfs/, bulls-coffee/logs/).
-- Images don't need this - their row's image_url points at them - but these
-- belong to no other row, and the app's AWS user can't list the bucket, so
-- this table is the index of what's stored. file_url is NULL for logs: they
-- are private and only downloadable through the API.
CREATE TABLE IF NOT EXISTS documents (
    document_id SERIAL PRIMARY KEY,
    kind document_kind NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    s3_key VARCHAR(512) NOT NULL UNIQUE,
    file_url VARCHAR(512),
    size_bytes INT NOT NULL CHECK (size_bytes >= 0),
    uploaded_by INT REFERENCES employees(employee_id) ON DELETE SET NULL,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================ ADMIN ==============================
--
-- Tables a restore must not touch (activity_logs, backups, export_jobs,
-- notification_log, health_checks, request_metrics) hold no foreign keys to
-- tables a backup restores. A restore truncates those tables, which would
-- otherwise either fail or, with CASCADE, wipe the audit trail too. They
-- keep names and plain ids instead.

DO $$ BEGIN CREATE TYPE log_severity AS ENUM ('info', 'warning', 'critical');
EXCEPTION
WHEN duplicate_object THEN null;
END $$;

-- Activity log and audit trail. Insert-only, apart from a flag's review. A
-- row with a flag_reason is in the audit trail until someone reviews it.
-- session_id is set only on sign_in rows, one per Clerk session.
CREATE TABLE IF NOT EXISTS activity_logs (
    log_id BIGSERIAL PRIMARY KEY,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    actor_clerk_id VARCHAR(255),
    actor_name VARCHAR(120) NOT NULL,
    actor_role VARCHAR(20) NOT NULL CHECK (actor_role IN ('admin', 'manager', 'cashier', 'customer', 'system')),
    action TEXT NOT NULL,
    module VARCHAR(30) NOT NULL,
    ip VARCHAR(45),
    severity log_severity NOT NULL DEFAULT 'info',
    flag_reason TEXT,
    flag_reviewed_by VARCHAR(120),
    flag_reviewed_at TIMESTAMPTZ,
    session_id VARCHAR(64) UNIQUE
);
CREATE INDEX IF NOT EXISTS activity_logs_occurred_at_idx ON activity_logs (occurred_at DESC);
CREATE INDEX IF NOT EXISTS activity_logs_unreviewed_idx ON activity_logs (log_id DESC)
    WHERE flag_reason IS NOT NULL AND flag_reviewed_at IS NULL;

-- One row per one-off data step that has run (e.g. a seed), so it never
-- runs again, even if what it created is later deleted on purpose.
CREATE TABLE IF NOT EXISTS app_migrations (
    name VARCHAR(100) PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Which permissions managers and cashiers hold (the catalogue lives in
-- src/lib/permissions.ts). Admins hold every permission and are never
-- stored. Seeded once at startup by seedRolePermissions().
CREATE TABLE IF NOT EXISTS role_permissions (
    role employee_role NOT NULL CHECK (role <> 'admin'),
    permission VARCHAR(50) NOT NULL,
    PRIMARY KEY (role, permission)
);

-- One row of store-wide settings, edited on the admin Settings page (and
-- the backup schedule on Backup & Restore). Only what the system enforces:
-- maintenance_mode and online_ordering stop kiosk orders, store_name and
-- support_email go on every email. Defaults are what the store ran with
-- before these were editable.
CREATE TABLE IF NOT EXISTS system_settings (
    settings_id INT PRIMARY KEY DEFAULT 1 CHECK (settings_id = 1),
    store_name VARCHAR(100) NOT NULL DEFAULT 'Bull''s Coffee',
    support_email VARCHAR(255) NOT NULL DEFAULT 'sup@bullscoffee.com',
    online_ordering BOOLEAN NOT NULL DEFAULT TRUE,
    maintenance_mode BOOLEAN NOT NULL DEFAULT FALSE,
    maintenance_message TEXT NOT NULL DEFAULT 'We''re brewing some updates. Ordering will be back shortly!',
    backup_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    backup_frequency VARCHAR(10) NOT NULL DEFAULT 'daily' CHECK (backup_frequency IN ('hourly', 'daily', 'weekly')),
    backup_time TIME NOT NULL DEFAULT '03:00',
    backup_retention_days INT NOT NULL DEFAULT 30 CHECK (backup_retention_days IN (7, 30, 90, 365)),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by INT REFERENCES employees(employee_id) ON DELETE SET NULL
);
INSERT INTO system_settings (settings_id) VALUES (1) ON CONFLICT DO NOTHING;

DO $$ BEGIN CREATE TYPE notification_status AS ENUM ('sent', 'failed', 'skipped');
EXCEPTION
WHEN duplicate_object THEN null;
END $$;

-- Customer emails sent when something happens to an order, edited on the
-- admin Notification Templates page. {{name}} placeholders are filled in
-- when sending (see lib/notify.ts for the variables).
CREATE TABLE IF NOT EXISTS notification_templates (
    template_id VARCHAR(50) PRIMARY KEY,
    event VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    subject VARCHAR(200) NOT NULL,
    body TEXT NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO notification_templates (template_id, event, name, subject, body) VALUES
    ('order-placed', 'order.placed', 'Order placed', 'We got your order {{order_number}}',
     E'Hi {{customer_name}},\n\nThanks for ordering at {{store_name}}! Order {{order_number}} ({{order_total}}) was placed on {{ordered_at}}. We''ll let you know when it''s ready.\n\nSee you soon!'),
    ('order-completed', 'order.completed', 'Order ready', 'Order {{order_number}} is ready',
     E'Hi {{customer_name}},\n\nYour order {{order_number}} is ready. Enjoy!\n\n{{store_name}}'),
    ('order-cancelled', 'order.cancelled', 'Order cancelled', 'Order {{order_number}} was cancelled',
     E'Hi {{customer_name}},\n\nYour order {{order_number}} ({{order_total}}) from {{ordered_at}} was cancelled. If you already paid, reply to this email and we''ll sort out your refund.\n\n{{store_name}}'),
    ('payment-received', 'payment.received', 'Payment received', 'Receipt for order {{order_number}}',
     E'Hi {{customer_name}},\n\nWe received your payment of {{order_total}} for order {{order_number}}. Thank you!\n\n{{store_name}}')
ON CONFLICT (template_id) DO NOTHING;

-- Every attempt to send one of those emails, for the Notifications page and
-- System Health's email status. template_id and order_id are plain values,
-- not foreign keys (see the note at the top of this section).
CREATE TABLE IF NOT EXISTS notification_log (
    log_id BIGSERIAL PRIMARY KEY,
    template_id VARCHAR(50),
    order_id INT,
    recipient VARCHAR(255),
    status notification_status NOT NULL,
    error TEXT,
    latency_ms INT,
    sent_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS notification_log_sent_at_idx ON notification_log (sent_at DESC);

DO $$ BEGIN CREATE TYPE ticket_kind AS ENUM ('complaint', 'bug');
EXCEPTION
WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN CREATE TYPE ticket_status AS ENUM ('open', 'in_progress', 'resolved', 'closed');
EXCEPTION
WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN CREATE TYPE ticket_priority AS ENUM ('low', 'medium', 'high', 'urgent');
EXCEPTION
WHEN duplicate_object THEN null;
END $$;

-- Complaints and bug reports from the storefront's Contact form, handled on
-- the admin Support Tickets page. customer_id is set when the reporter was
-- signed in; order_id when they named an order that exists.
CREATE TABLE IF NOT EXISTS support_tickets (
    ticket_id SERIAL PRIMARY KEY,
    kind ticket_kind NOT NULL,
    subject VARCHAR(150) NOT NULL,
    description TEXT NOT NULL,
    reporter_name VARCHAR(100) NOT NULL,
    reporter_email VARCHAR(255) NOT NULL,
    customer_id INT REFERENCES customers(customer_id) ON DELETE SET NULL,
    order_id INT REFERENCES orders(order_id) ON DELETE SET NULL,
    priority ticket_priority NOT NULL DEFAULT 'medium',
    status ticket_status NOT NULL DEFAULT 'open',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS support_tickets_status_idx ON support_tickets (status, created_at DESC);

-- Staff replies, each also emailed to the reporter (email_status says
-- whether it went). The reporter's own email replies land in the support
-- inbox and aren't pulled back in here.
CREATE TABLE IF NOT EXISTS ticket_messages (
    message_id SERIAL PRIMARY KEY,
    ticket_id INT NOT NULL REFERENCES support_tickets(ticket_id) ON DELETE CASCADE,
    author_employee_id INT REFERENCES employees(employee_id) ON DELETE SET NULL,
    author_name VARCHAR(120) NOT NULL,
    body TEXT NOT NULL,
    email_status notification_status NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ticket_messages_ticket_id_idx ON ticket_messages (ticket_id);

-- One row per service per probe (a scheduler tick), for System Health's
-- current state and 30-day uptime. Pruned after 30 days. A degraded check
-- (slow, or recent email failures) still counts as up.
CREATE TABLE IF NOT EXISTS health_checks (
    check_id BIGSERIAL PRIMARY KEY,
    service VARCHAR(20) NOT NULL,
    state VARCHAR(15) NOT NULL CHECK (state IN ('operational', 'degraded', 'down', 'not_configured')),
    latency_ms INT,
    detail TEXT,
    checked_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS health_checks_service_idx ON health_checks (service, checked_at DESC);

-- API traffic per minute, summed across server instances. Each instance
-- counts in memory and adds its counts here every minute. Pruned after 30 days.
CREATE TABLE IF NOT EXISTS request_metrics (
    minute TIMESTAMPTZ PRIMARY KEY,
    requests INT NOT NULL DEFAULT 0,
    total_ms BIGINT NOT NULL DEFAULT 0,
    errors_5xx INT NOT NULL DEFAULT 0
);

DO $$ BEGIN CREATE TYPE job_status AS ENUM ('in_progress', 'completed', 'failed');
EXCEPTION
WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN CREATE TYPE backup_kind AS ENUM ('automatic', 'manual');
EXCEPTION
WHEN duplicate_object THEN null;
END $$;

-- The index of database snapshots: gzipped JSON in S3 under
-- bulls-coffee/backups/ (see lib/backup.ts). A restore never touches this
-- table, so the history survives the restore it records.
CREATE TABLE IF NOT EXISTS backups (
    backup_id SERIAL PRIMARY KEY,
    kind backup_kind NOT NULL,
    status job_status NOT NULL DEFAULT 'in_progress',
    s3_key VARCHAR(512) UNIQUE,
    size_bytes BIGINT,
    table_counts JSONB,
    error TEXT,
    created_by_name VARCHAR(120),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    finished_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS backups_created_at_idx ON backups (created_at DESC);
