import { Router, type Request, type Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

const JWT_SECRET = process.env.JWT_SECRET || 'zhongrui_crm_secret_key_2024';

// 扩展 Request 类型
declare global {
  namespace Express {
    interface Request {
      user?: { id: number; username: string; name: string; role: string };
    }
  }
}

// 生成 Token
export function generateToken(payload: { id: number; username: string; name: string; role: string }) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

// 验证中间件（所有已登录用户）
export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ code: 401, message: '未登录，请先登录' });
  }
  try {
    const decoded = jwt.verify(authHeader.slice(7), JWT_SECRET) as any;
    (req as any).user = decoded;
    next();
  } catch {
    return res.status(401).json({ code: 401, message: '登录已过期，请重新登录' });
  }
}

// 管理员及以上权限（副管理员 + 总管理员）
export function adminOnly(req: Request, res: Response, next: NextFunction) {
  const role = (req as any).user?.role;
  if (role !== 'super_admin' && role !== 'sub_admin' && role !== 'admin') {
    return res.status(403).json({ code: 403, message: '无权操作，仅管理员可访问' });
  }
  next();
}

// 仅总管理员权限
export function superAdminOnly(req: Request, res: Response, next: NextFunction) {
  const role = (req as any).user?.role;
  if (role !== 'super_admin' && role !== 'admin') {
    return res.status(403).json({ code: 403, message: '无权操作，仅总管理员可访问' });
  }
  next();
}
