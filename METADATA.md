# Research Metadata Storage

The application now automatically stores detailed metadata about each research run in localStorage. This includes token usage, cost calculations, duration, and complete logs.

## What Gets Stored

After each research operation (research, reevaluate, or update report), the following metadata is saved:

- **ID**: Unique identifier for the run
- **Ticker**: Stock ticker symbol
- **Type**: research, reevaluate, or update
- **Timestamps**: Start time, end time, and ISO timestamp
- **Duration**: Total time taken in milliseconds
- **Token Usage**:
  - Input tokens
  - Output tokens
  - Total tokens
- **Cost Breakdown**:
  - Input cost (calculated at $1.25 per million tokens for GPT-5)
  - Output cost (calculated at $10.00 per million tokens for GPT-5)
  - Total cost
- **Logs**: Complete output logs from the research process
- **Report Path**: Path to the generated report file

## Pricing Information

The application uses OpenAI GPT-5 pricing:
- **Input tokens**: $1.25 per million tokens
- **Output tokens**: $10.00 per million tokens
- **Cached input tokens**: $0.125 per million tokens

Pricing is configured centrally in `src/shared/pricing.ts` and can be easily updated when model pricing changes.

## Accessing Metadata

### Browser Console

Open the browser developer console (Cmd+Option+I on Mac, F12 on Windows/Linux) and use these commands:

```javascript
// View all metadata with summary statistics
window.researchMetadata.viewAll()

// Get summary statistics only
window.researchMetadata.getStats()

// Get metadata for a specific ticker
window.researchMetadata.getByTicker('AAPL')

// Get total cost across all research runs
window.researchMetadata.getTotalCost()

// Export all metadata to a JSON file
window.researchMetadata.export()

// Clear all metadata (with confirmation)
window.researchMetadata.clear()
```

### Example Output

When you run `window.researchMetadata.viewAll()`, you'll see:

```
📊 Research Metadata:
┌─────────┬──────────┬────────────┬─────────────────────┬──────────┬──────────┬────────┐
│ (index) │  Ticker  │    Type    │        Date         │ Duration │  Tokens  │  Cost  │
├─────────┼──────────┼────────────┼─────────────────────┼──────────┼──────────┼────────┤
│    0    │ 'TSLA'   │ 'research' │ '10/24/2025, 2:30PM'│  '2m 15s'│ '45,231' │'$0.5823'│
│    1    │ 'AAPL'   │ 'research' │ '10/24/2025, 3:15PM'│  '1m 48s'│ '38,452' │'$0.4921'│
└─────────┴──────────┴────────────┴─────────────────────┴──────────┴──────────┴────────┘

📈 Summary Statistics:
Total Runs: 2
Total Tokens: 83,683
Total Cost: $1.0744
Average Cost: $0.5372
Average Duration: 2m 1s

📊 By Type:
┌──────────┬─────────┐
│ (index)  │ Values  │
├──────────┼─────────┤
│ research │    2    │
└──────────┴─────────┘

💰 Most Expensive Ticker: TSLA ($0.5823)
📈 Most Researched Ticker: TSLA (1 runs)
```

## Data Structure

The metadata is stored in `localStorage` under the key `researchMetadata` as a JSON array:

```json
[
  {
    "id": "TSLA-1729789825123",
    "ticker": "TSLA",
    "type": "research",
    "timestamp": "2025-10-24T14:30:25.123Z",
    "startTime": "2025-10-24T14:28:10.000Z",
    "endTime": "2025-10-24T14:30:25.123Z",
    "duration": 135123,
    "usage": {
      "input_tokens": 35231,
      "output_tokens": 10000,
      "total_tokens": 45231
    },
    "cost": {
      "input_cost": 0.1057,
      "output_cost": 0.1500,
      "total_cost": 0.2557
    },
    "logs": [
      "🔎 Searching: Tesla stock performance...",
      "✅ Found 15 results",
      "..."
    ],
    "reportPath": "/path/to/research-TSLA-2025-10-24T14-30-25.md"
  }
]
```

## Exporting Data

To export all metadata to a JSON file for external analysis:

```javascript
window.researchMetadata.export()
```

This will download a file named `research-metadata-YYYY-MM-DD.json` containing all stored metadata.

## Privacy & Data Management

- All data is stored **locally** in your browser's localStorage
- No data is sent to external servers
- You can clear all metadata at any time using `window.researchMetadata.clear()`
- localStorage has a ~10MB limit per domain; old data may need to be periodically cleared or exported

## Use Cases

1. **Cost Tracking**: Monitor your API usage costs across different research runs
2. **Performance Analysis**: Analyze which types of research take longer or use more tokens
3. **Debugging**: Review complete logs from past research runs
4. **Budgeting**: Track spending per ticker or time period
5. **Optimization**: Identify expensive queries and optimize prompts

## Notes

- Metadata is only saved for **successful** research runs
- If a run fails, no metadata is saved (but logs are still available in the background task output)
- Pricing is configured centrally in `src/shared/pricing.ts` and calculated dynamically
- Token usage data comes directly from the OpenAI API response
- To update pricing, edit the `CURRENT_PRICING` configuration in `src/shared/pricing.ts`

