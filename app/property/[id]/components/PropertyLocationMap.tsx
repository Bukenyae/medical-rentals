import Link from 'next/link';

interface PropertyLocationMapProps {
  address: string;
  mapUrl: string | null;
  title: string;
}

function buildEmbedUrl(mapUrl: string | null, address: string): string | null {
  const trimmedAddress = address.trim();
  if (!mapUrl) {
    return trimmedAddress
      ? `https://www.google.com/maps?q=${encodeURIComponent(trimmedAddress)}&output=embed`
      : null;
  }
  try {
    const url = new URL(mapUrl);
    const host = url.hostname.toLowerCase();
    const isGoogleHost = host === 'google.com' || host.endsWith('.google.com');
    const isMapsHost = isGoogleHost || host.includes('google');

    if (isMapsHost) {
      if (url.pathname.startsWith('/maps/embed')) {
        return url.toString();
      }

      const qParam = url.searchParams.get('q');
      if (qParam) {
        return `https://www.google.com/maps?q=${encodeURIComponent(qParam)}&output=embed`;
      }

      if (trimmedAddress) {
        return `https://www.google.com/maps?q=${encodeURIComponent(trimmedAddress)}&output=embed`;
      }
      return null;
    }
    return trimmedAddress
      ? `https://www.google.com/maps?q=${encodeURIComponent(trimmedAddress)}&output=embed`
      : null;
  } catch (error) {
    return trimmedAddress
      ? `https://www.google.com/maps?q=${encodeURIComponent(trimmedAddress)}&output=embed`
      : null;
  }
}

export default function PropertyLocationMap({ address, mapUrl, title }: PropertyLocationMapProps) {
  const embedUrl = buildEmbedUrl(mapUrl, address);
  const hasEmbed = Boolean(embedUrl);

  return (
    <section aria-label="Property location" className="bg-white">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col gap-3 mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Where you'll be</h2>
          {address && <p className="text-sm text-gray-600">{address}</p>}
        </div>

        <div className="aspect-[4/3] w-full overflow-hidden rounded-3xl border border-gray-200 shadow-sm">
          {hasEmbed ? (
            <iframe
              src={embedUrl ?? undefined}
              allowFullScreen
              referrerPolicy="no-referrer-when-downgrade"
              title={`Map for ${title}`}
              className="h-full w-full border-0"
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center bg-gray-50 text-center text-sm text-gray-500">
              <p>Map preview coming soon.</p>
              {mapUrl ? (
                <p className="mt-1 text-xs text-gray-400">We could not display this link, but you can open it directly below.</p>
              ) : (
                <p className="mt-1 text-xs text-gray-400">Add a Google Maps URL in the host portal to display a map here.</p>
              )}
            </div>
          )}
        </div>

        {mapUrl && (
          <div className="mt-3 text-sm">
            <Link
              href={mapUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-blue-600 hover:text-blue-700"
            >
              View on Google Maps
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
