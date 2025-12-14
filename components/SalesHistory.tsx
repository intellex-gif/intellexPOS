import React from 'react';
import { Transaction } from '../types';
import { Clock, CreditCard, Banknote, Smartphone } from 'lucide-react';

export const SalesHistory: React.FC<{ transactions: Transaction[] }> = ({ transactions }) => {
  const getIcon = (method: string) => {
    switch (method) {
      case 'card': return <CreditCard size={16} />;
      case 'digital': return <Smartphone size={16} />;
      default: return <Banknote size={16} />;
    }
  };

  return (
    <div className="space-y-6">
       <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Sales History</h2>
          <p className="text-slate-500">Recent transactions and order details.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="divide-y divide-slate-100">
          {transactions.length === 0 ? (
             <div className="p-12 text-center text-slate-400">No sales records found.</div>
          ) : (
            transactions.map(t => (
              <div key={t.id} className="p-6 hover:bg-slate-50 transition">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-slate-100 rounded-full text-slate-500">
                      <Clock size={20} />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 text-lg">Order #{t.id.slice(0, 8)}</h3>
                      <p className="text-sm text-slate-500">{new Date(t.date).toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-slate-800">${t.total.toFixed(2)}</div>
                    <div className="flex items-center justify-end gap-1 text-xs text-slate-500 uppercase font-semibold mt-1">
                      {getIcon(t.paymentMethod)} {t.paymentMethod}
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-slate-400 text-left">
                        <th className="pb-2 font-medium">Item</th>
                        <th className="pb-2 font-medium text-center">Qty</th>
                        <th className="pb-2 font-medium text-right">Price</th>
                      </tr>
                    </thead>
                    <tbody className="text-slate-600">
                      {t.items.map((item, idx) => (
                        <tr key={`${t.id}-${idx}`}>
                          <td className="py-1">{item.name}</td>
                          <td className="py-1 text-center">{item.quantity}</td>
                          <td className="py-1 text-right">${(item.price * item.quantity).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="border-t border-slate-200 mt-3 pt-3 flex justify-end gap-6 text-sm">
                    <div className="text-slate-500">Subtotal: ${t.subtotal.toFixed(2)}</div>
                    <div className="text-slate-500">Tax: ${t.tax.toFixed(2)}</div>
                    <div className="font-bold text-slate-800">Total: ${t.total.toFixed(2)}</div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
