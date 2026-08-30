// ── AharSetu Department Budget Management Service ───────────────────────────
import { api } from './api';
import { DEPARTMENTS } from './constants';

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

export interface ProjectedBudgetImpact {
  department_id: string;
  department_name: string;
  current_used: number;
  current_remaining: number;
  current_utilization_pct: number;
  additional_amount: number;
  projected_used: number;
  projected_remaining: number;
  projected_utilization_pct: number;
  warning_threshold: number;
  will_warn: boolean;
  will_exceed: boolean;
  warning_message?: string;
}

const LOCAL_BUDGETS_KEY = 'aharsetu_budgets_v5';

const INITIAL_BUDGETS: Record<string, DepartmentBudget> = {
  diploma: {
    department_id: 'diploma',
    department_name: 'Diploma Department',
    budget_year: '2026-27',
    annual_budget: 250000.0,
    used_amount: 124500.0,
    remaining_amount: 125500.0,
    utilization_pct: 49.80,
    warning_threshold: 0.80,
    has_warning: false,
    status: 'OPTIMAL'
  },
  degree: {
    department_id: 'degree',
    department_name: 'Degree Department',
    budget_year: '2026-27',
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
    budget_year: '2026-27',
    annual_budget: 150000.0,
    used_amount: 45000.0,
    remaining_amount: 105000.0,
    utilization_pct: 30.00,
    warning_threshold: 0.80,
    has_warning: false,
    status: 'OPTIMAL'
  },
  physiotherapy: {
    department_id: 'physiotherapy',
    department_name: 'Physiotherapy Department',
    budget_year: '2026-27',
    annual_budget: 180000.0,
    used_amount: 62000.0,
    remaining_amount: 118000.0,
    utilization_pct: 34.44,
    warning_threshold: 0.80,
    has_warning: false,
    status: 'OPTIMAL'
  },
  nursing: {
    department_id: 'nursing',
    department_name: 'Nursing Department',
    budget_year: '2026-27',
    annual_budget: 200000.0,
    used_amount: 88000.0,
    remaining_amount: 112000.0,
    utilization_pct: 44.00,
    warning_threshold: 0.80,
    has_warning: false,
    status: 'OPTIMAL'
  },
  bsc: {
    department_id: 'bsc',
    department_name: 'B.Sc./Paramedical Department',
    budget_year: '2026-27',
    annual_budget: 160000.0,
    used_amount: 51000.0,
    remaining_amount: 109000.0,
    utilization_pct: 31.88,
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
    const parsed = JSON.parse(raw);
    // Ensure all 6 departments are present even if old localStorage only had 3
    let updated = false;
    for (const [k, v] of Object.entries(INITIAL_BUDGETS)) {
      if (!parsed[k]) {
        parsed[k] = v;
        updated = true;
      }
    }
    if (updated) {
      localStorage.setItem(LOCAL_BUDGETS_KEY, JSON.stringify(parsed));
    }
    return parsed;
  } catch {
    return INITIAL_BUDGETS;
  }
}

function saveLocalBudgets(budgets: Record<string, DepartmentBudget>) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LOCAL_BUDGETS_KEY, JSON.stringify(budgets));
  try {
    window.dispatchEvent(new CustomEvent('aharsetu_budget_updated', { detail: budgets }));
  } catch {}
}

