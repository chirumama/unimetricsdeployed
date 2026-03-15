const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

async function apiFetch<T>(path: string, options: RequestInit = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    },
    ...options,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed with status ${res.status}`);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return (await res.json()) as T;
}

export type Role = 'admin' | 'faculty' | 'student';

export type AuthUser = {
  id: string;
  name: string;
  username: string;
  role: Role;
  classes: string[];
  subjects: string[];
};

export type LoginResponse = {
  user: AuthUser;
};

export type Faculty = {
  id: string;
  name: string;
  username: string;
  password?: string;
  dob?: string;
  subjects: string[];
  classes: string[];
};

export type Student = {
  id: string;
  name: string;
  username: string;
  password?: string;
  class: string;
  rollNo: string;
  feePaid?: number;
};

export type AcademicClass = {
  id: string;
  name: string;
  divisions: string[];
  totalStudents: number;
  subjects: string[];
  facultyId: string | null;
};

export type AcademicYear = {
  id: string;
  year: string;
  isActive: boolean;
  classes: AcademicClass[];
};

export type Location = {
  id: string;
  name: string;
  type: 'classroom' | 'lab';
};

export type TimetableEntry = {
  id: string;
  className: string;
  subject: string;
  facultyId: string;
  locationId: string;
  date: string;
  startTime: string;
  endTime: string;
};

export type AttendanceStatus = 'present' | 'absent' | 'late';

export type AttendanceRecord = {
  studentId: string;
  status: AttendanceStatus;
};

export type AttendanceSession = {
  id: string;
  timetableEntryId: string;
  className: string;
  subject: string;
  facultyId: string;
  date: string;
  punchInEnabled: boolean;
  records: AttendanceRecord[];
};

export type FinanceRevenue = {
  id: string;
  title: string;
  category: 'exam-fees' | 'donation' | 'grant' | 'other';
  amount: number;
  receivedOn: string;
  note?: string;
};

export type FinanceExpense = {
  id: string;
  title: string;
  category: 'salary' | 'utilities' | 'maintenance' | 'operations' | 'scholarship' | 'other';
  amount: number;
  paidTo: string;
  dueDate: string;
  frequency: 'monthly' | 'quarterly' | 'annual' | 'one-time';
  note?: string;
};

export type FinanceData = {
  revenues: FinanceRevenue[];
  expenses: FinanceExpense[];
};

export type Notice = {
  id: string;
  title: string;
  message: string;
  authorId: string;
  authorName: string;
  authorRole: 'admin' | 'faculty';
  targetScope: 'all' | 'class';
  classNames: string[];
  subject?: string;
  createdAt: string;
  updatedAt: string;
};

export type DoubtFeedback = {
  id: string;
  type: 'doubt' | 'feedback';
  title: string;
  message: string;
  studentId: string;
  studentName: string;
  className: string;
  teacherId: string;
  teacherName: string;
  subject?: string;
  createdAt: string;
};

export type ResultSubject = {
  id: string;
  courseCode: string;
  courseTitle: string;
  className: string;
  semester: number;
  facultyId: string;
  credits: number;
  published: boolean;
};

export type ResultMark = {
  id: string;
  studentId: string;
  subjectId: string;
  internalMax: number;
  internalMarks: number;
  externalMax: number;
  externalMarks: number;
  totalMarks: number;
  grade: string;
  gradePoints: number;
  credits: number;
  creditGradePoints: number;
  published: boolean;
  facultyId: string;
  semester: number;
  className: string;
};

export async function getAcademicYear() {
  return apiFetch<AcademicYear>('/api/academic-year');
}

export async function login(username: string, password: string) {
  return apiFetch<LoginResponse>('/api/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

export async function startAcademicYear(year: string) {
  return apiFetch<AcademicYear>('/api/academic-year/start', {
    method: 'POST',
    body: JSON.stringify({ year }),
  });
}

export async function stopAcademicYear() {
  return apiFetch<AcademicYear>('/api/academic-year/stop', {
    method: 'POST',
  });
}

export async function addAcademicClass(input: {
  name: string;
  divisions: string[];
  totalStudents: number;
  subjects: string[];
  facultyId: string | null;
}) {
  return apiFetch<AcademicClass>('/api/academic-year/classes', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function updateAcademicClass(id: string, input: Partial<AcademicClass>) {
  return apiFetch<AcademicClass>(`/api/academic-year/classes/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

