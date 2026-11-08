// Lightweight, zero-dependency IndexedDB storage for pre-rendered card images
import { BUILD_ID } from '../version';

declare const __ART_ID__: string;
// Which code and which art drew the stored images (see vite.config.ts): a change to either draws them all again
const CACHE_ID = `${BUILD_ID}:${typeof __ART_ID__ === 'string' ? __ART_ID__ : 'unknown'}`;

const DB_NAME = 'tactics_card_images_v5';
const STORE_NAME = 'card_images';
const BUILD_KEY = '__build_id__';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      return reject(new Error('IndexedDB is not supported'));
    }
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Retrieves all pre-rendered card images from IndexedDB, or none (and clears them) if other code or art drew them.
 */
export async function getAllCachedCardImages(): Promise<Record<string, string>> {
  try {
    const db = await openDB();
    const storedBuild = await new Promise<unknown>((resolve) => {
      const req = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(BUILD_KEY);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(undefined);
    });
    if (storedBuild !== CACHE_ID) {
      await new Promise<void>((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.clear();
        store.put(CACHE_ID, BUILD_KEY);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      });
      return {};
    }
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const result: Record<string, string> = {};
      const req = store.openCursor();
      req.onsuccess = (e: any) => {
        const cursor = e.target.result;
        if (cursor) {
          if (cursor.key !== BUILD_KEY) result[cursor.key as string] = cursor.value;
          cursor.continue();
        } else {
          resolve(result);
        }
      };
      req.onerror = () => resolve({});
    });
  } catch {
    return {};
  }
}

/**
 * Stores a pre-rendered card image in IndexedDB.
 */
export async function saveCachedCardImage(cardId: string, dataUrl: string): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(dataUrl, cardId);
  } catch {
    // Gracefully ignore storage write failures in private browsing mode
  }
}
