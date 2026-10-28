import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router";

import FeedbackMessage, {
  type Feedback,
} from "../../components/common/FeedbackMessage";
import Icon from "../../components/common/Icon";
import LifecycleConfirmationDialog from "../../components/exam/LifecycleConfirmationDialog";
import type {
  ExamStatus,
  ServerExam,
  ServerMessage,
} from "../../websocket/protocol";
import { useWebSocket } from "../../websocket/useWebSocket";

type PendingAction =
  | "UPDATE_EXAM"
  | "PUBLISH_EXAM"
  | "CLOSE_EXAM"
  | "DELETE_EXAM";
type ConfirmationAction = "CLOSE_EXAM" | "DELETE_EXAM";

interface ExamFormState {
  title: string;
  description: string;
  durationMinutes: string;
}

const inputClass =
  "h-10 w-full rounded-lg border border-[#d6e1e4] px-3 text-sm outline-none focus:border-[#70b2be] focus:ring-4 focus:ring-[#00849a]/10 disabled:bg-[#f1f4f5] disabled:text-[#8a979c]";

function isExamStatus(value: unknown): value is ExamStatus {
  return value === "DRAFT" || value === "PUBLISHED" || value === "CLOSED";
}

function isServerExam(value: unknown): value is ServerExam {
  if (typeof value !== "object" || value === null) return false;
  const exam = value as Record<string, unknown>;
  return (
    typeof exam.id === "number" &&
    typeof exam.title === "string" &&
    (typeof exam.description === "string" || exam.description === null) &&
    typeof exam.durationMinutes === "number" &&
    isExamStatus(exam.status) &&
    typeof exam.createdBy === "number" &&
    typeof exam.createdAt === "string" &&
    typeof exam.updatedAt === "string"
  );
}

function toForm(exam: ServerExam): ExamFormState {
  return {
    title: exam.title,
    description: exam.description ?? "",
    durationMinutes: String(exam.durationMinutes),
  };
}

function serverError(message: ServerMessage, fallback: string): string {
  const detail = message.error?.message ?? fallback;
  return message.error?.code ? `${message.error.code}: ${detail}` : detail;
}

