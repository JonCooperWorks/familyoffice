import { useState, useEffect } from 'react';
import { getAllMetadata, getMetadataStats, exportMetadata, clearMetadata, formatCost, formatDuration, type ResearchMetadata } from '../utils/metadataViewer';
import './Stats.css';

function Stats() {
  const [metadata, setMetadata] = useState<ResearchMetadata[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'date' | 'cost' | 'tokens'>('date');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const allMetadata = await getAllMetadata();
    setMetadata(allMetadata);
    const statsData = await getMetadataStats();
    setStats(statsData);
  };

  const handleExport = async () => {
    await exportMetadata();
  };

  const handleClear = async () => {
    const cleared = await clearMetadata();
    if (cleared) {
      await loadData();
    }
  };

  const filteredMetadata = selectedTicker
    ? metadata.filter(m => m.ticker === selectedTicker)
    : metadata;

  const sortedMetadata = [...filteredMetadata].sort((a, b) => {
    switch (sortBy) {
      case 'date':
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      case 'cost':
        return b.cost.total_cost - a.cost.total_cost;
      case 'tokens':
        return b.usage.total_tokens - a.usage.total_tokens;
      default:
        return 0;
    }
  });

  if (!stats || metadata.length === 0) {
    return (
      <div className="stats">
        <div className="stats-header">
          <h2>Usage Statistics</h2>
          <p className="description">Track your API usage, costs, and performance metrics</p>
        </div>

        <div className="empty-state">
          <div className="empty-icon">📊</div>
          <h3>No usage data yet</h3>
          <p>Complete a research run to see your usage statistics here</p>
        </div>
      </div>
    );
  }

  const uniqueTickers = Array.from(new Set(metadata.map(m => m.ticker))).sort();

  return (
    <div className="stats">
      <div className="stats-header">
        <div>
          <h2>Usage Statistics</h2>
          <p className="description">Track your API usage, costs, and performance metrics</p>
        </div>
        <div className="header-actions">
          <button onClick={handleExport} className="action-button">
            📥 Export Data
          </button>
          <button onClick={handleClear} className="action-button delete">
            🗑️ Clear All
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="stats-summary">
        <div className="stat-card">
          <div className="stat-icon">🔢</div>
          <div className="stat-content">
            <div className="stat-label">Total Runs</div>
            <div className="stat-value">{stats.totalRuns}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">🎫</div>
          <div className="stat-content">
            <div className="stat-label">Total Tokens</div>
            <div className="stat-value">{stats.totalTokens.toLocaleString()}</div>
          </div>
        </div>

        <div className="stat-card highlight">
          <div className="stat-icon">💰</div>
          <div className="stat-content">
            <div className="stat-label">Total Cost</div>
            <div className="stat-value">{formatCost(stats.totalCost)}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <div className="stat-label">Avg. Cost</div>
            <div className="stat-value">{formatCost(stats.averageCost)}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">⏱️</div>
          <div className="stat-content">
            <div className="stat-label">Avg. Duration</div>
            <div className="stat-value">{formatDuration(stats.averageDuration)}</div>
          </div>
        </div>
      </div>

      {/* By Type Breakdown */}
      {stats.byType && (
        <div className="stats-section">
          <h3>By Type</h3>
          <div className="type-breakdown">
            {Object.entries(stats.byType).map(([type, count]) => (
              <div key={type} className="type-item">
                <span className="type-name">{type}</span>
                <span className="type-count">{count as number}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top Tickers */}
      {stats.byTicker && Object.keys(stats.byTicker).length > 0 && (
        <div className="stats-section">
          <h3>By Ticker</h3>
          <div className="ticker-breakdown">
            {Object.entries(stats.byTicker)
              .sort((a, b) => b[1].totalCost - a[1].totalCost)
              .slice(0, 10)
              .map(([ticker, data]: [string, any]) => (
                <div key={ticker} className="ticker-item">
                  <div className="ticker-info">
                    <span className="ticker-symbol">{ticker}</span>
                    <span className="ticker-runs">{data.count} runs</span>
                  </div>
                  <div className="ticker-cost">{formatCost(data.totalCost)}</div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Filters and Sorting */}
      <div className="stats-section">
        <div className="section-header">
          <h3>Recent Activity</h3>
          <div className="controls">
            <select
              value={selectedTicker || ''}
              onChange={(e) => setSelectedTicker(e.target.value || null)}
              className="filter-select"
            >
              <option value="">All Tickers</option>
              {uniqueTickers.map(ticker => (
                <option key={ticker} value={ticker}>{ticker}</option>
              ))}
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="sort-select"
            >
              <option value="date">Sort by Date</option>
              <option value="cost">Sort by Cost</option>
              <option value="tokens">Sort by Tokens</option>
            </select>
          </div>
        </div>

        {/* Activity Table */}
        <div className="activity-table">
          <table>
            <thead>
              <tr>
                <th>Ticker</th>
                <th>Type</th>
                <th>Date</th>
                <th>Duration</th>
                <th>Tokens</th>
                <th>Cost</th>
              </tr>
            </thead>
            <tbody>
              {sortedMetadata.map((item) => (
                <tr key={item.id}>
                  <td className="ticker-cell">{item.ticker}</td>
                  <td>
                    <span className={`type-badge ${item.type}`}>
                      {item.type}
                    </span>
                  </td>
                  <td className="date-cell">
                    {new Date(item.timestamp).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </td>
                  <td>{formatDuration(item.duration)}</td>
                  <td className="tokens-cell">
                    <div className="token-breakdown">
                      <span className="total">{item.usage.total_tokens.toLocaleString()}</span>
                      <span className="detail">
                        {item.usage.input_tokens.toLocaleString()} in / {item.usage.output_tokens.toLocaleString()} out
                      </span>
                    </div>
                  </td>
                  <td className="cost-cell">
                    <div className="cost-breakdown">
                      <span className="total">{formatCost(item.cost.total_cost)}</span>
                      <span className="detail">
                        {formatCost(item.cost.input_cost)} + {formatCost(item.cost.output_cost)}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pricing Information */}
      <div className="stats-section pricing-info">
        <h3>Pricing Information</h3>
        <p>Current rates for Claude 3.5 Sonnet:</p>
        <ul>
          <li>Input tokens: $3.00 per million tokens</li>
          <li>Output tokens: $15.00 per million tokens</li>
        </ul>
        <p className="note">
          💡 Tip: Export your data regularly for long-term tracking and analysis
        </p>
      </div>
    </div>
  );
}

export default Stats;

