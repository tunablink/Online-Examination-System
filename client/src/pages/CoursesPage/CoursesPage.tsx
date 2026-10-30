import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';

import FeedbackMessage, { type Feedback } from '../../components/common/FeedbackMessage';
import Icon from '../../components/common/Icon';
import type { CourseData, StudentDirectoryData } from '../../websocket/protocol';
import { useWebSocket } from '../../websocket/useWebSocket';
import { EMPTY_REGISTER_FORM, validateRegisterForm, type RegisterFormState } from '../RegisterPage/registerValidation';

interface CourseForm {
  name: string;
  subject: string;
  department: string;
  academicYear: string;
  semester: string;
  description: string;
}

const emptyCourseForm = (): CourseForm => {
  const year = new Date().getFullYear();
  return { name: '', subject: '', department: '', academicYear: `${year}-${year + 1}`, semester: 'Semester 1', description: '' };
};

const inputClass = 'h-11 w-full rounded-lg border border-[#d6e1e4] bg-[#f1f5f6] px-3.5 text-base text-[#26353a] outline-none placeholder:text-[#8c9aa0] focus:border-[#70b2be] focus:ring-4 focus:ring-[#00849a]/10';
const labelClass = 'grid gap-2 text-sm font-semibold text-[#26353a]';

const isCourse = (value: unknown): value is CourseData => {
  if (typeof value !== 'object' || value === null) return false;
  const course = value as Record<string, unknown>;
  return typeof course.id === 'number' && typeof course.teacherId === 'number'
    && typeof course.code === 'string' && typeof course.name === 'string' && typeof course.createdAt === 'string';
};

const isStudent = (value: unknown): value is StudentDirectoryData => {
  if (typeof value !== 'object' || value === null) return false;
  const student = value as Record<string, unknown>;
  return typeof student.id === 'number' && typeof student.institutionalId === 'string'
    && typeof student.fullName === 'string' && typeof student.email === 'string';
};

const validateCourse = (form: CourseForm): string | null => {
  if (!form.name.trim() || form.name.trim().length > 255) return 'Course name is required (up to 255 characters).';
  if (!form.subject.trim() || form.subject.trim().length > 120) return 'Subject is required (up to 120 characters).';
  if (form.department.trim().length > 120) return 'Department must be at most 120 characters.';
  const years = /^(\d{4})-(\d{4})$/.exec(form.academicYear.trim());
  if (!years || Number(years[2]) !== Number(years[1]) + 1) return 'Enter an academic year such as 2026-2027.';
  if (form.description.trim().length > 2000) return 'Description must be at most 2000 characters.';
  return null;
};

const readExcel = (file: File): Promise<string> => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onerror = () => reject(new Error('Could not read the Excel file.'));
  reader.onload = () => {
    const data = reader.result;
    if (typeof data !== 'string' || !data.includes(',')) reject(new Error('Could not read the Excel file.'));
    else resolve(data.slice(data.indexOf(',') + 1));
  };
  reader.readAsDataURL(file);
});

