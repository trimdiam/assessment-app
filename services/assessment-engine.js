import { findDuplicateSession } from './session-storage.js';

export function createSession({ teacher_name, class: className, subject, date, force = false }) {
  const errors = validateSessionFields({ teacher_name, class: className, subject, date });
  if (errors.length > 0) {
    return { ok: false, errors };
  }

  const duplicate = findDuplicateSession({
    teacher_name: teacher_name.trim(),
    class: className,
    subject_id: subject.subject_id,
    date
  });

  if (duplicate && !force) {
    return {
      ok: false,
      duplicate: duplicate.session,
      errors: ['A session already exists for this teacher, class, subject, and date.']
    };
  }

  const session_id = duplicate && force ? duplicate.session.session_id : generateSessionId();

  const session = {
    session_id,
    teacher_name: teacher_name.trim(),
    class: className,
    subject_id: subject.subject_id,
    subject_name: subject.subject_name,
    date,
    status: 'draft',
    created_at: duplicate && force ? duplicate.session.created_at : new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  return { ok: true, session };
}

export function generateSessionId() {
  return 'sess_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6);
}

export function initializeMarksState(students, criteria) {
  const marks = {};
  students.forEach(student => {
    marks[student.student_id] = {};
    criteria.forEach(criterion => {
      marks[student.student_id][criterion.criterion_id] = null;
    });
  });
  return marks;
}

export function validateMark(mark) {
  if (mark === null) return true;
  if (mark && typeof mark === 'object' && mark.attendance === 'absent') return true;
  return Number.isInteger(mark) && mark >= 0 && mark <= 5;
}

function validateSessionFields({ teacher_name, class: className, subject, date }) {
  const errors = [];
  if (!teacher_name || !teacher_name.trim()) errors.push('Teacher name is required');
  if (!className) errors.push('Class is required');
  if (!subject || typeof subject !== 'object') errors.push('Subject is required');
  if (!date) errors.push('Date is required');
  return errors;
}