export async function listFaculty() {
  return apiFetch<Faculty[]>('/api/faculty');
}

export async function createFaculty(input: Omit<Faculty, 'id'>) {
  return apiFetch<Faculty>('/api/faculty', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function updateFaculty(id: string, input: Partial<Faculty>) {
  return apiFetch<Faculty>(`/api/faculty/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

export async function deleteFaculty(id: string) {
  return apiFetch<void>(`/api/faculty/${id}`, {
    method: 'DELETE',
  });
}

export async function listStudents() {
  return apiFetch<Student[]>('/api/students');
}

export async function createStudent(input: Omit<Student, 'id'>) {
  return apiFetch<Student>('/api/students', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function updateStudent(id: string, input: Partial<Student>) {
  return apiFetch<Student>(`/api/students/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

export async function deleteStudent(id: string) {
  return apiFetch<void>(`/api/students/${id}`, {
    method: 'DELETE',
  });
}

export async function listLocations() {
  return apiFetch<Location[]>('/api/locations');
}

export async function createLocation(input: Omit<Location, 'id'>) {
  return apiFetch<Location>('/api/locations', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function updateLocation(id: string, input: Partial<Location>) {
  return apiFetch<Location>(`/api/locations/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

export async function deleteLocation(id: string) {
  return apiFetch<void>(`/api/locations/${id}`, {
    method: 'DELETE',
  });
}

export async function listTimetable() {
  return apiFetch<TimetableEntry[]>('/api/timetable');
}

export async function createTimetableEntry(input: Omit<TimetableEntry, 'id'>) {
  return apiFetch<TimetableEntry>('/api/timetable', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function updateTimetableEntry(id: string, input: Partial<TimetableEntry>) {
  return apiFetch<TimetableEntry>(`/api/timetable/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

export async function deleteTimetableEntry(id: string) {
  return apiFetch<void>(`/api/timetable/${id}`, {
    method: 'DELETE',
  });
}

export async function listAttendance() {
  return apiFetch<AttendanceSession[]>('/api/attendance');
}

export async function createAttendanceSession(input: Omit<AttendanceSession, 'id'>) {
  return apiFetch<AttendanceSession>('/api/attendance', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function updateAttendanceSession(id: string, input: Partial<AttendanceSession>) {
  return apiFetch<AttendanceSession>(`/api/attendance/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

export async function getFinance() {
  return apiFetch<FinanceData>('/api/finance');
}

export async function createExpense(input: Omit<FinanceExpense, 'id'>) {
  return apiFetch<FinanceExpense>('/api/finance/expenses', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function updateExpense(id: string, input: Partial<FinanceExpense>) {
  return apiFetch<FinanceExpense>(`/api/finance/expenses/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

export async function deleteExpense(id: string) {
  return apiFetch<void>(`/api/finance/expenses/${id}`, {
    method: 'DELETE',
  });
}

export async function listNotices() {
  return apiFetch<Notice[]>('/api/notices');
}

export async function createNotice(input: Omit<Notice, 'id' | 'createdAt' | 'updatedAt'>) {
  return apiFetch<Notice>('/api/notices', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function updateNotice(id: string, input: Partial<Notice>) {
  return apiFetch<Notice>(`/api/notices/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

export async function deleteNotice(id: string) {
  return apiFetch<void>(`/api/notices/${id}`, {
    method: 'DELETE',
  });
}

export async function listDoubts() {
  return apiFetch<DoubtFeedback[]>('/api/doubts');
}

export async function createDoubt(input: Omit<DoubtFeedback, 'id' | 'createdAt'>) {
  return apiFetch<DoubtFeedback>('/api/doubts', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function listResultSubjects() {
  return apiFetch<ResultSubject[]>('/api/results/subjects');
}

export async function listResultMarks() {
  return apiFetch<ResultMark[]>('/api/results/marks');
}

export async function saveResultMark(
  input: Omit<ResultMark, 'id' | 'totalMarks' | 'grade' | 'gradePoints' | 'creditGradePoints' | 'published' | 'credits'>
) {
  return apiFetch<ResultMark>('/api/results/marks', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function publishResultSubject(id: string) {
  return apiFetch<ResultSubject>(`/api/results/subjects/${id}/publish`, {
    method: 'POST',
  });
}
