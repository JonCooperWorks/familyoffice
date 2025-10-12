import { useState } from 'react';
import type { DependencyStatus } from '../../shared/types';
import './DepsCheck.css';

interface DepsCheckProps {
  status: DependencyStatus;
  onComplete: () => void;
}

function DepsCheck({ status, onComplete }: DepsCheckProps) {
  const [installing, setInstalling] = useState<string | null>(null);
  const [buildingImage, setBuildingImage] = useState(false);
  const [buildOutput, setBuildOutput] = useState<string[]>([]);

  const handleInstallNpm = async () => {
    setInstalling('npm');
    try {
      await window.electronAPI.installDependency('npm');
      onComplete();
    } catch (error) {
      alert('Failed to install npm packages');
    } finally {
      setInstalling(null);
    }
  };

  const handleBuildImage = async () => {
    setBuildingImage(true);
    setBuildOutput([]);
    
    const cleanup = window.electronAPI.onDockerOutput((output) => {
      setBuildOutput(prev => [...prev, output.data]);
    });

    try {
      await window.electronAPI.buildDockerImage();
      cleanup();
      onComplete();
    } catch (error) {
      alert('Failed to build Docker image');
    } finally {
      setBuildingImage(false);
      cleanup();
    }
  };

  return (
    <div className="deps-check">
      <div className="deps-panel">
        <h1>Setup Required</h1>
        <p className="subtitle">Let's make sure everything is ready to run.</p>

        <div className="deps-list">
          {/* Docker */}
          <div className={`dep-item ${status.docker.installed && status.docker.running ? 'success' : 'error'}`}>
            <div className="dep-info">
              <div className="dep-icon">
                {status.docker.installed && status.docker.running ? '✅' : '❌'}
              </div>
              <div>
                <h3>Docker Desktop</h3>
                {status.docker.installed && status.docker.running ? (
                  <p className="success-msg">Running • {status.docker.version}</p>
                ) : status.docker.installed ? (
                  <p className="error-msg">Docker is installed but not running</p>
                ) : (
                  <p className="error-msg">Not installed</p>
                )}
              </div>
            </div>
            {(!status.docker.installed || !status.docker.running) && (
              <div className="dep-action">
                <a 
                  href="https://www.docker.com/products/docker-desktop" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="link-button"
                >
                  {status.docker.installed ? 'Start Docker Desktop' : 'Install Docker Desktop'}
                </a>
              </div>
            )}
          </div>

          {/* Codex */}
          <div className={`dep-item ${status.codex.installed && status.codex.authenticated ? 'success' : 'error'}`}>
            <div className="dep-info">
              <div className="dep-icon">
                {status.codex.installed && status.codex.authenticated ? '✅' : '❌'}
              </div>
              <div>
                <h3>Codex CLI</h3>
                {status.codex.installed && status.codex.authenticated ? (
                  <p className="success-msg">Authenticated • {status.codex.version}</p>
                ) : status.codex.installed ? (
                  <p className="error-msg">Not authenticated</p>
                ) : (
                  <p className="error-msg">Not installed</p>
                )}
              </div>
            </div>
            {(!status.codex.installed || !status.codex.authenticated) && (
              <div className="dep-action">
                <div className="instructions">
                  <code>brew install codex</code>
                  <br />
                  <code>codex</code> (then sign in)
                </div>
              </div>
            )}
          </div>

          {/* NPM Packages */}
          <div className={`dep-item ${status.npmPackages.installed ? 'success' : 'warning'}`}>
            <div className="dep-info">
              <div className="dep-icon">
                {status.npmPackages.installed ? '✅' : '⚠️'}
              </div>
              <div>
                <h3>NPM Packages</h3>
                {status.npmPackages.installed ? (
                  <p className="success-msg">Installed</p>
                ) : (
                  <p className="warning-msg">Need to install dependencies</p>
                )}
              </div>
            </div>
            {!status.npmPackages.installed && (
              <div className="dep-action">
                <button 
                  onClick={handleInstallNpm}
                  disabled={installing === 'npm'}
                  className="action-button"
                >
                  {installing === 'npm' ? 'Installing...' : 'Install Now'}
                </button>
              </div>
            )}
          </div>

          {/* Docker Image */}
          <div className={`dep-item ${status.dockerImage.built ? 'success' : 'warning'}`}>
            <div className="dep-info">
              <div className="dep-icon">
                {status.dockerImage.built ? '✅' : '⚠️'}
              </div>
              <div>
                <h3>Docker Image</h3>
                {status.dockerImage.built ? (
                  <p className="success-msg">Built</p>
                ) : (
                  <p className="warning-msg">Need to build image</p>
                )}
              </div>
            </div>
            {!status.dockerImage.built && status.docker.installed && status.docker.running && (
              <div className="dep-action">
                <button 
                  onClick={handleBuildImage}
                  disabled={buildingImage}
                  className="action-button"
                >
                  {buildingImage ? 'Building...' : 'Build Now'}
                </button>
              </div>
            )}
          </div>
        </div>

        {buildOutput.length > 0 && (
          <div className="build-output">
            <h3>Build Output:</h3>
            <pre>{buildOutput.join('')}</pre>
          </div>
        )}

        <div className="deps-footer">
          <button onClick={onComplete} className="check-again-button">
            Check Again
          </button>
        </div>
      </div>
    </div>
  );
}

export default DepsCheck;

