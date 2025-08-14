import React from 'react';
import { createRootRoute, Link, Outlet } from '@tanstack/react-router';
let TanStackRouterDevtoolsLazy: React.LazyExoticComponent<React.ComponentType<any>> | null = null;
if (import.meta.env.DEV) {
  TanStackRouterDevtoolsLazy = React.lazy(() =>
    import('@tanstack/router-devtools').then((mod) => ({ default: mod.TanStackRouterDevtools }))
  );
}
import { PromptProvider } from '@/components/ui/prompt';

function RootComponent() {
  return (
    <PromptProvider>
      <div className="min-h-screen">
        <Outlet />

					{/* 开发工具（仅开发环境加载） */}
					{TanStackRouterDevtoolsLazy ? (
						<React.Suspense fallback={null}>
							<TanStackRouterDevtoolsLazy />
						</React.Suspense>
					) : null}
      </div>
    </PromptProvider>
  );
}

export const Route = createRootRoute({
  component: RootComponent,
});
