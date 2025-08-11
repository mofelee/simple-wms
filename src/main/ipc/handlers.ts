import { ipcMain, webContents } from 'electron';
import { z } from 'zod';
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
  TaskProgressData
} from '@/common/ipc';

import { userService } from '@/main/services/user';
import { fileService } from '@/main/services/file';
import { systemService } from '@/main/services/system';
import { taskService } from '@/main/services/task';
import { windowService } from '@/main/services/window';
import { printerService } from '@/main/services/printer';

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

  console.log('✅ 所有 IPC 处理器注册完成！');
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
