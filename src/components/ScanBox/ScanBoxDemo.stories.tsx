import type { Meta, StoryObj } from '@storybook/react-vite';
import ScanBoxDemo from './ScanBoxDemo';

// Meta 配置
const meta: Meta<typeof ScanBoxDemo> = {
  title: '演示/ScanBox 完整演示',
  component: ScanBoxDemo,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `
## 扫码框完整演示

这是一个完整的扫码框使用演示，展示了如何在实际应用中集成和使用 ScanBox 组件。

### 演示内容
- 🎯 **真实扫码**: 支持扫码枪输入
- 🧪 **测试样例**: 多种格式的测试数据
- 📊 **实时反馈**: 扫码状态和错误信息
- 📋 **历史记录**: 扫码结果历史管理
- 🔍 **数据分析**: 自动识别数据类型

### 使用方式
1. 点击扫码区域获得焦点
2. 使用扫码枪扫描条码，或点击测试按钮模拟
3. 查看扫码结果和历史记录
4. 观察不同数据格式的解析效果
        `,
      },
    },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

// 完整演示故事
export const FullDemo: Story = {
  render: () => <ScanBoxDemo />,
  parameters: {
    docs: {
      description: {
        story: `
完整的扫码框演示应用，包含所有功能：

- **扫码输入**: 真实的扫码枪支持
- **测试按钮**: 6个不同类型的测试样例
- **实时状态**: 扫码进度和错误提示
- **历史记录**: 最近10次扫码结果
- **数据分析**: 自动识别 GTIN、有效期、批次号等
- **使用说明**: 详细的操作指南

点击测试按钮或使用真实扫码枪进行测试。
        `,
      },
    },
  },
};
