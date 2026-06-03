import { sql } from './db';
import { hashPassword } from './auth';

export async function initializeDatabase() {
  console.log('Starting database setup...');

  try {
    // 1. Create tables
    console.log('Creating users table...');
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(150) UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role VARCHAR(20) NOT NULL DEFAULT 'seller',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    console.log('Creating products table...');
    await sql`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        seller_id INT REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(150) NOT NULL,
        sku VARCHAR(50) UNIQUE NOT NULL,
        description TEXT,
        base_unit VARCHAR(10) NOT NULL,
        base_price NUMERIC(20, 4) NOT NULL,
        inventory_qty NUMERIC(20, 4) NOT NULL DEFAULT 0.0000,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    console.log('Creating orders table...');
    await sql`
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        total_price NUMERIC(20, 4) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    console.log('Creating order_items table...');
    await sql`
      CREATE TABLE IF NOT EXISTS order_items (
        id SERIAL PRIMARY KEY,
        order_id INT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        product_id INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        ordered_qty NUMERIC(20, 4) NOT NULL,
        ordered_unit VARCHAR(10) NOT NULL,
        price_at_order NUMERIC(20, 4) NOT NULL,
        calculated_price NUMERIC(20, 4) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // Migration step for existing databases: Add seller_id column if it does not exist
    console.log('Checking for database migrations...');
    await sql`
      ALTER TABLE products 
      ADD COLUMN IF NOT EXISTS seller_id INT REFERENCES users(id) ON DELETE CASCADE;
    `;

    console.log('Tables created or already exist.');

    // Seed Predefined Admin
    const adminEmail = 'admin@gmail.com';
    const adminExists = await sql`SELECT id FROM users WHERE email = ${adminEmail} LIMIT 1`;
    if (adminExists.length === 0) {
      const adminHash = hashPassword('admin@1234');
      await sql`
        INSERT INTO users (name, email, password_hash, role)
        VALUES ('System Administrator', ${adminEmail}, ${adminHash}, 'admin')
      `;
      console.log('Predefined admin seeded successfully.');
    }

    console.log('Database setup completed successfully.');
  } catch (error) {
    console.error('Error during database setup:', error);
    throw error;
  }
}

let dbInitialized = false;

export async function ensureDbInitialized() {
  if (dbInitialized) return;
  await initializeDatabase();
  dbInitialized = true;
}

if (typeof require !== 'undefined' && (require.main === module || !module.parent)) {
  initializeDatabase().catch(() => process.exit(1));
}
