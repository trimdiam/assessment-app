import { findHighestPerformer, findLowestPerformer } from '../services/aggregation-engine.js';

export function createMonthlySummary({
  aggregatedData,
  onBack = () => {}
} = {}) {
  const section = document.createElement('section');
  section.className = 'panel';

  const header = document.createElement('div');
  header.className = 'review-header';

  const backBtn = document.createElement('button');
  backBtn.type = 'button';
  backBtn.className = 'btn btn-secondary';
  backBtn.textContent = '← Back';
  backBtn.addEventListener('click', onBack);

  const title = document.createElement('h2');
  title.className = 'section-heading';
  title.textContent = `Monthly Summary — ${aggregatedData.yearMonth}`;

  header.append(backBtn, title);
  section.append(header);

  const info = document.createElement('div');
  info.className = 'summary-info';
  info.innerHTML = `
    <div><strong>Class:</strong> ${aggregatedData.class || 'All'}</div>
    <div><strong>Assessments:</strong> ${aggregatedData.totalAssessments}</div>
    <div><strong>Class Average:</strong> ${aggregatedData.classAverage}%</div>
  `;
  section.append(info);

  if (aggregatedData.subjects && aggregatedData.subjects.length > 0) {
    const subHeading = document.createElement('h3');
    subHeading.className = 'sub-heading';
    subHeading.textContent = 'Subject Averages';
    section.append(subHeading);

    const subList = document.createElement('div');
    subList.className = 'subject-summary-list';

    aggregatedData.subjects.forEach(sub => {
      const item = document.createElement('div');
      item.className = 'subject-summary-item';
      item.innerHTML = `
        <span class="subject-name">${sub.subject_name}</span>
        <span class="subject-avg">${sub.averagePercentage}%</span>
        <span class="subject-count">${sub.sessions} session(s)</span>
      `;
      subList.append(item);
    });

    section.append(subList);
  }

  const highest = findHighestPerformer(aggregatedData.students);
  const lowest = findLowestPerformer(aggregatedData.students);

  if (highest || lowest) {
    const perfHeading = document.createElement('h3');
    perfHeading.className = 'sub-heading';
    perfHeading.textContent = 'Performance Extremes';
    section.append(perfHeading);

    const perfList = document.createElement('div');
    perfList.className = 'performance-list';

    if (highest) {
      const item = document.createElement('div');
      item.className = 'performance-item high';
      item.innerHTML = `
        <span class="perf-label">Highest</span>
        <span class="perf-name">${highest.full_name}</span>
        <span class="perf-score">${highest.overallPercentage}%</span>
      `;
      perfList.append(item);
    }

    if (lowest) {
      const item = document.createElement('div');
      item.className = 'performance-item low';
      item.innerHTML = `
        <span class="perf-label">Lowest</span>
        <span class="perf-name">${lowest.full_name}</span>
        <span class="perf-score">${lowest.overallPercentage}%</span>
      `;
      perfList.append(item);
    }

    section.append(perfList);
  }

  if (aggregatedData.students && aggregatedData.students.length > 0) {
    const stuHeading = document.createElement('h3');
    stuHeading.className = 'sub-heading';
    stuHeading.textContent = 'Student Overview';
    section.append(stuHeading);

    const tableWrap = document.createElement('div');
    tableWrap.className = 'review-table-wrap';

    const table = document.createElement('table');
    table.className = 'review-table';

    const thead = document.createElement('thead');
    const hRow = document.createElement('tr');
    hRow.append(createTh('Student'));
    hRow.append(createTh('Roll'));
    hRow.append(createTh('Overall %'));
    hRow.append(createTh('Sessions'));
    thead.append(hRow);
    table.append(thead);

    const tbody = document.createElement('tbody');
    aggregatedData.students.forEach(s => {
      const tr = document.createElement('tr');
      tr.append(createTd(s.full_name, 'student-cell'));
      tr.append(createTd(s.roll_no || '—'));
      tr.append(createTd(`${s.overallPercentage}%`, 'mark-cell'));
      tr.append(createTd(String(s.totalSessions)));
      tbody.append(tr);
    });

    table.append(tbody);
    tableWrap.append(table);
    section.append(tableWrap);
  }

  return section;
}

function createTh(text) {
  const th = document.createElement('th');
  th.textContent = text;
  return th;
}

function createTd(text, className = '') {
  const td = document.createElement('td');
  td.textContent = text;
  if (className) td.className = className;
  return td;
}
