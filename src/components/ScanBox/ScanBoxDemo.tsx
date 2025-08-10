import React, { useState } from 'react';
import ScanBox from './ScanBox';
import { ScanResult } from './types';
import { testSamples } from './testSamples';

/**
 * 扫码框演示组件
 * 展示如何在实际应用中使用 ScanBox 组件
 */
const ScanBoxDemo: React.FC = () => {
  const [scanHistory, setScanHistory] = useState<ScanResult[]>([]);
  const [currentScanning, setCurrentScanning] = useState<string>('');
  const [error, setError] = useState<string>('');

  // 处理扫码完成
  const handleScan = (result: ScanResult) => {
    setScanHistory(prev => [result, ...prev].slice(0, 10)); // 保留最近10条
    setError('');
    
    // 这里可以添加业务逻辑
    console.log('扫码成功:', result);
    
    // 示例：根据数据类型进行不同处理
    if (result.rawData.includes('(01)')) {
      console.log('检测到 GTIN 产品标识');
    }
    
    if (result.rawData.includes('(17)')) {
      console.log('检测到有效期信息');
    }
    
    if (result.rawData.includes('(10)')) {
      console.log('检测到批次信息');
    }
  };

  // 处理扫码中
  const handleScanning = (data: string) => {
    setCurrentScanning(data);
    setError('');
  };

  // 处理扫码错误
  const handleError = (errorMsg: string) => {
    setError(errorMsg);
    setCurrentScanning('');
  };

  // 清空历史记录
  const clearHistory = () => {
    setScanHistory([]);
    setError('');
  };

  // 模拟扫码
  const simulateScan = (data: string) => {
    const result: ScanResult = {
      rawData: data,
      displayData: data.replace(/\x1D/g, '[GS]').replace(/[\x00-\x1F\x7F-\x9F]/g, (char) => 
        `[${char.charCodeAt(0).toString(16).toUpperCase()}]`
      ),
      timestamp: new Date(),
      length: data.length,
    };
    handleScan(result);
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          🎯 扫码框组件演示
        </h1>
        <p className="text-gray-600">
          专为扫码枪设计的 React 组件，支持 GS1 标准和 RxJS 事件流处理
        </p>
      </div>

      {/* 主要扫码区域 */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-800">
          📱 扫码输入区域
        </h2>
        <ScanBox
          onScan={handleScan}
          onScanning={handleScanning}
          onError={handleError}
          placeholder="点击此区域，然后使用扫码枪扫描条码"
          showStatus={true}
          autoFocus={true}
          clearAfterScan={true}
          minLength={5}
          maxLength={500}
        />
      </div>

      {/* 当前扫码状态 */}
      {currentScanning && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-yellow-800 mb-2">
            ⏳ 扫码进行中...
          </h3>
          <div className="font-mono text-sm text-yellow-700 break-all">
            {currentScanning}
          </div>
        </div>
      )}

      {/* 错误信息 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-red-800 mb-2">
            ❌ 扫码错误
          </h3>
          <div className="text-sm text-red-700">
            {error}
          </div>
        </div>
      )}

      {/* 测试按钮区域 */}
      <div className="bg-gray-50 rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-800">
            🧪 测试样例
          </h3>
          <p className="text-sm text-gray-600">
            点击按钮模拟扫码输入，测试组件功能
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {testSamples.slice(0, 6).map((sample, index) => (
            <button
              key={index}
              onClick={() => simulateScan(sample.data)}
              className="text-left p-3 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all"
            >
              <div className="font-medium text-blue-600 text-sm mb-1">
                {sample.name}
              </div>
              <div className="text-xs text-gray-500 mb-2">
                {sample.description}
              </div>
              <div className="text-xs text-gray-700 font-mono break-all">
                {sample.data.length > 40 
                  ? `${sample.data.slice(0, 40)}...` 
                  : sample.data
                }
              </div>
              <div className="text-xs text-gray-400 mt-1">
                长度: {sample.data.length} 字符
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 扫码历史记录 */}
      {scanHistory.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-800">
              📋 扫码历史记录
            </h3>
            <div className="flex gap-2">
              <span className="text-sm text-gray-600">
                共 {scanHistory.length} 条记录
              </span>
              <button
                onClick={clearHistory}
                className="text-sm text-red-600 hover:text-red-800"
              >
                清空
              </button>
            </div>
          </div>
          
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {scanHistory.map((result, index) => (
              <div
                key={`${result.timestamp.getTime()}-${index}`}
                className="border border-gray-200 rounded-lg p-4"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2">
                    <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded">
                      #{scanHistory.length - index}
                    </span>
                    <span className="text-sm text-gray-600">
                      {result.timestamp.toLocaleString()}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {result.length} 字符
                  </span>
                </div>
                
                <div className="space-y-2">
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                      原始数据
                    </label>
                    <div className="font-mono text-sm text-gray-800 bg-gray-50 p-2 rounded border break-all">
                      {result.rawData}
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                      显示数据
                    </label>
                    <div className="font-mono text-sm text-gray-600 bg-gray-50 p-2 rounded border break-all">
                      {result.displayData}
                    </div>
                  </div>
                </div>

                {/* 简单的数据分析 */}
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <div className="flex flex-wrap gap-2">
                    {result.rawData.includes('(01)') && (
                      <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                        GTIN 产品标识
                      </span>
                    )}
                    {result.rawData.includes('(17)') && (
                      <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded">
                        有效期
                      </span>
                    )}
                    {result.rawData.includes('(10)') && (
                      <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded">
                        批次号
                      </span>
                    )}
                    {result.rawData.includes('(21)') && (
                      <span className="bg-indigo-100 text-indigo-800 text-xs px-2 py-1 rounded">
                        序列号
                      </span>
                    )}
                    {result.rawData.includes('\x1D') && (
                      <span className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded">
                        含 GS 分隔符
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 使用说明 */}
      <div className="bg-blue-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">
          📖 使用说明
        </h3>
        <div className="text-blue-800 text-sm space-y-2">
          <p>• <strong>真实扫码</strong>: 点击扫码区域获得焦点后，使用扫码枪扫描条码</p>
          <p>• <strong>模拟测试</strong>: 点击测试样例按钮模拟扫码输入</p>
          <p>• <strong>格式支持</strong>: 支持 GS1 标准格式，包括括号格式和固定长度格式</p>
          <p>• <strong>控制字符</strong>: F8 键自动转换为 GS 分隔符 (0x1D)</p>
          <p>• <strong>实时反馈</strong>: 显示扫码状态、错误信息和历史记录</p>
          <p>• <strong>数据验证</strong>: 支持长度限制和格式验证</p>
        </div>
      </div>
    </div>
  );
};

export default ScanBoxDemo;
