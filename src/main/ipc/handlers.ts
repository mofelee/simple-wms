import { ipcMain, webContents, dialog, app, systemPreferences } from 'electron';
import { z } from 'zod';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
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

import { userService } from '@/main/services/user';
import { fileService } from '@/main/services/file';
import { systemService } from '@/main/services/system';
import { taskService } from '@/main/services/task';
import { windowService } from '@/main/services/window';
import { printerService } from '@/main/services/printer';
import { updaterService } from '@/main/services/updater';

// Zod 验证 schemas
const GetUserByIdSchema = z.object({
  id: z.string().min(1, 'User ID is required'),
});

const CreateUserSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Valid email is required'),
  role: z.enum(['admin', 'user']),
});

const UpdateUserSchema = z.object({
  id: z.string().min(1, 'User ID is required'),
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  role: z.enum(['admin', 'user']).optional(),
});

const DeleteUserSchema = z.object({
  id: z.string().min(1, 'User ID is required'),
});

const ReadFileSchema = z.object({
  path: z.string().min(1, 'File path is required'),
  encoding: z.enum(['utf8', 'base64']).optional(),
});

const WriteFileSchema = z.object({
  path: z.string().min(1, 'File path is required'),
  content: z.string(),
  encoding: z.enum(['utf8', 'base64']).optional(),
});

const FileExistsSchema = z.object({
  path: z.string().min(1, 'File path is required'),
});

const OpenFolderSchema = z.object({
  path: z.string().min(1, 'Folder path is required'),
});

const ShowNotificationSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  body: z.string().min(1, 'Body is required'),
  icon: z.string().optional(),
});

const CreateTaskSchema = z.object({
  name: z.string().min(1, 'Task name is required'),
  description: z.string().optional(),
  data: z.any().optional(),
});

const GetTaskStatusSchema = z.object({
  id: z.string().min(1, 'Task ID is required'),
});

const CancelTaskSchema = z.object({
  id: z.string().min(1, 'Task ID is required'),
});

// 窗口管理 schemas
const OpenWindowSchema = z.object({
  url: z.string().min(1, 'URL is required'),
  options: z.object({
    width: z.number().optional(),
    height: z.number().optional(),
    title: z.string().optional(),
    modal: z.boolean().optional(),
  }).optional(),
});

const CloseWindowSchema = z.object({
  windowId: z.string().min(1, 'Window ID is required'),
});

const FocusWindowSchema = z.object({
  windowId: z.string().min(1, 'Window ID is required'),
});

// 产品查询配置 schemas
const ProductQueryConfigSchema = z.object({
  csvFilePath: z.string().min(1, 'CSV file path is required'),
  retailUnitName: z.string().min(1, 'Retail unit name is required'),
  businessAddress: z.string().min(1, 'Business address is required'),
  phoneNumber: z.string().min(1, 'Phone number is required'),
});

const CheckCsvFileSchema = z.object({
  filePath: z.string().min(1, 'File path is required'),
});

/**
 * 包装 API 响应
 */
function createResponse<T>(data?: T, error?: string): ApiResponse<T> {
  return {
    success: !error,
    data,
    error,
    timestamp: Date.now(),
  };
}

/**
 * 安全的 IPC 处理器包装器
 */
function safeHandler<TReq, TRes>(
  schema: z.ZodSchema<TReq>,
  handler: (payload: TReq) => Promise<TRes>
) {
  return async (_event: any, payload: unknown): Promise<ApiResponse<TRes>> => {
    try {
      const validatedPayload = schema.parse(payload);
      const result = await handler(validatedPayload);
      return createResponse(result);
    } catch (error) {
      console.error('IPC Handler Error:', error);
      
      if (error instanceof z.ZodError) {
        return createResponse<TRes>(undefined, `Validation error: ${error.issues.map(i => i.message).join(', ')}`);
      }
      
      return createResponse<TRes>(undefined, (error as Error).message || 'Unknown error occurred');
    }
  };
}

/**
 * 广播事件到所有渲染进程
 */
function broadcastEvent<T>(channel: string, data: T): void {
  for (const wc of webContents.getAllWebContents()) {
    if (!wc.isDestroyed()) {
      wc.send(channel, data);
    }
  }
}

/**
 * 产品查询配置服务
 */
