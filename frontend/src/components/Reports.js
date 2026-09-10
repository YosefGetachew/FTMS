import { useCallback, useEffect, useMemo, useState } from 'react';
import './Reports.css';

import {
  BarChart,
  Bar,
  LineChart,
  Line,
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

const formatRole = (role) =>
  String(role || 'User')
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const formatReportDate = (value) => {
  if (!value) return '-';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '-';

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  });
};

const useViewportWidth = () => {
  const getWidth = () =>
    typeof window === 'undefined' ? 1440 : window.innerWidth;

  const [width, setWidth] = useState(getWidth);

  useEffect(() => {
    const handleResize = () => setWidth(getWidth());

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return width;
};

function Reports() {
  const viewportWidth = useViewportWidth();
  const [statusSummary, setStatusSummary] = useState([]);
  const [monthlyRequests, setMonthlyRequests] = useState([]);
  const [fundingSummary, setFundingSummary] = useState([]);
  const [currentlyAbroad, setCurrentlyAbroad] = useState({
    total: 0,
    bySector: [],
    byDepartment: [],
    travelers: [],
  });

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
  const isMobileChart = viewportWidth < 680;
  const isTabletChart = viewportWidth >= 680 && viewportWidth < 1180;
  const compactChartHeight = isMobileChart ? 240 : isTabletChart ? 270 : 300;
  const abroadChartHeight = isMobileChart ? 190 : 205;
  const monthlyChartHeight = isMobileChart ? 260 : isTabletChart ? 310 : 350;
  const organizationAxisWidth = isMobileChart ? 106 : 140;
  const sectorAxisWidth = isMobileChart ? 142 : isTabletChart ? 190 : 230;
  const affiliateAxisWidth = isMobileChart ? 132 : 190;
  const fundingAxisWidth = isMobileChart ? 112 : 145;

  const fetchReports = useCallback(async () => {
    if (!canViewReports) return;

    setError('');

    const results = await Promise.allSettled([
      API.get('/reports/status-summary'),
      API.get('/reports/monthly-requests'),
      API.get('/reports/office-minister-summary'),
      API.get('/reports/funding-summary'),
      API.get('/reports/currently-abroad'),
    ]);

    if (results[0].status === 'fulfilled') {
      setStatusSummary(results[0].value.data || []);
    }

    if (results[1].status === 'fulfilled') {
      setMonthlyRequests(results[1].value.data || []);
    }

    if (results[2].status === 'fulfilled') {
      const officeMinisterData = results[2].value.data || {};

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

    if (results[3].status === 'fulfilled') {
      setFundingSummary(results[3].value.data || []);
    }

    if (results[4].status === 'fulfilled') {
      setCurrentlyAbroad({
        total: Number(results[4].value.data?.total || 0),
        bySector: results[4].value.data?.bySector || [],
        byDepartment: results[4].value.data?.byDepartment || [],
        travelers: results[4].value.data?.travelers || [],
      });
    }
  }, [canViewReports]);

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

  const decisionStatusData = useMemo(
    () => {
      const total = Math.max(
        analytics.approved + analytics.rejected + analytics.pending,
        1
      );

      return [
      {
        name: 'Needs Decision',
        count: analytics.pending,
        fill: '#f59e0b',
        percent: Math.round((analytics.pending / total) * 100),
        helper: 'Waiting for approval or rejection',
      },
      {
        name: 'Approved',
        count: analytics.approved,
        fill: '#16a34a',
        percent: Math.round((analytics.approved / total) * 100),
        helper: 'Approved final decisions',
      },
      {
        name: 'Rejected',
        count: analytics.rejected,
        fill: '#dc2626',
        percent: Math.round((analytics.rejected / total) * 100),
        helper: 'Rejected final decisions',
      },
    ];
    },
    [analytics.approved, analytics.pending, analytics.rejected]
  );

  const decisionInsight = useMemo(() => {
    if (analytics.pending > 0) {
      return {
        tone: 'warning',
        label: 'Attention needed',
        title: `${analytics.pending} request${analytics.pending === 1 ? '' : 's'} still need a decision`,
        detail: `${analytics.approved} approved and ${analytics.rejected} rejected so far.`,
      };
    }

    return {
      tone: 'clear',
      label: 'No pending decision',
      title: 'All visible requests have a final decision',
      detail: `${analytics.approved} approved and ${analytics.rejected} rejected.`,
    };
  }, [analytics.approved, analytics.pending, analytics.rejected]);

  const leadershipSummaryCards = useMemo(() => {
    const getChartCount = (items, name) => {
      const found = items.find((item) => item.name === name);
      return Number(found?.count || 0);
    };

    const moaCount = getChartCount(moaVsAffiliateData, 'MoA');
    const affiliateCount = getChartCount(moaVsAffiliateData, 'Affiliate Institute');
    const governmentCount = getChartCount(fundingSummary, 'Government');
    const nonGovernmentCount = getChartCount(fundingSummary, 'Non-government');

    return [
      {
        label: 'Decision Needed',
        value: analytics.pending,
        detail: `${analytics.approved} approved / ${analytics.rejected} rejected`,
      },
      {
        label: 'Organization Type',
        value: `${moaCount} MoA`,
        detail: `${affiliateCount} affiliate institute request(s)`,
      },
      {
        label: 'Funding Source',
        value: `${governmentCount} government`,
        detail: `${nonGovernmentCount} non-government request(s)`,
      },
      {
        label: 'Traveling Today',
        value: currentlyAbroad.total,
        detail: 'Approved staff currently abroad',
      },
    ];
  }, [
    analytics.approved,
    analytics.pending,
    analytics.rejected,
    currentlyAbroad.total,
    fundingSummary,
    moaVsAffiliateData,
  ]);

  const currentlyAbroadDepartmentChart = useMemo(
    () =>
      currentlyAbroad.byDepartment.map((item) => ({
        ...item,
        departmentLabel:
          item.sector && item.sector !== 'Unassigned'
            ? `${item.sector} - ${item.department || 'Unassigned'}`
            : item.department || 'Unassigned',
      })),
    [currentlyAbroad.byDepartment]
  );

  if (!canViewReports) {
    return (
      <div className="reports-page">
        <div className="reports-access-card">
          <h2>Reports Access Restricted</h2>
          <p>
            Analytical reports are available to Admin, Minister, and Office
            Head roles.
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
          <span>Reports</span>
          <h2 className="reports-title">Travel Reports</h2>
          <p>
            Simple travel summaries for administrators and leadership review.
          </p>
        </div>

        <button type="button" onClick={fetchReports}>
          Refresh
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

      <div className="reports-section-heading">
        <h2 className="reports-section-title">Staff Currently Abroad</h2>
        <p>
          Approved staff traveling today, summarized by sector, department, and traveler.
        </p>
      </div>

      <div className="reports-card reports-abroad-combo-card">
        <div className="reports-abroad-combo-top">
          <div className="reports-abroad-focus">
            <span>Abroad today</span>
            <strong>{currentlyAbroad.total}</strong>
            <small>Approved staff within active travel dates</small>
          </div>

          <div className="reports-abroad-mini-metrics">
            <div>
              <span>Sectors</span>
              <strong>{currentlyAbroad.bySector.length}</strong>
            </div>
            <div>
              <span>Departments</span>
              <strong>{currentlyAbroadDepartmentChart.length}</strong>
            </div>
            <div>
              <span>Travelers</span>
              <strong>{currentlyAbroad.travelers.length}</strong>
            </div>
          </div>
        </div>

        <div className="reports-abroad-body">
          <div className="reports-abroad-chart-grid">
            <div className="reports-abroad-mini-card">
              <div className="reports-card-header">
                <h3>By Sector</h3>
                <p>Active approved staff grouped by owning structure.</p>
              </div>

              {currentlyAbroad.bySector.length === 0 ? (
                <p className="reports-empty compact">No approved staff are abroad today.</p>
              ) : (
                <ResponsiveContainer width="100%" height={abroadChartHeight}>
                  <BarChart data={currentlyAbroad.bySector}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="sector"
                      angle={-15}
                      textAnchor="end"
                      interval={0}
                      height={70}
                    />
                    <YAxis hide allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#0f766e" radius={[6, 6, 0, 0]}>
                      <LabelList
                        dataKey="count"
                        position="top"
                        fontWeight={700}
                        fill="#334155"
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="reports-abroad-mini-card">
              <div className="reports-card-header">
                <h3>By Department</h3>
                <p>Active approved staff grouped by department or office.</p>
              </div>

              {currentlyAbroadDepartmentChart.length === 0 ? (
                <p className="reports-empty compact">No department data available today.</p>
              ) : (
                <ResponsiveContainer width="100%" height={abroadChartHeight}>
                  <BarChart data={currentlyAbroadDepartmentChart}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="departmentLabel"
                      angle={-15}
                      textAnchor="end"
                      interval={0}
                      height={70}
                    />
                    <YAxis hide allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#2563eb" radius={[6, 6, 0, 0]}>
                      <LabelList
                        dataKey="count"
                        position="top"
                        fontWeight={700}
                        fill="#334155"
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="reports-abroad-list-panel">
            <div className="reports-card-header">
              <h3>Current Staff Abroad List</h3>
              <p>Names, destinations, sectors, departments, and remaining days abroad.</p>
            </div>

            {currentlyAbroad.travelers.length === 0 ? (
              <p className="reports-empty compact">No approved staff are abroad today.</p>
            ) : (
              <div className="reports-table-wrap">
                <table className="reports-data-table">
                  <thead>
                    <tr>
                      <th>Staff Member</th>
                      <th>Sector</th>
                      <th>Department</th>
                      <th>Destination</th>
                      <th>Travel Dates</th>
                      <th>Days Abroad</th>
                      <th>Remaining</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentlyAbroad.travelers.map((traveler) => (
                      <tr key={traveler.id}>
                        <td>
                          <strong>{traveler.full_name}</strong>
                          <span>{traveler.position || '-'}</span>
                        </td>
                        <td>{traveler.sector || 'Unassigned'}</td>
                        <td>{traveler.department || 'Unassigned'}</td>
                        <td>{traveler.country || '-'}</td>
                        <td>
                          {formatReportDate(traveler.start_date)} to{' '}
                          {formatReportDate(traveler.end_date)}
                        </td>
                        <td>{Number(traveler.days_abroad || 0)}</td>
                        <td>{Number(traveler.days_remaining || 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ============================================================
          PART 2: OFFICE HEAD AND MINISTER REPORTS
      ============================================================ */}

      {canViewOfficeMinisterGraphs && (
        <section className="reports-leadership-panel">
          <div className="reports-section-heading">
            <h2 className="reports-section-title">
              Office Head and Minister Summary
            </h2>
            <p>
              A leadership view of decisions, organization coverage, sector
              distribution, affiliate requests, and funding source.
            </p>
          </div>

          <div className="reports-leadership-summary">
            {leadershipSummaryCards.map((item) => (
              <div key={item.label}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
                <small>{item.detail}</small>
              </div>
            ))}
          </div>

          <div className="reports-grid reports-leadership-grid">
            <div className="reports-card reports-status-dashboard reports-leadership-wide">
              <div className="reports-card-header">
                <h3>Decision Status</h3>
                <p>Shows what needs leadership attention and what already has a final decision.</p>
              </div>

              <div className={`reports-decision-insight ${decisionInsight.tone}`}>
                <span>{decisionInsight.label}</span>
                <strong>{decisionInsight.title}</strong>
                <small>{decisionInsight.detail}</small>
              </div>

              <div className="reports-status-graphic">
                {decisionStatusData.map((item) => (
                  <div className="reports-status-row" key={item.name}>
                    <div className="reports-status-row-heading">
                      <span>{item.name}</span>
                      <strong>{item.count}</strong>
                    </div>
                    <div className="reports-status-track">
                      <i
                        style={{
                          width: `${Math.max(item.percent, item.count > 0 ? 6 : 0)}%`,
                          backgroundColor: item.fill,
                        }}
                      />
                    </div>
                    <small>{item.helper} · {item.percent}%</small>
                  </div>
                ))}
              </div>
            </div>

            <div className="reports-card reports-compact-chart">
              <div className="reports-card-header">
                <h3>Requests by Organization Type</h3>
                <p>Compares internal MoA and affiliate institute requests.</p>
              </div>

              {moaVsAffiliateData.length === 0 ? (
                <p className="reports-empty">No MoA or Affiliate Institute data available</p>
              ) : (
                <ResponsiveContainer width="100%" height={compactChartHeight}>
                  <BarChart
                    data={moaVsAffiliateData}
                    layout="vertical"
                    margin={{ top: 10, right: 42, left: 8, bottom: 10 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />

                    <XAxis type="number" hide allowDecimals={false} />

                    <YAxis
                      type="category"
                      dataKey="name"
                      width={organizationAxisWidth}
                      tickLine={false}
                      axisLine={false}
                    />

                    <Tooltip />

                    <Bar
                      dataKey="count"
                      fill="#2563eb"
                      radius={[0, 8, 8, 0]}
                    >
                      <LabelList
                        dataKey="count"
                        position="right"
                        fontWeight={800}
                        fill="#334155"
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="reports-card reports-compact-chart">
              <div className="reports-card-header">
                <h3>MoA Requests by Sector</h3>
                <p>MoA requests grouped by registered structure.</p>
              </div>

              {moaSectorData.length === 0 ? (
                <p className="reports-empty">No MoA sector data available</p>
              ) : (
                <ResponsiveContainer
                  width="100%"
                  height={Math.max(
                    isMobileChart ? 260 : 280,
                    moaSectorData.length * (isMobileChart ? 42 : 52)
                  )}
                >
                  <BarChart
                    data={moaSectorData}
                    layout="vertical"
                    margin={{ top: 8, right: 44, left: 12, bottom: 8 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />

                    <XAxis type="number" hide allowDecimals={false} />

                    <YAxis
                      type="category"
                      dataKey="name"
                      width={sectorAxisWidth}
                      tickLine={false}
                      axisLine={false}
                    />

                    <Tooltip />

                    <Bar
                      dataKey="count"
                      fill="#16a34a"
                      radius={[0, 8, 8, 0]}
                    >
                      <LabelList
                        dataKey="count"
                        position="right"
                        fontWeight={800}
                        fill="#334155"
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="reports-card reports-compact-chart">
              <div className="reports-card-header">
                <h3>Affiliate Requests by Organization</h3>
                <p>Affiliate institute requests grouped by organization.</p>
              </div>

              {affiliateOrganizationData.length === 0 ? (
                <p className="reports-empty">No affiliate organization data available</p>
              ) : (
                <ResponsiveContainer width="100%" height={compactChartHeight}>
                  <BarChart
                    data={affiliateOrganizationData}
                    layout="vertical"
                    margin={{ top: 10, right: 42, left: 8, bottom: 10 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />

                    <XAxis type="number" hide allowDecimals={false} />

                    <YAxis
                      type="category"
                      dataKey="name"
                      width={affiliateAxisWidth}
                      tickLine={false}
                      axisLine={false}
                    />

                    <Tooltip />

                    <Bar
                      dataKey="count"
                      fill="#f97316"
                      radius={[0, 8, 8, 0]}
                    >
                      <LabelList
                        dataKey="count"
                        position="right"
                        fontWeight={800}
                        fill="#334155"
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="reports-card reports-compact-chart">
              <div className="reports-card-header">
                <h3>Funding Source</h3>
                <p>Government and non-government funded requests.</p>
              </div>

              {fundingSummary.length === 0 ? (
                <p className="reports-empty">No funding data available</p>
              ) : (
                <ResponsiveContainer width="100%" height={compactChartHeight}>
                  <BarChart
                    data={fundingSummary}
                    layout="vertical"
                    margin={{ top: 10, right: 42, left: 8, bottom: 10 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />

                    <XAxis type="number" hide allowDecimals={false} />

                    <YAxis
                      type="category"
                      dataKey="name"
                      width={fundingAxisWidth}
                      tickLine={false}
                      axisLine={false}
                    />

                    <Tooltip />

                    <Bar dataKey="count" fill="#0f766e" radius={[0, 8, 8, 0]}>
                      <LabelList
                        dataKey="count"
                        position="right"
                        fontWeight={800}
                        fill="#334155"
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ============================================================
          PART 1: GENERAL ANALYTICAL REPORTS
      ============================================================ */}

      <div className="reports-grid">
        <div className="reports-card reports-card-wide">
          <div className="reports-card-header">
            <h3>Monthly Travel Trend</h3>
            <p>Approved travel requests shown by month across the system.</p>
          </div>

          {monthlyRequests.length === 0 ? (
            <p className="reports-empty">No monthly travel data available</p>
          ) : (
            <ResponsiveContainer width="100%" height={monthlyChartHeight}>
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
                  name="Approved Travel"
                  stroke="#0f766e"
                  strokeWidth={3}
                  dot={{ r: 5 }}
                  activeDot={{ r: 7 }}
                >
                  <LabelList
                    dataKey="total"
                    position="top"
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      fill: '#0f766e',
                    }}
                  />
                </Line>
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>


    </div>
  );
}

export default Reports;
