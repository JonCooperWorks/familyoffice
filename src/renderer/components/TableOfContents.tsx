import { useState, useEffect } from "react";
import type { TocItem } from "../utils/markdownToc";
import { scrollToSection } from "../utils/markdownToc";
import "./TableOfContents.css";

interface TableOfContentsProps {
  items: TocItem[];
  currentSection: string | null;
  scrollContainer: HTMLElement | null;
  isCollapsed: boolean;
  onToggle: () => void;
}

export function TableOfContents({
  items,
  currentSection,
  scrollContainer,
  isCollapsed,
  onToggle,
}: TableOfContentsProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set()
  );

  // Auto-expand sections containing the current section
  useEffect(() => {
    if (currentSection) {
      const newExpanded = new Set(expandedSections);
      
      // Find parent sections and expand them
      function findAndExpandParents(items: TocItem[], targetId: string): boolean {
        for (const item of items) {
          if (item.id === targetId) {
            return true;
          }
          if (item.children.length > 0) {
            if (findAndExpandParents(item.children, targetId)) {
              newExpanded.add(item.id);
              return true;
            }
          }
        }
        return false;
      }

      findAndExpandParents(items, currentSection);
      setExpandedSections(newExpanded);
    }
  }, [currentSection]);

  const handleItemClick = (id: string) => {
    if (scrollContainer) {
      scrollToSection(id, scrollContainer);
    }
  };

  const toggleSection = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedSections(newExpanded);
  };

  const renderTocItem = (item: TocItem, depth: number = 0) => {
    const hasChildren = item.children.length > 0;
    const isExpanded = expandedSections.has(item.id);
    const isCurrent = currentSection === item.id;

    return (
      <li key={item.id} className="toc-item">
        <div
          className={`toc-link ${isCurrent ? "active" : ""}`}
          style={{ paddingLeft: `${depth * 12 + 12}px` }}
          onClick={() => handleItemClick(item.id)}
        >
          {hasChildren && (
            <button
              className={`toc-toggle ${isExpanded ? "expanded" : ""}`}
              onClick={(e) => toggleSection(item.id, e)}
              aria-label={isExpanded ? "Collapse" : "Expand"}
            >
              ›
            </button>
          )}
          <span className="toc-text">{item.text}</span>
        </div>
        {hasChildren && isExpanded && (
          <ul className="toc-children">
            {item.children.map((child) => renderTocItem(child, depth + 1))}
          </ul>
        )}
      </li>
    );
  };

  if (items.length === 0) {
    return null;
  }

  return (
    <aside className={`toc-sidebar ${isCollapsed ? "collapsed" : ""}`}>
      <div className="toc-header">
        <h3 className="toc-title">Contents</h3>
        <button
          className="toc-collapse-btn"
          onClick={onToggle}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? "›" : "‹"}
        </button>
      </div>
      {!isCollapsed && (
        <nav className="toc-nav">
          <ul className="toc-list">
            {items.map((item) => renderTocItem(item))}
          </ul>
        </nav>
      )}
    </aside>
  );
}

