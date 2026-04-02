import { api } from './api';
import type { User } from '../types';

interface AuthResponse {
  user: User;
  access_token: string;
  refresh_token: string;
}

export async function signup(data: {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  phone: string;
}) {
  const res = await api.post<{ data: { user: User } }>('/auth/signup', data);
  return res.data.data;
}

export async function signin(email: string, password: string) {
  const res = await api.post<{ data: AuthResponse }>('/auth/signin', { email, password });
  return res.data.data;
}

export async function verifyEmail(email: string, code: string) {
  const res = await api.post<{ data: AuthResponse }>('/auth/verify-email', { email, code });
  return res.data.data;
}

export async function resendVerification(email: string) {
  await api.post('/auth/resend-verification', { email });
}

export async function refreshToken(refresh_token: string) {
  const res = await api.post<{ data: { access_token: string } }>('/auth/refresh', { refresh_token });
  return res.data.data.access_token;
}

export async function sendPhoneOtp(phone: string) {
  await api.post('/auth/send-phone-otp', { phone });
}

export async function verifyPhoneOtp(phone: string, code: string) {
  await api.post('/auth/verify-phone-otp', { phone, code });
}
