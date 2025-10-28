export default function PropertyDetailsSkeleton() {
  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4 animate-pulse">
            <div className="flex items-center space-x-3">
              <div className="h-8 w-8 rounded-full bg-gray-200" />
              <div className="h-6 w-32 rounded bg-gray-200" />
            </div>
            <div className="h-9 w-28 rounded-full bg-gray-200" />
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse space-y-8">
          <div className="w-full rounded-3xl bg-gray-100 aspect-[16/9]" />

          <div className="flex items-center space-x-3 overflow-x-auto">
            {Array.from({ length: 8 }).map((_, idx) => (
              <div key={idx} className="h-16 w-16 flex-shrink-0 rounded-xl bg-gray-100" />
            ))}
          </div>

          <div className="grid gap-8 lg:grid-cols-[2fr,1fr]">
            <div className="space-y-6">
              <div className="h-8 w-2/3 rounded bg-gray-100" />
              <div className="h-4 w-1/2 rounded bg-gray-100" />
              <div className="h-4 w-1/3 rounded bg-gray-100" />

              <div className="space-y-3 pt-2">
                {Array.from({ length: 4 }).map((_, idx) => (
                  <div key={idx} className="h-4 w-full rounded bg-gray-100" />
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3 pt-4">
                {Array.from({ length: 6 }).map((_, idx) => (
                  <div key={idx} className="h-10 rounded-xl bg-gray-100" />
                ))}
              </div>

              <div className="space-y-3 pt-6">
                {Array.from({ length: 3 }).map((_, idx) => (
                  <div key={idx} className="h-20 rounded-2xl bg-gray-100" />
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-gray-100 p-6 space-y-4">
              <div className="h-6 w-1/2 rounded bg-gray-100" />
              <div className="h-10 rounded-xl bg-gray-100" />
              <div className="h-40 rounded-2xl bg-gray-100" />
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, idx) => (
                  <div key={idx} className="flex justify-between">
                    <div className="h-4 w-24 rounded bg-gray-100" />
                    <div className="h-4 w-12 rounded bg-gray-100" />
                  </div>
                ))}
              </div>
              <div className="h-12 rounded-xl bg-gray-100" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
