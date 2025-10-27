/**
 * Utility functions for generating table of contents from markdown
 */

export interface TocItem {
  id: string;
  level: number;
  text: string;
  children: TocItem[];
}

/**
 * Parse markdown content and extract headers to generate TOC
 */
export function generateTocFromMarkdown(markdown: string): TocItem[] {
  const lines = markdown.split('\n');
  const tocItems: TocItem[] = [];
  const stack: TocItem[] = [];

  lines.forEach((line, index) => {
    const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headerMatch) {
      const level = headerMatch[1].length;
      const text = headerMatch[2].trim();
      
      // Generate a unique ID from the text
      const id = generateIdFromText(text, index);

      const item: TocItem = {
        id,
        level,
        text,
        children: [],
      };

      // Find the appropriate parent
      while (stack.length > 0 && stack[stack.length - 1].level >= level) {
        stack.pop();
      }

      if (stack.length === 0) {
        // Top-level item
        tocItems.push(item);
      } else {
        // Add as child of the last item in stack
        stack[stack.length - 1].children.push(item);
      }

      stack.push(item);
    }
  });

  return tocItems;
}

/**
 * Generate a URL-safe ID from header text
 */
function generateIdFromText(text: string, index: number): string {
  // Remove markdown formatting (bold, italic, links, etc.)
  const cleanText = text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove links but keep text
    .replace(/[*_~`]/g, '') // Remove formatting markers
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-'); // Replace spaces with hyphens

  // Add index to ensure uniqueness
  return `${cleanText}-${index}`;
}

/**
 * Add IDs to headers in markdown content for anchor linking
 */
export function addIdsToMarkdownHeaders(markdown: string): string {
  const lines = markdown.split('\n');
  
  return lines.map((line, index) => {
    const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headerMatch) {
      const hashes = headerMatch[1];
      const text = headerMatch[2].trim();
      const id = generateIdFromText(text, index);
      
      // Add id attribute using HTML anchor tag
      // This works because most markdown renderers support inline HTML
      return `<a id="${id}"></a>\n${line}`;
    }
    return line;
  }).join('\n');
}

/**
 * Flatten TOC tree into a linear array for navigation
 */
export function flattenToc(items: TocItem[]): TocItem[] {
  const result: TocItem[] = [];
  
  function traverse(items: TocItem[]) {
    items.forEach((item) => {
      result.push(item);
      if (item.children.length > 0) {
        traverse(item.children);
      }
    });
  }
  
  traverse(items);
  return result;
}

/**
 * Get the current section based on scroll position
 */
export function getCurrentSection(
  tocItems: TocItem[],
  scrollContainer: HTMLElement
): string | null {
  const flatItems = flattenToc(tocItems);
  const scrollTop = scrollContainer.scrollTop;
  const containerTop = scrollContainer.getBoundingClientRect().top;

  let currentId: string | null = null;
  let minDistance = Infinity;

  flatItems.forEach((item) => {
    const element = document.getElementById(item.id);
    if (element) {
      const elementTop = element.getBoundingClientRect().top - containerTop + scrollTop;
      const distance = scrollTop - elementTop;

      // Find the closest section that we've scrolled past
      if (distance >= -100 && distance < minDistance) {
        minDistance = distance;
        currentId = item.id;
      }
    }
  });

  return currentId;
}

/**
 * Smooth scroll to a section
 */
export function scrollToSection(id: string, container: HTMLElement) {
  const element = document.getElementById(id);
  if (element && container) {
    const containerTop = container.getBoundingClientRect().top;
    const elementTop = element.getBoundingClientRect().top;
    const offset = elementTop - containerTop - 20; // 20px offset for padding

    container.scrollBy({
      top: offset,
      behavior: 'smooth',
    });
  }
}

/**
 * Calculate reading progress as percentage
 */
export function calculateReadingProgress(scrollContainer: HTMLElement): number {
  const scrollTop = scrollContainer.scrollTop;
  const scrollHeight = scrollContainer.scrollHeight;
  const clientHeight = scrollContainer.clientHeight;

  if (scrollHeight <= clientHeight) {
    return 100;
  }

  const progress = (scrollTop / (scrollHeight - clientHeight)) * 100;
  return Math.min(Math.max(progress, 0), 100);
}

