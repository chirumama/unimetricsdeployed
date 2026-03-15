import React, { useEffect, useMemo, useState } from 'react';
import { Archive, BellRing, Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Toast, type ToastData } from '@/components/ui/toast';
import { getStoredUser } from '@/lib/auth';
import {
  createNotice,
  deleteNotice,
  getAcademicYear,
  listNotices,
  updateNotice,
  type Notice,
} from '@/lib/api';

type NoticeFormValues = {
  title: string;
  message: string;
  targetScope: 'all' | 'class';
  className: string;
  subject: string;
};

const emptyForm: NoticeFormValues = {
  title: '',
  message: '',
  targetScope: 'class',
  className: '',
  subject: '',
};

function buildClassOptions(classes: Awaited<ReturnType<typeof getAcademicYear>>['classes']) {
  return classes.flatMap((academicClass) => {
    const compact = academicClass.name.match(/\(([^)]+)\)$/)?.[1] ?? academicClass.name;
    return academicClass.divisions.map((division) => `${compact}-${division}`);
  });
}

export default function NoticePage() {
  const user = getStoredUser();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [classOptions, setClassOptions] = useState<string[]>([]);
  const [form, setForm] = useState<NoticeFormValues>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<ToastData | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  useEffect(() => {
    async function load() {
      const [noticeData, academicYear] = await Promise.all([listNotices(), getAcademicYear()]);
      setNotices(noticeData);
      setClassOptions(buildClassOptions(academicYear.classes));
    }

    void load();
  }, []);

  const availableClasses = useMemo(() => {
    if (user?.role === 'faculty') {
      return user.classes;
    }
    return classOptions;
  }, [classOptions, user?.classes, user?.role]);

  const visibleNotices = useMemo(() => {
    if (!user) return [];
    if (user.role === 'admin') return notices;
    if (user.role === 'faculty') {
      return notices.filter(
        (notice) =>
          notice.authorId === user.id ||
          notice.targetScope === 'all' ||
          notice.classNames.some((className) => user.classes.includes(className))
      );
    }
    return notices.filter(
      (notice) => notice.targetScope === 'all' || notice.classNames.some((className) => user.classes.includes(className))
    );
  }, [notices, user]);

  const archiveCutoff = useMemo(() => {
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - 2);
    return cutoff;
  }, []);

  const activeNotices = useMemo(
    () =>
      visibleNotices
        .filter((notice) => new Date(notice.updatedAt) >= archiveCutoff)
        .sort((first, second) => second.createdAt.localeCompare(first.createdAt)),
    [archiveCutoff, visibleNotices]
  );

  const archivedNotices = useMemo(
    () =>
      visibleNotices
        .filter((notice) => new Date(notice.updatedAt) < archiveCutoff)
        .sort((first, second) => second.createdAt.localeCompare(first.createdAt)),
    [archiveCutoff, visibleNotices]
  );

  const canManage = user?.role === 'admin' || user?.role === 'faculty';

  const resetForm = () => {
    setEditingId(null);
    setForm({
      ...emptyForm,
      targetScope: user?.role === 'admin' ? 'all' : 'class',
      subject: user?.role === 'faculty' ? user.subjects[0] ?? '' : '',
      className: user?.role === 'faculty' ? user.classes[0] ?? '' : '',
    });
  };

  useEffect(() => {
    resetForm();
  }, [user?.role]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) return;

    setSubmitting(true);
    const payload: Omit<Notice, 'id' | 'createdAt' | 'updatedAt'> = {
      title: form.title,
      message: form.message,
      authorId: user.id,
      authorName: user.name,
      authorRole: user.role === 'admin' ? 'admin' : 'faculty',
      targetScope: user.role === 'admin' ? form.targetScope : 'class',
      classNames: user.role === 'admin' ? (form.targetScope === 'all' ? [] : [form.className]) : [form.className],
      subject: user.role === 'faculty' ? form.subject : '',
    };

    try {
      if (editingId) {
        const updated = await updateNotice(editingId, payload);
        setNotices((current) => current.map((notice) => (notice.id === updated.id ? updated : notice)));
        setToast({ id: Date.now(), message: 'Notice updated successfully.' });
      } else {
        const created = await createNotice(payload);
        setNotices((current) => [created, ...current]);
        setToast({ id: Date.now(), message: 'Notice published successfully.' });
      }
      resetForm();
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (notice: Notice) => {
    setEditingId(notice.id);
    setForm({
      title: notice.title,
      message: notice.message,
      targetScope: notice.targetScope,
      className: notice.classNames[0] ?? '',
      subject: notice.subject ?? '',
    });
  };

  const handleDelete = async (id: string) => {
    await deleteNotice(id);
    setNotices((current) => current.filter((notice) => notice.id !== id));
    if (editingId === id) {
      resetForm();
    }
    setToast({ id: Date.now(), message: 'Notice deleted successfully.' });
  };

  const canEditNotice = (notice: Notice) => {
    if (new Date(notice.updatedAt) < archiveCutoff) return false;
    if (user?.role === 'admin') return true;
    return user?.role === 'faculty' && notice.authorId === user.id;
  };

  const renderedNotices = showArchived ? archivedNotices : activeNotices;

  return (
    <div className="space-y-6">
      <Toast toast={toast} onClose={() => setToast(null)} />

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            {user?.role === 'student' ? 'Notifications' : 'Notice System'}
          </h1>
          <p className="text-gray-500">
            {user?.role === 'admin'
              ? 'View every notice across all classes and publish announcements to one class or the full campus.'
              : user?.role === 'faculty'
                ? 'Publish notices only for the classrooms assigned to you.'
                : 'See only the notices that apply to your class and subject teachers.'}
          </p>
        </div>
        <Button variant="outline" onClick={() => setShowArchived((current) => !current)}>
          <Archive className="mr-2 h-4 w-4" />
          {showArchived ? `Back to Active (${activeNotices.length})` : `Archived (${archivedNotices.length})`}
        </Button>
      </div>

      {canManage && !showArchived && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-indigo-600" />
              {editingId ? 'Edit Notice' : 'Add Notice'}
            </CardTitle>
            <CardDescription>
              {user?.role === 'admin'
                ? 'Choose all classrooms or a specific class/division from the dropdown.'
                : 'Faculty notices can only be sent to assigned classrooms.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <Input
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                placeholder="Notice title"
                disabled={submitting}
              />
              <textarea
                value={form.message}
                onChange={(event) => setForm((current) => ({ ...current, message: event.target.value }))}
                placeholder="Notice message"
                disabled={submitting}
                rows={4}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
              />

              {user?.role === 'admin' && (
                <select
                  value={form.targetScope}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      targetScope: event.target.value as 'all' | 'class',
                    }))
                  }
                  disabled={submitting}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                >
                  <option value="all">All classrooms</option>
                  <option value="class">Particular classroom</option>
                </select>
              )}

              {(user?.role === 'faculty' || form.targetScope === 'class') && (
                <select
                  value={form.className}
                  onChange={(event) => setForm((current) => ({ ...current, className: event.target.value }))}
                  disabled={submitting}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                >
                  <option value="">Select classroom</option>
                  {availableClasses.map((className) => (
                    <option key={className} value={className}>
                      {className}
                    </option>
                  ))}
                </select>
              )}

              {user?.role === 'faculty' && (
                <select
                  value={form.subject}
                  onChange={(event) => setForm((current) => ({ ...current, subject: event.target.value }))}
                  disabled={submitting}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                >
                  <option value="">Select subject</option>
                  {user.subjects.map((subject) => (
                    <option key={subject} value={subject}>
                      {subject}
                    </option>
                  ))}
                </select>
              )}

              <div className="flex gap-3">
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Saving...' : editingId ? 'Save Changes' : 'Publish Notice'}
                </Button>
                {editingId && (
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancel
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {showArchived && (
          <Card>
            <CardContent className="py-4 text-sm text-gray-500">
              Archived notices are read-only and cannot be deleted once they move to archive after two months.
            </CardContent>
          </Card>
        )}

        {renderedNotices.length === 0 && (
          <Card>
            <CardContent className="flex h-36 items-center justify-center text-sm text-gray-500">
              {showArchived ? 'No archived notices available yet.' : 'No notices available for this role yet.'}
            </CardContent>
          </Card>
        )}

        {renderedNotices.map((notice) => (
          <Card key={notice.id}>
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <BellRing className="h-5 w-5 text-indigo-600" />
                  {notice.title}
                </CardTitle>
                <CardDescription className="mt-2 flex flex-wrap gap-3">
                  <span>By {notice.authorName}</span>
                  <span className="capitalize">{notice.authorRole}</span>
                  {notice.subject && <span>{notice.subject}</span>}
                  <span>{notice.targetScope === 'all' ? 'All classrooms' : notice.classNames.join(', ')}</span>
                </CardDescription>
              </div>

              {canEditNotice(notice) && !showArchived && (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleEdit(notice)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" className="text-rose-600" onClick={() => void handleDelete(notice.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-700">{notice.message}</p>
              <p className="mt-3 text-xs text-gray-400">
                Updated {new Date(notice.updatedAt).toLocaleString()}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
