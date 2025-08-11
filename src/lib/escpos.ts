/**
 * ESC/POS 打印命令生成工具
 * 支持基本的ESC/POS命令和中文编码
 * 
 * 注意：统一使用 iconv-lite 进行编码处理，通过 polyfill 支持浏览器环境
 */

import iconv from 'iconv-lite';
import { Buffer } from 'buffer';

// ESC/POS 命令常量
export const ESC_POS_COMMANDS = {
  // 初始化
  INIT: [0x1B, 0x40], // ESC @
  
  // 字符编码设置
  SET_CHARSET_GB18030: [0x1B, 0x74, 0xFF], // ESC t 255 - 设置字符代码表为GB18030
  SET_CHARSET_UTF8: [0x1B, 0x74, 0x00],    // ESC t 0 - 设置字符代码表为UTF-8
  SET_INTERNATIONAL_CHINA: [0x1B, 0x52, 0x0F], // ESC R 15 - 设置国际字符集为中国
  
  // 换行和回车
  LF: [0x0A],         // Line Feed
  CR: [0x0D],         // Carriage Return
  CRLF: [0x0D, 0x0A], // CR + LF
  
  // 切纸
  CUT: [0x1D, 0x56, 0x00],        // GS V - 全切
  CUT_PARTIAL: [0x1D, 0x56, 0x01], // GS V - 半切
  
  // 对齐方式
  ALIGN_LEFT: [0x1B, 0x61, 0x00],   // ESC a 0
  ALIGN_CENTER: [0x1B, 0x61, 0x01], // ESC a 1
  ALIGN_RIGHT: [0x1B, 0x61, 0x02],  // ESC a 2
  
  // 字体样式
  FONT_NORMAL: [0x1B, 0x21, 0x00],        // ESC ! 0
  FONT_DOUBLE_HEIGHT: [0x1B, 0x21, 0x10], // ESC ! 16
  FONT_DOUBLE_WIDTH: [0x1B, 0x21, 0x20],  // ESC ! 32
  FONT_DOUBLE_BOTH: [0x1B, 0x21, 0x30],   // ESC ! 48
  
  // 粗体
  BOLD_ON: [0x1B, 0x45, 0x01],  // ESC E 1
  BOLD_OFF: [0x1B, 0x45, 0x00], // ESC E 0
  
  // 下划线
  UNDERLINE_OFF: [0x1B, 0x2D, 0x00], // ESC - 0
  UNDERLINE_1: [0x1B, 0x2D, 0x01],   // ESC - 1
  UNDERLINE_2: [0x1B, 0x2D, 0x02],   // ESC - 2
  
  // 反白
  INVERT_ON: [0x1D, 0x42, 0x01],  // GS B 1
  INVERT_OFF: [0x1D, 0x42, 0x00], // GS B 0
};

export interface PrintOptions {
  align?: 'left' | 'center' | 'right';
  fontSize?: 'normal' | 'double_height' | 'double_width' | 'double_both';
  bold?: boolean;
  underline?: 'none' | 'single' | 'double';
  invert?: boolean;
}

export interface ReceiptSection {
  text: string;
  options?: PrintOptions;
}

export class EscPosBuilder {
  private commands: number[] = [];

  constructor() {
    // 初始化打印机
    this.addCommand(ESC_POS_COMMANDS.INIT);
    
    // 设置字符编码为GB18030以支持中文
    this.addCommand(ESC_POS_COMMANDS.SET_CHARSET_GB18030);
    this.addCommand(ESC_POS_COMMANDS.SET_INTERNATIONAL_CHINA);
  }

  private addCommand(command: number[]): this {
    this.commands.push(...command);
    return this;
  }

  /**
   * 添加文本（自动处理中文编码）
   */
  addText(text: string, options: PrintOptions = {}): this {
    // 设置对齐方式
    switch (options.align) {
      case 'center':
        this.addCommand(ESC_POS_COMMANDS.ALIGN_CENTER);
        break;
      case 'right':
        this.addCommand(ESC_POS_COMMANDS.ALIGN_RIGHT);
        break;
      default:
        this.addCommand(ESC_POS_COMMANDS.ALIGN_LEFT);
    }

    // 设置字体大小
    switch (options.fontSize) {
      case 'double_height':
        this.addCommand(ESC_POS_COMMANDS.FONT_DOUBLE_HEIGHT);
        break;
      case 'double_width':
        this.addCommand(ESC_POS_COMMANDS.FONT_DOUBLE_WIDTH);
        break;
      case 'double_both':
        this.addCommand(ESC_POS_COMMANDS.FONT_DOUBLE_BOTH);
        break;
      default:
        this.addCommand(ESC_POS_COMMANDS.FONT_NORMAL);
    }

    // 设置粗体
    if (options.bold) {
      this.addCommand(ESC_POS_COMMANDS.BOLD_ON);
    }

    // 设置下划线
    switch (options.underline) {
      case 'single':
        this.addCommand(ESC_POS_COMMANDS.UNDERLINE_1);
        break;
      case 'double':
        this.addCommand(ESC_POS_COMMANDS.UNDERLINE_2);
        break;
      default:
        this.addCommand(ESC_POS_COMMANDS.UNDERLINE_OFF);
    }

    // 设置反白
    if (options.invert) {
      this.addCommand(ESC_POS_COMMANDS.INVERT_ON);
    }

    // 添加文本（需要GB18030编码，这里先用简单的方式处理）
    const textBytes = this.encodeTextToGB18030(text);
    this.commands.push(...textBytes);

    // 重置样式
    if (options.bold) {
      this.addCommand(ESC_POS_COMMANDS.BOLD_OFF);
    }
    if (options.underline && options.underline !== 'none') {
      this.addCommand(ESC_POS_COMMANDS.UNDERLINE_OFF);
    }
    if (options.invert) {
      this.addCommand(ESC_POS_COMMANDS.INVERT_OFF);
    }

    return this;
  }

