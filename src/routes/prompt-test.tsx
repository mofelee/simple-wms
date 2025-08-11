import { createFileRoute } from "@tanstack/react-router";
import React from "react";
import { usePrompt } from "@/components/ui/prompt";
import { Button } from "@/components/ui/button";

function PromptTestComponent() {
  const prompt = usePrompt();

  const testPrompt = async () => {
    const result = await prompt({
      title: "输入度数",
      description: "请输入隐形眼镜度数，可输入小数或去点格式。",
      placeholder: "例如：-7.00、-2.75 或 -700、-275",
      defaultValue: "",
      required: false
    });
    
    if (result !== null) {
      alert(`您输入的度数是: ${result}`);
    } else {
      alert('您取消了输入');
    }
  };

  const testRequiredPrompt = async () => {
    const result = await prompt({
      title: "必填输入",
      description: "这是一个必填字段，不能为空。",
      placeholder: "请输入内容",
      required: true
    });
    
    if (result !== null) {
      alert(`您输入的内容是: ${result}`);
    } else {
      alert('您取消了输入');
    }
  };

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-bold">Prompt 组件测试</h1>
      
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold mb-2">度数输入测试</h2>
          <Button onClick={testPrompt} className="mr-4">
            测试度数输入
          </Button>
          <p className="text-sm text-gray-600 mt-2">
            模拟隐形眼镜度数输入场景，支持小数和去点格式
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">必填输入测试</h2>
          <Button onClick={testRequiredPrompt} variant="secondary">
            测试必填输入
          </Button>
          <p className="text-sm text-gray-600 mt-2">
            测试必填验证功能，空内容无法提交
          </p>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-800 mb-2">使用说明</h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• 点击按钮测试 shadcn/ui 风格的输入对话框</li>
          <li>• 支持键盘快捷键：Enter 提交，Escape 取消</li>
          <li>• 第二个测试展示必填验证功能</li>
          <li>• 对话框会自动聚焦到输入框</li>
        </ul>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/prompt-test")({
  component: PromptTestComponent,
});
