import React, { useState, useCallback, useEffect } from 'react';
import UserDemo from '@/components/UserDemo';
import FileDemo from '@/components/FileDemo';
import SystemDemo from '@/components/SystemDemo';
import TaskDemo from '@/components/TaskDemo';
import AdvancedDemo from '@/components/AdvancedDemo';
import LogViewer from '@/components/LogViewer';

interface LogEntry {
  id: number;
  timestamp: Date;
  message: string;
  type: 'info' | 'success' | 'error';
}

type DemoTab = 'overview' | 'users' | 'files' | 'system' | 'tasks' | 'advanced';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<DemoTab>('overview');
  const [logs, setLogs] = useState<LogEntry[]>([]);

  // 添加日志
  const addLog = useCallback((message: string, type: 'info' | 'success' | 'error' = 'info') => {
    setLogs(prev => {
      // 使用时间戳 + 随机数生成唯一 ID
      const uniqueId = Date.now() + Math.random();
      const newLog: LogEntry = {
        id: uniqueId,
        timestamp: new Date(),
        message,
        type,
      };
      return [...prev, newLog];
    });
  }, []); // 移除依赖，使用函数式更新

  // 清空日志
  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  // 应用启动时的初始化
  useEffect(() => {
    // 添加启动日志
    addLog('🚀 Electron IPC 演示系统启动成功！');
    addLog('📁 文件将保存在应用数据目录中，查看终端获取详细路径', 'info');
    addLog('💡 提示：所有操作都会在此日志面板中显示', 'info');
    addLog('🔍 建议：先查看"概览"了解系统功能，然后逐个体验各模块', 'info');
  }, [addLog]);

  // 标签页配置
  const tabs = [
    { id: 'overview' as const, name: '概览', icon: '🏠' },
    { id: 'users' as const, name: '用户管理', icon: '👥' },
    { id: 'files' as const, name: '文件操作', icon: '📁' },
    { id: 'system' as const, name: '系统信息', icon: '💻' },
    { id: 'tasks' as const, name: '任务管理', icon: '⚙️' },
    { id: 'advanced' as const, name: '高级功能', icon: '🚀' },
  ];

  // 渲染活动标签页的内容
  const renderActiveTab = () => {
    switch (activeTab) {
      case 'users':
        return <UserDemo onLog={addLog} />;
      case 'files':
        return <FileDemo onLog={addLog} />;
      case 'system':
        return <SystemDemo onLog={addLog} />;
      case 'tasks':
        return <TaskDemo onLog={addLog} />;
      case 'advanced':
        return <AdvancedDemo onLog={addLog} />;
      case 'overview':
      default:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h1 className="text-4xl font-bold text-gray-800 mb-4">
                🚀 Electron IPC 演示系统
              </h1>
              <p className="text-xl text-gray-600 mb-8">
                完整的进程间通信解决方案，展示最佳实践
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
              {tabs.slice(1).map((tab) => (
                <div 
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer group"
                >
                  <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">
                    {tab.icon}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">
                    {tab.name}
                  </h3>
                  <p className="text-gray-600 text-sm">
                    {tab.id === 'users' && '演示用户 CRUD 操作和实时事件通知'}
                    {tab.id === 'files' && '展示安全的文件读写和进度监控'}
                    {tab.id === 'system' && '获取系统信息和调用系统功能'}
                    {tab.id === 'tasks' && '异步任务管理和进度跟踪'}
                    {tab.id === 'advanced' && '错误处理、重试、缓存、队列管理'}
                  </p>
                </div>
              ))}
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">🏗️ 架构特点</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">✨ 安全设计</h3>
                  <ul className="space-y-2 text-gray-600">
                    <li>• contextIsolation 启用，完全隔离上下文</li>
                    <li>• nodeIntegration 禁用，阻止直接 Node.js 访问</li>
                    <li>• preload 脚本作为安全桥接层</li>
                    <li>• 输入验证使用 Zod schema</li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">🔧 技术栈</h3>
                  <ul className="space-y-2 text-gray-600">
                    <li>• TypeScript 提供类型安全</li>
                    <li>• 统一的 IPC 通道管理</li>
                    <li>• 响应式错误处理机制</li>
                    <li>• 实时事件广播系统</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-lg">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">📚 使用说明</h2>
              <div className="prose text-gray-700">
                <p className="mb-4">
                  这个演示应用展示了在 Electron 中实现安全、可维护的进程间通信的最佳实践。
                  每个模块都包含完整的 CRUD 操作、错误处理和实时事件通知。
                </p>
                <p>
                  点击上方的功能模块开始探索，所有操作都会记录在右侧的日志面板中。
                  你可以查看详细的执行过程和结果反馈。
                </p>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* 导航栏 */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="text-lg">{tab.icon}</span>
                <span>{tab.name}</span>
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* 主要内容区域 */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 左侧主内容 */}
          <div className="lg:col-span-2">
            {renderActiveTab()}
          </div>

          {/* 右侧日志面板 */}
          <div className="lg:col-span-1">
            <LogViewer logs={logs} onClear={clearLogs} />
          </div>
        </div>
      </div>

      {/* 底部状态栏 */}
      <footer className="bg-white border-t border-gray-200 py-4">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm text-gray-600">
          <p>
            Electron IPC 最佳实践演示 • 
            采用 TypeScript + React + Tailwind CSS 构建 • 
            安全的上下文隔离设计
          </p>
        </div>
      </footer>
    </div>
  );
};

export default App;
