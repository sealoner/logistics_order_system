import { useEffect, useState } from 'react';
import { Table, Button, Input, Space, Tag, Modal, Form, InputNumber, message, Popconfirm, Tooltip } from 'antd';
import { PlusOutlined, SearchOutlined, WalletOutlined, EditOutlined, CopyOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import type { StudentItem } from '../../../api/students';
import { getStudents, createStudent, updateStudent, toggleStudent, rechargeStudent, generateCredentials } from '../../../api/students';

export default function StudentsPage() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<StudentItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<StudentItem | null>(null);
  const [rechargeOpen, setRechargeOpen] = useState(false);
  const [rechargeId, setRechargeId] = useState<number | null>(null);
  const [createForm] = Form.useForm();
  const [editForm] = Form.useForm();
  const [rechargeForm] = Form.useForm();
  const navigate = useNavigate();

  const fetchData = () => {
    setLoading(true);
    getStudents({ page, page_size: 20, search: search || undefined })
      .then((res) => { setData(res.items); setTotal(res.total); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, [page]);

  const handleEdit = (record: StudentItem) => {
    setEditRecord(record);
    editForm.setFieldsValue({
      name: record.name,
      phone: record.phone || '',
      remark: record.remark || '',
      password: '',
    });
    setEditOpen(true);
  };

  const columns = [
    { title: '姓名', dataIndex: 'name', key: 'name' },
    { title: '账号', dataIndex: 'username', key: 'username' },
    { title: '手机号', dataIndex: 'phone', key: 'phone', render: (v: string) => v || '-' },
    { title: '运费总额', dataIndex: 'total_freight', key: 'total_freight', render: (v: number) => `¥${v.toFixed(2)}` },
    { title: '已充值运费', dataIndex: 'total_recharged', key: 'total_recharged', render: (v: number) => `¥${v.toFixed(2)}` },
    {
      title: '运费余额', dataIndex: 'freight_balance', key: 'freight_balance',
      render: (v: number) => (
        <Tag color={v < 0 ? 'red' : 'green'}>¥{v.toFixed(2)}</Tag>
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
          <Button size="small" type="link" icon={<EditOutlined />} onClick={() => handleEdit(record)}>编辑</Button>
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

  const handleCopyInfo = () => {
    if (!editRecord) return;
    const formValues = editForm.getFieldsValue();
    const name = formValues.name || editRecord.name;
    const username = editRecord.username;
    const password = formValues.password || '（未修改，请联系管理员重置）';
    const loginUrl = window.location.origin;
    const text = `物流订单管理系统\n姓名：${name}\n登录账号：${username}\n登录密码：${password}\n登录地址：${loginUrl}`;
    navigator.clipboard.writeText(text).then(() => {
      message.success('学员信息已复制到剪贴板');
    }).catch(() => {
      message.error('复制失败，请手动复制');
    });
  };

  const handleCreateCopyInfo = () => {
    const formValues = createForm.getFieldsValue();
    const name = formValues.name || '';
    if (!name) {
      message.warning('请先填写学员姓名');
      return;
    }
    const password = formValues.password || '';
    generateCredentials(name).then((cred) => {
      const pwd = password || cred.password;
      const loginUrl = window.location.origin;
      const text = `物流订单管理系统\n姓名：${name}\n登录账号：${cred.username}\n登录密码：${pwd}\n登录地址：${loginUrl}`;
      navigator.clipboard.writeText(text).then(() => {
        message.success('学员信息已复制到剪贴板');
      }).catch(() => {
        message.error('复制失败，请手动复制');
      });
    });
  };

  const handleCreateNameBlur = () => {
    const name = createForm.getFieldValue('name')?.trim();
    if (!name) return;
    generateCredentials(name).then((cred) => {
      createForm.setFieldsValue({ password: cred.password });
    });
  };

  const handleCreate = async (values: { name: string; phone?: string; remark?: string; password?: string }) => {
    await createStudent(values);
    message.success('学员创建成功');
    setCreateOpen(false);
    createForm.resetFields();
    fetchData();
  };

  const handleEditSubmit = async (values: { name: string; phone?: string; remark?: string; password?: string }) => {
    if (!editRecord) return;
    await updateStudent(editRecord.id, values);
    message.success('学员信息更新成功');
    setEditOpen(false);
    editForm.resetFields();
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

      <Modal title="新增学员" open={createOpen} onCancel={() => setCreateOpen(false)} footer={null} width={480}>
        <Form form={createForm} layout="vertical" onFinish={handleCreate}>
          <Form.Item name="name" label="姓名" rules={[{ required: true, message: '请输入姓名' }]}>
            <Input placeholder="学员姓名（账号将根据姓名自动生成全拼）" onBlur={handleCreateNameBlur} />
          </Form.Item>
          <Form.Item name="phone" label="手机号"
            rules={[
              {
                pattern: /^1[3-9]\d{9}$/,
                message: '请输入正确的11位中国大陆手机号',
                validateTrigger: 'onBlur',
              },
            ]}
          >
            <Input placeholder="手机号" />
          </Form.Item>
          <Form.Item name="password" label="密码" help="姓名全拼+四位随机码，可手动修改"
            rules={[
              {
                pattern: /^[a-zA-Z0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]*$/,
                message: '密码只能包含数字、字母、标点符号',
                validateTrigger: 'onBlur',
              },
            ]}
          >
            <Input placeholder="自动生成，可手动修改" />
          </Form.Item>
          <Form.Item name="remark" label="备注">
            <Input.TextArea placeholder="备注信息" rows={2} />
          </Form.Item>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <Button type="primary" onClick={() => createForm.submit()} block>确认新增</Button>
            <Tooltip title="复制姓名、账号、密码、登录地址">
              <Button icon={<CopyOutlined />} onClick={handleCreateCopyInfo} block>一键复制</Button>
            </Tooltip>
          </div>
        </Form>
      </Modal>

      <Modal title="编辑学员" open={editOpen} onCancel={() => setEditOpen(false)} footer={null} width={480}>
        <Form form={editForm} layout="vertical" onFinish={handleEditSubmit}>
          <Form.Item name="name" label="姓名" rules={[{ required: true, message: '请输入姓名' }]}>
            <Input placeholder="学员姓名" />
          </Form.Item>
          <Form.Item label="账号">
            <Input value={editRecord?.username || ''} disabled />
          </Form.Item>
          <Form.Item name="phone" label="手机号"
            rules={[
              {
                pattern: /^1[3-9]\d{9}$/,
                message: '请输入正确的11位中国大陆手机号',
                validateTrigger: 'onBlur',
              },
            ]}
          >
            <Input placeholder="手机号" />
          </Form.Item>
          <Form.Item name="password" label="密码" help="密码加密存储，无法查看原文。输入新密码则更新，留空保持原密码不变。"
            rules={[
              {
                pattern: /^[a-zA-Z0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]*$/,
                message: '密码只能包含数字、字母、标点符号',
                validateTrigger: 'onBlur',
              },
            ]}
          >
            <Input placeholder="输入新密码（明文显示）" />
          </Form.Item>
          <Form.Item name="remark" label="备注">
            <Input.TextArea placeholder="备注信息" rows={2} />
          </Form.Item>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <Button type="primary" onClick={() => editForm.submit()} block>保存修改</Button>
            <Tooltip title="复制姓名、账号、密码、登录地址">
              <Button icon={<CopyOutlined />} onClick={handleCopyInfo} block>一键复制</Button>
            </Tooltip>
          </div>
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
