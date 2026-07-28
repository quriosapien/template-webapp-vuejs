import type { LoginRequest, LoginResponse, User } from '@/types/auth.types';
import { httpRequest } from './http.client';

export const authApi = {
  /** skipAuth: a login must never trigger the refresh flow. */
  login: (credentials: LoginRequest) =>
    httpRequest<LoginResponse>('/auth/login', {
      method: 'POST',
      body: credentials,
      skipAuth: true,
    }),

  logout: () => httpRequest<void>('/auth/logout', { method: 'POST' }),

  /** Session bootstrap rides on the client's 401→refresh→retry: calling me()
   *  with only a stored refresh token transparently re-authenticates. */
  me: () => httpRequest<User>('/auth/me'),
};
