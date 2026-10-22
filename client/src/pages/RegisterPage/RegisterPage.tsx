import {
  useState,
  type ChangeEvent,
  type FormEvent,
} from 'react';

import FeedbackMessage, {
  type Feedback,
} from '../../components/common/FeedbackMessage';

import InstitutionPanel from '../../components/layout/InstitutionPanel';
import SystemFooter from '../../components/layout/SystemFooter';
import SystemHeader from '../../components/layout/SystemHeader';

import type {
  ServerMessage,
} from '../../websocket/protocol';

import type {
  ConnectionStatus,
} from '../../websocket/useExamWebSocket';

import {
  EMPTY_REGISTER_FORM,
  validateRegisterForm,
  type RegisterFormState,
} from './registerValidation';

interface RegisterPageProps {
  connectionStatus: ConnectionStatus;

  sendMessage: (
    type: 'REGISTER',
    payload: Record<string, unknown>,
    onResponse: (
      message: ServerMessage
    ) => void,
  ) => string | null;
}

const INPUT_CLASS_NAME = `
  min-h-[50px] w-full rounded-md border border-slate-200
  bg-white px-3.5 text-sm text-slate-950 outline-none
  placeholder:text-slate-400 transition-colors
  hover:border-slate-300 focus:border-blue-600
  focus:ring-[3px] focus:ring-blue-600/10
`;

const LABEL_CLASS_NAME =
  'text-sm font-semibold text-slate-800';

