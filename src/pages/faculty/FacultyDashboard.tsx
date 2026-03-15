import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, BookOpen, CalendarClock, CheckCircle, Clock, Users } from 'lucide-react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getStoredUser } from '@/lib/auth';
import { listAttendance, listLocations, listStudents, listTimetable, type AttendanceSession, type Location, type Student, type TimetableEntry } from '@/lib/api';
import { BLACKLIST_THRESHOLD, summarizeSession, summarizeStudents } from '@/lib/attendance';
import { formatLocalDate } from '@/lib/utils';

function formatTime(value: string) {
  const [hours, minutes] = value.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export default function FacultyDashboard() {
  const user = getStoredUser();
  const [students, setStudents] = useState<Student[]>([]);
  const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [attendance, setAttendance] = useState<AttendanceSession[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const [studentData, timetableData, locationData, attendanceData] = await Promise.all([
          listStudents(),
          listTimetable(),
          listLocations(),
          listAttendance(),
        ]);
        setStudents(studentData);
        setTimetable(timetableData);
        setLocations(locationData);
        setAttendance(attendanceData);
      } catch (error) {
        console.error('Failed to load faculty dashboard data', error);
      }
    }

    void load();
  }, []);

  const today = formatLocalDate(new Date());
  const facultyEntries = useMemo(
    () =>
      timetable
        .filter((entry) => entry.facultyId === user?.id)
        .sort((first, second) => `${first.date}${first.startTime}`.localeCompare(`${second.date}${second.startTime}`)),
    [timetable, user?.id]
  );

  const todayEntries = facultyEntries.filter((entry) => entry.date === today);
  const totalStudents = students.filter((student) => user?.classes.includes(student.class)).length;
  const facultyStudents = students.filter((student) => user?.classes.includes(student.class));
  const facultySessions = attendance.filter((session) => session.facultyId === user?.id);
  const studentSummaries = summarizeStudents(facultyStudents, facultySessions);
  const blacklistedCount = facultyStudents.filter((student) => studentSummaries.get(student.id)?.isBlacklisted).length;
  const nextLecture = facultyEntries[0];
  const nextLectureSession = attendance.find((session) => session.timetableEntryId === nextLecture?.id);
  const nextLectureClassStudents = students.filter((student) => student.class === nextLecture?.className);
  const nextLectureSummary =
    nextLecture &&
    summarizeSession({
      id: nextLectureSession?.id ?? nextLecture.id,
      timetableEntryId: nextLecture.id,
      className: nextLecture.className,
      subject: nextLecture.subject,
      facultyId: nextLecture.facultyId,
      date: nextLecture.date,
      punchInEnabled: nextLectureSession?.punchInEnabled ?? false,
      records: nextLectureClassStudents.map((student) => ({
        studentId: student.id,
        status:
          nextLectureSession?.records.find((record) => record.studentId === student.id)?.status ?? 'absent',
      })),
    });
  const chartData = nextLectureSummary
    ? [
        { name: 'Present', value: nextLectureSummary.presentCount },
        { name: 'Late', value: nextLectureSummary.lateCount },
        { name: 'Absent', value: nextLectureSummary.absentCount },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Faculty Dashboard</h1>
          <p className="text-gray-500">Manage your live schedule, classes, and student access.</p>
        </div>
        <Button asChild>
          <Link to="/faculty/timetable">Manage Timetable</Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStudents}</div>
            <p className="mt-1 text-xs text-gray-500">Across {user?.classes.length ?? 0} assigned classes</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Classes Today</CardTitle>
            <BookOpen className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todayEntries.length}</div>
            <p className="mt-1 text-xs text-gray-500">Pulled from the shared timetable</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Lectures</CardTitle>
            <Clock className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{facultyEntries.slice(0, 3).length}</div>
            <p className="mt-1 text-xs text-gray-500">Next scheduled lectures</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assigned Classes</CardTitle>
            <CheckCircle className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{user?.classes.length ?? 0}</div>
            <p className="mt-1 text-xs text-gray-500">{user?.classes.join(', ') || '-'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Blacklist Watch</CardTitle>
            <AlertTriangle className="h-4 w-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-600">{blacklistedCount}</div>
            <p className="mt-1 text-xs text-gray-500">Students below {BLACKLIST_THRESHOLD}% attendance</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr,0.85fr]">
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Classes</CardTitle>
          <CardDescription>Your schedule from the shared timetable module</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {facultyEntries.slice(0, 5).map((entry) => {
              const location = locations.find((item) => item.id === entry.locationId);
              const studentCount = students.filter((student) => student.class === entry.className).length;

              return (
                <div key={entry.id} className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <p className="font-medium text-gray-900">{entry.subject}</p>
                    <div className="mt-1 flex flex-wrap gap-3 text-sm text-gray-500">
                      <span>{entry.date}</span>
                      <span>{formatTime(entry.startTime)} - {formatTime(entry.endTime)}</span>
                      <span>{entry.className}</span>
                      <span>{location?.name ?? '-'}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{studentCount} Students</p>
                    <Button asChild variant="outline" size="sm" className="mt-2">
                      <Link to="/faculty/timetable">
                        <CalendarClock className="mr-2 h-4 w-4" />
                        Open
                      </Link>
                    </Button>
                  </div>
                </div>
              );
            })}
            {facultyEntries.length === 0 && (
              <div className="rounded-lg border border-dashed border-gray-200 p-8 text-center text-sm text-gray-500">
                No lectures scheduled yet. Add one from My Timetable.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lecture Presence Snapshot</CardTitle>
          <CardDescription>
            {nextLecture
              ? `Quick visual for ${nextLecture.subject} in ${nextLecture.className}`
              : 'Attendance overview will appear once lectures are scheduled.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {nextLectureSummary ? (
            <>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={chartData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={82}>
                      {chartData.map((entry, index) => (
                        <Cell
                          key={entry.name}
                          fill={['#10b981', '#f59e0b', '#ef4444'][index]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                {chartData.map((item) => (
                  <div key={item.name} className="rounded-lg bg-gray-50 p-3">
                    <p className="text-xs text-gray-500">{item.name}</p>
                    <p className="text-lg font-semibold text-gray-900">{item.value}</p>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="rounded-lg border border-dashed border-gray-200 p-8 text-center text-sm text-gray-500">
              No attendance records are available for your lectures yet.
            </div>
          )}
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
