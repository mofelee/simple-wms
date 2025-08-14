import { autoUpdater } from 'electron-updater';
import { app, BrowserWindow, dialog, webContents } from 'electron';
import { IPC, UpdateInfo, UpdateProgressData, UpdateError } from '@/common/ipc';

export class UpdaterService {
  private mainWindow: BrowserWindow | null = null;
  private updateDownloaded = false;

  constructor() {
    this.initializeUpdater();
    this.setupEventListeners();
  }

  /**
   * 广播事件到所有渲染进程
   */
  private broadcastEvent<T>(channel: string, data: T): void {
    for (const wc of webContents.getAllWebContents()) {
      if (!wc.isDestroyed()) {
        wc.send(channel, data);
      }
    }
  }

  private initializeUpdater() {
    // electron-updater 会自动读取 app-update.yml 配置文件
    // 该文件已包含在应用的 resources 目录中
    
    // 配置更新选项
    autoUpdater.autoDownload = false; // 手动控制下载
    autoUpdater.autoInstallOnAppQuit = true;
    
    // 设置更新检查的详细日志
    autoUpdater.logger = console;
  }

  private setupEventListeners() {
    // 检查更新可用
    autoUpdater.on('update-available', (info: any) => {
      console.log('🔄 发现新版本:', info.version);
      
      // 广播更新可用事件
      this.broadcastEvent(IPC.updater.onUpdateAvailable, {
        version: info.version,
        releaseDate: info.releaseDate,
        releaseNotes: info.releaseNotes,
        releaseName: info.releaseName,
        releaseNotesFile: info.releaseNotesFile,
      } as UpdateInfo);
      
      this.showUpdateAvailableDialog(info);
    });

    // 没有可用更新
    autoUpdater.on('update-not-available', (info: any) => {
      console.log('✅ 当前版本已是最新:', info.version);
      
      // 广播无更新事件
      this.broadcastEvent(IPC.updater.onUpdateNotAvailable, {
        version: info.version,
      } as UpdateInfo);
    });

    // 更新下载进度
    autoUpdater.on('download-progress', (progressObj: any) => {
      let log_message = '下载速度: ' + progressObj.bytesPerSecond;
      log_message = log_message + ' - 已下载 ' + progressObj.percent + '%';
      log_message = log_message + ' (' + progressObj.transferred + '/' + progressObj.total + ')';
      console.log(log_message);
      
      // 广播下载进度事件
      this.broadcastEvent(IPC.updater.onDownloadProgress, {
        bytesPerSecond: progressObj.bytesPerSecond,
        percent: progressObj.percent,
        transferred: progressObj.transferred,
        total: progressObj.total,
      } as UpdateProgressData);
    });

    // 更新下载完成
    autoUpdater.on('update-downloaded', (info: any) => {
      console.log('✅ 更新下载完成:', info.version);
      this.updateDownloaded = true;
      
      // 广播更新下载完成事件
      this.broadcastEvent(IPC.updater.onUpdateDownloaded, {
        version: info.version,
        releaseDate: info.releaseDate,
        releaseNotes: info.releaseNotes,
        releaseName: info.releaseName,
        releaseNotesFile: info.releaseNotesFile,
      } as UpdateInfo);
      
      this.showUpdateDownloadedDialog(info);
    });

    // 更新错误
    autoUpdater.on('error', (error: any) => {
      console.error('❌ 更新错误:', error);
      
      // 广播更新错误事件
      this.broadcastEvent(IPC.updater.onUpdateError, {
        message: error.message,
        stack: error.stack,
      } as UpdateError);
    });
  }

  private async showUpdateAvailableDialog(info: any) {
    if (!this.mainWindow) return;

    const result = await dialog.showMessageBox(this.mainWindow, {
      type: 'info',
      title: '发现新版本',
      message: `发现新版本 v${info.version}`,
      detail: `当前版本: v${app.getVersion()}\n新版本: v${info.version}\n\n是否现在下载更新？`,
      buttons: ['现在下载', '稍后提醒', '跳过此版本'],
      defaultId: 0,
      cancelId: 1,
    });

    switch (result.response) {
      case 0: // 现在下载
        this.downloadUpdate();
        break;
      case 1: // 稍后提醒
        // 1小时后再次检查
        setTimeout(() => {
          this.checkForUpdates();
        }, 60 * 60 * 1000);
        break;
      case 2: // 跳过此版本
        // 记录跳过的版本（可以存储到本地配置）
        console.log(`跳过版本: ${info.version}`);
        break;
    }
  }

  private async showUpdateDownloadedDialog(info: any) {
    if (!this.mainWindow) return;

    const result = await dialog.showMessageBox(this.mainWindow, {
      type: 'info',
      title: '更新就绪',
      message: `新版本 v${info.version} 已下载完成`,
      detail: '应用需要重启以完成更新。是否现在重启？',
      buttons: ['现在重启', '稍后重启'],
      defaultId: 0,
      cancelId: 1,
    });

    if (result.response === 0) {
      this.quitAndInstall();
    } else {
      // 用户选择稍后重启，在应用退出时自动安装
      console.log('用户选择稍后重启，将在下次启动时安装更新');
    }
  }

  /**
   * 检查更新
   */
  public async checkForUpdates() {
    try {
      console.log('🔍 检查更新...');
      const result = await autoUpdater.checkForUpdates();
      console.log('更新检查结果:', result);
      return result;
    } catch (error) {
      console.error('检查更新失败:', error);
      throw error;
    }
  }

  /**
   * 下载更新
   */
  public async downloadUpdate() {
    try {
      console.log('📥 开始下载更新...');
      await autoUpdater.downloadUpdate();
    } catch (error) {
      console.error('下载更新失败:', error);
      throw error;
    }
  }

  /**
   * 退出并安装更新
   */
  public quitAndInstall() {
    if (this.updateDownloaded) {
      console.log('🔄 退出并安装更新...');
      autoUpdater.quitAndInstall();
    } else {
      console.warn('没有已下载的更新可安装');
    }
  }

  /**
   * 设置主窗口引用
   */
  public setMainWindow(window: BrowserWindow) {
    this.mainWindow = window;
  }

  /**
   * 手动检查更新（用于菜单或按钮触发）
   */
  public async manualCheckForUpdates() {
    try {
      const result = await this.checkForUpdates();
      
      // 如果没有找到更新，显示提示
      if (!result?.updateInfo) {
        if (this.mainWindow) {
          dialog.showMessageBox(this.mainWindow, {
            type: 'info',
            title: '检查更新',
            message: '您使用的已是最新版本',
            detail: `当前版本: v${app.getVersion()}`,
            buttons: ['确定'],
          });
        }
      }
      
      return result;
    } catch (error) {
      if (this.mainWindow) {
        dialog.showMessageBox(this.mainWindow, {
          type: 'error',
          title: '检查更新失败',
          message: '无法检查更新',
          detail: error instanceof Error ? error.message : String(error),
          buttons: ['确定'],
        });
      }
      throw error;
    }
  }
}

// 单例实例
export const updaterService = new UpdaterService();
