const AUTH_KEY = 'sfds_auth_user';

const MOCK_USERS = [
  { uid: 'T001', email: 'teacher@sfds.com', name: 'Mr. John', role: 'teacher' },
  { uid: 'A001', email: 'admin@sfds.com', name: 'Admin', role: 'admin' }
];

export async function login(email, password) {
  // TODO: Replace with Firebase Auth signInWithEmailAndPassword
  const user = MOCK_USERS.find(u => u.email === email);
  if (!user || password !== 'sfds123') {
    throw new Error('Invalid email or password');
  }
  const authUser = { ...user };
  localStorage.setItem(AUTH_KEY, JSON.stringify(authUser));
  return authUser;
}

export function logout() {
  // TODO: Replace with Firebase Auth signOut
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
  return getCurrentUser()?.role === 'admin';
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
