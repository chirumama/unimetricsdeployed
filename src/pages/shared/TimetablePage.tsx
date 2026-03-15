import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarClock, Edit2, MapPin, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Toast, type ToastData } from '@/components/ui/toast';
import { ScheduleCalendar } from '@/components/ScheduleCalendar';
import { getStoredUser } from '@/lib/auth';
import { formatLocalDate } from '@/lib/utils';
import {
  createLocation,
  createTimetableEntry,
  deleteLocation,
  deleteTimetableEntry,
  getAcademicYear,
  listFaculty,
  listLocations,
  listTimetable,
  updateLocation,
  updateTimetableEntry,
  type AcademicYear,
  type Faculty,
  type Location,
  type TimetableEntry,
} from '@/lib/api';

type TimetableFormValues = {
  className: string;
  subject: string;
  facultyId: string;
  locationId: string;
  date: string;
  startTime: string;
  endTime: string;
};

type TimetableFormErrors = Partial<Record<keyof TimetableFormValues, string>>;

type LocationFormValues = {
  name: string;
  type: 'classroom' | 'lab';
};

const emptyTimetableForm: TimetableFormValues = {
  className: '',
  subject: '',
  facultyId: '',
  locationId: '',
  date: formatLocalDate(new Date()),
  startTime: '09:00',
  endTime: '10:00',
};

const emptyLocationForm: LocationFormValues = {
  name: '',
  type: 'classroom',
};

function buildClassOptions(yearData: AcademicYear | null) {
  if (!yearData) return [];

  return yearData.classes.flatMap((academicClass) => {
    const compact = academicClass.name.match(/\(([^)]+)\)$/)?.[1] ?? academicClass.name;
    return academicClass.divisions.map((division) => ({
      label: `${compact}-${division}`,
      subjects: academicClass.subjects,
      facultyId: academicClass.facultyId,
    }));
  });
}

