import { BrowserWindow, app } from 'electron';
import path from 'path';
import { OpenWindowReq, CloseWindowReq, FocusWindowReq } from '@/common/ipc';

// 窗口管理
const openWindows = new Map<string, BrowserWindow>();

declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string;
declare const MAIN_WINDOW_VITE_NAME: string;

export const windowService = {
  /**
   * 打开新窗口
   */
  async openWindow(req: OpenWindowReq): Promise<string> {
    const windowId = `window_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const options = {
      width: req.options?.width || 1000,
      height: req.options?.height || 700,
      modal: req.options?.modal || false,
      title: req.options?.title || 'Simple WMS',
      webPreferences: {
        preload: path.join(__dirname, '../preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false,
      },
      show: false, // 先不显示，等加载完成后再显示
    };

    const newWindow = new BrowserWindow(options);

    // 构建完整的 URL
    let fullUrl: string;
    if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
      // 开发环境
      fullUrl = `${MAIN_WINDOW_VITE_DEV_SERVER_URL}#${req.url}`;
    } else {
      // 生产环境
      fullUrl = `file://${path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`)}#${req.url}`;
    }

    // 加载 URL
    await newWindow.loadURL(fullUrl);

    // 页面加载完成后显示窗口
    newWindow.once('ready-to-show', () => {
      newWindow.show();
      if (req.options?.modal) {
        newWindow.focus();
      }
    });

    // 窗口关闭时清理
    newWindow.on('closed', () => {
      openWindows.delete(windowId);
    });

    // 在开发环境中打开 DevTools
    if (process.env.NODE_ENV === 'development') {
      newWindow.webContents.openDevTools();
    }

    // 存储窗口引用
    openWindows.set(windowId, newWindow);

    console.log(`\n=== 新窗口打开 ===`);
    console.log(`窗口ID: ${windowId}`);
    console.log(`URL: ${fullUrl}`);
    console.log(`尺寸: ${options.width}x${options.height}`);
    console.log(`模态窗口: ${options.modal ? '是' : '否'}`);
    console.log(`==================\n`);

    return windowId;
  },

  /**
   * 关闭窗口
   */
  async closeWindow(req: CloseWindowReq): Promise<boolean> {
    const window = openWindows.get(req.windowId);
    if (!window || window.isDestroyed()) {
      return false;
    }

    window.close();
    openWindows.delete(req.windowId);
    
    console.log(`\n=== 窗口关闭 ===`);
    console.log(`窗口ID: ${req.windowId}`);
    console.log(`===============\n`);

    return true;
  },

  /**
   * 聚焦窗口
   */
  async focusWindow(req: FocusWindowReq): Promise<boolean> {
    const window = openWindows.get(req.windowId);
    if (!window || window.isDestroyed()) {
      return false;
    }

    if (window.isMinimized()) {
      window.restore();
    }
    window.focus();

    console.log(`\n=== 窗口聚焦 ===`);
    console.log(`窗口ID: ${req.windowId}`);
    console.log(`===============\n`);

    return true;
  },

  /**
   * 获取所有打开的窗口
   */
  async getAllWindows(): Promise<string[]> {
    const validWindows: string[] = [];
    
    for (const [windowId, window] of openWindows.entries()) {
      if (!window.isDestroyed()) {
        validWindows.push(windowId);
      } else {
        // 清理已销毁的窗口引用
        openWindows.delete(windowId);
      }
    }

    return validWindows;
  },

  /**
   * 关闭所有子窗口
   */
  async closeAllWindows(): Promise<number> {
    let closedCount = 0;
    
    for (const [windowId, window] of openWindows.entries()) {
      if (!window.isDestroyed()) {
        window.close();
        closedCount++;
      }
      openWindows.delete(windowId);
    }

    console.log(`\n=== 关闭所有窗口 ===`);
    console.log(`关闭窗口数: ${closedCount}`);
    console.log(`==================\n`);

    return closedCount;
  },
};

// 应用退出时清理所有窗口
app.on('before-quit', () => {
  windowService.closeAllWindows();
});
