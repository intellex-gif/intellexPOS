import React, { useState, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom/client';
import { 
  LayoutDashboard, ShoppingCart, Package, History, Store,
  DollarSign, ShoppingBag, AlertTriangle, Activity, Sparkles, RefreshCcw,
  Search, Plus, Minus, Trash2, CreditCard, Banknote, Smartphone, CheckCircle,
  Clock, Edit, Trash, Save, AlertCircle, TrendingUp
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

// --- UTILS ---
const generateUUID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// --- TYPES ---
export interface Product {
  id: string;
  sku: string;
  name: string;
  price: number;
  category: string;
  stock: number;
  expiryDate?: string; 
  imageUrl?: string;
}

export interface CartItem extends Product {
  quantity: number;
}

export interface Transaction {
  id: string;
  date: string; 
  items: CartItem[];
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: 'cash' | 'card' | 'digital';
}

export enum Page {
  DASHBOARD = 'dashboard',
  REGISTER = 'register',
  INVENTORY = 'inventory',
  HISTORY = 'history',
}

// --- SERVICES ---

const STORAGE_KEYS = {
  PRODUCTS: 'retailpulse_products',
  TRANSACTIONS: 'retailpulse_transactions',
};

const INITIAL_PRODUCTS: Product[] = [
  { id: '1', sku: 'BV-001', name: 'Organic Almond Milk', price: 4.50, category: 'Dairy', stock: 24, expiryDate: '2025-12-31' },
  { id: '2', sku: 'BK-102', name: 'Whole Wheat Sourdough', price: 6.00, category: 'Bakery', stock: 5, expiryDate: '2023-10-20' }, 
  { id: '3', sku: 'SN-554', name: 'Dark Chocolate Bar', price: 3.25, category: 'Snacks', stock: 100, expiryDate: '2026-05-15' },
  { id: '4', sku: 'FV-201', name: 'Honeycrisp Apple', price: 1.20, category: 'Produce', stock: 0, expiryDate: '2023-11-01' },
  { id: '5', sku: 'BV-005', name: 'Sparkling Water Lemon', price: 1.50, category: 'Beverages', stock: 45, expiryDate: '2025-01-01' },
];

const StorageService = {
  getProducts: (): Product[] => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
      return data ? JSON.parse(data) : INITIAL_PRODUCTS;
    } catch (e) {
      console.error("Storage error", e);
      return INITIAL_PRODUCTS;
    }
  },

  saveProducts: (products: Product[]) => {
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
  },

  getTransactions: (): Transaction[] => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  },

  saveTransaction: (transaction: Transaction) => {
    const transactions = StorageService.getTransactions();
    transactions.unshift(transaction);
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
  },
  
  processSaleStockUpdate: (items: {id: string, quantity: number}[]) => {
    const products = StorageService.getProducts();
    const updatedProducts = products.map(p => {
      const soldItem = items.find(i => i.id === p.id);
      if (soldItem) {
        return { ...p, stock: Math.max(0, p.stock - soldItem.quantity) };
      }
      return p;
    });
    StorageService.saveProducts(updatedProducts);
    return updatedProducts;
  }
};

const getGeminiApiKey = () => {
  return (window as any).process?.env?.API_KEY || '';
};

