import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router';

import FeedbackMessage, { type Feedback } from '../../components/common/FeedbackMessage';
import Icon from '../../components/common/Icon';
import type { CourseData, CourseStatisticsData, ServerExam, StudentDirectoryData } from '../../websocket/protocol';
import { useWebSocket } from '../../websocket/useWebSocket';
import { EMPTY_REGISTER_FORM, validateRegisterForm, type RegisterFormState } from '../RegisterPage/registerValidation';

type Tab = 'exams' | 'students';
type ExamFilter = 'ALL' | 'DRAFT' | 'PUBLISHED' | 'CLOSED';
type CourseForm = Pick<CourseData, 'name' | 'subject' | 'department' | 'academicYear' | 'semester' | 'description'>;

const inputClass = 'h-10 w-full rounded-lg border border-[#d6e1e4] bg-[#f1f5f6] px-3 text-sm text-[#26353a] outline-none placeholder:text-[#8c9aa0] focus:border-[#70b2be] focus:ring-4 focus:ring-[#00849a]/10';
const labelClass = 'grid gap-1.5 text-sm font-semibold text-[#26353a]';
const mutedButton = 'inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-[#edf2f3] px-3 text-sm font-semibold text-[#405057] hover:bg-[#e1eaed] disabled:opacity-50';

function isCourse(value: unknown): value is CourseData {
  if (!value || typeof value !== 'object') return false;
  const item = value as Record<string, unknown>;
  return typeof item.id === 'number' && typeof item.name === 'string' && typeof item.code === 'string';
}

function isStudent(value: unknown): value is StudentDirectoryData {
  if (!value || typeof value !== 'object') return false;
  const item = value as Record<string, unknown>;
  return typeof item.id === 'number' && typeof item.username === 'string'
    && typeof item.fullName === 'string' && typeof item.email === 'string';
}

function isExam(value: unknown): value is ServerExam {
  if (!value || typeof value !== 'object') return false;
  const item = value as Record<string, unknown>;
  return typeof item.id === 'number' && typeof item.title === 'string'
    && typeof item.durationMinutes === 'number' && (typeof item.courseId === 'number' || item.courseId === null)
    && (item.status === 'DRAFT' || item.status === 'PUBLISHED' || item.status === 'CLOSED');
}

function formatDate(value: string | null | undefined): string {
  if (!value) return 'Not scheduled';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Not scheduled' : new Intl.DateTimeFormat('en-GB', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(date);
}

function schedule(exam: ServerExam): string {
  if (!exam.scheduledAt) return 'Not scheduled';
  const start = new Date(exam.scheduledAt);
  if (Number.isNaN(start.getTime())) return 'Not scheduled';
  return `${formatDate(exam.scheduledAt)} – ${exam.entryClosesAt ? formatDate(exam.entryClosesAt) : 'No entry closing time configured'}`;
}

function formFromCourse(course: CourseData): CourseForm {
  return {
    name: course.name, subject: course.subject ?? '', department: course.department ?? '',
    academicYear: course.academicYear ?? '', semester: course.semester ?? 'Semester 1',
    description: course.description ?? '',
  };
}

function readExcel(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read the Excel file.'));
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== 'string' || !result.includes(',')) reject(new Error('Could not read the Excel file.'));
      else resolve(result.slice(result.indexOf(',') + 1));
    };
    reader.readAsDataURL(file);
  });
}

