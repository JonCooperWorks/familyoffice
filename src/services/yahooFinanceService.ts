import https from 'https';

export interface YahooFinanceQuote {
  symbol: string;
  companyName: string;
  currentPrice: number;
  change: number;
  changePercent: number;
  marketCap: number;
  peRatio?: number;
  eps?: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
  dividendYield?: number;
  beta?: number;
  avgVolume?: number;
  timestamp: string;
}

export class YahooFinanceService {
  private static readonly API_BASE = 'query1.finance.yahoo.com';
  
  /**
   * Fetch stock quote data from Yahoo Finance
   */
  static async getQuote(ticker: string): Promise<YahooFinanceQuote | null> {
    try {
      const url = `/v7/finance/quote?symbols=${ticker.toUpperCase()}`;
      
      const data = await this.makeRequest(url);
      const result = data?.quoteResponse?.result?.[0];
      
      if (!result) {
        console.warn(`No data found for ticker: ${ticker}`);
        return null;
      }

      return {
        symbol: result.symbol || ticker.toUpperCase(),
        companyName: result.longName || result.shortName || ticker,
        currentPrice: result.regularMarketPrice || 0,
        change: result.regularMarketChange || 0,
        changePercent: result.regularMarketChangePercent || 0,
        marketCap: result.marketCap || 0,
        peRatio: result.trailingPE,
        eps: result.epsTrailingTwelveMonths,
        fiftyTwoWeekHigh: result.fiftyTwoWeekHigh,
        fiftyTwoWeekLow: result.fiftyTwoWeekLow,
        dividendYield: result.trailingAnnualDividendYield,
        beta: result.beta,
        avgVolume: result.averageDailyVolume3Month,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error(`Error fetching Yahoo Finance data for ${ticker}:`, error);
      return null;
    }
  }

  /**
   * Format quote data as readable markdown
   */
  static formatQuoteMarkdown(quote: YahooFinanceQuote): string {
    const formatNumber = (num: number | undefined, prefix = '', suffix = '') => {
      if (num === undefined || num === null) return 'N/A';
      return `${prefix}${num.toLocaleString('en-US', { maximumFractionDigits: 2 })}${suffix}`;
    };

    const formatMarketCap = (cap: number) => {
      if (cap >= 1e12) return `$${(cap / 1e12).toFixed(2)}T`;
      if (cap >= 1e9) return `$${(cap / 1e9).toFixed(2)}B`;
      if (cap >= 1e6) return `$${(cap / 1e6).toFixed(2)}M`;
      return `$${cap.toFixed(0)}`;
    };

    const changeSymbol = quote.change >= 0 ? '▲' : '▼';
    const changeColor = quote.change >= 0 ? '+' : '';

    return `## Yahoo Finance Quote: ${quote.symbol}

**Company**: ${quote.companyName}  
**Current Price**: $${quote.currentPrice.toFixed(2)} ${changeSymbol} ${changeColor}${quote.change.toFixed(2)} (${changeColor}${quote.changePercent.toFixed(2)}%)  
**Market Cap**: ${formatMarketCap(quote.marketCap)}  
**P/E Ratio**: ${formatNumber(quote.peRatio)}  
**EPS (TTM)**: ${formatNumber(quote.eps, '$')}  
**52-Week Range**: ${formatNumber(quote.fiftyTwoWeekLow, '$')} - ${formatNumber(quote.fiftyTwoWeekHigh, '$')}  
**Dividend Yield**: ${formatNumber(quote.dividendYield ? quote.dividendYield * 100 : undefined, '', '%')}  
**Beta**: ${formatNumber(quote.beta)}  
**Avg Volume (3M)**: ${formatNumber(quote.avgVolume)}  

*Data retrieved: ${new Date(quote.timestamp).toLocaleString()}*
`;
  }

  /**
   * Make HTTPS request to Yahoo Finance API
   */
  private static makeRequest(path: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: this.API_BASE,
        path: path,
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        }
      };

      const req = https.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            resolve(parsed);
          } catch (error) {
            reject(new Error(`Failed to parse response: ${error}`));
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.setTimeout(10000, () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      req.end();
    });
  }
}

