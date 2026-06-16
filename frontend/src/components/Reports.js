import { useCallback, useEffect, useMemo, useState } from 'react';
import './Reports.css';

import {
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
  ResponsiveContainer,
  CartesianGrid,
  LabelList,
} from 'recharts';

import API from '../services/api';

const REPORT_ROLES = ['admin', 'super_admin', 'minister', 'office_head'];

const COLORS = {
  approved: '#16a34a',
  rejected: '#dc2626',
  pending: '#f59e0b',
  amended: '#7c3aed',
  total: '#2563eb',
  stage: ['#2563eb', '#16a34a', '#dc2626', '#f59e0b', '#7c3aed', '#0891b2'],
};

const formatRole = (role) =>
  String(role || 'User')
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const formatStage = (stage) => {
  const labels = {
    expert_preparation: 'Expert Preparation',
    lead_executive_review: 'Lead Executive Review',
    project_coordinator_review: 'Project Coordinator Review',
    director_review: 'Lead Executive Review',
    state_minister_review: 'State Minister Review',
    ceo_review: 'CEO Review',
    office_head_review: 'Office Head Review',
    protocol_clearance: 'Protocol Clearance',
    office_head_final: 'Office Head Final',
    minister_review: 'Minister Review',
    pm_office_submission: 'Protocol Submission to PM Office',
    pm_office_followup: 'PM Office Follow-up',
    foreign_affairs_followup: 'PM Office Follow-up',
    completed: 'Completed',
  };

  return labels[stage] || formatRole(stage);
};

const addMonths = (date, months) => {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
};

const formatMonth = (date) =>
  date.toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
  });

const buildMonthlyForecast = (monthlyRequests) => {
  const actual = (monthlyRequests || []).map((item) => ({
    month: item.month,
    actual: Number(item.total || 0),
    forecast: null,
    type: 'Actual',
  }));

  if (actual.length === 0) return [];

  const recent = actual.slice(-3);
  const average =
    recent.reduce((sum, item) => sum + item.actual, 0) / recent.length;
  const last = actual[actual.length - 1]?.actual || 0;
  const previous =
    actual.length > 1 ? actual[actual.length - 2]?.actual || 0 : last;
  const trend = Math.max(-2, Math.min(3, last - previous));
  const lastMonthDate = monthlyRequests[monthlyRequests.length - 1]?.month_date
    ? new Date(monthlyRequests[monthlyRequests.length - 1].month_date)
    : new Date();

  const forecast = [1, 2, 3].map((step) => ({
    month: formatMonth(addMonths(lastMonthDate, step)),
    actual: null,
    forecast: Math.max(0, Math.round(average + trend * step)),
    type: 'Forecast',
  }));

  return [...actual, ...forecast];
};

