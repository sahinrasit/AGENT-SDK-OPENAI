import { tool } from '@openai/agents';
import { z } from 'zod';
import { logger } from '../utils/logger.js';

/**
 * Calculator Tool
 * Performs mathematical calculations safely
 *
 * @example
 * ```typescript
 * const result = await calculatorTool.execute({ expression: '2 + 2' });
 * ```
 */
export const calculatorTool = tool({
  name: 'calculator',
  description: 'Perform mathematical calculations. Supports basic arithmetic, percentages, and mathematical functions.',
  parameters: z.object({
    expression: z.string().min(1).describe('Mathematical expression to evaluate (e.g., "2 + 2", "10 * 5", "sqrt(16)")'),
  }),

  execute: async ({ expression }) => {
    try {
      logger.info(`🔢 Calculator: "${expression}"`);

      // Sanitize expression to prevent code injection
      const sanitized = expression.replace(/[^0-9+\-*/().\s]/g, '');

      // Use Function constructor for safe evaluation (restricted scope)
      // Note: In production, use a proper math expression parser like mathjs
      const result = Function(`'use strict'; return (${sanitized})`)();

      logger.info(`✅ Calculation result: ${result}`);

      return {
        success: true,
        expression: expression,
        sanitizedExpression: sanitized,
        result: result,
        message: `${expression} = ${result}`
      };

    } catch (error) {
      logger.error('❌ Calculation failed:', error);
      throw new Error(`Invalid mathematical expression: ${expression}`);
    }
  }
});

/**
 * Date Time Tool
 * Provides current date and time information in various formats
 */
export const dateTimeTool = tool({
  name: 'get_current_datetime',
  description: 'Get current date and time in various formats and timezones. Useful for time-sensitive operations.',
  parameters: z.object({
    timezone: z.string().default('UTC').nullable().describe('Timezone (e.g., "UTC", "America/New_York", "Europe/Istanbul")'),
    format: z.enum(['iso', 'unix', 'readable', 'detailed']).default('iso').nullable().describe('Output format preference')
  }),

  execute: async ({ timezone = 'UTC', format = 'iso' }) => {
    try {
      logger.info(`📅 Getting datetime for ${timezone} in ${format} format`);

      const now = new Date();

      let formattedDate: string;
      switch (format) {
        case 'unix':
          formattedDate = Math.floor(now.getTime() / 1000).toString();
          break;
        case 'readable':
          formattedDate = now.toLocaleString('tr-TR', { timeZone: timezone === 'UTC' ? 'UTC' : timezone });
          break;
        case 'detailed':
          formattedDate = `${now.toLocaleDateString('tr-TR')} ${now.toLocaleTimeString('tr-TR')} (${timezone})`;
          break;
        case 'iso':
        default:
          formattedDate = now.toISOString();
      }

      return {
        success: true,
        data: {
          timestamp: now.getTime(),
          iso: now.toISOString(),
          formatted: formattedDate,
          timezone: timezone,
          year: now.getFullYear(),
          month: now.getMonth() + 1,
          day: now.getDate(),
          hour: now.getHours(),
          minute: now.getMinutes(),
          second: now.getSeconds()
        },
        message: `Current time: ${formattedDate}`
      };

    } catch (error) {
      logger.error('❌ DateTime fetch failed:', error);
      throw new Error(`Failed to get datetime: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
});

/**
 * Text Analysis Tool
 * Analyzes text for length, word count, readability, etc.
 */
export const textAnalysisTool = tool({
  name: 'analyze_text',
  description: 'Analyze text for statistics like word count, character count, reading time, and more.',
  parameters: z.object({
    text: z.string().min(1).describe('Text to analyze'),
    includeReadability: z.boolean().default(false).nullable().describe('Include readability metrics')
  }),

  execute: async ({ text, includeReadability = false }) => {
    try {
      logger.info(`📝 Analyzing text (${text.length} chars)`);

      const words = text.trim().split(/\s+/).filter(w => w.length > 0);
      const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
      const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 0);

      const avgWordsPerSentence = sentences.length > 0 ? words.length / sentences.length : 0;
      const avgCharsPerWord = words.length > 0 ? text.replace(/\s/g, '').length / words.length : 0;

      // Estimate reading time (average 200 words per minute)
      const readingTimeMinutes = Math.ceil(words.length / 200);

      const result: any = {
        characters: text.length,
        charactersNoSpaces: text.replace(/\s/g, '').length,
        words: words.length,
        sentences: sentences.length,
        paragraphs: paragraphs.length,
        averageWordsPerSentence: Math.round(avgWordsPerSentence * 10) / 10,
        averageCharactersPerWord: Math.round(avgCharsPerWord * 10) / 10,
        estimatedReadingTime: `${readingTimeMinutes} dakika`
      };

      if (includeReadability) {
        // Simple readability score (0-100, higher is easier)
        const readabilityScore = Math.min(100, Math.max(0,
          100 - (avgWordsPerSentence * 2) - (avgCharsPerWord * 5)
        ));
        result.readabilityScore = Math.round(readabilityScore);
        result.readabilityLevel = readabilityScore > 70 ? 'Kolay' :
          readabilityScore > 50 ? 'Orta' : 'Zor';
      }

      return {
        success: true,
        data: result,
        message: `Analyzed ${words.length} words in ${sentences.length} sentences`
      };

    } catch (error) {
      logger.error('❌ Text analysis failed:', error);
      throw new Error(`Text analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
});

/**
 * JSON Formatter Tool
 * Formats and validates JSON data
 */
export const jsonFormatterTool = tool({
  name: 'format_json',
  description: 'Format, validate, and pretty-print JSON data. Useful for working with API responses and structured data.',
  parameters: z.object({
    jsonString: z.string().min(1).describe('JSON string to format'),
    indent: z.number().min(0).max(8).default(2).nullable().describe('Indentation spaces (0-8)')
  }),

  execute: async ({ jsonString, indent = 2 }) => {
    try {
      logger.info(`📋 Formatting JSON (${jsonString.length} chars)`);

      // Parse to validate
      const parsed = JSON.parse(jsonString);

      // Pretty print
      const formatted = JSON.stringify(parsed, null, indent);

      // Calculate stats
      const objectCount = JSON.stringify(parsed).match(/\{/g)?.length || 0;
      const arrayCount = JSON.stringify(parsed).match(/\[/g)?.length || 0;

      return {
        success: true,
        data: {
          formatted: formatted,
          parsed: parsed,
          valid: true,
          stats: {
            originalSize: jsonString.length,
            formattedSize: formatted.length,
            objects: objectCount,
            arrays: arrayCount
          }
        },
        message: 'JSON formatted successfully'
      };

    } catch (error) {
      logger.error('❌ JSON formatting failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Invalid JSON',
        message: 'Failed to parse JSON - check syntax'
      };
    }
  }
});

/**
 * Export all utility tools
 */
export const utilityTools = [
  calculatorTool,
  dateTimeTool,
  textAnalysisTool,
  jsonFormatterTool
] as const;
