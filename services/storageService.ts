import { Product, Transaction } from '../types.ts';

const STORAGE_KEYS = {
  PRODUCTS: 'retailpulse_products',
  TRANSACTIONS: 'retailpulse_transactions',
};

// Dummy Initial Data
const INITIAL_PRODUCTS: Product[] = [
  { id: '1', sku: 'BV-001', name: 'Organic Almond Milk', price: 4.50, category: 'Dairy', stock: 24, expiryDate: '2024-12-31' },
  { id: '2', sku: 'BK-102', name: 'Whole Wheat Sourdough', price: 6.00, category: 'Bakery', stock: 5, expiryDate: '2023-10-20' }, // Intentionally near expiry/expired for demo
  { id: '3', sku: 'SN-554', name: 'Dark Chocolate Bar', price: 3.25, category: 'Snacks', stock: 100, expiryDate: '2025-05-15' },
  { id: '4', sku: 'FV-201', name: 'Honeycrisp Apple', price: 1.20, category: 'Produce', stock: 0, expiryDate: '2023-11-01' },
  { id: '5', sku: 'BV-005', name: 'Sparkling Water Lemon', price: 1.50, category: 'Beverages', stock: 45, expiryDate: '2025-01-01' },
];

export const StorageService = {
  getProducts: (): Product[] => {
    const data = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
    return data ? JSON.parse(data) : INITIAL_PRODUCTS;
  },

  saveProducts: (products: Product[]) => {
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
  },

  getTransactions: (): Transaction[] => {
    const data = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
    return data ? JSON.parse(data) : [];
  },

  saveTransaction: (transaction: Transaction) => {
    const transactions = StorageService.getTransactions();
    transactions.unshift(transaction); // Add to top
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
  },
  
  // Helper to update stock after sale
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