export interface FormattedAnalysisError {
  title: string;
  message: string;
  isServerOffline: boolean;
  isInappropriate?: boolean;
  category?: string;
  imageUri?: string;
}

/**
 * Transforms an inappropriate or non-actionable classification into a graceful, helpful error message.
 */
export function getInappropriateScreenshotError(
  category?: string,
  reason?: string,
  imageUri?: string
): FormattedAnalysisError {
  const rawCat = (category || 'personal-photo').toLowerCase().trim();
  const readableCategory = rawCat
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

  const explanation =
    reason && reason.trim().length > 10
      ? reason.trim()
      : `Identified as ${readableCategory}. Screenalyze focuses exclusively on technical content, code snippets, architecture diagrams, UI designs, and tutorials.`;

  return {
    title: 'Screenshot Filtered',
    message: explanation,
    isServerOffline: false,
    isInappropriate: true,
    category: readableCategory,
    imageUri,
  };
}

/**
 * Checks if an error is due to the backend server being unreachable or offline.
 */
export function isServerOfflineError(err: unknown): boolean {
  if (!err) return false;
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
  return (
    msg.includes('network request failed') ||
    msg.includes('failed to fetch') ||
    msg.includes('fetch failed') ||
    msg.includes('connection refused') ||
    msg.includes('econnrefused') ||
    msg.includes('networkerror') ||
    msg.includes('enotfound') ||
    msg.includes('timeout') ||
    msg.includes('timed out') ||
    msg.includes('health check failed') ||
    msg.includes('server is off') ||
    msg.includes('server is offline') ||
    msg.includes('backend connection notice') ||
    msg.includes('(502)') ||
    msg.includes('(503)') ||
    msg.includes('(504)')
  );
}

/**
 * Transforms any caught error into a friendly, user-facing error object.
 */
export function getFriendlyAnalysisError(err: unknown): FormattedAnalysisError {
  if (isServerOfflineError(err)) {
    return {
      title: 'Server is off',
      message: 'The backend server is off or unreachable. Please start the server (npm run backend:dev) to analyze screenshots.',
      isServerOffline: true,
    };
  }

  const raw = err instanceof Error ? err.message : String(err || 'Visual analysis failed');
  return {
    title: 'Analysis Issue',
    message: raw,
    isServerOffline: false,
  };
}
