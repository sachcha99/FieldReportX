import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { ENV } from '../config/env';

// Lazy-require so the app doesn't crash in Expo Go where native modules are absent
let BannerAd, BannerAdSize, TestIds;
try {
  const ads = require('react-native-google-mobile-ads');
  BannerAd = ads.BannerAd;
  BannerAdSize = ads.BannerAdSize;
  TestIds = ads.TestIds;
} catch {
  // Module not available (Expo Go dev environment)
}

export default function AdBanner({ style }) {
  if (!BannerAd) {
    // Fallback placeholder shown in Expo Go
    return (
      <View style={[styles.placeholder, style]}>
        <Text style={styles.placeholderText}>Ad (available in production build)</Text>
      </View>
    );
  }

  const unitId =
    __DEV__
      ? TestIds.BANNER
      : ENV.admob.bannerUnitId;

  return (
    <View style={[styles.container, style]}>
      <BannerAd
        unitId={unitId}
        size={BannerAdSize.BANNER}
        requestOptions={{ requestNonPersonalizedAdsOnly: true }}
        onAdFailedToLoad={(err) => console.warn('AdBanner load failed:', err.message)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center' },
  placeholder: {
    height: 52,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
  },
  placeholderText: { fontSize: 11, color: '#9ca3af' },
});
