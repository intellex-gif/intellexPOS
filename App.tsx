import React, { useEffect, useState } from 'react';
import { Page, Product, Transaction } from './types.ts';
import { StorageService } from './services/storageService.ts';
import { Dashboard } from './components/Dashboard.tsx';
import { Register } from './components/Register.tsx';
import { Inventory } from './components/Inventory.tsx';
import { SalesHistory } from './components/SalesHistory.tsx';
import { LayoutDashboard, ShoppingCart, Package, History, Store } from 'lucide-react';

const App: React.FC = () => {
  const [activePage, setActivePage] = useState<Page>(Page.DASHBOARD);
  const [products, setProducts] = useState<Product[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  // Initialize data
  useEffect(() => {
    setProducts(StorageService.getProducts());
    setTransactions(StorageService.getTransactions());
  }, []);

  // Handlers
  const handleTransactionComplete = (transaction: Transaction) => {
    StorageService.saveTransaction(transaction);
    // Update local state transactions
    setTransactions(prev => [transaction, ...prev]);
    
    // Update stock
    const soldItems = transaction.items.map(i => ({ id: i.id, quantity: i.quantity }));
    const updatedProducts = StorageService.processSaleStockUpdate(soldItems);
    setProducts(updatedProducts);
    
    // Force switch to dashboard or stay on register? Usually stay on register.
    // Show success?
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
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
        activePage === page 
          ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20 font-medium' 
          : 'text-slate-400 hover:bg-slate-800 hover:text-white'
      }`}
    >
      <Icon size={20} />
      <span>{label}</span>
    </button>
  );

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col shadow-2xl z-10">
        <div className="p-6 flex items-center gap-3">
          <div className="p-2 bg-blue-600 rounded-lg">
            <Store size={24} className="text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg tracking-tight">RetailPulse</h1>
            <p className="text-xs text-slate-400">POS System</p>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-2 py-4">
          <NavItem page={Page.DASHBOARD} icon={LayoutDashboard} label="Dashboard" />
          <NavItem page={Page.REGISTER} icon={ShoppingCart} label="Register (POS)" />
          <NavItem page={Page.INVENTORY} icon={Package} label="Inventory" />
          <NavItem page={Page.HISTORY} icon={History} label="Sales History" />
        </nav>

        <div className="p-4 border-t border-slate-800">
           <div className="bg-slate-800 rounded-lg p-4">
              <p className="text-xs text-slate-400 mb-1">Logged in as</p>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center font-bold text-sm">
                  AD
                </div>
                <span className="font-medium text-sm">Admin User</span>
              </div>
           </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <header className="h-16 bg-white border-b border-slate-200 sticky top-0 z-20 px-8 flex items-center justify-between">
           <h2 className="text-xl font-bold text-slate-800 capitalize">{activePage.replace('-', ' ')}</h2>
           <div className="text-sm text-slate-500">
             {new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
           </div>
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

export default App;