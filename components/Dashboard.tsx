import React, { useState } from 'react';
import { Product, Transaction } from '../types';
import { GeminiService } from '../services/geminiService';
import { DollarSign, ShoppingBag, AlertTriangle, Activity, Sparkles, RefreshCcw } from 'lucide-react';

interface DashboardProps {
  products: Product[];
  transactions: Transaction[];
}

export const Dashboard: React.FC<DashboardProps> = ({ products, transactions }) => {
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);

  // Calcs
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

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center space-x-4">
          <div className="p-3 bg-green-100 text-green-600 rounded-full">
            <DollarSign size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Total Revenue</p>
            <h3 className="text-2xl font-bold text-slate-800">${totalRevenue.toFixed(2)}</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center space-x-4">
          <div className="p-3 bg-blue-100 text-blue-600 rounded-full">
            <ShoppingBag size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Total Transactions</p>
            <h3 className="text-2xl font-bold text-slate-800">{totalOrders}</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center space-x-4">
          <div className="p-3 bg-yellow-100 text-yellow-600 rounded-full">
            <AlertTriangle size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Low Stock Alerts</p>
            <h3 className="text-2xl font-bold text-slate-800">{lowStockItems.length}</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center space-x-4">
          <div className="p-3 bg-red-100 text-red-600 rounded-full">
            <Activity size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Expired Items</p>
            <h3 className="text-2xl font-bold text-slate-800">{expiredItems.length}</h3>
          </div>
        </div>
      </div>

      {/* AI Section */}
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

      {/* Quick Tables */}
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
