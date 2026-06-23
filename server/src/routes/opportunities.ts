import { Router, type Request, type Response } from 'express';
import { authMiddleware, adminOnly } from '../middleware/auth.js';
import {
  getOpportunities, findOpportunityById, createOpportunity, updateOpportunity,
  getFollowups, findFollowupsByOpportunityId, createFollowup,
  findUserById, getUsers, getVisibleUserIds, getDirectSubordinates, getSubordinateIds,
} from '../db/jsonDb.js';
import dayjs from 'dayjs';

const router = Router();

// 获取商机列表（分页、搜索、筛选）
router.get('/', authMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user;
  const { keyword = '', status = '', source = '', salesId = '', industry = '', page = '1', pageSize = '10' } = req.query as any;
  let list = getOpportunities();

  // 数据隔离：按角色过滤可见商机
  if (user.role === 'sales') {
    // 销售只能看分配给自己的商机
    list = list.filter(o => o.sales_id === user.id);
  } else if (user.role === 'sub_admin') {
    // 副管理员可以看到自己 + 下属销售创建的商机，以及分配给下属销售的商机
    const visibleIds = [user.id, ...getSubordinateIds(user.id)];
    list = list.filter(o =>
      visibleIds.includes(o.created_by) ||
      (o.sales_id && visibleIds.includes(o.sales_id))
    );
  }
  // super_admin 看全部

  if (keyword) {
    const kw = keyword.toLowerCase();
    list = list.filter(o =>
      o.company_name.toLowerCase().includes(kw) ||
      o.contact_name.toLowerCase().includes(kw) ||
      o.contact_phone.includes(kw)
    );
  }
  if (status) list = list.filter(o => o.status === status);
  if (source) list = list.filter(o => o.source === source);

  // salesId 筛选
  if (salesId) {
    const sid = Number(salesId);
    if (user.role === 'super_admin' || user.role === 'admin') {
      list = list.filter(o => o.sales_id === sid);
    } else if (user.role === 'sub_admin') {
      // 副管理员只能筛选自己的下属
      const subIds = getSubordinateIds(user.id);
      if (subIds.includes(sid) || sid === user.id) {
        list = list.filter(o => o.sales_id === sid);
      }
    }
  }

  if (industry) list = list.filter(o => o.industry === industry);

  // 关联销售姓名
  const users = getUsers();
  list = list.map(o => ({
    ...o,
    sales_name: users.find(u => u.id === o.sales_id)?.name || '',
    creator_name: users.find(u => u.id === o.created_by)?.name || '',
  }));

  // 按更新时间倒序
  list.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

  const p = Math.max(1, parseInt(page));
  const size = Math.min(100, Math.max(1, parseInt(pageSize)));
  const total = list.length;
  const paged = list.slice((p - 1) * size, p * size);

  res.json({ code: 0, data: { list: paged, total, page: p, pageSize: size } });
});

// 获取单个商机详情
router.get('/:id', authMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user;
  const id = Number(req.params.id);
  const opp = findOpportunityById(id);
  if (!opp) return res.status(404).json({ code: 404, message: '商机不存在' });

  // 权限检查
  const visibleIds = getVisibleUserIds(user.id, user.role as any);
  const canView = user.role === 'super_admin' || user.role === 'admin' ||
    (opp.sales_id && visibleIds.includes(opp.sales_id)) ||
    visibleIds.includes(opp.created_by);
  if (!canView) {
    return res.status(403).json({ code: 403, message: '无权查看此商机' });
  }

  const followups = findFollowupsByOpportunityId(id).sort(
    (a, b) => new Date(b.followup_time).getTime() - new Date(a.followup_time).getTime()
  );
  const users = getUsers();
  res.json({
    code: 0, data: {
      ...opp, sales_name: users.find(u => u.id === opp.sales_id)?.name || '',
      creator_name: users.find(u => u.id === opp.created_by)?.name || '',
      followups: followups.map(f => ({ ...f, creator_name: users.find(u => u.id === f.created_by)?.name || '' })),
    }
  });
});

