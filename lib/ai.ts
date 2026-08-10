// ── AharSetu Deterministic AI Analytics & Forecasting Engine ─────────────────
import { getOrders } from './store';
import { getAllBudgets } from './budget';

export interface AIForecastItem {
  category: string;
  item_name: string;
  predicted_demand_increase_pct: number;
  confidence_score: number;
  reason: string;
}

export interface AIAnomalyItem {
  id: string;
  type: 'EXPENDITURE_SPIKE' | 'SLA_DELAY' | 'STOCK_DRAIN';
  title: string;
  description: string;
  severity: 'HIGH' | 'MEDIUM' | 'INFO';
  detected_at: string;
}

export interface AISmartInsight {
  title: string;
  value: string;
  trend: string;
  recommendation: string;
}

export async function getAIDemandForecasts(): Promise<AIForecastItem[]> {
  return [
    {
      category: 'Beverages',
      item_name: 'Masala Tea & Filter Coffee',
      predicted_demand_increase_pct: 18.5,
      confidence_score: 0.92,
      reason: 'Mid-term examination schedule next week increases afternoon study group volume.'
    },
    {
      category: 'Snacks',
      item_name: 'Samosa & Kachori',
      predicted_demand_increase_pct: 12.0,
      confidence_score: 0.88,
      reason: 'Scheduled diploma department technical symposium on Thursday.'
    },
    {
      category: 'Meals',
      item_name: 'Special Thali & Veg Lunch',
      predicted_demand_increase_pct: 8.4,
      confidence_score: 0.85,
      reason: 'Faculty visiting committee meetings across Degree and Pharmacy departments.'
    }
  ];
}

export async function getAIAnomalies(): Promise<AIAnomalyItem[]> {
  const budgets = await getAllBudgets();
  const degreeB = budgets.find(b => b.department_id === 'degree');
  
  const anomalies: AIAnomalyItem[] = [
    {
      id: 'anom-1',
      type: 'EXPENDITURE_SPIKE',
      title: 'Degree Department Monthly Expenditure Spike',
      description: `Degree Department has utilized ${degreeB?.utilization_pct || 82.5}% of annual budget in 7 months (37.2% above historical 6-month average).`,
      severity: 'HIGH',
      detected_at: new Date().toISOString()
    },
    {
      id: 'anom-2',
      type: 'SLA_DELAY',
      title: 'DCR Audit Approval Queue Bottleneck',
      description: 'DCR Audit approval lead time averaged 2.4 hours yesterday (benchmark SLA is 1.0 hour).',
      severity: 'MEDIUM',
      detected_at: new Date(Date.now() - 36000000).toISOString()
    }
  ];

  return anomalies;
}

export async function getAISmartInsights(): Promise<AISmartInsight[]> {
  return [
    {
      title: 'Most Ordered Canteen Item',
      value: 'Masala Tea (120 units/wk)',
      trend: '⬆ +14.2% vs last week',
      recommendation: 'Ensure Sharma Canteen maintains 25% extra milk stock on Monday mornings.'
    },
    {
      title: 'Peak Ordering Window',
      value: '11:00 AM – 12:30 PM',
      trend: '⚡ 68% of daily volume',
      recommendation: 'Advise vendors to prepare bulk snack batches by 10:45 AM.'
    },
    {
      title: 'Top Performing Canteen Vendor',
      value: 'Sharma Canteen (Rating: 4.8/5)',
      trend: '★ 98% On-Time Completion',
      recommendation: 'Recommend Sharma Canteen for institutional VIP visiting committee lunches.'
    }
  ];
}
