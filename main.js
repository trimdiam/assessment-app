import { createSessionSetup } from './components/session-setup.js';
import { createAssessmentCard, updateTotal } from './components/assessment-card.js';
import { createSessionToolbar } from './components/session-toolbar.js';
import { createSessionList } from './components/session-list.js';
import { createSessionReview } from './components/session-review.js';
import { createMonthlySummary } from './components/monthly-summary.js';
import { createWeakStudentList } from './components/weak-student-list.js';
import { createAnalyticsDashboard } from './components/analytics-dashboard.js';
import { createLoginForm } from './components/login-form.js';
import { createStudentProfile } from './components/student-profile.js';
import { createQuickEntryGrid } from './components/quick-entry-grid.js';
import { loadCriteriaForSubject } from './services/criteria-loader.js';
import { getSubjectsForClass, loadSubjects } from './services/subject-loader.js';
import { loadStudentsForClass } from './services/student-loader.js';
import { createSession, validateMark } from './services/assessment-engine.js';
import { initializeMarksWithDefault } from './services/fast-entry-engine.js';
import { saveSession, getSession, getAllSessions } from './services/session-storage.js';
import {
  updateSessionStatus,
  loadFullSessionData,
  SESSION_STATUS
} from './services/session-review-engine.js';
import { aggregateByMonth, extractYearMonth, clearAggregationCache } from './services/aggregation-engine.js';
import { getCurrentUser, isTeacher, isAdmin, isLoggedIn } from './services/auth-service.js';
import { generateDemoData, clearDemoData } from './services/demo-data-generator.js';

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
  adminView: 'sessions',
  session: null,
  marks: {},

  lastSaved: null,
  errorMessage: '',
  infoMessage: '',
  isLoadingCriteria: false,

  adminFilters: {},
  reviewSessionId: null,
  summaryYearMonth: extractYearMonth(getToday()),
  summaryClass: '',
  weakYearMonth: extractYearMonth(getToday()),
  weakClass: '',

  analyticsView: 'overview',
  analyticsClass: '',
  analyticsStudent: '',
  analyticsMonth: extractYearMonth(getToday()),

  useDefaultScore: false,
  quickEntryMode: false,
  viewingStudentProfile: null
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
  if (!isLoggedIn()) {
    renderLogin();
    return;
  }

  renderNav();

  if (state.mode === 'setup') {
    renderSetup();
    assessmentRoot.replaceChildren();
  } else if (state.mode === 'assessment') {
    setupRoot.replaceChildren();
    renderAssessment();
  } else if (state.mode === 'admin') {
    setupRoot.replaceChildren();
    renderAdmin();
  }
}

function renderLogin() {
  setupRoot.replaceChildren();
  assessmentRoot.replaceChildren();
  assessmentRoot.append(createLoginForm({
    onLogin: () => render(),
    onLogout: () => render(),
    onGenerateDemo: generateDemoData,
    onClearDemo: clearDemoData
  }));
}

function renderNav() {
  let nav = document.querySelector('.app-nav');
  if (!nav) {
    nav = document.createElement('nav');
    nav.className = 'app-nav';
    document.querySelector('.app-shell').insertBefore(nav, document.querySelector('.app-header').nextSibling);
  }

  nav.replaceChildren();

  const user = getCurrentUser();

  if (isTeacher()) {
    const setupBtn = document.createElement('button');
    setupBtn.type = 'button';
    setupBtn.className = `nav-btn ${state.mode === 'setup' ? 'active' : ''}`;
    setupBtn.textContent = 'New Assessment';
    setupBtn.addEventListener('click', () => switchMode('setup'));
    nav.append(setupBtn);
  }

  if (isAdmin()) {
    const adminBtn = document.createElement('button');
    adminBtn.type = 'button';
    adminBtn.className = `nav-btn ${state.mode === 'admin' ? 'active' : ''}`;
    adminBtn.textContent = 'Admin';
    adminBtn.addEventListener('click', () => switchMode('admin'));
    nav.append(adminBtn);
  }

  if (user) {
    const logoutBtn = document.createElement('button');
    logoutBtn.type = 'button';
    logoutBtn.className = 'nav-btn btn-secondary';
    logoutBtn.textContent = 'Logout';
    logoutBtn.addEventListener('click', () => {
      clearAutosave();
      state.mode = 'setup';
      state.session = null;
      state.marks = {};
      renderLogin();
    });
    nav.append(logoutBtn);
  }
}

