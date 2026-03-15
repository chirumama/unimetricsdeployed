create table if not exists public.academic_years (
  id text primary key,
  year text not null,
  is_active boolean not null
);

create table if not exists public.academic_classes (
  id text primary key,
  academic_year_id text not null references public.academic_years(id) on delete cascade,
  name text not null,
  divisions jsonb not null default '[]'::jsonb,
  total_students integer not null default 0,
  subjects jsonb not null default '[]'::jsonb,
  faculty_id text
);

create table if not exists public.faculty (
  id text primary key,
  name text not null,
  username text not null unique,
  password text not null,
  dob text,
  subjects jsonb not null default '[]'::jsonb,
  classes jsonb not null default '[]'::jsonb
);

create table if not exists public.students (
  id text primary key,
  name text not null,
  username text not null unique,
  password text not null,
  class_name text not null,
  roll_no text not null,
  fee_paid numeric not null default 0
);

create table if not exists public.locations (
  id text primary key,
  name text not null,
  type text not null check (type in ('classroom', 'lab'))
);

create table if not exists public.timetable_entries (
  id text primary key,
  class_name text not null,
  subject text not null,
  faculty_id text not null,
  location_id text not null,
  date text not null,
  start_time text not null,
  end_time text not null
);

create table if not exists public.attendance_sessions (
  id text primary key,
  timetable_entry_id text not null,
  class_name text not null,
  subject text not null,
  faculty_id text not null,
  date text not null,
  punch_in_enabled boolean not null default false
);

create table if not exists public.attendance_records (
  session_id text not null references public.attendance_sessions(id) on delete cascade,
  student_id text not null,
  status text not null check (status in ('present', 'absent', 'late')),
  primary key (session_id, student_id)
);

create table if not exists public.finance_revenues (
  id text primary key,
  title text not null,
  category text not null,
  amount numeric not null,
  received_on text not null,
  note text
);

create table if not exists public.finance_expenses (
  id text primary key,
  title text not null,
  category text not null,
  amount numeric not null,
  paid_to text not null,
  due_date text not null,
  frequency text not null,
  note text
);

create table if not exists public.notices (
  id text primary key,
  title text not null,
  message text not null,
  author_id text not null,
  author_name text not null,
  author_role text not null check (author_role in ('admin', 'faculty')),
  target_scope text not null check (target_scope in ('all', 'class')),
  class_names jsonb not null default '[]'::jsonb,
  subject text,
  created_at timestamptz not null,
  updated_at timestamptz not null
);

create table if not exists public.doubts_feedback (
  id text primary key,
  type text not null check (type in ('doubt', 'feedback')),
  title text not null,
  message text not null,
  student_id text not null,
  student_name text not null,
  class_name text not null,
  teacher_id text not null,
  teacher_name text not null,
  subject text,
  created_at timestamptz not null
);

create table if not exists public.result_subjects (
  id text primary key,
  course_code text not null,
  course_title text not null,
  class_name text not null,
  semester integer not null,
  faculty_id text not null,
  credits integer not null,
  published boolean not null default false
);

create table if not exists public.result_marks (
  id text primary key,
  student_id text not null,
  subject_id text not null references public.result_subjects(id) on delete cascade,
  internal_max integer not null,
  internal_marks integer not null,
  external_max integer not null,
  external_marks integer not null,
  total_marks integer not null,
  grade text not null,
  grade_points integer not null,
  credits integer not null,
  credit_grade_points integer not null,
  published boolean not null default false,
  faculty_id text not null,
  semester integer not null,
  class_name text not null
);

insert into public.academic_years (id, year, is_active)
select
  payload->'academicYear'->>'id',
  payload->'academicYear'->>'year',
  coalesce((payload->'academicYear'->>'isActive')::boolean, false)
from public.app_state
where id = 'unimetric'
on conflict (id) do update
set year = excluded.year,
    is_active = excluded.is_active;

insert into public.academic_classes (id, academic_year_id, name, divisions, total_students, subjects, faculty_id)
select
  class_item->>'id',
  payload->'academicYear'->>'id',
  class_item->>'name',
  coalesce(class_item->'divisions', '[]'::jsonb),
  coalesce((class_item->>'totalStudents')::integer, 0),
  coalesce(class_item->'subjects', '[]'::jsonb),
  nullif(class_item->>'facultyId', '')
from public.app_state
cross join lateral jsonb_array_elements(payload->'academicYear'->'classes') as class_item
where id = 'unimetric'
on conflict (id) do update
set academic_year_id = excluded.academic_year_id,
    name = excluded.name,
    divisions = excluded.divisions,
    total_students = excluded.total_students,
    subjects = excluded.subjects,
    faculty_id = excluded.faculty_id;

