import React, { useCallback, useEffect, useState } from 'react';
import { Edit2, Plus, Search, Trash2, Users } from 'lucide-react';
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
import { MultiSelectChips } from '@/components/ui/multi-select-chips';
import {
  createFaculty,
  deleteFaculty,
  getAcademicYear,
  listFaculty,
  updateFaculty,
  type AcademicYear,
  type Faculty,
} from '@/lib/api';

type FacultyFormValues = {
  name: string;
  username: string;
  password: string;
  dob: string;
  subjects: string[];
  classes: string[];
};

type FacultyFormErrors = Partial<Record<keyof FacultyFormValues, string>>;

const emptyForm: FacultyFormValues = {
  name: '',
  username: '',
  password: '',
  dob: '',
  subjects: [],
  classes: [],
};

function getInitials(name: string) {
  return name.trim().charAt(0).toUpperCase() || 'F';
}

function getClassOptions(yearData: AcademicYear | null) {
  if (!yearData) return [];

  return yearData.classes.flatMap((academicClass) =>
    academicClass.divisions.map((division) => {
      const compactName = academicClass.name.match(/\(([^)]+)\)$/)?.[1] ?? academicClass.name;
      return `${compactName}-${division}`;
    })
  );
}

function getSubjectOptions(yearData: AcademicYear | null) {
  if (!yearData) return [];
  return Array.from(new Set(yearData.classes.flatMap((academicClass) => academicClass.subjects)));
}

