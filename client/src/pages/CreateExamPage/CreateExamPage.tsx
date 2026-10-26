import { useState, type ChangeEvent, type FormEvent } from "react";

import { Link, useNavigate } from "react-router";

import FeedbackMessage, {
  type Feedback,
} from "../../components/common/FeedbackMessage";

import type {
  ExamEditorForm,
  ExamEditorValidationErrors,
  ResultReleasePolicy,
} from "../../types/examEditor";

import {
  hasValidationErrors,
  validateExamEditorForm,
} from "./createExamValidation";
import { useWebSocket } from "../../websocket/useWebSocket";

const EMPTY_FORM: ExamEditorForm = {
  title: "",
  examCode: "",

  courseCode: "",
  courseName: "",

  description: "",

  startsAt: "",
  endsAt: "",

  durationMinutes: "60",
  passingPercentage: "50",

  resultReleasePolicy: "AFTER_EXAM_CLOSES",

  randomizeQuestionOrder: true,
  randomizeChoiceOrder: true,

  monitorTabVisibility: true,
  monitorWindowFocus: true,
  monitorFullscreenExit: true,
  monitorConnectionChanges: true,
};

const INPUT_CLASS_NAME = `
  mt-2 min-h-11 w-full
  rounded-md border border-slate-300
  bg-white px-3 text-sm
  text-slate-950 outline-none
  placeholder:text-slate-400
  transition-colors
  focus:border-blue-600
  focus:ring-[3px]
  focus:ring-blue-600/10
`;

const TEXTAREA_CLASS_NAME = `
  mt-2 min-h-28 w-full resize-y
  rounded-md border border-slate-300
  bg-white px-3 py-3 text-sm
  leading-6 text-slate-950 outline-none
  placeholder:text-slate-400
  transition-colors
  focus:border-blue-600
  focus:ring-[3px]
  focus:ring-blue-600/10
`;

const LABEL_CLASS_NAME = "text-xs font-semibold text-slate-700";

interface FieldErrorProps {
  message?: string;
}

function FieldError({ message }: FieldErrorProps) {
  if (message === undefined) {
    return null;
  }

  return (
    <p
      className="
        mt-1.5 text-xs
        leading-5 text-red-700
      "
      role="alert"
    >
      {message}
    </p>
  );
}

interface ToggleSettingProps {
  checked: boolean;
  description: string;
  label: string;
  name: keyof Pick<
    ExamEditorForm,
    | "randomizeQuestionOrder"
    | "randomizeChoiceOrder"
    | "monitorTabVisibility"
    | "monitorWindowFocus"
    | "monitorFullscreenExit"
    | "monitorConnectionChanges"
  >;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
}

function ToggleSetting({
  checked,
  description,
  label,
  name,
  onChange,
}: ToggleSettingProps) {
  return (
    <label
      className="
        grid cursor-pointer
        grid-cols-[20px_1fr]
        items-start gap-3
        rounded-lg border
        border-slate-200
        bg-slate-50 p-4
        transition-colors
        hover:border-slate-300
      "
    >
      <input
        className="
          mt-0.5 h-4 w-4
          accent-blue-700
        "
        type="checkbox"
        name={name}
        checked={checked}
        onChange={onChange}
      />

      <span>
        <strong
          className="
            block text-xs
            font-semibold
            text-slate-900
          "
        >
          {label}
        </strong>

        <span
          className="
            mt-1 block text-xs
            leading-5 text-slate-500
          "
        >
          {description}
        </span>
      </span>
    </label>
  );
}

