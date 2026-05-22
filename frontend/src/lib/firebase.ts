import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyBg8JbDYviUAVFtYXeC0uN0vZgDP0I9weo",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "teachguard-ai.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "teachguard-ai",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "teachguard-ai.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "115960317504",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:115960317504:web:74de5acb1dfbc46319c1a5",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-TLZEEJGKYP"
};

// 중복 초기화 방지
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

const auth = getAuth(app);
const db = getFirestore(app);

// 브라우저 닫았다 다시 열어도 로그인 유지
setPersistence(auth, browserLocalPersistence).catch(console.error);

export { app, auth, db };
