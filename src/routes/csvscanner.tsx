import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/csvscanner')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/csvscanner"!</div>
}
