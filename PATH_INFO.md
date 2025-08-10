# 📁 文件路径信息说明

这个文档说明了应用启动时会打印的文件路径信息以及如何查看这些信息。

## 🖥️ 启动时的控制台输出

当你运行 `npm start` 启动应用时，控制台会显示详细的路径信息：

### 1. 应用路径信息
```
=== 应用路径信息 ===
应用数据目录: /Users/[username]/Library/Application Support/simple-wms
文档目录: /Users/[username]/Documents
下载目录: /Users/[username]/Downloads
桌面目录: /Users/[username]/Desktop
临时目录: /tmp
应用程序目录: /Users/[username]/_git/mofelee/simple-wms/node_modules/electron/dist/Electron.app/Contents/MacOS/Electron
日志目录: /Users/[username]/Library/Logs/simple-wms
==================
```

### 2. IPC 处理器注册信息
```
=== IPC 处理器注册 ===
正在注册 IPC 处理器...
共注册 XX 个 IPC 通道:
  - user:getById
  - user:getAll
  - user:create
  - user:update
  - user:delete
  - file:read
  - file:write
  - file:exists
  - file:delete
  - system:getInfo
  - system:openFolder
  - system:showNotification
  - system:getAppPaths
  - task:create
  - task:getStatus
  - task:cancel
====================

✅ 所有 IPC 处理器注册完成！
```

### 3. 文件操作安全路径（首次文件操作时）
```
=== 文件操作安全路径 ===
允许的应用数据目录: /Users/[username]/Library/Application Support/simple-wms
允许的文档目录: /Users/[username]/Documents
文件将保存在以上目录中
=======================
```

## 🎯 如何查看路径信息

### 方法 1: 终端输出
1. 打开终端并运行 `npm start`
2. 查看终端中打印的路径信息
3. 应用启动后，这些信息会保留在终端历史中

### 方法 2: 应用内查看
1. 启动应用后，点击 "💻 系统信息" 标签
2. 查看 "📁 应用路径信息" 部分
3. 每个路径都有对应的 "打开" 按钮，可以直接在文件管理器中查看

### 方法 3: 日志面板
1. 应用启动时会在右侧日志面板显示相关信息
2. 包括启动成功消息和路径提示

## 📂 重要路径说明

### 应用数据目录
- **用途**: 应用专用的数据存储目录
- **安全性**: 完全安全，应用拥有完整权限
- **示例**: `/Users/[username]/Library/Application Support/simple-wms`
- **说明**: 相对路径的文件操作会默认保存到这里

### 文档目录
- **用途**: 用户的文档文件夹
- **安全性**: 受系统权限控制，需要用户授权
- **示例**: `/Users/[username]/Documents`
- **说明**: 适合保存用户文档类文件

### 其他目录
- **下载目录**: 用户的下载文件夹
- **桌面目录**: 用户的桌面文件夹
- **临时目录**: 系统临时文件目录
- **日志目录**: 应用日志文件目录

## 🔒 安全机制

### 路径验证
所有文件操作都会经过严格的路径验证：

```typescript
// 只允许在安全目录内操作
const allowedPaths = [appDataPath, documentsPath];
const isAllowed = allowedPaths.some(allowedPath => 
  normalizedPath.startsWith(path.normalize(allowedPath))
);

if (!isAllowed) {
  throw new Error('Access denied: Path not in allowed directories');
}
```

### 路径遍历防护
防止 `../` 类型的路径遍历攻击：

```typescript
if (normalizedPath.includes('..')) {
  throw new Error('Path traversal not allowed');
}
```

## 🛠️ 开发和调试

### 查看详细日志
1. 打开开发者工具 (F12)
2. 查看 Console 面板
3. 所有路径操作都会有详细日志

### 自定义路径
如果需要修改默认路径，可以在 `src/main/services/file.ts` 中调整：

```typescript
const appDataPath = app.getPath('userData');
const documentsPath = app.getPath('documents');
```

### 添加新的安全目录
在 `fileService.validatePath()` 函数中添加新的允许路径：

```typescript
const allowedPaths = [
  appDataPath, 
  documentsPath,
  // 添加新的安全路径
  app.getPath('downloads'),
];
```

## 📝 示例文件路径

当你在应用中进行文件操作时：

### 相对路径示例
- 输入: `config.json`
- 实际保存: `/Users/[username]/Library/Application Support/simple-wms/config.json`

### 子目录示例
- 输入: `data/users.json`
- 实际保存: `/Users/[username]/Library/Application Support/simple-wms/data/users.json`

### 绝对路径示例（文档目录）
- 输入: `/Users/[username]/Documents/myfile.txt`
- 实际保存: `/Users/[username]/Documents/myfile.txt`

## ⚠️ 注意事项

1. **首次运行**: 应用数据目录在首次运行时会自动创建
2. **权限问题**: 访问文档目录可能需要用户授权（macOS）
3. **路径分隔符**: 应用会自动处理不同操作系统的路径分隔符
4. **中文路径**: 支持包含中文字符的路径名
5. **空间限制**: 确保目标磁盘有足够的存储空间

通过这些路径信息，你可以准确知道文件保存在系统的哪个位置，方便进行文件管理和备份操作。
