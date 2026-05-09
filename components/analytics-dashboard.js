import { getSchoolOverview, getClassAnalytics, getStudentAnalytics, getSubjectAnalytics, getCompletionAnalytics } from '../services/analytics-engine.js';
import { toLineChartData, toBarChartData, toDoughnutData, toHorizontalBarData } from '../services/graph-data-engine.js';
import { detectWeakStudents } from '../services/weak-student-engine.js';
import { aggregateByMonth } from '../services/aggregation-engine.js';

export function createAnalyticsDashboard({
  classes = [],
  view = 'overview',
  selectedClass = '',
  selectedStudent = null,
  selectedMonth = '',
  onViewChange = () => {},
  onClassChange = () => {},
  onStudentChange = () => {},
  onMonthChange = () => {}
} = {}) {
  const section = document.createElement('section');
  section.className = 'panel analytics-panel';

  const tabs = document.createElement('div');
  tabs.className = 'analytics-tabs';
  const tabDefs = [
    { key: 'overview', label: 'Overview' },
    { key: 'student', label: 'Student' },
    { key: 'class', label: 'Class' },
    { key: 'subject', label: 'Subject' },
    { key: 'completion', label: 'Completion' }
  ];
  tabDefs.forEach(t => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `analytics-tab ${view === t.key ? 'active' : ''}`;
    btn.textContent = t.label;
    btn.addEventListener('click', () => onViewChange(t.key));
    tabs.append(btn);
  });
  section.append(tabs);

  const filterBar = document.createElement('div');
  filterBar.className = 'filter-bar';

  const classSelect = createSelect('All Classes');
  classSelect.append(createOption('', 'All Classes'));
  classes.forEach(c => classSelect.append(createOption(c, c, selectedClass === c)));
  classSelect.addEventListener('change', e => onClassChange(e.target.value));
  filterBar.append(classSelect);

  if (view === 'student') {
    const monthInput = document.createElement('input');
    monthInput.type = 'month';
    monthInput.value = selectedMonth;
    monthInput.className = 'text-input';
    monthInput.addEventListener('change', e => onMonthChange(e.target.value));
    filterBar.append(monthInput);
  }

  if (view === 'completion') {
    const monthInput = document.createElement('input');
    monthInput.type = 'month';
    monthInput.value = selectedMonth;
    monthInput.className = 'text-input';
    monthInput.addEventListener('change', e => onMonthChange(e.target.value));
    filterBar.append(monthInput);
  }

  section.append(filterBar);

  const content = document.createElement('div');
  content.className = 'analytics-content';
  section.append(content);

  loadView(content, view, selectedClass, selectedStudent, selectedMonth, classes, onStudentChange);

  return section;
}

async function loadView(container, view, className, studentId, month, classes, onStudentChange) {
  container.replaceChildren(createLoading());

  try {
    if (view === 'overview') {
      await renderOverview(container, className);
    } else if (view === 'student') {
      await renderStudent(container, className, studentId, classes, onStudentChange);
    } else if (view === 'class') {
      await renderClass(container, className);
    } else if (view === 'subject') {
      await renderSubject(container, className);
    } else if (view === 'completion') {
      await renderCompletion(container, className, month);
    }
  } catch (error) {
    console.error(error);
    container.replaceChildren(createMessage('Failed to load analytics.'));
  }
}

async function renderOverview(container, className) {
  const overview = await getSchoolOverview();

  const grid = document.createElement('div');
  grid.className = 'stats-grid';

  grid.append(createStatCard('Total Sessions', String(overview.totalSessions)));
  grid.append(createStatCard('Completed', String(overview.completedSessions)));
  grid.append(createStatCard('Classes', String(overview.totalClasses)));
  grid.append(createStatCard('Students Assessed', String(overview.totalStudents)));

  container.append(grid);

  if (overview.classData.length > 0) {
    const chartWrap = document.createElement('div');
    chartWrap.className = 'chart-wrap';
    const canvas = document.createElement('canvas');
    chartWrap.append(canvas);
    container.append(chartWrap);

    const labels = overview.classData.map(c => c.class);
    const data = overview.classData.map(c => c.averagePercentage);
    const chartConfig = toBarChartData(labels, [{ label: 'Class Average %', data, color: '#226b63' }]);
    new Chart(canvas, chartConfig);
  }

  const list = document.createElement('div');
  list.className = 'summary-list';
  overview.classData.forEach(c => {
    const item = document.createElement('div');
    item.className = 'summary-item';
    item.innerHTML = `<span>${c.class}</span><span>${c.averagePercentage}% avg • ${c.totalAssessments} assessments</span>`;
    list.append(item);
  });
  container.append(list);
}