function formatTime(value: string) {
  if (!value) return '-';
  const [hours, minutes] = value.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export default function TimetablePage() {
  const user = getStoredUser();
  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
  const [yearData, setYearData] = useState<AcademicYear | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(formatLocalDate(new Date()));
  const [timetableMode, setTimetableMode] = useState<'create' | 'edit' | null>(null);
  const [editingTimetableId, setEditingTimetableId] = useState<string | null>(null);
  const [timetableForm, setTimetableForm] = useState<TimetableFormValues>(emptyTimetableForm);
  const [timetableErrors, setTimetableErrors] = useState<TimetableFormErrors>({});
  const [timetableSubmitting, setTimetableSubmitting] = useState(false);
  const [locationMode, setLocationMode] = useState<'create' | 'edit' | null>(null);
  const [editingLocationId, setEditingLocationId] = useState<string | null>(null);
  const [locationForm, setLocationForm] = useState<LocationFormValues>(emptyLocationForm);
  const [locationSubmitting, setLocationSubmitting] = useState(false);
  const [toast, setToast] = useState<ToastData | null>(null);

  const canManageLocations = user?.role === 'admin';
  const canManageTimetable = user?.role === 'admin' || user?.role === 'faculty';

  const fetchPageData = useCallback(async () => {
    setLoading(true);
    try {
      const [facultyData, locationData, timetableData, academicYear] = await Promise.all([
        listFaculty(),
        listLocations(),
        listTimetable(),
        getAcademicYear(),
      ]);

      setFaculty(facultyData);
      setLocations(locationData);
      setTimetable(timetableData);
      setYearData(academicYear);
    } catch (error) {
      console.error('Failed to load timetable data', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchPageData();
  }, [fetchPageData]);

  const classOptions = useMemo(() => buildClassOptions(yearData), [yearData]);

  const visibleTimetable = useMemo(() => {
    if (!user) return [];
    if (user.role === 'admin') return timetable;
    if (user.role === 'faculty') {
      return timetable.filter((entry) => entry.facultyId === user.id);
    }
    return timetable.filter((entry) => user.classes.includes(entry.className));
  }, [timetable, user]);

  const entriesForSelectedDate = useMemo(
    () =>
      visibleTimetable
        .filter((entry) => entry.date === selectedDate)
        .sort((first, second) => first.startTime.localeCompare(second.startTime)),
    [selectedDate, visibleTimetable]
  );

  const markedDates = useMemo(
    () => Array.from(new Set(visibleTimetable.map((entry) => entry.date))),
    [visibleTimetable]
  );

  const showToast = (message: string) => {
    setToast({ id: Date.now(), message });
  };

  const resetTimetableForm = () => {
    setEditingTimetableId(null);
    setTimetableErrors({});
    setTimetableForm(buildInitialTimetableForm());
  };

  const resetLocationForm = () => {
    setLocationMode(null);
    setEditingLocationId(null);
    setLocationForm(emptyLocationForm);
  };

  const getAllowedClassOptions = () => {
    if (user?.role === 'faculty') {
      return classOptions.filter((item) => user.classes.includes(item.label));
    }
    if (user?.role === 'student') {
      return classOptions.filter((item) => user.classes.includes(item.label));
    }
    return classOptions;
  };

  const allowedClassOptions = getAllowedClassOptions();

  const getSubjectOptions = (className: string) => {
    const selectedClass = classOptions.find((item) => item.label === className);
    if (!selectedClass) return user?.role === 'faculty' ? user.subjects : [];

    if (user?.role === 'faculty') {
      return selectedClass.subjects.filter((subject) => user.subjects.includes(subject));
    }

    return selectedClass.subjects;
  };

  const buildInitialTimetableForm = (): TimetableFormValues => {
    const defaultClassOption = user?.role === 'faculty' ? allowedClassOptions[0] : classOptions[0];
    const defaultClassName = defaultClassOption?.label ?? '';
    const defaultSubjects = getSubjectOptions(defaultClassName);

    return {
      ...emptyTimetableForm,
      date: selectedDate,
      className: defaultClassName,
      subject: defaultSubjects[0] ?? '',
      facultyId: user?.role === 'faculty' ? user.id : defaultClassOption?.facultyId ?? '',
      locationId: locations[0]?.id ?? '',
    };
  };

  const handleTimetableFieldChange = (field: keyof TimetableFormValues, value: string) => {
    setTimetableForm((current) => {
      if (field === 'className') {
        const subjects = getSubjectOptions(value);
        const matchingClass = classOptions.find((item) => item.label === value);
        return {
          ...current,
          className: value,
          subject: subjects[0] ?? '',
          facultyId:
            user?.role === 'faculty'
              ? user.id
              : matchingClass?.facultyId ?? current.facultyId,
        };
      }

      return { ...current, [field]: value };
    });
    setTimetableErrors((current) => ({ ...current, [field]: undefined }));
  };

  const startCreateTimetable = () => {
    setTimetableMode('create');
    resetTimetableForm();
  };

  const startEditTimetable = (entry: TimetableEntry) => {
    setTimetableMode('edit');
    setEditingTimetableId(entry.id);
    setTimetableForm({
      className: entry.className,
      subject: entry.subject,
      facultyId: entry.facultyId,
      locationId: entry.locationId,
      date: entry.date,
      startTime: entry.startTime,
      endTime: entry.endTime,
    });
    setTimetableErrors({});
  };

  const validateTimetableForm = () => {
    const errors: TimetableFormErrors = {};

    if (!timetableForm.className) errors.className = 'Class is required.';
    if (!timetableForm.subject) errors.subject = 'Subject is required.';
    if (!timetableForm.facultyId) errors.facultyId = 'Faculty is required.';
    if (!timetableForm.locationId) errors.locationId = 'Location is required.';
    if (!timetableForm.date) errors.date = 'Date is required.';
    if (!timetableForm.startTime) errors.startTime = 'Start time is required.';
    if (!timetableForm.endTime) errors.endTime = 'End time is required.';
    if (timetableForm.startTime && timetableForm.endTime && timetableForm.endTime <= timetableForm.startTime) {
      errors.endTime = 'End time must be after start time.';
    }

    setTimetableErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveTimetable = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validateTimetableForm()) return;

    setTimetableSubmitting(true);
    const payload = {
      ...timetableForm,
      facultyId: user?.role === 'faculty' ? user.id : timetableForm.facultyId,
    };

    try {
      if (timetableMode === 'create') {
        const created = await createTimetableEntry(payload);
        setTimetable((current) => [...current, created]);
        showToast('Lecture scheduled successfully.');
      } else if (editingTimetableId) {
        const updated = await updateTimetableEntry(editingTimetableId, payload);
        setTimetable((current) => current.map((item) => (item.id === editingTimetableId ? updated : item)));
        showToast('Lecture updated successfully.');
      }

      setSelectedDate(payload.date);
      setTimetableMode(null);
      resetTimetableForm();
    } catch (error) {
      console.error('Failed to save timetable entry', error);
      setTimetableErrors((current) => ({
        ...current,
        className: 'Unable to save the lecture right now. Please try again.',
      }));
    } finally {
      setTimetableSubmitting(false);
    }
  };

  const handleDeleteTimetable = async (id: string) => {
    try {
      await deleteTimetableEntry(id);
      setTimetable((current) => current.filter((item) => item.id !== id));
      if (editingTimetableId === id) {
        resetTimetableForm();
      }
      showToast('Lecture deleted successfully.');
    } catch (error) {
      console.error('Failed to delete timetable entry', error);
    }
  };

  const startCreateLocation = () => {
    setLocationMode('create');
    setEditingLocationId(null);
    setLocationForm(emptyLocationForm);
  };

  const startEditLocation = (location: Location) => {
    setLocationMode('edit');
    setEditingLocationId(location.id);
    setLocationForm({
      name: location.name,
      type: location.type,
    });
  };

  const handleSaveLocation = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLocationSubmitting(true);

    try {
      if (locationMode === 'create') {
        const created = await createLocation(locationForm);
        setLocations((current) => [...current, created]);
        showToast('Location created successfully.');
      } else if (editingLocationId) {
        const updated = await updateLocation(editingLocationId, locationForm);
        setLocations((current) => current.map((item) => (item.id === editingLocationId ? updated : item)));
        showToast('Location updated successfully.');
      }

      resetLocationForm();
    } catch (error) {
      console.error('Failed to save location', error);
    } finally {
      setLocationSubmitting(false);
    }
  };

  const handleDeleteLocation = async (id: string) => {
    try {
      await deleteLocation(id);
      setLocations((current) => current.filter((item) => item.id !== id));
      if (editingLocationId === id) {
        resetLocationForm();
      }
      showToast('Location deleted successfully.');
    } catch (error) {
      console.error('Failed to delete location', error);
    }
  };

  const pageTitle =
    user?.role === 'admin'
      ? 'Timetable & Events'
      : user?.role === 'faculty'
        ? 'My Timetable'
        : 'My Timetable';

  const pageDescription =
    user?.role === 'student'
      ? 'View your lecture schedule for the selected date.'
      : 'Manage lecture schedules using one shared timetable across all dashboards.';

  return (
    <div className="space-y-6">
      <Toast toast={toast} onClose={() => setToast(null)} />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">{pageTitle}</h1>
          <p className="text-gray-500">{pageDescription}</p>
        </div>
        {canManageTimetable && (
          <Button className="flex items-center gap-2" onClick={startCreateTimetable}>
            <Plus className="h-4 w-4" />
            Add Lecture
          </Button>
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-[340px,1fr]">
        <div className="space-y-6">
          <ScheduleCalendar
            selectedDate={selectedDate}
            markedDates={markedDates}
            onSelectDate={setSelectedDate}
          />

          {canManageLocations && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Classrooms & Labs</CardTitle>
                  <CardDescription>Admin can manage available rooms and labs here.</CardDescription>
                </div>
                <Button size="sm" variant="outline" onClick={startCreateLocation}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {locationMode && (
                  <form className="space-y-3 rounded-lg border border-indigo-100 bg-indigo-50/40 p-4" onSubmit={handleSaveLocation}>
                    <Input
                      value={locationForm.name}
                      onChange={(event) => setLocationForm((current) => ({ ...current, name: event.target.value }))}
                      placeholder="Room name"
                      disabled={locationSubmitting}
                    />
                    <select
                      value={locationForm.type}
                      onChange={(event) =>
                        setLocationForm((current) => ({
                          ...current,
                          type: event.target.value as 'classroom' | 'lab',
                        }))
                      }
                      disabled={locationSubmitting}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                    >
                      <option value="classroom">Classroom</option>
                      <option value="lab">Lab</option>
                    </select>
                    <div className="flex gap-3">
                      <Button type="submit" disabled={locationSubmitting}>
                        {locationSubmitting ? 'Saving...' : locationMode === 'create' ? 'Create Location' : 'Save Changes'}
                      </Button>
                      <Button type="button" variant="outline" onClick={resetLocationForm} disabled={locationSubmitting}>
                        Cancel
                      </Button>
                    </div>
                  </form>
                )}

                <div className="space-y-3">
                  {locations.map((location) => (
                    <div key={location.id} className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <p className="font-medium text-gray-900">{location.name}</p>
                        <p className="text-sm capitalize text-gray-500">{location.type}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => startEditLocation(location)}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-red-600" onClick={() => void handleDeleteLocation(location.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          {canManageTimetable && timetableMode && (
            <Card>
              <CardHeader>
                <CardTitle>{timetableMode === 'create' ? 'Add Lecture' : 'Edit Lecture'}</CardTitle>
                <CardDescription>
                  Use the same inline editor pattern as faculty management for lecture changes.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form className="space-y-4" onSubmit={handleSaveTimetable} noValidate>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">Class</label>
                      <select
                        value={timetableForm.className}
                        onChange={(event) => handleTimetableFieldChange('className', event.target.value)}
                        disabled={timetableSubmitting}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                      >
                        <option value="">Choose a class</option>
                        {allowedClassOptions.map((item) => (
                          <option key={item.label} value={item.label}>
                            {item.label}
                          </option>
                        ))}
                      </select>
                      {timetableErrors.className && <p className="text-sm text-red-600">{timetableErrors.className}</p>}
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">Subject</label>
                      <select
                        value={timetableForm.subject}
                        onChange={(event) => handleTimetableFieldChange('subject', event.target.value)}
                        disabled={timetableSubmitting}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                      >
                        <option value="">Choose a subject</option>
                        {getSubjectOptions(timetableForm.className).map((subject) => (
                          <option key={subject} value={subject}>
                            {subject}
                          </option>
                        ))}
                      </select>
                      {timetableErrors.subject && <p className="text-sm text-red-600">{timetableErrors.subject}</p>}
                    </div>

                    {user?.role === 'admin' ? (
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Faculty</label>
                        <select
                          value={timetableForm.facultyId}
                          onChange={(event) => handleTimetableFieldChange('facultyId', event.target.value)}
                          disabled={timetableSubmitting}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                        >
                          <option value="">Choose faculty</option>
                          {faculty.map((person) => (
                            <option key={person.id} value={person.id}>
                              {person.name}
                            </option>
                          ))}
                        </select>
                        {timetableErrors.facultyId && <p className="text-sm text-red-600">{timetableErrors.facultyId}</p>}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Faculty</label>
                        <Input value={user?.name ?? ''} readOnly disabled />
                      </div>
                    )}

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">Classroom / Lab</label>
                      <select
                        value={timetableForm.locationId}
                        onChange={(event) => handleTimetableFieldChange('locationId', event.target.value)}
                        disabled={timetableSubmitting}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                      >
                        <option value="">Choose a location</option>
                        {locations.map((location) => (
                          <option key={location.id} value={location.id}>
                            {location.name}
                          </option>
                        ))}
                      </select>
                      {timetableErrors.locationId && <p className="text-sm text-red-600">{timetableErrors.locationId}</p>}
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">Date</label>
                      <Input type="date" value={timetableForm.date} onChange={(event) => handleTimetableFieldChange('date', event.target.value)} disabled={timetableSubmitting} />
                      {timetableErrors.date && <p className="text-sm text-red-600">{timetableErrors.date}</p>}
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">Start Time</label>
                      <Input type="time" value={timetableForm.startTime} onChange={(event) => handleTimetableFieldChange('startTime', event.target.value)} disabled={timetableSubmitting} />
                      {timetableErrors.startTime && <p className="text-sm text-red-600">{timetableErrors.startTime}</p>}
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">End Time</label>
                      <Input type="time" value={timetableForm.endTime} onChange={(event) => handleTimetableFieldChange('endTime', event.target.value)} disabled={timetableSubmitting} />
                      {timetableErrors.endTime && <p className="text-sm text-red-600">{timetableErrors.endTime}</p>}
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button type="submit" disabled={timetableSubmitting}>
                      {timetableSubmitting ? 'Saving...' : timetableMode === 'create' ? 'Create Lecture' : 'Save Changes'}
                    </Button>
                    <Button type="button" variant="outline" onClick={resetTimetableForm} disabled={timetableSubmitting}>
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Schedule for {selectedDate}</CardTitle>
              <CardDescription>
                {user?.role === 'student'
                  ? 'Read-only lecture plan for your class.'
                  : 'Live lecture schedule shared across admin, faculty, and student views.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {entriesForSelectedDate.length === 0 ? (
                <div className="flex h-40 flex-col items-center justify-center rounded-lg border border-dashed border-gray-200 text-center">
                  <CalendarClock className="h-8 w-8 text-gray-300" />
                  <p className="mt-3 text-sm font-medium text-gray-700">No lectures scheduled</p>
                  <p className="mt-1 text-sm text-gray-500">Pick another date or add a lecture.</p>
                </div>
              ) : (
                entriesForSelectedDate.map((entry) => {
                  const location = locations.find((item) => item.id === entry.locationId);
                  const teacher = faculty.find((item) => item.id === entry.facultyId);

                  return (
                    <div key={entry.id} className="rounded-xl border bg-white p-4 shadow-sm">
                      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                        <div>
                          <p className="text-lg font-semibold text-gray-900">{entry.subject}</p>
                          <p className="mt-1 text-sm text-gray-500">
                            {entry.className} • {teacher?.name ?? 'Unknown faculty'}
                          </p>
                          <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-gray-600">
                            <span>{formatTime(entry.startTime)} - {formatTime(entry.endTime)}</span>
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="h-4 w-4 text-gray-400" />
                              {location?.name ?? 'Unknown room'}
                            </span>
                          </div>
                        </div>

                        {canManageTimetable && (
                          <div className="flex gap-2">
                            <Button variant="ghost" size="sm" onClick={() => startEditTimetable(entry)}>
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" className="text-red-600" onClick={() => void handleDeleteTimetable(entry.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
