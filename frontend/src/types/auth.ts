export type UserRole = 'CUSTOMER' | 'ADMIN';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthResponseData {
  user: User;
  tokens: AuthTokens;
}

export interface RefreshTokenResponseData {
  tokens: AuthTokens;
}
