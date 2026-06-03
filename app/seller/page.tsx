import { getSession } from '@/lib/auth';
import { sql } from '@/lib/db';
import { redirect } from 'next/navigation';
import Navbar from '@/components/Navbar';
import SellerDashboardClient from './SellerDashboardClient';

export const dynamic = 'force-dynamic';

export default async function SellerPage() {
  const session = await getSession();

  // Guard route
  if (!session || session.role !== 'seller') {
    redirect('/');
  }

  // Fetch all products for browse
  const products = await sql`
    SELECT id, name, sku, description, base_unit, base_price, inventory_qty
    FROM products
    ORDER BY name ASC
  `;

  // Fetch all orders in the system with customer details
  const orders = await sql`
    SELECT 
      o.id, 
      o.status, 
      o.total_price::float as total_price, 
      o.created_at, 
      u.name as user_name,
      u.email as user_email,
      COALESCE(
        json_agg(
          json_build_object(
            'id', oi.id,
            'product_name', p.name,
            'sku', p.sku,
            'ordered_qty', oi.ordered_qty::float,
            'ordered_unit', oi.ordered_unit,
            'price_at_order', oi.price_at_order::float,
            'calculated_price', oi.calculated_price::float,
            'base_unit', p.base_unit,
            'base_price', p.base_price::float
          )
        ) FILTER (WHERE oi.id IS NOT NULL),
        '[]'
      ) as items
    FROM orders o
    JOIN users u ON o.user_id = u.id
    LEFT JOIN order_items oi ON o.id = oi.order_id
    LEFT JOIN products p ON oi.product_id = p.id
    GROUP BY o.id, u.name, u.email
    ORDER BY o.created_at DESC
  `;

  // Format data
  const formattedProducts = products.map((p) => ({
    id: p.id,
    name: p.name,
    sku: p.sku,
    description: p.description || '',
    base_unit: p.base_unit,
    base_price: parseFloat(p.base_price),
    inventory_qty: parseFloat(p.inventory_qty),
  }));

  const formattedOrders = orders.map((o) => ({
    id: o.id,
    status: o.status,
    total_price: o.total_price,
    created_at: o.created_at,
    user_name: o.user_name,
    user_email: o.user_email,
    items: typeof o.items === 'string' ? JSON.parse(o.items) : o.items,
  }));

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      <Navbar user={session} />
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <SellerDashboardClient 
          initialProducts={formattedProducts} 
          initialOrders={formattedOrders} 
        />
      </main>
    </div>
  );
}
