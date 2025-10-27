/**
 * Debug utilities to check localStorage contents
 * 
 * Usage in browser console:
 * - window.debugStorage.checkReports() - Check reports in localStorage
 * - window.debugStorage.checkMetadata() - Check research metadata
 * - window.debugStorage.compareWithDisk() - Compare localStorage with disk
 */

import type { Report } from "../../shared/types";
import { loadReportsFromLocalStorage } from "./reportsCache";

export function checkReports() {
  console.log("🔍 Checking reports in localStorage...");
  
  const rawData = localStorage.getItem("reports");
  
  if (!rawData) {
    console.log("❌ No 'reports' key found in localStorage");
    return;
  }
  
  try {
    const reports = JSON.parse(rawData) as Report[];
    console.log(`✅ Found ${reports.length} reports in localStorage`);
    console.log("\n📋 Report tickers:");
    
    const tickers = reports.map(r => r.ticker).sort();
    console.log(tickers.join(", "));
    
    console.log("\n📊 Reports by ticker:");
    const byTicker = reports.reduce((acc, r) => {
      acc[r.ticker] = (acc[r.ticker] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.table(byTicker);
    
    console.log("\n📝 Report details:");
    console.table(
      reports.map(r => ({
        ticker: r.ticker,
        company: r.company || "N/A",
        type: r.type,
        date: new Date(r.date).toLocaleString(),
        hasContent: r.content ? "✅" : "❌",
        contentLength: r.content?.length || 0
      }))
    );
    
    return reports;
  } catch (error) {
    console.error("❌ Failed to parse reports from localStorage:", error);
  }
}

export function checkMetadata() {
  console.log("🔍 Checking research metadata in localStorage...");
  
  const rawData = localStorage.getItem("researchMetadata");
  
  if (!rawData) {
    console.log("❌ No 'researchMetadata' key found in localStorage");
    return;
  }
  
  try {
    const metadata = JSON.parse(rawData);
    console.log(`✅ Found ${metadata.length} research runs in metadata`);
    
    console.log("\n📋 Metadata tickers:");
    const tickers = [...new Set(metadata.map((m: any) => m.ticker))].sort();
    console.log(tickers.join(", "));
    
    console.table(
      metadata.map((m: any) => ({
        ticker: m.ticker,
        type: m.type,
        date: new Date(m.timestamp).toLocaleString(),
        tokens: m.usage.total_tokens,
        cost: `$${m.cost.total_cost.toFixed(4)}`
      }))
    );
    
    return metadata;
  } catch (error) {
    console.error("❌ Failed to parse metadata from localStorage:", error);
  }
}

export async function compareWithDisk() {
  console.log("🔍 Comparing localStorage with disk...");
  
  try {
    // Get reports from localStorage
    const localReports = loadReportsFromLocalStorage() || [];
    console.log(`💾 LocalStorage has ${localReports.length} reports`);
    
    // Get reports from disk via IPC
    const diskReports = await window.electronAPI.getReports();
    console.log(`📂 Disk has ${diskReports.length} reports`);
    
    const localTickers = new Set(localReports.map(r => r.ticker));
    const diskTickers = new Set(diskReports.map(r => r.ticker));
    
    // Find reports on disk but not in localStorage
    const missingInLocal = diskReports.filter(r => {
      return !localReports.some(lr => lr.path === r.path);
    });
    
    if (missingInLocal.length > 0) {
      console.log(`\n⚠️ ${missingInLocal.length} reports on disk are missing from localStorage:`);
      console.table(missingInLocal.map(r => ({
        ticker: r.ticker,
        filename: r.filename,
        company: r.company || "N/A"
      })));
    } else {
      console.log("\n✅ All disk reports are in localStorage");
    }
    
    // Find reports in localStorage but not on disk
    const missingOnDisk = localReports.filter(r => {
      return !diskReports.some(dr => dr.path === r.path);
    });
    
    if (missingOnDisk.length > 0) {
      console.log(`\n⚠️ ${missingOnDisk.length} reports in localStorage are missing from disk:`);
      console.table(missingOnDisk.map(r => ({
        ticker: r.ticker,
        filename: r.filename,
        company: r.company || "N/A"
      })));
    } else {
      console.log("\n✅ All localStorage reports exist on disk");
    }
    
    return {
      localStorage: localReports,
      disk: diskReports,
      missingInLocal,
      missingOnDisk
    };
  } catch (error) {
    console.error("❌ Failed to compare:", error);
  }
}

export function clearReports() {
  const confirm = window.confirm(
    "⚠️ This will clear all reports from localStorage. Are you sure?"
  );
  
  if (confirm) {
    localStorage.removeItem("reports");
    console.log("🧹 Cleared reports from localStorage");
  }
}

export function getAllStorageKeys() {
  console.log("🔍 All localStorage keys:");
  const keys = Object.keys(localStorage);
  console.log(keys);
  
  keys.forEach(key => {
    const value = localStorage.getItem(key);
    const size = value ? value.length : 0;
    console.log(`  ${key}: ${(size / 1024).toFixed(2)} KB`);
  });
  
  return keys;
}

// Export to window for console access
if (typeof window !== "undefined") {
  (window as any).debugStorage = {
    checkReports,
    checkMetadata,
    compareWithDisk,
    clearReports,
    getAllStorageKeys
  };
  
  console.log(
    "💡 Debug storage utilities loaded. Use window.debugStorage to access:",
  );
  console.log("  - window.debugStorage.checkReports()");
  console.log("  - window.debugStorage.checkMetadata()");
  console.log("  - window.debugStorage.compareWithDisk()");
  console.log("  - window.debugStorage.getAllStorageKeys()");
}

