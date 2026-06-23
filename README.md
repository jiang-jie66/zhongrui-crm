# 中睿智能商机管理系统

基于 Web 的商机管理 CRM 系统，供市场部记录商机并分配给销售跟进。

## 功能特性

- 🔐 用户认证与权限：管理员 / 销售双角色，销售仅看自己的商机
- 📋 商机管理：创建、编辑、分配、跟进记录、成单标记
- 📊 数据分析：按时间/销售/行业/来源多维统计，图表展示
- 📱 响应式设计：适配 PC 端操作

## 技术栈

**后端：** Node.js + Express + TypeScript + better-sqlite3 + JWT
**前端：** React + TypeScript + Ant Design + Recharts + Vite

## 快速启动

### 1. 安装后端依赖

```bash
cd server
npm install
```

> 如 `better-sqlite3` 安装失败（需要编译工具），可改用 `sql.js`（纯 JS SQLite）：
> `npm install sql.js` 并修改 `src/db/init.ts`

### 2. 安装前端依赖

```bash
cd client
npm install
```

### 3. 启动后端服务

```bash
cd server
npm run dev
```

后端运行在 `http://localhost:3001`

### 4. 启动前端

```bash
cd client
npm run dev
```

前端运行在 `http://localhost:3000`

### 5. 登录系统

默认管理员账号：
- 用户名：`admin`
- 密码：`admin123`

登录后可在「用户管理」中创建销售账号。

## 目录结构

```
├── server/          # 后端服务
│   ├── src/
│   │   ├── db/      # 数据库初始化
│   │   ├── middleware/  # 认证中间件
│   │   └── routes/     # API 路由
│   └── crm.db       # SQLite 数据库（自动创建）
├── client/          # 前端应用
│   ├── src/
│   │   ├── pages/   # 页面组件
│   │   ├── components/
│   │   ├── utils/   # 请求封装
│   │   └── types/   # TypeScript 类型
│   └── dist/        # 构建产物
```

## API 接口

| 接口 | 方法 | 说明 | 权限 |
|------|------|------|------|
| `/api/auth/login` | POST | 登录 | 公开 |
| `/api/auth/register` | POST | 创建销售账号 | 管理员 |
| `/api/auth/sales` | GET | 获取销售列表 | 管理员 |
| `/api/opportunities` | GET | 商机列表 | 登录用户 |
| `/api/opportunities` | POST | 创建商机 | 管理员 |
| `/api/opportunities/:id` | PUT | 更新商机 | 管理员/负责人 |
| `/api/opportunities/:id/followups` | POST | 添加跟进记录 | 登录用户 |
| `/api/analytics/dashboard` | GET | 工作台数据 | 登录用户 |
| `/api/analytics/stats` | GET | 统计分析 | 管理员 |
