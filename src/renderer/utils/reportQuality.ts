/**
 * Report quality assessment utilities
 * Analyzes report content and provides quality indicators
 */

export type QualityLevel = 'excellent' | 'good' | 'needs-review' | 'incomplete';

export interface QualityAssessment {
  level: QualityLevel;
  score: number; // 0-100
  issues: string[];
  strengths: string[];
}

/**
 * Assess the quality of a research report
 */
export function assessReportQuality(content?: string): QualityAssessment {
  if (!content) {
    return {
      level: 'incomplete',
      score: 0,
      issues: ['No content available'],
      strengths: [],
    };
  }

  const issues: string[] = [];
  const strengths: string[] = [];
  let score = 0;

  // Check length (good reports are typically 2000+ words)
  const wordCount = content.split(/\s+/).length;
  if (wordCount >= 2000) {
    score += 25;
    strengths.push('Comprehensive analysis');
  } else if (wordCount >= 1000) {
    score += 15;
  } else {
    issues.push('Report may be too brief');
  }

  // Check for required sections (common markdown headers)
  const requiredSections = [
    /^#+\s*(Investment|Executive|Summary)/im,
    /^#+\s*(Valuation|Price|Financial)/im,
    /^#+\s*(Risk|Challenge)/im,
    /^#+\s*(Recommendation|Conclusion)/im,
  ];

  let sectionsFound = 0;
  for (const sectionPattern of requiredSections) {
    if (sectionPattern.test(content)) {
      sectionsFound++;
    }
  }

  if (sectionsFound >= 3) {
    score += 25;
    strengths.push('Well-structured');
  } else if (sectionsFound >= 2) {
    score += 15;
  } else {
    issues.push('Missing key sections');
  }

  // Check for placeholder text
  const placeholders = [
    /\[TODO\]/i,
    /\[TBD\]/i,
    /\[Insert\s+/i,
    /\{placeholder\}/i,
    /Lorem ipsum/i,
  ];

  let hasPlaceholders = false;
  for (const placeholder of placeholders) {
    if (placeholder.test(content)) {
      hasPlaceholders = true;
      issues.push('Contains placeholder text');
      break;
    }
  }

  if (!hasPlaceholders) {
    score += 20;
    strengths.push('Complete content');
  }

  // Check for data/citations (presence of numbers, percentages, sources)
  const hasNumbers = /\$[\d,.]+|\d+%|\d+[KMB]?/.test(content);
  const hasSources = /\[.*?\]\(http|Source:|According to|per\s+\w+\s+report/i.test(content);

  if (hasNumbers && hasSources) {
    score += 20;
    strengths.push('Well-researched with citations');
  } else if (hasNumbers || hasSources) {
    score += 10;
  } else {
    issues.push('Limited data or citations');
  }

  // Check for recent/specific dates (reports with specific dates are more current)
  const hasRecentDates = /202[3-9]|Q[1-4]\s+202[3-9]/i.test(content);
  if (hasRecentDates) {
    score += 10;
    strengths.push('Recent data');
  }

  // Determine quality level based on score
  let level: QualityLevel;
  if (score >= 80) {
    level = 'excellent';
  } else if (score >= 60) {
    level = 'good';
  } else if (score >= 40) {
    level = 'needs-review';
  } else {
    level = 'incomplete';
  }

  return {
    level,
    score,
    issues,
    strengths,
  };
}

/**
 * Get display properties for a quality level
 */
export function getQualityDisplay(level: QualityLevel): {
  icon: string;
  label: string;
  color: string;
  bgColor: string;
} {
  switch (level) {
    case 'excellent':
      return {
        icon: '✨',
        label: 'Excellent',
        color: '#10b981',
        bgColor: '#d1fae5',
      };
    case 'good':
      return {
        icon: '✓',
        label: 'Good',
        color: '#0071e3',
        bgColor: '#dbeafe',
      };
    case 'needs-review':
      return {
        icon: '⚠️',
        label: 'Needs Review',
        color: '#f59e0b',
        bgColor: '#fef3c7',
      };
    case 'incomplete':
      return {
        icon: '❌',
        label: 'Incomplete',
        color: '#ef4444',
        bgColor: '#fee2e2',
      };
  }
}

