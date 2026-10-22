import type {
  ExamEditorForm,
  ExamEditorValidationErrors,
} from '../../types/examEditor';

const EXAM_CODE_PATTERN =
  /^[A-Za-z0-9_-]{3,40}$/;

const COURSE_CODE_PATTERN =
  /^[A-Za-z0-9_-]{2,20}$/;

export function validateExamEditorForm(
  form: ExamEditorForm,
): ExamEditorValidationErrors {
  const errors:
    ExamEditorValidationErrors = {};

  const normalizedTitle =
    form.title.trim();

  const normalizedExamCode =
    form.examCode.trim();

  const normalizedCourseCode =
    form.courseCode.trim();

  const normalizedCourseName =
    form.courseName.trim();

  if (normalizedTitle.length < 5) {
    errors.title =
      'The examination title must contain at least 5 characters.';
  } else if (
    normalizedTitle.length > 255
  ) {
    errors.title =
      'The examination title must not exceed 255 characters.';
  }

  if (
    !EXAM_CODE_PATTERN.test(
      normalizedExamCode,
    )
  ) {
    errors.examCode =
      'Use 3-40 letters, numbers, underscores, or hyphens.';
  }

  if (
    !COURSE_CODE_PATTERN.test(
      normalizedCourseCode,
    )
  ) {
    errors.courseCode =
      'Use 2-20 letters, numbers, underscores, or hyphens.';
  }

  if (
    normalizedCourseName.length < 2
  ) {
    errors.courseName =
      'The course name is required.';
  } else if (
    normalizedCourseName.length > 255
  ) {
    errors.courseName =
      'The course name must not exceed 255 characters.';
  }

  if (form.startsAt.length === 0) {
    errors.startsAt =
      'Select the examination start time.';
  }

  if (form.endsAt.length === 0) {
    errors.endsAt =
      'Select the examination closing time.';
  }

  if (
    form.startsAt.length > 0 &&
    form.endsAt.length > 0
  ) {
    const startTime =
      new Date(form.startsAt);

    const endTime =
      new Date(form.endsAt);

    if (
      Number.isNaN(
        startTime.getTime(),
      )
    ) {
      errors.startsAt =
        'The start time is invalid.';
    }

    if (
      Number.isNaN(
        endTime.getTime(),
      )
    ) {
      errors.endsAt =
        'The closing time is invalid.';
    }

    if (
      !Number.isNaN(
        startTime.getTime(),
      ) &&
      !Number.isNaN(
        endTime.getTime(),
      ) &&
      endTime <= startTime
    ) {
      errors.endsAt =
        'The closing time must be later than the start time.';
    }
  }

  const durationMinutes =
    Number(form.durationMinutes);

  if (
    !Number.isInteger(
      durationMinutes,
    ) ||
    durationMinutes < 1 ||
    durationMinutes > 480
  ) {
    errors.durationMinutes =
      'Duration must be a whole number between 1 and 480 minutes.';
  }

  const passingPercentage =
    Number(form.passingPercentage);

  if (
    !Number.isFinite(
      passingPercentage,
    ) ||
    passingPercentage < 0 ||
    passingPercentage > 100
  ) {
    errors.passingPercentage =
      'Passing percentage must be between 0 and 100.';
  }

  return errors;
}

export function hasValidationErrors(
  errors:
    ExamEditorValidationErrors,
): boolean {
  return Object.keys(errors).length > 0;
}