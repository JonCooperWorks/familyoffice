import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import type { ChatMessage, Report } from '../../shared/types';
import './ReportWithChat.css';

// Claude 3.5 Sonnet pricing
const PRICING = {
  INPUT_PER_MILLION: 3.00,
  OUTPUT_PER_MILLION: 15.00
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

interface BackgroundTask {
  id: string;
  type: 'research' | 'reevaluate';
  ticker: string;
  companyName?: string;
  reportPath?: string;
  output: string[];
  status: 'running' | 'completed' | 'error';
  startTime: Date;
}

interface ReportWithChatProps {
  reportPath: string;
  onBack: () => void;
  onReevaluate: (reportPath: string) => void;
  initialChatOpen?: boolean;
  backgroundTasks: BackgroundTask[];
  onDismissTask: (taskId: string) => void;
}

function ReportWithChat({ reportPath, onBack, onReevaluate, initialChatOpen = false, backgroundTasks, onDismissTask }: ReportWithChatProps) {
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
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
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
      // Detect cashtags in the message (e.g., $AAPL, $TSLA)
      const cashtagRegex = /\$([A-Z]{1,5})/g;
      const cashtags = [...messageContent.matchAll(cashtagRegex)].map(match => match[1]);
      
      // Load reference reports for detected cashtags
      const referenceReports: { ticker: string; content: string }[] = [];
      if (cashtags.length > 0) {
        console.log(`📎 Detected cashtags: ${cashtags.join(', ')}`);
        setProcessingStatus('Loading referenced reports...');
        
        // Get all reports
        console.log('📚 Fetching all reports...');
        const allReports = await window.electronAPI.getReports();
        console.log(`📚 Found ${allReports.length} total reports`);
        
        // For each cashtag, find the most recent report
        for (const cashtagTicker of cashtags) {
          // Skip if it's the same as the current ticker
          if (cashtagTicker === ticker.toUpperCase()) {
            console.log(`⏭️  Skipping ${cashtagTicker} (same as current ticker)`);
            continue;
          }
          
          // Find the most recent report for this ticker
          const tickerReports = allReports.filter(r => r.ticker === cashtagTicker);
          if (tickerReports.length > 0) {
            // Reports are already sorted by date (most recent first)
            const latestReport = tickerReports[0];
            console.log(`📄 Loading report for ${cashtagTicker}: ${latestReport.path}`);
            try {
              const content = await window.electronAPI.readReport(latestReport.path);
              referenceReports.push({ ticker: cashtagTicker, content });
              console.log(`✅ Loaded report for ${cashtagTicker} (${content.length} chars)`);
            } catch (error) {
              console.error(`❌ Failed to load report for ${cashtagTicker}:`, error);
            }
          } else {
            console.log(`⚠️  No report found for ${cashtagTicker}`);
          }
        }
        
        // Update status after loading reports
        if (referenceReports.length > 0) {
          console.log(`✅ Loaded ${referenceReports.length} reference report(s)`);
          setProcessingStatus(`Loaded ${referenceReports.length} reference report(s). Thinking...`);
        }
      }

      setProcessingStatus('Thinking...');
      console.log('🤖 Calling runChat with', referenceReports.length, 'reference reports');
      const result = await window.electronAPI.runChat(
        ticker.toUpperCase(),
        messageContent,
        reportPath || undefined,
        referenceReports.length > 0 ? referenceReports : undefined
      );

      // Log and store token usage
      if (result.usage) {
        const { input_tokens, output_tokens } = result.usage;
        const totalTokens = input_tokens + output_tokens;
        
        console.log(`📊 Token Usage: ${input_tokens} in + ${output_tokens} out = ${totalTokens} total`);
        
        // Store token usage in localStorage
        try {
          const usageKey = 'tokenUsage';
          const existingUsage = localStorage.getItem(usageKey);
          const usageData = existingUsage ? JSON.parse(existingUsage) : { total: 0, sessions: [] };
          
          usageData.total += totalTokens;
          usageData.sessions.push({
            timestamp: new Date().toISOString(),
            ticker,
            type: 'chat',
            input_tokens,
            output_tokens,
            total: totalTokens
          });
          
          localStorage.setItem(usageKey, JSON.stringify(usageData));
          console.log(`💾 Total token usage: ${usageData.total.toLocaleString()} tokens`);
        } catch (error) {
          console.error('Failed to store token usage:', error);
        }
      }

      // Update the assistant message with the final response
      setMessages(prev => prev.map(msg => 
        (msg as any).id === assistantMessageId 
          ? { ...msg, content: result.response }
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
    if (!ticker || !reportPath || isLoading) {
      console.log(`🚫 [DEBUG] handleUpdateReport blocked: ticker=${ticker}, reportPath=${reportPath}, isLoading=${isLoading}`);
      return;
    }

    console.log(`🔄 [DEBUG] handleUpdateReport starting for ticker: ${ticker}`);
    const startTime = new Date();
    setIsLoading(true);
    setProcessingStatus('Updating report...');

    const logs: string[] = [];

    // Set up progress listener
    const cleanupProgress = window.electronAPI.onDockerOutput((output) => {
      logs.push(output.data);
      if (output.data.includes('[DEBUG]') || output.data.includes('🔎') || output.data.includes('💭') || output.data.includes('⚙️')) {
        setProcessingStatus(output.data.trim());
        console.log(`🔊 [PROGRESS] ${output.data.trim()}`);
      }
    });

    try {
      // Get chat history from current messages
      const chatHistoryForUpdate = messages.map(msg => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp.toISOString()
      }));
      
      console.log(`📞 [DEBUG] Calling window.electronAPI.updateReport('${ticker}') with ${chatHistoryForUpdate.length} messages`);
      const result = await window.electronAPI.updateReport(ticker, chatHistoryForUpdate);
      
      console.log(`✅ [DEBUG] updateReport success, new report path: ${result.path || result}`);
      
      const endTime = new Date();
      
      // Store metadata if usage is available
      if (result.usage) {
        const metadata = {
          id: `update-${ticker}-${Date.now()}`,
          ticker,
          type: 'update' as const,
          timestamp: new Date().toISOString(),
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          duration: endTime.getTime() - startTime.getTime(),
          usage: {
            input_tokens: result.usage.input_tokens,
            output_tokens: result.usage.output_tokens,
            total_tokens: result.usage.input_tokens + result.usage.output_tokens
          },
          cost: calculateCost(result.usage.input_tokens, result.usage.output_tokens),
          logs,
          reportPath: result.path || result
        };
        
        try {
          const key = 'researchMetadata';
          const existingData = localStorage.getItem(key);
          const allMetadata = existingData ? JSON.parse(existingData) : [];
          allMetadata.push(metadata);
          localStorage.setItem(key, JSON.stringify(allMetadata));
          console.log('💾 Saved update metadata:', metadata);
        } catch (error) {
          console.error('Failed to save update metadata:', error);
        }
      }
      
      // Reload the current report content to see if it was updated
      await loadReport();
      
      // Show success status briefly
      setProcessingStatus('✅ Report updated successfully!');
      setTimeout(() => setProcessingStatus(''), 3000);
      
    } catch (error) {
      console.error(`❌ [DEBUG] handleUpdateReport error:`, error);
      
      // Show error status
      setProcessingStatus(`❌ Update failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setTimeout(() => setProcessingStatus(''), 5000);
    } finally {
      setIsLoading(false);
      setProcessingStatus('');
      cleanupProgress();
      console.log(`🏁 [DEBUG] handleUpdateReport finished for ticker: ${ticker}`);
    }
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

  const handleViewProgress = (taskId: string) => {
    setSelectedTaskId(taskId);
    setShowProgressModal(true);
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

      {/* Background Tasks Indicator */}
      {backgroundTasks.length > 0 && (
        <div className="background-tasks" style={{ margin: '16px 24px', backgroundColor: '#f9fafb', padding: '12px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
          <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#374151' }}>Background Tasks</h3>
          {backgroundTasks.map(task => (
            <div key={task.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', backgroundColor: 'white', borderRadius: '6px', marginBottom: '8px', border: '1px solid #e5e7eb' }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <span style={{ fontWeight: '600', color: '#1f2937' }}>{task.ticker}</span>
                <span style={{ fontSize: '13px', color: '#6b7280' }}>
                  {task.type === 'reevaluate' ? 'Reevaluating' : 'Researching'}
                </span>
                <span style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {task.status === 'running' ? (
                    <><span style={{ animation: 'spin 1s linear infinite' }}>⟳</span> Running</>
                  ) : task.status === 'completed' ? (
                    <span style={{ color: '#059669' }}>✅ Completed</span>
                  ) : (
                    <span style={{ color: '#dc2626' }}>❌ Error</span>
                  )}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  onClick={() => handleViewProgress(task.id)}
                  style={{ padding: '4px 12px', fontSize: '12px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                >
                  View Progress
                </button>
                {task.status !== 'running' && (
                  <button 
                    onClick={() => onDismissTask(task.id)}
                    style={{ padding: '4px 8px', fontSize: '12px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

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

      {/* Progress Modal */}
      {showProgressModal && selectedTaskId && (
        <div className="modal-overlay" onClick={() => setShowProgressModal(false)}>
          <div className="progress-modal" onClick={e => e.stopPropagation()}>
            {(() => {
              const task = backgroundTasks.find(t => t.id === selectedTaskId);
              if (!task) return null;
              
              return (
                <>
                  <div className="progress-header">
                    <h2>{task.ticker} - {task.type === 'reevaluate' ? 'Reevaluation' : 'Research'}</h2>
                    <button 
                      onClick={() => setShowProgressModal(false)}
                      className="close-modal-button"
                    >
                      ✕
                    </button>
                  </div>
                  
                  <div className="progress-info">
                    <div className="progress-status">
                      <span className={`status-indicator ${task.status}`}>
                        {task.status === 'running' ? (
                          <><span className="spinner">⟳</span> Running</>
                        ) : task.status === 'completed' ? (
                          '✅ Completed'
                        ) : (
                          '❌ Error'
                        )}
                      </span>
                      <span className="start-time">
                        Started: {task.startTime.toLocaleTimeString()}
                      </span>
                    </div>
                    
                    {task.companyName && (
                      <p className="company-name">Company: {task.companyName}</p>
                    )}
                    
                    {task.reportPath && (
                      <p className="report-path">Report: {task.reportPath}</p>
                    )}
                  </div>

                  <div className="progress-output">
                    <h3>Output</h3>
                    <pre className="output">{task.output.join('')}</pre>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}

export default ReportWithChat;
