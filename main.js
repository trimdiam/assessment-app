import { createSessionSetup } from './components/session-setup.js';
import { createAssessmentCard, updateTotal } from './components/assessment-card.js';
import { createSessionToolbar } from './components/session-toolbar.js';
import { loadCriteriaForSubject } from './services/criteria-loader.js';
import { getSubjectsForClass, loadSubjects } from './services/subject-loader.js';
import { loadStudentsForClass } from './services/student-loader.js';
import { createSession, initializeMarksState, validateMark } from './services/assessment-engine.js';
import { saveSession, getSession, getAllSessions } from './services/session-storage.js';

const classes = ['LKG', 'SKG', 'Class I', 'Class II'];

const state = {
  allSubjects: [],
  subjects: [],
  selectedClass: '',
  selectedSubject: null,
  criteria: [],
  students: [],

  teacherName: '',
  date: getToday(),

  mode: 'setup',
  session: null,
  marks: {},

  lastSaved: null,
  errorMessage: '',
  infoMessage: '',
  isLoadingCriteria: false
};

const setupRoot = document.querySelector('#session-setup-root');
const assessmentRoot = document.querySelector('#assessment-root');
let autosaveTimer = null;

async function init() {
  try {
    state.allSubjects = await loadSubjects();
  } catch (error) {
    console.error(error);
    state.errorMessage = 'Failed to load subjects';
  }
  render();
}

function render() {
  if (state.mode === 'setup') {
    renderSetup();
    assessmentRoot.replaceChildren();
  } else {
    setupRoot.replaceChildren();
    renderAssessment();
  }
}

function renderSetup() {
  setupRoot.replaceChildren(createSessionSetup({
    classes,
    subjects: state.subjects,
    selectedClass: state.selectedClass,
    selectedSubjectId: state.selectedSubject?.subject_id || '',
    teacherName: state.teacherName,
    date: state.date,
    savedSessions: getAllSessions(),
    onClassChange: handleClassChange,
    onSubjectChange: handleSubjectChange,
    onTeacherNameChange: handleTeacherNameChange,
    onDateChange: handleDateChange,
    onStartSession: handleStartSession,
    onResumeSession: handleResumeSession
  }));

  if (state.errorMessage) {
    const err = document.createElement('p');
    err.className = 'error-state';
    err.textContent = state.errorMessage;
    setupRoot.append(err);
  }

  if (state.infoMessage) {
    const info = document.createElement('p');
    info.className = 'info-state';
    info.textContent = state.infoMessage;
    setupRoot.append(info);
  }
}

function renderAssessment() {
  if (!state.session || !state.students.length || !state.criteria.length) {
    assessmentRoot.replaceChildren(createStatus('Session data is incomplete.'));
    return;
  }

  assessmentRoot.replaceChildren();

  const toolbar = createSessionToolbar({
    session: state.session,
    marks: state.marks,
    students: state.students,
    criteria: state.criteria,
    onSave: handleSave,
    onClose: handleCloseSession,
    lastSaved: state.lastSaved
  });
  assessmentRoot.append(toolbar);

  const cardsContainer = document.createElement('div');
  cardsContainer.className = 'assessment-cards';

  state.students.forEach(student => {
    const card = createAssessmentCard({
      student,
      criteria: state.criteria,
      marks: state.marks[student.student_id] || {},
      onMarkChange: handleMarkChange
    });
    cardsContainer.append(card);
  });

  assessmentRoot.append(cardsContainer);
}

async function handleClassChange(className) {
  state.selectedClass = className;
  state.selectedSubject = null;
  state.criteria = [];
  state.errorMessage = '';
  state.infoMessage = '';
  state.subjects = getSubjectsForClass(state.allSubjects, className);
  state.students = className ? await loadStudentsForClass(className).catch(() => []) : [];
  render();
}

async function handleSubjectChange(subject) {
  state.selectedSubject = subject;
  state.criteria = [];
  state.errorMessage = '';
  state.infoMessage = '';

  if (!subject) {
    render();
    return;
  }

  state.isLoadingCriteria = true;
  render();

  try {
    state.criteria = await loadCriteriaForSubject(subject, state.selectedClass);
  } catch (error) {
    state.errorMessage = error.userMessage || 'Criteria not available';
    console.error(error);
  } finally {
    state.isLoadingCriteria = false;
    render();
  }
}

function handleTeacherNameChange(name) {
  state.teacherName = name;
  state.errorMessage = '';
}

function handleDateChange(date) {
  state.date = date;
  state.errorMessage = '';
}

