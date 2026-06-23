import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Select, Table, Button, Space, Grid, Typography } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import request from '../utils/request';

const { useBreakpoint } = Grid;
const { Title } = Typography;

const COLORS = ['#1677ff', '#52c41a', '#faad14', '#ff4d4f', '#722ed1', '#13c2c2'];

const Analytics: React.FC = () => {
  const [period, setPeriod] = useState('month');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const fetchData = async () => {
    setLoading(true);
    try {
      const res: any = await request.get('/analytics/stats', { params: { period } });
      setData(res.data.data);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [period]);

  if (!data) return <div style={{ textAlign: 'center', padding: 48, color: '#999' }}>加载中...</div>;

  return (
    <div>
      <Title level={isMobile ? 5 : 4} className="page-title" style={{ marginBottom: isMobile ? 12 : 24 }}>
        数据分析
      </Title>

      <Space style={{ marginBottom: isMobile ? 12 : 16 }} wrap>
        <Select value={period} onChange={setPeriod} style={{ width: isMobile ? '100%' : 120 }}
          getPopupContainer={t => t.parentElement || document.body}>
          <Select.Option value="month">按月统计</Select.Option>
          <Select.Option value="quarter">按季度统计</Select.Option>
          <Select.Option value="year">按年度统计</Select.Option>
        </Select>
        <Button icon={<ReloadOutlined />} onClick={fetchData}
          style={isMobile ? { width: '100%' } : undefined}>
          刷新
        </Button>
      </Space>

      {/* 趋势图 */}
      <Card
        title={<span style={{ fontSize: isMobile ? 15 : 16 }}>成单趋势</span>}
        style={{ marginBottom: isMobile ? 12 : 16 }}
        loading={loading}
      >
        <ResponsiveContainer width="100%" height={isMobile ? 220 : 300}>
          <LineChart data={data.stats}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" tick={{ fontSize: isMobile ? 11 : 12 }} />
            <YAxis tick={{ fontSize: isMobile ? 11 : 12 }} />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: isMobile ? 12 : 14 }} />
            <Line type="monotone" dataKey="total" name="商机总数" stroke="#1677ff" />
            <Line type="monotone" dataKey="success" name="成单成功" stroke="#52c41a" />
            <Line type="monotone" dataKey="revenue" name="成单金额" stroke="#faad14" />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* 表格和饼图 - 移动端纵向排列 */}
      <Row gutter={[isMobile ? 8 : 16, isMobile ? 8 : 16]}>
        <Col xs={24} md={12}>
          <Card
            title={<span style={{ fontSize: isMobile ? 15 : 16 }}>按销售统计</span>}
            style={{ marginBottom: isMobile ? 12 : 0 }}
          >
            <Table rowKey="name" columns={[
              { title: '销售', dataIndex: 'name', key: 'name', width: isMobile ? 60 : undefined },
              { title: '商机数', dataIndex: 'total', key: 'total', width: isMobile ? 50 : undefined },
              { title: '成单', dataIndex: 'success', key: 'success', width: isMobile ? 50 : undefined },
              { title: '成单率', dataIndex: 'rate', key: 'rate', render: (v: number) => `${v}%`, width: isMobile ? 55 : undefined },
              { title: '金额', dataIndex: 'revenue', key: 'revenue',
                render: (v: number) => `¥${v.toLocaleString()}`,
                responsive: ['md' as const],
              },
            ]} dataSource={data.bySales} pagination={false}
              size={isMobile ? 'small' : 'small'}
              scroll={isMobile ? { x: 220 } : undefined} />
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card title={<span style={{ fontSize: isMobile ? 15 : 16 }}>按行业统计</span>}>
            <ResponsiveContainer width="100%" height={isMobile ? 240 : 300}>
              <PieChart>
                <Pie data={data.byIndustry} dataKey="total" nameKey="name"
                  cx="50%" cy="50%"
                  outerRadius={isMobile ? 60 : 100}
                  label={!isMobile}
                >
                  {data.byIndustry.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: isMobile ? 11 : 13 }} />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Analytics;
