interface HomePropertiesSkeletonProps {
  count?: number;
}

export default function HomePropertiesSkeleton({ count = 4 }: HomePropertiesSkeletonProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={`home-skeleton-${idx}`}
          className="rounded-3xl border border-gray-200 bg-white shadow-sm animate-pulse h-[28rem]"
        >
          <div className="h-64 bg-gray-200 rounded-t-3xl" />
          <div className="p-6 space-y-4">
            <div className="h-6 bg-gray-200 rounded w-3/4" />
            <div className="h-4 bg-gray-200 rounded w-1/2" />
            <div className="h-4 bg-gray-200 rounded w-full" />
            <div className="h-10 bg-gray-200 rounded w-32" />
          </div>
        </div>
      ))}
    </>
  );
}
