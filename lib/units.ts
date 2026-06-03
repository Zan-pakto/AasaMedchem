export type Unit = 'g' | 'kg' | 'L' | 'mL' | 'item';

// Simple unit configurations:
// We group units by category (weight, volume, count) and define a conversion factor
// relative to their base reference unit (g, mL, or item):
// - 1 kg = 1000 g
// - 1 L = 1000 mL
// - 1 item = 1 item
export const UNIT_DETAILS = {
  g: { name: 'grams', category: 'weight', factor: 1 },
  kg: { name: 'kilograms', category: 'weight', factor: 1000 },
  mL: { name: 'milliliters', category: 'volume', factor: 1 },
  L: { name: 'liters', category: 'volume', factor: 1000 },
  item: { name: 'items', category: 'count', factor: 1 },
};

/**
 * Checks if two units belong to the same category (e.g., both are weights or both are volumes)
 */
export function areUnitsCompatible(u1: Unit, u2: Unit): boolean {
  return UNIT_DETAILS[u1].category === UNIT_DETAILS[u2].category;
}

/**
 * Converts a quantity from one unit to another
 * Formula: Multiply by the starting unit factor to get the reference unit (e.g., grams),
 * then divide by the target unit factor.
 * Example: 2 kg -> (2 * 1000) / 1 = 2000 g
 */
export function convertQty(qty: number, fromUnit: Unit, toUnit: Unit): number {
  if (!areUnitsCompatible(fromUnit, toUnit)) {
    throw new Error(`Incompatible units: cannot convert from ${fromUnit} to ${toUnit}`);
  }
  return (qty * UNIT_DETAILS[fromUnit].factor) / UNIT_DETAILS[toUnit].factor;
}

/**
 * Converts a price rate from base unit to order unit
 * Formula: Scale the price based on the ratio of the order unit factor to the base unit factor.
 * Example: Price is ₹150 per kg. For g: 150 * (1 / 1000) = ₹0.15 per gram.
 */
export function convertPrice(basePrice: number, baseUnit: Unit, orderUnit: Unit): number {
  if (!areUnitsCompatible(baseUnit, orderUnit)) {
    throw new Error(`Incompatible units: cannot calculate price from ${baseUnit} to ${orderUnit}`);
  }
  return basePrice * (UNIT_DETAILS[orderUnit].factor / UNIT_DETAILS[baseUnit].factor);
}

/**
 * Formats a number as Indian Rupees (INR)
 */
export function formatINR(amount: number | string): string {
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(numericAmount)) return '₹0.00';
  
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numericAmount);
}
