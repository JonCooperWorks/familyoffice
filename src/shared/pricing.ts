/**
 * Centralized pricing configuration for AI model costs
 * 
 * This configuration is used across the application to calculate costs
 * consistently. Update these values when model pricing changes.
 * 
 * Last updated: October 2025
 * Source: https://openai.com/api/pricing/
 */

export interface ModelPricing {
  provider: string;
  model: string;
  inputPerMillion: number;  // USD per 1 million input tokens
  outputPerMillion: number; // USD per 1 million output tokens
  cachedInputPerMillion?: number; // USD per 1 million cached input tokens (if applicable)
}

/**
 * Current model pricing configuration
 * Update this when switching models or when pricing changes
 */
export const CURRENT_PRICING: ModelPricing = {
  provider: "OpenAI",
  model: "GPT-5",
  inputPerMillion: 1.25,   // $1.25 per million input tokens
  outputPerMillion: 10.0,  // $10.00 per million output tokens
  cachedInputPerMillion: 0.125, // $0.125 per million cached input tokens
};

/**
 * Alternative model pricing configurations for reference
 * Switch CURRENT_PRICING to one of these if you change models
 */
export const MODEL_PRICING_OPTIONS: Record<string, ModelPricing> = {
  "gpt-5": {
    provider: "OpenAI",
    model: "GPT-5",
    inputPerMillion: 1.25,
    outputPerMillion: 10.0,
    cachedInputPerMillion: 0.125,
  },
  "gpt-5-mini": {
    provider: "OpenAI",
    model: "GPT-5 Mini",
    inputPerMillion: 0.25,
    outputPerMillion: 2.0,
    cachedInputPerMillion: 0.025,
  },
  "gpt-5-nano": {
    provider: "OpenAI",
    model: "GPT-5 Nano",
    inputPerMillion: 0.05,
    outputPerMillion: 0.40,
    cachedInputPerMillion: 0.005,
  },
  "claude-3.5-sonnet": {
    provider: "Anthropic",
    model: "Claude 3.5 Sonnet",
    inputPerMillion: 3.0,
    outputPerMillion: 15.0,
  },
};

/**
 * Calculate the cost of a request based on token usage
 * @param inputTokens Number of input tokens used
 * @param outputTokens Number of output tokens generated
 * @param cachedTokens Optional number of cached input tokens (if applicable)
 * @param pricing Optional custom pricing (defaults to CURRENT_PRICING)
 * @returns Cost breakdown with input, output, and total costs in USD
 */
export function calculateCost(
  inputTokens: number,
  outputTokens: number,
  cachedTokens: number = 0,
  pricing: ModelPricing = CURRENT_PRICING
): {
  input_cost: number;
  output_cost: number;
  cached_cost?: number;
  total_cost: number;
} {
  const inputCost = (inputTokens / 1_000_000) * pricing.inputPerMillion;
  const outputCost = (outputTokens / 1_000_000) * pricing.outputPerMillion;
  
  let cachedCost: number | undefined;
  if (cachedTokens > 0 && pricing.cachedInputPerMillion) {
    cachedCost = (cachedTokens / 1_000_000) * pricing.cachedInputPerMillion;
  }

  const totalCost = inputCost + outputCost + (cachedCost || 0);

  return {
    input_cost: inputCost,
    output_cost: outputCost,
    ...(cachedCost !== undefined && { cached_cost: cachedCost }),
    total_cost: totalCost,
  };
}

/**
 * Format a cost value as a USD string
 * @param cost The cost in USD
 * @returns Formatted string like "$1.23" or "$0.001234"
 */
export function formatCost(cost: number): string {
  if (cost >= 0.01) {
    return `$${cost.toFixed(2)}`;
  } else if (cost >= 0.0001) {
    return `$${cost.toFixed(4)}`;
  } else {
    return `$${cost.toFixed(6)}`;
  }
}

/**
 * Get a human-readable description of the current pricing
 */
export function getPricingDescription(): string {
  return `${CURRENT_PRICING.provider} ${CURRENT_PRICING.model}: $${CURRENT_PRICING.inputPerMillion}/M input, $${CURRENT_PRICING.outputPerMillion}/M output`;
}

