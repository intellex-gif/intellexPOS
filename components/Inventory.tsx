import React, { useState } from 'react';
import { Product } from '../types';
import { GeminiService } from '../services/geminiService';
import { Plus, Edit, Trash, Save, X, Sparkles, AlertCircle } from 'lucide-react';

interface InventoryProps {
  products: Product[];
  onAddProduct: (product: Product) => void;
  onUpdateProduct: (product: Product) => void;
  onDeleteProduct: (id: string) => void;
}

export const Inventory: React.FC<InventoryProps> = ({ products, onAddProduct, onUpdateProduct, onDeleteProduct }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<Partial<Product>>({});
  const [aiLoading, setAiLoading] = useState(false);

  const startAdd = () => {
    setCurrentProduct({
      id: crypto.randomUUID(),
      sku: '',
      name: '',
      price: 0,
      stock: 0,
      category: 'General',
      expiryDate: ''
    });
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
    // For this simple demo, we don't have a description field in the Product type, but let's simulate updating the name to be fancier or just alerting it for now.
    // Ideally, we add a description field. For now, let's append it to name or just show it.
    // Let's assume we want to Suggest a Better Name.
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
              <input 
                type="text" 
                className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                value={currentProduct.name}
                onChange={e => setCurrentProduct({...currentProduct, name: e.target.value})}
                placeholder="e.g. Organic Almond Milk"
              />
              <button 
                onClick={handleAiDescription}
                disabled={aiLoading}
                className="px-3 py-2 bg-purple-100 text-purple-600 rounded-lg hover:bg-purple-200 transition"
                title="Enhance with AI"
              >
                {aiLoading ? <span className="animate-spin">...</span> : <Sparkles size={18} />}
              </button>
            </div>
          </div>

          <div>
             <label className="block text-sm font-medium text-slate-700 mb-1">SKU</label>
             <input 
                type="text" 
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none uppercase"
                value={currentProduct.sku}
                onChange={e => setCurrentProduct({...currentProduct, sku: e.target.value.toUpperCase()})}
                placeholder="ABC-123"
              />
          </div>

          <div>
             <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
             <input 
                type="text" 
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                value={currentProduct.category}
                onChange={e => setCurrentProduct({...currentProduct, category: e.target.value})}
                placeholder="Dairy"
              />
          </div>

          <div>
             <label className="block text-sm font-medium text-slate-700 mb-1">Price ($)</label>
             <input 
                type="number" 
                step="0.01"
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                value={currentProduct.price}
                onChange={e => setCurrentProduct({...currentProduct, price: parseFloat(e.target.value)})}
              />
          </div>

           <div>
             <label className="block text-sm font-medium text-slate-700 mb-1">Stock Quantity</label>
             <input 
                type="number" 
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                value={currentProduct.stock}
                onChange={e => setCurrentProduct({...currentProduct, stock: parseInt(e.target.value)})}
              />
          </div>

          <div className="col-span-2">
             <label className="block text-sm font-medium text-slate-700 mb-1">Expiry Date</label>
             <input 
                type="date" 
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                value={currentProduct.expiryDate || ''}
                onChange={e => setCurrentProduct({...currentProduct, expiryDate: e.target.value})}
              />
              <p className="text-xs text-slate-500 mt-1">Optional. Used for expiry alerts.</p>
          </div>
        </div>

        <div className="flex justify-end gap-4 mt-8">
          <button 
            onClick={() => setIsEditing(false)}
            className="px-6 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 shadow-lg shadow-blue-200 transition flex items-center gap-2"
          >
            <Save size={18} /> Save Product
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Inventory Management</h2>
          <p className="text-slate-500">Manage your product catalog, stock levels, and expiry dates.</p>
        </div>
        <button 
          onClick={startAdd}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-lg shadow-blue-200 transition"
        >
          <Plus size={18} /> Add Product
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase font-semibold">
            <tr>
              <th className="px-6 py-4">SKU</th>
              <th className="px-6 py-4">Name</th>
              <th className="px-6 py-4">Category</th>
              <th className="px-6 py-4">Price</th>
              <th className="px-6 py-4">Stock</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {products.map(product => {
               const isExpired = product.expiryDate && new Date(product.expiryDate) < new Date();
               const isLowStock = product.stock < 10;
               
               return (
                <tr key={product.id} className="hover:bg-slate-50 transition">
                  <td className="px-6 py-4 font-mono text-sm text-slate-500">{product.sku}</td>
                  <td className="px-6 py-4 font-medium text-slate-800">{product.name}</td>
                  <td className="px-6 py-4 text-slate-600"><span className="px-2 py-1 bg-slate-100 rounded text-xs">{product.category}</span></td>
                  <td className="px-6 py-4 text-slate-600">${product.price.toFixed(2)}</td>
                  <td className="px-6 py-4">
                    <span className={`font-medium ${product.stock === 0 ? 'text-red-600' : 'text-slate-700'}`}>
                      {product.stock}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {isExpired ? (
                      <span className="flex items-center gap-1 text-red-600 bg-red-50 px-2 py-1 rounded-full text-xs font-bold w-fit">
                        <AlertCircle size={12}/> Expired
                      </span>
                    ) : isLowStock ? (
                      <span className="text-yellow-600 bg-yellow-50 px-2 py-1 rounded-full text-xs font-bold">Low Stock</span>
                    ) : (
                      <span className="text-green-600 bg-green-50 px-2 py-1 rounded-full text-xs font-bold">Good</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => startEdit(product)} className="p-2 text-slate-400 hover:text-blue-600 transition"><Edit size={18} /></button>
                      <button onClick={() => onDeleteProduct(product.id)} className="p-2 text-slate-400 hover:text-red-600 transition"><Trash size={18} /></button>
                    </div>
                  </td>
                </tr>
               );
            })}
          </tbody>
        </table>
        {products.length === 0 && (
          <div className="p-8 text-center text-slate-400">No products found. Add one to get started.</div>
        )}
      </div>
    </div>
  );
};
