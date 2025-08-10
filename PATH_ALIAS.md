# 📁 路径别名配置说明

这个项目已经配置了类似 Next.js 的路径别名系统，允许使用 `@/` 前缀来引用 `src/` 目录下的文件。

## 🎯 支持的路径别名

### 主要别名
- `@/*` → `src/*` - 引用 src 目录下的任何文件
- `@/components/*` → `src/components/*` - 引用组件
- `@/common/*` → `src/common/*` - 引用公共类型和工具
- `@/utils/*` → `src/utils/*` - 引用工具函数
- `@/main/*` → `src/main/*` - 引用主进程代码

## 📖 使用示例

### 组件导入
```typescript
// ❌ 原来的相对路径导入
import UserDemo from './components/UserDemo';
import FileDemo from '../components/FileDemo';
import { User } from '../../common/ipc';

// ✅ 使用别名导入
import UserDemo from '@/components/UserDemo';
import FileDemo from '@/components/FileDemo';
import { User } from '@/common/ipc';
```

### 工具函数导入
```typescript
// ❌ 原来的相对路径导入
import { callIpcWithRetry } from '../utils/ipcHelper';

// ✅ 使用别名导入
import { callIpcWithRetry } from '@/utils/ipcHelper';
```

### 主进程服务导入
```typescript
// ❌ 原来的相对路径导入
import { userService } from '../services/user';
import { IPC } from '../../common/ipc';

// ✅ 使用别名导入
import { userService } from '@/main/services/user';
import { IPC } from '@/common/ipc';
```

## ⚙️ 配置文件

路径别名配置涉及以下文件：

### 1. TypeScript 配置 (`tsconfig.json`)
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@/components/*": ["src/components/*"],
      "@/common/*": ["src/common/*"],
      "@/utils/*": ["src/utils/*"],
      "@/main/*": ["src/main/*"]
    }
  }
}
```

### 2. Vite 渲染进程配置 (`vite.renderer.config.ts`)
```typescript
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@/components': path.resolve(__dirname, 'src/components'),
      '@/common': path.resolve(__dirname, 'src/common'),
      '@/utils': path.resolve(__dirname, 'src/utils'),
      '@/main': path.resolve(__dirname, 'src/main'),
    },
  },
});
```

### 3. Vite 主进程配置 (`vite.main.config.ts`)
```typescript
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      // ... 其他别名
    },
  },
});
```

### 4. Vite Preload 配置 (`vite.preload.config.ts`)
```typescript
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      // ... 其他别名
    },
  },
});
```

### 5. Storybook 配置 (`.storybook/main.js`)
```javascript
export default {
  async viteFinal(config) {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, '../src'),
      // ... 其他别名
    };
    return config;
  },
};
```

### 6. Vitest 配置 (`vitest.config.ts`)
```typescript
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(dirname, 'src'),
      // ... 其他别名
    },
  },
});
```

## 🔧 IDE 支持

### VS Code
由于已经配置了 `tsconfig.json`，VS Code 会自动识别路径别名：
- ✅ 自动补全
- ✅ 跳转到定义
- ✅ 重构支持
- ✅ 错误检查

### 其他 IDE
大多数支持 TypeScript 的 IDE（如 WebStorm、Vim/Neovim 等）都会通过 `tsconfig.json` 自动识别路径别名。

## 📂 项目结构示例

```
src/
├── common/
│   └── ipc.ts              # @/common/ipc
├── components/
│   ├── UserDemo.tsx        # @/components/UserDemo
│   ├── FileDemo.tsx        # @/components/FileDemo
│   └── SystemDemo.tsx      # @/components/SystemDemo
├── main/
│   ├── services/
│   │   ├── user.ts         # @/main/services/user
│   │   └── file.ts         # @/main/services/file
│   └── ipc/
│       └── handlers.ts     # @/main/ipc/handlers
├── utils/
│   └── ipcHelper.ts        # @/utils/ipcHelper
├── App.tsx                 # @/App
├── main.ts                 # @/main
└── preload.ts              # @/preload
```

## 🚀 优势

### 1. **更清晰的导入路径**
```typescript
// ❌ 难以理解的相对路径
import { User } from '../../../common/ipc';

// ✅ 清晰的绝对路径
import { User } from '@/common/ipc';
```

### 2. **重构友好**
- 移动文件不会破坏导入路径
- IDE 重构工具更容易处理
- 减少路径错误

### 3. **一致的导入风格**
- 团队成员使用相同的导入方式
- 代码审查更容易
- 新成员更容易理解项目结构

### 4. **减少输入错误**
- 自动补全更准确
- 减少 `../../../` 类型的路径错误
- TypeScript 类型检查更有效

## 📋 迁移指南

如果你有现有的相对路径导入，可以逐步迁移：

### 1. 全局替换（推荐）
使用 VS Code 的全局搜索替换功能：
```
查找: from './components/
替换: from '@/components/

查找: from '../common/
替换: from '@/common/

查找: from '../../common/
替换: from '@/common/
```

### 2. 逐文件迁移
手动更新每个文件的导入语句，确保一致性。

## 🔍 故障排除

### 问题：导入路径显示红色下划线
**解决方案：**
1. 确保 TypeScript 配置正确
2. 重启 IDE/语言服务器
3. 检查文件路径是否正确

### 问题：Storybook 中别名不工作
**解决方案：**
1. 确保 `.storybook/main.js` 中的 `viteFinal` 配置正确
2. 重启 Storybook 开发服务器

### 问题：测试中别名不工作
**解决方案：**
1. 确保 `vitest.config.ts` 配置正确
2. 检查测试运行环境

## 🎉 实际应用

项目中的所有文件已经更新为使用路径别名：

- ✅ `src/App.tsx` - 使用 `@/components/*` 导入组件
- ✅ `src/components/*` - 使用 `@/common/ipc` 导入类型
- ✅ `src/main/ipc/handlers.ts` - 使用 `@/main/services/*` 导入服务
- ✅ `src/utils/ipcHelper.ts` - 使用 `@/common/ipc` 导入类型

现在你可以在整个项目中享受更清晰、更易维护的导入路径了！🎊
