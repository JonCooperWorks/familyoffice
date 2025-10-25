import { useState, useEffect } from 'react';
import type { Report } from '../../shared/types';
import './Reports.css';

interface BackgroundTask {
  id: string;
  type: 'research' | 'reevaluate';
  ticker: string;
  companyName?: string;
  reportPath?: string;
  output: string[];
  status: 'running' | 'completed' | 'error';
  startTime: Date;
}

interface ReportsProps {
  onOpenReport: (reportPath: string) => void;
  onChat: (reportPath: string) => void;
  onStartResearch: (mode: 'new' | 'reevaluate', ticker: string, companyName?: string, reportPath?: string) => void;
  backgroundTasks: BackgroundTask[];
  onDismissTask: (taskId: string) => void;
}

function Reports({ onOpenReport, onChat, onStartResearch, backgroundTasks, onDismissTask }: ReportsProps) {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [showApiKeyPrompt, setShowApiKeyPrompt] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [pendingResearch, setPendingResearch] = useState<{ mode: 'new' | 'reevaluate', ticker: string, companyName?: string, reportPath?: string } | null>(null);

  useEffect(() => {
    loadReports();
    checkApiKey();
  }, []);

  const checkApiKey = async () => {
    const hasKey = await window.electronAPI.hasAlphaVantageApiKey();
    if (!hasKey) {
      setShowApiKeyPrompt(true);
    }
  };

  const loadReports = async () => {
    setLoading(true);
    try {
      const data = await window.electronAPI.getReports();
      setReports(data);
    } catch (error) {
      console.error('Failed to load reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = (report: Report) => {
    onOpenReport(report.path);
  };

  const handleDelete = async (report: Report) => {
    const confirmMessage = `Are you sure you want to delete the ${report.type} report for ${report.ticker}?\n\nThis action cannot be undone.`;
    
    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      const success = await window.electronAPI.deleteReport(report.path);
      
      if (success) {
        // Remove the report from the local state immediately
        setReports(prevReports => prevReports.filter(r => r.path !== report.path));
        console.log('Report deleted successfully:', report.filename);
      } else {
        alert('Failed to delete the report. Please try again.');
      }
    } catch (error) {
      console.error('Error deleting report:', error);
      alert('An error occurred while deleting the report. Please try again.');
    }
  };

  // Reload reports when background tasks complete
  useEffect(() => {
    const hasCompleted = backgroundTasks.some(task => task.status === 'completed');
    if (hasCompleted) {
      loadReports();
    }
  }, [backgroundTasks]);

  const handleResearchFromSearch = async () => {
    const hasKey = await window.electronAPI.hasAlphaVantageApiKey();
    if (!hasKey) {
      const tickerValue = searchTerm.toUpperCase();
      setPendingResearch({ mode: 'new', ticker: tickerValue });
      setShowApiKeyPrompt(true);
      return;
    }

    // Start research immediately without showing form
    const tickerValue = searchTerm.toUpperCase();
    setSearchTerm(''); // Clear search to show all reports while research runs
    onStartResearch('new', tickerValue);
  };

  const handleSaveApiKey = async () => {
    if (!apiKey.trim()) {
      alert('Please enter a valid API key');
      return;
    }

    try {
      await window.electronAPI.setAlphaVantageApiKey(apiKey);
      setShowApiKeyPrompt(false);
      setApiKey('');
      
      // Start pending research if any
      if (pendingResearch) {
        onStartResearch(pendingResearch.mode, pendingResearch.ticker, pendingResearch.companyName, pendingResearch.reportPath);
        if (pendingResearch.mode === 'new') {
          setSearchTerm(''); // Clear search after starting
        }
        setPendingResearch(null);
      }
    } catch (error) {
      alert('Failed to save API key');
    }
  };

  const filteredReports = reports.filter(report =>
    report.ticker.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const searchTickerExists = filteredReports.some(
    report => report.ticker.toLowerCase() === searchTerm.toLowerCase()
  );

  const showResearchButton = searchTerm.length > 0 && !searchTickerExists;

  if (loading) {
    return (
      <div className="reports loading">
        <div className="loading-spinner"></div>
        <p>Loading reports...</p>
      </div>
    );
  }


  const handleViewProgress = (taskId: string) => {
    setSelectedTaskId(taskId);
    setShowProgressModal(true);
  };


  return (
    <div className="reports">
      <div className="reports-header">
        <div>
          <h2>Research Reports</h2>
          <p className="description">Search for existing reports or research a new stock</p>
        </div>
      </div>

      {/* Background Tasks Indicator */}
      {backgroundTasks.length > 0 && (
        <div className="background-tasks">
          <h3>Background Tasks</h3>
          {backgroundTasks.map(task => (
            <div key={task.id} className={`task-indicator ${task.status}`}>
              <div className="task-info">
                <span className="task-ticker">{task.ticker}</span>
                <span className="task-type">
                  {task.type === 'reevaluate' ? 'Reevaluating' : 'Researching'}
                </span>
                <span className="task-status">
                  {task.status === 'running' ? (
                    <><span className="spinner">⟳</span> Running</>
                  ) : task.status === 'completed' ? (
                    '✅ Completed'
                  ) : (
                    '❌ Error'
                  )}
                </span>
              </div>
              <div className="task-actions">
                <button 
                  onClick={() => handleViewProgress(task.id)}
                  className="view-progress-btn"
                >
                  View Progress
                </button>
                {task.status !== 'running' && (
                  <button 
                    onClick={() => onDismissTask(task.id)}
                    className="dismiss-btn"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="search-bar">
        <input
          type="text"
          placeholder="Search by ticker..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value.toUpperCase())}
          className="search-input"
        />
        {showResearchButton && (
          <button 
            onClick={handleResearchFromSearch} 
            className="research-ticker-button"
          >
            Research {searchTerm.toUpperCase()}
          </button>
        )}
      </div>

      {filteredReports.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📄</div>
          <h3>No reports found</h3>
          <p>
            {searchTerm 
              ? `No reports found for "${searchTerm}"` 
              : 'Search for a ticker to get started'}
          </p>
        </div>
      ) : (
        <div className="reports-grid">
          {filteredReports.map((report) => (
            <div key={report.path} className="report-card">
              <div className="report-header">
                <div>
                  <h3 className="report-ticker">{report.ticker}</h3>
                </div>
                <span className={`report-type ${report.type}`}>
                  {report.type === 'reevaluation' ? 'Reevaluation' : 'Research'}
                </span>
              </div>

              <div className="report-meta">
                <span className="report-date">
                  {new Date(report.date).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>

              <div className="report-actions">
                <button
                  onClick={() => handleOpen(report)}
                  className="action-button primary"
                  title="Open report"
                >
                  Open
                </button>
                <button
                  onClick={() => onChat(report.path)}
                  className="action-button"
                  title="Chat with this report"
                >
                  Chat
                </button>
                <button
                  onClick={() => handleDelete(report)}
                  className="action-button delete"
                  title="Delete this report"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Progress Modal */}
      {showProgressModal && selectedTaskId && (
        <div className="modal-overlay" onClick={() => setShowProgressModal(false)}>
          <div className="progress-modal" onClick={e => e.stopPropagation()}>
            {(() => {
              const task = backgroundTasks.find(t => t.id === selectedTaskId);
              if (!task) return null;
              
              return (
                <>
                  <div className="progress-header">
                    <h2>{task.ticker} - {task.type === 'reevaluate' ? 'Reevaluation' : 'Research'}</h2>
                    <button 
                      onClick={() => setShowProgressModal(false)}
                      className="close-modal-button"
                    >
                      ✕
                    </button>
                  </div>
                  
                  <div className="progress-info">
                    <div className="progress-status">
                      <span className={`status-indicator ${task.status}`}>
                        {task.status === 'running' ? (
                          <><span className="spinner">⟳</span> Running</>
                        ) : task.status === 'completed' ? (
                          '✅ Completed'
                        ) : (
                          '❌ Error'
                        )}
                      </span>
                      <span className="start-time">
                        Started: {task.startTime.toLocaleTimeString()}
                      </span>
                    </div>
                    
                    {task.companyName && (
                      <p className="company-name">Company: {task.companyName}</p>
                    )}
                    
                    {task.reportPath && (
                      <p className="report-path">Report: {task.reportPath}</p>
                    )}
                  </div>

                  <div className="progress-output">
                    <h3>Output</h3>
                    <pre className="output">{task.output.join('')}</pre>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* API Key Prompt Modal */}
      {showApiKeyPrompt && (
        <div className="modal-overlay" onClick={() => setShowApiKeyPrompt(false)}>
          <div className="modal-content api-key-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Alpha Vantage API Key Required</h2>
              <button className="close-button" onClick={() => setShowApiKeyPrompt(false)}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              <p>An Alpha Vantage API key is required to fetch market data.</p>
              <p className="api-key-info">
                Get a free API key at:{' '}
                <a href="https://www.alphavantage.co/support/#api-key" target="_blank" rel="noopener noreferrer">
                  https://www.alphavantage.co/support/#api-key
                </a>
              </p>
              <div className="form-group">
                <label htmlFor="apiKey">API Key</label>
                <input
                  id="apiKey"
                  type="text"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Enter your Alpha Vantage API key"
                  autoFocus
                />
              </div>
              <div className="modal-actions">
                <button onClick={() => setShowApiKeyPrompt(false)} className="cancel-button">
                  Cancel
                </button>
                <button onClick={handleSaveApiKey} className="save-button">
                  Save & Continue
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Reports;

