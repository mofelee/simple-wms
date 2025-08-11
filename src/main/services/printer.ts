import http from 'http';
import net from 'net';
import { app } from 'electron';
import path from 'path';
import { promises as fs } from 'fs';
import iconv from 'iconv-lite';
import { PrinterConfig, PrinterStatus } from '@/common/ipc';

class PrinterService {
  private server: http.Server | null = null;
  private status: PrinterStatus = { httpRunning: false };
  private readonly configPath = 'printer/config.json';
  private config: PrinterConfig = {
    printerIp: '127.0.0.1',
    printerPort: 9100,
    httpPort: 18080,
    enabled: true,
  };

  /**
   * ESC/POS 命令常量
   */
  private readonly ESC_POS = {
    INIT: Buffer.from([0x1B, 0x40]), // ESC @ - 初始化打印机
    SET_CHARSET_GB18030: Buffer.from([0x1B, 0x74, 0xFF]), // ESC t 255 - 设置字符代码表为GB18030
    SET_INTERNATIONAL_CHINA: Buffer.from([0x1B, 0x52, 0x0F]), // ESC R 15 - 设置国际字符集为中国
    LF: Buffer.from([0x0A]),         // LF - 换行
    CR: Buffer.from([0x0D]),         // CR - 回车
    CUT: Buffer.from([0x1D, 0x56, 0x00]), // GS V - 切纸
    ALIGN_LEFT: Buffer.from([0x1B, 0x61, 0x00]),   // ESC a 0 - 左对齐
    ALIGN_CENTER: Buffer.from([0x1B, 0x61, 0x01]), // ESC a 1 - 居中
    ALIGN_RIGHT: Buffer.from([0x1B, 0x61, 0x02]),  // ESC a 2 - 右对齐
    FONT_NORMAL: Buffer.from([0x1B, 0x21, 0x00]),  // ESC ! 0 - 正常字体
    FONT_DOUBLE_HEIGHT: Buffer.from([0x1B, 0x21, 0x10]), // ESC ! 16 - 双倍高度
    FONT_DOUBLE_WIDTH: Buffer.from([0x1B, 0x21, 0x20]),  // ESC ! 32 - 双倍宽度
    FONT_BOLD: Buffer.from([0x1B, 0x45, 0x01]),    // ESC E 1 - 粗体
    FONT_BOLD_OFF: Buffer.from([0x1B, 0x45, 0x00]), // ESC E 0 - 取消粗体
  };

  /**
   * 生成ESC/POS打印数据
   * @param text 要打印的文本
   * @param options 打印选项
   */
  generateEscPosData(text: string, options: {
    align?: 'left' | 'center' | 'right';
    fontSize?: 'normal' | 'double_height' | 'double_width' | 'double_both';
    bold?: boolean;
    cut?: boolean;
  } = {}): Buffer {
    const buffers: Buffer[] = [];
    
    // 初始化打印机
    buffers.push(this.ESC_POS.INIT);
    
    // 设置字符编码为GB18030以支持中文
    buffers.push(this.ESC_POS.SET_CHARSET_GB18030);
    buffers.push(this.ESC_POS.SET_INTERNATIONAL_CHINA);
    
    // 设置对齐方式
    switch (options.align) {
      case 'center':
        buffers.push(this.ESC_POS.ALIGN_CENTER);
        break;
      case 'right':
        buffers.push(this.ESC_POS.ALIGN_RIGHT);
        break;
      default:
        buffers.push(this.ESC_POS.ALIGN_LEFT);
    }
    
    // 设置字体
    let fontCommand = 0x00;
    if (options.fontSize === 'double_height') fontCommand |= 0x10;
    if (options.fontSize === 'double_width') fontCommand |= 0x20;
    if (options.fontSize === 'double_both') fontCommand |= 0x30;
    buffers.push(Buffer.from([0x1B, 0x21, fontCommand]));
    
    // 设置粗体
    if (options.bold) {
      buffers.push(this.ESC_POS.FONT_BOLD);
    }
    
    // 转换文本为GB18030编码
    const textBuffer = iconv.encode(text, 'gb18030');
    buffers.push(textBuffer);
    
    // 添加换行
    buffers.push(this.ESC_POS.LF);
    
    // 取消粗体
    if (options.bold) {
      buffers.push(this.ESC_POS.FONT_BOLD_OFF);
    }
    
    // 切纸
    if (options.cut) {
      buffers.push(this.ESC_POS.CUT);
    }
    
    return Buffer.concat(buffers);
  }

  async loadConfig(): Promise<PrinterConfig> {
    try {
      const userData = app.getPath('userData');
      const abs = path.join(userData, this.configPath);
      const buf = await fs.readFile(abs, 'utf8');
      const parsed = JSON.parse(buf) as PrinterConfig;
      this.config = { ...this.config, ...parsed };
    } catch {
      // ignore if not exists
    }

    // 自动启动HTTP服务（如果配置启用且端口未占用）
    if (this.config.enabled && !this.server) {
      try {
        await this.autoStartHttpService();
      } catch (error) {
        console.warn('自动启动HTTP服务失败:', error);
      }
    }

    return this.config;
  }

  /**
   * 自动启动HTTP服务
   */
  private async autoStartHttpService(): Promise<void> {
    // 检查端口是否可用
    const isPortAvailable = await this.checkPortAvailable(this.config.httpPort);
    if (!isPortAvailable) {
      console.log(`端口 ${this.config.httpPort} 已被占用，跳过自动启动`);
      return;
    }

    // 检查打印机连接
    const isPrinterConnectable = await this.checkPrinterConnection();
    if (!isPrinterConnectable) {
      console.log(`打印机 ${this.config.printerIp}:${this.config.printerPort} 连接失败，跳过自动启动`);
      return;
    }

    console.log('自动启动HTTP打印服务...');
    await this.startHttp(this.config.httpPort);
  }