function RegisterPage({
  connectionStatus,
  sendMessage,
}: RegisterPageProps) {
  const [form, setForm] = useState<RegisterFormState>(
    EMPTY_REGISTER_FORM,
  );

  const [showPassword, setShowPassword] = useState(false);

  const [feedback, setFeedback] =
    useState<Feedback | null>(null);

  const [pendingRequestId, setPendingRequestId] =
    useState<string | null>(null);

  const isConnected = connectionStatus === 'connected';
  const isSubmitting = pendingRequestId !== null;

  const supportStatusClass =
    connectionStatus === 'connected'
      ? 'text-emerald-700'
      : connectionStatus === 'error' ||
          connectionStatus === 'disconnected'
        ? 'text-red-700'
        : 'text-amber-700';

  const supportStatusText =
    connectionStatus === 'connected'
      ? 'Connected'
      : connectionStatus === 'connecting'
        ? 'Connecting...'
        : 'Not connected';

  const handleRegisterResponse = (
    message: ServerMessage,
  ) => {
    setPendingRequestId(null);

    if (message.type === 'REGISTERED') {
      const registeredName =
        message.data?.fullName ?? 'the student';

      setFeedback({
        type: 'success',
        message:
          `The account for ${registeredName} ` +
          'has been created successfully.',
      });

      setForm(EMPTY_REGISTER_FORM);
      return;
    }

    const errorCode =
      message.error?.code ?? 'UNKNOWN_ERROR';

    const errorMessage =
      message.error?.message ??
      'The server could not process the registration request.';

    setFeedback({
      type: 'error',
      message: `${errorCode}: ${errorMessage}`,
    });
  };

  const handleInputChange = (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const { name, value } = event.target;

    setForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));

    if (feedback !== null) {
      setFeedback(null);
    }
  };

  const handleSubmit = (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    setFeedback(null);

    if (!isConnected) {
      setFeedback({
        type: 'error',
        message:
          'The client is not connected to the server at ws://localhost:8081/ws.',
      });
      return;
    }

    const validationError = validateRegisterForm(form);

    if (validationError !== null) {
      setFeedback({
        type: 'error',
        message: validationError,
      });
      return;
    }

    const requestId = sendMessage('REGISTER', {
      username: form.username.trim(),
      fullName: form.fullName.trim(),
      email: form.email.trim(),
      password: form.password,
    }, handleRegisterResponse);

    if (requestId === null) {
      setFeedback({
        type: 'error',
        message:
          'The request could not be sent because the WebSocket connection is not ready.',
      });
      return;
    }

    setPendingRequestId(requestId);
  };

  return (
    <main
      className="
        min-h-screen bg-[#f4f7fb] p-8 text-slate-950
        max-lg:p-5 max-sm:p-3.5
      "
    >
      <SystemHeader connectionStatus={connectionStatus} />

      <section
        className="
          mx-auto grid min-h-[720px] w-full max-w-[1240px]
          grid-cols-[minmax(390px,5fr)_minmax(520px,7fr)]
          overflow-hidden rounded-xl border border-slate-200/90
          bg-white shadow-[0_20px_50px_rgb(15_23_42/0.10)]
          max-lg:grid-cols-1
        "
      >
        <InstitutionPanel />

        <section
          className="
            bg-white p-14
            max-lg:p-10 max-sm:p-6
          "
        >
          <div
            className="
              grid grid-cols-2 rounded-lg border border-slate-200 bg-slate-50 p-1
              max-sm:grid-cols-1
            "
            aria-label="Account type"
          >
            <button
              className="
                min-h-11 rounded-md border border-slate-200
                bg-white px-4 py-2 shadow-sm
                text-sm font-semibold text-slate-950
              "
              type="button"
            >
              Student / Candidate
            </button>

            <button
              className="
                min-h-11 rounded-md border border-transparent
                bg-transparent px-4 py-2
                text-sm font-medium text-slate-500
                disabled:cursor-not-allowed disabled:opacity-50
                max-sm:hidden
              "
              type="button"
              disabled
              title="This feature will be implemented later"
            >
              Staff / Lecturer
            </button>
          </div>

          <div className="mb-8 mt-10">
            <p
              className="
                mb-3 text-[11px] font-bold
                tracking-[0.16em] text-blue-700
              "
            >
              ACCOUNT REGISTRATION
            </p>

            <h2
              className="
                m-0 text-[32px] font-semibold tracking-[-0.035em]
                text-slate-950
              "
            >
              Student registration
            </h2>

            <p className="mt-3 max-w-lg text-sm leading-6 text-slate-500">
              Create your account first. Your information is sent
              securely to the examination server in real time.
            </p>
          </div>

          {feedback !== null && (
            <FeedbackMessage
              feedback={feedback}
              onClose={() => setFeedback(null)}
            />
          )}

          <form
            className="grid gap-5.5"
            onSubmit={handleSubmit}
          >
            <div
              className="
                grid grid-cols-2 gap-5
                max-sm:grid-cols-1
              "
            >
              <div className="grid gap-2.5">
                <label
                  className={LABEL_CLASS_NAME}
                  htmlFor="username"
                >
                  Username{' '}
                  <span className="text-red-600">*</span>
                </label>

                <input
                  className={INPUT_CLASS_NAME}
                  id="username"
                  name="username"
                  type="text"
                  value={form.username}
                  onChange={handleInputChange}
                  placeholder="Example: student01"
                  autoComplete="username"
                  minLength={3}
                  maxLength={50}
                  required
                />

                <small className="-mt-0.5 text-xs leading-5 text-slate-500">
                  Use letters, numbers, dots, underscores, or
                  hyphens.
                </small>
              </div>

              <div className="grid gap-2.5">
                <label
                  className={LABEL_CLASS_NAME}
                  htmlFor="fullName"
                >
                  Full name{' '}
                  <span className="text-red-600">*</span>
                </label>

                <input
                  className={INPUT_CLASS_NAME}
                  id="fullName"
                  name="fullName"
                  type="text"
                  value={form.fullName}
                  onChange={handleInputChange}
                  placeholder="Example: Alex Nguyen"
                  autoComplete="name"
                  minLength={2}
                  maxLength={100}
                  required
                />
                <small className='-mt-0.5 text-xs leading-5 text-transparent' aria-hidden='true'> Placeholder helper text</small>
              </div>
            </div>

            <div className="grid gap-2.5">
              <label
                className={LABEL_CLASS_NAME}
                htmlFor="email"
              >
                Email address{' '}
                <span className="text-red-600">*</span>
              </label>

              <input
                className={INPUT_CLASS_NAME}
                id="email"
                name="email"
                type="email"
                value={form.email}
                onChange={handleInputChange}
                placeholder="student@example.com"
                autoComplete="email"
                maxLength={255}
                required
              />
            </div>

            <div
              className="
                grid grid-cols-2 gap-5
                max-sm:grid-cols-1
              "
            >
              <div className="grid gap-2.5">
                <label
                  className={LABEL_CLASS_NAME}
                  htmlFor="password"
                >
                  Password{' '}
                  <span className="text-red-600">*</span>
                </label>

                <div className="relative">
                  <input
                    className={`${INPUT_CLASS_NAME} pr-16`}
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={handleInputChange}
                    placeholder="At least 8 characters"
                    autoComplete="new-password"
                    minLength={8}
                    required
                  />

                  <button
                    className="
                      absolute right-3 top-1/2
                      -translate-y-1/2 border-0
                      bg-transparent p-1
                      text-xs font-bold text-blue-700
                    "
                    type="button"
                    aria-label={
                      showPassword
                        ? 'Hide password'
                        : 'Show password'
                    }
                    onClick={() =>
                      setShowPassword(
                        (currentValue) => !currentValue,
                      )
                    }
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              <div className="grid gap-2.5">
                <label
                  className={LABEL_CLASS_NAME}
                  htmlFor="confirmPassword"
                >
                  Confirm password{' '}
                  <span className="text-red-600">*</span>
                </label>

                <input
                  className={INPUT_CLASS_NAME}
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  value={form.confirmPassword}
                  onChange={handleInputChange}
                  placeholder="Enter the password again"
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
              </div>
            </div>

            <label
              className="
                grid grid-cols-[18px_1fr] items-start gap-2.5
                rounded-md border border-slate-200 bg-slate-50/70 p-3.5
                text-xs leading-5 text-slate-600
              "
            >
              <input
                className="mt-0.5 h-4 w-4 accent-blue-700"
                type="checkbox"
                required
              />

              <span>
                I confirm that the registration information is
                correct and agree to follow the online examination
                regulations.
              </span>
            </label>

            <button
              className="
                flex min-h-[54px] items-center justify-center gap-3
                rounded-md border border-blue-700
                bg-blue-700 px-5 text-sm font-semibold text-white
                shadow-sm transition-colors
                hover:border-blue-800 hover:bg-blue-800
                disabled:cursor-not-allowed
                disabled:border-slate-300 disabled:bg-slate-400
              "
              type="submit"
              disabled={!isConnected || isSubmitting}
            >
              {isSubmitting
                ? 'Submitting request...'
                : 'Create student account'}

              <span className="text-lg leading-none" aria-hidden="true">→</span>
            </button>
          </form>

          <div
            className="
              mt-8 grid grid-cols-[46px_1fr_auto]
              items-center gap-3.5 rounded-lg
              border border-slate-200 bg-slate-50 p-4
              max-sm:grid-cols-[42px_1fr]
            "
          >
            <div
              className="
                grid h-11 w-11 place-items-center
                rounded-md border border-blue-200
                bg-blue-50 text-xs font-extrabold text-blue-700
              "
              aria-hidden="true"
            >
              WS
            </div>

            <div>
              <strong className="block text-xs font-bold text-slate-950">
                Examination server connection
              </strong>

              <p className="mt-1 text-xs text-slate-500">
                WebSocket endpoint: ws://localhost:8081/ws
              </p>
            </div>

            <span
              className={`
                whitespace-nowrap text-xs font-bold
                max-sm:col-start-2
                ${supportStatusClass}
              `}
            >
              {supportStatusText}
            </span>
          </div>
        </section>
      </section>

      <SystemFooter />
    </main>
  );
}

export default RegisterPage;
