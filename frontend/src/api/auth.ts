import client from './client';

export interface LoginParams {
  username: string;
  password: string;
}

export interface UserInfo {
  id: number;
  name: string;
  username: string;
  role: string;
  phone?: string;
  balance: number;
}

export async function login(params: LoginParams) {
  const { data } = await client.post('/auth/login', params);
  return data;
}

export async function getMe(): Promise<UserInfo> {
  const { data } = await client.get('/auth/me');
  return data;
}

export async function changePassword(oldPassword: string, newPassword: string) {
  const { data } = await client.put('/auth/password', { old_password: oldPassword, new_password: newPassword });
  return data;
}