import { UnderConstructionPage } from "@/components/under-construction-page";
import { HomePage } from "@/components/site/home/home-page";
import { IS_COMING_SOON } from "@/lib/site-mode";

export default function Page() {
  if (IS_COMING_SOON) return <UnderConstructionPage />;
  return <HomePage />;
}
