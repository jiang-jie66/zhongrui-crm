import { Router, type Request, type Response } from 'express';
import bcrypt from 'bcryptjs';
import { generateToken, authMiddleware, adminOnly, superAdminOnly } from '../middleware/auth.js';
import {
  findUserByUsername, createUser, findUserById, getUsers,
  updateUserPassword, deleteUserById, addOperationLog, getOperationLogs,
  getDirectSubordinates, getSubordinateIds, canManageUser,
  type User, type UserRole
} from '../db/jsonDb.js';

const router = Router();

// 密码规则校验：至少8位，包含字母和数字
function validatePassword(password: string): string | null {
  if (!password || password.length < 8) return '密码长度至少8位';
  if (!/[a-zA-Z]/.test(password)) return '密码必须包含字母';
  if (!/\d/.test(password)) return '密码必须包含数字';
  return null;
}

// 角色中文名
function roleLabel(role: UserRole | string): string {
  const map: Record<string, string> = {
    super_admin: '总管理员', admin: '总管理员',
    sub_admin: '副管理员', sales: '销售',
  };
  return map[role] || role;
}

// 注册用户（总管理员可创建副管理员，总/副管理员可创建销售）
router.post('/register', authMiddleware, adminOnly, (req: Request, res: Response) => {
  const operator = (req as any).user;
  const { username, password, name, phone, role } = req.body;
  if (!username || !password || !name) {
    return res.status(400).json({ code: 400, message: '用户名、密码和姓名不能为空' });
  }
  if (findUserByUsername(username)) {
    return res.status(400).json({ code: 400, message: '用户名已存在' });
  }

  const targetRole: UserRole = role || 'sales';

  // 只有总管理员可以创建副管理员
  if (targetRole === 'sub_admin' && operator.role !== 'super_admin' && operator.role !== 'admin') {
    return res.status(403).json({ code: 403, message: '仅总管理员可创建副管理员' });
  }

  // 创建时设置 parent_id，建立上下级关系
  const user = createUser({
    username,
    password: bcrypt.hashSync(password, 10),
    name,
    role: targetRole,
    parent_id: operator.id,
    phone,
  });

  addOperationLog({
    operator_id: operator.id,
    operator_name: operator.name,
    operator_role: operator.role,
    action: '创建用户',
    target_user_id: user.id,
    target_user_name: user.name,
    detail: `${roleLabel(operator.role)} ${operator.name} 创建了${roleLabel(targetRole)}账号 ${user.name}（${user.username}）`,
  });

  res.json({ code: 0, message: `${roleLabel(targetRole)}账号创建成功`, data: { id: user.id } });
});

// 登录
router.post('/login', (req: Request, res: Response) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ code: 400, message: '用户名和密码不能为空' });
  }
  const user = findUserByUsername(username);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ code: 401, message: '用户名或密码错误' });
  }
  const token = generateToken({
    id: user.id, username: user.username, name: user.name, role: user.role,
  });
  res.json({
    code: 0, message: '登录成功',
    data: { token, user: { id: user.id, username: user.username, name: user.name, role: user.role } },
  });
});

// 获取当前用户信息
router.get('/me', authMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user;
  res.json({ code: 0, data: user });
});

// 获取用户列表（含层级关系）
// 总管理员：看到所有人
// 副管理员：只看到自己的下属销售
router.get('/users', authMiddleware, adminOnly, (req: Request, res: Response) => {
  const operator = (req as any).user;
  let allUsers = getUsers();

  if (operator.role === 'super_admin' || operator.role === 'admin') {
    // 总管理员看到所有用户（除自己外）
    // allUsers = allUsers;
  } else if (operator.role === 'sub_admin') {
    // 副管理员只能看到自己 + 自己的下属
    const visibleIds = [operator.id, ...getSubordinateIds(operator.id)];
    allUsers = allUsers.filter(u => visibleIds.includes(u.id));
  }

  // 获取父级名称
  const parentMap = new Map<number, string>();
  for (const u of allUsers) {
    parentMap.set(u.id, u.name);
  }

  const result = allUsers.map(u => ({
    id: u.id,
    username: u.username,
    name: u.name,
    role: u.role,
    phone: u.phone || '',
    parent_id: u.parent_id,
    parent_name: u.parent_id ? (parentMap.get(u.parent_id) || '') : '',
    created_at: u.created_at,
  }));

  res.json({ code: 0, data: result });
});

// 获取销售列表（用于下拉选择，副管理员只能选自己的下属）
router.get('/sales', authMiddleware, adminOnly, (req: Request, res: Response) => {
  const operator = (req as any).user;
  let sales = getUsers().filter(u => u.role === 'sales');

  if (operator.role === 'sub_admin') {
    // 副管理员只能看到自己的下属销售
    sales = getDirectSubordinates(operator.id).filter(u => u.role === 'sales');
  }

  const result = sales.map(u => ({
    id: u.id, username: u.username, name: u.name, phone: u.phone || ''
  }));
  res.json({ code: 0, data: result });
});

