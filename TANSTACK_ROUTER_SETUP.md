# 🧭 TanStack Router 基于文件的路由配置

这个项目已经成功配置了 TanStack Router 的基于文件的路由系统，提供类型安全、现代化的路由管理体验。

## 🎯 完成的配置

### 1. 依赖安装
```bash
npm install @tanstack/react-router @tanstack/router-plugin @tanstack/router-vite-plugin
npm install -D @tanstack/router-devtools @vitejs/plugin-react
```

### 2. Vite 配置 (`vite.renderer.config.ts`)
```typescript
import { defineConfig } from 'vite';
import path from 'path';
import react from '@vitejs/plugin-react';
import { tanstackRouter } from '@tanstack/router-plugin/vite';

export default defineConfig({
  plugins: [
    tanstackRouter({
      target: 'react',
      autoCodeSplitting: true,
      routesDirectory: './src/routes',
      generatedRouteTree: './src/routeTree.gen.ts',
    }),
    react(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@/components': path.resolve(__dirname, 'src/components'),
      '@/common': path.resolve(__dirname, 'src/common'),
      '@/utils': path.resolve(__dirname, 'src/utils'),
      '@/main': path.resolve(__dirname, 'src/main'),
      '@/routes': path.resolve(__dirname, 'src/routes'),
    },
  },
});
```

### 3. TypeScript 配置更新
- 添加了 `@/routes/*` 路径别名
- 包含生成的路由树文件 `src/routeTree.gen.ts`

## 📁 路由文件结构

```
src/routes/
├── __root.tsx          # 根布局组件
├── index.tsx           # 主页路由 (/)
├── user.tsx            # 用户管理 (/user)
├── file.tsx            # 文件管理 (/file)
├── system.tsx          # 系统信息 (/system)
├── task.tsx            # 任务管理 (/task)
└── advanced.tsx        # 高级功能 (/advanced)
```

## 🔧 主要功能

### 1. 类型安全的路由
```typescript
// 自动生成的路由类型，提供完整的类型安全
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
```

### 2. 导航菜单 (`__root.tsx`)
- 响应式导航栏
- 活动状态高亮
- 完整的页面布局结构

### 3. 页面路由组件
每个路由页面都包含：
- 页面标题和描述
- 对应的演示组件
- 独立的日志系统
- 统一的 UI 设计

### 4. 自动代码分割
- 启用了 `autoCodeSplitting`
- 每个路由组件按需加载
- 优化应用性能

### 5. 开发工具集成
- TanStack Router DevTools
- 实时路由状态检查
- 路由树可视化

## 🚀 路由特性

### 文件命名约定
- `__root.tsx` - 根布局路由
- `index.tsx` - 索引路由 (`/`)
- `{name}.tsx` - 命名路由 (`/{name}`)
- 支持动态路由：`$param.tsx`
- 支持嵌套路由：目录结构映射

### 导航方式
```typescript
// 使用 Link 组件
<Link to="/user">用户管理</Link>

// 使用 useNavigate Hook
const navigate = useNavigate();
navigate({ to: '/system' });

// 类型安全的参数传递
<Link to="/posts/$postId" params={{ postId: '123' }}>
```

### 路由保护和加载器
```typescript
export const Route = createFileRoute('/protected')({
  // 路由前置检查
  beforeLoad: ({ context }) => {
    if (!context.auth.isAuthenticated) {
      throw redirect({ to: '/login' });
    }
  },
  // 数据预加载
  loader: async () => {
    return await fetchUserData();
  },
  component: ProtectedComponent,
});
```

## 📋 页面路由映射

| 路由路径 | 文件路径 | 组件描述 |
|---------|---------|----------|
| `/` | `routes/index.tsx` | 应用主页，功能概览 |
| `/user` | `routes/user.tsx` | 用户管理演示 |
| `/file` | `routes/file.tsx` | 文件操作演示 |
| `/system` | `routes/system.tsx` | 系统信息展示 |
| `/task` | `routes/task.tsx` | 任务管理演示 |
| `/advanced` | `routes/advanced.tsx` | 高级功能演示 |

## 🔄 自动生成

### 路由树生成 (`routeTree.gen.ts`)
- 自动扫描 `src/routes/` 目录
- 生成类型安全的路由树
- 支持热重载和增量更新
- 提供完整的 TypeScript 支持

## 🎨 UI 增强

### 导航体验
- 活动路由高亮显示
- 响应式设计适配
- 统一的视觉风格
- 流畅的页面切换

### 布局结构
- 全局导航栏
- 主内容区域
- 开发工具集成
- 移动端友好

## 🛠️ 开发体验

### 热重载支持
- 路由文件变更自动重新生成
- 即时预览路由更改
- 类型检查实时反馈

### 调试工具
- Router DevTools 可视化
- 路由状态实时监控
- 导航历史记录

### 类型安全
- 完整的 TypeScript 支持
- 编译时路由验证
- 智能自动补全

## 🚦 使用指南

### 添加新路由
1. 在 `src/routes/` 目录创建新的 `.tsx` 文件
2. 使用 `createFileRoute` 定义路由
3. 路由树自动更新
4. 在导航菜单中添加链接

### 嵌套路由
```
src/routes/
├── posts.tsx           # /posts
├── posts/
│   ├── index.tsx       # /posts (exact)
│   └── $postId.tsx     # /posts/:postId
```

### 路由参数
```typescript
// 文件：routes/posts/$postId.tsx
export const Route = createFileRoute('/posts/$postId')({
  component: ({ params }) => {
    const { postId } = params;
    return <div>Post ID: {postId}</div>;
  },
});
```

## 🔍 故障排除

### 常见问题
1. **路由树未生成**: 确保 Vite 插件正确配置
2. **类型错误**: 检查 `routeTree.gen.ts` 是否存在
3. **导航失效**: 验证路由路径和文件名匹配

### 调试步骤
1. 检查控制台错误信息
2. 验证路由文件语法
3. 重启开发服务器
4. 清除缓存重新构建

## 🎉 完成状态

✅ **TanStack Router 配置完成**
- 基于文件的路由系统
- 类型安全导航
- 自动代码分割
- 开发工具集成
- 响应式布局
- 完整功能演示

现在你可以享受现代化、类型安全的路由系统带来的开发体验！🚀
