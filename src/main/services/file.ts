import { promises as fs } from 'fs';
import path from 'path';
import { app } from 'electron';
import { ReadFileReq, WriteFileReq, FileProgressData } from '@/common/ipc';

export const fileService = {
  // 私有属性：标记是否已打印过路径信息
  _pathsLogged: false,
  /**
   * 读取文件内容
   */
  async readFile(req: ReadFileReq, onProgress?: (data: FileProgressData) => void): Promise<string> {
    const safePath = this.validatePath(req.path);
    const taskId = `read_${Date.now()}`;
    
    try {
      if (onProgress) {
        onProgress({
          taskId,
          progress: 0,
          total: 100,
          status: 'reading',
        });
      }

      // 检查文件是否存在
      await fs.access(safePath);
      
      if (onProgress) {
        onProgress({
          taskId,
          progress: 30,
          total: 100,
          status: 'reading',
        });
      }

      // 读取文件
      const encoding = req.encoding || 'utf8';
      const content = await fs.readFile(safePath, encoding as any);
      
      if (onProgress) {
        onProgress({
          taskId,
          progress: 100,
          total: 100,
          status: 'complete',
        });
      }

      return content.toString();
    } catch (error) {
      if (onProgress) {
        onProgress({
          taskId,
          progress: 0,
          total: 100,
          status: 'error',
        });
      }
      throw new Error(`Failed to read file: ${(error as Error).message}`);
    }
  },

  /**
   * 写入文件内容
   */
  async writeFile(req: WriteFileReq, onProgress?: (data: FileProgressData) => void): Promise<void> {
    const safePath = this.validatePath(req.path);
    const taskId = `write_${Date.now()}`;
    
    try {
      if (onProgress) {
        onProgress({
          taskId,
          progress: 0,
          total: 100,
          status: 'writing',
        });
      }

      // 确保目录存在
      const dir = path.dirname(safePath);
      await fs.mkdir(dir, { recursive: true });
      
      if (onProgress) {
        onProgress({
          taskId,
          progress: 30,
          total: 100,
          status: 'writing',
        });
      }

      // 写入文件
      const encoding = req.encoding || 'utf8';
      await fs.writeFile(safePath, req.content, encoding as any);
      
      if (onProgress) {
        onProgress({
          taskId,
          progress: 100,
          total: 100,
          status: 'complete',
        });
      }
    } catch (error) {
      if (onProgress) {
        onProgress({
          taskId,
          progress: 0,
          total: 100,
          status: 'error',
        });
      }
      throw new Error(`Failed to write file: ${(error as Error).message}`);
    }
  },

  /**
   * 检查文件是否存在
   */
  async exists(filePath: string): Promise<boolean> {
    try {
      const safePath = this.validatePath(filePath);
      await fs.access(safePath);
      return true;
    } catch {
      return false;
    }
  },

  /**
   * 删除文件
   */
  async deleteFile(filePath: string): Promise<void> {
    const safePath = this.validatePath(filePath);
    
    try {
      await fs.unlink(safePath);
    } catch (error) {
      throw new Error(`Failed to delete file: ${(error as Error).message}`);
    }
  },

  /**
   * 验证并规范化文件路径（安全检查）
   */
  validatePath(filePath: string): string {
    // 获取应用数据目录作为安全基础路径
    const appDataPath = app.getPath('userData');
    const documentsPath = app.getPath('documents');
    
    // 首次调用时打印路径信息
    if (!this._pathsLogged) {
      console.log('\n=== 文件操作安全路径 ===');
      console.log('允许的应用数据目录:', appDataPath);
      console.log('允许的文档目录:', documentsPath);
      console.log('文件将保存在以上目录中');
      console.log('=======================\n');
      this._pathsLogged = true;
    }
    
    // 规范化路径
    const normalizedPath = path.normalize(filePath);
    
    // 如果是相对路径，基于用户数据目录
    if (!path.isAbsolute(normalizedPath)) {
      return path.join(appDataPath, normalizedPath);
    }
    
    // 检查绝对路径是否在允许的目录内
    const allowedPaths = [appDataPath, documentsPath];
    const isAllowed = allowedPaths.some(allowedPath => 
      normalizedPath.startsWith(path.normalize(allowedPath))
    );
    
    if (!isAllowed) {
      throw new Error(`Access denied: Path not in allowed directories`);
    }
    
    // 防止路径遍历攻击
    if (normalizedPath.includes('..')) {
      throw new Error('Path traversal not allowed');
    }
    
    return normalizedPath;
  },
};
