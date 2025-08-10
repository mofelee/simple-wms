import React, { useState, useCallback } from 'react';
import { 
  callIpcWithRetry, 
  batchIpcCalls, 
  callIpcWithCache,
  globalIpcCache,
  globalIpcQueue,
  IpcCallOptions,
  IpcCache,
  IpcQueue
} from '@/utils/ipcHelper';

interface AdvancedDemoProps {
  onLog: (message: string, type?: 'info' | 'success' | 'error') => void;
}

const AdvancedDemo: React.FC<AdvancedDemoProps> = ({ onLog }) => {
  const [loading, setLoading] = useState(false);
  const [retryOptions, setRetryOptions] = useState<IpcCallOptions>({
    timeout: 5000,
    retries: 2,
    retryDelay: 1000,
  });
  const [batchProgress, setBatchProgress] = useState({ completed: 0, total: 0 });
  const [queueStatus, setQueueStatus] = useState(globalIpcQueue.getStatus());
  const [cacheStats, setCacheStats] = useState(globalIpcCache.getStats());

  // 更新状态
  const updateStatus = useCallback(() => {
    setQueueStatus(globalIpcQueue.getStatus());
    setCacheStats(globalIpcCache.getStats());
  }, []);

  // 测试重试机制
  const testRetryMechanism = async () => {
    setLoading(true);
    onLog('开始测试重试机制...', 'info');
    
    try {
      await callIpcWithRetry(
        async () => {
          // 模拟可能失败的调用
          const shouldFail = Math.random() > 0.3; // 70% 概率失败
          if (shouldFail) {
            throw new Error('模拟网络错误');
          }
          return await window.electronAPI.system.getInfo();
        },
        {
          ...retryOptions,
          onRetry: (attempt, error) => {
            onLog(`第 ${attempt} 次重试，错误: ${error.message}`, 'info');
          },
        }
      );
      onLog('重试机制测试成功！', 'success');
    } catch (error) {
      onLog(`重试机制测试失败: ${error instanceof Error ? error.message : String(error)}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // 测试批量调用
  const testBatchCalls = async () => {
    setLoading(true);
    setBatchProgress({ completed: 0, total: 0 });
    onLog('开始测试批量调用...', 'info');
    
    try {
      // 创建多个用户获取调用
      const userIds = ['1', '2', '3', '4', '5', 'nonexistent'];
      const calls = userIds.map(id => 
        () => window.electronAPI.user.getById(id)
      );
      
      const results = await batchIpcCalls(calls, {
        concurrency: 2,
        failFast: false,
        onProgress: (completed, total) => {
          setBatchProgress({ completed, total });
          onLog(`批量调用进度: ${completed}/${total}`, 'info');
        },
      });
      
      const successes = results.filter(r => !(r instanceof Error)).length;
      const failures = results.filter(r => r instanceof Error).length;
      
      onLog(`批量调用完成！成功: ${successes}, 失败: ${failures}`, 'success');
      
      // 显示结果详情
      results.forEach((result, index) => {
        if (result instanceof Error) {
          onLog(`用户 ${userIds[index]} 获取失败: ${result.message}`, 'error');
        } else {
          onLog(`用户 ${userIds[index]} 获取成功`, 'success');
        }
      });
      
    } catch (error) {
      onLog(`批量调用测试失败: ${error instanceof Error ? error.message : String(error)}`, 'error');
    } finally {
      setLoading(false);
      setBatchProgress({ completed: 0, total: 0 });
    }
  };

  // 测试缓存机制
  const testCaching = async () => {
    onLog('测试缓存机制...', 'info');
    
    try {
      // 第一次调用（应该从 IPC 获取）
      const start1 = Date.now();
      await callIpcWithCache(
        'system-info',
        () => window.electronAPI.system.getInfo(),
        globalIpcCache,
        30000 // 30 秒缓存
      );
      const time1 = Date.now() - start1;
      onLog(`第一次调用耗时: ${time1}ms（从 IPC 获取）`, 'info');
      
      // 第二次调用（应该从缓存获取）
      const start2 = Date.now();
      await callIpcWithCache(
        'system-info',
        () => window.electronAPI.system.getInfo(),
        globalIpcCache,
        30000
      );
      const time2 = Date.now() - start2;
      onLog(`第二次调用耗时: ${time2}ms（从缓存获取）`, 'success');
      
      updateStatus();
      
    } catch (error) {
      onLog(`缓存测试失败: ${error instanceof Error ? error.message : String(error)}`, 'error');
    }
  };

  // 测试队列管理
  const testQueueManagement = async () => {
    onLog('测试队列管理...', 'info');
    
    try {
      // 添加多个不同优先级的任务
      const promises = [
        globalIpcQueue.add('high-1', () => window.electronAPI.system.getInfo(), 10),
        globalIpcQueue.add('normal-1', () => window.electronAPI.user.getAll(), 0),
        globalIpcQueue.add('high-2', () => window.electronAPI.system.getInfo(), 10),
        globalIpcQueue.add('normal-2', () => window.electronAPI.user.getById('1'), 0),
        globalIpcQueue.add('low-1', () => window.electronAPI.file.exists('test.txt'), -5),
      ];
      
      // 定期更新状态
      const statusInterval = setInterval(updateStatus, 100);
      
      await Promise.all(promises);
      
      clearInterval(statusInterval);
      updateStatus();
      
      onLog('队列管理测试完成！', 'success');
      
    } catch (error) {
      onLog(`队列管理测试失败: ${error instanceof Error ? error.message : String(error)}`, 'error');
    }
  };

  // 清空缓存
  const clearCache = () => {
    globalIpcCache.clear();
    updateStatus();
    onLog('缓存已清空', 'info');
  };

  // 清空队列
  const clearQueue = () => {
    globalIpcQueue.clear();
    updateStatus();
    onLog('队列已清空', 'info');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">高级功能演示</h2>
        <div className="text-sm text-gray-600">
          错误处理、重试、缓存、队列管理
        </div>
      </div>

      {/* 重试机制配置 */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">🔄 重试机制配置</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-1">超时时间 (ms)</label>
            <input
              type="number"
              value={retryOptions.timeout}
              onChange={(e) => setRetryOptions({
                ...retryOptions,
                timeout: Number(e.target.value)
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">重试次数</label>
            <input
              type="number"
              value={retryOptions.retries}
              onChange={(e) => setRetryOptions({
                ...retryOptions,
                retries: Number(e.target.value)
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">重试延迟 (ms)</label>
            <input
              type="number"
              value={retryOptions.retryDelay}
              onChange={(e) => setRetryOptions({
                ...retryOptions,
                retryDelay: Number(e.target.value)
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <button
          onClick={testRetryMechanism}
          disabled={loading}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {loading ? '测试中...' : '测试重试机制'}
        </button>
      </div>

      {/* 批量调用测试 */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">📦 批量调用测试</h3>
        <div className="mb-4">
          <p className="text-gray-600 mb-2">
            将同时调用多个用户 API，展示并发控制和错误处理
          </p>
          {batchProgress.total > 0 && (
            <div className="mb-2">
              <div className="flex justify-between text-sm mb-1">
                <span>进度</span>
                <span>{batchProgress.completed}/{batchProgress.total}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(batchProgress.completed / batchProgress.total) * 100}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>
        <button
          onClick={testBatchCalls}
          disabled={loading}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
        >
          {loading ? '执行中...' : '测试批量调用'}
        </button>
      </div>

      {/* 缓存管理 */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">🗂️ 缓存管理</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <h4 className="font-medium mb-2">缓存统计</h4>
            <div className="bg-gray-50 p-3 rounded">
              <div className="text-sm">
                <div>缓存项数量: <span className="font-semibold">{cacheStats.size}</span></div>
                <div className="mt-1">
                  缓存键: {cacheStats.keys.length > 0 ? cacheStats.keys.join(', ') : '无'}
                </div>
              </div>
            </div>
          </div>
          <div>
            <h4 className="font-medium mb-2">操作</h4>
            <div className="space-x-2">
              <button
                onClick={testCaching}
                className="px-3 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
              >
                测试缓存
              </button>
              <button
                onClick={clearCache}
                className="px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600"
              >
                清空缓存
              </button>
              <button
                onClick={updateStatus}
                className="px-3 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                刷新状态
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 队列管理 */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">🚦 队列管理</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <h4 className="font-medium mb-2">队列状态</h4>
            <div className="bg-gray-50 p-3 rounded">
              <div className="text-sm space-y-1">
                <div>队列长度: <span className="font-semibold">{queueStatus.queueLength}</span></div>
                <div>活跃任务: <span className="font-semibold">{queueStatus.activeJobs}</span></div>
                <div>运行状态: <span className={`font-semibold ${queueStatus.running ? 'text-green-600' : 'text-gray-600'}`}>
                  {queueStatus.running ? '运行中' : '空闲'}
                </span></div>
              </div>
            </div>
          </div>
          <div>
            <h4 className="font-medium mb-2">操作</h4>
            <div className="space-x-2">
              <button
                onClick={testQueueManagement}
                className="px-3 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600"
              >
                测试队列
              </button>
              <button
                onClick={clearQueue}
                className="px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600"
              >
                清空队列
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 功能说明 */}
      <div className="bg-gradient-to-r from-yellow-50 to-orange-50 p-6 rounded-lg">
        <h3 className="text-lg font-bold text-gray-800 mb-3">🛠️ 功能说明</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700">
          <div>
            <h4 className="font-semibold mb-2">重试机制</h4>
            <ul className="space-y-1">
              <li>• 自动重试失败的 IPC 调用</li>
              <li>• 指数退避延迟策略</li>
              <li>• 可配置超时和重试次数</li>
              <li>• 智能错误分类</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-2">批量处理</h4>
            <ul className="space-y-1">
              <li>• 并发控制，避免过载</li>
              <li>• 失败快速模式或容错模式</li>
              <li>• 实时进度反馈</li>
              <li>• 结果聚合和分析</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-2">缓存系统</h4>
            <ul className="space-y-1">
              <li>• TTL（生存时间）机制</li>
              <li>• 自动过期清理</li>
              <li>• 键值统计和监控</li>
              <li>• 内存优化策略</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-2">队列管理</h4>
            <ul className="space-y-1">
              <li>• 优先级调度</li>
              <li>• 并发数量控制</li>
              <li>• 任务状态监控</li>
              <li>• 动态负载平衡</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdvancedDemo;