export default function CourseDetailPage() {
  const { courseId } = useParams();
  const id = Number(courseId);
  const validId = Number.isSafeInteger(id) && id > 0;
  const { status, sendMessage } = useWebSocket();
  const [course, setCourse] = useState<CourseData | null>(null);
  const [students, setStudents] = useState<StudentDirectoryData[]>([]);
  const [allStudents, setAllStudents] = useState<StudentDirectoryData[]>([]);
  const [exams, setExams] = useState<ServerExam[]>([]);
  const [statistics, setStatistics] = useState<CourseStatisticsData | null>(null);
  const [tab, setTab] = useState<Tab>('exams');
  const [query, setQuery] = useState('');
  const [examFilter, setExamFilter] = useState<ExamFilter>('ALL');
  const [studentQuery, setStudentQuery] = useState('');
  const [existingStudentId, setExistingStudentId] = useState('');
  const [studentForm, setStudentForm] = useState<RegisterFormState>(EMPTY_REGISTER_FORM);
  const [department, setDepartment] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const studentSection = useRef<HTMLDivElement>(null);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<CourseForm | null>(null);
  const [pending, setPending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const loadCourse = useCallback(() => {
    if (!validId || status !== 'connected') return;
    setLoading(true);
    const requestId = sendMessage('GET_COURSE', { courseId: id }, (message) => {
      setLoading(false);
      const item = message.data?.course;
      const members = message.data?.students;
      if (message.type === 'COURSE_DETAILS' && isCourse(item) && Array.isArray(members) && members.every(isStudent)) {
        setCourse(item);
        setStudents(members);
        setStatistics(message.data?.statistics ?? null);
      } else setFeedback({ type: 'error', message: message.error?.message ?? 'Could not load course details.' });
    });
    if (requestId === null) {
      setLoading(false);
      setFeedback({ type: 'error', message: 'The course request could not be sent.' });
    }
  }, [id, sendMessage, status, validId]);

  const loadExams = useCallback(() => {
    if (status !== 'connected') return;
    sendMessage('GET_TEACHER_EXAMS', {}, (message) => {
      const items = message.data?.exams;
      if (message.type === 'TEACHER_EXAMS' && Array.isArray(items) && items.every(isExam)) {
        setExams(items.filter((exam: ServerExam) => exam.courseId === id));
      } else setFeedback({ type: 'error', message: message.error?.message ?? 'Could not load examinations.' });
    });
  }, [id, sendMessage, status]);

  const loadStudents = useCallback(() => {
    if (status !== 'connected') return;
    sendMessage('GET_STUDENTS', {}, (message) => {
      const items = message.data?.students;
      if (message.type === 'STUDENTS' && Array.isArray(items) && items.every(isStudent)) setAllStudents(items);
    });
  }, [sendMessage, status]);

  useEffect(() => {
    if (!validId) return;
    if (status !== 'connected') return;
    const timer = window.setTimeout(() => { loadCourse(); loadExams(); loadStudents(); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadCourse, loadExams, loadStudents, status, validId]);

  const showStudents = () => {
    setTab('students');
    window.setTimeout(() => studentSection.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
  };

  const saveCourse = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editForm || !course) return;
    if (!editForm.name?.trim() || !editForm.subject?.trim() || !/^\d{4}-\d{4}$/.test(editForm.academicYear ?? '')) {
      setFeedback({ type: 'error', message: 'Course name, subject and academic year are required.' }); return;
    }
    setPending(true);
    const requestId = sendMessage('UPDATE_COURSE', { courseId: id, ...editForm }, (message) => {
      setPending(false);
      if (message.type === 'COURSE_UPDATED') {
        setEditing(false); loadCourse(); setFeedback({ type: 'success', message: 'Course information updated.' });
      } else setFeedback({ type: 'error', message: message.error?.message ?? 'Could not update course.' });
    });
    if (requestId === null) { setPending(false); setFeedback({ type: 'error', message: 'The update request could not be sent.' }); }
  };

  const enrollExisting = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!existingStudentId) return;
    setPending(true);
    const requestId = sendMessage('ENROLL_STUDENT', { courseId: id, studentId: Number(existingStudentId) }, (message) => {
      setPending(false);
      if (message.type === 'STUDENT_ENROLLED') {
        setExistingStudentId(''); loadCourse();
        setFeedback({ type: 'success', message: message.data?.enrolled ? 'Student added to course.' : 'Student is already enrolled.' });
      } else setFeedback({ type: 'error', message: message.error?.message ?? 'Could not add student.' });
    });
    if (requestId === null) { setPending(false); setFeedback({ type: 'error', message: 'The enrollment request could not be sent.' }); }
  };

  const createStudent = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const error = validateRegisterForm(studentForm);
    if (error || !department.trim()) {
      setFeedback({ type: 'error', message: error ?? 'Department is required.' }); return;
    }
    setPending(true);
    const requestId = sendMessage('CREATE_COURSE_STUDENT', {
      courseId: id, username: studentForm.username.trim(), fullName: studentForm.fullName.trim(),
      email: studentForm.email.trim(), password: studentForm.password,
      confirmPassword: studentForm.confirmPassword, department: department.trim(),
    }, (message) => {
      setPending(false);
      if (message.type === 'COURSE_STUDENT_CREATED') {
        setStudentForm(EMPTY_REGISTER_FORM); setDepartment(''); loadCourse(); loadStudents();
        setFeedback({ type: 'success', message: 'Student account created and added to course.' });
      } else setFeedback({ type: 'error', message: message.error?.message ?? 'Could not create student.' });
    });
    if (requestId === null) { setPending(false); setFeedback({ type: 'error', message: 'The student request could not be sent.' }); }
  };

  const importStudents = async () => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.xlsx') || file.size > 1024 * 1024) {
      setFeedback({ type: 'error', message: 'Choose an .xlsx file of at most 1 MB.' }); return;
    }
    setPending(true);
    try {
      const contentBase64 = await readExcel(file);
      const requestId = sendMessage('IMPORT_COURSE_STUDENTS', { courseId: id, contentBase64 }, (message) => {
        setPending(false);
        if (message.type === 'COURSE_STUDENTS_IMPORTED') {
          setFile(null);
          if (fileRef.current) fileRef.current.value = '';
          loadCourse(); loadStudents();
          setFeedback({ type: 'success', message: `${message.data?.createdCount ?? 0} accounts created, ${message.data?.enrolledCount ?? 0} students enrolled, ${message.data?.skippedCount ?? 0} rows skipped.` });
        } else setFeedback({ type: 'error', message: message.error?.message ?? 'Import failed.' });
      }, 120_000);
      if (requestId === null) { setPending(false); setFeedback({ type: 'error', message: 'The import request could not be sent.' }); }
    } catch (error) {
      setPending(false); setFeedback({ type: 'error', message: (error as Error).message });
    }
  };

  const deleteDraft = (exam: ServerExam) => {
    if (exam.status !== 'DRAFT' || !window.confirm(`Delete draft exam “${exam.title}”?`)) return;
    setPending(true);
    const requestId = sendMessage('DELETE_EXAM', { examId: exam.id }, (message) => {
      setPending(false);
      if (message.type === 'EXAM_DELETED' && message.data?.examId === exam.id) {
        loadExams(); loadCourse(); setFeedback({ type: 'success', message: 'Draft examination deleted.' });
      } else setFeedback({ type: 'error', message: message.error?.message ?? 'Could not delete exam.' });
    });
    if (requestId === null) { setPending(false); setFeedback({ type: 'error', message: 'The delete request could not be sent.' }); }
  };

  const visibleExams = exams.filter((exam) => (examFilter === 'ALL' || exam.status === examFilter)
    && `${exam.title} ${exam.id}`.toLowerCase().includes(query.trim().toLowerCase()));
  const visibleStudents = students.filter((student) => `${student.fullName} ${student.username} ${student.email}`.toLowerCase().includes(studentQuery.trim().toLowerCase()));

  if (!validId) return <p className="rounded-xl border border-[#dce7ea] bg-white p-6 text-base">Invalid course ID. <Link className="text-[#00778b]" to="/teacher/courses">Back to courses</Link></p>;

  return <div className="text-[#172126]">
    <nav aria-label="Breadcrumb" className="mb-5 flex items-center gap-1 text-sm text-[#718087]"><Link className="hover:text-[#00778b]" to="/teacher/courses">Courses</Link><span>›</span><span className="truncate font-semibold text-[#26353a]">{course?.name ?? 'Course details'}</span></nav>
    {feedback && <div className="mb-4"><FeedbackMessage feedback={feedback} onClose={() => setFeedback(null)} /></div>}
    {loading && !course && <section className="rounded-xl border border-[#dce7ea] bg-white p-8 text-base text-[#718087]">Loading course through WebSocket…</section>}
    {!loading && !course && <section className="rounded-xl border border-[#dce7ea] bg-white p-8 text-base text-[#718087]">Course could not be loaded.</section>}
    {course && <>
      <section className="rounded-xl border border-[#dce7ea] bg-white p-6 shadow-[0_8px_28px_rgba(18,55,65,.04)]">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="min-w-0 flex-1"><p className="text-sm font-bold uppercase tracking-[.1em] text-[#00778b]">{course.code}</p><h1 className="mt-1 text-[25px] font-bold tracking-[-.04em]">{course.name}</h1><p className="mt-1 text-sm text-[#718087]">{[course.subject, course.department, course.academicYear, course.semester].filter(Boolean).join(' · ')}</p><p className="mt-2 max-w-[850px] text-base leading-5 text-[#53646a]">{course.description || 'No course description yet.'}</p></div>
          <div className="grid gap-2 max-sm:w-full"><button className={mutedButton} onClick={() => { setEditForm(formFromCourse(course)); setEditing(true); }} type="button"><Icon name="edit" size={14} />Edit Course Info</button><button className={mutedButton} onClick={showStudents} type="button"><Icon name="users" size={14} />+ Add / Import Students</button></div>
        </div>
        <div className="mt-5 grid grid-cols-3 gap-3 max-md:grid-cols-1">
          <div className="flex items-center gap-3 rounded-lg bg-[#f1f5f6] p-4"><span className="grid h-10 w-10 place-items-center rounded-lg bg-[#d5edf5] text-[#00778b]"><Icon name="users" size={19} /></span><div><p className="text-sm uppercase tracking-wide text-[#718087]">Enrolled students</p><p className="text-2xl font-bold leading-tight">{students.length}<span className="ml-1 text-sm font-normal text-[#53646a]">Accounts</span></p></div></div>
          <div className="flex items-center gap-3 rounded-lg bg-[#f1f5f6] p-4"><span className="grid h-10 w-10 place-items-center rounded-lg bg-[#d5edf5] text-[#00778b]"><Icon name="calendar" size={19} /></span><div><p className="text-sm uppercase tracking-wide text-[#718087]">Scheduled exams</p><p className="text-2xl font-bold leading-tight">{exams.length}<span className="ml-1 text-sm font-normal text-[#53646a]">Total</span></p></div></div>
          <div className="flex items-center gap-3 rounded-lg bg-[#f1f5f6] p-4"><span className="grid h-10 w-10 place-items-center rounded-lg bg-[#fff0e4] text-[#a96b1f]"><Icon name="activity" size={19} /></span><div><p className="text-sm uppercase tracking-wide text-[#718087]">Average score</p><p className="text-2xl font-bold leading-tight">{statistics?.averageScorePercent == null ? '—' : `${statistics.averageScorePercent.toFixed(1)}%`}<span className="ml-1 text-sm font-normal text-[#53646a]">{statistics?.averageScorePercent == null ? 'No graded results' : 'Class Avg'}</span></p></div></div>
        </div>
      </section>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3"><div className="inline-flex rounded-lg bg-[#eaf0f2] p-1"><button className={`flex h-9 items-center gap-2 rounded-md px-3 text-sm font-semibold ${tab === 'exams' ? 'bg-white text-[#00778b] shadow-sm' : 'text-[#53646a]'}`} onClick={() => setTab('exams')} type="button"><Icon name="document" size={15} />Examinations <span className="rounded-full bg-[#d5edf5] px-2 text-sm">{exams.length}</span></button><button className={`flex h-9 items-center gap-2 rounded-md px-3 text-sm font-semibold ${tab === 'students' ? 'bg-white text-[#00778b] shadow-sm' : 'text-[#53646a]'}`} onClick={() => setTab('students')} type="button"><Icon name="users" size={15} />Enrolled Students <span className="rounded-full bg-[#d5edf5] px-2 text-sm">{students.length}</span></button></div><p className="flex items-center gap-2 text-sm text-[#718087]"><span className={`h-2 w-2 rounded-full ${status === 'connected' ? 'bg-[#00778b]' : 'bg-[#a8bec3]'}`} />{status === 'connected' ? 'Examination server connected' : 'Reconnecting to server'}</p></div>

      {tab === 'exams' && <section className="mt-5">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#dce7ea] bg-white p-4"><h2 className="text-base font-bold">Course Examination Schedule</h2><div className="flex flex-wrap gap-2"><label className="relative"><Icon className="absolute left-3 top-1/2 -translate-y-1/2 text-[#829096]" name="search" size={14} /><input className="h-9 w-[230px] rounded-lg bg-[#f1f5f6] pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-[#00849a]/20" onChange={(event) => setQuery(event.target.value)} placeholder="Filter exam title..." value={query} /></label><select aria-label="Filter exam status" className="h-9 rounded-lg bg-[#f1f5f6] px-3 text-sm font-semibold outline-none" onChange={(event) => setExamFilter(event.target.value as ExamFilter)} value={examFilter}><option value="ALL">All Statuses</option><option value="DRAFT">Draft</option><option value="PUBLISHED">Published</option><option value="CLOSED">Closed</option></select></div></div>
        <div className="mt-3 grid gap-2">{visibleExams.map((exam) => { const metrics = statistics?.exams.find((item) => item.examId === exam.id); return <article className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[#dce7ea] bg-white p-4" key={exam.id}><div className="min-w-0"><p className="flex items-center gap-2 text-sm font-semibold"><span className={`h-2 w-2 rounded-full ${exam.status === 'PUBLISHED' ? 'bg-[#00778b]' : 'bg-[#849197]'}`} />{exam.status === 'DRAFT' ? 'Upcoming · Draft' : exam.status === 'PUBLISHED' ? 'Published' : 'Closed'}<span className="font-mono text-xs font-normal tracking-wide text-[#849197]">CODE: EX-{String(exam.id).padStart(4, '0')}</span></p><h3 className="mt-1 text-base font-bold">{exam.title}</h3><p className="mt-2 flex items-center gap-1 text-sm text-[#405057]"><Icon className="text-[#00778b]" name="clock" size={14} />Entry window: {schedule(exam)}</p><p className="mt-1 flex flex-wrap items-center gap-3 text-sm text-[#718087]"><span>{exam.durationMinutes} Mins</span><span>{metrics ? `${metrics.questionCount} Questions` : 'Questions unavailable'}</span><span>{metrics ? `${metrics.submissionCount} Submissions` : 'Submissions unavailable'}</span></p></div><div className="flex items-center gap-1">{exam.status === 'PUBLISHED' ? <Link className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#00778b] px-3 text-sm font-semibold text-white" to={`/teacher/monitoring/${exam.id}`}><Icon name="monitor" size={13} />Live Monitor</Link> : <Link className={mutedButton} to={`/teacher/exams/${exam.id}`}><Icon name="eye" size={13} />Preview Test</Link>}<Link aria-label={`Manage ${exam.title}`} className={mutedButton} to={`/teacher/exams/${exam.id}`}><Icon name="edit" size={14} /></Link>{exam.status === 'DRAFT' && <button aria-label={`Delete ${exam.title}`} className={`${mutedButton} text-[#bd2f35]`} disabled={pending || status !== 'connected'} onClick={() => deleteDraft(exam)} type="button"><Icon name="trash" size={14} /></button>}</div></article>; })}{visibleExams.length === 0 && <div className="rounded-xl border border-[#dce7ea] bg-white p-8 text-center text-sm text-[#718087]">No examinations match this filter.</div>}</div>
        <Link className="mt-4 inline-flex h-10 items-center gap-2 rounded-lg bg-[#00778b] px-4 text-sm font-semibold text-white" to={`/teacher/exams/new?courseId=${id}`}><Icon name="plus" size={15} />Create exam in this course</Link>
      </section>}

      {tab === 'students' && <section className="mt-5 grid gap-4" ref={studentSection}>
        <div className="rounded-xl border border-[#dce7ea] bg-white"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e7edef] p-4"><div><h2 className="text-base font-bold">Enrolled Students</h2><p className="mt-1 text-sm text-[#718087]">{students.length} student accounts in this course</p></div><label className="relative"><Icon className="absolute left-3 top-1/2 -translate-y-1/2 text-[#829096]" name="search" size={14} /><input className="h-9 w-[260px] rounded-lg bg-[#f1f5f6] pl-9 pr-3 text-sm outline-none" onChange={(event) => setStudentQuery(event.target.value)} placeholder="Search name, ID, or email..." value={studentQuery} /></label></div><div className="overflow-x-auto"><table className="w-full min-w-[560px] text-left text-sm"><thead className="bg-[#f1f5f6] text-xs uppercase text-[#718087]"><tr><th className="px-4 py-3">Student name</th><th className="px-4 py-3">Student ID</th><th className="px-4 py-3">Email</th></tr></thead><tbody>{visibleStudents.map((student) => <tr className="border-t border-[#edf1f2]" key={student.id}><td className="px-4 py-3 font-semibold">{student.fullName}</td><td className="px-4 py-3">{student.username}</td><td className="px-4 py-3 text-[#53646a]">{student.email}</td></tr>)}{visibleStudents.length === 0 && <tr><td className="px-4 py-7 text-center text-[#718087]" colSpan={3}>No students found.</td></tr>}</tbody></table></div></div>
        <div className="grid grid-cols-2 gap-4 max-md:grid-cols-1"><form className="rounded-xl border border-[#dce7ea] bg-white p-5" onSubmit={enrollExisting}><h3 className="text-base font-bold">Add existing student</h3><p className="mt-1 text-sm text-[#718087]">A student can be enrolled in more than one course.</p><div className="mt-4 flex gap-2"><select aria-label="Existing student" className={inputClass} onChange={(event) => setExistingStudentId(event.target.value)} value={existingStudentId}><option value="">Select a student</option>{allStudents.filter((student) => !students.some((member) => member.id === student.id)).map((student) => <option key={student.id} value={student.id}>{student.fullName} ({student.username})</option>)}</select><button className="rounded-lg bg-[#00778b] px-4 text-sm font-semibold text-white disabled:opacity-50" disabled={!existingStudentId || pending || status !== 'connected'} type="submit">Add</button></div></form><div className="rounded-xl border border-[#dce7ea] bg-white p-5"><h3 className="text-base font-bold">Import Excel into this course</h3><p className="mt-1 text-sm leading-5 text-[#718087]">First worksheet: studentId, fullName, email, password, confirmPassword, department. Maximum 500 rows and 1 MB; valid rows are imported.</p><div className="mt-3 flex flex-wrap items-center gap-2"><label className={`inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border px-3 text-sm font-semibold ${file ? 'border-[#70b2be] bg-[#eef9fa] text-[#00778b]' : 'border-[#d5e0e3] bg-[#f1f5f6] text-[#405057]'}`}><Icon name="document" size={13} />Choose File<input ref={fileRef} accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" aria-label="Course student Excel file" className="sr-only" onChange={(event) => setFile(event.target.files?.[0] ?? null)} type="file" /></label><span className="max-w-[130px] truncate text-sm text-[#849197]">{file?.name ?? 'No file chosen'}</span><button className="h-9 rounded-lg bg-[#00778b] px-3 text-sm font-semibold text-white disabled:bg-[#a8bec3]" disabled={!file || pending || status !== 'connected'} onClick={() => void importStudents()} type="button">Import Excel</button></div></div></div>
        <form className="rounded-xl border border-[#dce7ea] bg-white p-5" onSubmit={createStudent}><h3 className="text-base font-bold">Create student in course</h3><div className="mt-4 grid grid-cols-2 gap-4 max-sm:grid-cols-1">{(['fullName', 'username', 'email', 'password', 'confirmPassword'] as const).map((name) => <label className={labelClass} key={name}>{name === 'username' ? 'Student ID' : name === 'fullName' ? 'Full name' : name === 'email' ? 'Institutional email' : name === 'confirmPassword' ? 'Confirm password' : 'Password'}<input className={inputClass} onChange={(event) => setStudentForm((current) => ({ ...current, [name]: event.target.value }))} required type={name.toLowerCase().includes('password') ? 'password' : name === 'email' ? 'email' : 'text'} value={studentForm[name]} /></label>)}<label className={labelClass}>Department<input className={inputClass} onChange={(event) => setDepartment(event.target.value)} required value={department} /></label></div><div className="mt-5 flex justify-end border-t border-[#e7edef] pt-4"><button className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#00778b] px-4 text-sm font-semibold text-white disabled:opacity-50" disabled={pending || status !== 'connected'} type="submit"><Icon name="plus" size={14} />Create and add student</button></div></form>
      </section>}

      {editing && editForm && <div className="fixed inset-0 z-50 grid place-items-center bg-[#172126]/50 p-4"><section aria-label="Edit course" aria-modal="true" className="max-h-[90vh] w-full max-w-[600px] overflow-y-auto rounded-xl bg-white p-6 shadow-xl" role="dialog"><h2 className="text-xl font-bold">Edit Course Info</h2><p className="mt-1 text-sm text-[#718087]">{course.code}</p><form className="mt-5 grid grid-cols-2 gap-4 max-sm:grid-cols-1" onSubmit={saveCourse}>{(['name', 'subject', 'department', 'academicYear', 'semester', 'description'] as const).map((name) => <label className={`${labelClass} ${name === 'name' || name === 'description' ? 'col-span-2 max-sm:col-span-1' : ''}`} key={name}>{name === 'academicYear' ? 'Academic Year' : name === 'name' ? 'Course Name' : name.charAt(0).toUpperCase() + name.slice(1)}{name === 'semester' ? <select className={inputClass} onChange={(event) => setEditForm((current) => current && ({ ...current, semester: event.target.value }))} value={editForm.semester ?? ''}><option>Semester 1</option><option>Semester 2</option><option>Summer</option></select> : name === 'description' ? <textarea className={`${inputClass} h-20 py-2`} onChange={(event) => setEditForm((current) => current && ({ ...current, description: event.target.value }))} value={editForm.description ?? ''} /> : <input className={inputClass} onChange={(event) => setEditForm((current) => current && ({ ...current, [name]: event.target.value }))} required={name === 'name' || name === 'subject' || name === 'academicYear'} value={editForm[name] ?? ''} />}</label>)}<div className="col-span-2 flex justify-end gap-2 border-t border-[#e7edef] pt-4 max-sm:col-span-1"><button className={mutedButton} onClick={() => setEditing(false)} type="button">Cancel</button><button className="h-9 rounded-lg bg-[#00778b] px-4 text-sm font-semibold text-white disabled:opacity-50" disabled={pending || status !== 'connected'} type="submit">Save changes</button></div></form></section></div>}
    </>}
  </div>;
}
