import { Router, type Request, type Response } from 'express';
import { authMiddleware, adminOnly } from '../middleware/auth.js';
import {
  getOpportunities, getFollowups, getUsers, getSubordinateIds,
} from '../db/jsonDb.js';
import dayjs from 'dayjs';

const router = Router();

// 辅助：按角色过滤可见商机
function filterByRole(ops: any[], user: any) {
  if (user.role === 'sales') {
    return ops.filter(o => o.sales_id === user.id);
  }
  if (user.role === 'sub_admin') {
    const visibleIds = [user.id, ...getSubordinateIds(user.id)];
    return ops.filter(o =>
      visibleIds.includes(o.created_by) ||
      (o.sales_id && visibleIds.includes(o.sales_id))
    );
  }
  return ops; // super_admin 看全部
}

// 工作台数据
router.get('/dashboard', authMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user;
  let ops = filterByRole(getOpportunities(), user);

  const total = ops.length;
  const pending = ops.filter(o => o.status === '待跟进').length;
  const success = ops.filter(o => o.status === '成单成功').length;
  const revenue = ops.filter(o => o.status === '成单成功').reduce((s, o) => s + o.deal_amount, 0);
  const rate = total > 0 ? Math.round(success / total * 10000) / 100 : 0;

  // 最近5条
  const recent = [...ops].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()).slice(0, 5);
  const users = getUsers();
  const recentWithNames = recent.map(o => ({
    ...o,
    sales_name: users.find(u => u.id === o.sales_id)?.name || '',
  }));

  res.json({ code: 0, data: { total, pending, success, revenue, rate, recent: recentWithNames } });
});

// 统计分析
router.get('/stats', authMiddleware, adminOnly, (req: Request, res: Response) => {
  const user = (req as any).user;
  const { period = 'month', salesId = '', industry = '', source = '' } = req.query as any;
  let ops = filterByRole(getOpportunities(), user);

  if (salesId) ops = ops.filter(o => o.sales_id === Number(salesId));
  if (industry) ops = ops.filter(o => o.industry === industry);
  if (source) ops = ops.filter(o => o.source === source);

  // 按时间维度统计
  const now = dayjs();
  const stats: any[] = [];
  const periods = period === 'month' ? 12 : period === 'quarter' ? 4 : 3;
  
  for (let i = periods - 1; i >= 0; i--) {
    let start: dayjs.Dayjs, end: dayjs.Dayjs, label: string;
    if (period === 'month') {
      start = now.subtract(i, 'month').startOf('month');
      end = now.subtract(i, 'month').endOf('month');
      label = start.format('YYYY-MM');
    } else if (period === 'quarter') {
      const q = Math.floor(now.month() / 3) - i;
      start = now.startOf('year').add(q * 3, 'month');
      end = start.add(3, 'month').subtract(1, 'day');
      label = `${start.year()}Q${Math.floor(start.month() / 3) + 1}`;
    } else {
      start = now.subtract(i, 'year').startOf('year');
      end = now.subtract(i, 'year').endOf('year');
      label = start.format('YYYY');
    }
    const periodOps = ops.filter(o => {
      const d = dayjs(o.created_at);
      return d.isAfter(start.subtract(1, 'day')) && d.isBefore(end.add(1, 'day'));
    });
    const periodSuccess = periodOps.filter(o => o.status === '成单成功').length;
    const periodRevenue = periodOps.filter(o => o.status === '成单成功').reduce((s, o) => s + o.deal_amount, 0);
    stats.push({
      label, total: periodOps.length, success: periodSuccess,
      rate: periodOps.length > 0 ? Math.round(periodSuccess / periodOps.length * 10000) / 100 : 0,
      revenue: periodRevenue,
    });
  }

  // 按销售统计（仅显示权限范围内的销售）
  let salesUsers = getUsers().filter(u => u.role === 'sales');
  if (user.role === 'sub_admin') {
    const subIds = getSubordinateIds(user.id);
    salesUsers = salesUsers.filter(u => subIds.includes(u.id));
  }
  const bySales = salesUsers.map(u => {
    const userOps = ops.filter(o => o.sales_id === u.id);
    const userSuccess = userOps.filter(o => o.status === '成单成功').length;
    return {
      name: u.name, total: userOps.length, success: userSuccess,
      rate: userOps.length > 0 ? Math.round(userSuccess / userOps.length * 10000) / 100 : 0,
      revenue: userOps.filter(o => o.status === '成单成功').reduce((s, o) => s + o.deal_amount, 0),
    };
  });

  // 按行业统计
  const industries = [...new Set(ops.map(o => o.industry).filter(Boolean))];
  const byIndustry = industries.map(ind => {
    const indOps = ops.filter(o => o.industry === ind);
    return { name: ind, total: indOps.length, success: indOps.filter(o => o.status === '成单成功').length };
  });

  // 按来源统计
  const sources = [...new Set(ops.map(o => o.source).filter(Boolean))];
  const bySource = sources.map(s => {
    const sOps = ops.filter(o => o.source === s);
    return { name: s, total: sOps.length, success: sOps.filter(o => o.status === '成单成功').length };
  });

  res.json({ code: 0, data: { stats, bySales, byIndustry, bySource } });
});

export default router;
