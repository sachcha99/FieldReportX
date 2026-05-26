// Jest mock for src/config/env.js
export const ENV = {
  firebase: {
    apiKey: 'test-api-key',
    authDomain: 'test.firebaseapp.com',
    projectId: 'test-project',
    storageBucket: 'test.appspot.com',
    messagingSenderId: '123',
    appId: '1:123:android:abc',
  },
  admob: {
    androidAppId: 'ca-app-pub-3940256099942544~3347511713',
    iosAppId: 'ca-app-pub-3940256099942544~1458002511',
    bannerUnitId: 'ca-app-pub-3940256099942544/6300978111',
  },
};

export const isFirebaseConfigured = () => true;
