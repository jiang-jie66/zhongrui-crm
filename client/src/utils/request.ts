import axios from 'axios';
import { message } from 'antd';
import type { ApiResponse } from '../types';

const request = axios.create({
  baseURL: (import.meta as any).env?.VITE_API_BASE || '/api',
  timeout: 10000,
});

// 请求拦截：自动携带 token
request.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers!.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 响应拦截：统一错误处理
request.interceptors.response.use(
  res => {
    const data = res.data as ApiResponse<any>;
    if (data.code !== 0) {
      message.error(data.message || '请求失败');
      if (data.code === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
      return Promise.reject(new Error(data.message));
    }
    return res;
  },
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
      message.error('登录已过期，请重新登录');
    } else {
      message.error(err.message || '网络错误');
    }
    return Promise.reject(err);
  }
);

export default request;
