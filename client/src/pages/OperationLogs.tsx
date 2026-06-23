import React, { useEffect, useState } from 'react';
import { Table, Tag, Space, Button } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import request from '../utils/request';
import type { OperationLog } from '../types';

const OperationLogs: React.FC = () => {
  const [logs, setLogs] = useState<OperationLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);

  const fetchLogs = async (p = 1) => {
    setLoading(true);
    try {
      const res: any = await request.get('/auth/logs', {
        params: { page: p, page_size: pageSize },
      });
      setLogs(res.data.data.list);
      setTotal(res.data.data.total);
      setPage(p);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLogs(1); }, []);

  const actionColors: Record<string, string> = {
    '修改自己的密码': 'orange',
    '重置用户密码': 'red',
  };

  const columns = [
    {
      title: '操作时间', dataIndex: 'created_at', key: 'created_at',
      render: (v: string) => v ? new Date(v).toLocaleString('zh-CN') : '-',
      width: 180,
    },
    { title: '操作者', dataIndex: 'operator_name', key: 'operator_name', width: 100 },
    {
      title: '操作者角色', dataIndex: 'operator_role', key: 'operator_role', width: 100,
      render: (v: string) => <Tag color={v === 'admin' ? 'red' : 'blue'}>{v === 'admin' ? '管理员' : '销售'}</Tag>,
    },
    {
      title: '操作类型', dataIndex: 'action', key: 'action', width: 130,
      render: (v: string) => <Tag color={actionColors[v] || 'default'}>{v}</Tag>,
    },
    { title: '目标用户', dataIndex: 'target_user_name', key: 'target_user_name', width: 100 },
    { title: '详细描述', dataIndex: 'detail', key: 'detail' },
  ];

  return (
    <div>
      <h2 style={{ marginBottom: 24 }}>操作日志</h2>
      <p style={{ color: '#999', marginBottom: 16 }}>记录所有密码修改操作，便于审计追溯。</p>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ReloadOutlined />} onClick={() => fetchLogs(1)}>刷新</Button>
      </Space>
      <Table
        rowKey="id" columns={columns} dataSource={logs} loading={loading}
        pagination={{
          current: page, pageSize, total, showSizeChanger: false,
          onChange: (p) => fetchLogs(p),
        }}
      />
    </div>
  );
};

export default OperationLogs;
