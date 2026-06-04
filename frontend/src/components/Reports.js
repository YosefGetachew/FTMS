import { useEffect, useState } from 'react';

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

function Reports() {
  const [statusSummary, setStatusSummary] = useState([]);
  const [sectorStatus, setSectorStatus] = useState([]);
  const [monthlyRequests, setMonthlyRequests] = useState([]);
  const [stageSummary, setStageSummary] = useState([]);

  const [moaVsAffiliateData, setMoaVsAffiliateData] = useState([]);
  const [moaSectorData, setMoaSectorData] = useState([]);
  const [affiliateOrganizationData, setAffiliateOrganizationData] = useState([]);

  const [error, setError] = useState('');

  useEffect(() => {
    fetchReports();
  }, []);

  const getUserRole = () => {
    const directRole = localStorage.getItem('role');

    if (directRole) {
      return directRole;
    }

    try {
      const storedUser = JSON.parse(localStorage.getItem('user'));
      return storedUser?.role || '';
    } catch {
      return '';
    }
  };

  const userRole = getUserRole();

  const canViewOfficeMinisterGraphs =
    userRole === 'office_head' ||
    userRole === 'office head' ||
    userRole === 'officehead' ||
    userRole === 'minister';

  const fetchReports = async () => {
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
  };

  const transformSectorData = (data) => {
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
  };

  const getCount = (status) => {
    const found = statusSummary.find((item) => item.status === status);

    return found ? Number(found.count) : 0;
  };

  const totalRequests = statusSummary.reduce(
    (sum, item) => sum + Number(item.count || 0),
    0
  );

  const COLORS = [
    '#2563eb',
    '#16a34a',
    '#dc2626',
    '#f59e0b',
    '#7c3aed',
  ];

  return (
    <div className="page-container">
      <h2>Analytical Reports</h2>

      {error && <div className="notice-error">{error}</div>}

      <div className="dashboard-cards">
        <div className="stat-card">
          <h3>Total Requests</h3>
          <p>{totalRequests}</p>
        </div>

        <div className="stat-card">
          <h3>Approved</h3>
          <p>{getCount('approved')}</p>
        </div>

        <div className="stat-card">
          <h3>Rejected</h3>
          <p>{getCount('rejected')}</p>
        </div>

        <div className="stat-card">
          <h3>Pending</h3>
          <p>{getCount('pending')}</p>
        </div>
      </div>

      {/* ============================================================
          PART 1: GENERAL ANALYTICAL REPORTS
      ============================================================ */}

      <div className="report-grid">
        <div className="report-card">
          <h3>Monthly Travel Requests</h3>

          {monthlyRequests.length === 0 ? (
            <p>No monthly data available</p>
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
                      fontWeight: 'bold',
                      fill: '#2563eb',
                    }}
                  />
                </Line>
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="report-card">
          <h3>Approved vs Rejected by Sector</h3>

          {sectorStatus.length === 0 ? (
            <p>No sector data available</p>
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
                    fontWeight: 'bold',
                    fill: '#000',
                  }}
                />

                <Bar
                  dataKey="rejected"
                  fill="#dc2626"
                  label={{
                    position: 'top',
                    fontWeight: 'bold',
                    fill: '#000',
                  }}
                />

                <Bar
                  dataKey="pending"
                  fill="#f59e0b"
                  label={{
                    position: 'top',
                    fontWeight: 'bold',
                    fill: '#000',
                  }}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="report-card">
          <h3>Requests by Workflow Stage</h3>

          {stageSummary.length === 0 ? (
            <p>No workflow stage data available</p>
          ) : (
            <ResponsiveContainer width="100%" height={350}>
              <PieChart>
                <Pie
                  data={stageSummary}
                  dataKey="count"
                  nameKey="current_stage"
                  cx="50%"
                  cy="50%"
                  outerRadius={120}
                  label
                >
                  {stageSummary.map((entry, index) => (
                    <Cell
                      key={index}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>

                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="report-card">
          <h3>Status Summary</h3>

          {statusSummary.length === 0 ? (
            <p>No status data available</p>
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
                    fontWeight: 'bold',
                    fill: '#000',
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
          <h2 style={{ marginTop: '35px' }}>
            Part 2: Office Head and Minister Report
          </h2>

          <div className="report-grid">
            <div className="report-card">
              <h3>MoA vs Affiliate Institute Count</h3>

              {moaVsAffiliateData.length === 0 ? (
                <p>No MoA or Affiliate Institute data available</p>
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
                        fontWeight: 'bold',
                        fill: '#000',
                      }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="report-card">
              <h3>MoA Travelers by Sector</h3>

              {moaSectorData.length === 0 ? (
                <p>No MoA sector data available</p>
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
                        fontWeight: 'bold',
                        fill: '#000',
                      }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="report-card">
              <h3>Affiliate Institute Travelers by Organization</h3>

              {affiliateOrganizationData.length === 0 ? (
                <p>No affiliate organization data available</p>
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
                        fontWeight: 'bold',
                        fill: '#000',
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