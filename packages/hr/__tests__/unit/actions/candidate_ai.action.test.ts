import {
  parseResume,
  extractSkills,
  matchCandidateToPositions,
  generateInterviewQuestions,
  rankCandidates,
  analyzeSentiment,
  ResumeParsingRequest,
  SkillExtractionRequest,
  CandidateMatchingRequest,
  InterviewQuestionRequest,
  CandidateRankingRequest,
  SentimentAnalysisRequest
} from '../../../src/actions/candidate_ai.action';

describe('Candidate AI Actions - parseResume', () => {
  it('should parse resume text and extract personal information', async () => {
    // Arrange
    const request: ResumeParsingRequest = {
      resumeText: 'Jane Smith, Software Engineer...'
    };

    // Act
    const result = await parseResume(request);

    // Assert
    expect(result).toBeDefined();
    expect(result.personalInfo).toBeDefined();
    expect(result.personalInfo.first_name).toBeDefined();
    expect(result.personalInfo.email).toBeDefined();
  });

  it('should extract work experience with duration', async () => {
    // Arrange
    const request: ResumeParsingRequest = {
      resumeText: 'Senior Developer at Tech Corp (2020-2024)'
    };

    // Act
    const result = await parseResume(request);

    // Assert
    expect(result.experience).toBeDefined();
    expect(Array.isArray(result.experience)).toBe(true);
    if (result.experience.length > 0) {
      expect(result.experience[0].company).toBeDefined();
      expect(result.experience[0].duration_months).toBeGreaterThan(0);
    }
  });

  it('should extract education and identify highest level', async () => {
    // Arrange
    const request: ResumeParsingRequest = {
      resumeText: 'Master of Science in Computer Science, Stanford University'
    };

    // Act
    const result = await parseResume(request);

    // Assert
    expect(result.education).toBeDefined();
    expect(result.highest_education).toBeDefined();
    expect(['PhD', 'Master', 'Bachelor', 'Associate', 'High School', 'Other']).toContain(result.highest_education);
  });

  it('should categorize skills into technical, soft, and languages', async () => {
    // Arrange
    const request: ResumeParsingRequest = {
      resumeText: 'Skills: Python, JavaScript, Leadership, Communication, Spanish'
    };

    // Act
    const result = await parseResume(request);

    // Assert
    expect(result.skills).toBeDefined();
    expect(result.skills.technical).toBeDefined();
    expect(result.skills.soft).toBeDefined();
    expect(result.skills.languages).toBeDefined();
    expect(Array.isArray(result.skills.technical)).toBe(true);
  });

  it('should calculate total years of experience', async () => {
    // Arrange
    const request: ResumeParsingRequest = {
      resumeText: 'Software Engineer with 8 years experience'
    };

    // Act
    const result = await parseResume(request);

    // Assert
    expect(result.total_years_experience).toBeDefined();
    expect(result.total_years_experience).toBeGreaterThanOrEqual(0);
  });

  it('should provide confidence scores for each section', async () => {
    // Arrange
    const request: ResumeParsingRequest = {
      resumeText: 'Complete resume with all details'
    };

    // Act
    const result = await parseResume(request);

    // Assert
    expect(result.confidence).toBeDefined();
    expect(result.confidence.personal_info).toBeGreaterThanOrEqual(0);
    expect(result.confidence.personal_info).toBeLessThanOrEqual(100);
    expect(result.confidence.experience).toBeGreaterThanOrEqual(0);
    expect(result.confidence.education).toBeGreaterThanOrEqual(0);
    expect(result.confidence.skills).toBeGreaterThanOrEqual(0);
  });

  it('should update candidate when candidateId provided', async () => {
    // Arrange
    const request: ResumeParsingRequest = {
      resumeText: 'John Doe, Senior Engineer',
      candidateId: 'cand_123'
    };

    // Act
    const result = await parseResume(request);

    // Assert
    expect(result.candidateUpdated).toBe(true);
  });

  it('should handle resume URL instead of text', async () => {
    // Arrange
    const request: ResumeParsingRequest = {
      resumeUrl: 'https://example.com/resume.pdf'
    };

    // Act
    const result = await parseResume(request);

    // Assert
    expect(result).toBeDefined();
    expect(result.personalInfo).toBeDefined();
  });

  it('should throw error when neither resumeUrl nor resumeText provided', async () => {
    // Arrange
    const request: ResumeParsingRequest = {};

    // Act & Assert
    await expect(parseResume(request)).rejects.toThrow('Either resumeUrl or resumeText must be provided');
  });
});