function ExamOverviewPage() {
  const { status: connectionStatus, sendMessage } = useWebSocket();
  const { examId } = useParams();
  const navigate = useNavigate();
  const parsedId = Number(examId);
  const id = Number.isSafeInteger(parsedId) && parsedId > 0 ? parsedId : null;

  const [exam, setExam] = useState<ServerExam | null>(null);
  const [form, setForm] = useState<ExamFormState>({
    title: "",
    description: "",
    durationMinutes: "60",
  });
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [confirmation, setConfirmation] = useState<ConfirmationAction | null>(
    null,
  );
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [editing, setEditing] = useState(false);

  const loadExam = useCallback(() => {
    if (id === null) {
      setLoading(false);
      setExam(null);
      setFeedback({
        type: "error",
        title: "Invalid examination",
        message: "The examination ID in this address is invalid.",
      });
      return;
    }
    if (connectionStatus !== "connected") return;

    setLoading(true);
    setFeedback(null);
    const requestId = sendMessage("GET_EXAM", { examId: id }, (message) => {
      setLoading(false);
      if (
        message.type === "EXAM_DETAILS" &&
        isServerExam(message.data) &&
        message.data.id === id
      ) {
        setExam(message.data);
        setForm(toForm(message.data));
        return;
      }
      setExam(null);
      setFeedback({
        type: "error",
        title: "Unable to load examination",
        message: serverError(
          message,
          "The server returned invalid examination details.",
        ),
      });
    });

    if (requestId === null) {
      setLoading(false);
      setFeedback({
        type: "error",
        message: "The examination request could not be sent.",
      });
    }
  }, [connectionStatus, id, sendMessage]);

  useEffect(() => {
    if (id === null) {
      const timer = window.setTimeout(loadExam, 0);
      return () => window.clearTimeout(timer);
    }
    if (connectionStatus !== "connected") return;
    const timer = window.setTimeout(loadExam, 0);
    return () => window.clearTimeout(timer);
  }, [connectionStatus, id, loadExam]);

  const acceptExamResponse = (
    message: ServerMessage,
    expectedType: "EXAM_UPDATED" | "EXAM_PUBLISHED" | "EXAM_CLOSED",
    successFeedback: Feedback,
  ) => {
    if (
      message.type === expectedType &&
      isServerExam(message.data) &&
      message.data.id === id
    ) {
      setExam(message.data);
      setForm(toForm(message.data));
      setEditing(false);
      setFeedback(successFeedback);
      return true;
    }
    return false;
  };

  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (exam === null || exam.status !== "DRAFT" || pending !== null) return;
    if (connectionStatus !== "connected") {
      setFeedback({
        type: "error",
        message: "The server is not connected. No changes were sent.",
      });
      return;
    }

    const title = form.title.trim();
    const duration = Number(form.durationMinutes);
    if (title.length === 0) {
      setFeedback({
        type: "error",
        title: "Invalid title",
        message: "Exam title is required.",
      });
      return;
    }
    if (title.length > 255) {
      setFeedback({
        type: "error",
        title: "Invalid title",
        message: "Exam title must not exceed 255 characters.",
      });
      return;
    }
    if (!Number.isInteger(duration) || duration <= 0) {
      setFeedback({
        type: "error",
        title: "Invalid duration",
        message: "Duration must be a positive whole number of minutes.",
      });
      return;
    }

    setPending("UPDATE_EXAM");
    setFeedback(null);
    const requestId = sendMessage(
      "UPDATE_EXAM",
      {
        examId: exam.id,
        title,
        description: form.description.trim(),
        durationMinutes: duration,
      },
      (message) => {
        setPending(null);
        if (
          acceptExamResponse(message, "EXAM_UPDATED", {
            type: "success",
            title: "Draft updated",
            message:
              "The server confirmed that the draft details were saved to PostgreSQL.",
          })
        )
          return;
        setFeedback({
          type: "error",
          title: "Unable to update draft",
          message: serverError(
            message,
            "The server did not confirm the update.",
          ),
        });
      },
    );

    if (requestId === null) {
      setPending(null);
      setFeedback({
        type: "error",
        message: "The update request could not be sent.",
      });
    }
  };

  const publishExam = () => {
    if (exam === null || exam.status !== "DRAFT" || pending !== null) return;
    if (connectionStatus !== "connected") {
      setFeedback({
        type: "error",
        message: "The server is not connected. The exam was not published.",
      });
      return;
    }

    setPending("PUBLISH_EXAM");
    setFeedback(null);
    const requestId = sendMessage(
      "PUBLISH_EXAM",
      { examId: exam.id },
      (message) => {
        setPending(null);
        if (
          acceptExamResponse(message, "EXAM_PUBLISHED", {
            type: "success",
            title: "Examination published",
            message:
              "The server validated the questions and made this examination available to students.",
          })
        )
          return;
        setFeedback({
          type: "error",
          title: "Examination is not ready to publish",
          message: serverError(
            message,
            "Check that the exam has questions and that every question has valid choices.",
          ),
        });
      },
    );

    if (requestId === null) {
      setPending(null);
      setFeedback({
        type: "error",
        message: "The publish request could not be sent.",
      });
    }
  };

  const closeExam = () => {
    if (exam === null || exam.status !== "PUBLISHED" || pending !== null)
      return;
    if (connectionStatus !== "connected") {
      setConfirmation(null);
      setFeedback({
        type: "error",
        message: "The server is not connected. The exam was not closed.",
      });
      return;
    }

    setPending("CLOSE_EXAM");
    setFeedback(null);
    const requestId = sendMessage(
      "CLOSE_EXAM",
      { examId: exam.id },
      (message) => {
        setPending(null);
        if (
          acceptExamResponse(message, "EXAM_CLOSED", {
            type: "success",
            title: "Examination closed",
            message:
              "The server confirmed that this examination is now closed.",
          })
        ) {
          setConfirmation(null);
          return;
        }
        setConfirmation(null);
        setFeedback({
          type: "error",
          title: "Unable to close examination",
          message: serverError(message, "The server did not confirm closure."),
        });
      },
    );

    if (requestId === null) {
      setPending(null);
      setConfirmation(null);
      setFeedback({
        type: "error",
        message: "The close request could not be sent.",
      });
    }
  };

  const deleteExam = () => {
    if (exam === null || exam.status !== "DRAFT" || pending !== null) return;
    if (connectionStatus !== "connected") {
      setConfirmation(null);
      setFeedback({
        type: "error",
        message: "The server is not connected. The draft was not deleted.",
      });
      return;
    }

    setPending("DELETE_EXAM");
    setFeedback(null);
    const requestId = sendMessage(
      "DELETE_EXAM",
      { examId: exam.id },
      (message) => {
        setPending(null);
        if (
          message.type === "EXAM_DELETED" &&
          message.data?.examId === exam.id
        ) {
          navigate("/teacher/exams", { replace: true });
          return;
        }
        setConfirmation(null);
        setFeedback({
          type: "error",
          title: "Unable to delete draft",
          message: serverError(message, "The server did not confirm deletion."),
        });
      },
    );

    if (requestId === null) {
      setPending(null);
      setConfirmation(null);
      setFeedback({
        type: "error",
        message: "The delete request could not be sent.",
      });
    }
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-[#dce7ea] bg-white py-20 text-center text-sm text-[#718087]">
        Loading examination through WebSocket…
      </div>
    );
  }

  if (exam === null) {
    return (
      <div className="rounded-xl border border-[#edc9cc] bg-white p-10 text-center">
        <Icon className="mx-auto text-[#bd2f35]" name="alert" size={25} />
        <h1 className="mt-3 text-xl font-bold">Examination unavailable</h1>
        <p className="mx-auto mt-2 max-w-lg text-sm leading-5 text-[#718087]">
          {feedback?.message ?? "This examination could not be loaded."}
        </p>
        <div className="mt-5 flex justify-center gap-3">
          <Link
            className="inline-flex h-9 items-center rounded-lg border border-[#d4e0e3] px-4 text-sm font-semibold text-[#526269]"
            to="/teacher/exams"
          >
            Back to examinations
          </Link>
          {id !== null && (
            <button
              className="h-9 rounded-lg bg-[#00778b] px-4 text-sm font-semibold text-white disabled:opacity-50"
              disabled={connectionStatus !== "connected"}
              onClick={loadExam}
              type="button"
            >
              Try again
            </button>
          )}
        </div>
      </div>
    );
  }

  const actionDisabled = pending !== null || connectionStatus !== "connected";
  const statusClass =
    exam.status === "PUBLISHED"
      ? "border-[#b6dbe1] bg-[#eff9fa] text-[#00778b]"
      : exam.status === "DRAFT"
        ? "border-[#ead7b8] bg-[#fff8ed] text-[#986313]"
        : "border-[#dce3e5] bg-[#f2f5f6] text-[#64747a]";

  return (
    <div>
      <div className="flex items-center gap-2 text-xs font-semibold text-[#75848a]">
        <Link to="/teacher/exams">Examinations</Link>
        <Icon name="arrow-right" size={10} />
        <span>EX-{String(exam.id).padStart(4, "0")}</span>
      </div>

      <section className="mt-4 flex items-start justify-between gap-5 max-lg:flex-col">
        <div>
          <div className="flex items-center gap-2">
            <span
              className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClass}`}
            >
              {exam.status}
            </span>
            <span className="text-xs text-[#7a888d]">
              Updated {new Date(exam.updatedAt).toLocaleString("en-GB")}
            </span>
          </div>
          <h1 className="mt-3 text-[26px] font-bold tracking-[-.04em]">
            {exam.title}
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-5 text-[#68777d]">
            {exam.description || "No description has been provided."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {exam.status !== "DRAFT" && (
            <Link
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#b7d7dd] px-3 text-xs font-semibold text-[#00778b]"
              to={`/teacher/exams/${exam.id}/submissions`}
            >
              <Icon name="document" size={13} />
              View submissions
            </Link>
          )}

          {exam.status === "DRAFT" && (
            <>
              <button
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#d4e0e3] px-3 text-xs font-semibold text-[#526269] disabled:cursor-not-allowed disabled:opacity-50"
                disabled={actionDisabled}
                onClick={() => {
                  setForm(toForm(exam));
                  setEditing((value) => !value);
                }}
                type="button"
              >
                <Icon name="settings" size={13} />
                Edit details
              </button>
              <Link
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#b7d7dd] px-3 text-xs font-semibold text-[#00778b]"
                to={`/teacher/exams/${exam.id}/questions`}
              >
                <Icon name="document" size={13} />
                Manage questions
              </Link>
              <button
                className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#00778b] px-4 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:bg-[#a8bec3]"
                disabled={actionDisabled}
                onClick={publishExam}
                type="button"
              >
                <Icon name="activity" size={13} />
                {pending === "PUBLISH_EXAM" ? "Publishing…" : "Publish exam"}
              </button>
            </>
          )}
          {exam.status === "PUBLISHED" && (
            <>
              <Link
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#b7d7dd] px-3 text-xs font-semibold text-[#00778b]"
                to={`/teacher/monitoring/${exam.id}`}
              >
                <Icon name="monitor" size={13} />
                Open monitoring
              </Link>
              <button
                className="h-9 rounded-lg bg-[#25373d] px-4 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                disabled={actionDisabled}
                onClick={() => setConfirmation("CLOSE_EXAM")}
                type="button"
              >
                Close exam
              </button>
            </>
          )}
        </div>
      </section>

      {feedback && (
        <div className="mt-5">
          <FeedbackMessage
            feedback={feedback}
            onClose={() => setFeedback(null)}
          />
        </div>
      )}

      {editing && exam.status === "DRAFT" && (
        <form
          className="mt-5 rounded-xl border border-[#dce7ea] bg-white p-5"
          onSubmit={save}
        >
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold">Edit draft details</h2>
            <button
              className="text-xs text-[#718087] disabled:opacity-50"
              disabled={pending !== null}
              onClick={() => {
                setForm(toForm(exam));
                setEditing(false);
              }}
              type="button"
            >
              Cancel
            </button>
          </div>
          <div className="mt-4 grid grid-cols-[minmax(0,1fr)_180px] gap-4 max-md:grid-cols-1">
            <label className="grid gap-2">
              <span className="text-xs font-semibold">Title</span>
              <input
                className={inputClass}
                disabled={pending !== null}
                maxLength={255}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
                value={form.title}
              />
            </label>
            <label className="grid gap-2">
              <span className="text-xs font-semibold">Duration</span>
              <input
                className={inputClass}
                disabled={pending !== null}
                min="1"
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    durationMinutes: event.target.value,
                  }))
                }
                type="number"
                value={form.durationMinutes}
              />
            </label>
            <label className="col-span-2 grid gap-2 max-md:col-span-1">
              <span className="text-xs font-semibold">Description</span>
              <textarea
                className="min-h-24 rounded-lg border border-[#d6e1e4] p-3 text-sm outline-none focus:border-[#70b2be] disabled:bg-[#f1f4f5]"
                disabled={pending !== null}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                value={form.description}
              />
            </label>
          </div>
          <button
            className="mt-4 h-9 rounded-lg bg-[#00778b] px-4 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:bg-[#a8bec3]"
            disabled={actionDisabled}
            type="submit"
          >
            {pending === "UPDATE_EXAM" ? "Saving…" : "Save changes"}
          </button>
        </form>
      )}

      <div className="mt-5 grid grid-cols-[minmax(0,2fr)_330px] gap-5 max-xl:grid-cols-1">
        <section className="rounded-xl border border-[#dce7ea] bg-white">
          <div className="border-b border-[#e7edef] px-5 py-4">
            <h2 className="text-base font-bold">Assessment configuration</h2>
            <p className="mt-1 text-xs text-[#819096]">
              Server-backed lifecycle and core delivery settings
            </p>
          </div>
          <div className="grid grid-cols-3 divide-x divide-[#e8edef] max-md:grid-cols-1 max-md:divide-x-0 max-md:divide-y">
            {[
              ["Duration", `${exam.durationMinutes} minutes`, "clock"],
              ["Owner", `Teacher #${exam.createdBy}`, "users"],
              [
                "Created",
                new Date(exam.createdAt).toLocaleDateString("en-GB"),
                "calendar",
              ],
            ].map(([label, value, icon]) => (
              <div className="p-5" key={label}>
                <Icon
                  className="text-[#00778b]"
                  name={icon as "clock"}
                  size={16}
                />
                <p className="mt-3 text-xs font-bold uppercase tracking-[.07em] text-[#879399]">
                  {label}
                </p>
                <p className="mt-1 text-base font-semibold">{value}</p>
              </div>
            ))}
          </div>
          <div className="border-t border-[#e7edef] p-5">
            <h3 className="text-sm font-bold">Lifecycle controls</h3>
            <div className="mt-4 flex items-center gap-2 text-xs font-semibold">
              <span className="rounded-full bg-[#fff3dd] px-3 py-1.5 text-[#95610e]">
                Draft
              </span>
              <Icon name="arrow-right" size={12} />
              <span className="rounded-full bg-[#eaf7f8] px-3 py-1.5 text-[#00778b]">
                Published
              </span>
              <Icon name="arrow-right" size={12} />
              <span className="rounded-full bg-[#eff2f3] px-3 py-1.5 text-[#617177]">
                Closed
              </span>
            </div>
          </div>
        </section>

        <aside className="grid gap-4">
          <section className="rounded-xl border border-[#dce7ea] bg-white p-5">
            <h2 className="text-base font-bold">Publish readiness</h2>
            <div className="mt-4 grid gap-3 text-sm text-[#607178]">
              {[
                "At least one persisted question",
                "Each question has 2+ choices",
                "Exactly one correct choice",
              ].map((item) => (
                <p className="flex items-center gap-2" key={item}>
                  <Icon className="text-[#00778b]" name="check" size={13} />
                  {item}
                </p>
              ))}
            </div>
            <p className="mt-4 rounded-lg bg-[#fff8ed] p-3 text-xs leading-5 text-[#8b641f]">
              The backend validates these rules when publishing. If the draft is
              incomplete, the exact server reason is shown above.
            </p>
          </section>
          {exam.status === "DRAFT" && (
            <button
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#edc9cc] bg-white text-xs font-semibold text-[#b32c33] disabled:cursor-not-allowed disabled:opacity-50"
              disabled={actionDisabled}
              onClick={() => setConfirmation("DELETE_EXAM")}
              type="button"
            >
              <Icon name="alert" size={13} />
              Delete draft permanently
            </button>
          )}
        </aside>
      </div>

      {confirmation === "CLOSE_EXAM" && (
        <LifecycleConfirmationDialog
          confirmLabel="Close examination"
          description={`Students will no longer be able to start “${exam.title}”. This lifecycle change cannot be reverted from this screen.`}
          isPending={pending === "CLOSE_EXAM"}
          onCancel={() => setConfirmation(null)}
          onConfirm={closeExam}
          title="Close this published examination?"
        />
      )}
      {confirmation === "DELETE_EXAM" && (
        <LifecycleConfirmationDialog
          confirmLabel="Delete draft"
          description={`“${exam.title}” and all of its questions and choices will be permanently removed. This action cannot be undone.`}
          isPending={pending === "DELETE_EXAM"}
          onCancel={() => setConfirmation(null)}
          onConfirm={deleteExam}
          title="Delete this draft examination?"
          tone="danger"
        />
      )}
    </div>
  );
}

export default ExamOverviewPage;
