const STORAGE_KEY = 'sfds_assessment_sessions';
const DEMO_DATE = '2026-05-15';
const TEACHER_NAME = 'Demo Teacher';

const subjects = [
  { subject_id: 'ENG1', subject_name: 'English I', criteria: ['ENG1_C1','ENG1_C2','ENG1_C3','ENG1_C4','ENG1_C5','ENG1_C6'] },
  { subject_id: 'ENG2', subject_name: 'English II', criteria: ['ENG2_C1','ENG2_C2','ENG2_C3','ENG2_C4','ENG2_C5'] },
  { subject_id: 'MATH', subject_name: 'Mathematics', criteria: ['MATH_C1','MATH_C2','MATH_C3','MATH_C4','MATH_C5'] },
  { subject_id: 'SCI', subject_name: 'Science', criteria: ['SCI_C1','SCI_C2','SCI_C3','SCI_C4'] },
  { subject_id: 'KHA', subject_name: 'Khasi', criteria: ['KHA_C1','KHA_C2','KHA_C3','KHA_C4','KHA_C5'] },
  { subject_id: 'HIN', subject_name: 'Hindi', criteria: ['HIN_C1','HIN_C2','HIN_C3','HIN_C4','HIN_C5'] }
];

const class1Students = [
  'SFS260101','SFS260102','SFS260103','SFS260104','SFS260105','SFS260106','SFS260107','SFS260108',
  'SFS260109','SFS260110','SFS260111','SFS260112','SFS260113','SFS260114','SFS260115','SFS260116',
  'SFS260117','SFS260118','SFS260119','SFS260120','SFS260121','SFS260122','SFS260123','SFS260124',
  'SFS260125','SFS260126','SFS260127','SFS260128','SFS260129','SFS260130','SFS260131','SFS260132',
  'SFS260133','SFS260134','SFS260135','SFS260136','SFS260137','SFS260138','SFS260139','SFS260140',
  'SFS260141','SFS260142','SFS260143','SFS260144','SFS260145','SFS260146','SFS260147','SFS260148',
  'SFS260149','SFS260150','SFS260151','SFS260152','SFS260153','SFS260154','SFS260155','SFS260156',
  'SFS260157','SFS260158','SFS260159'
];

const class2Students = [
  'SFS260160','SFS260161','SFS260162','SFS260163','SFS260164','SFS260165','SFS260166','SFS260167',
  'SFS260168','SFS260169','SFS260170','SFS260171','SFS260172','SFS260173','SFS260174','SFS260175',
  'SFS260176','SFS260177','SFS260178','SFS260179','SFS260180','SFS260181','SFS260182','SFS260183',
  'SFS260184','SFS260185','SFS260186','SFS260187','SFS260188','SFS260189','SFS260190','SFS260191',
  'SFS260192','SFS260193','SFS260194','SFS260195','SFS260196','SFS260197','SFS260198','SFS260199',
  'SFS260200','SFS260201','SFS260202','SFS260203','SFS260204','SFS260205','SFS260206','SFS260207',
  'SFS260208','SFS260209','SFS260210','SFS260211','SFS260212','SFS260213','SFS260214'
];

function getTier(studentIndex, total) {
  const pct = studentIndex / total;
  if (pct < 0.2) return 'strong';
  if (pct < 0.7) return 'average';
  return 'weak';
}

function randomMark(tier) {
  const r = Math.random();
  if (tier === 'strong') {
    if (r < 0.5) return 5;
    if (r < 0.85) return 4;
    return 3;
  }
  if (tier === 'average') {
    if (r < 0.15) return 5;
    if (r < 0.5) return 4;
    if (r < 0.85) return 3;
    return 2;
  }
  // weak
  if (r < 0.1) return 4;
  if (r < 0.4) return 3;
  if (r < 0.75) return 2;
  if (r < 0.95) return 1;
  return 0;
}

function generateMarks(students, criteria) {
  const marks = {};
  students.forEach((studentId, idx) => {
    const tier = getTier(idx, students.length);
    marks[studentId] = {};
    criteria.forEach(criterionId => {
      marks[studentId][criterionId] = randomMark(tier);
    });
  });
  return marks;
}

function generateSession(className, students, subject, date) {
  const sessionId = `demo_${className.replace(/\s+/g,'')}_${subject.subject_id}_${date}`;
  return {
    session: {
      session_id: sessionId,
      teacher_name: TEACHER_NAME,
      class: className,
      subject_id: subject.subject_id,
      subject_name: subject.subject_name,
      date,
      status: 'locked',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    marks: generateMarks(students, subject.criteria),
    saved_at: new Date().toISOString()
  };
}

function clearCache() {
  localStorage.removeItem('sfds_aggregation_cache');
  localStorage.removeItem('sfds_weak_student_cache');
}

export function generateDemoData() {
  clearCache();
  const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  const sessions = [];

  subjects.forEach(subject => {
    sessions.push(generateSession('Class I', class1Students, subject, DEMO_DATE));
    sessions.push(generateSession('Class II', class2Students, subject, DEMO_DATE));
  });

  const merged = [...existing];
  sessions.forEach(sess => {
    const idx = merged.findIndex(s => s.session.session_id === sess.session.session_id);
    if (idx >= 0) merged[idx] = sess;
    else merged.push(sess);
  });

  localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  return sessions.length;
}

export function clearDemoData() {
  clearCache();
  const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  const filtered = existing.filter(s => !s.session.session_id.startsWith('demo_'));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}
