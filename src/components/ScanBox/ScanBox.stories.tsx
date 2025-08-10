import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import ScanBox from './ScanBox';
import { ScanResult } from './types';
import { testSamples } from './testSamples';

// Meta 配置
const meta: Meta<typeof ScanBox> = {
  title: '组件/ScanBox 扫码框',
  component: ScanBox,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: `
## 扫码框组件

一个专门用于接收扫码枪输入的 React 组件。

### 功能特点
- 🎯 **专业扫码**: 专为扫码枪设计的输入处理
- 🔄 **RxJS 驱动**: 使用 RxJS 处理复杂的键盘事件流
- 📱 **GS1 支持**: 完整支持 GS1 标准的控制字符
- ✅ **类型安全**: 完整的 TypeScript 类型定义
- 🎨 **可定制**: 丰富的配置选项和样式定制
- 📊 **实时反馈**: 扫码状态和错误信息显示

### 使用场景
- 仓库管理系统
- 医疗设备追溯
- 商品信息录入
- 库存盘点系统
        `,
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    onScan: {
      description: '扫码完成时的回调函数',
    },
    onScanning: {
      description: '扫码进行中的回调函数',
    },
    onError: {
      description: '扫码错误时的回调函数',
    },
    disabled: {
      control: 'boolean',
      description: '是否禁用扫码框',
    },
    autoFocus: {
      control: 'boolean',
      description: '是否自动聚焦',
    },
    clearAfterScan: {
      control: 'boolean',
      description: '扫码后是否清空输入',
    },
    showStatus: {
      control: 'boolean',
      description: '是否显示状态栏',
    },
    placeholder: {
      control: 'text',
      description: '占位符文本',
    },
    minLength: {
      control: 'number',
      description: '最小扫码长度',
    },
    maxLength: {
      control: 'number',
      description: '最大扫码长度',
    },
    timeout: {
      control: 'number',
      description: '扫码超时时间(ms)',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

// 基础故事
export const Default: Story = {
  args: {
    placeholder: '点击此区域，然后扫描条码',
    showStatus: true,
    autoFocus: true,
    clearAfterScan: true,
    onScan: (result: ScanResult) => console.log('扫码完成:', result),
    onScanning: (data: string) => console.log('扫码中:', data),
    onError: (error: string) => console.error('扫码错误:', error),
  },
};

// 禁用状态
export const Disabled: Story = {
  args: {
    ...Default.args,
    disabled: true,
    placeholder: '扫码框已禁用',
  },
};

// 不显示状态栏
export const WithoutStatus: Story = {
  args: {
    ...Default.args,
    showStatus: false,
  },
};

// 带长度限制
export const WithLengthLimit: Story = {
  args: {
    ...Default.args,
    minLength: 10,
    maxLength: 50,
    placeholder: '扫码长度必须在 10-50 字符之间',
  },
};

// 不清空数据
export const PersistentData: Story = {
  args: {
    ...Default.args,
    clearAfterScan: false,
    placeholder: '扫码后数据将保留',
  },
};

// 交互式演示
export const Interactive: Story = {
  render: (args: any) => {
    const [results, setResults] = useState<ScanResult[]>([]);
    const [currentScanning, setCurrentScanning] = useState<string>('');

    const handleScan = (result: ScanResult) => {
      setResults(prev => [result, ...prev].slice(0, 3)); // 只保留最近3条
      console.log('扫码完成:', result);
    };

    const handleScanning = (data: string) => {
      setCurrentScanning(data);
      console.log('扫码中:', data);
    };

    return (
      <div className="space-y-6">
        <ScanBox
          {...args}
          onScan={handleScan}
          onScanning={handleScanning}
        />

        {/* 测试按钮 */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-3">🧪 测试样例 (点击模拟扫码)</h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {testSamples.slice(0, 4).map((sample, index) => (
              <button
                key={index}
                onClick={() => {
                  // 直接调用 handleScan 模拟扫码结果
                  handleScan({
                    rawData: sample.data,
                    displayData: sample.data.replace(/\x1D/g, '[GS]'),
                    timestamp: new Date(),
                    length: sample.data.length,
                  });
                }}
                className="text-left p-3 border border-gray-200 rounded hover:bg-white transition-colors"
              >
                <div className="font-medium text-blue-600 text-sm">{sample.name}</div>
                <div className="text-xs text-gray-500 mb-1">{sample.description}</div>
                <div className="text-xs text-gray-600 font-mono break-all">
                  {sample.data.slice(0, 30)}...
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 扫码结果历史 */}
        {results.length > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-green-800 mb-3">✅ 扫码结果历史</h3>
            <div className="space-y-3">
              {results.map((result, index) => (
                <div key={index} className="bg-white p-3 rounded border">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-sm font-medium text-gray-600">
                      #{results.length - index}
                    </span>
                    <span className="text-xs text-gray-500">
                      {result.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="font-mono text-sm text-gray-800 break-all mb-2">
                    原始数据: {result.rawData}
                  </div>
                  <div className="font-mono text-xs text-gray-600 break-all">
                    显示数据: {result.displayData}
                  </div>
                  <div className="text-xs text-gray-500 mt-2">
                    长度: {result.length} 字符
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  },
  args: {
    ...Default.args,
  },
};

// 极简模式
export const Minimal: Story = {
  args: {
    placeholder: '简洁模式扫码框',
    showStatus: false,
    autoFocus: false,
    onScan: (result: ScanResult) => console.log('极简模式扫码:', result),
  },
};

// 医疗设备专用
export const Medical: Story = {
  args: {
    placeholder: '扫描医疗设备 UDI 条码',
    minLength: 20,
    maxLength: 100,
    showStatus: true,
    autoFocus: true,
    clearAfterScan: true,
    timeout: 100, // 医疗设备可能需要更长的超时时间
    onScan: (result: ScanResult) => console.log('医疗设备扫码:', result),
    onScanning: (data: string) => console.log('医疗设备扫码中:', data),
    onError: (error: string) => console.error('医疗设备扫码错误:', error),
  },
};

// 仓库管理专用
export const Warehouse: Story = {
  args: {
    placeholder: '扫描商品条码进行入库/出库',
    minLength: 8,
    maxLength: 200,
    showStatus: true,
    autoFocus: true,
    clearAfterScan: true,
    timeout: 50,
    onScan: (result: ScanResult) => console.log('仓库管理扫码:', result),
    onScanning: (data: string) => console.log('仓库管理扫码中:', data),
    onError: (error: string) => console.error('仓库管理扫码错误:', error),
  },
};

// 样式展示故事 - 展示不同状态的美化样式
export const StyleShowcase: Story = {
  render: () => {
    return (
      <div className="space-y-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">🎨 ScanBox 样式展示</h2>
          <p className="text-gray-600 mb-6">展示组件在不同状态下的美化样式</p>
        </div>
        
        <div className="grid gap-8">
          {/* 未聚焦状态 */}
          <div className="p-6 bg-white rounded-xl shadow-lg border">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">未聚焦状态</h3>
            <p className="text-sm text-gray-600 mb-4">灰色渐变背景，hover 效果</p>
            <ScanBox
              onScan={(result) => console.log('扫码:', result)}
              placeholder="点击此区域，然后扫描条码"
              autoFocus={false}
              showStatus={true}
            />
          </div>
          
          {/* 聚焦状态 */}
          <div className="p-6 bg-white rounded-xl shadow-lg border">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">聚焦状态</h3>
            <p className="text-sm text-gray-600 mb-4">蓝色渐变背景，带光圈效果</p>
            <ScanBox
              onScan={(result) => console.log('扫码:', result)}
              placeholder="已聚焦 - 蓝色主题"
              autoFocus={true}
              showStatus={true}
            />
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-200">
          <h3 className="text-lg font-semibold text-blue-800 mb-3">🌟 样式特点</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-gray-300 rounded-full"></span>
                <span><strong>未聚焦:</strong> 灰色渐变 + hover效果</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-blue-400 rounded-full"></span>
                <span><strong>聚焦:</strong> 蓝色渐变 + 光圈效果</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-orange-400 rounded-full"></span>
                <span><strong>扫码中:</strong> 橙色渐变 + 动画效果</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-green-400 rounded-full"></span>
                <span><strong>扫码成功:</strong> 绿色渐变 + 庆祝动画</span>
              </div>
            </div>
            <div className="space-y-2">
              <div>• 圆角边框与阴影效果</div>
              <div>• 平滑的过渡动画</div>
              <div>• 丰富的状态指示器</div>
              <div>• 现代化的按钮设计</div>
            </div>
          </div>
        </div>
      </div>
    );
  },
};
