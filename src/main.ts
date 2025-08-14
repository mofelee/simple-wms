import { app, BrowserWindow, shell, Menu } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';
import { registerIpcHandlers, unregisterIpcHandlers } from '@/main/ipc/handlers';
import { updaterService } from '@/main/services/updater';

// Vite dev server variables
declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string;
declare const MAIN_WINDOW_VITE_NAME: string;

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  // 隐藏 Windows 菜单栏（File/Edit/View/Window/Help）
  if (process.platform === 'win32') {
    Menu.setApplicationMenu(null);
    mainWindow.setMenuBarVisibility(false);
  }

  // 配置新窗口打开处理器
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    console.log('🔗 新窗口打开请求:', url);
    
    try {
      const urlObj = new URL(url);
      
      // 检查是否是内部路由（包含 hash 路由）
      const isInternal = urlObj.hash && urlObj.hash.startsWith('#/');
      
      if (!isInternal) {
        // 外部链接用系统浏览器打开
        console.log('🌐 外部链接，使用系统浏览器打开:', url);
        shell.openExternal(url);
        return { action: 'deny' };
      }
      
      // 内部路由允许打开并配置 preload 脚本
      console.log('🏠 内部路由，在新窗口中打开:', url);
      return {
        action: 'allow',
        overrideBrowserWindowOptions: {
          width: 1200,
          height: 800,
          webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false,
          }
        }
      };
    } catch (error) {
      console.error('❌ URL 解析失败:', error);
      // 解析失败时拒绝打开
      return { action: 'deny' };
    }
  });

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
  }

  // 设置更新服务的主窗口引用
  updaterService.setMainWindow(mainWindow);

  // Open the DevTools.
  //mainWindow.webContents.openDevTools();
  
  return mainWindow;
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', () => {
  // Print application paths
  console.log('\n=== 应用路径信息 ===');
  console.log('应用数据目录:', app.getPath('userData'));
  console.log('文档目录:', app.getPath('documents'));
  console.log('下载目录:', app.getPath('downloads'));
  console.log('桌面目录:', app.getPath('desktop'));
  console.log('临时目录:', app.getPath('temp'));
  console.log('应用程序目录:', app.getPath('exe'));
  console.log('日志目录:', app.getPath('logs'));
  console.log('==================\n');
  
  // Register IPC handlers before creating window
  registerIpcHandlers();
  const mainWindow = createWindow();
  
  // 在生产环境中启动更新检查（5秒延迟，让应用先完全加载）
  if (app.isPackaged) {
    setTimeout(() => {
      updaterService.checkForUpdates().catch((error) => {
        console.error('启动时检查更新失败:', error);
      });
    }, 5000);
  } else {
    console.log('开发环境，跳过更新检查');
  }
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  // Clean up IPC handlers
  unregisterIpcHandlers();
  
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
