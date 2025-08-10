# 🎯 ScanBox 扫码框组件

## 📋 组件概述

ScanBox 是一个专门为扫码枪设计的 React 组件，使用 RxJS 处理复杂的键盘事件流，完整支持 GS1 标准的控制字符处理。

### ✨ 核心特性

- **🎯 专业扫码**: 专为扫码枪设计的输入处理逻辑
- **🔄 RxJS 驱动**: 使用 RxJS 处理复杂的键盘事件流
- **📱 GS1 支持**: 完整支持 GS1 标准的控制字符 (如 F8 → GS)
- **✅ 类型安全**: 完整的 TypeScript 类型定义
- **🎨 可定制**: 丰富的配置选项和样式定制
- **📊 实时反馈**: 扫码状态、错误信息和进度显示

## 🚀 快速开始

### 安装依赖

```bash
npm install rxjs
```

### 基础使用

```typescript
import React from 'react';
import { ScanBox, ScanResult } from '@/components/ScanBox';

function App() {
  const handleScan = (result: ScanResult) => {
    console.log('扫码结果:', result);
    // result.rawData: 原始扫码数据
    // result.displayData: 格式化显示数据
    // result.timestamp: 扫码时间
    // result.length: 数据长度
  };

  const handleScanning = (data: string) => {
    console.log('扫码中:', data);
  };

  const handleError = (error: string) => {
    console.error('扫码错误:', error);
  };

  return (
    <div>
      <h1>扫码测试</h1>
      <ScanBox
        onScan={handleScan}
        onScanning={handleScanning}
        onError={handleError}
        placeholder="请扫描条码"
        autoFocus
        showStatus
      />
    </div>
  );
}
```

## 📚 API 文档

### ScanBoxProps

| 属性 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| `onScan` | `(result: ScanResult) => void` | - | 扫码完成回调 |
| `onScanning` | `(data: string) => void` | - | 扫码进行中回调 |
| `onError` | `(error: string) => void` | - | 扫码错误回调 |
| `className` | `string` | `''` | 自定义样式类名 |
| `disabled` | `boolean` | `false` | 是否禁用 |
| `placeholder` | `string` | `'点击此区域，然后扫描条码'` | 占位符文本 |
| `showStatus` | `boolean` | `true` | 是否显示状态栏 |
| `autoFocus` | `boolean` | `true` | 是否自动聚焦 |
| `clearAfterScan` | `boolean` | `true` | 扫码后是否清空输入 |
| `minLength` | `number` | - | 最小扫码长度 |
| `maxLength` | `number` | - | 最大扫码长度 |
| `timeout` | `number` | `50` | 超时时间(ms) |

### ScanResult

```typescript
interface ScanResult {
  rawData: string;      // 原始扫码数据
  displayData: string;  // 显示用的格式化数据
  timestamp: Date;      // 扫码时间戳
  length: number;       // 数据长度
}
```

### KeyInfo

```typescript
interface KeyInfo {
  key: string;          // 按键值
  code: string;         // 按键代码
  charCode: number;     // 字符编码
  timestamp: number;    // 时间戳
}
```

## 🎨 使用场景

### 1. 仓库管理系统

```typescript
<ScanBox
  placeholder="扫描商品条码进行入库/出库"
  minLength={8}
  maxLength={200}
  onScan={(result) => {
    // 处理商品条码
    processProductCode(result.rawData);
  }}
  onError={(error) => {
    showNotification('扫码失败: ' + error, 'error');
  }}
/>
```

### 2. 医疗设备追溯

```typescript
<ScanBox
  placeholder="扫描医疗设备 UDI 条码"
  minLength={20}
  maxLength={100}
  timeout={100} // 医疗设备可能需要更长超时
  onScan={(result) => {
    // 解析 UDI 数据
    parseUDIData(result.rawData);
  }}
/>
```

### 3. 极简模式

```typescript
<ScanBox
  showStatus={false}
  autoFocus={false}
  placeholder="简洁扫码"
  onScan={handleScan}
/>
```

## 🔧 高级功能

### 使用 Ref 进行程序化控制

```typescript
import { ScanBoxWithRef, ScanBoxRef } from '@/components/ScanBox';

function AdvancedExample() {
  const scanBoxRef = useRef<ScanBoxRef>(null);

  const handleTestScan = () => {
    // 模拟扫码输入
    scanBoxRef.current?.triggerScan('(01)12345678901234');
  };

  const handleClear = () => {
    scanBoxRef.current?.clearData();
  };

  const handleFocus = () => {
    scanBoxRef.current?.focus();
  };

  return (
    <div>
      <ScanBoxWithRef
        ref={scanBoxRef}
        onScan={handleScan}
      />
      <button onClick={handleTestScan}>测试扫码</button>
      <button onClick={handleClear}>清空</button>
      <button onClick={handleFocus}>聚焦</button>
    </div>
  );
}
```

