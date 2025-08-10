import React, { useState, useRef, useEffect } from 'react';

interface LogEntry {
  id: number;
  timestamp: Date;
  message: string;
  type: 'info' | 'success' | 'error';
}

interface LogViewerProps {
  logs: LogEntry[];
  onClear: () => void;
}

const LogViewer: React.FC<LogViewerProps> = ({ logs, onClear }) => {
  const [filter, setFilter] = useState<'all' | 'info' | 'success' | 'error'>('all');
  const [autoScroll, setAutoScroll] = useState(true);
  const logContainerRef = useRef<HTMLDivElement>(null);

  // 自动滚动到底部
  useEffect(() => {
    if (autoScroll && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  // 过滤日志
  const filteredLogs = logs.filter(log => filter === 'all' || log.type === filter);

  // 获取日志类型样式
  const getLogTypeStyle = (type: string): string => {
    switch (type) {
      case 'info':
        return 'text-blue-700 bg-blue-50 border-blue-200';
      case 'success':
        return 'text-green-700 bg-green-50 border-green-200';
      case 'error':
        return 'text-red-700 bg-red-50 border-red-200';
      default:
        return 'text-gray-700 bg-gray-50 border-gray-200';
    }
  };

  // 获取日志类型图标
  const getLogTypeIcon = (type: string): string => {
    switch (type) {
      case 'info':
        return 'ℹ️';
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      default:
        return '📝';
    }
  };

  // 获取过滤器计数
  const getFilterCount = (type: 'all' | 'info' | 'success' | 'error'): number => {
    if (type === 'all') return logs.length;
    return logs.filter(log => log.type === type).length;
  };

  return (
    <div className="bg-white rounded-lg shadow-lg">
      {/* 标题栏 */}
      <div className="flex justify-between items-center p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800">操作日志</h3>
        <div className="flex items-center space-x-2">
          <label className="flex items-center space-x-1 text-sm">
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
              className="rounded border-gray-300"
            />
            <span>自动滚动</span>
          </label>
          <button
            onClick={onClear}
            className="px-3 py-1 bg-gray-500 text-white text-sm rounded hover:bg-gray-600"
          >
            清空
          </button>
        </div>
      </div>

      {/* 过滤器 */}
      <div className="flex space-x-1 p-4 bg-gray-50 border-b border-gray-200">
        {(['all', 'info', 'success', 'error'] as const).map((type) => (
          <button
            key={type}
            onClick={() => setFilter(type)}
            className={`px-3 py-1 text-sm rounded transition-colors ${
              filter === type
                ? 'bg-blue-500 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            {type === 'all' ? '全部' : 
             type === 'info' ? '信息' :
             type === 'success' ? '成功' : '错误'
            } ({getFilterCount(type)})
          </button>
        ))}
      </div>

      {/* 日志内容 */}
      <div 
        ref={logContainerRef}
        className="h-64 overflow-y-auto p-4 space-y-2"
        onScroll={(e) => {
          const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
          const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10;
          setAutoScroll(isAtBottom);
        }}
      >
        {filteredLogs.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            {filter === 'all' ? '暂无日志' : `暂无${filter === 'info' ? '信息' : filter === 'success' ? '成功' : '错误'}日志`}
          </div>
        ) : (
          filteredLogs.map((log) => (
            <div
              key={log.id}
              className={`p-3 rounded border-l-4 ${getLogTypeStyle(log.type)}`}
            >
              <div className="flex items-start space-x-2">
                <span className="text-lg">{getLogTypeIcon(log.type)}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium break-words">
                    {log.message}
                  </div>
                  <div className="text-xs opacity-75 mt-1">
                    {log.timestamp.toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 底部状态栏 */}
      <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 text-xs text-gray-600">
        显示 {filteredLogs.length} / {logs.length} 条日志
        {autoScroll && <span className="ml-2">• 自动滚动已开启</span>}
      </div>
    </div>
  );
};

export default LogViewer;
