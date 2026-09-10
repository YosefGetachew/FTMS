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
  LabelList,
} from "recharts";

import API from "../services/api";

const formatRole = (value) => {
  if (!value) return "User";

  const labels = {
    director_general: "Director General",
    pm_office: "PM Office",
  };

  if (labels[value]) return labels[value];

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

  if (role === "director_general") {
    return sector ? `${sector} affiliate institute review workload` : "Affiliate institute review workload";
  }

  if (role === "office_head") {
    return "Office Head clearance and final review workload";
  }

  if (role === "protocol") {
    return "Clear protocol reviews, remind decision makers, and submit approved requests to PM Office.";
  }

  if (role === "pm_office") {
    return "PM Office requests submitted by Protocol";
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

  if (role === "project_coordinator") {
    return department
      ? `${department} project coordinator workload`
      : "Assigned project coordinator workload";
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
    requestTypeCounts: {
      projectStaff: 0,
      advisor: 0,
      leadExecutiveStaff: 0,
      affiliateInstitute: 0,
    },
  });
  const [currentlyAbroadCount, setCurrentlyAbroadCount] = useState(0);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);

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

      const [statsResponse, chartResponse, abroadResponse] = await Promise.all([
        API.get(`/stats?role=${role}`),
        API.get(`/dashboard/pending-by-sector?role=${role}&id=${user.id}`),
        API.get('/reports/currently-abroad').catch(() => ({ data: { total: 0 } })),
      ]);

      setStats({
        totalRequests: statsResponse.data.totalRequests || 0,
        approvedRequests: statsResponse.data.approvedRequests || 0,
        pendingRequests: statsResponse.data.pendingRequests || 0,
        rejectedRequests: statsResponse.data.rejectedRequests || 0,
        requestTypeCounts: statsResponse.data.requestTypeCounts || {
          projectStaff: 0,
          advisor: 0,
          leadExecutiveStaff: 0,
          affiliateInstitute: 0,
        },
      });

      setCurrentlyAbroadCount(Number(abroadResponse.data?.total || 0));
      setChartData(normalizeSectorData(chartResponse.data || []));
      setLastUpdated(new Date());
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
      requestTypeCounts: {
        projectStaff: Number(stats.requestTypeCounts?.projectStaff || 0),
        advisor: Number(stats.requestTypeCounts?.advisor || 0),
        leadExecutiveStaff: Number(stats.requestTypeCounts?.leadExecutiveStaff || 0),
        affiliateInstitute: Number(stats.requestTypeCounts?.affiliateInstitute || 0),
      },
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

  const goToSubmittedRequests = (filter = null) => {
    if (!setActivePage) return;

    if (filter) {
      sessionStorage.setItem("ftmsRequestViewFilter", JSON.stringify(filter));
    } else {
      sessionStorage.removeItem("ftmsRequestViewFilter");
    }

    setActivePage("submitted-requests");
  };

  const canOpenQueue = Boolean(setActivePage);

  const handleMetricKeyDown = (event, onClick) => {
    if (!onClick) return;

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onClick();
    }
  };

  const kpis = [
    {
      label: "Total Requests",
      value: analytics.total,
      detail: "All travel requests",
      tone: "blue",
      meter: 100,
      onClick: canOpenQueue
        ? () => goToSubmittedRequests({ scope: "all", label: "Total Requests" })
        : null,
    },
    {
      label: "Approved",
      value: analytics.approved,
      detail: `${analytics.approvalRate}% approval rate`,
      tone: "green",
      meter: analytics.approvalRate,
      onClick: canOpenQueue
        ? () => goToSubmittedRequests({ scope: "historical", status: "approved", label: "Approved Requests" })
        : null,
    },
    {
      label: "Pending",
      value: analytics.pending,
      detail: "Still waiting",
      tone: "amber",
      meter: analytics.pendingShare,
      onClick: canOpenQueue
        ? () => goToSubmittedRequests({ scope: "active", status: "pending", label: "Pending Requests" })
        : null,
    },
    {
      label: "Rejected",
      value: analytics.rejected,
      detail: `${analytics.rejectionRate}% rejection rate`,
      tone: "rose",
      meter: analytics.rejectionRate,
      onClick: canOpenQueue
        ? () => goToSubmittedRequests({ scope: "historical", status: "rejected", label: "Rejected Requests" })
        : null,
    },
  ];

  const structureCounts = [
    {
      label: "Project Staff",
      value: analytics.requestTypeCounts.projectStaff,
      detail: "Project-based requests",
      tone: "blue",
      meter: analytics.total
        ? Math.round((analytics.requestTypeCounts.projectStaff / analytics.total) * 100)
        : 0,
      onClick: canOpenQueue
        ? () => goToSubmittedRequests({ scope: "all", travelerCategory: "project", label: "Project Staff Requests" })
        : null,
    },
    {
      label: "Advisors",
      value: analytics.requestTypeCounts.advisor,
      detail: "Advisor requests",
      tone: "green",
      meter: analytics.total
        ? Math.round((analytics.requestTypeCounts.advisor / analytics.total) * 100)
        : 0,
      onClick: canOpenQueue
        ? () => goToSubmittedRequests({ scope: "all", travelerCategory: "advisor", label: "Advisor Requests" })
        : null,
    },
    {
      label: "Staff under Lead Executive",
      value: analytics.requestTypeCounts.leadExecutiveStaff,
      detail: "Regular MoA staff",
      tone: "amber",
      meter: analytics.total
        ? Math.round((analytics.requestTypeCounts.leadExecutiveStaff / analytics.total) * 100)
        : 0,
      onClick: canOpenQueue
        ? () => goToSubmittedRequests({ scope: "all", travelerCategory: "lead_executive_staff", label: "Staff under Lead Executive Requests" })
        : null,
    },
    {
      label: "Affiliate Institute",
      value: analytics.requestTypeCounts.affiliateInstitute,
      detail: "Affiliate requests",
      tone: "rose",
      meter: analytics.total
        ? Math.round((analytics.requestTypeCounts.affiliateInstitute / analytics.total) * 100)
        : 0,
      onClick: canOpenQueue
        ? () => goToSubmittedRequests({ scope: "all", travelerCategory: "affiliate_institution", label: "Affiliate Institute Requests" })
        : null,
    },
  ];

  const actionCards = [
    {
      title: role === "protocol" ? "Open active requested travel" : "Review requests",
      detail:
        role === "protocol"
          ? "Clear protocol items or remind decision makers."
          : "Open the travel requests waiting for action.",
      action: "Open",
      tone: "teal",
      onClick: () => goToSubmittedRequests(),
      show: role !== "traveler",
    },
    {
      title: "Create request",
      detail: "Start a new foreign travel request.",
      action: "New",
      tone: "green",
      onClick: () => setActivePage && setActivePage("travel-request"),
      show: role !== "minister",
    },
    {
      title: "View reports",
      detail: "See travel summaries and trends.",
      action: "Reports",
      tone: "blue",
      onClick: () => setActivePage && setActivePage("reports"),
      show: canOpenReports,
    },
  ].filter((item) => item.show);

  const recommendedAction = useMemo(() => {
    if (role === "protocol" && analytics.pending > 0) {
      return {
        label: "Next step",
        title: "Open active requested travel",
        detail: `${analytics.pending} request(s) need protocol action or reminder follow-up.`,
      };
    }

    if (analytics.pending > 0 && role !== "traveler") {
      return {
        label: "Next step",
        title: "Review pending requests",
        detail: `${analytics.pending} request(s) are waiting for a decision.`,
      };
    }

    if (role !== "minister") {
      return {
        label: "Next step",
        title: "Create or track travel",
        detail: "Start a request or check existing travel progress.",
      };
    }

    return {
      label: "Next step",
      title: "Review reports",
      detail: "Open reports for ministry travel visibility.",
    };
  }, [analytics.pending, role]);

  const lastUpdatedLabel = lastUpdated
    ? lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "Not refreshed yet";

  const chartColors = ["#1d4ed8", "#15803d", "#b45309", "#7c3aed", "#0369a1"];

  const intelligenceItems = [
    {
      label: role === "protocol" ? "Active Requested Travel" : "Requests Needing Action",
      value: loading ? "-" : analytics.pending,
      helper:
        role === "protocol"
          ? "Clear, submit, or send reminders"
          : analytics.pending > 0
          ? "Waiting for decision"
          : "Nothing waiting",
    },
    {
      label: "Completion Rate",
      value: loading ? "-" : `${analytics.completedShare}%`,
      helper: `${analytics.completed} of ${analytics.total} finished`,
    },
    {
      label: "Staff Currently Abroad",
      value: loading ? "-" : currentlyAbroadCount,
      helper: "Approved and traveling now",
    },
    {
      label: "Your Role",
      value: dashboardContext.roleLabel,
      helper: dashboardContext.structure,
    },
  ];

  const renderMetricCard = (item) => {
    const clickable = Boolean(item.onClick);
    const meterValue = Math.max(0, Math.min(100, Number(item.meter || 0)));

    return (
      <div
        key={item.label}
        className={`dashboard-kpi-card ${item.tone} ${clickable ? "interactive" : ""}`}
        role={clickable ? "button" : undefined}
        tabIndex={clickable ? 0 : undefined}
        onClick={clickable ? item.onClick : undefined}
        onKeyDown={(event) => handleMetricKeyDown(event, item.onClick)}
        title={clickable ? "Open related view" : undefined}
      >
        <div className="dashboard-kpi-topline">
          <span>{item.label}</span>
          {clickable && <em>Open</em>}
        </div>
        <div className="dashboard-kpi-main">
          <strong>{loading ? "-" : item.value}</strong>
          <small>{item.detail}</small>
        </div>
        <div className="dashboard-kpi-meter" aria-hidden="true">
          <i style={{ width: `${meterValue}%` }} />
        </div>
      </div>
    );
  };

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <div>
          <span className="dashboard-eyebrow">Overview</span>
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

      <div className={`dashboard-smart-panel role-${role || "user"}`}>
        <div className="dashboard-smart-main">
          <span>{recommendedAction.label}</span>
          <h3>{recommendedAction.title}</h3>
          <p>{recommendedAction.detail}</p>
          <small>Last updated: {lastUpdatedLabel}</small>
        </div>

        <div className="dashboard-smart-metrics">
          {intelligenceItems.map((item) => (
            <div key={item.label}>
              <span>{item.label}</span>
              <strong title={item.value}>{item.value}</strong>
              <small title={item.helper}>{item.helper}</small>
            </div>
          ))}
        </div>

        {actionCards.length > 0 && (
          <div className="dashboard-smart-actions">
            {actionCards.map((item) => (
              <button
                type="button"
                key={item.title}
                className={`dashboard-action-tile ${item.tone}`}
                onClick={item.onClick}
              >
                <span>{item.action}</span>
                <strong>{item.title}</strong>
                <small>{item.detail}</small>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="dashboard-kpi-grid">
        {kpis.map(renderMetricCard)}
      </div>

      <div className="dashboard-panel" style={{ marginBottom: "24px" }}>
        <div className="dashboard-panel-header">
          <div>
            <h3>Requests by Traveler Type</h3>
            <p>Quick count of where requests came from.</p>
          </div>
        </div>

        <div className="dashboard-structure-strip">
          {structureCounts.map((item) => {
            const clickable = Boolean(item.onClick);
            const meterValue = Math.max(0, Math.min(100, Number(item.meter || 0)));

            return (
              <button
                type="button"
                key={item.label}
                className={`dashboard-structure-chip ${item.tone}`}
                onClick={clickable ? item.onClick : undefined}
                disabled={!clickable}
                title={clickable ? "Open related requests" : undefined}
              >
                <span>{item.label}</span>
                <strong>{loading ? "-" : item.value}</strong>
                <small>{item.detail}</small>
                <i aria-hidden="true">
                  <b style={{ width: `${meterValue}%` }} />
                </i>
              </button>
            );
          })}
        </div>
      </div>

      <div className="dashboard-analytics-grid">
        <div className="dashboard-panel dashboard-chart-panel">
          <div className="dashboard-panel-header">
            <div>
              <h3>Pending by Sector</h3>
              <p>Where requests are waiting now.</p>
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

                <YAxis hide allowDecimals={false} />

                <Tooltip
                  cursor={{ fill: "rgba(29, 78, 216, 0.08)" }}
                  formatter={(value) => [value, "Pending Requests"]}
                />

                <Bar
                  dataKey="pending_count"
                  name="Pending Requests"
                  radius={[6, 6, 0, 0]}
                  onClick={() => goToSubmittedRequests()}
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
                  <LabelList
                    dataKey="pending_count"
                    position="top"
                    fill="#0f172a"
                    fontSize={13}
                    fontWeight={700}
                  />
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
