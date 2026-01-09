export default () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5781', 10),

  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3315', 10),
    username: process.env.DB_USERNAME || 'mupay',
    password: process.env.DB_PASSWORD || 'mupay_123',
    database: process.env.DB_DATABASE || 'mupay',
  },

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6386', 10),
    password: process.env.REDIS_PASSWORD || '',
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'mupay-jwt-secret-key',
    accessTokenExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
    refreshTokenExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
  },

  adminJwt: {
    secret: process.env.ADMIN_JWT_SECRET || 'mupay-admin-jwt-secret-key',
    accessTokenExpiry: process.env.ADMIN_JWT_ACCESS_EXPIRY || '1h',
  },

  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    callbackUrl: process.env.GOOGLE_CALLBACK_URL || '',
  },

  encryption: {
    key: process.env.ENCRYPTION_KEY || 'mupay-aes-encryption-key-32char',
  },

  email: {
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT || '587', 10),
    secure: process.env.EMAIL_SECURE === 'true',
    user: process.env.EMAIL_USER || '',
    password: process.env.EMAIL_PASSWORD || '',
    from: process.env.EMAIL_FROM || 'MuPay <noreply@mupay.com>',
  },
});
