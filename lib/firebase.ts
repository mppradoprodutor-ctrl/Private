import { initializeApp } from 'firebase/app';
import {
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User as FirebaseUser,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  initializeFirestore,
  onSnapshot,
  query,
  setDoc,
  writeBatch,
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || import.meta.env.NEXT_PUBLIC_FIREBASE_API_KEY || process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || import.meta.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || import.meta.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || import.meta.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || import.meta.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || import.meta.env.NEXT_PUBLIC_FIREBASE_APP_ID || process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || import.meta.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
  useFetchStreams: false,
});

const collectionAliases: Record<string, string> = {
  drivers: 'motoristas',
  freights: 'embarcadores',
  shipments: 'ordens',
  trips: 'viagens',
  third_party: 'clientes',
};

const firestoreCollection = (name: string) => collectionAliases[name] || name;
const clean = <T>(value: T): T => JSON.parse(JSON.stringify(value));

export { app, auth, db, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut };
export type { FirebaseUser };

export function subscribeToUserCollection<T extends { id: string }>(uid: string, name: string, callback: (items: T[]) => void) {
  const ref = collection(db, 'users', uid, firestoreCollection(name));
  return onSnapshot(ref, snapshot => {
    callback(snapshot.docs.map(item => ({ id: item.id, ...item.data() }) as T));
  }, error => console.error(`[Firestore] ${name}`, error));
}

export async function isUserDatabaseEmpty(uid: string) {
  const names = ['drivers', 'freights', 'shipments', 'trips', 'third_party'];
  const results = await Promise.all(names.map(name => getDocs(query(collection(db, 'users', uid, firestoreCollection(name))))));
  return results.every(snapshot => snapshot.empty);
}

export async function batchSaveCollection<T extends { id: string }>(uid: string, name: string, items: T[]) {
  for (let start = 0; start < items.length; start += 500) {
    const batch = writeBatch(db);
    items.slice(start, start + 500).forEach(item => {
      batch.set(doc(db, 'users', uid, firestoreCollection(name), item.id), clean(item));
    });
    await batch.commit();
  }
}

export async function saveUserDocument<T extends { id: string }>(uid: string, name: string, item: T) {
  await setDoc(doc(db, 'users', uid, firestoreCollection(name), item.id), clean(item));
}

export async function deleteUserDocument(uid: string, name: string, id: string) {
  await deleteDoc(doc(db, 'users', uid, firestoreCollection(name), id));
}

export async function deleteAllUserDocuments(uid: string, name: string) {
  const snapshot = await getDocs(collection(db, 'users', uid, firestoreCollection(name)));
  for (let start = 0; start < snapshot.docs.length; start += 500) {
    const batch = writeBatch(db);
    snapshot.docs.slice(start, start + 500).forEach(item => batch.delete(item.ref));
    await batch.commit();
  }
}
