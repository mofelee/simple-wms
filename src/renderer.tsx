import React from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider, createRouter, createHashHistory } from '@tanstack/react-router';
import './index.css';
import { routeTree } from './routeTree.gen';

// 创建路由器实例
const router = createRouter({ routeTree, history: createHashHistory() });

// 注册路由器以获得类型安全的链接
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

const container = document.getElementById('root');
if (!container) {
  throw new Error('Could not find root element');
}

const root = createRoot(container);
root.render(<RouterProvider router={router} />);
