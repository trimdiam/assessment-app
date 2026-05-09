import { getStudentAnalytics } from './analytics-engine.js';
import { detectWeakStudents } from './weak-student-engine.js';
import { aggregateByMonth } from './aggregation-engine.js';

export async function getStudentProfile(studentId, className) {
  const analytics = await getStudentAnalytics(studentId, className);
  const agg = await aggregateByMonth('', className);
  const weak = detectWeakStudents(agg);
  const weakRecord = weak.find(w => w.student_id === studentId);

  return {
    ...analytics,
    flags: weakRecord?.flags || [],
    reasons: weakRecord?.reasons || []
  };
}
