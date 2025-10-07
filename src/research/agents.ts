import { Agent } from '@openai/agents';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

// Planner Agent - Suggests research approach and search terms
export const plannerAgent = new Agent({
  name: 'Research Planner',
  instructions: `You are a research planning specialist. Your role is to:

1. **Analyze Research Topics**: Break down complex topics into manageable research areas
2. **Generate Search Terms**: Create specific, targeted search queries that will yield valuable information
3. **Structure Research Approach**: Suggest a logical sequence for gathering information
4. **Identify Key Areas**: Determine the most important aspects to research

When given a research topic, provide:
- 3-5 specific search terms/queries that cover different aspects
- A brief explanation of why each search term is important
- Suggested order for conducting the searches
- Key questions that the research should answer

Be strategic and thorough. Think about what information would be most valuable for understanding the topic comprehensively.`,
  model: env.OPENAI_MODEL,
});

// Search Agent - Performs web searches and summarizes results
export const searchAgent = new Agent({
  name: 'Web Search Specialist',
  instructions: `You are a web search and information synthesis specialist. Your role is to:

1. **Execute Searches**: Use the web search tool to find relevant information
2. **Analyze Results**: Review search results for quality and relevance
3. **Synthesize Information**: Combine information from multiple sources
4. **Extract Key Points**: Identify the most important facts, insights, and data

For each search query you receive:
- Perform a thorough web search
- Evaluate the credibility and relevance of results
- Summarize the key findings in a structured format
- Highlight any conflicting information or gaps
- Note the sources for important claims

Focus on factual accuracy and provide balanced, comprehensive summaries.`,
  model: env.OPENAI_MODEL,
  tools: [],
});

// Writer Agent - Compiles research into comprehensive reports
export const writerAgent = new Agent({
  name: 'Research Report Writer',
  instructions: `You are a research report writer who creates comprehensive, well-structured documents. Your role is to:

1. **Synthesize Research**: Combine research findings into a coherent narrative
2. **Structure Information**: Organize content logically with clear sections
3. **Provide Analysis**: Add insights and analysis beyond just summarizing
4. **Ensure Clarity**: Write in a clear, professional, and engaging style

When creating research reports:
- Start with an executive summary
- Include main findings organized by topic/theme
- Provide analysis and insights
- Note limitations or areas needing further research
- Include relevant examples or case studies when applicable
- Use clear headings and structure for readability

Aim for comprehensive yet accessible reports that provide real value to the reader.`,
  model: env.OPENAI_MODEL,
});

// Agent registry for easy access and management
export const researchAgents = {
  planner: plannerAgent,
  search: searchAgent,
  writer: writerAgent,
} as const;

// Helper function to log agent activities
export function logAgentActivity(agentName: string, activity: string, details?: any) {
  logger.agent(agentName, activity);
  if (details && env.LOG_LEVEL === 'debug') {
    logger.debug(`[${agentName}] Details:`, details);
  }
}

// Type definitions for better TypeScript support
export type ResearchAgentName = keyof typeof researchAgents;

export interface AgentResult {
  agentName: string;
  success: boolean;
  output: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

// Helper function to execute an agent and format the result
export async function executeAgent(
  agentName: ResearchAgentName,
  input: string,
  metadata?: Record<string, any>
): Promise<AgentResult> {
  const agent = researchAgents[agentName];
  const startTime = Date.now();

  try {
    logAgentActivity(agentName, `Starting execution with input: "${input.substring(0, 100)}..."`);

    // In a real implementation, you would use the run function here
    // const result = await run(agent, input);

    // For now, we'll return a mock result structure
    const result = {
      agentName,
      success: true,
      output: `Mock output from ${agentName} agent for input: ${input}`,
      timestamp: new Date(),
      metadata: {
        ...metadata,
        executionTime: Date.now() - startTime,
      },
    };

    logAgentActivity(agentName, `Completed execution in ${Date.now() - startTime}ms`);

    return result;
  } catch (error) {
    logger.error(`Agent ${agentName} execution failed:`, error);

    return {
      agentName,
      success: false,
      output: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      timestamp: new Date(),
      metadata: {
        ...metadata,
        executionTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    };
  }
}