class ProductQueryService {
  private configFilePath: string;
  private activeBookmarks: Map<string, string> = new Map(); // 存储活跃的书签
  private accessStoppers: Map<string, () => void> = new Map(); // 存储访问停止器

  constructor() {
    const userDataPath = app.getPath('userData');
    const configDir = path.join(userDataPath, 'product-query');
    this.configFilePath = path.join(configDir, 'config.json');
    
    // 确保配置目录存在
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
  }

  /**
   * 清理所有活跃的安全范围访问
   */
  public cleanupSecurityScopedAccess(): void {
    for (const [filePath, stopAccess] of this.accessStoppers.entries()) {
      console.log(`🧹 Cleaning up security scoped access for: ${filePath}`);
      try {
        stopAccess();
      } catch (error) {
        console.warn(`Failed to stop security scoped access for ${filePath}:`, error);
      }
    }
    this.accessStoppers.clear();
    this.activeBookmarks.clear();
  }

  /**
   * 检查和申请macOS文件访问权限
   */
  private async checkMacOSFileAccess(filePath: string): Promise<{ hasAccess: boolean; error?: string }> {
    try {
      if (os.platform() !== 'darwin') {
        return { hasAccess: true }; // 非macOS系统跳过权限检查
      }

      console.log('🍎 Checking macOS file access for:', filePath);

      const resolvedPath = path.resolve(filePath);
      const dirname = path.dirname(resolvedPath);
      
      // 检查是否为受保护的目录
      const protectedDirs = [
        path.join(os.homedir(), 'Downloads'),
        path.join(os.homedir(), 'Documents'),
        path.join(os.homedir(), 'Desktop'),
        path.join(os.homedir(), 'Pictures'),
        path.join(os.homedir(), 'Movies'),
        path.join(os.homedir(), 'Music'),
      ];

      const isProtectedPath = protectedDirs.some(protectedDir => 
        dirname.startsWith(protectedDir) || resolvedPath.startsWith(protectedDir)
      );

      if (!isProtectedPath) {
        console.log('✅ Path is not in protected directory, no permission needed');
        return { hasAccess: true };
      }

      console.log('⚠️  Path is in protected directory, checking permissions...');

      // 检查是否已有权限
      try {
        await fs.promises.access(dirname, fs.constants.R_OK);
        console.log('✅ Already have access to directory');
        return { hasAccess: true };
      } catch (error) {
        console.log('❌ No access to directory, requesting permission...');
      }

      // 尝试申请权限
      try {
        // 通过打开文件对话框来申请权限（这是一个workaround）
        const result = await dialog.showOpenDialog({
          title: '需要文件访问权限',
          message: `应用需要访问 ${dirname} 目录的权限来读取CSV文件。请选择目标文件或取消。`,
          defaultPath: dirname,
          properties: ['openFile', 'createDirectory'],
          filters: [
            { name: 'CSV文件', extensions: ['csv'] },
            { name: '所有文件', extensions: ['*'] }
          ]
        });

        if (result.canceled) {
          return { 
            hasAccess: false, 
            error: '用户取消了权限申请，无法访问文件' 
          };
        }

        // 再次检查权限
        try {
          await fs.promises.access(dirname, fs.constants.R_OK);
          console.log('✅ Permission granted successfully');
          return { hasAccess: true };
        } catch (error) {
          return { 
            hasAccess: false, 
            error: '权限申请失败，请在系统偏好设置中手动授权应用访问文件' 
          };
        }

      } catch (error) {
        console.error('Permission dialog error:', error);
        return { 
          hasAccess: false, 
          error: `权限申请过程中出现错误: ${error instanceof Error ? error.message : '未知错误'}` 
        };
      }

    } catch (error) {
      console.error('Permission check failed:', error);
      return { 
        hasAccess: false, 
        error: `权限检查失败: ${error instanceof Error ? error.message : '未知错误'}` 
      };
    }
  }

  /**
   * 获取配置
   */
  async getConfig(): Promise<ProductQueryConfig> {
    try {
      if (fs.existsSync(this.configFilePath)) {
        const configData = fs.readFileSync(this.configFilePath, 'utf8');
        const config = JSON.parse(configData) as ProductQueryConfig;
        return config;
      }
    } catch (error) {
      console.error('Failed to load product query config:', error);
    }
    
    // 返回默认配置
    return {
      csvFilePath: '',
      retailUnitName: '',
      businessAddress: '',
      phoneNumber: ''
    };
  }

