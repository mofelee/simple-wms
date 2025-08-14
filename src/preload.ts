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
  OpenWindowReq,
  CloseWindowReq,
  FocusWindowReq,
  User,
  SystemInfo,
  Task,
  ApiResponse,
  FileProgressData,
  TaskProgressData,
  PrinterConfig,
  SetPrinterConfigReq,
  StartHttpReq,
  StopHttpReq,
  TestPrintReq,
  PrinterStatus,
  ProductQueryConfig,
  SetProductQueryConfigReq,
  SelectCsvFileReq,
  CheckCsvFileReq,
  CheckForUpdatesReq,
  DownloadUpdateReq,
  QuitAndInstallReq,
  UpdateInfo,
  UpdateProgressData,
  UpdateError
} from '@/common/ipc';

// 调试信息：确认 preload 脚本正在执行
console.log('🔧 Preload script loaded successfully');
console.log('📦 Available IPC channels:', Object.values(IPC).flatMap(group => Object.values(group)));

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

  // 窗口管理 API
  window: {
    /**
     * 打开新窗口
     */
    async open(req: OpenWindowReq): Promise<ApiResponse<string>> {
      return invokeWithTimeout(IPC.window.open, req);
    },

    /**
     * 关闭窗口
     */
    async close(req: CloseWindowReq): Promise<ApiResponse<boolean>> {
      return invokeWithTimeout(IPC.window.close, req);
    },

    /**
     * 聚焦窗口
     */
    async focus(req: FocusWindowReq): Promise<ApiResponse<boolean>> {
      return invokeWithTimeout(IPC.window.focus, req);
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

    /**
     * 在新窗口中打开页面 (便捷方法)
     */
    async openWindow(url: string, options?: { width?: number; height?: number; title?: string; modal?: boolean }): Promise<ApiResponse<string>> {
      return invokeWithTimeout(IPC.window.open, { url, options });
    },
  },

  // 打印机/HTTP 打印服务 API
  printer: {
    /**
     * 获取打印机配置
     */
    async getConfig(): Promise<ApiResponse<PrinterConfig>> {
      return invokeWithTimeout(IPC.printer.getConfig, {});
    },

    /**
     * 设置打印机配置
     */
    async setConfig(config: SetPrinterConfigReq): Promise<ApiResponse<PrinterConfig>> {
      return invokeWithTimeout(IPC.printer.setConfig, config);
    },

    /**
     * 启动 HTTP 服务
     */
    async startHttp(port?: number): Promise<ApiResponse<PrinterStatus>> {
      return invokeWithTimeout(IPC.printer.startHttp, { port } satisfies StartHttpReq);
    },

    /**
     * 停止 HTTP 服务
     */
    async stopHttp(): Promise<ApiResponse<PrinterStatus>> {
      return invokeWithTimeout(IPC.printer.stopHttp, {} satisfies StopHttpReq);
    },

    /**
     * 获取打印机状态
     */
    async getStatus(): Promise<ApiResponse<PrinterStatus>> {
      return invokeWithTimeout(IPC.printer.getStatus, {});
    },

    /**
     * 测试打印
     */
    async testPrint(data: string, description?: string): Promise<ApiResponse<{ success: boolean }>> {
      return invokeWithTimeout(IPC.printer.testPrint, { data, description } satisfies TestPrintReq);
    },
  },

  // 产品查询配置 API
  productQuery: {
    /**
     * 获取产品查询配置
     */
    async getConfig(): Promise<ApiResponse<ProductQueryConfig>> {
      return invokeWithTimeout(IPC.productQuery.getConfig, {});
    },

    /**
     * 设置产品查询配置
     */
    async setConfig(config: SetProductQueryConfigReq): Promise<ApiResponse<ProductQueryConfig>> {
      return invokeWithTimeout(IPC.productQuery.setConfig, config);
    },

    /**
     * 选择CSV文件
     */
    async selectCsvFile(): Promise<ApiResponse<string>> {
      return invokeWithTimeout(IPC.productQuery.selectCsvFile, {} satisfies SelectCsvFileReq);
    },

    /**
     * 检查CSV文件是否存在
     */
    async checkCsvFile(req: CheckCsvFileReq): Promise<ApiResponse<boolean>> {
      return invokeWithTimeout(IPC.productQuery.checkCsvFile, req);
    },

    /**
     * 重新选择CSV文件（清除旧权限）
     */
    async reselectCsvFile(oldFilePath?: string): Promise<ApiResponse<string>> {
      return invokeWithTimeout(IPC.productQuery.reselectCsvFile, { oldFilePath });
    },

    /**
     * 清除文件访问权限
     */
    async clearFileAccess(filePath: string): Promise<ApiResponse<{ success: boolean }>> {
      return invokeWithTimeout(IPC.productQuery.clearFileAccess, { filePath });
    },
  },

  // 自动更新 API
  updater: {
    /**
     * 检查更新
     */
    async checkForUpdates(): Promise<ApiResponse<any>> {
      return invokeWithTimeout(IPC.updater.checkForUpdates, {} satisfies CheckForUpdatesReq);
    },

    /**
     * 下载更新
     */
    async downloadUpdate(): Promise<ApiResponse<{ success: boolean }>> {
      return invokeWithTimeout(IPC.updater.downloadUpdate, {} satisfies DownloadUpdateReq);
    },

    /**
     * 退出并安装更新
     */
    async quitAndInstall(): Promise<ApiResponse<{ success: boolean }>> {
      return invokeWithTimeout(IPC.updater.quitAndInstall, {} satisfies QuitAndInstallReq);
    },

    /**
     * 监听更新可用事件
     */
    onUpdateAvailable(callback: (info: UpdateInfo) => void): () => void {
      return createEventListener(IPC.updater.onUpdateAvailable, callback);
    },

    /**
     * 监听更新下载完成事件
     */
    onUpdateDownloaded(callback: (info: UpdateInfo) => void): () => void {
      return createEventListener(IPC.updater.onUpdateDownloaded, callback);
    },

    /**
     * 监听下载进度事件
     */
    onDownloadProgress(callback: (progress: UpdateProgressData) => void): () => void {
      return createEventListener(IPC.updater.onDownloadProgress, callback);
    },

    /**
     * 监听更新错误事件
     */
    onUpdateError(callback: (error: UpdateError) => void): () => void {
      return createEventListener(IPC.updater.onUpdateError, callback);
    },

    /**
     * 监听无更新事件
     */
    onUpdateNotAvailable(callback: (info: UpdateInfo) => void): () => void {
      return createEventListener(IPC.updater.onUpdateNotAvailable, callback);
    },
  },

  // 通用事件监听器
  on<T>(channel: string, callback: (data: T) => void): () => void {
    return createEventListener(channel, callback);
  },

  off(channel: string, callback: (data: any) => void): void {
    ipcRenderer.removeListener(channel, callback);
  },
} as const;

// 暴露安全的 API 到渲染进程
contextBridge.exposeInMainWorld('electronAPI', api);

// 调试信息：确认 API 已暴露
console.log('✅ electronAPI exposed to main world with the following methods:');
console.log('  - user:', Object.keys(api.user));
console.log('  - file:', Object.keys(api.file));
console.log('  - system:', Object.keys(api.system));
console.log('  - task:', Object.keys(api.task));
console.log('  - window:', Object.keys(api.window));
console.log('  - dev:', Object.keys(api.dev));
console.log('  - printer:', Object.keys(api.printer));
console.log('  - productQuery:', Object.keys(api.productQuery));
console.log('  - updater:', Object.keys(api.updater));
console.log('  - on, off: Event management');

// TypeScript 类型声明
declare global {
  interface Window {
    electronAPI: typeof api;
  }
}
