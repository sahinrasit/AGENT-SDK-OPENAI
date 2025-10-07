import { run } from '@openai/agents';
import { z } from 'zod';
import { logger } from '../utils/logger.js';
import { researchAgents, logAgentActivity, type AgentResult } from './agents.js';

// Schema for research request
const researchRequestSchema = z.object({
  topic: z.string().min(1, 'Research topic is required'),
  depth: z.enum(['basic', 'comprehensive', 'expert']).default('comprehensive'),
  maxSearchQueries: z.number().min(1).max(10).default(5),
  includeAnalysis: z.boolean().default(true),
  urgency: z.enum(['low', 'medium', 'high']).default('medium'),
});

export type ResearchRequest = z.infer<typeof researchRequestSchema>;

// Schema for research results
const researchResultSchema = z.object({
  topic: z.string(),
  status: z.enum(['completed', 'failed', 'partial']),
  plan: z.string(),
  searchResults: z.array(z.any()),
  finalReport: z.string(),
  metadata: z.record(z.any()),
  timestamp: z.date(),
});

export type ResearchResult = z.infer<typeof researchResultSchema>;

export class ResearchManager {
  private currentRequest: ResearchRequest | null = null;
  private executionLog: AgentResult[] = [];

  constructor() {
    logger.info('🔬 ResearchManager initialized');
  }

