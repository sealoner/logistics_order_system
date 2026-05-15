import { Card, Statistic } from 'antd';
import type { ReactNode } from 'react';

interface StatCardProps {
  title: string;
  value: number | string;
  prefix?: ReactNode;
  suffix?: string;
  color?: string;
  loading?: boolean;
}

export default function StatCard({ title, value, prefix, suffix, color, loading }: StatCardProps) {
  return (
    <Card loading={loading} bordered={false} className="stat-card">
      <Statistic
        title={title}
        value={value}
        prefix={prefix}
        suffix={suffix}
        valueStyle={{ color: color || '#58a6ff', fontWeight: 700 }}
      />
    </Card>
  );
}