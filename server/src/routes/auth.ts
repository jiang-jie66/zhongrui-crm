import { Router, type Request, type Response } from 'express';
import bcrypt from 'bcryptjs';
import { generateToken, authMiddleware, adminOnly } from '../middleware/auth.js';
import {
  findUserByUsername, createUser, findUserById, getUsers,
  updateUserPassword, addOperationLog, getOperationLogs, type User
} from '../db/jsonDb.js';

const router = Router();

// 密码规则校验：至少8位，包含字母和数字
function validatePassword(password: string): string | null {
  if (!password || password.length < 8) return '密码长度至少8位';
  if (!/[a-zA-Z]/.test(password)) return '密码必须包含字母';
  if (!/\d/.test(password)) return '密码必须包含数字';
  return null;
}

// 注册（仅管理员可创建销售账号）
router.post('/register', authMiddleware, adminOnly, (req: Request, res: Response) => {
  const { username, password, name, phone } = req.body;
  if (!username || !password || !name) {
    return res.status(400).json({ code: 400, message: '用户名、密码和姓名不能为空' });
  }
  if (findUserByUsername(username)) {
    return res.status(400).json({ code: 400, message: '用户名已存在' });
  }
  const user = createUser({ username, password: bcrypt.hashSync(password, 10), name, role: 'sales', phone });
  res.json({ code: 0, message: '创建成功', data: { id: user.id } });
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

// 获取销售列表（管理员用）
router.get('/sales', authMiddleware, adminOnly, (req: Request, res: Response) => {
  const sales = getUsers().filter(u => u.role === 'sales').map(u => ({
    id: u.id, username: u.username, name: u.name, phone: u.phone || ''
  }));
  res.json({ code: 0, data: sales });
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
    detail: `用户 ${user.name} 修改了自己的登录密码`,
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
  updateUserPassword(targetId, newPassword);
  addOperationLog({
    operator_id: operator.id,
    operator_name: operator.name,
    operator_role: operator.role,
    action: '重置用户密码',
    target_user_id: targetId,
    target_user_name: targetUser.name,
    detail: `管理员 ${operator.name} 重置了用户 ${targetUser.name} 的密码`,
  });
  res.json({ code: 0, message: `已成功重置 ${targetUser.name} 的密码` });
});

// 获取操作日志（仅管理员）
router.get('/logs', authMiddleware, adminOnly, (req: Request, res: Response) => {
  const { page = '1', page_size = '20' } = req.query as any;
  const allLogs = getOperationLogs().reverse(); // 最新的在前
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