function Reports() {
  const [statusSummary, setStatusSummary] = useState([]);
  const [sectorStatus, setSectorStatus] = useState([]);
  const [monthlyRequests, setMonthlyRequests] = useState([]);
  const [stageSummary, setStageSummary] = useState([]);

  const [moaVsAffiliateData, setMoaVsAffiliateData] = useState([]);
  const [moaSectorData, setMoaSectorData] = useState([]);
  const [affiliateOrganizationData, setAffiliateOrganizationData] = useState([]);

  const [error, setError] = useState('');

  const getUserRole = () => {
    try {
      const storedUser = JSON.parse(localStorage.getItem('user'));
      return storedUser?.role || '';
    } catch {
      return '';
    }
  };

  const userRole = getUserRole();
  const canViewReports = REPORT_ROLES.includes(userRole);
  const canViewOfficeMinisterGraphs = canViewReports;

  const transformSectorData = useCallback((data) => {
    const grouped = {};

    data.forEach((item) => {
      const sector = item.sector || 'Unassigned';

      if (!grouped[sector]) {
        grouped[sector] = {
          sector,
          approved: 0,
          rejected: 0,
          pending: 0,
          amended: 0,
        };
      }

      const status = item.final_status || item.status || 'pending';

      grouped[sector][status] = Number(item.count) || 0;
    });

    return Object.values(grouped);
  }, []);

  const fetchReports = useCallback(async () => {
    if (!canViewReports) return;

    setError('');

    const results = await Promise.allSettled([
      API.get('/reports/status-summary'),
      API.get('/reports/sector-status'),
      API.get('/reports/monthly-requests'),
      API.get('/reports/stage-summary'),
      API.get('/reports/office-minister-summary'),
    ]);

    if (results[0].status === 'fulfilled') {
      setStatusSummary(results[0].value.data || []);
    }

    if (results[1].status === 'fulfilled') {
      setSectorStatus(transformSectorData(results[1].value.data || []));
    }

    if (results[2].status === 'fulfilled') {
      setMonthlyRequests(results[2].value.data || []);
    }

    if (results[3].status === 'fulfilled') {
      setStageSummary(results[3].value.data || []);
    }

    if (results[4].status === 'fulfilled') {
      const officeMinisterData = results[4].value.data || {};

      setMoaVsAffiliateData(officeMinisterData.moaVsAffiliate || []);
      setMoaSectorData(officeMinisterData.moaBySector || []);
      setAffiliateOrganizationData(
        officeMinisterData.affiliateByOrganization || []
      );
    }

    const failed = results.some((item) => item.status === 'rejected');

    if (failed) {
      setError(
        'Some report data could not be loaded. Please check backend report APIs.'
      );
    }
  }, [canViewReports, transformSectorData]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const getCount = useCallback(
    (status) => {
      const found = statusSummary.find((item) => item.status === status);

      return found ? Number(found.count) : 0;
    },
    [statusSummary]
  );

  const analytics = useMemo(() => {
    const totalRequests = statusSummary.reduce(
      (sum, item) => sum + Number(item.count || 0),
      0
    );
    const approved = getCount('approved');
    const rejected = getCount('rejected');
    const pending = getCount('pending');
    const amended = getCount('amended');
    const completed = approved + rejected;
    const approvalRate = completed
      ? Math.round((approved / completed) * 100)
      : 0;

    return {
      totalRequests,
      approved,
      rejected,
      pending,
      amended,
      approvalRate,
    };
  }, [getCount, statusSummary]);

  const summaryCards = [
    {
      label: 'Total Requests',
      value: analytics.totalRequests,
      detail: 'All registered travel requests',
      tone: 'blue',
    },
    {
      label: 'Approved',
      value: analytics.approved,
      detail: `${analytics.approvalRate}% approval rate`,
      tone: 'green',
    },
    {
      label: 'Rejected',
      value: analytics.rejected,
      detail: 'Final rejected requests',
      tone: 'red',
    },
    {
      label: 'Pending',
      value: analytics.pending,
      detail: `${analytics.amended} returned / amended`,
      tone: 'amber',
    },
  ];

  const formattedStageSummary = stageSummary.map((item) => ({
    ...item,
    stageLabel: formatStage(item.current_stage),
  }));

  const forecastData = useMemo(
    () => buildMonthlyForecast(monthlyRequests),
    [monthlyRequests]
  );

  const forecastOnly = forecastData.filter((item) => item.type === 'Forecast');
  const nextForecast = forecastOnly[0]?.forecast || 0;
  const forecastAverage = forecastOnly.length
    ? Math.round(
        forecastOnly.reduce((sum, item) => sum + item.forecast, 0) /
          forecastOnly.length
      )
    : 0;
  const forecastPeak = forecastOnly.reduce(
    (peak, item) => (item.forecast > peak.forecast ? item : peak),
    { month: '-', forecast: 0 }
  );

  if (!canViewReports) {
    return (
      <div className="reports-page">
        <div className="reports-access-card">
          <h2>Reports Access Restricted</h2>
          <p>
            Analytical reports are available only to Admin, Super Admin,
            Minister, and Office Head roles.
          </p>
          <span>Your role: {formatRole(userRole)}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="reports-page">
      <div className="reports-hero">
        <div>
          <span>FTMS Reports</span>
          <h2 className="reports-title">Analytical Reports</h2>
          <p>
            Ministry-level travel analytics for Admin, Super Admin, Minister,
            and Office Head review.
          </p>
        </div>

        <button type="button" onClick={fetchReports}>
          Refresh Reports
        </button>
      </div>

      {error && <div className="notice-error">{error}</div>}

      <div className="reports-summary-grid">
        {summaryCards.map((card) => (
          <div className={`reports-stat-card ${card.tone}`} key={card.label}>
            <h3>{card.label}</h3>
            <p>{card.value}</p>
            <small>{card.detail}</small>
          </div>
        ))}
      </div>

      <div className="reports-forecast-strip">
        <div>
          <span>Next Month Forecast</span>
          <strong>{nextForecast}</strong>
          <small>Estimated approved travel requests</small>
        </div>
        <div>
          <span>3-Month Average Forecast</span>
          <strong>{forecastAverage}</strong>
          <small>Expected monthly approval volume</small>
        </div>
        <div>
          <span>Forecast Peak</span>
          <strong>{forecastPeak.forecast}</strong>
          <small>{forecastPeak.month}</small>
        </div>
      </div>

      {/* ============================================================
          PART 1: GENERAL ANALYTICAL REPORTS
      ============================================================ */}

      <div className="reports-chart-pair">
        <div className="reports-card">
          <div className="reports-card-header">
            <h3>Monthly Approved Travel</h3>
            <p>Approved requests grouped by travel start month.</p>
          </div>

          {monthlyRequests.length === 0 ? (
            <p className="reports-empty">No monthly data available</p>
          ) : (
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={monthlyRequests}>
                <CartesianGrid strokeDasharray="3 3" />

                <XAxis dataKey="month" />

                <YAxis
                  allowDecimals={false}
                  tickCount={6}
                  domain={[0, 'auto']}
                />

                <Tooltip />
                <Legend />

                <Line
                  type="monotone"
                  dataKey="total"
                  stroke="#2563eb"
                  strokeWidth={3}
                >
                  <LabelList
                    dataKey="total"
                    position="top"
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      fill: '#2563eb',
                    }}
                  />
                </Line>
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="reports-card">
          <div className="reports-card-header">
            <h3>3-Month Travel Forecast</h3>
            <p>
              Simple projection based on recent approved monthly travel volume.
            </p>
          </div>

          {forecastData.length === 0 ? (
            <p className="reports-empty">No monthly data available for forecasting</p>
          ) : (
            <ResponsiveContainer width="100%" height={330}>
              <LineChart data={forecastData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis allowDecimals={false} tickCount={6} domain={[0, 'auto']} />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="actual"
                  name="Actual Approved"
                  stroke="#2563eb"
                  strokeWidth={3}
                  connectNulls={false}
                />
                <Line
                  type="monotone"
                  dataKey="forecast"
                  name="Forecast"
                  stroke="#f59e0b"
                  strokeWidth={3}
                  strokeDasharray="6 5"
                  connectNulls={false}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="reports-grid">
        <div className="reports-card">
          <div className="reports-card-header">
            <h3>Status by Structure</h3>
            <p>Approved, rejected, and pending requests by sector or organization group.</p>
          </div>

          {sectorStatus.length === 0 ? (
            <p className="reports-empty">No sector data available</p>
          ) : (
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={sectorStatus}>
                <CartesianGrid strokeDasharray="3 3" />

                <XAxis dataKey="sector" />

                <YAxis
                  allowDecimals={false}
                  tickCount={6}
                  domain={[0, 'auto']}
                />

                <Tooltip />
                <Legend />

                <Bar
                  dataKey="approved"
                  fill="#16a34a"
                  label={{
                    position: 'top',
                    fontWeight: 600,
                    fill: '#334155',
                  }}
                />

                <Bar
                  dataKey="rejected"
                  fill="#dc2626"
                  label={{
                    position: 'top',
                    fontWeight: 600,
                    fill: '#334155',
                  }}
                />

                <Bar
                  dataKey="pending"
                  fill="#f59e0b"
                  label={{
                    position: 'top',
                    fontWeight: 600,
                    fill: '#334155',
                  }}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="reports-card">
          <div className="reports-card-header">
            <h3>Requests by Workflow Stage</h3>
            <p>Current workflow distribution across all requests.</p>
          </div>

          {stageSummary.length === 0 ? (
            <p className="reports-empty">No workflow stage data available</p>
          ) : (
            <ResponsiveContainer width="100%" height={350}>
              <PieChart>
                <Pie
                  data={formattedStageSummary}
                  dataKey="count"
                  nameKey="stageLabel"
                  cx="50%"
                  cy="50%"
                  outerRadius={120}
                  label
                >
                  {formattedStageSummary.map((entry, index) => (
                    <Cell
                      key={index}
                      fill={COLORS.stage[index % COLORS.stage.length]}
                    />
                  ))}
                </Pie>

                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="reports-card">
          <div className="reports-card-header">
            <h3>Status Summary</h3>
            <p>Overall final status distribution.</p>
          </div>

          {statusSummary.length === 0 ? (
            <p className="reports-empty">No status data available</p>
          ) : (
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={statusSummary}>
                <CartesianGrid strokeDasharray="3 3" />

                <XAxis dataKey="status" />

                <YAxis
                  allowDecimals={false}
                  tickCount={6}
                  domain={[0, 'auto']}
                />

                <Tooltip />
                <Legend />

                <Bar
                  dataKey="count"
                  fill="#2563eb"
                  label={{
                    position: 'top',
                    fontWeight: 600,
                    fill: '#334155',
                  }}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ============================================================
          PART 2: OFFICE HEAD AND MINISTER REPORTS
      ============================================================ */}

      {canViewOfficeMinisterGraphs && (
        <>
          <div className="reports-section-heading">
            <h2 className="reports-section-title">
              Office Head and Minister Report
            </h2>
            <p>Organization-level reports visible to all report-authorized roles.</p>
          </div>

          <div className="reports-grid">
            <div className="reports-card">
              <div className="reports-card-header">
                <h3>MoA vs Affiliate Institute Count</h3>
                <p>Compares internal MoA and affiliate institution travel requests.</p>
              </div>

              {moaVsAffiliateData.length === 0 ? (
                <p className="reports-empty">No MoA or Affiliate Institute data available</p>
              ) : (
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={moaVsAffiliateData}>
                    <CartesianGrid strokeDasharray="3 3" />

                    <XAxis dataKey="name" />

                    <YAxis
                      allowDecimals={false}
                      tickCount={6}
                      domain={[0, 'auto']}
                    />

                    <Tooltip />
                    <Legend />

                    <Bar
                      dataKey="count"
                      fill="#2563eb"
                      label={{
                        position: 'top',
                        fontWeight: 600,
                        fill: '#334155',
                      }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="reports-card">
              <div className="reports-card-header">
                <h3>MoA Travelers by Sector</h3>
                <p>MoA requests grouped by registered structure.</p>
              </div>

              {moaSectorData.length === 0 ? (
                <p className="reports-empty">No MoA sector data available</p>
              ) : (
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={moaSectorData}>
                    <CartesianGrid strokeDasharray="3 3" />

                    <XAxis
                      dataKey="name"
                      angle={-10}
                      textAnchor="end"
                      interval={0}
                      height={90}
                    />

                    <YAxis
                      allowDecimals={false}
                      tickCount={6}
                      domain={[0, 'auto']}
                    />

                    <Tooltip />
                    <Legend />

                    <Bar
                      dataKey="count"
                      fill="#16a34a"
                      label={{
                        position: 'top',
                        fontWeight: 600,
                        fill: '#334155',
                      }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="reports-card">
              <div className="reports-card-header">
                <h3>Affiliate Institute Travelers by Organization</h3>
                <p>Affiliate institution requests grouped by organization.</p>
              </div>

              {affiliateOrganizationData.length === 0 ? (
                <p className="reports-empty">No affiliate organization data available</p>
              ) : (
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={affiliateOrganizationData}>
                    <CartesianGrid strokeDasharray="3 3" />

                    <XAxis
                      dataKey="name"
                      angle={-25}
                      textAnchor="end"
                      interval={0}
                      height={90}
                    />

                    <YAxis
                      allowDecimals={false}
                      tickCount={6}
                      domain={[0, 'auto']}
                    />

                    <Tooltip />
                    <Legend />

                    <Bar
                      dataKey="count"
                      fill="#f97316"
                      label={{
                        position: 'top',
                        fontWeight: 600,
                        fill: '#334155',
                      }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default Reports;