function handleStartSession(force = false) {
  state.errorMessage = '';
  state.infoMessage = '';

  const result = createSession({
    teacher_name: state.teacherName,
    class: state.selectedClass,
    subject: state.selectedSubject,
    date: state.date,
    force
  });

  if (!result.ok) {
    if (result.duplicate && !force) {
      const confirmed = confirm(
        `A draft session already exists for ${state.teacherName}, ${state.selectedClass}, ${state.selectedSubject.subject_name}, ${state.date}.\n\nOverwrite and continue?`
      );
      if (confirmed) {
        handleStartSession(true);
      }
      return;
    }
    state.errorMessage = result.errors.join('. ');
    render();
    return;
  }

  if (!state.students.length) {
    state.errorMessage = 'No students found for this class.';
    render();
    return;
  }

  if (!state.criteria.length) {
    state.errorMessage = 'No criteria loaded for this subject.';
    render();
    return;
  }

  state.session = result.session;
  state.marks = initializeMarksState(state.students, state.criteria);
  state.mode = 'assessment';
  state.lastSaved = null;

  scheduleAutosave();
  render();
}

async function handleResumeSession(sessionId) {
  state.errorMessage = '';
  state.infoMessage = '';

  const stored = getSession(sessionId);
  if (!stored) {
    state.errorMessage = 'Session not found.';
    render();
    return;
  }

  const sess = stored.session;
  state.teacherName = sess.teacher_name;
  state.selectedClass = sess.class;
  state.date = sess.date;
  state.subjects = getSubjectsForClass(state.allSubjects, sess.class);
  state.selectedSubject = state.subjects.find(s => s.subject_id === sess.subject_id) || null;

  if (!state.selectedSubject) {
    state.errorMessage = 'Subject for this session is no longer available.';
    render();
    return;
  }

  state.students = await loadStudentsForClass(sess.class).catch(() => []);

  try {
    state.criteria = await loadCriteriaForSubject(state.selectedSubject, sess.class);
  } catch (error) {
    state.errorMessage = error.userMessage || 'Failed to load criteria';
    render();
    return;
  }

  state.session = sess;
  state.marks = mergeMarks(stored.marks, state.students, state.criteria);
  state.mode = 'assessment';
  state.lastSaved = stored.saved_at ? new Date(stored.saved_at) : null;

  scheduleAutosave();
  render();
}

function handleMarkChange(studentId, criterionId, mark) {
  if (!validateMark(mark)) return;

  if (!state.marks[studentId]) {
    state.marks[studentId] = {};
  }
  state.marks[studentId][criterionId] = mark;

  const card = document.querySelector(`.assessment-card[data-student-id="${studentId}"]`);
  if (card) {
    updateTotal(card, state.marks[studentId], state.criteria);
  }

  scheduleAutosave();
}

function handleSave() {
  if (!state.session) return;

  try {
    saveSession(state.session, state.marks);
    state.lastSaved = new Date();
    const note = document.querySelector('.saved-note');
    if (note) {
      note.textContent = `Last saved: ${formatTime(state.lastSaved)}`;
    }
  } catch (error) {
    state.errorMessage = error.message || 'Save failed.';
    render();
  }
}

function handleCloseSession() {
  if (state.session) {
    const unsaved = hasUnsavedChanges();
    if (unsaved) {
      const ok = confirm('You have unsaved changes. Save before closing?');
      if (ok) handleSave();
    }
  }

  clearAutosave();
  state.mode = 'setup';
  state.session = null;
  state.marks = {};
  state.lastSaved = null;
  state.errorMessage = '';
  state.infoMessage = '';
  render();
}

function scheduleAutosave() {
  clearAutosave();
  autosaveTimer = setTimeout(() => {
    if (state.mode === 'assessment' && state.session) {
      try {
        saveSession(state.session, state.marks);
        state.lastSaved = new Date();
        const note = document.querySelector('.saved-note');
        if (note) {
          note.textContent = `Last saved: ${formatTime(state.lastSaved)}`;
        }
      } catch (error) {
        console.error('Autosave failed', error);
      }
    }
  }, 30000);
}

function clearAutosave() {
  if (autosaveTimer) {
    clearTimeout(autosaveTimer);
    autosaveTimer = null;
  }
}

function hasUnsavedChanges() {
  if (!state.session) return false;
  const stored = getSession(state.session.session_id);
  if (!stored) return true;
  return JSON.stringify(stored.marks) !== JSON.stringify(state.marks);
}

function mergeMarks(savedMarks, students, criteria) {
  const merged = {};
  students.forEach(student => {
    merged[student.student_id] = {};
    criteria.forEach(criterion => {
      const saved = savedMarks?.[student.student_id]?.[criterion.criterion_id];
      merged[student.student_id][criterion.criterion_id] = saved !== undefined ? saved : null;
    });
  });
  return merged;
}

function getToday() {
  return new Date().toISOString().split('T')[0];
}

function formatTime(dateObj) {
  const d = new Date(dateObj);
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

function createStatus(text) {
  const p = document.createElement('p');
  p.className = 'empty-state';
  p.textContent = text;
  return p;
}

init();
