import React from 'react';
import { createRootRoute, Link, Outlet } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/router-devtools';
import { PromptProvider } from '@/components/ui/prompt';

function RootComponent() {
  return (
    <PromptProvider>
      <div className="min-h-screen">
        <Outlet />

        {/* 开发工具 */}
        <TanStackRouterDevtools />
      </div>
    </PromptProvider>
  );
}

export const Route = createRootRoute({
  component: RootComponent,
});
