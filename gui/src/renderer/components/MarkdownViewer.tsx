import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import './MarkdownViewer.css';

interface MarkdownViewerProps {
  reportPath: string;
  onBack: () => void;
  onChat: (reportPath: string) => void;
  onReevaluate: (reportPath: string) => void;
}

function MarkdownViewer({ reportPath, onBack, onChat, onReevaluate }: MarkdownViewerProps) {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadReport();
  }, [reportPath]);

  const loadReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await window.electronAPI.readReport(reportPath);
      setContent(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  const getReportTitle = () => {
    const filename = reportPath.split('/').pop() || '';
    // Extract ticker from filename pattern: research-TICKER-DATE.md
    const match = filename.match(/research-([A-Z]+)-/);
    if (match && match[1]) {
      return match[1];
    }
    // Fallback to extracting from content if available
    const tickerMatch = content.match(/\*\*Ticker:\*\*\s*([A-Z]+)/);
    if (tickerMatch && tickerMatch[1]) {
      return tickerMatch[1];
    }
    // Last fallback
    return filename.replace('.md', '');
  };

  const handleExport = async () => {
    try {
      const exportedPath = await window.electronAPI.exportReport(reportPath);
      if (exportedPath) {
        // Could add a toast notification here if desired
        console.log('Report exported to:', exportedPath);
      }
    } catch (error) {
      console.error('Error exporting report:', error);
      alert('Failed to export report. Please try again.');
    }
  };

  return (
    <div className="markdown-viewer">
      <div className="markdown-header">
        <button className="back-button" onClick={onBack}>
          ← Back to Reports
        </button>
        <div className="markdown-title-row">
          <div className="markdown-title">
            <h2>{getReportTitle()}</h2>
          </div>
          <div className="markdown-actions">
            <button className="action-button" onClick={() => onReevaluate(reportPath)}>
              🔄 Reevaluate
            </button>
            <button className="action-button" onClick={handleExport}>
              📁 Export
            </button>
            <button className="action-button primary" onClick={() => onChat(reportPath)}>
              💬 Chat
            </button>
          </div>
        </div>
      </div>

      <div className="markdown-content-wrapper">
        {loading && (
          <div className="markdown-loading">
            <div className="loading-spinner"></div>
            <p>Loading report...</p>
          </div>
        )}

        {error && (
          <div className="markdown-error">
            <h3>Error Loading Report</h3>
            <p>{error}</p>
            <button onClick={loadReport}>Try Again</button>
          </div>
        )}

        {!loading && !error && (
          <div className="markdown-content">
            <ReactMarkdown 
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[
                rehypeRaw,
                [rehypeSanitize, {
                  ...defaultSchema,
                  attributes: {
                    ...defaultSchema.attributes,
                    '*': [...(defaultSchema.attributes?.['*'] || []), 'className', 'style'],
                  },
                  tagNames: [
                    ...(defaultSchema.tagNames || []),
                    'table', 'thead', 'tbody', 'tr', 'th', 'td',
                  ],
                }]
              ]}
              components={{
                table: ({node, ...props}) => (
                  <div className="table-wrapper">
                    <table {...props} />
                  </div>
                ),
              }}
            >
              {content}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}

export default MarkdownViewer;

