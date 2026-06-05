import { useCallback, useEffect, useMemo, useState } from "react";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from "recharts";

import API from "../services/api";

const formatRole = (value) => {
  if (!value) return "User";

  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const getDashboardScope = (user) => {
  const role = user?.role || "";
  const sector = user?.sector || "";
  const department = user?.department || "";

  if (["admin", "super_admin"].includes(role)) {
    return "All ministry requests and workflow queues";
  }

  if (role === "minister") {
    return "Final ministerial review and approved travel oversight";
  }

  if (role === "office_head") {
    return "Office Head clearance and final review workload";
  }

  if (role === "protocol") {
    return "Protocol clearance workload and follow-up requests";
  }

  if (role === "state_minister") {
    return sector ? `${sector} sector review workload` : "Assigned sector review workload";
  }

  if (role === "chief_executive_officer" || role === "ceo") {
    return sector ? `${sector} CEO structure workload` : "CEO structure review workload";
  }

  if (role === "lead_executive_officer" || role === "lead_executive") {
    return department
      ? `${department} lead executive office workload`
      : "Assigned lead executive office workload";
  }

  return "Your available travel request workspace";
};

function DashboardStats({ setActivePage }) {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const role = user?.role || "";
  const canOpenReports = ["admin", "super_admin", "office_head", "minister"].includes(role);

  const [stats, setStats] = useState({
    totalRequests: 0,
    approvedRequests: 0,
    pendingRequests: 0,
    rejectedRequests: 0,
  });
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const normalizeSectorData = useCallback((data) => {
    return (data || [])
      .map((item) => ({
        ...item,
        sector: item.sector || "Unassigned",
        pending_count: Number(item.pending_count || 0),
      }))
      .sort((a, b) => b.pending_count - a.pending_count);
  }, []);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [statsResponse, chartResponse] = await Promise.all([
        API.get("/stats"),
        API.get(`/dashboard/pending-by-sector?role=${role}&id=${user.id}`),
      ]);

      setStats({
        totalRequests: statsResponse.data.totalRequests || 0,
        approvedRequests: statsResponse.data.approvedRequests || 0,
        pendingRequests: statsResponse.data.pendingRequests || 0,
        rejectedRequests: statsResponse.data.rejectedRequests || 0,
      });

      setChartData(normalizeSectorData(chartResponse.data || []));
    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.error || "Unable to load dashboard analytics.");
    } finally {
      setLoading(false);
    }
  }, [normalizeSectorData, user.id, role]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const analytics = useMemo(() => {
    const total = Number(stats.totalRequests || 0);
    const approved = Number(stats.approvedRequests || 0);
    const pending = Number(stats.pendingRequests || 0);
    const rejected = Number(stats.rejectedRequests || 0);
    const completed = approved + rejected;
    const approvalRate = completed ? Math.round((approved / completed) * 100) : 0;
    const rejectionRate = completed ? Math.round((rejected / completed) * 100) : 0;
    const pendingShare = total ? Math.round((pending / total) * 100) : 0;
    const completedShare = total ? Math.round((completed / total) * 100) : 0;
    const topPendingSector = chartData[0] || null;
    const pendingSectorTotal = chartData.reduce(
      (sum, item) => sum + item.pending_count,
      0
    );
    const concentration =
      topPendingSector && pendingSectorTotal
        ? Math.round((topPendingSector.pending_count / pendingSectorTotal) * 100)
        : 0;

    return {
      total,
      approved,
      pending,
      rejected,
      completed,
      approvalRate,
      rejectionRate,
      pendingShare,
      completedShare,
      topPendingSector,
      pendingSectorTotal,
      concentration,
    };
  }, [chartData, stats]);

  const dashboardContext = useMemo(
    () => ({
      roleLabel: formatRole(role),
      scope: getDashboardScope(user),
      structure: user?.sector || "Not assigned",
      office: user?.department || "Not assigned",
    }),
    [role, user]
  );

  const kpis = [
    {
      label: "Total Requests",
      value: analytics.total,
      detail: "All travel requests recorded",
      tone: "blue",
    },
    {
      label: "Approved",
      value: analytics.approved,
      detail: `${analytics.approvalRate}% of completed decisions`,
      tone: "green",
    },
    {
      label: "Pending",
      value: analytics.pending,
      detail: `${analytics.pendingShare}% of total requests`,
      tone: "amber",
    },
    {
      label: "Rejected",
      value: analytics.rejected,
      detail: `${analytics.rejectionRate}% of completed decisions`,
      tone: "rose",
    },
  ];

  const goToSubmittedRequests = () => {
    if (role !== "traveler" && setActivePage) {
      setActivePage("submitted-requests");
    }
  };

  const actionCards = [
    {
      title: "Open Assigned Queue",
      detail: "Review pending requests that match your workflow responsibility.",
      action: "Open requests",
      onClick: goToSubmittedRequests,
      show: role !== "traveler",
    },
    {
      title: "Create Travel Request",
      detail: "Start a new foreign travel request for workflow approval.",
      action: "New request",
      onClick: () => setActivePage && setActivePage("travel-request"),
      show: role !== "minister",
    },
    {
      title: "Analytical Reports",
      detail: "Open detailed reports for status, sector, and approval trends.",
      action: "View reports",
      onClick: () => setActivePage && setActivePage("reports"),
      show: canOpenReports,
    },
  ].filter((item) => item.show);

  const chartColors = ["#1d4ed8", "#15803d", "#b45309", "#7c3aed", "#0369a1"];

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <div>
          <span className="dashboard-eyebrow">Dashboard Overview</span>
          <h2>{dashboardContext.roleLabel} Workspace</h2>
          <p>
            {dashboardContext.scope}
          </p>
        </div>

        <button
          type="button"
          className="dashboard-refresh-btn"
          onClick={fetchDashboardData}
          disabled={loading}
        >
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {error && <div className="notice-error">{error}</div>}

      <div className="dashboard-context-grid">
        <div className="dashboard-context-card">
          <span>Logged-in Role</span>
          <strong>{dashboardContext.roleLabel}</strong>
        </div>
        <div className="dashboard-context-card">
          <span>Structure</span>
          <strong title={dashboardContext.structure}>
            {dashboardContext.structure}
          </strong>
        </div>
        <div className="dashboard-context-card">
          <span>Lead Executive Office</span>
          <strong title={dashboardContext.office}>
            {dashboardContext.office}
          </strong>
        </div>
      </div>

      <div className="dashboard-kpi-grid">
        {kpis.map((item) => (
          <div key={item.label} className={`dashboard-kpi-card ${item.tone}`}>
            <span>{item.label}</span>
            <strong>{loading ? "-" : item.value}</strong>
            <small>{item.detail}</small>
          </div>
        ))}
      </div>

      <div className="dashboard-analytics-grid">
        <div className="dashboard-panel dashboard-chart-panel">
          <div className="dashboard-panel-header">
            <div>
              <h3>Pending Requests by Sector</h3>
              <p>Shows where active review workload is concentrated.</p>
            </div>

            {analytics.pendingSectorTotal > 0 && (
              <span className="dashboard-chip">
                {analytics.pendingSectorTotal} pending
              </span>
            )}
          </div>

          {loading ? (
            <div className="dashboard-empty">Loading workload chart...</div>
          ) : chartData.length === 0 ? (
            <div className="dashboard-empty">No pending workload found.</div>
          ) : (
            <ResponsiveContainer width="100%" height={330}>
              <BarChart data={chartData} margin={{ top: 18, right: 12, left: 0, bottom: 12 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />

                <XAxis
                  dataKey="sector"
                  interval={0}
                  angle={-12}
                  textAnchor="end"
                  height={78}
                  tick={{ fontSize: 12, fill: "#475569" }}
                />

                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#475569" }} />

                <Tooltip
                  cursor={{ fill: "rgba(29, 78, 216, 0.08)" }}
                  formatter={(value) => [value, "Pending Requests"]}
                />

                <Bar
                  dataKey="pending_count"
                  name="Pending Requests"
                  radius={[6, 6, 0, 0]}
                  onClick={goToSubmittedRequests}
                  style={{
                    cursor: user?.role !== "traveler" ? "pointer" : "default",
                  }}
                >
                  {chartData.map((entry, index) => (
                    <Cell
                      key={entry.sector}
                      fill={chartColors[index % chartColors.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="dashboard-panel">
          <div className="dashboard-panel-header">
            <div>
              <h3>Decision Health</h3>
              <p>Completion quality and pending pressure across the workflow.</p>
            </div>
          </div>

          <div className="dashboard-decision-summary">
            <div>
              <span>Completed</span>
              <strong>{analytics.completed}</strong>
              <small>{analytics.completedShare}% of total</small>
            </div>
            <div>
              <span>Pending</span>
              <strong>{analytics.pending}</strong>
              <small>{analytics.pendingShare}% of total</small>
            </div>
          </div>

          <div className="dashboard-meter">
            <div className="dashboard-meter-row">
              <span>Approval Rate</span>
              <strong>{analytics.approvalRate}%</strong>
            </div>
            <div className="dashboard-meter-track">
              <div
                className="dashboard-meter-fill approved"
                style={{ width: `${analytics.approvalRate}%` }}
              />
            </div>
          </div>

          <div className="dashboard-meter">
            <div className="dashboard-meter-row">
              <span>Pending Share</span>
              <strong>{analytics.pendingShare}%</strong>
            </div>
            <div className="dashboard-meter-track">
              <div
                className="dashboard-meter-fill pending"
                style={{ width: `${analytics.pendingShare}%` }}
              />
            </div>
          </div>

          <div className="dashboard-insight-box">
            <span>Highest active workload</span>
            <strong>
              {analytics.topPendingSector
                ? analytics.topPendingSector.sector
                : "No active sector"}
            </strong>
            <p>
              {analytics.topPendingSector
                ? `${analytics.topPendingSector.pending_count} pending request(s), ${analytics.concentration}% of active sector workload.`
                : "No pending sector workload is currently assigned."}
            </p>
          </div>

          <div className="dashboard-actions">
            {actionCards.map((item) => (
              <button type="button" key={item.title} onClick={item.onClick}>
                <span>{item.title}</span>
                <small>{item.detail}</small>
                <strong>{item.action}</strong>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default DashboardStats;