// 获取副管理员列表（仅总管理员用）
router.get('/sub-admins', authMiddleware, superAdminOnly, (req: Request, res: Response) => {
  const subAdmins = getUsers().filter(u => u.role === 'sub_admin').map(u => ({
    id: u.id, username: u.username, name: u.name, phone: u.phone || '',
    subordinateCount: getDirectSubordinates(u.id).filter(s => s.role === 'sales').length,
  }));
  res.json({ code: 0, data: subAdmins });
});

// 删除用户
router.delete('/:id', authMiddleware, adminOnly, (req: Request, res: Response) => {
  const operator = (req as any).user;
  const targetId = parseInt(req.params.id);

  if (targetId === operator.id) {
    return res.status(400).json({ code: 400, message: '不能删除自己的账号' });
  }

  const targetUser = findUserById(targetId);
  if (!targetUser) {
    return res.status(404).json({ code: 404, message: '目标用户不存在' });
  }

  // 检查权限
  if (!canManageUser(operator.id, operator.role as UserRole, targetId)) {
    return res.status(403).json({ code: 403, message: '无权删除该用户' });
  }

  // 不可删除总管理员
  if (targetUser.role === 'super_admin' || (targetUser.role as string) === 'admin') {
    return res.status(400).json({ code: 400, message: '不能删除总管理员账号' });
  }

  // 只有总管理员可以删除副管理员
  if (targetUser.role === 'sub_admin' && operator.role !== 'super_admin' && operator.role !== 'admin') {
    return res.status(400).json({ code: 400, message: '仅总管理员可删除副管理员' });
  }

  deleteUserById(targetId);

  addOperationLog({
    operator_id: operator.id,
    operator_name: operator.name,
    operator_role: operator.role,
    action: '删除用户',
    target_user_id: targetId,
    target_user_name: targetUser.name,
    detail: `${roleLabel(operator.role)} ${operator.name} 删除了${roleLabel(targetUser.role)}账号 ${targetUser.name}（${targetUser.username}）`,
  });

  res.json({ code: 0, message: `已成功删除${roleLabel(targetUser.role)}账号 ${targetUser.name}` });
});

// 修改自己的密码（需验证旧密码）
router.post('/change-password', authMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user;
  const { oldPassword, newPassword } = req.body;
  if (!oldPassword || !newPassword) {
    return res.status(400).json({ code: 400, message: '旧密码和新密码不能为空' });
  }
  const pwdError = validatePassword(newPassword);
  if (pwdError) {
    return res.status(400).json({ code: 400, message: pwdError });
  }
  const dbUser = findUserById(user.id);
  if (!dbUser) {
    return res.status(404).json({ code: 404, message: '用户不存在' });
  }
  if (!bcrypt.compareSync(oldPassword, dbUser.password)) {
    return res.status(400).json({ code: 400, message: '旧密码不正确' });
  }
  updateUserPassword(user.id, newPassword);
  addOperationLog({
    operator_id: user.id,
    operator_name: user.name,
    operator_role: user.role,
    action: '修改自己的密码',
    target_user_id: user.id,
    target_user_name: user.name,
    detail: `${roleLabel(user.role)} ${user.name} 修改了自己的登录密码`,
  });
  res.json({ code: 0, message: '密码修改成功' });
});

// 管理员重置指定用户的密码（无需旧密码）
router.post('/reset-password/:id', authMiddleware, adminOnly, (req: Request, res: Response) => {
  const operator = (req as any).user;
  const targetId = parseInt(req.params.id);
  const { newPassword } = req.body;
  if (!newPassword) {
    return res.status(400).json({ code: 400, message: '新密码不能为空' });
  }
  const pwdError = validatePassword(newPassword);
  if (pwdError) {
    return res.status(400).json({ code: 400, message: pwdError });
  }
  const targetUser = findUserById(targetId);
  if (!targetUser) {
    return res.status(404).json({ code: 404, message: '目标用户不存在' });
  }

  // 权限检查
  if (!canManageUser(operator.id, operator.role as UserRole, targetId)) {
    return res.status(403).json({ code: 403, message: '无权重置该用户密码' });
  }

  updateUserPassword(targetId, newPassword);
  addOperationLog({
    operator_id: operator.id,
    operator_name: operator.name,
    operator_role: operator.role,
    action: '重置用户密码',
    target_user_id: targetId,
    target_user_name: targetUser.name,
    detail: `${roleLabel(operator.role)} ${operator.name} 重置了${roleLabel(targetUser.role)} ${targetUser.name} 的密码`,
  });
  res.json({ code: 0, message: `已成功重置 ${targetUser.name} 的密码` });
});

// 获取操作日志
router.get('/logs', authMiddleware, adminOnly, (req: Request, res: Response) => {
  const operator = (req as any).user;
  const { page = '1', page_size = '20' } = req.query as any;
  let allLogs = getOperationLogs().reverse();

  // 副管理员只能看自己和自己下属的操作日志
  if (operator.role === 'sub_admin') {
    const visibleIds = [operator.id, ...getSubordinateIds(operator.id)];
    allLogs = allLogs.filter(l => visibleIds.includes(l.operator_id));
  }

  const p = parseInt(page);
  const size = parseInt(page_size);
  const start = (p - 1) * size;
  const pageData = allLogs.slice(start, start + size);
  res.json({
    code: 0,
    data: {
      list: pageData,
      total: allLogs.length,
      page: p,
      page_size: size,
    },
  });
});

export default router;
