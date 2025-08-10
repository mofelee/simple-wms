import { Task, CreateTaskReq, TaskProgressData } from '../../common/ipc';

// 模拟任务存储
const tasks = new Map<string, Task>();
let nextTaskId = 1;

// 任务进度回调
type ProgressCallback = (data: TaskProgressData) => void;
const progressCallbacks = new Map<string, ProgressCallback>();

export const taskService = {
  /**
   * 创建新任务
   */
  async createTask(req: CreateTaskReq, onProgress?: ProgressCallback): Promise<Task> {
    const taskId = String(nextTaskId++);
    
    const task: Task = {
      id: taskId,
      name: req.name,
      description: req.description,
      status: 'pending',
      progress: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    tasks.set(taskId, task);
    
    if (onProgress) {
      progressCallbacks.set(taskId, onProgress);
    }
    
    // 立即开始执行任务
    this.executeTask(taskId, req.data);
    
    return task;
  },

  /**
   * 获取任务状态
   */
  async getTaskStatus(taskId: string): Promise<Task | null> {
    return tasks.get(taskId) || null;
  },

  /**
   * 取消任务
   */
  async cancelTask(taskId: string): Promise<boolean> {
    const task = tasks.get(taskId);
    if (!task) {
      return false;
    }
    
    if (task.status === 'running' || task.status === 'pending') {
      task.status = 'cancelled';
      task.updatedAt = new Date();
      
      this.notifyProgress(taskId, {
        taskId,
        progress: task.progress,
        status: 'cancelled',
        message: 'Task was cancelled',
      });
      
      return true;
    }
    
    return false;
  },

  /**
   * 获取所有任务
   */
  async getAllTasks(): Promise<Task[]> {
    return Array.from(tasks.values());
  },

  /**
   * 执行任务（模拟长时间运行的任务）
   */
  async executeTask(taskId: string, data?: any): Promise<void> {
    const task = tasks.get(taskId);
    if (!task) return;
    
    try {
      task.status = 'running';
      task.updatedAt = new Date();
      
      this.notifyProgress(taskId, {
        taskId,
        progress: 0,
        status: 'started',
        message: 'Task started',
      });
      
      // 模拟任务执行过程
      for (let progress = 0; progress <= 100; progress += 10) {
        // 检查任务是否被取消
        const currentTask = tasks.get(taskId);
        if (!currentTask || currentTask.status === 'cancelled') {
          return;
        }
        
        // 模拟工作延迟
        await new Promise(resolve => setTimeout(resolve, 200));
        
        task.progress = progress;
        task.updatedAt = new Date();
        
        this.notifyProgress(taskId, {
          taskId,
          progress,
          status: 'running',
          message: `Processing... ${progress}%`,
        });
      }
      
      // 任务完成
      task.status = 'completed';
      task.progress = 100;
      task.result = {
        message: 'Task completed successfully',
        processedData: data,
        completedAt: new Date(),
      };
      task.updatedAt = new Date();
      
      this.notifyProgress(taskId, {
        taskId,
        progress: 100,
        status: 'completed',
        message: 'Task completed successfully',
      });
      
    } catch (error) {
      task.status = 'failed';
      task.error = (error as Error).message;
      task.updatedAt = new Date();
      
      this.notifyProgress(taskId, {
        taskId,
        progress: task.progress,
        status: 'failed',
        message: `Task failed: ${(error as Error).message}`,
      });
    }
  },

  /**
   * 通知进度更新
   */
  notifyProgress(taskId: string, data: TaskProgressData): void {
    const callback = progressCallbacks.get(taskId);
    if (callback) {
      callback(data);
    }
  },

  /**
   * 清理已完成的任务
   */
  async cleanupCompletedTasks(): Promise<number> {
    let cleaned = 0;
    
    for (const [taskId, task] of tasks.entries()) {
      if (task.status === 'completed' || task.status === 'failed' || task.status === 'cancelled') {
        // 只清理超过1小时的任务
        const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
        if (task.updatedAt < hourAgo) {
          tasks.delete(taskId);
          progressCallbacks.delete(taskId);
          cleaned++;
        }
      }
    }
    
    return cleaned;
  },
};
