import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, School, Users } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { listAttendance, listStudents, type AttendanceSession, type Student } from '@/lib/api';
import { BLACKLIST_THRESHOLD, summarizeClasses, summarizeStudents } from '@/lib/attendance';

export default function AttendanceOverview() {
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<AttendanceSession[]>([]);

  useEffect(() => {
    async function load() {
      const [studentData, attendanceData] = await Promise.all([listStudents(), listAttendance()]);
      setStudents(studentData);
      setAttendance(attendanceData);
    }

    void load();
  }, []);

  const classSummaries = useMemo(() => summarizeClasses(students, attendance), [attendance, students]);
  const studentSummaries = useMemo(() => summarizeStudents(students, attendance), [attendance, students]);

  const lowAttendanceStudents = useMemo(
    () =>
      students
        .map((student) => ({
          student,
          summary: studentSummaries.get(student.id),
        }))
        .filter((item) => item.summary?.isBlacklisted)
        .sort((first, second) => (first.summary?.attendanceRate ?? 0) - (second.summary?.attendanceRate ?? 0)),
    [studentSummaries, students]
  );

  const overallRate =
    classSummaries.length === 0
      ? 0
      : Math.round(classSummaries.reduce((sum, item) => sum + item.attendanceRate, 0) / classSummaries.length);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Attendance Overview</h1>
        <p className="text-gray-500">Review each classroom attendance percentage and spot classes or students that need intervention.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Tracked Classes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{classSummaries.length}</div>
            <p className="mt-1 text-xs text-gray-500">Classes with attendance data</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Overall Attendance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-indigo-600">{overallRate}%</div>
            <p className="mt-1 text-xs text-gray-500">Average across tracked classrooms</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Blacklist Watch</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-600">{lowAttendanceStudents.length}</div>
            <p className="mt-1 text-xs text-gray-500">Students below {BLACKLIST_THRESHOLD}%</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr,0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <School className="h-5 w-5 text-indigo-600" />
              Classroom Attendance %
            </CardTitle>
            <CardDescription>Quick comparison of attendance rates by class.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={classSummaries}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="className" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Bar dataKey="attendanceRate" fill="#4f46e5" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-rose-600" />
              Low Attendance Students
            </CardTitle>
            <CardDescription>Central watchlist across all classes.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {lowAttendanceStudents.length === 0 && (
              <div className="rounded-lg border border-dashed p-4 text-sm text-gray-500">
                No students are currently below the blacklist threshold.
              </div>
            )}
            {lowAttendanceStudents.map(({ student, summary }) => (
              <div key={student.id} className="rounded-lg border border-rose-100 bg-rose-50 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-rose-900">{student.name}</p>
                    <p className="text-sm text-rose-700">{student.class} • Roll {student.rollNo}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold text-rose-700">{summary?.attendanceRate ?? 0}%</p>
                    <p className="text-xs text-rose-600">{summary?.attendedLectures ?? 0}/{summary?.totalLectures ?? 0} lectures</p>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-indigo-600" />
            Classroom Breakdown
          </CardTitle>
          <CardDescription>Attendance percentage, session count, and blacklist counts by classroom.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Class</TableHead>
                <TableHead>Attendance %</TableHead>
                <TableHead>Sessions</TableHead>
                <TableHead>Late Marks</TableHead>
                <TableHead>Blacklist</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {classSummaries.map((item) => (
                <TableRow key={item.className}>
                  <TableCell className="font-medium">{item.className}</TableCell>
                  <TableCell>{item.attendanceRate}%</TableCell>
                  <TableCell>{item.totalSessions}</TableCell>
                  <TableCell>{item.lateCount}</TableCell>
                  <TableCell>
                    <span className={item.blacklistedCount > 0 ? 'text-rose-600 font-medium' : 'text-emerald-600 font-medium'}>
                      {item.blacklistedCount}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
