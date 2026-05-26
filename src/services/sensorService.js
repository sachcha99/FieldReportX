import { Accelerometer, Gyroscope } from 'expo-sensors';

let accelSubscription = null;
let gyroSubscription = null;

export function startAccelerometer(onData, intervalMs = 200) {
  Accelerometer.setUpdateInterval(intervalMs);
  accelSubscription = Accelerometer.addListener(onData);
  return accelSubscription;
}

export function stopAccelerometer() {
  if (accelSubscription) {
    accelSubscription.remove();
    accelSubscription = null;
  }
}

export function startGyroscope(onData, intervalMs = 200) {
  Gyroscope.setUpdateInterval(intervalMs);
  gyroSubscription = Gyroscope.addListener(onData);
  return gyroSubscription;
}

export function stopGyroscope() {
  if (gyroSubscription) {
    gyroSubscription.remove();
    gyroSubscription = null;
  }
}

// Compute smoothness score (0–100) from an array of accelerometer samples
// Lower overall magnitude variance = smoother = higher score
export function computeSmoothnessScore(samples) {
  if (!samples || samples.length < 2) return null;
  const magnitudes = samples.map((s) => Math.sqrt(s.x ** 2 + s.y ** 2 + s.z ** 2));
  const mean = magnitudes.reduce((a, b) => a + b, 0) / magnitudes.length;
  const variance =
    magnitudes.reduce((sum, m) => sum + (m - mean) ** 2, 0) / magnitudes.length;
  // variance around 0 = score 100, variance > 2 = score 0
  const score = Math.max(0, Math.min(100, Math.round(100 - variance * 30)));
  return score;
}

// Compute angle from gyroscope delta (degrees)
export function computeAngleDelta(samples, axis = 'x', intervalMs = 200) {
  if (!samples || samples.length === 0) return 0;
  const totalRad = samples.reduce((sum, s) => sum + Math.abs(s[axis]), 0);
  const totalDeg = (totalRad * intervalMs) / 1000 * (180 / Math.PI);
  return Math.round(totalDeg * 10) / 10;
}
