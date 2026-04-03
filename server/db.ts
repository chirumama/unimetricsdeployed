import {
  ensureSupabaseSeededFromLocalFile,
  isSupabaseEnabled,
  pullSupabaseSnapshot,
  pushSupabaseSnapshot,
  readLocalDBFile,
  writeLocalDBFile,
} from './supabase.js';

export interface Faculty {
  id: string;
  name: string;
  username: string;
  password: string;
  dob?: string;
  subjects: string[];
  classes: string[];
}

export interface Student {
  id: string;
  name: string;
  username: string;
  password: string;
  class: string;
  rollNo: string;
  feePaid?: number;
}

export interface AcademicClass {
  id: string;
  name: string;
  divisions: string[];
  totalStudents: number;
  subjects: string[];
  facultyId: string | null;
}

export interface AcademicYear {
  id: string;
  year: string;
  isActive: boolean;
  classes: AcademicClass[];
}

export interface Location {
  id: string;
  name: string;
  type: 'classroom' | 'lab';
}

export interface TimetableEntry {
  id: string;
  className: string;
  subject: string;
  facultyId: string;
  locationId: string;
  date: string;
  startTime: string;
  endTime: string;
}

export type AttendanceStatus = 'present' | 'absent' | 'late';

export interface AttendanceRecord {
  studentId: string;
  status: AttendanceStatus;
}

export interface AttendanceSession {
  id: string;
  timetableEntryId: string;
  className: string;
  subject: string;
  facultyId: string;
  date: string;
  punchInEnabled: boolean;
  records: AttendanceRecord[];
}

export interface FinanceRevenue {
  id: string;
  title: string;
  category: 'exam-fees' | 'donation' | 'grant' | 'other';
  amount: number;
  receivedOn: string;
  note?: string;
}

export interface FinanceExpense {
  id: string;
  title: string;
  category: 'salary' | 'utilities' | 'maintenance' | 'operations' | 'scholarship' | 'other';
  amount: number;
  paidTo: string;
  dueDate: string;
  frequency: 'monthly' | 'quarterly' | 'annual' | 'one-time';
  note?: string;
}

export interface FinanceData {
  revenues: FinanceRevenue[];
  expenses: FinanceExpense[];
}

export interface Notice {
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
}

export interface DoubtFeedback {
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
}

export interface ResultSubject {
  id: string;
  courseCode: string;
  courseTitle: string;
  className: string;
  semester: number;
  facultyId: string;
  credits: number;
  published: boolean;
}

export interface ResultMark {
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
}

export interface StudyMaterial {
  id: string;
  title: string;
  description: string;
  className: string;
  subject: string;
  uploadedById: string;
  uploadedByName: string;
  uploadedByRole: 'admin' | 'faculty';
  fileName: string;
  filePath: string;
  mimeType: string;
  fileSize: number;
  createdAt: string;
}

export interface DB {
  academicYear: AcademicYear;
  faculty: Faculty[];
  students: Student[];
  locations: Location[];
  timetable: TimetableEntry[];
  attendance: AttendanceSession[];
  finance: FinanceData;
  notices: Notice[];
  doubts: DoubtFeedback[];
  resultSubjects: ResultSubject[];
  resultMarks: ResultMark[];
  studyMaterials: StudyMaterial[];
}

export async function readDB(): Promise<DB> {
  if (!isSupabaseEnabled()) {
    return readLocalDBFile();
  }

  const remote = (await ensureSupabaseSeededFromLocalFile()) ?? (await pullSupabaseSnapshot());
  return remote ?? readLocalDBFile();
}

export async function writeDB(db: DB): Promise<void> {
  await writeLocalDBFile(db);

  if (!isSupabaseEnabled()) {
    return;
  }

  await pushSupabaseSnapshot(db);
}
