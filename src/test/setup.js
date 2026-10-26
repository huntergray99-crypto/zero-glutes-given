// No test may reach real Firebase. Several modules touch Firestore at import
// time (`collection(db, 'reports')`), so the SDK itself is stubbed here rather
// than per test. These tests cover logic, not the network — the live-write
// paths are exercised against the real project by hand (see OPERATIONS.md).
import { vi } from 'vitest';

const noop = () => {};

vi.mock('firebase/app', () => ({ initializeApp: () => ({}) }));

vi.mock('firebase/auth', () => ({
  getAuth: () => ({ currentUser: null }),
  onAuthStateChanged: noop,
  GoogleAuthProvider: class {},
  signInWithPopup: noop,
  signInAnonymously: noop,
  signOut: noop,
  deleteUser: noop,
  reauthenticateWithPopup: noop,
}));

vi.mock('firebase/firestore', () => ({
  getFirestore: () => ({}),
  collection: () => ({}),
  doc: () => ({}),
  getDoc: noop,
  getDocs: noop,
  setDoc: noop,
  addDoc: noop,
  updateDoc: noop,
  deleteDoc: noop,
  onSnapshot: noop,
  query: () => ({}),
  where: () => ({}),
  orderBy: () => ({}),
  limit: () => ({}),
  writeBatch: () => ({ delete: noop, commit: noop }),
  serverTimestamp: () => 'SERVER_TIMESTAMP',
}));
