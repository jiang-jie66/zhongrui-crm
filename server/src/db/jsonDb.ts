import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../../data');

// 确保数据目录存在
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const USERS_FILE = path.join(DATA_DIR, 'users.json');
const OPS_FILE = path.join(DATA_DIR, 'opportunities.json');
const FOLLOWUPS_FILE = path.join(DATA_DIR, 'followups.json');
const LOGS_FILE = path.join(DATA_DIR, 'operation_logs.json');

// 读取 JSON 文件
function readJson<T>(file: string, defaultVal: T[]): T[] {
  if (!fs.existsSync(file)) return defaultVal;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8')) as T[];
  } catch {
    return defaultVal;
  }
}

// 写入 JSON 文件
function writeJson<T>(file: string, data: T[]) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8');
}

// ============ 用户操作 ============
// 三级角色：super_admin(总管理员) > sub_admin(副管理员) > sales(销售)
export type UserRole = 'super_admin' | 'sub_admin' | 'sales';

export interface User {
  id: number;
  username: string;
  password: string;
  name: string;
  role: UserRole;
  parent_id: number | null;  // 上级用户ID（副管理员的上级是总管理员，销售的上级是副管理员）
  phone?: string;
  created_at: string;
}

export function getUsers(): User[] {
  return readJson<User>(USERS_FILE, []);
}

export function saveUsers(users: User[]) {
  writeJson(USERS_FILE, users);
}

export function findUserByUsername(username: string): User | undefined {
  return getUsers().find(u => u.username === username);
}

export function findUserById(id: number): User | undefined {
  return getUsers().find(u => u.id === id);
}

export function createUser(user: Omit<User, 'id' | 'created_at'>): User {
  const users = getUsers();
  const newUser: User = {
    ...user,
    id: users.length > 0 ? Math.max(...users.map(u => u.id)) + 1 : 1,
    created_at: new Date().toISOString(),
  };
  users.push(newUser);
  saveUsers(users);
  return newUser;
}

// 获取某用户的下属ID列表（递归，含所有下级）
export function getSubordinateIds(userId: number): number[] {
  const users = getUsers();
  const result: number[] = [];
  const directSubs = users.filter(u => u.parent_id === userId).map(u => u.id);
  result.push(...directSubs);
  for (const subId of directSubs) {
    result.push(...getSubordinateIds(subId));
  }
  return result;
}

// 获取某用户的直属下属用户列表
export function getDirectSubordinates(userId: number): User[] {
  return getUsers().filter(u => u.parent_id === userId);
}

// 获取某用户可见的所有用户（自己 + 所有下级）
export function getVisibleUserIds(userId: number, role: UserRole): number[] {
  if (role === 'super_admin') {
    return getUsers().map(u => u.id);
  }
  if (role === 'sub_admin') {
    return [userId, ...getSubordinateIds(userId)];
  }
  // sales 只能看到自己
  return [userId];
}

// 检查操作者是否有权限管理目标用户
export function canManageUser(operatorId: number, operatorRole: UserRole, targetId: number): boolean {
  if (operatorRole === 'super_admin') return true;
  if (operatorRole === 'sub_admin') {
    const target = findUserById(targetId);
    if (!target) return false;
    // 副管理员只能管理自己的下属销售
    return target.parent_id === operatorId && target.role === 'sales';
  }
  return false;
}

// 初始化默认总管理员
export function initDefaultAdmin() {
  const users = getUsers();
  if (!users.find(u => u.username === 'admin')) {
    const hash = bcrypt.hashSync('admin123', 10);
    users.push({
      id: 1,
      username: 'admin',
      password: hash,
      name: '总管理员',
      role: 'super_admin',
      parent_id: null,
      created_at: new Date().toISOString(),
    });
    saveUsers(users);
    console.log('✅ 默认总管理员账号已创建: admin / admin123');
  } else {
    // 迁移旧数据：如果存在旧 admin 角色，升级为 super_admin
    let migrated = false;
    for (const u of users) {
      if ((u.role as string) === 'admin') {
        u.role = 'super_admin';
        if (u.parent_id === undefined) u.parent_id = null;
        migrated = true;
      }
    }
    if (migrated) {
      saveUsers(users);
      console.log('✅ 已将旧管理员角色迁移为 super_admin');
    }
  }
}

