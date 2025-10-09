import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
const envPath = path.resolve(process.cwd(), '.env');
console.log('🔍 Loading .env from:', envPath);
const result = dotenv.config({ path: envPath });

if (result.error) {
  console.error('❌ Failed to load .env file:', result.error);
} else {
  console.log('✅ .env file loaded successfully');
  console.log('🔑 OPENAI_API_KEY present:', !!process.env.OPENAI_API_KEY);
  if (process.env.OPENAI_API_KEY) {
    console.log('🔑 OPENAI_API_KEY length:', process.env.OPENAI_API_KEY.length);
  }
}

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