import React, { useEffect, useState, useCallback } from 'react';
import { Table, Button, Input, Select, Tag, Space, Card, Form, Modal, message, Grid, Typography } from 'antd';
import { SearchOutlined, PlusOutlined, ReloadOutlined, SwapOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import request from '../utils/request';
import type { Opportunity, PageData } from '../types';

const { useBreakpoint } = Grid;
const { Title } = Typography;

const statusColors: Record<string, string> = {
  '待跟进': 'default', '跟进中': 'processing', '意向高': 'warning',
  '已报价': 'purple', '成单成功': 'success', '成单失败': 'error',
};

const OpportunityList: React.FC = () => {
  const [data, setData] = useState<PageData<Opportunity>>({ list: [], total: 0, page: 1, pageSize: 10 });
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [meta, setMeta] = useState<{ industries: string[]; sources: string[]; statuses: string[] }>({ industries: [], sources: [], statuses: [] });
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [reassignModalVisible, setReassignModalVisible] = useState(false);
  const [reassignRecord, setReassignRecord] = useState<Opportunity | null>(null);
  const [reassignForm] = Form.useForm();
  const [salesList, setSalesList] = useState<any[]>([]);
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const isTablet = screens.md && !screens.lg;

  const fetchData = useCallback(async (page = 1, pageSize = 10) => {
    setLoading(true);
    try {
      const res: any = await request.get('/opportunities', { params: { keyword, status: statusFilter, source: sourceFilter, page, pageSize } });
      setData(res.data.data);
    } finally { setLoading(false); }
  }, [keyword, statusFilter, sourceFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => {
    request.get('/opportunities/meta/options').then((res: any) => setMeta(res.data.data));
  }, []);

  useEffect(() => {
    if (createModalVisible || reassignModalVisible) {
      request.get('/auth/sales').then((res: any) => setSalesList(res.data.data || []));
    }
  }, [createModalVisible, reassignModalVisible]);

  const handleCreate = async () => {
    const values = await form.validateFields();
    await request.post('/opportunities', values);
    message.success('商机创建成功');
    setCreateModalVisible(false);
    form.resetFields();
    fetchData();
  };

  const openReassignModal = (record: Opportunity) => {
    setReassignRecord(record);
    reassignForm.resetFields();
    setReassignModalVisible(true);
  };

  const handleReassign = async () => {
    const values = await reassignForm.validateFields();
    await request.put(`/opportunities/${reassignRecord!.id}`, { sales_id: values.new_sales_id });
    message.success('商机已成功转交');
    setReassignModalVisible(false);
    reassignForm.resetFields();
    fetchData();
  };

  // 响应式搜索栏：移动端纵向排列
  const searchBarStyle: React.CSSProperties = isMobile ? {
    flexDirection: 'column', alignItems: 'stretch', width: '100%',
  } : {};

  const inputStyle: React.CSSProperties = isMobile ? { width: '100%', marginBottom: 8 } : { width: 240 };
  const selectStyle: React.CSSProperties = isMobile ? { width: '100%', marginBottom: 8 } : { width: 130 };

  const columns = [
    { title: '公司名称', dataIndex: 'company_name', key: 'company_name',
      render: (t: string, r: Opportunity) => <a onClick={() => navigate(`/opportunities/${r.id}`)}>{t}</a>,
      fixed: isMobile ? 'left' as const : undefined,
      width: isMobile ? 140 : undefined,
    },
    { title: '联系人', dataIndex: 'contact_name', key: 'contact_name',
      responsive: ['sm' as const],
    },
    { title: '电话', dataIndex: 'contact_phone', key: 'contact_phone',
      responsive: ['md' as const],
    },
    { title: '行业', dataIndex: 'industry', key: 'industry', width: 100,
      responsive: ['md' as const],
    },
    { title: '来源', dataIndex: 'source', key: 'source', width: 100,
      responsive: ['lg' as const],
    },
    { title: '状态', dataIndex: 'status', key: 'status', width: isMobile ? 80 : 100,
      render: (s: string) => <Tag color={statusColors[s] || 'default'}>{s}</Tag>,
    },
    { title: '负责人', dataIndex: 'sales_name', key: 'sales_name', width: 80,
      responsive: ['sm' as const],
    },
    { title: '成单金额', dataIndex: 'deal_amount', key: 'deal_amount',
      render: (v: number) => v > 0 ? `¥${v.toLocaleString()}` : '-',
      responsive: ['md' as const],
      width: 100,
    },
    { title: '更新时间', dataIndex: 'updated_at', key: 'updated_at',
      render: (t: string) => dayjs(t).format(isMobile ? 'MM-DD' : 'YYYY-MM-DD HH:mm'),
      responsive: ['sm' as const],
      width: isMobile ? 100 : 150,
    },
    ['super_admin', 'sub_admin', 'admin'].includes(user.role) ? {
      title: '操作', key: 'action', width: 60, fixed: 'right' as const,
      render: (_: any, record: Opportunity) => (
        <Button type="link" icon={<SwapOutlined />} onClick={() => openReassignModal(record)} size="small" />
      ),
    } : null,
  ].filter(Boolean) as any;

  return (
    <div>
      <Title level={isMobile ? 5 : 4} className="page-title" style={{ marginBottom: isMobile ? 12 : 24 }}>
        商机管理
      </Title>

      {/* 搜索栏 */}
      <Card style={{ marginBottom: isMobile ? 8 : 16 }}>
        <Space wrap style={searchBarStyle}>
          <Input placeholder="搜索公司/联系人/电话" prefix={<SearchOutlined />} value={keyword}
            onChange={e => setKeyword(e.target.value)} style={inputStyle} allowClear />
          <Select placeholder="商机状态" value={statusFilter || undefined} onChange={setStatusFilter}
            style={selectStyle} allowClear getPopupContainer={t => t.parentElement || document.body}>
            {meta.statuses?.map((s: string) => <Select.Option key={s} value={s}>{s}</Select.Option>)}
          </Select>
          <Select placeholder="来源渠道" value={sourceFilter || undefined} onChange={setSourceFilter}
            style={selectStyle} allowClear getPopupContainer={t => t.parentElement || document.body}>
            {meta.sources?.map((s: string) => <Select.Option key={s} value={s}>{s}</Select.Option>)}
          </Select>
          <Button icon={<ReloadOutlined />} onClick={() => fetchData()} style={isMobile ? { width: '100%' } : undefined}>
            刷新
          </Button>
          {['super_admin', 'sub_admin', 'admin'].includes(user.role) && (
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModalVisible(true)}
              style={isMobile ? { width: '100%' } : undefined} block={isMobile}>
              新建商机
            </Button>
          )}
        </Space>
      </Card>

      {/* 表格 */}
      <Card>
        <Table rowKey="id" columns={columns} dataSource={data.list} loading={loading}
          pagination={{
            current: data.page, pageSize: data.pageSize, total: data.total,
            onChange: (p, ps) => fetchData(p, ps),
            showSizeChanger: !isMobile,
            showTotal: t => `共 ${t} 条`,
            size: isMobile ? 'small' : 'default',
            simple: isMobile,
          }}
          scroll={isMobile ? { x: 800 } : { x: 1100 }}
          size={isMobile ? 'small' : 'middle'} />
      </Card>

      {/* 新建商机弹窗 */}
      <Modal title="新建商机" open={createModalVisible}
        onCancel={() => { setCreateModalVisible(false); form.resetFields(); }}
        onOk={handleCreate} okText="创建" cancelText="取消"
        width={isMobile ? undefined : 550}
        style={isMobile ? { top: 16 } : undefined}>
        <Form form={form} layout="vertical" size={isMobile ? 'middle' : 'large'}>
          <Form.Item name="company_name" label="公司名称" rules={[{ required: true, message: '请输入公司名称' }]}>
            <Input placeholder="公司名称" />
          </Form.Item>
          <Form.Item name="contact_name" label="联系人姓名" rules={[{ required: true, message: '请输入联系人' }]}>
            <Input placeholder="联系人姓名" />
          </Form.Item>
          <Form.Item name="contact_phone" label="联系电话" rules={[{ required: true, message: '请输入联系电话' }]}>
            <Input placeholder="联系电话" />
          </Form.Item>
          <Form.Item name="industry" label="所属行业">
            <Input placeholder="如：互联网、制造业" />
          </Form.Item>
          <Form.Item name="source" label="来源渠道">
            <Input placeholder="如：线上推广、朋友介绍" />
          </Form.Item>
          <Form.Item name="sales_id" label="分配销售">
            <Select placeholder="请选择销售负责人" allowClear
              options={salesList.map(s => ({ value: s.id, label: s.name }))}
              getPopupContainer={t => t.parentElement || document.body} />
          </Form.Item>
          <Form.Item name="remark" label="备注">
            <Input.TextArea rows={isMobile ? 2 : 3} placeholder="补充说明（选填）" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 分配销售弹窗 */}
      <Modal title={`分配销售 - ${reassignRecord?.company_name || ''}`} open={reassignModalVisible}
        onCancel={() => { setReassignModalVisible(false); reassignForm.resetFields(); }}
        onOk={handleReassign} okText="确认分配" cancelText="取消"
        width={isMobile ? undefined : 450}
        style={isMobile ? { top: 16 } : undefined}>
        <p style={{ color: '#999', marginBottom: 16, fontSize: isMobile ? 13 : 14 }}>
          当前负责人：<strong>{reassignRecord?.sales_name || '未分配'}</strong><br />
          请选择新的销售负责人，确认后商机将立即转交。
        </p>
        <Form form={reassignForm} layout="vertical">
          <Form.Item name="new_sales_id" label="新销售负责人" rules={[{ required: true, message: '请选择新销售负责人' }]}>
            <Select placeholder="请选择销售" options={
              salesList.filter(s => s.id !== reassignRecord?.sales_id).map(s => ({ value: s.id, label: s.name }))
            } getPopupContainer={t => t.parentElement || document.body} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default OpportunityList;
