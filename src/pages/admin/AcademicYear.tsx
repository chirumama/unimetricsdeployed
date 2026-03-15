import React, { useCallback, useEffect, useState } from 'react';
import { CalendarDays, Edit2, Play, Plus, Square } from 'lucide-react';
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
  addAcademicClass,
  getAcademicYear,
  listFaculty,
  startAcademicYear,
  stopAcademicYear,
  updateAcademicClass,
  type AcademicClass,
  type AcademicYear as AcademicYearType,
  type Faculty,
} from '@/lib/api';

type ClassFormValues = {
  name: string;
  divisions: string;
  totalStudents: string;
  subjects: string[];
  facultyId: string;
};

type ClassFormErrors = Partial<Record<keyof ClassFormValues, string>>;

const emptyClassForm: ClassFormValues = {
  name: '',
  divisions: '',
  totalStudents: '',
  subjects: [],
  facultyId: '',
};

const subjectCatalog = [
  'Algorithms',
  'Data Structures',
  'Database Systems',
  'Operating Systems',
  'Software Engineering',
  'Web Dev',
  'Web Service',
];

function parseDivisions(value: string) {
  return value
    .split(',')
    .map((item) => item.trim().toUpperCase())
    .filter(Boolean);
}

function getCompactClassName(name: string) {
  return name.match(/\(([^)]+)\)$/)?.[1] ?? name;
}

function getAssignedClassLabels(academicClass: AcademicClass) {
  const compact = getCompactClassName(academicClass.name);
  return academicClass.divisions.map((division) => `${compact}-${division}`);
}

