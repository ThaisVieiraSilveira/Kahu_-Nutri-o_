import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const env = (import.meta as any).env || {};

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || '',
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: env.VITE_FIREBASE_APP_ID || '',
};

// Check if variables exist & are not empty/empty placeholders
const isConfigValid = 
  !!firebaseConfig.apiKey && 
  firebaseConfig.apiKey.trim() !== '' && 
  !firebaseConfig.apiKey.includes('YOUR_') &&
  !firebaseConfig.apiKey.includes('<');

export let isFirebaseConfigured = isConfigValid;

let app: any = null;
let authInstance: any = null;
let dbInstance: any = null;
let storageInstance: any = null;

if (isConfigValid) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    authInstance = getAuth(app);
    dbInstance = getFirestore(app);
    storageInstance = getStorage(app);
  } catch (err) {
    console.error("Erro ao inicializar Firebase Real:", err);
    isFirebaseConfigured = false;
  }
}

// Mock structures in case Firebase is not fully configured yet, so the app remains testable
const mockAuth = {
  currentUser: {
    uid: "mock-user-id-123",
    email: "thaisvieiravet@hotmail.com",
    displayName: "Thaís Vieira",
  },
  onAuthStateChanged: (callback: any) => {
    // If not configured, we default to authenticated user in preview mode to let the developer test everything smoothly
    const simulatedLoggedIn = localStorage.getItem('domo_mock_logged_in') !== 'false';
    const simulatedUser = simulatedLoggedIn 
      ? { uid: "mock-user-id-123", email: "thaisvieiravet@hotmail.com" }
      : null;
    callback(simulatedUser);
    return () => {};
  },
  signInWithEmailAndPassword: async (emailVal: string, passwordVal: string) => {
    localStorage.setItem('domo_mock_logged_in', 'true');
    return { user: { uid: "mock-user-id-123", email: emailVal } };
  },
  signOut: async () => {
    localStorage.setItem('domo_mock_logged_in', 'false');
  },
  sendPasswordResetEmail: async (emailVal: string) => {
    console.log("Simulado envio de e-mail de recuperação para:", emailVal);
    return true;
  }
};

export const auth = isFirebaseConfigured ? authInstance : (mockAuth as any);
export const db = isFirebaseConfigured ? dbInstance : (null as any);
export const storage = isFirebaseConfigured ? storageInstance : (null as any);

