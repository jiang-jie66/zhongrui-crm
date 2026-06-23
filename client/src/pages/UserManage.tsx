import React, { useEffect, useState } from 'react';
import { Table, Button, Modal, Form, Input, message, Space, Tag, Popconfirm } from 'antd';
import { PlusOutlined, ReloadOutlined, KeyOutlined, DeleteOutlined } from '@ant-design/icons';
import request from '../utils/request';
import { validatePassword } from '../utils/validate';

const UserManage: React.FC = () => {
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [createForm] = Form.useForm();
  const [resetModalVisible, setResetModalVisible] = useState(false);
  const [resetForm] = Form.useForm();
  const [resetTarget, setResetTarget] = useState<{ id: number; name: string } | null>(null);
  const [resetLoading, setResetLoading] = useState(false);

  const fetchSales = async () => {
    setLoading(true);
    try {
      const res: any = await request.get('/auth/sales');
      setSales(res.data.data);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchSales(); }, []);

  const handleCreate = async () => {
    const values = await createForm.validateFields();
    await request.post('/auth/register', values);
    message.success('销售账号创建成功');
    setCreateModalVisible(false);
    createForm.resetFields();
    fetchSales();
  };

  const openResetModal = (record: any) => {
    setResetTarget({ id: record.id, name: record.name });
    resetForm.resetFields();
    setResetModalVisible(true);
  };

  const handleResetPassword = async () => {
    const values = await resetForm.validateFields();
    setResetLoading(true);
    try {
      await request.post(`/auth/reset-password/${resetTarget!.id}`, { newPassword: values.newPassword });
      message.success(`已成功重置 ${resetTarget!.name} 的密码`);
      setResetModalVisible(false);
      resetForm.resetFields();
    } finally {
      setResetLoading(false);
    }
  };

  const handleDelete = async (record: any) => {
    await request.delete(`/auth/${record.id}`);
    message.success(`已成功删除销售账号 ${record.name}`);
    fetchSales();
  };

  const columns = [
    { title: '用户名', dataIndex: 'username', key: 'username' },
    { title: '姓名', dataIndex: 'name', key: 'name' },
    { title: '电话', dataIndex: 'phone', key: 'phone', render: (v: string) => v || '-' },
    { title: '角色', key: 'role', render: () => <Tag color="blue">销售</Tag> },
    {
      title: '操作', key: 'action', render: (_: any, record: any) => (
        <Space>
          <Button type="link" icon={<KeyOutlined />} onClick={() => openResetModal(record)}>重置密码</Button>
          <Popconfirm title={`确定删除销售账号「${record.name}」吗？`}
            description="删除后该销售关联的商机将取消分配。此操作不可撤销！"
            onConfirm={() => handleDelete(record)} okText="确认删除" cancelText="取消"
            okButtonProps={{ danger: true }}>
            <Button type="link" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <h2 style={{ marginBottom: 24 }}>销售用户管理</h2>
      <Space style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModalVisible(true)}>新建销售账号</Button>
        <Button icon={<ReloadOutlined />} onClick={fetchSales}>刷新</Button>
      </Space>
      <Table rowKey="id" columns={columns} dataSource={sales} loading={loading} pagination={false} />

      {/* 新建销售账号弹窗 */}
      <Modal title="新建销售账号" open={createModalVisible} onCancel={() => { setCreateModalVisible(false); createForm.resetFields(); }}
        onOk={handleCreate} okText="创建" cancelText="取消" width={500}>
        <Form form={createForm} layout="vertical">
          <Form.Item name="username" label="用户名" rules={[{ required: true, message: '请输入用户名' }]}>
            <Input placeholder="登录用户名" />
          </Form.Item>
          <Form.Item name="password" label="密码" rules={[
            { required: true, message: '请输入密码' },
            { validator: (_, v) => v && validatePassword(v) ? Promise.reject(validatePassword(v)) : Promise.resolve() },
          ]}>
            <Input.Password placeholder="至少8位，包含字母和数字" />
          </Form.Item>
          <Form.Item name="name" label="姓名" rules={[{ required: true, message: '请输入姓名' }]}>
            <Input placeholder="销售姓名" />
          </Form.Item>
          <Form.Item name="phone" label="联系电话"><Input placeholder="联系电话（选填）" /></Form.Item>
        </Form>
      </Modal>

      {/* 重置密码弹窗 */}
      <Modal title={`重置密码 - ${resetTarget?.name || ''}`} open={resetModalVisible}
        onCancel={() => { setResetModalVisible(false); resetForm.resetFields(); }}
        onOk={handleResetPassword} confirmLoading={resetLoading} okText="确认重置" cancelText="取消" width={450}>
        <p style={{ color: '#999', marginBottom: 16 }}>将为该用户设置新密码，重置后原密码将失效。</p>
        <Form form={resetForm} layout="vertical">
          <Form.Item name="newPassword" label="新密码" rules={[
            { required: true, message: '请输入新密码' },
            { validator: (_, v) => v && validatePassword(v) ? Promise.reject(validatePassword(v)) : Promise.resolve() },
          ]}>
            <Input.Password placeholder="至少8位，包含字母和数字" />
          </Form.Item>
          <Form.Item name="confirmPassword" label="确认新密码" dependencies={['newPassword']} rules={[
            { required: true, message: '请再次输入新密码' },
            ({ getFieldValue }) => ({
              validator(_, v) {
                if (!v || getFieldValue('newPassword') === v) return Promise.resolve();
                return Promise.reject('两次输入的密码不一致');
              },
            }),
          ]}>
            <Input.Password placeholder="请再次输入新密码" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default UserManage;
