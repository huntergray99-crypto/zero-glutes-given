// Local photo store backed by IndexedDB (blobs are too big for localStorage).
// Each photo: { id, restaurantId, blob, w, h, date }. Captions/tags live on the
// post that references the photo (see posts.js). Swaps for Firebase Storage later.

const DB = 'zgg';
const STORE = 'photos';

function open() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const os = db.createObjectStore(STORE, { keyPath: 'id' });
        os.createIndex('restaurantId', 'restaurantId', { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx(mode, fn) {
  const db = await open();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const store = t.objectStore(STORE);
    const out = fn(store);
    t.oncomplete = () => resolve(out.result ?? out);
    t.onerror = () => reject(t.error);
  });
}

// Downscale + re-encode so stored photos stay small.
export function compressImage(file, maxDim = 1400, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        (blob) => (blob ? resolve({ blob, w, h }) : reject(new Error('encode failed'))),
        'image/jpeg',
        quality
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('bad image'));
    };
    img.src = url;
  });
}

export async function savePhoto(restaurantId, file) {
  const { blob, w, h } = await compressImage(file);
  const id = `ph_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const record = { id, restaurantId, blob, w, h, date: new Date().toISOString() };
  await tx('readwrite', (store) => store.put(record));
  return id;
}

export async function getPhotoURL(id) {
  if (!id) return null;
  const rec = await tx('readonly', (store) => store.get(id));
  return rec && rec.blob ? URL.createObjectURL(rec.blob) : null;
}

export async function deletePhoto(id) {
  if (!id) return;
  await tx('readwrite', (store) => store.delete(id));
}

export async function allPhotos() {
  const db = await open();
  return new Promise((resolve, reject) => {
    const out = [];
    const cursor = db
      .transaction(STORE, 'readonly')
      .objectStore(STORE)
      .openCursor();
    cursor.onsuccess = () => {
      const c = cursor.result;
      if (c) {
        out.push(c.value);
        c.continue();
      } else {
        resolve(out.sort((a, b) => b.date.localeCompare(a.date)));
      }
    };
    cursor.onerror = () => reject(cursor.error);
  });
}
