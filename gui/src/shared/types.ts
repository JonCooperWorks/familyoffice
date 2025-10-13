export interface DependencyStatus {
  docker: {
    installed: boolean;
    running: boolean;
    version?: string;
  };
  codex: {
    installed: boolean;
    authenticated: boolean;
    version?: string;
  };
  dockerImage: {
    built: boolean;
    version?: string;
  };
  npmPackages: {
    installed: boolean;
  };
}

export interface ResearchRequest {
  ticker: string;
  companyName?: string;
  reportPath?: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  id?: number; // Optional ID for tracking streaming messages
}

export interface Report {
  filename: string;
  path: string;
  ticker: string;
  company?: string;
  date: Date;
  type: 'research' | 'reevaluation';
}

export interface DockerOutput {
  type: 'stdout' | 'stderr';
  data: string;
}

export type IPCChannels = 
  | 'check-dependencies'
  | 'install-dependency'
  | 'build-docker-image'
  | 'run-research'
  | 'run-chat'
  | 'update-report'
  | 'get-reports'
  | 'open-report'
  | 'read-report'
  | 'export-report'
  | 'docker-output'
  | 'process-complete'
  | 'process-error';

