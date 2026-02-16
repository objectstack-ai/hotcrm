/**
 * System Reference Seed Data
 * Provides foundational reference data for currencies, countries, industries, timezones, and languages
 */

export const SystemSeedData = {
  currencies: [
    { code: 'USD', name: 'US Dollar', symbol: '$', decimal_places: 2 },
    { code: 'EUR', name: 'Euro', symbol: '€', decimal_places: 2 },
    { code: 'GBP', name: 'British Pound', symbol: '£', decimal_places: 2 },
    { code: 'JPY', name: 'Japanese Yen', symbol: '¥', decimal_places: 0 },
    { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', decimal_places: 2 },
    { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', decimal_places: 2 },
    { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', decimal_places: 2 },
    { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF', decimal_places: 2 },
  ],
  countries: [
    { code: 'US', name: 'United States', region: 'North America' },
    { code: 'GB', name: 'United Kingdom', region: 'Europe' },
    { code: 'DE', name: 'Germany', region: 'Europe' },
    { code: 'FR', name: 'France', region: 'Europe' },
    { code: 'JP', name: 'Japan', region: 'Asia Pacific' },
    { code: 'CN', name: 'China', region: 'Asia Pacific' },
    { code: 'CA', name: 'Canada', region: 'North America' },
    { code: 'AU', name: 'Australia', region: 'Asia Pacific' },
    { code: 'IN', name: 'India', region: 'Asia Pacific' },
    { code: 'BR', name: 'Brazil', region: 'South America' },
  ],
  industries: [
    { code: 'TECH', name: 'Technology', sector: 'Information Technology' },
    { code: 'FIN', name: 'Financial Services', sector: 'Finance' },
    { code: 'HEALTH', name: 'Healthcare', sector: 'Healthcare' },
    { code: 'MFG', name: 'Manufacturing', sector: 'Industrials' },
    { code: 'RETAIL', name: 'Retail', sector: 'Consumer' },
    { code: 'EDU', name: 'Education', sector: 'Education' },
    { code: 'ENERGY', name: 'Energy', sector: 'Energy' },
    { code: 'MEDIA', name: 'Media & Entertainment', sector: 'Communication' },
    { code: 'REAL', name: 'Real Estate', sector: 'Real Estate' },
    { code: 'GOV', name: 'Government', sector: 'Public Sector' },
  ],
  // Offsets represent standard time (non-DST). Use the timezone ID for accurate calculations.
  timezones: [
    { id: 'America/New_York', label: 'Eastern Time (US)', offset: -5 },
    { id: 'America/Chicago', label: 'Central Time (US)', offset: -6 },
    { id: 'America/Denver', label: 'Mountain Time (US)', offset: -7 },
    { id: 'America/Los_Angeles', label: 'Pacific Time (US)', offset: -8 },
    { id: 'Europe/London', label: 'Greenwich Mean Time', offset: 0 },
    { id: 'Europe/Berlin', label: 'Central European Time', offset: 1 },
    { id: 'Asia/Tokyo', label: 'Japan Standard Time', offset: 9 },
    { id: 'Asia/Shanghai', label: 'China Standard Time', offset: 8 },
  ],
  languages: [
    { code: 'en', name: 'English', native_name: 'English' },
    { code: 'zh-CN', name: 'Chinese (Simplified)', native_name: '简体中文' },
    { code: 'ja', name: 'Japanese', native_name: '日本語' },
    { code: 'de', name: 'German', native_name: 'Deutsch' },
    { code: 'fr', name: 'French', native_name: 'Français' },
    { code: 'es', name: 'Spanish', native_name: 'Español' },
  ],
};

export default SystemSeedData;
