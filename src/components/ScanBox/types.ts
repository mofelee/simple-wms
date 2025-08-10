/**
 * 扫码框组件类型定义
 */

export interface KeyInfo {
  key: string;
  code: string;
  charCode: number;
  timestamp: number;
}

export interface ScanData {
  buf: KeyInfo[];
  out: KeyInfo[];
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
}

export interface ScanBoxState {
  /** 当前输入的数据 */
  currentData: string;
  
  /** 是否正在扫码 */
  isScanning: boolean;
  
  /** 是否已聚焦 */
  isFocused: boolean;
  
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
