import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { BookOpen, Edit2, Plus, Search, Trash2, Users } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Toast, type ToastData } from '@/components/ui/toast';
import { getStoredUser } from '@/lib/auth';
import {
  createStudent,
  deleteStudent,
  listStudents,
  updateStudent,
  type Student,
} from '@/lib/api';

type StudentFormValues = {
  name: string;
  username: string;
  password: string;
  class: string;
  rollNo: string;
};

type StudentFormErrors = Partial<Record<keyof StudentFormValues, string>>;

const emptyForm: StudentFormValues = {
  name: '',
  username: '',
  password: '',
  class: '',
  rollNo: '',
};

function getInitials(name: string) {
  return name.trim().charAt(0).toUpperCase() || 'S';
}

export default function StudentManagement() {
  const user = getStoredUser();
  const availableClasses = user?.role === 'faculty' ? user.classes : [];

  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [mode, setMode] = useState<'create' | 'edit' | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<StudentFormValues>(emptyForm);
  const [formErrors, setFormErrors] = useState<StudentFormErrors>({});
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [toast, setToast] = useState<ToastData | null>(null);

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listStudents();
      setStudents(data);
    } catch (error) {
      console.error('Failed to load students', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchStudents();
  }, [fetchStudents]);

  const scopedStudents = useMemo(() => {
    if (availableClasses.length === 0) return [];
    return students.filter((student) => availableClasses.includes(student.class));
  }, [availableClasses, students]);

  const resetForm = () => {
    setMode(null);
    setEditingId(null);
    setFormValues(emptyForm);
    setFormErrors({});
  };

  const showToast = (message: string) => {
    setToast({ id: Date.now(), message });
  };

  const handleFieldChange = (field: keyof StudentFormValues, value: string) => {
    setFormValues((current) => ({ ...current, [field]: value }));
    setFormErrors((current) => ({ ...current, [field]: undefined }));
  };

  const startCreate = () => {
    setMode('create');
    setEditingId(null);
    setFormValues({
      ...emptyForm,
      password: '12345678',
      class: availableClasses[0] ?? '',
    });
    setFormErrors({});
  };

  const startEdit = (student: Student) => {
    setMode('edit');
    setEditingId(student.id);
    setFormValues({
      name: student.name,
      username: student.username,
      password: '',
      class: student.class,
      rollNo: student.rollNo,
    });
    setFormErrors({});
  };

  const validateForm = () => {
    const errors: StudentFormErrors = {};

    if (!formValues.name.trim()) errors.name = 'Name is required.';
    if (!formValues.username.trim()) errors.username = 'Username is required.';
    if (mode === 'create' && !formValues.password.trim()) errors.password = 'Password is required.';
    if (!formValues.class.trim()) {
      errors.class = 'Class is required.';
    } else if (!availableClasses.includes(formValues.class.trim())) {
      errors.class = 'Choose one of your assigned classes.';
    }
    if (!formValues.rollNo.trim()) errors.rollNo = 'Roll number is required.';

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!mode || !validateForm()) return;

    setFormSubmitting(true);

    const payload = {
      name: formValues.name.trim(),
      username: formValues.username.trim(),
      ...(formValues.password.trim() ? { password: formValues.password.trim() } : {}),
      class: formValues.class.trim(),
      rollNo: formValues.rollNo.trim(),
    };

    try {
      if (mode === 'create') {
        const created = await createStudent(payload as Omit<Student, 'id'>);
        setStudents((current) => [created, ...current]);
        showToast('Student account created successfully.');
      } else if (editingId) {
        const updated = await updateStudent(editingId, payload);
        setStudents((current) => current.map((item) => (item.id === editingId ? updated : item)));
        showToast('Student details updated successfully.');
      }

      resetForm();
    } catch (error) {
      console.error('Failed to save student', error);
      setFormErrors((current) => ({
        ...current,
        username: 'Unable to save student right now. Please try again.',
      }));
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Remove this student from the directory?')) return;

    try {
      await deleteStudent(id);
      setStudents((current) => current.filter((item) => item.id !== id));
      if (editingId === id) resetForm();
      showToast('Student removed successfully.');
    } catch (error) {
      console.error('Failed to delete student', error);
    }
  };

  const filteredStudents = scopedStudents.filter((student) => {
    const needle = search.trim().toLowerCase();
    if (!needle) return true;

    return (
      student.name.toLowerCase().includes(needle) ||
      student.username.toLowerCase().includes(needle) ||
      student.class.toLowerCase().includes(needle) ||
      student.rollNo.toLowerCase().includes(needle)
    );
  });

  const studentsByClass = availableClasses.map((className) => ({
    className,
    students: filteredStudents
      .filter((student) => student.class === className)
      .sort((first, second) => first.rollNo.localeCompare(second.rollNo)),
  }));

  return (
    <div className="space-y-6">
      <Toast toast={toast} onClose={() => setToast(null)} />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Student Management</h1>
          <p className="text-gray-500">Manage students only inside your assigned classes.</p>
        </div>
        <Button className="flex items-center gap-2" onClick={startCreate} disabled={availableClasses.length === 0}>
          <Plus className="h-4 w-4" />
          Add New Student
        </Button>
      </div>

      {mode && (
        <Card>
          <CardHeader>
            <CardTitle>{mode === 'create' ? 'Add Student' : 'Edit Student'}</CardTitle>
            <CardDescription>
              Choose one of your assigned classes from the dropdown before saving.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmit} noValidate>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Student Name</label>
                  <Input value={formValues.name} onChange={(event) => handleFieldChange('name', event.target.value)} placeholder="Alice Johnson" disabled={formSubmitting} />
                  {formErrors.name && <p className="text-sm text-red-600">{formErrors.name}</p>}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Username</label>
                  <Input value={formValues.username} onChange={(event) => handleFieldChange('username', event.target.value)} placeholder="alice.j" disabled={formSubmitting} />
                  {formErrors.username && <p className="text-sm text-red-600">{formErrors.username}</p>}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">{mode === 'create' ? 'Password' : 'New Password'}</label>
                  <Input type="password" value={formValues.password} onChange={(event) => handleFieldChange('password', event.target.value)} placeholder={mode === 'create' ? 'Create a password' : 'Leave blank to keep current'} disabled={formSubmitting} />
                  {formErrors.password && <p className="text-sm text-red-600">{formErrors.password}</p>}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Class</label>
                  <select
                    value={formValues.class}
                    onChange={(event) => handleFieldChange('class', event.target.value)}
                    disabled={formSubmitting || availableClasses.length === 0}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                  >
                    <option value="">Choose a class</option>
                    {availableClasses.map((className) => (
                      <option key={className} value={className}>
                        {className}
                      </option>
                    ))}
                  </select>
                  {formErrors.class && <p className="text-sm text-red-600">{formErrors.class}</p>}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Roll Number</label>
                  <Input value={formValues.rollNo} onChange={(event) => handleFieldChange('rollNo', event.target.value)} placeholder="101" disabled={formSubmitting} />
                  {formErrors.rollNo && <p className="text-sm text-red-600">{formErrors.rollNo}</p>}
                </div>
              </div>

              <div className="flex gap-3">
                <Button type="submit" disabled={formSubmitting}>
                  {formSubmitting ? (mode === 'create' ? 'Creating...' : 'Saving...') : mode === 'create' ? 'Create Student' : 'Save Changes'}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm} disabled={formSubmitting}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{scopedStudents.length}</div>
            <p className="mt-1 text-xs text-gray-500">Across your assigned classes</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Classes</CardTitle>
            <BookOpen className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{availableClasses.length}</div>
            <p className="mt-1 text-xs text-gray-500">{availableClasses.join(', ') || '-'}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle>Student Directory</CardTitle>
              <CardDescription>List of students in your assigned classes</CardDescription>
            </div>
            <div className="relative w-full max-w-xs">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
              <Input placeholder="Search students..." className="pl-8" value={search} onChange={(event) => setSearch(event.target.value)} disabled={loading} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {availableClasses.length === 0 ? (
            <div className="rounded-lg border border-dashed border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">
              No classes are assigned to this faculty account yet. Assign classes from Academic Year or Faculty Management first.
            </div>
          ) : (
            <div className="space-y-6">
              {studentsByClass.map((group) => (
                <div key={group.className} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-semibold text-gray-900">{group.className}</h3>
                      <p className="text-sm text-gray-500">
                        {group.students.length} student{group.students.length === 1 ? '' : 's'}
                      </p>
                    </div>
                  </div>

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Profile</TableHead>
                        <TableHead>Name & Username</TableHead>
                        <TableHead>Roll No</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {group.students.map((student) => (
                        <TableRow key={student.id}>
                          <TableCell>
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 font-bold text-indigo-700">
                              {getInitials(student.name)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium text-gray-900">{student.name}</p>
                              <p className="text-sm text-gray-500">@{student.username}</p>
                            </div>
                          </TableCell>
                          <TableCell>{student.rollNo}</TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" onClick={() => startEdit(student)}>
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" className="text-red-600" onClick={() => void handleDelete(student.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  {group.students.length === 0 && (
                    <div className="rounded-lg border border-dashed border-gray-200 p-6 text-sm text-gray-500">
                      No students found for {group.className}.
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          {loading && <p className="mt-2 text-sm text-gray-500">Loading...</p>}
          {!loading && availableClasses.length > 0 && filteredStudents.length === 0 && (
            <div className="mt-6 flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-200 py-10 text-center">
              <Users className="h-8 w-8 text-gray-300" />
              <p className="mt-3 text-sm font-medium text-gray-700">No students found</p>
              <p className="mt-1 text-sm text-gray-500">Try a different search or create a new student account.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