// 删除用户
export function deleteUserById(userId: number): boolean {
  const users = getUsers();
  const idx = users.findIndex(u => u.id === userId);
  if (idx === -1) return false;
  // 如果有下属，将其 parent_id 置空
  const subordinates = users.filter(u => u.parent_id === userId);
  for (const sub of subordinates) {
    sub.parent_id = null;
  }
  users.splice(idx, 1);
  saveUsers(users);

  // 将该用户的商机 sales_id 置空
  const ops = getOpportunities();
  let changed = false;
  for (const o of ops) {
    if (o.sales_id === userId) {
      o.sales_id = null;
      o.updated_at = new Date().toISOString();
      changed = true;
    }
  }
  if (changed) saveOpportunities(ops);

  return true;
}

// 更新用户密码
export function updateUserPassword(userId: number, newPassword: string): boolean {
  const users = getUsers();
  const idx = users.findIndex(u => u.id === userId);
  if (idx === -1) return false;
  users[idx].password = bcrypt.hashSync(newPassword, 10);
  saveUsers(users);
  return true;
}

// ============ 操作日志 ============
export interface OperationLog {
  id: number;
  operator_id: number;
  operator_name: string;
  operator_role: string;
  action: string;
  target_user_id?: number;
  target_user_name?: string;
  detail?: string;
  created_at: string;
}

export function getOperationLogs(): OperationLog[] {
  return readJson<OperationLog>(LOGS_FILE, []);
}

export function saveOperationLogs(logs: OperationLog[]) {
  writeJson(LOGS_FILE, logs);
}

export function addOperationLog(log: Omit<OperationLog, 'id' | 'created_at'>): OperationLog {
  const logs = getOperationLogs();
  const newLog: OperationLog = {
    ...log,
    id: logs.length > 0 ? Math.max(...logs.map(l => l.id)) + 1 : 1,
    created_at: new Date().toISOString(),
  };
  logs.push(newLog);
  saveOperationLogs(logs);
  return newLog;
}

// ============ 商机操作 ============
export interface Opportunity {
  id: number;
  company_name: string;
  contact_name: string;
  contact_phone: string;
  industry?: string;
  source?: string;
  sales_id?: number | null;
  status: string;
  deal_amount: number;
  remark?: string;
  created_by: number;
  created_at: string;
  updated_at: string;
}

export function getOpportunities(): Opportunity[] {
  return readJson<Opportunity>(OPS_FILE, []);
}

export function saveOpportunities(ops: Opportunity[]) {
  writeJson(OPS_FILE, ops);
}

export function findOpportunityById(id: number): Opportunity | undefined {
  return getOpportunities().find(o => o.id === id);
}

export function createOpportunity(data: Omit<Opportunity, 'id' | 'created_at' | 'updated_at'>): Opportunity {
  const ops = getOpportunities();
  const now = new Date().toISOString();
  const newOp: Opportunity = {
    ...data,
    id: ops.length > 0 ? Math.max(...ops.map(o => o.id)) + 1 : 1,
    created_at: now,
    updated_at: now,
  };
  ops.push(newOp);
  saveOpportunities(ops);
  return newOp;
}

export function updateOpportunity(id: number, data: Partial<Opportunity>): Opportunity | null {
  const ops = getOpportunities();
  const idx = ops.findIndex(o => o.id === id);
  if (idx === -1) return null;
  ops[idx] = { ...ops[idx], ...data, updated_at: new Date().toISOString() };
  saveOpportunities(ops);
  return ops[idx];
}

// ============ 跟进记录操作 ============
export interface Followup {
  id: number;
  opportunity_id: number;
  followup_time: string;
  content: string;
  status?: string;
  created_by: number;
  created_at: string;
}

export function getFollowups(): Followup[] {
  return readJson<Followup>(FOLLOWUPS_FILE, []);
}

export function saveFollowups(followups: Followup[]) {
  writeJson(FOLLOWUPS_FILE, followups);
}

export function findFollowupsByOpportunityId(oppId: number): Followup[] {
  return getFollowups().filter(f => f.opportunity_id === oppId);
}

export function createFollowup(data: Omit<Followup, 'id' | 'created_at'>): Followup {
  const followups = getFollowups();
  const newF: Followup = {
    ...data,
    id: followups.length > 0 ? Math.max(...followups.map(f => f.id)) + 1 : 1,
    created_at: new Date().toISOString(),
  };
  followups.push(newF);
  saveFollowups(followups);
  return newF;
}

// 初始化
initDefaultAdmin();
