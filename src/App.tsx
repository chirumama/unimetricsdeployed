/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import AdminDashboard from './pages/admin/AdminDashboard';
import AcademicYear from './pages/admin/AcademicYear';
import FacultyManagement from './pages/admin/FacultyManagement';
import AttendanceOverview from './pages/admin/AttendanceOverview';
import FinancePage from './pages/admin/FinancePage';
import FacultyDashboard from './pages/faculty/FacultyDashboard';
import StudentManagement from './pages/faculty/StudentManagement';
import FacultyAttendance from './pages/faculty/FacultyAttendance';
import FacultyMaterials from './pages/faculty/FacultyMaterials';
import StudentDashboard from './pages/student/StudentDashboard';
import StudentAttendance from './pages/student/StudentAttendance';
import StudentSubjects from './pages/student/StudentSubjects';
import TimetablePage from './pages/shared/TimetablePage';
import NoticePage from './pages/shared/NoticePage';
import DoubtFeedbackPage from './pages/shared/DoubtFeedbackPage';
import ResultsPage from './pages/shared/ResultsPage';
import PlaceholderPage from './pages/PlaceholderPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />

        {/* Admin Routes */}
        <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
          <Route path="/admin" element={<Layout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="academic-year" element={<AcademicYear />} />
            <Route path="faculty-management" element={<FacultyManagement />} />
            <Route path="timetable" element={<TimetablePage />} />
            <Route path="faculty-attendance" element={<AttendanceOverview />} />
            <Route path="finance" element={<FinancePage />} />
            <Route path="results" element={<ResultsPage />} />
            <Route path="notices" element={<NoticePage />} />
            <Route path="logs" element={<PlaceholderPage />} />
          </Route>
        </Route>

        {/* Faculty Routes */}
        <Route element={<ProtectedRoute allowedRoles={['faculty']} />}>
          <Route path="/faculty" element={<Layout />}>
            <Route index element={<FacultyDashboard />} />
            <Route path="students" element={<StudentManagement />} />
            <Route path="attendance" element={<FacultyAttendance />} />
            <Route path="marks" element={<ResultsPage />} />
            <Route path="materials" element={<FacultyMaterials />} />
            <Route path="doubts" element={<DoubtFeedbackPage />} />
            <Route path="timetable" element={<TimetablePage />} />
            <Route path="notices" element={<NoticePage />} />
          </Route>
        </Route>

        {/* Student Routes */}
        <Route element={<ProtectedRoute allowedRoles={['student']} />}>
          <Route path="/student" element={<Layout />}>
            <Route index element={<StudentDashboard />} />
            <Route path="timetable" element={<TimetablePage />} />
            <Route path="subjects" element={<StudentSubjects />} />
            <Route path="attendance" element={<StudentAttendance />} />
            <Route path="doubts" element={<DoubtFeedbackPage />} />
            <Route path="results" element={<ResultsPage />} />
            <Route path="notifications" element={<NoticePage />} />
          </Route>
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
