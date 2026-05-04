import { ProductGridSkeleton } from "@/components/site/shared/skeleton";

export default function ProductsLoading() {
  return (
    <section className="px-6 md:px-10 mx-auto max-w-[1400px] py-12">
      <div className="h-8 w-48 mb-8 bg-[var(--color-surface)] animate-pulse" />
      <ProductGridSkeleton count={12} />
    </section>
  );
}