async function renderStudent(container, className, studentId, classes, onStudentChange) {
  if (!className) {
    container.append(createMessage('Select a class to view student analytics.'));
    return;
  }

  const agg = await aggregateByMonth('', className);
  const students = agg.students;

  if (students.length === 0) {
    container.append(createMessage('No student data available.'));
    return;
  }

  const selector = document.createElement('select');
  selector.className = 'text-input';
  selector.append(createOption('', 'Select student'));
  students.forEach(s => selector.append(createOption(s.student_id, `${s.full_name} (Roll ${s.roll_no || '—'})`, s.student_id === studentId)));
  selector.addEventListener('change', e => onStudentChange(e.target.value));
  container.append(selector);

  if (!studentId) {
    return;
  }

  const analytics = await getStudentAnalytics(studentId, className);

  if (analytics.totalMonths === 0) {
    container.append(createMessage('No historical data for this student.'));
    return;
  }

  const info = document.createElement('div');
  info.className = 'student-analytics-info';
  info.innerHTML = `
    <div><strong>Average:</strong> ${analytics.averageOverall}%</div>
    <div><strong>Months tracked:</strong> ${analytics.totalMonths}</div>
    ${analytics.strongestSubject ? `<div><strong>Strongest:</strong> ${analytics.strongestSubject.subject_name} (${analytics.strongestSubject.averagePercentage}%)</div>` : ''}
    ${analytics.weakestSubject ? `<div><strong>Weakest:</strong> ${analytics.weakestSubject.subject_name} (${analytics.weakestSubject.averagePercentage}%)</div>` : ''}
  `;
  container.append(info);

  if (analytics.monthlyData.length > 1) {
    const chartWrap = document.createElement('div');
    chartWrap.className = 'chart-wrap';
    const canvas = document.createElement('canvas');
    chartWrap.append(canvas);
    container.append(chartWrap);

    const labels = analytics.monthlyData.map(m => m.month);
    const data = analytics.monthlyData.map(m => m.overallPercentage);
    const chartConfig = toLineChartData(labels, [{ label: 'Overall %', data, color: '#226b63', fill: true }]);
    new Chart(canvas, chartConfig);
  }

  if (analytics.subjectAverages.length > 0) {
    const chartWrap = document.createElement('div');
    chartWrap.className = 'chart-wrap';
    const canvas = document.createElement('canvas');
    chartWrap.append(canvas);
    container.append(chartWrap);

    const labels = analytics.subjectAverages.map(s => s.subject_name);
    const data = analytics.subjectAverages.map(s => s.averagePercentage);
    const chartConfig = toBarChartData(labels, [{ label: 'Subject Average %', data }]);
    new Chart(canvas, chartConfig);
  }
}

async function renderClass(container, className) {
  if (!className) {
    container.append(createMessage('Select a class to view analytics.'));
    return;
  }

  const analytics = await getClassAnalytics(className);

  if (analytics.totalMonths === 0) {
    container.append(createMessage('No data for this class.'));
    return;
  }

  const info = document.createElement('div');
  info.className = 'summary-info';
  info.innerHTML = `<div><strong>Months tracked:</strong> ${analytics.totalMonths}</div><div><strong>Students:</strong> ${analytics.students.length}</div>`;
  container.append(info);

  if (analytics.monthlyData.length > 1) {
    const chartWrap = document.createElement('div');
    chartWrap.className = 'chart-wrap';
    const canvas = document.createElement('canvas');
    chartWrap.append(canvas);
    container.append(chartWrap);

    const labels = analytics.monthlyData.map(m => m.month);
    const data = analytics.monthlyData.map(m => m.classAverage);
    const chartConfig = toLineChartData(labels, [{ label: 'Class Average %', data, color: '#226b63', fill: true }]);
    new Chart(canvas, chartConfig);
  }

  if (analytics.subjectTrends.length > 0) {
    const chartWrap = document.createElement('div');
    chartWrap.className = 'chart-wrap';
    const canvas = document.createElement('canvas');
    chartWrap.append(canvas);
    container.append(chartWrap);

    const labels = analytics.monthlyData.map(m => m.month);
    const datasets = analytics.subjectTrends.map((st, i) => ({
      label: st.subject_name,
      data: st.months.map(m => m.averagePercentage),
      color: getColor(i)
    }));
    const chartConfig = toLineChartData(labels, datasets);
    new Chart(canvas, chartConfig);
  }

  if (analytics.students.length > 0) {
    const chartWrap = document.createElement('div');
    chartWrap.className = 'chart-wrap';
    const canvas = document.createElement('canvas');
    chartWrap.append(canvas);
    container.append(chartWrap);

    const topStudents = analytics.students.slice(0, 10);
    const labels = topStudents.map(s => s.full_name);
    const data = topStudents.map(s => s.averagePercentage);
    const chartConfig = toHorizontalBarData(labels, [{ label: 'Average %', data }]);
    new Chart(canvas, chartConfig);
  }
}

