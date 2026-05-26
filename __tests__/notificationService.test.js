// Mock expo-notifications before importing the service
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  scheduleNotificationAsync: jest.fn().mockResolvedValue('mock-notification-id'),
  cancelAllScheduledNotificationsAsync: jest.fn().mockResolvedValue(undefined),
}));

import * as Notifications from 'expo-notifications';
import {
  requestNotificationPermission,
  scheduleReportReminder,
  scheduleFollowUpReminder,
  sendImmediateNotification,
  cancelAllNotifications,
} from '../src/services/notificationService';

describe('notificationService', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('requestNotificationPermission', () => {
    it('returns true when permission is granted', async () => {
      const result = await requestNotificationPermission();
      expect(result).toBe(true);
    });

    it('returns false when permission is denied', async () => {
      Notifications.requestPermissionsAsync.mockResolvedValueOnce({ status: 'denied' });
      const result = await requestNotificationPermission();
      expect(result).toBe(false);
    });
  });

  describe('scheduleReportReminder', () => {
    it('schedules a notification and returns an id', async () => {
      const id = await scheduleReportReminder('My Report', 60);
      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(1);
      const call = Notifications.scheduleNotificationAsync.mock.calls[0][0];
      expect(call.content.title).toBe('Report Reminder');
      expect(call.content.body).toContain('My Report');
      expect(call.trigger.seconds).toBe(60);
      expect(id).toBe('mock-notification-id');
    });

    it('returns null when permission is denied', async () => {
      Notifications.requestPermissionsAsync.mockResolvedValueOnce({ status: 'denied' });
      const result = await scheduleReportReminder('Report', 60);
      expect(result).toBeNull();
    });
  });

  describe('scheduleFollowUpReminder', () => {
    it('schedules a follow-up with the correct delay', async () => {
      await scheduleFollowUpReminder('Follow-up', 3);
      const call = Notifications.scheduleNotificationAsync.mock.calls[0][0];
      expect(call.trigger.seconds).toBe(3 * 24 * 3600);
      expect(call.content.title).toBe('Follow-up Reminder');
    });
  });

  describe('sendImmediateNotification', () => {
    it('sends a notification with null trigger', async () => {
      await sendImmediateNotification('Hello', 'World');
      const call = Notifications.scheduleNotificationAsync.mock.calls[0][0];
      expect(call.content.title).toBe('Hello');
      expect(call.content.body).toBe('World');
      expect(call.trigger).toBeNull();
    });
  });

  describe('cancelAllNotifications', () => {
    it('calls cancelAllScheduledNotificationsAsync', async () => {
      await cancelAllNotifications();
      expect(Notifications.cancelAllScheduledNotificationsAsync).toHaveBeenCalledTimes(1);
    });
  });
});
