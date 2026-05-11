import { db } from './firebase-config.js';
import { collection, query, where, orderBy, getDocs } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

// Maps assessment-app class names to Firestore class field values
const CLASS_MAP = {
  'LKG':     'LKG',
  'SKG':     'SKG',
  'Class I':  '1',
  'Class II': '2'
};

// Local JSON fallback paths (used if Firestore fetch fails)
const FALLBACK_FILES = {
  'LKG':     'data/students/lkg.json',
  'SKG':     'data/students/skg.json',
  'Class I':  'data/students/class1.json',
  'Class II': 'data/students/class2.json'
};

export async function loadStudentsForClass(className) {
  const firestoreClass = CLASS_MAP[className];
  if (!firestoreClass) return [];

  try {
    const q = query(
      collection(db, 'students'),
      where('class', '==', firestoreClass),
      orderBy('rollNo')
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      return snap.docs.map(d => normalizeStudent(d.data()));
    }
  } catch (err) {
    console.warn(`Firestore student fetch failed for ${className}, falling back to local JSON:`, err);
  }

  // Fallback to local JSON
  const path = FALLBACK_FILES[className];
  if (!path) return [];
  try {
    const res = await fetch(path);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return normalizeStudents(data);
  } catch (err) {
    console.error(`Failed to load students for ${className}:`, err);
    return [];
  }
}

function normalizeStudent(s) {
  return {
    student_id: s.studentId || s.student_id || '',
    full_name:  s.name      || s.full_name  || '',
    class:      s.class     || '',
    section:    s.section   || '',
    roll_no:    s.rollNo    || s.roll_no    || '',
    gender:     s.gender    || '',
    dob:        s.dob       || '',
    age:        s.age       || ''
  };
}

export function normalizeStudents(students) {
  if (!Array.isArray(students)) return [];
  return students.map(normalizeStudent);
}