export default function FacultyManagement() {
  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [yearData, setYearData] = useState<AcademicYear | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [mode, setMode] = useState<'create' | 'edit' | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<FacultyFormValues>(emptyForm);
  const [formErrors, setFormErrors] = useState<FacultyFormErrors>({});
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [toast, setToast] = useState<ToastData | null>(null);

  const fetchPageData = useCallback(async () => {
    setLoading(true);
    try {
      const [facultyData, academicYear] = await Promise.all([listFaculty(), getAcademicYear()]);
      setFaculty(facultyData);
      setYearData(academicYear);
    } catch (error) {
      console.error('Failed to load faculty management data', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchPageData();
  }, [fetchPageData]);

  const classOptions = getClassOptions(yearData);
  const subjectOptions = getSubjectOptions(yearData);

  const resetForm = () => {
    setMode(null);
    setEditingId(null);
    setFormValues(emptyForm);
    setFormErrors({});
  };

  const showToast = (message: string) => {
    setToast({ id: Date.now(), message });
  };

  const handleFieldChange = (field: keyof FacultyFormValues, value: string | string[]) => {
    setFormValues((current) => ({ ...current, [field]: value }));
    setFormErrors((current) => ({ ...current, [field]: undefined }));
  };

  const startCreate = () => {
    setMode('create');
    setEditingId(null);
    setFormValues({
      ...emptyForm,
      password: '12345678',
    });
    setFormErrors({});
  };

  const startEdit = (person: Faculty) => {
    setMode('edit');
    setEditingId(person.id);
    setFormValues({
      name: person.name,
      username: person.username,
      password: '',
      dob: person.dob ?? '',
      subjects: person.subjects.filter((subject) => subjectOptions.includes(subject)),
      classes: person.classes.filter((cls) => classOptions.includes(cls)),
    });
    setFormErrors({});
  };

  const validateForm = () => {
    const errors: FacultyFormErrors = {};

    if (!formValues.name.trim()) errors.name = 'Name is required.';
    if (!formValues.username.trim()) errors.username = 'Username is required.';
    if (mode === 'create' && !formValues.password.trim()) errors.password = 'Password is required.';
    if (formValues.dob && !/^\d{4}-\d{2}-\d{2}$/.test(formValues.dob)) {
      errors.dob = 'Use YYYY-MM-DD format.';
    }
    if (formValues.subjects.length === 0) errors.subjects = 'Select at least one current subject.';
    if (formValues.classes.length === 0) errors.classes = 'Select at least one current class.';

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
      dob: formValues.dob.trim(),
      subjects: formValues.subjects,
      classes: formValues.classes,
    };

    try {
      if (mode === 'create') {
        const created = await createFaculty(payload as Omit<Faculty, 'id'>);
        setFaculty((current) => [created, ...current]);
        showToast('Faculty account created successfully.');
      } else if (editingId) {
        const updated = await updateFaculty(editingId, payload);
        setFaculty((current) => current.map((item) => (item.id === editingId ? updated : item)));
        showToast('Faculty details updated successfully.');
      }

      resetForm();
    } catch (error) {
      console.error('Failed to save faculty', error);
      setFormErrors((current) => ({
        ...current,
        username: 'Unable to save faculty right now. Please try again.',
      }));
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this faculty member?')) return;

    try {
      await deleteFaculty(id);
      setFaculty((current) => current.filter((item) => item.id !== id));
      if (editingId === id) resetForm();
      showToast('Faculty member removed successfully.');
    } catch (error) {
      console.error('Failed to delete faculty', error);
    }
  };

  const filteredFaculty = faculty.filter((person) => {
    const needle = search.trim().toLowerCase();
    if (!needle) return true;

    return (
      person.name.toLowerCase().includes(needle) ||
      person.username.toLowerCase().includes(needle) ||
      person.subjects.some((subject) => subject.toLowerCase().includes(needle)) ||
      person.classes.some((cls) => cls.toLowerCase().includes(needle))
    );
  });

  return (
    <div className="space-y-6">
      <Toast toast={toast} onClose={() => setToast(null)} />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Faculty Management</h1>
          <p className="text-gray-500">Assign live classes and subjects from the current academic year.</p>
        </div>
        <Button className="flex items-center gap-2" onClick={startCreate}>
          <Plus className="h-4 w-4" />
          Add New Faculty
        </Button>
      </div>

      {mode && (
        <Card>
          <CardHeader>
            <CardTitle>{mode === 'create' ? 'Add Faculty' : 'Edit Faculty'}</CardTitle>
            <CardDescription>
              Use the current academic-year dropdowns to assign multiple classes and subjects.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmit} noValidate>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Faculty Name</label>
                  <Input
                    value={formValues.name}
                    onChange={(event) => handleFieldChange('name', event.target.value)}
                    placeholder="Dr. Sarah Smith"
                    disabled={formSubmitting}
                  />
                  {formErrors.name && <p className="text-sm text-red-600">{formErrors.name}</p>}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Username</label>
                  <Input
                    value={formValues.username}
                    onChange={(event) => handleFieldChange('username', event.target.value)}
                    placeholder="sarah.s"
                    disabled={formSubmitting}
                  />
                  {formErrors.username && <p className="text-sm text-red-600">{formErrors.username}</p>}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    {mode === 'create' ? 'Password' : 'New Password'}
                  </label>
                  <Input
                    type="password"
                    value={formValues.password}
                    onChange={(event) => handleFieldChange('password', event.target.value)}
                    placeholder={mode === 'create' ? 'Create a password' : 'Leave blank to keep current'}
                    disabled={formSubmitting}
                  />
                  {formErrors.password && <p className="text-sm text-red-600">{formErrors.password}</p>}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Date of Birth</label>
                  <Input
                    value={formValues.dob}
                    onChange={(event) => handleFieldChange('dob', event.target.value)}
                    placeholder="1980-05-15"
                    disabled={formSubmitting}
                  />
                  {formErrors.dob && <p className="text-sm text-red-600">{formErrors.dob}</p>}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <MultiSelectChips
                  label="Assigned Subjects"
                  placeholder="Choose a current subject"
                  options={subjectOptions}
                  selected={formValues.subjects}
                  onChange={(next) => handleFieldChange('subjects', next)}
                  disabled={formSubmitting || subjectOptions.length === 0}
                  error={formErrors.subjects}
                />

                <MultiSelectChips
                  label="Assigned Classes"
                  placeholder="Choose a running class"
                  options={classOptions}
                  selected={formValues.classes}
                  onChange={(next) => handleFieldChange('classes', next)}
                  disabled={formSubmitting || classOptions.length === 0}
                  error={formErrors.classes}
                />
              </div>

              {subjectOptions.length === 0 || classOptions.length === 0 ? (
                <p className="text-sm text-amber-700">
                  Add classes, divisions, and subjects in Academic Year first so they appear here.
                </p>
              ) : null}

              <div className="flex gap-3">
                <Button type="submit" disabled={formSubmitting}>
                  {formSubmitting ? (mode === 'create' ? 'Creating...' : 'Saving...') : mode === 'create' ? 'Create Faculty' : 'Save Changes'}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm} disabled={formSubmitting}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle>Faculty Directory</CardTitle>
              <CardDescription>List of all registered faculty members</CardDescription>
            </div>
            <div className="relative w-full max-w-xs">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Search faculty..."
                className="pl-8"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                disabled={loading}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Profile</TableHead>
                <TableHead>Name & Username</TableHead>
                <TableHead>Assigned Subjects</TableHead>
                <TableHead>Assigned Classes</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredFaculty.map((person) => (
                <TableRow key={person.id}>
                  <TableCell>
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 font-bold text-indigo-700">
                      {getInitials(person.name)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium text-gray-900">{person.name}</p>
                      <p className="text-sm text-gray-500">@{person.username}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {person.subjects.map((subject) => (
                        <span key={subject} className="inline-flex items-center rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
                          {subject}
                        </span>
                      ))}
                      {person.subjects.length === 0 && <span className="text-sm text-gray-400">No subjects assigned</span>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {person.classes.map((cls) => (
                        <span key={cls} className="inline-flex items-center rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-800">
                          {cls}
                        </span>
                      ))}
                      {person.classes.length === 0 && <span className="text-sm text-gray-400">No classes assigned</span>}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => startEdit(person)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="text-red-600" onClick={() => void handleDelete(person.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {loading && <p className="mt-2 text-sm text-gray-500">Loading...</p>}
          {!loading && filteredFaculty.length === 0 && (
            <div className="mt-6 flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-200 py-10 text-center">
              <Users className="h-8 w-8 text-gray-300" />
              <p className="mt-3 text-sm font-medium text-gray-700">No faculty found</p>
              <p className="mt-1 text-sm text-gray-500">Try a different search or create a new faculty account.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