async function renderSubject(container, className) {
  if (!className) {
    container.append(createMessage('Select a class to view subject analytics.'));
    return;
  }

  const subjects = await getSubjectAnalytics(className);

  if (subjects.length === 0) {
    container.append(createMessage('No subject data available.'));
    return;
  }

  const chartWrap = document.createElement('div');
  chartWrap.className = 'chart-wrap';
  const canvas = document.createElement('canvas');
  chartWrap.append(canvas);
  container.append(chartWrap);

  const labels = subjects.map(s => s.subject_name);
  const data = subjects.map(s => s.averagePercentage);
  const chartConfig = toBarChartData(labels, [{ label: 'Average %', data }]);
  new Chart(canvas, chartConfig);

  const list = document.createElement('div');
  list.className = 'summary-list';
  subjects.forEach(s => {
    const item = document.createElement('div');
    item.className = 'summary-item';
    item.innerHTML = `<span>${s.subject_name}</span><span>${s.averagePercentage}% • ${s.sessions} session(s)</span>`;
    list.append(item);
  });
  container.append(list);
}

async function renderCompletion(container, className, month) {
  const comp = getCompletionAnalytics(className || '', month || '');

  const grid = document.createElement('div');
  grid.className = 'stats-grid';
  grid.append(createStatCard('Total', String(comp.total)));
  grid.append(createStatCard('Completion Rate', `${comp.completionRate}%`));
  grid.append(createStatCard('Reviewed', String(comp.counts.reviewed)));
  grid.append(createStatCard('Locked', String(comp.counts.locked)));
  container.append(grid);

  const chartWrap = document.createElement('div');
  chartWrap.className = 'chart-wrap';
  const canvas = document.createElement('canvas');
  chartWrap.append(canvas);
  container.append(chartWrap);

  const labels = ['Draft', 'Submitted', 'Reviewed', 'Locked'];
  const values = [comp.counts.draft, comp.counts.submitted, comp.counts.reviewed, comp.counts.locked];
  const colors = ['#e8eef5', '#fff3cd', '#d1ecf1', '#d4edda'];
  const chartConfig = toDoughnutData(labels, values, colors);
  new Chart(canvas, chartConfig);

  if (comp.teachers.length > 0) {
    const heading = document.createElement('h3');
    heading.className = 'sub-heading';
    heading.textContent = 'Teacher Completion';
    container.append(heading);

    const list = document.createElement('div');
    list.className = 'summary-list';
    comp.teachers.forEach(t => {
      const pct = t.total > 0 ? Math.round((t.completed / t.total) * 100) : 0;
      const item = document.createElement('div');
      item.className = 'summary-item';
      item.innerHTML = `<span>${t.teacher}</span><span>${t.completed}/${t.total} (${pct}%)</span>`;
      list.append(item);
    });
    container.append(list);
  }

  if (comp.subjects.length > 0) {
    const heading = document.createElement('h3');
    heading.className = 'sub-heading';
    heading.textContent = 'Subject Completion';
    container.append(heading);

    const list = document.createElement('div');
    list.className = 'summary-list';
    comp.subjects.forEach(s => {
      const pct = s.total > 0 ? Math.round((s.completed / s.total) * 100) : 0;
      const item = document.createElement('div');
      item.className = 'summary-item';
      item.innerHTML = `<span>${s.subject_name}</span><span>${s.completed}/${s.total} (${pct}%)</span>`;
      list.append(item);
    });
    container.append(list);
  }
}

function createStatCard(label, value) {
  const card = document.createElement('div');
  card.className = 'stat-card';
  const val = document.createElement('div');
  val.className = 'stat-value';
  val.textContent = value;
  const lab = document.createElement('div');
  lab.className = 'stat-label';
  lab.textContent = label;
  card.append(val, lab);
  return card;
}

function createSelect(placeholder) {
  const select = document.createElement('select');
  select.className = 'text-input';
  return select;
}

function createOption(value, text, selected = false) {
  const option = document.createElement('option');
  option.value = value;
  option.textContent = text;
  option.selected = selected;
  return option;
}

function createLoading() {
  const p = document.createElement('p');
  p.className = 'empty-state';
  p.textContent = 'Loading...';
  return p;
}

function createMessage(text) {
  const p = document.createElement('p');
  p.className = 'empty-state';
  p.textContent = text;
  return p;
}

const COLORS = ['#226b63', '#be7c2f', '#1d7a3e', '#9f1d1d', '#5b4b8a', '#2e7d9e', '#d46a1f', '#6b8e23'];

function getColor(index) {
  return COLORS[index % COLORS.length];
}
