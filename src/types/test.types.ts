import { Timestamp } from 'firebase/firestore';

// Question Types
export type QuestionType = 'MULTIPLE_CHOICE' | 'TEXT' | 'SCALE' | 'YES_NO';

export interface QuestionOption {
  id: string;
  text: string;
  value?: number; // For scoring
}

export interface Question {
  id: string;
  type: QuestionType;
  text: string;
  required: boolean;
  options?: QuestionOption[]; // For MULTIPLE_CHOICE
  scaleMin?: number; // For SCALE (default 1)
  scaleMax?: number; // For SCALE (default 10)
  scaleMinLabel?: string; // For SCALE
  scaleMaxLabel?: string; // For SCALE
}

// Test Definition (Template)
export interface TestDefinition {
  id: string;
  title: string;
  description: string;
  instructions?: string;
  createdBy: string; // Therapist UID or 'SYSTEM'
  tenantId: string | null; // null for system templates, tenantId for therapist tests
  questions: Question[];
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;

  // System template fields
  isSystemTemplate?: boolean; // true for admin-created templates
  sourceTemplateId?: string; // ID of template this was copied from (for tracking)
  category?: string; // e.g., "Depression", "Anxiety", "General"
}

// Test Assignment (Instance assigned to a patient)
export interface TestAssignment {
  id: string;
  testId: string; // Reference to TestDefinition
  testTitle: string; // Cached for display
  therapistId: string;
  patientId: string;
  tenantId: string;
  assignedAt: Timestamp;
  dueDate?: Timestamp;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  startedAt?: Timestamp;
  completedAt?: Timestamp;
  responses: TestResponse[];
  isArchived?: boolean;
  archivedAt?: Timestamp;
}

// Individual response to a question
export interface TestResponse {
  questionId: string;
  questionText: string; // Cached for display
  questionType: QuestionType;
  answer: string | number | boolean; // Flexible to handle different types
  answerText?: string; // Human-readable answer label (e.g., option text for MULTIPLE_CHOICE)
  answeredAt: Timestamp;
}

// For listing tests
export interface TestListItem {
  id: string;
  title: string;
  description: string;
  questionCount: number;
  createdAt: Timestamp;
  isActive: boolean;
}

// For viewing test results summary
export interface TestResultSummary {
  assignmentId: string;
  testTitle: string;
  patientName: string;
  patientEmail: string;
  assignedAt: Timestamp;
  completedAt?: Timestamp;
  status: string;
  responseCount: number;
  totalQuestions: number;
}
