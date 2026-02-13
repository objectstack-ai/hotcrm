import type { NotificationChannel } from '@objectstack/spec/system';
import { NotificationChannelSchema } from '@objectstack/spec/system';

/** Standard email delivery channel. */
export const EmailChannel: NotificationChannel = 'email';
NotificationChannelSchema.parse(EmailChannel);

/** SMS text message delivery channel. */
export const SmsChannel: NotificationChannel = 'sms';
NotificationChannelSchema.parse(SmsChannel);

/** Mobile push notification delivery channel. */
export const PushChannel: NotificationChannel = 'push';
NotificationChannelSchema.parse(PushChannel);

/** In-application notification delivery channel. */
export const InAppChannel: NotificationChannel = 'in-app';
NotificationChannelSchema.parse(InAppChannel);

export default {
  EmailChannel,
  SmsChannel,
  PushChannel,
  InAppChannel,
};
