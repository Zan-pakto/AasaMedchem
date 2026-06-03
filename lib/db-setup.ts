import { sql } from './db';
import { hashPassword } from './auth';

async function main() {
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

    console.log('Tables created or already exist.');

    // 2. Seed Default Users
    console.log('Seeding default users...');
    const adminEmail = 'admin@inventory.com';
    const sellerEmail = 'seller@inventory.com';
    const buyerEmail = 'buyer@inventory.com';

    // Check and seed each default user
    const checkUser = async (name: string, email: string, passwordHash: string, role: string) => {
      const existing = await sql`SELECT id FROM users WHERE email = ${email.toLowerCase().trim()} LIMIT 1`;
      if (existing.length === 0) {
        await sql`
          INSERT INTO users (name, email, password_hash, role)
          VALUES (${name}, ${email.toLowerCase().trim()}, ${passwordHash}, ${role})
        `;
        console.log(`- Seeded user: ${email} (${role})`);
      } else {
        console.log(`- User already exists: ${email} (${role})`);
      }
    };

    const adminHash = hashPassword('admin123');
    const sellerHash = hashPassword('seller123');
    const buyerHash = hashPassword('buyer123');

    await checkUser('System Administrator', adminEmail, adminHash, 'admin');
    await checkUser('Retail Seller', sellerEmail, sellerHash, 'seller');
    await checkUser('Retail Buyer', buyerEmail, buyerHash, 'buyer');

    // 3. Seed Default Products
    console.log('Seeding default products...');
    const existingProducts = await sql`SELECT id FROM products LIMIT 1`;
    if (existingProducts.length === 0) {
      await sql`
        INSERT INTO products (name, sku, description, base_unit, base_price, inventory_qty) VALUES 
        ('Premium Saffron', 'SAFF-001', 'High-quality Kashmiri saffron threads.', 'g', 350.0000, 150.0000),
        ('Basmati Rice', 'RICE-BAS-01', 'Premium long grain aged Basmati Rice.', 'kg', 120.0000, 2500.0000),
        ('Organic Olive Oil', 'OIL-OLV-05', 'Extra virgin cold pressed organic olive oil.', 'L', 950.0000, 80.0000),
        ('Hand Sanitizer Gel', 'SAN-GEL-500', '70% Alcohol base moisturizing hand sanitizer.', 'mL', 0.5000, 50000.0000),
        ('Cotton Crewneck T-Shirt', 'TSH-CTN-M', '100% organic cotton classic t-shirt, size M.', 'item', 450.0000, 500.0000)
      `;
      console.log('Default products seeded successfully.');
    } else {
      console.log('Products already seeded.');
    }

    console.log('Database setup completed successfully.');
  } catch (error) {
    console.error('Error during database setup:', error);
    process.exit(1);
  }
}

if (require.main === module || !module.parent) {
  main();
}
