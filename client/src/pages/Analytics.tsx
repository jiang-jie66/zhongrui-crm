import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Select, message, Table, Tag, Button, Space, Modal, Form, Input } from 'antd';
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import request from '../utils/request';

const COLORS = ['#1677ff', '#52c41a', '#faad14', '#ff4d4f', '#722ed1', '#13c2c2'];

const Analytics: React.FC = () => {
  const [period, setPeriod] = useState('month');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res: any = await request.get('/analytics/stats', { params: { period } });
      setData(res.data.data);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [period]);

  if (!data) return <div>加载中...</div>;

  return (
    <div>
      <h2 style={{ marginBottom: 24 }}>数据分析</h2>
      <Space style={{ marginBottom: 16 }}>
        <Select value={period} onChange={setPeriod} style={{ width: 120 }}>
          <Select.Option value="month">按月统计</Select.Option>
          <Select.Option value="quarter">按季度统计</Select.Option>
          <Select.Option value="year">按年度统计</Select.Option>
        </Select>
        <Button icon={<ReloadOutlined />} onClick={fetchData}>刷新</Button>
      </Space>

      {/* 趋势图 */}
      <Card title="成单趋势" style={{ marginBottom: 16 }}>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data.stats}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="total" name="商机总数" stroke="#1677ff" />
            <Line type="monotone" dataKey="success" name="成单成功" stroke="#52c41a" />
            <Line type="monotone" dataKey="revenue" name="成单金额" stroke="#faad14" />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      <Row gutter={16}>
        {/* 按销售统计 */}
        <Col span={12}>
          <Card title="按销售统计" style={{ marginBottom: 16 }}>
            <Table rowKey="name" columns={[
              { title: '销售', dataIndex: 'name', key: 'name' },
              { title: '商机数', dataIndex: 'total', key: 'total' },
              { title: '成单', dataIndex: 'success', key: 'success' },
              { title: '成单率', dataIndex: 'rate', key: 'rate', render: (v: number) => `${v}%` },
              { title: '金额', dataIndex: 'revenue', key: 'revenue', render: (v: number) => `¥${v.toLocaleString()}` },
            ]} dataSource={data.bySales} pagination={false} size="small" />
          </Card>
        </Col>
        {/* 按行业统计 */}
        <Col span={12}>
          <Card title="按行业统计" style={{ marginBottom: 16 }}>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={data.byIndustry} dataKey="total" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                  {data.byIndustry.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Analytics;
