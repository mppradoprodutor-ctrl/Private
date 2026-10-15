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
  getAggregateFromServer,
  getCountFromServer,
  getDocs,
  initializeFirestore,
  limit,
  onSnapshot,
  orderBy,
  query,
  startAfter,
  where,
  setDoc,
  sum,
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

export type DriverQueryFilters = {
  name?: string;
  cpfCnh?: string;
  plate?: string;
  antt?: string;
};

function driversQuery(uid: string, filters: DriverQueryFilters = {}, cursor?: any) {
  const constraints: any[] = [];
  const name = filters.name?.trim();
  const cpfCnh = filters.cpfCnh?.replace(/\D/g, '');
  const plate = filters.plate?.trim().toUpperCase();
  const antt = filters.antt?.trim();

  if (name) {
    constraints.push(where('name', '>=', name), where('name', '<=', `${name}\uf8ff`));
  }
  if (cpfCnh) constraints.push(where('cpf', '==', cpfCnh));
  if (plate) constraints.push(where('truckPlate', '==', plate));
  if (antt) constraints.push(where('antt', '==', antt));
  constraints.push(orderBy('name'), limit(50));
  if (cursor) constraints.splice(constraints.length - 1, 0, startAfter(cursor));
  return query(collection(db, 'users', uid, 'motoristas'), ...constraints);
}

export function subscribeToDriversPage<T extends { id: string }>(uid: string, filters: DriverQueryFilters, callback: (items: T[], lastDoc: any, hasMore: boolean) => void) {
  return onSnapshot(driversQuery(uid, filters), snapshot => {
    callback(snapshot.docs.map(item => ({ id: item.id, ...item.data() }) as T), snapshot.docs.at(-1), snapshot.size === 50);
  }, error => console.error('[Firestore] motoristas', error));
}

export async function loadDriversPage<T extends { id: string }>(uid: string, filters: DriverQueryFilters, cursor?: any) {
  const snapshot = await getDocs(driversQuery(uid, filters, cursor));
  return { items: snapshot.docs.map(item => ({ id: item.id, ...item.data() }) as T), lastDoc: snapshot.docs.at(-1), hasMore: snapshot.size === 50 };
}

export async function countUserCollection(uid: string, name: string, filters: DriverQueryFilters = {}) {
  const ref = name === 'drivers' ? driversQuery(uid, filters) : query(collection(db, 'users', uid, firestoreCollection(name)));
  return (await getCountFromServer(ref)).data().count;
}

export type TripQueryFilters = { code?: string };

function tripsQuery(uid: string, filters: TripQueryFilters = {}, cursor?: any) {
  const constraints: any[] = [];
  const code = filters.code?.trim();
  if (code) {
    constraints.push(where('codigo', '>=', code), orderBy('codigo'), orderBy('data', 'desc'));
  } else {
    constraints.push(orderBy('data', 'desc'));
  }
  constraints.push(limit(20));
  if (cursor) constraints.splice(constraints.length - 1, 0, startAfter(cursor));
  return query(collection(db, 'users', uid, firestoreCollection('trips')), ...constraints);
}

export function subscribeToTripsPage<T extends { id: string }>(uid: string, filters: TripQueryFilters, callback: (items: T[], lastDoc: any, hasMore: boolean) => void) {
  return onSnapshot(tripsQuery(uid, filters), snapshot => {
    callback(snapshot.docs.map(item => ({ id: item.id, ...item.data() }) as T), snapshot.docs.at(-1), snapshot.size === 20);
  }, error => console.error('[Firestore] viagens', error));
}

export async function loadTripsPage<T extends { id: string }>(uid: string, filters: TripQueryFilters, cursor?: any) {
  const snapshot = await getDocs(tripsQuery(uid, filters, cursor));
  return { items: snapshot.docs.map(item => ({ id: item.id, ...item.data() }) as T), lastDoc: snapshot.docs.at(-1), hasMore: snapshot.size === 20 };
}

export async function getTripsAggregate(uid: string) {
  const result = await getAggregateFromServer(
    query(collection(db, 'users', uid, firestoreCollection('trips'))),
    { totalRevenue: sum('companyTariff'), totalProfit: sum('profit') }
  );
  return result.data();
}

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
