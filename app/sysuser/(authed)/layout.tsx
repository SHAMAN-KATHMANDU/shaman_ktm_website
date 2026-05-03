import { AdminShell } from "@/components/sysuser/admin-shell";

export default function AuthedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminShell>{children}</AdminShell>;
}
