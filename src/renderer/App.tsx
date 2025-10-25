import { useState, useEffect } from 'react';
import DepsCheck from './components/DepsCheck';
import Reports from './components/Reports';
import ReportWithChat from './components/ReportWithChat';
import Stats from './components/Stats';
import type { DependencyStatus, ResearchRequest } from '../shared/types';
import './utils/metadataViewer'; // Load metadata viewer utilities
import './App.css';

interface BackgroundTask {
  id: string;
  type: 'research' | 'reevaluate';
  ticker: string;
  companyName?: string;
  reportPath?: string;
  output: string[];
  status: 'running' | 'completed' | 'error';
  startTime: Date;
  endTime?: Date;
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
}

interface ResearchMetadata {
  id: string;
  ticker: string;
  type: 'research' | 'reevaluate';
  timestamp: string;
  startTime: string;
  endTime: string;
  duration: number; // in milliseconds
  usage: {
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
  };
  cost: {
    input_cost: number;
    output_cost: number;
    total_cost: number;
  };
  logs: string[];
  reportPath?: string;
}

// Claude 3.5 Sonnet pricing (as of 2024)
// Source: https://www.anthropic.com/api
const PRICING = {
  INPUT_PER_MILLION: 3.00,   // $3.00 per million input tokens
  OUTPUT_PER_MILLION: 15.00  // $15.00 per million output tokens
};

function calculateCost(inputTokens: number, outputTokens: number) {
  const inputCost = (inputTokens / 1_000_000) * PRICING.INPUT_PER_MILLION;
  const outputCost = (outputTokens / 1_000_000) * PRICING.OUTPUT_PER_MILLION;
  return {
    input_cost: inputCost,
    output_cost: outputCost,
    total_cost: inputCost + outputCost
  };
}

function saveResearchMetadata(metadata: ResearchMetadata) {
  try {
    const key = 'researchMetadata';
    const existingData = localStorage.getItem(key);
    const allMetadata: ResearchMetadata[] = existingData ? JSON.parse(existingData) : [];
    
    allMetadata.push(metadata);
    localStorage.setItem(key, JSON.stringify(allMetadata));
    
    console.log('💾 Saved research metadata:', metadata);
  } catch (error) {
    console.error('Failed to save research metadata:', error);
  }
}

