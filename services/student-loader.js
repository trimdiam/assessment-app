const STUDENT_FILES = Object.freeze({
  LKG: 'data/students/lkg.json',
  SKG: 'data/students/skg.json',
  'Class I': 'data/students/class1.json',
  'Class II': 'data/students/class2.json'
});

export async function loadStudentsForClass(className, options = {}) {
  const path = STUDENT_FILES[className];
  if (!path) return [];

  const fetchJson = options.fetchJson || fetchJsonFile;
  const students = await fetchJson(path);
  return normalizeStudents(students);
}

export function normalizeStudents(students) {
  if (!Array.isArray(students)) return [];
  return students.map(student => ({
    student_id: student.student_id || student.studentId || '',
    full_name: student.full_name || student.fullName || student.name || '',
    class: student.class || '',
    section: student.section || '',
    roll_no: student.roll_no || student.rollNo || '',
    gender: student.gender || '',
    dob: student.dob || '',
    age: student.age || ''
  }));
}

async function fetchJsonFile(path) {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Failed to load ${path}`);
  }
  return response.json();
}
