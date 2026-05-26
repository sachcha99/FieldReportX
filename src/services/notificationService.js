import * as Notifications from 'expo-notifications';

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
