export function createSessionSetup({
  classes = [],
  subjects = [],
  selectedClass = '',
  selectedSubjectId = '',
  teacherName = '',
  date = getToday(),
  savedSessions = [],
  onClassChange = () => {},
  onSubjectChange = () => {},
  onTeacherNameChange = () => {},
  onDateChange = () => {},
  onStartSession = () => {},
  onResumeSession = () => {}
} = {}) {
  const section = document.createElement('section');
  section.className = 'panel selector-panel';

  const teacherField = createField('Teacher Name');
  const teacherInput = document.createElement('input');
  teacherInput.type = 'text';
  teacherInput.placeholder = 'e.g. Mr. John';
  teacherInput.value = teacherName;
  teacherInput.className = 'text-input';
  teacherInput.addEventListener('input', event => onTeacherNameChange(event.target.value));
  teacherField.append(teacherInput);
  section.append(teacherField);

  const dateField = createField('Date');
  const dateInput = document.createElement('input');
  dateInput.type = 'date';
  dateInput.value = date;
  dateInput.className = 'text-input';
  dateInput.addEventListener('change', event => onDateChange(event.target.value));
  dateField.append(dateInput);
  section.append(dateField);

  const classField = createField('Class');
  const classSelect = createSelect('Select class');
  classes.forEach(className => {
    classSelect.append(createOption(className, className, className === selectedClass));
  });
  classSelect.addEventListener('change', event => onClassChange(event.target.value));
  classField.append(classSelect);
  section.append(classField);

  const subjectField = createField('Subject');
  const subjectSelect = createSelect('Select subject');
  subjectSelect.disabled = subjects.length === 0;
  subjects.forEach(subject => {
    subjectSelect.append(createOption(subject.subject_id, subject.subject_name, subject.subject_id === selectedSubjectId));
  });
  subjectSelect.addEventListener('change', event => {
    onSubjectChange(subjects.find(s => s.subject_id === event.target.value) || null);
  });
  subjectField.append(subjectSelect);
  section.append(subjectField);

  if (selectedClass && subjects.length === 0) {
    section.append(createMessage('No subjects found for this class'));
  }

  const actionArea = document.createElement('div');
  actionArea.className = 'action-area';

  const startBtn = document.createElement('button');
  startBtn.type = 'button';
  startBtn.className = 'btn btn-primary';
  startBtn.textContent = 'Start New Assessment';
  startBtn.addEventListener('click', () => onStartSession());
  actionArea.append(startBtn);
  section.append(actionArea);

  const draftSection = createDraftSessions(savedSessions, onResumeSession);
  if (draftSection) {
    section.append(draftSection);
  }

  return section;
}

function createDraftSessions(savedSessions, onResumeSession) {
  const drafts = savedSessions.filter(entry => entry.session.status === 'draft');
  if (drafts.length === 0) return null;

  const container = document.createElement('div');
  container.className = 'draft-section';

  const heading = document.createElement('h3');
  heading.className = 'draft-heading';
  heading.textContent = 'Unfinished Sessions';
  container.append(heading);

  const list = document.createElement('div');
  list.className = 'draft-list';

  drafts.forEach(entry => {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'draft-item';
    const sess = entry.session;
    item.innerHTML = `
      <span class="draft-info">${sess.subject_name} — ${sess.class} — ${formatDate(sess.date)}</span>
      <span class="draft-teacher">${sess.teacher_name}</span>
    `;
    item.addEventListener('click', () => onResumeSession(sess.session_id));
    list.append(item);
  });

  container.append(list);
  return container;
}

function createField(labelText) {
  const label = document.createElement('label');
  label.className = 'field';
  label.textContent = labelText;
  return label;
}

function createSelect(placeholder) {
  const select = document.createElement('select');
  select.append(createOption('', placeholder));
  return select;
}

function createOption(value, text, selected = false) {
  const option = document.createElement('option');
  option.value = value;
  option.textContent = text;
  option.selected = selected;
  return option;
}

function createMessage(text) {
  const message = document.createElement('p');
  message.className = 'empty-state';
  message.textContent = text;
  return message;
}

function getToday() {
  const now = new Date();
  return now.toISOString().split('T')[0];
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}
