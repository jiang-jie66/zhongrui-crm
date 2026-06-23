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
export interface User {
  id: number;
  username: string;
  password: string;
  name: string;
  role: 'admin' | 'sales';
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

// 初始化默认管理员
export function initDefaultAdmin() {
  const users = getUsers();
  if (!users.find(u => u.username === 'admin')) {
    const hash = bcrypt.hashSync('admin123', 10);
    users.push({
      id: 1,
      username: 'admin',
      password: hash,
      name: '系统管理员',
      role: 'admin',
      created_at: new Date().toISOString(),
    });
    saveUsers(users);
    console.log('✅ 默认管理员账号已创建: admin / admin123');
  }
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
