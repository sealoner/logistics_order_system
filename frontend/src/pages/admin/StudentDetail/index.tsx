import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card, Descriptions, Tabs, Table, Tag, Spin, Button, Popconfirm, message } from 'antd';
import { getStudent, getRecharges, getDeductions, cancelRecharge } from '../../../api/students';
import { getOrders } from '../../../api/orders';

export default function StudentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [student, setStudent] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) getStudent(Number(id)).then(setStudent).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '200px auto' }} />;
  if (!student) return <div>学员不存在</div>;

  return (
    <div>
      <Card title="学员信息" bordered={false} style={{ marginBottom: 16 }}>
        <Descriptions column={{ xs: 1, sm: 2, lg: 3 }}>
          <Descriptions.Item label="姓名">{student.name}</Descriptions.Item>
          <Descriptions.Item label="账号">{student.username}</Descriptions.Item>
          <Descriptions.Item label="手机号">{student.phone || '-'}</Descriptions.Item>
          <Descriptions.Item label="备注">{student.remark || '-'}</Descriptions.Item>
          <Descriptions.Item label="运费余额">
            <Tag color={student.balance < 50 ? 'red' : 'green'} style={{ fontSize: 16 }}>¥{student.balance.toFixed(2)}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="订单数">{student.order_count}</Descriptions.Item>
        </Descriptions>
      </Card>

      <Card bordered={false}>
        <Tabs defaultActiveKey="recharges" items={[
          {
            key: 'recharges', label: '充值记录',
            children: <RechargeTab studentId={Number(id)} />,
          },
          {
            key: 'deductions', label: '扣费记录',
            children: <DeductionTab studentId={Number(id)} />,
          },
          {
            key: 'orders', label: '订单列表',
            children: <OrderTab studentId={Number(id)} />,
          },
        ]} />
      </Card>
    </div>
  );
}

function RechargeTab({ studentId }: { studentId: number }) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const loadData = () => {
    setLoading(true);
    getRecharges(studentId).then(res => setData(res.items)).finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, [studentId]);

  const handleCancel = async (record: any) => {
    try {
      await cancelRecharge(studentId, record.id);
      message.success('充值记录已作废');
      loadData();
    } catch (e: any) {
      message.error(e.response?.data?.detail || '作废失败');
    }
  };

  const columns = [
    { title: '时间', dataIndex: 'created_at', key: 'created_at', render: (v: string) => new Date(v).toLocaleString() },
    { 
      title: '金额', 
      dataIndex: 'amount', 
      key: 'amount', 
      render: (v: number, record: any) => (
        <span style={{ color: record.is_canceled ? '#999' : '#52c41a', textDecoration: record.is_canceled ? 'line-through' : 'none' }}>
          +¥{v.toFixed(2)}
        </span>
      ),
    },
    { title: '充值前', dataIndex: 'balance_before', key: 'balance_before', render: (v: number) => `¥${v.toFixed(2)}` },
    { title: '充值后', dataIndex: 'balance_after', key: 'balance_after', render: (v: number) => `¥${v.toFixed(2)}` },
    { title: '备注', dataIndex: 'remark', key: 'remark', render: (v: string) => v || '-' },
    { 
      title: '状态', 
      dataIndex: 'is_canceled', 
      key: 'is_canceled',
      render: (v: boolean) => v ? <Tag color="default">已作废</Tag> : <Tag color="green">有效</Tag>,
    },
    {
      title: '操作',
      key: 'actions',
      render: (_: unknown, record: any) => (
        record.is_canceled ? (
          <span style={{ color: '#999' }}>已作废</span>
        ) : (
          <Popconfirm
            title="确认作废此充值记录？"
            description="作废后将回滚学员余额"
            onConfirm={() => handleCancel(record)}
          >
            <Button size="small" danger>作废</Button>
          </Popconfirm>
        )
      ),
    },
  ];

  return <Table dataSource={data} columns={columns} rowKey="id" loading={loading} pagination={{ pageSize: 10 }} />;
}

function DeductionTab({ studentId }: { studentId: number }) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => { setLoading(true); getDeductions(studentId).then(res => setData(res.items)).finally(() => setLoading(false)); }, [studentId]);

  const columns = [
    { title: '时间', dataIndex: 'created_at', key: 'created_at', render: (v: string) => new Date(v).toLocaleString() },
    { title: '金额', dataIndex: 'amount', key: 'amount', render: (v: number) => <span style={{ color: '#ff4d4f' }}>-¥{v.toFixed(2)}</span> },
    { title: '扣费前', dataIndex: 'balance_before', key: 'balance_before', render: (v: number) => `¥${v.toFixed(2)}` },
    { title: '扣费后', dataIndex: 'balance_after', key: 'balance_after', render: (v: number) => `¥${v.toFixed(2)}` },
    { title: '订单ID', dataIndex: 'order_id', key: 'order_id' },
  ];

  return <Table dataSource={data} columns={columns} rowKey="id" loading={loading} pagination={{ pageSize: 10 }} />;
}

function OrderTab({ studentId }: { studentId: number }) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => { setLoading(true); getOrders({ student_id: studentId, page_size: 100 }).then(res => setData(res.items)).finally(() => setLoading(false)); }, [studentId]);

  const columns = [
    { title: '订单ID', dataIndex: 'erp_order_id', key: 'erp_order_id' },
    { title: '时间', dataIndex: 'order_time', key: 'order_time', render: (v: string) => v ? new Date(v).toLocaleString() : '-' },
    { title: 'ASIN', dataIndex: 'asin', key: 'asin' },
    { title: '运费', dataIndex: 'freight', key: 'freight', render: (v: number) => `¥${v.toFixed(2)}` },
    { title: '服务费', dataIndex: 'service_fee', key: 'service_fee', render: (v: number) => `¥${v.toFixed(2)}` },
    { title: '打包费', dataIndex: 'packing_fee', key: 'packing_fee', render: (v: number) => `¥${v.toFixed(2)}` },
    { title: '总费用', dataIndex: 'total_cost', key: 'total_cost', render: (v: number) => <strong>¥{v.toFixed(2)}</strong> },
    { title: '状态', dataIndex: 'status', key: 'status' },
  ];

  return <Table dataSource={data} columns={columns} rowKey="id" loading={loading} pagination={{ pageSize: 10 }} />;
}