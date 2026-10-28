import {
  createContext,
} from 'react';

import type {
  AuthenticatedUser,
} from '../types/auth';

export interface AuthContextValue {
  recovering: boolean;
  beginRecovery: () => void;
  finishRecovery: () => void;
  user:
    AuthenticatedUser | null;

  sessionNotice: string | null;

  login: (
    authenticatedUser:
      AuthenticatedUser,
    sessionToken?: string,
  ) => void;

  logout: (
    notice?: string
  ) => void;

  clearSessionNotice: () => void;
}

export const AuthContext =
  createContext<
    AuthContextValue | null
  >(null);
