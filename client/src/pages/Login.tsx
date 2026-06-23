import React, { useState } from 'react';
import { Form, Input, Button, Card, message, Typography, Grid } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import request from '../utils/request';
import type { User } from '../types';

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

interface LoginProps {
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const screens = useBreakpoint();
  const isMobile = !screens.sm;

  const handleLogin = async (values: { username: string; password: string }) => {
    setLoading(true);
    try {
      const res: any = await request.post('/auth/login', values);
      const { token, user } = res.data.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      onLogin(user);
      message.success('登录成功');
      navigate('/dashboard');
    } finally { setLoading(false); }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: isMobile ? 16 : 24,
    }}>
      <Card style={{
        width: '100%',
        maxWidth: 420,
        borderRadius: 12,
        boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
      }}
      bodyStyle={{ padding: isMobile ? 20 : 32 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <img src="/logo-color.png" alt="中睿智能" style={{
            width: isMobile ? 64 : 80,
            height: 'auto',
            margin: '0 auto 16px',
            display: 'block',
          }} />
          <Title level={isMobile ? 4 : 3} style={{ marginBottom: 4 }}>
            中睿智能商机管理系统
          </Title>
          <Text type="secondary" style={{ fontSize: isMobile ? 13 : 14 }}>
            请登录您的账号
          </Text>
        </div>
        <Form onFinish={handleLogin} size="large">
          <Form.Item name="username" rules={[{ required: true, message: '请输入用户名' }]}>
            <Input prefix={<UserOutlined />} placeholder="用户名" autoComplete="username" />
          </Form.Item>
          <Form.Item name="password" rules={[{ required: true, message: '请输入密码' }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="密码" autoComplete="current-password" />
          </Form.Item>
          <Form.Item style={{ marginBottom: 16 }}>
            <Button type="primary" htmlType="submit" loading={loading} block
              style={{ height: isMobile ? 44 : 48, borderRadius: 8, fontSize: isMobile ? 15 : 16 }}>
              登 录
            </Button>
          </Form.Item>
        </Form>
        <div style={{ textAlign: 'center', color: '#1677ff', fontSize: 14, fontWeight: 500, letterSpacing: 2 }}>
          升级中国智造！
        </div>
      </Card>
    </div>
  );
};

export default Login;