const GeminiService = {
  analyzeBusiness: async (products: Product[], transactions: Transaction[]) => {
    const apiKey = getGeminiApiKey();
    if (!apiKey) {
      throw new Error("API Key is missing.");
    }

    const ai = new GoogleGenAI({ apiKey });
    
    const lowStock = products.filter(p => p.stock < 10).map(p => p.name);
    const expired = products.filter(p => p.expiryDate && new Date(p.expiryDate) < new Date()).map(p => p.name);
    const recentSales = transactions.slice(0, 10);
    const totalRevenue = transactions.reduce((sum, t) => sum + t.total, 0);

    const prompt = `
      You are an expert retail analyst. Analyze the following store data and provide 3 concise, actionable bullet points for the store owner.
      Focus on inventory health, sales trends, and immediate actions needed.

      Data:
      - Total Revenue (All Time): $${totalRevenue.toFixed(2)}
      - Low Stock Items (<10 units): ${lowStock.join(', ') || 'None'}
      - Expired/Expiring Items: ${expired.join(', ') || 'None'}
      - Recent Transaction Count: ${recentSales.length}

      Keep the tone professional, concise, and helpful.
    `;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });
      return response.text;
    } catch (error) {
      console.error("Gemini API Error:", error);
      throw error;
    }
  },

  generateProductDescription: async (name: string, category: string) => {
    const apiKey = getGeminiApiKey();
    if (!apiKey) return "AI description unavailable (Missing API Key).";
    
    const ai = new GoogleGenAI({ apiKey });
    const prompt = `Write a short, catchy 1-sentence product description for a retail point of sale display. Product: "${name}", Category: "${category}".`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });
      return response.text.trim();
    } catch (error) {
      return "Could not generate description.";
    }
  }
};

// --- COMPONENTS ---

