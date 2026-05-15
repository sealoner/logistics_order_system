import client from './client';

export async function getOverview() {
  const { data } = await client.get('/stats/overview');
  return data;
}

export async function getStudentStats(id: number) {
  const { data } = await client.get(`/stats/student/${id}`);
  return data;
}

export async function getTrends(params: { period?: string; type?: string; student_id?: number }) {
  const { data } = await client.get('/stats/trends', { params });
  return data;
}

export async function getChannelDistribution() {
  const { data } = await client.get('/stats/channel-distribution');
  return data;
}

export async function getStudentRanking() {
  const { data } = await client.get('/stats/student-ranking');
  return data;
}

export async function getLowBalance() {
  const { data } = await client.get('/stats/low-balance');
  return data;
}