import { calculateSessionProgress } from '../services/totals-engine.js';

export function createSessionToolbar({
  session,
  marks,
  students,
  criteria,
  onSave = () => {},
  onClose = () => {},
  lastSaved = null
} = {}) {
  const toolbar = document.createElement('div');
  toolbar.className = 'session-toolbar';

  const infoBlock = document.createElement('div');
  infoBlock.className = 'toolbar-info';

  const sessionTitle = document.createElement('div');
  sessionTitle.className = 'session-title';
  sessionTitle.textContent = `${session.subject_name} — ${session.class}`;

  const sessionMeta = document.createElement('div');
  sessionMeta.className = 'session-meta';
  sessionMeta.textContent = `${session.teacher_name} • ${formatDate(session.date)}`;

  infoBlock.append(sessionTitle, sessionMeta);
  toolbar.append(infoBlock);

  const progressBlock = document.createElement('div');
  progressBlock.className = 'toolbar-progress';

  const progress = calculateSessionProgress(marks, students, criteria);
  const progressText = document.createElement('div');
  progressText.className = 'progress-text';
  progressText.textContent = `${progress.completedStudents}/${progress.totalStudents} completed`;

  const progressBar = document.createElement('div');
  progressBar.className = 'progress-bar';
  const progressFill = document.createElement('div');
  progressFill.className = 'progress-fill';
  progressFill.style.width = `${progress.overallPercentage}%`;
  progressBar.append(progressFill);

  progressBlock.append(progressText, progressBar);
  toolbar.append(progressBlock);

  const actionBlock = document.createElement('div');
  actionBlock.className = 'toolbar-actions';

  const saveBtn = document.createElement('button');
  saveBtn.type = 'button';
  saveBtn.className = 'btn btn-primary';
  saveBtn.textContent = 'Save';
  saveBtn.addEventListener('click', onSave);

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'btn btn-secondary';
  closeBtn.textContent = 'Close';
  closeBtn.addEventListener('click', onClose);

  actionBlock.append(saveBtn, closeBtn);
  toolbar.append(actionBlock);

  if (lastSaved) {
    const savedNote = document.createElement('div');
    savedNote.className = 'saved-note';
    savedNote.textContent = `Last saved: ${formatTime(lastSaved)}`;
    toolbar.append(savedNote);
  }

  return toolbar;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function formatTime(dateObj) {
  if (!dateObj) return '';
  const d = new Date(dateObj);
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}
