/**
 * Extracts YouTube video ID from various YouTube URL formats
 * Supports: youtube.com/watch?v=ID, youtu.be/ID, youtube.com/embed/ID
 */
export const extractYouTubeVideoId = (url: string): string | null => {
  if (!url) return null;
  
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/v\/([^&\n?#]+)/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }
  
  return null;
};

/**
 * Validates if a URL is a valid YouTube URL
 */
export const isValidYouTubeUrl = (url: string): boolean => {
  return extractYouTubeVideoId(url) !== null;
};

/**
 * Converts a YouTube URL to an embed URL
 */
export const getYouTubeEmbedUrl = (url: string): string | null => {
  const videoId = extractYouTubeVideoId(url);
  return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
};

/**
 * Gets YouTube video thumbnail URL
 */
export const getYouTubeThumbnailUrl = (url: string): string | null => {
  const videoId = extractYouTubeVideoId(url);
  return videoId ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` : null;
};