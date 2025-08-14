# 安装和测试指南

## 安装依赖

在使用自动更新功能之前，请先安装所需的依赖：

```bash
# 安装所有依赖（包括新添加的 electron-updater）
npm install

# 或者单独安装新的依赖
npm install electron-updater @electron-forge/publisher-generic
```

## 开发环境测试

### 1. 启动开发服务器
```bash
npm run dev
```

### 2. 测试更新功能
1. 在应用中导航到"自动更新"页面
2. 点击"检查更新"按钮
3. 在开发环境中，更新检查会被跳过（控制台会显示"开发环境，跳过更新检查"）

### 3. 强制测试更新（可选）
如果需要在开发环境测试更新功能，可以临时修改 `src/main.ts` 第111-119行：

```typescript
// 临时注释掉这个条件以在开发环境测试
// if (app.isPackaged) {
setTimeout(() => {
  updaterService.checkForUpdates().catch((error) => {
    console.error('启动时检查更新失败:', error);
  });
}, 5000);
// } else {
//   console.log('开发环境，跳过更新检查');
// }
```

⚠️ **注意**: 测试完成后记得恢复原始代码。

## 生产环境构建

### 1. 构建应用
```bash
# 构建所有平台（需要在对应平台上运行）
npm run make

# 或者使用 electron-forge 的构建命令
npx electron-forge make
```

### 2. 发布到OSS
确保已配置GitHub Secrets后，推送版本标签即可触发自动构建和发布：

```bash
# 更新版本号
npm version patch  # 或 minor, major

# 创建标签并推送
git push origin main --tags
```

## 验证安装

运行以下命令验证所有依赖都正确安装：

```bash
# 检查依赖
npm list electron-updater
npm list @electron-forge/publisher-generic

# 检查类型定义
npx tsc --noEmit
```

如果看到任何错误，请重新运行 `npm install`。

## 常见问题

### Q: 提示找不到 electron-updater 模块
A: 运行 `npm install` 安装所有依赖。

### Q: TypeScript 类型错误
A: 确保安装了所有依赖，特别是类型定义文件。

### Q: 构建失败
A: 检查是否所有依赖都已正确安装，确保 Node.js 版本兼容。

### Q: 更新检查总是失败
A: 在开发环境中这是正常的。在生产环境中确保网络连接正常且OSS配置正确。
