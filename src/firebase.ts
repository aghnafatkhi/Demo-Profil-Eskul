import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase SDK
const app = initializeApp(firebaseConfig);

// Use the provided database ID or default to '(default)'
const databaseId = firebaseConfig.firestoreDatabaseId || '(default)';
export const db = getFirestore(app, databaseId);
export const auth = getAuth();
export const storage = getStorage(app);

async function testConnection() {
  // Delay test slightly to allow SDK to initialize
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  try {
    // Try to reach the server to verify configuration
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log("Firestore connection successful.");
  } catch (error: any) {
    // Only log error if it's truly a connection/config issue
    if (error?.message?.includes('offline') || error?.message?.includes('unavailable')) {
      console.error("Firestore connection test failed. This usually means the Firebase configuration is incorrect or the database is not yet provisioned.");
      console.error("Current Config:", {
        projectId: firebaseConfig.projectId,
        databaseId: databaseId
      });
    }
    // We don't throw here to avoid crashing the whole app if it's just a transient network issue
  }
}
testConnection();
