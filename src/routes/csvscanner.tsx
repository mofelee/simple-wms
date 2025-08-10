import { createFileRoute } from "@tanstack/react-router";
import { ScanBox } from "@/components/ScanBox";

export const Route = createFileRoute("/csvscanner")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div>
      <ScanBox
        onScan={(result) => console.log("扫码:", result)}
        placeholder=""
        autoFocus={true}
        showStatus={true}
      />
    </div>
  );
}
