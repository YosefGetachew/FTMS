import {
  useEffect,
  useState,
} from 'react';

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
} from 'recharts';

import API from '../services/api';

function Reports() {
  const [statusSummary, setStatusSummary] =
    useState([]);

  const [sectorStatus, setSectorStatus] =
    useState([]);

  const [monthlyRequests, setMonthlyRequests] =
    useState([]);

  const [stageSummary, setStageSummary] =
    useState([]);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const [
        statusResponse,
        sectorResponse,
        monthlyResponse,
        stageResponse,
      ] = await Promise.all([
        API.get('/reports/status-summary'),
        API.get('/reports/sector-status'),
        API.get('/reports/monthly-requests'),
        API.get('/reports/stage-summary'),
      ]);

      setStatusSummary(statusResponse.data);
      setSectorStatus(
        transformSectorData(sectorResponse.data)
      );
      setMonthlyRequests(monthlyResponse.data);
      setStageSummary(stageResponse.data);
    } catch (error) {
      console.error(error);
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

      if (item.final_status === 'approved') {
        grouped[sector].approved =
          Number(item.count);
      } else if (item.final_status === 'rejected') {
        grouped[sector].rejected =
          Number(item.count);
      } else if (item.final_status === 'pending') {
        grouped[sector].pending =
          Number(item.count);
      } else if (item.final_status === 'amended') {
        grouped[sector].amended =
          Number(item.count);
      }
    });

    return Object.values(grouped);
  };

  const totalRequests = statusSummary.reduce(
    (sum, item) => sum + Number(item.count),
    0
  );

  const approvedCount =
    statusSummary.find((item) =>
      item.status
        ?.toLowerCase()
        .includes('approved')
    )?.count || 0;

  const rejectedCount =
    statusSummary.find((item) =>
      item.status
        ?.toLowerCase()
        .includes('rejected')
    )?.count || 0;

  const pendingCount =
    statusSummary.find((item) =>
      item.status
        ?.toLowerCase()
        .includes('pending')
    )?.count || 0;

  const COLORS = [
    '#2563eb',
    '#16a34a',
    '#dc2626',
    '#f59e0b',
    '#7c3aed',
    '#0891b2',
  ];

  return (
    <div className="page-container">

      <h2>
        Analytical Reports
      </h2>

      <div className="dashboard-cards">

        <div className="stat-card">
          <h3>Total Requests</h3>
          <p>{totalRequests}</p>
        </div>

        <div className="stat-card">
          <h3>Approved</h3>
          <p>{approvedCount}</p>
        </div>

        <div className="stat-card">
          <h3>Rejected</h3>
          <p>{rejectedCount}</p>
        </div>

        <div className="stat-card">
          <h3>Pending</h3>
          <p>{pendingCount}</p>
        </div>

      </div>

      <div className="report-grid">

        <div className="report-card">
          <h3>
            Approved vs Rejected by Sector
          </h3>

          <ResponsiveContainer
            width="100%"
            height={350}
          >
            <BarChart data={sectorStatus}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="sector" />
              <YAxis />
              <Tooltip />
              <Legend />

              <Bar
                dataKey="approved"
                name="Approved"
                fill="#16a34a"
              />

              <Bar
                dataKey="rejected"
                name="Rejected"
                fill="#dc2626"
              />

              <Bar
                dataKey="pending"
                name="Pending"
                fill="#f59e0b"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="report-card">
          <h3>
            Monthly Travel Requests
          </h3>

          <ResponsiveContainer
            width="100%"
            height={350}
          >
            <LineChart data={monthlyRequests}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />

              <Line
                type="monotone"
                dataKey="total"
                name="Total Requests"
                stroke="#2563eb"
                strokeWidth={3}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="report-card">
          <h3>
            Requests by Workflow Stage
          </h3>

          <ResponsiveContainer
            width="100%"
            height={350}
          >
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
                    key={`cell-${index}`}
                    fill={
                      COLORS[
                        index % COLORS.length
                      ]
                    }
                  />
                ))}
              </Pie>

              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="report-card">
          <h3>
            Status Summary
          </h3>

          <ResponsiveContainer
            width="100%"
            height={350}
          >
            <BarChart data={statusSummary}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="status" />
              <YAxis />
              <Tooltip />
              <Legend />

              <Bar
                dataKey="count"
                name="Requests"
                fill="#2563eb"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

      </div>

    </div>
  );
}

export default Reports;