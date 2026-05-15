import client from './client';

export async function getOrders(params: Record<string, any>) {
  const { data } = await client.get('/orders', { params });
  return data;
}

export async function getOrder(id: number) {
  const { data } = await client.get(`/orders/${id}`);
  return data;
}

export async function updateOrder(id: number, body: Record<string, any>) {
  const { data } = await client.put(`/orders/${id}`, body);
  return data;
}