// 1. Dashboard Component
const Dashboard: React.FC<{ products: Product[], transactions: Transaction[] }> = ({ products, transactions }) => {
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);

  const totalRevenue = transactions.reduce((acc, t) => acc + t.total, 0);
  const totalOrders = transactions.length;
  const lowStockItems = products.filter(p => p.stock < 10);
  const expiredItems = products.filter(p => p.expiryDate && new Date(p.expiryDate) < new Date());

  const handleGenerateInsights = async () => {
    setLoadingAi(true);
    try {
      const insight = await GeminiService.analyzeBusiness(products, transactions);
      setAiInsight(insight);
    } catch (e) {
      setAiInsight("Unable to generate insights. Please ensure your API key is configured.");
    } finally {
      setLoadingAi(false);
    }
  };

  const StatCard = ({ title, value, icon: Icon, colorClass, bgClass }: any) => (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center space-x-4 hover:shadow-md transition-shadow">
      <div className={`p-4 rounded-xl ${bgClass} ${colorClass}`}>
        <Icon size={28} />
      </div>
      <div>
        <p className="text-sm text-slate-500 font-semibold uppercase tracking-wider">{title}</p>
        <h3 className="text-3xl font-bold text-slate-800 mt-1">{value}</h3>
      </div>
    </div>
  );

  return (
    <div className="space-y-8 animate-fade-in pb-10">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Dashboard</h2>
          <div className="text-slate-500 mt-1">Real-time overview of your retail performance</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Revenue" value={`$${totalRevenue.toFixed(2)}`} icon={DollarSign} bgClass="bg-green-50" colorClass="text-green-600" />
        <StatCard title="Transactions" value={totalOrders} icon={ShoppingBag} bgClass="bg-blue-50" colorClass="text-blue-600" />
        <StatCard title="Low Stock" value={lowStockItems.length} icon={AlertTriangle} bgClass="bg-amber-50" colorClass="text-amber-600" />
        <StatCard title="Expired" value={expiredItems.length} icon={Activity} bgClass="bg-red-50" colorClass="text-red-600" />
      </div>

      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-8 border border-indigo-100 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 p-32 bg-indigo-100/30 rounded-full blur-3xl -mr-16 -mt-16"></div>
        <div className="relative z-10">
          <div className="flex justify-between items-start mb-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-white rounded-lg shadow-sm">
                <Sparkles className="text-indigo-600" size={24} />
              </div>
              <h3 className="text-xl font-bold text-slate-800">Gemini Business Intelligence</h3>
            </div>
            <button 
              onClick={handleGenerateInsights}
              disabled={loadingAi}
              className="flex items-center space-x-2 px-6 py-2.5 bg-indigo-600 text-white font-medium rounded-xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:shadow-xl transition-all disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loadingAi ? <RefreshCcw className="animate-spin" size={18}/> : <TrendingUp size={18}/>}
              <span>{loadingAi ? 'Analyzing Data...' : 'Generate AI Insights'}</span>
            </button>
          </div>
          
          {aiInsight ? (
            <div className="bg-white/60 backdrop-blur-sm p-6 rounded-xl text-slate-700 leading-relaxed border border-indigo-100/50 shadow-sm whitespace-pre-line text-lg">
              {aiInsight}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500 bg-white/40 rounded-xl border border-indigo-100/30 border-dashed">
              <p className="font-medium">Unlock AI-powered analytics for your store.</p>
              <p className="text-sm mt-1">Get actionable advice on inventory, sales trends, and expiry management.</p>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
          <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <AlertCircle size={20} className="text-amber-500" />
              Stock Attention Needed
            </h3>
          </div>
          <div className="flex-1 overflow-auto max-h-[400px]">
            {lowStockItems.length === 0 && expiredItems.length === 0 ? (
              <div className="p-12 text-center text-slate-400 flex flex-col items-center">
                <CheckCircle size={48} className="text-green-200 mb-3"/>
                <p>Inventory looks healthy!</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {[...expiredItems, ...lowStockItems].map((item, idx) => (
                  <div key={`${item.id}-${idx}`} className="px-8 py-4 flex justify-between items-center hover:bg-slate-50 transition-colors">
                    <div>
                      <div className="font-semibold text-slate-800">{item.name}</div>
                      <div className="text-xs text-slate-500 font-mono mt-0.5">SKU: {item.sku}</div>
                    </div>
                    <div className={`text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wide ${item.stock < 10 && item.stock > 0 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                      {item.stock === 0 ? 'Out of Stock' : (new Date(item.expiryDate || '') < new Date() ? 'Expired' : `Low: ${item.stock}`)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
           <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <History size={20} className="text-blue-500"/>
              Recent Transactions
            </h3>
          </div>
          <div className="flex-1 overflow-auto max-h-[400px]">
            {transactions.length === 0 ? (
               <div className="p-12 text-center text-slate-400">No transactions recorded yet.</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {transactions.slice(0, 10).map(t => (
                  <div key={t.id} className="px-8 py-4 flex justify-between items-center hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs">
                        #{t.id.slice(-4)}
                      </div>
                      <div>
                        <div className="font-medium text-slate-800">Sale</div>
                        <div className="text-xs text-slate-500">{new Date(t.date).toLocaleTimeString()}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-slate-800">${t.total.toFixed(2)}</div>
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">{t.paymentMethod}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// 2. Register Component
const Register: React.FC<{ products: Product[], onCompleteTransaction: (transaction: Transaction) => void }> = ({ products, onCompleteTransaction }) => {
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
    if (product.expiryDate && new Date(product.expiryDate) < new Date()) {
      alert("Warning: This product is expired!");
    }
    if (product.stock <= 0) {
      alert("Out of stock!");
      return;
    }

    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
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
        if (newQty > item.stock) return item; 
        return { ...item, quantity: newQty };
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const taxRate = 0.08; 
  const tax = subtotal * taxRate;
  const total = subtotal + tax;

  const handleCheckout = (method: 'cash' | 'card' | 'digital') => {
    const transaction: Transaction = {
      id: generateUUID(),
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
    <div className="flex h-[calc(100vh-8rem)] gap-6 animate-fade-in">
      <div className="flex-1 flex flex-col min-w-0 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex gap-4 bg-white">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="text" 
              placeholder="Search by name, SKU..." 
              className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select 
            className="px-6 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer font-medium text-slate-700"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30">
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
                  className={`group relative flex flex-col p-5 bg-white rounded-2xl border transition-all hover:shadow-lg text-left overflow-hidden
                    ${isOutOfStock ? 'opacity-60 cursor-not-allowed border-slate-200' : 'cursor-pointer border-slate-200 hover:border-indigo-400'}
                    ${isExpired ? 'border-red-200 bg-red-50/10' : ''}
                  `}
                >
                  <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="bg-indigo-600 text-white p-1.5 rounded-full shadow-lg">
                      <Plus size={16} />
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-start w-full mb-3">
                     <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-100 px-2 py-1 rounded-md">{product.sku}</span>
                     {isExpired && <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-bold">EXP</span>}
                  </div>
                  
                  <h3 className="font-semibold text-slate-800 line-clamp-2 h-10 mb-2 leading-snug">{product.name}</h3>
                  <div className="mt-auto flex justify-between items-end w-full border-t border-slate-50 pt-3">
                    <span className="text-xl font-bold text-slate-900">${product.price.toFixed(2)}</span>
                    <span className={`text-xs font-bold px-2 py-1 rounded-md ${isLowStock ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                      {isOutOfStock ? '0 Left' : `${product.stock} Left`}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
          {filteredProducts.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-slate-400">
              <Search size={64} className="mb-4 opacity-20" />
              <p className="text-lg">No products found matching your criteria.</p>
            </div>
          )}
        </div>
      </div>

      <div className="w-[400px] bg-white rounded-2xl shadow-xl border border-slate-200 flex flex-col overflow-hidden">
        <div className="p-6 bg-slate-900 text-white flex justify-between items-center">
          <div>
            <h2 className="font-bold text-xl">Current Order</h2>
            <p className="text-slate-400 text-xs mt-0.5">Transaction ID: {generateUUID().slice(0,8)}</p>
          </div>
          <span className="bg-slate-800 px-3 py-1 rounded-full text-xs font-bold text-blue-200">{cart.length} ITEMS</span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-3">
              <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center">
                <ShoppingBag size={32} className="opacity-30" />
              </div>
              <p className="font-medium">Cart is empty</p>
              <p className="text-sm text-center px-10 opacity-70">Scan items or select from the catalog to begin.</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.id} className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200 shadow-sm">
                <div className="flex-1 min-w-0 pr-3">
                  <h4 className="font-semibold text-slate-800 truncate text-sm">{item.name}</h4>
                  <div className="text-xs text-slate-500 font-medium mt-0.5">${item.price.toFixed(2)} / unit</div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
                    <button onClick={() => updateQuantity(item.id, -1)} className="p-1 hover:bg-white rounded-md shadow-sm transition text-slate-600"><Minus size={12} /></button>
                    <span className="w-6 text-center text-sm font-bold text-slate-800">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.id, 1)} className="p-1 hover:bg-white rounded-md shadow-sm transition text-slate-600"><Plus size={12} /></button>
                  </div>
                  <div className="font-bold w-14 text-right text-slate-900">${(item.price * item.quantity).toFixed(2)}</div>
                  <button onClick={() => removeFromCart(item.id)} className="text-red-300 hover:text-red-500 p-1.5 hover:bg-red-50 rounded-lg transition"><Trash2 size={16} /></button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-6 bg-white border-t border-slate-200 space-y-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-slate-600">
              <span>Subtotal</span>
              <span className="font-medium">${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-slate-600">
              <span>Tax (8%)</span>
              <span className="font-medium">${tax.toFixed(2)}</span>
            </div>
          </div>
          <div className="flex justify-between text-2xl font-bold text-slate-900 pt-4 border-t border-slate-100">
            <span>Total</span>
            <span>${total.toFixed(2)}</span>
          </div>

          <button 
            disabled={cart.length === 0}
            onClick={() => setPaymentModalOpen(true)}
            className="w-full py-4 mt-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-xl shadow-indigo-200 transition-all transform active:scale-[0.98] flex justify-center items-center gap-2"
          >
            Proceed to Checkout
          </button>
        </div>
      </div>

      {paymentModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white rounded-2xl p-8 w-[420px] shadow-2xl animate-fade-in transform scale-100">
            <h3 className="text-xl font-bold mb-6 text-center text-slate-800">Payment Method</h3>
            <div className="text-center mb-8 bg-slate-50 p-6 rounded-xl border border-slate-100">
              <span className="text-4xl font-bold text-indigo-600 block">${total.toFixed(2)}</span>
              <p className="text-slate-500 text-sm mt-2 font-medium">Total Amount Due</p>
            </div>
            <div className="space-y-3">
              <button onClick={() => handleCheckout('cash')} className="w-full p-4 border border-slate-200 rounded-xl hover:bg-green-50 hover:border-green-200 flex items-center gap-4 transition-all group">
                <div className="p-3 bg-green-100 text-green-600 rounded-xl group-hover:scale-110 transition-transform"><Banknote size={24} /></div>
                <div className="text-left"><div className="font-bold text-slate-800">Cash</div><div className="text-xs text-slate-500">Physical currency</div></div>
              </button>
              <button onClick={() => handleCheckout('card')} className="w-full p-4 border border-slate-200 rounded-xl hover:bg-blue-50 hover:border-blue-200 flex items-center gap-4 transition-all group">
                <div className="p-3 bg-blue-100 text-blue-600 rounded-xl group-hover:scale-110 transition-transform"><CreditCard size={24} /></div>
                <div className="text-left"><div className="font-bold text-slate-800">Card</div><div className="text-xs text-slate-500">Credit or Debit</div></div>
              </button>
              <button onClick={() => handleCheckout('digital')} className="w-full p-4 border border-slate-200 rounded-xl hover:bg-purple-50 hover:border-purple-200 flex items-center gap-4 transition-all group">
                <div className="p-3 bg-purple-100 text-purple-600 rounded-xl group-hover:scale-110 transition-transform"><Smartphone size={24} /></div>
                <div className="text-left"><div className="font-bold text-slate-800">Digital</div><div className="text-xs text-slate-500">Apple/Google Pay</div></div>
              </button>
            </div>
            <button onClick={() => setPaymentModalOpen(false)} className="mt-8 w-full py-3 text-slate-500 font-medium hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors">Cancel Payment</button>
          </div>
        </div>
      )}
    </div>
  );
};

// 3. Inventory Component
const Inventory: React.FC<{ products: Product[], onAddProduct: (p: Product) => void, onUpdateProduct: (p: Product) => void, onDeleteProduct: (id: string) => void }> = ({ products, onAddProduct, onUpdateProduct, onDeleteProduct }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<Partial<Product>>({});
  const [aiLoading, setAiLoading] = useState(false);

  const startAdd = () => {
    setCurrentProduct({ id: generateUUID(), sku: '', name: '', price: 0, stock: 0, category: 'General', expiryDate: '' });
    setIsEditing(true);
  };

  const startEdit = (product: Product) => {
    setCurrentProduct({ ...product });
    setIsEditing(true);
  };

  const handleSave = () => {
    if (!currentProduct.name || !currentProduct.sku || currentProduct.price === undefined) {
      alert("Please fill in required fields");
      return;
    }
    if (products.find(p => p.id === currentProduct.id)) {
      onUpdateProduct(currentProduct as Product);
    } else {
      onAddProduct(currentProduct as Product);
    }
    setIsEditing(false);
  };

  const handleAiDescription = async () => {
    if (!currentProduct.name || !currentProduct.category) {
      alert("Enter a name and category first.");
      return;
    }
    setAiLoading(true);
    const desc = await GeminiService.generateProductDescription(currentProduct.name, currentProduct.category);
    setCurrentProduct(prev => ({ ...prev, name: `${prev.name} - ${desc.substring(0, 30)}...` }));
    setAiLoading(false);
  };

  if (isEditing) {
    return (
      <div className="max-w-3xl mx-auto bg-white p-10 rounded-3xl shadow-xl border border-slate-200 animate-fade-in">
        <h2 className="text-3xl font-bold mb-8 text-slate-800 border-b border-slate-100 pb-4">{currentProduct.id && products.find(p => p.id === currentProduct.id) ? 'Edit Product' : 'Add New Product'}</h2>
        <div className="grid grid-cols-2 gap-8">
          <div className="col-span-2">
            <label className="block text-sm font-bold text-slate-700 mb-2">Product Name</label>
            <div className="flex gap-3">
              <input type="text" className="flex-1 px-5 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all" value={currentProduct.name} onChange={e => setCurrentProduct({...currentProduct, name: e.target.value})} placeholder="e.g., Premium Widget" />
              <button 
                onClick={handleAiDescription} 
                disabled={aiLoading} 
                className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100 hover:bg-indigo-100 transition-colors flex items-center gap-2 font-medium"
                title="Generate AI Description"
              >
                {aiLoading ? <RefreshCcw className="animate-spin" size={20} /> : <Sparkles size={20} />}
                <span>AI Enhance</span>
              </button>
            </div>
          </div>
          <div><label className="block text-sm font-bold text-slate-700 mb-2">SKU</label><input type="text" className="w-full px-5 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none uppercase font-mono" value={currentProduct.sku} onChange={e => setCurrentProduct({...currentProduct, sku: e.target.value.toUpperCase()})} placeholder="SKU-001" /></div>
          <div><label className="block text-sm font-bold text-slate-700 mb-2">Category</label><input type="text" className="w-full px-5 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" value={currentProduct.category} onChange={e => setCurrentProduct({...currentProduct, category: e.target.value})} placeholder="General" /></div>
          <div><label className="block text-sm font-bold text-slate-700 mb-2">Price ($)</label><input type="number" step="0.01" className="w-full px-5 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" value={currentProduct.price} onChange={e => setCurrentProduct({...currentProduct, price: parseFloat(e.target.value)})} /></div>
          <div><label className="block text-sm font-bold text-slate-700 mb-2">Stock Level</label><input type="number" className="w-full px-5 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" value={currentProduct.stock} onChange={e => setCurrentProduct({...currentProduct, stock: parseInt(e.target.value)})} /></div>
          <div className="col-span-2"><label className="block text-sm font-bold text-slate-700 mb-2">Expiry Date</label><input type="date" className="w-full px-5 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" value={currentProduct.expiryDate || ''} onChange={e => setCurrentProduct({...currentProduct, expiryDate: e.target.value})} /></div>
        </div>
        <div className="flex justify-end gap-4 mt-10 pt-6 border-t border-slate-100">
          <button onClick={() => setIsEditing(false)} className="px-8 py-3 text-slate-600 hover:bg-slate-100 rounded-xl font-medium transition-colors">Cancel</button>
          <button onClick={handleSave} className="px-8 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all flex items-center gap-2 font-bold"><Save size={20} /> Save Product</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in pb-10">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Inventory</h2>
          <div className="text-slate-500 mt-1">Manage catalog, pricing, and stock levels</div>
        </div>
        <button onClick={startAdd} className="bg-indigo-600 text-white px-6 py-3 rounded-xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all flex items-center gap-2 font-bold">
          <Plus size={20} /> 
          Add Product
        </button>
      </div>
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50/50 border-b border-slate-200 text-slate-500 text-xs uppercase font-bold tracking-wider">
            <tr><th className="px-8 py-5">SKU</th><th className="px-8 py-5">Name</th><th className="px-8 py-5">Category</th><th className="px-8 py-5">Price</th><th className="px-8 py-5">Stock</th><th className="px-8 py-5">Status</th><th className="px-8 py-5 text-right">Actions</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {products.map(product => {
               const isExpired = product.expiryDate && new Date(product.expiryDate) < new Date();
               const isLowStock = product.stock < 10;
               return (
                <tr key={product.id} className="hover:bg-slate-50/80 transition-colors group">
                  <td className="px-8 py-5 font-mono text-sm text-slate-500 font-medium">{product.sku}</td>
                  <td className="px-8 py-5 font-semibold text-slate-800">{product.name}</td>
                  <td className="px-8 py-5"><span className="px-3 py-1 bg-slate-100 rounded-full text-xs font-semibold text-slate-600 border border-slate-200">{product.category}</span></td>
                  <td className="px-8 py-5 text-slate-700 font-medium">${product.price.toFixed(2)}</td>
                  <td className="px-8 py-5"><span className={`font-bold ${product.stock === 0 ? 'text-red-500' : 'text-slate-700'}`}>{product.stock}</span></td>
                  <td className="px-8 py-5">{isExpired ? <span className="text-red-600 text-xs font-bold flex items-center gap-1 bg-red-50 px-3 py-1 rounded-full w-fit"><AlertCircle size={14}/> Expired</span> : isLowStock ? <span className="text-amber-600 text-xs font-bold bg-amber-50 px-3 py-1 rounded-full w-fit">Low Stock</span> : <span className="text-green-600 text-xs font-bold bg-green-50 px-3 py-1 rounded-full w-fit">Good</span>}</td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex justify-end gap-3 opacity-60 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => startEdit(product)} className="p-2 bg-slate-100 hover:bg-blue-50 text-slate-500 hover:text-blue-600 rounded-lg transition-colors"><Edit size={18} /></button>
                      <button onClick={() => onDeleteProduct(product.id)} className="p-2 bg-slate-100 hover:bg-red-50 text-slate-500 hover:text-red-600 rounded-lg transition-colors"><Trash size={18} /></button>
                    </div>
                  </td>
                </tr>
               );
            })}
          </tbody>
        </table>
        {products.length === 0 && (
          <div className="p-16 text-center text-slate-400">
            <Package size={48} className="mx-auto mb-4 opacity-20"/>
            <p>Your inventory is empty.</p>
          </div>
        )}
      </div>
    </div>
  );
};

const SalesHistory: React.FC<{ transactions: Transaction[] }> = ({ transactions }) => {
  return (
    <div className="space-y-8 animate-fade-in pb-10">
       <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Sales History</h2>
          <div className="text-slate-500 mt-1">Archive of all past transactions</div>
        </div>
      </div>
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="divide-y divide-slate-100">
          {transactions.length === 0 ? <div className="p-20 text-center text-slate-400">No sales records found.</div> : 
            transactions.map(t => (
              <div key={t.id} className="p-8 hover:bg-slate-50 transition-colors">
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 bg-indigo-50 rounded-full text-indigo-600 flex items-center justify-center shadow-sm">
                      <Clock size={24} />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 text-lg">Order #{t.id.slice(0, 8)}</h3>
                      <p className="text-sm text-slate-500 font-medium">{new Date(t.date).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-slate-800 tracking-tight">${t.total.toFixed(2)}</div>
                    <div className="text-xs text-slate-500 uppercase font-bold mt-1 bg-slate-100 px-2 py-0.5 rounded inline-block">{t.paymentMethod}</div>
                  </div>
                </div>
                <div className="bg-slate-50/50 rounded-xl p-6 border border-slate-200/60">
                  <table className="w-full text-sm">
                    <thead><tr className="text-slate-400 text-left uppercase text-xs tracking-wider"><th className="pb-3 font-semibold">Item</th><th className="pb-3 font-semibold text-center">Qty</th><th className="pb-3 font-semibold text-right">Price</th></tr></thead>
                    <tbody className="text-slate-700 font-medium">{t.items.map((item, idx) => (<tr key={`${t.id}-${idx}`}><td className="py-2 border-b border-slate-100/50 last:border-0">{item.name}</td><td className="py-2 text-center border-b border-slate-100/50 last:border-0">{item.quantity}</td><td className="py-2 text-right border-b border-slate-100/50 last:border-0">${(item.price * item.quantity).toFixed(2)}</td></tr>))}</tbody>
                  </table>
                  <div className="border-t border-slate-200 mt-4 pt-4 flex justify-end gap-8 text-sm">
                    <div className="text-slate-500">Subtotal: <span className="font-semibold text-slate-700">${t.subtotal.toFixed(2)}</span></div>
                    <div className="text-slate-500">Tax: <span className="font-semibold text-slate-700">${t.tax.toFixed(2)}</span></div>
                    <div className="text-slate-800 font-bold text-lg">Total: ${t.total.toFixed(2)}</div>
                  </div>
                </div>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  );
};

// --- APP ---

const App: React.FC = () => {
  const [activePage, setActivePage] = useState<Page>(Page.DASHBOARD);
  const [products, setProducts] = useState<Product[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    setProducts(StorageService.getProducts());
    setTransactions(StorageService.getTransactions());
  }, []);

  const handleTransactionComplete = (transaction: Transaction) => {
    StorageService.saveTransaction(transaction);
    setTransactions(prev => [transaction, ...prev]);
    const soldItems = transaction.items.map(i => ({ id: i.id, quantity: i.quantity }));
    const updatedProducts = StorageService.processSaleStockUpdate(soldItems);
    setProducts(updatedProducts);
    alert(`Transaction Complete! Change due: $0.00`);
  };

  const handleAddProduct = (product: Product) => {
    const updated = [...products, product];
    setProducts(updated);
    StorageService.saveProducts(updated);
  };

  const handleUpdateProduct = (product: Product) => {
    const updated = products.map(p => p.id === product.id ? product : p);
    setProducts(updated);
    StorageService.saveProducts(updated);
  };

  const handleDeleteProduct = (id: string) => {
    if (confirm("Are you sure you want to delete this product?")) {
      const updated = products.filter(p => p.id !== id);
      setProducts(updated);
      StorageService.saveProducts(updated);
    }
  };

  const NavItem = ({ page, icon: Icon, label }: { page: Page, icon: any, label: string }) => (
    <button 
      onClick={() => setActivePage(page)} 
      className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 font-medium ${activePage === page ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20 translate-x-1' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
    >
      <Icon size={20} className={activePage === page ? 'text-indigo-200' : ''}/>
      <span>{label}</span>
    </button>
  );

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden selection:bg-indigo-100 selection:text-indigo-900">
      <aside className="w-72 bg-slate-900 text-white flex flex-col shadow-2xl z-20">
        <div className="p-8 flex items-center gap-4">
          <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg shadow-indigo-500/30">
            <Store size={28} className="text-white" />
          </div>
          <div>
            <h1 className="font-bold text-xl tracking-tight leading-tight">RetailPulse</h1>
            <p className="text-xs text-slate-400 font-medium">Smart POS System</p>
          </div>
        </div>
        
        <nav className="flex-1 px-4 space-y-2 py-6 overflow-y-auto">
          <div className="px-4 text-xs font-bold text-slate-600 uppercase tracking-widest mb-2 mt-2">Main Menu</div>
          <NavItem page={Page.DASHBOARD} icon={LayoutDashboard} label="Dashboard" />
          <NavItem page={Page.REGISTER} icon={ShoppingCart} label="Register (POS)" />
          <NavItem page={Page.INVENTORY} icon={Package} label="Inventory" />
          <NavItem page={Page.HISTORY} icon={History} label="Sales History" />
        </nav>
        
        <div className="p-6 border-t border-slate-800 bg-slate-950">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center font-bold text-sm shadow-inner ring-2 ring-slate-800">AD</div>
            <div>
              <div className="font-bold text-sm text-white">Admin User</div>
              <div className="text-xs text-slate-500">Manager Access</div>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-auto bg-slate-100 relative">
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-10 px-10 flex items-center justify-between shadow-sm">
           <div>
             <h2 className="text-xl font-bold text-slate-800 capitalize flex items-center gap-2">
               {activePage.replace('-', ' ')}
             </h2>
           </div>
           <div className="flex items-center gap-4">
             <div className="text-sm font-medium text-slate-500 bg-slate-50 px-4 py-2 rounded-full border border-slate-100">
               {new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
             </div>
           </div>
        </header>
        <div className="p-10 max-w-[1600px] mx-auto">
          {activePage === Page.DASHBOARD && <Dashboard products={products} transactions={transactions} />}
          {activePage === Page.REGISTER && <Register products={products} onCompleteTransaction={handleTransactionComplete} />}
          {activePage === Page.INVENTORY && <Inventory products={products} onAddProduct={handleAddProduct} onUpdateProduct={handleUpdateProduct} onDeleteProduct={handleDeleteProduct} />}
          {activePage === Page.HISTORY && <SalesHistory transactions={transactions} />}
        </div>
      </main>
    </div>
  );
};

// --- RENDER ---
const rootElement = document.getElementById('root');
if (rootElement) {
  try {
    const root = ReactDOM.createRoot(rootElement);
    root.render(<React.StrictMode><App /></React.StrictMode>);
  } catch (e) {
    console.error("Render failed", e);
    const overlay = document.getElementById('error-overlay');
    if (overlay) {
       overlay.style.display = 'block';
       overlay.innerHTML = `<h1>CRITICAL RENDER ERROR</h1><pre>${e}</pre>`;
    }
  }
} else {
  console.error("Root element not found");
}
