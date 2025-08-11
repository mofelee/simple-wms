// 统一通道 & 类型定义
export const IPC = {
  // 用户管理
  user: {
    getById: 'user:getById',
    getAll: 'user:getAll',
    create: 'user:create',
    update: 'user:update',
    delete: 'user:delete',
    onCreated: 'user:onCreated',
    onUpdated: 'user:onUpdated',
    onDeleted: 'user:onDeleted',
  },
  // 文件操作
  file: {
    read: 'file:read',
    write: 'file:write',
    delete: 'file:delete',
    exists: 'file:exists',
    onProgress: 'file:onProgress',
  },
  // 系统信息
  system: {
    getInfo: 'system:getInfo',
    openFolder: 'system:openFolder',
    showNotification: 'system:showNotification',
    getAppPaths: 'system:getAppPaths',
  },
  // 任务管理
  task: {
    create: 'task:create',
    getStatus: 'task:getStatus',
    cancel: 'task:cancel',
    onProgress: 'task:onProgress',
    onComplete: 'task:onComplete',
  },
  // 窗口管理
  window: {
    open: 'window:open',
    close: 'window:close',
    focus: 'window:focus',
  },
  // 打印机/HTTP 打印服务
  printer: {
    getConfig: 'printer:getConfig',
    setConfig: 'printer:setConfig',
    startHttp: 'printer:startHttp',
    stopHttp: 'printer:stopHttp',
    testPrint: 'printer:testPrint',
    getStatus: 'printer:getStatus',
  },
} as const;

// 用户相关类型
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  createdAt: Date;
  updatedAt: Date;
}

export interface GetUserByIdReq {
  id: string;
}

export interface CreateUserReq {
  name: string;
  email: string;
  role: 'admin' | 'user';
}

export interface UpdateUserReq {
  id: string;
  name?: string;
  email?: string;
  role?: 'admin' | 'user';
}

export interface DeleteUserReq {
  id: string;
}

// 文件操作类型
export interface ReadFileReq {
  path: string;
  encoding?: 'utf8' | 'base64';
}

export interface WriteFileReq {
  path: string;
  content: string;
  encoding?: 'utf8' | 'base64';
}

export interface FileExistsReq {
  path: string;
}

export interface FileProgressData {
  taskId: string;
  progress: number;
  total: number;
  status: 'reading' | 'writing' | 'complete' | 'error';
}

// 系统信息类型
export interface SystemInfo {
  platform: string;
  arch: string;
  version: string;
  totalMemory: number;
  freeMemory: number;
  cpuCount: number;
}

export interface OpenFolderReq {
  path: string;
}

export interface ShowNotificationReq {
  title: string;
  body: string;
  icon?: string;
}

// 任务管理类型
export interface CreateTaskReq {
  name: string;
  description?: string;
  data?: any;
}

export interface Task {
  id: string;
  name: string;
  description?: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  result?: any;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface GetTaskStatusReq {
  id: string;
}

export interface CancelTaskReq {
  id: string;
}

export interface TaskProgressData {
  taskId: string;
  progress: number;
  status: string;
  message?: string;
}

// 窗口管理类型
export interface OpenWindowReq {
  url: string;
  options?: {
    width?: number;
    height?: number;
    title?: string;
    modal?: boolean;
  };
}

export interface CloseWindowReq {
  windowId: string;
}

export interface FocusWindowReq {
  windowId: string;
}

// 打印相关类型
export interface PrinterConfig {
  printerIp: string;
  printerPort: number; // 目标打印机端口，默认 9100
  httpPort: number;    // 本地 HTTP 服务端口，默认 18080
  enabled?: boolean;
}

export type SetPrinterConfigReq = Partial<PrinterConfig>

export interface StartHttpReq { port?: number }
export interface StopHttpReq {}
export interface TestPrintReq { 
  data: string; // base64 encoded ESC/POS binary data
  description?: string; // 可选的描述信息
}

export interface PrinterStatus {
  httpRunning: boolean;
  httpPort?: number;
  lastError?: string;
}

// API 响应包装类型
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: number;
}

// 所有 IPC 通道类型联合
export type IpcChannels = 
  | typeof IPC.user.getById
  | typeof IPC.user.getAll
  | typeof IPC.user.create
  | typeof IPC.user.update
  | typeof IPC.user.delete
  | typeof IPC.user.onCreated
  | typeof IPC.user.onUpdated
  | typeof IPC.user.onDeleted
  | typeof IPC.file.read
  | typeof IPC.file.write
  | typeof IPC.file.delete
  | typeof IPC.file.exists
  | typeof IPC.file.onProgress
  | typeof IPC.system.getInfo
  | typeof IPC.system.openFolder
  | typeof IPC.system.showNotification
  | typeof IPC.system.getAppPaths
  | typeof IPC.task.create
  | typeof IPC.task.getStatus
  | typeof IPC.task.cancel
  | typeof IPC.task.onProgress
  | typeof IPC.task.onComplete
  | typeof IPC.window.open
  | typeof IPC.window.close
  | typeof IPC.window.focus
  | typeof IPC.printer.getConfig
  | typeof IPC.printer.setConfig
  | typeof IPC.printer.startHttp
  | typeof IPC.printer.stopHttp
  | typeof IPC.printer.testPrint
  | typeof IPC.printer.getStatus;

// 工具类型：提取值类型
export type ExtractChannelValue<T> = T extends Record<string, infer U> ? U : never;
