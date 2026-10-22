import {
  useState,
  type ReactNode,
} from 'react';

import type {
  AuthenticatedUser,
} from '../types/auth';

import {
  AuthContext,
} from './authContext';

interface AuthProviderProps {
  children: ReactNode;
}

function AuthProvider({
  children,
}: AuthProviderProps) {
  const [user, setUser] =
    useState<
      AuthenticatedUser | null
    >(null);

  const login = (
    authenticatedUser:
      AuthenticatedUser,
  ) => {
    setUser(authenticatedUser);
  };

  const logout = () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export default AuthProvider;