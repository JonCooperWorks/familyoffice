import { useState, useEffect } from 'react';
import DepsCheck from './components/DepsCheck';
import Chat from './components/Chat';
import Reports from './components/Reports';
import type { DependencyStatus } from '../shared/types';
import './App.css';

function App() {
  const [depsStatus, setDepsStatus] = useState<DependencyStatus | null>(null);
  const [depsChecked, setDepsChecked] = useState(false);
  const [selectedReport, setSelectedReport] = useState<string | undefined>();
  const [chatMode, setChatMode] = useState(false);

  useEffect(() => {
    checkDependencies();
  }, []);

  const checkDependencies = async () => {
    const status = await window.electronAPI.checkDependencies();
    setDepsStatus(status);
    setDepsChecked(true);
  };

  const allDepsReady = depsStatus && 
    depsStatus.docker.installed &&
    depsStatus.docker.running &&
    depsStatus.codex.installed &&
    depsStatus.codex.authenticated &&
    depsStatus.dockerImage.built &&
    depsStatus.npmPackages.installed;

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

  const handleChatWithReport = (reportPath: string) => {
    setSelectedReport(reportPath);
    setChatMode(true);
  };

  const handleClearChat = () => {
    setSelectedReport(undefined);
    setChatMode(false);
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>familyoffice</h1>
      </header>

      <main className="app-content">
        {chatMode ? (
          <Chat preloadedReport={selectedReport} onClearReport={handleClearChat} />
        ) : (
          <Reports onChat={handleChatWithReport} />
        )}
      </main>
    </div>
  );
}

export default App;

