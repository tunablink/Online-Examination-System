import { useState, type ChangeEvent, type FormEvent } from "react";
import { Navigate, useLocation, useNavigate } from "react-router";

import { useAuth } from "../../auth/useAuth";
import FeedbackMessage, {
  type Feedback,
} from "../../components/common/FeedbackMessage";
import Icon from "../../components/common/Icon";
import AppBrand from "../../components/common/AppBrand";
import SystemFooter from "../../components/layout/SystemFooter";
import type { ServerMessage } from "../../websocket/protocol";
import { useWebSocket } from "../../websocket/useWebSocket";

const inputClass =
  "h-11 w-full rounded-lg border border-[#d6e1e4] bg-white px-3.5 text-base outline-none placeholder:text-[#9aa6aa] focus:border-[#70b2be] focus:ring-4 focus:ring-[#00849a]/10";

function LoginPage() {
  const { status: connectionStatus, sendMessage } = useWebSocket();
  const navigate = useNavigate();
  const location = useLocation();
  const { login, user, recovering, sessionNotice, clearSessionNotice } =
    useAuth();
  const [form, setForm] = useState({ loginId: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [pending, setPending] = useState(false);
  const displayedFeedback =
    feedback ??
    (sessionNotice
      ? {
          type: "error" as const,
          title: "Session ended",
          message: sessionNotice,
        }
      : null);

  const change = (event: ChangeEvent<HTMLInputElement>) => {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
    setFeedback(null);
  };
  const handleResponse = (message: ServerMessage) => {
    setPending(false);
    if (
      message.type === "LOGGED_IN" &&
      message.data?.id !== undefined &&
      message.data.institutionalId &&
      message.data.fullName &&
      message.data.email &&
      message.data.role
    ) {
      login(
        {
          id: message.data.id,
          institutionalId: message.data.institutionalId,
          fullName: message.data.fullName,
          email: message.data.email,
          role: message.data.role,
        },
        message.data.sessionToken,
      );
      const defaultDestination =
        message.data.role === "TEACHER" ? "/teacher" : "/student/exams";
      const requestedDestination =
        typeof location.state === "object" &&
        location.state !== null &&
        "from" in location.state &&
        typeof location.state.from === "string"
          ? location.state.from
          : null;
      const allowedPrefix =
        message.data.role === "TEACHER" ? "/teacher" : "/student";
      const safeDestination =
        requestedDestination === allowedPrefix ||
        requestedDestination?.startsWith(`${allowedPrefix}/`)
          ? requestedDestination
          : defaultDestination;
      navigate(safeDestination, { replace: true });
      return;
    }
    setFeedback({
      type: "error",
      title: "Login failed",
      message: `${message.error?.code ?? "LOGIN_FAILED"}: ${message.error?.message ?? "The server could not authenticate this account."}`,
    });
  };
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);
    if (!form.loginId.trim() || !form.password)
      return setFeedback({
        type: "error",
        message: "Enter your Student ID or Teacher ID and password.",
      });
    if (connectionStatus !== "connected")
      return setFeedback({
        type: "error",
        title: "Server unavailable",
        message: "Wait for the secure WebSocket connection before signing in.",
      });
    setPending(true);
    const requestId = sendMessage(
      "LOGIN",
      { institutionalId: form.loginId.trim(), password: form.password },
      handleResponse,
    );
    if (requestId === null) {
      setPending(false);
      setFeedback({
        type: "error",
        message: "The login request could not be sent.",
      });
    }
  };

  if (user !== null && !recovering)
    return (
      <Navigate
        to={user.role === "TEACHER" ? "/teacher" : "/student/exams"}
        replace
      />
    );

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-[#f5f9fb] px-6 py-10 text-[#172126] max-sm:px-4 max-sm:py-6">
      <section aria-labelledby="login-title" className="w-full max-w-[480px] shrink-0 rounded-2xl border border-[#dce7ea] bg-white shadow-[0_16px_48px_rgba(18,55,65,.08)]">
        <div className="p-10 max-sm:p-6">
          <div className="w-full max-w-[500px]">
            <div className="mb-7 flex justify-center">
              <AppBrand />
            </div>
            <h1 id="login-title" className="text-center text-[28px] font-bold tracking-[-.045em] max-sm:text-2xl">
              Sign in to your account
            </h1>
            <p className="mt-2 text-center text-base leading-6 text-[#718087]">
              Welcome to EZAM!
            </p>
            {displayedFeedback && (
              <div className="mt-5">
                <FeedbackMessage
                  feedback={displayedFeedback}
                  onClose={() => {
                    setFeedback(null);
                    clearSessionNotice();
                  }}
                />
              </div>
            )}
            <form className="mt-6 grid gap-5" onSubmit={submit}>
              <label className="grid gap-2">
                <span className="text-sm font-semibold text-[#405057]">
                  Student ID / Teacher ID
                </span>
                <div className="relative">
                  <Icon
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#829096]"
                    name="users"
                    size={15}
                  />
                  <input
                    autoComplete="username"
                    autoFocus
                    className={`${inputClass} pl-10`}
                    name="loginId"
                    onChange={change}
                    placeholder="Enter your Student ID or Teacher ID"
                    value={form.loginId}
                  />
                </div>
              </label>
              <label className="grid gap-2">
                <span className="flex items-center justify-between text-sm font-semibold text-[#405057]">
                  Password
                  <button
                    className="text-xs text-[#00778b]"
                    onClick={() =>
                      setFeedback({
                        type: "error",
                        title: "Contact your administrator",
                        message:
                          "Password recovery is not available in this milestone.",
                      })
                    }
                    type="button"
                  >
                    Forgot password?
                  </button>
                </span>
                <div className="relative">
                  <Icon
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#829096]"
                    name="lock"
                    size={15}
                  />
                  <input
                    autoComplete="current-password"
                    className={`${inputClass} pl-10 pr-14`}
                    name="password"
                    onChange={change}
                    placeholder="Enter your password"
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                  />
                  <button
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#00778b]"
                    onClick={() => setShowPassword((value) => !value)}
                    type="button"
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </label>
              <button
                className="inline-flex h-11 w-fit min-w-36 justify-self-center items-center justify-center gap-2 rounded-lg bg-[#00778b] px-7 text-base font-semibold text-white hover:bg-[#006273] disabled:bg-[#a6bdc2]"
                disabled={pending || connectionStatus !== "connected"}
                type="submit"
              >
                {pending ? "Signing in…" : "Sign in"}
                <Icon name="arrow-right" size={14} />
              </button>
            </form>
            <p className="mt-7 border-t border-[#e6edef] pt-5 text-center text-xs leading-5 text-[#819096]">
              System provided by EZAM
            </p>
          </div>
        </div>
      </section>
      <SystemFooter />
    </main>
  );
}

export default LoginPage;
