-- migrations/001_initial_schema.sql
-- Create custom types
CREATE TYPE order_status AS ENUM ('pending', 'shipped', 'delivered');

-- Users table
CREATE TABLE users (
                       id UUID PRIMARY KEY,
                       email VARCHAR(255) UNIQUE NOT NULL,
                       password_hash VARCHAR(255) NOT NULL,
                       name VARCHAR(255),
                       phone VARCHAR(20),
                       is_supplier BOOLEAN NOT NULL DEFAULT FALSE,
                       rating FLOAT,
                       total_deliveries INTEGER NOT NULL DEFAULT 0,
                       profile_image_url TEXT,
                       created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_is_supplier ON users(is_supplier);

-- Categories table
CREATE TABLE categories (
                            id SERIAL PRIMARY KEY,
                            name VARCHAR(100) NOT NULL UNIQUE
);

-- Insert default categories
INSERT INTO categories (name) VALUES
                                  ('Grains & Rice'),
                                  ('Fresh Vegetables'),
                                  ('Spices & Masalas'),
                                  ('Cooking Oils'),
                                  ('Meat & Poultry'),
                                  ('Dairy Products');

-- Products table
CREATE TABLE products (
                          id UUID PRIMARY KEY,
                          name VARCHAR(255) NOT NULL,
                          description TEXT,
                          price_per_unit DECIMAL(10, 2) NOT NULL,
                          stock_qty INTEGER NOT NULL DEFAULT 0,
                          image_url TEXT,
                          seller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                          category_id INTEGER NOT NULL REFERENCES categories(id),
                          category_name VARCHAR(100) NOT NULL, -- Added denormalized category name
                          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_products_seller ON products(seller_id);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_category_name ON products(category_name); -- Index for category name queries
CREATE INDEX idx_products_name ON products(name);
CREATE INDEX idx_products_stock ON products(stock_qty) WHERE stock_qty > 0;

-- Create a trigger to automatically populate category_name when inserting/updating products
CREATE OR REPLACE FUNCTION update_product_category_name()
RETURNS TRIGGER AS $$
BEGIN
SELECT name INTO NEW.category_name FROM categories WHERE id = NEW.category_id;
RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_product_category_name
    BEFORE INSERT OR UPDATE OF category_id ON products
    FOR EACH ROW
    EXECUTE FUNCTION update_product_category_name();

-- Orders table
CREATE TABLE orders (
                        id UUID PRIMARY KEY,
                        buyer_id UUID NOT NULL REFERENCES users(id),
                        seller_id UUID NOT NULL REFERENCES users(id),
                        status order_status NOT NULL DEFAULT 'pending',
                        total_price DECIMAL(10, 2) NOT NULL,
                        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_orders_buyer ON orders(buyer_id);
CREATE INDEX idx_orders_seller ON orders(seller_id);
CREATE INDEX idx_orders_status ON orders(status);

-- Order items table
CREATE TABLE order_items (
                             id UUID PRIMARY KEY,
                             order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
                             product_id UUID NOT NULL REFERENCES products(id),
                             quantity INTEGER NOT NULL,
                             unit_price DECIMAL(10, 2) NOT NULL
);

CREATE INDEX idx_order_items_order ON order_items(order_id);

-- Conversations table
CREATE TABLE conversations (
                               id UUID PRIMARY KEY,
                               user1_id UUID NOT NULL REFERENCES users(id),
                               user2_id UUID NOT NULL REFERENCES users(id),
                               last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                               UNIQUE(user1_id, user2_id),
                               CHECK (user1_id < user2_id) -- Ensure consistent ordering
);

CREATE INDEX idx_conversations_user1 ON conversations(user1_id);
CREATE INDEX idx_conversations_user2 ON conversations(user2_id);

-- Messages table
CREATE TABLE messages (
                          id UUID PRIMARY KEY,
                          conv_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
                          sender_id UUID NOT NULL REFERENCES users(id),
                          content TEXT NOT NULL,
                          sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_messages_conv ON messages(conv_id);
CREATE INDEX idx_messages_sent_at ON messages(sent_at DESC);

-- Password resets table
CREATE TABLE password_resets (
                                 id UUID PRIMARY KEY,
                                 user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                                 otp_code VARCHAR(6) NOT NULL,
                                 expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_password_resets_user ON password_resets(user_id);
CREATE INDEX idx_password_resets_expires ON password_resets(expires_at);

-- Reviews table (optional, for future implementation)
CREATE TABLE reviews (
                         id UUID PRIMARY KEY,
                         buyer_id UUID NOT NULL REFERENCES users(id),
                         seller_id UUID NOT NULL REFERENCES users(id),
                         order_id UUID NOT NULL REFERENCES orders(id),
                         rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
                         comment TEXT,
                         created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reviews_seller ON reviews(seller_id);
CREATE INDEX idx_reviews_order ON reviews(order_id);

-- Create a trigger to keep category_name synchronized when categories table is updated
CREATE OR REPLACE FUNCTION sync_product_category_names()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        -- Update all products that use this category
UPDATE products SET category_name = NEW.name WHERE category_id = NEW.id;
RETURN NEW;
ELSIF TG_OP = 'DELETE' THEN
        -- This shouldn't happen due to foreign key constraints, but just in case
        RETURN OLD;
END IF;
RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sync_product_category_names
    AFTER UPDATE OF name OR DELETE ON categories
    FOR EACH ROW
    EXECUTE FUNCTION sync_product_category_names();