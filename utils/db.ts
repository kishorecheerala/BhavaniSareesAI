import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Customer, Supplier, Product, Sale, Purchase, Return } from '../types';
import { AppState } from '../context/AppContext';

const DB_NAME = 'bhavani-sarees-db';
const DB_VERSION = 2; // Bump version for schema change

export type StoreName = 'customers' | 'suppliers' | 'products' | 'sales' | 'purchases' | 'returns' | 'app_metadata';
const STORE_NAMES: StoreName[] = ['customers', 'suppliers', 'products', 'sales', 'purchases', 'returns', 'app_metadata'];

interface AppMetadata {
    id: 'lastBackup';
    date: string; // ISO string
}

interface BhavaniSareesDB extends DBSchema {
  customers: { key: string; value: Customer; };
  suppliers: { key: string; value: Supplier; };
  products: { key: string; value: Product; };
  sales: { key: string; value: Sale; };
  purchases: { key: string; value: Purchase; };
  returns: { key: string; value: Return; };
  app_metadata: { key: string; value: AppMetadata; };
}

let dbPromise: Promise<IDBPDatabase<BhavaniSareesDB>>;

function getDb(): Promise<IDBPDatabase<BhavaniSareesDB>> {
    if (!dbPromise) {
        dbPromise = openDB<BhavaniSareesDB>(DB_NAME, DB_VERSION, {
            upgrade(db, oldVersion) {
                for (const storeName of STORE_NAMES) {
                    if (!db.objectStoreNames.contains(storeName)) {
                        db.createObjectStore(storeName, { keyPath: 'id' });
                    }
                }
            },
        });
    }
    return dbPromise;
}

export async function getAll<T extends StoreName>(storeName: T): Promise<BhavaniSareesDB[T]['value'][]> {
  const db = await getDb();
  return db.getAll(storeName);
}

export async function saveCollection<T extends StoreName>(storeName: T, data: BhavaniSareesDB[T]['value'][]) {
  try {
    const db = await getDb();
    const tx = db.transaction(storeName, 'readwrite');
    await tx.objectStore(storeName).clear();
    await Promise.all(data.map(item => tx.objectStore(storeName).put(item)));
    await tx.done;
  } catch (error) {
    console.error(`Failed to save collection ${storeName}:`, error);
  }
}

export async function getLastBackupDate(): Promise<string | null> {
    const db = await getDb();
    const result = await db.get('app_metadata', 'lastBackup');
    return result?.date || null;
}

export async function setLastBackupDate(): Promise<void> {
    const db = await getDb();
    const now = new Date().toISOString();
    await db.put('app_metadata', { id: 'lastBackup', date: now });
}

export async function exportData(): Promise<Omit<AppState, 'toast'>> {
    const db = await getDb();
    const data: any = {};
    for (const storeName of STORE_NAMES) {
        data[storeName] = await db.getAll(storeName);
    }
    return data as Omit<AppState, 'toast'>;
}

export async function importData(data: Omit<AppState, 'toast'>): Promise<void> {
    const db = await getDb();
    const tx = db.transaction(STORE_NAMES, 'readwrite');
    
    await Promise.all(STORE_NAMES.map(async (storeName) => {
        await tx.objectStore(storeName).clear();
        const items = (data as any)[storeName] || [];
        for (const item of items) {
            if (item && 'id' in item) {
                await tx.objectStore(storeName).put(item);
            }
        }
    }));
    
    await tx.done;
}
