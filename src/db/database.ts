/**
 * Database Connection Pool Manager
 * PostgreSQL connection management with connection pooling
 */

import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import { logger } from '../utils/logger.js';

interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  max?: number; // Maximum pool size
  min?: number; // Minimum pool size
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
  ssl?: boolean | { rejectUnauthorized: boolean };
}

class Database {
  private pool: Pool | null = null;
  private isConnected: boolean = false;

  constructor() {}

  /**
   * Initialize database connection pool
   */
  async connect(config?: DatabaseConfig): Promise<void> {
    try {
      const dbConfig: DatabaseConfig = config || {
        host: process.env.POSTGRES_HOST || 'localhost',
        port: parseInt(process.env.POSTGRES_PORT || '5432'),
        database: process.env.POSTGRES_DB || 'ibtech_agent',
        user: process.env.POSTGRES_USER || 'postgres',
        password: process.env.POSTGRES_PASSWORD || 'password',
        max: parseInt(process.env.DATABASE_POOL_MAX || '10'),
        min: parseInt(process.env.DATABASE_POOL_MIN || '2'),
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
      };

      // SSL configuration for production
      if (process.env.DATABASE_SSL === 'true' || process.env.NODE_ENV === 'production') {
        dbConfig.ssl = {
          rejectUnauthorized: false, // Set to true in production with valid certs
        };
      }

      this.pool = new Pool(dbConfig);

      // Test connection
      const client = await this.pool.connect();
      await client.query('SELECT NOW()');
      client.release();

      this.isConnected = true;

      logger.info('✅ Database connection pool established', {
        host: dbConfig.host,
        database: dbConfig.database,
        poolSize: dbConfig.max,
      });

      // Setup event handlers
      this.setupEventHandlers();
    } catch (error) {
      logger.error('❌ Failed to connect to database:', error);
      throw error;
    }
  }

  /**
   * Setup pool event handlers
   */
  private setupEventHandlers(): void {
    if (!this.pool) return;

    this.pool.on('error', (err) => {
      logger.error('Unexpected database pool error:', err);
    });

    this.pool.on('connect', () => {
      logger.debug('New database client connected to pool');
    });

    this.pool.on('acquire', () => {
      logger.debug('Client acquired from pool');
    });

    this.pool.on('remove', () => {
      logger.debug('Client removed from pool');
    });
  }

  /**
   * Get pool instance
   */
  getPool(): Pool {
    if (!this.pool || !this.isConnected) {
      throw new Error('Database not connected. Call connect() first.');
    }
    return this.pool;
  }

  /**
   * Execute a query
   */
  async query<T extends QueryResultRow = any>(
    text: string,
    params?: any[]
  ): Promise<QueryResult<T>> {
    const pool = this.getPool();
    const start = Date.now();

    try {
      const result = await pool.query<T>(text, params);
      const duration = Date.now() - start;

      logger.debug('Executed query', {
        query: text.substring(0, 100),
        duration: `${duration}ms`,
        rows: result.rowCount,
      });

      return result;
    } catch (error) {
      logger.error('Query execution failed:', {
        query: text,
        params,
        error,
      });
      throw error;
    }
  }

  /**
   * Execute query with a transaction
   */
  async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const pool = this.getPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Transaction failed, rolled back:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get a client from the pool (manual transaction control)
   */
  async getClient(): Promise<PoolClient> {
    const pool = this.getPool();
    return pool.connect();
  }

  /**
   * Check if database is connected and healthy
   */
  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.query('SELECT 1 as health');
      return result.rows[0].health === 1;
    } catch (error) {
      logger.error('Database health check failed:', error);
      return false;
    }
  }

  /**
   * Get pool statistics
   */
  getStats() {
    if (!this.pool) {
      return null;
    }

    return {
      total: this.pool.totalCount,
      idle: this.pool.idleCount,
      waiting: this.pool.waitingCount,
      isConnected: this.isConnected,
    };
  }

  /**
   * Close database connection pool
   */
  async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.isConnected = false;
      logger.info('Database connection pool closed');
    }
  }

  /**
   * Execute raw SQL file (for migrations)
   */
  async executeSQLFile(sql: string): Promise<void> {
    const pool = this.getPool();
    const client = await pool.connect();

    try {
      await client.query(sql);
      logger.info('SQL file executed successfully');
    } catch (error) {
      logger.error('Failed to execute SQL file:', error);
      throw error;
    } finally {
      client.release();
    }
  }
}

// Singleton instance
export const database = new Database();

// Export types
export type { DatabaseConfig, PoolClient, QueryResult };
