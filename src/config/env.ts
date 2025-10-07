import { z } from 'zod';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

const envSchema = z.object({
  OPENAI_API_KEY: z.string().min(1, 'OpenAI API key is required'),
  OPENAI_MODEL: z.string().default('gpt-4o-mini'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  WS_PORT: z.coerce.number().default(3001),
  WS_HOST: z.string().default('localhost'),
  ENABLE_TRACING: z.coerce.boolean().default(true),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  MCP_FILESYSTEM_PATH: z.string().default('./sample_files'),
  ODEABANK_MCP_URL: z.string().default('https://mcp.cloud.odeabank.com.tr/mcp/sse'),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(): Env {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    console.error('❌ Environment validation failed:', error);
    console.log('Please check your .env file and ensure all required variables are set.');
    console.log('See .env.example for reference.');
    process.exit(1);
  }
}

export const env = validateEnv();