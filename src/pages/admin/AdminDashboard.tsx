import React, { useEffect, useMemo, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, DollarSign, GraduationCap, TrendingUp, Users } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getFinance, listAttendance, listFaculty, listStudents, type AttendanceSession, type Faculty, type FinanceData, type Student } from '@/lib/api';
import { summarizeClasses } from '@/lib/attendance';

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}

export default function AdminDashboard() {
  const [students, setStudents] = useState<Student[]>([]);
  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [attendance, setAttendance] = useState<AttendanceSession[]>([]);
  const [finance, setFinance] = useState<FinanceData>({ revenues: [], expenses: [] });

  useEffect(() => {
    async function load() {
      const [studentData, facultyData, attendanceData, financeData] = await Promise.all([
        listStudents(),
        listFaculty(),
        listAttendance(),
        getFinance(),
      ]);

      setStudents(studentData);
      setFaculty(facultyData);
      setAttendance(attendanceData);
      setFinance(financeData);
    }

    void load();
  }, []);

  const studentFeeRevenue = useMemo(
    () => students.reduce((sum, student) => sum + (student.feePaid ?? 0), 0),
    [students]
  );
  const otherRevenue = useMemo(
    () => finance.revenues.reduce((sum, item) => sum + item.amount, 0),
    [finance.revenues]
  );
  const totalRevenue = studentFeeRevenue + otherRevenue;
  const totalExpense = useMemo(
    () => finance.expenses.reduce((sum, item) => sum + item.amount, 0),
    [finance.expenses]
  );
  const classAttendance = useMemo(() => summarizeClasses(students, attendance), [attendance, students]);
  const avgAttendance =
    classAttendance.length === 0
      ? 0
      : Math.round(classAttendance.reduce((sum, item) => sum + item.attendanceRate, 0) / classAttendance.length);

  const financeTrend = [
    { label: 'Student Fees', revenue: studentFeeRevenue, expense: 0 },
    ...finance.revenues.map((item) => ({ label: item.title, revenue: item.amount, expense: 0 })),
    ...finance.expenses.slice(0, 4).map((item) => ({ label: item.title, revenue: 0, expense: item.amount })),
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-500">Overview of students, attendance, and finance performance.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{students.length}</div>
            <p className="mt-1 flex items-center text-xs text-green-600">
              <ArrowUpRight className="mr-1 h-3 w-3" />
              Live count from enrolled student records
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Faculty</CardTitle>
            <GraduationCap className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{faculty.length}</div>
            <p className="mt-1 flex items-center text-xs text-green-600">
              <ArrowUpRight className="mr-1 h-3 w-3" />
              Includes all active dummy faculty members
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue Collected</CardTitle>
            <DollarSign className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div>
            <p className="mt-1 flex items-center text-xs text-green-600">
              <ArrowUpRight className="mr-1 h-3 w-3" />
              Fees, donations, grants, and exam collections
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tracked Expenses</CardTitle>
            <TrendingUp className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalExpense)}</div>
            <p className="mt-1 flex items-center text-xs text-red-600">
              <ArrowDownRight className="mr-1 h-3 w-3" />
              Avg attendance currently {avgAttendance}%
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Class Attendance</CardTitle>
            <CardDescription>Average attendance percentage by tracked class</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={classAttendance}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="className" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} domain={[0, 100]} />
                  <Tooltip />
                  <Bar dataKey="attendanceRate" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Finance Snapshot</CardTitle>
            <CardDescription>Revenue vs expense sources from the finance module</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={financeTrend}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={3} />
                  <Line type="monotone" dataKey="expense" stroke="#ef4444" strokeWidth={3} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
