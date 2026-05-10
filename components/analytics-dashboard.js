import { getSchoolOverview, getClassAnalytics, getStudentAnalytics, getSubjectAnalytics, getCompletionAnalytics } from '../services/analytics-engine.js';
import { aggregateByMonth, extractYearMonth } from '../services/aggregation-engine.js';
import { detectWeakStudents } from '../services/weak-student-engine.js';
import { toLineChartData, toBarChartData, toDoughnutData, toHorizontalBarData } from '../services/graph-data-engine.js';
import { getMonthTrend, classifyPerformance, getClassComparison, getSubjectComparison, getCompletionTrend } from '../services/comparison-engine.js';
import { getTopConcerns } from '../services/concern-engine.js';
import { getSchoolHealthScore } from '../services/school-health-engine.js';
import { getClassAttendanceOverview, getAttendanceRiskLevel } from '../services/attendance-engine.js';

export function createAnalyticsDashboard({
  classes = [],
  view = 'overview',
  selectedClass = '',
  selectedStudent = null,
  selectedMonth = '',
  onViewChange = () => {},
  onClassChange = () => {},
  onStudentChange = () => {},
  onMonthChange = () => {},
  onViewWeakStudents = () => {},
  onViewSummary = () => {},
  onViewSessions = () => {},
  onViewStudentProfile = () => {}
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

  if (view === 'student' || view === 'completion') {
    const monthInput = document.createElement('input');
    monthInput.type = 'month';
    monthInput.value = selectedMonth;
    monthInput.className = 'text-input';
    monthInput.addEventListener('change', e => onMonthChange(e.target.value));
    filterBar.append(monthInput);
  }

  section.append(filterBar);

  const contextBar = document.createElement('div');
  contextBar.className = 'analytics-context';
  contextBar.textContent = getContextText(view, selectedClass, selectedMonth);
  section.append(contextBar);

  const content = document.createElement('div');
  content.className = 'analytics-content';
  section.append(content);

  loadView(content, view, selectedClass, selectedStudent, selectedMonth, classes, onStudentChange, onViewWeakStudents, onViewSummary, onViewSessions, onViewStudentProfile);

  return section;
}

function getContextText(view, className, month) {
  const period = month ? formatMonth(month) : 'All Time';
  const scope = className || 'All Classes';
  return `${scope} • ${period}`;
}

function formatMonth(yearMonth) {
  if (!yearMonth) return 'All Time';
  const [y, m] = yearMonth.split('-');
  const date = new Date(Number(y), Number(m) - 1);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

async function loadView(container, view, className, studentId, month, classes, onStudentChange, onViewWeakStudents, onViewSummary, onViewSessions, onViewStudentProfile) {
  container.replaceChildren(createSkeleton());

  try {
    if (view === 'overview') {
      await renderOverview(container, className, month, onViewWeakStudents, onViewSummary, onViewSessions);
    } else if (view === 'student') {
      await renderStudent(container, className, studentId, classes, onStudentChange, onViewStudentProfile);
    } else if (view === 'class') {
      await renderClass(container, className, month);
    } else if (view === 'subject') {
      await renderSubject(container, className, month);
    } else if (view === 'completion') {
      await renderCompletion(container, className, month, onViewSessions);
    }
  } catch (error) {
    console.error(error);
    container.replaceChildren(createMessage('Failed to load analytics.'));
  }
}

async function renderOverview(container, className, month, onViewWeakStudents, onViewSummary, onViewSessions) {
  const ym = month || extractYearMonth(new Date().toISOString());

  const [overview, health, concerns] = await Promise.all([
    getSchoolOverview(),
    getSchoolHealthScore(ym, className),
    getTopConcerns(className, ym)
  ]);

  container.replaceChildren();

  container.append(createHealthScoreCard(health));

  const quickActions = document.createElement('div');
  quickActions.className = 'quick-actions';
  const actions = [
    { label: 'View Weak Students', onClick: onViewWeakStudents },
    { label: 'Monthly Summary', onClick: onViewSummary },
    { label: 'Review Sessions', onClick: onViewSessions }
  ];
  actions.forEach(a => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-secondary btn-sm';
    btn.textContent = a.label;
    btn.addEventListener('click', a.onClick);
    quickActions.append(btn);
  });
  container.append(quickActions);

  const grid = document.createElement('div');
  grid.className = 'stats-grid';

  const completionTrend = await getCompletionTrend(className, ym);
  const completion = getCompletionAnalytics(className || '', ym);

  grid.append(createEnhancedStatCard('Total Sessions', String(overview.totalSessions), null, `${overview.completedSessions} completed`));
  grid.append(createEnhancedStatCard('Completion Rate', `${completion.completionRate}%`, completionTrend, `${completion.counts.reviewed} reviewed • ${completion.counts.locked} locked`));
  grid.append(createEnhancedStatCard('Classes', String(overview.totalClasses), null, `${overview.classData.length} with data`));
  grid.append(createEnhancedStatCard('Students Assessed', String(overview.totalStudents), null, `${health.metrics.weakStudents} flagged`));

  container.append(grid);

  if (concerns.length > 0) {
    const concernPanel = document.createElement('div');
    concernPanel.className = 'concern-panel';
    const concernHeading = document.createElement('h3');
    concernHeading.className = 'sub-heading';
    concernHeading.textContent = 'Top Concerns';
    concernPanel.append(concernHeading);

    concerns.forEach(c => {
      const item = document.createElement('div');
      item.className = `concern-item concern-${c.level}`;
      item.textContent = c.message;
      concernPanel.append(item);
    });
    container.append(concernPanel);
  }

  if (overview.classData.length > 0) {
    const chartWrap = document.createElement('div');
    chartWrap.className = 'chart-wrap';
    const canvas = document.createElement('canvas');
    chartWrap.append(canvas);
    container.append(chartWrap);

    const labels = overview.classData.map(c => c.class);
    const data = overview.classData.map(c => c.averagePercentage);
    const avg = data.length > 0 ? Math.round(data.reduce((a, b) => a + b, 0) / data.length) : 0;
    const chartConfig = toBarChartData(labels, [{ label: 'Class Average %', data, color: '#226b63' }]);
    new Chart(canvas, chartConfig);
  }

  const list = document.createElement('div');
  list.className = 'summary-list';
  overview.classData.forEach(c => {
    const perf = classifyPerformance(c.averagePercentage);
    const item = document.createElement('div');
    item.className = 'summary-item';
    item.innerHTML = `
      <span>${c.class}</span>
      <span>
        <span class="perf-label" style="color:${perf.color}">${perf.label}</span>
        ${c.averagePercentage}% avg • ${c.totalAssessments} assessments
      </span>
    `;
    list.append(item);
  });
  container.append(list);
}

async function renderStudent(container, className, studentId, classes, onStudentChange, onViewStudentProfile) {
  if (!className) {
    container.replaceChildren(createMessage('Select a class to view student analytics.'));
    return;
  }

  const agg = await aggregateByMonth('', className);
  const students = agg.students;

  if (students.length === 0) {
    container.replaceChildren(createMessage('No student data available.'));
    return;
  }

  const selector = document.createElement('select');
  selector.className = 'text-input';
  selector.append(createOption('', 'Select student'));
  students.forEach(s => selector.append(createOption(s.student_id, `${s.full_name} (Roll ${s.roll_no || '—'})`, s.student_id === studentId)));
  selector.addEventListener('change', e => onStudentChange(e.target.value));
  container.append(selector);

  if (!studentId) return;

  const analytics = await getStudentAnalytics(studentId, className);

  if (analytics.totalMonths === 0) {
    container.append(createMessage('No historical data for this student.'));
    return;
  }

  const perf = classifyPerformance(analytics.averageOverall);

  const info = document.createElement('div');
  info.className = 'student-analytics-info';
  info.innerHTML = `
    <div class="student-header-row">
      <strong>${analytics.full_name || studentId}</strong>
      <span class="perf-label ${perf.className}">${perf.label}</span>
    </div>
    <div>Average: ${analytics.averageOverall}% • Months tracked: ${analytics.totalMonths}</div>
    ${analytics.strongestSubject ? `<div><strong>Strongest:</strong> ${analytics.strongestSubject.subject_name} (${analytics.strongestSubject.averagePercentage}%)</div>` : ''}
    ${analytics.weakestSubject ? `<div><strong>Weakest:</strong> ${analytics.weakestSubject.subject_name} (${analytics.weakestSubject.averagePercentage}%)</div>` : ''}
  `;
  container.append(info);

  const viewBtn = document.createElement('button');
  viewBtn.type = 'button';
  viewBtn.className = 'btn btn-primary btn-sm';
  viewBtn.textContent = 'View Full Profile';
  viewBtn.addEventListener('click', () => onViewStudentProfile(studentId));
  container.append(viewBtn);

  if (analytics.monthlyData.length > 1) {
    const chartWrap = document.createElement('div');
    chartWrap.className = 'chart-wrap';
    const canvas = document.createElement('canvas');
    chartWrap.append(canvas);
    container.append(chartWrap);

    const labels = analytics.monthlyData.map(m => m.month);
    const data = analytics.monthlyData.map(m => m.overallPercentage);
    const avg = data.length > 0 ? Math.round(data.reduce((a, b) => a + b, 0) / data.length) : 0;

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

    const subjList = document.createElement('div');
    subjList.className = 'summary-list';
    analytics.subjectAverages.forEach(s => {
      const perf = classifyPerformance(s.averagePercentage);
      const item = document.createElement('div');
      item.className = 'summary-item';
      item.innerHTML = `<span>${s.subject_name}</span><span><span class="perf-label" style="color:${perf.color}">${perf.label}</span> ${s.averagePercentage}%</span>`;
      subjList.append(item);
    });
    container.append(subjList);
  }
}

async function renderClass(container, className, month) {
  if (!className) {
    container.replaceChildren(createMessage('Select a class to view analytics.'));
    return;
  }

  const ym = month || extractYearMonth(new Date().toISOString());

  const [analytics, trend, comparison] = await Promise.all([
    getClassAnalytics(className),
    getMonthTrend(className, ym),
    getClassComparison(['LKG', 'SKG', 'Class I', 'Class II'], ym)
  ]);

  if (analytics.totalMonths === 0) {
    container.replaceChildren(createMessage('No data for this class.'));
    return;
  }

  const perf = classifyPerformance(analytics.monthlyData[analytics.monthlyData.length - 1]?.classAverage || 0);

  const info = document.createElement('div');
  info.className = 'summary-info';
  info.innerHTML = `
    <div class="student-header-row"><strong>${className}</strong><span class="perf-label ${perf.className}">${perf.label}</span></div>
    <div>Months tracked: ${analytics.totalMonths} • Students: ${analytics.students.length}</div>
    ${trend.label !== 'Stable' ? `<div class="trend-line">${trend.label}</div>` : ''}
  `;
  container.append(info);

  if (comparison.comparisons.length > 0 && comparison.best?.class === className) {
    const compInfo = document.createElement('div');
    compInfo.className = 'comparison-insight';
    compInfo.textContent = `${className} is the top performing class this month`;
    container.append(compInfo);
  }

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

  // Attendance panel
  const attendance = getClassAttendanceOverview(className, ym);
  if (attendance.totalStudents > 0) {
    const attHeading = document.createElement('h3');
    attHeading.className = 'sub-heading';
    attHeading.textContent = `Attendance Overview (${attendance.classAbsenceRate}% absent)`;
    container.append(attHeading);

    const attGrid = document.createElement('div');
    attGrid.className = 'stats-grid';
    attGrid.append(createEnhancedStatCard('Students', String(attendance.totalStudents), null, 'Tracked'));
    attGrid.append(createEnhancedStatCard('Chronic', String(attendance.chronicAbsentees.length), null, '≥25% absent'));
    attGrid.append(createEnhancedStatCard('High Risk', String(attendance.highRisk.length), null, '15–24% absent'));
    attGrid.append(createEnhancedStatCard('Absences', String(attendance.classTotalAbsences), null, 'Total criteria'));
    container.append(attGrid);

    if (attendance.chronicAbsentees.length > 0 || attendance.highRisk.length > 0) {
      const riskList = document.createElement('div');
      riskList.className = 'summary-list';
      const atRisk = [...attendance.chronicAbsentees, ...attendance.highRisk].slice(0, 10);
      atRisk.forEach(a => {
        const risk = getAttendanceRiskLevel(a.absenceRate);
        const item = document.createElement('div');
        item.className = 'summary-item';
        item.innerHTML = `
          <span>${a.student_id}</span>
          <span>
            <span class="perf-label" style="color:${risk.level === 'critical' ? '#9f1d1d' : risk.level === 'high' ? '#be5a00' : '#627083'}">${risk.label}</span>
            ${a.absenceRate}% absent (${a.totalAbsences} criteria)
          </span>
        `;
        riskList.append(item);
      });
      container.append(riskList);
    }
  }
}

async function renderSubject(container, className, month) {
  if (!className) {
    container.replaceChildren(createMessage('Select a class to view subject analytics.'));
    return;
  }

  const ym = month || extractYearMonth(new Date().toISOString());

  const [subjects, comparison] = await Promise.all([
    getSubjectAnalytics(className),
    getSubjectComparison(className, ym)
  ]);

  if (subjects.length === 0) {
    container.replaceChildren(createMessage('No subject data available.'));
    return;
  }

  const intelPanel = document.createElement('div');
  intelPanel.className = 'subject-intel-panel';

  if (comparison.best) {
    const bestTag = document.createElement('div');
    bestTag.className = 'intel-tag intel-best';
    bestTag.innerHTML = `<strong>Strongest:</strong> ${comparison.best.subject_name} (${comparison.best.averagePercentage}%)`;
    intelPanel.append(bestTag);
  }
  if (comparison.worst) {
    const worstTag = document.createElement('div');
    worstTag.className = 'intel-tag intel-worst';
    worstTag.innerHTML = `<strong>Weakest:</strong> ${comparison.worst.subject_name} (${comparison.worst.averagePercentage}%)`;
    intelPanel.append(worstTag);
  }
  container.append(intelPanel);

  const chartWrap = document.createElement('div');
  chartWrap.className = 'chart-wrap';
  const canvas = document.createElement('canvas');
  chartWrap.append(canvas);
  container.append(chartWrap);

  const labels = subjects.map(s => s.subject_name);
  const data = subjects.map(s => s.averagePercentage);
  const avg = data.length > 0 ? Math.round(data.reduce((a, b) => a + b, 0) / data.length) : 0;

  const chartConfig = toBarChartData(labels, [{ label: 'Average %', data }]);
  new Chart(canvas, chartConfig);

  const list = document.createElement('div');
  list.className = 'summary-list';
  subjects.forEach(s => {
    const perf = classifyPerformance(s.averagePercentage);
    const item = document.createElement('div');
    item.className = 'summary-item';
    item.innerHTML = `
      <span>${s.subject_name}</span>
      <span>
        <span class="perf-label" style="color:${perf.color}">${perf.label}</span>
        ${s.averagePercentage}% • ${s.sessions} session(s)
      </span>
    `;
    list.append(item);
  });
  container.append(list);
}

async function renderCompletion(container, className, month, onViewSessions) {
  const ym = month || extractYearMonth(new Date().toISOString());
  const comp = getCompletionAnalytics(className || '', ym);
  const trend = await getCompletionTrend(className || '', ym);

  const perf = classifyPerformance(comp.completionRate);

  const info = document.createElement('div');
  info.className = 'completion-header';
  info.innerHTML = `
    <div class="student-header-row">
      <strong>Completion Health</strong>
      <span class="perf-label ${perf.className}">${perf.label}</span>
    </div>
    <div class="trend-line">${trend.label}</div>
  `;
  container.append(info);

  const grid = document.createElement('div');
  grid.className = 'stats-grid';
  grid.append(createEnhancedStatCard('Total', String(comp.total), null, 'All sessions'));
  grid.append(createEnhancedStatCard('Completion', `${comp.completionRate}%`, trend, `${comp.counts.reviewed + comp.counts.locked} done`));
  grid.append(createEnhancedStatCard('Pending', String(comp.counts.draft + comp.counts.submitted), null, `${comp.counts.draft} draft • ${comp.counts.submitted} submitted`));
  grid.append(createEnhancedStatCard('Locked', String(comp.counts.locked), null, 'Finalized'));
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
      const perf = classifyPerformance(pct);
      const item = document.createElement('div');
      item.className = 'summary-item';
      item.innerHTML = `
        <span>${t.teacher}</span>
        <span>
          <span class="perf-label" style="color:${perf.color}">${perf.label}</span>
          ${t.completed}/${t.total} (${pct}%)
        </span>
      `;
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
      const perf = classifyPerformance(pct);
      const item = document.createElement('div');
      item.className = 'summary-item';
      item.innerHTML = `
        <span>${s.subject_name}</span>
        <span>
          <span class="perf-label" style="color:${perf.color}">${perf.label}</span>
          ${s.completed}/${s.total} (${pct}%)
        </span>
      `;
      list.append(item);
    });
    container.append(list);
  }

  const reviewBtn = document.createElement('button');
  reviewBtn.type = 'button';
  reviewBtn.className = 'btn btn-primary';
  reviewBtn.textContent = 'Review Pending Sessions';
  reviewBtn.addEventListener('click', onViewSessions);
  container.append(reviewBtn);
}

