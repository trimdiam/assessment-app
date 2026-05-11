import { auth, db } from './firebase-config.js';
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

const AUTH_KEY = 'sfds_auth_user';

// Converts a staff ID to its Firebase Auth email (must match main app logic exactly)
function idToEmail(id) {
  if (id.includes('@')) return id; // admin uses real email e.g. admin@test.com
  return id.trim().toLowerCase().replace(/[^a-z0-9]/g, '_') + '@stfrancis.school';
}

export async function login(loginId, password) {
  const email = idToEmail(loginId);
  const credential = await signInWithEmailAndPassword(auth, email, password);
  const uid = credential.user.uid;

  // 1. Get role from users collection
  const userDoc = await getDoc(doc(db, 'users', uid));
  const role = userDoc.exists() ? (userDoc.data().role || 'teacher') : 'teacher';

  // 2. Get name — for teachers, look up from teachers collection by teacherId
  //    For admin, fall back to users collection name or email
  let name = '';
  let teacherId = '';

  if (role === 'teacher' || role === 'staff') {
    // The loginId IS the teacher's staff ID (e.g. SFST007)
    teacherId = loginId.trim().toUpperCase();
    const teacherDoc = await getDoc(doc(db, 'teachers', teacherId));
    if (teacherDoc.exists()) {
      const t = teacherDoc.data();
      name = (t.title ? t.title + ' ' : '') + (t.name || '');
    }
  }

  if (!name) {
    // Fallback: use name from users collection or the email itself
    name = userDoc.exists() ? (userDoc.data().name || loginId) : loginId;
  }

  const authUser = { uid, email, name: name.trim(), role, teacherId };
  localStorage.setItem(AUTH_KEY, JSON.stringify(authUser));
  return authUser;
}

export async function logout() {
  await signOut(auth);
  localStorage.removeItem(AUTH_KEY);
}

export function getCurrentUser() {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function isLoggedIn() {
  return !!getCurrentUser();
}

export function isTeacher() {
  return getCurrentUser()?.role === 'teacher';
}

export function isAdmin() {
  const role = getCurrentUser()?.role;
  return role === 'admin' || role === 'super_admin';
}

export function requireAuth() {
  if (!isLoggedIn()) throw new Error('Authentication required');
}

export function requireRole(role) {
  const user = getCurrentUser();
  if (!user || user.role !== role) {
    throw new Error(`Access denied: ${role} role required`);
  }
}

export function onAuthChange(callback) {
  return onAuthStateChanged(auth, callback);
}
