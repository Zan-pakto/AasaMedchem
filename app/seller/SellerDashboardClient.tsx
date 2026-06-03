'use client';

import { useState, useTransition } from 'react';
import { 
  createProductAction, 
  updateProductAction, 
  deleteProductAction 
} from '../actions/products';
import { formatINR, Unit, UNIT_DETAILS, convertQty } from '@/lib/units';
import { 
  Plus, Search, Edit2, Trash2, AlertTriangle, CheckCircle, 
  XCircle, Clock, Package, ShoppingCart, Loader2, X
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

export default function SellerDashboardClient({ initialProducts, initialOrders }: ClientProps) {
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
  const activeOrdersCount = initialOrders.filter((o) => o.status === 'pending').length;
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
    if (!confirm('Are you sure you want to delete this product?')) return;
    
    startTransition(async () => {
      const res = await deleteProductAction(id);
      if (!res.success) {
        alert(res.error || 'Failed to delete product.');
      }
    });
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Upper Info / Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-white">Seller Dashboard</h2>
          <p className="text-sm text-zinc-400 mt-1">Manage your catalog, edit stock quantities, and view client purchases.</p>
        </div>
        
        {activeTab === 'products' && (
          <button
            onClick={() => {
              setModalError(null);
              setShowAddModal(true);
            }}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-600/20 transition-all cursor-pointer self-start md:self-auto shrink-0"
          >
            <Plus className="h-4 w-4" />
            Add New Product
          </button>
        )}
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-6 shadow-md backdrop-blur-sm flex items-center gap-4">
          <div className="rounded-xl bg-indigo-500/10 p-3.5 text-indigo-400 border border-indigo-500/10">
            <Package className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs text-zinc-500 block">Total Catalog Size</span>
            <span className="text-2xl font-black text-white">{totalProductsCount} Items</span>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-6 shadow-md backdrop-blur-sm flex items-center gap-4">
          <div className={`rounded-xl p-3.5 border ${
            outOfStockCount > 0 
              ? 'bg-red-500/10 text-red-400 border-red-500/10' 
              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/10'
          }`}>
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs text-zinc-500 block">Out of Stock Warnings</span>
            <span className={`text-2xl font-black ${outOfStockCount > 0 ? 'text-red-400' : 'text-zinc-300'}`}>
              {outOfStockCount} Products
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-6 shadow-md backdrop-blur-sm flex items-center gap-4">
          <div className="rounded-xl bg-yellow-500/10 p-3.5 text-yellow-400 border border-yellow-500/10">
            <Clock className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs text-zinc-500 block">Pending Orders</span>
            <span className="text-2xl font-black text-white">{activeOrdersCount} Requests</span>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-6 shadow-md backdrop-blur-sm flex items-center gap-4">
          <div className="rounded-xl bg-emerald-500/10 p-3.5 text-emerald-400 border border-emerald-500/10">
            <ShoppingCart className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs text-zinc-500 block">Total Sales Value</span>
            <span className="text-2xl font-black text-emerald-400">{formatINR(totalSales)}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
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
          Manage Catalog
        </button>
        <button
          onClick={() => setActiveTab('orders')}
          className={`flex items-center gap-2 border-b-2 px-6 py-3.5 text-sm font-semibold transition-all cursor-pointer ${
            activeTab === 'orders'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <ShoppingCart className="h-4 w-4" />
          Client Purchases ({initialOrders.length})
        </button>
      </div>

      {/* Tab: Products Manager */}
      {activeTab === 'products' && (
        <div className="space-y-6">
          {/* Search bar */}
          <div className="relative max-w-md">
            <Search className="absolute left-3.5 top-3.5 h-5 w-5 text-zinc-500" />
            <input
              type="text"
              placeholder="Search products by name or SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-2xl border border-zinc-800 bg-zinc-900/30 py-3 pl-11 pr-4 text-sm text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 backdrop-blur-sm"
            />
          </div>

          {/* Table */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/10 overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-zinc-850 text-xs font-bold text-zinc-500 uppercase tracking-wider bg-zinc-950/20">
                    <th className="px-6 py-4">SKU / Code</th>
                    <th className="px-6 py-4">Product Name</th>
                    <th className="px-6 py-4">Description</th>
                    <th className="px-6 py-4 text-right">Base Price</th>
                    <th className="px-6 py-4 text-right">Stock Quantity</th>
                    <th className="px-6 py-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-850/40 text-zinc-300">
                  {filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-16 text-center text-zinc-500">
                        <Package className="h-10 w-10 mx-auto text-zinc-700 mb-2 animate-pulse" />
                        No products listed in catalog yet.
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map((product) => {
                      const isOutOfStock = product.inventory_qty <= 0;
                      return (
                        <tr key={product.id} className="hover:bg-zinc-900/5 group">
                          <td className="px-6 py-4 font-mono text-xs text-zinc-400 group-hover:text-zinc-300 transition-colors">
                            {product.sku}
                          </td>
                          <td className="px-6 py-4 font-semibold text-white">
                            {product.name}
                          </td>
                          <td className="px-6 py-4 text-xs text-zinc-400 line-clamp-2 max-w-xs py-5">
                            {product.description || <span className="italic text-zinc-600">No description</span>}
                          </td>
                          <td className="px-6 py-4 text-right font-semibold text-zinc-200">
                            {formatINR(product.base_price)} / {product.base_unit}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                              isOutOfStock 
                                ? 'bg-red-500/10 text-red-400 border-red-500/20' 
                                : product.inventory_qty <= 10
                                ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            }`}>
                              {product.inventory_qty.toFixed(4)} {product.base_unit}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => {
                                  setModalError(null);
                                  setEditingProduct(product);
                                }}
                                className="p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white cursor-pointer transition-all"
                                title="Edit Product"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteProduct(product.id)}
                                disabled={isPending}
                                className="p-2 rounded-lg bg-zinc-900 hover:bg-red-950/20 border border-zinc-800 hover:border-red-900/30 text-zinc-400 hover:text-red-400 cursor-pointer transition-all disabled:opacity-50"
                                title="Delete Product"
                              >
                                {isPending ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Trash2 className="h-3.5 w-3.5" />
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Client Purchases */}
      {activeTab === 'orders' && (
        <div className="space-y-6">
          {initialOrders.length === 0 ? (
            <div className="py-16 text-center text-zinc-500 rounded-2xl border border-dashed border-zinc-800">
              <ShoppingCart className="h-10 w-10 mx-auto text-zinc-700 mb-2" />
              No purchases have been placed by buyers yet.
            </div>
          ) : (
            <div className="space-y-6">
              {initialOrders.map((order) => (
                <div 
                  key={order.id} 
                  className="rounded-2xl border border-zinc-800 bg-zinc-900/20 overflow-hidden shadow-lg"
                >
                  {/* Order Header */}
                  <div className="bg-zinc-900/60 px-6 py-4 border-b border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-white text-lg">Purchase Order #{order.id}</span>
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase border ${
                          order.status === 'approved'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : order.status === 'rejected'
                            ? 'bg-red-500/10 text-red-400 border-red-500/20'
                            : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                        }`}>
                          {order.status === 'approved' && <CheckCircle className="h-3 w-3" />}
                          {order.status === 'rejected' && <XCircle className="h-3 w-3" />}
                          {order.status === 'pending' && <Clock className="h-3 w-3 animate-pulse" />}
                          {order.status}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400 mt-1">
                        Placed by <span className="font-medium text-zinc-200">{order.user_name}</span> ({order.user_email}) on {new Date(order.created_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-zinc-500 block">Total Paid Value</span>
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
                          <th className="px-6 py-3 text-right">Purchased Quantity</th>
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
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal: Add Product */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl animate-scaleIn">
            <div className="flex items-center justify-between border-b border-zinc-900 pb-3 mb-5">
              <h3 className="text-lg font-bold text-white">Add New Product</h3>
              <button 
                onClick={() => setShowAddModal(false)}
                className="text-zinc-500 hover:text-white transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {modalError && (
              <div className="mb-4 flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 p-3.5 text-xs font-semibold text-red-400">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                {modalError}
              </div>
            )}

            <form onSubmit={handleAddProduct} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Product Name</label>
                <input 
                  type="text" 
                  name="name" 
                  required
                  placeholder="e.g. Basmati Rice"
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900/50 px-3.5 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1.5">SKU / Unique Code</label>
                <input 
                  type="text" 
                  name="sku" 
                  required
                  placeholder="e.g. RICE-BAS-01"
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900/50 px-3.5 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Description (Optional)</label>
                <textarea 
                  name="description" 
                  placeholder="Describe your product..."
                  rows={2}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900/50 px-3.5 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Base Unit</label>
                  <select 
                    name="base_unit"
                    defaultValue="item"
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="item">item (Count)</option>
                    <option value="kg">kg (Weight)</option>
                    <option value="g">g (Weight)</option>
                    <option value="L">L (Volume)</option>
                    <option value="mL">mL (Volume)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Initial Stock</label>
                  <input 
                    type="number" 
                    step="0.0001"
                    name="inventory_qty"
                    required
                    defaultValue="0"
                    placeholder="0.00"
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900/50 px-3.5 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Base Unit Price (INR)</label>
                <input 
                  type="number" 
                  step="0.01"
                  name="base_price"
                  required
                  placeholder="0.00"
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900/50 px-3.5 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 font-semibold"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-zinc-900 mt-5">
                <button 
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-xl border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 px-4 py-2 text-sm font-semibold text-zinc-400 hover:text-white transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isPending}
                  className="flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-indigo-600/10 cursor-pointer disabled:opacity-50"
                >
                  {isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Add Product'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Product */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl animate-scaleIn">
            <div className="flex items-center justify-between border-b border-zinc-900 pb-3 mb-5">
              <h3 className="text-lg font-bold text-white font-semibold">Edit Product: {editingProduct.name}</h3>
              <button 
                onClick={() => setEditingProduct(null)}
                className="text-zinc-500 hover:text-white transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {modalError && (
              <div className="mb-4 flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 p-3.5 text-xs font-semibold text-red-400">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                {modalError}
              </div>
            )}

            <form onSubmit={handleEditProduct} className="space-y-4">
              <input type="hidden" name="id" value={editingProduct.id} />
              
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Product Name</label>
                <input 
                  type="text" 
                  name="name" 
                  required
                  defaultValue={editingProduct.name}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900/50 px-3.5 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1.5">SKU / Unique Code</label>
                <input 
                  type="text" 
                  name="sku" 
                  required
                  defaultValue={editingProduct.sku}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900/50 px-3.5 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Description (Optional)</label>
                <textarea 
                  name="description" 
                  defaultValue={editingProduct.description}
                  rows={2}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900/50 px-3.5 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Base Unit</label>
                  <select 
                    name="base_unit"
                    defaultValue={editingProduct.base_unit}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="item">item (Count)</option>
                    <option value="kg">kg (Weight)</option>
                    <option value="g">g (Weight)</option>
                    <option value="L">L (Volume)</option>
                    <option value="mL">mL (Volume)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Current Stock</label>
                  <input 
                    type="number" 
                    step="0.0001"
                    name="inventory_qty"
                    required
                    defaultValue={editingProduct.inventory_qty}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900/50 px-3.5 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Base Unit Price (INR)</label>
                <input 
                  type="number" 
                  step="0.01"
                  name="base_price"
                  required
                  defaultValue={editingProduct.base_price}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900/50 px-3.5 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 font-semibold"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-zinc-900 mt-5">
                <button 
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="rounded-xl border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 px-4 py-2 text-sm font-semibold text-zinc-400 hover:text-white transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isPending}
                  className="flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-indigo-600/10 cursor-pointer disabled:opacity-50"
                >
                  {isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Save Changes'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