function createHealthScoreCard(health) {
  const card = document.createElement('div');
  card.className = 'health-score-card';
  const hasAttendance = health.breakdown.attendance !== undefined;
  card.innerHTML = `
    <div class="health-score-main">
      <div class="health-score-value ${health.statusClass}">${health.score}%</div>
      <div class="health-score-label">School Health Score</div>
      <div class="health-score-status ${health.statusClass}">${health.statusLabel}</div>
    </div>
    <div class="health-breakdown">
      <div class="health-metric"><span>Academic</span><strong>${health.breakdown.academic}%</strong></div>
      <div class="health-metric"><span>Completion</span><strong>${health.breakdown.completion}%</strong></div>
      <div class="health-metric"><span>Student Health</span><strong>${health.breakdown.studentHealth}%</strong></div>
      ${hasAttendance ? `<div class="health-metric"><span>Attendance</span><strong>${health.breakdown.attendance}%</strong></div>` : ''}
    </div>
  `;
  return card;
}

function createEnhancedStatCard(label, value, trend, subtitle) {
  const card = document.createElement('div');
  card.className = 'stat-card enhanced-stat';
  const val = document.createElement('div');
  val.className = 'stat-value';
  val.textContent = value;
  const lab = document.createElement('div');
  lab.className = 'stat-label';
  lab.textContent = label;
  const sub = document.createElement('div');
  sub.className = 'stat-subtitle';
  sub.textContent = subtitle || '';

  card.append(val, lab, sub);

  if (trend) {
    const trendEl = document.createElement('div');
    trendEl.className = `stat-trend trend-${trend.direction}`;
    trendEl.textContent = trend.label;
    card.append(trendEl);
  }

  return card;
}

function createSkeleton() {
  const wrap = document.createElement('div');
  wrap.className = 'skeleton-wrap';
  for (let i = 0; i < 4; i++) {
    const block = document.createElement('div');
    block.className = 'skeleton-block';
    wrap.append(block);
  }
  return wrap;
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

const COLORS = ['#226b63', '#be7c2f', '#1d7a3e', '#9f1d1d', '#5b4b8a', '#2e7d9e', '#d46a1f', '#6b8e23'];

function getColor(index) {
  return COLORS[index % COLORS.length];
}
