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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load chat history from localStorage on mount
  useEffect(() => {
    const savedHistory = localStorage.getItem('chatHistory');
    if (savedHistory) {
      try {
        const parsed = JSON.parse(savedHistory);
        setMessages(parsed.messages || []);
        setTicker(parsed.ticker || '');
        setReportPath(parsed.reportPath || '');
        setSessionStarted(parsed.sessionStarted || false);
      } catch (error) {
        console.error('Failed to load chat history:', error);
      }
    }
  }, []);

  // Save chat history to localStorage whenever it changes
  useEffect(() => {
    if (messages.length > 0 || sessionStarted) {
      localStorage.setItem('chatHistory', JSON.stringify({
        messages,
        ticker,
        reportPath,
        sessionStarted
      }));
    }
  }, [messages, ticker, reportPath, sessionStarted]);

  useEffect(() => {
    if (preloadedReport) {
      setReportPath(preloadedReport);
      
      // Extract ticker from filename
      const match = preloadedReport.match(/research-([A-Z]+)-/);
      if (match) {
        setTicker(match[1]);
        // Auto-start the session when we have a preloaded report
        setSessionStarted(true);
        setMessages([{
          role: 'assistant',
          content: `Chat session started for ${match[1]} with loaded report. Ask me anything about this stock!`,
          timestamp: new Date()
        }]);
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

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Note: This is simplified. The real chat would need proper handling
      // For now, we'll show a message that chat needs CLI enhancement
      const response = await window.electronAPI.runChat(
        ticker.toUpperCase(),
        input,
        reportPath || undefined
      );

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: response || 'Chat functionality requires CLI enhancement for non-interactive mode.',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setTicker('');
    setReportPath('');
    setMessages([]);
    setInput('');
    setSessionStarted(false);
    localStorage.removeItem('chatHistory');
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
          <button onClick={handleReset} className="back-button">
            ← Back to Reports
          </button>
          <div>
            <h2>{ticker}</h2>
            {reportPath && <p className="report-loaded">📄 Report loaded</p>}
          </div>
        </div>

        <div className="messages">
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

