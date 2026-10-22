import type {
  AttemptHistoryItem,
  ExamResult,
} from '../types/result';

export const MOCK_EXAM_RESULTS: ExamResult[] = [
  {
    id: 'result-web-001',
    examId: 'exam-web-001',
    attemptId: 'attempt-web-001',

    examTitle:
      'Web Application Development Quiz',
    examCode: 'WEB-QUIZ-04',
    courseCode: 'WEB302',
    courseName:
      'Web Application Development',

    submittedAt:
      '2026-10-10T08:41:32+07:00',

    durationSpentSeconds:
      41 * 60 + 32,

    score: 17,
    totalScore: 20,

    correctAnswerCount: 17,
    totalQuestionCount: 20,

    passingScore: 10,
    outcome: 'PASSED',
  },

  {
    id: 'result-oop-001',
    examId: 'exam-oop-001',
    attemptId: 'attempt-oop-001',

    examTitle:
      'Object-Oriented Programming Assessment',
    examCode: 'OOP-FINAL-01',
    courseCode: 'OOP201',
    courseName:
      'Object-Oriented Programming',

    submittedAt:
      '2026-09-28T10:12:18+07:00',

    durationSpentSeconds:
      68 * 60 + 18,

    score: 31,
    totalScore: 40,

    correctAnswerCount: 31,
    totalQuestionCount: 40,

    passingScore: 20,
    outcome: 'PASSED',
  },

  {
    id: 'result-algorithm-001',
    examId: 'exam-algorithm-001',
    attemptId: 'attempt-algorithm-001',

    examTitle:
      'Data Structures and Algorithms Quiz',
    examCode: 'DSA-QUIZ-02',
    courseCode: 'DSA202',
    courseName:
      'Data Structures and Algorithms',

    submittedAt:
      '2026-09-17T14:33:09+07:00',

    durationSpentSeconds:
      38 * 60 + 9,

    score: 8,
    totalScore: 20,

    correctAnswerCount: 8,
    totalQuestionCount: 20,

    passingScore: 10,
    outcome: 'FAILED',
  },
];

export const MOCK_ATTEMPT_HISTORY: AttemptHistoryItem[] = [
  {
    attemptId: 'attempt-security-001',
    examId: 'exam-security-001',

    examTitle:
      'Information Security Assessment',
    examCode: 'SEC-QUIZ-03',
    courseCode: 'SEC301',
    courseName: 'Information Security',

    submittedAt:
      '2026-10-15T10:02:45+07:00',

    status: 'AWAITING_RESULT',
  },

  ...MOCK_EXAM_RESULTS.map(
    (result): AttemptHistoryItem => ({
      attemptId: result.attemptId,
      examId: result.examId,

      examTitle: result.examTitle,
      examCode: result.examCode,
      courseCode: result.courseCode,
      courseName: result.courseName,

      submittedAt: result.submittedAt,

      status: 'RESULT_RELEASED',

      score: result.score,
      totalScore: result.totalScore,
      outcome: result.outcome,
    }),
  ),
];