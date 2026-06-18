import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

type MemoryEntry = { value: string; expiresAt: number | null };

/**
 * Cache de chave-valor com TTL.
 *
 * Usa Redis quando REDIS_URL está configurado e acessível; caso contrário cai
 * automaticamente para um cache em memória do processo (perde no restart).
 * Toda falha do Redis é tolerada — o cache nunca derruba a requisição.
 */
@Injectable()
export class CacheService implements OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private redis: Redis | null = null;
  private redisHealthy = false;
  private readonly memory = new Map<string, MemoryEntry>();

  constructor(private readonly config: ConfigService) {
    const url = this.config.get<string>('REDIS_URL');
    if (!url) {
      this.logger.warn('REDIS_URL não definido — usando cache em memória.');
      return;
    }

    try {
      this.redis = new Redis(url, {
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        enableOfflineQueue: false,
        retryStrategy: (times) => Math.min(times * 500, 5000),
      });

      this.redis.on('ready', () => {
        this.redisHealthy = true;
        this.logger.log('Conectado ao Redis.');
      });
      this.redis.on('error', (err) => {
        if (this.redisHealthy) {
          this.logger.warn(
            `Erro no Redis (fallback em memória): ${err.message}`,
          );
        }
        this.redisHealthy = false;
      });
      this.redis.on('end', () => {
        this.redisHealthy = false;
      });

      this.redis.connect().catch((err) => {
        this.logger.warn(
          `Não foi possível conectar ao Redis: ${err.message}. Usando cache em memória.`,
        );
      });
    } catch (err) {
      this.logger.warn(
        `Falha ao inicializar Redis: ${(err as Error).message}. Usando cache em memória.`,
      );
      this.redis = null;
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (this.redis && this.redisHealthy) {
      try {
        const raw = await this.redis.get(key);
        return raw ? (JSON.parse(raw) as T) : null;
      } catch (err) {
        this.logger.debug(
          `get(${key}) via Redis falhou: ${(err as Error).message}`,
        );
      }
    }
    return this.memoryGet<T>(key);
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    const raw = JSON.stringify(value);
    if (this.redis && this.redisHealthy) {
      try {
        await this.redis.set(key, raw, 'EX', ttlSeconds);
        return;
      } catch (err) {
        this.logger.debug(
          `set(${key}) via Redis falhou: ${(err as Error).message}`,
        );
      }
    }
    this.memorySet(key, raw, ttlSeconds);
  }

  /** Retorna do cache ou executa `factory`, armazenando o resultado. */
  async wrap<T>(
    key: string,
    ttlSeconds: number,
    factory: () => Promise<T>,
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null && cached !== undefined) return cached;

    const fresh = await factory();
    if (fresh !== null && fresh !== undefined) {
      await this.set(key, fresh, ttlSeconds);
    }
    return fresh;
  }

  private memoryGet<T>(key: string): T | null {
    const entry = this.memory.get(key);
    if (!entry) return null;
    if (entry.expiresAt !== null && entry.expiresAt < Date.now()) {
      this.memory.delete(key);
      return null;
    }
    return JSON.parse(entry.value) as T;
  }

  private memorySet(key: string, raw: string, ttlSeconds: number): void {
    this.memory.set(key, {
      value: raw,
      expiresAt: ttlSeconds > 0 ? Date.now() + ttlSeconds * 1000 : null,
    });
  }

  async onModuleDestroy(): Promise<void> {
    if (this.redis) {
      try {
        await this.redis.quit();
      } catch {
        this.redis.disconnect();
      }
    }
  }
}
