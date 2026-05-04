import { ProductGridSkeleton } from "@/components/site/shared/skeleton";

export default function ElementListingLoading() {
  return (
    <section className="px-6 md:px-10 mx-auto max-w-[1400px] py-12">
      <div className="h-8 w-48 mb-4 bg-[var(--color-surface)] animate-pulse" />
      <div className="h-4 w-64 mb-12 bg-[var(--color-surface)] animate-pulse" />
      <ProductGridSkeleton count={12} />
    </section>
  );
}
