import {
  createContext,
} from 'react';

import type {
  AuthenticatedUser,
} from '../types/auth';

export interface AuthContextValue {
  user:
    AuthenticatedUser | null;

  login: (
    authenticatedUser:
      AuthenticatedUser,
  ) => void;

  logout: () => void;
}

export const AuthContext =
  createContext<
    AuthContextValue | null
  >(null);