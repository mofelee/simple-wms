import { ApiResponse } from '@/common/ipc';

/**
 * IPC 调用配置选项
 */
export interface IpcCallOptions {
  timeout?: number; // 超时时间（毫秒）
  retries?: number; // 重试次数
  retryDelay?: number; // 重试延迟（毫秒）
  onRetry?: (attempt: number, error: Error) => void; // 重试回调
  onProgress?: (progress: number) => void; // 进度回调
}

/**
 * 默认配置
 */
const DEFAULT_OPTIONS: Required<IpcCallOptions> = {
  timeout: 10000, // 10 秒
  retries: 2, // 重试 2 次
  retryDelay: 1000, // 1 秒延迟
  onRetry: () => {}, // 空函数
  onProgress: () => {}, // 空函数
};

/**
 * 延迟函数
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 检查错误是否可重试
 */
function isRetryableError(error: Error): boolean {
  const retryableErrors = [
    'timeout',
    'network',
    'connection',
    'ECONNRESET',
    'ENOTFOUND',
    'ETIMEDOUT',
  ];
  
  return retryableErrors.some(keyword => 
    error.message.toLowerCase().includes(keyword.toLowerCase())
  );
}

/**
 * 带有增强错误处理的 IPC 调用包装器
 */
export async function callIpcWithRetry<T>(
  ipcCall: () => Promise<ApiResponse<T>>,
  options: IpcCallOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error;
  
  for (let attempt = 0; attempt <= opts.retries; attempt++) {
    try {
      // 创建超时 Promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`IPC call timeout after ${opts.timeout}ms`));
        }, opts.timeout);
      });
      
      // 竞争执行 IPC 调用和超时
      const response = await Promise.race([
        ipcCall(),
        timeoutPromise,
      ]);
      
      // 检查响应是否成功
      if (response.success && response.data !== undefined) {
        return response.data;
      } else {
        throw new Error(response.error || 'Unknown IPC error');
      }
      
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // 如果是最后一次尝试，或者错误不可重试，直接抛出
      if (attempt === opts.retries || !isRetryableError(lastError)) {
        throw lastError;
      }
      
      // 调用重试回调
      opts.onRetry(attempt + 1, lastError);
      
      // 等待重试延迟
      if (opts.retryDelay > 0) {
        await delay(opts.retryDelay * (attempt + 1)); // 指数退避
      }
    }
  }
  
  // 理论上不会到达这里，但为了类型安全
  throw lastError!;
}

/**
 * 批量 IPC 调用，支持并发控制
 */
export async function batchIpcCalls<T>(
  calls: (() => Promise<ApiResponse<T>>)[],
  options: {
    concurrency?: number; // 并发数量
    failFast?: boolean; // 遇到错误立即停止
    onProgress?: (completed: number, total: number) => void;
  } = {}
): Promise<(T | Error)[]> {
  const { concurrency = 3, failFast = false, onProgress } = options;
  const results: (T | Error)[] = [];
  let completed = 0;
  
  // 分批处理
  for (let i = 0; i < calls.length; i += concurrency) {
    const batch = calls.slice(i, i + concurrency);
    
    const batchPromises = batch.map(async (call, index) => {
      try {
        const result = await callIpcWithRetry(call);
        completed++;
        onProgress?.(completed, calls.length);
        return result;
      } catch (error) {
        completed++;
        onProgress?.(completed, calls.length);
        
        if (failFast) {
          throw error;
        }
        
        return error instanceof Error ? error : new Error(String(error));
      }
    });
    
    try {
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    } catch (error) {
      if (failFast) {
        throw error;
      }
    }
  }
  
  return results;
}

/**
 * IPC 缓存管理器
 */
export class IpcCache {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  
  /**
   * 设置缓存
   */
  set<T>(key: string, data: T, ttlMs: number = 60000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMs,
    });
  }
  
  /**
   * 获取缓存
   */
  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) {
      return null;
    }
    
    // 检查是否过期
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return item.data as T;
  }
  
  /**
   * 删除缓存
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }
  
  /**
   * 清空缓存
   */
  clear(): void {
    this.cache.clear();
  }
  
  /**
   * 获取缓存统计
   */
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

/**
 * 带缓存的 IPC 调用
 */
export async function callIpcWithCache<T>(
  key: string,
  ipcCall: () => Promise<ApiResponse<T>>,
  cache: IpcCache,
  ttlMs: number = 60000,
  options: IpcCallOptions = {}
): Promise<T> {
  // 先检查缓存
  const cached = cache.get<T>(key);
  if (cached !== null) {
    return cached;
  }
  
  // 缓存未命中，调用 IPC
  const result = await callIpcWithRetry(ipcCall, options);
  
  // 缓存结果
  cache.set(key, result, ttlMs);
  
  return result;
}

/**
 * IPC 调用队列管理器
 */
export class IpcQueue {
  private queue: Array<{
    id: string;
    call: () => Promise<any>;
    resolve: (value: any) => void;
    reject: (reason: any) => void;
    priority: number;
  }> = [];
  
  private running = false;
  private concurrency: number;
  private activeJobs = 0;
  
  constructor(concurrency: number = 3) {
    this.concurrency = concurrency;
  }
  
  /**
   * 添加任务到队列
   */
  add<T>(
    id: string,
    call: () => Promise<ApiResponse<T>>,
    priority: number = 0
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push({
        id,
        call: async () => {
          const result = await callIpcWithRetry(call);
          return result;
        },
        resolve,
        reject,
        priority,
      });
      
      // 按优先级排序（高优先级在前）
      this.queue.sort((a, b) => b.priority - a.priority);
      
      this.process();
    });
  }
  
  /**
   * 处理队列
   */
  private async process(): Promise<void> {
    if (this.running && this.activeJobs >= this.concurrency) {
      return;
    }
    
    if (this.queue.length === 0) {
      this.running = false;
      return;
    }
    
    this.running = true;
    
    while (this.queue.length > 0 && this.activeJobs < this.concurrency) {
      const job = this.queue.shift()!;
      this.activeJobs++;
      
      // 异步执行任务
      job.call()
        .then(result => {
          job.resolve(result);
        })
        .catch(error => {
          job.reject(error);
        })
        .finally(() => {
          this.activeJobs--;
          this.process(); // 继续处理队列
        });
    }
  }
  
  /**
   * 获取队列状态
   */
  getStatus(): { queueLength: number; activeJobs: number; running: boolean } {
    return {
      queueLength: this.queue.length,
      activeJobs: this.activeJobs,
      running: this.running,
    };
  }
  
  /**
   * 清空队列
   */
  clear(): void {
    this.queue.forEach(job => {
      job.reject(new Error('Queue cleared'));
    });
    this.queue = [];
  }
}

// 导出全局实例
export const globalIpcCache = new IpcCache();
export const globalIpcQueue = new IpcQueue();
