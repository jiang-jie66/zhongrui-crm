import React, { useEffect, useState, useCallback } from 'react';
import { Descriptions, Tag, Timeline, Button, Form, Input, DatePicker, Select, message, Space, Card, Modal, Grid, Typography } from 'antd';
import { ArrowLeftOutlined, PlusOutlined, SaveOutlined, SwapOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import dayjs from 'dayjs';
import request from '../utils/request';
import type { Opportunity, Followup } from '../types';

const { useBreakpoint } = Grid;
const { Title } = Typography;

const statusColors: Record<string, string> = {
  '待跟进': 'default', '跟进中': 'processing', '意向高': 'warning',
  '已报价': 'purple', '成单成功': 'success', '成单失败': 'error',
};
const statusOptions = ['待跟进', '跟进中', '意向高', '已报价', '成单成功', '成单失败'];

const OpportunityDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [opp, setOpp] = useState<Opportunity | null>(null);
  const [followups, setFollowups] = useState<Followup[]>([]);
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [form] = Form.useForm();
  const [followupForm] = Form.useForm();
  const [followupModalVisible, setFollowupModalVisible] = useState(false);
  const navigate = useNavigate();
  const [reassignModalVisible, setReassignModalVisible] = useState(false);
  const [reassignForm] = Form.useForm();
  const [salesList, setSalesList] = useState<any[]>([]);
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const fetchDetail = useCallback(async () => {
    setLoading(true);
    try {
      const res: any = await request.get(`/opportunities/${id}`);
      const d = res.data.data;
      setOpp(d);
      setFollowups(d.followups || []);
      form.setFieldsValue({
        company_name: d.company_name, contact_name: d.contact_name, contact_phone: d.contact_phone,
        industry: d.industry, source: d.source, status: d.status, deal_amount: d.deal_amount,
      });
    } finally { setLoading(false); }
  }, [id, form]);

  useEffect(() => {
    if (user.role === 'admin') {
      request.get('/auth/sales').then((res: any) => {
        setSalesList(res.data.data || []);
      }).catch(() => {});
    }
  }, [user.role]);

  useEffect(() => { fetchDetail(); }, [fetchDetail]);

  const canEdit = user.role === 'admin' || (user.role === 'sales' && opp?.sales_id === user.id);

  const handleUpdate = async () => {
    const values = await form.validateFields();
    await request.put(`/opportunities/${id}`, values);
    message.success('更新成功');
    setEditMode(false);
    fetchDetail();
  };

  const handleAddFollowup = async () => {
    const values = await followupForm.validateFields();
    await request.post(`/opportunities/${id}/followups`, {
      ...values, followup_time: values.followup_time.format('YYYY-MM-DD HH:mm:ss'),
    });
    message.success('跟进记录已添加');
    setFollowupModalVisible(false);
    followupForm.resetFields();
    fetchDetail();
  };

  if (!opp) return <div style={{ textAlign: 'center', padding: 48, color: '#999' }}>{loading ? '加载中...' : '商机不存在'}</div>;

  return (
    <div>
      {/* 顶部导航 */}
      <Space style={{ marginBottom: isMobile ? 12 : 16 }} wrap>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/opportunities')} size={isMobile ? 'small' : 'middle'}>
          {!isMobile && '返回列表'}
        </Button>
        <Title level={isMobile ? 5 : 4} style={{ margin: 0 }}>商机详情</Title>
      </Space>

      {/* 基本信息卡片 */}
      <Card
        title={<span style={{ fontSize: isMobile ? 15 : 16 }}>基本信息</span>}
        extra={
          <Space>
            {!editMode && user.role === 'admin' && opp.sales_name && (
              <Button icon={<SwapOutlined />} size="small" onClick={() => setReassignModalVisible(true)}>
                {!isMobile && '转交销售'}
              </Button>
            )}
            {canEdit && !editMode ? (
              <Button onClick={() => setEditMode(true)} size={isMobile ? 'small' : 'middle'}>编辑</Button>
            ) : null}
          </Space>
        }
        style={{ marginBottom: isMobile ? 12 : 16 }}
      >
        {editMode && user.role === 'admin' ? (
          <Form form={form} layout="vertical" style={{ maxWidth: isMobile ? '100%' : 600 }}
            size={isMobile ? 'middle' : 'large'}>
            <Form.Item name="company_name" label="公司名称" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="contact_name" label="联系人" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="contact_phone" label="联系电话" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="industry" label="所属行业"><Input /></Form.Item>
            <Form.Item name="source" label="来源渠道"><Input /></Form.Item>
            <Form.Item name="status" label="当前状态">
              <Select options={statusOptions.map(s => ({ value: s, label: s }))}
                getPopupContainer={t => t.parentElement || document.body} />
            </Form.Item>
            <Form.Item name="deal_amount" label="成单金额（元）"><Input type="number" /></Form.Item>
            {user.role === 'admin' && (
              <Form.Item name="sales_id" label="分配销售">
                <Select placeholder="选择销售负责人" allowClear
                  options={salesList.map(s => ({ value: s.id, label: s.name }))}
                  getPopupContainer={t => t.parentElement || document.body} />
              </Form.Item>
            )}
            <Space>
              <Button type="primary" icon={<SaveOutlined />} onClick={handleUpdate} size={isMobile ? 'middle' : 'middle'}>保存</Button>
              <Button onClick={() => setEditMode(false)}>取消</Button>
            </Space>
          </Form>
        ) : (
          <Descriptions column={isMobile ? 1 : 2} bordered size={isMobile ? 'small' : 'small'}>
            <Descriptions.Item label="公司名称">{opp.company_name}</Descriptions.Item>
            <Descriptions.Item label="联系人">{opp.contact_name}</Descriptions.Item>
            <Descriptions.Item label="联系电话">{opp.contact_phone}</Descriptions.Item>
            <Descriptions.Item label="所属行业">{opp.industry || '-'}</Descriptions.Item>
            <Descriptions.Item label="来源渠道">{opp.source || '-'}</Descriptions.Item>
            <Descriptions.Item label="当前状态">
              <Tag color={statusColors[opp.status]}>{opp.status}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="销售负责人">{opp.sales_name || '-'}</Descriptions.Item>
            <Descriptions.Item label="成单金额">{opp.deal_amount > 0 ? `¥${opp.deal_amount.toLocaleString()}` : '-'}</Descriptions.Item>
            <Descriptions.Item label="创建时间">{dayjs(opp.created_at).format(isMobile ? 'MM-DD HH:mm' : 'YYYY-MM-DD HH:mm')}</Descriptions.Item>
            <Descriptions.Item label="更新时间">{dayjs(opp.updated_at).format(isMobile ? 'MM-DD HH:mm' : 'YYYY-MM-DD HH:mm')}</Descriptions.Item>
          </Descriptions>
        )}
      </Card>

      {/* 跟进记录 */}
      <Card
        title={<span style={{ fontSize: isMobile ? 15 : 16 }}>跟进记录</span>}
        extra={canEdit ? (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setFollowupModalVisible(true)}
            size={isMobile ? 'small' : 'middle'}>
            {!isMobile && '添加跟进'}
          </Button>
        ) : null}
      >
        {followups.length === 0 ? (
          <div style={{ color: '#999', textAlign: 'center', padding: isMobile ? 16 : 20, fontSize: isMobile ? 13 : 14 }}>
            暂无跟进记录
          </div>
        ) : (
          <Timeline items={followups.map((f: Followup) => ({
            children: (
              <div>
                <div style={{ fontWeight: 500, fontSize: isMobile ? 13 : 14 }}>
                  {dayjs(f.followup_time).format(isMobile ? 'MM-DD HH:mm' : 'YYYY-MM-DD HH:mm')}
                  {f.status && <Tag color={statusColors[f.status]} style={{ marginLeft: 8 }}>{f.status}</Tag>}
                </div>
                <div style={{ marginTop: 4, color: '#333', fontSize: isMobile ? 13 : 14 }}>{f.content}</div>
                <div style={{ marginTop: 4, fontSize: 12, color: '#999' }}>记录人：{f.creator_name}</div>
              </div>
            ),
          }))} />
        )}
      </Card>

      {/* 添加跟进弹窗 */}
      <Modal title="添加跟进记录" open={followupModalVisible}
        onCancel={() => setFollowupModalVisible(false)}
        onOk={handleAddFollowup} okText="提交" cancelText="取消"
        width={isMobile ? undefined : 500}
        style={isMobile ? { top: 16 } : undefined}>
        <Form form={followupForm} layout="vertical" size={isMobile ? 'middle' : 'large'}>
          <Form.Item name="followup_time" label="跟进时间" rules={[{ required: true, message: '请选择跟进时间' }]}>
            <DatePicker showTime format="YYYY-MM-DD HH:mm" style={{ width: '100%' }}
              getPopupContainer={t => t.parentElement || document.body} />
          </Form.Item>
          <Form.Item name="content" label="跟进内容" rules={[{ required: true, message: '请输入跟进内容' }]}>
            <Input.TextArea rows={isMobile ? 3 : 4} placeholder="请输入本次跟进的详细内容..." />
          </Form.Item>
          <Form.Item name="status" label="更新状态">
            <Select placeholder="选择后同步更新商机状态" allowClear
              getPopupContainer={t => t.parentElement || document.body}>
              {statusOptions.map(s => <Select.Option key={s} value={s}>{s}</Select.Option>)}
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* 转交销售弹窗 */}
      <Modal title={`转交销售 - ${opp?.company_name || ''}`} open={reassignModalVisible}
        onCancel={() => { setReassignModalVisible(false); reassignForm.resetFields(); }}
        onOk={async () => {
          const values = await reassignForm.validateFields();
          await request.put(`/opportunities/${id}`, { sales_id: values.new_sales_id });
          message.success('商机已成功转交');
          setReassignModalVisible(false);
          reassignForm.resetFields();
          fetchDetail();
        }}
        okText="确认转交" cancelText="取消"
        width={isMobile ? undefined : 450}
        style={isMobile ? { top: 16 } : undefined}>
        <p style={{ color: '#999', marginBottom: 16, fontSize: isMobile ? 13 : 14 }}>
          当前负责人：<strong>{opp?.sales_name || '未分配'}</strong>
          <br />请选择新的销售负责人，确认后商机将立即转交。
        </p>
        <Form form={reassignForm} layout="vertical">
          <Form.Item name="new_sales_id" label="新销售负责人"
            rules={[{ required: true, message: '请选择新销售负责人' }]}>
            <Select placeholder="请选择销售" options={
              salesList.filter(s => s.id !== opp?.sales_id).map(s => ({ value: s.id, label: s.name }))
            } getPopupContainer={t => t.parentElement || document.body} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default OpportunityDetail;
