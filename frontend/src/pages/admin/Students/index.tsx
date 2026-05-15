import { useEffect, useState } from 'react';
import { Table, Button, Input, Space, Tag, Modal, Form, InputNumber, message, Popconfirm } from 'antd';
import { PlusOutlined, SearchOutlined, WalletOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import type { StudentItem } from '../../../api/students';
import { getStudents, createStudent, toggleStudent, rechargeStudent } from '../../../api/students';

export default function StudentsPage() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<StudentItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [rechargeOpen, setRechargeOpen] = useState(false);
  const [rechargeId, setRechargeId] = useState<number | null>(null);
  const [createForm] = Form.useForm();
  const [rechargeForm] = Form.useForm();
  const navigate = useNavigate();

  const fetchData = () => {
    setLoading(true);
    getStudents({ page, page_size: 20, search: search || undefined })
      .then((res) => { setData(res.items); setTotal(res.total); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, [page]);

  const columns = [
    { title: '姓名', dataIndex: 'name', key: 'name' },
    { title: '账号', dataIndex: 'username', key: 'username' },
    { title: '手机号', dataIndex: 'phone', key: 'phone', render: (v: string) => v || '-' },
    {
      title: '运费余额', dataIndex: 'balance', key: 'balance',
      render: (v: number) => (
        <Tag color={v < 50 ? 'red' : 'green'}>¥{v.toFixed(2)}</Tag>
      ),
    },
    { title: '订单数', dataIndex: 'order_count', key: 'order_count' },
    {
      title: '状态', dataIndex: 'is_active', key: 'is_active',
      render: (v: boolean) => <Tag color={v ? 'green' : 'default'}>{v ? '启用' : '禁用'}</Tag>,
    },
    {
      title: '操作', key: 'actions',
      render: (_: unknown, record: StudentItem) => (
        <Space>
          <Button size="small" type="link" onClick={() => navigate(`/admin/students/${record.id}`)}>详情</Button>
          <Button size="small" type="link" icon={<WalletOutlined />} onClick={() => { setRechargeId(record.id); setRechargeOpen(true); }}>充值</Button>
          <Popconfirm
            title={`确认${record.is_active ? '禁用' : '启用'}?`}
            onConfirm={async () => { await toggleStudent(record.id); fetchData(); }}
          >
            <Button size="small" type="link" danger={record.is_active}>{record.is_active ? '禁用' : '启用'}</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const handleCreate = async (values: { name: string; phone?: string; remark?: string }) => {
    await createStudent(values);
    message.success('学员创建成功');
    setCreateOpen(false);
    createForm.resetFields();
    fetchData();
  };

  const handleRecharge = async (values: { amount: number; remark?: string }) => {
    if (!rechargeId) return;
    await rechargeStudent(rechargeId, values.amount, values.remark);
    message.success('充值成功');
    setRechargeOpen(false);
    rechargeForm.resetFields();
    fetchData();
  };

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <Space>
          <Input
            placeholder="搜索姓名/账号/手机号"
            prefix={<SearchOutlined />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onPressEnter={() => { setPage(1); fetchData(); }}
            style={{ width: 240 }}
            allowClear
          />
          <Button type="primary" onClick={() => { setPage(1); fetchData(); }}>搜索</Button>
        </Space>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>新增学员</Button>
      </div>

      <Table
        dataSource={data}
        columns={columns}
        rowKey="id"
        loading={loading}
        pagination={{
          total,
          current: page,
          onChange: setPage,
          showTotal: (t) => `共 ${t} 人`,
        }}
      />

      <Modal title="新增学员" open={createOpen} onCancel={() => setCreateOpen(false)} onOk={() => createForm.submit()}>
        <Form form={createForm} layout="vertical" onFinish={handleCreate}>
          <Form.Item name="name" label="姓名" rules={[{ required: true, message: '请输入姓名' }]}>
            <Input placeholder="学员姓名" />
          </Form.Item>
          <Form.Item name="phone" label="手机号">
            <Input placeholder="手机号" />
          </Form.Item>
          <Form.Item name="remark" label="备注">
            <Input.TextArea placeholder="备注信息" rows={2} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal title="充值" open={rechargeOpen} onCancel={() => setRechargeOpen(false)} onOk={() => rechargeForm.submit()}>
        <Form form={rechargeForm} layout="vertical" onFinish={handleRecharge}>
          <Form.Item name="amount" label="充值金额" rules={[{ required: true, message: '请输入金额' }]}>
            <InputNumber min={0.01} step={0.01} precision={2} style={{ width: '100%' }} prefix="¥" placeholder="0.00" />
          </Form.Item>
          <Form.Item name="remark" label="备注">
            <Input.TextArea placeholder="充值备注" rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}