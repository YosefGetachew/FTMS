import { useEffect, useState } from 'react';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';

import API from '../services/api';

function DashboardStats({ setActivePage }) {
  const user = JSON.parse(
    localStorage.getItem('user') || '{}'
  );

  const [stats, setStats] = useState({
    totalRequests: 0,
    approvedRequests: 0,
    pendingRequests: 0,
    rejectedRequests: 0,
  });

  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const normalizeSectorData = (data) => {
  return (data || []).map((item) => ({
    ...item,
    sector: item.sector || 'Unassigned',
    pending_count: Number(item.pending_count || 0),
  }));
};

  const fetchDashboardData = async () => {
    try {
      const statsResponse = await API.get('/stats');

      setStats({
        totalRequests: statsResponse.data.totalRequests || 0,
        approvedRequests:
          statsResponse.data.approvedRequests || 0,
        pendingRequests:
          statsResponse.data.pendingRequests || 0,
        rejectedRequests:
          statsResponse.data.rejectedRequests || 0,
      });

      const chartResponse = await API.get(
        `/dashboard/pending-by-sector?role=${user.role}&id=${user.id}`
      );

      setChartData(
        normalizeSectorData(chartResponse.data || [])
      );
    } catch (error) {
      console.error(error);
    }
  };

  const goToSubmittedRequests = () => {
    if (user?.role !== 'traveler' && setActivePage) {
      setActivePage('submitted-requests');
    }
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-cards">
        <div className="stat-card">
          <h3>Total Requests</h3>
          <p>{stats.totalRequests}</p>
        </div>

        <div className="stat-card">
          <h3>Approved</h3>
          <p>{stats.approvedRequests}</p>
        </div>

        <div className="stat-card">
          <h3>Pending</h3>
          <p>{stats.pendingRequests}</p>
        </div>

        <div className="stat-card">
          <h3>Rejected</h3>
          <p>{stats.rejectedRequests}</p>
        </div>
      </div>

      <div className="chart-card">
        <h3>Pending Requests by Sector</h3>

        {chartData.length === 0 ? (
          <p>No pending requests by sector found.</p>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 " />

              <XAxis
                dataKey="sector"
                interval={0}
                angle={-5}
                textAnchor="end"
                height={70}
              />

              <YAxis allowDecimals={false} />

              <Tooltip />

              <Bar
                dataKey="pending_count"
                name="Pending Requests"
                fill="#14532d"
                radius={[8, 8, 0, 0]}
                label={{
                  position: 'top',
                  fill: '#14532d',
                  fontWeight: 'bold',
                }}
                onClick={goToSubmittedRequests}
                style={{
                  cursor:
                    user?.role !== 'traveler'
                      ? 'pointer'
                      : 'default',
                }}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

export default DashboardStats;