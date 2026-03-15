import type { AttendanceSession, AttendanceStatus, Student } from '@/lib/api';

export const BLACKLIST_THRESHOLD = 75;

export type StudentAttendanceSummary = {
  studentId: string;
  attendedLectures: number;
  absentLectures: number;
  lateLectures: number;
  totalLectures: number;
  attendanceRate: number;
  isBlacklisted: boolean;
};

export type SessionAttendanceSummary = {
  totalStudents: number;
  presentCount: number;
  lateCount: number;
  absentCount: number;
  attendanceRate: number;
};

export type ClassAttendanceSummary = {
  className: string;
  attendanceRate: number;
  attendedCount: number;
  absentCount: number;
  lateCount: number;
  totalRecords: number;
  totalSessions: number;
  blacklistedCount: number;
};

export function getAttendanceWeight(status: AttendanceStatus) {
  return status === 'absent' ? 0 : 1;
}

export function calculateRate(attended: number, total: number) {
  if (total === 0) return 0;
  return Math.round((attended / total) * 100);
}

export function summarizeSession(session: AttendanceSession): SessionAttendanceSummary {
  const presentCount = session.records.filter((item) => item.status === 'present').length;
  const lateCount = session.records.filter((item) => item.status === 'late').length;
  const absentCount = session.records.filter((item) => item.status === 'absent').length;
  const totalStudents = session.records.length;

  return {
    totalStudents,
    presentCount,
    lateCount,
    absentCount,
    attendanceRate: calculateRate(presentCount + lateCount, totalStudents),
  };
}

export function summarizeStudents(students: Student[], sessions: AttendanceSession[]) {
  const summaryMap = new Map<string, StudentAttendanceSummary>();

  for (const student of students) {
    summaryMap.set(student.id, {
      studentId: student.id,
      attendedLectures: 0,
      absentLectures: 0,
      lateLectures: 0,
      totalLectures: 0,
      attendanceRate: 0,
      isBlacklisted: false,
    });
  }

  for (const session of sessions) {
    for (const record of session.records) {
      const current = summaryMap.get(record.studentId);
      if (!current) continue;

      current.totalLectures += 1;
      if (record.status === 'present') current.attendedLectures += 1;
      if (record.status === 'late') {
        current.attendedLectures += 1;
        current.lateLectures += 1;
      }
      if (record.status === 'absent') current.absentLectures += 1;
    }
  }

  for (const summary of summaryMap.values()) {
    summary.attendanceRate = calculateRate(summary.attendedLectures, summary.totalLectures);
    summary.isBlacklisted = summary.totalLectures > 0 && summary.attendanceRate < BLACKLIST_THRESHOLD;
  }

  return summaryMap;
}

export function summarizeClasses(students: Student[], sessions: AttendanceSession[]) {
  const byStudent = summarizeStudents(students, sessions);
  const classes = Array.from(new Set(students.map((student) => student.class)));

  return classes
    .map((className) => {
      const classSessions = sessions.filter((session) => session.className === className);
      const classStudents = students.filter((student) => student.class === className);
      const totalRecords = classSessions.reduce((sum, session) => sum + session.records.length, 0);
      const attendedCount = classSessions.reduce(
        (sum, session) =>
          sum + session.records.filter((record) => record.status === 'present' || record.status === 'late').length,
        0
      );
      const absentCount = classSessions.reduce(
        (sum, session) => sum + session.records.filter((record) => record.status === 'absent').length,
        0
      );
      const lateCount = classSessions.reduce(
        (sum, session) => sum + session.records.filter((record) => record.status === 'late').length,
        0
      );
      const blacklistedCount = classStudents.filter((student) => byStudent.get(student.id)?.isBlacklisted).length;

      return {
        className,
        attendanceRate: calculateRate(attendedCount, totalRecords),
        attendedCount,
        absentCount,
        lateCount,
        totalRecords,
        totalSessions: classSessions.length,
        blacklistedCount,
      } satisfies ClassAttendanceSummary;
    })
    .sort((first, second) => first.className.localeCompare(second.className));
}
