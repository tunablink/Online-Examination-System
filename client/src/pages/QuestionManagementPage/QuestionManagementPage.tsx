import {
  useState,
} from 'react';

import {
  Link,
  useParams,
} from 'react-router';

import FeedbackMessage, {
  type Feedback,
} from '../../components/common/FeedbackMessage';

import {
  MOCK_EDITOR_QUESTIONS,
} from '../../mocks/questionEditor';

import {
  MOCK_TEACHER_EXAMS,
} from '../../mocks/teacher';

import type {
  QuestionEditorQuestion,
} from '../../types/questionEditor';

import PublishReadinessPanel from './components/PublishReadinessPanel';
import QuestionEditorForm from './components/QuestionEditorForm';
import QuestionListItem from './components/QuestionListItem';

function QuestionManagementPage() {
  const { examId } = useParams<{
    examId: string;
  }>();

  const existingExam =
    MOCK_TEACHER_EXAMS.find(
      (exam) => exam.id === examId,
    );

  const [questions, setQuestions] =
    useState<
      QuestionEditorQuestion[]
    >(() =>
      MOCK_EDITOR_QUESTIONS.map(
        (question) => ({
          ...question,
          choices:
            question.choices.map(
              (choice) => ({
                ...choice,
              }),
            ),
        }),
      ),
    );

  const [
    editingQuestionId,
    setEditingQuestionId,
  ] = useState<string | null>(
    null,
  );

  const [
    pendingDeleteQuestion,
    setPendingDeleteQuestion,
  ] =
    useState<
      QuestionEditorQuestion | null
    >(null);

  const [feedback, setFeedback] =
    useState<Feedback | null>(null);

  const [
    isPublished,
    setIsPublished,
  ] = useState(false);

  const editingQuestion =
    questions.find(
      (question) =>
        question.id ===
        editingQuestionId,
    ) ?? null;

  const examTitle =
    existingExam?.title ??
    'New draft examination';

  const examCode =
    existingExam?.examCode ??
    examId ??
    'draft';

  const handleSaveQuestion = (
    savedQuestion:
      QuestionEditorQuestion,
  ) => {
    setQuestions(
      (currentQuestions) => {
        const questionExists =
          currentQuestions.some(
            (question) =>
              question.id ===
              savedQuestion.id,
          );

        if (questionExists) {
          return currentQuestions.map(
            (question) =>
              question.id ===
              savedQuestion.id
                ? savedQuestion
                : question,
          );
        }

        return [
          ...currentQuestions,
          savedQuestion,
        ];
      },
    );

    setEditingQuestionId(null);
    setIsPublished(false);

    setFeedback({
      type: 'success',
      title:
        editingQuestionId === null
          ? 'Question added'
          : 'Question updated',
      message:
        'The frontend question list has been updated.',
    });
  };

  const handleEditQuestion = (
    question:
      QuestionEditorQuestion,
  ) => {
    setEditingQuestionId(
      question.id,
    );

    setFeedback(null);

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  const handleConfirmDelete = () => {
    if (
      pendingDeleteQuestion === null
    ) {
      return;
    }

    setQuestions(
      (currentQuestions) =>
        currentQuestions.filter(
          (question) =>
            question.id !==
            pendingDeleteQuestion.id,
        ),
    );

    if (
      editingQuestionId ===
      pendingDeleteQuestion.id
    ) {
      setEditingQuestionId(null);
    }

    setPendingDeleteQuestion(null);
    setIsPublished(false);

    setFeedback({
      type: 'success',
      title: 'Question removed',
      message:
        'The question has been removed from the frontend draft.',
    });
  };

  const moveQuestion = (
    questionId: string,
    direction: -1 | 1,
  ) => {
    setQuestions(
      (currentQuestions) => {
        const currentIndex =
          currentQuestions.findIndex(
            (question) =>
              question.id ===
              questionId,
          );

        const targetIndex =
          currentIndex + direction;

        if (
          currentIndex < 0 ||
          targetIndex < 0 ||
          targetIndex >=
            currentQuestions.length
        ) {
          return currentQuestions;
        }

        const reorderedQuestions =
          [...currentQuestions];

        const [
          movedQuestion,
        ] =
          reorderedQuestions.splice(
            currentIndex,
            1,
          );

        reorderedQuestions.splice(
          targetIndex,
          0,
          movedQuestion,
        );

        return reorderedQuestions;
      },
    );

    setIsPublished(false);
  };

  const handlePublish = () => {
    /*
     * Mock only.
     * Bản thật phải gửi PUBLISH_EXAM và chờ EXAM_PUBLISHED.
     */
    setIsPublished(true);

    setFeedback({
      type: 'success',
      title:
        'Examination published',
      message:
        'This is a frontend mock. The Java server has not changed the database status yet.',
    });
  };

  return (
    <>
      <section
        className="
          flex items-end
          justify-between gap-8
          max-xl:flex-col
          max-xl:items-start
        "
      >
        <div>
          <p
            className="
              text-[11px] font-bold
              uppercase
              tracking-[0.16em]
              text-blue-700
            "
          >
            Question management
          </p>

          <h1
            className="
              mt-3 text-3xl
              font-semibold
              tracking-[-0.035em]
              text-slate-950
            "
          >
            {examTitle}
          </h1>

          <p className="mt-3 text-sm text-slate-600">
            Exam ID: {examCode}
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            className="
              inline-flex min-h-11
              items-center
              justify-center
              rounded-md border
              border-slate-300
              bg-white px-4
              text-sm font-semibold
              text-slate-700
              transition-colors
              hover:border-blue-600
              hover:text-blue-700
            "
            to="/teacher/exams"
          >
            Back to examinations
          </Link>

          <Link
            className="
              inline-flex min-h-11
              items-center
              justify-center
              rounded-md bg-blue-700
              px-4 text-sm
              font-semibold
              text-white
              transition-colors
              hover:bg-blue-800
            "
            to={`/teacher/exams/${examId}`}
          >
            Examination overview
          </Link>
        </div>
      </section>

      <div
        className="
          mt-6 rounded-lg
          border border-amber-200
          bg-amber-50 px-4 py-3
          text-xs leading-5
          text-amber-900
        "
      >
        <strong>
          Frontend mock editor:
        </strong>{' '}
        question changes are stored only in React state and disappear
        after a page refresh.
      </div>

      {feedback !== null && (
        <div className="mt-6">
          <FeedbackMessage
            feedback={feedback}
            onClose={() =>
              setFeedback(null)
            }
          />
        </div>
      )}

      <div
        className="
          mt-6 grid
          grid-cols-[minmax(0,2fr)_340px]
          items-start gap-6
          max-2xl:grid-cols-1
        "
      >
        <div className="space-y-6">
          <QuestionEditorForm
            key={
              editingQuestion?.id ??
              'new-question'
            }
            initialQuestion={
              editingQuestion
            }
            onCancel={() =>
              setEditingQuestionId(
                null,
              )
            }
            onSave={
              handleSaveQuestion
            }
          />

          <section>
            <div
              className="
                flex items-end
                justify-between gap-5
              "
            >
              <div>
                <h2 className="text-lg font-semibold text-slate-950">
                  Examination questions
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  {questions.length}{' '}
                  {questions.length === 1
                    ? 'question'
                    : 'questions'}
                </p>
              </div>
            </div>

            {questions.length > 0 ? (
              <div className="mt-4 grid gap-4">
                {questions.map(
                  (
                    question,
                    index,
                  ) => (
                    <QuestionListItem
                      key={
                        question.id
                      }
                      index={index}
                      isFirst={
                        index === 0
                      }
                      isLast={
                        index ===
                        questions.length -
                          1
                      }
                      question={
                        question
                      }
                      onDelete={
                        setPendingDeleteQuestion
                      }
                      onEdit={
                        handleEditQuestion
                      }
                      onMoveDown={(
                        questionId,
                      ) =>
                        moveQuestion(
                          questionId,
                          1,
                        )
                      }
                      onMoveUp={(
                        questionId,
                      ) =>
                        moveQuestion(
                          questionId,
                          -1,
                        )
                      }
                    />
                  ),
                )}
              </div>
            ) : (
              <div
                className="
                  mt-4 rounded-xl
                  border border-dashed
                  border-slate-300
                  bg-white px-6 py-16
                  text-center
                "
              >
                <p className="text-sm font-semibold text-slate-800">
                  No questions yet
                </p>

                <p className="mt-2 text-xs text-slate-500">
                  Use the editor above to add the first question.
                </p>
              </div>
            )}
          </section>
        </div>

        <aside
          className="
            sticky top-[100px]
            max-2xl:static
          "
        >
          <PublishReadinessPanel
            isPublished={
              isPublished
            }
            questions={questions}
            onPublish={
              handlePublish
            }
          />
        </aside>
      </div>

      {pendingDeleteQuestion !==
        null && (
        <div
          className="
            fixed inset-0 z-50
            grid place-items-center
            bg-slate-950/55 p-5
          "
          role="presentation"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setPendingDeleteQuestion(
                null,
              );
            }
          }}
        >
          <section
            className="
              w-full max-w-md
              rounded-xl border
              border-slate-200
              bg-white p-6
              shadow-[0_30px_80px_rgb(15_23_42/0.30)]
            "
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-question-title"
          >
            <p
              className="
                text-[11px] font-bold
                uppercase
                tracking-[0.15em]
                text-red-700
              "
            >
              Delete question
            </p>

            <h2
              id="delete-question-title"
              className="
                mt-3 text-xl
                font-semibold
                text-slate-950
              "
            >
              Remove this question?
            </h2>

            <p
              className="
                mt-3 text-sm
                leading-6
                text-slate-600
              "
            >
              This action removes the question and all of its choices
              from the frontend draft.
            </p>

            <p
              className="
                mt-4 rounded-lg
                bg-slate-50 p-4
                text-sm leading-6
                text-slate-800
              "
            >
              {
                pendingDeleteQuestion.content
              }
            </p>

            <div
              className="
                mt-6 grid
                grid-cols-2 gap-3
                max-sm:grid-cols-1
              "
            >
              <button
                className="
                  min-h-11 rounded-md
                  border border-slate-300
                  bg-white px-4
                  text-sm font-semibold
                  text-slate-700
                "
                type="button"
                onClick={() =>
                  setPendingDeleteQuestion(
                    null,
                  )
                }
              >
                Cancel
              </button>

              <button
                className="
                  min-h-11 rounded-md
                  bg-red-700 px-4
                  text-sm font-semibold
                  text-white
                  transition-colors
                  hover:bg-red-800
                "
                type="button"
                onClick={
                  handleConfirmDelete
                }
              >
                Delete question
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}

export default QuestionManagementPage;