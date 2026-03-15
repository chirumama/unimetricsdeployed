import type { ResultMark, ResultSubject, Student } from '@/lib/api';

export function getGradeMeta(totalMarks: number) {
  if (totalMarks >= 90) return { grade: 'O', gradePoints: 10 };
  if (totalMarks >= 80) return { grade: 'A+', gradePoints: 9 };
  if (totalMarks >= 70) return { grade: 'A', gradePoints: 8 };
  if (totalMarks >= 60) return { grade: 'B+', gradePoints: 7 };
  if (totalMarks >= 50) return { grade: 'B', gradePoints: 6 };
  if (totalMarks >= 45) return { grade: 'C', gradePoints: 5 };
  if (totalMarks >= 40) return { grade: 'D', gradePoints: 4 };
  return { grade: 'F', gradePoints: 0 };
}

export function buildResultSummary(mark: Pick<ResultMark, 'internalMarks' | 'externalMarks' | 'credits'>) {
  const totalMarks = mark.internalMarks + mark.externalMarks;
  const gradeMeta = getGradeMeta(totalMarks);

  return {
    totalMarks,
    grade: gradeMeta.grade,
    gradePoints: gradeMeta.gradePoints,
    creditGradePoints: gradeMeta.gradePoints * mark.credits,
  };
}

export function isSemesterPublished(subjects: ResultSubject[]) {
  return subjects.length > 0 && subjects.every((subject) => subject.published);
}

export function calculateSgpi(marks: ResultMark[]) {
  const totalCredits = marks.reduce((sum, mark) => sum + mark.credits, 0);
  const totalGradePoints = marks.reduce((sum, mark) => sum + mark.creditGradePoints, 0);

  return {
    totalCredits,
    totalGradePoints,
    sgpi: totalCredits === 0 ? 0 : Number((totalGradePoints / totalCredits).toFixed(2)),
  };
}

export function getStudentsForClass(students: Student[], className: string) {
  return students.filter((student) => student.class === className);
}