  /**
   * 检查端口是否可用
   */
  private async checkPortAvailable(port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const server = net.createServer();
      server.listen(port, () => {
        server.close(() => resolve(true));
      });
      server.on('error', () => resolve(false));
    });
  }

  /**
   * 检查打印机连接
   */
  private async checkPrinterConnection(): Promise<boolean> {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      socket.setTimeout(3000);
      
      socket.on('connect', () => {
        socket.destroy();
        resolve(true);
      });
      
      socket.on('error', () => resolve(false));
      socket.on('timeout', () => {
        socket.destroy();
        resolve(false);
      });
      
      socket.connect(this.config.printerPort, this.config.printerIp);
    });
  }

  async saveConfig(partial: Partial<PrinterConfig>): Promise<PrinterConfig> {
    this.config = { ...this.config, ...partial };
    const userData = app.getPath('userData');
    const abs = path.join(userData, this.configPath);
    await fs.mkdir(path.dirname(abs), { recursive: true });
    await fs.writeFile(abs, JSON.stringify(this.config, null, 2), 'utf8');
    return this.config;
  }

  getConfig(): PrinterConfig {
    return this.config;
  }

  getStatus(): PrinterStatus {
    return { ...this.status };
  }

  async startHttp(port?: number): Promise<PrinterStatus> {
    if (this.server) {
      return this.getStatus();
    }

    const listenPort = port ?? this.config.httpPort ?? 18080;
    this.config.httpPort = listenPort;

    this.server = http.createServer(async (req, res) => {
      // CORS
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
      }

      if (req.method === 'POST' && req.url?.startsWith('/print')) {
        try {
          const chunks: Buffer[] = [];
          for await (const chunk of req) chunks.push(chunk as Buffer);
          const bodyStr = Buffer.concat(chunks).toString('utf8');
          
          let base64Data: string;
          let description: string = '';
          
          try {
            const parsed = JSON.parse(bodyStr);
            if (typeof parsed?.data === 'string') {
              base64Data = parsed.data;
              description = parsed.description || '';
            } else if (typeof parsed?.text === 'string') {
              // 兼容旧格式：如果发送的是text，自动转换为ESC/POS
              const escPosBuffer = this.generateEscPosData(parsed.text, { cut: true });
              base64Data = escPosBuffer.toString('base64');
              description = `自动转换: ${parsed.text.substring(0, 20)}...`;
            } else {
              throw new Error('Missing data field');
            }
          } catch {
            // 如果不是JSON，尝试作为纯文本处理（兼容性）
            const escPosBuffer = this.generateEscPosData(bodyStr, { cut: true });
            base64Data = escPosBuffer.toString('base64');
            description = `纯文本: ${bodyStr.substring(0, 20)}...`;
          }

          await this.rawBinaryPrint(base64Data);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            success: true, 
            message: `打印成功: ${description}` 
          }));
        } catch (e: any) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: e?.message || 'print failed' }));
        }
        return;
      }

      if (req.method === 'GET' && req.url === '/status') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, data: this.getStatus() }));
        return;
      }

      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'Not Found' }));
    });

    await new Promise<void>((resolve, reject) => {
      this.server!.once('error', (err) => {
        this.status = { httpRunning: false, lastError: (err as any)?.message };
        reject(err);
      });
      this.server!.listen(listenPort, () => {
        this.status = { httpRunning: true, httpPort: listenPort };
        resolve();
      });
    });

    return this.getStatus();
  }

  async stopHttp(): Promise<PrinterStatus> {
    if (!this.server) return this.getStatus();
    await new Promise<void>((resolve) => this.server!.close(() => resolve()));
    this.server = null;
    this.status = { httpRunning: false };
    return this.getStatus();
  }

  async testPrint(data: string, description?: string): Promise<void> {
    await this.rawBinaryPrint(data);
  }

  /**
   * 发送base64编码的二进制数据到打印机
   */
  private async rawBinaryPrint(base64Data: string): Promise<void> {
    const { printerIp, printerPort } = this.config;
    if (!printerIp || !printerPort) {
      throw new Error('Printer IP/port not configured');
    }

    // 解码base64数据为二进制
    let binaryData: Buffer;
    try {
      binaryData = Buffer.from(base64Data, 'base64');
    } catch (error) {
      throw new Error('Invalid base64 data');
    }

    if (binaryData.length === 0) {
      throw new Error('Empty print data');
    }

    await new Promise<void>((resolve, reject) => {
      const socket = new net.Socket();
      socket.setTimeout(10000); // 增加超时时间到10秒
      socket.once('error', reject);
      socket.once('timeout', () => reject(new Error('TCP timeout')));
      
      socket.connect(printerPort, printerIp, () => {
        socket.write(binaryData, (err) => {
          if (err) {
            reject(err);
          } else {
            // 等待一小段时间确保数据发送完成
            setTimeout(() => {
              socket.end();
              resolve();
            }, 100);
          }
        });
      });
    });
  }

  /**
   * 兼容旧的文本打印方法（内部将文本转换为ESC/POS）
   */
  private async rawTcpPrint(text: string): Promise<void> {
    const escPosBuffer = this.generateEscPosData(text, { cut: true });
    const base64Data = escPosBuffer.toString('base64');
    await this.rawBinaryPrint(base64Data);
  }
}

export const printerService = new PrinterService();



