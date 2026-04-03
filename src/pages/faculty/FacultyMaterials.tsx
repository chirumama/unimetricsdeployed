import React, { useEffect, useMemo, useState } from 'react';
import { Download, FileText, Loader2, Trash2, Upload } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Toast, type ToastData } from '@/components/ui/toast';
import { getStoredUser } from '@/lib/auth';
import {
  deleteStudyMaterial,
  getAcademicYear,
  getStudyMaterialAccessUrl,
  listStudyMaterials,
  uploadStudyMaterial,
  type AcademicClass,
  type StudyMaterial,
} from '@/lib/api';

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleString([], {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function buildSectionLabel(baseName: string, sectionName: string) {
  return `${baseName} - ${sectionName}`;
}

export default function FacultyMaterials() {
  const user = getStoredUser();
  const [materials, setMaterials] = useState<StudyMaterial[]>([]);
  const [classes, setClasses] = useState<AcademicClass[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [className, setClassName] = useState(user?.classes[0] ?? '');
  const [subject, setSubject] = useState(user?.subjects[0] ?? '');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState<ToastData | null>(null);

  useEffect(() => {
    async function load() {
      if (!user) return;

      try {
        const [materialData, academicYear] = await Promise.all([
          listStudyMaterials(user.role, user.id),
          getAcademicYear(),
        ]);
        setMaterials(materialData);
        setClasses(academicYear.classes);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Failed to load study materials.');
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [user]);

  const availableClasses = useMemo(() => {
    if (!user) return [];

    return classes.flatMap((entry) =>
      entry.divisions
        .map((division) => ({
          id: `${entry.id}-${division}`,
          name: `${entry.name}-${division}`,
          label: buildSectionLabel(entry.name, division),
          subjects: entry.subjects,
        }))
        .filter((section) => user.classes.includes(section.name))
    );
  }, [classes, user]);

  const availableSubjects = useMemo(() => {
    if (!className) return user?.subjects ?? [];
    const selectedClass = availableClasses.find((entry) => entry.name === className);
    if (!selectedClass) return user?.subjects ?? [];
    return selectedClass.subjects.filter((entry) => user?.subjects.includes(entry));
  }, [availableClasses, className, user?.subjects]);

  useEffect(() => {
    if (!availableClasses.find((entry) => entry.name === className)) {
      setClassName(availableClasses[0]?.name ?? '');
    }
  }, [availableClasses, className]);

  useEffect(() => {
    if (!availableSubjects.includes(subject)) {
      setSubject(availableSubjects[0] ?? '');
    }
  }, [availableSubjects, subject]);

  async function refreshMaterials() {
    if (!user) return;
    const materialData = await listStudyMaterials(user.role, user.id);
    setMaterials(materialData);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || user.role !== 'faculty') return;

    if (!title || !className || !subject || !file) {
      setError('Title, class, subject, and file are required.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      await uploadStudyMaterial({
        title,
        description,
        className,
        subject,
        uploadedById: user.id,
        uploadedByRole: 'faculty',
        file,
      });

      setTitle('');
      setDescription('');
      setFile(null);
      const fileInput = document.getElementById('material-file-input') as HTMLInputElement | null;
      if (fileInput) fileInput.value = '';

      await refreshMaterials();
      setToast({ id: Date.now(), message: 'Study material uploaded successfully.' });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Failed to upload study material.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleOpen(material: StudyMaterial) {
    if (!user) return;

    try {
      const { signedUrl } = await getStudyMaterialAccessUrl(material.id, user.role, user.id);
      window.open(signedUrl, '_blank', 'noopener,noreferrer');
    } catch (openError) {
      setError(openError instanceof Error ? openError.message : 'Failed to open file.');
    }
  }

  async function handleDelete(material: StudyMaterial) {
    if (!user || user.role !== 'faculty') return;

    try {
      await deleteStudyMaterial(material.id, user.id, 'faculty');
      await refreshMaterials();
      setToast({ id: Date.now(), message: 'Study material deleted.' });
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete study material.');
    }
  }

  return (
    <div className="space-y-6">
      <Toast toast={toast} onClose={() => setToast(null)} />

      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Study Materials</h1>
        <p className="text-gray-500">Upload notes to Supabase Storage and manage the files your students can access.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upload New Material</CardTitle>
          <CardDescription>Supported formats: PDF, DOC, DOCX, PPT, PPTX, images, and text files up to 15 MB.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Title</label>
              <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Unit 1 Database Notes" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Class</label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={className}
                onChange={(event) => setClassName(event.target.value)}
              >
                <option value="">Select class</option>
                {availableClasses.map((entry) => (
                  <option key={entry.id} value={entry.name}>
                    {entry.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Subject</label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
              >
                <option value="">Select subject</option>
                {availableSubjects.map((entry) => (
                  <option key={entry} value={entry}>
                    {entry}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">File</label>
              <Input
                id="material-file-input"
                type="file"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                accept=".pdf,.doc,.docx,.ppt,.pptx,.png,.jpg,.jpeg,.webp,.txt"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-gray-700">Description</label>
              <textarea
                className="min-h-28 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Add context, syllabus coverage, or revision tips."
              />
            </div>

            {error && <p className="text-sm text-red-600 md:col-span-2">{error}</p>}

            <div className="md:col-span-2">
              <Button type="submit" disabled={submitting}>
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                Upload Material
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your Uploaded Materials</CardTitle>
          <CardDescription>These files live in the private `classroombucket` bucket and open through signed URLs.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center rounded-lg border border-dashed border-gray-200 p-10 text-sm text-gray-500">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading materials...
            </div>
          ) : materials.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-200 p-10 text-center text-sm text-gray-500">
              No materials uploaded yet.
            </div>
          ) : (
            <div className="space-y-3">
              {materials.map((material) => (
                <div key={material.id} className="flex flex-col gap-4 rounded-xl border border-gray-200 p-4 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-start gap-3">
                      <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900">{material.title}</p>
                        <p className="mt-1 text-sm text-gray-500">
                          {material.className} • {material.subject} • {material.fileName}
                        </p>
                        {material.description && <p className="mt-2 text-sm text-gray-600">{material.description}</p>}
                        <p className="mt-2 text-xs text-gray-400">
                          {formatBytes(material.fileSize)} • Uploaded {formatDate(material.createdAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={() => handleOpen(material)}>
                      <Download className="mr-2 h-4 w-4" />
                      Open
                    </Button>
                    <Button type="button" variant="destructive" onClick={() => handleDelete(material)}>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
