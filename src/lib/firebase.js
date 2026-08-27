// Firebase init. The values below are NOT secrets — the web apiKey is a public
// project identifier meant to ship in client code. Access is controlled by the
// Firestore security rules and the Authentication "Authorized domains" list,
// not by hiding this config.

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyCHkAy0eUbT3tl2aziS9ORiWo8Ly0v9C6s',
  authDomain: 'zero-glutes-given.firebaseapp.com',
  projectId: 'zero-glutes-given',
  storageBucket: 'zero-glutes-given.firebasestorage.app',
  messagingSenderId: '402597363568',
  appId: '1:402597363568:web:3d9b2585c8e1ef5df019b5',
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
