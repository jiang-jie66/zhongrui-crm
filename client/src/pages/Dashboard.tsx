import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Statistic, Table, Tag, Button, Space, Grid, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import request from '../utils/request';
import type { DashboardData, Opportunity } from '../types';

const { useBreakpoint } = Grid;
const { Title } = Typography;

const statusColors: Record<string, string> = {
  '待跟进': 'default', '跟进中': 'processing', '意向高': 'warning',
  '已报价': 'purple', '成单成功': 'success', '成单失败': 'error',
};

const Dashboard: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const navigate = useNavigate();
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const isTablet = screens.md && !screens.lg;

  // 响应式列配置
  const statColSpan = isMobile ? 24 : isTablet ? 8 : undefined; // PC端用固定20%CSS处理
  const statColProps = isMobile || isTablet ? { span: statColSpan } : { flex: '1 1 20%', style: { minWidth: 0 } };

  useEffect(() => {
    request.get('/analytics/dashboard').then((res: any) => setData(res.data.data));
  }, []);

  if (!data) return <div style={{ textAlign: 'center', padding: 48, color: '#999' }}>加载中...</div>;

  const statCards = [
    { title: '商机总数', value: data.total, prefix: '📊', color: undefined },
    { title: '待跟进', value: data.pending, prefix: '⏳', color: '#faad14' },
    { title: '成单成功', value: data.success, prefix: '✅', color: '#52c41a' },
    { title: '成单金额', value: data.revenue, prefix: '💰', color: '#1677ff', suffix: '元' },
    { title: '成单率', value: data.rate, prefix: '📈', color: data.rate >= 30 ? '#52c41a' : '#faad14', suffix: '%' },
  ];

  const columns = [
    { title: '公司名称', dataIndex: 'company_name', key: 'company_name',
      render: (t: string, r: Opportunity) => <a onClick={() => navigate(`/opportunities/${r.id}`)}>{t}</a>,
      ellipsis: true,
    },
    { title: '联系人', dataIndex: 'contact_name', key: 'contact_name',
      responsive: ['md' as const],
    },
    { title: '状态', dataIndex: 'status', key: 'status',
      render: (s: string) => <Tag color={statusColors[s] || 'default'}>{s}</Tag>,
    },
    { title: '负责人', dataIndex: 'sales_name', key: 'sales_name',
      responsive: ['sm' as const],
    },
    { title: '更新时间', dataIndex: 'updated_at', key: 'updated_at',
      render: (t: string) => dayjs(t).format(isMobile ? 'MM-DD' : 'MM-DD HH:mm'),
      responsive: ['md' as const],
    },
    { title: '操作', key: 'action',
      render: (_: any, r: Opportunity) => (
        <Button type="link" size="small" onClick={() => navigate(`/opportunities/${r.id}`)}>查看</Button>
      ),
    },
  ];

  return (
    <div>
      <Title level={isMobile ? 5 : 4} className="page-title" style={{ marginBottom: isMobile ? 12 : 24 }}>
        工作台
      </Title>

      {/* 统计卡片 - 响应式网格 */}
      <Row gutter={[isMobile ? 8 : 16, isMobile ? 8 : 16]} style={{ marginBottom: isMobile ? 12 : 24 }}>
        {statCards.map((card, idx) => (
          <Col key={idx} {...statColProps}>
            <Card hoverable={!isMobile} style={{ borderRadius: isMobile ? 8 : undefined }}>
              <Statistic
                title={<span style={{ fontSize: isMobile ? 12 : 14 }}>{card.title}</span>}
                value={card.value}
                valueStyle={{ color: card.color, fontSize: isMobile ? 20 : 24 }}
                prefix={<span style={{ fontSize: isMobile ? 16 : 20 }}>{card.prefix}</span>}
                suffix={card.suffix ? <span style={{ fontSize: isMobile ? 13 : 16 }}>{card.suffix}</span> : undefined}
              />
            </Card>
          </Col>
        ))}
      </Row>

      {/* 最近商机 */}
      <Card
        title={<span style={{ fontSize: isMobile ? 15 : 16 }}>最近商机</span>}
        extra={<Button type="link" size={isMobile ? 'small' : 'middle'} onClick={() => navigate('/opportunities')}>查看全部</Button>}
      >
        <Table
          rowKey="id"
          columns={columns}
          dataSource={data.recent}
          pagination={false}
          size={isMobile ? 'small' : 'middle'}
          scroll={isMobile ? { x: 500 } : undefined}
        />
      </Card>
    </div>
  );
};

export default Dashboard;
