'use client';

import { useState, useTransition } from 'react';
import { 
  createProductAction, 
  updateProductAction, 
  deleteProductAction 
} from '../actions/products';
import { updateOrderStatusAction } from '../actions/orders';
import { formatINR, Unit, UNIT_DETAILS, convertQty } from '@/lib/units';
import { 
  Plus, Search, Edit2, Trash2, AlertTriangle, CheckCircle, 
  XCircle, Clock, Package, ShoppingCart, Info, Loader2, X, ArrowUpRight
} from 'lucide-react';

interface Product {
  id: number;
  name: string;
  sku: string;
  description: string;
  base_unit: Unit;
  base_price: number;
  inventory_qty: number;
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
  user_name: string;
  user_email: string;
  items: OrderItem[];
}

interface ClientProps {
  initialProducts: Product[];
  initialOrders: Order[];
}

export default function AdminDashboardClient({ initialProducts, initialOrders }: ClientProps) {
  const [activeTab, setActiveTab] = useState<'products' | 'orders'>('products');
  const [searchQuery, setSearchQuery] = useState('');
  const [isPending, startTransition] = useTransition();

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  
  // Form error/success
  const [modalError, setModalError] = useState<string | null>(null);

  // Filtered Products
  const filteredProducts = initialProducts.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Total metrics
  const totalProductsCount = initialProducts.length;
  const outOfStockCount = initialProducts.filter((p) => p.inventory_qty <= 0).length;
  const pendingOrdersCount = initialOrders.filter((o) => o.status === 'pending').length;
  const totalSales = initialOrders
    .filter((o) => o.status === 'approved')
    .reduce((sum, o) => sum + o.total_price, 0);

  // Handlers
  const handleAddProduct = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setModalError(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const res = await createProductAction(formData);
      if (res.success) {
        setShowAddModal(false);
      } else {
        setModalError(res.error || 'Failed to create product.');
      }
    });
  };

  const handleEditProduct = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setModalError(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const res = await updateProductAction(formData);
      if (res.success) {
        setEditingProduct(null);
      } else {
        setModalError(res.error || 'Failed to update product.');
      }
    });
  };

  const handleDeleteProduct = async (id: number) => {
    if (confirm('Are you sure you want to delete this product? This may fail if referenced in existing orders.')) {
      startTransition(async () => {
        const res = await deleteProductAction(id);
        if (!res.success) {
          alert(res.error || 'Failed to delete product.');
        }
      });
    }
  };

  const handleOrderStatus = async (orderId: number, status: 'approved' | 'rejected') => {
    const verb = status === 'approved' ? 'approve' : 'reject';
    if (confirm(`Are you sure you want to ${verb} this order?`)) {
      startTransition(async () => {
        const res = await updateOrderStatusAction(orderId, status);
        if (!res.success) {
          alert(res.error || `Failed to ${verb} order.`);
        }
      });
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-white">Admin Command Center</h2>
          <p className="text-sm text-zinc-400 mt-1">Configure inventory rates, track stock levels, and authorize pending quotations.</p>
        </div>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 shadow-lg backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Total Products</span>
            <Package className="h-5 w-5 text-indigo-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white">{totalProductsCount}</span>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 shadow-lg backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Out Of Stock</span>
            <AlertTriangle className={`h-5 w-5 ${outOfStockCount > 0 ? 'text-amber-400 animate-pulse' : 'text-zinc-500'}`} />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className={`text-3xl font-bold ${outOfStockCount > 0 ? 'text-amber-400' : 'text-white'}`}>
              {outOfStockCount}
            </span>
            <span className="text-xs text-zinc-500">items need restock</span>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 shadow-lg backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Pending Orders</span>
            <Clock className={`h-5 w-5 ${pendingOrdersCount > 0 ? 'text-purple-400 animate-pulse' : 'text-zinc-500'}`} />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className={`text-3xl font-bold ${pendingOrdersCount > 0 ? 'text-purple-400' : 'text-white'}`}>
              {pendingOrdersCount}
            </span>
            <span className="text-xs text-zinc-500">awaiting review</span>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 shadow-lg backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Approved Sales</span>
            <ArrowUpRight className="h-5 w-5 text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-400">{formatINR(totalSales)}</span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-zinc-800">
        <button
          onClick={() => setActiveTab('products')}
          className={`flex items-center gap-2 border-b-2 px-6 py-3.5 text-sm font-semibold transition-all cursor-pointer ${
            activeTab === 'products'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Package className="h-4 w-4" />
          Products & Inventory
        </button>
        <button
          onClick={() => setActiveTab('orders')}
          className={`flex items-center gap-2 border-b-2 px-6 py-3.5 text-sm font-semibold transition-all cursor-pointer relative ${
            activeTab === 'orders'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <ShoppingCart className="h-4 w-4" />
          Quotations / Orders
          {pendingOrdersCount > 0 && (
            <span className="absolute right-0 top-3 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-purple-500"></span>
            </span>
          )}
        </button>
      </div>

      {/* Products & Inventory Section */}
      {activeTab === 'products' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-center gap-4 justify-between bg-zinc-900/20 p-4 rounded-2xl border border-zinc-800/60">
            {/* Search Input */}
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3.5 top-3 h-4.5 w-4.5 text-zinc-500" />
              <input
                type="text"
                placeholder="Search by name or SKU..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 py-2.5 pl-10 pr-4 text-sm text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            
            {/* Add Product Trigger */}
            <button
              onClick={() => {
                setModalError(null);
                setShowAddModal(true);
              }}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-600/10 transition-colors w-full sm:w-auto cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              Add Product
            </button>
          </div>

          {/* Product Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.length === 0 ? (
              <div className="col-span-full py-16 text-center text-zinc-500 rounded-2xl border border-dashed border-zinc-800">
                <Package className="h-10 w-10 mx-auto text-zinc-700 mb-2" />
                No products found matching your search.
              </div>
            ) : (
              filteredProducts.map((product) => {
                const isOutOfStock = product.inventory_qty <= 0;
                return (
                  <div 
                    key={product.id} 
                    className="relative group rounded-2xl border border-zinc-800 bg-zinc-900/30 p-6 shadow-md hover:border-zinc-700 transition-all flex flex-col justify-between"
                  >
                    <div>
                      {/* Product Header */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="font-bold text-white text-lg group-hover:text-indigo-400 transition-colors">
                          {product.name}
                        </h3>
                        <span className="shrink-0 text-[10px] font-bold text-zinc-500 bg-zinc-900 border border-zinc-800 rounded px-2 py-0.5 uppercase tracking-wider">
                          {product.sku}
                        </span>
                      </div>

                      {/* Description */}
                      <p className="text-sm text-zinc-400 line-clamp-2 min-h-[40px] mb-4">
                        {product.description || 'No description provided.'}
                      </p>
                    </div>

                    {/* Meta Fields */}
                    <div className="border-t border-zinc-800/80 pt-4 mt-auto space-y-3">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-zinc-500">Base Unit Rate:</span>
                        <span className="font-semibold text-zinc-200">
                          {formatINR(product.base_price)} / {product.base_unit}
                        </span>
                      </div>

                      <div className="flex justify-between items-center text-sm">
                        <span className="text-zinc-500">Inventory Level:</span>
                        <div className="flex items-center gap-1.5">
                          {isOutOfStock ? (
                            <span className="inline-flex items-center gap-1 rounded bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-400 border border-red-500/20">
                              <AlertTriangle className="h-3 w-3" />
                              Out of Stock
                            </span>
                          ) : (
                            <span className={`font-bold ${product.inventory_qty < 10 ? 'text-amber-400' : 'text-zinc-200'}`}>
                              {product.inventory_qty.toFixed(4)} {product.base_unit}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex gap-2 pt-2 border-t border-zinc-800/40">
                        <button
                          onClick={() => {
                            setModalError(null);
                            setEditingProduct(product);
                          }}
                          className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-850 px-3 py-2 text-xs font-semibold text-zinc-300 hover:text-white transition-colors cursor-pointer"
                        >
                          <Edit2 className="h-3.5 w-3.5 text-zinc-400" />
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(product.id)}
                          disabled={isPending}
                          className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-zinc-900 hover:bg-red-950/20 border border-zinc-850 hover:border-red-900/30 px-3 py-2 text-xs font-semibold text-zinc-300 hover:text-red-400 transition-colors cursor-pointer disabled:opacity-50"
                        >
                          <Trash2 className="h-3.5 w-3.5 text-zinc-400 hover:text-red-400" />
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Orders Section */}
      {activeTab === 'orders' && (
        <div className="space-y-6">
          {initialOrders.length === 0 ? (
            <div className="py-16 text-center text-zinc-500 rounded-2xl border border-dashed border-zinc-800">
              <ShoppingCart className="h-10 w-10 mx-auto text-zinc-700 mb-2" />
              No orders or quotations have been submitted yet.
            </div>
          ) : (
            <div className="space-y-6">
              {initialOrders.map((order) => {
                const isPendingOrder = order.status === 'pending';
                return (
                  <div 
                    key={order.id} 
                    className="rounded-2xl border border-zinc-800 bg-zinc-900/20 overflow-hidden shadow-lg"
                  >
                    {/* Order Header */}
                    <div className="bg-zinc-900/60 px-6 py-4 border-b border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-white text-lg">Order #{order.id}</span>
                          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase border ${
                            order.status === 'approved'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : order.status === 'rejected'
                              ? 'bg-red-500/10 text-red-400 border-red-500/20'
                              : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                          }`}>
                            {order.status === 'approved' && <CheckCircle className="h-3 w-3" />}
                            {order.status === 'rejected' && <XCircle className="h-3 w-3" />}
                            {order.status === 'pending' && <Clock className="h-3 w-3 animate-spin" />}
                            {order.status}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-400 mt-1">
                          By <span className="font-medium text-zinc-200">{order.user_name}</span> ({order.user_email}) on {new Date(order.created_at).toLocaleString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-zinc-500 block">Total Quotation Value</span>
                        <span className="text-xl font-bold text-white">{formatINR(order.total_price)}</span>
                      </div>
                    </div>

                    {/* Order Items Table */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-zinc-850 text-xs font-bold text-zinc-500 uppercase tracking-wider bg-zinc-950/20">
                            <th className="px-6 py-3">Product SKU</th>
                            <th className="px-6 py-3">Product Name</th>
                            <th className="px-6 py-3 text-right">Ordered Quantity</th>
                            <th className="px-6 py-3 text-right">Equivalent Base Quantity</th>
                            <th className="px-6 py-3 text-right">Effective Rate</th>
                            <th className="px-6 py-3 text-right">Calculated Subtotal</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-850/40 text-sm text-zinc-300">
                          {order.items.map((item, idx) => {
                            const isConversionApplied = item.ordered_unit !== item.base_unit;
                            const convertedQtyVal = isConversionApplied 
                              ? convertQty(item.ordered_qty, item.ordered_unit, item.base_unit)
                              : item.ordered_qty;
                              
                            return (
                              <tr key={idx} className="hover:bg-zinc-900/10">
                                <td className="px-6 py-3.5 font-mono text-xs text-zinc-400">{item.sku}</td>
                                <td className="px-6 py-3.5 font-medium text-white">{item.product_name}</td>
                                <td className="px-6 py-3.5 text-right font-semibold text-zinc-200">
                                  {item.ordered_qty.toFixed(4)} {item.ordered_unit}
                                </td>
                                <td className="px-6 py-3.5 text-right">
                                  <div className="flex flex-col items-end">
                                    <span className={isConversionApplied ? 'text-indigo-400 font-semibold' : 'text-zinc-400'}>
                                      {convertedQtyVal.toFixed(4)} {item.base_unit}
                                    </span>
                                    {isConversionApplied && (
                                      <span className="text-[10px] text-zinc-500">
                                        (Conv: {UNIT_DETAILS[item.ordered_unit].factor / UNIT_DETAILS[item.base_unit].factor}x)
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-6 py-3.5 text-right font-mono text-xs">
                                  {formatINR(item.price_at_order)} / {item.ordered_unit}
                                  {isConversionApplied && (
                                    <span className="text-[10px] text-zinc-500 block">
                                      (Base: {formatINR(item.base_price)} / {item.base_unit})
                                    </span>
                                  )}
                                </td>
                                <td className="px-6 py-3.5 text-right font-semibold text-white">
                                  {formatINR(item.calculated_price)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Order Action Footer */}
                    {isPendingOrder && (
                      <div className="bg-zinc-950/40 border-t border-zinc-850 px-6 py-4 flex justify-end gap-3">
                        <button
                          onClick={() => handleOrderStatus(order.id, 'rejected')}
                          disabled={isPending}
                          className="flex items-center gap-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 px-4 py-2 text-sm font-semibold text-red-400 cursor-pointer disabled:opacity-50"
                        >
                          <XCircle className="h-4 w-4" />
                          Reject
                        </button>
                        <button
                          onClick={() => handleOrderStatus(order.id, 'approved')}
                          disabled={isPending}
                          className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 px-5 py-2 text-sm font-bold text-white shadow-lg shadow-emerald-600/10 cursor-pointer disabled:opacity-50"
                        >
                          <CheckCircle className="h-4 w-4" />
                          Approve Quotation
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Add Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-3xl border border-zinc-800 bg-zinc-900 p-8 shadow-2xl animate-scaleUp">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white">Add New Product</h3>
              <button 
                onClick={() => setShowAddModal(false)}
                className="text-zinc-400 hover:text-zinc-200 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {modalError && (
              <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                {modalError}
              </div>
            )}

            <form onSubmit={handleAddProduct} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Product Name</label>
                  <input
                    type="text"
                    name="name"
                    required
                    placeholder="Basmati Rice"
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">SKU</label>
                  <input
                    type="text"
                    name="sku"
                    required
                    placeholder="RICE-BAS-01"
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Description</label>
                <textarea
                  name="description"
                  rows={2}
                  placeholder="Product description and specs..."
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Base Unit</label>
                  <select
                    name="base_unit"
                    required
                    defaultValue="kg"
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none cursor-pointer"
                  >
                    <option value="g">g (grams)</option>
                    <option value="kg">kg (kilograms)</option>
                    <option value="L">L (liters)</option>
                    <option value="mL">mL (milliliters)</option>
                    <option value="item">item (count)</option>
                  </select>
                </div>

                <div className="space-y-1.5 col-span-2">
                  <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Base Price (INR)</label>
                  <input
                    type="number"
                    step="0.0001"
                    name="base_price"
                    required
                    placeholder="120.00"
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Initial Stock Qty</label>
                <input
                  type="number"
                  step="0.0001"
                  name="inventory_qty"
                  placeholder="500.00"
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-xl border border-zinc-800 hover:bg-zinc-800 px-5 py-2.5 text-sm font-semibold text-zinc-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-600/10 cursor-pointer"
                >
                  {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Product Modal */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-3xl border border-zinc-800 bg-zinc-900 p-8 shadow-2xl animate-scaleUp">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white">Edit Product</h3>
              <button 
                onClick={() => setEditingProduct(null)}
                className="text-zinc-400 hover:text-zinc-200 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {modalError && (
              <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                {modalError}
              </div>
            )}

            <form onSubmit={handleEditProduct} className="space-y-4">
              <input type="hidden" name="id" value={editingProduct.id} />
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Product Name</label>
                  <input
                    type="text"
                    name="name"
                    required
                    defaultValue={editingProduct.name}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">SKU</label>
                  <input
                    type="text"
                    name="sku"
                    required
                    defaultValue={editingProduct.sku}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Description</label>
                <textarea
                  name="description"
                  rows={2}
                  defaultValue={editingProduct.description}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Base Unit</label>
                  <select
                    name="base_unit"
                    required
                    defaultValue={editingProduct.base_unit}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none cursor-pointer"
                  >
                    <option value="g">g (grams)</option>
                    <option value="kg">kg (kilograms)</option>
                    <option value="L">L (liters)</option>
                    <option value="mL">mL (milliliters)</option>
                    <option value="item">item (count)</option>
                  </select>
                </div>

                <div className="space-y-1.5 col-span-2">
                  <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Base Price (INR)</label>
                  <input
                    type="number"
                    step="0.0001"
                    name="base_price"
                    required
                    defaultValue={editingProduct.base_price}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Current Stock Qty</label>
                <input
                  type="number"
                  step="0.0001"
                  name="inventory_qty"
                  defaultValue={editingProduct.inventory_qty}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="rounded-xl border border-zinc-800 hover:bg-zinc-800 px-5 py-2.5 text-sm font-semibold text-zinc-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-600/10 cursor-pointer"
                >
                  {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Update Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
