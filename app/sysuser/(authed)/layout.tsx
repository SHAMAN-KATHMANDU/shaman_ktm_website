import { AdminShell } from "@/components/sysuser/admin-shell";
import { Toaster } from "@/components/ui/toast";
import { ConfirmRoot } from "@/components/ui/confirm";
import { PromptRoot } from "@/components/ui/prompt";

export default function AuthedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <AdminShell>{children}</AdminShell>
      <Toaster />
      <ConfirmRoot />
      <PromptRoot />
    </>
  );
}
