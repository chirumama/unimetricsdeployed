import React, { useEffect, useMemo, useState } from 'react';
import { BookOpen, Download, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Toast, type ToastData } from '@/components/ui/toast';
import { getStoredUser } from '@/lib/auth';
import { getStudyMaterialAccessUrl, listStudyMaterials, type StudyMaterial } from '@/lib/api';

function formatDate(value: string) {
  return new Date(value).toLocaleDateString([], {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function StudentSubjects() {
  const user = getStoredUser();
  const [materials, setMaterials] = useState<StudyMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState<ToastData | null>(null);

  useEffect(() => {
    async function load() {
      if (!user) return;

      try {
        const materialData = await listStudyMaterials(user.role, user.id);
        setMaterials(materialData);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Failed to load notes.');
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [user]);

  const materialsBySubject = useMemo(() => {
    const groups = new Map<string, StudyMaterial[]>();

    materials.forEach((material) => {
      const current = groups.get(material.subject) ?? [];
      current.push(material);
      groups.set(material.subject, current);
    });

    return Array.from(groups.entries()).sort((first, second) => first[0].localeCompare(second[0]));
  }, [materials]);

  async function handleOpen(material: StudyMaterial) {
    if (!user) return;

    try {
      const { signedUrl } = await getStudyMaterialAccessUrl(material.id, user.role, user.id);
      window.open(signedUrl, '_blank', 'noopener,noreferrer');
    } catch (openError) {
      setToast({ id: Date.now(), message: openError instanceof Error ? openError.message : 'Failed to open file.' });
    }
  }

  return (
    <div className="space-y-6">
      <Toast toast={toast} onClose={() => setToast(null)} />

      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">My Subjects & Notes</h1>
        <p className="text-gray-500">Open the materials your teachers have uploaded for your class.</p>
      </div>

      {error && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-red-600">{error}</p>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <Card>
          <CardContent className="flex items-center justify-center gap-2 py-12 text-sm text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading materials...
          </CardContent>
        </Card>
      ) : materialsBySubject.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No Notes Yet</CardTitle>
            <CardDescription>Your class has not received any uploaded material yet.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-6">
          {materialsBySubject.map(([subject, subjectMaterials]) => (
            <Card key={subject}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-indigo-600" />
                  {subject}
                </CardTitle>
                <CardDescription>{subjectMaterials.length} file(s) available for your class.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {subjectMaterials.map((material) => (
                    <div key={material.id} className="flex flex-col gap-3 rounded-xl border border-gray-200 p-4 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{material.title}</p>
                        <p className="mt-1 text-sm text-gray-500">
                          Uploaded by {material.uploadedByName} on {formatDate(material.createdAt)}
                        </p>
                        {material.description && <p className="mt-2 text-sm text-gray-600">{material.description}</p>}
                      </div>
                      <Button type="button" variant="outline" onClick={() => handleOpen(material)}>
                        <Download className="mr-2 h-4 w-4" />
                        Open File
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
