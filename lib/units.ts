export type Unit = 'g' | 'kg' | 'L' | 'mL' | 'item';

export interface UnitDetail {
  name: string;
  dimension: 'weight' | 'volume' | 'count';
  factor: number; // Factor relative to reference unit (g for weight, mL for volume, item for count)
}

export const UNIT_DETAILS: Record<Unit, UnitDetail> = {
  g: { name: 'grams', dimension: 'weight', factor: 1 },
  kg: { name: 'kilograms', dimension: 'weight', factor: 1000 },
  mL: { name: 'milliliters', dimension: 'volume', factor: 1 },
  L: { name: 'liters', dimension: 'volume', factor: 1000 },
  item: { name: 'items', dimension: 'count', factor: 1 },
};

/**
 * Checks if two units are compatible (belong to the same physical dimension)
 */
export function areUnitsCompatible(u1: Unit, u2: Unit): boolean {
  return UNIT_DETAILS[u1].dimension === UNIT_DETAILS[u2].dimension;
}

/**
 * Converts a quantity from one unit to another.
 * e.g., convertQty(500, 'g', 'kg') => 0.5
 * e.g., convertQty(2, 'kg', 'g') => 2000
 */
export function convertQty(qty: number, fromUnit: Unit, toUnit: Unit): number {
  if (!areUnitsCompatible(fromUnit, toUnit)) {
    throw new Error(`Incompatible units: cannot convert from ${fromUnit} to ${toUnit}`);
  }
  
  const fromDetail = UNIT_DETAILS[fromUnit];
  const toDetail = UNIT_DETAILS[toUnit];
  
  // Convert from input unit to reference unit, then to target unit
  const qtyInReferenceUnit = qty * fromDetail.factor;
  return qtyInReferenceUnit / toDetail.factor;
}

/**
 * Converts a price rate from base unit to order unit.
 * e.g. If product is sold at 150 INR per kg, what is the rate per g?
 * baseUnit = 'kg', basePrice = 150, orderUnit = 'g'
 * rate per g = 150 * (1 / 1000) = 0.15 INR/g
 */
export function convertPrice(basePrice: number, baseUnit: Unit, orderUnit: Unit): number {
  if (!areUnitsCompatible(baseUnit, orderUnit)) {
    throw new Error(`Incompatible units: cannot calculate price from base unit ${baseUnit} to order unit ${orderUnit}`);
  }
  
  const baseDetail = UNIT_DETAILS[baseUnit];
  const orderDetail = UNIT_DETAILS[orderUnit];
  
  // Price per reference unit = basePrice / baseFactor
  // Price per order unit = Price per reference unit * orderFactor
  return basePrice * (orderDetail.factor / baseDetail.factor);
}

/**
 * Formats an amount as INR currency (e.g. ₹1,234.56)
 */
export function formatINR(amount: number | string): string {
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(numericAmount)) return '₹0.00';
  
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 4, // Allow up to 4 decimal places for high precision pricing
  }).format(numericAmount);
}
