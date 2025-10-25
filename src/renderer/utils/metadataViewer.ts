/**
 * Utility functions to view and analyze research metadata stored in localStorage
 * 
 * Usage in browser console:
 * - viewMetadata() - View all metadata
 * - getMetadataStats() - Get summary statistics
 * - getMetadataByTicker('AAPL') - Get metadata for specific ticker
 * - getTotalCost() - Get total cost across all research runs
 */

export interface ResearchMetadata {
  id: string;
  ticker: string;
  type: 'research' | 'reevaluate' | 'update' | 'chat';
  timestamp: string;
  startTime: string;
  endTime: string;
  duration: number;
  usage: {
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
  };
  cost: {
    input_cost: number;
    output_cost: number;
    total_cost: number;
  };
  logs: string[];
  reportPath?: string;
}

export async function getAllMetadata(): Promise<ResearchMetadata[]> {
  try {
    if (typeof window !== 'undefined' && window.electronAPI) {
      return await window.electronAPI.getMetadata();
    }
    return [];
  } catch (error) {
    console.error('Failed to load metadata:', error);
    return [];
  }
}

export async function getMetadataByTicker(ticker: string): Promise<ResearchMetadata[]> {
  const allMetadata = await getAllMetadata();
  return allMetadata.filter(m => m.ticker.toUpperCase() === ticker.toUpperCase());
}

export async function getMetadataStats() {
  const allMetadata = await getAllMetadata();
  
  if (allMetadata.length === 0) {
    return {
      totalRuns: 0,
      totalTokens: 0,
      totalCost: 0,
      averageCost: 0,
      averageDuration: 0,
      byType: {},
      byTicker: {}
    };
  }

  const totalTokens = allMetadata.reduce((sum, m) => sum + m.usage.total_tokens, 0);
  const totalCost = allMetadata.reduce((sum, m) => sum + m.cost.total_cost, 0);
  const totalDuration = allMetadata.reduce((sum, m) => sum + m.duration, 0);
  
  const byType = allMetadata.reduce((acc, m) => {
    acc[m.type] = (acc[m.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const byTicker = allMetadata.reduce((acc, m) => {
    if (!acc[m.ticker]) {
      acc[m.ticker] = { count: 0, totalCost: 0 };
    }
    acc[m.ticker].count += 1;
    acc[m.ticker].totalCost += m.cost.total_cost;
    return acc;
  }, {} as Record<string, { count: number; totalCost: number }>);

  const averageCost = allMetadata.length > 0 ? totalCost / allMetadata.length : 0;
  const averageDuration = allMetadata.length > 0 ? totalDuration / allMetadata.length : 0;
  
  return {
    totalRuns: allMetadata.length,
    totalTokens,
    totalCost: totalCost,
    averageCost,
    averageDuration,
    byType,
    byTicker,
    mostExpensiveTicker: Object.entries(byTicker).sort((a, b) => b[1].totalCost - a[1].totalCost)[0],
    mostResearchedTicker: Object.entries(byTicker).sort((a, b) => b[1].count - a[1].count)[0]
  };
}

export async function getTotalCost(): Promise<number> {
  const allMetadata = await getAllMetadata();
  return allMetadata.reduce((sum, m) => sum + m.cost.total_cost, 0);
}

export function formatCost(cost: number): string {
  return `$${cost.toFixed(4)}`;
}

export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

export async function viewMetadata() {
  const metadata = await getAllMetadata();
  console.log('📊 Research Metadata:');
  console.table(metadata.map(m => ({
    Ticker: m.ticker,
    Type: m.type,
    Date: new Date(m.timestamp).toLocaleString(),
    Duration: formatDuration(m.duration),
    Tokens: m.usage.total_tokens.toLocaleString(),
    Cost: formatCost(m.cost.total_cost),
    'Input Tokens': m.usage.input_tokens.toLocaleString(),
    'Output Tokens': m.usage.output_tokens.toLocaleString()
  })));
  
  const stats = await getMetadataStats();
  console.log('\n📈 Summary Statistics:');
  console.log(`Total Runs: ${stats.totalRuns}`);
  console.log(`Total Tokens: ${stats.totalTokens.toLocaleString()}`);
  console.log(`Total Cost: ${formatCost(stats.totalCost)}`);
  console.log(`Average Cost: ${formatCost(stats.averageCost)}`);
  console.log(`Average Duration: ${formatDuration(stats.averageDuration)}`);
  
  if (stats.byType) {
    console.log('\n📊 By Type:');
    console.table(stats.byType);
  }
  
  if (stats.mostExpensiveTicker) {
    console.log(`\n💰 Most Expensive Ticker: ${stats.mostExpensiveTicker[0]} (${formatCost(stats.mostExpensiveTicker[1].totalCost)})`);
  }
  
  if (stats.mostResearchedTicker) {
    console.log(`📈 Most Researched Ticker: ${stats.mostResearchedTicker[0]} (${stats.mostResearchedTicker[1].count} runs)`);
  }
  
  return metadata;
}

export async function exportMetadata(): Promise<string> {
  if (typeof window === 'undefined') return 'Export not available';
  
  const metadata = await getAllMetadata();
  const json = JSON.stringify(metadata, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `research-metadata-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
  return `Exported ${metadata.length} records`;
}

export async function clearMetadata(): Promise<boolean> {
  if (typeof window === 'undefined' || !window.electronAPI) return false;
  
  if (confirm('Are you sure you want to clear all research metadata? This cannot be undone.')) {
    const success = await window.electronAPI.clearMetadata();
    if (success) {
      console.log('✅ Metadata cleared');
    }
    return success;
  }
  return false;
}

// Save metadata helper function for components to use
export async function saveMetadata(metadata: ResearchMetadata): Promise<boolean> {
  if (typeof window !== 'undefined' && window.electronAPI) {
    return await window.electronAPI.saveMetadata(metadata);
  }
  return false;
}

// Make functions available in browser console
if (typeof window !== 'undefined') {
  (window as any).researchMetadata = {
    viewAll: viewMetadata,
    getStats: getMetadataStats,
    getByTicker: getMetadataByTicker,
    getTotalCost,
    export: exportMetadata,
    clear: clearMetadata
  };
  console.log('💡 Research metadata utilities loaded. Use window.researchMetadata to access:');
  console.log('  - viewAll() - View all metadata');
  console.log('  - getStats() - Get summary statistics');
  console.log('  - getByTicker(ticker) - Get metadata for specific ticker');
  console.log('  - getTotalCost() - Get total cost');
  console.log('  - export() - Export metadata to JSON file');
  console.log('  - clear() - Clear all metadata');
}

