import {
  useEffect,
  useState,
  type ChangeEvent,
  type FormEvent,
} from 'react';

import { useNavigate } from 'react-router';

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

interface LoginPageProps {
  connectionStatus: ConnectionStatus;
  lastMessage: ServerMessage | null;

  sendMessage: (
    type: 'LOGIN',
    payload: Record<string, unknown>,
  ) => string | null;
}

interface LoginFormState {
  username: string;
  password: string;
}

const EMPTY_LOGIN_FORM: LoginFormState = {
  username: '',
  password: '',
};

const INPUT_CLASS_NAME = `
  min-h-[50px] w-full rounded-md
  border border-slate-200 bg-white
  px-3.5 text-sm text-slate-950 outline-none
  placeholder:text-slate-400
  transition-colors
  hover:border-slate-300
  focus:border-blue-600
  focus:ring-[3px] focus:ring-blue-600/10
`;

function LoginPage({
  connectionStatus,
  lastMessage,
  sendMessage,
}: LoginPageProps) {
  const navigate = useNavigate();

  const [form, setForm] =
    useState<LoginFormState>(EMPTY_LOGIN_FORM);

  const [showPassword, setShowPassword] =
    useState(false);

  const [feedback, setFeedback] =
    useState<Feedback | null>(null);

  const [pendingRequestId, setPendingRequestId] =
    useState<string | null>(null);

  const isConnected = connectionStatus === 'connected';
  const isSubmitting = pendingRequestId !== null;

  useEffect(() => {
    if (
      lastMessage === null ||
      pendingRequestId === null ||
      lastMessage.requestId !== pendingRequestId
    ) {
      return;
    }

    if (lastMessage.type === 'LOGGED_IN') {
      setPendingRequestId(null);

      if (lastMessage.data?.role === 'TEACHER') {
        navigate('/teacher', {
          replace: true,
        });

        return;
      }

      navigate('/student/exams', {
        replace: true,
      });

      return;
    }

    if (lastMessage.type === 'ERROR') {
      const errorCode =
        lastMessage.error?.code ?? 'LOGIN_FAILED';

      const errorMessage =
        lastMessage.error?.message ??
        'The server could not complete the login request.';

      setFeedback({
        type: 'error',
        title: 'Login failed',
        message: `${errorCode}: ${errorMessage}`,
      });

      setPendingRequestId(null);
    }
  }, [
    lastMessage,
    navigate,
    pendingRequestId,
  ]);

  useEffect(() => {
    if (
      pendingRequestId !== null &&
      (connectionStatus === 'disconnected' ||
        connectionStatus === 'error')
    ) {
      setFeedback({
        type: 'error',
        title: 'Connection lost',
        message:
          'The connection to the examination server was lost. Please try again when the server is available.',
      });

      setPendingRequestId(null);
    }
  }, [connectionStatus, pendingRequestId]);

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

  const validateForm = (): string | null => {
    if (form.username.trim().length === 0) {
      return 'Please enter your username or student ID.';
    }

    if (form.password.length === 0) {
      return 'Please enter your password.';
    }

    return null;
  };

  const handleSubmit = (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    setFeedback(null);

    const validationError = validateForm();

    if (validationError !== null) {
      setFeedback({
        type: 'error',
        title: 'Check your information',
        message: validationError,
      });

      return;
    }

    if (!isConnected) {
      setFeedback({
        type: 'error',
        title: 'Server unavailable',
        message:
          'The client is not connected to the examination server at ws://localhost:8081/ws.',
      });

      return;
    }

    const requestId = sendMessage('LOGIN', {
      username: form.username.trim(),
      password: form.password,
    });

    if (requestId === null) {
      setFeedback({
        type: 'error',
        title: 'Request not sent',
        message:
          'The WebSocket connection is not ready. Please wait and try again.',
      });

      return;
    }

    setPendingRequestId(requestId);
  };

  const connectionText =
    connectionStatus === 'connected'
      ? 'Ready for secure sign-in'
      : connectionStatus === 'connecting'
        ? 'Connecting to the server...'
        : 'Examination server unavailable';

  const connectionTextColor =
    connectionStatus === 'connected'
      ? 'text-emerald-700'
      : connectionStatus === 'connecting'
        ? 'text-amber-700'
        : 'text-red-700';

  return (
    <main
      className="
        min-h-screen bg-[#f4f7fb]
        p-8 text-slate-950
        max-lg:p-5 max-sm:p-3.5
      "
    >
      <SystemHeader
        connectionStatus={connectionStatus}
      />

      <section
        className="
          mx-auto grid min-h-[720px] w-full
          max-w-[1240px]
          grid-cols-[minmax(390px,5fr)_minmax(520px,7fr)]
          overflow-hidden rounded-xl
          border border-slate-200/90 bg-white
          shadow-[0_20px_50px_rgb(15_23_42/0.10)]
          max-lg:grid-cols-1
        "
      >
        <InstitutionPanel />

        <section
          className="
            flex flex-col justify-center
            bg-white p-14
            max-lg:p-10 max-sm:p-6
          "
        >
          <div className="mx-auto w-full max-w-[520px]">
            <div>
              <p
                className="
                  mb-3 text-[11px] font-bold
                  tracking-[0.16em] text-blue-700
                "
              >
                VERIFIED ACCESS
              </p>

              <h1
                className="
                  text-[34px] font-semibold
                  tracking-[-0.04em] text-slate-950
                "
              >
                Sign in to your account
              </h1>

              <p className="mt-3 text-sm leading-6 text-slate-500">
                Use the account issued by your examination
                administrator or institution.
              </p>
            </div>

            <div
              className="
                mt-7 flex items-center justify-between
                rounded-md border border-slate-200
                bg-slate-50 px-4 py-3
              "
            >
              <div>
                <p className="text-xs font-semibold text-slate-800">
                  Examination server
                </p>

                <p
                  className={`
                    mt-1 text-xs font-medium
                    ${connectionTextColor}
                  `}
                >
                  {connectionText}
                </p>
              </div>

              <span
                className={`
                  h-2.5 w-2.5 rounded-full
                  ${
                    connectionStatus === 'connected'
                      ? 'bg-emerald-500'
                      : connectionStatus === 'connecting'
                        ? 'bg-amber-500'
                        : 'bg-red-500'
                  }
                `}
                aria-hidden="true"
              />
            </div>

            <div className="mt-7">
              {feedback !== null && (
                <FeedbackMessage
                  feedback={feedback}
                  onClose={() => setFeedback(null)}
                />
              )}

              <form
                className="grid gap-5"
                onSubmit={handleSubmit}
              >
                <div className="grid gap-2.5">
                  <label
                    className="
                      text-sm font-semibold text-slate-800
                    "
                    htmlFor="username"
                  >
                    Username or student ID
                  </label>

                  <input
                    className={INPUT_CLASS_NAME}
                    id="username"
                    name="username"
                    type="text"
                    value={form.username}
                    onChange={handleInputChange}
                    placeholder="Enter your username"
                    autoComplete="username"
                    autoFocus
                    required
                  />
                </div>

                <div className="grid gap-2.5">
                  <div className="flex items-center justify-between">
                    <label
                      className="
                        text-sm font-semibold text-slate-800
                      "
                      htmlFor="password"
                    >
                      Password
                    </label>

                    <button
                      type="button"
                      className="
                        text-xs font-semibold text-blue-700
                        hover:text-blue-800
                      "
                      onClick={() =>
                        setFeedback({
                          type: 'error',
                          title: 'Feature unavailable',
                          message:
                            'Password recovery has not been implemented yet. Please contact the examination administrator.',
                        })
                      }
                    >
                      Forgot password?
                    </button>
                  </div>

                  <div className="relative">
                    <input
                      className={`${INPUT_CLASS_NAME} pr-16`}
                      id="password"
                      name="password"
                      type={
                        showPassword
                          ? 'text'
                          : 'password'
                      }
                      value={form.password}
                      onChange={handleInputChange}
                      placeholder="Enter your password"
                      autoComplete="current-password"
                      required
                    />

                    <button
                      type="button"
                      className="
                        absolute right-3 top-1/2
                        -translate-y-1/2
                        rounded px-1.5 py-1
                        text-xs font-semibold text-blue-700
                        hover:bg-blue-50
                      "
                      aria-label={
                        showPassword
                          ? 'Hide password'
                          : 'Show password'
                      }
                      onClick={() =>
                        setShowPassword(
                          (currentValue) =>
                            !currentValue,
                        )
                      }
                    >
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>

                <label
                  className="
                    flex items-start gap-2.5
                    text-xs leading-5 text-slate-600
                  "
                >
                  <input
                    className="
                      mt-0.5 h-4 w-4
                      accent-blue-700
                    "
                    type="checkbox"
                  />

                  <span>
                    Keep me signed in on this trusted device.
                  </span>
                </label>

                <button
                  className="
                    flex min-h-[54px] items-center
                    justify-center gap-3
                    rounded-md border border-blue-700
                    bg-blue-700 px-5
                    text-sm font-semibold text-white
                    shadow-sm transition-colors
                    hover:border-blue-800
                    hover:bg-blue-800
                    disabled:cursor-not-allowed
                    disabled:border-slate-300
                    disabled:bg-slate-400
                  "
                  type="submit"
                  disabled={
                    !isConnected || isSubmitting
                  }
                >
                  {isSubmitting
                    ? 'Signing in...'
                    : 'Continue to examinations'}

                  <span
                    className="text-lg leading-none"
                    aria-hidden="true"
                  >
                    →
                  </span>
                </button>
              </form>
            </div>

            <div
              className="
                mt-8 border-t border-slate-200 pt-6
                text-xs leading-5 text-slate-500
              "
            >
              <p>
                Student accounts are created or approved by the
                examination administrator. Public registration is
                not available.
              </p>
            </div>
          </div>
        </section>
      </section>

      <SystemFooter />
    </main>
  );
}

export default LoginPage;