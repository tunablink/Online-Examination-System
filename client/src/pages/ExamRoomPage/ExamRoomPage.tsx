import { useEffect, useRef, useState } from "react";

import { Link, useNavigate, useParams } from "react-router";

import ConnectionBadge from "../../components/common/ConnectionBadge";

import { MOCK_EXAM_ATTEMPT } from "../../mocks/attempt";

import type { AnswerMap, AutosaveStatus } from "../../types/attempt";

import ExamTimer from "./components/ExamTimer";
import QuestionNavigator from "./components/QuestionNavigator";
import QuestionPanel from "./components/QuestionPanel";
import SubmitExamDialog from "./components/SubmitExamDialog";
import { useWebSocket } from "../../websocket/useWebSocket";

const AUTOSAVE_LABELS: Record<AutosaveStatus, string> = {
  IDLE: "No unsaved changes",
  SAVING: "Saving answer...",
  SAVED: "Answer saved",
  ERROR: "Answer could not be saved",
};

function ExamRoomPage() {
  const {
    status: connectionStatus
  } = useWebSocket();

  const navigate = useNavigate();

  const { examId } = useParams<{
    examId: string;
  }>();

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  const [answers, setAnswers] = useState<AnswerMap>({});

  const [flaggedQuestionIds, setFlaggedQuestionIds] = useState<Set<string>>(
    () => new Set(),
  );

  const [autosaveStatus, setAutosaveStatus] = useState<AutosaveStatus>("IDLE");

  const [remainingSeconds, setRemainingSeconds] = useState(
    MOCK_EXAM_ATTEMPT.durationSeconds,
  );

  const [showSubmitDialog, setShowSubmitDialog] = useState(false);

  const [submitted, setSubmitted] = useState(false);

  const autosaveTimerRef = useRef<number | null>(null);

  const attemptMatchesRoute = MOCK_EXAM_ATTEMPT.examId === examId;

  const questions = MOCK_EXAM_ATTEMPT.questions;

  const currentQuestion = questions[currentQuestionIndex];

  const answeredCount = Object.keys(answers).length;

  useEffect(() => {
    if (submitted) {
      return;
    }

    const timerId = window.setInterval(() => {
      setRemainingSeconds((currentRemainingSeconds) =>
        Math.max(0, currentRemainingSeconds - 1),
      );
    }, 1000);

    return () => {
      window.clearInterval(timerId);
    };
  }, [submitted]);

  useEffect(() => {
    return () => {
      if (autosaveTimerRef.current !== null) {
        window.clearTimeout(autosaveTimerRef.current);
      }
    };
  }, []);

  if (!attemptMatchesRoute) {
    return (
      <main
        className="
          grid min-h-screen place-items-center
          bg-[#f4f7fb] p-6
        "
      >
        <section
          className="
            w-full max-w-lg rounded-xl
            border border-slate-200
            bg-white p-8 text-center
          "
        >
          <p
            className="
              text-[11px] font-bold uppercase
              tracking-[0.14em] text-red-600
            "
          >
            Attempt unavailable
          </p>

          <h1
            className="
              mt-3 text-2xl font-semibold
              text-slate-950
            "
          >
            Examination attempt not found
          </h1>

          <p className="mt-3 text-sm leading-6 text-slate-600">
            This mock attempt does not match the examination in the current
            route.
          </p>

          <Link
            className="
              mt-6 inline-flex min-h-11
              items-center justify-center
              rounded-md bg-blue-700 px-5
              text-sm font-semibold text-white
            "
            to="/student/exams"
          >
            Return to examinations
          </Link>
        </section>
      </main>
    );
  }

  const handleSelectChoice = (questionId: string, choiceId: string) => {
    setAnswers((currentAnswers) => ({
      ...currentAnswers,
      [questionId]: choiceId,
    }));

    setAutosaveStatus("SAVING");

    if (autosaveTimerRef.current !== null) {
      window.clearTimeout(autosaveTimerRef.current);
    }

    /*
     * Đây chỉ là mô phỏng độ trễ auto-save.
     * Sau này đoạn này sẽ gọi sendMessage('SAVE_ANSWER', ...).
     */
    autosaveTimerRef.current = window.setTimeout(() => {
      setAutosaveStatus("SAVED");
      autosaveTimerRef.current = null;
    }, 700);
  };

  const handleToggleFlag = (questionId: string) => {
    setFlaggedQuestionIds((currentFlaggedIds) => {
      const nextFlaggedIds = new Set(currentFlaggedIds);

      if (nextFlaggedIds.has(questionId)) {
        nextFlaggedIds.delete(questionId);
      } else {
        nextFlaggedIds.add(questionId);
      }

      return nextFlaggedIds;
    });
  };

  const handlePreviousQuestion = () => {
    setCurrentQuestionIndex((currentIndex) => Math.max(0, currentIndex - 1));
  };

  const handleNextQuestion = () => {
    setCurrentQuestionIndex((currentIndex) =>
      Math.min(questions.length - 1, currentIndex + 1),
    );
  };

  const handleConfirmSubmit = () => {
    /*
     * Sau này chỉ set submitted khi server trả SUBMITTED.
     * Không được tự tin client đã nộp thành công.
     */
    setShowSubmitDialog(false);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <main
        className="
          grid min-h-screen place-items-center
          bg-[#f4f7fb] p-6
        "
      >
        <section
          className="
            w-full max-w-xl rounded-xl
            border border-emerald-200
            bg-white p-9 text-center
            shadow-[0_20px_50px_rgb(15_23_42/0.08)]
          "
        >
          <div
            className="
              mx-auto grid h-14 w-14
              place-items-center rounded-full
              bg-emerald-100
              text-lg font-bold text-emerald-700
            "
            aria-hidden="true"
          >
            OK
          </div>

          <p
            className="
              mt-6 text-[11px] font-bold uppercase
              tracking-[0.15em] text-emerald-700
            "
          >
            Submission recorded
          </p>

          <h1
            className="
              mt-3 text-2xl font-semibold
              tracking-[-0.03em] text-slate-950
            "
          >
            Your examination has been submitted
          </h1>

          <p className="mt-3 text-sm leading-6 text-slate-600">
            This is currently a frontend mock. The final version will show this
            confirmation only after the Java server commits the submission
            successfully.
          </p>

          <button
            className="
              mt-7 min-h-11 rounded-md
              bg-blue-700 px-5
              text-sm font-semibold text-white
              transition-colors hover:bg-blue-800
            "
            type="button"
            onClick={() =>
              navigate("/student/exams", {
                replace: true,
              })
            }
          >
            Return to examinations
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#eef2f7] text-slate-950">
      <header
        className="
          sticky top-0 z-30
          border-b border-slate-200
          bg-white/95 backdrop-blur
        "
      >
        <div
          className="
            mx-auto flex min-h-[72px]
            w-full max-w-[1440px]
            items-center justify-between
            gap-6 px-6
            max-md:flex-col
            max-md:items-stretch
            max-md:gap-3 max-md:py-3
            max-sm:px-4
          "
        >
          <div className="min-w-0">
            <div
              className="
                flex flex-wrap items-center gap-2
                text-[10px] font-bold uppercase
                tracking-[0.14em] text-blue-700
              "
            >
              <span>{MOCK_EXAM_ATTEMPT.courseCode}</span>

              <span aria-hidden="true">/</span>

              <span>{MOCK_EXAM_ATTEMPT.examCode}</span>
            </div>

            <h1
              className="
                mt-1 truncate text-sm
                font-semibold text-slate-950
              "
            >
              {MOCK_EXAM_ATTEMPT.examTitle}
            </h1>
          </div>

          <div
            className="
              flex items-center gap-4
              max-md:justify-between
            "
          >
            <ConnectionBadge status={connectionStatus} />

            <ExamTimer remainingSeconds={remainingSeconds} />

            <button
              className="
                min-h-11 rounded-md
                bg-red-700 px-4
                text-xs font-semibold text-white
                transition-colors
                hover:bg-red-800
              "
              type="button"
              onClick={() => setShowSubmitDialog(true)}
            >
              Submit examination
            </button>
          </div>
        </div>
      </header>

      <div
        className="
          mx-auto grid w-full max-w-[1440px]
          grid-cols-[260px_minmax(0,1fr)]
          items-start gap-6 px-6 py-6
          max-lg:grid-cols-1
          max-sm:px-4
        "
      >
        <aside
          className="
            sticky top-[96px] space-y-4
            max-lg:static
          "
        >
          <QuestionNavigator
            questions={questions}
            currentQuestionIndex={currentQuestionIndex}
            answers={answers}
            flaggedQuestionIds={flaggedQuestionIds}
            onSelectQuestion={setCurrentQuestionIndex}
          />

          <section
            className="
              rounded-xl border border-slate-200
              bg-white p-5
            "
          >
            <p
              className="
                text-[10px] font-bold uppercase
                tracking-[0.13em] text-slate-400
              "
            >
              Progress
            </p>

            <div className="mt-3 flex items-end justify-between">
              <p className="text-2xl font-semibold text-slate-950">
                {answeredCount}
              </p>

              <p className="text-xs text-slate-500">
                of {questions.length} answered
              </p>
            </div>

            <div
              className="
                mt-3 h-2 overflow-hidden
                rounded-full bg-slate-100
              "
            >
              <div
                className="
                  h-full rounded-full
                  bg-emerald-500
                  transition-[width]
                "
                style={{
                  width: `${(answeredCount / questions.length) * 100}%`,
                }}
              />
            </div>

            <p
              className={`
                mt-4 text-xs font-semibold
                ${
                  autosaveStatus === "ERROR"
                    ? "text-red-700"
                    : autosaveStatus === "SAVING"
                      ? "text-amber-700"
                      : autosaveStatus === "SAVED"
                        ? "text-emerald-700"
                        : "text-slate-500"
                }
              `}
            >
              {AUTOSAVE_LABELS[autosaveStatus]}
            </p>
          </section>
        </aside>

        <div className="min-w-0">
          <QuestionPanel
            question={currentQuestion}
            questionNumber={currentQuestionIndex + 1}
            totalQuestions={questions.length}
            selectedChoiceId={answers[currentQuestion.id]}
            isFlagged={flaggedQuestionIds.has(currentQuestion.id)}
            disabled={remainingSeconds <= 0 || connectionStatus !== "connected"}
            onSelectChoice={handleSelectChoice}
            onToggleFlag={handleToggleFlag}
          />

          <div
            className="
              mt-5 flex items-center
              justify-between gap-4
              rounded-xl border
              border-slate-200
              bg-white p-4
            "
          >
            <button
              className="
                min-h-11 rounded-md
                border border-slate-300
                bg-white px-4
                text-sm font-semibold
                text-slate-700
                transition-colors
                hover:border-blue-400
                hover:text-blue-700
                disabled:cursor-not-allowed
                disabled:opacity-40
              "
              type="button"
              disabled={currentQuestionIndex === 0}
              onClick={handlePreviousQuestion}
            >
              Previous question
            </button>

            <p className="text-xs text-slate-500 max-sm:hidden">
              Question {currentQuestionIndex + 1} of {questions.length}
            </p>

            <button
              className="
                min-h-11 rounded-md
                bg-blue-700 px-4
                text-sm font-semibold text-white
                transition-colors
                hover:bg-blue-800
                disabled:cursor-not-allowed
                disabled:bg-slate-300
              "
              type="button"
              disabled={currentQuestionIndex === questions.length - 1}
              onClick={handleNextQuestion}
            >
              Next question
            </button>
          </div>
        </div>
      </div>

      {showSubmitDialog && (
        <SubmitExamDialog
          answeredCount={answeredCount}
          totalQuestions={questions.length}
          onCancel={() => setShowSubmitDialog(false)}
          onConfirm={handleConfirmSubmit}
        />
      )}
    </main>
  );
}

export default ExamRoomPage;
