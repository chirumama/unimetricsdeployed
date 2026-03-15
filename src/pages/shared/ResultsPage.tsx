import React, { useEffect, useMemo, useState } from 'react';
import { Download, FileCheck2, Lock, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Toast, type ToastData } from '@/components/ui/toast';
import { getStoredUser } from '@/lib/auth';
import {
  listFaculty,
  listResultMarks,
  listResultSubjects,
  listStudents,
  publishResultSubject,
  saveResultMark,
  type Faculty,
  type ResultMark,
  type ResultSubject,
  type Student,
} from '@/lib/api';
import { buildResultSummary, calculateSgpi, getStudentsForClass, isSemesterPublished } from '@/lib/results';

type DraftRow = {
  internalMarks: number;
  externalMarks: number;
};

export default function ResultsPage() {
  const user = getStoredUser();
  const [students, setStudents] = useState<Student[]>([]);
  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [subjects, setSubjects] = useState<ResultSubject[]>([]);
  const [marks, setMarks] = useState<ResultMark[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSemester, setSelectedSemester] = useState<number>(6);
  const [draftRows, setDraftRows] = useState<Record<string, DraftRow>>({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<ToastData | null>(null);

  useEffect(() => {
    async function load() {
      const [studentData, facultyData, subjectData, markData] = await Promise.all([
        listStudents(),
        listFaculty(),
        listResultSubjects(),
        listResultMarks(),
      ]);

      setStudents(studentData);
      setFaculty(facultyData);
      setSubjects(subjectData);
      setMarks(markData);
    }

    void load();
  }, []);

  const facultySubjects = useMemo(
    () => subjects.filter((subject) => subject.facultyId === user?.id),
    [subjects, user?.id]
  );

  useEffect(() => {
    if (user?.role === 'faculty' && facultySubjects[0] && !selectedSubjectId) {
      setSelectedSubjectId(facultySubjects[0].id);
    }
  }, [facultySubjects, selectedSubjectId, user?.role]);

  const selectedFacultySubject = facultySubjects.find((subject) => subject.id === selectedSubjectId) ?? facultySubjects[0];

  useEffect(() => {
    if (!selectedFacultySubject) return;
    const classStudents = getStudentsForClass(students, selectedFacultySubject.className);
    const nextDraft: Record<string, DraftRow> = {};

    for (const student of classStudents) {
      const existingMark = marks.find(
        (mark) => mark.studentId === student.id && mark.subjectId === selectedFacultySubject.id
      );
      nextDraft[student.id] = {
        internalMarks: existingMark?.internalMarks ?? 0,
        externalMarks: existingMark?.externalMarks ?? 0,
      };
    }

    setDraftRows(nextDraft);
  }, [marks, selectedFacultySubject, students]);

  const allClasses = useMemo(
    () => Array.from(new Set(subjects.map((subject) => subject.className))).sort(),
    [subjects]
  );

  useEffect(() => {
    if ((user?.role === 'admin' || user?.role === 'student') && allClasses[0] && !selectedClass) {
      setSelectedClass(user?.role === 'student' ? user.classes[0] ?? allClasses[0] : allClasses[0]);
    }
  }, [allClasses, selectedClass, user?.classes, user?.role]);

  const classForView = user?.role === 'student' ? user.classes[0] ?? '' : selectedClass;

  const availableSemesters = useMemo(
    () =>
      Array.from(
        new Set(subjects.filter((subject) => subject.className === classForView).map((subject) => subject.semester))
      ).sort((first: number, second: number) => first - second),
    [classForView, subjects]
  );

  useEffect(() => {
    if (availableSemesters[0] && !availableSemesters.includes(selectedSemester)) {
      setSelectedSemester(availableSemesters[availableSemesters.length - 1]);
    }
  }, [availableSemesters, selectedSemester]);

  const semesterSubjects = useMemo(
    () =>
      subjects.filter(
        (subject) => subject.className === classForView && subject.semester === selectedSemester
      ),
    [classForView, selectedSemester, subjects]
  );

  const semesterStudents = useMemo(
    () => getStudentsForClass(students, classForView),
    [classForView, students]
  );

  const marksForSemester = useMemo(
    () =>
      marks.filter(
        (mark) => mark.className === classForView && mark.semester === selectedSemester
      ),
    [classForView, marks, selectedSemester]
  );

  const studentSemesterMarks = useMemo(
    () =>
      marksForSemester.filter((mark) => mark.studentId === user?.id),
    [marksForSemester, user?.id]
  );

  const semesterIsPublished = isSemesterPublished(semesterSubjects);

  const handleDraftChange = (studentId: string, field: keyof DraftRow, value: string) => {
    setDraftRows((current) => ({
      ...current,
      [studentId]: {
        ...current[studentId],
        [field]: Number(value),
      },
    }));
  };

  const handleSaveFacultyMarks = async () => {
    if (!selectedFacultySubject) return;
    setSaving(true);

    try {
      const classStudents = getStudentsForClass(students, selectedFacultySubject.className);
      const savedMarks = await Promise.all(
        classStudents.map((student) =>
          saveResultMark({
            studentId: student.id,
            subjectId: selectedFacultySubject.id,
            internalMax: 20,
            internalMarks: draftRows[student.id]?.internalMarks ?? 0,
            externalMax: 30,
            externalMarks: draftRows[student.id]?.externalMarks ?? 0,
            facultyId: selectedFacultySubject.facultyId,
            semester: selectedFacultySubject.semester,
            className: selectedFacultySubject.className,
          })
        )
      );

      setMarks((current) => {
        const untouched = current.filter((mark) => mark.subjectId !== selectedFacultySubject.id);
        return [...untouched, ...savedMarks];
      });
      setToast({ id: Date.now(), message: 'Marks saved successfully.' });
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!selectedFacultySubject) return;
    await handleSaveFacultyMarks();
    const publishedSubject = await publishResultSubject(selectedFacultySubject.id);
    setSubjects((current) => current.map((subject) => (subject.id === publishedSubject.id ? publishedSubject : subject)));
    setMarks((current) =>
      current.map((mark) => (mark.subjectId === publishedSubject.id ? { ...mark, published: true } : mark))
    );
    setToast({ id: Date.now(), message: 'Subject result published successfully.' });
  };

  const renderFacultyView = () => {
    if (!selectedFacultySubject) {
      return (
        <Card>
          <CardContent className="py-12 text-center text-sm text-gray-500">
            No result subjects are assigned to this faculty account yet.
          </CardContent>
        </Card>
      );
    }

    const classStudents = getStudentsForClass(students, selectedFacultySubject.className);
    const isPublished = selectedFacultySubject.published;

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Marks Entry</CardTitle>
              <CardDescription>
                Enter internal and external marks for your subject. Publishing locks all edits.
              </CardDescription>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => void handleSaveFacultyMarks()} disabled={saving || isPublished}>
                <Save className="mr-2 h-4 w-4" />
                Save
              </Button>
              <Button onClick={() => void handlePublish()} disabled={saving || isPublished}>
                <FileCheck2 className="mr-2 h-4 w-4" />
                {isPublished ? 'Published' : 'Publish Result'}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <select
                value={selectedFacultySubject.id}
                onChange={(event) => setSelectedSubjectId(event.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                {facultySubjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.courseCode} - {subject.courseTitle}
                  </option>
                ))}
              </select>
              <Input value={selectedFacultySubject.className} readOnly />
              <Input value={`Semester ${selectedFacultySubject.semester}`} readOnly />
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Internal (20)</TableHead>
                  <TableHead>External (30)</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Grade</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {classStudents.map((student) => {
                  const summary = buildResultSummary({
                    internalMarks: draftRows[student.id]?.internalMarks ?? 0,
                    externalMarks: draftRows[student.id]?.externalMarks ?? 0,
                    credits: selectedFacultySubject.credits,
                  });

                  return (
                    <TableRow key={student.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-gray-900">{student.name}</p>
                          <p className="text-xs text-gray-500">Roll {student.rollNo}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={0}
                          max={20}
                          value={draftRows[student.id]?.internalMarks ?? 0}
                          onChange={(event) => handleDraftChange(student.id, 'internalMarks', event.target.value)}
                          disabled={isPublished}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={0}
                          max={30}
                          value={draftRows[student.id]?.externalMarks ?? 0}
                          onChange={(event) => handleDraftChange(student.id, 'externalMarks', event.target.value)}
                          disabled={isPublished}
                        />
                      </TableCell>
                      <TableCell>{summary.totalMarks}</TableCell>
                      <TableCell>{summary.grade}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderStudentView = () => {
    const studentMarksBySubject = semesterSubjects.map((subject) => ({
      subject,
      mark: studentSemesterMarks.find((mark) => mark.subjectId === subject.id),
    }));

    const sgpiData = calculateSgpi(studentSemesterMarks);

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Semester Result</CardTitle>
              <CardDescription>
                Mumbai University style grade card for {classForView} semester {selectedSemester}
              </CardDescription>
            </div>
            <div className="flex gap-3">
              <select
                value={selectedSemester}
                onChange={(event) => setSelectedSemester(Number(event.target.value))}
                className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                {availableSemesters.map((semester) => (
                  <option key={semester} value={semester}>
                    Semester {semester}
                  </option>
                ))}
              </select>
              <Button variant="outline" onClick={() => window.print()} disabled={!semesterIsPublished}>
                <Download className="mr-2 h-4 w-4" />
                Download Grade Card
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {!semesterIsPublished ? (
              <div className="flex items-center rounded-lg border border-dashed p-6 text-sm text-gray-600">
                <Lock className="mr-3 h-4 w-4 text-amber-600" />
                Result Not Published Yet
              </div>
            ) : (
              <div className="space-y-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Course Code</TableHead>
                      <TableHead>Course Title</TableHead>
                      <TableHead>I</TableHead>
                      <TableHead>E</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Grade</TableHead>
                      <TableHead>GP</TableHead>
                      <TableHead>Credits</TableHead>
                      <TableHead>C x GP</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {studentMarksBySubject.map(({ subject, mark }) => (
                      <TableRow key={subject.id}>
                        <TableCell>{subject.courseCode}</TableCell>
                        <TableCell>{subject.courseTitle}</TableCell>
                        <TableCell>{mark?.internalMarks ?? '-'}</TableCell>
                        <TableCell>{mark?.externalMarks ?? '-'}</TableCell>
                        <TableCell>{mark?.totalMarks ?? '-'}</TableCell>
                        <TableCell>{mark?.grade ?? '-'}</TableCell>
                        <TableCell>{mark?.gradePoints ?? '-'}</TableCell>
                        <TableCell>{subject.credits}</TableCell>
                        <TableCell>{mark?.creditGradePoints ?? '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <div className="grid gap-4 md:grid-cols-3">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Total Credits</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{sgpiData.totalCredits}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Total Grade Points</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{sgpiData.totalGradePoints}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">SGPI</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-indigo-600">{sgpiData.sgpi}</div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderAdminView = () => {
    const adminStudentSummaries = semesterStudents.map((student) => {
      const studentMarks = marksForSemester.filter((mark) => mark.studentId === student.id);
      return {
        student,
        ...calculateSgpi(studentMarks),
        publishedSubjects: studentMarks.filter((mark) => mark.published).length,
      };
    });

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Results Overview</CardTitle>
            <CardDescription>View all marks, publish status, and semester SGPI across classes.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <select
                value={selectedClass}
                onChange={(event) => setSelectedClass(event.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                {allClasses.map((className) => (
                  <option key={className} value={className}>
                    {className}
                  </option>
                ))}
              </select>
              <select
                value={selectedSemester}
                onChange={(event) => setSelectedSemester(Number(event.target.value))}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                {availableSemesters.map((semester) => (
                  <option key={semester} value={semester}>
                    Semester {semester}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Subjects</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{semesterSubjects.length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Students</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{semesterStudents.length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Result Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${semesterIsPublished ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {semesterIsPublished ? 'Published' : 'Pending'}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Published Subjects</TableHead>
                  <TableHead>Total Credits</TableHead>
                  <TableHead>SGPI</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {adminStudentSummaries.map((item) => (
                  <TableRow key={item.student.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-gray-900">{item.student.name}</p>
                        <p className="text-xs text-gray-500">Roll {item.student.rollNo}</p>
                      </div>
                    </TableCell>
                    <TableCell>{item.publishedSubjects}/{semesterSubjects.length}</TableCell>
                    <TableCell>{item.totalCredits}</TableCell>
                    <TableCell>{item.sgpi}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Course Code</TableHead>
                  <TableHead>Course Title</TableHead>
                  <TableHead>Faculty</TableHead>
                  <TableHead>Credits</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {semesterSubjects.map((subject) => (
                  <TableRow key={subject.id}>
                    <TableCell>{subject.courseCode}</TableCell>
                    <TableCell>{subject.courseTitle}</TableCell>
                    <TableCell>{faculty.find((item) => item.id === subject.facultyId)?.name ?? '-'}</TableCell>
                    <TableCell>{subject.credits}</TableCell>
                    <TableCell className={subject.published ? 'text-emerald-600' : 'text-amber-600'}>
                      {subject.published ? 'Published' : 'Pending'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <Toast toast={toast} onClose={() => setToast(null)} />
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          {user?.role === 'faculty' ? 'Marks & Results' : user?.role === 'student' ? 'Results' : 'Results & Marks'}
        </h1>
        <p className="text-gray-500">
          {user?.role === 'faculty'
            ? 'Enter marks for your subjects and publish results once they are final.'
            : user?.role === 'student'
              ? 'View your grade card after every subject in the semester is published.'
              : 'Monitor marks entry, publication status, and semester results across all classes.'}
        </p>
      </div>

      {user?.role === 'faculty' && renderFacultyView()}
      {user?.role === 'student' && renderStudentView()}
      {user?.role === 'admin' && renderAdminView()}
    </div>
  );
}
