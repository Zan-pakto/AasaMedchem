'use server';

import { runTransaction } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { Unit, convertQty, convertPrice } from '@/lib/units';

export type OrderActionResponse = {
  success: boolean;
  error?: string;
  orderId?: number;
};

export interface OrderItemInput {
  productId: number;
  orderedQty: number;
  orderedUnit: Unit;
}

/**
 * Places a new order/quotation (Seller only)
 */
export async function placeOrderAction(items: OrderItemInput[]): Promise<OrderActionResponse> {
  const session = await getSession();
  if (!session) {
    return { success: false, error: 'Unauthorized: User session not found.' };
  }

  if (items.length === 0) {
    return { success: false, error: 'Cannot place an empty order/quotation.' };
  }

  // Validate quantities
  for (const item of items) {
    if (isNaN(item.orderedQty) || item.orderedQty <= 0) {
      return { success: false, error: 'All ordered quantities must be greater than zero.' };
    }
  }

  try {
    const isBuyer = session.role === 'buyer';
    const orderStatus = isBuyer ? 'approved' : 'pending';

    const orderId = await runTransaction(async (client) => {
      let totalPrice = 0;
      const verifiedItems = [];

      // 1. Validate each product and calculate prices
      for (const item of items) {
        const queryText = isBuyer
          ? 'SELECT name, base_unit, base_price, inventory_qty FROM products WHERE id = $1 FOR UPDATE'
          : 'SELECT name, base_unit, base_price FROM products WHERE id = $1';

        const res = await client.query(queryText, [item.productId]);
        
        if (res.rows.length === 0) {
          throw new Error(`Product with ID ${item.productId} not found.`);
        }
        
        const product = res.rows[0];
        const baseUnit = product.base_unit as Unit;
        const basePrice = parseFloat(product.base_price);

        if (isBuyer) {
          const currentInventory = parseFloat(product.inventory_qty);
          const qtyInBaseUnit = convertQty(item.orderedQty, item.orderedUnit, baseUnit);
          
          if (currentInventory < qtyInBaseUnit) {
            throw new Error(
              `Insufficient inventory for product "${product.name}". ` +
              `Available: ${currentInventory} ${baseUnit}, ` +
              `Required: ${qtyInBaseUnit.toFixed(4)} ${baseUnit}`
            );
          }

          // Deduct from product inventory immediately for Buyer
          await client.query(
            'UPDATE products SET inventory_qty = inventory_qty - $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            [qtyInBaseUnit, item.productId]
          );
        }

        // Calculate order rate and subtotal
        const ratePerOrderedUnit = convertPrice(basePrice, baseUnit, item.orderedUnit);
        const itemTotalPrice = item.orderedQty * ratePerOrderedUnit;

        totalPrice += itemTotalPrice;

        verifiedItems.push({
          productId: item.productId,
          orderedQty: item.orderedQty,
          orderedUnit: item.orderedUnit,
          priceAtOrder: ratePerOrderedUnit,
          calculatedPrice: itemTotalPrice,
        });
      }

      // 2. Insert order header
      const orderRes = await client.query(
        'INSERT INTO orders (user_id, status, total_price) VALUES ($1, $2, $3) RETURNING id',
        [session.userId, orderStatus, totalPrice]
      );
      const insertedOrderId = orderRes.rows[0].id;

      // 3. Insert order items
      for (const verifiedItem of verifiedItems) {
        await client.query(
          `INSERT INTO order_items 
           (order_id, product_id, ordered_qty, ordered_unit, price_at_order, calculated_price) 
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            insertedOrderId,
            verifiedItem.productId,
            verifiedItem.orderedQty,
            verifiedItem.orderedUnit,
            verifiedItem.priceAtOrder,
            verifiedItem.calculatedPrice,
          ]
        );
      }

      return insertedOrderId;
    });

    revalidatePath('/seller');
    revalidatePath('/admin');
    revalidatePath('/buyer');
    return { success: true, orderId };
  } catch (error) {
    console.error('Place order error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to place order.';
    return { success: false, error: errorMessage };
  }
}

/**
 * Updates the status of an order (Admin only)
 * If approved, verifies inventory levels and deducts stock.
 */
export async function updateOrderStatusAction(
  orderId: number,
  status: 'approved' | 'rejected'
): Promise<OrderActionResponse> {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return { success: false, error: 'Unauthorized: Admin access required.' };
  }

  try {
    await runTransaction(async (client) => {
      // 1. Fetch and lock order row to prevent concurrent updates
      const orderRes = await client.query(
        'SELECT status FROM orders WHERE id = $1 FOR UPDATE',
        [orderId]
      );
      
      if (orderRes.rows.length === 0) {
        throw new Error('Order not found.');
      }
      
      const currentStatus = orderRes.rows[0].status;
      if (currentStatus !== 'pending') {
        throw new Error(`Order has already been processed: current status is ${currentStatus}.`);
      }

      // 2. If approving, check and update inventory
      if (status === 'approved') {
        // Fetch order items joined with product base unit and inventory info
        const itemsRes = await client.query(
          `SELECT oi.product_id, oi.ordered_qty, oi.ordered_unit, p.name, p.base_unit, p.inventory_qty 
           FROM order_items oi
           JOIN products p ON oi.product_id = p.id
           WHERE oi.order_id = $1`,
          [orderId]
        );

        for (const item of itemsRes.rows) {
          const orderedQty = parseFloat(item.ordered_qty);
          const orderedUnit = item.ordered_unit as Unit;
          const baseUnit = item.base_unit as Unit;
          const currentInventory = parseFloat(item.inventory_qty);

          // Convert quantity to base unit
          const qtyInBaseUnit = convertQty(orderedQty, orderedUnit, baseUnit);

          if (currentInventory < qtyInBaseUnit) {
            throw new Error(
              `Insufficient inventory for product "${item.name}". ` +
              `Available: ${currentInventory} ${baseUnit}, ` +
              `Required: ${qtyInBaseUnit.toFixed(4)} ${baseUnit} ` +
              `(Ordered: ${orderedQty} ${orderedUnit})`
            );
          }

          // Deduct from product inventory
          await client.query(
            'UPDATE products SET inventory_qty = inventory_qty - $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            [qtyInBaseUnit, item.product_id]
          );
        }
      }

      // 3. Update order status
      await client.query(
        'UPDATE orders SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [status, orderId]
      );
    });

    revalidatePath('/admin');
    revalidatePath('/seller');
    return { success: true };
  } catch (error) {
    console.error('Update order status error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to update order status.';
    return { success: false, error: errorMessage };
  }
}
