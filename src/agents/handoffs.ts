import { Agent, handoff } from '@openai/agents';
import { z } from 'zod';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

// Schemas for handoff data
const researchHandoffSchema = z.object({
  topic: z.string(),
  urgency: z.enum(['low', 'medium', 'high']).default('medium'),
  depth: z.enum(['basic', 'comprehensive', 'expert']).default('comprehensive'),
  specialRequirements: z.string().optional(),
});

const analysisHandoffSchema = z.object({
  data: z.string(),
  analysisType: z.enum(['technical', 'business', 'competitive', 'trend']),
  focusArea: z.string().optional(),
  deadline: z.string().optional(),
});

const writeHandoffSchema = z.object({
  content: z.string(),
  format: z.enum(['report', 'summary', 'presentation', 'documentation']),
  audience: z.enum(['technical', 'business', 'general', 'executive']),
  length: z.enum(['brief', 'medium', 'detailed']).default('medium'),
});

// Specialized Research Agent
const researchSpecialistAgent = new Agent({
  name: 'Research Specialist',
  instructions: `You are a specialized research agent focused on gathering comprehensive information.

Your expertise includes:
- Technical research and analysis
- Market and competitive research
- Industry trend analysis
- Academic and scientific research

When you receive a research request:
1. Understand the scope and requirements
2. Plan your research strategy
3. Use available tools to gather information
4. Organize findings systematically
5. Provide comprehensive, well-sourced information

Focus on accuracy, completeness, and relevance to the specific request.`,
  model: env.OPENAI_MODEL,
  tools: [],
});

// Specialized Analysis Agent
const analysisSpecialistAgent = new Agent({
  name: 'Analysis Specialist',
  instructions: `You are a specialized analysis agent focused on data interpretation and insights.

Your expertise includes:
- Technical analysis and system evaluation
- Business analysis and strategic insights
- Competitive analysis and market positioning
- Trend analysis and forecasting

When you receive analysis requests:
1. Examine the provided data thoroughly
2. Identify key patterns and trends
3. Generate actionable insights
4. Provide clear recommendations
5. Support conclusions with evidence

Focus on delivering valuable insights that drive decision-making.`,
  model: env.OPENAI_MODEL,
});

// Specialized Writing Agent
const writingSpecialistAgent = new Agent({
  name: 'Writing Specialist',
  instructions: `You are a specialized writing agent focused on creating high-quality documents.

Your expertise includes:
- Technical documentation and reports
- Business communications and presentations
- Executive summaries and briefings
- User guides and tutorials

When you receive writing requests:
1. Understand the target audience and format
2. Structure content logically and clearly
3. Adapt tone and style appropriately
4. Ensure clarity and readability
5. Include relevant examples and details

Focus on creating professional, engaging, and effective written content.`,
  model: env.OPENAI_MODEL,
});

// Triage Agent with handoff capabilities
export const triageAgent = new Agent({
  name: 'Triage Agent',
  instructions: `You are a triage agent that routes requests to specialized agents.

Available specialist agents:
1. Research Specialist - For information gathering and research tasks
2. Analysis Specialist - For data analysis and insights
3. Writing Specialist - For document creation and editing

Your role:
1. Understand the user's request
2. Determine which specialist is best suited
3. Prepare the handoff with relevant context
4. Transfer the request to the appropriate specialist

When deciding on handoffs:
- Use Research Specialist for information gathering, fact-finding, market research
- Use Analysis Specialist for data interpretation, technical analysis, strategic insights
- Use Writing Specialist for document creation, reports, presentations

Always provide clear context and requirements when handing off tasks.`,
  model: env.OPENAI_MODEL,
  handoffs: [
    handoff(researchSpecialistAgent),
    handoff(analysisSpecialistAgent),
    handoff(writingSpecialistAgent),
  ],
});

// Customer Service Agent with specialized handoffs
const billingSpecialistAgent = new Agent({
  name: 'Billing Specialist',
  instructions: `You are a billing specialist who handles all payment and subscription related queries.

Your expertise includes:
- Billing inquiries and payment processing
- Subscription management
- Refund and credit processing
- Account upgrades and downgrades

Provide accurate billing information and help resolve payment-related issues efficiently.`,
  model: env.OPENAI_MODEL,
});

const technicalSupportAgent = new Agent({
  name: 'Technical Support',
  instructions: `You are a technical support specialist who handles technical issues and troubleshooting.

Your expertise includes:
- System troubleshooting and debugging
- Integration support
- API and technical documentation
- Performance optimization

Provide clear technical guidance and help users resolve technical challenges.`,
  model: env.OPENAI_MODEL,
});

export const customerServiceAgent = new Agent({
  name: 'Customer Service',
  instructions: `You are a customer service agent that helps users with their inquiries.

You can handle general questions and route specialized requests to:
1. Billing Specialist - For payment, subscription, and billing issues
2. Technical Support - For technical problems and troubleshooting

Your role:
1. Greet customers warmly and understand their needs
2. Handle general inquiries directly
3. Route specialized requests to appropriate specialists
4. Ensure customer satisfaction

Always be helpful, professional, and empathetic.`,
  model: env.OPENAI_MODEL,
  handoffs: [
    handoff(billingSpecialistAgent),
    handoff(technicalSupportAgent),
  ],
});

// Helper functions for handoff management
export function logHandoff(fromAgent: string, toAgent: string, context: any) {
  logger.info(`🔄 Handoff: ${fromAgent} → ${toAgent}`);
  logger.debug('Handoff context:', context);
}

export function createHandoffCallback(fromAgentName: string, toAgentName: string) {
  return (context: any) => {
    logHandoff(fromAgentName, toAgentName, context);
  };
}

// Export all specialist agents for direct use
export const specialistAgents = {
  research: researchSpecialistAgent,
  analysis: analysisSpecialistAgent,
  writing: writingSpecialistAgent,
  billing: billingSpecialistAgent,
  technical: technicalSupportAgent,
} as const;

// Type definitions for handoff data
export type ResearchHandoffData = z.infer<typeof researchHandoffSchema>;
export type AnalysisHandoffData = z.infer<typeof analysisHandoffSchema>;
export type WriteHandoffData = z.infer<typeof writeHandoffSchema>;

export type SpecialistAgentName = keyof typeof specialistAgents;