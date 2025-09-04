/**
 * Extracts YouTube video ID from various YouTube URL formats
 * Supports: youtube.com/watch?v=ID, youtu.be/ID, youtube.com/embed/ID
 */
export const extractYouTubeVideoId = (url: string): string | null => {
  if (!url) return null;
  
  // Sanitize URL and validate format
  const sanitizedUrl = url.trim();
  
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/v\/([^&\n?#]+)/,
  ];
  
  for (const pattern of patterns) {
    const match = sanitizedUrl.match(pattern);
    if (match && match[1]) {
      const videoId = match[1];
      // Validate YouTube video ID format (11 characters, alphanumeric + underscore/hyphen)
      if (/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
        return videoId;
      }
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