export type Role = 'admin' | 'faculty' | 'student';

export interface User {
  id: string;
  name: string;
  role: Role;
  username: string;
  email?: string;
  department?: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}
