import { requireAdmin } from "@/lib/auth/session";
import { ReportesTabs } from "@/features/reportes/components/reportes-tabs";

export default async function ReportesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();

  return (
    <div className="space-y-6">
      <ReportesTabs />
      {children}
    </div>
  );
}
