import { getStudentAnalytics } from './analytics-engine.js';
import { detectWeakStudents } from './weak-student-engine.js';
import { aggregateByMonth } from './aggregation-engine.js';
import { getStudentAbsences } from './attendance-engine.js';

export async function getStudentProfile(studentId, className) {
  const analytics = await getStudentAnalytics(studentId, className);
  const agg = await aggregateByMonth(null, className);
  const weak = detectWeakStudents(agg);
  const weakRecord = weak.find(w => w.student_id === studentId);
  const attendance = getStudentAbsences(studentId, className);

  return {
    ...analytics,
    flags: weakRecord?.flags || [],
    reasons: weakRecord?.reasons || [],
    attendance
  };
}
