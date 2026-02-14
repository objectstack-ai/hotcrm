import { defineStack } from '@objectstack/spec';
import { EducationPlugin } from './src/plugin';

/**
 * Education Package Configuration
 *
 * Standalone configuration for the Education package.
 * Can be used to run or test the Education package independently.
 */
export default defineStack({
  manifest: {
    id: 'com.hotcrm.education',
    namespace: 'education',
    version: '1.0.0',
    type: 'plugin',
    name: 'Education Cloud',
    description: 'Education management - Students, Courses, Enrollments, Scholarships, and Alumni Engagement',
  },

  plugins: [EducationPlugin],
});
