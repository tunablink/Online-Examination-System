import type {
  QuestionEditorQuestion,
} from '../types/questionEditor';

export const MOCK_EDITOR_QUESTIONS:
  QuestionEditorQuestion[] = [
    {
      id: 'editor-question-001',

      content:
        'Which Java collection prevents duplicate elements?',

      points: 1,

      choices: [
        {
          id: 'editor-choice-001-a',
          content: 'ArrayList',
          correct: false,
        },
        {
          id: 'editor-choice-001-b',
          content: 'HashSet',
          correct: true,
        },
        {
          id: 'editor-choice-001-c',
          content: 'LinkedList',
          correct: false,
        },
        {
          id: 'editor-choice-001-d',
          content: 'ArrayDeque',
          correct: false,
        },
      ],
    },

    {
      id: 'editor-question-002',

      content:
        'Which Java utility is designed for thread-safe key-value access with high concurrency?',

      points: 2,

      choices: [
        {
          id: 'editor-choice-002-a',
          content: 'HashMap',
          correct: false,
        },
        {
          id: 'editor-choice-002-b',
          content: 'TreeMap',
          correct: false,
        },
        {
          id: 'editor-choice-002-c',
          content: 'ConcurrentHashMap',
          correct: true,
        },
        {
          id: 'editor-choice-002-d',
          content: 'WeakHashMap',
          correct: false,
        },
      ],
    },

    {
      id: 'editor-question-003',

      content:
        'Which interface represents a task that returns a result and may throw an exception?',

      points: 1,

      choices: [
        {
          id: 'editor-choice-003-a',
          content: 'Runnable',
          correct: false,
        },
        {
          id: 'editor-choice-003-b',
          content: 'Callable',
          correct: true,
        },
        {
          id: 'editor-choice-003-c',
          content: 'Consumer',
          correct: false,
        },
        {
          id: 'editor-choice-003-d',
          content: 'Observer',
          correct: false,
        },
      ],
    },
  ];