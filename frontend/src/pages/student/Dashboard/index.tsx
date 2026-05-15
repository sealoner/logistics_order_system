import { useEffect, useState } from 'react';
import { Row, Col, Card, Spin } from 'antd';
import { WalletOutlined, ShoppingOutlined, DollarOutlined, MoneyCollectOutlined } from '@ant-design/icons';
import ReactEChartsCore from '../../../components/EChartsCore';

import * as echarts from 'echarts/core';
import { LineChart } from 'echarts/charts';
import { GridComponent, TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import StatCard from '../../../components/StatCard';
import { useAuth } from '../../../contexts/AuthContext';
import { getStudentStats, getTrends } from '../../../api/stats';

echarts.use([LineChart, GridComponent, TooltipComponent, CanvasRenderer]);

export default function StudentDashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>({});
  const [salesTrend, setSalesTrend] = useState<any[]>([]);
  const [orderTrend, setOrderTrend] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      getStudentStats(user.id),
      getTrends({ period: '30d', type: 'sales', student_id: user.id }),
      getTrends({ period: '30d', type: 'orders', student_id: user.id }),
    ]).then(([st, stData, otData]) => {
      setStats(st);
      setSalesTrend(stData);
      setOrderTrend(otData);
    }).finally(() => setLoading(false));
  }, [user]);

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '200px auto' }} />;

  const salesOption = {
    tooltip: { trigger: 'axis' },
    grid: { left: 40, right: 20, top: 20, bottom: 30 },
    xAxis: { type: 'category', data: salesTrend.map((d: any) => d.date.slice(5)), axisLabel: { fontSize: 11 } },
    yAxis: { type: 'value' },
    series: [{ data: salesTrend.map((d: any) => d.value), type: 'line', smooth: true, areaStyle: { opacity: 0.15 }, itemStyle: { color: '#722ed1' } }],
  };

  const orderOption = {
    tooltip: { trigger: 'axis' },
    grid: { left: 40, right: 20, top: 20, bottom: 30 },
    xAxis: { type: 'category', data: orderTrend.map((d: any) => d.date.slice(5)), axisLabel: { fontSize: 11 } },
    yAxis: { type: 'value' },
    series: [{ data: orderTrend.map((d: any) => d.value), type: 'line', smooth: true, areaStyle: { opacity: 0.15 }, itemStyle: { color: '#52c41a' } }],
  };

  return (
    <div>
      <Row gutter={[16, 16]}>
        <Col xs={12} sm={6}><StatCard title="余额" value={`¥${stats.balance}`} prefix={<WalletOutlined />} color={stats.balance < 50 ? '#ff4d4f' : '#1677ff'} /></Col>
        <Col xs={12} sm={6}><StatCard title="本月订单" value={stats.month_orders} prefix={<ShoppingOutlined />} suffix="单" color="#52c41a" /></Col>
        <Col xs={12} sm={6}><StatCard title="本月运费" value={`¥${stats.month_freight}`} prefix={<DollarOutlined />} color="#fa8c16" /></Col>
        <Col xs={12} sm={6}><StatCard title="本月净销售额" value={`$${stats.month_sales}`} prefix={<MoneyCollectOutlined />} color="#722ed1" /></Col>
      </Row>
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}>
          <Card title="净销售额趋势" bordered={false}><ReactEChartsCore echarts={echarts} option={salesOption} style={{ height: 280 }} /></Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="订单数量趋势" bordered={false}><ReactEChartsCore echarts={echarts} option={orderOption} style={{ height: 280 }} /></Card>
        </Col>
      </Row>
    </div>
  );
}