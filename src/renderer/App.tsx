import { useState, useEffect } from 'react';
import DepsCheck from './components/DepsCheck';
import Reports from './components/Reports';
import ReportWithChat from './components/ReportWithChat';
import type { DependencyStatus } from '../shared/types';
import './App.css';

function App() {
  const [depsStatus, setDepsStatus] = useState<DependencyStatus | null>(null);
  const [depsChecked, setDepsChecked] = useState(false);
  const [selectedReport, setSelectedReport] = useState<string | undefined>();
  const [reportViewMode, setReportViewMode] = useState<'dashboard' | 'report-with-chat'>('dashboard');
  const [initialChatOpen, setInitialChatOpen] = useState(false);

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
    setReportViewMode('report-with-chat');
  };

  const handleChatWithReport = (reportPath: string) => {
    setSelectedReport(reportPath);
    setInitialChatOpen(true);
    setReportViewMode('report-with-chat');
  };

  const handleBackToDashboard = () => {
    setSelectedReport(undefined);
    setInitialChatOpen(false);
    setReportViewMode('dashboard');
  };

  const handleReevaluate = () => {
    // Navigate back to dashboard to trigger reevaluation
    setReportViewMode('dashboard');
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>familyoffice</h1>
      </header>

      <main className="app-content">
        {reportViewMode === 'report-with-chat' && selectedReport ? (
          <ReportWithChat
            reportPath={selectedReport}
            onBack={handleBackToDashboard}
            onReevaluate={handleReevaluate}
            initialChatOpen={initialChatOpen}
          />
        ) : (
          <Reports 
            onOpenReport={handleOpenReport}
            onChat={handleChatWithReport} 
          />
        )}
      </main>
    </div>
  );
}

export default App;

