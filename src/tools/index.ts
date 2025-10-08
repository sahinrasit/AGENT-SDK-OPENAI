/**
 * Central Tool Registry
 *
 * This module exports all available tools for OpenAI Agents SDK.
 * Tools are organized by category for easy discovery and use.
 *
 * @module tools
 */

import { webSearchTool, searchNewsTool, webSearchTools } from './web-search.js';
import { calculatorTool, dateTimeTool, textAnalysisTool, jsonFormatterTool, utilityTools } from './utilities.js';

/**
 * All available tools organized by category
 */
export const toolCategories = {
  web: {
    description: 'Web search and information retrieval tools',
    tools: webSearchTools
  },
  utilities: {
    description: 'General utility tools for calculations, formatting, and analysis',
    tools: utilityTools
  }
} as const;

/**
 * All tools in a flat array for easy agent configuration
 */
export const allTools = [
  ...webSearchTools,
  ...utilityTools
] as const;

/**
 * Individual tool exports for granular control
 */
export {
  // Web search tools
  webSearchTool,
  searchNewsTool,

  // Utility tools
  calculatorTool,
  dateTimeTool,
  textAnalysisTool,
  jsonFormatterTool,

  // Category groups
  webSearchTools,
  utilityTools
};

/**
 * Tool selection helpers
 */
export const toolSelectors = {
  /**
   * Get tools by category
   */
  byCategory: (category: keyof typeof toolCategories) => {
    return toolCategories[category].tools;
  },

  /**
   * Get tools by name
   */
  byName: (...names: string[]) => {
    return allTools.filter(tool => names.includes(tool.definition.name));
  },

  /**
   * Get all non-sensitive tools (no approval required)
   */
  public: () => {
    return allTools.filter(tool => !tool.definition.needsApproval);
  },

  /**
   * Get tools requiring approval
   */
  protected: () => {
    return allTools.filter(tool => tool.definition.needsApproval);
  }
};

/**
 * Type definitions for tool names
 */
export type ToolName =
  | 'web_search'
  | 'search_news'
  | 'calculator'
  | 'get_current_datetime'
  | 'analyze_text'
  | 'format_json';

export type ToolCategory = keyof typeof toolCategories;
