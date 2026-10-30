import type {
  UserRole,
} from '../websocket/protocol';

export interface AuthenticatedUser {
  id: number;

  institutionalId: string;
  fullName: string;
  email: string;

  role: UserRole;
}
