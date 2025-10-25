import https from "https";

export interface AlphaVantageQuote {
  symbol: string;
  companyName: string;
  currentPrice: number;
  change: number;
  changePercent: number;
  volume: number;
  previousClose: number;
  open: number;
  high: number;
  low: number;
  timestamp: string;
}

export class AlphaVantageService {
  private static readonly API_BASE = "www.alphavantage.co";
  private static apiKey: string | null = null;

  /**
   * Set the API key for Alpha Vantage
   */
  static setApiKey(key: string): void {
    this.apiKey = key;
  }

  /**
   * Get the current API key
   */
  static getApiKey(): string | null {
    return this.apiKey;
  }

  /**
   * Check if API key is set
   */
  static hasApiKey(): boolean {
    return this.apiKey !== null && this.apiKey.length > 0;
  }

  /**
   * Fetch stock quote data from Alpha Vantage
   */
  static async getQuote(ticker: string): Promise<AlphaVantageQuote | null> {
    if (!this.hasApiKey()) {
      throw new Error("Alpha Vantage API key not set");
    }

    try {
      const url = `/query?function=GLOBAL_QUOTE&symbol=${ticker.toUpperCase()}&apikey=${this.apiKey}`;

      const data = await this.makeRequest(url);
      const quote = data?.["Global Quote"];

      if (!quote || Object.keys(quote).length === 0) {
        console.warn(`No data found for ticker: ${ticker}`);
        return null;
      }

      // Alpha Vantage returns keys like "01. symbol", "05. price", etc.
      const symbol = quote["01. symbol"] || ticker.toUpperCase();
      const price = parseFloat(quote["05. price"] || "0");
      const change = parseFloat(quote["09. change"] || "0");
      const changePercent = parseFloat(
        (quote["10. change percent"] || "0").replace("%", ""),
      );
      const volume = parseInt(quote["06. volume"] || "0");
      const previousClose = parseFloat(quote["08. previous close"] || "0");
      const open = parseFloat(quote["02. open"] || "0");
      const high = parseFloat(quote["03. high"] || "0");
      const low = parseFloat(quote["04. low"] || "0");

      return {
        symbol,
        companyName: symbol, // Alpha Vantage doesn't provide company name in GLOBAL_QUOTE
        currentPrice: price,
        change,
        changePercent,
        volume,
        previousClose,
        open,
        high,
        low,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error(`Error fetching Alpha Vantage data for ${ticker}:`, error);
      throw error;
    }
  }

  /**
   * Format quote data as readable markdown
   */
  static formatQuoteMarkdown(quote: AlphaVantageQuote): string {
    const formatNumber = (
      num: number | undefined,
      prefix = "",
      suffix = "",
    ) => {
      if (num === undefined || num === null || isNaN(num)) return "N/A";
      return `${prefix}${num.toLocaleString("en-US", { maximumFractionDigits: 2 })}${suffix}`;
    };

    const changeSymbol = quote.change >= 0 ? "▲" : "▼";
    const changeColor = quote.change >= 0 ? "+" : "";

    return `## Market Data: ${quote.symbol}

**Current Price**: $${quote.currentPrice.toFixed(2)} ${changeSymbol} ${changeColor}${quote.change.toFixed(2)} (${changeColor}${quote.changePercent.toFixed(2)}%)  
**Open**: $${quote.open.toFixed(2)}  
**High**: $${quote.high.toFixed(2)}  
**Low**: $${quote.low.toFixed(2)}  
**Previous Close**: $${quote.previousClose.toFixed(2)}  
**Volume**: ${formatNumber(quote.volume)}  

*Data retrieved: ${new Date(quote.timestamp).toLocaleString()}*  
*Source: Alpha Vantage*
`;
  }

  /**
   * Make HTTPS request to Alpha Vantage API
   */
  private static makeRequest(path: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: this.API_BASE,
        path: path,
        method: "GET",
        headers: {
          "User-Agent": "FamilyOffice/1.0",
          Accept: "application/json",
        },
      };

      const req = https.request(options, (res) => {
        const chunks: Buffer[] = [];

        res.on("data", (chunk) => {
          chunks.push(Buffer.from(chunk));
        });

        res.on("end", () => {
          // Check HTTP status
          if (res.statusCode && res.statusCode !== 200) {
            const body = Buffer.concat(chunks).toString();
            reject(
              new Error(
                `Alpha Vantage API returned ${res.statusCode}: ${body.substring(0, 200)}`,
              ),
            );
            return;
          }

          try {
            const buffer = Buffer.concat(chunks);
            const data = buffer.toString();
            const parsed = JSON.parse(data);

            // Check for API error messages
            if (parsed["Error Message"]) {
              reject(
                new Error(`Alpha Vantage error: ${parsed["Error Message"]}`),
              );
              return;
            }

            if (parsed["Note"]) {
              reject(new Error(`Alpha Vantage rate limit: ${parsed["Note"]}`));
              return;
            }

            resolve(parsed);
          } catch (error) {
            const data = Buffer.concat(chunks).toString().substring(0, 200);
            reject(
              new Error(
                `Failed to parse response: ${error}. Response: ${data}`,
              ),
            );
          }
        });
      });

      req.on("error", (error) => {
        reject(error);
      });

      req.setTimeout(15000, () => {
        req.destroy();
        reject(new Error("Request timeout"));
      });

      req.end();
    });
  }
}
