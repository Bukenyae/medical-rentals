export interface ImageTransformOptions {
  width?: number;
  height?: number;
  quality?: number;
  fit?: "cover" | "contain" | "fill" | "inside" | "outside";
  format?: "webp" | "jpg" | "jpeg" | "png" | "avif";
}

const STORAGE_OBJECT_PATH = "/storage/v1/object/";
const STORAGE_RENDER_PATH = "/storage/v1/render/image/";

const DEFAULT_TRANSFORM: Pick<ImageTransformOptions, "width" | "quality" | "fit"> = {
  width: 640,
  quality: 70,
  fit: "cover",
};

const SUPABASE_DOMAINS = [
  "supabase.co",
  "supabase.in",
];

export function getOptimizedImageUrl(url?: string | null, options: ImageTransformOptions = {}): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    const isSupabase = SUPABASE_DOMAINS.some((domain) => parsed.hostname.endsWith(domain));
    if (isSupabase && parsed.pathname.includes(STORAGE_OBJECT_PATH)) {
      parsed.pathname = parsed.pathname.replace(STORAGE_OBJECT_PATH, STORAGE_RENDER_PATH);
    }
    const params = {
      ...DEFAULT_TRANSFORM,
      ...options,
    };
    if (params.width) parsed.searchParams.set("width", params.width.toString());
    if (params.height) parsed.searchParams.set("height", params.height.toString());
    if (params.quality) parsed.searchParams.set("quality", params.quality.toString());
    if (params.fit) parsed.searchParams.set("resize", params.fit);
    if (params.format) parsed.searchParams.set("format", params.format);
    return parsed.toString();
  } catch {
    return url;
  }
}

export const DEFAULT_BLUR_DATA_URL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAIElEQVQoU2NkYGD4z4AEYBxVSFUBCjZRBMTUwEABynAYYhJnuAAAAAElFTkSuQmCC";