insert into public.faculty (id, name, username, password, dob, subjects, classes)
select
  item->>'id',
  item->>'name',
  item->>'username',
  coalesce(item->>'password', '12345678'),
  item->>'dob',
  coalesce(item->'subjects', '[]'::jsonb),
  coalesce(item->'classes', '[]'::jsonb)
from public.app_state
cross join lateral jsonb_array_elements(payload->'faculty') as item
where id = 'unimetric'
on conflict (id) do update
set name = excluded.name,
    username = excluded.username,
    password = excluded.password,
    dob = excluded.dob,
    subjects = excluded.subjects,
    classes = excluded.classes;

insert into public.students (id, name, username, password, class_name, roll_no, fee_paid)
select
  item->>'id',
  item->>'name',
  item->>'username',
  coalesce(item->>'password', '12345678'),
  item->>'class',
  item->>'rollNo',
  coalesce((item->>'feePaid')::numeric, 0)
from public.app_state
cross join lateral jsonb_array_elements(payload->'students') as item
where id = 'unimetric'
on conflict (id) do update
set name = excluded.name,
    username = excluded.username,
    password = excluded.password,
    class_name = excluded.class_name,
    roll_no = excluded.roll_no,
    fee_paid = excluded.fee_paid;

insert into public.locations (id, name, type)
select
  item->>'id',
  item->>'name',
  item->>'type'
from public.app_state
cross join lateral jsonb_array_elements(payload->'locations') as item
where id = 'unimetric'
on conflict (id) do update
set name = excluded.name,
    type = excluded.type;

insert into public.timetable_entries (id, class_name, subject, faculty_id, location_id, date, start_time, end_time)
select
  item->>'id',
  item->>'className',
  item->>'subject',
  item->>'facultyId',
  item->>'locationId',
  item->>'date',
  item->>'startTime',
  item->>'endTime'
from public.app_state
cross join lateral jsonb_array_elements(payload->'timetable') as item
where id = 'unimetric'
on conflict (id) do update
set class_name = excluded.class_name,
    subject = excluded.subject,
    faculty_id = excluded.faculty_id,
    location_id = excluded.location_id,
    date = excluded.date,
    start_time = excluded.start_time,
    end_time = excluded.end_time;

insert into public.attendance_sessions (id, timetable_entry_id, class_name, subject, faculty_id, date, punch_in_enabled)
select
  item->>'id',
  item->>'timetableEntryId',
  item->>'className',
  item->>'subject',
  item->>'facultyId',
  item->>'date',
  coalesce((item->>'punchInEnabled')::boolean, false)
from public.app_state
cross join lateral jsonb_array_elements(payload->'attendance') as item
where id = 'unimetric'
on conflict (id) do update
set timetable_entry_id = excluded.timetable_entry_id,
    class_name = excluded.class_name,
    subject = excluded.subject,
    faculty_id = excluded.faculty_id,
    date = excluded.date,
    punch_in_enabled = excluded.punch_in_enabled;

delete from public.attendance_records
where session_id in (
  select item->>'id'
  from public.app_state
  cross join lateral jsonb_array_elements(payload->'attendance') as item
  where id = 'unimetric'
);

insert into public.attendance_records (session_id, student_id, status)
select
  session_item->>'id',
  record_item->>'studentId',
  record_item->>'status'
from public.app_state
cross join lateral jsonb_array_elements(payload->'attendance') as session_item
cross join lateral jsonb_array_elements(session_item->'records') as record_item
where id = 'unimetric'
on conflict (session_id, student_id) do update
set status = excluded.status;

insert into public.finance_revenues (id, title, category, amount, received_on, note)
select
  item->>'id',
  item->>'title',
  item->>'category',
  coalesce((item->>'amount')::numeric, 0),
  item->>'receivedOn',
  item->>'note'
from public.app_state
cross join lateral jsonb_array_elements(payload->'finance'->'revenues') as item
where id = 'unimetric'
on conflict (id) do update
set title = excluded.title,
    category = excluded.category,
    amount = excluded.amount,
    received_on = excluded.received_on,
    note = excluded.note;

insert into public.finance_expenses (id, title, category, amount, paid_to, due_date, frequency, note)
select
  item->>'id',
  item->>'title',
  item->>'category',
  coalesce((item->>'amount')::numeric, 0),
  item->>'paidTo',
  item->>'dueDate',
  item->>'frequency',
  item->>'note'
