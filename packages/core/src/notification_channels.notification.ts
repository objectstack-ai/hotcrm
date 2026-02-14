import { NotificationChannelSchema } from '@objectstack/spec/system';

type NotificationChannel = typeof NotificationChannelSchema extends { _output: infer T } ? T : never;

/**
 * Standard email notification channel.
 */
export const emailChannel: NotificationChannel =
  NotificationChannelSchema.parse('email');

/**
 * SMS notification channel for mobile alerts.
 */
export const smsChannel: NotificationChannel =
  NotificationChannelSchema.parse('sms');

/**
 * Push notification channel for mobile devices.
 */
export const pushChannel: NotificationChannel =
  NotificationChannelSchema.parse('push');

/**
 * In-app notification channel for real-time UI alerts.
 */
export const inAppChannel: NotificationChannel =
  NotificationChannelSchema.parse('in-app');

export const notificationChannels = {
  emailChannel,
  smsChannel,
  pushChannel,
  inAppChannel,
};

export default notificationChannels;