export default function CoursesPage() {
  const navigate = useNavigate();
  const { status, sendMessage } = useWebSocket();
  const [courses, setCourses] = useState<CourseData[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [members, setMembers] = useState<StudentDirectoryData[]>([]);
  const [allStudents, setAllStudents] = useState<StudentDirectoryData[]>([]);
  const [courseForm, setCourseForm] = useState<CourseForm>(emptyCourseForm);
  const [editCourse, setEditCourse] = useState<CourseData | null>(null);
  const [editForm, setEditForm] = useState<CourseForm>(emptyCourseForm);
  const [studentForm, setStudentForm] = useState<RegisterFormState>(EMPTY_REGISTER_FORM);
  const [studentDepartment, setStudentDepartment] = useState('');
  const [existingStudentId, setExistingStudentId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [memberFile, setMemberFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const memberFileRef = useRef<HTMLInputElement>(null);
  const [filter, setFilter] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const selected = courses.find((course) => course.id === selectedId && !course.archived) ?? null;

  const loadCourses = useCallback(() => {
    if (status !== 'connected') return;
    sendMessage('GET_COURSES', {}, (message) => {
      const items = message.data?.courses;
      if (message.type === 'COURSES' && Array.isArray(items) && items.every(isCourse)) setCourses(items);
      else setFeedback({ type: 'error', message: message.error?.message ?? 'Could not load courses.' });
    });
  }, [sendMessage, status]);

  const loadMembers = useCallback((courseId: number) => {
    sendMessage('GET_COURSE', { courseId }, (message) => {
      const students = message.data?.students;
      if (message.type === 'COURSE_DETAILS' && Array.isArray(students) && students.every(isStudent)) setMembers(students);
      else setFeedback({ type: 'error', message: message.error?.message ?? 'Could not load course students.' });
    });
  }, [sendMessage]);

  const loadAllStudents = useCallback(() => {
    sendMessage('GET_STUDENTS', {}, (message) => {
      const students = message.data?.students;
      if (message.type === 'STUDENTS' && Array.isArray(students) && students.every(isStudent)) setAllStudents(students);
    });
  }, [sendMessage]);

  useEffect(() => {
    if (status !== 'connected') return;
    const timer = window.setTimeout(() => { loadCourses(); loadAllStudents(); }, 0);
    return () => window.clearTimeout(timer);
  }, [status, loadCourses, loadAllStudents]);

  useEffect(() => {
    if (status !== 'connected' || selectedId === null) return;
    const timer = window.setTimeout(() => loadMembers(selectedId), 0);
    return () => window.clearTimeout(timer);
  }, [status, selectedId, loadMembers]);

  const clearCourseForm = () => {
    setCourseForm(emptyCourseForm());
    setFile(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const createCourse = async () => {
    const validation = validateCourse(courseForm);
    if (validation) { setFeedback({ type: 'error', message: validation }); return; }
    if (status !== 'connected') { setFeedback({ type: 'error', message: 'The WebSocket connection is not ready.' }); return; }
    if (file && file.size > 1024 * 1024) { setFeedback({ type: 'error', message: 'Excel file must be at most 1 MB.' }); return; }
    setPending(true);
    setFeedback(null);
    let contentBase64: string | null = null;
    try { if (file) contentBase64 = await readExcel(file); }
    catch (error) { setPending(false); setFeedback({ type: 'error', message: (error as Error).message }); return; }

    const requestId = sendMessage('CREATE_COURSE', {
      name: courseForm.name.trim(), subject: courseForm.subject.trim(), department: courseForm.department.trim(),
      academicYear: courseForm.academicYear.trim(), semester: courseForm.semester,
      description: courseForm.description.trim(),
    }, (message) => {
      if (message.type !== 'COURSE_CREATED' || !isCourse(message.data)) {
        setPending(false);
        setFeedback({ type: 'error', message: message.error?.message ?? 'Could not create course.' });
        return;
      }
      const courseId = message.data.id;
      clearCourseForm();
      loadCourses();
      if (!contentBase64) {
        setPending(false);
        setFeedback({ type: 'success', message: 'Course created.' });
        navigate(`/teacher/courses/${courseId}`);
        return;
      }
      const importRequestId = sendMessage('IMPORT_COURSE_STUDENTS', { courseId, contentBase64 }, (importMessage) => {
        setPending(false);
        loadCourses();
        loadMembers(courseId);
        loadAllStudents();
        if (importMessage.type === 'COURSE_STUDENTS_IMPORTED') {
          setFeedback({ type: 'success', message: `Course created. ${importMessage.data?.createdCount ?? 0} accounts created, ${importMessage.data?.enrolledCount ?? 0} students enrolled, ${importMessage.data?.skippedCount ?? 0} rows skipped.` });
          navigate(`/teacher/courses/${courseId}`);
        } else setFeedback({ type: 'error', message: `Course created, but Excel import failed: ${importMessage.error?.message ?? 'Unknown error.'}` });
      }, 120_000);
      if (importRequestId === null) { setPending(false); setFeedback({ type: 'error', message: 'Course created, but import request could not be sent.' }); }
    });
    if (requestId === null) { setPending(false); setFeedback({ type: 'error', message: 'The course request could not be sent.' }); }
  };

  const saveCourse = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editCourse) return;
    const validation = validateCourse(editForm);
    if (validation) { setFeedback({ type: 'error', message: validation }); return; }
    setPending(true);
    const requestId = sendMessage('UPDATE_COURSE', { courseId: editCourse.id, ...editForm }, (message) => {
      setPending(false);
      if (message.type === 'COURSE_UPDATED') {
        setEditCourse(null);
        loadCourses();
        setFeedback({ type: 'success', message: 'Course updated.' });
      } else setFeedback({ type: 'error', message: message.error?.message ?? 'Could not update course.' });
    });
    if (requestId === null) { setPending(false); setFeedback({ type: 'error', message: 'The update request could not be sent.' }); }
  };

  const toggleArchive = (course: CourseData, archived: boolean) => {
    if (archived && !window.confirm(`Archive ${course.name}?`)) return;
    setPending(true);
    const requestId = sendMessage(archived ? 'ARCHIVE_COURSE' : 'RESTORE_COURSE', { courseId: course.id }, (message) => {
      setPending(false);
      if (message.type === (archived ? 'COURSE_ARCHIVED' : 'COURSE_RESTORED')) {
        if (archived && selectedId === course.id) setSelectedId(null);
        loadCourses();
        setFeedback({ type: 'success', message: archived ? 'Course archived.' : 'Course restored.' });
      } else setFeedback({ type: 'error', message: message.error?.message ?? 'Could not update course.' });
    });
    if (requestId === null) { setPending(false); setFeedback({ type: 'error', message: 'The course request could not be sent.' }); }
  };

  const enrollExisting = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (selectedId === null || !existingStudentId) return;
    setPending(true);
    const requestId = sendMessage('ENROLL_STUDENT', { courseId: selectedId, studentId: Number(existingStudentId) }, (message) => {
      setPending(false);
      if (message.type === 'STUDENT_ENROLLED') {
        setExistingStudentId(''); loadMembers(selectedId); loadCourses();
        setFeedback({ type: 'success', message: message.data?.enrolled ? 'Student added to course.' : 'Student is already in this course.' });
      } else setFeedback({ type: 'error', message: message.error?.message ?? 'Could not add student.' });
    });
    if (requestId === null) { setPending(false); setFeedback({ type: 'error', message: 'The enrollment request could not be sent.' }); }
  };

  const createStudent = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (selectedId === null) return;
    const validation = validateRegisterForm(studentForm);
    if (validation) { setFeedback({ type: 'error', message: validation }); return; }
    if (!studentDepartment.trim()) { setFeedback({ type: 'error', message: 'Department is required.' }); return; }
    setPending(true);
    const requestId = sendMessage('CREATE_COURSE_STUDENT', {
      courseId: selectedId, institutionalId: studentForm.institutionalId.trim(), fullName: studentForm.fullName.trim(),
      email: studentForm.email.trim(), password: studentForm.password,
      confirmPassword: studentForm.confirmPassword, department: studentDepartment.trim(),
    }, (message) => {
      setPending(false);
      if (message.type === 'COURSE_STUDENT_CREATED') {
        setStudentForm(EMPTY_REGISTER_FORM); setStudentDepartment(''); loadMembers(selectedId); loadAllStudents(); loadCourses();
        setFeedback({ type: 'success', message: 'Student account created and added to course.' });
      } else setFeedback({ type: 'error', message: message.error?.message ?? 'Could not create student.' });
    });
    if (requestId === null) { setPending(false); setFeedback({ type: 'error', message: 'The student request could not be sent.' }); }
  };

  const importMembers = async () => {
    if (selectedId === null || !memberFile) return;
    if (memberFile.size > 1024 * 1024) { setFeedback({ type: 'error', message: 'Excel file must be at most 1 MB.' }); return; }
    setPending(true);
    let contentBase64: string;
    try { contentBase64 = await readExcel(memberFile); }
    catch (error) { setPending(false); setFeedback({ type: 'error', message: (error as Error).message }); return; }
    const requestId = sendMessage('IMPORT_COURSE_STUDENTS', { courseId: selectedId, contentBase64 }, (message) => {
      setPending(false);
      if (message.type === 'COURSE_STUDENTS_IMPORTED') {
        setMemberFile(null);
        if (memberFileRef.current) memberFileRef.current.value = '';
        loadMembers(selectedId); loadAllStudents(); loadCourses();
        setFeedback({ type: 'success', message: `${message.data?.createdCount ?? 0} accounts created, ${message.data?.enrolledCount ?? 0} students enrolled, ${message.data?.skippedCount ?? 0} rows skipped.` });
      } else setFeedback({ type: 'error', message: message.error?.message ?? 'Import failed.' });
    }, 120_000);
    if (requestId === null) { setPending(false); setFeedback({ type: 'error', message: 'The import request could not be sent.' }); }
  };

  const visibleCourses = courses.filter((course) => Boolean(course.archived) === showArchived
    && [course.name, course.code, course.subject ?? '', course.department ?? '']
      .some((value) => value.toLowerCase().includes(filter.trim().toLowerCase())));
  const activeCount = courses.filter((course) => !course.archived).length;

  return <div className="text-[#172126]">
    <header><h1 className="text-3xl font-bold tracking-[-.04em]">Courses</h1><p className="mt-1 text-base text-[#53646a]">Create a course, import student roster, then manage course details and examinations.</p></header>
    {feedback && <div className="mt-5"><FeedbackMessage feedback={feedback} onClose={() => setFeedback(null)} /></div>}

    <section className="mt-6 overflow-hidden rounded-xl border border-[#dce7ea] bg-white shadow-[0_12px_40px_rgba(18,55,65,.04)]">
      <div className="flex items-center justify-between gap-4 bg-[#fafcfc] px-6 py-5"><div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-lg bg-[#00778b] text-white"><Icon name="document" size={17} /></span><h2 className="text-base font-bold">Create New Course</h2></div><span className="text-sm text-[#728188]"><strong className="text-[#bd2f35]">*</strong> Mandatory fields</span></div>
      <form className="grid grid-cols-2 gap-x-5 gap-y-4 p-6 max-md:grid-cols-1" onSubmit={(event) => { event.preventDefault(); void createCourse(); }}>
        <label className={`${labelClass} col-span-2 max-md:col-span-1`}><span className="inline-flex items-baseline gap-1">Course Name <strong className="text-[#bd2f35]">*</strong></span><input className={inputClass} maxLength={255} onChange={(event) => setCourseForm((current) => ({ ...current, name: event.target.value }))} placeholder="e.g. Mathematics or Advanced Algorithms" required value={courseForm.name} /></label>
        <label className={labelClass}><span className="inline-flex items-baseline gap-1">Subject <strong className="text-[#bd2f35]">*</strong></span><input className={inputClass} maxLength={120} onChange={(event) => setCourseForm((current) => ({ ...current, subject: event.target.value }))} placeholder="e.g. Mathematics" required value={courseForm.subject} /></label>
        <label className={labelClass}>Department<input className={inputClass} maxLength={120} onChange={(event) => setCourseForm((current) => ({ ...current, department: event.target.value }))} placeholder="e.g. Computer Science" value={courseForm.department} /></label>
        <label className={labelClass}><span className="inline-flex items-baseline gap-1">Academic Year <strong className="text-[#bd2f35]">*</strong></span><input className={inputClass} onChange={(event) => setCourseForm((current) => ({ ...current, academicYear: event.target.value }))} placeholder="2026-2027" required value={courseForm.academicYear} /></label>
        <label className={labelClass}>Semester<select className={inputClass} onChange={(event) => setCourseForm((current) => ({ ...current, semester: event.target.value }))} value={courseForm.semester}><option>Semester 1</option><option>Semester 2</option><option>Summer</option></select></label>
        <label className={`${labelClass} col-span-2 max-md:col-span-1`}>Description<textarea className={`${inputClass} h-20 resize-y py-3`} maxLength={2000} onChange={(event) => setCourseForm((current) => ({ ...current, description: event.target.value }))} placeholder="e.g. Mathematics course for IT department. Covers discrete math, logic and algebra." value={courseForm.description} /></label>

        <div className="col-span-2 mt-2 max-md:col-span-1"><h3 className="text-base font-semibold">Import students from Excel</h3><p className="mt-2 text-sm leading-5 text-[#53646a]">Use the first worksheet of an .xlsx file. Row 1 must contain studentId, fullName, email, password, confirmPassword, department. Format all columns as text. Maximum 500 students and 1 MB. Invalid or duplicate rows are skipped; valid accounts are created.</p><div className="mt-3 flex flex-wrap items-center gap-3"><label className={`inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm font-semibold ${file ? 'border-[#70b2be] bg-[#eef9fa] text-[#00778b]' : 'border-[#d5e0e3] bg-[#f1f5f6] text-[#405057]'}`}><Icon name="document" size={13} />Choose File<input ref={fileRef} accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" aria-label="Course roster Excel file" className="sr-only" onChange={(event) => setFile(event.target.files?.[0] ?? null)} type="file" /></label><span className="max-w-[220px] truncate text-sm text-[#849197]">{file?.name ?? 'No file chosen'}</span><button className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#00778b] px-4 text-sm font-semibold text-white disabled:bg-[#e4ebed] disabled:text-[#53646a]" disabled={!file || pending || status !== 'connected'} onClick={() => void createCourse()} type="button"><Icon name="document" size={13} />Import Excel</button></div></div>
        <div className="col-span-2 mt-1 flex justify-end gap-2 border-t border-[#e7edef] pt-4 max-md:col-span-1"><button className="h-10 rounded-lg bg-[#eef2f3] px-5 text-sm font-semibold text-[#26353a]" disabled={pending} onClick={clearCourseForm} type="button">Clear form</button><button className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#00778b] px-5 text-sm font-semibold text-white disabled:bg-[#a8bec3]" disabled={pending || status !== 'connected'} type="submit"><Icon name="plus" size={15} />{pending ? 'Creating…' : 'Create course'}</button></div>
      </form>
    </section>

    <section className="mt-7"><div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2"><h2 className="text-[20px] font-bold tracking-[-.04em]">Created Courses</h2><span className="rounded-full bg-[#d5edf5] px-3 py-1 text-sm text-[#3f6874]">{activeCount} Courses</span></div><div className="flex items-center gap-3"><label className="relative"><Icon className="absolute left-3 top-1/2 -translate-y-1/2 text-[#829096]" name="search" size={13} /><input aria-label="Filter courses" className="h-9 w-[220px] rounded-lg border border-[#dce7ea] bg-white pl-9 pr-3 text-sm outline-none placeholder:text-[#849197]" onChange={(event) => setFilter(event.target.value)} placeholder="Filter courses or codes..." value={filter} /></label><button className={`h-9 rounded-lg border px-4 text-sm ${showArchived ? 'border-[#70b2be] bg-[#e8f4f7] text-[#00778b]' : 'border-[#dce7ea] bg-white text-[#53646a]'}`} onClick={() => setShowArchived((value) => !value)} type="button">{showArchived ? 'Active courses' : 'Archived'}</button></div></div>
      <div className="mt-4 grid grid-cols-3 gap-5 max-xl:grid-cols-2 max-md:grid-cols-1">
        {visibleCourses.map((course) => <article className="flex min-h-[260px] flex-col rounded-xl border border-[#dce7ea] bg-white p-5 shadow-[0_5px_20px_rgba(18,55,65,.04)]" key={course.id}><div className="flex items-center justify-between gap-3"><span className="rounded-full bg-[#eaf0f2] px-3 py-1 text-sm font-bold text-[#00778b]">{course.code}</span><span className="max-w-[55%] truncate rounded-full bg-[#d5edf5] px-3 py-1 text-sm text-[#3f6874]">{course.subject || 'Course'}</span></div><h3 className="mt-5 min-h-[44px] text-base font-bold leading-snug">{course.name}</h3><div className="mt-4 grid grid-cols-2 divide-x divide-[#dce7ea] rounded-xl bg-[#f5f9fa] py-3"><div className="flex items-center gap-2 px-3"><span className="grid h-8 w-8 place-items-center rounded-lg bg-white text-[#00778b]"><Icon name="users" size={15} /></span><span><strong className="block text-sm">{course.studentCount ?? 0} Students</strong><small className="text-sm text-[#849197]">Enrolled</small></span></div><div className="flex items-center gap-2 px-3"><span className="grid h-8 w-8 place-items-center rounded-lg bg-white text-[#a96b1f]"><Icon name="document" size={15} /></span><span><strong className="block text-sm">{course.examCount ?? 0} Exams</strong><small className="text-sm text-[#849197]">Active</small></span></div></div><div className="mt-auto flex items-center justify-between gap-2 pt-6"><Link className={`inline-flex items-center gap-1 text-sm font-semibold text-[#00778b] ${course.archived ? 'pointer-events-none opacity-40' : ''}`} to={`/teacher/courses/${course.id}`}>View Course &amp; Exams <Icon name="arrow-right" size={13} /></Link><div className="flex gap-2">{course.archived ? <button className="rounded-lg border border-[#e1e8ea] px-3 py-2 text-sm text-[#00778b]" disabled={pending} onClick={() => toggleArchive(course, false)} type="button">Restore</button> : <><button aria-label={`Edit ${course.name}`} className="grid h-8 w-8 place-items-center rounded-lg border border-[#e1e8ea] text-[#405057]" disabled={pending} onClick={() => { setEditCourse(course); setEditForm({ name: course.name, subject: course.subject ?? '', department: course.department ?? '', academicYear: course.academicYear ?? emptyCourseForm().academicYear, semester: course.semester ?? 'Semester 1', description: course.description ?? '' }); }} type="button"><Icon name="edit" size={14} /></button><button aria-label={`Archive ${course.name}`} className="grid h-8 w-8 place-items-center rounded-lg border border-[#e1e8ea] text-[#405057]" disabled={pending} onClick={() => toggleArchive(course, true)} type="button"><Icon name="trash" size={14} /></button></>}</div></div></article>)}
      </div>
      {visibleCourses.length === 0 && <p className="mt-4 rounded-xl border border-[#dce7ea] bg-white p-8 text-center text-base text-[#718087]">{showArchived ? 'No archived courses.' : 'No courses found.'}</p>}
    </section>

    {selected && <section className="mt-7 grid gap-4 rounded-xl border border-[#dce7ea] bg-white p-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-sm font-bold text-[#00778b]">{selected.code}</p><h2 className="mt-1 text-[20px] font-bold">{selected.name}</h2><p className="mt-1 text-sm text-[#718087]">{selected.subject ?? 'Course'} · {selected.academicYear ?? 'Academic year not set'} · {selected.semester ?? 'Semester not set'}</p>{selected.description && <p className="mt-2 text-sm text-[#53646a]">{selected.description}</p>}</div><Link className="rounded-lg bg-[#00778b] px-4 py-2.5 text-sm font-semibold text-white" to={`/teacher/exams/new?courseId=${selected.id}`}>Create exam</Link></div><div className="border-t border-[#edf1f2] pt-4"><h3 className="text-base font-bold">Students in course ({members.length})</h3><div className="mt-3 grid gap-2">{members.map((student) => <div className="flex flex-wrap justify-between gap-2 border-b border-[#edf1f2] pb-2 text-sm" key={student.id}><span>{student.fullName} · {student.institutionalId}</span><span className="text-[#718087]">{student.email}</span></div>)}{members.length === 0 && <p className="text-sm text-[#718087]">No students enrolled.</p>}</div></div>
      <div className="grid grid-cols-2 gap-5 border-t border-[#edf1f2] pt-4 max-lg:grid-cols-1"><section><h3 className="text-base font-bold">Add existing student</h3><form className="mt-3 flex gap-2" onSubmit={enrollExisting}><select aria-label="Existing student" className={inputClass} onChange={(event) => setExistingStudentId(event.target.value)} value={existingStudentId}><option value="">Select a student</option>{allStudents.filter((student) => !members.some((member) => member.id === student.id)).map((student) => <option key={student.id} value={student.id}>{student.fullName} ({student.institutionalId})</option>)}</select><button className="rounded-lg bg-[#00778b] px-4 text-sm font-semibold text-white disabled:opacity-50" disabled={pending || !existingStudentId} type="submit">Add</button></form></section><section><h3 className="text-base font-bold">Import Excel into this course</h3><div className="mt-3 flex flex-wrap items-center gap-2"><input ref={memberFileRef} accept=".xlsx" aria-label="Course student Excel file" className="text-sm" onChange={(event) => setMemberFile(event.target.files?.[0] ?? null)} type="file" /><button className="h-9 rounded-lg bg-[#00778b] px-4 text-sm font-semibold text-white disabled:bg-[#a8bec3]" disabled={pending || !memberFile} onClick={() => void importMembers()} type="button">Import Excel</button></div></section></div>
      <section className="border-t border-[#edf1f2] pt-4"><h3 className="text-base font-bold">Create student in course</h3><form className="mt-3 grid grid-cols-2 gap-3 max-sm:grid-cols-1" onSubmit={createStudent}>{(['fullName', 'institutionalId', 'email', 'password', 'confirmPassword'] as const).map((name) => <label className="grid gap-1 text-sm" key={name}><span>{name === 'institutionalId' ? 'Student ID' : name}</span><input className={inputClass} onChange={(event) => setStudentForm((current) => ({ ...current, [name]: event.target.value }))} type={name.toLowerCase().includes('password') ? 'password' : name === 'email' ? 'email' : 'text'} value={studentForm[name]} /></label>)}<label className="grid gap-1 text-sm"><span>Department</span><input className={inputClass} maxLength={120} onChange={(event) => setStudentDepartment(event.target.value)} value={studentDepartment} /></label><button className="col-span-2 h-10 rounded-lg bg-[#00778b] text-sm font-semibold text-white disabled:opacity-50 max-sm:col-span-1" disabled={pending} type="submit">Create and add student</button></form></section>
    </section>}

    {editCourse && <div className="fixed inset-0 z-50 grid place-items-center bg-[#172126]/50 p-4"><section aria-label="Edit course" aria-modal="true" className="max-h-[90vh] w-full max-w-[600px] overflow-y-auto rounded-xl bg-white p-6 shadow-xl" role="dialog"><h2 className="text-xl font-bold">Edit course</h2><p className="mt-1 text-sm text-[#718087]">{editCourse.code}</p><form className="mt-5 grid grid-cols-2 gap-4 max-sm:grid-cols-1" onSubmit={saveCourse}><label className={`${labelClass} col-span-2 max-sm:col-span-1`}>Course Name<input className={inputClass} onChange={(event) => setEditForm((current) => ({ ...current, name: event.target.value }))} required value={editForm.name} /></label><label className={labelClass}>Subject<input className={inputClass} onChange={(event) => setEditForm((current) => ({ ...current, subject: event.target.value }))} required value={editForm.subject} /></label><label className={labelClass}>Department<input className={inputClass} onChange={(event) => setEditForm((current) => ({ ...current, department: event.target.value }))} value={editForm.department} /></label><label className={labelClass}>Academic Year<input className={inputClass} onChange={(event) => setEditForm((current) => ({ ...current, academicYear: event.target.value }))} required value={editForm.academicYear} /></label><label className={labelClass}>Semester<select className={inputClass} onChange={(event) => setEditForm((current) => ({ ...current, semester: event.target.value }))} value={editForm.semester}><option>Semester 1</option><option>Semester 2</option><option>Summer</option></select></label><label className={`${labelClass} col-span-2 max-sm:col-span-1`}>Description<textarea className={`${inputClass} h-20 py-3`} onChange={(event) => setEditForm((current) => ({ ...current, description: event.target.value }))} value={editForm.description} /></label><div className="col-span-2 flex justify-end gap-2 border-t border-[#e7edef] pt-4 max-sm:col-span-1"><button className="h-9 rounded-lg border border-[#dce7ea] px-4 text-sm" disabled={pending} onClick={() => setEditCourse(null)} type="button">Cancel</button><button className="h-9 rounded-lg bg-[#00778b] px-4 text-sm font-semibold text-white" disabled={pending || status !== 'connected'} type="submit">Save changes</button></div></form></section></div>}
  </div>;
}
