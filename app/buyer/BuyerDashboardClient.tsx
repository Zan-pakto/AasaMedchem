'use client';

import { useState, useTransition } from 'react';
import { placeOrderAction, OrderItemInput } from '../actions/orders';
import { formatINR, Unit, convertQty, convertPrice } from '@/lib/units';
import { 
  Search, Trash2, ShoppingCart, CheckCircle, 
  AlertCircle, Info, Loader2, Plus, ArrowRight, History
} from 'lucide-react';

interface Product {
  id: number;
  name: string;
  sku: string;
  description: string;
  base_unit: Unit;
  base_price: number;
  inventory_qty: number;
  seller_name?: string;
}

interface CartItem {
  product: Product;
  qty: number;
  unit: Unit;
}

interface OrderItem {
  id: number;
  product_name: string;
  sku: string;
  ordered_qty: number;
  ordered_unit: Unit;
  price_at_order: number;
  calculated_price: number;
  base_unit: Unit;
  base_price: number;
}

interface Order {
  id: number;
  status: 'pending' | 'approved' | 'rejected';
  total_price: number;
  created_at: string;
  items: OrderItem[];
}

interface ClientProps {
  initialProducts: Product[];
  initialOrders: Order[];
}

export default function BuyerDashboardClient({ initialProducts, initialOrders }: ClientProps) {
  const [activeTab, setActiveTab] = useState<'shop' | 'history'>('shop');
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isPending, startTransition] = useTransition();

  // Filter products matching search
  const filteredProducts = initialProducts.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Helper to determine compatible units
  const getCompatibleUnits = (baseUnit: Unit): Unit[] => {
    if (baseUnit === 'kg' || baseUnit === 'g') return ['g', 'kg'];
    if (baseUnit === 'L' || baseUnit === 'mL') return ['mL', 'L'];
    return ['item'];
  };

  // Add to cart
  const addToCart = (product: Product) => {
    const exists = cart.find((item) => item.product.id === product.id);
    if (exists) return; // already in cart
    
    setCart([...cart, { product, qty: 1, unit: product.base_unit }]);
  };

  // Update cart item quantity
  const updateCartQty = (productId: number, qty: number) => {
    setCart(
      cart.map((item) =>
        item.product.id === productId ? { ...item, qty: Math.max(0.0001, qty) } : item
      )
    );
  };

  // Update cart item unit
  const updateCartUnit = (productId: number, unit: Unit) => {
    setCart(
      cart.map((item) =>
        item.product.id === productId ? { ...item, unit } : item
      )
    );
  };

  // Remove from cart
  const removeFromCart = (productId: number) => {
    setCart(cart.filter((item) => item.product.id !== productId));
  };

  // Calculate cart line item values
  const calculateCartDetails = (item: CartItem) => {
    const basePrice = item.product.base_price;
    const baseUnit = item.product.base_unit;
    
    // Converted price per selected unit
    const ratePerUnit = convertPrice(basePrice, baseUnit, item.unit);
    const itemTotal = item.qty * ratePerUnit;

    // Equivalent quantity in base unit
    const qtyInBaseUnit = convertQty(item.qty, item.unit, baseUnit);

    // Stock check
    const isOutOfStock = qtyInBaseUnit > item.product.inventory_qty;

    return {
      ratePerUnit,
      itemTotal,
      qtyInBaseUnit,
      isOutOfStock,
    };
  };

  // Calculate total cart price
  const cartTotal = cart.reduce((sum, item) => {
    const { itemTotal } = calculateCartDetails(item);
    return sum + itemTotal;
  }, 0);

  // Check if any cart item has insufficient stock
  const hasStockErrors = cart.some((item) => {
    const { isOutOfStock } = calculateCartDetails(item);
    return isOutOfStock;
  });

  // Handle Purchase Placement
  const handlePlacePurchase = async () => {
    if (cart.length === 0) return;
    if (hasStockErrors) {
      alert('One or more items exceed available stock. Please adjust quantities.');
      return;
    }

    const itemsInput: OrderItemInput[] = cart.map((item) => ({
      productId: item.product.id,
      orderedQty: item.qty,
      orderedUnit: item.unit,
    }));

    startTransition(async () => {
      const res = await placeOrderAction(itemsInput);
      if (res.success) {
        setCart([]);
        setActiveTab('history');
        alert('Purchase successful! Inventory has been updated.');
      } else {
        alert(res.error || 'Failed to place purchase.');
      }
    });
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Page Header */}
      <div>
        <h2 className="text-3xl font-extrabold tracking-tight text-white">Buyer Purchase Desk</h2>
        <p className="text-sm text-zinc-400 mt-1">Browse our real-time catalog, configure unit conversions, and place direct purchases with instant stock updates.</p>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-zinc-800">
        <button
          onClick={() => setActiveTab('shop')}
          className={`flex items-center gap-2 border-b-2 px-6 py-3.5 text-sm font-semibold transition-all cursor-pointer ${
            activeTab === 'shop'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <ShoppingCart className="h-4 w-4" />
          Purchase Builder
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 border-b-2 px-6 py-3.5 text-sm font-semibold transition-all cursor-pointer ${
            activeTab === 'history'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <History className="h-4 w-4" />
          My Purchase History
        </button>
      </div>

      {/* Purchase Builder Tab */}
      {activeTab === 'shop' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Product Catalog - 7 Cols */}
          <div className="lg:col-span-7 space-y-6">
            {/* Search Catalogs */}
            <div className="relative">
              <Search className="absolute left-3.5 top-3.5 h-5 w-5 text-zinc-500" />
              <input
                type="text"
                placeholder="Search catalog by name or SKU..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-2xl border border-zinc-800 bg-zinc-900/30 py-3 pl-11 pr-4 text-sm text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 backdrop-blur-sm"
              />
            </div>

            {/* Catalog Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredProducts.length === 0 ? (
                <div className="col-span-full py-16 text-center text-zinc-500 rounded-2xl border border-dashed border-zinc-800">
                  <AlertCircle className="h-10 w-10 mx-auto text-zinc-700 mb-2" />
                  No products found matching &quot;{searchQuery}&quot;
                </div>
              ) : (
                filteredProducts.map((product) => {
                  const isOutOfStock = product.inventory_qty <= 0;
                  const isInCart = cart.some((item) => item.product.id === product.id);

                  return (
                    <div 
                      key={product.id}
                      className="rounded-2xl border border-zinc-800/80 bg-zinc-900/20 p-5 flex flex-col justify-between hover:border-zinc-700 transition-all shadow-md"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <h4 className="font-bold text-white leading-tight">{product.name}</h4>
                          <span className="text-[9px] font-bold text-zinc-500 bg-zinc-950/60 border border-zinc-855 px-1.5 py-0.5 rounded tracking-wide uppercase shrink-0">
                            {product.sku}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-400 line-clamp-2 min-h-[32px] mb-2">
                          {product.description || 'No description available.'}
                        </p>
                        {product.seller_name && (
                          <div className="text-[10px] text-indigo-400 font-semibold mb-3">
                            Sold by: {product.seller_name}
                          </div>
                        )}
                      </div>

                      <div className="border-t border-zinc-800/60 pt-3 mt-auto flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-zinc-500 block">Catalog Price</span>
                          <span className="text-sm font-semibold text-zinc-200">
                            {formatINR(product.base_price)} / {product.base_unit}
                          </span>
                        </div>

                        {isOutOfStock ? (
                          <span className="rounded bg-red-500/10 border border-red-500/20 px-2 py-1 text-xs font-semibold text-red-400">
                            Out of Stock
                          </span>
                        ) : (
                          <button
                            onClick={() => addToCart(product)}
                            disabled={isInCart}
                            className={`flex items-center gap-1 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                              isInCart
                                ? 'bg-zinc-800 text-zinc-400 border border-zinc-750 cursor-default'
                                : 'bg-sky-600 hover:bg-sky-700 text-white shadow-lg shadow-sky-600/15'
                            }`}
                          >
                            {isInCart ? 'In Cart' : (
                              <>
                                <Plus className="h-3.5 w-3.5" />
                                Add
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Cart & Conversion Engine - 5 Cols */}
          <div className="lg:col-span-5 rounded-2xl border border-zinc-800 bg-zinc-900/30 p-6 shadow-xl backdrop-blur-md space-y-6">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-sky-400" />
                <h3 className="font-bold text-white text-lg">Purchase Cart</h3>
              </div>
              <span className="text-xs text-zinc-400 font-semibold bg-zinc-900 px-2.5 py-1 rounded-lg border border-zinc-850">
                {cart.length} items selected
              </span>
            </div>

            {cart.length === 0 ? (
              <div className="py-20 text-center text-zinc-500">
                <ShoppingCart className="h-8 w-8 mx-auto text-zinc-700 mb-3" />
                Your purchase cart is empty. Add products from the catalog to make a purchase.
              </div>
            ) : (
              <div className="space-y-5">
                {/* Cart Items List */}
                <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
                  {cart.map((item) => {
                    const { ratePerUnit, itemTotal, qtyInBaseUnit, isOutOfStock } = calculateCartDetails(item);
                    const compatibleUnits = getCompatibleUnits(item.product.base_unit);
                    const showConvInfo = item.unit !== item.product.base_unit;

                    return (
                      <div 
                        key={item.product.id}
                        className={`rounded-xl border p-4 space-y-3.5 bg-zinc-950/40 relative ${
                          isOutOfStock ? 'border-red-900/50 bg-red-950/5' : 'border-zinc-800/80'
                        }`}
                      >
                        {/* Title and delete */}
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h5 className="text-sm font-bold text-white">{item.product.name}</h5>
                            <span className="text-[10px] text-zinc-500 font-mono">Stock: {item.product.inventory_qty.toFixed(4)} {item.product.base_unit}</span>
                          </div>
                          <button
                            onClick={() => removeFromCart(item.product.id)}
                            className="text-zinc-500 hover:text-red-400 transition-colors p-1 cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>

                        {/* Input controls */}
                        <div className="grid grid-cols-12 gap-2">
                          {/* Qty Input */}
                          <div className="col-span-7">
                            <input
                              type="number"
                              step="0.0001"
                              value={item.qty}
                              onChange={(e) => updateCartQty(item.product.id, parseFloat(e.target.value) || 0)}
                              className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                            />
                          </div>

                          {/* Unit Select */}
                          <div className="col-span-5">
                            <select
                              value={item.unit}
                              onChange={(e) => updateCartUnit(item.product.id, e.target.value as Unit)}
                              className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                            >
                              {compatibleUnits.map((u) => (
                                <option key={u} value={u}>
                                  {u}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* Dynamic calculations indicator */}
                        <div className="rounded-lg bg-zinc-900/50 p-2.5 text-[11px] space-y-1">
                          <div className="flex justify-between">
                            <span className="text-zinc-500">Effective Rate:</span>
                            <span className="font-mono text-zinc-300">
                              {formatINR(ratePerUnit)} per {item.unit}
                            </span>
                          </div>
                          
                          {showConvInfo && (
                            <div className="flex justify-between items-center text-sky-400 font-semibold border-t border-zinc-850/50 pt-1 mt-1">
                              <span className="flex items-center gap-0.5">
                                <Info className="h-3 w-3" />
                                Base Equiv:
                              </span>
                              <span>
                                {qtyInBaseUnit.toFixed(4)} {item.product.base_unit}
                              </span>
                            </div>
                          )}

                          <div className="flex justify-between text-white font-bold border-t border-zinc-850/80 pt-1.5 mt-1">
                            <span>Subtotal:</span>
                            <span>{formatINR(itemTotal)}</span>
                          </div>
                        </div>

                        {/* Stock warning */}
                        {isOutOfStock && (
                          <div className="flex items-center gap-1.5 text-xs text-red-400 font-semibold">
                            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                            Exceeds stock limits! Max: {item.product.inventory_qty.toFixed(4)} {item.product.base_unit}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Checkout Summary */}
                <div className="border-t border-zinc-850 pt-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-zinc-400">Total Purchase:</span>
                    <span className="text-2xl font-black text-sky-400">{formatINR(cartTotal)}</span>
                  </div>

                  <button
                    onClick={handlePlacePurchase}
                    disabled={isPending || hasStockErrors}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 py-3 text-sm font-bold text-white shadow-lg shadow-sky-600/10 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin text-white" />
                    ) : (
                      <>
                        Buy Directly (Instant Checkout)
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div className="space-y-6">
          {initialOrders.length === 0 ? (
            <div className="py-16 text-center text-zinc-500 rounded-2xl border border-dashed border-zinc-800">
              <History className="h-10 w-10 mx-auto text-zinc-700 mb-2" />
              You haven&apos;t placed any purchases yet.
            </div>
          ) : (
            <div className="space-y-6">
              {initialOrders.map((order) => {
                return (
                  <div 
                    key={order.id} 
                    className="rounded-2xl border border-zinc-800 bg-zinc-900/10 overflow-hidden"
                  >
                    {/* Header */}
                    <div className="bg-zinc-900/40 px-6 py-4 border-b border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white">Purchase #{order.id}</span>
                          <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase border bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                            <CheckCircle className="h-3 w-3" />
                            Completed
                          </span>
                        </div>
                        <span className="text-[11px] text-zinc-500 mt-1 block">
                          Purchased on {new Date(order.created_at).toLocaleString()}
                        </span>
                      </div>
                      <div className="sm:text-right">
                        <span className="text-xs text-zinc-500 block">Total Amount Paid</span>
                        <span className="font-bold text-white text-lg">{formatINR(order.total_price)}</span>
                      </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-zinc-850 text-[10px] font-bold text-zinc-500 uppercase tracking-wider bg-zinc-950/20">
                            <th className="px-6 py-2.5">Product SKU</th>
                            <th className="px-6 py-2.5">Product Name</th>
                            <th className="px-6 py-2.5 text-right">Purchased Quantity</th>
                            <th className="px-6 py-2.5 text-right">Equivalent Base Quantity</th>
                            <th className="px-6 py-2.5 text-right">Effective Rate</th>
                            <th className="px-6 py-2.5 text-right">Calculated Price</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-850/30 text-zinc-300">
                          {order.items.map((item, idx) => {
                            const isConversion = item.ordered_unit !== item.base_unit;
                            const convertedVal = isConversion 
                              ? convertQty(item.ordered_qty, item.ordered_unit, item.base_unit)
                              : item.ordered_qty;

                            return (
                              <tr key={idx} className="hover:bg-zinc-900/5">
                                <td className="px-6 py-3 font-mono text-[10px] text-zinc-500">{item.sku}</td>
                                <td className="px-6 py-3 font-medium text-zinc-200">{item.product_name}</td>
                                <td className="px-6 py-3 text-right font-semibold text-zinc-300">
                                  {item.ordered_qty.toFixed(4)} {item.ordered_unit}
                                </td>
                                <td className="px-6 py-3 text-right font-semibold">
                                  <span className={isConversion ? 'text-sky-400' : 'text-zinc-400'}>
                                    {convertedVal.toFixed(4)} {item.base_unit}
                                  </span>
                                </td>
                                <td className="px-6 py-3 text-right font-mono text-zinc-400">
                                  {formatINR(item.price_at_order)} / {item.ordered_unit}
                                </td>
                                <td className="px-6 py-3 text-right font-bold text-white">
                                  {formatINR(item.calculated_price)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
