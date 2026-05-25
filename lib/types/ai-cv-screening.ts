export type AiCvScreeningStatus = "PENDING" | "COMPLETED" | "FAILED";

export type AiCvScreeningResult = {
  matchScore: number;
  summary: string;
  extractedSkills: string[];
  extractedExperience: string[];
  matchedRequirements: string[];
  gaps: string[];
  reasoning: string;
};

export type AiCvScreeningRecord = {
  id: string;
  jobApplicationId: string;
  status: AiCvScreeningStatus; 
  matchScore: number | null;
  summary: string | null;
  extractedSkills: string[];
  extractedExperience: string[];
  matchedRequirements: string[];
  gaps: string[];
  reasoning: string | null;
  model: string | null;
  errorMessage: string | null;
  screenedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AiCvScreeningContext = {
  applicationId: string;
  applicantName: string;
  jobTitle: string;
  cvFileName: string | null;
  screening: AiCvScreeningRecord | null;
};
