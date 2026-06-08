import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Card, EmptyState, Notice } from '../../src/components/ui';
import { useAuth } from '../../src/context/AuthContext';
import API, { getApiErrorMessage } from '../../src/services/api';
import { colors } from '../../src/styles/theme';
import { formatStage } from '../../src/utils/format';

const REPORT_ROLES = ['admin', 'super_admin', 'minister', 'office_head'];

const statusLabels = {
  approved: 'Approved',
  rejected: 'Rejected',
  pending: 'Pending',
  amended: 'Returned',
};

export default function ReportsScreen() {
  const { user } = useAuth();
  const canViewReports = REPORT_ROLES.includes(user?.role);
  const isMinister = user?.role === 'minister';
  const [statusSummary, setStatusSummary] = useState([]);
  const [sectorStatus, setSectorStatus] = useState([]);
  const [monthlyRequests, setMonthlyRequests] = useState([]);
  const [stageSummary, setStageSummary] = useState([]);
  const [officeSummary, setOfficeSummary] = useState({
    moaVsAffiliate: [],
    moaBySector: [],
    affiliateByOrganization: [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadReports = useCallback(async () => {
    if (!canViewReports) return;

    try {
      setLoading(true);
      setError('');

      const results = await Promise.allSettled([
        API.get('/reports/status-summary'),
        API.get('/reports/sector-status'),
        API.get('/reports/monthly-requests'),
        API.get('/reports/stage-summary'),
        API.get('/reports/office-minister-summary'),
      ]);

      if (results[0].status === 'fulfilled') setStatusSummary(results[0].value.data || []);
      if (results[1].status === 'fulfilled') setSectorStatus(results[1].value.data || []);
      if (results[2].status === 'fulfilled') setMonthlyRequests(results[2].value.data || []);
      if (results[3].status === 'fulfilled') setStageSummary(results[3].value.data || []);
      if (results[4].status === 'fulfilled') {
        setOfficeSummary(results[4].value.data || {});
      }

      const failed = results.find((item) => item.status === 'rejected');
      if (failed) {
        setError(getApiErrorMessage(failed.reason, 'Some report data could not be loaded.'));
      }
    } finally {
      setLoading(false);
    }
  }, [canViewReports]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const analytics = useMemo(() => {
    const getCount = (status) =>
      Number(statusSummary.find((item) => item.status === status)?.count || 0);
    const total = statusSummary.reduce((sum, item) => sum + Number(item.count || 0), 0);
    const approved = getCount('approved');
    const rejected = getCount('rejected');
    const pending = getCount('pending');
    const amended = getCount('amended');
    const decided = approved + rejected;

    return {
      total,
      approved,
      rejected,
      pending,
      amended,
      approvalRate: decided ? Math.round((approved / decided) * 100) : 0,
    };
  }, [statusSummary]);

  const sectorRows = useMemo(() => {
    const grouped = new Map();

    sectorStatus.forEach((item) => {
      const key = item.sector || 'Unassigned';
      const current = grouped.get(key) || {
        name: key,
        approved: 0,
        rejected: 0,
        pending: 0,
        amended: 0,
        total: 0,
      };
      const status = item.final_status || 'pending';
      current[status] = Number(item.count || 0);
      current.total += Number(item.count || 0);
      grouped.set(key, current);
    });

    return [...grouped.values()].sort((a, b) => b.total - a.total);
  }, [sectorStatus]);

  const monthlyTrend = useMemo(
    () =>
      monthlyRequests.map((item) => ({
        label: item.month,
        value: Number(item.total || 0),
      })),
    [monthlyRequests]
  );

  const topSector = sectorRows[0] || null;
  const activeStages = stageSummary
    .filter((item) => Number(item.count || 0) > 0)
    .sort((a, b) => Number(b.count || 0) - Number(a.count || 0));

  if (!canViewReports) {
    return (
      <ScrollView style={styles.page} contentContainerStyle={styles.content}>
        <EmptyState
          title="Reports access restricted"
          message="Analytical reports are available for Admin, Super Admin, Minister, and Office Head roles."
        />
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={loadReports} />}
    >
      <View style={styles.header}>
        <Text style={styles.kicker}>FTMS Reports</Text>
        <Text style={styles.title}>{isMinister ? 'Minister Report' : 'Ministry Analytics'}</Text>
        <Text style={styles.subtitle}>
          {isMinister
            ? 'Executive view of travel approvals, active workload, and monthly travel movement.'
            : 'Status, workload, sector, and organization-level travel reports.'}
        </Text>
      </View>

      {error ? <Notice type="error">{error}</Notice> : null}

      <View style={styles.grid}>
        <Metric label="Total Requests" value={analytics.total} />
        <Metric label="Approved" value={analytics.approved} />
        <Metric label="Pending" value={analytics.pending} />
        <Metric label="Approval Rate" value={`${analytics.approvalRate}%`} />
      </View>

      {isMinister ? (
        <ReportCard title="Executive Snapshot">
          <View style={styles.insightGrid}>
            <Insight
              label="Decision Balance"
              value={`${analytics.approvalRate}%`}
              detail={`${analytics.approved} approved, ${analytics.rejected} rejected`}
            />
            <Insight
              label="Active Workload"
              value={analytics.pending}
              detail={`${analytics.amended} returned for correction`}
            />
            <Insight
              label="Top Sector"
              value={topSector?.name || '-'}
              detail={topSector ? `${topSector.total} total request(s)` : 'No sector activity'}
            />
          </View>
        </ReportCard>
      ) : null}

      <ReportCard title={isMinister ? 'Approved Travel Trend' : 'Approved Travel by Month'}>
        <LineTrendChart rows={monthlyTrend} />
      </ReportCard>

      <ReportCard title="Status Summary">
        <BarRows
          rows={[
            { name: 'Approved', count: analytics.approved },
            { name: 'Rejected', count: analytics.rejected },
            { name: 'Pending', count: analytics.pending },
            { name: 'Returned', count: analytics.amended },
          ]}
        />
      </ReportCard>

      <ReportCard title={isMinister ? 'Active Workflow Workload' : 'Workflow Stage Workload'}>
        <BarRows
          rows={(isMinister ? activeStages : stageSummary).map((item) => ({
            name: formatStage(item.current_stage),
            count: Number(item.count || 0),
          }))}
        />
      </ReportCard>

      <ReportCard title="Sector Status">
        {sectorRows.length ? (
          sectorRows.map((item) => (
            <View key={item.name} style={styles.tableRow}>
              <View style={styles.tableMain}>
                <Text style={styles.rowTitle}>{item.name}</Text>
                <Text style={styles.rowMeta}>
                  {item.approved} approved | {item.pending} pending | {item.rejected} rejected
                </Text>
              </View>
              <Text style={styles.rowCount}>{item.total}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>No sector data available.</Text>
        )}
      </ReportCard>

      <ReportCard title="Office Head and Minister Report">
        <Text style={styles.sectionLabel}>MoA vs Affiliate</Text>
        <BarRows rows={(officeSummary.moaVsAffiliate || []).map(toNameCount)} />

        <Text style={styles.sectionLabel}>MoA by Sector</Text>
        <BarRows rows={(officeSummary.moaBySector || []).map(toNameCount)} />

        <Text style={styles.sectionLabel}>Affiliate Organizations</Text>
        <BarRows rows={(officeSummary.affiliateByOrganization || []).map(toNameCount)} />
      </ReportCard>
    </ScrollView>
  );
}

function toNameCount(item) {
  return {
    name: item.name || item.sector || item.status || statusLabels[item.final_status] || 'Unassigned',
    count: Number(item.count || item.total || 0),
  };
}

function Metric({ label, value }) {
  return (
    <Card style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </Card>
  );
}

function Insight({ label, value, detail }) {
  return (
    <View style={styles.insight}>
      <Text style={styles.insightLabel}>{label}</Text>
      <Text style={styles.insightValue} numberOfLines={2}>{value}</Text>
      <Text style={styles.insightDetail}>{detail}</Text>
    </View>
  );
}

function ReportCard({ title, children }) {
  return (
    <Card style={styles.reportCard}>
      <Text style={styles.reportTitle}>{title}</Text>
      {children}
    </Card>
  );
}

function LineTrendChart({ rows }) {
  const [plotWidth, setPlotWidth] = useState(0);
  const cleanRows = rows.filter((item) => item.label);
  const max = Math.max(...cleanRows.map((item) => item.value), 0);
  const chartHeight = 148;
  const dotCount = cleanRows.length;
  const usableWidth = Math.max(plotWidth - 18, 1);

  if (!cleanRows.length) {
    return <Text style={styles.emptyText}>No monthly approved travel data available.</Text>;
  }

  const points = cleanRows.map((item, index) => {
    const x = dotCount === 1 ? usableWidth / 2 : (index / (dotCount - 1)) * usableWidth + 9;
    const y = max ? chartHeight - (item.value / max) * (chartHeight - 18) - 8 : chartHeight - 8;
    return { ...item, x, y };
  });

  return (
    <View style={styles.lineChart}>
      <View style={styles.chartPlot} onLayout={(event) => setPlotWidth(event.nativeEvent.layout.width)}>
        <View style={[styles.gridLine, { top: 16 }]} />
        <View style={[styles.gridLine, { top: 74 }]} />
        <View style={[styles.gridLine, { top: 132 }]} />

        {points.slice(0, -1).map((point, index) => (
          <LineSegment
            key={`${point.label}-${points[index + 1].label}`}
            from={point}
            to={points[index + 1]}
          />
        ))}

        {points.map((point) => (
          <View
            key={point.label}
            style={[
              styles.dot,
              {
                left: point.x,
                top: point.y,
              },
            ]}
          >
            <Text style={styles.dotValue}>{point.value}</Text>
          </View>
        ))}
      </View>

      <View style={styles.chartLabels}>
        {points.map((point) => (
          <Text key={point.label} style={styles.chartLabel} numberOfLines={1}>
            {point.label}
          </Text>
        ))}
      </View>
    </View>
  );
}

function LineSegment({ from, to }) {
  const left = from.x;
  const top = from.y;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);

  return (
    <View
      style={[
        styles.lineSegment,
        {
          left,
          top,
          width: length,
          transform: [{ rotate: `${angle}deg` }],
        },
      ]}
    />
  );
}

function BarRows({ rows }) {
  const cleanRows = rows.filter((item) => item.name);
  const max = Math.max(...cleanRows.map((item) => Number(item.count || 0)), 0);

  if (!cleanRows.length) {
    return <Text style={styles.emptyText}>No report data available.</Text>;
  }

  return cleanRows.map((item) => {
    const count = Number(item.count || 0);
    const width = max ? `${Math.max(6, Math.round((count / max) * 100))}%` : '6%';

    return (
      <View key={item.name} style={styles.barRow}>
        <View style={styles.barHeader}>
          <Text style={styles.barLabel} numberOfLines={2}>{item.name}</Text>
          <Text style={styles.barValue}>{count}</Text>
        </View>
        <View style={styles.track}>
          <View style={[styles.fill, { width }]} />
        </View>
      </View>
    );
  });
}

const styles = StyleSheet.create({
  page: { backgroundColor: colors.background },
  content: { padding: 16, paddingBottom: 28 },
  header: { marginBottom: 16 },
  kicker: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  title: {
    color: colors.text,
    fontSize: 25,
    fontWeight: '900',
    marginTop: 4,
  },
  subtitle: {
    color: colors.muted,
    lineHeight: 20,
    marginTop: 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metric: {
    flexGrow: 1,
    width: '47%',
  },
  metricLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800',
  },
  metricValue: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '900',
    marginTop: 6,
  },
  reportCard: {
    marginTop: 12,
  },
  reportTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 12,
  },
  insightGrid: {
    gap: 10,
  },
  insight: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
  },
  insightLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  insightValue: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '900',
    marginTop: 5,
  },
  insightDetail: {
    color: colors.muted,
    lineHeight: 19,
    marginTop: 4,
  },
  lineChart: {
    paddingTop: 4,
  },
  chartPlot: {
    backgroundColor: '#f8fbf9',
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    height: 164,
    overflow: 'hidden',
    position: 'relative',
  },
  gridLine: {
    backgroundColor: colors.border,
    height: 1,
    left: 0,
    opacity: 0.85,
    position: 'absolute',
    right: 0,
  },
  lineSegment: {
    backgroundColor: colors.accent,
    borderRadius: 99,
    height: 3,
    position: 'absolute',
    transformOrigin: 'left center',
  },
  dot: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderColor: '#fff',
    borderRadius: 10,
    borderWidth: 2,
    height: 20,
    justifyContent: 'center',
    marginLeft: -10,
    marginTop: -10,
    position: 'absolute',
    width: 20,
    zIndex: 2,
  },
  dotValue: {
    backgroundColor: colors.primary,
    borderRadius: 7,
    color: '#fff',
    fontSize: 9,
    fontWeight: '900',
    overflow: 'hidden',
    paddingHorizontal: 4,
    position: 'absolute',
    top: -22,
  },
  chartLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  chartLabel: {
    color: colors.muted,
    flex: 1,
    fontSize: 10,
    fontWeight: '800',
    textAlign: 'center',
  },
  barRow: {
    marginBottom: 12,
  },
  barHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  barLabel: {
    color: colors.text,
    flex: 1,
    fontWeight: '800',
    lineHeight: 19,
  },
  barValue: {
    color: colors.primary,
    fontWeight: '900',
  },
  track: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 8,
    height: 9,
    overflow: 'hidden',
  },
  fill: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    height: 9,
  },
  sectionLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '900',
    marginBottom: 8,
    marginTop: 4,
    textTransform: 'uppercase',
  },
  tableRow: {
    alignItems: 'center',
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 11,
  },
  tableMain: {
    flex: 1,
  },
  rowTitle: {
    color: colors.text,
    fontWeight: '900',
  },
  rowMeta: {
    color: colors.muted,
    lineHeight: 18,
    marginTop: 2,
  },
  rowCount: {
    color: colors.primary,
    fontSize: 18,
    fontWeight: '900',
  },
  emptyText: {
    color: colors.muted,
    lineHeight: 20,
  },
});
