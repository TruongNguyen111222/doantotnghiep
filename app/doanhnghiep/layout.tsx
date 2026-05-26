import type { ReactNode } from "react";
import { getDashboardSidebarDisplayName } from "@/lib/auth/dashboard-display-name";
import { DashboardShell } from "../components/DashboardShell";
import DoanhNghiepClientExtras from "./DoanhNghiepClientExtras";

export default async function DoanhnghiepLayout({ children }: { children: ReactNode }) {
  const brandName = await getDashboardSidebarDisplayName();
  return (
    <DashboardShell role="doanhnghiep" brandName={brandName}>
      <DoanhNghiepClientExtras />
      {children}
    </DashboardShell>
  );
}
