# Stats UI - Usage Guide

The Stats UI provides a comprehensive visual dashboard for tracking your research API usage, costs, and performance metrics.

## Accessing the Stats UI

Click the **📊 Stats** button in the top navigation bar (next to "📄 Reports").

## Features

### 1. Summary Cards
At the top of the Stats page, you'll see 5 key metrics:
- **Total Runs**: Number of research operations completed
- **Total Tokens**: Combined input + output tokens used
- **Total Cost**: Total spending (highlighted card)
- **Average Cost**: Average cost per research run
- **Average Duration**: Average time per research run

### 2. Breakdown by Type
Shows distribution of runs by type:
- **research**: New research reports
- **reevaluate**: Re-evaluations of existing reports
- **update**: Report updates from chat sessions

### 3. Breakdown by Ticker
Displays your most expensive tickers, sorted by total cost spent. Each ticker shows:
- Number of research runs
- Total cost for that ticker

### 4. Recent Activity Table
A detailed table of all research runs with:
- **Ticker**: Stock symbol
- **Type**: Operation type (color-coded badge)
- **Date**: When the research was run
- **Duration**: How long it took
- **Tokens**: Total, input, and output tokens
- **Cost**: Total cost with breakdown

#### Filters & Sorting
- **Filter by Ticker**: Dropdown to show only specific tickers
- **Sort by**: 
  - Date (newest first)
  - Cost (highest first)
  - Tokens (most first)

### 5. Export & Clear
- **📥 Export Data**: Downloads all metadata as a JSON file for external analysis
- **🗑️ Clear All**: Removes all stored metadata (with confirmation)

## Data Displayed

Each research run captures:
- Start and end timestamps
- Duration in milliseconds
- Input/output token counts
- Cost breakdown (input cost + output cost)
- Complete logs from the research process
- Path to the generated report

## Pricing Information

The Stats UI uses current OpenAI GPT-5 pricing:
- **Input tokens**: $1.25 per million tokens
- **Output tokens**: $10.00 per million tokens
- **Cached input tokens**: $0.125 per million tokens

Pricing is dynamically loaded from `src/shared/pricing.ts`.

## Use Cases

1. **Budget Tracking**: Monitor your API spending over time
2. **Cost Analysis**: Identify which tickers are most expensive to research
3. **Performance Monitoring**: Track how long different types of research take
4. **Token Optimization**: Identify patterns in token usage
5. **Historical Analysis**: Export data for deeper analysis in spreadsheets or BI tools

## Tips

- The Stats UI automatically refreshes when you complete new research
- Data is stored locally in your browser's localStorage
- Export regularly to keep a backup of your usage history
- Use the ticker filter to analyze spending on specific stocks
- Sort by cost to identify the most expensive research runs

## Console Access

You can still access the metadata programmatically via the browser console:

```javascript
// View all data with statistics
window.researchMetadata.viewAll()

// Get just the stats object
window.researchMetadata.getStats()

// Filter by ticker
window.researchMetadata.getByTicker('AAPL')

// Get total cost
window.researchMetadata.getTotalCost()

// Export to file
window.researchMetadata.export()

// Clear all (with confirmation)
window.researchMetadata.clear()
```

## Visual Design

The Stats UI features:
- Clean, modern card-based layout
- Color-coded type badges for easy identification
- Hover effects for better interactivity
- Responsive design that works on different screen sizes
- Highlighted total cost card for quick reference
- Smooth animations and transitions

## Empty State

If you haven't completed any research runs yet, the Stats page will show:
- A friendly empty state message
- Instructions to complete a research run
- The page will automatically populate once you complete your first research

---

**Note**: All data is stored locally in your browser. If you clear your browser's localStorage, this data will be lost. Make sure to export important data regularly!