  /**
   * 换行
   */
  addLine(): this {
    this.addCommand(ESC_POS_COMMANDS.LF);
    return this;
  }

  /**
   * 添加多行文本
   */
  addLines(lines: string[], options: PrintOptions = {}): this {
    lines.forEach((line, index) => {
      this.addText(line, options);
      if (index < lines.length - 1) {
        this.addLine();
      }
    });
    return this;
  }

  /**
   * 添加分隔线
   */
  addSeparator(char: string = '-', length: number = 32): this {
    this.addText(char.repeat(length), { align: 'center' });
    this.addLine();
    return this;
  }

  /**
   * 添加空行
   */
  addEmptyLine(count: number = 1): this {
    for (let i = 0; i < count; i++) {
      this.addCommand(ESC_POS_COMMANDS.LF);
    }
    return this;
  }

  /**
   * 切纸
   */
  cut(partial: boolean = false): this {
    this.addCommand(partial ? ESC_POS_COMMANDS.CUT_PARTIAL : ESC_POS_COMMANDS.CUT);
    return this;
  }

  /**
   * 简化的GB18030编码
   */
  encodeTextToGB18030(text: string): number[] {
    return Array.from(iconv.encode(text, 'GB18030'));
  }

  /**
   * 生成最终的打印数据（base64编码）
   */
  build(): string {
    const buffer = new Uint8Array(this.commands);
    return btoa(String.fromCharCode(...buffer));
  }

  /**
   * 生成原始字节数组
   */
  buildRaw(): number[] {
    return [...this.commands];
  }

  /**
   * 重置构建器
   */
  reset(): this {
    this.commands = [];
    this.addCommand(ESC_POS_COMMANDS.INIT);
    
    // 设置字符编码为GB18030以支持中文
    this.addCommand(ESC_POS_COMMANDS.SET_CHARSET_GB18030);
    this.addCommand(ESC_POS_COMMANDS.SET_INTERNATIONAL_CHINA);
    return this;
  }
}

/**
 * 快速创建简单收据
 */
export function createSimpleReceipt(sections: ReceiptSection[], withCut: boolean = true): string {
  const builder = new EscPosBuilder();
  
  sections.forEach((section, index) => {
    builder.addText(section.text, section.options || {});
    if (index < sections.length - 1) {
      builder.addLine();
    }
  });
  
  if (withCut) {
    builder.addEmptyLine(5).cut();
    //builder.cut();
  }
  
  return builder.build();
}

/**
 * 浏览器兼容的 base64 解码函数
 */
function base64ToUint8Array(base64: string): Uint8Array {
  try {
    // 浏览器原生 base64 解码
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  } catch (error) {
    throw new Error('Invalid base64 data');
  }
}

/**
 * 使用 iconv-lite 解码文本（统一编码处理）
 */
function decodeGB18030Text(bytes: Uint8Array): string {
  try {
    // 使用 Buffer polyfill 创建 buffer 对象
    const buffer = Buffer.from(bytes);
    return iconv.decode(buffer, 'GB18030');
  } catch (error) {
    // 如果 GB18030 解码失败，尝试 UTF-8
    try {
      const buffer = Buffer.from(bytes);
      return iconv.decode(buffer, 'UTF-8');
    } catch {
      // 最后回退：将字节转换为字符
      return Array.from(bytes)
        .map(byte => String.fromCharCode(byte))
        .join('');
    }
  }
}

/**
 * 调试工具：分析ESC/POS命令序列（浏览器兼容版本）
 */
