import React, { useState, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom/client';
import { 
  LayoutDashboard, ShoppingCart, Package, History, Store,
  DollarSign, ShoppingBag, AlertTriangle, Activity, Sparkles, RefreshCcw,
  Search, Plus, Minus, Trash2, CreditCard, Banknote, Smartphone, CheckCircle,
  Clock, Edit, Trash, Save, AlertCircle
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

// --- UTILS ---
// Polyfill for randomUUID if not available in insecure contexts
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
  { id: '1', sku: 'BV-001', name: 'Organic Almond Milk', price: 4.50, category: 'Dairy', stock: 24, expiryDate: '2024-12-31' },
  { id: '2', sku: 'BK-102', name: 'Whole Wheat Sourdough', price: 6.00, category: 'Bakery', stock: 5, expiryDate: '2023-10-20' }, 
  { id: '3', sku: 'SN-554', name: 'Dark Chocolate Bar', price: 3.25, category: 'Snacks', stock: 100, expiryDate: '2025-05-15' },
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

      Keep the tone professional yet encouraging.
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
      setAiInsight("Unable to generate insights at this time. Please check your API key.");
    } finally {
      setLoadingAi(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">Dashboard</h2>
        <div className="text-sm text-slate-500">Overview of your retail performance</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center space-x-4">
          <div className="p-3 bg-green-100 text-green-600 rounded-full"><DollarSign size={24} /></div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Total Revenue</p>
            <h3 className="text-2xl font-bold text-slate-800">${totalRevenue.toFixed(2)}</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center space-x-4">
          <div className="p-3 bg-blue-100 text-blue-600 rounded-full"><ShoppingBag size={24} /></div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Total Transactions</p>
            <h3 className="text-2xl font-bold text-slate-800">{totalOrders}</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center space-x-4">
          <div className="p-3 bg-yellow-100 text-yellow-600 rounded-full"><AlertTriangle size={24} /></div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Low Stock Alerts</p>
            <h3 className="text-2xl font-bold text-slate-800">{lowStockItems.length}</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center space-x-4">
          <div className="p-3 bg-red-100 text-red-600 rounded-full"><Activity size={24} /></div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Expired Items</p>
            <h3 className="text-2xl font-bold text-slate-800">{expiredItems.length}</h3>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-2xl p-6 border border-purple-100">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center space-x-2">
            <Sparkles className="text-purple-600" />
            <h3 className="text-lg font-semibold text-slate-800">Gemini Business AI</h3>
          </div>
          <button 
            onClick={handleGenerateInsights}
            disabled={loadingAi}
            className="flex items-center space-x-2 px-4 py-2 bg-white text-purple-700 font-medium rounded-lg shadow-sm border border-purple-200 hover:bg-purple-50 transition disabled:opacity-50"
          >
            {loadingAi ? <RefreshCcw className="animate-spin" size={16}/> : <Sparkles size={16}/>}
            <span>{loadingAi ? 'Analyzing...' : 'Generate Insights'}</span>
          </button>
        </div>
        
        {aiInsight ? (
          <div className="bg-white/80 p-4 rounded-xl text-slate-700 leading-relaxed border border-purple-100 shadow-sm whitespace-pre-line">
            {aiInsight}
          </div>
        ) : (
          <p className="text-slate-500 italic">Click the button to generate an AI-powered analysis of your inventory and sales performance.</p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
            <h3 className="font-semibold text-slate-700">Stock Attention Needed</h3>
          </div>
          <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
            {lowStockItems.length === 0 && expiredItems.length === 0 && (
              <div className="p-6 text-center text-slate-400">Inventory looks healthy!</div>
            )}
            {[...expiredItems, ...lowStockItems].slice(0, 5).map((item, idx) => (
              <div key={`${item.id}-${idx}`} className="px-6 py-3 flex justify-between items-center">
                <div>
                  <div className="font-medium text-slate-800">{item.name}</div>
                  <div className="text-xs text-slate-500">SKU: {item.sku}</div>
                </div>
                <div className={`text-xs px-2 py-1 rounded font-medium ${item.stock < 10 && item.stock > 0 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                  {item.stock === 0 ? 'Out of Stock' : (new Date(item.expiryDate || '') < new Date() ? 'Expired' : `Low: ${item.stock}`)}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
           <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
            <h3 className="font-semibold text-slate-700">Recent Transactions</h3>
          </div>
          <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
            {transactions.length === 0 && (
               <div className="p-6 text-center text-slate-400">No transactions yet.</div>
            )}
            {transactions.slice(0, 5).map(t => (
              <div key={t.id} className="px-6 py-3 flex justify-between items-center">
                <div>
                  <div className="font-medium text-slate-800">Order #{t.id.slice(-6)}</div>
                  <div className="text-xs text-slate-500">{new Date(t.date).toLocaleTimeString()}</div>
                </div>
                <div className="font-bold text-slate-700">
                  ${t.total.toFixed(2)}
                </div>
              </div>
            ))}
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
    <div className="flex h-[calc(100vh-6rem)] gap-6 animate-fade-in">
      <div className="flex-1 flex flex-col min-w-0 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
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
                <div className="text-left"><div className="font-semibold text-slate-800">Cash</div></div>
              </button>
              <button onClick={() => handleCheckout('card')} className="w-full p-4 border border-slate-200 rounded-xl hover:bg-blue-50 hover:border-blue-200 flex items-center gap-4 transition-colors group">
                <div className="p-3 bg-blue-100 text-blue-600 rounded-lg group-hover:bg-blue-200"><CreditCard size={24} /></div>
                <div className="text-left"><div className="font-semibold text-slate-800">Card</div></div>
              </button>
              <button onClick={() => handleCheckout('digital')} className="w-full p-4 border border-slate-200 rounded-xl hover:bg-purple-50 hover:border-purple-200 flex items-center gap-4 transition-colors group">
                <div className="p-3 bg-purple-100 text-purple-600 rounded-lg group-hover:bg-purple-200"><Smartphone size={24} /></div>
                <div className="text-left"><div className="font-semibold text-slate-800">Digital</div></div>
              </button>
            </div>
            <button onClick={() => setPaymentModalOpen(false)} className="mt-6 w-full py-2 text-slate-500 hover:text-slate-800">Cancel</button>
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
      <div className="max-w-2xl mx-auto bg-white p-8 rounded-2xl shadow-lg border border-slate-200 animate-fade-in">
        <h2 className="text-2xl font-bold mb-6 text-slate-800">{currentProduct.id && products.find(p => p.id === currentProduct.id) ? 'Edit Product' : 'Add New Product'}</h2>
        <div className="grid grid-cols-2 gap-6">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Product Name</label>
            <div className="flex gap-2">
              <input type="text" className="flex-1 px-4 py-2 border rounded-lg" value={currentProduct.name} onChange={e => setCurrentProduct({...currentProduct, name: e.target.value})} />
              <button onClick={handleAiDescription} disabled={aiLoading} className="px-3 py-2 bg-purple-100 text-purple-600 rounded-lg">{aiLoading ? '...' : <Sparkles size={18} />}</button>
            </div>
          </div>
          <div><label className="block text-sm font-medium text-slate-700 mb-1">SKU</label><input type="text" className="w-full px-4 py-2 border rounded-lg uppercase" value={currentProduct.sku} onChange={e => setCurrentProduct({...currentProduct, sku: e.target.value.toUpperCase()})} /></div>
          <div><label className="block text-sm font-medium text-slate-700 mb-1">Category</label><input type="text" className="w-full px-4 py-2 border rounded-lg" value={currentProduct.category} onChange={e => setCurrentProduct({...currentProduct, category: e.target.value})} /></div>
          <div><label className="block text-sm font-medium text-slate-700 mb-1">Price</label><input type="number" step="0.01" className="w-full px-4 py-2 border rounded-lg" value={currentProduct.price} onChange={e => setCurrentProduct({...currentProduct, price: parseFloat(e.target.value)})} /></div>
          <div><label className="block text-sm font-medium text-slate-700 mb-1">Stock</label><input type="number" className="w-full px-4 py-2 border rounded-lg" value={currentProduct.stock} onChange={e => setCurrentProduct({...currentProduct, stock: parseInt(e.target.value)})} /></div>
          <div className="col-span-2"><label className="block text-sm font-medium text-slate-700 mb-1">Expiry</label><input type="date" className="w-full px-4 py-2 border rounded-lg" value={currentProduct.expiryDate || ''} onChange={e => setCurrentProduct({...currentProduct, expiryDate: e.target.value})} /></div>
        </div>
        <div className="flex justify-end gap-4 mt-8">
          <button onClick={() => setIsEditing(false)} className="px-6 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
          <button onClick={handleSave} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"><Save size={18} /> Save</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div><h2 className="text-2xl font-bold text-slate-800">Inventory</h2><p className="text-slate-500">Manage catalog and stock.</p></div>
        <button onClick={startAdd} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"><Plus size={18} /> Add Product</button>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase font-semibold">
            <tr><th className="px-6 py-4">SKU</th><th className="px-6 py-4">Name</th><th className="px-6 py-4">Category</th><th className="px-6 py-4">Price</th><th className="px-6 py-4">Stock</th><th className="px-6 py-4">Status</th><th className="px-6 py-4 text-right">Actions</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {products.map(product => {
               const isExpired = product.expiryDate && new Date(product.expiryDate) < new Date();
               const isLowStock = product.stock < 10;
               return (
                <tr key={product.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-mono text-sm text-slate-500">{product.sku}</td>
                  <td className="px-6 py-4 font-medium text-slate-800">{product.name}</td>
                  <td className="px-6 py-4"><span className="px-2 py-1 bg-slate-100 rounded text-xs">{product.category}</span></td>
                  <td className="px-6 py-4 text-slate-600">${product.price.toFixed(2)}</td>
                  <td className="px-6 py-4"><span className={product.stock === 0 ? 'text-red-600' : 'text-slate-700'}>{product.stock}</span></td>
                  <td className="px-6 py-4">{isExpired ? <span className="text-red-600 text-xs font-bold flex items-center gap-1"><AlertCircle size={12}/> Expired</span> : isLowStock ? <span className="text-yellow-600 text-xs font-bold">Low Stock</span> : <span className="text-green-600 text-xs font-bold">Good</span>}</td>
                  <td className="px-6 py-4 text-right"><div className="flex justify-end gap-2"><button onClick={() => startEdit(product)}><Edit size={18} className="text-slate-400 hover:text-blue-600"/></button><button onClick={() => onDeleteProduct(product.id)}><Trash size={18} className="text-slate-400 hover:text-red-600"/></button></div></td>
                </tr>
               );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// 4. Sales History Component
const SalesHistory: React.FC<{ transactions: Transaction[] }> = ({ transactions }) => {
  return (
    <div className="space-y-6 animate-fade-in">
       <div><h2 className="text-2xl font-bold text-slate-800">Sales History</h2></div>
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="divide-y divide-slate-100">
          {transactions.length === 0 ? <div className="p-12 text-center text-slate-400">No sales records found.</div> : 
            transactions.map(t => (
              <div key={t.id} className="p-6 hover:bg-slate-50">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-slate-100 rounded-full text-slate-500"><Clock size={20} /></div>
                    <div><h3 className="font-bold text-slate-800 text-lg">Order #{t.id.slice(0, 8)}</h3><p className="text-sm text-slate-500">{new Date(t.date).toLocaleString()}</p></div>
                  </div>
                  <div className="text-right"><div className="text-2xl font-bold text-slate-800">${t.total.toFixed(2)}</div><div className="text-xs text-slate-500 uppercase font-semibold mt-1">{t.paymentMethod}</div></div>
                </div>
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
                  <table className="w-full text-sm">
                    <thead><tr className="text-slate-400 text-left"><th className="pb-2 font-medium">Item</th><th className="pb-2 font-medium text-center">Qty</th><th className="pb-2 font-medium text-right">Price</th></tr></thead>
                    <tbody className="text-slate-600">{t.items.map((item, idx) => (<tr key={`${t.id}-${idx}`}><td className="py-1">{item.name}</td><td className="py-1 text-center">{item.quantity}</td><td className="py-1 text-right">${(item.price * item.quantity).toFixed(2)}</td></tr>))}</tbody>
                  </table>
                  <div className="border-t border-slate-200 mt-3 pt-3 flex justify-end gap-6 text-sm"><div className="text-slate-500">Subtotal: ${t.subtotal.toFixed(2)}</div><div className="text-slate-500">Tax: ${t.tax.toFixed(2)}</div><div className="font-bold text-slate-800">Total: ${t.total.toFixed(2)}</div></div>
                </div>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  );
};

// --- MAIN APP COMPONENT ---

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
    <button onClick={() => setActivePage(page)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activePage === page ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
      <Icon size={20} /><span>{label}</span>
    </button>
  );

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden">
      <aside className="w-64 bg-slate-900 text-white flex flex-col shadow-2xl z-10">
        <div className="p-6 flex items-center gap-3"><div className="p-2 bg-blue-600 rounded-lg"><Store size={24} className="text-white" /></div><div><h1 className="font-bold text-lg tracking-tight">RetailPulse</h1><p className="text-xs text-slate-400">POS System</p></div></div>
        <nav className="flex-1 px-4 space-y-2 py-4">
          <NavItem page={Page.DASHBOARD} icon={LayoutDashboard} label="Dashboard" />
          <NavItem page={Page.REGISTER} icon={ShoppingCart} label="Register (POS)" />
          <NavItem page={Page.INVENTORY} icon={Package} label="Inventory" />
          <NavItem page={Page.HISTORY} icon={History} label="Sales History" />
        </nav>
        <div className="p-4 border-t border-slate-800"><div className="bg-slate-800 rounded-lg p-4"><p className="text-xs text-slate-400 mb-1">Logged in as</p><div className="flex items-center gap-2"><div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center font-bold text-sm">AD</div><span className="font-medium text-sm">Admin User</span></div></div></div>
      </aside>

      <main className="flex-1 overflow-auto">
        <header className="h-16 bg-white border-b border-slate-200 sticky top-0 z-20 px-8 flex items-center justify-between">
           <h2 className="text-xl font-bold text-slate-800 capitalize">{activePage.replace('-', ' ')}</h2>
           <div className="text-sm text-slate-500">{new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
        </header>
        <div className="p-8 max-w-7xl mx-auto">
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
