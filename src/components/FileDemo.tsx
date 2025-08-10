import React, { useState, useEffect, useRef } from 'react';
import { FileProgressData } from '../common/ipc';

interface FileDemoProps {
  onLog: (message: string, type?: 'info' | 'success' | 'error') => void;
}

const FileDemo: React.FC<FileDemoProps> = ({ onLog }) => {
  const [filePath, setFilePath] = useState('test.txt');
  const [fileContent, setFileContent] = useState('Hello, World! 这是一个测试文件。\n\n时间: ' + new Date().toLocaleString());
  const [readContent, setReadContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<FileProgressData | null>(null);
  
  // 使用 ref 来存储 onLog 函数，避免依赖变化
  const onLogRef = useRef(onLog);
  onLogRef.current = onLog;

  // 监听文件操作进度
  useEffect(() => {
    const unsubscribe = window.electronAPI.file.onProgress((progressData) => {
      setProgress(progressData);
      onLogRef.current(`文件操作进度: ${progressData.status} - ${progressData.progress}%`, 'info');
    });

    return () => {
      unsubscribe();
    };
  }, []); // 移除 onLog 依赖

  // 写入文件
  const writeFile = async () => {
    if (!filePath || !fileContent) {
      onLog('请输入文件路径和内容', 'error');
      return;
    }

    setLoading(true);
    try {
      const response = await window.electronAPI.file.write(filePath, fileContent);
      if (response.success) {
        onLog(`文件 ${filePath} 写入成功`, 'success');
      } else {
        onLog(`写入文件失败: ${response.error}`, 'error');
      }
    } catch (error) {
      onLog(`写入文件失败: ${error instanceof Error ? error.message : String(error)}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // 读取文件
  const readFile = async () => {
    if (!filePath) {
      onLog('请输入文件路径', 'error');
      return;
    }

    setLoading(true);
    try {
      const response = await window.electronAPI.file.read(filePath);
      if (response.success && response.data) {
        setReadContent(response.data);
        onLog(`文件 ${filePath} 读取成功`, 'success');
      } else {
        onLog(`读取文件失败: ${response.error}`, 'error');
      }
    } catch (error) {
      onLog(`读取文件失败: ${error instanceof Error ? error.message : String(error)}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // 检查文件是否存在
  const checkFileExists = async () => {
    if (!filePath) {
      onLog('请输入文件路径', 'error');
      return;
    }

    try {
      const response = await window.electronAPI.file.exists(filePath);
      if (response.success) {
        const exists = response.data;
        onLog(`文件 ${filePath} ${exists ? '存在' : '不存在'}`, 'info');
      } else {
        onLog(`检查文件失败: ${response.error}`, 'error');
      }
    } catch (error) {
      onLog(`检查文件失败: ${error instanceof Error ? error.message : String(error)}`, 'error');
    }
  };

  // 删除文件
  const deleteFile = async () => {
    if (!filePath) {
      onLog('请输入文件路径', 'error');
      return;
    }

    if (!confirm(`确定要删除文件 ${filePath} 吗？`)) {
      return;
    }

    try {
      const response = await window.electronAPI.file.delete(filePath);
      if (response.success) {
        onLog(`文件 ${filePath} 删除成功`, 'success');
        setReadContent('');
      } else {
        onLog(`删除文件失败: ${response.error}`, 'error');
      }
    } catch (error) {
      onLog(`删除文件失败: ${error instanceof Error ? error.message : String(error)}`, 'error');
    }
  };

  // 测试大文件操作
  const testLargeFile = async () => {
    const largeContent = Array(10000).fill('这是一行测试内容，用于模拟大文件操作。\n').join('');
    const largePath = 'large-test.txt';
    
    setLoading(true);
    try {
      const response = await window.electronAPI.file.write(largePath, largeContent);
      if (response.success) {
        onLog(`大文件 ${largePath} 创建成功，大小约 ${Math.round(largeContent.length / 1024)} KB`, 'success');
      } else {
        onLog(`创建大文件失败: ${response.error}`, 'error');
      }
    } catch (error) {
      onLog(`创建大文件失败: ${error instanceof Error ? error.message : String(error)}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">文件操作演示</h2>
        <div className="text-sm text-gray-600">
          文件将保存在应用数据目录
        </div>
      </div>

      {/* 进度显示 */}
      {progress && (
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">操作进度</span>
            <span className="text-sm text-gray-600">{progress.status}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress.progress}%` }}
            ></div>
          </div>
          <div className="text-xs text-gray-600 mt-1">
            {progress.progress}%
          </div>
        </div>
      )}

      {/* 文件路径输入 */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">文件路径</h3>
        <div className="flex space-x-2">
          <input
            type="text"
            placeholder="文件路径 (相对于应用数据目录)"
            value={filePath}
            onChange={(e) => setFilePath(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={checkFileExists}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            检查存在
          </button>
        </div>
      </div>

      {/* 文件内容编辑 */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">文件内容</h3>
        <textarea
          placeholder="请输入文件内容..."
          value={fileContent}
          onChange={(e) => setFileContent(e.target.value)}
          rows={6}
          className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <div className="mt-4 space-x-2">
          <button
            onClick={writeFile}
            disabled={loading}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
          >
            {loading ? '写入中...' : '写入文件'}
          </button>
          <button
            onClick={testLargeFile}
            disabled={loading}
            className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 disabled:opacity-50"
          >
            测试大文件
          </button>
        </div>
      </div>

      {/* 文件读取 */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">读取文件</h3>
          <div className="space-x-2">
            <button
              onClick={readFile}
              disabled={loading}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            >
              {loading ? '读取中...' : '读取文件'}
            </button>
            <button
              onClick={deleteFile}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            >
              删除文件
            </button>
          </div>
        </div>
        
        {readContent ? (
          <div>
            <div className="text-sm text-gray-600 mb-2">
              内容长度: {readContent.length} 字符
            </div>
            <pre className="bg-gray-50 p-3 rounded border max-h-64 overflow-auto text-sm">
              {readContent}
            </pre>
          </div>
        ) : (
          <div className="text-gray-500 italic">
            暂无内容，请先读取文件
          </div>
        )}
      </div>

      {/* 路径信息 */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">📍 文件保存路径</h3>
        <div className="bg-blue-50 p-4 rounded-lg mb-4">
          <p className="text-blue-800 text-sm mb-2">
            <strong>💡 重要信息：</strong> 文件操作受到安全限制，只能在以下目录中进行：
          </p>
          <ul className="text-blue-700 text-sm space-y-1">
            <li>• <strong>应用数据目录</strong>：专门为此应用分配的安全目录</li>
            <li>• <strong>文档目录</strong>：用户的文档文件夹</li>
            <li>• <strong>相对路径</strong>：会自动保存到应用数据目录下</li>
          </ul>
          <p className="text-blue-600 text-xs mt-2">
            具体路径信息请查看终端/控制台输出，应用启动时会自动打印详细路径。
          </p>
        </div>
      </div>

      {/* 预设文件操作 */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">快速操作</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => {
              setFilePath('config.json');
              setFileContent(JSON.stringify({
                appName: "Simple WMS",
                version: "1.0.0",
                theme: "light",
                language: "zh-CN"
              }, null, 2));
            }}
            className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
          >
            创建配置文件
          </button>
          <button
            onClick={() => {
              setFilePath('notes.txt');
              setFileContent(`# 工作笔记

日期: ${new Date().toLocaleDateString()}

## 今日任务
- [ ] 完成用户管理功能
- [ ] 测试文件操作
- [ ] 检查系统信息

## 备注
这是一个测试笔记文件。
`);
            }}
            className="px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600"
          >
            创建笔记文件
          </button>
          <button
            onClick={() => {
              setFilePath('data.csv');
              setFileContent(`姓名,邮箱,角色,创建时间
张三,zhang@example.com,用户,2024-01-01
李四,li@example.com,管理员,2024-01-02
王五,wang@example.com,用户,2024-01-03
`);
            }}
            className="px-4 py-2 bg-teal-500 text-white rounded hover:bg-teal-600"
          >
            创建 CSV 文件
          </button>
        </div>
      </div>
    </div>
  );
};

export default FileDemo;
