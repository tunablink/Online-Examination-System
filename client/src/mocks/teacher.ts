import type { TeacherExam, TeacherProfile } from "../types/teacher";

export const MOCK_TEACHER: TeacherProfile = {
  id: 2,
  institutionalId: "lecturer01",
  fullName: "Dr. Minh Tran",
  email: "minh.tran@sis.edu.vn",
  staffId: "GV-JSD-001",
};

export const MOCK_TEACHER_EXAMS: TeacherExam[] = [
  {
    id: "exam-java-001",
    examCode: "JSD-MIDTERM-01",

    title: "Java Software Development Midterm",
    courseCode: "JSD301",
    courseName: "Java Software Development",

    description:
      "Midterm assessment covering Java collections, OOP, exception handling, concurrency, JDBC, and application design.",

    status: "PUBLISHED",

    startsAt: "2026-10-21T15:30:00+07:00",

    endsAt: "2026-10-21T17:30:00+07:00",

    durationMinutes: 90,
    questionCount: 40,

    assignedStudentCount: 64,
    activeAttemptCount: 42,
    submittedAttemptCount: 12,

    suspiciousActivityCount: 7,

    configuration: {
      passingPercentage: 50,

      resultReleasePolicy: "AFTER_EXAM_CLOSES",

      randomizeQuestionOrder: true,
      randomizeChoiceOrder: true,

      monitorTabVisibility: true,
      monitorWindowFocus: true,
      monitorFullscreenExit: true,
      monitorConnectionChanges: true,
    },
  },

  {
    id: "exam-concurrency-001",
    examCode: "JSD-LAB-04",

    title: "Java Concurrency Laboratory Assessment",
    courseCode: "JSD301",
    courseName: "Java Software Development",

    description:
      "Midterm assessment covering Java collections, OOP, exception handling, concurrency, JDBC, and application design.",

    status: "DRAFT",

    startsAt: "2026-10-27T13:30:00+07:00",

    endsAt: "2026-10-27T16:30:00+07:00",

    durationMinutes: 120,
    questionCount: 18,

    assignedStudentCount: 0,
    activeAttemptCount: 0,
    submittedAttemptCount: 0,

    configuration: {
      passingPercentage: 50,

      resultReleasePolicy: "AFTER_EXAM_CLOSES",

      randomizeQuestionOrder: true,
      randomizeChoiceOrder: true,

      monitorTabVisibility: true,
      monitorWindowFocus: true,
      monitorFullscreenExit: true,
      monitorConnectionChanges: true,
    },

    suspiciousActivityCount: 0,
  },

  {
    id: "exam-oop-001",
    examCode: "OOP-FINAL-01",

    title: "Object-Oriented Programming Final",
    courseCode: "OOP201",
    courseName: "Object-Oriented Programming",

    description:
      "Final assessment covering encapsulation, inheritance, polymorphism, abstraction, SOLID principles, and design patterns.",

    status: "CLOSED",

    startsAt: "2026-09-28T08:30:00+07:00",

    endsAt: "2026-09-28T11:00:00+07:00",

    durationMinutes: 90,
    questionCount: 40,

    assignedStudentCount: 58,
    activeAttemptCount: 0,
    submittedAttemptCount: 56,

    suspiciousActivityCount: 4,

    configuration: {
      passingPercentage: 50,

      resultReleasePolicy: "MANUAL",

      randomizeQuestionOrder: true,
      randomizeChoiceOrder: true,

      monitorTabVisibility: true,
      monitorWindowFocus: true,
      monitorFullscreenExit: true,
      monitorConnectionChanges: true,
    },
  },

  {
    id: "exam-patterns-001",
    examCode: "SWE-QUIZ-02",

    title: "Software Design Patterns Quiz",
    courseCode: "SWE302",
    courseName: "Software Engineering",

    description:
      "Short assessment covering creational, structural, and behavioral software design patterns.",
    status: "PUBLISHED",

    startsAt: "2026-10-25T09:00:00+07:00",

    endsAt: "2026-10-25T11:00:00+07:00",

    durationMinutes: 60,
    questionCount: 25,

    assignedStudentCount: 46,
    activeAttemptCount: 0,
    submittedAttemptCount: 0,

    suspiciousActivityCount: 0,

    configuration: {
      passingPercentage: 50,

      resultReleasePolicy: "AFTER_EXAM_CLOSES",

      randomizeQuestionOrder: true,
      randomizeChoiceOrder: true,

      monitorTabVisibility: true,
      monitorWindowFocus: true,
      monitorFullscreenExit: false,
      monitorConnectionChanges: true,
    },
  },
];
