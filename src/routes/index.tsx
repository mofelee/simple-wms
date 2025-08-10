import React, { useState, useCallback, useEffect } from 'react';
import { createFileRoute } from '@tanstack/react-router';

function IndexComponent() {
  const addLog = useCallback((message: string, type: 'info' | 'success' | 'error' = 'info') => {
    console.log(message, type);
  }, []);

  // 应用启动时的初始化
  useEffect(() => {
    // 添加启动日志
    addLog('🚀 Electron IPC 演示系统启动成功！');
    addLog('📁 文件将保存在应用数据目录中，查看终端获取详细路径', 'info');
    addLog('💡 提示：所有操作都会在此日志面板中显示', 'info');
    addLog('🔍 建议：先查看"概览"了解系统功能，然后逐个体验各模块', 'info');
    addLog('🎉 现在使用 TanStack Router 基于文件的路由系统！', 'success');
  }, [addLog]);

  return (
    <div className="space-y-8">
      {/* 欢迎信息 */}
      <a href="#/test" target="_blank">测试</a>
    </div>
  );
}

export const Route = createFileRoute('/')({
  component: IndexComponent,
});
