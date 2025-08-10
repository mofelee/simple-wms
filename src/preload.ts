import { contextBridge, ipcRenderer } from 'electron';
import { 
  IPC, 
  GetUserByIdReq,
  CreateUserReq,
  UpdateUserReq,
  DeleteUserReq,
  ReadFileReq,
  WriteFileReq,
  FileExistsReq,
  OpenFolderReq,
  ShowNotificationReq,
  CreateTaskReq,
  GetTaskStatusReq,
  CancelTaskReq,
  User,
  SystemInfo,
  Task,
  ApiResponse,
  FileProgressData,
  TaskProgressData
} from './common/ipc';

/**
 * 带超时的 invoke 封装
 */
async function invokeWithTimeout<T>(
  channel: string, 
  payload: unknown, 
  timeoutMs: number = 10000
): Promise<ApiResponse<T>> {
  return await Promise.race([
    ipcRenderer.invoke(channel, payload) as Promise<ApiResponse<T>>,
    new Promise<ApiResponse<T>>((_, reject) => 
      setTimeout(() => reject(new Error(`IPC timeout after ${timeoutMs}ms`)), timeoutMs)
    ),
  ]);
}

/**
 * 安全的事件监听器管理
 */
function createEventListener<T>(
  channel: string,
  callback: (data: T) => void
): () => void {
  const listener = (_event: any, data: T) => callback(data);
  ipcRenderer.on(channel, listener);
  
  // 返回卸载函数
  return () => {
    ipcRenderer.removeListener(channel, listener);
  };
}

/**
 * 主 API 对象
 */
const api = {
  // 用户管理 API
  user: {
    /**
     * 根据 ID 获取用户
     */
    async getById(id: string): Promise<ApiResponse<User>> {
      return invokeWithTimeout(IPC.user.getById, { id } satisfies GetUserByIdReq);
    },

    /**
     * 获取所有用户
     */
    async getAll(): Promise<ApiResponse<User[]>> {
      return invokeWithTimeout(IPC.user.getAll, {});
    },

    /**
     * 创建新用户
     */
    async create(userData: CreateUserReq): Promise<ApiResponse<User>> {
      return invokeWithTimeout(IPC.user.create, userData);
    },

    /**
     * 更新用户信息
     */
    async update(userData: UpdateUserReq): Promise<ApiResponse<User>> {
      return invokeWithTimeout(IPC.user.update, userData);
    },

    /**
     * 删除用户
     */
    async delete(id: string): Promise<ApiResponse<{ success: boolean }>> {
      return invokeWithTimeout(IPC.user.delete, { id } satisfies DeleteUserReq);
    },

    /**
     * 监听用户创建事件
     */
    onCreated(callback: (user: User) => void): () => void {
      return createEventListener(IPC.user.onCreated, callback);
    },

    /**
     * 监听用户更新事件
     */
    onUpdated(callback: (user: User) => void): () => void {
      return createEventListener(IPC.user.onUpdated, callback);
    },

    /**
     * 监听用户删除事件
     */
    onDeleted(callback: (data: { id: string }) => void): () => void {
      return createEventListener(IPC.user.onDeleted, callback);
    },
  },

  // 文件操作 API
  file: {
    /**
     * 读取文件内容
     */
    async read(path: string, encoding?: 'utf8' | 'base64'): Promise<ApiResponse<string>> {
      return invokeWithTimeout(IPC.file.read, { path, encoding } satisfies ReadFileReq);
    },

    /**
     * 写入文件内容
     */
    async write(path: string, content: string, encoding?: 'utf8' | 'base64'): Promise<ApiResponse<{ success: boolean }>> {
      return invokeWithTimeout(IPC.file.write, { path, content, encoding } satisfies WriteFileReq);
    },

    /**
     * 检查文件是否存在
     */
    async exists(path: string): Promise<ApiResponse<boolean>> {
      return invokeWithTimeout(IPC.file.exists, { path } satisfies FileExistsReq);
    },

    /**
     * 删除文件
     */
    async delete(path: string): Promise<ApiResponse<{ success: boolean }>> {
      return invokeWithTimeout(IPC.file.delete, { path } satisfies FileExistsReq);
    },

    /**
     * 监听文件操作进度
     */
    onProgress(callback: (progress: FileProgressData) => void): () => void {
      return createEventListener(IPC.file.onProgress, callback);
    },
  },

  // 系统信息 API
  system: {
    /**
     * 获取系统信息
     */
    async getInfo(): Promise<ApiResponse<SystemInfo>> {
      return invokeWithTimeout(IPC.system.getInfo, {});
    },

    /**
     * 在文件管理器中打开文件夹
     */
    async openFolder(path: string): Promise<ApiResponse<{ success: boolean }>> {
      return invokeWithTimeout(IPC.system.openFolder, { path } satisfies OpenFolderReq);
    },

    /**
     * 显示系统通知
     */
    async showNotification(title: string, body: string, icon?: string): Promise<ApiResponse<{ success: boolean }>> {
      return invokeWithTimeout(IPC.system.showNotification, { title, body, icon } satisfies ShowNotificationReq);
    },

    /**
     * 获取应用路径信息
     */
    async getAppPaths(): Promise<ApiResponse<Record<string, string>>> {
      return invokeWithTimeout(IPC.system.getAppPaths, {});
    },
  },

  // 任务管理 API
  task: {
    /**
     * 创建新任务
     */
    async create(name: string, description?: string, data?: any): Promise<ApiResponse<Task>> {
      return invokeWithTimeout(IPC.task.create, { name, description, data } satisfies CreateTaskReq);
    },

    /**
     * 获取任务状态
     */
    async getStatus(id: string): Promise<ApiResponse<Task>> {
      return invokeWithTimeout(IPC.task.getStatus, { id } satisfies GetTaskStatusReq);
    },

    /**
     * 取消任务
     */
    async cancel(id: string): Promise<ApiResponse<{ success: boolean }>> {
      return invokeWithTimeout(IPC.task.cancel, { id } satisfies CancelTaskReq);
    },

    /**
     * 监听任务进度更新
     */
    onProgress(callback: (progress: TaskProgressData) => void): () => void {
      return createEventListener(IPC.task.onProgress, callback);
    },

    /**
     * 监听任务完成事件
     */
    onComplete(callback: (task: Task) => void): () => void {
      return createEventListener(IPC.task.onComplete, callback);
    },
  },

  // 开发工具
  dev: {
    /**
     * 打开开发者工具
     */
    openDevTools(): void {
      ipcRenderer.send('dev:openDevTools');
    },

    /**
     * 重新加载窗口
     */
    reload(): void {
      ipcRenderer.send('dev:reload');
    },
  },
} as const;

// 暴露安全的 API 到渲染进程
contextBridge.exposeInMainWorld('electronAPI', api);

// TypeScript 类型声明
declare global {
  interface Window {
    electronAPI: typeof api;
  }
}
