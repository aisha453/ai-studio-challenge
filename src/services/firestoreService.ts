import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  getDocs,
} from 'firebase/firestore';
import { db } from '../firebase';
import { JournalEntry } from '../types';
import { stripUndefined } from '../lib/sanitize';

/**
 * References the user-isolated entries subcollection
 * Path: /users/{userId}/entries
 */
function getEntriesCollection(userId: string) {
  if (!userId) throw new Error('User ID is required for Firestore operations');
  return collection(db, 'users', userId, 'entries');
}

/**
 * Saves or updates a journal entry in Firestore
 * Applies undefined-stripping prior to persistence
 */
export async function saveJournalEntry(
  userId: string,
  entry: JournalEntry
): Promise<void> {
  if (!userId) throw new Error('Cannot save entry: User not authenticated');
  if (!entry.id) throw new Error('Cannot save entry: Missing entry ID');

  const entryRef = doc(db, 'users', userId, 'entries', entry.id);
  const cleanPayload = stripUndefined({
    ...entry,
    userId,
    updatedAt: new Date().toISOString(),
  });

  await setDoc(entryRef, cleanPayload, { merge: true });
}

/**
 * Deletes a journal entry from Firestore
 */
export async function deleteJournalEntry(
  userId: string,
  entryId: string
): Promise<void> {
  if (!userId || !entryId) throw new Error('User ID and Entry ID are required');
  const entryRef = doc(db, 'users', userId, 'entries', entryId);
  await deleteDoc(entryRef);
}

/**
 * Fetches all journal entries once for a given user
 */
export async function fetchUserEntries(userId: string): Promise<JournalEntry[]> {
  if (!userId) return [];
  const entriesRef = getEntriesCollection(userId);
  const q = query(entriesRef, orderBy('updatedAt', 'desc'));
  const snapshot = await getDocs(q);

  const entries: JournalEntry[] = [];
  snapshot.forEach((docSnap) => {
    entries.push(docSnap.data() as JournalEntry);
  });
  return entries;
}

/**
 * Real-time listener for user journal entries
 */
export function subscribeToUserEntries(
  userId: string,
  onUpdate: (entries: JournalEntry[]) => void,
  onError: (error: Error) => void
): () => void {
  if (!userId) {
    onUpdate([]);
    return () => {};
  }

  const entriesRef = getEntriesCollection(userId);
  const q = query(entriesRef, orderBy('updatedAt', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const entries: JournalEntry[] = [];
      snapshot.forEach((docSnap) => {
        entries.push(docSnap.data() as JournalEntry);
      });
      onUpdate(entries);
    },
    (err) => {
      console.error('Firestore subscription error:', err);
      onError(err);
    }
  );
}
