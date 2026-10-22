import type {
  UserRole,
} from '../websocket/protocol';

export interface AuthenticatedUser {
  id: number;

  username: string;
  fullName: string;
  email: string;

  role: UserRole;
}