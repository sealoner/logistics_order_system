import { useEffect, useState } from 'react';
import { Card, Tabs, Table } from 'antd';
import { useAuth } from '../../../contexts/AuthContext';
import { getRecharges, getDeductions } from '../../../api/students';

export default function BillingPage() {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <Card bordered={false}>
      <Tabs items={[
        { key: 'recharges', label: '充值记录', children: <BillTab type="recharge" studentId={user.id} /> },
        { key: 'deductions', label: '扣费记录', children: <BillTab type="deduction" studentId={user.id} /> },
      ]} />
    </Card>
  );
}

function BillTab({ type, studentId }: { type: string; studentId: number }) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    const fetcher = type === 'recharge' ? getRecharges : getDeductions;
    fetcher(studentId).then(res => setData(res.items)).finally(() => setLoading(false));
  }, [type, studentId]);

  const columns = type === 'recharge' ? [
    { title: '时间', dataIndex: 'created_at', render: (v: string) => new Date(v).toLocaleString() },
    { title: '金额', dataIndex: 'amount', render: (v: number) => <span style={{ color: '#52c41a' }}>+¥{v.toFixed(2)}</span> },
    { title: '充值前', dataIndex: 'balance_before', render: (v: number) => `¥${v.toFixed(2)}` },
    { title: '充值后', dataIndex: 'balance_after', render: (v: number) => `¥${v.toFixed(2)}` },
  ] : [
    { title: '时间', dataIndex: 'created_at', render: (v: string) => new Date(v).toLocaleString() },
    { title: '金额', dataIndex: 'amount', render: (v: number) => <span style={{ color: '#ff4d4f' }}>-¥{v.toFixed(2)}</span> },
    { title: '扣费前', dataIndex: 'balance_before', render: (v: number) => `¥${v.toFixed(2)}` },
    { title: '扣费后', dataIndex: 'balance_after', render: (v: number) => `¥${v.toFixed(2)}` },
    { title: '订单ID', dataIndex: 'order_id' },
  ];

  return <Table dataSource={data} columns={columns} rowKey="id" loading={loading} pagination={{ pageSize: 10 }} />;
}