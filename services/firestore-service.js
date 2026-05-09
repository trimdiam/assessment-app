import {
  getAllSessions,
  saveSession as localSaveSession,
  getSession as localGetSession,
  deleteSession as localDeleteSession
} from './session-storage.js';

// Firestore-compatible API backed by localStorage.
// Replace these implementations with actual Firebase Firestore calls
// once firebase-config.js is configured.

export async function fetchSessions(filters = {}) {
  let sessions = getAllSessions();
  if (filters.class) sessions = sessions.filter(s => s.session.class === filters.class);
  if (filters.teacher) sessions = sessions.filter(s => s.session.teacher_name === filters.teacher);
  if (filters.status) sessions = sessions.filter(s => s.session.status === filters.status);
  return sessions;
}

export async function persistSession(session, marks) {
  return localSaveSession(session, marks);
}

export async function fetchSession(sessionId) {
  return localGetSession(sessionId);
}

export async function removeSession(sessionId) {
  return localDeleteSession(sessionId);
}
