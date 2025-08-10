import { KeyInfo } from './types';

/**
 * 扫码工具函数
 */

/**
 * 修复中文输入法下的键盘事件
 */
export function fixKeyboardEvent(event: React.KeyboardEvent): string {
  let key = event.key;
  const code = event.code;
  
  // 修复中文输入法下的特殊字符
  const keyMappings: Record<string, string> = {
    'Period': '.',
    'Semicolon': ':',
    'Slash': '/',
    'Backslash': '\\',
    'Quote': '"',
    'Backquote': '`',
    'Minus': '-',
    'Equal': '=',
    'BracketLeft': '[',
    'BracketRight': ']',
  };
  
  if (keyMappings[code] && key !== keyMappings[code]) {
    key = keyMappings[code];
  }
  
  return key;
}

/**
 * 将 KeyInfo 数组转换为解析字符串
 */
export function keysToParseString(keys: KeyInfo[]): string {
  return keys
    .map((key) => {
      if (key.charCode < 32 || key.charCode === 127) {
        if (key.code === "F8") {
          return "\x1D"; // GS 分隔符
        } else {
          return "";
        }
      }
      return key.key;
    })
    .join("");
}

/**
 * 将 KeyInfo 数组转换为显示字符串
 */
export function keysToDisplayString(keys: KeyInfo[]): string {
  return keys
    .map((key) => {
      if (key.charCode < 32 || key.charCode === 127) {
        return `[${key.code}]`;
      }
      return key.key;
    })
    .join("");
}

/**
 * 格式化显示数据，将控制字符转换为可见的格式
 */
export function formatDisplayData(data: string): string {
  return data.replace(
    /[\x00-\x1F\x7F-\x9F]/g,
    (char) => `[${char.charCodeAt(0).toString(16).toUpperCase()}]`
  );
}

/**
 * 验证扫码数据
 */
export function validateScanData(
  data: string,
  minLength?: number,
  maxLength?: number
): { isValid: boolean; error?: string } {
  if (!data || data.trim().length === 0) {
    return { isValid: false, error: '扫码数据为空' };
  }
  
  if (minLength && data.length < minLength) {
    return { isValid: false, error: `扫码数据长度不足，最少需要 ${minLength} 个字符` };
  }
  
  if (maxLength && data.length > maxLength) {
    return { isValid: false, error: `扫码数据过长，最多允许 ${maxLength} 个字符` };
  }
  
  return { isValid: true };
}

/**
 * 创建 KeyInfo 对象
 */
export function createKeyInfo(event: React.KeyboardEvent): KeyInfo {
  const key = fixKeyboardEvent(event);
  
  return {
    key,
    code: event.code,
    charCode: key.length === 1 ? key.charCodeAt(0) : 0,
    timestamp: Date.now(),
  };
}
