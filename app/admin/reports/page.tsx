'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/AppShell';
import StatusBadge from '@/components/StatusBadge';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { getSession } from '@/lib/auth';
import { getDepartments } from '@/lib/auth';
import { getVendors } from '@/lib/vendors';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid
} from 'recharts';

export default function StandaloneReportsPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterDeptId, setFilterDeptId] = useState('');
  const [filterVendorId, setFilterVendorId] = useState('');

  // Dropdown lists
  const [departments, setDepartments] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);

  // Analytics Data
  const [summary, setSummary] = useState<any>(null);
  const [deptReport, setDeptReport] = useState<any[]>([]);
  const [vendorReport, setVendorReport] = useState<any[]>([]);
  const [trends, setTrends] = useState<any[]>([]);
  const [popularItems, setPopularItems] = useState<any[]>([]);
  const [approvalTime, setApprovalTime] = useState<any>(null);
  const [funnel, setFunnel] = useState<any[]>([]);
  const [matrix, setMatrix] = useState<any>(null);

  // Drilldown states
  const [selectedDeptDetail, setSelectedDeptDetail] = useState<any>(null);
  const [selectedVendorDetail, setSelectedVendorDetail] = useState<any>(null);
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [showVendorModal, setShowVendorModal] = useState(false);

  useEffect(() => {
    setMounted(true);
    const session = getSession();
    if (!session) {
      router.push('/login');
      return;
    }
    if (session.role !== 'admin' && session.role !== 'dcr') {
      router.push(`/${session.role}`);
      return;
    }
    initDropdowns();
  }, [router]);

  useEffect(() => {
    if (mounted) {
      loadAllReportData();
    }
  }, [mounted, filterStartDate, filterEndDate, filterDeptId, filterVendorId]);

  async function initDropdowns() {
    try {
      const [depts, vends] = await Promise.all([
        getDepartments().catch(() => []),
        getVendors().catch(() => [])
      ]);
      setDepartments(depts);
      setVendors(vends);
    } catch (err) {
      console.error('Error loading dropdown lists', err);
    }
  }

  async function loadAllReportData() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStartDate) params.append('start_date', filterStartDate);
      if (filterEndDate) params.append('end_date', filterEndDate);
      if (filterDeptId) params.append('department_id', filterDeptId);
      if (filterVendorId) params.append('vendor_id', filterVendorId);

      const qs = params.toString() ? `?${params.toString()}` : '';

      const [
        sumData,
        deptData,
        vendData,
        trendData,
        itemData,
        apprData,
        funnelData,
        matrixData
      ] = await Promise.all([
        api.get<any>(`/reports/summary${qs}`).catch(() => null),
        api.get<any[]>(`/reports/departments${qs}`).catch(() => []),
        api.get<any[]>(`/reports/vendors${qs}`).catch(() => []),
        api.get<any[]>(`/reports/trends${qs}`).catch(() => []),
        api.get<any[]>(`/reports/items${qs}`).catch(() => []),
        api.get<any>(`/reports/approval-time${qs}`).catch(() => null),
        api.get<any[]>(`/reports/funnel${qs}`).catch(() => []),
        api.get<any>(`/reports/department-vendor-matrix${qs}`).catch(() => null)
      ]);

      setSummary(sumData);
      setDeptReport(deptData);
      setVendorReport(vendData);
      setTrends(trendData);
      setPopularItems(itemData);
      setApprovalTime(apprData);
      setFunnel(funnelData);
      setMatrix(matrixData);
    } catch (err) {
      console.error('Failed to load reports data', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeptDrilldown(deptId: string) {
    try {
      const detail = await api.get<any>(`/reports/departments/${deptId}`);
      setSelectedDeptDetail(detail);
      setShowDeptModal(true);
    } catch (err) {
      alert('Error fetching department details');
    }
  }

  async function handleVendorDrilldown(vendorId: string) {
    try {
      const detail = await api.get<any>(`/reports/vendors/${vendorId}`);
      setSelectedVendorDetail(detail);
      setShowVendorModal(true);
    } catch (err) {
      alert('Error fetching vendor details');
    }
  }

  function clearFilters() {
    setFilterStartDate('');
    setFilterEndDate('');
    setFilterDeptId('');
    setFilterVendorId('');
  }

  function handleCsvExport() {
    const params = new URLSearchParams();
    if (filterStartDate) params.append('start_date', filterStartDate);
    if (filterEndDate) params.append('end_date', filterEndDate);
    if (filterDeptId) params.append('department_id', filterDeptId);
    if (filterVendorId) params.append('vendor_id', filterVendorId);
    params.append('format', 'csv');

    // Direct download link
    const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1/reports/export?${params.toString()}`;
    window.open(url, '_blank');
  }

  const COLORS = ['#2563EB', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4'];

  return (
    <AppShell role="admin">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '40px' }}>
        
        {/* Header Title */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '10px' }}>
              📊 Standalone Procurement & Expenditure Reports
            </h1>
            <p style={{ margin: '4px 0 0', fontSize: '0.9rem', color: '#64748B' }}>
              Institutional financial summaries, vendor audits, department billing allocations, and real-time trends.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={handleCsvExport}
              style={{
                background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                padding: '10px 18px',
                fontSize: '0.88rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)'
              }}
            >
              📥 Export CSV Report
            </button>
          </div>
        </div>

        {/* Global Filter Bar Card */}
        <div className="card" style={{ padding: '20px', background: 'white', borderRadius: '16px', border: '1px solid #E2E8F0', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', alignItems: 'end' }}>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>Start Date</label>
              <input type="date" className="form-input" value={filterStartDate} onChange={e => setFilterStartDate(e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>End Date</label>
              <input type="date" className="form-input" value={filterEndDate} onChange={e => setFilterEndDate(e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>Department</label>
              <select className="form-input" value={filterDeptId} onChange={e => setFilterDeptId(e.target.value)}>
                <option value="">All Departments</option>
                {departments.map(d => (
                  <option key={d.id} value={d.id}>{d.label} - {d.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>Vendor</label>
              <select className="form-input" value={filterVendorId} onChange={e => setFilterVendorId(e.target.value)}>
                <option value="">All Vendors</option>
                {vendors.map(v => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={clearFilters}
                style={{
                  background: '#F1F5F9',
                  color: '#475569',
                  border: '1px solid #CBD5E1',
                  borderRadius: '10px',
                  padding: '10px 14px',
                  fontSize: '0.88rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  flex: 1,
                  textAlign: 'center'
                }}
              >
                Clear
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#64748B' }}>
            <div style={{ width: '40px', height: '40px', border: '3px solid #2563EB', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px auto' }} />
            Calculating and aggregating institutional statistics...
          </div>
        ) : (
          <>
            {/* KPI metrics row */}
            {summary && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                <div className="card" style={{ padding: '20px', background: 'white', borderRadius: '16px', borderLeft: '4px solid #2563EB', border: '1px solid #E2E8F0', borderLeftWidth: '5px' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B' }}>TOTAL TRANSACTIONS</div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0F172A', marginTop: '6px' }}>{summary.total_orders}</div>
                  <div style={{ fontSize: '0.75rem', color: '#94A3B8', marginTop: '4px' }}>Requisitions processed</div>
                </div>
                <div className="card" style={{ padding: '20px', background: 'white', borderRadius: '16px', borderLeft: '4px solid #10B981', border: '1px solid #E2E8F0', borderLeftWidth: '5px' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B' }}>COMPLETED ORDERS</div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#10B981', marginTop: '6px' }}>{summary.completed_orders}</div>
                  <div style={{ fontSize: '0.75rem', color: '#94A3B8', marginTop: '4px' }}>Billed and closed</div>
                </div>
                <div className="card" style={{ padding: '20px', background: 'white', borderRadius: '16px', borderLeft: '4px solid #F59E0B', border: '1px solid #E2E8F0', borderLeftWidth: '5px' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B' }}>PENDING REVIEW</div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#F59E0B', marginTop: '6px' }}>{summary.pending_orders}</div>
                  <div style={{ fontSize: '0.75rem', color: '#94A3B8', marginTop: '4px' }}>Awaiting HOD/Auditor action</div>
                </div>
                <div className="card" style={{ padding: '20px', background: 'white', borderRadius: '16px', borderLeft: '4px solid #EF4444', border: '1px solid #E2E8F0', borderLeftWidth: '5px' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B' }}>REJECTED REQUESTS</div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#EF4444', marginTop: '6px' }}>{summary.rejected_orders}</div>
                  <div style={{ fontSize: '0.75rem', color: '#94A3B8', marginTop: '4px' }}>Principal/DCR rejected</div>
                </div>
                <div className="card" style={{ padding: '20px', background: 'white', borderRadius: '16px', borderLeft: '4px solid #8B5CF6', border: '1px solid #E2E8F0', borderLeftWidth: '5px', gridColumn: 'span 2' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B' }}>TOTAL EXPENDITURE</div>
                    <span style={{ fontSize: '0.7rem', background: '#F5F3FF', color: '#8B5CF6', fontWeight: 800, padding: '2px 8px', borderRadius: '20px' }}>COMPLETED</span>
                  </div>
                  <div style={{ fontSize: '1.85rem', fontWeight: 900, color: '#8B5CF6', marginTop: '6px' }}>
                    ₹{summary.total_expenditure.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#94A3B8', marginTop: '4px' }}>
                    Avg Value: ₹{summary.avg_order_value.toLocaleString()} / order
                  </div>
                </div>
              </div>
            )}

            {/* Charts section grid */}
            {mounted && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))', gap: '20px' }}>
                
                {/* Expenditure Trend Chart */}
                <div className="card" style={{ padding: '24px', background: 'white', borderRadius: '16px', border: '1px solid #E2E8F0' }}>
                  <h3 style={{ margin: '0 0 16px 0', fontSize: '1rem', fontWeight: 800, color: '#0F172A' }}>📈 Requisition Expenditure Trend</h3>
                  <div style={{ width: '100%', height: '280px' }}>
                    <ResponsiveContainer>
                      <AreaChart data={trends}>
                        <defs>
                          <linearGradient id="colorSpend" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#2563EB" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#2563EB" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                        <XAxis dataKey="period" stroke="#94A3B8" style={{ fontSize: '0.75rem' }} />
                        <YAxis stroke="#94A3B8" style={{ fontSize: '0.75rem' }} />
                        <Tooltip formatter={(value) => [`₹${value.toLocaleString()}`, 'Expenditure']} />
                        <Area type="monotone" dataKey="expenditure" stroke="#2563EB" strokeWidth={2.5} fillOpacity={1} fill="url(#colorSpend)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Department expenditure comparison */}
                <div className="card" style={{ padding: '24px', background: 'white', borderRadius: '16px', border: '1px solid #E2E8F0' }}>
                  <h3 style={{ margin: '0 0 16px 0', fontSize: '1rem', fontWeight: 800, color: '#0F172A' }}>🏢 Department Expenditure Share</h3>
                  <div style={{ width: '100%', height: '280px' }}>
                    <ResponsiveContainer>
                      <BarChart data={deptReport}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                        <XAxis dataKey="label" stroke="#94A3B8" style={{ fontSize: '0.75rem' }} />
                        <YAxis stroke="#94A3B8" style={{ fontSize: '0.75rem' }} />
                        <Tooltip formatter={(value) => [`₹${value.toLocaleString()}`, 'Completed Spend']} />
                        <Bar dataKey="total_expenditure" fill="#2563EB" radius={[4, 4, 0, 0]}>
                          {deptReport.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Vendor Market Share Pie Chart */}
                <div className="card" style={{ padding: '24px', background: 'white', borderRadius: '16px', border: '1px solid #E2E8F0' }}>
                  <h3 style={{ margin: '0 0 16px 0', fontSize: '1rem', fontWeight: 800, color: '#0F172A' }}>🏪 Food Vendor Settlement Shares</h3>
                  <div style={{ width: '100%', height: '280px', display: 'flex', alignItems: 'center' }}>
                    <div style={{ flex: 1, height: '100%' }}>
                      <ResponsiveContainer>
                        <PieChart>
                          <Pie
                            data={vendorReport}
                            dataKey="revenue"
                            nameKey="vendor_name"
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={90}
                            paddingAngle={4}
                            label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                          >
                            {vendorReport.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => [`₹${value.toLocaleString()}`, 'Billed Revenue']} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* Approval stage speed timing analysis */}
                {approvalTime && (
                  <div className="card" style={{ padding: '24px', background: 'white', borderRadius: '16px', border: '1px solid #E2E8F0' }}>
                    <h3 style={{ margin: '0 0 16px 0', fontSize: '1rem', fontWeight: 800, color: '#0F172A' }}>⏱️ Institutional Verification Pipeline</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '10px' }}>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                          <span>1. HOD Review (Coordinator → Principal)</span>
                          <span style={{ color: '#0F172A' }}>{approvalTime.submission_to_principal.avg || 0} hours avg</span>
                        </div>
                        <div style={{ width: '100%', height: '8px', background: '#F1F5F9', borderRadius: '4px' }}>
                          <div style={{ width: `${Math.min(100, (approvalTime.submission_to_principal.avg || 0) * 10)}%`, height: '100%', background: '#F59E0B', borderRadius: '4px' }} />
                        </div>
                      </div>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                          <span>2. Auditor Check (Principal → DCR Auditor)</span>
                          <span style={{ color: '#0F172A' }}>{approvalTime.principal_to_dcr.avg || 0} hours avg</span>
                        </div>
                        <div style={{ width: '100%', height: '8px', background: '#F1F5F9', borderRadius: '4px' }}>
                          <div style={{ width: `${Math.min(100, (approvalTime.principal_to_dcr.avg || 0) * 10)}%`, height: '100%', background: '#10B981', borderRadius: '4px' }} />
                        </div>
                      </div>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                          <span>3. Billing & Fulfillment (DCR → Completion)</span>
                          <span style={{ color: '#0F172A' }}>{approvalTime.dcr_to_completion.avg || 0} hours avg</span>
                        </div>
                        <div style={{ width: '100%', height: '8px', background: '#F1F5F9', borderRadius: '4px' }}>
                          <div style={{ width: `${Math.min(100, (approvalTime.dcr_to_completion.avg || 0) * 10)}%`, height: '100%', background: '#2563EB', borderRadius: '4px' }} />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            )}

            {/* Department Breakdown Table */}
            <div className="card" style={{ padding: '24px', background: 'white', borderRadius: '16px', border: '1px solid #E2E8F0' }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '1rem', fontWeight: 800, color: '#0F172A' }}>🏢 Department Breakdown Allocations</h3>
              <div className="table-wrapper" style={{ border: '1px solid #F1F5F9', borderRadius: '12px', overflowX: 'auto' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Dept Code</th>
                      <th>Department Name</th>
                      <th>Total Orders</th>
                      <th>Completed</th>
                      <th>Rejected</th>
                      <th>Avg Order Value</th>
                      <th style={{ textAlign: 'right' }}>Total Completed Spend</th>
                      <th style={{ width: '80px' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deptReport.map(r => (
                      <tr key={r.department_id}>
                        <td style={{ fontWeight: 800, color: '#475569' }}>{r.label}</td>
                        <td style={{ fontWeight: 700 }}>{r.department_name}</td>
                        <td>{r.total_orders}</td>
                        <td>{r.completed_orders}</td>
                        <td>{r.rejected_orders}</td>
                        <td>₹{r.avg_order_value.toLocaleString()}</td>
                        <td style={{ textAlign: 'right', fontWeight: 800, color: '#0F172A' }}>₹{r.total_expenditure.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        <td>
                          <button
                            onClick={() => handleDeptDrilldown(r.department_id)}
                            style={{ padding: '6px 12px', background: '#EFF6FF', color: '#2563EB', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '0.75rem' }}
                          >
                            Detail →
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Vendor Performance Breakdown Table */}
            <div className="card" style={{ padding: '24px', background: 'white', borderRadius: '16px', border: '1px solid #E2E8F0' }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '1rem', fontWeight: 800, color: '#0F172A' }}>🏪 Vendor Procurement Metrics</h3>
              <div className="table-wrapper" style={{ border: '1px solid #F1F5F9', borderRadius: '12px', overflowX: 'auto' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Vendor ID</th>
                      <th>Vendor Name</th>
                      <th>Owner</th>
                      <th>Live Status</th>
                      <th>Menu Items</th>
                      <th>Fulfillment Rate</th>
                      <th>Modification Requests</th>
                      <th style={{ textAlign: 'right' }}>Calculated Earnings</th>
                      <th style={{ width: '80px' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vendorReport.map(v => (
                      <tr key={v.vendor_id}>
                        <td style={{ fontWeight: 800, color: '#475569' }}>{v.vendor_id}</td>
                        <td style={{ fontWeight: 700 }}>{v.vendor_name}</td>
                        <td>{v.owner_name}</td>
                        <td>
                          <span style={{
                            padding: '4px 10px',
                            borderRadius: '20px',
                            fontSize: '0.75rem',
                            fontWeight: 800,
                            background: v.status === 'open' ? '#ECFDF5' : '#FEF2F2',
                            color: v.status === 'open' ? '#10B981' : '#EF4444'
                          }}>
                            {v.status.toUpperCase()}
                          </span>
                        </td>
                        <td>{v.menu_items} ({v.available_items} avail)</td>
                        <td>{v.completion_rate}%</td>
                        <td>{v.modified_orders} requests</td>
                        <td style={{ textAlign: 'right', fontWeight: 800, color: '#0F172A' }}>₹{v.revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        <td>
                          <button
                            onClick={() => handleVendorDrilldown(v.vendor_id)}
                            style={{ padding: '6px 12px', background: '#EFF6FF', color: '#2563EB', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '0.75rem' }}
                          >
                            Detail →
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Popular Items Table & Funnel Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px' }}>
              
              {/* Top popular items */}
              <div className="card" style={{ padding: '24px', background: 'white', borderRadius: '16px', border: '1px solid #E2E8F0' }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '1rem', fontWeight: 800, color: '#0F172A' }}>🍽️ Top 10 Popular Menu Items (Institutional Demand)</h3>
                <div className="table-wrapper" style={{ border: '1px solid #F1F5F9', borderRadius: '12px', overflowX: 'auto' }}>
                  <table className="table">
                    <thead>
                      <tr>
                        <th style={{ width: '40px' }}>Rank</th>
                        <th>Item Name</th>
                        <th>Vendor Name</th>
                        <th>Order Count</th>
                        <th>Qty Ordered</th>
                        <th style={{ textAlign: 'right' }}>Est. Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {popularItems.map(item => (
                        <tr key={`${item.vendor_id}-${item.item_name}`}>
                          <td style={{ fontWeight: 800, color: '#94A3B8' }}>#{item.rank}</td>
                          <td style={{ fontWeight: 700 }}>{item.item_name}</td>
                          <td>{item.vendor_name}</td>
                          <td>{item.total_orders} orders</td>
                          <td style={{ fontWeight: 600 }}>{item.total_quantity}</td>
                          <td style={{ textAlign: 'right', fontWeight: 800, color: '#0F172A' }}>₹{item.total_revenue.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Order Status Funnel Table */}
              <div className="card" style={{ padding: '24px', background: 'white', borderRadius: '16px', border: '1px solid #E2E8F0' }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '1rem', fontWeight: 800, color: '#0F172A' }}>🌪️ Stage-wise Order Conversion Funnel</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '10px' }}>
                  {funnel.map(f => (
                    <div key={f.stage}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                        <span>{f.stage}</span>
                        <span style={{ color: '#0F172A' }}>{f.count} orders ({f.pct}%)</span>
                      </div>
                      <div style={{ width: '100%', height: '24px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '6px', overflow: 'hidden', display: 'flex', alignItems: 'center', position: 'relative' }}>
                        <div style={{ width: `${f.pct}%`, height: '100%', background: 'linear-gradient(90deg, #3B82F6 0%, #2563EB 100%)', opacity: 0.8 }} />
                        <span style={{ position: 'absolute', left: '10px', fontSize: '0.75rem', fontWeight: 800, color: f.pct > 50 ? 'white' : '#64748B' }}>{f.count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>

          </>
        )}

      </div>

      {/* Department Detail Modal */}
      {showDeptModal && selectedDeptDetail && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'white', borderRadius: '16px', padding: '32px', width: '560px', maxHeight: '90vh', overflowY: 'auto', boxShadow: 'var(--shadow-xl)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>🏢 Dept Spend Breakdown: {selectedDeptDetail.department_id}</h2>
              <button onClick={() => setShowDeptModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#64748B' }}>✕</button>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
              <div style={{ background: '#F8FAFC', padding: '16px', borderRadius: '12px' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B' }}>Total Completed Spend</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#8B5CF6', marginTop: '4px' }}>₹{selectedDeptDetail.total_expenditure.toLocaleString()}</div>
              </div>
              <div style={{ background: '#F8FAFC', padding: '16px', borderRadius: '12px' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B' }}>Average Order Value</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#10B981', marginTop: '4px' }}>₹{selectedDeptDetail.avg_order_value.toLocaleString()}</div>
              </div>
            </div>

            <h3 style={{ fontSize: '0.9rem', fontWeight: 800, margin: '20px 0 10px 0' }}>Canteen Vendor Split</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {selectedDeptDetail.vendor_breakdown.map((vb: any) => (
                <div key={vb.vendor_id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', padding: '8px 12px', background: '#F8FAFC', borderRadius: '8px' }}>
                  <span>{vb.vendor_name} ({vb.orders} orders)</span>
                  <strong style={{ color: '#0F172A' }}>₹{vb.revenue.toLocaleString()}</strong>
                </div>
              ))}
            </div>

            <button onClick={() => setShowDeptModal(false)} style={{ width: '100%', background: '#F1F5F9', color: '#475569', border: '1px solid #CBD5E1', borderRadius: '10px', padding: '12px', cursor: 'pointer', fontWeight: 700, marginTop: '24px' }}>
              Close Drilldown Window
            </button>
          </div>
        </div>
      )}

      {/* Vendor Detail Modal */}
      {showVendorModal && selectedVendorDetail && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'white', borderRadius: '16px', padding: '32px', width: '560px', maxHeight: '90vh', overflowY: 'auto', boxShadow: 'var(--shadow-xl)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>🏪 Vendor performance details</h2>
              <button onClick={() => setShowVendorModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#64748B' }}>✕</button>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
              <div style={{ background: '#F8FAFC', padding: '16px', borderRadius: '12px' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B' }}>Calculated Revenue</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#2563EB', marginTop: '4px' }}>₹{selectedVendorDetail.revenue.toLocaleString()}</div>
              </div>
              <div style={{ background: '#F8FAFC', padding: '16px', borderRadius: '12px' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B' }}>Total Orders Fulfilled</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#10B981', marginTop: '4px' }}>{selectedVendorDetail.completed_orders}</div>
              </div>
            </div>

            <h3 style={{ fontSize: '0.9rem', fontWeight: 800, margin: '20px 0 10px 0' }}>Top Selling Items</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {selectedVendorDetail.top_items.map((ti: any) => (
                <div key={ti.name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', padding: '8px 12px', background: '#F8FAFC', borderRadius: '8px' }}>
                  <span>{ti.name} (x{ti.quantity} sold)</span>
                  <strong style={{ color: '#0F172A' }}>₹{ti.revenue.toLocaleString()}</strong>
                </div>
              ))}
            </div>

            <button onClick={() => setShowVendorModal(false)} style={{ width: '100%', background: '#F1F5F9', color: '#475569', border: '1px solid #CBD5E1', borderRadius: '10px', padding: '12px', cursor: 'pointer', fontWeight: 700, marginTop: '24px' }}>
              Close Drilldown Window
            </button>
          </div>
        </div>
      )}

    </AppShell>
  );
}
