/**
 * Credential Encryption Configuration
 *
 * Defines encryption settings for connector authentication tokens
 * and sensitive credential fields stored in the integration package.
 */

import type { EncryptionConfig, FieldEncryption } from '@objectstack/spec/system';
import { EncryptionConfigSchema, FieldEncryptionSchema } from '@objectstack/spec/system';

const credentialEncryptionBase = {
  enabled: true,
  algorithm: 'aes-256-gcm',
  keyManagement: {
    provider: 'hashicorp-vault',
    keyId: 'connector-credentials-key',
  },
  scope: 'field',
  deterministicEncryption: false,
  searchableEncryption: false,
} satisfies EncryptionConfig;

EncryptionConfigSchema.parse(credentialEncryptionBase);

const encryptedFields = [
  'auth_token',
  'refresh_token',
  'api_secret',
  'client_secret',
  'credentials_ref',
] as const;

export const ConnectorCredentialEncryption = encryptedFields.map((fieldName) => {
  const config = {
    fieldName,
    encryptionConfig: credentialEncryptionBase,
    indexable: false,
  } satisfies FieldEncryption;

  FieldEncryptionSchema.parse(config);
  return config;
});

export const connectorCredentialEncryptionConfig = {
  name: 'connector_credential_encryption',
  label: 'Connector Credential Encryption',
  algorithm: credentialEncryptionBase.algorithm,
  fields: [...encryptedFields],
  key_rotation_days: 90,
  at_rest: true,
  in_transit: true,
  encryption: credentialEncryptionBase,
};

export default connectorCredentialEncryptionConfig;