export function analyzeEscPosData(base64Data: string): string[] {
  const buffer = base64ToUint8Array(base64Data);
  const commands: string[] = [];
  
  for (let i = 0; i < buffer.length; i++) {
    const byte = buffer[i];
    
    // ESC 命令 (0x1B)
    if (byte === 0x1B && i + 1 < buffer.length) {
      const nextByte = buffer[i + 1];
      switch (nextByte) {
        case 0x40: // ESC @
          commands.push('INIT (ESC @)');
          i++;
          break;
        case 0x74: // ESC t
          if (i + 2 < buffer.length) {
            const charset = buffer[i + 2];
            commands.push(`SET_CHARSET (ESC t ${charset}) - ${charset === 0xFF ? 'GB18030' : 'Other'}`);
            i += 2;
          }
          break;
        case 0x52: // ESC R
          if (i + 2 < buffer.length) {
            const country = buffer[i + 2];
            commands.push(`SET_INTERNATIONAL (ESC R ${country}) - ${country === 0x0F ? 'China' : 'Other'}`);
            i += 2;
          }
          break;
        case 0x61: // ESC a (对齐)
          if (i + 2 < buffer.length) {
            const align = buffer[i + 2];
            const alignText = align === 0 ? 'LEFT' : align === 1 ? 'CENTER' : 'RIGHT';
            commands.push(`ALIGN_${alignText} (ESC a ${align})`);
            i += 2;
          }
          break;
        case 0x21: // ESC ! (字体)
          if (i + 2 < buffer.length) {
            const font = buffer[i + 2];
            commands.push(`FONT_STYLE (ESC ! ${font})`);
            i += 2;
          }
          break;
        case 0x45: // ESC E (粗体)
          if (i + 2 < buffer.length) {
            const bold = buffer[i + 2];
            commands.push(`BOLD_${bold ? 'ON' : 'OFF'} (ESC E ${bold})`);
            i += 2;
          }
          break;
        default:
          commands.push(`ESC ${nextByte.toString(16).toUpperCase()}`);
          i++;
      }
    }
    // GS 命令 (0x1D)
    else if (byte === 0x1D && i + 2 < buffer.length) {
      const cmd = buffer[i + 1];
      const param = buffer[i + 2];
      if (cmd === 0x56 && param === 0x00) {
        commands.push('CUT (GS V 0)');
        i += 2;
      } else {
        commands.push(`GS ${cmd.toString(16).toUpperCase()} ${param.toString(16).toUpperCase()}`);
        i += 2;
      }
    }
    // 控制字符
    else if (byte === 0x0A) {
      commands.push('LF (换行)');
    }
    else if (byte === 0x0D) {
      commands.push('CR (回车)');
    }
    // 文本数据
    else if (byte >= 0x20) {
      let textStart = i;
      while (i < buffer.length && buffer[i] >= 0x20 && buffer[i] !== 0x1B && buffer[i] !== 0x1D) {
        i++;
      }
      const textBytes = buffer.slice(textStart, i);
      try {
        const text = decodeGB18030Text(textBytes);
        commands.push(`TEXT: "${text}"`);
      } catch {
        commands.push(`BINARY: [${Array.from(textBytes).map(b => b.toString(16).toUpperCase()).join(' ')}]`);
      }
      i--; // 调整循环计数器
    }
  }
  
  return commands;
}

/**
 * 创建测试收据
 */
export function createTestReceipt(): string {
  const builder = new EscPosBuilder();
  
  return builder
    .addText('ESC/POS 测试收据', { align: 'center', fontSize: 'double_both', bold: true })
    .addLine()
    .addSeparator('=', 32)
    .addText('收银员: 张三', { align: 'left' })
    .addLine()
    .addText('时间: ' + new Date().toLocaleString('zh-CN'), { align: 'left' })
    .addLine()
    .addSeparator('-', 32)
    .addText('商品明细:', { bold: true })
    .addLine()
    .addText('商品A × 2        ￥20.00', { align: 'left' })
    .addLine()
    .addText('商品B × 1        ￥15.50', { align: 'left' })
    .addLine()
    .addText('商品C × 3        ￥8.80', { align: 'left' })
    .addLine()
    .addSeparator('-', 32)
    .addText('合计: ￥44.30', { align: 'right', fontSize: 'double_height', bold: true })
    .addLine()
    .addText('支付方式: 微信支付', { align: 'center' })
    .addLine()
    .addSeparator('=', 32)
    .addText('谢谢惠顾！', { align: 'center', bold: true })
    .addLine()
    .addText('欢迎下次光临', { align: 'center' })
    .addEmptyLine(5)
    .cut()
    .build();
}

/**
 * 创建多语言测试
 */
export function createMultiLanguageTest(): string {
  const builder = new EscPosBuilder();
  
  return builder
    .addText('多语言测试 Multi-Language Test', { align: 'center', bold: true })
    .addLine()
    .addSeparator('-', 32)
    .addText('中文: 你好世界！', { align: 'left' })
    .addLine()
    .addText('English: Hello World!', { align: 'left' })
    .addLine()
    .addText('Numbers: 1234567890', { align: 'left' })
    .addLine()
    .addText('Special: !@#$%^&*()', { align: 'left' })
    .addLine()
    .addSeparator('-', 32)
    .addText('字体测试:', { bold: true })
    .addLine()
    .addText('正常字体', { fontSize: 'normal' })
    .addLine()
    .addText('双倍高度', { fontSize: 'double_height' })
    .addLine()
    .addText('双倍宽度', { fontSize: 'double_width' })
    .addLine()
    .addText('双倍大小', { fontSize: 'double_both' })
    .addLine()
    .addText('粗体文本', { bold: true })
    .addLine()
    .addText('居中对齐', { align: 'center' })
    .addLine()
    .addText('右对齐', { align: 'right' })
    .addEmptyLine(5)
    .cut()
    .build();
}
