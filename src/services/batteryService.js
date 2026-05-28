import * as Battery from 'expo-battery';

export async function getBatteryLevel() {
  try {
    const level = await Battery.getBatteryLevelAsync();
    if (level == null || isNaN(level) || level < 0) return null;
    return Math.min(100, Math.round(level * 100));
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
  const [level, state, isLowPower] = await Promise.all([
    Battery.getBatteryLevelAsync().catch(() => -1),
    Battery.getBatteryStateAsync().catch(() => Battery.BatteryState.UNKNOWN),
    Battery.isLowPowerModeEnabledAsync().catch(() => false),
  ]);
  return {
    percent: (level != null && !isNaN(level) && level >= 0) ? Math.min(100, Math.round(level * 100)) : null,
    state,
    isLowPower,
    isCharging: state === Battery.BatteryState.CHARGING,
    isFull: state === Battery.BatteryState.FULL,
  };
}

export function subscribeBatteryLevel(callback) {
  return Battery.addBatteryLevelListener(({ batteryLevel }) => {
    if (batteryLevel >= 0 && batteryLevel <= 1) {
      callback(Math.round(batteryLevel * 100));
    }
  });
}
