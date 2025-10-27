import type { Report } from "../../shared/types";

const REPORTS_STORAGE_KEY = "reports";

/**
 * Save reports to localStorage
 */
export function saveReportsToLocalStorage(reports: Report[]): void {
  try {
    localStorage.setItem(REPORTS_STORAGE_KEY, JSON.stringify(reports));
    console.log("💾 Saved reports to localStorage:", reports.length);
  } catch (error) {
    console.error("Failed to save reports to localStorage:", error);
  }
}

/**
 * Load reports from localStorage
 * @returns Reports array or null if not found/invalid
 */
export function loadReportsFromLocalStorage(): Report[] | null {
  try {
    const data = localStorage.getItem(REPORTS_STORAGE_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      // Convert date strings back to Date objects
      return parsed.map((report: any) => ({
        ...report,
        date: new Date(report.date),
      }));
    }
  } catch (error) {
    console.error("Failed to load reports from localStorage:", error);
  }
  return null;
}

/**
 * Get reports - loads from localStorage only
 * @param forceRefresh - Unused, kept for compatibility
 */
export async function getReports(forceRefresh = false): Promise<Report[]> {
  const cachedReports = loadReportsFromLocalStorage();
  if (cachedReports && cachedReports.length > 0) {
    console.log("📂 Loading reports from localStorage:", cachedReports.length);
    return cachedReports;
  }

  console.log("📂 No reports found in localStorage");
  return [];
}

/**
 * Sync reports - just returns current localStorage reports (no file system)
 */
export async function syncReportsFromFileSystem(): Promise<Report[]> {
  return getReports();
}

/**
 * Remove a report from localStorage
 */
export function removeReportFromLocalStorage(reportPath: string): void {
  const reports = loadReportsFromLocalStorage();
  if (reports) {
    const updatedReports = reports.filter((r) => r.path !== reportPath);
    saveReportsToLocalStorage(updatedReports);
    console.log("🗑️ Removed report from localStorage:", reportPath);
  }
}

/**
 * Clear all reports from localStorage
 */
export function clearReportsFromLocalStorage(): void {
  try {
    localStorage.removeItem(REPORTS_STORAGE_KEY);
    console.log("🧹 Cleared reports from localStorage");
  } catch (error) {
    console.error("Failed to clear reports from localStorage:", error);
  }
}

/**
 * Get report content by path from localStorage
 * @param reportPath - Path to the report
 * @returns Report content or null if not found
 */
export function getReportContent(reportPath: string): string | null {
  const reports = loadReportsFromLocalStorage();
  if (reports) {
    const report = reports.find((r) => r.path === reportPath);
    return report?.content || null;
  }
  return null;
}

/**
 * Get report by ticker from localStorage
 * @param ticker - Ticker symbol
 * @returns Most recent report for the ticker or null if not found
 */
export function getReportByTicker(ticker: string): Report | null {
  const reports = loadReportsFromLocalStorage();
  if (reports) {
    const tickerReports = reports.filter((r) => r.ticker === ticker);
    // Reports are sorted by date, most recent first
    return tickerReports[0] || null;
  }
  return null;
}

/**
 * Add a new report to localStorage
 * @param report - Report to add
 */
export function addReportToLocalStorage(report: Report): void {
  try {
    let reports = loadReportsFromLocalStorage() || [];
    reports.unshift(report); // Add to beginning (most recent first)
    saveReportsToLocalStorage(reports);
    console.log("💾 Added new report to localStorage:", report.ticker);
  } catch (error) {
    console.error("Failed to add report to localStorage:", error);
  }
}

/**
 * Migrate existing reports from file system to localStorage (one-time operation)
 * This is useful if you have old reports on disk that need to be imported
 * @deprecated - All reports are now stored in localStorage only
 */
export async function migrateReportsFromFileSystem(): Promise<number> {
  console.log("📂 Migration skipped - all reports stored in localStorage");
  return 0;
}