### 自定义样式

```typescript
<ScanBox
  className="my-custom-scanbox border-4 border-blue-500"
  onScan={handleScan}
/>
```

### 数据验证

```typescript
<ScanBox
  minLength={10}
  maxLength={50}
  onScan={(result) => {
    if (result.rawData.startsWith('(01)')) {
      // 处理 GTIN 条码
      processGTIN(result.rawData);
    } else {
      console.error('不支持的条码格式');
    }
  }}
  onError={(error) => {
    console.error('验证失败:', error);
  }}
/>
```

## 🧪 测试样例数据

组件内置了多种测试样例，适用于不同的扫码场景：

```typescript
import { testSamples } from '@/components/ScanBox/testSamples';

// 可用的测试样例
testSamples.forEach(sample => {
  console.log(sample.name, sample.data, sample.description);
});
```

### 内置测试数据类型

1. **固定长度AI**: GTIN + 生产日期 + 有效期 + 批次 + 序列号
2. **UDI示例**: 含产品信息的医疗设备标识
3. **括号格式**: 标准 GS1 括号格式
4. **简单GTIN**: 基础产品标识
5. **医疗设备**: 医疗设备专用格式
6. **药品标识**: 药品追溯码
7. **长序列号**: 含长序列号的产品
8. **多AI复合**: 包含多种应用标识符
9. **特殊字符**: 含特殊字符的批次号

## 🎯 Storybook 演示

启动 Storybook 查看所有演示场景：

```bash
npm run storybook
```

打开浏览器访问 `http://localhost:6006`，查看以下故事：

- **Default**: 基础使用场景
- **Disabled**: 禁用状态
- **WithoutStatus**: 无状态栏模式
- **WithLengthLimit**: 带长度限制
- **PersistentData**: 数据持久化
- **Interactive**: 交互式演示 (带测试按钮)
- **Minimal**: 极简模式
- **Medical**: 医疗设备专用
- **Warehouse**: 仓库管理专用

## 🔍 工作原理

### RxJS 事件流处理

```typescript
// 键盘事件 → KeyInfo 对象
const keySubject = new Subject<KeyInfo>();

// 扫码数据累积和分析
const keyArray$ = keySubject.pipe(
  scan((acc: ScanData, curr: KeyInfo) => {
    if (curr.key === "Enter") {
      acc.out = acc.buf;  // 扫码完成
      acc.buf = [];
    } else {
      acc.buf.push(curr); // 继续累积
      acc.out = [];
    }
    return acc;
  }),
  filter((acc: ScanData) => acc.out.length > 0),
  map((acc: ScanData) => acc.out)
);
```

### GS1 控制字符处理

- **F8 键** → `\x1D` (GS 分隔符)
- **特殊字符映射**: 处理中文输入法下的键盘事件
- **数据格式化**: 将控制字符转换为可见格式

### 扫码完成判断

- **Enter 键**: 标准扫码枪结束符
- **超时机制**: 防止数据丢失
- **长度验证**: 最小/最大长度检查

## 🚨 注意事项

1. **聚焦状态**: 组件必须获得焦点才能接收键盘事件
2. **扫码枪配置**: 确保扫码枪以 Enter 结尾
3. **GS1 分隔符**: F8 键会被转换为 GS 分隔符 (`\x1D`)
4. **性能考虑**: 使用 `clearAfterScan` 避免内存累积
5. **错误处理**: 始终提供 `onError` 回调处理异常

## 🔧 故障排除

### 扫码无响应
- 检查组件是否获得焦点 (蓝色边框)
- 确认扫码枪配置正确
- 验证 `disabled` 属性为 `false`

### 数据格式问题
- 检查 `minLength` 和 `maxLength` 设置
- 查看 `onError` 回调的错误信息
- 使用测试样例验证组件功能

### 性能问题
- 设置 `clearAfterScan: true`
- 合理设置 `timeout` 值
- 避免在回调中执行重量级操作

## 🎉 总结

ScanBox 组件提供了完整的扫码解决方案，支持：

- ✅ **专业扫码**: 工业级扫码枪支持
- ✅ **标准兼容**: GS1 标准完整支持  
- ✅ **类型安全**: TypeScript 完整类型定义
- ✅ **高度可定制**: 丰富的配置选项
- ✅ **测试友好**: 内置测试样例和 Storybook
- ✅ **生产就绪**: 错误处理和性能优化

立即开始使用，为你的应用添加专业的扫码功能！ 🚀
