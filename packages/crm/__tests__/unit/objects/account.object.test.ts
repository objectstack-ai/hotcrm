import { Account } from '../../../src/account.object';

describe('Account Object Schema Validation', () => {
  it('should have correct object name', () => {
    expect(Account.name).toBe('account');
  });

  it('should have required fields defined', () => {
    expect(Account.fields).toBeDefined();
    expect(Account.fields.name).toBeDefined();
    expect(Account.fields.owner_id).toBeDefined();
  });

  it('should mark name field as required', () => {
    expect(Account.fields.name.required).toBe(true);
  });

  it('should mark owner_id field as required', () => {
    expect(Account.fields.owner_id.required).toBe(true);
  });

  it('should have correct field types', () => {
    expect(Account.fields.name.type).toBe('text');
    expect(Account.fields.annual_revenue.type).toBe('currency');
    expect(Account.fields.number_of_employees.type).toBe('number');
    expect(Account.fields.website.type).toBe('url');
    expect(Account.fields.email.type).toBe('email');
    expect(Account.fields.phone.type).toBe('phone');
  });

  it('should have correct select field options', () => {
    expect(Account.fields.type.type).toBe('select');
    expect(Account.fields.type.options).toHaveLength(5);
    expect(Account.fields.type.options[0].value).toBe('prospect');
  });

  it('should have industry field with valid options', () => {
    expect(Account.fields.industry.type).toBe('select');
    expect(Account.fields.industry.options.length).toBeGreaterThan(0);
    const industries = Account.fields.industry.options.map((o: any) => o.value);
    expect(industries).toContain('technology');
    expect(industries).toContain('finance');
  });



  it('should have enable flags configured', () => {
    expect(Account.enable).toBeDefined();
    expect(Account.enable.searchable).toBe(true);
    expect(Account.enable.activities).toBe(true);
  });

  it('should have unique constraint on name field', () => {
    expect(Account.fields.name.unique).toBe(true);
  });

  it('should have correct maxLength on text fields', () => {
    expect(Account.fields.name.maxLength).toBe(255);
    expect(Account.fields.billing_city.maxLength).toBe(40);
  });

  it('should have owner_id with lookup to users', () => {
    expect(Account.fields.owner_id.type).toBe('lookup');
    expect(Account.fields.owner_id.reference).toBe('users');
  });

  it('should have health_score field with correct constraints', () => {
    expect(Account.fields.health_score.type).toBe('number');
    expect(Account.fields.health_score.min).toBe(0);
    expect(Account.fields.health_score.max).toBe(100);
  });
});
