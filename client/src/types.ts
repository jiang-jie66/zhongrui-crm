export interface User {
  id: number;
  username: string;
  name: string;
  role: 'admin' | 'sales';
  phone?: string;
}

export interface Opportunity {
  id: number;
  company_name: string;
  contact_name: string;
  contact_phone: string;
  industry?: string;
  source?: string;
  sales_id?: number;
  sales_name?: string;
  status: string;
  deal_amount: number;
  remark?: string;
  creator_name?: string;
  created_by: number;
  created_at: string;
  updated_at: string;
  followups?: Followup[];
}

export interface Followup {
  id: number;
  opportunity_id: number;
  followup_time: string;
  content: string;
  status?: string;
  created_by: number;
  creator_name?: string;
  created_at: string;
}

export interface PageData<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

export interface DashboardData {
  total: number;
  pending: number;
  success: number;
  revenue: number;
  rate: number;
  recent: Opportunity[];
}

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
