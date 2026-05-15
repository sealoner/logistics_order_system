import { useEffect, useState } from 'react';
import { Row, Col, Card, Table, Tag, Spin } from 'antd';
import { WarningOutlined, TeamOutlined, ShoppingOutlined, DollarOutlined, MoneyCollectOutlined } from '@ant-design/icons';
import ReactEChartsCore from '../../../components/EChartsCore';

import * as echarts from 'echarts/core';
import { LineChart, BarChart, PieChart } from 'echarts/charts';
import { GridComponent, TooltipComponent, LegendComponent, TitleComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import StatCard from '../../../components/StatCard';
import { getOverview, getTrends, getChannelDistribution, getStudentRanking, getLowBalance } from '../../../api/stats';

echarts.use([LineChart, BarChart, PieChart, GridComponent, TooltipComponent, LegendComponent, TitleComponent, CanvasRenderer]);

interface TrendItem {
  date: string;
  value: number;
}

interface ChannelItem {
  name: string;
  value: number;
}

interface RankingItem {
  name: string;
  value: number;
}

interface LowBalanceItem {
  id: number;
  name: string;
  balance: number;
}

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<Record<string, number>>({});
  const [salesTrend, setSalesTrend] = useState<TrendItem[]>([]);
  const [orderTrend, setOrderTrend] = useState<TrendItem[]>([]);
  const [channelDist, setChannelDist] = useState<ChannelItem[]>([]);
  const [ranking, setRanking] = useState<RankingItem[]>([]);
  const [lowBalance, setLowBalance] = useState<LowBalanceItem[]>([]);

  useEffect(() => {
    Promise.all([
      getOverview(),
      getTrends({ period: '30d', type: 'sales' }),
      getTrends({ period: '30d', type: 'orders' }),
      getChannelDistribution(),
      getStudentRanking(),
      getLowBalance(),
    ]).then(([ov, st, ot, cd, sr, lb]) => {
      setOverview(ov);
      setSalesTrend(st);
      setOrderTrend(ot);
      setChannelDist(cd);
      setRanking(sr);
      setLowBalance(lb);
    }).finally(() => setLoading(false));
  }, []);

  const salesOption = {
    tooltip: { trigger: 'axis' as const },
    grid: { left: 40, right: 20, top: 20, bottom: 30 },
    xAxis: { type: 'category' as const, data: salesTrend.map((d) => d.date.slice(5)), axisLabel: { fontSize: 11 } },
    yAxis: { type: 'value' as const },
    series: [{ data: salesTrend.map((d) => d.value), type: 'line' as const, smooth: true, areaStyle: { opacity: 0.15 }, itemStyle: { color: '#1677ff' } }],
  };

  const orderOption = {
    tooltip: { trigger: 'axis' as const },
    grid: { left: 40, right: 20, top: 20, bottom: 30 },
    xAxis: { type: 'category' as const, data: orderTrend.map((d) => d.date.slice(5)), axisLabel: { fontSize: 11 } },
    yAxis: { type: 'value' as const },
    series: [{ data: orderTrend.map((d) => d.value), type: 'line' as const, smooth: true, areaStyle: { opacity: 0.15 }, itemStyle: { color: '#52c41a' } }],
  };

  const pieOption = {
    tooltip: { trigger: 'item' as const },
    legend: { bottom: 0 },
    series: [{ type: 'pie' as const, radius: ['45%', '70%'], data: channelDist, label: { show: false }, emphasis: { label: { show: true } } }],
  };

  const barOption = {
    tooltip: { trigger: 'axis' as const },
    grid: { left: 80, right: 20, top: 10, bottom: 20 },
    xAxis: { type: 'value' as const },
    yAxis: { type: 'category' as const, data: ranking.map((d) => d.name), inverse: true, axisLabel: { fontSize: 12 } },
    series: [{ data: ranking.map((d) => d.value), type: 'bar' as const, itemStyle: { color: '#1677ff', borderRadius: [0, 4, 4, 0] } }],
  };

  const lowBalanceColumns = [
    { title: '学员', dataIndex: 'name', key: 'name' },
    { title: '余额', dataIndex: 'balance', key: 'balance', render: (v: number) => <Tag color="red">¥{v.toFixed(2)}</Tag> },
  ];

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '200px auto' }} />;

  return (
    <div>
      <Row gutter={[16, 16]}>
        <Col xs={12} sm={8} lg={4}><StatCard title="学员总数" value={overview.student_count} prefix={<TeamOutlined />} suffix="人" /></Col>
        <Col xs={12} sm={8} lg={5}><StatCard title="本月订单" value={overview.month_orders} prefix={<ShoppingOutlined />} suffix="单" color="#52c41a" /></Col>
        <Col xs={12} sm={8} lg={5}><StatCard title="本月总运费" value={`¥${overview.month_freight}`} prefix={<DollarOutlined />} color="#fa8c16" /></Col>
        <Col xs={12} sm={8} lg={5}><StatCard title="本月净销售额" value={`$${overview.month_sales}`} prefix={<MoneyCollectOutlined />} color="#722ed1" /></Col>
        <Col xs={12} sm={8} lg={5}><StatCard title="低余额预警" value={overview.low_balance_count} prefix={<WarningOutlined />} suffix="人" color="#ff4d4f" /></Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}>
          <Card title="净销售额趋势（近30天）" bordered={false}><ReactEChartsCore echarts={echarts} option={salesOption} style={{ height: 280 }} /></Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="订单数量趋势（近30天）" bordered={false}><ReactEChartsCore echarts={echarts} option={orderOption} style={{ height: 280 }} /></Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}>
          <Card title="学员运费排名 Top10" bordered={false}><ReactEChartsCore echarts={echarts} option={barOption} style={{ height: 320 }} /></Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="物流渠道分布" bordered={false}><ReactEChartsCore echarts={echarts} option={pieOption} style={{ height: 320 }} /></Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}>
          <Card title="低余额学员（< ¥50）" bordered={false}>
            <Table dataSource={lowBalance} columns={lowBalanceColumns} rowKey="id" pagination={false} size="small" />
          </Card>
        </Col>
      </Row>
    </div>
  );
}