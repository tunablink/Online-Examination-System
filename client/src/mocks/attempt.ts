import type { ExamAttempt } from '../types/attempt';

export const MOCK_EXAM_ATTEMPT: ExamAttempt = {
  id: 'attempt-java-001',
  examId: 'exam-java-001',

  examTitle: 'Java Software Development Midterm',
  examCode: 'JSD-MIDTERM-01',
  courseCode: 'JSD301',

  startedAt: new Date().toISOString(),

  /*
   * Mock 45 minutes.
   * Sau này giá trị authoritative sẽ đến từ Java server.
   */
  durationSeconds: 45 * 60,

  questions: [
    {
      id: 'question-001',
      content:
        'Which Java collection is designed to prevent duplicate elements?',
      points: 1,
      choices: [
        {
          id: 'choice-001-a',
          content: 'ArrayList',
        },
        {
          id: 'choice-001-b',
          content: 'HashSet',
        },
        {
          id: 'choice-001-c',
          content: 'LinkedList',
        },
        {
          id: 'choice-001-d',
          content: 'ArrayDeque',
        },
      ],
    },

    {
      id: 'question-002',
      content:
        'Which keyword prevents a class from being inherited in Java?',
      points: 1,
      choices: [
        {
          id: 'choice-002-a',
          content: 'static',
        },
        {
          id: 'choice-002-b',
          content: 'private',
        },
        {
          id: 'choice-002-c',
          content: 'final',
        },
        {
          id: 'choice-002-d',
          content: 'protected',
        },
      ],
    },

    {
      id: 'question-003',
      content:
        'Which interface is commonly used to represent a task that returns a result and may throw an exception?',
      points: 1,
      choices: [
        {
          id: 'choice-003-a',
          content: 'Runnable',
        },
        {
          id: 'choice-003-b',
          content: 'Callable',
        },
        {
          id: 'choice-003-c',
          content: 'Consumer',
        },
        {
          id: 'choice-003-d',
          content: 'Observer',
        },
      ],
    },

    {
      id: 'question-004',
      content:
        'Which class provides a thread-safe hash-based map implementation?',
      points: 1,
      choices: [
        {
          id: 'choice-004-a',
          content: 'TreeMap',
        },
        {
          id: 'choice-004-b',
          content: 'LinkedHashMap',
        },
        {
          id: 'choice-004-c',
          content: 'WeakHashMap',
        },
        {
          id: 'choice-004-d',
          content: 'ConcurrentHashMap',
        },
      ],
    },

    {
      id: 'question-005',
      content:
        'What is the primary purpose of a database transaction?',
      points: 1,
      choices: [
        {
          id: 'choice-005-a',
          content:
            'To make every query run on a separate thread',
        },
        {
          id: 'choice-005-b',
          content:
            'To group operations into one consistent unit of work',
        },
        {
          id: 'choice-005-c',
          content:
            'To convert SQL automatically into Java code',
        },
        {
          id: 'choice-005-d',
          content:
            'To prevent applications from using indexes',
        },
      ],
    },
  ],
};