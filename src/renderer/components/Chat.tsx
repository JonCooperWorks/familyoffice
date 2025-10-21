import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import type { ChatMessage } from '../../shared/types';
import './Chat.css';

interface ChatProps {
  preloadedReport?: string;
  onClearReport: () => void;
}

function Chat({ preloadedReport, onClearReport }: ChatProps) {
  const [ticker, setTicker] = useState('');
  const [reportPath, setReportPath] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [copiedMessageIndex, setCopiedMessageIndex] = useState<number | null>(null);
  const [processingStatus, setProcessingStatus] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // History loading is now handled in the preloadedReport useEffect above

  // Save chat history for current ticker whenever it changes
  useEffect(() => {
    if (ticker && (messages.length > 0 || sessionStarted)) {
      try {
        const historyKey = `chatHistory_${ticker}`;
        const historyData = {
          messages: messages.map(msg => ({
            ...msg,
            timestamp: msg.timestamp.toISOString() // Convert Date to string for storage
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

  // Function to load history for a ticker
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
        
        // Clear existing messages first
        setMessages([]);
        
        // Set new messages
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
    
    // No history found or failed to load
    setMessages([{
      role: 'assistant',
      content: `Chat session started for ${tickerToLoad} with loaded report. Ask me anything about this stock!`,
      timestamp: new Date()
    }]);
    setSessionStarted(true);
    
    setIsLoadingHistory(false);
    return false;
  };

  useEffect(() => {
    if (preloadedReport) {
      setReportPath(preloadedReport);
      
      // Extract ticker from filename
      const match = preloadedReport.match(/research-([A-Z]+)-/);
      if (match) {
        const extractedTicker = match[1];
        setTicker(extractedTicker);
        
        // Load history for this ticker
        loadHistoryForTicker(extractedTicker);
      }
    }
  }, [preloadedReport]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleStartSession = () => {
    if (!ticker) {
      alert('Please enter a ticker symbol');
      return;
    }
    setSessionStarted(true);
    setMessages([{
      role: 'assistant',
      content: `Chat session started for ${ticker}${reportPath ? ' with loaded report' : ''}. Ask me anything!`,
      timestamp: new Date()
    }]);
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
          if (cashtagTicker === ticker) {
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
        ticker,
        messageContent,
        reportPath,
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

  const handleUpdateReport = async () => {
    if (!ticker || !reportPath || isLoading) {
      console.log(`🚫 [DEBUG] handleUpdateReport blocked: ticker=${ticker}, reportPath=${reportPath}, isLoading=${isLoading}`);
      return;
    }

    console.log(`🔄 [DEBUG] handleUpdateReport starting for ticker: ${ticker}`);
    setIsLoading(true);
    setProcessingStatus('Updating report...');

    // Add a system message to show that report update is starting
    const systemMessage: ChatMessage = {
      role: 'assistant',
      content: `🔄 Starting report update for ${ticker}...`,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, systemMessage]);

    // Set up progress listener
    const cleanupProgress = window.electronAPI.onDockerOutput((output) => {
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
      const updatedReportPath = await window.electronAPI.updateReport(ticker, chatHistoryForUpdate);
      
      console.log(`✅ [DEBUG] updateReport success, new report path: ${updatedReportPath}`);
      
      // Add success message to chat
      const successMessage: ChatMessage = {
        role: 'assistant',
        content: `✅ **Report Updated Successfully!**

Your research report for ${ticker} has been updated and saved to:
\`${updatedReportPath}\`

The updated report incorporates:
- Latest market data and analysis
- New insights from our conversation
- Enhanced financial metrics and projections
- Recent news and developments
- Improved investment thesis and risk assessment

You can find the updated report in the Reports section.`,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, successMessage]);
      
    } catch (error) {
      console.error(`❌ [DEBUG] handleUpdateReport error:`, error);
      
      // Add error message to chat
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: `❌ **Report Update Failed**

Error: ${error instanceof Error ? error.message : 'Unknown error'}

Debug information:
- Ticker: ${ticker}
- Report Path: ${reportPath}
- Error Details: ${JSON.stringify(error)}

Please ensure you have an active chat session before trying to update the report. You may need to send a few messages first to establish context.`,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setProcessingStatus('');
      cleanupProgress();
      console.log(`🏁 [DEBUG] handleUpdateReport finished for ticker: ${ticker}`);
    }
  };

  const handleClearChat = () => {
    // Clear just the messages to reset context window, but keep the session active
    setMessages([{
      role: 'assistant',
      content: `Chat context cleared for ${ticker}${reportPath ? ' with loaded report' : ''}. Ask me anything!`,
      timestamp: new Date()
    }]);
    setInput('');
    
    // Also clear from localStorage for this ticker
    const historyKey = `chatHistory_${ticker}`;
    localStorage.removeItem(historyKey);
  };

  const handleReset = () => {
    // DON'T clear history when going back to reports - just clear UI state
    setTicker('');
    setReportPath('');
    setMessages([]);
    setInput('');
    setSessionStarted(false);
    setIsStreaming(false);
    setIsLoadingHistory(false);
    onClearReport();
  };


  // If no preloaded report, show setup form
  if (!preloadedReport && !sessionStarted) {
    return (
      <div className="chat">
        <div className="chat-setup">
          <h2>Stock Chat</h2>
          <p className="description">
            Have interactive conversations about specific stocks with AI analysis
          </p>

          <div className="setup-form">
            <div className="form-group">
              <label htmlFor="chat-ticker">Ticker Symbol *</label>
              <input
                id="chat-ticker"
                type="text"
                value={ticker}
                onChange={(e) => setTicker(e.target.value.toUpperCase())}
                placeholder="AAPL"
                maxLength={5}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="chat-report">Report Path (optional)</label>
              <input
                id="chat-report"
                type="text"
                value={reportPath}
                onChange={(e) => setReportPath(e.target.value)}
                placeholder="./reports/research-AAPL-2025-10-11T14-30-00.md"
              />
              <p className="hint">Load an existing report for context-aware chat</p>
            </div>

            <button onClick={handleStartSession} className="start-button">
              Start Chat Session
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="chat">
      <div className="chat-container">
        <div className="chat-header">
          <div className="header-left">
            <button onClick={handleReset} className="back-button">
              ← Back to Reports
            </button>
          </div>
          <div className="header-center">
            <h2>familyoffice</h2>
            <div className="ticker-row">
              <p className="ticker-info">{ticker}{reportPath && ' • 📄 Report loaded'}</p>
              <div className="header-buttons">
                {reportPath && (
                  <button onClick={handleUpdateReport} className="update-report-button" disabled={isLoading}>
                    📝 Update Report
                  </button>
                )}
                <button onClick={handleClearChat} className="clear-button">
                  🗑️ Clear Chat
                </button>
              </div>
            </div>
          </div>
          <div className="header-right">
          </div>
        </div>

        <div className="messages">
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
                {/* Show streaming cursor for assistant messages that are being streamed */}
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
    </div>
  );
}

export default Chat;

