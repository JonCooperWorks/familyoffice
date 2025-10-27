export interface DependencyStatus {
  codex: {
    installed: boolean;
    authenticated: boolean;
    version?: string;
  };
}

export interface ResearchRequest {
  ticker: string;
  companyName?: string;
  reportPath?: string;
  reportContent?: string; // Existing report content for reevaluation
}

export interface ChatMessage {
  role: "user" | "assistant";
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
  type: "research" | "reevaluation";
  content?: string; // Full markdown content stored in localStorage
}

export interface DockerOutput {
  type: "stdout" | "stderr";
  data: string;
}

export type IPCChannels =
  | "check-dependencies"
  | "run-research"
  | "run-chat"
  | "update-report"
  | "get-reports"
  | "open-report"
  | "read-report"
  | "export-report"
  | "delete-report"
  | "docker-output" // Still used for agent output streaming
  | "process-complete"
  | "process-error";
