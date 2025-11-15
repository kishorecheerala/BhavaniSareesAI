// FIX: Changed import for AppState from '../types' to '../context/AppContext' as it's defined there.
import { AppState } from '../context/AppContext';
import { ProfileData } from '../types';

// Utility to create dates relative to today
const daysAgo = (days: number): string => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
};

const daysFromNow = (days: number): string => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
};

export const testProfile: ProfileData = {
  id: 'userProfile',
  name: 'Bhavani Sarees',
  phone: '9876543210',
  address: '123 Saree Street, Weavers Colony, Hyderabad, 500081',
  gstNumber: '36ABCDE1234F1Z5',
};

export const testData: Omit<AppState, 'toast' | 'selection' | 'installPromptEvent' | 'notifications' | 'profile'> = {
  customers: [
    { id: 'CUST-LAKSHMI', name: 'Lakshmi K.', phone: '9988776655', address: '1-2-3, KPHB Colony', area: 'Kukatpally', reference: 'Old customer' },
    { id: 'CUST-PADMA', name: 'Padma S.', phone: '9123456789', address: '4-5-6, Ameerpet', area: 'Ameerpet' },
    { id: 'CUST-GAYATRI', name: 'Gayatri Devi', phone: '9876501234', address: '7-8-9, Jubilee Hills', area: 'Jubilee Hills' },
  ],
  suppliers: [
    { id: 'SUPP-KANCHI', name: 'Kanchi Weavers Co.', phone: '8888888888', location: 'Kanchipuram', gstNumber: '33AAAAA0000A1Z5' },
    { id: 'SUPP-SURAT', name: 'Surat Textiles Inc.', phone: '7777777777', location: 'Surat' },
  ],
  products: [
    { id: 'BS-KAN-001', name: 'Kanchi Pattu - Peacock Blue', quantity: 8, purchasePrice: 4000, salePrice: 6500, gstPercent: 5 },
    { id: 'BS-KAN-002', name: 'Kanchi Pattu - Ruby Red', quantity: 3, purchasePrice: 4200, salePrice: 7000, gstPercent: 5 },
    { id: 'BS-COT-001', name: 'Chettinad Cotton - Mustard', quantity: 15, purchasePrice: 800, salePrice: 1500, gstPercent: 5 },
    { id: 'BS-SILK-001', name: 'Mysore Silk - Royal Green', quantity: 9, purchasePrice: 2500, salePrice: 4500, gstPercent: 5 },
    { id: 'BS-SYN-001', name: 'Synthetic Georgette - Floral', quantity: 20, purchasePrice: 500, salePrice: 950, gstPercent: 12 },
  ],
  sales: [
    {
      id: 'SALE-20240710-113000', customerId: 'CUST-LAKSHMI',
      items: [{ productId: 'BS-KAN-001', productName: 'Kanchi Pattu - Peacock Blue', quantity: 1, price: 6500 }],
      discount: 200, totalAmount: 6300, gstAmount: 309.52, date: daysAgo(40),
      payments: [{ id: 'PAY-S-1', amount: 6300, date: daysAgo(40), method: 'UPI' }],
    },
    {
      id: 'SALE-20240715-150000', customerId: 'CUST-PADMA',
      items: [{ productId: 'BS-COT-001', productName: 'Chettinad Cotton - Mustard', quantity: 2, price: 1500 }],
      discount: 0, totalAmount: 3000, gstAmount: 142.86, date: daysAgo(35),
      payments: [{ id: 'PAY-S-2', amount: 1000, date: daysAgo(35), method: 'CASH' }], // Creates a due
    },
    {
      id: 'SALE-20240801-100000', customerId: 'CUST-GAYATRI',
      items: [
        { productId: 'BS-KAN-002', productName: 'Kanchi Pattu - Ruby Red', quantity: 1, price: 7000 },
        { productId: 'BS-SILK-001', productName: 'Mysore Silk - Royal Green', quantity: 1, price: 4500 }
      ],
      discount: 500, totalAmount: 11000, gstAmount: 523.81, date: daysAgo(15),
      payments: [{ id: 'PAY-S-3', amount: 11000, date: daysAgo(15), method: 'CHEQUE', reference: 'CHQ-54321' }],
    },
    {
      id: 'SALE-20240810-180000', customerId: 'CUST-LAKSHMI',
      items: [{ productId: 'BS-SYN-001', productName: 'Synthetic Georgette - Floral', quantity: 3, price: 950 }],
      discount: 50, totalAmount: 2800, gstAmount: 300, date: daysAgo(5),
      payments: [], // Fully due
    },
  ],
  purchases: [
    {
      id: 'PUR-20240701-090000', supplierId: 'SUPP-KANCHI',
      items: [
        { productId: 'BS-KAN-001', productName: 'Kanchi Pattu - Peacock Blue', quantity: 10, price: 4000, gstPercent: 5, saleValue: 6500 },
        { productId: 'BS-KAN-002', productName: 'Kanchi Pattu - Ruby Red', quantity: 5, price: 4200, gstPercent: 5, saleValue: 7000 }
      ],
      totalAmount: 61000, date: daysAgo(50), supplierInvoiceId: 'KWC-INV-101',
      payments: [{ id: 'PAY-P-1', amount: 61000, date: daysAgo(50), method: 'UPI' }],
      paymentDueDates: [],
    },
    {
      id: 'PUR-20240705-140000', supplierId: 'SUPP-SURAT',
      items: [
        { productId: 'BS-COT-001', productName: 'Chettinad Cotton - Mustard', quantity: 20, price: 800, gstPercent: 5, saleValue: 1500 },
        { productId: 'BS-SYN-001', productName: 'Synthetic Georgette - Floral', quantity: 25, price: 500, gstPercent: 12, saleValue: 950 }
      ],
      totalAmount: 28500, date: daysAgo(45), supplierInvoiceId: 'STI-55B',
      payments: [{ id: 'PAY-P-2', amount: 18500, date: daysAgo(45), method: 'CASH' }], // Creates a purchase due
      paymentDueDates: [daysFromNow(15)], // Due in 15 days
    },
    {
      id: 'PUR-20240801-120000', supplierId: 'SUPP-SURAT',
      items: [
        { productId: 'BS-SILK-001', productName: 'Mysore Silk - Royal Green', quantity: 10, price: 2500, gstPercent: 5, saleValue: 4500 }
      ],
      totalAmount: 25000, date: daysAgo(18), supplierInvoiceId: 'STI-92C',
      payments: [{ id: 'PAY-P-3', amount: 10000, date: daysAgo(18), method: 'CASH' }],
      paymentDueDates: [daysAgo(10), daysFromNow(25)], // One overdue, one upcoming
    },
  ],
  returns: [
    {
        id: 'RET-20240720-100000', type: 'CUSTOMER', referenceId: 'SALE-20240710-113000',
        partyId: 'CUST-LAKSHMI',
        items: [{ productId: 'BS-KAN-001', productName: 'Kanchi Pattu - Peacock Blue', quantity: 1, price: 6500 }],
        returnDate: daysAgo(30), amount: 6300, reason: 'Color mismatch'
    }
  ],
  app_metadata: [],
};