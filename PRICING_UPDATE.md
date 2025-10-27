# Pricing Configuration Update

**Date:** October 27, 2025  
**Update:** Migrated from Claude 3.5 Sonnet to OpenAI GPT-5 pricing with centralized dynamic pricing calculation

## Summary

All pricing calculations have been updated from hardcoded Claude pricing to centralized OpenAI GPT-5 pricing. The application now uses dynamic cost calculations that can be easily updated by modifying a single configuration file.

---

## Changes Made

### 1. New Centralized Pricing Module

Created `src/shared/pricing.ts` - a centralized pricing configuration module that:
- Defines pricing for multiple models (GPT-5, GPT-5 Mini, GPT-5 Nano, Claude 3.5 Sonnet)
- Provides a `calculateCost()` function for dynamic cost calculations
- Includes helper functions for formatting and displaying pricing information
- Makes it easy to switch between models or update pricing

### 2. Updated Pricing Values

**Previous (Claude 3.5 Sonnet):**
- Input: $3.00 per million tokens
- Output: $15.00 per million tokens

**Current (OpenAI GPT-5):**
- Input: $1.25 per million tokens
- Output: $10.00 per million tokens
- Cached Input: $0.125 per million tokens

**Cost Impact:** ~58% reduction in input costs, ~33% reduction in output costs

### 3. Files Modified

#### Core Application Files
1. **`src/shared/pricing.ts`** (NEW)
   - Centralized pricing configuration
   - Dynamic cost calculation function
   - Multiple model options for easy switching

2. **`src/main/index.ts`**
   - Replaced hardcoded pricing in `run-research` handler (line ~281-288)
   - Replaced hardcoded pricing in `update-report` handler (line ~417-425)
   - Now imports and uses `calculateCost()` from shared module

3. **`src/renderer/App.tsx`**
   - Removed local pricing constants and calculation function
   - Now imports `calculateCost()` from shared module

4. **`src/renderer/components/Stats.tsx`**
   - Updated to dynamically display current pricing from configuration
   - Shows provider, model, and all applicable rates
   - Displays cached input pricing when available

#### Documentation Files
5. **`METADATA.md`**
   - Updated pricing information section
   - Added instructions for updating pricing
   - Changed from Claude to OpenAI references

6. **`STATS_UI.md`**
   - Updated pricing information section
   - Added note about dynamic pricing loading

---

## How Pricing is Calculated (Before vs After)

### Before (Hardcoded)
```typescript
// Multiple locations with duplicated code
const INPUT_COST_PER_MILLION = 3.0;
const OUTPUT_COST_PER_MILLION = 15.0;

const input_cost = (input_tokens / 1_000_000) * INPUT_COST_PER_MILLION;
const output_cost = (output_tokens / 1_000_000) * OUTPUT_COST_PER_MILLION;
const total_cost = input_cost + output_cost;
```

**Problems:**
- Pricing hardcoded in 3+ locations
- Difficult to update when pricing changes
- Easy to miss locations when updating
- No support for different models

### After (Centralized & Dynamic)
```typescript
// Single import across all files
import { calculateCost } from "../shared/pricing";

// Single function call
const costs = calculateCost(input_tokens, output_tokens);
```

**Benefits:**
- Single source of truth for pricing
- Update once, applies everywhere
- Type-safe with proper interfaces
- Support for multiple models
- Support for cached token pricing
- Easy to add new pricing tiers

---

## How to Update Pricing in the Future

### Option 1: Update Current Model Pricing
Edit `src/shared/pricing.ts` and modify the `CURRENT_PRICING` object:

```typescript
export const CURRENT_PRICING: ModelPricing = {
  provider: "OpenAI",
  model: "GPT-5",
  inputPerMillion: 1.25,    // Update this
  outputPerMillion: 10.0,   // Update this
  cachedInputPerMillion: 0.125, // Update this
};
```

### Option 2: Switch to a Different Model
Change `CURRENT_PRICING` to reference a different model:

```typescript
// Switch to GPT-5 Mini for cost savings
export const CURRENT_PRICING: ModelPricing = MODEL_PRICING_OPTIONS["gpt-5-mini"];
```

### Option 3: Add a New Model
Add a new entry to `MODEL_PRICING_OPTIONS`:

```typescript
export const MODEL_PRICING_OPTIONS: Record<string, ModelPricing> = {
  // ... existing models ...
  "gpt-6": {
    provider: "OpenAI",
    model: "GPT-6",
    inputPerMillion: 1.50,
    outputPerMillion: 12.0,
    cachedInputPerMillion: 0.15,
  },
};

// Then switch to it
export const CURRENT_PRICING: ModelPricing = MODEL_PRICING_OPTIONS["gpt-6"];
```

---

## Cost Impact Analysis

Based on the example data in `md.json`:

### Example: DOCN Research Run
- **Input tokens:** 4,514,434
- **Output tokens:** 23,823

**Previous Cost (Claude 3.5 Sonnet):**
- Input: 4,514,434 × $3.00 / 1M = $13.54
- Output: 23,823 × $15.00 / 1M = $0.36
- **Total: $13.90**

**New Cost (OpenAI GPT-5):**
- Input: 4,514,434 × $1.25 / 1M = $5.64
- Output: 23,823 × $10.00 / 1M = $0.24
- **Total: $5.88**

**Savings: $8.02 (58% reduction)**

---

## Testing Recommendations

1. **Run a Test Research Operation**
   - Verify costs are calculated correctly
   - Check metadata storage includes proper cost breakdown
   - Confirm Stats UI displays correct pricing

2. **Check All Cost Display Locations**
   - Stats page shows GPT-5 pricing
   - Metadata storage has correct costs
   - Console logs show accurate cost calculations

3. **Verify Historical Data**
   - Old metadata in `md.json` still displays correctly
   - Cost calculations remain accurate for historical runs
   - Export functionality works properly

---

## Files That Use Pricing

| File | Usage |
|------|-------|
| `src/shared/pricing.ts` | Source of truth, pricing configuration |
| `src/main/index.ts` | Calculates costs for research and update operations |
| `src/renderer/App.tsx` | Calculates costs for metadata saved to localStorage |
| `src/renderer/components/Stats.tsx` | Displays current pricing information |
| `METADATA.md` | Documents pricing for users |
| `STATS_UI.md` | Documents Stats UI pricing display |

---

## Migration Notes

### Backward Compatibility
- Existing metadata with old pricing remains accurate (it's historical data)
- New operations use new pricing automatically
- No data migration required

### Breaking Changes
- None - all changes are internal implementation details
- API remains the same
- Metadata structure unchanged

### Future Considerations
- Consider adding model information to metadata for tracking which model was used
- Could add pricing at time of run to metadata for accurate historical tracking
- May want to support multiple simultaneous model configurations

---

## Verification Checklist

- [x] Centralized pricing module created
- [x] All hardcoded pricing removed from main process
- [x] All hardcoded pricing removed from renderer process
- [x] Stats UI updated to show dynamic pricing
- [x] Documentation updated
- [x] No linting errors
- [x] TypeScript compilation successful
- [ ] Manual testing with actual research run
- [ ] Verify cost calculations match expected values
- [ ] Confirm Stats UI displays correctly

---

## Additional Resources

- [OpenAI Pricing Page](https://openai.com/api/pricing/)
- Current GPT-5 pricing last verified: October 2025
- Pricing configuration file: `src/shared/pricing.ts`

