# Electron IPC 最佳实践演示

这是一个完整的 Electron 应用，展示了进程间通信（IPC）的最佳实践和安全设计模式。

## 🚀 特性

- **安全的上下文隔离**: 启用 `contextIsolation`，禁用 `nodeIntegration`
- **类型安全**: 完整的 TypeScript 类型定义
- **统一的通道管理**: 集中化的 IPC 通道定义
- **输入验证**: 使用 Zod 进行数据校验
- **错误处理**: 完善的错误处理和重试机制
- **实时事件**: 双向事件通信和广播
- **高级功能**: 缓存、队列管理、批量处理

## 📁 项目结构

```
src/
├── common/
│   └── ipc.ts              # IPC 通道和类型定义
├── main/
│   ├── services/           # 业务逻辑服务层
│   │   ├── user.ts        # 用户管理服务
│   │   ├── file.ts        # 文件操作服务
│   │   ├── system.ts      # 系统信息服务
│   │   └── task.ts        # 任务管理服务
│   └── ipc/
│       └── handlers.ts     # IPC 处理器注册
├── preload.ts              # 安全桥接层
├── utils/
│   └── ipcHelper.ts        # IPC 工具函数
├── components/             # React 演示组件
│   ├── UserDemo.tsx       # 用户管理演示
│   ├── FileDemo.tsx       # 文件操作演示
│   ├── SystemDemo.tsx     # 系统信息演示
│   ├── TaskDemo.tsx       # 任务管理演示
│   ├── AdvancedDemo.tsx   # 高级功能演示
│   └── LogViewer.tsx      # 日志查看器
└── App.tsx                 # 主应用组件
```

## 🏗️ 架构设计

### 1. 三层架构

```
Renderer Process → Preload Script → Main Process
     (React)    →   (Bridge)     →   (Node.js)
```

- **Renderer**: 用户界面，只能通过 preload 暴露的 API 与主进程通信
- **Preload**: 安全桥接层，暴露类型安全的函数而非原始 IPC 通道
- **Main**: 业务逻辑处理，包含服务层和 IPC 处理器

### 2. 通道管理

所有 IPC 通道在 `src/common/ipc.ts` 中集中定义：

```typescript
export const IPC = {
  user: {
    getById: 'user:getById',
    create: 'user:create',
    // ...
  },
  // ...
} as const;
```

### 3. 类型安全

完整的 TypeScript 类型定义确保编译时类型检查：

```typescript
interface CreateUserReq {
  name: string;
  email: string;
  role: 'admin' | 'user';
}

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: number;
}
```

## 🛠️ 主要功能

### 用户管理 (CRUD)
- 创建、读取、更新、删除用户
- 实时事件通知（创建、更新、删除）
- 输入验证和错误处理

### 文件操作
- 安全的文件读写（路径验证）
- 进度监控
- 支持不同编码格式

### 系统信息
- 获取系统硬件信息
- 打开文件夹
- 显示系统通知

### 任务管理
- 异步任务创建和执行
- 实时进度更新
- 任务状态管理（进行中、完成、失败、取消）

### 高级功能
- **重试机制**: 自动重试失败的请求，支持指数退避
- **批量处理**: 并发控制的批量 IPC 调用
- **缓存系统**: TTL（生存时间）缓存
- **队列管理**: 优先级队列和并发控制

## 🔒 安全特性

1. **上下文隔离**: `contextIsolation: true`
2. **Node.js 隔离**: `nodeIntegration: false`
3. **输入验证**: 使用 Zod schema 验证所有输入
4. **路径安全**: 文件操作限制在安全目录内
5. **API 门面**: 不暴露原始 IPC 通道，只暴露函数

## 🚀 运行项目

1. 安装依赖：
```bash
npm install
```

2. 启动开发服务器：
```bash
npm start
```

3. 打包应用：
```bash
npm run package
```

## 📊 演示功能

应用包含以下演示模块：

1. **用户管理**: 展示 CRUD 操作和实时事件
2. **文件操作**: 安全的文件读写和进度监控
3. **系统信息**: 系统信息获取和系统功能调用
4. **任务管理**: 长时间运行任务的管理和监控
5. **高级功能**: 错误处理、重试、缓存等高级特性

## 🔧 使用指南

### 添加新的 IPC 功能

1. **定义类型和通道** (`src/common/ipc.ts`)：
```typescript
export const IPC = {
  // 现有定义...
  newFeature: {
    action: 'newFeature:action',
  },
};

export interface NewFeatureReq {
  param: string;
}
```

2. **创建服务** (`src/main/services/newFeature.ts`)：
```typescript
export const newFeatureService = {
  async performAction(param: string) {
    // 业务逻辑
    return result;
  },
};
```

3. **注册处理器** (`src/main/ipc/handlers.ts`)：
```typescript
ipcMain.handle(
  IPC.newFeature.action,
  safeHandler(NewFeatureReqSchema, async (req: NewFeatureReq) => {
    return await newFeatureService.performAction(req.param);
  })
);
```

4. **暴露 API** (`src/preload.ts`)：
```typescript
const api = {
  // 现有 API...
  newFeature: {
    async action(param: string) {
      return invokeWithTimeout(IPC.newFeature.action, { param });
    },
  },
};
```

5. **在渲染进程中使用**：
```typescript
const result = await window.electronAPI.newFeature.action('test');
```

## 📚 最佳实践

1. **始终使用类型安全的 API**，避免直接使用 `ipcRenderer`
2. **集中管理通道名称**，避免魔法字符串
3. **验证所有输入**，使用 Zod 或类似库
4. **妥善处理错误**，提供有意义的错误信息
5. **清理事件监听器**，避免内存泄漏
6. **使用缓存和重试**，提高用户体验
7. **限制文件访问**，只允许访问安全目录

## 🤝 贡献

欢迎提交 Issue 和 Pull Request 来改进这个演示项目。

## 📄 许可证

MIT License
