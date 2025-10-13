import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import type { ChatMessage, Report } from '../../shared/types';
import './ReportWithChat.css';

interface ReportWithChatProps {
  reportPath: string;
  onBack: () => void;
  onReevaluate: (reportPath: string) => void;
  initialChatOpen?: boolean;
}

function ReportWithChat({ reportPath, onBack, onReevaluate, initialChatOpen = false }: ReportWithChatProps) {
  // Report state
  const [reportContent, setReportContent] = useState<string>('');
  const [reportLoading, setReportLoading] = useState(true);
  const [reportError, setReportError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const reportContentRef = useRef<HTMLDivElement>(null);

  // Chat state
  const [chatOpen, setChatOpen] = useState(initialChatOpen);
  const [ticker, setTicker] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [copiedMessageIndex, setCopiedMessageIndex] = useState<number | null>(null);
  const [processingStatus, setProcessingStatus] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load report content
  useEffect(() => {
    loadReport();
  }, [reportPath]);

  // Initialize chat when report loads or chat opens
  useEffect(() => {
    if (chatOpen && reportContent && !sessionStarted) {
      const match = reportPath.match(/research-([A-Z]+)-/);
      if (match) {
        const extractedTicker = match[1];
        setTicker(extractedTicker);
        loadHistoryForTicker(extractedTicker);
      }
    }
  }, [chatOpen, reportContent, sessionStarted, reportPath]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Save chat history for current ticker whenever it changes
  useEffect(() => {
    if (ticker && (messages.length > 0 || sessionStarted)) {
      try {
        const historyKey = `chatHistory_${ticker}`;
        const historyData = {
          messages: messages.map(msg => ({
            ...msg,
            timestamp: msg.timestamp.toISOString()
          })),
          reportPath,
          sessionStarted
        };
        localStorage.setItem(historyKey, JSON.stringify(historyData));
      } catch (error) {
        console.error('Failed to save chat history for', ticker, ':', error);
      }
    }
  }, [messages, ticker, reportPath, sessionStarted]);

  const loadReport = async () => {
    setReportLoading(true);
    setReportError(null);
    try {
      const data = await window.electronAPI.readReport(reportPath);
      setReportContent(data);
    } catch (err) {
      setReportError(err instanceof Error ? err.message : 'Failed to load report');
    } finally {
      setReportLoading(false);
    }
  };

  const loadHistoryForTicker = (tickerToLoad: string) => {
    setIsLoadingHistory(true);
    
    const historyKey = `chatHistory_${tickerToLoad}`;
    const savedHistory = localStorage.getItem(historyKey);
    
    if (savedHistory) {
      try {
        const parsed = JSON.parse(savedHistory);
        const messagesWithDates = (parsed.messages || []).map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }));
        
        setMessages([]);
        setTimeout(() => {
          setMessages(messagesWithDates);
          setSessionStarted(true);
          setIsLoadingHistory(false);
        }, 50);
        
        return true;
      } catch (error) {
        console.error('Failed to parse saved history:', error);
        localStorage.removeItem(historyKey);
      }
    }
    
    setMessages([{
      role: 'assistant',
      content: `Chat session started for ${tickerToLoad} with loaded report. Ask me anything about this stock!`,
      timestamp: new Date()
    }]);
    setSessionStarted(true);
    setIsLoadingHistory(false);
    return false;
  };

  const getReportTitle = () => {
    const filename = reportPath.split('/').pop() || '';
    const match = filename.match(/research-([A-Z]+)-/);
    if (match && match[1]) {
      return match[1];
    }
    const tickerMatch = reportContent.match(/\*\*Ticker:\*\*\s*([A-Z]+)/);
    if (tickerMatch && tickerMatch[1]) {
      return tickerMatch[1];
    }
    return filename.replace('.md', '');
  };

  const handleExport = async () => {
    try {
      const renderedHtml = reportContentRef.current?.innerHTML || '';
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
              
              h1 { font-size: 28px; font-weight: 700; margin-top: 0; margin-bottom: 24px; color: #1a1a1a; border-bottom: 2px solid #e5e7eb; padding-bottom: 12px; }
              h2 { font-size: 22px; font-weight: 600; margin-top: 32px; margin-bottom: 16px; color: #1a1a1a; }
              h3 { font-size: 18px; font-weight: 600; margin-top: 24px; margin-bottom: 12px; color: #374151; }
              p { margin-bottom: 16px; color: #4b5563; }
              strong { font-weight: 600; color: #1a1a1a; }
              ul, ol { margin-bottom: 16px; padding-left: 24px; }
              li { margin-bottom: 8px; color: #4b5563; }
              table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px; }
              th { background-color: #f3f4f6; font-weight: 600; text-align: left; padding: 12px; border: 1px solid #e5e7eb; color: #1a1a1a; }
              td { padding: 12px; border: 1px solid #e5e7eb; color: #4b5563; }
              tr:nth-child(even) { background-color: #f9fafb; }
              code { background-color: #f3f4f6; padding: 2px 6px; border-radius: 3px; font-family: 'Monaco', 'Courier New', monospace; font-size: 13px; color: #1f2937; }
              pre { background-color: #f3f4f6; padding: 16px; border-radius: 6px; overflow-x: auto; margin: 16px 0; }
              pre code { background: none; padding: 0; }
              blockquote { border-left: 4px solid #e5e7eb; padding-left: 16px; margin: 16px 0; color: #6b7280; font-style: italic; }
              a { color: #2563eb; text-decoration: none; }
              a:hover { text-decoration: underline; }
              hr { border: none; border-top: 1px solid #e5e7eb; margin: 32px 0; }
              .table-wrapper { overflow-x: auto; margin: 20px 0; }
            </style>
          </head>
          <body>
            ${renderedHtml}
          </body>
        </html>
      `;
      
      const exportedPath = await window.electronAPI.exportReport(reportPath, htmlContent);
      if (exportedPath) {
        console.log('Report exported to:', exportedPath);
      }
    } catch (error) {
      console.error('Error exporting report:', error);
      alert('Failed to export report. Please try again.');
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(reportContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      alert('Failed to copy to clipboard. Please try again.');
    }
  };

  const handleCopyMessage = async (messageContent: string, messageIndex: number) => {
    try {
      await navigator.clipboard.writeText(messageContent);
      setCopiedMessageIndex(messageIndex);
      setTimeout(() => setCopiedMessageIndex(null), 2000);
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      alert('Failed to copy to clipboard. Please try again.');
    }
  };

  const handleRetryMessage = async (messageIndex: number) => {
    if (isLoading || messageIndex === 0) return;
    
    // Find the user message that led to this assistant response
    const userMessageIndex = messageIndex - 1;
    const userMessage = messages[userMessageIndex];
    
    if (!userMessage || userMessage.role !== 'user') return;

    // Remove messages from the retry point onwards
    const newMessages = messages.slice(0, messageIndex);
    setMessages(newMessages);
    
    // Resend the user message
    await sendMessage(userMessage.content);
  };

  const sendMessage = async (messageContent: string) => {
    setIsLoading(true);
    setProcessingStatus('Thinking...');

    // Add a placeholder assistant message that will be updated with streaming content
    const assistantMessageId = Date.now();
    const initialAssistantMessage: ChatMessage = {
      role: 'assistant',
      content: '',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, { ...initialAssistantMessage, id: assistantMessageId }]);

    // Set up streaming listener
    const cleanupStream = window.electronAPI.onChatStream((streamedText) => {
      setIsStreaming(true);
      setMessages(prev => prev.map(msg => 
        (msg as any).id === assistantMessageId 
          ? { ...msg, content: streamedText }
          : msg
      ));
    });

    // Set up progress listener for status updates
    const cleanupProgress = window.electronAPI.onDockerOutput((output) => {
      if (output.data.includes('🔎 Searching:')) {
        setProcessingStatus(output.data.trim());
      } else if (output.data.includes('Search completed')) {
        setProcessingStatus('Analyzing results...');
      }
    });

    try {
      const response = await window.electronAPI.runChat(
        ticker.toUpperCase(),
        messageContent,
        reportPath || undefined
      );

      // Update the assistant message with the final response
      setMessages(prev => prev.map(msg => 
        (msg as any).id === assistantMessageId 
          ? { ...msg, content: response }
          : msg
      ));

    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => prev.map(msg => 
        (msg as any).id === assistantMessageId 
          ? { ...msg, content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}` }
          : msg
      ));
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
      setProcessingStatus('');
      cleanupStream();
      cleanupProgress();
    }
  };

  const handleUpdateReport = async () => {
    if (!ticker || !reportPath || isLoading) return;

    const updatePrompt = `Please update the research report with the following improvements:

1. **Add New Sections**: Include any important information that may be missing from the current report
2. **Update Existing Sections**: Refresh data, metrics, and analysis with the most current information available
3. **Enhance Analysis**: Deepen the investment thesis and risk assessment based on recent developments
4. **Financial Updates**: Update any financial metrics, ratios, or projections with the latest data
5. **Market Context**: Include recent market conditions, sector trends, and competitive positioning
6. **News Integration**: Incorporate any significant recent news or developments

Please provide a comprehensive update that maintains the report's structure while enhancing its quality and relevance.`;

    await sendMessage(updatePrompt);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    const currentInput = input;
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    
    await sendMessage(currentInput);
  };

  const handleClearChat = () => {
    setMessages([{
      role: 'assistant',
      content: `Chat context cleared for ${ticker} with loaded report. Ask me anything!`,
      timestamp: new Date()
    }]);
    setInput('');
    
    const historyKey = `chatHistory_${ticker}`;
    localStorage.removeItem(historyKey);
  };

  const handleToggleChat = () => {
    setChatOpen(!chatOpen);
  };

  return (
    <div className="report-with-chat">
      <div className="report-with-chat-header">
        <button className="back-button" onClick={onBack}>
          ← Back to Reports
        </button>
        <div className="title-and-actions">
          <div className="report-title">
            <h2>{getReportTitle()}</h2>
          </div>
          <div className="header-actions">
            <button className="action-button" onClick={() => onReevaluate(reportPath)}>
              🔄 Reevaluate
            </button>
            <button className="action-button" onClick={handleCopy}>
              {copied ? '✓ Copied!' : '📋 Copy'}
            </button>
            <button className="action-button" onClick={handleExport}>
              📄 Export PDF
            </button>
            <button 
              className={`action-button ${chatOpen ? 'active' : 'primary'}`} 
              onClick={handleToggleChat}
            >
              💬 Chat {chatOpen ? '(Open)' : ''}
            </button>
          </div>
        </div>
      </div>

      <div className="report-with-chat-content">
        <div className={`report-section ${chatOpen ? 'with-chat' : 'full-width'}`}>
          {reportLoading && (
            <div className="report-loading">
              <div className="loading-spinner"></div>
              <p>Loading report...</p>
            </div>
          )}

          {reportError && (
            <div className="report-error">
              <h3>Error Loading Report</h3>
              <p>{reportError}</p>
              <button onClick={loadReport}>Try Again</button>
            </div>
          )}

          {!reportLoading && !reportError && (
            <div className="report-content" ref={reportContentRef}>
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
                {reportContent}
              </ReactMarkdown>
            </div>
          )}
        </div>

        {chatOpen && (
          <div className="chat-section">
            <div className="chat-header">
              <div className="chat-title">
                <h3>Chat: {ticker}</h3>
                <span className="report-indicator">📄 Report loaded</span>
              </div>
              <div className="chat-controls">
                <button onClick={handleUpdateReport} className="update-report-button" disabled={isLoading}>
                  📝 Update Report
                </button>
                <button onClick={handleClearChat} className="clear-button">
                  🗑️ Clear
                </button>
                <button onClick={() => setChatOpen(false)} className="close-button">
                  ✕
                </button>
              </div>
            </div>

            <div className="chat-messages">
              {isLoadingHistory && (
                <div className="message assistant loading">
                  <div className="message-header">
                    <span className="message-role">System</span>
                  </div>
                  <div className="message-content">
                    <span className="typing-indicator">●●●</span> Loading chat history...
                  </div>
                </div>
              )}
              {messages.map((msg, idx) => (
                <div key={idx} className={`message ${msg.role}`}>
                  <div className="message-header">
                    <span className="message-role">
                      {msg.role === 'user' ? 'You' : 'Assistant'}
                    </span>
                    <span className="message-time">
                      {msg.timestamp.toLocaleTimeString()}
                    </span>
                    <div className="message-actions">
                      <button 
                        className="message-action-btn copy-btn"
                        onClick={() => handleCopyMessage(msg.content, idx)}
                        title="Copy message"
                      >
                        {copiedMessageIndex === idx ? '✓' : '📋'}
                      </button>
                      {msg.role === 'assistant' && idx > 0 && (
                        <button 
                          className="message-action-btn retry-btn"
                          onClick={() => handleRetryMessage(idx)}
                          disabled={isLoading}
                          title="Retry this response"
                        >
                          🔄
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="message-content">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      rehypePlugins={[
                        rehypeRaw,
                        [rehypeSanitize, {
                          ...defaultSchema,
                          tagNames: [...(defaultSchema.tagNames || []), 'sup', 'sub'],
                          attributes: {
                            ...defaultSchema.attributes,
                            '*': [...(defaultSchema.attributes?.['*'] || []), 'className'],
                          }
                        }]
                      ]}
                    >
                      {msg.content}
                    </ReactMarkdown>
                    {msg.role === 'assistant' && isStreaming && (msg as any).id && (
                      <span className="streaming-cursor animate-pulse">▋</span>
                    )}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="message assistant loading">
                  <div className="message-header">
                    <span className="message-role">Assistant</span>
                  </div>
                  <div className="message-content">
                    <div className="thinking-status">
                      <span className="typing-indicator animate-pulse">●●●</span>
                      <span className="status-text">
                        {processingStatus || 'Thinking...'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSendMessage} className="chat-input-form">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message..."
                disabled={isLoading}
                className="chat-input"
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="send-button"
              >
                Send
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

export default ReportWithChat;
