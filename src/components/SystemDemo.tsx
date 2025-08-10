import React, { useState, useEffect } from 'react';
import { SystemInfo } from '../common/ipc';

interface SystemDemoProps {
  onLog: (message: string, type?: 'info' | 'success' | 'error') => void;
}

const SystemDemo: React.FC<SystemDemoProps> = ({ onLog }) => {
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [folderPath, setFolderPath] = useState('');
  const [notificationData, setNotificationData] = useState({
    title: '测试通知',
    body: '这是一个来自 Electron 应用的测试通知',
    icon: ''
  });
  const [appPaths, setAppPaths] = useState<Record<string, string> | null>(null);

  // 获取系统信息
  const getSystemInfo = async () => {
    setLoading(true);
    try {
      const response = await window.electronAPI.system.getInfo();
      if (response.success && response.data) {
        setSystemInfo(response.data);
        onLog('系统信息获取成功', 'success');
      } else {
        onLog(`获取系统信息失败: ${response.error}`, 'error');
      }
    } catch (error) {
      onLog(`获取系统信息失败: ${(error as Error).message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // 打开文件夹
  const openFolder = async (path?: string) => {
    const targetPath = path || folderPath;
    if (!targetPath) {
      onLog('请输入文件夹路径', 'error');
      return;
    }

    try {
      const response = await window.electronAPI.system.openFolder(targetPath);
      if (response.success) {
        onLog(`文件夹 ${targetPath} 打开成功`, 'success');
      } else {
        onLog(`打开文件夹失败: ${response.error}`, 'error');
      }
    } catch (error) {
      onLog(`打开文件夹失败: ${(error as Error).message}`, 'error');
    }
  };

  // 显示通知
  const showNotification = async () => {
    if (!notificationData.title || !notificationData.body) {
      onLog('请填写通知标题和内容', 'error');
      return;
    }

    try {
      const response = await window.electronAPI.system.showNotification(
        notificationData.title,
        notificationData.body,
        notificationData.icon || undefined
      );
      if (response.success) {
        onLog('通知显示成功', 'success');
      } else {
        onLog(`显示通知失败: ${response.error}`, 'error');
      }
    } catch (error) {
      onLog(`显示通知失败: ${(error as Error).message}`, 'error');
    }
  };

  // 格式化字节大小
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // 获取内存使用率
  const getMemoryUsage = (): number => {
    if (!systemInfo) return 0;
    return ((systemInfo.totalMemory - systemInfo.freeMemory) / systemInfo.totalMemory) * 100;
  };

  // 获取平台显示名称
  const getPlatformName = (platform: string): string => {
    switch (platform) {
      case 'win32': return 'Windows';
      case 'darwin': return 'macOS';
      case 'linux': return 'Linux';
      default: return platform;
    }
  };

  // 获取应用路径信息
  const getAppPaths = async () => {
    try {
      const response = await window.electronAPI.system.getAppPaths();
      if (response.success && response.data) {
        setAppPaths(response.data);
        onLog('应用路径信息获取成功', 'success');
      } else {
        onLog(`获取应用路径失败: ${response.error}`, 'error');
      }
    } catch (error) {
      onLog(`获取应用路径失败: ${error instanceof Error ? error.message : String(error)}`, 'error');
    }
  };

  // 初始加载系统信息
  useEffect(() => {
    getSystemInfo();
    getAppPaths();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">系统信息演示</h2>
        <button 
          onClick={getSystemInfo}
          disabled={loading}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {loading ? '获取中...' : '刷新'}
        </button>
      </div>

      {/* 系统信息展示 */}
      {systemInfo && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">系统信息</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* 基本信息 */}
            <div className="space-y-4">
              <div>
                <div className="text-sm font-medium text-gray-600">操作系统</div>
                <div className="text-lg font-semibold">
                  {getPlatformName(systemInfo.platform)}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-600">系统架构</div>
                <div className="text-lg font-semibold">{systemInfo.arch}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-600">Node.js 版本</div>
                <div className="text-lg font-semibold">{systemInfo.version}</div>
              </div>
            </div>

            {/* CPU 信息 */}
            <div className="space-y-4">
              <div>
                <div className="text-sm font-medium text-gray-600">CPU 核心数</div>
                <div className="text-lg font-semibold">{systemInfo.cpuCount} 核</div>
              </div>
            </div>

            {/* 内存信息 */}
            <div className="space-y-4">
              <div>
                <div className="text-sm font-medium text-gray-600">总内存</div>
                <div className="text-lg font-semibold">
                  {formatBytes(systemInfo.totalMemory)}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-600">可用内存</div>
                <div className="text-lg font-semibold text-green-600">
                  {formatBytes(systemInfo.freeMemory)}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-600">内存使用率</div>
                <div className="flex items-center space-x-2">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        getMemoryUsage() > 80 ? 'bg-red-500' : 
                        getMemoryUsage() > 60 ? 'bg-yellow-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${getMemoryUsage()}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium">
                    {getMemoryUsage().toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 应用路径信息 */}
      {appPaths && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">📁 应用路径信息</h3>
          <div className="bg-yellow-50 p-4 rounded-lg mb-4">
            <p className="text-yellow-800 text-sm font-medium mb-2">
              🔒 <strong>安全提示</strong>：文件操作仅限于以下安全目录
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4">
            {Object.entries(appPaths).map(([key, value]) => {
              const labels: Record<string, string> = {
                userData: '📂 应用数据目录',
                documents: '📄 文档目录', 
                downloads: '⬇️ 下载目录',
                desktop: '🖥️ 桌面目录',
                temp: '🗂️ 临时目录',
                exe: '⚡ 可执行文件目录',
                logs: '📋 日志目录',
              };
              
              return (
                <div key={key} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="font-medium text-gray-800 mb-1">
                        {labels[key] || key}
                      </div>
                      <div className="text-sm text-gray-600 font-mono break-all">
                        {value}
                      </div>
                    </div>
                    <button
                      onClick={() => openFolder(value)}
                      className="ml-2 px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
                    >
                      打开
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 text-xs text-gray-500">
            💡 提示：点击"打开"按钮可以在文件管理器中查看对应目录
          </div>
        </div>
      )}

      {/* 文件夹操作 */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">文件夹操作</h3>
        <div className="space-y-4">
          <div className="flex space-x-2">
            <input
              type="text"
              placeholder="文件夹路径（绝对路径）"
              value={folderPath}
              onChange={(e) => setFolderPath(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={() => openFolder()}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              打开文件夹
            </button>
          </div>
          
          {/* 快速打开常用文件夹 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <button
              onClick={() => openFolder(process.platform === 'win32' ? 'C:\\' : '/')}
              className="px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
            >
              根目录
            </button>
            <button
              onClick={() => openFolder(process.platform === 'win32' ? process.env.USERPROFILE || 'C:\\' : process.env.HOME || '/')}
              className="px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
            >
              用户目录
            </button>
            <button
              onClick={() => openFolder(process.platform === 'win32' ? process.env.USERPROFILE + '\\Desktop' || 'C:\\' : process.env.HOME + '/Desktop' || '/')}
              className="px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
            >
              桌面
            </button>
            <button
              onClick={() => openFolder(process.platform === 'win32' ? process.env.USERPROFILE + '\\Downloads' || 'C:\\' : process.env.HOME + '/Downloads' || '/')}
              className="px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
            >
              下载
            </button>
          </div>
        </div>
      </div>

      {/* 系统通知 */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">系统通知</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="通知标题"
              value={notificationData.title}
              onChange={(e) => setNotificationData({ ...notificationData, title: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              placeholder="图标路径（可选）"
              value={notificationData.icon}
              onChange={(e) => setNotificationData({ ...notificationData, icon: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <textarea
            placeholder="通知内容"
            value={notificationData.body}
            onChange={(e) => setNotificationData({ ...notificationData, body: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex space-x-2">
            <button
              onClick={showNotification}
              className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
            >
              发送通知
            </button>
            <button
              onClick={() => setNotificationData({
                title: '任务完成',
                body: '您的任务已经成功完成！',
                icon: ''
              })}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              使用模板
            </button>
          </div>
        </div>
      </div>

      {/* 系统状态监控 */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">实时监控</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">
              {systemInfo ? systemInfo.cpuCount : '?'}
            </div>
            <div className="text-sm text-gray-600">CPU 核心</div>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              {systemInfo ? formatBytes(systemInfo.freeMemory) : '?'}
            </div>
            <div className="text-sm text-gray-600">可用内存</div>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">
              {systemInfo ? getPlatformName(systemInfo.platform) : '?'}
            </div>
            <div className="text-sm text-gray-600">操作系统</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemDemo;
