import Constants from 'expo-constants';

// Read extra at call-time, not module-load-time.
// Constants.expoConfig.extra is populated by the Expo Go manifest received
// from the Metro server; manifest2 is the newer EAS protocol variant.
function getExtra() {
  return (
    Constants.expoConfig?.extra ??
    Constants.manifest2?.extra ??
    Constants.manifest?.extra ??
    {}
  );
}

// One-shot debug log (dev only) — check Metro terminal output after restart
if (__DEV__) {
  setTimeout(() => {
    const e = getExtra();
    console.log('[ENV] expoConfig.extra:', JSON.stringify(Constants.expoConfig?.extra ?? null));
    console.log('[ENV] FIREBASE_API_KEY present:', Boolean(e.FIREBASE_API_KEY));
    console.log('[ENV] FIREBASE_PROJECT_ID present:', Boolean(e.FIREBASE_PROJECT_ID));
  }, 2000);
}

export const ENV = {
  get firebase() {
    const e = getExtra();
    return {
      apiKey: e.FIREBASE_API_KEY || '',
      authDomain: e.FIREBASE_AUTH_DOMAIN || '',
      projectId: e.FIREBASE_PROJECT_ID || '',
      storageBucket: e.FIREBASE_STORAGE_BUCKET || '',
      messagingSenderId: e.FIREBASE_MESSAGING_SENDER_ID || '',
      appId: e.FIREBASE_APP_ID || '',
    };
  },
  get admob() {
    const e = getExtra();
    return {
      androidAppId: e.ADMOB_ANDROID_APP_ID || 'ca-app-pub-3940256099942544~3347511713',
      iosAppId: e.ADMOB_IOS_APP_ID || 'ca-app-pub-3940256099942544~1458002511',
      bannerUnitId: e.ADMOB_BANNER_UNIT_ID || 'ca-app-pub-3940256099942544/6300978111',
    };
  },
};

export const isFirebaseConfigured = () => {
  const e = getExtra();
  return Boolean(e.FIREBASE_API_KEY && e.FIREBASE_PROJECT_ID);
};
