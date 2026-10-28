import {
  useCallback,
  useState,
  type ReactNode,
} from 'react';

import type {
  AuthenticatedUser,
} from '../types/auth';

import {
  AuthContext,
} from './authContext';
import { readSessionToken, storeSessionToken } from './sessionToken';

interface AuthState {
  user:
    AuthenticatedUser | null;

  sessionNotice:
    string | null;
}

const INITIAL_AUTH_STATE: AuthState = {
  user: null,
  sessionNotice: null,
};

interface AuthProviderProps {
  children: ReactNode;
}

function AuthProvider({children}: AuthProviderProps) {
  const [authState, setAuthState] =
    useState<AuthState>(INITIAL_AUTH_STATE);
  const [recovering, setRecovering] = useState(() => readSessionToken() !== null);
  const beginRecovery = useCallback(() => setRecovering(true), []);
  const finishRecovery = useCallback(() => setRecovering(false), []);

  const login = useCallback((authenticatedUser: AuthenticatedUser, sessionToken?: string) => {
      storeSessionToken(sessionToken ?? null);
      setRecovering(false);
      setAuthState({
        user: authenticatedUser,
        sessionNotice: null,
      });
    },
    [],
  );

  const logout = useCallback(
    (
      notice?: string,
    ) => {
      storeSessionToken(null);
      setRecovering(false);
      setAuthState(
        (currentState) => {
          if (
            currentState.user === null
          ) {
            return { ...currentState, sessionNotice: notice ?? null };
          }

          return {
            user: null,
            sessionNotice:
              notice ?? null,
          };
        },
      );
    },
    [],
  );

  const clearSessionNotice =
    useCallback(
      () => {
        setAuthState(
          (currentState) => {
            if (currentState.sessionNotice === null) {
              return currentState;
            }

            return {
              ...currentState,
              sessionNotice: null,
            };
          },
        );
      },
      [],
    );

  return (
    <AuthContext.Provider
      value={{
        recovering,
        beginRecovery,
        finishRecovery,
        user: authState.user,
        sessionNotice: authState.sessionNotice,
        login,
        logout,
        clearSessionNotice,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export default AuthProvider;
