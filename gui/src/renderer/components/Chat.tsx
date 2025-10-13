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
    setIsLoading(true);

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

    try {
      const response = await window.electronAPI.runChat(
        ticker.toUpperCase(),
        currentInput,
        reportPath || undefined
      );

      // Final update with complete response (in case streaming missed anything)
      setMessages(prev => prev.map(msg => 
        (msg as any).id === assistantMessageId 
          ? { ...msg, content: response || 'No response received.' }
          : msg
      ));
    } catch (error) {
      // Replace the streaming message with error
      setMessages(prev => prev.map(msg => 
        (msg as any).id === assistantMessageId 
          ? { ...msg, content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}` }
          : msg
      ));
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
      cleanupStream(); // Clean up the streaming listener
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
              <button onClick={handleClearChat} className="clear-button">
                🗑️ Clear Chat
              </button>
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
                  <span className="streaming-cursor">▋</span>
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
                <span className="typing-indicator">●●●</span>
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

