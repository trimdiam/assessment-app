import { auth, db } from './firebase-config.js';
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

const AUTH_KEY = 'sfds_auth_user';

function idToEmail(id) {
  if (id.includes('@')) return id; // admin uses real email
  return id.trim().toLowerCase().replace(/[^a-z0-9]/g, '_') + '@stfrancis.school';
}

export async function login(loginId, password) {
  const email = idToEmail(loginId);
  const credential = await signInWithEmailAndPassword(auth, email, password);
  const uid = credential.user.uid;

  // Fetch role from Firestore users collection
  const userDoc = await getDoc(doc(db, 'users', uid));
  const role = userDoc.exists() ? (userDoc.data().role || 'teacher') : 'teacher';
  const name = userDoc.exists() ? (userDoc.data().name || email) : email;

  const authUser = { uid, email, name, role };
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