export async function getDepartmentBudget(deptId: string): Promise<DepartmentBudget> {
  try {
    const res = await api.get<DepartmentBudget>(`/budgets/${deptId}`);
    if (res && res.annual_budget) return res;
  } catch {}
  
  const budgets = getLocalBudgets();
  if (budgets[deptId]) return budgets[deptId];

  const deptMeta = DEPARTMENTS.find(d => d.id === deptId);
  return {
    department_id: deptId,
    department_name: deptMeta?.label || `${deptId.toUpperCase()} Department`,
    budget_year: '2026-27',
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
  try {
    const res = await api.get<DepartmentBudget[]>('/budgets');
    if (Array.isArray(res) && res.length > 0) return res;
  } catch {}

  const budgets = getLocalBudgets();
  return Object.values(budgets);
}

export async function updateDepartmentBudgetCap(
  deptId: string,
  annualBudget: number,
  warningThreshold: number = 0.80
): Promise<DepartmentBudget> {
  const budgets = getLocalBudgets();
  const current = budgets[deptId] || await getDepartmentBudget(deptId);

  const updated: DepartmentBudget = {
    ...current,
    annual_budget: Math.max(1000, annualBudget),
    warning_threshold: Math.min(1.0, Math.max(0.1, warningThreshold)),
    remaining_amount: Math.max(0, annualBudget - current.used_amount),
    utilization_pct: annualBudget > 0 ? parseFloat(((current.used_amount / annualBudget) * 100).toFixed(2)) : 0,
    has_warning: (current.used_amount / annualBudget) >= warningThreshold,
    status: current.used_amount > annualBudget ? 'EXCEEDED' : ((current.used_amount / annualBudget) >= warningThreshold ? 'WARNING' : 'OPTIMAL')
  };

  budgets[deptId] = updated;
  saveLocalBudgets(budgets);

  try {
    await api.put(`/budgets/${deptId}`, {
      annual_budget: updated.annual_budget,
      warning_threshold: updated.warning_threshold
    });
  } catch {}

  return updated;
}

export async function recordBudgetExpense(deptId: string, amount: number): Promise<DepartmentBudget> {
  const budgets = getLocalBudgets();
  const b = budgets[deptId] || await getDepartmentBudget(deptId);

  b.used_amount += amount;
  b.remaining_amount = Math.max(0, b.annual_budget - b.used_amount);
  b.utilization_pct = b.annual_budget > 0 ? parseFloat(((b.used_amount / b.annual_budget) * 100).toFixed(2)) : 0;
  b.has_warning = b.utilization_pct >= (b.warning_threshold * 100);
  b.status = b.used_amount > b.annual_budget ? 'EXCEEDED' : (b.has_warning ? 'WARNING' : 'OPTIMAL');

  budgets[deptId] = b;
  saveLocalBudgets(budgets);
  return b;
}

export async function calculateProjectedImpact(deptId: string, additionalAmount: number): Promise<ProjectedBudgetImpact> {
  const budget = await getDepartmentBudget(deptId);
  const projectedUsed = budget.used_amount + Math.max(0, additionalAmount);
  const projectedRemaining = Math.max(0, budget.annual_budget - projectedUsed);
  const projectedPct = budget.annual_budget > 0 ? parseFloat(((projectedUsed / budget.annual_budget) * 100).toFixed(2)) : 0;
  const willWarn = projectedPct >= (budget.warning_threshold * 100);
  const willExceed = projectedUsed > budget.annual_budget;

  let warning_message: string | undefined;
  if (willExceed) {
    warning_message = `⚠️ Order total ₹${additionalAmount.toLocaleString('en-IN')} exceeds remaining ${budget.department_name} annual allocation by ₹${(projectedUsed - budget.annual_budget).toLocaleString('en-IN')}.`;
  } else if (willWarn && !budget.has_warning) {
    warning_message = `⚡ Note: This order will push ${budget.department_name} budget utilization past the ${Math.round(budget.warning_threshold * 100)}% threshold to ${projectedPct}%.`;
  }

  return {
    department_id: deptId,
    department_name: budget.department_name,
    current_used: budget.used_amount,
    current_remaining: budget.remaining_amount,
    current_utilization_pct: budget.utilization_pct,
    additional_amount: additionalAmount,
    projected_used: projectedUsed,
    projected_remaining: projectedRemaining,
    projected_utilization_pct: projectedPct,
    warning_threshold: budget.warning_threshold,
    will_warn: willWarn,
    will_exceed: willExceed,
    warning_message
  };
}

export async function checkBudgetOverflow(deptId: string, estimatedAmount: number): Promise<{ allowed: boolean; warning?: string }> {
  const impact = await calculateProjectedImpact(deptId, estimatedAmount);
  if (impact.will_exceed) {
    return {
      allowed: false,
      warning: impact.warning_message || `Order total ₹${estimatedAmount.toLocaleString('en-IN')} exceeds remaining annual budget.`
    };
  }
  if (impact.will_warn) {
    return {
      allowed: true,
      warning: impact.warning_message || `Warning: ${impact.department_name} is approaching budget allocation threshold (${impact.projected_utilization_pct}%).`
    };
  }
  return { allowed: true };
}