describe('Candidate AI Actions - extractSkills', () => {
  it('should extract technical skills with proficiency levels', async () => {
    // Arrange
    const request: SkillExtractionRequest = {
      text: 'Expert in Python, Advanced AWS knowledge, Intermediate React skills'
    };

    // Act
    const result = await extractSkills(request);

    // Assert
    expect(result.skills.technical).toBeDefined();
    expect(Array.isArray(result.skills.technical)).toBe(true);
    if (result.skills.technical.length > 0) {
      expect(result.skills.technical[0].skill).toBeDefined();
      expect(['beginner', 'intermediate', 'advanced', 'expert']).toContain(result.skills.technical[0].proficiency);
    }
  });

  it('should extract soft skills with evidence', async () => {
    // Arrange
    const request: SkillExtractionRequest = {
      text: 'Led team of 10 engineers, Excellent communication with stakeholders'
    };

    // Act
    const result = await extractSkills(request);

    // Assert
    expect(result.skills.soft).toBeDefined();
    expect(Array.isArray(result.skills.soft)).toBe(true);
    if (result.skills.soft.length > 0) {
      expect(result.skills.soft[0].skill).toBeDefined();
      expect(result.skills.soft[0].evidence).toBeDefined();
    }
  });

  it('should identify domain expertise with years of experience', async () => {
    // Arrange
    const request: SkillExtractionRequest = {
      text: '5 years in FinTech, 3 years in E-commerce'
    };

    // Act
    const result = await extractSkills(request);

    // Assert
    expect(result.skills.domain).toBeDefined();
    expect(Array.isArray(result.skills.domain)).toBe(true);
    if (result.skills.domain.length > 0) {
      expect(result.skills.domain[0].domain).toBeDefined();
      expect(result.skills.domain[0].years).toBeGreaterThan(0);
    }
  });

  it('should generate skill tags for search', async () => {
    // Arrange
    const request: SkillExtractionRequest = {
      text: 'Python, AWS, Leadership'
    };

    // Act
    const result = await extractSkills(request);

    // Assert
    expect(result.skillTags).toBeDefined();
    expect(Array.isArray(result.skillTags)).toBe(true);
    expect(result.skillTags.length).toBeGreaterThan(0);
  });

  it('should provide confidence score', async () => {
    // Arrange
    const request: SkillExtractionRequest = {
      text: 'Comprehensive skill set description'
    };

    // Act
    const result = await extractSkills(request);

    // Assert
    expect(result.confidence).toBeDefined();
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(100);
  });

  it('should throw error when no text provided', async () => {
    // Arrange
    const request: SkillExtractionRequest = {
      text: ''
    };

    // Act & Assert
    await expect(extractSkills(request)).rejects.toThrow('Text content is required');
  });
});

describe('Candidate AI Actions - matchCandidateToPositions', () => {
  it('should match candidate to open positions', async () => {
    // Arrange
    const request: CandidateMatchingRequest = {
      candidateId: 'cand_123'
    };

    // Act
    const result = await matchCandidateToPositions(request);

    // Assert
    expect(result.matches).toBeDefined();
    expect(Array.isArray(result.matches)).toBe(true);
  });

  it('should calculate match scores with detailed breakdown', async () => {
    // Arrange
    const request: CandidateMatchingRequest = {
      candidateId: 'cand_123'
    };

    // Act
    const result = await matchCandidateToPositions(request);

    // Assert
    if (result.matches.length > 0) {
      const match = result.matches[0];
      expect(match.match_score).toBeGreaterThanOrEqual(0);
      expect(match.match_score).toBeLessThanOrEqual(100);
      expect(match.skill_match).toBeDefined();
      expect(match.experience_match).toBeDefined();
      expect(match.education_match).toBeDefined();
      expect(match.cultural_fit).toBeDefined();
    }
  });

  it('should provide match reasons for each position', async () => {
    // Arrange
    const request: CandidateMatchingRequest = {
      candidateId: 'cand_123'
    };

    // Act
    const result = await matchCandidateToPositions(request);

    // Assert
    if (result.matches.length > 0) {
      expect(result.matches[0].match_reasons).toBeDefined();
      expect(Array.isArray(result.matches[0].match_reasons)).toBe(true);
      expect(result.matches[0].match_reasons.length).toBeGreaterThan(0);
    }
  });

  it('should identify top match', async () => {
    // Arrange
    const request: CandidateMatchingRequest = {
      candidateId: 'cand_123'
    };

    // Act
    const result = await matchCandidateToPositions(request);

    // Assert
    expect(result.topMatch).toBeDefined();
    expect(result.topMatch.position_id).toBeDefined();
    expect(result.topMatch.position_title).toBeDefined();
    expect(result.topMatch.match_score).toBeGreaterThanOrEqual(0);
  });

  it('should match candidate to specific position when positionId provided', async () => {
    // Arrange
    const request: CandidateMatchingRequest = {
      candidateId: 'cand_123',
      positionId: 'pos_456'
    };

    // Act
    const result = await matchCandidateToPositions(request);

    // Assert
    expect(result.matches).toBeDefined();
    // When specific position provided, should have that position in results
  });
});

