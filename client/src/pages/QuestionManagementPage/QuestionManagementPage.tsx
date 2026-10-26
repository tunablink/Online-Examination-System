import {useCallback, useEffect, useState } from "react";

import { Link, useParams } from "react-router";

import FeedbackMessage, {
  type Feedback,
} from "../../components/common/FeedbackMessage";

import type {
  TeacherChoiceData,
  TeacherQuestionData,
} from "../../websocket/protocol";

import { useWebSocket } from "../../websocket/useWebSocket";

import type { QuestionEditorQuestion } from "../../types/questionEditor";

import PublishReadinessPanel from "./components/PublishReadinessPanel";
import QuestionEditorForm from "./components/QuestionEditorForm";
import QuestionListItem from "./components/QuestionListItem";

function isTeacherChoiceData(value: unknown): value is TeacherChoiceData {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const choice = value as Record<string, unknown>;

  return (
    typeof choice.id === "number" &&
    typeof choice.questionId === "number" &&
    typeof choice.content === "string" &&
    typeof choice.correct === "boolean" &&
    typeof choice.displayOrder === "number"
  );
}

function isTeacherQuestionData(value: unknown): value is TeacherQuestionData {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const question = value as Record<string, unknown>;

  return (
    typeof question.id === "number" &&
    typeof question.examId === "number" &&
    typeof question.content === "string" &&
    typeof question.points === "number" &&
    typeof question.displayOrder === "number" &&
    typeof question.createdAt === "string" &&
    typeof question.updatedAt === "string" &&
    Array.isArray(question.choices) &&
    question.choices.every(isTeacherChoiceData)
  );
}

function toEditorQuestion(
  question: TeacherQuestionData,
): QuestionEditorQuestion {
  return {
    id: String(question.id),
    content: question.content,
    points: question.points,

    choices: [...question.choices]
      .sort((left, right) => left.displayOrder - right.displayOrder)
      .map((choice) => ({
        id: String(choice.id),
        content: choice.content,
        correct: choice.correct,
      })),
  };
}

