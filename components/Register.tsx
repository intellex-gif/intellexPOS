import React, { useState, useMemo } from 'react';
import { Product, CartItem, Transaction } from '../types.ts';
import { Search, Plus, Minus, Trash2, CreditCard, Banknote, Smartphone, CheckCircle, ShoppingBag } from 'lucide-react';

interface RegisterProps {
  products: Product[];
  onCompleteTransaction: (transaction: Transaction) => void;
}

export const Register: React.FC<RegisterProps> = ({ products, onCompleteTransaction }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);

  const categories = useMemo(() => {
    const cats = Array.from(new Set(products.map(p => p.category)));
    return ['All', ...cats];
  }, [products]);

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const addToCart = (product: Product) => {
    // Check expiry
    if (product.expiryDate && new Date(product.expiryDate) < new Date()) {
      alert("Warning: This product is expired!");
      // Allow adding but maybe warn? For this demo, we allow it with alert.
    }
    if (product.stock <= 0) {
      alert("Out of stock!");
      return;
    }

    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        // Don't add more than stock
        if (existing.quantity >= product.stock) {
          alert("Max stock reached in cart");
          return prev;
        }
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = item.quantity + delta;
        // Validate against stock
        if (newQty > item.stock) return item; 
        return { ...item, quantity: newQty };
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  // Totals
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const taxRate = 0.08; // 8% tax
  const tax = subtotal * taxRate;
  const total = subtotal + tax;

  const handleCheckout = (method: 'cash' | 'card' | 'digital') => {
    const transaction: Transaction = {
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      items: [...cart],
      subtotal,
      tax,
      total,
      paymentMethod: method,
    };
    onCompleteTransaction(transaction);
    setCart([]);
    setPaymentModalOpen(false);
  };

  return (
    <div className="flex h-[calc(100vh-6rem)] gap-6">
      {/* Product Selection Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Search & Filter Header */}
        <div className="p-4 border-b border-slate-100 flex gap-4 bg-slate-50">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="text" 
              placeholder="Search product by name or SKU..." 
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select 
            className="px-4 py-2 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Product Grid */}
        <div className="flex-1 overflow-y-auto p-4 bg-slate-50/50">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredProducts.map(product => {
              const isExpired = product.expiryDate && new Date(product.expiryDate) < new Date();
              const isLowStock = product.stock > 0 && product.stock < 5;
              const isOutOfStock = product.stock === 0;

              return (
                <button 
                  key={product.id}
                  onClick={() => addToCart(product)}
                  disabled={isOutOfStock}
                  className={`relative flex flex-col p-4 bg-white rounded-xl border transition-all hover:shadow-md text-left
                    ${isOutOfStock ? 'opacity-60 cursor-not-allowed border-slate-200' : 'cursor-pointer border-slate-200 hover:border-blue-400'}
                    ${isExpired ? 'border-red-200 bg-red-50/20' : ''}
                  `}
                >
                  <div className="flex justify-between items-start w-full mb-2">
                     <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{product.sku}</span>
                     {isExpired && <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-bold">EXP</span>}
                  </div>
                  
                  <h3 className="font-semibold text-slate-800 line-clamp-2 h-10 mb-1">{product.name}</h3>
                  <div className="mt-auto flex justify-between items-end w-full">
                    <span className="text-lg font-bold text-blue-600">${product.price.toFixed(2)}</span>
                    <span className={`text-xs font-medium px-2 py-1 rounded ${isLowStock ? 'bg-yellow-100 text-yellow-700' : 'bg-slate-100 text-slate-600'}`}>
                      {isOutOfStock ? '0 Left' : `${product.stock} Left`}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
          {filteredProducts.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-slate-400">
              <Search size={48} className="mb-2 opacity-50" />
              <p>No products found.</p>
            </div>
          )}
        </div>
      </div>

      {/* Cart Sidebar */}
      <div className="w-96 bg-white rounded-2xl shadow-xl border border-slate-200 flex flex-col overflow-hidden">
        <div className="p-4 bg-slate-800 text-white flex justify-between items-center">
          <h2 className="font-semibold text-lg">Current Order</h2>
          <span className="bg-slate-700 px-2 py-1 rounded text-xs text-slate-300">{cart.length} items</span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-2">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center">
                <ShoppingBag size={24} className="opacity-50" />
              </div>
              <p>Cart is empty</p>
              <p className="text-xs text-slate-400 text-center px-8">Select products from the grid to begin a transaction.</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                <div className="flex-1 min-w-0 pr-2">
                  <h4 className="font-medium text-slate-800 truncate">{item.name}</h4>
                  <div className="text-xs text-slate-500">${item.price.toFixed(2)} / unit</div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 bg-white rounded border border-slate-200">
                    <button onClick={() => updateQuantity(item.id, -1)} className="p-1 hover:bg-slate-100 text-slate-600"><Minus size={14} /></button>
                    <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.id, 1)} className="p-1 hover:bg-slate-100 text-slate-600"><Plus size={14} /></button>
                  </div>
                  <div className="font-semibold w-16 text-right">${(item.price * item.quantity).toFixed(2)}</div>
                  <button onClick={() => removeFromCart(item.id)} className="text-red-400 hover:text-red-600 p-1"><Trash2 size={16} /></button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Totals Section */}
        <div className="p-6 bg-slate-50 border-t border-slate-200 space-y-3">
          <div className="flex justify-between text-sm text-slate-600">
            <span>Subtotal</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm text-slate-600">
            <span>Tax (8%)</span>
            <span>${tax.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-xl font-bold text-slate-900 pt-2 border-t border-slate-200">
            <span>Total</span>
            <span>${total.toFixed(2)}</span>
          </div>

          <button 
            disabled={cart.length === 0}
            onClick={() => setPaymentModalOpen(true)}
            className="w-full py-4 mt-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-lg shadow-blue-200 transition-all flex justify-center items-center gap-2"
          >
            Checkout
          </button>
        </div>
      </div>

      {/* Simple Modal for Payment */}
      {paymentModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 w-[400px] shadow-2xl animate-fade-in-up">
            <h3 className="text-xl font-bold mb-6 text-center">Select Payment Method</h3>
            <div className="text-center mb-8">
              <span className="text-4xl font-bold text-blue-600">${total.toFixed(2)}</span>
              <p className="text-slate-500 mt-1">Total Amount Due</p>
            </div>
            
            <div className="space-y-3">
              <button onClick={() => handleCheckout('cash')} className="w-full p-4 border border-slate-200 rounded-xl hover:bg-green-50 hover:border-green-200 flex items-center gap-4 transition-colors group">
                <div className="p-3 bg-green-100 text-green-600 rounded-lg group-hover:bg-green-200"><Banknote size={24} /></div>
                <div className="text-left">
                  <div className="font-semibold text-slate-800">Cash</div>
                  <div className="text-xs text-slate-500">Accept physical currency</div>
                </div>
              </button>

              <button onClick={() => handleCheckout('card')} className="w-full p-4 border border-slate-200 rounded-xl hover:bg-blue-50 hover:border-blue-200 flex items-center gap-4 transition-colors group">
                <div className="p-3 bg-blue-100 text-blue-600 rounded-lg group-hover:bg-blue-200"><CreditCard size={24} /></div>
                <div className="text-left">
                  <div className="font-semibold text-slate-800">Credit/Debit Card</div>
                  <div className="text-xs text-slate-500">Processing via terminal</div>
                </div>
              </button>

              <button onClick={() => handleCheckout('digital')} className="w-full p-4 border border-slate-200 rounded-xl hover:bg-purple-50 hover:border-purple-200 flex items-center gap-4 transition-colors group">
                <div className="p-3 bg-purple-100 text-purple-600 rounded-lg group-hover:bg-purple-200"><Smartphone size={24} /></div>
                <div className="text-left">
                  <div className="font-semibold text-slate-800">Digital Wallet</div>
                  <div className="text-xs text-slate-500">Apple Pay, Google Pay</div>
                </div>
              </button>
            </div>

            <button onClick={() => setPaymentModalOpen(false)} className="mt-6 w-full py-2 text-slate-500 hover:text-slate-800">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
};