
export interface Customer {
  id: string; // Manual input
  name: string;
  phone: string;
  address: string;
  area: string;
  reference?: string;
}

export interface Supplier {
  id: string;
  name: string;
  phone: string;
  location: string;
  reference?: string;
  account1?: string;
  account2?: string;
  upi?: string;
}

export interface Product {
  id: string; // QR code or manual entry
  name: string;
  quantity: number;
  purchasePrice: number;
  salePrice: number;
  gstPercent: number;
}

export interface SaleItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
}

export interface Sale {
  id: string;
  customerId: string;
  items: SaleItem[];
  discount: number;
  gstAmount: number;
  totalAmount: number;
  date: string; // ISO string
  isPaid: boolean;
}

export interface PurchaseItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  gstPercent: number;
  saleValue: number;
}

export interface Purchase {
  id: string;
  supplierId: string;
  items: PurchaseItem[];
  totalAmount: number;
  date: string; // ISO string
  invoiceUrl?: string; // For uploaded invoice
  isPaid: boolean;
}

export interface Return {
  id: string;
  saleId: string;
  customerId: string;
  productId: string;
  productName: string;
  quantity: number;
  returnDate: string; // ISO string
  amountRefunded: number;
}
