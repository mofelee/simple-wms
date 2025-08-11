import React, { useEffect, useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { PrinterStatus } from '@/common/ipc';
import { EscPosBuilder, createTestReceipt, createMultiLanguageTest, createSimpleReceipt, analyzeEscPosData } from '@/lib/escpos';

type PrinterConfig = import('@/common/ipc').PrinterConfig;

export const Route = createFileRoute('/printer')({
  component: PrinterPage,
});

function PrinterPage() {
  const [config, setConfig] = useState<PrinterConfig>({
    printerIp: '192.168.1.100',
    printerPort: 9100,
    httpPort: 18080,
    enabled: true,
  });
  const [status, setStatus] = useState<{ httpRunning: boolean; httpPort?: number; lastError?: string }>({ httpRunning: false });
  const [loading, setLoading] = useState(false);
  const [testMode, setTestMode] = useState<'simple' | 'receipt' | 'multilang' | 'custom'>('custom');
  const [customText, setCustomText] = useState<string>('测试打印内容\n请在此输入您要打印的文本');
  const [showDebug, setShowDebug] = useState<boolean>(false);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      // 详细的调试信息
      console.log('🔍 PrinterPage 组件加载中...');
      console.log('📋 检查 window 对象:', typeof window);
      console.log('📋 检查 window.electronAPI:', typeof window.electronAPI, window.electronAPI);
      
      // 检查 electronAPI 是否可用
      if (!window.electronAPI) {
        console.error('❌ window.electronAPI 未定义，请检查 preload 脚本是否正确加载');
        alert('错误：Electron API 未加载，请重启应用程序');
        return;
      }
      
      console.log('📋 检查 window.electronAPI.printer:', typeof window.electronAPI.printer, window.electronAPI.printer);
      
      if (!window.electronAPI.printer) {
        console.error('❌ window.electronAPI.printer 未定义，请检查 preload 脚本中的 printer API');
        alert('错误：打印机 API 未加载，请重启应用程序');
        return;
      }

      try {
        console.log('📞 调用 printer.getConfig()...');
        const res = await window.electronAPI.printer.getConfig();
        console.log('📞 getConfig 结果:', res);
        if (res.success && res.data && mounted) setConfig(res.data as PrinterConfig);
        
        console.log('📞 调用 printer.getStatus()...');
        const st = await window.electronAPI.printer.getStatus();
        console.log('📞 getStatus 结果:', st);
        if (st.success && st.data && mounted) setStatus(st.data as { httpRunning: boolean; httpPort?: number; lastError?: string });
      } catch (error) {
        console.error('❌ 加载配置失败:', error);
        alert('加载配置失败，请检查后端服务');
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const save = async () => {
    setLoading(true);
    try {
      // 检查 electronAPI 是否可用
      if (!window.electronAPI || !window.electronAPI.printer) {
        throw new Error('Electron API 未加载，请重启应用程序');
      }

      const res = await window.electronAPI.printer.setConfig(config);
      if (!res.success) throw new Error(res.error || '保存失败');
      
      // 保存成功，显示提示并重新加载状态
      alert('配置保存成功！');
      
      // 重新加载配置和状态
      const configRes = await window.electronAPI.printer.getConfig();
      if (configRes.success && configRes.data) {
        setConfig(configRes.data as PrinterConfig);
      }
      
      const statusRes = await window.electronAPI.printer.getStatus();
      if (statusRes.success && statusRes.data) {
        setStatus(statusRes.data as { httpRunning: boolean; httpPort?: number; lastError?: string });
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '保存配置时发生未知错误';
      alert(`保存失败：${errorMsg}`);
      console.error('保存配置失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const startHttp = async () => {
    setLoading(true);
    try {
      // 检查 electronAPI 是否可用
      if (!window.electronAPI || !window.electronAPI.printer) {
        alert('Electron API 未加载，请重启应用程序');
        return;
      }

      const res = await window.electronAPI.printer.startHttp(config.httpPort);
      if (res.success && res.data) setStatus(res.data as PrinterStatus);
    } catch (error) {
      console.error('启动 HTTP 服务失败:', error);
      alert('启动 HTTP 服务失败');
    } finally {
      setLoading(false);
    }
  };

  const stopHttp = async () => {
    setLoading(true);
    try {
      // 检查 electronAPI 是否可用
      if (!window.electronAPI || !window.electronAPI.printer) {
        alert('Electron API 未加载，请重启应用程序');
        return;
      }

      const res = await window.electronAPI.printer.stopHttp();
      if (res.success && res.data) setStatus(res.data as PrinterStatus);
    } catch (error) {
      console.error('停止 HTTP 服务失败:', error);
      alert('停止 HTTP 服务失败');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 生成测试数据
   */
  const generateTestData = (): { data: string; description: string } => {
    let data: string;
    let description: string;

    switch (testMode) {
      case 'simple':
        data = createSimpleReceipt([
          { text: '简单测试打印', options: { align: 'center', bold: true } },
          { text: '当前时间: ' + new Date().toLocaleString('zh-CN') },
          { text: '打印机IP: ' + config.printerIp },
          { text: '打印机端口: ' + config.printerPort },
        ]);
        description = '简单测试打印';
        break;
      
      case 'receipt':
        data = createTestReceipt();
        description = '收据格式测试';
        break;
      
      case 'multilang':
        data = createMultiLanguageTest();
        description = '多语言字体测试';
        break;
      
      case 'custom':
        const builder = new EscPosBuilder();
        data = builder
          .addText(customText, { align: 'left' })
          .addEmptyLine(5)
          .cut()
          .build();
        description = '自定义文本: ' + customText.substring(0, 20) + '...';
        break;
      
      default:
        throw new Error('未知的测试模式');
    }

    // 分析ESC/POS命令序列（用于调试）
    if (showDebug) {
      const commands = analyzeEscPosData(data);
      setDebugInfo(commands);
    }

    return { data, description };
  };

  /**
   * IPC测试打印
   */
  const testPrintIPC = async () => {
    setLoading(true);
    try {
      // 检查 electronAPI 是否可用
      if (!window.electronAPI || !window.electronAPI.printer) {
        alert('Electron API 未加载，请重启应用程序');
        return;
      }

      const { data, description } = generateTestData();
      console.log('📞 IPC测试打印 - 数据长度:', data.length, '描述:', description);

      const res = await window.electronAPI.printer.testPrint(data, description);
      if (!res.success) {
        alert(res.error || 'IPC打印失败');
      } else {
        alert(`IPC打印成功！\n测试类型: ${description}`);
      }
    } catch (error) {
      console.error('IPC测试打印失败:', error);
      alert('IPC测试打印失败: ' + (error instanceof Error ? error.message : '未知错误'));
    } finally {
      setLoading(false);
    }
  };

  /**
   * HTTP测试打印
   */
  const testPrintHTTP = async () => {
    setLoading(true);
    try {
      if (!status.httpRunning) {
        alert('HTTP服务未运行，请先启动HTTP服务');
        return;
      }

      const { data, description } = generateTestData();
      console.log('🌐 HTTP测试打印 - 数据长度:', data.length, '描述:', description);

      const httpPort = status.httpPort || config.httpPort;
      const url = `http://localhost:${httpPort}/print`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data, description }),
      });

      const result = await response.json();
      
      if (!response.ok || !result.success) {
        throw new Error(result.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      alert(`HTTP打印成功！\n${result.message || description}`);
    } catch (error) {
      console.error('HTTP测试打印失败:', error);
      alert('HTTP测试打印失败: ' + (error instanceof Error ? error.message : '未知错误'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-xl font-semibold">打印机配置</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
        <div>
          <label className="block text-sm mb-1">打印机 IP</label>
          <input className="border rounded px-3 py-2 w-full" value={config.printerIp}
            onChange={(e) => setConfig({ ...config, printerIp: e.target.value })} placeholder="192.168.1.100" />
        </div>
        <div>
          <label className="block text-sm mb-1">打印机端口</label>
          <input className="border rounded px-3 py-2 w-full" type="number" value={config.printerPort}
            onChange={(e) => setConfig({ ...config, printerPort: Number(e.target.value) || 9100 })} placeholder="9100" />
        </div>
        <div className="flex gap-2">
          <button className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50" disabled={loading} onClick={save}>保存配置</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
        <div>
          <label className="block text-sm mb-1">HTTP 服务端口</label>
          <input className="border rounded px-3 py-2 w-full" type="number" value={config.httpPort}
            onChange={(e) => setConfig({ ...config, httpPort: Number(e.target.value) || 18080 })} placeholder="18080" />
        </div>
        <div className="flex gap-2">
          <button className="bg-green-600 text-white px-4 py-2 rounded disabled:opacity-50" disabled={loading || status.httpRunning} onClick={startHttp}>启动 HTTP 服务</button>
          <button className="bg-gray-600 text-white px-4 py-2 rounded disabled:opacity-50" disabled={loading || !status.httpRunning} onClick={stopHttp}>停止</button>
        </div>
        <div className="text-sm text-gray-600">
          状态：{status.httpRunning ? `运行中 : ${status.httpPort}` : '未运行'} {status.lastError ? `（错误：${status.lastError}）` : ''}
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">ESC/POS 测试打印</h3>
        
        {/* 测试模式选择 */}
        <div>
          <label className="block text-sm mb-2 font-medium">测试模式</label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="radio"
                name="testMode"
                value="simple"
                checked={testMode === 'simple'}
                onChange={(e) => setTestMode(e.target.value as any)}
                className="text-blue-600"
              />
              <span className="text-sm">简单测试</span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="radio"
                name="testMode"
                value="receipt"
                checked={testMode === 'receipt'}
                onChange={(e) => setTestMode(e.target.value as any)}
                className="text-blue-600"
              />
              <span className="text-sm">收据格式</span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="radio"
                name="testMode"
                value="multilang"
                checked={testMode === 'multilang'}
                onChange={(e) => setTestMode(e.target.value as any)}
                className="text-blue-600"
              />
              <span className="text-sm">多语言测试</span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="radio"
                name="testMode"
                value="custom"
                checked={testMode === 'custom'}
                onChange={(e) => setTestMode(e.target.value as any)}
                className="text-blue-600"
              />
              <span className="text-sm">自定义文本</span>
            </label>
          </div>
        </div>

        {/* 自定义文本输入区域 */}
        {testMode === 'custom' && (
          <div className="space-y-2">
            <label className="block text-sm mb-1 font-medium">自定义文本内容</label>
            <textarea 
              className="border-2 border-blue-300 focus:border-blue-500 rounded px-3 py-2 w-full h-40 font-mono text-sm" 
              value={customText} 
              onChange={(e) => setCustomText(e.target.value)}
              placeholder="输入要打印的自定义文本...&#10;支持多行文本&#10;支持中文字符"
            />
            <div className="flex flex-wrap gap-2">
              <button 
                type="button"
                onClick={() => setCustomText('测试中文打印\n当前时间: ' + new Date().toLocaleString('zh-CN'))}
                className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded border"
              >
                时间测试
              </button>
              <button 
                type="button"
                onClick={() => setCustomText('商品: 测试商品A\n数量: 2\n单价: ￥15.50\n小计: ￥31.00\n---\n合计: ￥31.00')}
                className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded border"
              >
                简单收据
              </button>
              <button 
                type="button"
                onClick={() => setCustomText('收银员: ' + (Math.random() > 0.5 ? '张三' : '李四') + '\n单号: ' + Date.now().toString().slice(-8) + '\n打印时间: ' + new Date().toLocaleString('zh-CN'))}
                className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded border"
              >
                随机信息
              </button>
              <button 
                type="button"
                onClick={() => setCustomText('')}
                className="px-3 py-1 text-xs bg-red-100 hover:bg-red-200 text-red-700 rounded border"
              >
                清空
              </button>
            </div>
          </div>
        )}

        {/* 测试按钮 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-700">IPC 直接打印</h4>
            <button 
              className="w-full bg-purple-600 hover:bg-purple-700 text-white px-4 py-3 rounded disabled:opacity-50 transition-colors" 
              disabled={loading} 
              onClick={testPrintIPC}
            >
              {loading ? '打印中...' : 'IPC 测试打印'}
            </button>
            <p className="text-xs text-gray-500">通过Electron IPC直接发送到打印机</p>
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-700">HTTP API 打印</h4>
            <button 
              className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded disabled:opacity-50 transition-colors" 
              disabled={loading || !status.httpRunning} 
              onClick={testPrintHTTP}
            >
              {loading ? '打印中...' : 'HTTP 测试打印'}
            </button>
            <p className="text-xs text-gray-500">
              {status.httpRunning 
                ? `通过HTTP API发送 (端口: ${status.httpPort})`
                : '需要先启动HTTP服务'
              }
            </p>
          </div>
        </div>

        {/* 调试模式开关 */}
        <div className="flex items-center space-x-2">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showDebug}
              onChange={(e) => setShowDebug(e.target.checked)}
              className="text-blue-600"
            />
            <span className="text-sm font-medium">调试模式 - 显示ESC/POS命令序列</span>
          </label>
        </div>

        {/* 调试信息显示 */}
        {showDebug && debugInfo.length > 0 && (
          <div className="bg-gray-50 border border-gray-200 rounded p-4">
            <h4 className="text-sm font-medium text-gray-800 mb-2">ESC/POS 命令序列分析</h4>
            <div className="bg-gray-900 text-green-400 p-3 rounded font-mono text-xs max-h-60 overflow-y-auto">
              {debugInfo.map((command, index) => (
                <div key={index} className="mb-1">
                  <span className="text-gray-500">{(index + 1).toString().padStart(2, '0')}:</span> {command}
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-600 mt-2">
              🔍 可以看到初始化后会自动设置GB18030编码 (ESC t 255) 和中国国际字符集 (ESC R 15)
            </p>
          </div>
        )}

        {/* 测试说明 */}
        <div className="bg-blue-50 border border-blue-200 rounded p-4">
          <h4 className="text-sm font-medium text-blue-800 mb-2">测试说明</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• <strong>简单测试:</strong> 基本的文本打印和系统信息</li>
            <li>• <strong>收据格式:</strong> 完整的收据样式，包含商品明细和合计</li>
            <li>• <strong>多语言测试:</strong> 中英文混合，各种字体大小和样式</li>
            <li>• <strong>自定义文本:</strong> 您输入的文本内容</li>
          </ul>
          <p className="text-xs text-blue-600 mt-2">
            ✅ 所有文本都会自动转换为ESC/POS命令，初始化时设置GB18030编码处理中文
          </p>
        </div>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded p-4">
        <h4 className="text-sm font-medium text-gray-800 mb-2">HTTP API 使用说明</h4>
        <div className="text-sm text-gray-600 space-y-2">
          <p><strong>接口地址:</strong> <code className="bg-gray-200 px-1 rounded">POST http://本机IP:{config.httpPort}/print</code></p>
          <p><strong>请求格式:</strong></p>
          <div className="bg-gray-100 p-2 rounded font-mono text-xs overflow-x-auto">
            {`{
  "data": "base64编码的ESC/POS二进制数据",
  "description": "可选的描述信息"
}`}
          </div>
          <p><strong>兼容模式:</strong> 仍支持旧格式 <code className="bg-gray-200 px-1 rounded">{"{"}"text": "纯文本内容"{"}"}</code>（会自动转换为ESC/POS）</p>
          <p className="text-xs text-gray-500">
            💡 建议使用ESC/POS工具库生成base64数据，确保打印效果和中文编码正确
          </p>
        </div>
      </div>
    </div>
  );
}



