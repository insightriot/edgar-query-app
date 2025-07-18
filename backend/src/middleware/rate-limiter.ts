import rateLimit from 'express-rate-limit';

export const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
    statusCode: 429,
    timestamp: new Date().toISOString()
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

export const strictRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10, // limit each IP to 10 requests per minute
  message: {
    error: 'Too many requests from this IP, please try again later.',
    statusCode: 429,
    timestamp: new Date().toISOString()
  },
});

export const secApiRateLimiter = rateLimit({
  windowMs: 1000, // 1 second
  max: 10, // limit to 10 requests per second to comply with SEC requirements
  message: {
    error: 'SEC API rate limit exceeded, please try again later.',
    statusCode: 429,
    timestamp: new Date().toISOString()
  },
});