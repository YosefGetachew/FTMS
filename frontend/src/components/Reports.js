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
const MOA_AFFILIATE_COLORS = ['#2563eb', '#f97316', '#0f766e', '#7c3aed'];

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

function Reports() {
  const [statusSummary, setStatusSummary] = useState([]);
  const [sectorStatus, setSectorStatus] = useState([]);
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
      API.get('/reports/office-minister-summary'),
      API.get('/reports/funding-summary'),
      API.get('/reports/currently-abroad'),
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
      const officeMinisterData = results[3].value.data || {};

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

    if (results[4].status === 'fulfilled') {
      setFundingSummary(results[4].value.data || []);
    }

    if (results[5].status === 'fulfilled') {
      setCurrentlyAbroad({
        total: Number(results[5].value.data?.total || 0),
        bySector: results[5].value.data?.bySector || [],
        byDepartment: results[5].value.data?.byDepartment || [],
        travelers: results[5].value.data?.travelers || [],
      });
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

      <div className="reports-section-heading">
        <h2 className="reports-section-title">Currently Abroad</h2>
        <p>
          Approved travelers whose travel dates include today, grouped by sector
          and department.
        </p>
      </div>

      <div className="reports-currently-abroad">
        <div className="reports-abroad-summary">
          <span>Travelers Abroad Today</span>
          <strong>{currentlyAbroad.total}</strong>
          <small>Approved and within active travel dates</small>
        </div>

        <div className="reports-card">
          <div className="reports-card-header">
            <h3>Currently Abroad by Sector</h3>
            <p>Active approved travelers grouped by owning structure.</p>
          </div>

          {currentlyAbroad.bySector.length === 0 ? (
            <p className="reports-empty">No approved travelers are abroad today.</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={currentlyAbroad.bySector}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="sector"
                  angle={-15}
                  textAnchor="end"
                  interval={0}
                  height={90}
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

        <div className="reports-card">
          <div className="reports-card-header">
            <h3>Currently Abroad by Department</h3>
            <p>Active approved travelers grouped by department or office.</p>
          </div>

          {currentlyAbroadDepartmentChart.length === 0 ? (
            <p className="reports-empty">No department data available today.</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={currentlyAbroadDepartmentChart}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="departmentLabel"
                  angle={-15}
                  textAnchor="end"
                  interval={0}
                  height={90}
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

      <div className="reports-card reports-abroad-table-card">
        <div className="reports-card-header">
          <h3>Current Traveler List</h3>
          <p>Names, destinations, sectors, departments, and remaining days abroad.</p>
        </div>

        {currentlyAbroad.travelers.length === 0 ? (
          <p className="reports-empty">No approved travelers are abroad today.</p>
        ) : (
          <div className="reports-table-wrap">
            <table className="reports-data-table">
              <thead>
                <tr>
                  <th>Traveler</th>
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
                  <PieChart>
                    <Pie
                      data={moaVsAffiliateData}
                      dataKey="count"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={120}
                      label={({ name, count }) => `${name}: ${count}`}
                    >
                      {moaVsAffiliateData.map((entry, index) => (
                        <Cell
                          key={entry.name || index}
                          fill={
                            MOA_AFFILIATE_COLORS[
                              index % MOA_AFFILIATE_COLORS.length
                            ]
                          }
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

      {/* ============================================================
          PART 1: GENERAL ANALYTICAL REPORTS
      ============================================================ */}

      <div className="reports-grid">
        <div className="reports-card reports-card-wide">
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
            <h3>Funding Source Summary</h3>
            <p>Government vs non-government funding across travel requests.</p>
          </div>

          {fundingSummary.length === 0 ? (
            <p className="reports-empty">No funding data available</p>
          ) : (
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={fundingSummary}>
                <CartesianGrid strokeDasharray="3 3" />

                <XAxis dataKey="name" />

                <YAxis hide allowDecimals={false} />

                <Tooltip />
                <Legend />

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
      </div>


    </div>
  );
}

export default Reports;
