import React, { useEffect, useMemo, useState } from 'react';
import { MessageSquarePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Toast, type ToastData } from '@/components/ui/toast';
import { getStoredUser } from '@/lib/auth';
import { createDoubt, listDoubts, listFaculty, type DoubtFeedback, type Faculty } from '@/lib/api';

type DoubtFormValues = {
  type: 'doubt' | 'feedback';
  title: string;
  message: string;
  teacherId: string;
  subject: string;
};

const emptyForm: DoubtFormValues = {
  type: 'doubt',
  title: '',
  message: '',
  teacherId: '',
  subject: '',
};

export default function DoubtFeedbackPage() {
  const user = getStoredUser();
  const [doubts, setDoubts] = useState<DoubtFeedback[]>([]);
  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [form, setForm] = useState<DoubtFormValues>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<ToastData | null>(null);

  useEffect(() => {
    async function load() {
      const [doubtData, facultyData] = await Promise.all([listDoubts(), listFaculty()]);
      setDoubts(doubtData);
      setFaculty(facultyData);
    }

    void load();
  }, []);

  const availableTeachers = useMemo(() => {
    if (user?.role !== 'student') return [];
    return faculty.filter((teacher) => user.classes.some((className) => teacher.classes.includes(className)));
  }, [faculty, user?.classes, user?.role]);

  useEffect(() => {
    if (user?.role === 'student' && availableTeachers[0] && !form.teacherId) {
      setForm((current) => ({
        ...current,
        teacherId: availableTeachers[0].id,
        subject: availableTeachers[0].subjects[0] ?? '',
      }));
    }
  }, [availableTeachers, form.teacherId, user?.role]);

  const visibleEntries = useMemo(() => {
    if (!user) return [];
    if (user.role === 'faculty') {
      return doubts.filter((entry) => entry.teacherId === user.id);
    }
    return doubts.filter((entry) => entry.studentId === user.id);
  }, [doubts, user]);

  const sortedEntries = useMemo(
    () => [...visibleEntries].sort((first, second) => second.createdAt.localeCompare(first.createdAt)),
    [visibleEntries]
  );

  const handleTeacherChange = (teacherId: string) => {
    const teacher = availableTeachers.find((item) => item.id === teacherId);
    setForm((current) => ({
      ...current,
      teacherId,
      subject: teacher?.subjects[0] ?? '',
    }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user || user.role !== 'student') return;

    const teacher = availableTeachers.find((item) => item.id === form.teacherId);
    if (!teacher) return;

    setSubmitting(true);
    try {
      const created = await createDoubt({
        type: form.type,
        title: form.title,
        message: form.message,
        studentId: user.id,
        studentName: user.name,
        className: user.classes[0] ?? '',
        teacherId: teacher.id,
        teacherName: teacher.name,
        subject: form.subject,
      });

      setDoubts((current) => [created, ...current]);
      setToast({ id: Date.now(), message: 'Your doubt/feedback has been published.' });
      setForm({
        ...emptyForm,
        teacherId: teacher.id,
        subject: teacher.subjects[0] ?? '',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Toast toast={toast} onClose={() => setToast(null)} />

      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Doubts & Feedback</h1>
        <p className="text-gray-500">
          {user?.role === 'student'
            ? 'Send a private doubt or feedback to one teacher from your classroom.'
            : 'Review the doubts and feedback sent privately to you by your students.'}
        </p>
      </div>

      {user?.role === 'student' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquarePlus className="h-5 w-5 text-indigo-600" />
              Ask a Doubt or Share Feedback
            </CardTitle>
            <CardDescription>
              Once published, entries stay visible only to you and the selected teacher.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <select
                value={form.type}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    type: event.target.value as 'doubt' | 'feedback',
                  }))
                }
                disabled={submitting}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                <option value="doubt">Doubt</option>
                <option value="feedback">Feedback</option>
              </select>

              <select
                value={form.teacherId}
                onChange={(event) => handleTeacherChange(event.target.value)}
                disabled={submitting}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                <option value="">Select teacher</option>
                {availableTeachers.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.name}
                  </option>
                ))}
              </select>

              <select
                value={form.subject}
                onChange={(event) => setForm((current) => ({ ...current, subject: event.target.value }))}
                disabled={submitting}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                <option value="">Select subject</option>
                {(availableTeachers.find((teacher) => teacher.id === form.teacherId)?.subjects ?? []).map((subject) => (
                  <option key={subject} value={subject}>
                    {subject}
                  </option>
                ))}
              </select>

              <Input
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                placeholder="Short title"
                disabled={submitting}
              />

              <textarea
                value={form.message}
                onChange={(event) => setForm((current) => ({ ...current, message: event.target.value }))}
                placeholder="Type your doubt or feedback"
                rows={5}
                disabled={submitting}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
              />

              <Button type="submit" disabled={submitting}>
                {submitting ? 'Publishing...' : 'Publish'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {sortedEntries.length === 0 && (
          <Card>
            <CardContent className="flex h-36 items-center justify-center text-sm text-gray-500">
              No doubts or feedback available here yet.
            </CardContent>
          </Card>
        )}

        {sortedEntries.map((entry) => (
          <Card key={entry.id}>
            <CardHeader>
              <CardTitle className="capitalize">{entry.type}: {entry.title}</CardTitle>
              <CardDescription className="flex flex-wrap gap-3">
                <span>{entry.studentName}</span>
                <span>{entry.className}</span>
                <span>{entry.teacherName}</span>
                {entry.subject && <span>{entry.subject}</span>}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-700">{entry.message}</p>
              <p className="mt-3 text-xs text-gray-400">
                Published {new Date(entry.createdAt).toLocaleString()}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
