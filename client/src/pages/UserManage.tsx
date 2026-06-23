import React, { useEffect, useState } from 'react';
import { Table, Button, Modal, Form, Input, message, Space, Tag, Popconfirm, Grid, Typography, Select, Descriptions } from 'antd';
import { PlusOutlined, ReloadOutlined, KeyOutlined, DeleteOutlined, TeamOutlined, UserOutlined, CrownOutlined } from '@ant-design/icons';
import request from '../utils/request';
import { validatePassword } from '../utils/validate';

const { useBreakpoint } = Grid;
const { Title } = Typography;

interface UserItem {
  id: number;
  username: string;
  name: string;
  role: string;
  phone: string;
  parent_id: number | null;
  parent_name: string;
  created_at: string;
}

const UserManage: React.FC = () => {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [createForm] = Form.useForm();
  const [resetModalVisible, setResetModalVisible] = useState(false);
  const [resetForm] = Form.useForm();
  const [resetTarget, setResetTarget] = useState<{ id: number; name: string } | null>(null);
  const [resetLoading, setResetLoading] = useState(false);
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  // 读取当前登录用户
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const isSuperAdmin = currentUser.role === 'super_admin' || currentUser.role === 'admin';
  const isSubAdmin = currentUser.role === 'sub_admin';

  const roleConfig: Record<string, { color: string; label: string; icon: React.ReactNode }> = {
    super_admin: { color: 'red', label: '总管理员', icon: <CrownOutlined /> },
    admin: { color: 'red', label: '总管理员', icon: <CrownOutlined /> },
    sub_admin: { color: 'orange', label: '副管理员', icon: <TeamOutlined /> },
    sales: { color: 'blue', label: '销售', icon: <UserOutlined /> },
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res: any = await request.get('/auth/users');
      setUsers(res.data.data);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleCreate = async () => {
    const values = await createForm.validateFields();
    const payload: any = { username: values.username, password: values.password, name: values.name, phone: values.phone };
    // 总管理员需要指定角色
    if (isSuperAdmin) {
      payload.role = values.role || 'sales';
    }
    // 副管理员创建的一定是销售
    if (isSubAdmin) {
      payload.role = 'sales';
    }
    await request.post('/auth/register', payload);
    const roleText = roleConfig[payload.role]?.label || '用户';
    message.success(`${roleText}账号创建成功`);
    setCreateModalVisible(false);
    createForm.resetFields();
    fetchUsers();
  };

  const openResetModal = (record: UserItem) => {
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

  const handleDelete = async (record: UserItem) => {
    await request.delete(`/auth/${record.id}`);
    message.success(`已成功删除账号 ${record.name}`);
    fetchUsers();
  };

  const columns = [
    { title: '用户名', dataIndex: 'username', key: 'username', width: isMobile ? 100 : undefined },
    { title: '姓名', dataIndex: 'name', key: 'name', width: isMobile ? 80 : undefined },
    {
      title: '角色', dataIndex: 'role', key: 'role',
      render: (role: string) => {
        const cfg = roleConfig[role] || { color: 'default', label: role, icon: null };
        return <Tag color={cfg.color} icon={cfg.icon}>{cfg.label}</Tag>;
      },
      responsive: ['sm' as const],
    },
    {
      title: '上级', dataIndex: 'parent_name', key: 'parent_name',
      render: (v: string, record: UserItem) => v || (record.role === 'super_admin' || record.role === 'admin' ? '—' : '未分配'),
      responsive: ['sm' as const],
    },
    { title: '电话', dataIndex: 'phone', key: 'phone', render: (v: string) => v || '-',
      responsive: ['md' as const],
    },
    {
      title: '操作', key: 'action', width: isMobile ? 120 : 200,
      render: (_: any, record: UserItem) => {
        const isSelf = record.id === currentUser.id;
        const isTargetSuperAdmin = record.role === 'super_admin' || record.role === 'admin';
        // 总管理员不能删除自己，可以删除副管理员和销售
        // 副管理员只能操作自己的下属销售
        const canManage = isSuperAdmin
          ? !isSelf && !isTargetSuperAdmin
          : (isSubAdmin && record.parent_id === currentUser.id && record.role === 'sales');

        return (
          <Space wrap size={isMobile ? 0 : 'small'}>
            <Button type="link" icon={<KeyOutlined />} onClick={() => openResetModal(record)}
              size={isMobile ? 'small' : 'middle'}>
              {!isMobile && '重置密码'}
            </Button>
            {canManage && (
              <Popconfirm title={`确定删除「${record.name}」吗？`}
                description={record.role === 'sub_admin'
                  ? "删除后其下属销售将变为未分配状态。此操作不可撤销！"
                  : "删除后该销售关联的商机将取消分配。此操作不可撤销！"}
                onConfirm={() => handleDelete(record)} okText="确认删除" cancelText="取消"
                okButtonProps={{ danger: true }}>
                <Button type="link" danger icon={<DeleteOutlined />}
                  size={isMobile ? 'small' : 'middle'}>
                  {!isMobile && '删除'}
                </Button>
              </Popconfirm>
            )}
          </Space>
        );
      },
    },
  ];

  return (
    <div>
      <Title level={isMobile ? 5 : 4} className="page-title" style={{ marginBottom: isMobile ? 12 : 24 }}>
        用户管理
      </Title>
      <Space style={{ marginBottom: isMobile ? 12 : 16 }} wrap>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => {
          createForm.resetFields();
          setCreateModalVisible(true);
        }}
          size={isMobile ? 'middle' : 'middle'} block={isMobile}>
          {isSuperAdmin ? '新建账号' : '新建销售账号'}
        </Button>
        <Button icon={<ReloadOutlined />} onClick={fetchUsers}
          size={isMobile ? 'middle' : 'middle'} block={isMobile}>
          刷新
        </Button>
      </Space>
      <Table rowKey="id" columns={columns} dataSource={users} loading={loading}
        pagination={false} size={isMobile ? 'small' : 'middle'}
        scroll={isMobile ? { x: 450 } : undefined} />

      {/* 新建账号弹窗 */}
      <Modal title={isSuperAdmin ? '新建账号' : '新建销售账号'} open={createModalVisible}
        onCancel={() => { setCreateModalVisible(false); createForm.resetFields(); }}
        onOk={handleCreate} okText="创建" cancelText="取消"
        width={isMobile ? undefined : 500}
        style={isMobile ? { top: 16 } : undefined}>
        <Form form={createForm} layout="vertical" size={isMobile ? 'middle' : 'large'}
          initialValues={{ role: 'sales' }}>
          {/* 总管理员可以选择角色 */}
          {isSuperAdmin && (
            <Form.Item name="role" label="角色" rules={[{ required: true, message: '请选择角色' }]}>
              <Select
                options={[
                  { value: 'sub_admin', label: '副管理员' },
                  { value: 'sales', label: '销售人员' },
                ]}
                getPopupContainer={(t) => t.parentElement || document.body}
              />
            </Form.Item>
          )}
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
            <Input placeholder="姓名" />
          </Form.Item>
          <Form.Item name="phone" label="联系电话">
            <Input placeholder="联系电话（选填）" />
          </Form.Item>
        </Form>
        <Descriptions column={1} size="small" style={{ marginTop: 8 }} bordered>
          <Descriptions.Item label={
            <span style={{ color: '#faad14' }}>权限说明</span>
          }>
            {isSuperAdmin
              ? '副管理员：可管理下属销售、分配商机；销售：仅查看自己的商机'
              : '创建的销售将自动归属到您名下'}
          </Descriptions.Item>
        </Descriptions>
      </Modal>

      {/* 重置密码弹窗 */}
      <Modal title={`重置密码 - ${resetTarget?.name || ''}`} open={resetModalVisible}
        onCancel={() => { setResetModalVisible(false); resetForm.resetFields(); }}
        onOk={handleResetPassword} confirmLoading={resetLoading} okText="确认重置" cancelText="取消"
        width={isMobile ? undefined : 450}
        style={isMobile ? { top: 16 } : undefined}>
        <p style={{ color: '#999', marginBottom: 16, fontSize: isMobile ? 13 : 14 }}>
          将为该用户设置新密码，重置后原密码将失效。
        </p>
        <Form form={resetForm} layout="vertical" size={isMobile ? 'middle' : 'large'}>
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
