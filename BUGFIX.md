# 🐛 Bug 修复说明：重复 Key 错误

## 问题描述

在应用运行时出现了 React 警告：
```
encountered two children with the same key, `297`. Keys should be unique so that components maintain their identity across updates.
```

## 问题原因

这个问题是由于日志系统中的状态管理不当导致的：

### 1. 原始问题
```typescript
// 问题代码 - App.tsx
const addLog = useCallback((message: string, type = 'info') => {
  const newLog: LogEntry = {
    id: logIdCounter,  // 使用状态作为 ID
    timestamp: new Date(),
    message,
    type,
  };
  setLogs(prev => [...prev, newLog]);
  setLogIdCounter(prev => prev + 1);
}, [logIdCounter]); // 依赖 logIdCounter 状态！
```

### 2. 连锁反应
由于 `addLog` 函数依赖 `logIdCounter`，每次添加日志时：
1. `logIdCounter` 更新
2. `addLog` 函数重新创建
3. 依赖 `addLog` 的 `useEffect` 重新执行
4. 重复添加事件监听器
5. 产生重复的日志条目和相同的 ID

### 3. 受影响的组件
```typescript
// 问题代码 - 各个 Demo 组件
useEffect(() => {
  const unsubscribe = window.electronAPI.user.onCreated((user) => {
    onLog(`收到用户创建事件: ${user.name}`, 'info'); // 重复执行
  });
  return () => unsubscribe();
}, [onLog]); // 依赖 onLog 函数！
```

## 解决方案

### 1. 修复日志 ID 生成
```typescript
// 修复后 - App.tsx
const addLog = useCallback((message: string, type = 'info') => {
  setLogs(prev => {
    // 使用时间戳 + 随机数生成唯一 ID，避免重复
    const uniqueId = Date.now() + Math.random();
    const newLog: LogEntry = {
      id: uniqueId,
      timestamp: new Date(),
      message,
      type,
    };
    return [...prev, newLog];
  });
}, []); // 无依赖，稳定引用
```

### 2. 修复组件依赖
```typescript
// 修复后 - 各个 Demo 组件
const SomeDemo: React.FC<Props> = ({ onLog }) => {
  // 使用 ref 存储 onLog 引用
  const onLogRef = useRef(onLog);
  onLogRef.current = onLog;

  useEffect(() => {
    const unsubscribe = window.electronAPI.user.onCreated((user) => {
      onLogRef.current(`收到用户创建事件: ${user.name}`, 'info');
    });
    return () => unsubscribe();
  }, []); // 无依赖，只执行一次
};
```

## 修复效果

### 修复前的问题
- ❌ 重复的日志条目
- ❌ 相同的 React key 值
- ❌ 重复的事件监听器
- ❌ 性能问题

### 修复后的改善
- ✅ 唯一的日志 ID
- ✅ 稳定的组件渲染
- ✅ 单次事件监听器注册
- ✅ 更好的性能

## 最佳实践

### 1. useCallback 依赖管理
```typescript
// ❌ 错误：不必要的依赖导致重新创建
const callback = useCallback(() => {
  // 使用状态
}, [someState]);

// ✅ 正确：使用函数式更新避免依赖
const callback = useCallback(() => {
  setState(prev => {
    // 基于前一个状态更新
    return newState;
  });
}, []); // 无依赖
```

### 2. useEffect 中使用回调函数
```typescript
// ❌ 错误：依赖外部函数
useEffect(() => {
  externalCallback();
}, [externalCallback]);

// ✅ 正确：使用 ref 存储函数引用
const callbackRef = useRef(externalCallback);
callbackRef.current = externalCallback;

useEffect(() => {
  callbackRef.current();
}, []); // 稳定的依赖数组
```

### 3. 唯一 ID 生成
```typescript
// ❌ 错误：可能重复的 ID
const id = Math.random();
const id = Date.now();
const id = items.length + 1;

// ✅ 正确：组合多个因素确保唯一性
const id = Date.now() + Math.random();
const id = `${Date.now()}-${Math.random()}`;
const id = crypto.randomUUID(); // 现代浏览器
```

## 预防措施

1. **审查 useCallback 依赖**：确保依赖数组中只包含真正需要的值
2. **稳定的函数引用**：对于传递给子组件的回调函数，使用 ref 或其他方式保持引用稳定
3. **唯一 ID 策略**：使用可靠的方法生成唯一标识符
4. **性能监控**：使用 React DevTools 监控组件重渲染
5. **单元测试**：为状态更新逻辑编写测试用例

## 相关文件

修复涉及以下文件：
- `src/App.tsx` - 主要的日志状态管理
- `src/components/UserDemo.tsx` - 用户事件监听
- `src/components/FileDemo.tsx` - 文件进度监听  
- `src/components/TaskDemo.tsx` - 任务进度监听

这个修复确保了应用的稳定性，消除了 React 警告，并提升了整体性能。
