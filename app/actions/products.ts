'use server';

import { sql } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { Unit } from '@/lib/units';

export type ProductActionResponse = {
  success: boolean;
  error?: string;
};

/**
 * Creates a new product (Admin only)
 */
export async function createProductAction(formData: FormData): Promise<ProductActionResponse> {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return { success: false, error: 'Unauthorized: Admin access required.' };
  }

  const name = formData.get('name') as string;
  const sku = formData.get('sku') as string;
  const description = formData.get('description') as string;
  const base_unit = formData.get('base_unit') as Unit;
  const base_price_raw = formData.get('base_price') as string;
  const inventory_qty_raw = formData.get('inventory_qty') as string;

  if (!name || !sku || !base_unit || !base_price_raw) {
    return { success: false, error: 'Name, SKU, Base Unit, and Base Price are required.' };
  }

  const base_price = parseFloat(base_price_raw);
  const inventory_qty = inventory_qty_raw ? parseFloat(inventory_qty_raw) : 0;

  if (isNaN(base_price) || base_price < 0) {
    return { success: false, error: 'Base Price must be a valid non-negative number.' };
  }
  if (isNaN(inventory_qty) || inventory_qty < 0) {
    return { success: false, error: 'Inventory Quantity must be a valid non-negative number.' };
  }

  try {
    // Check SKU uniqueness
    const existing = await sql`
      SELECT id FROM products WHERE sku = ${sku.toUpperCase().trim()} LIMIT 1
    `;
    if (existing.length > 0) {
      return { success: false, error: `Product SKU "${sku.toUpperCase().trim()}" already exists.` };
    }

    await sql`
      INSERT INTO products (name, sku, description, base_unit, base_price, inventory_qty)
      VALUES (${name.trim()}, ${sku.toUpperCase().trim()}, ${description?.trim() || null}, ${base_unit}, ${base_price}, ${inventory_qty})
    `;

    revalidatePath('/admin');
    revalidatePath('/seller');
    return { success: true };
  } catch (error: any) {
    console.error('Create product error:', error);
    return { success: false, error: 'Failed to create product. ' + (error.message || '') };
  }
}

/**
 * Updates an existing product (Admin only)
 */
export async function updateProductAction(formData: FormData): Promise<ProductActionResponse> {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return { success: false, error: 'Unauthorized: Admin access required.' };
  }

  const idRaw = formData.get('id') as string;
  const name = formData.get('name') as string;
  const sku = formData.get('sku') as string;
  const description = formData.get('description') as string;
  const base_unit = formData.get('base_unit') as Unit;
  const base_price_raw = formData.get('base_price') as string;
  const inventory_qty_raw = formData.get('inventory_qty') as string;

  if (!idRaw || !name || !sku || !base_unit || !base_price_raw) {
    return { success: false, error: 'Product ID, Name, SKU, Base Unit, and Base Price are required.' };
  }

  const id = parseInt(idRaw);
  const base_price = parseFloat(base_price_raw);
  const inventory_qty = inventory_qty_raw ? parseFloat(inventory_qty_raw) : 0;

  if (isNaN(id)) {
    return { success: false, error: 'Invalid product ID.' };
  }
  if (isNaN(base_price) || base_price < 0) {
    return { success: false, error: 'Base Price must be a valid non-negative number.' };
  }
  if (isNaN(inventory_qty) || inventory_qty < 0) {
    return { success: false, error: 'Inventory Quantity must be a valid non-negative number.' };
  }

  try {
    // Check SKU uniqueness excluding current product
    const existing = await sql`
      SELECT id FROM products WHERE sku = ${sku.toUpperCase().trim()} AND id != ${id} LIMIT 1
    `;
    if (existing.length > 0) {
      return { success: false, error: `Product SKU "${sku.toUpperCase().trim()}" is already used by another product.` };
    }

    await sql`
      UPDATE products 
      SET name = ${name.trim()},
          sku = ${sku.toUpperCase().trim()},
          description = ${description?.trim() || null},
          base_unit = ${base_unit},
          base_price = ${base_price},
          inventory_qty = ${inventory_qty},
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
    `;

    revalidatePath('/admin');
    revalidatePath('/seller');
    return { success: true };
  } catch (error: any) {
    console.error('Update product error:', error);
    return { success: false, error: 'Failed to update product. ' + (error.message || '') };
  }
}

/**
 * Deletes a product (Admin only)
 */
export async function deleteProductAction(id: number): Promise<ProductActionResponse> {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return { success: false, error: 'Unauthorized: Admin access required.' };
  }

  try {
    await sql`
      DELETE FROM products WHERE id = ${id}
    `;
    revalidatePath('/admin');
    revalidatePath('/seller');
    return { success: true };
  } catch (error: any) {
    console.error('Delete product error:', error);
    return { success: false, error: 'Failed to delete product. It may be referenced in existing orders.' };
  }
}
