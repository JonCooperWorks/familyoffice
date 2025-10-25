import type {
  DependencyStatus,
  ResearchRequest,
  Report,
  DockerOutput,
} from "../shared/types";

declare global {
  interface Window {
    electronAPI: {
      checkDependencies: () => Promise<DependencyStatus>;
      runResearch: (request: ResearchRequest) => Promise<string>;
      runChat: (
        ticker: string,
        message: string,
        reportPath?: string,
        referenceReports?: Array<{ ticker: string; content: string }>,
      ) => Promise<{
        response: string;
        usage?: { input_tokens: number; output_tokens: number };
      }>;
      updateReport: (
        ticker: string,
        chatHistory?: any[],
      ) => Promise<
        | {
            path: string;
            usage?: { input_tokens: number; output_tokens: number };
          }
        | string
      >;
      getReports: () => Promise<Report[]>;
      openReport: (path: string) => Promise<void>;
      readReport: (path: string) => Promise<string>;
      exportReport: (
        path: string,
        htmlContent: string,
      ) => Promise<string | null>;
      deleteReport: (reportPath: string) => Promise<boolean>;
      onDockerOutput: (callback: (output: DockerOutput) => void) => () => void;
      onProcessComplete: (callback: (result: string) => void) => () => void;
      onProcessError: (callback: (error: string) => void) => () => void;
      onChatStream: (callback: (text: string) => void) => () => void;
      saveMetadata: (metadata: any) => Promise<boolean>;
      getMetadata: () => Promise<any[]>;
      clearMetadata: () => Promise<boolean>;
      getAlphaVantageApiKey: () => Promise<string | null>;
      setAlphaVantageApiKey: (apiKey: string) => Promise<boolean>;
      hasAlphaVantageApiKey: () => Promise<boolean>;
    };
  }
}

export {};