function QuestionManagementPage() {
  const { examId } = useParams<{
    examId: string;
  }>();

  const { status: connectionStatus, sendMessage } = useWebSocket();

  const parsedExamId = Number(examId);

  const numericExamId =
    Number.isSafeInteger(parsedExamId) && parsedExamId > 0
      ? parsedExamId
      : null;

  const [questions, setQuestions] = useState<QuestionEditorQuestion[]>([]);

  const [isLoading, setIsLoading] = useState(false);

  const [isSaving, setIsSaving] = useState(false);

  const [questionFormVersion, setQuestionFormVersion] = useState(0);

  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(
    null,
  );

  const [pendingDeleteQuestion, setPendingDeleteQuestion] =
    useState<QuestionEditorQuestion | null>(null);

  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const [isPublished, setIsPublished] = useState(false);

  const [isPublishing, setIsPublishing] = useState(false);

  const loadQuestions = useCallback(() => {
    if (numericExamId === null) {
      setFeedback({
        type: "error",
        title: "Invalid examination ID",
        message: "The URL does not contain a valid numeric examination ID.",
      });

      return;
    }

    if (connectionStatus !== "connected") {
      setFeedback({
        type: "error",
        title: "Server connection unavailable",
        message:
          "Questions cannot be loaded until the WebSocket connection is restored.",
      });

      return;
    }

    setIsLoading(true);
    setFeedback(null);

    const requestId = sendMessage(
      "GET_EXAM_QUESTIONS",
      {
        examId: numericExamId,
      },
      (response) => {
        setIsLoading(false);

        const receivedQuestions = response.data?.questions;

        if (
          response.type === "EXAM_QUESTIONS" &&
          Array.isArray(receivedQuestions) &&
          receivedQuestions.every(isTeacherQuestionData)
        ) {
          const mappedQuestions = [...receivedQuestions]
            .sort((left, right) => left.displayOrder - right.displayOrder)
            .map(toEditorQuestion);

          setQuestions(mappedQuestions);

          return;
        }

        setFeedback({
          type: "error",
          title: "Unable to load questions",
          message:
            response.error?.message ??
            "The server returned an unexpected question list.",
        });
      },
    );

    if (requestId === null) {
      setIsLoading(false);

      setFeedback({
        type: "error",
        title: "Request could not be sent",
        message: "Wait for the server connection and try again.",
      });
    }
  }, [connectionStatus, numericExamId, sendMessage]);

  useEffect(() => {
    if (connectionStatus !== "connected") {
      return;
    }

    const loadTimer = window.setTimeout(() => {
      loadQuestions();
    }, 0);

    return () => {
      window.clearTimeout(loadTimer);
    };
  }, [connectionStatus, loadQuestions]);

  const editingQuestion =
    questions.find((question) => question.id === editingQuestionId) ?? null;

  const examTitle = "Draft examination";

  const examCode = examId ?? "unknown";

  const handleSaveQuestion = (savedQuestion: QuestionEditorQuestion) => {
    if (numericExamId === null) {
      setFeedback({
        type: "error",
        title: "Invalid examination ID",
        message: "A question cannot be created without a valid examination ID.",
      });

      return;
    }

    if (connectionStatus !== "connected") {
      setFeedback({
        type: "error",
        title: "Server connection unavailable",
        message: "Reconnect to the server before adding a question.",
      });

      return;
    }

    if (isSaving) {
      return;
    }

    setIsSaving(true);
    setFeedback(null);

    const requestId = sendMessage(
      "CREATE_QUESTION",
      {
        examId: numericExamId,

        content: savedQuestion.content,

        points: savedQuestion.points,

        displayOrder: questions.length,

        choices: savedQuestion.choices.map((choice, index) => ({
          content: choice.content,

          correct: choice.correct,

          displayOrder: index,
        })),
      },
      (response) => {
        setIsSaving(false);
        if (
          response.type === "QUESTION_CREATED" &&
          isTeacherQuestionData(response.data)
        ) {
          const createdQuestion = toEditorQuestion(response.data);

          setQuestions((currentQuestions) => [
            ...currentQuestions,
            createdQuestion,
          ]);

          setQuestionFormVersion((currentVersion) => currentVersion + 1);

          setFeedback({
            type: "success",
            title: "Question created",
            message: "The question and its choices were saved to the database.",
          });

          return;
        }

        setFeedback({
          type: "error",
          title: "Unable to create question",
          message:
            response.error?.message ??
            "The server returned an unexpected response.",
        });
      },
    );

    if (requestId === null) {
      setIsSaving(false);

      setFeedback({
        type: "error",
        title: "Request could not be sent",
        message: "Wait for the WebSocket connection and try again.",
      });
    }
  };

  const handleEditQuestion = (question: QuestionEditorQuestion) => {
    setEditingQuestionId(question.id);

    setFeedback(null);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const handleConfirmDelete = () => {
    if (pendingDeleteQuestion === null) {
      return;
    }

    setQuestions((currentQuestions) =>
      currentQuestions.filter(
        (question) => question.id !== pendingDeleteQuestion.id,
      ),
    );

    if (editingQuestionId === pendingDeleteQuestion.id) {
      setEditingQuestionId(null);
    }

    setPendingDeleteQuestion(null);
    setIsPublished(false);

    setFeedback({
      type: "success",
      title: "Question removed",
      message: "The question has been removed from the frontend draft.",
    });
  };

  const moveQuestion = (questionId: string, direction: -1 | 1) => {
    setQuestions((currentQuestions) => {
      const currentIndex = currentQuestions.findIndex(
        (question) => question.id === questionId,
      );

      const targetIndex = currentIndex + direction;

      if (
        currentIndex < 0 ||
        targetIndex < 0 ||
        targetIndex >= currentQuestions.length
      ) {
        return currentQuestions;
      }

      const reorderedQuestions = [...currentQuestions];

      const [movedQuestion] = reorderedQuestions.splice(currentIndex, 1);

      reorderedQuestions.splice(targetIndex, 0, movedQuestion);

      return reorderedQuestions;
    });

    setIsPublished(false);
  };

  const handlePublish = () => {
    if (numericExamId === null) {
      setFeedback({
        type: "error",
        title: "Invalid examination ID",
        message: "The examination cannot be published without a valid ID.",
      });

      return;
    }

    if (connectionStatus !== "connected") {
      setFeedback({
        type: "error",
        title: "Server connection unavailable",
        message: "Reconnect to the server before publishing the examination.",
      });

      return;
    }

    if (isPublishing) {
      return;
    }

    setIsPublishing(true);
    setFeedback(null);

    const requestId = sendMessage(
      "PUBLISH_EXAM",
      { examId: numericExamId },
      (response) => {
        setIsPublishing(false);

        if (
          response.type === "EXAM_PUBLISHED" &&
          response.data?.status === "PUBLISHED"
        ) {
          setIsPublished(true);

          setFeedback({
            type: "success",
            title: "Examination published",
            message: "The published status was saved to the database.",
          });

          return;
        }

        setFeedback({
          type: "error",
          title: "Unable to publish examination",
          message:
            response.error?.message ??
            "The server returned an unexpected publication response.",
        });
      },
    );

    if (requestId !== null) {
      return;
    }

    setIsPublishing(false);

    setFeedback({
      type: "error",
      title: "Request could not be sent",
      message: "Wait for the WebSocket connection and try again.",
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

          <p className="mt-3 text-sm text-slate-600">Exam ID: {examCode}</p>
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
        <strong>Current backend scope:</strong> new questions are saved to
        PostgreSQL. Editing, deleting, reordering, and publishing are disabled
        until their server commands are implemented.
      </div>

      {feedback !== null && (
        <div className="mt-6">
          <FeedbackMessage
            feedback={feedback}
            onClose={() => setFeedback(null)}
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
            key={editingQuestion?.id ?? `new-question-${questionFormVersion}`}
            initialQuestion={editingQuestion}
            isSaving={isSaving}
            onCancel={() => setEditingQuestionId(null)}
            onSave={handleSaveQuestion}
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
                  {questions.length}{" "}
                  {questions.length === 1 ? "question" : "questions"}
                </p>
              </div>
            </div>

            {isLoading ? (
              <div
                className="
                  mt-4 rounded-xl
                  border border-slate-200
                  bg-white px-6 py-12
                  text-center
                "
              >
                <p className="text-sm font-semibold text-slate-800">
                  Loading questions...
                </p>

                <p className="mt-2 text-xs text-slate-500">
                  The client is requesting the latest question list from the
                  server.
                </p>
              </div>
            ) : questions.length > 0 ? (
              <div className="mt-4 grid gap-4">
                {questions.map((question, index) => (
                  <QuestionListItem
                    key={question.id}
                    index={index}
                    isFirst={index === 0}
                    isLast={index === questions.length - 1}
                    actionsEnabled={false}
                    question={question}
                    onDelete={setPendingDeleteQuestion}
                    onEdit={handleEditQuestion}
                    onMoveDown={(questionId) => moveQuestion(questionId, 1)}
                    onMoveUp={(questionId) => moveQuestion(questionId, -1)}
                  />
                ))}
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
            isPublished={isPublished}
            isPublishing={isPublishing}
            questions={questions}
            onPublish={handlePublish}
          />
        </aside>
      </div>

      {pendingDeleteQuestion !== null && (
        <div
          className="
            fixed inset-0 z-50
            grid place-items-center
            bg-slate-950/55 p-5
          "
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setPendingDeleteQuestion(null);
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
              This action removes the question and all of its choices from the
              frontend draft.
            </p>

            <p
              className="
                mt-4 rounded-lg
                bg-slate-50 p-4
                text-sm leading-6
                text-slate-800
              "
            >
              {pendingDeleteQuestion.content}
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
                onClick={() => setPendingDeleteQuestion(null)}
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
                onClick={handleConfirmDelete}
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
