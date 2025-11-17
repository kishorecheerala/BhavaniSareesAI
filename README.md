# Business Manager

A comprehensive, offline-first Progressive Web App (PWA) designed to streamline sales, purchase, and customer management for a small business. This application empowers users to track dues, manage stock, and generate reports directly from their device, without needing a constant internet connection.

## ✨ Key Features

- **📊 Dashboard:** Get an at-a-glance overview of total sales, purchases, outstanding customer dues, purchase dues, and low-stock items. Includes a monthly sales report filter.
- **👥 Customer Management:** Maintain a detailed directory of customers, view their complete sales and returns history, and manage their due payments.
- **🛒 Sales Management:** Create new sales invoices, add products by searching or scanning QR codes, apply discounts, and record payments.
- **🧾 PDF Invoice Generation:** Automatically generate and share a thermal-printer-friendly (80mm) PDF invoice via the native device sharing options (e.g., WhatsApp, Email).
- **📦 Purchase & Supplier Management:** Track purchases from suppliers, manage supplier information, and record payments made to them.
- **👔 Product & Inventory Control:** Manage a complete product catalog. Stock is automatically updated with every sale, purchase, and return. Manual stock adjustments are also supported.
- **🔄 Returns Processing:** Handle both customer returns (crediting their account and adding stock back) and returns to suppliers (reducing stock and creating a credit).
- **📈 Dues Reporting:** Generate and export a filterable list of customer dues by area and date range. Export options include PDF and CSV for easy collection tracking.
- **🔒 Data Backup & Restore:** Since all data is stored locally on the device, a robust backup (download JSON) and restore (upload JSON) system ensures data safety and portability.
- **🌐 Offline First (PWA):** Built as a Progressive Web App, it can be "installed" on a device's home screen and works seamlessly offline.
- **📷 QR Code Scanning:** Utilize the device camera to quickly scan product QR codes when creating sales or purchase orders.

## 🛠️ Tech Stack

- **Frontend:** React, TypeScript
- **Styling:** Tailwind CSS
- **State Management:** React Context API with `useReducer` for centralized and predictable state logic.
- **Data Persistence:** **IndexedDB** (via the `idb` library) for robust, asynchronous, and large-scale offline data persistence.
- **PWA Capabilities:** Service Workers (`sw.js`) for caching and offline access, along with a `manifest.json`.
- **Icons:** [Lucide React](https://lucide.dev/) for clean and consistent icons.
- **PDF Generation:** [jsPDF](https://github.com/parallax/jsPDF) & [jspdf-autotable](https://github.com/simonbengtsson/jsPDF-AutoTable)
- **QR Code Scanning:** [html5-qrcode](https://github.com/mebjas/html5-qrcode)

## 📁 Project Structure

The project is organized into a modular and scalable structure:

```
/
├── public/
│   ├── manifest.json       # PWA manifest
│   ├── sw.js               # Service Worker for offline caching
│   └── vite.svg            # App icon
│
├── src/
│   ├── components/         # Reusable UI components (Card, Button)
│   ├── context/            # Global state management (AppContext.tsx)
│   ├── pages/              # Main feature pages (Dashboard, Sales, Customers, etc.)
│   ├── App.tsx             # Main app component with navigation logic
│   ├── index.tsx           # Application entry point
│   ├── types.ts            # Centralized TypeScript type definitions
│   └── ...
│
└── index.html              # Main HTML entry file
```

## 🚀 Core Functionality Deep Dive

### Data Persistence

The application is architected to be fully client-side. All data—customers, sales, products, etc.—is stored in the browser's **IndexedDB**. This is a powerful, asynchronous browser database that allows the app to be fast, handle large amounts of data, and work perfectly offline.

**⚠️ Important:** Because data is stored only on the user's device, the **Backup & Restore** feature is critical. Users should be encouraged to back up their data regularly.

### State Management

A global state is managed using React's `useReducer` and `useContext` hooks.
- **`AppContext.tsx`**: This file defines the entire data schema (`AppState`), all possible state mutations (`Action`), and the main reducer logic (`appReducer`).
- **`useAppContext`**: A custom hook that provides easy access to the global `state` and `dispatch` function throughout the component tree, eliminating the need for prop drilling.

### Unsaved Changes Protection

To prevent users from accidentally losing data, the app tracks "dirty" forms. If a user tries to navigate to another page or close the tab with unsaved changes in a form, a confirmation prompt will appear, asking them to confirm the action. This is achieved using a combination of React state and the `beforeunload` browser event.