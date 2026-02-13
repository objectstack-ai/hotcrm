import { describe, it, expect } from 'vitest';
import { PasswordPolicySchema, SessionPolicySchema, PolicySchema } from '@objectstack/spec/security';
import { NotificationChannelSchema } from '@objectstack/spec/system';
import { EnterprisePasswordPolicy } from '../../../src/password_policy.security';
import { EnterpriseSessionPolicy } from '../../../src/session_policy.security';
import { EnterpriseSecurityPolicy } from '../../../src/security_policy.security';
import {
  emailChannel,
  smsChannel,
  pushChannel,
  inAppChannel,
} from '../../../src/notification_channels.notification';

// ---------------------------------------------------------------------------
// Password Policy
// ---------------------------------------------------------------------------

describe('Core Password Policy Metadata Compliance', () => {
  describe('EnterprisePasswordPolicy', () => {
    it('should be defined', () => {
      expect(EnterprisePasswordPolicy).toBeDefined();
    });

    it('should validate against PasswordPolicySchema', () => {
      expect(() => PasswordPolicySchema.parse(EnterprisePasswordPolicy)).not.toThrow();
    });
  });
});

// ---------------------------------------------------------------------------
// Session Policy
// ---------------------------------------------------------------------------

describe('Core Session Policy Metadata Compliance', () => {
  describe('EnterpriseSessionPolicy', () => {
    it('should be defined', () => {
      expect(EnterpriseSessionPolicy).toBeDefined();
    });

    it('should validate against SessionPolicySchema', () => {
      expect(() => SessionPolicySchema.parse(EnterpriseSessionPolicy)).not.toThrow();
    });
  });
});

// ---------------------------------------------------------------------------
// Security Policy (composite)
// ---------------------------------------------------------------------------

describe('Core Security Policy Metadata Compliance', () => {
  describe('EnterpriseSecurityPolicy', () => {
    it('should be defined', () => {
      expect(EnterpriseSecurityPolicy).toBeDefined();
    });

    it('should validate against PolicySchema', () => {
      expect(() => PolicySchema.parse(EnterpriseSecurityPolicy)).not.toThrow();
    });
  });
});

// ---------------------------------------------------------------------------
// Notification Channels
// ---------------------------------------------------------------------------

describe('Core Notification Channels Metadata Compliance', () => {
  const channels = [
    { name: 'emailChannel', channel: emailChannel },
    { name: 'smsChannel', channel: smsChannel },
    { name: 'pushChannel', channel: pushChannel },
    { name: 'inAppChannel', channel: inAppChannel },
  ];

  describe.each(channels)('$name', ({ channel }) => {
    it('should be defined', () => {
      expect(channel).toBeDefined();
    });

    it('should validate against NotificationChannelSchema', () => {
      expect(() => NotificationChannelSchema.parse(channel)).not.toThrow();
    });
  });
});