  /**
   * 保存配置
   */
  async setConfig(config: ProductQueryConfig): Promise<ProductQueryConfig> {
    try {
      const configData = JSON.stringify(config, null, 2);
      fs.writeFileSync(this.configFilePath, configData, 'utf8');
      return config;
    } catch (error) {
      console.error('Failed to save product query config:', error);
      throw new Error('Failed to save configuration');
    }
  }

  /**
   * 选择CSV文件（支持macOS安全范围书签）
   */
  async selectCsvFile(): Promise<string> {
    try {
      console.log('🔍 Opening file selection dialog...');
      
      const dialogOptions: any = {
        title: '选择CSV产品数据文件',
        defaultPath: app.getPath('downloads'), // 从Downloads开始更常见
        filters: [
          { name: 'CSV文件', extensions: ['csv'] },
          { name: '所有文件', extensions: ['*'] }
        ],
        properties: ['openFile'],
        message: '请选择包含产品数据的CSV文件。选择文件后，应用将获得访问该文件的权限。'
      };

      // 在macOS上启用安全范围书签
      if (os.platform() === 'darwin') {
        dialogOptions.securityScopedBookmarks = true;
        console.log('🍎 Enabling securityScopedBookmarks for macOS');
      }

      const result = await dialog.showOpenDialog(dialogOptions);

      if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
        console.log('❌ User canceled file selection');
        throw new Error('用户取消了文件选择');
      }

      const filePath = result.filePaths[0];
      console.log('✅ File selected:', filePath);

      // 在macOS上处理安全范围书签
      if (os.platform() === 'darwin' && result.bookmarks && result.bookmarks.length > 0) {
        const bookmark = result.bookmarks[0];
        console.log('🔖 Storing security scoped bookmark for:', filePath);
        
        // 存储书签以供后续访问使用
        this.activeBookmarks.set(filePath, bookmark);
        
        // 立即开始访问以测试权限
        try {
          const stopAccess = app.startAccessingSecurityScopedResource(bookmark) as () => void;
          this.accessStoppers.set(filePath, stopAccess);
          
          // 测试文件访问
          await fs.promises.access(filePath, fs.constants.R_OK);
          console.log('✅ Security scoped resource access established successfully');
          
        } catch (error) {
          console.error('❌ Failed to establish security scoped access:', error);
          throw new Error('无法建立文件访问权限，请重试');
        }
      }

      return filePath;
    } catch (error) {
      console.error('Failed to select CSV file:', error);
      throw error;
    }
  }

  /**
   * 检查CSV文件是否存在和可访问（支持安全范围书签）
   */
  async checkCsvFile(filePath: string): Promise<boolean> {
    console.log('🔍 Checking CSV file access:', filePath);
    
    try {
      // 如果是macOS并且有安全范围书签，使用书签访问
      if (os.platform() === 'darwin' && this.activeBookmarks.has(filePath)) {
        console.log('🔖 Using stored security scoped bookmark for macOS');
        return await this.checkFileWithSecurityScope(filePath);
      }

      // 对于非macOS或没有书签的情况，使用传统方法
      return await this.checkFileTraditional(filePath);
      
    } catch (error) {
      console.error('❌ CSV file check failed:', error);
      throw error;
    }
  }

  /**
   * 使用安全范围书签检查文件
   */
  private async checkFileWithSecurityScope(filePath: string): Promise<boolean> {
    const bookmark = this.activeBookmarks.get(filePath);
    if (!bookmark) {
      throw new Error('安全范围书签不存在，请重新选择文件');
    }

    // 如果已经有活跃的访问权限，直接检查文件
    if (this.accessStoppers.has(filePath)) {
      return await this.performFileCheck(filePath);
    }

    // 开始新的安全范围访问
    try {
      const stopAccess = app.startAccessingSecurityScopedResource(bookmark) as () => void;
      this.accessStoppers.set(filePath, stopAccess);
      
      const result = await this.performFileCheck(filePath);
      console.log('✅ Security scoped file access successful');
      return result;
      
    } catch (error) {
      // 清理失败的访问
      if (this.accessStoppers.has(filePath)) {
        this.accessStoppers.get(filePath)?.();
        this.accessStoppers.delete(filePath);
      }
      throw error;
    }
  }

  /**
   * 传统方式检查文件（非macOS或非沙箱环境）
   */
  private async checkFileTraditional(filePath: string): Promise<boolean> {
    console.log('🔍 Using traditional file access method');
    
    // 检查macOS权限（如果需要）
    if (os.platform() === 'darwin') {
      const permissionCheck = await this.checkMacOSFileAccess(filePath);
      if (!permissionCheck.hasAccess) {
        console.error('❌ Permission denied:', permissionCheck.error);
        throw new Error(permissionCheck.error || 'No file access permission');
      }
    }

    return await this.performFileCheck(filePath);
  }

  /**
   * 执行实际的文件检查
   */
  private async performFileCheck(filePath: string): Promise<boolean> {
    // 检查文件是否存在
    if (!fs.existsSync(filePath)) {
      throw new Error(`文件不存在: ${filePath}`);
    }

    // 检查是否为文件
    const stat = fs.statSync(filePath);
    if (!stat.isFile()) {
      throw new Error(`路径不是文件: ${filePath}`);
    }

    // 检查文件权限
    try {
      await fs.promises.access(filePath, fs.constants.R_OK | fs.constants.W_OK);
      console.log('✅ File check passed - readable and writable');
      return true;
    } catch (error) {
      console.error('❌ Cannot access file:', error);
      throw new Error(`无法访问文件，请检查文件权限: ${filePath}`);
    }
  }

  /**
   * 重新选择CSV文件（清除旧权限并选择新文件）
   */
  async reselectCsvFile(oldFilePath?: string): Promise<string> {
    console.log('🔄 Reselecting CSV file...');
    
    // 如果提供了旧文件路径，清理其权限
    if (oldFilePath && this.accessStoppers.has(oldFilePath)) {
      console.log('🧹 Cleaning up old file access for:', oldFilePath);
      this.accessStoppers.get(oldFilePath)?.();
      this.accessStoppers.delete(oldFilePath);
      this.activeBookmarks.delete(oldFilePath);
    }

    // 重新选择文件
    return await this.selectCsvFile();
  }

  /**
   * 清除指定文件的访问权限
   */
  async clearFileAccess(filePath: string): Promise<void> {
    console.log('🧹 Clearing file access for:', filePath);
    
    if (this.accessStoppers.has(filePath)) {
      this.accessStoppers.get(filePath)?.();
      this.accessStoppers.delete(filePath);
    }
    
    if (this.activeBookmarks.has(filePath)) {
      this.activeBookmarks.delete(filePath);
    }
    
    console.log('✅ File access cleared successfully');
  }
}

