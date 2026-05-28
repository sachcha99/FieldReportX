import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function requestNotificationPermission() {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

// Registers the device for remote (push) notifications and returns the Expo push token.
// Token can be used with the Expo Push API or Firebase Cloud Messaging to send remote alerts.
export async function registerForRemoteNotifications() {
  const granted = await requestNotificationPermission();
  if (!granted) return null;

  // Android requires a notification channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'FieldReportX',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#2563EB',
    });
  }

  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  try {
    const tokenData = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
    return tokenData.data; // e.g. "ExponentPushToken[xxxxx]"
  } catch {
    // getExpoPushTokenAsync fails in Expo Go without a project ID — return a placeholder
    return 'ExponentPushToken[DevMode-NeedsEASBuild]';
  }
}

// Call from the server/cloud function to simulate receiving a remote notification.
// In production, the Expo Push API sends these; this helper fires one locally for testing.
export async function simulateRemoteNotification(type = 'new_template', payload = {}) {
  const titles = {
    new_template: 'New Template Available',
    template_update: 'Template Updated',
    announcement: 'FieldReportX Announcement',
  };
  const bodies = {
    new_template: payload.name ? `"${payload.name}" template is now available.` : 'A new report template is ready to use.',
    template_update: payload.name ? `"${payload.name}" template has been updated.` : 'A template has been updated.',
    announcement: payload.message || 'Check the app for the latest news.',
  };
  return sendImmediateNotification(titles[type] || 'FieldReportX', bodies[type] || '');
}

// Listener — pass a callback to handle incoming remote notifications while the app is open
export function addRemoteNotificationListener(callback) {
  return Notifications.addNotificationReceivedListener(callback);
}

export async function scheduleReportReminder(reportTitle, delaySeconds = 3600) {
  const granted = await requestNotificationPermission();
  if (!granted) return null;
  return Notifications.scheduleNotificationAsync({
    content: {
      title: 'Report Reminder',
      body: `You have an unfinished report: ${reportTitle}`,
      data: { type: 'report_reminder' },
    },
    trigger: { seconds: delaySeconds },
  });
}

export async function scheduleFollowUpReminder(reportTitle, daysLater = 7) {
  const granted = await requestNotificationPermission();
  if (!granted) return null;
  return Notifications.scheduleNotificationAsync({
    content: {
      title: 'Follow-up Reminder',
      body: `Time to follow up on: ${reportTitle}`,
      data: { type: 'follow_up' },
    },
    trigger: { seconds: daysLater * 24 * 3600 },
  });
}

export async function sendImmediateNotification(title, body) {
  const granted = await requestNotificationPermission();
  if (!granted) return null;
  return Notifications.scheduleNotificationAsync({
    content: { title, body },
    trigger: null,
  });
}

export async function cancelAllNotifications() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
