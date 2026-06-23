import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

// 初始化默认管理员（副作用导入）
import './db/jsonDb.js';

import authRoutes from './routes/auth.js';
import opportunityRoutes from './routes/opportunities.js';
import analyticsRoutes from './routes/analytics.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// API 路由
app.use('/api/auth', authRoutes);
app.use('/api/opportunities', opportunityRoutes);
app.use('/api/analytics', analyticsRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: '中睿智能商机管理系统API正常运行' });
});

// 前端静态文件服务
const publicPath = path.join(__dirname, '../public');
app.use(express.static(publicPath));

// SPA 兜底：非 API、非静态文件请求都返回 index.html
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(publicPath, 'index.html'), (err) => {
    if (err) next();
  });
});

const LAN_IP = '192.168.49.67';

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 中睿智能商机管理系统已启动，端口: ${PORT}`);
  console.log(`🌐 本机访问: http://localhost:${PORT}`);
  console.log(`🌐 局域网访问: http://${LAN_IP}:${PORT}`);
});
