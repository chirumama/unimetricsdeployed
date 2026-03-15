import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Award, BookOpen, Calendar, CalendarClock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getStoredUser } from '@/lib/auth';
import { listLocations, listTimetable, type Location, type TimetableEntry } from '@/lib/api';
import { formatLocalDate } from '@/lib/utils';

function formatTime(value: string) {
  const [hours, minutes] = value.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export default function StudentDashboard() {
  const user = getStoredUser();
  const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const [timetableData, locationData] = await Promise.all([listTimetable(), listLocations()]);
        setTimetable(timetableData);
        setLocations(locationData);
      } catch (error) {
        console.error('Failed to load student dashboard data', error);
      }
    }

    void load();
  }, []);

  const today = formatLocalDate(new Date());
  const studentEntries = useMemo(
    () =>
      timetable
        .filter((entry) => user?.classes.includes(entry.className))
        .sort((first, second) => `${first.date}${first.startTime}`.localeCompare(`${second.date}${second.startTime}`)),
    [timetable, user?.classes]
  );

  const todayEntries = studentEntries.filter((entry) => entry.date === today);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Student Dashboard</h1>
          <p className="text-gray-500">Welcome back! Your timetable is synced with faculty scheduling.</p>
        </div>
        <Button asChild>
          <Link to="/student/timetable">View Timetable</Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current CGPA</CardTitle>
            <Award className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8.82</div>
            <p className="mt-1 text-xs text-gray-500">Out of 10.0</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Attendance</CardTitle>
            <Calendar className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">85%</div>
            <p className="mt-1 text-xs text-green-600">Good standing</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lectures Today</CardTitle>
            <BookOpen className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todayEntries.length}</div>
            <p className="mt-1 text-xs text-gray-500">From your class timetable</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Next 5 Lectures</CardTitle>
            <AlertCircle className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{studentEntries.slice(0, 5).length}</div>
            <p className="mt-1 text-xs text-red-600">Shared live schedule</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upcoming Lecture Schedule</CardTitle>
          <CardDescription>Read-only view synced from admin and faculty timetable changes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {studentEntries.slice(0, 5).map((entry) => {
              const location = locations.find((item) => item.id === entry.locationId);

              return (
                <div key={entry.id} className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <p className="font-medium text-gray-900">{entry.subject}</p>
                    <div className="mt-1 flex flex-wrap gap-3 text-sm text-gray-500">
                      <span>{entry.date}</span>
                      <span>{formatTime(entry.startTime)} - {formatTime(entry.endTime)}</span>
                      <span>{location?.name ?? '-'}</span>
                    </div>
                  </div>
                  <Button asChild variant="outline" size="sm">
                    <Link to="/student/timetable">
                      <CalendarClock className="mr-2 h-4 w-4" />
                      Open
                    </Link>
                  </Button>
                </div>
              );
            })}
            {studentEntries.length === 0 && (
              <div className="rounded-lg border border-dashed border-gray-200 p-8 text-center text-sm text-gray-500">
                No lectures scheduled for your class yet.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
