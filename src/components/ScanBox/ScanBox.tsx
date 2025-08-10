import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  filter,
  map,
  scan,
  share,
  Subject,
  tap,
  switchMap,
  merge,
  timer,
  takeUntil,
  bufferWhen,
  debounceTime,
  withLatestFrom,
} from "rxjs";
import {
  ScanBoxProps,
  ScanBoxState,
  KeyInfo,
  ScanResult,
} from "./types";
import {
  createKeyInfo,
  keysToParseString,
  keysToDisplayString,
  formatDisplayData,
  validateScanData,
} from "./utils";

/**
 * 扫码框组件
 *
 * 功能特点：
 * - 接收扫码枪输入数据
 * - 使用 RxJS 处理键盘事件流
 * - 支持 GS1 标准的控制字符处理
 * - 通过回调函数传出扫码结果
 * - 支持自定义验证和格式化
 */
const ScanBox: React.FC<ScanBoxProps> = ({
  onScan,
  onScanning,
  onError,
  onClear,
  className = "",
  disabled = false,
  placeholder = "点击此区域，然后扫描条码",
  showStatus = true,
  autoFocus = true,
  minLength,
  maxLength,
  timeout = 2000, // 默认 2s 超时
  successVisibleMs = 3000,
  debug = false,
}) => {
  // 状态管理
  const [state, setState] = useState<ScanBoxState>({
    displayData: "",
    isScanning: false,
    isFocused: false,
    keyLength: 0,
    lastScanTime: null,
    error: null,
  });

  // 扫码成功状态 (独立管理，用于3秒显示)
  const [scanSuccessState, setScanSuccessState] = useState<{
    data: string;
    isVisible: boolean;
    keyLength: number;
    timestamp: Date | null;
  }>({
    data: "",
    isVisible: false,
    keyLength: 0,
    timestamp: null,
  });

  // Refs
  const scanAreaRef = useRef<HTMLDivElement>(null);
  const keyDownSubjectRef = useRef<Subject<KeyInfo>>(new Subject<KeyInfo>());

  // 处理扫码完成
  const handleScanComplete = useCallback(
    async (rawData: string, displayData: string) => {
      if (!rawData.trim()) return;

      // 验证数据
      const validation = validateScanData(rawData, minLength, maxLength);

      if (!validation.isValid) {
        setState((prev) => ({ ...prev, error: validation.error || null }));
        setScanSuccessState({ data: "", isVisible: false, keyLength: 0, timestamp: null });
        onError?.(validation.error || "未知验证错误");
        return;
      }

      const result: ScanResult = {
        rawData,
        displayData,
        timestamp: new Date(),
        length: rawData.length,
      };

      // 更新常规状态
      setState((prev) => ({
        ...prev,
        lastScanTime: result.timestamp,
        error: null,
        isScanning: false,
        keyLength: 0,
        displayData: "", // 立即清空输入区域
      }));

      // 显示扫码成功状态 (3秒后自动隐藏)
      setScanSuccessState({
        data: displayData,
        isVisible: true,
        timestamp: result.timestamp,
        keyLength: result.length,
      });

      onScan?.(result);
    },
    [onScan, onError, minLength, maxLength]
  );

  // 处理键盘事件
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (disabled) return;

      e.preventDefault();

      const keyInfo = createKeyInfo(e);
      //keySubjectRef.current.next(keyInfo);
      keyDownSubjectRef.current.next(keyInfo);

      // 设置扫码状态
      setState((prev) => ({
        ...prev,
        isScanning: true,
        error: null,
      }));
    },
    [disabled]
  );

  // 处理聚焦
  const handleFocus = useCallback(() => {
    if (disabled) return;

    setState((prev) => ({ ...prev, isFocused: true }));
    if (scanAreaRef.current) {
      scanAreaRef.current.focus();
    }
  }, [disabled]);

  // 处理失焦
  const handleBlur = useCallback(() => {
    setState((prev) => ({ ...prev, isFocused: false }));
  }, []);

  // 清除数据
  const clearData = useCallback(() => {
    setState((prev) => ({
      ...prev,
      displayData: "",
      keyLength: 0,
      error: null,
      lastScanTime: null,
      isScanning: false,
    }));

    setScanSuccessState({
      data: "",
      isVisible: false,
      timestamp: null,
      keyLength: 0,
    });

    if (scanAreaRef.current) {
      scanAreaRef.current.focus();
    }
  }, []);

  // 初始化自动聚焦
  useEffect(() => {
    if (autoFocus && scanAreaRef.current && !disabled) {
      scanAreaRef.current.focus();
      setState((prev) => ({ ...prev, isFocused: true }));
    }
  }, [autoFocus, disabled]);

  // RxJS 扫码处理
  useEffect(() => {
    const kd$ = keyDownSubjectRef.current.pipe(share());

    // 仅非 Enter 键
    const notEnter$ = kd$.pipe(filter((e) => e.key !== "Enter"));

    // 仅非 Enter 且非 Escape 键（用于累积输入）
    const input$ = kd$.pipe(
      filter((e) => e.key !== "Enter" && e.key !== "Escape")
    );

    // Enter 流
    const enter$ = kd$.pipe(filter((e) => e.key === "Enter"));

    // Escape 流
    const escape$ = kd$.pipe(filter((e) => e.key === "Escape"));

    // 关闭信号：Enter 或超时（两秒没有 Enter）
    // 这里的 timeout 你可以用外部的 props/state 控制
    const close$ = merge(
      enter$.pipe(map(() => ({ type: "enter" as const }))),
      input$.pipe(
        debounceTime(timeout ?? 2000),
        map(() => ({ type: "timeout" as const }))
      ),
      escape$.pipe(map(() => ({ type: "escape" as const })))
    ).pipe(share());

    // —— 扫码完成或超时重置 —— //
    const bufferSub = input$
      .pipe(
        // 缓冲所有非 Enter 键，直到 close$（enter 或 timeout）到来
        bufferWhen(() => close$),
        // 拿到关闭原因
        withLatestFrom(close$)
      )
      .subscribe(([keys, reason]) => {
        if (reason.type === "enter") {
          const raw = keysToParseString(keys);
          const display = keysToDisplayString(keys);
          // 直接使用局部变量传递结果而不是 BehaviorSubject
          setState((prev) => ({
            ...prev,
            displayData: display,
            keyLength: keys.length,
            isScanning: false,
            error: null,
          }));
          handleScanComplete(raw, display);
        } else {
          // 超时：清空并恢复初始状态
          // 清空由状态管理
          setState((prev) => ({
            ...prev,
            displayData: "",
            keyLength: 0,
            isScanning: false,
            error: null,
          }));
          onScanning?.("");
        }
      });

    // —— 实时显示：键入中（可被超时重置） —— //
    const progressSub = merge(
      input$.pipe(map((k) => ({ type: "key" as const, k }))),
      // 在 enter 或 timeout 时都重置累积，避免新输入追加到上一条数据
      close$.pipe(map(() => ({ type: "reset" as const })))
    )
      .pipe(
        scan(
          (acc: KeyInfo[], ev: { type: "key"; k: KeyInfo } | { type: "reset" }) => 
            (ev.type === "key" ? [...acc, ev.k] : []),
          []
        ),
        tap((arr) => setState((prev) => ({ ...prev, keyLength: arr.length }))),
        map((keys) => keysToDisplayString(keys)),
        tap((display) => {
          // 实时显示由状态管理
          setState((prev) => ({
            ...prev,
            displayData: display,
            isScanning: display.length > 0,
            error: null,
          }));
          onScanning?.(display);
        })
      )
      .subscribe();

    // —— 成功提示：开始新的输入时立即隐藏 —— //
    const hideSuccess = () =>
      setScanSuccessState((prev) =>
        prev.isVisible ? { ...prev, isVisible: false } : prev
      );

    const hideOnStartSub = notEnter$.pipe(tap(hideSuccess)).subscribe();

    // —— 成功提示：成功后 3 秒自动隐藏；若期间有输入则取消 —— //
    const autoHideSub = enter$
      .pipe(
        switchMap(() => timer(successVisibleMs).pipe(takeUntil(notEnter$))),
        tap(hideSuccess)
      )
      .subscribe();

    // —— Escape：清空输入框与状态 —— //
    const escapeSub = escape$
      .pipe(
        tap(() => {
          // 状态清空，隐藏成功提示
          setState((prev) => ({
            ...prev,
            displayData: "",
            keyLength: 0,
            isScanning: false,
            error: null,
          }));
          setScanSuccessState({
            data: "",
            isVisible: false,
            keyLength: 0,
            timestamp: null,
          });
          onScanning?.("");
          onClear?.("escape");
        })
      )
      .subscribe();

    // 日志（可选）
    const logSub = kd$.subscribe((e) => {
      if (debug) {
        // eslint-disable-next-line no-console
        console.log(`${e.key}(${e.code})[${e.charCode}]`);
      }
    });

    return () => {
      bufferSub.unsubscribe();
      progressSub.unsubscribe();
      hideOnStartSub.unsubscribe();
      autoHideSub.unsubscribe();
      escapeSub.unsubscribe();
      logSub.unsubscribe();
    };
  }, [handleScanComplete, onScanning, onClear, timeout, successVisibleMs, debug]);


  // 动态样式类 - 根据不同状态设置背景色
  const getContainerStyles = () => {
    let baseClasses =
      "w-full min-h-[120px] p-4 border-2 rounded-lg cursor-pointer transition-all duration-300 shadow-sm hover:shadow-md";

    if (disabled) {
      return `${baseClasses} opacity-50 cursor-not-allowed border-gray-200 bg-gray-100`;
    }

    // 扫码成功状态 - 绿色主题
    if (scanSuccessState.isVisible) {
      return `${baseClasses} border-green-400 bg-gradient-to-br from-green-50 to-green-100 shadow-green-100`;
    }

    // 扫码进行中状态 - 黄色/橙色主题
    if (state.isScanning && state.displayData) {
      return `${baseClasses} border-orange-400 bg-gradient-to-br from-orange-50 to-yellow-50 shadow-orange-100 ring-2 ring-orange-200 ring-opacity-50`;
    }

    // 聚焦状态 - 蓝色主题
    if (state.isFocused) {
      return `${baseClasses} border-blue-400 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-blue-100 ring-2 ring-blue-200 ring-opacity-50`;
    }

    // 未聚焦状态 - 灰色主题
    return `${baseClasses} border-gray-300 bg-gradient-to-br from-gray-50 to-slate-50 hover:border-gray-400 hover:bg-gradient-to-br hover:from-gray-100 hover:to-slate-100`;
  };

  const containerClasses = [getContainerStyles(), className]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="space-y-4">
      {/* 扫码输入区域 */}
      <div
        ref={scanAreaRef}
        tabIndex={disabled ? -1 : 0}
        onClick={handleFocus}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={containerClasses}
        role="textbox"
        aria-label="扫码输入区域"
        aria-disabled={disabled}
      >
        {!state.displayData && !scanSuccessState.isVisible && (
          <div className="text-center py-8">
            <div className="text-lg font-medium text-gray-700 mb-2">
              {placeholder}
            </div>
            <div className="text-sm text-gray-500 flex items-center justify-center gap-2">
              <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
              <span>支持扫码枪输入</span>
              <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
            </div>
            {state.isFocused && (
              <div className="mt-4 text-xs text-blue-600 animate-pulse">
                已聚焦，准备接收扫码数据
              </div>
            )}
          </div>
        )}

        {/* 扫码进行中的数据 */}
        {state.displayData && !scanSuccessState.isVisible && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-orange-700">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce"></div>
                <div
                  className="w-2 h-2 bg-orange-500 rounded-full animate-bounce"
                  style={{ animationDelay: "0.1s" }}
                ></div>
                <div
                  className="w-2 h-2 bg-orange-500 rounded-full animate-bounce"
                  style={{ animationDelay: "0.2s" }}
                ></div>
              </div>
              <span className="text-sm font-medium">扫码进行中...</span>
            </div>
            <div className="font-mono text-sm bg-white bg-opacity-80 p-4 rounded-lg border border-orange-200 shadow-inner break-all">
              {formatDisplayData(state.displayData)}
            </div>
            <div className="flex justify-between items-center text-xs text-orange-600">
              <span className="bg-orange-100 px-2 py-1 rounded-full">
                长度: {state.keyLength} 字符
              </span>
              <span className="animate-pulse">继续输入中...</span>
            </div>
          </div>
        )}

        {/* 扫码成功的数据 (3秒显示) */}
        {scanSuccessState.isVisible && (
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-3 text-green-700">
              <div className="relative">
                <span className="text-2xl animate-bounce">✅</span>
                <div className="absolute inset-0 text-2xl animate-ping opacity-30">
                  ✅
                </div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold">扫码成功!</div>
                <div className="text-xs text-green-600 animate-pulse">
                  3秒后自动隐藏
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="font-mono text-sm bg-white bg-opacity-90 p-4 rounded-lg border-2 border-green-300 shadow-inner break-all">
                {formatDisplayData(scanSuccessState.data)}
              </div>
              <div className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full shadow-lg">
                成功
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-medium">
                📏 长度: {scanSuccessState.data.length} 字符
              </span>
              {scanSuccessState.timestamp && (
                <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-medium">
                  🕐 {scanSuccessState.timestamp.toLocaleTimeString()}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 状态和控制区域 */}
      {showStatus && (
        <div className="flex gap-3 items-center flex-wrap">
          <button
            onClick={clearData}
            disabled={disabled}
            className="px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg shadow-md hover:from-red-600 hover:to-red-700 hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <span>🗑️</span>
            清除
          </button>

          <button
            onClick={handleFocus}
            disabled={disabled}
            className={`px-4 py-2 text-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 ${
              state.isFocused
                ? "bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
                : "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
            }`}
          >
            <span>{state.isFocused ? "✅" : "🎯"}</span>
            {state.isFocused ? "已聚焦" : "点击聚焦"}
          </button>

          {state.isScanning && (
            <span className="px-4 py-2 bg-gradient-to-r from-orange-100 to-yellow-100 text-orange-800 rounded-lg text-sm font-medium shadow-sm border border-orange-200 flex items-center gap-2">
              <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
              扫码中...
            </span>
          )}

          {state.lastScanTime && !state.isScanning && (
            <span className="px-4 py-2 bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 rounded-lg text-sm font-medium shadow-sm border border-green-200 flex items-center gap-2">
              <span>🕐</span>
              最后扫码: {state.lastScanTime.toLocaleTimeString()}
            </span>
          )}

          {state.error && (
            <span className="px-4 py-2 bg-gradient-to-r from-red-100 to-pink-100 text-red-800 rounded-lg text-sm font-medium shadow-sm border border-red-200 flex items-center gap-2">
              <span>⚠️</span>
              错误: {state.error}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

// 添加 triggerScan 方法到组件实例
export interface ScanBoxRef {
  triggerScan: (data: string) => void;
  clearData: () => void;
  focus: () => void;
}

export const ScanBoxWithRef = React.forwardRef<ScanBoxRef, ScanBoxProps>(
  (props, ref) => {
    const scanBoxRef = useRef<{
      triggerScan: (data: string) => void;
      clearData: () => void;
      focus: () => void;
    } | null>(null);

    React.useImperativeHandle(ref, () => ({
      triggerScan: (data: string) => scanBoxRef.current?.triggerScan(data),
      clearData: () => scanBoxRef.current?.clearData(),
      focus: () => scanBoxRef.current?.focus(),
    }));

    return <ScanBox {...props} />;
  }
);

ScanBoxWithRef.displayName = "ScanBoxWithRef";

export default ScanBox;
