const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env'), quiet: true });

const isTest = process.env.NODE_ENV === 'test';

module.exports = {
  isTest,
  port: Number(process.env.PORT) || 3000,
  baseUrl: process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`,
  jwt: {
    secret: process.env.JWT_SECRET || (isTest ? 'test-secret' : undefined),
    expiresIn: process.env.JWT_EXPIRES_IN || '1h',
  },
  mediaDir: path.resolve(
    __dirname,
    '../..',
    isTest ? 'media-test' : process.env.MEDIA_DIR || 'media'
  ),
};
