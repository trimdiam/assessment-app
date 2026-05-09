import { calculateStudentTotal } from '../services/totals-engine.js';

export function createAssessmentCard({
  student,
  criteria,
  marks,
  onMarkChange = () => {}
} = {}) {
  const card = document.createElement('article');
  card.className = 'assessment-card';
  card.dataset.studentId = student.student_id;

  const header = document.createElement('div');
  header.className = 'card-header';

  const nameBlock = document.createElement('div');
  const nameEl = document.createElement('div');
  nameEl.className = 'student-name';
  nameEl.textContent = student.full_name;

  const metaEl = document.createElement('div');
  metaEl.className = 'student-meta';
  metaEl.textContent = `Roll No: ${student.roll_no || '—'}`;

  nameBlock.append(nameEl, metaEl);

  const totalBlock = document.createElement('div');
  totalBlock.className = 'total-block';
  const totalEl = document.createElement('div');
  totalEl.className = 'total-score';
  totalEl.id = `total-${student.student_id}`;
  totalEl.textContent = '— / —';
  totalBlock.append(totalEl);

  header.append(nameBlock, totalBlock);
  card.append(header);

  const criteriaList = document.createElement('div');
  criteriaList.className = 'card-criteria';

  criteria.forEach(criterion => {
    const row = document.createElement('div');
    row.className = 'criterion-row';

    const title = document.createElement('div');
    title.className = 'criterion-title';
    title.textContent = criterion.criterion_name;
    row.append(title);

    const scale = document.createElement('div');
    scale.className = 'mark-scale';

    const currentMark = marks && marks[criterion.criterion_id] !== undefined ? marks[criterion.criterion_id] : null;

    [0, 1, 2, 3, 4, 5].forEach(mark => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'mark-button';
      button.textContent = String(mark);
      button.dataset.mark = String(mark);
      button.dataset.criterionId = criterion.criterion_id;

      if (currentMark !== null && currentMark === mark) {
        button.classList.add('selected');
      }

      button.addEventListener('click', () => {
        const isSame = button.classList.contains('selected');
        const newMark = isSame ? null : mark;

        scale.querySelectorAll('.mark-button').forEach(btn => btn.classList.remove('selected'));
        if (!isSame) {
          button.classList.add('selected');
        }

        onMarkChange(student.student_id, criterion.criterion_id, newMark);
      });

      scale.append(button);
    });

    row.append(scale);
    criteriaList.append(row);
  });

  card.append(criteriaList);

  updateTotal(card, marks, criteria);

  return card;
}

export function updateTotal(cardElement, marks, criteria) {
  const totalEl = cardElement.querySelector('.total-score');
  if (!totalEl) return;

  const { total, max, completed, totalCriteria } = calculateStudentTotal(marks, criteria);

  if (completed === 0) {
    totalEl.textContent = `— / ${max}`;
    totalEl.className = 'total-score';
  } else {
    totalEl.textContent = `${total} / ${max}`;
    totalEl.className = completed === totalCriteria ? 'total-score complete' : 'total-score partial';
  }
}
