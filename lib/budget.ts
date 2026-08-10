// ── AharSetu Department Budget Management Service ───────────────────────────
import { api } from './api';

export interface DepartmentBudget {
  department_id: string;
  department_name: string;
  budget_year: string;
  annual_budget: number;
  used_amount: number;
  remaining_amount: number;
  utilization_pct: number;
  warning_threshold: number; // default 0.80 (80%)
  has_warning: boolean;
  status: 'OPTIMAL' | 'WARNING' | 'EXCEEDED';
}

const LOCAL_BUDGETS_KEY = 'aharsetu_budgets_v4';

const INITIAL_BUDGETS: Record<string, DepartmentBudget> = {
  diploma: {
    department_id: 'diploma',
    department_name: 'Diploma Department',
    budget_year: '2026',
    annual_budget: 200000.0,
    used_amount: 124500.0,
    remaining_amount: 75500.0,
    utilization_pct: 62.25,
    warning_threshold: 0.80,
    has_warning: false,
    status: 'OPTIMAL'
  },
  degree: {
    department_id: 'degree',
    department_name: 'Degree Department',
    budget_year: '2026',
    annual_budget: 350000.0,
    used_amount: 289000.0,
    remaining_amount: 61000.0,
    utilization_pct: 82.57,
    warning_threshold: 0.80,
    has_warning: true,
    status: 'WARNING'
  },
  pharmacy: {
    department_id: 'pharmacy',
    department_name: 'Pharmacy Department',
    budget_year: '2026',
    annual_budget: 150000.0,
    used_amount: 45000.0,
    remaining_amount: 105000.0,
    utilization_pct: 30.0,
    warning_threshold: 0.80,
    has_warning: false,
    status: 'OPTIMAL'
  }
};

function getLocalBudgets(): Record<string, DepartmentBudget> {
  if (typeof window === 'undefined') return INITIAL_BUDGETS;
  try {
    const raw = localStorage.getItem(LOCAL_BUDGETS_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_BUDGETS_KEY, JSON.stringify(INITIAL_BUDGETS));
      return INITIAL_BUDGETS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_BUDGETS;
  }
}

function saveLocalBudgets(budgets: Record<string, DepartmentBudget>) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LOCAL_BUDGETS_KEY, JSON.stringify(budgets));
}

export async function getDepartmentBudget(deptId: string): Promise<DepartmentBudget> {
  try {
    const res = await api.get<DepartmentBudget>(`/budgets/${deptId}`);
    if (res) return res;
  } catch {}
  
  const budgets = getLocalBudgets();
  if (budgets[deptId]) return budgets[deptId];

  return {
    department_id: deptId,
    department_name: `${deptId.toUpperCase()} Department`,
    budget_year: '2026',
    annual_budget: 200000.0,
    used_amount: 0.0,
    remaining_amount: 200000.0,
    utilization_pct: 0.0,
    warning_threshold: 0.80,
    has_warning: false,
    status: 'OPTIMAL'
  };
}

export async function getAllBudgets(): Promise<DepartmentBudget[]> {
  const budgets = getLocalBudgets();
  return Object.values(budgets);
}

export async function recordBudgetExpense(deptId: string, amount: number): Promise<DepartmentBudget> {
  const budgets = getLocalBudgets();
  const b = budgets[deptId] || {
    department_id: deptId,
    department_name: `${deptId.toUpperCase()} Department`,
    budget_year: '2026',
    annual_budget: 200000.0,
    used_amount: 0.0,
    remaining_amount: 200000.0,
    utilization_pct: 0.0,
    warning_threshold: 0.80,
    has_warning: false,
    status: 'OPTIMAL'
  };

  b.used_amount += amount;
  b.remaining_amount = Math.max(0, b.annual_budget - b.used_amount);
  b.utilization_pct = parseFloat(((b.used_amount / b.annual_budget) * 100).toFixed(2));
  b.has_warning = b.utilization_pct >= (b.warning_threshold * 100);
  b.status = b.used_amount > b.annual_budget ? 'EXCEEDED' : b.has_warning ? 'WARNING' : 'OPTIMAL';

  budgets[deptId] = b;
  saveLocalBudgets(budgets);
  return b;
}

export async function checkBudgetOverflow(deptId: string, estimatedAmount: number): Promise<{ allowed: boolean; warning?: string }> {
  const budget = await getDepartmentBudget(deptId);
  const projected = budget.used_amount + estimatedAmount;
  if (projected > budget.annual_budget) {
    return {
      allowed: false,
      warning: `Order total ₹${estimatedAmount} exceeds remaining ${budget.department_name} annual budget (₹${budget.remaining_amount}).`
    };
  }
  if (projected >= (budget.annual_budget * budget.warning_threshold)) {
    return {
      allowed: true,
      warning: `Warning: ${budget.department_name} is approaching budget allocation capacity (${budget.utilization_pct}% used).`
    };
  }
  return { allowed: true };
}
