import { useEffect, useState } from 'react';
import { Table, Tag } from 'antd';
import { getBatches } from '../../../api/upload';

export default function BatchesPage() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  useEffect(() => {
    setLoading(true);
    getBatches(page).then(res => { setData(res.items); setTotal(res.total); }).finally(() => setLoading(false));
  }, [page]);

  const columns = [
    { title: '时间', dataIndex: 'created_at', key: 'created_at', render: (v: string) => new Date(v).toLocaleString() },
    { title: '类型', dataIndex: 'file_type', key: 'file_type', render: (v: string) => <Tag color={v === 'erp' ? 'blue' : 'green'}>{v === 'erp' ? 'ERP文件' : '物流明细'}</Tag> },
    { title: '文件名', dataIndex: 'file_name', key: 'file_name' },
    { title: '总行数', dataIndex: 'total_rows', key: 'total_rows' },
    { title: '成功', dataIndex: 'success_rows', key: 'success_rows' },
    { title: '跳过', dataIndex: 'skip_rows', key: 'skip_rows' },
    { title: '新学员', dataIndex: 'new_students', key: 'new_students' },
  ];

  return <Table dataSource={data} columns={columns} rowKey="id" loading={loading}
    pagination={{ total, current: page, onChange: setPage }} />;
}