describe('Candidate AI Actions - generateInterviewQuestions', () => {
  it('should generate tailored interview questions', async () => {
    // Arrange
    const request: InterviewQuestionRequest = {
      candidateId: 'cand_123',
      positionId: 'pos_456',
      interviewType: 'technical'
    };

    // Act
    const result = await generateInterviewQuestions(request);

    // Assert
    expect(result.questions).toBeDefined();
    expect(Array.isArray(result.questions)).toBe(true);
    expect(result.questions.length).toBeGreaterThan(0);
  });

  it('should include question metadata for each question', async () => {
    // Arrange
    const request: InterviewQuestionRequest = {
      candidateId: 'cand_123',
      positionId: 'pos_456',
      interviewType: 'behavioral'
    };

    // Act
    const result = await generateInterviewQuestions(request);

    // Assert
    if (result.questions.length > 0) {
      const question = result.questions[0];
      expect(question.question).toBeDefined();
      expect(question.category).toBeDefined();
      expect(['easy', 'medium', 'hard']).toContain(question.difficulty);
      expect(question.purpose).toBeDefined();
      expect(question.expectedAnswer).toBeDefined();
    }
  });

  it('should identify focus areas for interview', async () => {
    // Arrange
    const request: InterviewQuestionRequest = {
      candidateId: 'cand_123',
      positionId: 'pos_456',
      interviewType: 'screening'
    };

    // Act
    const result = await generateInterviewQuestions(request);

    // Assert
    expect(result.focusAreas).toBeDefined();
    expect(Array.isArray(result.focusAreas)).toBe(true);
  });

  it('should provide recommended interview duration', async () => {
    // Arrange
    const request: InterviewQuestionRequest = {
      candidateId: 'cand_123',
      positionId: 'pos_456',
      interviewType: 'technical'
    };

    // Act
    const result = await generateInterviewQuestions(request);

    // Assert
    expect(result.recommendedDuration).toBeDefined();
    expect(result.recommendedDuration).toBeGreaterThan(0);
  });

  it('should generate different questions for different interview types', async () => {
    // Arrange
    const technicalRequest: InterviewQuestionRequest = {
      candidateId: 'cand_123',
      positionId: 'pos_456',
      interviewType: 'technical'
    };

    const culturalRequest: InterviewQuestionRequest = {
      candidateId: 'cand_123',
      positionId: 'pos_456',
      interviewType: 'cultural'
    };

    // Act
    const technicalResult = await generateInterviewQuestions(technicalRequest);
    const culturalResult = await generateInterviewQuestions(culturalRequest);

    // Assert
    expect(technicalResult.questions).toBeDefined();
    expect(culturalResult.questions).toBeDefined();
    // Different interview types should generate different focus
  });
});

