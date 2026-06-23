import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { message, Layout, Menu, Avatar, Dropdown, Button, Drawer, Modal, Form, Input, Grid } from 'antd';
import type { MenuProps } from 'antd';
import {
  DashboardOutlined, ProjectOutlined, BarChartOutlined, UserOutlined, LogoutOutlined, KeyOutlined,
  UnorderedListOutlined, MenuOutlined, MenuFoldOutlined,
} from '@ant-design/icons';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import OpportunityList from './pages/OpportunityList';
import OpportunityDetail from './pages/OpportunityDetail';
import Analytics from './pages/Analytics';
import UserManage from './pages/UserManage';
import OperationLogs from './pages/OperationLogs';
import request from './utils/request';
import { validatePassword } from './utils/validate';
import type { User } from './types';

const { Header, Content, Sider } = Layout;
const { useBreakpoint } = Grid;

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [pwdModalVisible, setPwdModalVisible] = useState(false);
  const [pwdForm] = Form.useForm();
  const [pwdLoading, setPwdLoading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [siderCollapsed, setSiderCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const screens = useBreakpoint();

  // 响应式断点判断：移动端 < 768px
  const isMobile = !screens.md;
  const isTablet = screens.md && !screens.lg;
  const isDesktop = !!screens.lg;

  // 路由变化时关闭移动端抽屉
  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { setLoading(false); return; }
    request.get('/auth/me').then((res: any) => {
      setUser(res.data.data);
      localStorage.setItem('user', JSON.stringify(res.data.data));
      setLoading(false);
    }).catch(() => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setLoading(false);
    });
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    navigate('/login');
    message.success('已退出登录');
  };

  const handleChangePassword = async () => {
    const values = await pwdForm.validateFields();
    setPwdLoading(true);
    try {
      await request.post('/auth/change-password', values);
      message.success('密码修改成功，请重新登录');
      setPwdModalVisible(false);
      pwdForm.resetFields();
      handleLogout();
    } finally {
      setPwdLoading(false);
    }
  };

  if (loading) return <div style={{ textAlign: 'center', marginTop: 100, fontSize: 16, color: '#999' }}>加载中...</div>;
  if (!user) return (
    <Routes>
      <Route path="/login" element={<Login onLogin={setUser} />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );

  const menuItems: MenuProps['items'] = [
    { key: '/dashboard', icon: <DashboardOutlined />, label: '工作台' },
    { key: '/opportunities', icon: <ProjectOutlined />, label: '商机管理' },
    user.role === 'admin' ? { key: '/analytics', icon: <BarChartOutlined />, label: '数据分析' } : null,
    user.role === 'admin' ? { key: '/logs', icon: <UnorderedListOutlined />, label: '操作日志' } : null,
    user.role === 'admin' ? { key: '/users', icon: <UserOutlined />, label: '用户管理' } : null,
  ].filter(Boolean) as MenuProps['items'];

  const userMenu: MenuProps['items'] = [
    { key: 'changePassword', icon: <KeyOutlined />, label: '修改密码' },
    { key: 'logout', icon: <LogoutOutlined />, label: '退出登录' },
  ];

  // 共享的菜单组件
  const renderMenu = (mode: 'inline' | 'vertical' = 'inline') => (
    <Menu
      mode={mode}
      selectedKeys={[location.pathname]}
      items={menuItems}
      onClick={({ key }) => { navigate(key); setDrawerOpen(false); }}
      style={{ borderRight: 0 }}
    />
  );

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* ===== 顶部导航栏 ===== */}
      <Header className="app-header" style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: '#001529', padding: isMobile ? '0 12px' : '0 24px',
        height: isMobile ? 48 : 64, lineHeight: isMobile ? '48px' : '64px',
        position: 'sticky', top: 0, zIndex: 100, width: '100%',
      }}>
        {/* 左侧：菜单按钮 + Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '0 0 auto' }}>
          {isMobile && (
            <Button type="text" icon={<MenuOutlined />} onClick={() => setDrawerOpen(true)}
              style={{ color: '#fff', fontSize: 20, padding: '0 4px' }} />
          )}
          {!isMobile && (
            <Button type="text" icon={<MenuFoldOutlined />} onClick={() => setSiderCollapsed(!siderCollapsed)}
              style={{ color: '#fff', fontSize: 18, padding: '0 4px' }} />
          )}
          <img src="/logo.png" alt="中睿" style={{
            height: isMobile ? 26 : 32,
            width: 'auto',
            display: 'inline-block',
            verticalAlign: 'middle',
          }} />
        </div>

        {/* 中间：系统标题（绝对定位居中） */}
        {!isMobile && (
          <span style={{
            position: 'absolute', left: '50%', transform: 'translateX(-50%)',
            color: '#fff', fontSize: 18, fontWeight: 600, whiteSpace: 'nowrap',
          }}>
            中睿智能商机管理系统
          </span>
        )}

        {/* 右侧：用户信息 */}
        <Dropdown menu={{ items: userMenu, onClick: ({ key }) => {
          if (key === 'logout') handleLogout();
          if (key === 'changePassword') setPwdModalVisible(true);
        }}} placement="bottomRight">
          <div style={{ color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#1677ff' }} size={isMobile ? 'small' : 'default'} />
            {isMobile ? (
              <span style={{ fontSize: 13 }}>{user.name}</span>
            ) : (
              <span>{user.name}（{user.role === 'admin' ? '管理员' : '销售'}）</span>
            )}
          </div>
        </Dropdown>
      </Header>

      <Layout>
        {/* ===== 桌面端/平板端：侧边栏 ===== */}
        {!isMobile && (
          <Sider
            width={siderCollapsed ? 80 : 200}
            collapsible
            collapsed={siderCollapsed}
            trigger={null}
            breakpoint="lg"
            style={{ background: '#fff' }}
          >
            {renderMenu('inline')}
          </Sider>
        )}

        {/* ===== 移动端：抽屉菜单 ===== */}
        {isMobile && (
          <Drawer
            title="导航菜单"
            placement="left"
            width={260}
            open={drawerOpen}
            onClose={() => setDrawerOpen(false)}
            className="mobile-drawer"
            styles={{ body: { padding: 0 } }}
          >
            {renderMenu('vertical')}
          </Drawer>
        )}

        {/* ===== 内容区域 ===== */}
        <Layout className="app-layout-inner" style={{
          padding: isMobile ? '8px' : isTablet ? '12px 16px' : '16px 24px',
        }}>
          <Content className="app-layout-content" style={{
            background: '#f5f5f5',
            minHeight: 280,
            borderRadius: isMobile ? 8 : 0,
            padding: isMobile ? 8 : 0,
          }}>
            <Routes>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/opportunities" element={<OpportunityList />} />
              <Route path="/opportunities/:id" element={<OpportunityDetail />} />
              {user.role === 'admin' && <Route path="/analytics" element={<Analytics />} />}
              {user.role === 'admin' && <Route path="/users" element={<UserManage />} />}
              {user.role === 'admin' && <Route path="/logs" element={<OperationLogs />} />}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Content>
        </Layout>
      </Layout>

      {/* ===== 修改密码弹窗 ===== */}
      <Modal title="修改密码" open={pwdModalVisible}
        onCancel={() => { setPwdModalVisible(false); pwdForm.resetFields(); }}
        onOk={handleChangePassword} confirmLoading={pwdLoading} okText="确认修改" cancelText="取消"
        width={isMobile ? undefined : 450}>
        <Form form={pwdForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="oldPassword" label="旧密码" rules={[{ required: true, message: '请输入旧密码' }]}>
            <Input.Password placeholder="请输入当前密码" />
          </Form.Item>
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
    </Layout>
  );
}

export default App;
