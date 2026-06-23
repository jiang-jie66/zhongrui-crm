export interface User {
  id: number;
  username: string;
  name: string;
  role: 'admin' | 'sales';
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
  created_by: number;
  creator_name?: string;
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

export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

export interface PageData<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface DashboardData {
  total: number;
  pending: number;
  success: number;
  revenue: number;
  rate: number;
  recent: Opportunity[];
}

export interface AnalyticsData {
  trend: Array<{ period: string; total: number; success: number; failed: number; revenue: number; rate: number }>;
  bySales: Array<{ sales_name: string; total: number; success: number; revenue: number; rate: number }>;
  byIndustry: Array<{ industry: string; total: number; success: number; rate: number }>;
  bySource: Array<{ source: string; total: number; success: number; rate: number }>;
}
