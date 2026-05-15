import client from './client';

export interface StudentItem {
  id: number;
  name: string;
  username: string;
  role: string;
  phone?: string;
  remark?: string;
  balance: number;
  is_active: boolean;
  created_at: string;
  order_count: number;
  total_freight: number;
  total_recharged: number;
  freight_balance: number;
}

export async function getStudents(params: { page?: number; page_size?: number; search?: string }) {
  const { data } = await client.get('/students', { params });
  return data;
}

export async function createStudent(body: { name: string; phone?: string; remark?: string; password?: string }) {
  const { data } = await client.post('/students', body);
  return data;
}

export async function getStudent(id: number) {
  const { data } = await client.get(`/students/${id}`);
  return data;
}

export async function updateStudent(id: number, body: { name?: string; phone?: string; remark?: string; password?: string }) {
  const { data } = await client.put(`/students/${id}`, body);
  return data;
}

export async function toggleStudent(id: number) {
  const { data } = await client.patch(`/students/${id}/toggle`);
  return data;
}

export async function rechargeStudent(id: number, amount: number, remark?: string, recharge_date?: string) {
  const { data } = await client.post(`/students/${id}/recharges`, { amount, remark, recharge_date });
  return data;
}

export async function getRecharges(id: number, page = 1, pageSize = 20) {
  const { data } = await client.get(`/students/${id}/recharges`, { params: { page, page_size: pageSize } });
  return data;
}

export async function getDeductions(id: number, page = 1, pageSize = 20) {
  const { data } = await client.get(`/students/${id}/deductions`, { params: { page, page_size: pageSize } });
  return data;
}

export async function cancelRecharge(studentId: number, rechargeId: number) {
  const { data } = await client.post(`/students/${studentId}/recharges/${rechargeId}/cancel`);
  return data;
}

export async function generateCredentials(name: string) {
  const { data } = await client.get('/students/generate-credentials', { params: { name } });
  return data as { username: string; password: string };
}