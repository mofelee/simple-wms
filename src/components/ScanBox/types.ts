/**
 * 扫码框组件类型定义
 */

export interface KeyInfo {
  key: string;
  code: string;
  charCode: number;
  timestamp: number;
  ctrlKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
  metaKey: boolean;
  repeat: boolean;
  composed: boolean;
  isComposing: boolean;
}

export interface ScanResult {
  /** 原始扫码数据 */
  rawData: string;
  /** 显示用的格式化数据 */
  displayData: string;
  /** 扫码时间戳 */
  timestamp: Date;
  /** 数据长度 */
  length: number;
}

export interface ScanBoxProps {
  /** 扫码完成回调 */
  onScan?: (result: ScanResult) => void;
  
  /** 扫码中回调 */
  onScanning?: (data: string) => void;
  
  /** 错误回调 */
  onError?: (error: string) => void;
  
  /** 清空回调（原因：escape/timeout/manual） */
  onClear?: (reason: 'escape' | 'timeout' | 'manual') => void;
  
  /** 自定义样式类名 */
  className?: string;
  
  /** 是否禁用 */
  disabled?: boolean;
  
  /** 占位符文本 */
  placeholder?: string;
  
  /** 是否显示扫码状态 */
  showStatus?: boolean;
  
  /** 是否自动聚焦 */
  autoFocus?: boolean;
  
  /** 是否在扫码后清空输入 */
  clearAfterScan?: boolean;
  
  /** 最小扫码长度 */
  minLength?: number;
  
  /** 最大扫码长度 */
  maxLength?: number;
  
  /** 超时时间（毫秒），用于判断扫码完成 */
  timeout?: number;

  /** 扫码成功提示显示时间（毫秒），默认 3000 */
  successVisibleMs?: number;

  /** 调试日志开关，默认 false */
  debug?: boolean;
}

export interface ScanBoxState {
  /** 当前输入的数据 */
  displayData: string;
  
  /** 是否正在扫码 */
  isScanning: boolean;
  
  /** 是否已聚焦 */
  isFocused: boolean;

  /** 当前输入的数据长度 */
  keyLength: number;
  
  /** 最后扫码时间 */
  lastScanTime: Date | null;
  
  /** 错误信息 */
  error: string | null;
}

export interface TestSample {
  name: string;
  data: string;
  description: string;
}