export default function AcademicYear() {
  const [yearData, setYearData] = useState<AcademicYearType | null>(null);
  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [loading, setLoading] = useState(false);
  const [yearInput, setYearInput] = useState('');
  const [classMode, setClassMode] = useState<'create' | 'edit' | null>(null);
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [classForm, setClassForm] = useState<ClassFormValues>(emptyClassForm);
  const [classErrors, setClassErrors] = useState<ClassFormErrors>({});
  const [classSubmitting, setClassSubmitting] = useState(false);
  const [toast, setToast] = useState<ToastData | null>(null);

  const fetchPageData = useCallback(async () => {
    setLoading(true);
    try {
      const [academicYear, facultyData] = await Promise.all([getAcademicYear(), listFaculty()]);
      setYearData(academicYear);
      setFaculty(facultyData);
      setYearInput(academicYear.year);
    } catch (error) {
      console.error('Failed to load academic year', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchPageData();
  }, [fetchPageData]);

  const showToast = (message: string) => {
    setToast({ id: Date.now(), message });
  };

  const resetClassForm = () => {
    setClassMode(null);
    setEditingClassId(null);
    setClassForm(emptyClassForm);
    setClassErrors({});
  };

  const handleToggleCycle = async () => {
    if (!yearData) return;

    try {
      if (yearData.isActive) {
        const updated = await stopAcademicYear();
        setYearData(updated);
        setYearInput(updated.year);
        showToast('Academic cycle stopped successfully.');
      } else {
        if (!yearInput.trim()) return;
        const updated = await startAcademicYear(yearInput.trim());
        setYearData(updated);
        setYearInput(updated.year);
        showToast('Academic cycle started successfully.');
      }
    } catch (error) {
      console.error('Failed to toggle academic cycle', error);
    }
  };

  const handleClassFieldChange = (field: keyof ClassFormValues, value: string | string[]) => {
    setClassForm((current) => ({ ...current, [field]: value }));
    setClassErrors((current) => ({ ...current, [field]: undefined }));
  };

  const startCreateClass = () => {
    setClassMode('create');
    setEditingClassId(null);
    setClassForm(emptyClassForm);
    setClassErrors({});
  };

  const startEditClass = (academicClass: AcademicClass) => {
    setClassMode('edit');
    setEditingClassId(academicClass.id);
    setClassForm({
      name: academicClass.name,
      divisions: academicClass.divisions.join(', '),
      totalStudents: String(academicClass.totalStudents),
      subjects: academicClass.subjects,
      facultyId: academicClass.facultyId ?? '',
    });
    setClassErrors({});
  };

  const validateClassForm = () => {
    const errors: ClassFormErrors = {};

    if (!classForm.name.trim()) errors.name = 'Class name is required.';
    if (parseDivisions(classForm.divisions).length === 0) errors.divisions = 'Add at least one division.';
    if (!classForm.totalStudents.trim()) {
      errors.totalStudents = 'Total students is required.';
    } else if (Number.isNaN(Number(classForm.totalStudents)) || Number(classForm.totalStudents) < 0) {
      errors.totalStudents = 'Enter a valid student count.';
    }
    if (classForm.subjects.length === 0) errors.subjects = 'Select at least one subject.';

    setClassErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveClass = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validateClassForm()) return;

    setClassSubmitting(true);
    const payload = {
      name: classForm.name.trim(),
      divisions: parseDivisions(classForm.divisions),
      totalStudents: Number(classForm.totalStudents),
      subjects: classForm.subjects,
      facultyId: classForm.facultyId || null,
    };

    try {
      if (classMode === 'create') {
        const created = await addAcademicClass(payload);
        setYearData((current) =>
          current
            ? { ...current, classes: [...current.classes, created] }
            : current
        );
        showToast('Class added successfully.');
      } else if (editingClassId) {
        const updated = await updateAcademicClass(editingClassId, payload);
        setYearData((current) =>
          current
            ? {
                ...current,
                classes: current.classes.map((item) => (item.id === editingClassId ? updated : item)),
              }
            : current
        );
        showToast('Class updated successfully.');
      }
      resetClassForm();
    } catch (error) {
      console.error('Failed to save class', error);
      setClassErrors((current) => ({
        ...current,
        name: 'Unable to save class right now. Please try again.',
      }));
    } finally {
      setClassSubmitting(false);
    }
  };

  const currentYear = yearData?.year ?? '-';
  const isCycleActive = yearData?.isActive ?? false;

  return (
    <div className="space-y-6">
      <Toast toast={toast} onClose={() => setToast(null)} />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Academic Year Management</h1>
          <p className="text-gray-500">Manage academic cycles, classes, subjects, and class-level faculty assignment.</p>
        </div>
        <Button
          variant={isCycleActive ? 'destructive' : 'default'}
          onClick={() => void handleToggleCycle()}
          className="flex items-center gap-2"
          disabled={loading}
        >
          {isCycleActive ? (
            <>
              <Square className="h-4 w-4" />
              Stop Academic Cycle
            </>
          ) : (
            <>
              <Play className="h-4 w-4" />
              Start New Cycle
            </>
          )}
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Current Cycle Status</CardTitle>
            <CardDescription>Status of the academic year</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border bg-gray-50 p-4">
              <div className="flex items-center gap-3">
                <CalendarDays className="h-5 w-5 text-indigo-600" />
                <div>
                  <p className="font-medium text-gray-900">Academic Year</p>
                  <p className="text-sm text-gray-500">{currentYear}</p>
                </div>
              </div>
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  isCycleActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}
              >
                {isCycleActive ? 'Active' : 'Stopped'}
              </span>
            </div>

            <div className="space-y-2 border-t pt-4">
              <label className="text-sm font-medium text-gray-700">Academic Year Label</label>
              <Input
                value={yearInput}
                onChange={(event) => setYearInput(event.target.value)}
                disabled={isCycleActive || loading}
                placeholder="2026-2027"
              />
              {!isCycleActive && (
                <p className="text-sm text-gray-500">Set the next academic year label before starting the cycle.</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Classes, Subjects & Faculty</CardTitle>
              <CardDescription>Each class can define subjects and one assigned faculty owner.</CardDescription>
            </div>
            <Button
              size="sm"
              disabled={!isCycleActive || loading}
              className="flex items-center gap-2"
              onClick={startCreateClass}
            >
              <Plus className="h-4 w-4" />
              Add Class
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {classMode && (
              <Card className="border border-indigo-100 bg-indigo-50/40 shadow-none">
                <CardHeader>
                  <CardTitle>{classMode === 'create' ? 'Add Class' : 'Edit Class'}</CardTitle>
                  <CardDescription>
                    Use the same editor for both adding and updating class details.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form className="space-y-4" onSubmit={handleSaveClass} noValidate>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Class Name</label>
                        <Input
                          value={classForm.name}
                          onChange={(event) => handleClassFieldChange('name', event.target.value)}
                          placeholder="Fourth Year (FY)"
                          disabled={classSubmitting}
                        />
                        {classErrors.name && <p className="text-sm text-red-600">{classErrors.name}</p>}
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Divisions</label>
                        <Input
                          value={classForm.divisions}
                          onChange={(event) => handleClassFieldChange('divisions', event.target.value)}
                          placeholder="A, B, C"
                          disabled={classSubmitting}
                        />
                        {classErrors.divisions && <p className="text-sm text-red-600">{classErrors.divisions}</p>}
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Total Students</label>
                        <Input
                          value={classForm.totalStudents}
                          onChange={(event) => handleClassFieldChange('totalStudents', event.target.value)}
                          placeholder="120"
                          disabled={classSubmitting}
                        />
                        {classErrors.totalStudents && <p className="text-sm text-red-600">{classErrors.totalStudents}</p>}
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Assigned Faculty</label>
                        <select
                          value={classForm.facultyId}
                          onChange={(event) => handleClassFieldChange('facultyId', event.target.value)}
                          disabled={classSubmitting}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                        >
                          <option value="">Unassigned</option>
                          {faculty.map((person) => (
                            <option key={person.id} value={person.id}>
                              {person.name}
                            </option>
                          ))}
                        </select>
                        <p className="text-xs text-gray-500">This faculty can be treated as the owner for this class.</p>
                      </div>
                    </div>

                    <MultiSelectChips
                      label="Subjects"
                      placeholder="Choose a subject"
                      options={subjectCatalog}
                      selected={classForm.subjects}
                      onChange={(next) => handleClassFieldChange('subjects', next)}
                      disabled={classSubmitting}
                      error={classErrors.subjects}
                    />

                    <div className="flex gap-3">
                      <Button type="submit" disabled={classSubmitting}>
                        {classSubmitting ? (classMode === 'create' ? 'Adding...' : 'Saving...') : classMode === 'create' ? 'Add Class' : 'Save Changes'}
                      </Button>
                      <Button type="button" variant="outline" onClick={resetClassForm} disabled={classSubmitting}>
                        Cancel
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            {isCycleActive ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Class Name</TableHead>
                    <TableHead>Divisions</TableHead>
                    <TableHead>Subjects</TableHead>
                    <TableHead>Assigned Faculty</TableHead>
                    <TableHead>Total Students</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {yearData?.classes.map((academicClass) => {
                    const assignedFaculty = faculty.find((person) => person.id === academicClass.facultyId);
                    return (
                      <TableRow key={academicClass.id}>
                        <TableCell className="font-medium">{academicClass.name}</TableCell>
                        <TableCell>{getAssignedClassLabels(academicClass).join(', ')}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {academicClass.subjects.map((subject) => (
                              <span key={subject} className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                                {subject}
                              </span>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>{assignedFaculty?.name ?? 'Unassigned'}</TableCell>
                        <TableCell>{academicClass.totalStudents}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => startEditClass(academicClass)}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="flex h-48 flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 text-center">
                <CalendarDays className="mb-2 h-10 w-10 text-gray-400" />
                <h3 className="text-lg font-medium text-gray-900">Cycle is Stopped</h3>
                <p className="mt-1 max-w-sm text-sm text-gray-500">
                  Start a new academic cycle to manage classes, subjects, and faculty assignment.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
