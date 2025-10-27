import { useEffect, useState, useCallback } from "react";
import { Command } from "cmdk";
import type { Report } from "../../shared/types";
import "./CommandPalette.css";

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (view: "reports" | "stats") => void;
  onOpenReport: (reportPath: string) => void;
  onStartResearch: () => void;
  onStartResearchWithTicker?: (ticker: string) => void;
  currentView: string;
  currentReportPath?: string;
  reports: Report[];
}

export function CommandPalette({
  isOpen,
  onClose,
  onNavigate,
  onOpenReport,
  onStartResearch,
  onStartResearchWithTicker,
  currentView,
  currentReportPath,
  reports,
}: CommandPaletteProps) {
  const [search, setSearch] = useState("");

  // Reset state when closing
  useEffect(() => {
    if (!isOpen) {
      setSearch("");
    }
  }, [isOpen]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Close on Escape
      if (e.key === "Escape") {
        onClose();
        return;
      }
      
      // Arrow keys are handled automatically by cmdk
      // No need to prevent default for them
    };

    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, onClose]);

  const handleSelect = useCallback(
    (callback: () => void) => {
      callback();
      onClose();
    },
    [onClose]
  );

  // Check if search term looks like a ticker and doesn't match any existing reports
  const searchTicker = search.trim().toUpperCase();
  const isValidTicker = /^[A-Z0-9.]{1,6}$/.test(searchTicker);
  const tickerExists = reports.some(
    (r) => r.ticker.toUpperCase() === searchTicker
  );
  const showResearchOption = isValidTicker && !tickerExists && search.length > 0;

  if (!isOpen) return null;

  return (
    <div className="command-palette-overlay" onClick={onClose}>
      <Command
        className="command-palette"
        onClick={(e) => e.stopPropagation()}
        shouldFilter={true}
        loop
      >
        <div className="command-palette-header">
          <svg
            className="command-palette-icon"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <Command.Input
            value={search}
            onValueChange={setSearch}
            placeholder="Type a command or search..."
            className="command-palette-input"
            autoFocus
          />
          <kbd className="command-palette-kbd">ESC</kbd>
        </div>

        <Command.List className="command-palette-list">
          <Command.Empty className="command-palette-empty">
            {showResearchOption
              ? `No report found for ${searchTicker}. Select "Research ${searchTicker}..." to create one.`
              : "No results found."}
          </Command.Empty>

          <>
              <Command.Group heading="Navigation" className="command-group">
                <Command.Item
                  onSelect={() => handleSelect(() => onNavigate("reports"))}
                  className="command-item"
                  disabled={currentView === "reports"}
                >
                  <span className="command-icon">📊</span>
                  <span className="command-label">Go to Reports</span>
                  <kbd className="command-shortcut">⌘1</kbd>
                </Command.Item>
                <Command.Item
                  onSelect={() => handleSelect(() => onNavigate("stats"))}
                  className="command-item"
                  disabled={currentView === "stats"}
                >
                  <span className="command-icon">📈</span>
                  <span className="command-label">Go to Stats</span>
                  <kbd className="command-shortcut">⌘2</kbd>
                </Command.Item>
              </Command.Group>

              <Command.Separator className="command-separator" />

              <Command.Group heading="Actions" className="command-group">
                <Command.Item
                  onSelect={() => handleSelect(onStartResearch)}
                  className="command-item"
                >
                  <span className="command-icon">🔍</span>
                  <span className="command-label">Research new stock...</span>
                  <kbd className="command-shortcut">⌘N</kbd>
                </Command.Item>
                {currentReportPath && (
                  <>
                    <Command.Item
                      onSelect={() =>
                        handleSelect(() => {
                          // Trigger reevaluate - this will need to be passed as a prop
                          console.log("Reevaluate current report");
                        })
                      }
                      className="command-item"
                    >
                      <span className="command-icon">🔄</span>
                      <span className="command-label">Reevaluate current report</span>
                      <kbd className="command-shortcut">⌘R</kbd>
                    </Command.Item>
                    <Command.Item
                      onSelect={() =>
                        handleSelect(() => {
                          // Trigger export - this will need to be passed as a prop
                          console.log("Export current report");
                        })
                      }
                      className="command-item"
                    >
                      <span className="command-icon">📤</span>
                      <span className="command-label">Export current report</span>
                      <kbd className="command-shortcut">⌘E</kbd>
                    </Command.Item>
                  </>
                )}
              </Command.Group>

              <Command.Separator className="command-separator" />

              {showResearchOption && (
                <>
                  <Command.Group heading="No Report Found" className="command-group">
                    <Command.Item
                      onSelect={() =>
                        handleSelect(() => {
                          if (onStartResearchWithTicker) {
                            // Use the callback to directly start research
                            onStartResearchWithTicker(searchTicker);
                          } else {
                            // Fallback to DOM manipulation
                            onNavigate("reports");
                            setTimeout(() => {
                              const searchInput = document.querySelector('.search-input') as HTMLInputElement;
                              if (searchInput) {
                                searchInput.value = searchTicker;
                                const event = new Event('change', { bubbles: true });
                                searchInput.dispatchEvent(event);
                                const inputEvent = new Event('input', { bubbles: true });
                                searchInput.dispatchEvent(inputEvent);
                                
                                setTimeout(() => {
                                  const researchBtn = document.querySelector('.research-ticker-button') as HTMLButtonElement;
                                  if (researchBtn) {
                                    researchBtn.click();
                                  }
                                }, 150);
                              }
                            }, 100);
                          }
                        })
                      }
                      className="command-item"
                      value={`Research ${searchTicker}`}
                      keywords={[searchTicker, "research", "new"]}
                    >
                      <span className="command-icon">✨</span>
                      <span className="command-label">
                        Research {searchTicker}...
                      </span>
                    </Command.Item>
                  </Command.Group>
                  <Command.Separator className="command-separator" />
                </>
              )}

              <Command.Group heading="Reports" className="command-group">
                {reports.map((report) => (
                  <Command.Item
                    key={report.path}
                    onSelect={() => handleSelect(() => onOpenReport(report.path))}
                    className="command-item"
                    value={`${report.ticker} ${report.company || ""}`}
                    keywords={[report.ticker, report.company || ""].filter(Boolean)}
                  >
                    <span className="command-icon">
                      {report.type === "research" ? "📄" : "🔄"}
                    </span>
                    <div className="command-report-info">
                      <span className="command-label">{report.ticker}</span>
                      {report.company && report.company !== report.ticker && (
                        <span className="command-description">
                          {report.company}
                        </span>
                      )}
                    </div>
                    <span className="command-date">
                      {new Date(report.date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </Command.Item>
                ))}
              </Command.Group>
          </>
        </Command.List>

        <div className="command-palette-footer">
          <div className="command-palette-shortcuts">
            <span>
              <kbd>↑↓</kbd> Navigate
            </span>
            <span>
              <kbd>↵</kbd> Select
            </span>
            <span>
              <kbd>ESC</kbd> Close
            </span>
          </div>
        </div>
      </Command>
    </div>
  );
}

