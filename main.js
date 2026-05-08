import { createCriteriaList } from './components/criteria-list.js';
import { createSubjectSelector } from './components/subject-selector.js';
import { loadCriteriaForSubject } from './services/criteria-loader.js';
import { getSubjectsForClass, loadSubjects } from './services/subject-loader.js';
import { loadStudentsForClass } from './services/student-loader.js';

const classes = ['LKG', 'SKG', 'Class I', 'Class II'];
const state = {
  allSubjects: [],
  subjects: [],
  selectedClass: '',
  selectedSubject: null,
  criteria: [],
  students: [],
  isLoadingCriteria: false,
  errorMessage: ''
};

const subjectRoot = document.querySelector('#subject-selector-root');
const criteriaRoot = document.querySelector('#criteria-list-root');

async function init() {
  try {
    state.allSubjects = await loadSubjects();
  } catch (error) {
    state.errorMessage = 'Failed to load subjects';
    console.error(error);
  }
  render();
}

function render() {
  subjectRoot.replaceChildren(createSubjectSelector({
    classes,
    subjects: state.subjects,
    selectedClass: state.selectedClass,
    selectedSubjectId: state.selectedSubject?.subject_id || '',
    onClassChange: handleClassChange,
    onSubjectChange: handleSubjectChange
  }));

  criteriaRoot.replaceChildren(createCriteriaList({
    criteria: state.criteria,
    errorMessage: state.errorMessage,
    isLoading: state.isLoadingCriteria
  }));

  setText('student-count', state.students.length);
  setText('subject-count', state.subjects.length);
  setText('criteria-count', state.criteria.length);
}

async function handleClassChange(className) {
  state.selectedClass = className;
  state.selectedSubject = null;
  state.criteria = [];
  state.errorMessage = '';
  state.subjects = getSubjectsForClass(state.allSubjects, className);
  state.students = className ? await loadStudentsForClass(className).catch(() => []) : [];
  render();
}

async function handleSubjectChange(subject) {
  state.selectedSubject = subject;
  state.criteria = [];
  state.errorMessage = '';

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

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

init();
