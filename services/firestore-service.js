import { db } from './firebase-config.js';
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  query,
  where
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

const COLLECTION = 'assessment_sessions';

export async function fetchSessions(filters = {}) {
  let q = collection(db, COLLECTION);
  const constraints = [];

  if (filters.class)   constraints.push(where('session.class', '==', filters.class));
  if (filters.teacher) constraints.push(where('session.teacher_name', '==', filters.teacher));
  if (filters.status)  constraints.push(where('session.status', '==', filters.status));

  if (constraints.length > 0) q = query(q, ...constraints);

  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => d.data());
}

export async function persistSession(session, marks) {
  if (!session || !session.session_id) throw new Error('Invalid session');

  const entry = {
    session: { ...session, updated_at: new Date().toISOString() },
    marks: marks || {},
    saved_at: new Date().toISOString()
  };

  await setDoc(doc(db, COLLECTION, session.session_id), entry);
  return entry;
}

export async function fetchSession(sessionId) {
  if (!sessionId) return null;
  const snap = await getDoc(doc(db, COLLECTION, sessionId));
  return snap.exists() ? snap.data() : null;
}

// Sessions are never hard-deleted per security rules — use status transitions instead.
export async function removeSession(_sessionId) {
  console.warn('Session deletion is disabled. Use status transitions instead.');
}
