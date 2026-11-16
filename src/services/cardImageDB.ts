// Lightweight, zero-dependency IndexedDB storage for pre-rendered card images.
// Each card face is stored with the signature it was drawn from (its card data, art and the face-drawing code, see
// CardImageContext), so only the faces whose signature changed are drawn again.

const DB_NAME = 'tactics_card_faces_v7';
const STORE_NAME = 'card_faces';
// Earlier stores (older formats): removed to free the space
const OLD_DB_NAMES = ['tactics_card_images_v5', 'tactics_card_faces_v6'];

// The face as a PNG (kept as binary, which is smaller and quicker to read than text)
export interface CachedCardFace {
  sig: string;
  png: Blob;
}

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

let oldStoresRemoved = false;
function removeOldStores() {
  if (oldStoresRemoved || typeof indexedDB === 'undefined') return;
  oldStoresRemoved = true;
  OLD_DB_NAMES.forEach((name) => {
    try {
      indexedDB.deleteDatabase(name);
    } catch {
      // (nothing to remove)
    }
  });
}

/** Every saved card face, by card id, with the signature it was drawn from. */
export async function getAllCachedCardFaces(): Promise<Record<string, CachedCardFace>> {
  removeOldStores();
  try {
    const db = await openDB();
    return await new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const result: Record<string, CachedCardFace> = {};
      const req = store.openCursor();
      req.onsuccess = (e: any) => {
        const cursor = e.target.result;
        if (cursor) {
          const v = cursor.value;
          if (v && typeof v.sig === 'string' && v.png instanceof Blob) result[cursor.key as string] = v;
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

/** Saves a drawn card face with the signature it was drawn from. */
export async function saveCachedCardFace(cardId: string, face: CachedCardFace): Promise<void> {
  try {
    const db = await openDB();
    db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).put(face, cardId);
  } catch {
    // Gracefully ignore storage write failures in private browsing mode
  }
}

/** Removes saved faces of cards no longer in the game. */
export async function removeCachedCardFaces(cardIds: string[]): Promise<void> {
  if (cardIds.length === 0) return;
  try {
    const db = await openDB();
    const store = db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME);
    cardIds.forEach((id) => store.delete(id));
  } catch {
    // (nothing to remove)
  }
}
