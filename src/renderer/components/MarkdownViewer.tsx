import { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import "./MarkdownViewer.css";

interface MarkdownViewerProps {
  reportPath: string;
  onBack: () => void;
  onChat: (reportPath: string) => void;
  onReevaluate: (reportPath: string) => void;
}

function MarkdownViewer({
  reportPath,
  onBack,
  onChat,
  onReevaluate,
}: MarkdownViewerProps) {
  const [content, setContent] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

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
      setError(err instanceof Error ? err.message : "Failed to load report");
    } finally {
      setLoading(false);
    }
  };

  const getReportTitle = () => {
    const filename = reportPath.split("/").pop() || "";
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
    return filename.replace(".md", "");
  };

  const handleExport = async () => {
    try {
      // Get the rendered HTML from the DOM
      const renderedHtml = contentRef.current?.innerHTML || "";

      // Create HTML content with styling for PDF export
      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <style>
              @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
              
              body {
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                line-height: 1.6;
                color: #1a1a1a;
                max-width: 800px;
                margin: 0 auto;
                padding: 40px 20px;
                background: white;
              }
              
              h1 {
                font-size: 28px;
                font-weight: 700;
                margin-top: 0;
                margin-bottom: 24px;
                color: #1a1a1a;
                border-bottom: 2px solid #e5e7eb;
                padding-bottom: 12px;
              }
              
              h2 {
                font-size: 22px;
                font-weight: 600;
                margin-top: 32px;
                margin-bottom: 16px;
                color: #1a1a1a;
              }
              
              h3 {
                font-size: 18px;
                font-weight: 600;
                margin-top: 24px;
                margin-bottom: 12px;
                color: #374151;
              }
              
              p {
                margin-bottom: 16px;
                color: #4b5563;
              }
              
              strong {
                font-weight: 600;
                color: #1a1a1a;
              }
              
              ul, ol {
                margin-bottom: 16px;
                padding-left: 24px;
              }
              
              li {
                margin-bottom: 8px;
                color: #4b5563;
              }
              
              table {
                width: 100%;
                border-collapse: collapse;
                margin: 20px 0;
                font-size: 14px;
              }
              
              th {
                background-color: #f3f4f6;
                font-weight: 600;
                text-align: left;
                padding: 12px;
                border: 1px solid #e5e7eb;
                color: #1a1a1a;
              }
              
              td {
                padding: 12px;
                border: 1px solid #e5e7eb;
                color: #4b5563;
              }
              
              tr:nth-child(even) {
                background-color: #f9fafb;
              }
              
              code {
                background-color: #f3f4f6;
                padding: 2px 6px;
                border-radius: 3px;
                font-family: 'Monaco', 'Courier New', monospace;
                font-size: 13px;
                color: #1f2937;
              }
              
              pre {
                background-color: #f3f4f6;
                padding: 16px;
                border-radius: 6px;
                overflow-x: auto;
                margin: 16px 0;
              }
              
              pre code {
                background: none;
                padding: 0;
              }
              
              blockquote {
                border-left: 4px solid #e5e7eb;
                padding-left: 16px;
                margin: 16px 0;
                color: #6b7280;
                font-style: italic;
              }
              
              a {
                color: #2563eb;
                text-decoration: none;
              }
              
              a:hover {
                text-decoration: underline;
              }
              
              hr {
                border: none;
                border-top: 1px solid #e5e7eb;
                margin: 32px 0;
              }
              
              .table-wrapper {
                overflow-x: auto;
                margin: 20px 0;
              }
            </style>
          </head>
          <body>
            ${renderedHtml}
          </body>
        </html>
      `;

      const exportedPath = await window.electronAPI.exportReport(
        reportPath,
        htmlContent,
      );
      if (exportedPath) {
        // Could add a toast notification here if desired
        console.log("Report exported to:", exportedPath);
      }
    } catch (error) {
      console.error("Error exporting report:", error);
      alert("Failed to export report. Please try again.");
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Error copying to clipboard:", error);
      alert("Failed to copy to clipboard. Please try again.");
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
            <button
              className="action-button"
              onClick={() => onReevaluate(reportPath)}
            >
              🔄 Reevaluate
            </button>
            <button className="action-button" onClick={handleCopy}>
              {copied ? "✓ Copied!" : "📋 Copy"}
            </button>
            <button className="action-button" onClick={handleExport}>
              📄 Export PDF
            </button>
            <button
              className="action-button primary"
              onClick={() => onChat(reportPath)}
            >
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
          <div className="markdown-content" ref={contentRef}>
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[
                rehypeRaw,
                [
                  rehypeSanitize,
                  {
                    ...defaultSchema,
                    attributes: {
                      ...defaultSchema.attributes,
                      "*": [
                        ...(defaultSchema.attributes?.["*"] || []),
                        "className",
                        "style",
                      ],
                    },
                    tagNames: [
                      ...(defaultSchema.tagNames || []),
                      "table",
                      "thead",
                      "tbody",
                      "tr",
                      "th",
                      "td",
                    ],
                  },
                ],
              ]}
              components={{
                table: ({ node, ...props }) => (
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