function CreateExamPage() {
  const navigate = useNavigate();
  const { status: connectionStatus, sendMessage } = useWebSocket();

  const [form, setForm] = useState<ExamEditorForm>(EMPTY_FORM);

  const [errors, setErrors] = useState<ExamEditorValidationErrors>({});

  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleTextChange = (
    event: ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = event.target;

    setForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));

    setErrors((currentErrors) => ({
      ...currentErrors,
      [name]: undefined,
    }));

    if (feedback !== null) {
      setFeedback(null);
    }
  };

  const handleToggleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = event.target;

    setForm((currentForm) => ({
      ...currentForm,
      [name]: checked,
    }));

    if (feedback !== null) {
      setFeedback(null);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setFeedback(null);

    const validationErrors = validateExamEditorForm(form);

    setErrors(validationErrors);

    if (hasValidationErrors(validationErrors)) {
      setFeedback({
        type: "error",
        title: "Check the examination details",
        message:
          "Some fields are missing or invalid. Review the highlighted information before saving.",
      });

      return;
    }

    if (connectionStatus !== "connected") {
      setFeedback({
        type: "error",
        title: "Server connection unavailable",
        message:
          "The examination cannot be created until the server connection is restored.",
      });

      return;
    }

    setIsSubmitting(true);

    const requestId = sendMessage(
      "CREATE_EXAM",
      {
        title: form.title.trim(),

        description: form.description.trim(),

        durationMinutes: Number(form.durationMinutes),
      },
      (response) => {
        setIsSubmitting(false);

        if (
          response.type === "EXAM_CREATED" &&
          typeof response.data?.id === "number"
        ) {
          const createdExamId = response.data.id;

          navigate(`/teacher/exams/${createdExamId}/questions`);

          return;
        }

        setFeedback({
          type: "error",
          title: "Unable to create examination",
          message:
            response.error?.message ??
            "The server returned an unexpected response.",
        });
      },
    );

    if (requestId === null) {
      setIsSubmitting(false);

      setFeedback({
        type: "error",
        title: "Request could not be sent",
        message:
          "The WebSocket connection is not ready. Wait for the connection and try again.",
      });
    }
  };

  const handleReset = () => {
    setForm(EMPTY_FORM);
    setErrors({});
    setFeedback(null);
  };

  const releasePolicyOptions: Array<{
    value: ResultReleasePolicy;
    label: string;
    description: string;
  }> = [
    {
      value: "IMMEDIATE",
      label: "Immediately after submission",
      description:
        "Students can see the released result as soon as their submission is finalized.",
    },
    {
      value: "AFTER_EXAM_CLOSES",
      label: "After the examination closes",
      description:
        "Results remain hidden until the examination availability window ends.",
    },
    {
      value: "MANUAL",
      label: "Manual publication",
      description: "The lecturer decides when results become visible.",
    },
  ];

  return (
    <>
      <section
        className="
          flex items-end
          justify-between gap-8
          max-md:flex-col
          max-md:items-start
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
            Examination creation
          </p>

          <h1
            className="
              mt-3 text-3xl
              font-semibold
              tracking-[-0.035em]
              text-slate-950
            "
          >
            Create a draft examination
          </h1>

          <p
            className="
              mt-3 max-w-3xl
              text-sm leading-6
              text-slate-600
            "
          >
            Configure the examination identity, schedule, randomization, result
            publication, and monitoring policy. Questions will be added in the
            next step.
          </p>
        </div>

        <Link
          className="
            inline-flex min-h-11
            items-center justify-center
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
          Cancel
        </Link>
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
        <strong>Frontend mock:</strong> saving this form currently creates an
        in-memory demonstration ID. Core draft data is persisted through the
        Java server. Scheduling, course metadata, result-release policy,
        randomization, and monitoring settings will be connected in later
        modules.
      </div>

      {feedback !== null && (
        <div className="mt-6">
          <FeedbackMessage
            feedback={feedback}
            onClose={() => setFeedback(null)}
          />
        </div>
      )}

      <form
        className="
          mt-6 grid
          grid-cols-[minmax(0,2fr)_minmax(300px,1fr)]
          items-start gap-6
          max-xl:grid-cols-1
        "
        onSubmit={handleSubmit}
      >
        <div className="space-y-6">
          <section
            className="
              rounded-xl border
              border-slate-200
              bg-white p-6
            "
          >
            <p
              className="
                text-[11px] font-bold
                uppercase
                tracking-[0.15em]
                text-blue-700
              "
            >
              Step 1
            </p>

            <h2
              className="
                mt-2 text-lg
                font-semibold
                text-slate-950
              "
            >
              Basic information
            </h2>

            <p
              className="
                mt-1 text-xs
                leading-5 text-slate-500
              "
            >
              Use stable codes because they may appear in reports, monitoring
              views, and exported records.
            </p>

            <div
              className="
                mt-6 grid
                grid-cols-2 gap-5
                max-md:grid-cols-1
              "
            >
              <div className="col-span-2 max-md:col-span-1">
                <label className={LABEL_CLASS_NAME} htmlFor="title">
                  Examination title
                </label>

                <input
                  className={INPUT_CLASS_NAME}
                  id="title"
                  name="title"
                  type="text"
                  value={form.title}
                  onChange={handleTextChange}
                  placeholder="Java Software Development Midterm"
                  maxLength={255}
                  required
                />

                <FieldError message={errors.title} />
              </div>

              <div>
                <label className={LABEL_CLASS_NAME} htmlFor="examCode">
                  Examination code
                </label>

                <input
                  className={INPUT_CLASS_NAME}
                  id="examCode"
                  name="examCode"
                  type="text"
                  value={form.examCode}
                  onChange={handleTextChange}
                  placeholder="JSD-MIDTERM-01"
                  maxLength={40}
                  required
                />

                <FieldError message={errors.examCode} />
              </div>

              <div>
                <label className={LABEL_CLASS_NAME} htmlFor="courseCode">
                  Course code
                </label>

                <input
                  className={INPUT_CLASS_NAME}
                  id="courseCode"
                  name="courseCode"
                  type="text"
                  value={form.courseCode}
                  onChange={handleTextChange}
                  placeholder="JSD301"
                  maxLength={20}
                  required
                />

                <FieldError message={errors.courseCode} />
              </div>

              <div className="col-span-2 max-md:col-span-1">
                <label className={LABEL_CLASS_NAME} htmlFor="courseName">
                  Course name
                </label>

                <input
                  className={INPUT_CLASS_NAME}
                  id="courseName"
                  name="courseName"
                  type="text"
                  value={form.courseName}
                  onChange={handleTextChange}
                  placeholder="Java Software Development"
                  maxLength={255}
                  required
                />

                <FieldError message={errors.courseName} />
              </div>

              <div className="col-span-2 max-md:col-span-1">
                <label className={LABEL_CLASS_NAME} htmlFor="description">
                  Description
                </label>

                <textarea
                  className={TEXTAREA_CLASS_NAME}
                  id="description"
                  name="description"
                  value={form.description}
                  onChange={handleTextChange}
                  placeholder="Describe the scope, instructions, and intended participants."
                  maxLength={2000}
                />

                <p className="mt-1.5 text-right text-[11px] text-slate-400">
                  {form.description.length}
                  /2000
                </p>
              </div>
            </div>
          </section>

          <section
            className="
              rounded-xl border
              border-slate-200
              bg-white p-6
            "
          >
            <p
              className="
                text-[11px] font-bold
                uppercase
                tracking-[0.15em]
                text-blue-700
              "
            >
              Step 2
            </p>

            <h2
              className="
                mt-2 text-lg
                font-semibold
                text-slate-950
              "
            >
              Schedule and grading
            </h2>

            <div
              className="
                mt-6 grid
                grid-cols-2 gap-5
                max-md:grid-cols-1
              "
            >
              <div>
                <label className={LABEL_CLASS_NAME} htmlFor="startsAt">
                  Opens at
                </label>

                <input
                  className={INPUT_CLASS_NAME}
                  id="startsAt"
                  name="startsAt"
                  type="datetime-local"
                  value={form.startsAt}
                  onChange={handleTextChange}
                  required
                />

                <FieldError message={errors.startsAt} />
              </div>

              <div>
                <label className={LABEL_CLASS_NAME} htmlFor="endsAt">
                  Closes at
                </label>

                <input
                  className={INPUT_CLASS_NAME}
                  id="endsAt"
                  name="endsAt"
                  type="datetime-local"
                  value={form.endsAt}
                  onChange={handleTextChange}
                  required
                />

                <FieldError message={errors.endsAt} />
              </div>

              <div>
                <label className={LABEL_CLASS_NAME} htmlFor="durationMinutes">
                  Duration in minutes
                </label>

                <input
                  className={INPUT_CLASS_NAME}
                  id="durationMinutes"
                  name="durationMinutes"
                  type="number"
                  value={form.durationMinutes}
                  onChange={handleTextChange}
                  min={1}
                  max={480}
                  step={1}
                  required
                />

                <FieldError message={errors.durationMinutes} />
              </div>

              <div>
                <label className={LABEL_CLASS_NAME} htmlFor="passingPercentage">
                  Passing percentage
                </label>

                <input
                  className={INPUT_CLASS_NAME}
                  id="passingPercentage"
                  name="passingPercentage"
                  type="number"
                  value={form.passingPercentage}
                  onChange={handleTextChange}
                  min={0}
                  max={100}
                  step={0.1}
                  required
                />

                <FieldError message={errors.passingPercentage} />
              </div>
            </div>
          </section>

          <section
            className="
              rounded-xl border
              border-slate-200
              bg-white p-6
            "
          >
            <p
              className="
                text-[11px] font-bold
                uppercase
                tracking-[0.15em]
                text-blue-700
              "
            >
              Step 3
            </p>

            <h2
              className="
                mt-2 text-lg
                font-semibold
                text-slate-950
              "
            >
              Result publication
            </h2>

            <div className="mt-5 grid gap-3">
              {releasePolicyOptions.map((option) => {
                const selected = form.resultReleasePolicy === option.value;

                return (
                  <label
                    key={option.value}
                    className={`
                        grid cursor-pointer
                        grid-cols-[20px_1fr]
                        items-start gap-3
                        rounded-lg border
                        p-4
                        ${
                          selected
                            ? `
                              border-blue-500
                              bg-blue-50
                            `
                            : `
                              border-slate-200
                              bg-white
                            `
                        }
                      `}
                  >
                    <input
                      className="
                          mt-0.5 h-4 w-4
                          accent-blue-700
                        "
                      type="radio"
                      name="resultReleasePolicy"
                      value={option.value}
                      checked={selected}
                      onChange={handleTextChange}
                    />

                    <span>
                      <strong className="block text-xs font-semibold text-slate-900">
                        {option.label}
                      </strong>

                      <span className="mt-1 block text-xs leading-5 text-slate-500">
                        {option.description}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          </section>
        </div>

        <aside
          className="
            sticky top-[100px]
            space-y-6
            max-xl:static
          "
        >
          <section
            className="
              rounded-xl border
              border-slate-200
              bg-white p-5
            "
          >
            <h2 className="text-sm font-semibold text-slate-950">
              Randomization
            </h2>

            <p className="mt-1 text-xs leading-5 text-slate-500">
              The server will create and persist a stable variant for each
              attempt.
            </p>

            <div className="mt-4 grid gap-3">
              <ToggleSetting
                checked={form.randomizeQuestionOrder}
                description="Generate a different question order for each attempt."
                label="Randomize question order"
                name="randomizeQuestionOrder"
                onChange={handleToggleChange}
              />

              <ToggleSetting
                checked={form.randomizeChoiceOrder}
                description="Generate a different choice order while preserving original IDs."
                label="Randomize choice order"
                name="randomizeChoiceOrder"
                onChange={handleToggleChange}
              />
            </div>
          </section>

          <section
            className="
              rounded-xl border
              border-slate-200
              bg-white p-5
            "
          >
            <h2 className="text-sm font-semibold text-slate-950">
              Monitoring policy
            </h2>

            <p className="mt-1 text-xs leading-5 text-slate-500">
              These settings record explainable signals. They do not
              automatically prove cheating.
            </p>

            <div className="mt-4 grid gap-3">
              <ToggleSetting
                checked={form.monitorTabVisibility}
                description="Record when the examination tab becomes hidden."
                label="Tab visibility"
                name="monitorTabVisibility"
                onChange={handleToggleChange}
              />

              <ToggleSetting
                checked={form.monitorWindowFocus}
                description="Record when the browser window loses focus."
                label="Window focus"
                name="monitorWindowFocus"
                onChange={handleToggleChange}
              />

              <ToggleSetting
                checked={form.monitorFullscreenExit}
                description="Record when fullscreen mode is exited."
                label="Fullscreen exit"
                name="monitorFullscreenExit"
                onChange={handleToggleChange}
              />

              <ToggleSetting
                checked={form.monitorConnectionChanges}
                description="Record disconnect and reconnect transitions."
                label="Connection changes"
                name="monitorConnectionChanges"
                onChange={handleToggleChange}
              />
            </div>
          </section>

          <section
            className="
              rounded-xl border
              border-blue-200
              bg-blue-50 p-5
            "
          >
            <h2 className="text-sm font-semibold text-blue-950">
              Save as draft
            </h2>

            <p className="mt-2 text-xs leading-5 text-blue-800">
              A new examination remains in DRAFT until questions, choices,
              assignments, and publication checks are complete.
            </p>

            <div className="mt-5 grid gap-3">
              <button
                className="
                  min-h-11 rounded-md
                  bg-blue-700 px-4
                  text-sm font-semibold
                  text-white
                  transition-colors
                  hover:bg-blue-800
                  disabled:cursor-not-allowed
                  disabled:bg-slate-400
                "
                type="submit"
                disabled={isSubmitting || connectionStatus !== "connected"}
              >
                {isSubmitting
                  ? "Creating draft..."
                  : "Create draft examination"}
              </button>

              <button
                className="
                    min-h-11 rounded-md
                    border border-blue-300
                    bg-white px-4
                    text-sm font-semibold
                    text-blue-800
                    transition-colors
                    hover:border-blue-500
                    disabled:cursor-not-allowed
                    disabled:opacity-60
                  "
                type="button"
                onClick={handleReset}
                disabled={isSubmitting}
              >
                Reset form
              </button>
            </div>
          </section>
        </aside>
      </form>
    </>
  );
}

export default CreateExamPage;