  /**
   * Conducts comprehensive research on a given topic
   */
  async conductResearch(request: ResearchRequest): Promise<ResearchResult> {
    const startTime = Date.now();
    this.currentRequest = request;
    this.executionLog = [];

    logger.info(`🚀 Starting research on: "${request.topic}"`);
    logger.debug('Research parameters:', request);

    try {
      // Phase 1: Planning
      const plan = await this.planResearch(request);

      // Phase 2: Information Gathering
      const searchResults = await this.gatherInformation(plan, request);

      // Phase 3: Report Generation
      const finalReport = await this.generateReport(plan, searchResults, request);

      const result: ResearchResult = {
        topic: request.topic,
        status: 'completed',
        plan,
        searchResults,
        finalReport,
        metadata: {
          executionTime: Date.now() - startTime,
          depth: request.depth,
          searchQueriesUsed: searchResults.length,
          agentExecutions: this.executionLog.length,
        },
        timestamp: new Date(),
      };

      logger.info(`✅ Research completed for "${request.topic}" in ${Date.now() - startTime}ms`);
      return result;

    } catch (error) {
      logger.error('❌ Research failed:', error);

      return {
        topic: request.topic,
        status: 'failed',
        plan: '',
        searchResults: [],
        finalReport: `Research failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        metadata: {
          executionTime: Date.now() - startTime,
          error: error instanceof Error ? error.message : 'Unknown error',
          agentExecutions: this.executionLog.length,
        },
        timestamp: new Date(),
      };
    }
  }

  /**
   * Phase 1: Research Planning
   */
  private async planResearch(request: ResearchRequest): Promise<string> {
    logger.info('📋 Phase 1: Planning research approach...');

    const planningPrompt = `
Research Topic: "${request.topic}"
Research Depth: ${request.depth}
Max Search Queries: ${request.maxSearchQueries}

Please create a comprehensive research plan that includes:
1. 3-5 specific search queries/terms that cover different aspects of this topic
2. Brief explanation of why each search term is important
3. The logical order for conducting these searches
4. Key questions that this research should answer
5. Expected outcomes and deliverables

Focus on creating search terms that will yield the most valuable and comprehensive information about this topic.
`;

    try {
      const result = await run(researchAgents.planner, planningPrompt);

      const agentResult: AgentResult = {
        agentName: 'planner',
        success: true,
        output: result.finalOutput || 'No output generated',
        timestamp: new Date(),
        metadata: { phase: 'planning', topic: request.topic },
      };

      this.executionLog.push(agentResult);
      logAgentActivity('planner', 'Research plan created successfully');

      return result.finalOutput || 'No output generated';
    } catch (error) {
      logger.error('Planning phase failed:', error);
      throw new Error(`Planning failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Phase 2: Information Gathering
   */
  private async gatherInformation(plan: string, request: ResearchRequest): Promise<any[]> {
    logger.info('🔍 Phase 2: Gathering information...');

    // Extract search queries from the plan
    const searchQueries = this.extractSearchQueries(plan, request.maxSearchQueries);

    const searchResults: any[] = [];

    for (let i = 0; i < searchQueries.length; i++) {
      const query = searchQueries[i];
      logger.info(`🔎 Executing search ${i + 1}/${searchQueries.length}: "${query}"`);

      try {
        const searchPrompt = `
Please search for information about: "${query}"

Context: This is part of research on "${request.topic}"
Search thoroughly and provide a comprehensive summary of the findings.
Focus on factual information, key insights, and relevant details.
`;

        const result = await run(researchAgents.search, searchPrompt);

        const agentResult: AgentResult = {
          agentName: 'search',
          success: true,
          output: result.finalOutput || 'No output generated',
          timestamp: new Date(),
          metadata: {
            phase: 'information_gathering',
            query,
            searchIndex: i + 1,
            totalSearches: searchQueries.length,
          },
        };

        this.executionLog.push(agentResult);
        searchResults.push({
          query,
          results: result.finalOutput || 'No output generated',
          timestamp: new Date(),
        });

        logAgentActivity('search', `Search completed for query: "${query}"`);

        // Add delay between searches to be respectful
        if (i < searchQueries.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

      } catch (error) {
        logger.error(`Search failed for query "${query}":`, error);
        searchResults.push({
          query,
          results: `Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          timestamp: new Date(),
          error: true,
        });
      }
    }

    logger.info(`📊 Information gathering completed: ${searchResults.length} searches performed`);
    return searchResults;
  }

  /**
   * Phase 3: Report Generation
   */
  private async generateReport(plan: string, searchResults: any[], request: ResearchRequest): Promise<string> {
    logger.info('📝 Phase 3: Generating final report...');

    const reportPrompt = `
Please create a comprehensive research report based on the following information:

TOPIC: "${request.topic}"
RESEARCH DEPTH: ${request.depth}

RESEARCH PLAN:
${plan}

SEARCH RESULTS:
${searchResults.map((result, index) => `
Search ${index + 1}: "${result.query}"
Results: ${result.results}
${result.error ? '(Note: This search encountered errors)' : ''}
`).join('\n')}

Please create a well-structured research report that includes:
1. Executive Summary
2. Key Findings (organized by main themes)
3. Detailed Analysis
4. Conclusions and Insights
5. Areas for Further Research (if applicable)
6. Sources and References

The report should be comprehensive, well-organized, and provide real value to someone trying to understand "${request.topic}".
Use clear headings, bullet points where appropriate, and maintain a professional tone.
`;

    try {
      const result = await run(researchAgents.writer, reportPrompt);

      const agentResult: AgentResult = {
        agentName: 'writer',
        success: true,
        output: result.finalOutput || 'No output generated',
        timestamp: new Date(),
        metadata: {
          phase: 'report_generation',
          topic: request.topic,
          searchResultsCount: searchResults.length,
        },
      };

      this.executionLog.push(agentResult);
      logAgentActivity('writer', 'Final report generated successfully');

      return result.finalOutput || 'No output generated';
    } catch (error) {
      logger.error('Report generation failed:', error);
      throw new Error(`Report generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract search queries from the research plan
   */
  private extractSearchQueries(plan: string, maxQueries: number): string[] {
    // Simple extraction - look for numbered lists or quoted terms
    const queries: string[] = [];

    // Try to find numbered items (1., 2., etc.)
    const numberedMatches = plan.match(/\d+\.\s*["']?([^"'\n]+)["']?/g);
    if (numberedMatches) {
      numberedMatches.forEach(match => {
        const query = match.replace(/\d+\.\s*["']?/, '').replace(/["']?$/, '').trim();
        if (query && queries.length < maxQueries) {
          queries.push(query);
        }
      });
    }

    // If we didn't find enough queries, try to find quoted terms
    if (queries.length < 3) {
      const quotedMatches = plan.match(/"([^"]+)"/g);
      if (quotedMatches) {
        quotedMatches.forEach(match => {
          const query = match.replace(/"/g, '').trim();
          if (query && !queries.includes(query) && queries.length < maxQueries) {
            queries.push(query);
          }
        });
      }
    }

    // If still not enough, create default queries based on the topic
    if (queries.length === 0 && this.currentRequest) {
      const topic = this.currentRequest.topic;
      queries.push(
        `${topic} overview`,
        `${topic} best practices`,
        `${topic} tutorial`,
        `${topic} examples`,
        `${topic} comparison`
      );
    }

    return queries.slice(0, maxQueries);
  }

  /**
   * Get execution log for debugging and analysis
   */
  getExecutionLog(): AgentResult[] {
    return [...this.executionLog];
  }

  /**
   * Get current research status
   */
  getCurrentStatus(): { active: boolean; topic?: string; phase?: string } {
    if (!this.currentRequest) {
      return { active: false };
    }

    const lastExecution = this.executionLog[this.executionLog.length - 1];
    return {
      active: true,
      topic: this.currentRequest.topic,
      phase: lastExecution?.metadata?.phase || 'unknown',
    };
  }
}