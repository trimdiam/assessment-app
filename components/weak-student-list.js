import { detectWeakStudents, getWeakStudentRules, saveWeakStudentRules, resetRulesToDefault } from '../services/weak-student-engine.js';
import { aggregateByMonth, extractYearMonth } from '../services/aggregation-engine.js';

export function createWeakStudentList({
  classes = [],
  yearMonth = extractYearMonth(new Date().toISOString()),
  selectedClass = '',
  onClassChange = () => {},
  onYearMonthChange = () => {}
} = {}) {
  const section = document.createElement('section');
  section.className = 'panel';

  const heading = document.createElement('h2');
  heading.className = 'section-heading';
  heading.textContent = 'Weak Student Detection';
  section.append(heading);

  const controls = document.createElement('div');
  controls.className = 'filter-bar';

  const classSelect = createSelect('All Classes');
  classSelect.append(createOption('', 'All Classes'));
  classes.forEach(c => classSelect.append(createOption(c, c, selectedClass === c)));
  classSelect.addEventListener('change', e => onClassChange(e.target.value));

  const monthInput = document.createElement('input');
  monthInput.type = 'month';
  monthInput.value = yearMonth;
  monthInput.className = 'text-input';
  monthInput.addEventListener('change', e => onYearMonthChange(e.target.value));

  controls.append(classSelect, monthInput);
  section.append(controls);

  const rules = getWeakStudentRules();
  const rulesPanel = createRulesPanel(rules);
  section.append(rulesPanel);

  const resultsArea = document.createElement('div');
  resultsArea.className = 'weak-results';

  aggregateByMonth(yearMonth, selectedClass)
    .then(data => {
      const flagged = detectWeakStudents(data);
      renderResults(resultsArea, flagged);
    })
    .catch(error => {
      console.error(error);
      resultsArea.replaceChildren(createMessage('Failed to load data.'));
    });

  section.append(resultsArea);
  return section;
}

function createRulesPanel(rules) {
  const panel = document.createElement('details');
  panel.className = 'rules-panel';

  const summary = document.createElement('summary');
  summary.textContent = 'Detection Rules';
  panel.append(summary);

  const grid = document.createElement('div');
  grid.className = 'rules-grid';

  Object.entries(rules).forEach(([key, rule]) => {
    const item = document.createElement('label');
    item.className = 'rule-item';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = rule.enabled;
    checkbox.addEventListener('change', e => {
      const updated = getWeakStudentRules();
      updated[key].enabled = e.target.checked;
      saveWeakStudentRules(updated);
    });

    const text = document.createElement('span');
    text.textContent = `${rule.description} (threshold: ${rule.threshold})`;

    item.append(checkbox, text);
    grid.append(item);
  });

  const resetBtn = document.createElement('button');
  resetBtn.type = 'button';
  resetBtn.className = 'btn btn-sm btn-secondary';
  resetBtn.textContent = 'Reset to Default';
  resetBtn.addEventListener('click', () => {
    resetRulesToDefault();
    location.reload();
  });

  panel.append(grid, resetBtn);
  return panel;
}

function renderResults(container, flagged) {
  container.replaceChildren();

  if (flagged.length === 0) {
    container.append(createMessage('No weak students detected for this period.'));
    return;
  }

  const count = document.createElement('div');
  count.className = 'session-count';
  count.textContent = `${flagged.length} student(s) flagged`;
  container.append(count);

  const list = document.createElement('div');
  list.className = 'weak-student-list';

  flagged.forEach(student => {
    const card = document.createElement('div');
    card.className = 'weak-student-card';

    const header = document.createElement('div');
    header.className = 'weak-student-header';
    header.innerHTML = `
      <span class="weak-name">${student.full_name}</span>
      <span class="weak-roll">Roll ${student.roll_no || '—'}</span>
      <span class="weak-pct">${student.overallPercentage}%</span>
    `;

    const flags = document.createElement('div');
    flags.className = 'weak-student-flags';
    student.flags.forEach(f => {
      const badge = document.createElement('span');
      badge.className = `flag-badge flag-${f}`;
      badge.textContent = f.replace('_', ' ');
      flags.append(badge);
    });

    const reasons = document.createElement('ul');
    reasons.className = 'weak-student-reasons';
    student.reasons.forEach(r => {
      const li = document.createElement('li');
      li.textContent = r;
      reasons.append(li);
    });

    card.append(header, flags, reasons);
    list.append(card);
  });

  container.append(list);
}

function createSelect(placeholder) {
  const select = document.createElement('select');
  select.className = 'text-input';
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
  const p = document.createElement('p');
  p.className = 'empty-state';
  p.textContent = text;
  return p;
}
