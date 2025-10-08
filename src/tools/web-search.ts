import { tool } from '@openai/agents';
import { z } from 'zod';
import { logger } from '../utils/logger.js';

/**
 * Web Search Tool
 * Performs web searches using a search API and returns relevant results
 *
 * @example
 * ```typescript
 * const agent = new Agent({
 *   tools: [webSearchTool]
 * });
 * ```
 */
export const webSearchTool = tool({
  name: 'web_search',
  description: 'Search the web for current information, news, articles, and data. Use this when you need up-to-date information or facts that are not in your training data.',
  parameters: z.object({
    query: z.string().min(1).describe('The search query - be specific and clear'),
    numResults: z.number().min(1).max(10).default(5).optional().describe('Number of results to return (1-10)'),
    language: z.enum(['tr', 'en', 'auto']).default('auto').optional().describe('Language preference for results'),
  }),

  /**
   * Execute web search
   * Returns formatted search results with titles, snippets, and URLs
   */
  execute: async ({ query, numResults = 5, language = 'auto' }, context) => {
    try {
      logger.info(`🔍 Web search: "${query}" (${numResults} results, lang: ${language})`);

      // TODO: Integrate with actual search API (Google Custom Search, Bing, etc.)
      // For now, return a structured response format

      const mockResults = [
        {
          title: `Search result for: ${query}`,
          snippet: 'This is a mock search result. Integrate with a real search API for production use.',
          url: 'https://example.com/result1',
          relevance: 0.95
        }
      ];

      const result = {
        query,
        results: mockResults.slice(0, numResults),
        totalResults: mockResults.length,
        language,
        timestamp: new Date().toISOString()
      };

      logger.info(`✅ Web search completed: ${result.results.length} results found`);

      return {
        success: true,
        data: result,
        message: `Found ${result.results.length} results for "${query}"`
      };

    } catch (error) {
      logger.error('❌ Web search failed:', error);
      throw new Error(`Web search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  // Enable human approval for sensitive searches (optional)
  needsApproval: async (context, args) => {
    // Require approval for potentially sensitive queries
    const sensitiveKeywords = ['private', 'confidential', 'internal', 'secret'];
    return sensitiveKeywords.some(keyword =>
      args.query.toLowerCase().includes(keyword)
    );
  }
});

/**
 * Search News Tool
 * Specialized tool for searching recent news articles
 */
export const searchNewsTool = tool({
  name: 'search_news',
  description: 'Search for recent news articles and current events. Use this for time-sensitive information and breaking news.',
  parameters: z.object({
    query: z.string().min(1).describe('News search query'),
    timeframe: z.enum(['1h', '24h', '7d', '30d']).default('24h').optional().describe('How recent the news should be'),
    category: z.enum(['business', 'technology', 'science', 'health', 'general']).optional().describe('News category')
  }),

  execute: async ({ query, timeframe = '24h', category }) => {
    try {
      logger.info(`📰 News search: "${query}" (${timeframe}, category: ${category || 'all'})`);

      // TODO: Integrate with news API
      const mockNews = [
        {
          title: `Latest news: ${query}`,
          source: 'News Source',
          publishedAt: new Date().toISOString(),
          url: 'https://example.com/news',
          summary: 'Mock news article content'
        }
      ];

      return {
        success: true,
        data: {
          query,
          articles: mockNews,
          timeframe,
          category: category || 'general'
        },
        message: `Found ${mockNews.length} news articles`
      };

    } catch (error) {
      logger.error('❌ News search failed:', error);
      throw new Error(`News search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
});

/**
 * Export all web search tools
 */
export const webSearchTools = [
  webSearchTool,
  searchNewsTool
] as const;