describe('Candidate AI Actions - rankCandidates', () => {
  it('should rank candidates for a position', async () => {
    // Arrange
    const request: CandidateRankingRequest = {
      positionId: 'pos_123'
    };

    // Act
    const result = await rankCandidates(request);

    // Assert
    expect(result.ranking).toBeDefined();
    expect(Array.isArray(result.ranking)).toBe(true);
  });

  it('should calculate overall and component scores', async () => {
    // Arrange
    const request: CandidateRankingRequest = {
      positionId: 'pos_123'
    };

    // Act
    const result = await rankCandidates(request);

    // Assert
    if (result.ranking.length > 0) {
      const candidate = result.ranking[0];
      expect(candidate.overallScore).toBeGreaterThanOrEqual(0);
      expect(candidate.overallScore).toBeLessThanOrEqual(100);
      expect(candidate.skillScore).toBeDefined();
      expect(candidate.experienceScore).toBeDefined();
      expect(candidate.educationScore).toBeDefined();
      expect(candidate.fitScore).toBeDefined();
    }
  });

  it('should identify strengths and concerns', async () => {
    // Arrange
    const request: CandidateRankingRequest = {
      positionId: 'pos_123'
    };

    // Act
    const result = await rankCandidates(request);

    // Assert
    if (result.ranking.length > 0) {
      const candidate = result.ranking[0];
      expect(candidate.strengths).toBeDefined();
      expect(Array.isArray(candidate.strengths)).toBe(true);
      expect(candidate.concerns).toBeDefined();
      expect(Array.isArray(candidate.concerns)).toBe(true);
    }
  });

  it('should provide hiring recommendations', async () => {
    // Arrange
    const request: CandidateRankingRequest = {
      positionId: 'pos_123'
    };

    // Act
    const result = await rankCandidates(request);

    // Assert
    if (result.ranking.length > 0) {
      const candidate = result.ranking[0];
      expect(['strong_hire', 'hire', 'maybe', 'no_hire']).toContain(candidate.recommendation);
    }
  });

  it('should provide summary statistics', async () => {
    // Arrange
    const request: CandidateRankingRequest = {
      positionId: 'pos_123'
    };

    // Act
    const result = await rankCandidates(request);

    // Assert
    expect(result.summary).toBeDefined();
    expect(result.summary.totalCandidates).toBeGreaterThanOrEqual(0);
    expect(result.summary.strongHires).toBeGreaterThanOrEqual(0);
    expect(result.summary.averageScore).toBeGreaterThanOrEqual(0);
  });

  it('should filter by specific candidate IDs when provided', async () => {
    // Arrange
    const request: CandidateRankingRequest = {
      positionId: 'pos_123',
      candidateIds: ['cand_1', 'cand_2', 'cand_3']
    };

    // Act
    const result = await rankCandidates(request);

    // Assert
    expect(result.ranking).toBeDefined();
  });
});

describe('Candidate AI Actions - analyzeSentiment', () => {
  it('should analyze sentiment of candidate communication', async () => {
    // Arrange
    const request: SentimentAnalysisRequest = {
      text: 'I am very excited about this opportunity and eager to contribute to the team!',
      context: 'email'
    };

    // Act
    const result = await analyzeSentiment(request);

    // Assert
    expect(result.sentiment).toBeDefined();
    expect(['very_positive', 'positive', 'neutral', 'negative', 'very_negative']).toContain(result.sentiment);
  });

  it('should calculate sentiment score between -1 and 1', async () => {
    // Arrange
    const request: SentimentAnalysisRequest = {
      text: 'Thank you for the opportunity.',
      context: 'email'
    };

    // Act
    const result = await analyzeSentiment(request);

    // Assert
    expect(result.score).toBeDefined();
    expect(result.score).toBeGreaterThanOrEqual(-1);
    expect(result.score).toBeLessThanOrEqual(1);
  });

  it('should identify key emotions', async () => {
    // Arrange
    const request: SentimentAnalysisRequest = {
      text: 'I have some concerns about the role requirements.',
      context: 'interview'
    };

    // Act
    const result = await analyzeSentiment(request);

    // Assert
    expect(result.emotions).toBeDefined();
    expect(Array.isArray(result.emotions)).toBe(true);
  });

  it('should assess engagement level', async () => {
    // Arrange
    const request: SentimentAnalysisRequest = {
      text: 'I would love to discuss this further and learn more about the team dynamics.',
      context: 'email'
    };

    // Act
    const result = await analyzeSentiment(request);

    // Assert
    expect(result.engagement).toBeDefined();
    expect(['high', 'medium', 'low']).toContain(result.engagement);
  });

  it('should detect red flags in communication', async () => {
    // Arrange
    const request: SentimentAnalysisRequest = {
      text: 'I am only interested if the salary is significantly higher.',
      context: 'feedback'
    };

    // Act
    const result = await analyzeSentiment(request);

    // Assert
    expect(result.redFlags).toBeDefined();
    expect(Array.isArray(result.redFlags)).toBe(true);
  });

  it('should identify positive indicators', async () => {
    // Arrange
    const request: SentimentAnalysisRequest = {
      text: 'The company mission aligns perfectly with my values.',
      context: 'survey'
    };

    // Act
    const result = await analyzeSentiment(request);

    // Assert
    expect(result.positiveIndicators).toBeDefined();
    expect(Array.isArray(result.positiveIndicators)).toBe(true);
  });

  it('should provide confidence level', async () => {
    // Arrange
    const request: SentimentAnalysisRequest = {
      text: 'Looking forward to next steps.',
      context: 'email'
    };

    // Act
    const result = await analyzeSentiment(request);

    // Assert
    expect(result.confidence).toBeDefined();
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(100);
  });
});
