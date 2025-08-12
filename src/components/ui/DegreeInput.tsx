import React, { useRef, useEffect, useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./dialog";
import { Button } from "./button";
import { Input } from "./input";

type DegreeInputProps = {
  open: boolean;
  defaultValue?: string;
  onConfirm: (value: string) => void;
  onCancel: () => void;
  title?: string;
  description?: string;
};

export function DegreeInput({ 
  open, 
  defaultValue = "", 
  onConfirm, 
  onCancel,
  title = "手动填写度数",
  description = "未能自动解析度数，请手动填写。可使用箭头键调整度数。"
}: DegreeInputProps) {
  const [value, setValue] = useState(defaultValue);
  const inputRef = useRef<HTMLInputElement>(null);

  // 当弹窗打开时，重置值并自动选中文本
  useEffect(() => {
    if (open) {
      // 格式化默认值：正数显示+号
      let formattedValue = defaultValue;
      if (defaultValue && !defaultValue.startsWith('+') && !defaultValue.startsWith('-')) {
        const numValue = parseFloat(defaultValue);
        if (numValue > 0) {
          formattedValue = `+${defaultValue}`;
        }
      }
      setValue(formattedValue);
      // 延迟执行，确保DOM已渲染
      queueMicrotask(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        }
      });
    }
  }, [open, defaultValue]);

  // 度数变化逻辑
  const adjustDegree = useCallback((direction: 'up' | 'down') => {
    const currentValue = parseFloat(value) || 0;
    let newValue: number;

    if (direction === 'down') {
      // 按下箭头：度数减少（更负）
      if (currentValue > 600) {
        // +600度以上，变化50度
        newValue = currentValue - 50;
      } else if (currentValue > 50) {
        // +50到+600度之间，变化25度
        newValue = currentValue - 25;
        if (newValue === 25) {
          newValue = 0; // 跳过+25，直接到0
        }
      } else if (currentValue === 50) {
        // 从+50直接跳到0，因为没有+25度
        newValue = 0;
      } else if (currentValue > 0) {
        // 0到+50度之间，变化25度，但要确保不会变成+25
        newValue = currentValue - 25;
        if (newValue === 25) {
          newValue = 0; // 跳过+25，直接到0
        }
      } else if (currentValue === 0) {
        // 从0直接跳到-50，因为没有-25度
        newValue = -50;
      } else if (currentValue >= -50) {
        // -50度以上（负数），变化25度，但要确保不会变成-25
        newValue = currentValue - 25;
        if (newValue === -25) {
          newValue = -50; // 跳过-25，直接到-50
        }
      } else if (currentValue > -600) {
        // -50到-600度之间，变化25度
        newValue = currentValue - 25;
      } else {
        // -600度以下，变化50度
        newValue = currentValue - 50;
      }
    } else {
      // 按上箭头：度数增加（更正）
      if (currentValue <= -600) {
        // -600度以下，变化50度
        newValue = currentValue + 50;
      } else if (currentValue < -50) {
        // -600到-50度之间，变化25度
        newValue = currentValue + 25;
      } else if (currentValue === -50) {
        // 从-50直接跳到0，因为没有-25度
        newValue = 0;
      } else if (currentValue < 0) {
        // -50到0度之间，变化25度，但要确保不会变成-25
        newValue = currentValue + 25;
        if (newValue === -25) {
          newValue = 0; // 跳过-25，直接到0
        }
      } else if (currentValue === 0) {
        // 从0直接跳到+50，因为没有+25度
        newValue = 50;
      } else if (currentValue < 50) {
        // 0到+50度之间，变化25度，但要确保不会变成+25
        newValue = currentValue + 25;
        if (newValue === 25) {
          newValue = 50; // 跳过+25，直接到+50
        }
      } else if (currentValue < 600) {
        // +50到+600度之间，变化25度
        newValue = currentValue + 25;
      } else {
        // +600度以上，变化50度
        newValue = currentValue + 50;
      }
    }

    // 格式化显示：正数显示+号，负数显示-号，0不显示符号
    let newValueStr: string;
    if (newValue > 0) {
      newValueStr = `+${newValue}`;
    } else {
      newValueStr = newValue.toString();
    }
    
    setValue(newValueStr);

    // 延迟选中文本，确保值已更新
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.select();
      }
    }, 10);
  }, [value]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      adjustDegree('up');
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      adjustDegree('down');
    } else if (e.key === "Enter") {
      e.preventDefault();
      onConfirm(value);
    } else if (e.key === "Escape") {
      e.preventDefault();
      onCancel();
    }
  }, [adjustDegree, value, onConfirm, onCancel]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
  }, []);

  const handleConfirm = useCallback(() => {
    onConfirm(value);
  }, [value, onConfirm]);

  // 当值改变时，自动选中文本（但不在用户正在编辑时）
  const handleFocus = useCallback(() => {
    if (inputRef.current) {
      inputRef.current.select();
    }
  }, []);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <DialogContent className="sm:max-w-[420px] bg-white">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="py-2 space-y-2">
          <Input
            ref={inputRef}
            placeholder="输入度数，如：-100、+50"
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onFocus={handleFocus}
            className="text-center"
          />
          <div className="text-xs text-gray-500 space-y-1">
            <div>💡 使用技巧：</div>
            <div>• ↑↓ 键快速调整度数</div>
            <div>• ±50到±600度：每次调整25度</div>
            <div>• ±600度以外：每次调整50度</div>
            <div>• 自动跳过±25度（不存在的度数）</div>
            <div>• 正数自动显示+号</div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onCancel}>
            取消
          </Button>
          <Button onClick={handleConfirm}>
            确定
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