from public.app_state
cross join lateral jsonb_array_elements(payload->'finance'->'expenses') as item
where id = 'unimetric'
on conflict (id) do update
set title = excluded.title,
    category = excluded.category,
    amount = excluded.amount,
    paid_to = excluded.paid_to,
    due_date = excluded.due_date,
    frequency = excluded.frequency,
    note = excluded.note;

insert into public.notices (id, title, message, author_id, author_name, author_role, target_scope, class_names, subject, created_at, updated_at)
select
  item->>'id',
  item->>'title',
  item->>'message',
  item->>'authorId',
  item->>'authorName',
  item->>'authorRole',
  item->>'targetScope',
  coalesce(item->'classNames', '[]'::jsonb),
  item->>'subject',
  (item->>'createdAt')::timestamptz,
  (item->>'updatedAt')::timestamptz
from public.app_state
cross join lateral jsonb_array_elements(payload->'notices') as item
where id = 'unimetric'
on conflict (id) do update
set title = excluded.title,
    message = excluded.message,
    author_id = excluded.author_id,
    author_name = excluded.author_name,
    author_role = excluded.author_role,
    target_scope = excluded.target_scope,
    class_names = excluded.class_names,
    subject = excluded.subject,
    created_at = excluded.created_at,
    updated_at = excluded.updated_at;

insert into public.doubts_feedback (id, type, title, message, student_id, student_name, class_name, teacher_id, teacher_name, subject, created_at)
select
  item->>'id',
  item->>'type',
  item->>'title',
  item->>'message',
  item->>'studentId',
  item->>'studentName',
  item->>'className',
  item->>'teacherId',
  item->>'teacherName',
  item->>'subject',
  (item->>'createdAt')::timestamptz
from public.app_state
cross join lateral jsonb_array_elements(payload->'doubts') as item
where id = 'unimetric'
on conflict (id) do update
set type = excluded.type,
    title = excluded.title,
    message = excluded.message,
    student_id = excluded.student_id,
    student_name = excluded.student_name,
    class_name = excluded.class_name,
    teacher_id = excluded.teacher_id,
    teacher_name = excluded.teacher_name,
    subject = excluded.subject,
    created_at = excluded.created_at;

insert into public.result_subjects (id, course_code, course_title, class_name, semester, faculty_id, credits, published)
select
  item->>'id',
  item->>'courseCode',
  item->>'courseTitle',
  item->>'className',
  coalesce((item->>'semester')::integer, 0),
  item->>'facultyId',
  coalesce((item->>'credits')::integer, 0),
  coalesce((item->>'published')::boolean, false)
from public.app_state
cross join lateral jsonb_array_elements(payload->'resultSubjects') as item
where id = 'unimetric'
on conflict (id) do update
set course_code = excluded.course_code,
    course_title = excluded.course_title,
    class_name = excluded.class_name,
    semester = excluded.semester,
    faculty_id = excluded.faculty_id,
    credits = excluded.credits,
    published = excluded.published;

insert into public.result_marks (id, student_id, subject_id, internal_max, internal_marks, external_max, external_marks, total_marks, grade, grade_points, credits, credit_grade_points, published, faculty_id, semester, class_name)
select
  item->>'id',
  item->>'studentId',
  item->>'subjectId',
  coalesce((item->>'internalMax')::integer, 0),
  coalesce((item->>'internalMarks')::integer, 0),
  coalesce((item->>'externalMax')::integer, 0),
  coalesce((item->>'externalMarks')::integer, 0),
  coalesce((item->>'totalMarks')::integer, 0),
  item->>'grade',
  coalesce((item->>'gradePoints')::integer, 0),
  coalesce((item->>'credits')::integer, 0),
  coalesce((item->>'creditGradePoints')::integer, 0),
  coalesce((item->>'published')::boolean, false),
  item->>'facultyId',
  coalesce((item->>'semester')::integer, 0),
  item->>'className'
from public.app_state
cross join lateral jsonb_array_elements(payload->'resultMarks') as item
where id = 'unimetric'
on conflict (id) do update
set student_id = excluded.student_id,
    subject_id = excluded.subject_id,
    internal_max = excluded.internal_max,
    internal_marks = excluded.internal_marks,
    external_max = excluded.external_max,
    external_marks = excluded.external_marks,
    total_marks = excluded.total_marks,
    grade = excluded.grade,
    grade_points = excluded.grade_points,
    credits = excluded.credits,
    credit_grade_points = excluded.credit_grade_points,
    published = excluded.published,
    faculty_id = excluded.faculty_id,
    semester = excluded.semester,
    class_name = excluded.class_name;
