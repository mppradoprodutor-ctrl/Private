import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  initializeFirestore,
  doc, 
  setDoc, 
  deleteDoc, 
  collection, 
  onSnapshot, 
  writeBatch,
  query,
  getDocs,
  DocumentData
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase with the configurations from firebase-applet-config.json
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Use custom Firestore database ID if provided, otherwise default to default DB
const firestoreSettings = {
  experimentalForceLongPolling: true,
  useFetchStreams: false,
};

const db = firebaseConfig.firestoreDatabaseId 
  ? initializeFirestore(app, firestoreSettings, firebaseConfig.firestoreDatabaseId)
  : initializeFirestore(app, firestoreSettings);

export { app, auth, db };

// Subscribe to real-time updates for a specific user collection
export function subscribeToUserCollection<T extends { id: string }>(
  uid: string,
  collectionName: string,
  callback: (data: T[]) => void
) {
  const colRef = collection(db, 'users', uid, collectionName);
  return onSnapshot(colRef, (snapshot) => {
    const items: T[] = [];
    snapshot.forEach((doc) => {
      items.push({ id: doc.id, ...doc.data() } as T);
    });
    callback(items);
  }, (error) => {
    console.error(`Error listening to collection ${collectionName}:`, error);
  });
}

// Check if the user's database in Firestore is completely empty (useful for initial migration)
export async function isUserDatabaseEmpty(uid: string): Promise<boolean> {
  const collectionsToCheck = ['drivers', 'freights', 'third_party', 'trips', 'reminders', 'shipments', 'notes'];
  try {
    const promises = collectionsToCheck.map(async (name) => {
      const colRef = collection(db, 'users', uid, name);
      const snap = await getDocs(query(colRef));
      return snap.empty;
    });
    const results = await Promise.all(promises);
    return results.every(empty => empty === true);
  } catch (error) {
    console.error("Error checking if user database is empty:", error);
    // If it fails (e.g. permission/network issue), default to false to prevent wiping local storage
    return false;
  }
}

// Bulk save items to Firestore (migration)
export async function batchSaveCollection<T extends { id: string }>(
  uid: string,
  collectionName: string,
  items: T[]
): Promise<void> {
  if (items.length === 0) return;
  
  // Firestore batches support up to 500 operations
  const chunks = [];
  for (let i = 0; i < items.length; i += 500) {
    chunks.push(items.slice(i, i + 500));
  }

  for (const chunk of chunks) {
    const batch = writeBatch(db);
    chunk.forEach((item) => {
      const docRef = doc(db, 'users', uid, collectionName, item.id);
      // Strip undefined values to avoid Firestore crashing
      const cleanedItem = JSON.parse(JSON.stringify(item));
      batch.set(docRef, cleanedItem);
    });
    await batch.commit();
  }
}

// Save a single document
export async function saveUserDocument<T extends { id: string }>(
  uid: string,
  collectionName: string,
  item: T
): Promise<void> {
  const docRef = doc(db, 'users', uid, collectionName, item.id);
  const cleanedItem = JSON.parse(JSON.stringify(item));
  await setDoc(docRef, cleanedItem);
}

// Delete a single document
export async function deleteUserDocument(
  uid: string,
  collectionName: string,
  docId: string
): Promise<void> {
  const docRef = doc(db, 'users', uid, collectionName, docId);
  await deleteDoc(docRef);
}

// Delete all documents in a user subcollection
export async function deleteAllUserDocuments(
  uid: string,
  collectionName: string
): Promise<void> {
  const colRef = collection(db, 'users', uid, collectionName);
  const snap = await getDocs(colRef);
  if (snap.empty) return;

  const docs = snap.docs;
  for (let i = 0; i < docs.length; i += 500) {
    const batch = writeBatch(db);
    const chunk = docs.slice(i, i + 500);
    chunk.forEach(docSnap => {
      batch.delete(docSnap.ref);
    });
    await batch.commit();
  }
}
