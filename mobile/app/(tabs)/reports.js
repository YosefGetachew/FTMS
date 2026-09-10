import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Card, EmptyState, Notice } from '../../src/components/ui';
import { useAuth } from '../../src/context/AuthContext';
import API, { getApiErrorMessage } from '../../src/services/api';
import { colors } from '../../src/styles/theme';

const REPORT_ROLES = ['admin', 'super_admin', 'minister', 'office_head'];

export default function ReportsScreen() {
  const { user } = useAuth();
  const canViewReports = REPORT_ROLES.includes(user?.role);
  const isMinister = user?.role === 'minister';
  const [statusSummary, setStatusSummary] = useState([]);
  const [monthlyRequests, setMonthlyRequests] = useState([]);
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
        API.get('/reports/monthly-requests'),
        API.get('/reports/office-minister-summary'),
      ]);

      if (results[0].status === 'fulfilled') setStatusSummary(results[0].value.data || []);
      if (results[1].status === 'fulfilled') setMonthlyRequests(results[1].value.data || []);
      if (results[2].status === 'fulfilled') {
        setOfficeSummary(results[2].value.data || {});
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

  const monthlyTrend = useMemo(
    () =>
      monthlyRequests.map((item) => ({
        label: item.month,
        value: Number(item.total || 0),
      })),
    [monthlyRequests]
  );
  const moaAffiliateRows = useMemo(
    () => (officeSummary.moaVsAffiliate || []).map(toNameCount),
    [officeSummary.moaVsAffiliate]
  );
  const moaSectorRows = useMemo(
    () => (officeSummary.moaBySector || []).map(toNameCount),
    [officeSummary.moaBySector]
  );
  const affiliateRows = useMemo(
    () => (officeSummary.affiliateByOrganization || []).map(toNameCount),
    [officeSummary.affiliateByOrganization]
  );

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
          Approved travel trend and organization-level travel distribution.
        </Text>
      </View>

      {error ? <Notice type="error">{error}</Notice> : null}

      <View style={styles.grid}>
        <Metric label="Total Requests" value={analytics.total} />
        <Metric label="Approved" value={analytics.approved} />
        <Metric label="Pending" value={analytics.pending} />
        <Metric label="Approval Rate" value={`${analytics.approvalRate}%`} />
      </View>

      <ReportCard title="1. Approved Travel by Month">
        <LineTrendChart rows={monthlyTrend} />
      </ReportCard>

      <ReportCard title="2. Total Travel by MoA and Affiliate Institute">
        <BarRows rows={moaAffiliateRows} emptyMessage="No MoA or Affiliate Institute travel data available." />
      </ReportCard>

      <ReportCard title="3. Total MoA Travel by Sector">
        <BarRows rows={moaSectorRows} emptyMessage="No MoA sector travel data available." />
      </ReportCard>

      <ReportCard title="4. Total Affiliate Institute Travel by Organization">
        <BarRows rows={affiliateRows} emptyMessage="No affiliate organization travel data available." />
      </ReportCard>
    </ScrollView>
  );
}

function toNameCount(item) {
  return {
    name: item.name || item.sector || item.status || item.final_status || 'Unassigned',
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

function ReportCard({ title, children }) {
  return (
    <Card style={styles.reportCard}>
      <Text style={styles.reportTitle}>{title}</Text>
      {children}
    </Card>
  );
}

function LineTrendChart({ rows, emptyMessage = 'No monthly approved travel data available.' }) {
  const [plotWidth, setPlotWidth] = useState(0);
  const cleanRows = rows.filter((item) => item.label);
  const max = Math.max(...cleanRows.map((item) => item.value), 0);
  const chartHeight = 148;
  const dotCount = cleanRows.length;
  const usableWidth = Math.max(plotWidth - 18, 1);

  if (!cleanRows.length) {
    return <Text style={styles.emptyText}>{emptyMessage}</Text>;
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

function BarRows({ rows, emptyMessage = 'No report data available.' }) {
  const cleanRows = rows.filter((item) => item.name);
  const max = Math.max(...cleanRows.map((item) => Number(item.count || 0)), 0);

  if (!cleanRows.length) {
    return <Text style={styles.emptyText}>{emptyMessage}</Text>;
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
