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

  const login = useCallback((authenticatedUser: AuthenticatedUser) => {
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
      setAuthState(
        (currentState) => {
          if (
            currentState.user === null
          ) {
            return currentState;
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