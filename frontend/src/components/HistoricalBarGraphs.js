import { useEffect, useState } from 'react';
import API from '../services/api';
import './HistoricalBarGraphs.css';

function HistoricalBarGraphs() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const [summary, setSummary] = useState({
    moaVsAffiliate: [],
    sectors: [],
    affiliateOrganizations: [],
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSummary();
  }, []);

  const fetchSummary = async () => {
    try {
      setLoading(true);

      const response = await API.get(
        `/dashboard/historical-organization-summary?role=${user.role}`
      );

      setSummary(response.data || {
        moaVsAffiliate: [],
        sectors: [],
        affiliateOrganizations: [],
      });
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getMax = (items) => {
    if (!items || items.length === 0) return 1;
    return Math.max(...items.map((item) => Number(item.count) || 0), 1);
  };

  const renderBarChart = (title, items, emptyMessage) => {
    const max = getMax(items);

    return (
      <div className="history-chart-card">
        <div className="history-chart-header">
          <h3>{title}</h3>
        </div>

        {items.length === 0 ? (
          <div className="history-chart-empty">
            {emptyMessage}
          </div>
        ) : (
          <div className="history-bars">
            {items.map((item) => {
              const label = item.category || item.name || 'Unassigned';
              const count = Number(item.count) || 0;
              const width = `${Math.max((count / max) * 100, 6)}%`;

              return (
                <div className="history-bar-row" key={label}>
                  <div className="history-bar-label">
                    {label}
                  </div>

                  <div className="history-bar-track">
                    <div
                      className="history-bar-fill"
                      style={{ width }}
                    >
                      <span>{count}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  if (!['office_head', 'minister', 'admin', 'super_admin'].includes(user.role)) {
    return null;
  }

  return (
    <div className="history-chart-section">
      <div className="history-chart-title">
        <h2>Historical Travel Summary</h2>
        <p>
          Summary of approved and rejected travel requests by organization type,
          MoA sector, and affiliate institute.
        </p>
      </div>

      {loading ? (
        <div className="history-loading">Loading charts...</div>
      ) : (
        <div className="history-chart-grid">
          {renderBarChart(
            'MoA vs Affiliate Institute',
            summary.moaVsAffiliate || [],
            'No historical organization data found.'
          )}

          {renderBarChart(
            'MoA Requests by Sector',
            summary.sectors || [],
            'No MoA sector data found.'
          )}

          {renderBarChart(
            'Affiliate Requests by Organization',
            summary.affiliateOrganizations || [],
            'No affiliate institute data found.'
          )}
        </div>
      )}
    </div>
  );
}

export default HistoricalBarGraphs;