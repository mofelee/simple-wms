import { app, shell, Notification } from 'electron';
import os from 'os';
import { SystemInfo, OpenFolderReq, ShowNotificationReq } from '../../common/ipc';

export const systemService = {
  /**
   * 获取系统信息
   */
  async getSystemInfo(): Promise<SystemInfo> {
    return {
      platform: process.platform,
      arch: process.arch,
      version: process.version,
      totalMemory: os.totalmem(),
      freeMemory: os.freemem(),
      cpuCount: os.cpus().length,
    };
  },

  /**
   * 在系统文件管理器中打开文件夹
   */
  async openFolder(req: OpenFolderReq): Promise<void> {
    try {
      const result = await shell.openPath(req.path);
      if (result) {
        throw new Error(`Failed to open folder: ${result}`);
      }
    } catch (error) {
      throw new Error(`Failed to open folder: ${error.message}`);
    }
  },

  /**
   * 显示系统通知
   */
  async showNotification(req: ShowNotificationReq): Promise<void> {
    try {
      const notification = new Notification({
        title: req.title,
        body: req.body,
        icon: req.icon,
      });
      
      notification.show();
    } catch (error) {
      throw new Error(`Failed to show notification: ${error.message}`);
    }
  },

  /**
   * 获取应用版本信息
   */
  async getAppVersion(): Promise<string> {
    return app.getVersion();
  },

  /**
   * 获取应用路径信息
   */
  async getAppPaths(): Promise<Record<string, string>> {
    const paths = {
      userData: app.getPath('userData'),
      documents: app.getPath('documents'),
      downloads: app.getPath('downloads'),
      desktop: app.getPath('desktop'),
      temp: app.getPath('temp'),
      exe: app.getPath('exe'),
      logs: app.getPath('logs'),
    };
    
    // 同时在控制台打印路径信息
    console.log('\n=== 应用路径查询 ===');
    Object.entries(paths).forEach(([key, value]) => {
      console.log(`${key}:`, value);
    });
    console.log('==================\n');
    
    return paths;
  },
};