// 创建产品查询服务实例
const productQueryService = new ProductQueryService();

/**
 * 注册所有 IPC 处理器
 */
export function registerIpcHandlers(): void {
  console.log('\n=== IPC 处理器注册 ===');
  console.log('正在注册 IPC 处理器...');
  
  // 打印所有可用的 IPC 通道
  const channels = Object.values(IPC).flatMap(group => Object.values(group));
  console.log(`共注册 ${channels.length} 个 IPC 通道:`);
  channels.forEach(channel => console.log(`  - ${channel}`));
  console.log('====================\n');

  // 初始化加载打印配置
  printerService.loadConfig().catch((e) => console.warn('Load printer config failed:', e));

  // 用户管理处理器
  ipcMain.handle(
    IPC.user.getById,
    safeHandler(GetUserByIdSchema, async (req: GetUserByIdReq) => {
      const user = await userService.getById(req.id);
      if (!user) {
        throw new Error('User not found');
      }
      return user;
    })
  );

  ipcMain.handle(
    IPC.user.getAll,
    safeHandler(z.object({}), async () => {
      return await userService.getAll();
    })
  );

  ipcMain.handle(
    IPC.user.create,
    safeHandler(CreateUserSchema, async (req: CreateUserReq) => {
      // 检查邮箱是否已存在
      const emailExists = await userService.emailExists(req.email);
      if (emailExists) {
        throw new Error('Email already exists');
      }
      
      const user = await userService.create(req);
      
      // 广播用户创建事件
      broadcastEvent(IPC.user.onCreated, user);
      
      return user;
    })
  );

  ipcMain.handle(
    IPC.user.update,
    safeHandler(UpdateUserSchema, async (req: UpdateUserReq) => {
      // 如果更新邮箱，检查是否已存在
      if (req.email) {
        const emailExists = await userService.emailExists(req.email, req.id);
        if (emailExists) {
          throw new Error('Email already exists');
        }
      }
      
      const user = await userService.update(req);
      if (!user) {
        throw new Error('User not found');
      }
      
      // 广播用户更新事件
      broadcastEvent(IPC.user.onUpdated, user);
      
      return user;
    })
  );

  ipcMain.handle(
    IPC.user.delete,
    safeHandler(DeleteUserSchema, async (req: DeleteUserReq) => {
      const success = await userService.delete(req.id);
      if (!success) {
        throw new Error('User not found');
      }
      
      // 广播用户删除事件
      broadcastEvent(IPC.user.onDeleted, { id: req.id });
      
      return { success: true };
    })
  );

  // 文件操作处理器
  ipcMain.handle(
    IPC.file.read,
    safeHandler(ReadFileSchema, async (req: ReadFileReq) => {
      return await fileService.readFile(req, (progress: FileProgressData) => {
        broadcastEvent(IPC.file.onProgress, progress);
      });
    })
  );

  ipcMain.handle(
    IPC.file.write,
    safeHandler(WriteFileSchema, async (req: WriteFileReq) => {
      await fileService.writeFile(req, (progress: FileProgressData) => {
        broadcastEvent(IPC.file.onProgress, progress);
      });
      return { success: true };
    })
  );

  ipcMain.handle(
    IPC.file.exists,
    safeHandler(FileExistsSchema, async (req: FileExistsReq) => {
      return await fileService.exists(req.path);
    })
  );

  ipcMain.handle(
    IPC.file.delete,
    safeHandler(FileExistsSchema, async (req: FileExistsReq) => {
      await fileService.deleteFile(req.path);
      return { success: true };
    })
  );

  // 系统信息处理器
  ipcMain.handle(
    IPC.system.getInfo,
    safeHandler(z.object({}), async () => {
      return await systemService.getSystemInfo();
    })
  );

  ipcMain.handle(
    IPC.system.openFolder,
    safeHandler(OpenFolderSchema, async (req: OpenFolderReq) => {
      await systemService.openFolder(req);
      return { success: true };
    })
  );

  ipcMain.handle(
    IPC.system.showNotification,
    safeHandler(ShowNotificationSchema, async (req: ShowNotificationReq) => {
      await systemService.showNotification(req);
      return { success: true };
    })
  );

  ipcMain.handle(
    IPC.system.getAppPaths,
    safeHandler(z.object({}), async () => {
      return await systemService.getAppPaths();
    })
  );

  // 打印/HTTP 服务处理器
  ipcMain.handle(
    IPC.printer.getConfig,
    safeHandler(z.object({}).optional().default({}), async () => {
      return printerService.getConfig();
    })
  );

  ipcMain.handle(
    IPC.printer.setConfig,
    safeHandler(z.object({
      printerIp: z.string().optional(),
      printerPort: z.number().int().positive().optional(),
      httpPort: z.number().int().positive().optional(),
      enabled: z.boolean().optional(),
    }).optional().default({}), async (req) => {
      return await printerService.saveConfig(req);
    })
  );

  ipcMain.handle(
    IPC.printer.startHttp,
    safeHandler(z.object({ port: z.number().int().positive().optional() }).optional().default({}), async (req: any) => {
      return await printerService.startHttp(req?.port);
    })
  );

  ipcMain.handle(
    IPC.printer.stopHttp,
    safeHandler(z.object({}).optional().default({}), async () => {
      return await printerService.stopHttp();
    })
  );

  ipcMain.handle(
    IPC.printer.testPrint,
    safeHandler(z.object({ 
      data: z.string().min(1),
      description: z.string().optional()
    }), async (req: { data: string; description?: string }) => {
      await printerService.testPrint(req.data, req.description);
      return { success: true } as any;
    })
  );

  ipcMain.handle(
    IPC.printer.getStatus,
    safeHandler(z.object({}).optional().default({}), async () => {
      return printerService.getStatus();
    })
  );

  // 任务管理处理器
  ipcMain.handle(
    IPC.task.create,
    safeHandler(CreateTaskSchema, async (req: CreateTaskReq) => {
      return await taskService.createTask(req, (progress: TaskProgressData) => {
        broadcastEvent(IPC.task.onProgress, progress);
        
        // 如果任务完成，发送完成事件
        if (progress.status === 'completed' || progress.status === 'failed' || progress.status === 'cancelled') {
          taskService.getTaskStatus(progress.taskId).then(task => {
            if (task) {
              broadcastEvent(IPC.task.onComplete, task);
            }
          });
        }
      });
    })
  );

  ipcMain.handle(
    IPC.task.getStatus,
    safeHandler(GetTaskStatusSchema, async (req: GetTaskStatusReq) => {
      const task = await taskService.getTaskStatus(req.id);
      if (!task) {
        throw new Error('Task not found');
      }
      return task;
    })
  );

  ipcMain.handle(
    IPC.task.cancel,
    safeHandler(CancelTaskSchema, async (req: CancelTaskReq) => {
      const success = await taskService.cancelTask(req.id);
      if (!success) {
        throw new Error('Task not found or cannot be cancelled');
      }
      return { success: true };
    })
  );

  // 窗口管理处理器
  ipcMain.handle(
    IPC.window.open,
    safeHandler(OpenWindowSchema, async (req: OpenWindowReq) => {
      return await windowService.openWindow(req);
    })
  );

  ipcMain.handle(
    IPC.window.close,
    safeHandler(CloseWindowSchema, async (req: CloseWindowReq) => {
      return await windowService.closeWindow(req);
    })
  );

  ipcMain.handle(
    IPC.window.focus,
    safeHandler(FocusWindowSchema, async (req: FocusWindowReq) => {
      return await windowService.focusWindow(req);
    })
  );

  // 产品查询配置处理器
  ipcMain.handle(
    IPC.productQuery.getConfig,
    safeHandler(z.object({}), async () => {
      return await productQueryService.getConfig();
    })
  );

  ipcMain.handle(
    IPC.productQuery.setConfig,
    safeHandler(ProductQueryConfigSchema, async (req: SetProductQueryConfigReq) => {
      return await productQueryService.setConfig(req);
    })
  );

  ipcMain.handle(
    IPC.productQuery.selectCsvFile,
    safeHandler(z.object({}), async () => {
      return await productQueryService.selectCsvFile();
    })
  );

  ipcMain.handle(
    IPC.productQuery.checkCsvFile,
    safeHandler(CheckCsvFileSchema, async (req: CheckCsvFileReq) => {
      try {
        const result = await productQueryService.checkCsvFile(req.filePath);
        return result;
      } catch (error) {
        // 返回详细的错误信息而不是简单的false
        console.error('CSV文件检查失败:', error);
        throw error;
      }
    })
  );

  ipcMain.handle(
    IPC.productQuery.reselectCsvFile,
    safeHandler(z.object({ oldFilePath: z.string().optional() }), async (req: { oldFilePath?: string }) => {
      return await productQueryService.reselectCsvFile(req.oldFilePath);
    })
  );

  ipcMain.handle(
    IPC.productQuery.clearFileAccess,
    safeHandler(z.object({ filePath: z.string().min(1) }), async (req: { filePath: string }) => {
      await productQueryService.clearFileAccess(req.filePath);
      return { success: true };
    })
  );

  // 自动更新处理器
  ipcMain.handle(
    IPC.updater.checkForUpdates,
    safeHandler(z.object({}), async () => {
      return await updaterService.manualCheckForUpdates();
    })
  );

  ipcMain.handle(
    IPC.updater.downloadUpdate,
    safeHandler(z.object({}), async () => {
      await updaterService.downloadUpdate();
      return { success: true };
    })
  );

  ipcMain.handle(
    IPC.updater.quitAndInstall,
    safeHandler(z.object({}), async () => {
      updaterService.quitAndInstall();
      return { success: true };
    })
  );

  console.log('✅ 所有 IPC 处理器注册完成！');
  
  // 注册应用清理事件
  app.on('before-quit', () => {
    console.log('🧹 Application is quitting, cleaning up security scoped access...');
    productQueryService.cleanupSecurityScopedAccess();
  });

  app.on('window-all-closed', () => {
    console.log('🧹 All windows closed, cleaning up security scoped access...');
    productQueryService.cleanupSecurityScopedAccess();
  });
}

/**
 * 清理 IPC 处理器
 */
export function unregisterIpcHandlers(): void {
  console.log('Unregistering IPC handlers...');
  
  // 移除所有处理器
  Object.values(IPC).forEach(group => {
    Object.values(group).forEach(channel => {
      ipcMain.removeAllListeners(channel);
    });
  });
  
  console.log('IPC handlers unregistered');
}