function switchMode(mode) {
  if (state.mode === 'assessment' && state.session) {
    const unsaved = hasUnsavedChanges();
    if (unsaved) {
      const ok = confirm('You have unsaved changes. Save before leaving?');
      if (ok) handleSave();
    }
    clearAutosave();
    state.session = null;
    state.marks = {};
  }

  state.mode = mode;
  state.viewingStudentProfile = null;
  state.errorMessage = '';
  state.infoMessage = '';
  render();
}

function renderSetup() {
  if (!isTeacher()) {
    assessmentRoot.replaceChildren(createStatus('Access denied: teacher role required.'));
    return;
  }

  setupRoot.replaceChildren(createSessionSetup({
    classes,
    subjects: state.subjects,
    selectedClass: state.selectedClass,
    selectedSubjectId: state.selectedSubject?.subject_id || '',
    teacherName: state.teacherName,
    date: state.date,
    savedSessions: getAllSessions().filter(s => s.session.teacher_name === state.teacherName),
    onClassChange: handleClassChange,
    onSubjectChange: handleSubjectChange,
    onTeacherNameChange: handleTeacherNameChange,
    onDateChange: handleDateChange,
    onStartSession: handleStartSession,
    onResumeSession: handleResumeSession
  }));

  const optionsPanel = document.createElement('div');
  optionsPanel.className = 'panel options-panel';

  const defaultLabel = document.createElement('label');
  defaultLabel.className = 'field';
  defaultLabel.innerHTML = `<input type="checkbox" ${state.useDefaultScore ? 'checked' : ''}> Use default score (4)`;
  defaultLabel.querySelector('input').addEventListener('change', e => {
    state.useDefaultScore = e.target.checked;
    render();
  });

  const quickLabel = document.createElement('label');
  quickLabel.className = 'field';
  quickLabel.innerHTML = `<input type="checkbox" ${state.quickEntryMode ? 'checked' : ''}> Quick entry mode`;
  quickLabel.querySelector('input').addEventListener('change', e => {
    state.quickEntryMode = e.target.checked;
    render();
  });

  optionsPanel.append(defaultLabel, quickLabel);
  setupRoot.append(optionsPanel);

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

  if (state.session.status === 'locked') {
    assessmentRoot.replaceChildren(createStatus('This assessment session has been locked by admin.'));
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

  if (state.quickEntryMode) {
    assessmentRoot.append(createQuickEntryGrid({
      students: state.students,
      criteria: state.criteria,
      marks: state.marks,
      onMarkChange: handleMarkChange
    }));
  } else {
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
}

function renderAdmin() {
  if (!isAdmin()) {
    assessmentRoot.replaceChildren(createStatus('Access denied: admin role required.'));
    return;
  }

  if (state.viewingStudentProfile) {
    assessmentRoot.append(createStudentProfile({
      studentId: state.viewingStudentProfile,
      className: state.analyticsClass,
      onBack: () => {
        state.viewingStudentProfile = null;
        render();
      }
    }));
    return;
  }

  assessmentRoot.replaceChildren();

  const tabs = document.createElement('div');
  tabs.className = 'admin-tabs';

  const tabDefs = [
    { key: 'sessions', label: 'Sessions' },
    { key: 'summary', label: 'Monthly Summary' },
    { key: 'weak', label: 'Weak Students' },
    { key: 'analytics', label: 'Analytics' }
  ];

  tabDefs.forEach(t => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `admin-tab ${state.adminView === t.key ? 'active' : ''}`;
    btn.textContent = t.label;
    btn.addEventListener('click', () => {
      state.adminView = t.key;
      render();
    });
    tabs.append(btn);
  });

  assessmentRoot.append(tabs);

  if (state.adminView === 'sessions') {
    if (state.reviewSessionId) {
      renderAdminReview();
    } else {
      renderAdminSessions();
    }
  } else if (state.adminView === 'summary') {
    renderAdminSummary();
  } else if (state.adminView === 'weak') {
    renderAdminWeak();
  } else if (state.adminView === 'analytics') {
    renderAdminAnalytics();
  }
}

function renderAdminAnalytics() {
  assessmentRoot.append(createAnalyticsDashboard({
    classes,
    view: state.analyticsView,
    selectedClass: state.analyticsClass,
    selectedStudent: state.analyticsStudent,
    selectedMonth: state.analyticsMonth,
    onViewChange: view => {
      state.analyticsView = view;
      render();
    },
    onClassChange: className => {
      state.analyticsClass = className;
      render();
    },
    onStudentChange: studentId => {
      state.viewingStudentProfile = studentId;
      render();
    },
    onMonthChange: month => {
      state.analyticsMonth = month;
      render();
    }
  }));
}

function renderAdminSessions() {
  assessmentRoot.append(createSessionList({
    classes,
    subjects: state.allSubjects,
    filters: state.adminFilters,
    onFilterChange: filters => {
      state.adminFilters = filters;
      render();
    },
    onViewSession: sessionId => {
      state.reviewSessionId = sessionId;
      render();
    },
    onStatusChange: async (sessionId, newStatus) => {
      const result = updateSessionStatus(sessionId, newStatus);
      if (result.ok) {
        clearAggregationCache();
        render();
      } else {
        alert(result.error);
      }
    }
  }));
}

async function renderAdminReview() {
  const data = await loadFullSessionData(state.reviewSessionId);
  if (!data) {
    state.reviewSessionId = null;
    state.errorMessage = 'Session not found.';
    render();
    return;
  }

  assessmentRoot.append(createSessionReview({
    sessionData: data,
    onBack: () => {
      state.reviewSessionId = null;
      render();
    },
    onLock: () => {
      const result = updateSessionStatus(data.session.session_id, SESSION_STATUS.LOCKED);
      if (result.ok) {
        clearAggregationCache();
        data.session.status = SESSION_STATUS.LOCKED;
        render();
      } else {
        alert(result.error);
      }
    },
    onReopen: () => {
      const result = updateSessionStatus(data.session.session_id, SESSION_STATUS.DRAFT);
      if (result.ok) {
        clearAggregationCache();
        data.session.status = SESSION_STATUS.DRAFT;
        render();
      } else {
        alert(result.error);
      }
    }
  }));
}

async function renderAdminSummary() {
  try {
    const data = await aggregateByMonth(state.summaryYearMonth, state.summaryClass);
    assessmentRoot.append(createMonthlySummary({
      aggregatedData: data,
      onBack: () => {
        state.adminView = 'sessions';
        render();
      }
    }));
  } catch (error) {
    console.error(error);
    assessmentRoot.append(createStatus('Failed to generate summary.'));
  }
}

function renderAdminWeak() {
  assessmentRoot.append(createWeakStudentList({
    classes,
    yearMonth: state.weakYearMonth,
    selectedClass: state.weakClass,
    onClassChange: className => {
      state.weakClass = className;
      render();
    },
    onYearMonthChange: ym => {
      state.weakYearMonth = ym;
      render();
    }
  }));
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

  if (state.useDefaultScore) {
    state.marks = initializeMarksWithDefault(state.students, state.criteria);
  } else {
    state.marks = {};
    state.students.forEach(student => {
      state.marks[student.student_id] = {};
      state.criteria.forEach(criterion => {
        state.marks[student.student_id][criterion.criterion_id] = null;
      });
    });
  }

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

  if (!state.quickEntryMode) {
    const card = document.querySelector(`.assessment-card[data-student-id="${studentId}"]`);
    if (card) {
      updateTotal(card, state.marks[studentId], state.criteria);
    }
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
