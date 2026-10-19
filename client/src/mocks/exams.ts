import type {
  StudentExam,
  StudentProfile,
} from '../types/exam';

export const MOCK_STUDENT: StudentProfile = {
  id: 1,
  studentId: '22010482',
  username: 'student01',
  fullName: 'Alex Nguyen',
  email: 'alex.22010482@sis.edu.vn',
};

export const MOCK_STUDENT_EXAMS: StudentExam[] = [
  {
    id: 'exam-java-001',
    examCode: 'JSD-MIDTERM-01',

    title: 'Java Software Development Midterm',
    courseCode: 'JSD301',
    courseName: 'Java Software Development',

    startsAt: '2026-10-19T15:30:00+07:00',
    endsAt: '2026-10-19T17:30:00+07:00',

    durationMinutes: 90,
    questionCount: 40,

    status: 'AVAILABLE',
  },

  {
    id: 'exam-database-001',
    examCode: 'DBS-FINAL-01',

    title: 'Database Systems Final Examination',
    courseCode: 'DBS202',
    courseName: 'Database Systems',

    startsAt: '2026-10-21T08:00:00+07:00',
    endsAt: '2026-10-21T10:00:00+07:00',

    durationMinutes: 90,
    questionCount: 50,

    status: 'UPCOMING',
  },

  {
    id: 'exam-network-001',
    examCode: 'NET-MIDTERM-02',

    title: 'Computer Networks Midterm',
    courseCode: 'NET201',
    courseName: 'Computer Networks',

    startsAt: '2026-10-24T13:30:00+07:00',
    endsAt: '2026-10-24T15:30:00+07:00',

    durationMinutes: 60,
    questionCount: 30,

    status: 'UPCOMING',
  },

  {
    id: 'exam-security-001',
    examCode: 'SEC-QUIZ-03',

    title: 'Information Security Assessment',
    courseCode: 'SEC301',
    courseName: 'Information Security',

    startsAt: '2026-10-15T09:00:00+07:00',
    endsAt: '2026-10-15T10:30:00+07:00',

    durationMinutes: 60,
    questionCount: 25,

    status: 'SUBMITTED',
  },

  {
    id: 'exam-web-001',
    examCode: 'WEB-QUIZ-04',

    title: 'Web Application Development Quiz',
    courseCode: 'WEB302',
    courseName: 'Web Application Development',

    startsAt: '2026-10-10T08:00:00+07:00',
    endsAt: '2026-10-10T09:00:00+07:00',

    durationMinutes: 45,
    questionCount: 20,

    status: 'RESULT_RELEASED',

    score: 17,
    totalScore: 20,
  },
];