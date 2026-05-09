const STORAGE_KEY = 'sfds_assessment_sessions';

export function getAllSessions() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveSession(session, marks) {
  if (!session || !session.session_id) {
    throw new Error('Invalid session');
  }

  const sessions = getAllSessions();
  const existingIndex = sessions.findIndex(s => s.session.session_id === session.session_id);

  const entry = {
    session: { ...session, updated_at: new Date().toISOString() },
    marks: marks || {},
    saved_at: new Date().toISOString()
  };

  if (existingIndex >= 0) {
    sessions[existingIndex] = entry;
  } else {
    sessions.push(entry);
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  } catch (error) {
    throw new Error('Failed to save session: storage may be full');
  }

  return entry;
}

export function getSession(sessionId) {
  if (!sessionId) return null;
  const sessions = getAllSessions();
  return sessions.find(s => s.session.session_id === sessionId) || null;
}

export function deleteSession(sessionId) {
  const sessions = getAllSessions().filter(s => s.session.session_id !== sessionId);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  } catch (error) {
    console.error('Failed to delete session', error);
  }
}

export function findDuplicateSession({ teacher_name, class: className, subject_id, date }) {
  if (!teacher_name || !className || !subject_id || !date) return null;
  const sessions = getAllSessions();
  return sessions.find(s =>
    s.session.teacher_name === teacher_name &&
    s.session.class === className &&
    s.session.subject_id === subject_id &&
    s.session.date === date
  ) || null;
}
