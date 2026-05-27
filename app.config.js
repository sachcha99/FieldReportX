const appJson = require('./app.json');

module.exports = ({ config }) => ({
  ...appJson.expo,
  extra: {
    eas: {
      projectId: '555e43bf-9ed8-4f01-8d85-61d5f6dea41e',
    },
    FIREBASE_API_KEY: process.env.FIREBASE_API_KEY || '',
    FIREBASE_AUTH_DOMAIN: process.env.FIREBASE_AUTH_DOMAIN || '',
    FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID || '',
    FIREBASE_STORAGE_BUCKET: process.env.FIREBASE_STORAGE_BUCKET || '',
    FIREBASE_MESSAGING_SENDER_ID: process.env.FIREBASE_MESSAGING_SENDER_ID || '',
    FIREBASE_APP_ID: process.env.FIREBASE_APP_ID || '',
    ADMOB_ANDROID_APP_ID:
      process.env.ADMOB_ANDROID_APP_ID ||
      'ca-app-pub-3940256099942544~3347511713',
    ADMOB_IOS_APP_ID:
      process.env.ADMOB_IOS_APP_ID ||
      'ca-app-pub-3940256099942544~1458002511',
    ADMOB_BANNER_UNIT_ID:
      process.env.ADMOB_BANNER_UNIT_ID ||
      'ca-app-pub-3940256099942544/6300978111',
    WHISPER_API_KEY: process.env.WHISPER_API_KEY || null,
  },
  plugins: [
    ...appJson.expo.plugins,
  ],
});
