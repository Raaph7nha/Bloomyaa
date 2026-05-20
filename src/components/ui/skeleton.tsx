export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={`skeleton rounded-md ${className}`} />
  );
}

export function PlantCardSkeleton() {
  return (
    <div className="bg-card rounded-[32px] overflow-hidden border border-border/50 shadow-sm flex flex-col h-full">
      <Skeleton className="h-[240px] w-full" />
      <div className="p-5 space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-7 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
        <div className="flex gap-2 pt-6 border-t border-border/50">
          <Skeleton className="h-10 flex-1 rounded-2xl" />
          <Skeleton className="h-10 w-10 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}

export function PostSkeleton() {
  return (
    <div className="bg-card rounded-[48px] border border-border/40 p-8 lg:p-12 space-y-10 shadow-sm">
      <div className="flex items-center gap-6">
        <Skeleton className="w-16 h-16 rounded-[24px]" />
        <div className="space-y-3">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
      <div className="space-y-4">
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-6 w-5/6" />
        <Skeleton className="h-6 w-4/6" />
      </div>
      <Skeleton className="h-[400px] w-full rounded-[40px]" />
      <div className="flex gap-4">
        <Skeleton className="h-14 w-40 rounded-[24px]" />
        <Skeleton className="h-14 w-14 rounded-[24px]" />
      </div>
    </div>
  );
}
