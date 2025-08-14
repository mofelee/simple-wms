# 自动更新配置指南

本项目已集成自动更新功能，包括GitHub Action自动构建和阿里云OSS托管更新文件。

## 1. GitHub Secrets 配置

在GitHub仓库设置中添加以下Secrets：

1. `ALIYUN_ACCESS_KEY_ID`: 阿里云AccessKey ID
2. `ALIYUN_ACCESS_KEY_SECRET`: 阿里云AccessKey Secret

## 2. 阿里云OSS配置

### 创建OSS Bucket
1. 登录阿里云控制台
2. 进入对象存储OSS服务
3. 创建名为 `simple-wms` 的Bucket
4. 选择区域（建议选择靠近用户的区域）
5. 设置读写权限为"公共读"（允许用户下载更新文件）

### 配置加速域名
1. 在OSS Bucket设置中，找到"域名管理"
2. 启用"传输加速"功能
3. 使用加速域名：`simple-wms.oss-accelerate.aliyuncs.com`

### 创建AccessKey
1. 进入阿里云控制台 → 用户信息 → AccessKey管理
2. 创建新的AccessKey
3. 记录AccessKey ID和Secret（用于GitHub Secrets）

## 3. 发布流程

### 自动发布（推荐）
1. 修改 `package.json` 中的版本号
2. 创建并推送Git标签：
   ```bash
   git tag v1.1.2
   git push origin v1.1.2
   ```
3. GitHub Action将自动：
   - 构建Windows、macOS、Linux版本
   - 上传到阿里云OSS
   - 生成更新清单文件

### 手动发布
在GitHub仓库的Actions页面手动触发"Build and Deploy to Aliyun OSS"工作流。

## 4. 更新检查机制

应用会在以下时机检查更新：
- 应用启动5秒后（仅生产环境）
- 用户手动点击"检查更新"按钮

### 更新流程
1. 检查OSS上的 `latest.yml` 文件
2. 比较版本号
3. 如有新版本，提示用户下载
4. 用户确认后下载更新文件
5. 下载完成后提示重启应用
6. 重启后自动安装更新

## 5. 文件结构

OSS Bucket中的文件结构：
```
simple-wms/
├── latest.yml                              # 通用更新清单
├── latest-mac.yml                          # macOS更新清单
├── latest.exe.yml                          # Windows更新清单
├── 1.1.1/                                 # 版本目录
│   ├── simple-wms Setup 1.1.1.exe         # Windows安装包
│   ├── simple-wms-1.1.1-darwin-x64.zip    # macOS应用包
│   ├── simple-wms_1.1.1_amd64.deb         # Linux deb包
│   └── simple-wms-1.1.1.x86_64.rpm        # Linux rpm包
└── 1.1.2/                                 # 新版本目录
    └── ...
```

## 6. 测试更新功能

### 本地测试
1. 修改版本号并构建应用
2. 在开发者工具中手动调用更新检查：
   ```javascript
   // 在渲染进程控制台中执行
   window.electronAPI.updater.checkForUpdates()
   ```

### 生产测试
1. 发布一个测试版本
2. 安装并运行应用
3. 发布更高版本号的版本
4. 验证应用能够检测并下载更新

## 7. 故障排除

### 常见问题
1. **更新检查失败**
   - 检查网络连接
   - 验证OSS配置是否正确
   - 查看控制台错误日志

2. **下载失败**
   - 检查OSS文件权限
   - 验证文件是否存在
   - 检查网络防火墙设置

3. **安装失败**
   - 确保应用具有足够权限
   - 检查磁盘空间
   - 查看系统错误日志

### 调试模式
在开发环境中，更新检查会被跳过。如需测试，可以：
1. 设置环境变量 `NODE_ENV=production`
2. 或者修改主进程代码，移除 `app.isPackaged` 检查

## 8. 安全建议

1. 定期更新AccessKey
2. 限制AccessKey权限范围
3. 使用HTTPS传输
4. 验证更新文件的数字签名（可选）

## 9. 监控和日志

更新相关的日志会输出到：
- 主进程控制台（开发环境）
- 应用日志目录（生产环境）

可以通过以下方式查看日志：
```javascript
// 获取日志目录
app.getPath('logs')
```
