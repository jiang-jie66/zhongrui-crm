import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Statistic, Table, Tag, Button, Space } from 'antd';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import request from '../utils/request';
import type { DashboardData, Opportunity } from '../types';

const statusColors: Record<string, string> = {
  '待跟进': 'default', '跟进中': 'processing', '意向高': 'warning',
  '已报价': 'purple', '成单成功': 'success', '成单失败': 'error',
};

const Dashboard: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    request.get('/analytics/dashboard').then((res: any) => setData(res.data.data));
  }, []);

  if (!data) return <div>加载中...</div>;

  const columns = [
    { title: '公司名称', dataIndex: 'company_name', key: 'company_name',
      render: (t: string, r: Opportunity) => <a onClick={() => navigate(`/opportunities/${r.id}`)}>{t}</a>,
    },
    { title: '联系人', dataIndex: 'contact_name', key: 'contact_name' },
    { title: '状态', dataIndex: 'status', key: 'status',
      render: (s: string) => <Tag color={statusColors[s] || 'default'}>{s}</Tag>,
    },
    { title: '负责人', dataIndex: 'sales_name', key: 'sales_name' },
    { title: '更新时间', dataIndex: 'updated_at', key: 'updated_at',
      render: (t: string) => dayjs(t).format('MM-DD HH:mm'),
    },
    { title: '操作', key: 'action',
      render: (_: any, r: Opportunity) => (
        <Button type="link" size="small" onClick={() => navigate(`/opportunities/${r.id}`)}>查看</Button>
      ),
    },
  ];

  return (
    <div>
      <h2 style={{ marginBottom: 24 }}>工作台</h2>
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col span={4}><Card><Statistic title="商机总数" value={data.total} prefix="📊" /></Card></Col>
        <Col span={4}><Card><Statistic title="待跟进" value={data.pending} valueStyle={{ color: '#faad14' }} prefix="⏳" /></Card></Col>
        <Col span={4}><Card><Statistic title="成单成功" value={data.success} valueStyle={{ color: '#52c41a' }} prefix="✅" /></Card></Col>
        <Col span={4}><Card><Statistic title="成单金额" value={data.revenue} prefix="💰" valueStyle={{ color: '#1677ff' }} suffix="元" /></Card></Col>
        <Col span={4}><Card><Statistic title="成单率" value={data.rate} suffix="%" valueStyle={{ color: data.rate >= 30 ? '#52c41a' : '#faad14' }} prefix="📈" /></Card></Col>
      </Row>
      <Card title="最近商机" extra={<Button type="link" onClick={() => navigate('/opportunities')}>查看全部</Button>}>
        <Table rowKey="id" columns={columns} dataSource={data.recent} pagination={false} size="small" />
      </Card>
    </div>
  );
};

export default Dashboard;
