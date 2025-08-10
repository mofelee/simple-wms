import React, { useState, useEffect, useRef } from 'react';
import { Task, TaskProgressData } from '../common/ipc';

interface TaskDemoProps {
  onLog: (message: string, type?: 'info' | 'success' | 'error') => void;
}

const TaskDemo: React.FC<TaskDemoProps> = ({ onLog }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskName, setTaskName] = useState('数据处理任务');
  const [taskDescription, setTaskDescription] = useState('这是一个模拟长时间运行的任务');
  const [taskData, setTaskData] = useState('{"items": 100, "type": "processing"}');
  const [loading, setLoading] = useState(false);
  const [progressMap, setProgressMap] = useState<Record<string, TaskProgressData>>({});
  
  // 使用 ref 来存储 onLog 函数，避免依赖变化
  const onLogRef = useRef(onLog);
  onLogRef.current = onLog;

  // 监听任务进度和完成事件
  useEffect(() => {
    const unsubscribeProgress = window.electronAPI.task.onProgress((progress) => {
      setProgressMap(prev => ({
        ...prev,
        [progress.taskId]: progress
      }));
      onLogRef.current(`任务 ${progress.taskId}: ${progress.message || progress.status}`, 'info');
    });

    const unsubscribeComplete = window.electronAPI.task.onComplete((task) => {
      setTasks(prev => prev.map(t => t.id === task.id ? task : t));
      onLogRef.current(`任务 ${task.name} 已${task.status === 'completed' ? '完成' : '失败'}`, 
        task.status === 'completed' ? 'success' : 'error');
    });

    return () => {
      unsubscribeProgress();
      unsubscribeComplete();
    };
  }, []); // 移除 onLog 依赖

  // 创建任务
  const createTask = async () => {
    if (!taskName) {
      onLog('请输入任务名称', 'error');
      return;
    }

    setLoading(true);
    try {
      let data = undefined;
      if (taskData.trim()) {
        try {
          data = JSON.parse(taskData);
        } catch {
          data = taskData; // 如果不是 JSON，就作为字符串处理
        }
      }

      const response = await window.electronAPI.task.create(
        taskName,
        taskDescription || undefined,
        data
      );

      if (response.success && response.data) {
        setTasks(prev => [response.data!, ...prev]);
        onLog(`任务 "${response.data.name}" 创建成功`, 'success');
        
        // 清空表单
        setTaskName('');
        setTaskDescription('');
        setTaskData('');
      } else {
        onLog(`创建任务失败: ${response.error}`, 'error');
      }
    } catch (error) {
      onLog(`创建任务失败: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // 获取任务状态
  const getTaskStatus = async (taskId: string) => {
    try {
      const response = await window.electronAPI.task.getStatus(taskId);
      if (response.success && response.data) {
        setTasks(prev => prev.map(t => t.id === taskId ? response.data! : t));
        onLog(`任务 ${taskId} 状态更新成功`, 'success');
      } else {
        onLog(`获取任务状态失败: ${response.error}`, 'error');
      }
    } catch (error) {
      onLog(`获取任务状态失败: ${error.message}`, 'error');
    }
  };

  // 取消任务
  const cancelTask = async (taskId: string) => {
    try {
      const response = await window.electronAPI.task.cancel(taskId);
      if (response.success) {
        onLog(`任务 ${taskId} 取消成功`, 'success');
        await getTaskStatus(taskId); // 刷新状态
      } else {
        onLog(`取消任务失败: ${response.error}`, 'error');
      }
    } catch (error) {
      onLog(`取消任务失败: ${error.message}`, 'error');
    }
  };

  // 获取任务状态颜色
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'pending': return 'bg-gray-100 text-gray-800';
      case 'running': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'cancelled': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // 获取任务状态文本
  const getStatusText = (status: string): string => {
    switch (status) {
      case 'pending': return '待处理';
      case 'running': return '运行中';
      case 'completed': return '已完成';
      case 'failed': return '失败';
      case 'cancelled': return '已取消';
      default: return status;
    }
  };

  // 快速创建预设任务
  const createPresetTask = (name: string, description: string, data?: any) => {
    setTaskName(name);
    setTaskDescription(description);
    setTaskData(data ? JSON.stringify(data, null, 2) : '');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">任务管理演示</h2>
        <div className="text-sm text-gray-600">
          展示异步任务执行和进度监控
        </div>
      </div>

      {/* 任务创建表单 */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">创建新任务</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="任务名称"
              value={taskName}
              onChange={(e) => setTaskName(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              placeholder="任务描述（可选）"
              value={taskDescription}
              onChange={(e) => setTaskDescription(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <textarea
            placeholder="任务数据（JSON 格式，可选）"
            value={taskData}
            onChange={(e) => setTaskData(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex space-x-2">
            <button
              onClick={createTask}
              disabled={loading}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
            >
              {loading ? '创建中...' : '创建任务'}
            </button>
            <button
              onClick={() => createPresetTask(
                '文件处理任务',
                '批量处理图片文件',
                { fileCount: 50, type: 'image', operation: 'resize' }
              )}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              图片处理
            </button>
            <button
              onClick={() => createPresetTask(
                '数据同步任务',
                '同步远程数据到本地',
                { source: 'remote_api', target: 'local_db', recordCount: 1000 }
              )}
              className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
            >
              数据同步
            </button>
            <button
              onClick={() => createPresetTask(
                '备份任务',
                '备份用户数据',
                { backupType: 'full', compression: true, encryption: true }
              )}
              className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
            >
              数据备份
            </button>
          </div>
        </div>
      </div>

      {/* 任务列表 */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">任务列表</h3>
        {tasks.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            暂无任务，请创建一个新任务
          </div>
        ) : (
          <div className="space-y-4">
            {tasks.map((task) => {
              const progress = progressMap[task.id];
              const displayProgress = progress?.progress ?? task.progress;
              
              return (
                <div key={task.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="text-lg font-medium">{task.name}</h4>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(task.status)}`}>
                          {getStatusText(task.status)}
                        </span>
                      </div>
                      {task.description && (
                        <p className="text-gray-600 text-sm mb-2">{task.description}</p>
                      )}
                      <div className="text-xs text-gray-500">
                        ID: {task.id} | 创建: {new Date(task.createdAt).toLocaleString()}
                        {task.updatedAt !== task.createdAt && (
                          <> | 更新: {new Date(task.updatedAt).toLocaleString()}</>
                        )}
                      </div>
                    </div>
                    <div className="flex space-x-2 ml-4">
                      <button
                        onClick={() => getTaskStatus(task.id)}
                        className="px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
                      >
                        刷新
                      </button>
                      {(task.status === 'running' || task.status === 'pending') && (
                        <button
                          onClick={() => cancelTask(task.id)}
                          className="px-3 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600"
                        >
                          取消
                        </button>
                      )}
                    </div>
                  </div>

                  {/* 进度条 */}
                  <div className="mb-3">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium">进度</span>
                      <span className="text-sm text-gray-600">{displayProgress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-300 ${
                          task.status === 'completed' ? 'bg-green-500' :
                          task.status === 'failed' ? 'bg-red-500' :
                          task.status === 'cancelled' ? 'bg-yellow-500' :
                          'bg-blue-500'
                        }`}
                        style={{ width: `${displayProgress}%` }}
                      ></div>
                    </div>
                    {progress?.message && (
                      <div className="text-xs text-gray-600 mt-1">
                        {progress.message}
                      </div>
                    )}
                  </div>

                  {/* 任务结果或错误 */}
                  {task.result && (
                    <div className="bg-green-50 p-3 rounded border">
                      <div className="text-sm font-medium text-green-800 mb-1">执行结果:</div>
                      <pre className="text-xs text-green-700 whitespace-pre-wrap">
                        {JSON.stringify(task.result, null, 2)}
                      </pre>
                    </div>
                  )}

                  {task.error && (
                    <div className="bg-red-50 p-3 rounded border">
                      <div className="text-sm font-medium text-red-800 mb-1">错误信息:</div>
                      <div className="text-xs text-red-700">{task.error}</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 任务统计 */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">任务统计</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {['pending', 'running', 'completed', 'failed', 'cancelled'].map((status) => {
            const count = tasks.filter(task => task.status === status).length;
            return (
              <div key={status} className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-800">{count}</div>
                <div className="text-sm text-gray-600">{getStatusText(status)}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default TaskDemo;
