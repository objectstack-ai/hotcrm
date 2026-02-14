/**
 * Connector Rate Limit Configuration
 *
 * Rate limiting settings for external connector API calls.
 * Each connector has provider-specific limits based on their API quotas.
 */

import type { RateLimitConfig } from '@objectstack/spec/integration';
import { RateLimitConfigSchema } from '@objectstack/spec/integration';

export const StripeRateLimit = {
  strategy: 'token_bucket',
  maxRequests: 100,
  windowSeconds: 1,
  respectUpstreamLimits: true,
} satisfies RateLimitConfig;

RateLimitConfigSchema.parse(StripeRateLimit);

export const DocusignRateLimit = {
  strategy: 'token_bucket',
  maxRequests: 50,
  windowSeconds: 1,
  respectUpstreamLimits: true,
} satisfies RateLimitConfig;

RateLimitConfigSchema.parse(DocusignRateLimit);

export const SlackRateLimit = {
  strategy: 'token_bucket',
  maxRequests: 1,
  windowSeconds: 1,
  respectUpstreamLimits: true,
} satisfies RateLimitConfig;

RateLimitConfigSchema.parse(SlackRateLimit);

export const GmailRateLimit = {
  strategy: 'sliding_window',
  maxRequests: 250,
  windowSeconds: 100,
  respectUpstreamLimits: true,
} satisfies RateLimitConfig;

RateLimitConfigSchema.parse(GmailRateLimit);

export const TeamsRateLimit = {
  strategy: 'sliding_window',
  maxRequests: 60,
  windowSeconds: 60,
  respectUpstreamLimits: true,
} satisfies RateLimitConfig;

RateLimitConfigSchema.parse(TeamsRateLimit);

export const DefaultConnectorRateLimit = {
  strategy: 'token_bucket',
  maxRequests: 30,
  windowSeconds: 1,
  respectUpstreamLimits: true,
} satisfies RateLimitConfig;

RateLimitConfigSchema.parse(DefaultConnectorRateLimit);

export default {
  StripeRateLimit,
  DocusignRateLimit,
  SlackRateLimit,
  GmailRateLimit,
  TeamsRateLimit,
  DefaultConnectorRateLimit,
};
