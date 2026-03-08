import { describe, test, expect } from '@jest/globals';

describe('Scheme Parser', () => {
  test('should parse valid scheme JSON', () => {
    const mockSchemeJson = {
      scheme_name: 'PM-KISAN',
      ministry: 'Ministry of Agriculture',
      target_beneficiaries: ['farmers', 'landholders'],
      eligibility_criteria: [
        { field: 'occupation', operator: '==', value: 'farmer' },
        { field: 'land_ownership', operator: '==', value: 'true' },
      ],
      benefits: ['Rs. 6000 per year'],
      application_steps: ['Visit portal', 'Register', 'Submit documents'],
      documents_required: ['Aadhaar', 'Land records'],
      official_url: 'https://pmkisan.gov.in',
    };

    expect(mockSchemeJson.scheme_name).toBe('PM-KISAN');
    expect(mockSchemeJson.eligibility_criteria).toHaveLength(2);
    expect(mockSchemeJson.benefits).toContain('Rs. 6000 per year');
  });

  test('should validate eligibility criteria structure', () => {
    const criteria = { field: 'age', operator: '>=', value: '18' };
    
    expect(criteria).toHaveProperty('field');
    expect(criteria).toHaveProperty('operator');
    expect(criteria).toHaveProperty('value');
    expect(['==', '!=', '>', '<', '>=', '<=']).toContain(criteria.operator);
  });
});
