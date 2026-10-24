const requestBuckets = new Map();

/**
 * In-memory sliding-window rate limiter
 * @param {object} options
 * @param {number} options.windowMs - Time window in milliseconds (default 60,000ms = 1 min)
 * @param {number} options.max - Maximum requests allowed per window (default 30)
 * @param {string} options.message - Error message returned when limit is exceeded
 */
export function createRateLimiter(options = {}) {
  const windowMs = options.windowMs || 60000;
  const max = options.max || 30;
  const message = options.message || 'Too many requests. Please try again later.';

  return (req, res, next) => {
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const key = `${req.baseUrl || req.path}:${ip}`;
    const now = Date.now();

    if (!requestBuckets.has(key)) {
      requestBuckets.set(key, []);
    }

    const timestamps = requestBuckets.get(key);
    // Remove timestamps outside window
    const validTimestamps = timestamps.filter((t) => now - t < windowMs);

    if (validTimestamps.length >= max) {
      const oldest = validTimestamps[0];
      const retryAfterSec = Math.ceil((windowMs - (now - oldest)) / 1000);
      res.setHeader('Retry-After', retryAfterSec);
      return res.status(429).json({
        success: false,
        error: message,
        retryAfterSec,
      });
    }

    validTimestamps.push(now);
    requestBuckets.set(key, validTimestamps);
    next();
  };
}

// Pre-configured rate limiters
export const authRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 15,
  message: 'Too many authentication attempts. Please wait 1 minute before retrying.',
});

export const otpRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 5,
  message: 'Too many verification code requests. Please wait before requesting another code.',
});
