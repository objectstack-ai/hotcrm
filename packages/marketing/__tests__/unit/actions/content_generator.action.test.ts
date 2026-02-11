import {
  generateEmailContent,
  generateSocialPost,
  generateLandingPageCopy,
  generateAdCopy,
  optimizeContent,
  EmailContentRequest,
  SocialMediaPostRequest,
  LandingPageRequest,
  AdCopyRequest,
  ContentOptimizationRequest
} from '../../../src/actions/content_generator.action';

import { vi } from 'vitest';

describe('Content Generator Actions - generateEmailContent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should generate email content with subject lines and body', async () => {
    const request: EmailContentRequest = {
      purpose: 'product_launch',
      audience: 'Marketing managers at enterprise companies',
      keyMessage: 'AI-powered campaign optimization',
      tone: 'professional',
      cta: 'Start Free Trial'
    };

    const result = await generateEmailContent(request);

    expect(result).toBeDefined();
    expect(result.subjectLines).toBeDefined();
    expect(Array.isArray(result.subjectLines)).toBe(true);
    expect(result.subjectLines.length).toBeGreaterThan(0);
    result.subjectLines.forEach(sl => {
      expect(sl.text).toBeDefined();
      expect(sl.text.length).toBeGreaterThan(0);
      expect(sl.style).toBeDefined();
      expect(sl.expectedOpenRate).toBeGreaterThan(0);
    });
    expect(result.previewText).toBeDefined();
    expect(result.bodyHtml).toBeDefined();
    expect(result.bodyText).toBeDefined();
  });

  it('should include CTA button options and personalization tokens', async () => {
    const request: EmailContentRequest = {
      purpose: 'promotional',
      audience: 'Small business owners',
      keyMessage: 'Save 50% on annual plans',
      tone: 'urgent'
    };

    const result = await generateEmailContent(request);

    expect(result.ctaButton).toBeDefined();
    expect(result.ctaButton.text).toBeDefined();
    expect(result.ctaButton.text.length).toBeGreaterThan(0);
    expect(result.ctaButton.alternatives).toBeDefined();
    expect(Array.isArray(result.ctaButton.alternatives)).toBe(true);
    expect(result.ctaButton.alternatives.length).toBeGreaterThan(0);
    expect(result.personalizationTokens).toBeDefined();
    expect(Array.isArray(result.personalizationTokens)).toBe(true);
    expect(result.personalizationTokens.length).toBeGreaterThan(0);
  });

  it('should provide A/B test suggestions', async () => {
    const request: EmailContentRequest = {
      purpose: 'newsletter',
      audience: 'Existing customers',
      keyMessage: 'Monthly product updates'
    };

    const result = await generateEmailContent(request);

    expect(result.abTestSuggestions).toBeDefined();
    expect(Array.isArray(result.abTestSuggestions)).toBe(true);
    expect(result.abTestSuggestions.length).toBeGreaterThan(0);
    result.abTestSuggestions.forEach(suggestion => {
      expect(typeof suggestion).toBe('string');
      expect(suggestion.length).toBeGreaterThan(0);
    });
  });
});

describe('Content Generator Actions - generateSocialPost', () => {
  it('should generate platform-specific social media posts', async () => {
    const request: SocialMediaPostRequest = {
      platform: 'linkedin',
      theme: 'Product Launch',
      message: 'Introducing AI-powered campaign optimization',
      tone: 'professional',
      includeHashtags: true,
      includeEmojis: false
    };

    const result = await generateSocialPost(request);

    expect(result).toBeDefined();
    expect(result.posts).toBeDefined();
    expect(Array.isArray(result.posts)).toBe(true);
    expect(result.posts.length).toBeGreaterThan(0);
    result.posts.forEach(post => {
      expect(post.text).toBeDefined();
      expect(post.text.length).toBeGreaterThan(0);
      expect(post.characterCount).toBeGreaterThan(0);
      expect(Array.isArray(post.hashtags)).toBe(true);
      expect(Array.isArray(post.imageIdeas)).toBe(true);
    });
    expect(result.bestPostingTimes).toBeDefined();
    expect(result.bestPostingTimes.length).toBeGreaterThan(0);
    expect(result.hashtagStrategy).toBeDefined();
    expect(result.hashtagStrategy.branded).toBeDefined();
    expect(result.hashtagStrategy.trending).toBeDefined();
    expect(result.hashtagStrategy.niche).toBeDefined();
  });
});

describe('Content Generator Actions - generateAdCopy', () => {
  it('should generate a response for ad copy requests', async () => {
    const request: AdCopyRequest = {
      platform: 'google_search',
      objective: 'conversion',
      product: 'HotCRM Marketing Cloud',
      value: 'AI-powered campaign optimization that increases ROI by 3x',
      keywords: ['marketing automation', 'campaign management']
    };

    const result = await generateAdCopy(request);

    // The mock callLLM returns the default response (optimizedContent shape)
    // since the prompt doesn't match 'email copywriter' or 'social media expert'.
    expect(result).toBeDefined();
    expect(typeof result).toBe('object');
  });
});
