import { Skeleton } from "@/components/site/shared/skeleton";

export default function StoriesLoading() {
  return (
    <section className="px-6 md:px-10 mx-auto max-w-[1400px] py-12">
      <Skeleton className="h-8 w-64 mb-8" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="aspect-[3/2] w-full" />
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        ))}
      </div>
    </section>
  );
}
