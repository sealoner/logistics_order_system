import { useEffect, useState } from 'react';
import { Table, Select, DatePicker, Input, Space, Button, Image, Tag, message } from 'antd';
import { SearchOutlined, ExportOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import client from '../../../api/client';
import { getOrders } from '../../../api/orders';
import { getStudents } from '../../../api/students';

const { RangePicker } = DatePicker;

export default function OrdersPage() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [students, setStudents] = useState<any[]>([]);
  const [filters, setFilters] = useState<Record<string, any>>({});

  useEffect(() => {
    const fetchAllStudents = async () => {
      let allStudents: any[] = [];
      let currentPage = 1;
      const pageSize = 100;
      
      while (true) {
        const res = await getStudents({ page: currentPage, page_size: pageSize });
        allStudents = [...allStudents, ...res.items];
        if (res.items.length < pageSize) break;
        currentPage++;
      }
      setStudents(allStudents);
    };
    fetchAllStudents();
  }, []);

  const fetchData = () => {
    setLoading(true);
    getOrders({ page, page_size: 20, ...filters })
      .then(res => { setData(res.items); setTotal(res.total); })
      .finally(() => setLoading(false));
  };

  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.student_id != null && filters.student_id !== '') params.append('student_id', String(filters.student_id));
      if (filters.start_date) params.append('start_date', filters.start_date);
      if (filters.end_date) params.append('end_date', filters.end_date);
      if (filters.search && filters.search.trim()) params.append('search', filters.search.trim());
      
      const response = await client.get(`/orders/export-test?${params.toString()}`, {
        responseType: 'blob',
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'orders_export.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      message.error('导出失败');
    }
  };

  useEffect(() => { fetchData(); }, [page, filters]);

  const columns = [
    { title: '订单ID', dataIndex: 'erp_order_id', key: 'erp_order_id', width: 110 },
    { title: '学员', dataIndex: 'student_name', key: 'student_name', width: 80 },
    { title: '时间', dataIndex: 'order_time', key: 'order_time', width: 140, render: (v: string) => v ? dayjs(v).format('MM-DD HH:mm') : '-' },
    { title: 'ASIN', dataIndex: 'asin', key: 'asin', width: 120 },
    { title: '毛重(g)', dataIndex: 'gross_weight', key: 'gross_weight', width: 80 },
    { title: '运费', dataIndex: 'freight', key: 'freight', width: 70, render: (v: number) => `¥${v.toFixed(2)}` },
    { title: '服务费', dataIndex: 'service_fee', key: 'service_fee', width: 70, render: (v: number) => `¥${v.toFixed(2)}` },
    { title: '打包费', dataIndex: 'packing_fee', key: 'packing_fee', width: 70, render: (v: number) => `¥${v.toFixed(2)}` },
    { title: '总费用', dataIndex: 'total_cost', key: 'total_cost', width: 80, render: (v: number) => <strong>¥{v.toFixed(2)}</strong> },
    { title: '净销售额', dataIndex: 'balance_amount', key: 'balance_amount', width: 70, render: (v: number) => v != null ? `$${v.toFixed(2)}` : '-' },
    { title: '状态', dataIndex: 'status', key: 'status', width: 100 },
    {
      title: '图片', dataIndex: 'image_url', key: 'image_url', width: 60,
      render: (v: string) => v ? <Image src={v} width={32} height={32} style={{ objectFit: 'cover', borderRadius: 4 }} /> : '-',
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        <Select placeholder="选择学员" allowClear style={{ width: 160 }}
          onChange={(v) => setFilters(prev => ({ ...prev, student_id: v }))}
          options={students.map(s => ({ value: s.id, label: s.name }))} />
        <RangePicker onChange={(dates) => {
          setFilters(prev => ({
            ...prev,
            start_date: dates?.[0]?.format('YYYY-MM-DD'),
            end_date: dates?.[1]?.format('YYYY-MM-DD'),
          }));
        }} />
        <Input placeholder="搜索ID/ASIN/追踪号" prefix={<SearchOutlined />} style={{ width: 200 }}
          onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))} />
        <Button type="primary" onClick={fetchData}>查询</Button>
        <Button icon={<ExportOutlined />} onClick={handleExport}>导出</Button>
      </div>

      <Table dataSource={data} columns={columns} rowKey="id" loading={loading}
        pagination={{ total, current: page, pageSize: 20, onChange: setPage, showTotal: (t) => `共 ${t} 条` }}
        scroll={{ x: 1200 }} size="small" />
    </div>
  );
}