import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Calendar, CheckSquare, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getStoredUser } from '@/lib/auth';
import { listAttendance, listTimetable, updateAttendanceSession, type AttendanceSession, type TimetableEntry } from '@/lib/api';
import { BLACKLIST_THRESHOLD, summarizeStudents } from '@/lib/attendance';

export default function StudentAttendance() {
  const user = getStoredUser();
  const [attendance, setAttendance] = useState<AttendanceSession[]>([]);
  const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
  const [punchingIn, setPunchingIn] = useState(false);

  useEffect(() => {
    async function load() {
      const [attendanceData, timetableData] = await Promise.all([listAttendance(), listTimetable()]);
      setAttendance(attendanceData);
      setTimetable(timetableData);
    }

    void load();
  }, []);

  const studentSessions = useMemo(
    () => attendance.filter((session) => session.records.some((record) => record.studentId === user?.id)),
    [attendance, user?.id]
  );

  const summary = summarizeStudents(
    user
      ? [
          {
            id: user.id,
            name: user.name,
            username: user.username,
            class: user.classes[0] ?? '',
            rollNo: '',
            password: '',
          },
        ]
      : [],
    studentSessions
  ).get(user?.id ?? '');

  const activePunchIn = attendance.find(
    (session) =>
      session.punchInEnabled &&
      user?.classes.includes(session.className) &&
      timetable.some((entry) => entry.id === session.timetableEntryId)
  );
  const activeRecord = activePunchIn?.records.find((record) => record.studentId === user?.id);
  const hasMarkedAttendance = activeRecord?.status === 'present' || activeRecord?.status === 'late';

  const handlePunchIn = async () => {
    if (!user || !activePunchIn || hasMarkedAttendance) return;

    setPunchingIn(true);
    try {
      const nextRecords = activePunchIn.records.some((record) => record.studentId === user.id)
        ? activePunchIn.records.map((record) =>
            record.studentId === user.id ? { ...record, status: 'present' as const } : record
          )
        : [...activePunchIn.records, { studentId: user.id, status: 'present' as const }];

      const updated = await updateAttendanceSession(activePunchIn.id, {
        records: nextRecords,
      });

      setAttendance((current) => current.map((session) => (session.id === updated.id ? updated : session)));
    } finally {
      setPunchingIn(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">My Attendance</h1>
        <p className="text-gray-500">See your lecture attendance trend and watch for low-attendance alerts.</p>
      </div>

      <Card className={activePunchIn ? 'border-indigo-300 shadow-sm' : ''}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-indigo-600" />
            Live Punch-in Status
          </CardTitle>
          <CardDescription>
            {activePunchIn
              ? `Punch-in is active for ${activePunchIn.subject} on ${activePunchIn.date}.`
              : 'There are no active punch-in sessions for your class right now.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {activePunchIn ? (
            <div className="flex flex-col gap-4 rounded-lg bg-indigo-50 p-4 text-indigo-900 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p>
                  Faculty has enabled punch-in for <span className="font-semibold">{activePunchIn.className}</span>.
                </p>
                <p className="mt-1 text-sm text-indigo-700">
                  {hasMarkedAttendance ? 'Your attendance has already been marked for this lecture.' : 'Tap below to mark yourself present.'}
                </p>
              </div>
              <Button onClick={() => void handlePunchIn()} disabled={punchingIn || hasMarkedAttendance}>
                {punchingIn ? 'Marking...' : hasMarkedAttendance ? 'Attendance Marked' : 'Punch In Now'}
              </Button>
            </div>
          ) : (
            <div className="flex items-center rounded-lg border border-dashed p-4 text-sm text-gray-500">
              <AlertCircle className="mr-2 h-4 w-4" />
              Waiting for the next active attendance session.
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Overall Attendance</CardTitle>
            <Calendar className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.attendanceRate ?? 0}%</div>
            <p className={`mt-1 text-xs ${(summary?.attendanceRate ?? 0) >= BLACKLIST_THRESHOLD ? 'text-emerald-600' : 'text-rose-600'}`}>
              {(summary?.attendanceRate ?? 0) >= BLACKLIST_THRESHOLD ? 'Above required threshold' : 'Below required threshold'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Lectures Attended</CardTitle>
            <CheckSquare className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.attendedLectures ?? 0}</div>
            <p className="mt-1 text-xs text-gray-500">Out of {summary?.totalLectures ?? 0} tracked lectures</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Absences</CardTitle>
            <AlertCircle className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.absentLectures ?? 0}</div>
            <p className="mt-1 text-xs text-gray-500">Late arrivals: {summary?.lateLectures ?? 0}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
