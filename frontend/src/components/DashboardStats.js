import {
  useEffect,
  useState
} from 'react';

import API from '../services/api';

import {

  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,

} from 'recharts';

function DashboardStats() {

  const [stats, setStats] =
    useState({

      totalRequests: 0,
      approvedRequests: 0,
      pendingRequests: 0,
      rejectedRequests: 0,
    });

  useEffect(() => {

    fetchStats();

  }, []);

  const fetchStats = async () => {

    try {

      const response =
        await API.get('/stats');

      setStats(response.data);

    } catch (error) {

      console.error(error);
    }
  };

  const COLORS = [

    '#0088FE',
    '#00C49F',
    '#FF8042',
  ];

  const chartData = [

    {
      name: 'Approved',

      value:
        Number(
          stats.approvedRequests
        ) || 0,
    },

    {
      name: 'Pending',

      value:
        Number(
          stats.pendingRequests
        ) || 0,
    },

    {
      name: 'Rejected',

      value:
        Number(
          stats.rejectedRequests
        ) || 0,
    },
  ];

  return (

    <div className="dashboard-wrapper">

      <div className="dashboard-cards">

        <div className="stat-card">

          <h3>
            Total Requests
          </h3>

          <p>
            {stats.totalRequests}
          </p>

        </div>

        <div className="stat-card">

          <h3>
            Approved
          </h3>

          <p>
            {stats.approvedRequests}
          </p>

        </div>

        <div className="stat-card">

          <h3>
            Pending
          </h3>

          <p>
            {stats.pendingRequests}
          </p>

        </div>

        <div className="stat-card">

          <h3>
            Rejected
          </h3>

          <p>
            {stats.rejectedRequests}
          </p>

        </div>

      </div>

      <div className="chart-card">

        <h3>
          Request Status Analytics
        </h3>

        <ResponsiveContainer
          width="100%"
          height={400}
        >

          <PieChart>

            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              outerRadius={140}
              dataKey="value"
              label
            >

              {chartData.map(
                (
                  entry,
                  index
                ) => (

                  <Cell
                    key={`cell-${index}`}
                    fill={
                      COLORS[
                        index %
                        COLORS.length
                      ]
                    }
                  />

                )
              )}

            </Pie>

            <Tooltip />

            <Legend />

          </PieChart>

        </ResponsiveContainer>

      </div>

    </div>
  );
}

export default DashboardStats;