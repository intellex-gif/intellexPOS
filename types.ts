export interface Product {
  id: string;
  sku: string;
  name: string;
  price: number;
  category: string;
  stock: number;
  expiryDate?: string; // ISO date string YYYY-MM-DD
  imageUrl?: string;
}

export interface CartItem extends Product {
  quantity: number;
}

export interface Transaction {
  id: string;
  date: string; // ISO timestamp
  items: CartItem[];
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: 'cash' | 'card' | 'digital';
}

export interface SalesSummary {
  totalRevenue: number;
  totalTransactions: number;
  lowStockCount: number;
  expiredCount: number;
}

export enum Page {
  DASHBOARD = 'dashboard',
  REGISTER = 'register',
  INVENTORY = 'inventory',
  HISTORY = 'history',
}