function App() {
  const [depsStatus, setDepsStatus] = useState<DependencyStatus | null>(null);
  const [depsChecked, setDepsChecked] = useState(false);
  const [selectedReport, setSelectedReport] = useState<string | undefined>();
  const [currentView, setCurrentView] = useState<'dashboard' | 'stats' | 'report-with-chat'>('dashboard');
  const [initialChatOpen, setInitialChatOpen] = useState(false);
  const [backgroundTasks, setBackgroundTasks] = useState<BackgroundTask[]>([]);
  const [showApiKeyPrompt, setShowApiKeyPrompt] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [pendingReevaluate, setPendingReevaluate] = useState<string | null>(null);

  useEffect(() => {
    checkDependencies();
  }, []);

  const checkDependencies = async () => {
    const status = await window.electronAPI.checkDependencies();
    setDepsStatus(status);
    setDepsChecked(true);
  };

  const allDepsReady = depsStatus && 
    depsStatus.codex.installed &&
    depsStatus.codex.authenticated;

  if (!depsChecked) {
    return (
      <div className="app loading">
        <div className="loading-spinner"></div>
        <p>Checking dependencies...</p>
      </div>
    );
  }

  if (!allDepsReady) {
    return <DepsCheck status={depsStatus!} onComplete={checkDependencies} />;
  }

  const handleOpenReport = (reportPath: string) => {
    setSelectedReport(reportPath);
    setInitialChatOpen(false);
    setCurrentView('report-with-chat');
  };

  const handleChatWithReport = (reportPath: string) => {
    setSelectedReport(reportPath);
    setInitialChatOpen(true);
    setCurrentView('report-with-chat');
  };

  const handleBackToDashboard = () => {
    setSelectedReport(undefined);
    setInitialChatOpen(false);
    setCurrentView('dashboard');
  };

  const startBackgroundResearch = async (
    mode: 'new' | 'reevaluate',
    ticker: string,
    companyName?: string,
    reportPath?: string
  ) => {
    // Create background task
    const taskId = `${ticker}-${Date.now()}`;
    const newTask: BackgroundTask = {
      id: taskId,
      type: mode === 'reevaluate' ? 'reevaluate' : 'research',
      ticker: ticker.toUpperCase(),
      companyName,
      reportPath,
      output: [],
      status: 'running',
      startTime: new Date()
    };

    setBackgroundTasks(prev => [...prev, newTask]);

    // Set up event handlers for this specific task
    const cleanupOutput = window.electronAPI.onDockerOutput((data) => {
      setBackgroundTasks(prev => prev.map(task => 
        task.id === taskId 
          ? { ...task, output: [...task.output, data.data] }
          : task
      ));
    });

    const cleanupComplete = window.electronAPI.onProcessComplete(async (result: any) => {
      const endTime = new Date();
      
      // Extract usage from result if available
      const usage = result?.usage;
      
      setBackgroundTasks(prev => prev.map(task => {
        if (task.id === taskId) {
          // Save metadata to localStorage
          if (usage) {
            const metadata: ResearchMetadata = {
              id: taskId,
              ticker: task.ticker,
              type: task.type,
              timestamp: new Date().toISOString(),
              startTime: task.startTime.toISOString(),
              endTime: endTime.toISOString(),
              duration: endTime.getTime() - task.startTime.getTime(),
              usage: {
                input_tokens: usage.input_tokens,
                output_tokens: usage.output_tokens,
                total_tokens: usage.input_tokens + usage.output_tokens
              },
              cost: calculateCost(usage.input_tokens, usage.output_tokens),
              logs: task.output,
              reportPath: result?.path
            };
            
            saveResearchMetadata(metadata);
          }
          
          return { 
            ...task, 
            status: 'completed' as const,
            endTime,
            usage
          };
        }
        return task;
      }));
      
      // Auto-remove completed task after 5 seconds
      setTimeout(() => {
        setBackgroundTasks(prev => prev.filter(task => task.id !== taskId));
      }, 5000);
    });

    const cleanupError = window.electronAPI.onProcessError((error) => {
      setBackgroundTasks(prev => prev.map(task => 
        task.id === taskId 
          ? { ...task, output: [...task.output, `\n❌ Error: ${error}\n`], status: 'error' as const }
          : task
      ));
    });

    try {
      const request: ResearchRequest = {
        ticker: newTask.ticker,
        companyName: newTask.companyName,
        reportPath: mode === 'reevaluate' ? reportPath : undefined
      };

      await window.electronAPI.runResearch(request);
    } catch (error) {
      console.error('Research error:', error);
      setBackgroundTasks(prev => prev.map(task => 
        task.id === taskId 
          ? { ...task, status: 'error' as const, output: [...task.output, `\n❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}\n`] }
          : task
      ));
    } finally {
      cleanupOutput();
      cleanupComplete();
      cleanupError();
    }
  };

  const handleReevaluate = async (reportPath: string) => {
    // Check for API key
    const hasKey = await window.electronAPI.hasAlphaVantageApiKey();
    if (!hasKey) {
      setPendingReevaluate(reportPath);
      setShowApiKeyPrompt(true);
      return;
    }

    // Extract ticker from report path
    const match = reportPath.match(/research-([A-Z]+)-/);
    if (match) {
      const ticker = match[1];
      // Start reevaluation in the background without navigating
      startBackgroundResearch('reevaluate', ticker, undefined, reportPath);
    }
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
      
      // Start pending reevaluation if any
      if (pendingReevaluate) {
        const match = pendingReevaluate.match(/research-([A-Z]+)-/);
        if (match) {
          const ticker = match[1];
          startBackgroundResearch('reevaluate', ticker, undefined, pendingReevaluate);
        }
        setPendingReevaluate(null);
      }
    } catch (error) {
      alert('Failed to save API key');
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <h1>familyoffice</h1>
          {currentView !== 'report-with-chat' && (
            <nav className="header-nav">
              <button
                className={`nav-button ${currentView === 'dashboard' ? 'active' : ''}`}
                onClick={() => setCurrentView('dashboard')}
              >
                📄 Reports
              </button>
              <button
                className={`nav-button ${currentView === 'stats' ? 'active' : ''}`}
                onClick={() => setCurrentView('stats')}
              >
                📊 Stats
              </button>
            </nav>
          )}
        </div>
      </header>

      <main className="app-content">
        {currentView === 'report-with-chat' && selectedReport ? (
          <ReportWithChat
            reportPath={selectedReport}
            onBack={handleBackToDashboard}
            onReevaluate={handleReevaluate}
            initialChatOpen={initialChatOpen}
            backgroundTasks={backgroundTasks}
            onDismissTask={(taskId) => setBackgroundTasks(prev => prev.filter(t => t.id !== taskId))}
          />
        ) : currentView === 'stats' ? (
          <Stats />
        ) : (
          <Reports 
            onOpenReport={handleOpenReport}
            onChat={handleChatWithReport}
            onStartResearch={startBackgroundResearch}
            backgroundTasks={backgroundTasks}
            onDismissTask={(taskId) => setBackgroundTasks(prev => prev.filter(t => t.id !== taskId))}
          />
        )}
      </main>

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

export default App;

