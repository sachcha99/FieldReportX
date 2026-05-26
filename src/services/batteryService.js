import * as Battery from 'expo-battery';

export async function getBatteryLevel() {
  try {
    const level = await Battery.getBatteryLevelAsync();
    if (level < 0 || level > 1) return null;
    return Math.round(level * 100);
  } catch {
    return null;
  }
}

export async function getBatteryState() {
  try {
    const state = await Battery.getBatteryStateAsync();
    return state;
  } catch {
    return Battery.BatteryState.UNKNOWN;
  }
}

export async function getBatteryInfo() {
  try {
    const [level, state, isLowPower] = await Promise.all([
      Battery.getBatteryLevelAsync(),
      Battery.getBatteryStateAsync(),
      Battery.isLowPowerModeEnabledAsync(),
    ]);
    return {
      percent: (level >= 0 && level <= 1) ? Math.round(level * 100) : null,
      state,
      isLowPower,
      isCharging: state === Battery.BatteryState.CHARGING,
      isFull: state === Battery.BatteryState.FULL,
    };
  } catch {
    return { percent: null, state: Battery.BatteryState.UNKNOWN, isLowPower: false, isCharging: false, isFull: false };
  }
}

export function subscribeBatteryLevel(callback) {
  return Battery.addBatteryLevelListener(({ batteryLevel }) => {
    if (batteryLevel >= 0 && batteryLevel <= 1) {
      callback(Math.round(batteryLevel * 100));
    }
  });
}