// 创建商机（管理员及以上）
router.post('/', authMiddleware, adminOnly, (req: Request, res: Response) => {
  const { company_name, contact_name, contact_phone, industry, source, sales_id, remark } = req.body;
  if (!company_name || !contact_name || !contact_phone) {
    return res.status(400).json({ code: 400, message: '公司名称、联系人姓名和联系电话为必填项' });
  }
  const user = (req as any).user;

  // 副管理员只能分配给自己的下属
  let finalSalesId = sales_id ? Number(sales_id) : null;
  if (user.role === 'sub_admin' && finalSalesId) {
    const subIds = getSubordinateIds(user.id);
    if (!subIds.includes(finalSalesId)) {
      return res.status(403).json({ code: 403, message: '只能将商机分配给您的下属销售' });
    }
  }

  const opp = createOpportunity({
    company_name, contact_name, contact_phone,
    industry: industry || '', source: source || '',
    sales_id: finalSalesId,
    status: '待跟进', deal_amount: 0, remark: remark || '',
    created_by: user.id,
  });
  res.json({ code: 0, message: '创建成功', data: { id: opp.id } });
});

// 更新商机
router.put('/:id', authMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user;
  const id = Number(req.params.id);
  const opp = findOpportunityById(id);
  if (!opp) return res.status(404).json({ code: 404, message: '商机不存在' });

  // 权限判断
  const visibleIds = getVisibleUserIds(user.id, user.role as any);
  const canEdit = user.role === 'super_admin' || user.role === 'admin' ||
    (opp.sales_id && visibleIds.includes(opp.sales_id)) ||
    visibleIds.includes(opp.created_by);
  if (!canEdit) {
    return res.status(403).json({ code: 403, message: '无权修改此商机' });
  }

  const { company_name, contact_name, contact_phone, industry, source, sales_id, status, deal_amount, remark } = req.body;
  const data: any = {};

  // 管理员可修改基本信息
  const isAdmin = user.role === 'super_admin' || user.role === 'sub_admin' || user.role === 'admin';
  if (isAdmin) {
    if (company_name !== undefined) data.company_name = company_name;
    if (contact_name !== undefined) data.contact_name = contact_name;
    if (contact_phone !== undefined) data.contact_phone = contact_phone;
    if (industry !== undefined) data.industry = industry;
    if (source !== undefined) data.source = source;
    if (deal_amount !== undefined) data.deal_amount = Number(deal_amount) || 0;
  }

  // 销售分配：副管理员只能分配给自己的下属
  if (sales_id !== undefined && isAdmin) {
    const newSalesId = sales_id ? Number(sales_id) : null;
    if (user.role === 'sub_admin' && newSalesId) {
      const subIds = getSubordinateIds(user.id);
      if (!subIds.includes(newSalesId)) {
        return res.status(403).json({ code: 403, message: '只能将商机分配给您的下属销售' });
      }
    }
    data.sales_id = newSalesId;
  }

  // 状态更新：销售和管理员都可以
  if (status !== undefined) data.status = status;

  const result = updateOpportunity(id, data);
  res.json({ code: 0, message: '更新成功' });
});

// 添加跟进记录
router.post('/:id/followups', authMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user;
  const id = Number(req.params.id);
  const opp = findOpportunityById(id);
  if (!opp) return res.status(404).json({ code: 404, message: '商机不存在' });

  const visibleIds = getVisibleUserIds(user.id, user.role as any);
  const canAccess = user.role === 'super_admin' || user.role === 'admin' ||
    (opp.sales_id && visibleIds.includes(opp.sales_id)) ||
    visibleIds.includes(opp.created_by);
  if (!canAccess) {
    return res.status(403).json({ code: 403, message: '无权操作此商机' });
  }

  const { followup_time, content, status } = req.body;
  if (!followup_time || !content) {
    return res.status(400).json({ code: 400, message: '跟进时间和内容为必填项' });
  }
  createFollowup({ opportunity_id: id, followup_time, content, status: status || '', created_by: user.id });
  // 同步更新商机状态
  if (status) updateOpportunity(id, { status });
  res.json({ code: 0, message: '跟进记录已添加' });
});

// 获取筛选选项
router.get('/meta/options', authMiddleware, (req: Request, res: Response) => {
  const ops = getOpportunities();
  const industries = [...new Set(ops.map(o => o.industry).filter(Boolean))] as string[];
  const sources = [...new Set(ops.map(o => o.source).filter(Boolean))] as string[];
  res.json({ code: 0, data: { industries, sources, statuses: ['待跟进','跟进中','意向高','已报价','成单成功','成单失败'] } });
});

export default router;
