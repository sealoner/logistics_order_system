import client from './client';

export async function uploadErp(file: File) {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await client.post('/upload/erp', formData);
  return data;
}

export async function confirmErp(body: Record<string, any>) {
  const { data } = await client.post('/upload/erp/confirm', body);
  return data;
}

export async function uploadLogistics(file: File) {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await client.post('/upload/logistics', formData);
  return data;
}

export async function confirmLogistics(matchedIds: number[]) {
  const { data } = await client.post('/upload/logistics/confirm', matchedIds);
  return data;
}

export async function getBatches(page = 1, pageSize = 20) {
  const { data } = await client.get('/upload/batches', { params: { page, page_size: pageSize } });
  return data;
}