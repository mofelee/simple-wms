import React, { useState, useEffect } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { IPC, UpdateInfo, UpdateProgressData, UpdateError } from '@/common/ipc';

function UpdaterComponent() {
  const [isChecking, setIsChecking] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState<UpdateInfo | null>(null);
  const [updateDownloaded, setUpdateDownloaded] = useState<UpdateInfo | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<UpdateProgressData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  // 使用 electronAPI 进行 IPC 调用

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  // 设置IPC事件监听器
  useEffect(() => {
    const cleanup: (() => void)[] = [];

    // 监听更新可用事件
    const handleUpdateAvailable = (info: UpdateInfo) => {
      addLog(`🔄 发现新版本: v${info.version}`);
      setUpdateAvailable(info);
      setIsChecking(false);
    };

    // 监听无更新事件
    const handleUpdateNotAvailable = (info: UpdateInfo) => {
      addLog(`✅ 当前版本 v${info.version} 已是最新`);
      setIsChecking(false);
    };

    // 监听下载进度事件
    const handleDownloadProgress = (progress: UpdateProgressData) => {
      setDownloadProgress(progress);
      const mbTransferred = (progress.transferred / 1024 / 1024).toFixed(2);
      const mbTotal = (progress.total / 1024 / 1024).toFixed(2);
      const speed = (progress.bytesPerSecond / 1024 / 1024).toFixed(2);
      addLog(`📥 下载进度: ${progress.percent.toFixed(1)}% (${mbTransferred}/${mbTotal} MB) - ${speed} MB/s`);
    };

    // 监听下载完成事件
    const handleUpdateDownloaded = (info: UpdateInfo) => {
      addLog(`✅ 更新下载完成: v${info.version}`);
      setUpdateDownloaded(info);
      setIsDownloading(false);
      setDownloadProgress(null);
    };

    // 监听更新错误事件
    const handleUpdateError = (error: UpdateError) => {
      addLog(`❌ 更新错误: ${error.message}`);
      setError(error.message);
      setIsChecking(false);
      setIsDownloading(false);
    };

    // 注册事件监听器
    if (window.electronAPI?.on) {
      window.electronAPI.on(IPC.updater.onUpdateAvailable, handleUpdateAvailable);
      window.electronAPI.on(IPC.updater.onUpdateNotAvailable, handleUpdateNotAvailable);
      window.electronAPI.on(IPC.updater.onDownloadProgress, handleDownloadProgress);
      window.electronAPI.on(IPC.updater.onUpdateDownloaded, handleUpdateDownloaded);
      window.electronAPI.on(IPC.updater.onUpdateError, handleUpdateError);

      cleanup.push(() => {
        window.electronAPI.off(IPC.updater.onUpdateAvailable, handleUpdateAvailable);
        window.electronAPI.off(IPC.updater.onUpdateNotAvailable, handleUpdateNotAvailable);
        window.electronAPI.off(IPC.updater.onDownloadProgress, handleDownloadProgress);
        window.electronAPI.off(IPC.updater.onUpdateDownloaded, handleUpdateDownloaded);
        window.electronAPI.off(IPC.updater.onUpdateError, handleUpdateError);
      });
    }

    return () => {
      cleanup.forEach(fn => fn());
    };
  }, []);

  const handleCheckForUpdates = async () => {
    try {
      setError(null);
      setIsChecking(true);
      addLog('🔍 开始检查更新...');
      
      const result = await window.electronAPI.updater.checkForUpdates();
      
      if (result.success) {
        addLog('✅ 更新检查完成');
      } else {
        throw new Error(result.error || '检查更新失败');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '未知错误';
      addLog(`❌ 检查更新失败: ${errorMessage}`);
      setError(errorMessage);
      setIsChecking(false);
    }
  };

  const handleDownloadUpdate = async () => {
    try {
      setError(null);
      setIsDownloading(true);
      addLog('📥 开始下载更新...');
      
      const result = await window.electronAPI.updater.downloadUpdate();
      
      if (!result.success) {
        throw new Error(result.error || '下载更新失败');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '未知错误';
      addLog(`❌ 下载更新失败: ${errorMessage}`);
      setError(errorMessage);
      setIsDownloading(false);
    }
  };

  const handleInstallUpdate = async () => {
    try {
      setError(null);
      addLog('🔄 准备安装更新并重启应用...');
      
      const result = await window.electronAPI.updater.quitAndInstall();
      
      if (!result.success) {
        throw new Error(result.error || '安装更新失败');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '未知错误';
      addLog(`❌ 安装更新失败: ${errorMessage}`);
      setError(errorMessage);
    }
  };

  const clearLogs = () => {
    setLogs([]);
  };

  const formatBytes = (bytes: number): string => {
    const mb = bytes / 1024 / 1024;
    return mb.toFixed(2) + ' MB';
  };

  const formatSpeed = (bytesPerSecond: number): string => {
    const mbps = bytesPerSecond / 1024 / 1024;
    return mbps.toFixed(2) + ' MB/s';
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">应用自动更新</h1>
        <p className="text-gray-600">检查、下载和安装应用更新</p>
      </div>

      {/* 当前状态 */}
      <div className="bg-white rounded-lg border p-6">
        <h2 className="text-xl font-semibold mb-4">当前状态</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl mb-2">🔍</div>
            <div className="font-medium">检查更新</div>
            <div className="text-sm text-gray-600">
              {isChecking ? '检查中...' : '就绪'}
            </div>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl mb-2">📥</div>
            <div className="font-medium">下载更新</div>
            <div className="text-sm text-gray-600">
              {isDownloading ? `下载中 ${downloadProgress?.percent.toFixed(1)}%` : '就绪'}
            </div>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <div className="text-2xl mb-2">🔄</div>
            <div className="font-medium">安装更新</div>
            <div className="text-sm text-gray-600">
              {updateDownloaded ? '就绪' : '等待下载'}
            </div>
          </div>
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="bg-white rounded-lg border p-6">
        <h2 className="text-xl font-semibold mb-4">操作</h2>
        <div className="flex flex-wrap gap-3">
          <Button
            onClick={handleCheckForUpdates}
            disabled={isChecking || isDownloading}
            className="bg-blue-500 hover:bg-blue-600"
          >
            {isChecking ? '检查中...' : '检查更新'}
          </Button>

          {updateAvailable && (
            <Button
              onClick={handleDownloadUpdate}
              disabled={isDownloading || isChecking}
              className="bg-green-500 hover:bg-green-600"
            >
              {isDownloading ? '下载中...' : `下载 v${updateAvailable.version}`}
            </Button>
          )}

          {updateDownloaded && (
            <Button
              onClick={handleInstallUpdate}
              disabled={isChecking || isDownloading}
              className="bg-purple-500 hover:bg-purple-600"
            >
              安装并重启
            </Button>
          )}

          <Button
            onClick={clearLogs}
            variant="outline"
            className="ml-auto"
          >
            清空日志
          </Button>
        </div>
      </div>

      {/* 更新信息 */}
      {updateAvailable && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4 text-blue-800">发现新版本</h2>
          <div className="space-y-2">
            <p><strong>版本:</strong> v{updateAvailable.version}</p>
            {updateAvailable.releaseDate && (
              <p><strong>发布日期:</strong> {new Date(updateAvailable.releaseDate).toLocaleDateString()}</p>
            )}
            {updateAvailable.releaseName && (
              <p><strong>发布名称:</strong> {updateAvailable.releaseName}</p>
            )}
            {updateAvailable.releaseNotes && (
              <div>
                <strong>更新说明:</strong>
                <div className="mt-2 p-3 bg-white rounded border text-sm whitespace-pre-line">
                  {updateAvailable.releaseNotes}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 下载进度 */}
      {downloadProgress && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4 text-green-800">下载进度</h2>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span>进度</span>
              <span>{downloadProgress.percent.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className="bg-green-500 h-2.5 rounded-full transition-all duration-300" 
                style={{ width: `${downloadProgress.percent}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>已下载: {formatBytes(downloadProgress.transferred)}</span>
              <span>总大小: {formatBytes(downloadProgress.total)}</span>
            </div>
            <div className="text-sm text-gray-600">
              下载速度: {formatSpeed(downloadProgress.bytesPerSecond)}
            </div>
          </div>
        </div>
      )}

      {/* 错误提示 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-2 text-red-800">错误</h2>
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* 日志 */}
      <div className="bg-white rounded-lg border p-6">
        <h2 className="text-xl font-semibold mb-4">操作日志</h2>
        <div className="bg-gray-50 rounded-lg p-4 max-h-64 overflow-y-auto">
          {logs.length === 0 ? (
            <p className="text-gray-500 text-center">暂无日志</p>
          ) : (
            <div className="font-mono text-sm space-y-1">
              {logs.map((log, index) => (
                <div key={index} className="text-gray-700">
                  {log}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 使用说明 */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">使用说明</h2>
        <div className="text-sm text-gray-600 space-y-2">
          <p>1. 点击"检查更新"按钮检查是否有新版本</p>
          <p>2. 如果有更新，会显示"下载"按钮，点击开始下载</p>
          <p>3. 下载完成后，点击"安装并重启"完成更新</p>
          <p>4. 应用会在启动时自动检查更新（仅生产环境）</p>
          <p className="text-orange-600">注意: 更新过程中请不要关闭应用</p>
        </div>
      </div>
    </div>
  );
}

export const Route = createFileRoute('/updater')({
  component: UpdaterComponent,
});
