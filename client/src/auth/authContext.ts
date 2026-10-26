import {
  createContext,
} from 'react';

import type {
  AuthenticatedUser,
} from '../types/auth';

export interface AuthContextValue {
  user:
    AuthenticatedUser | null;

  sessionNotice: string | null;

  login: (
    authenticatedUser:
      AuthenticatedUser,
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