export interface PortfolioItem {
  workId: string;
  order: number;
  customTitle?: string | null;
  customDescription?: string | null;
}

export interface PortfolioVersion {
  id: string;
  userEmail: string;
  title: string;
  targetSchool: string | null;
  targetMajor: string | null;
  year: string | null;
  items: PortfolioItem[];
  createdAt: number;
  updatedAt: number;
  templateId?: string | null;
  shareSlug?: string | null;
}

export interface TemplateRule {
  category: string;
  minCount?: number;
  maxCount?: number;
}

export interface Template {
  id: string;
  name: string;
  rules: TemplateRule[];
  minTotal?: number;
  maxTotal?: number;
}

export interface ReadinessRuleResult {
  category: string;
  required: number;
  current: number;
  status: "ok" | "missing" | "exceed";
  missing: number;
  maxExceeded?: number;
}

export interface ReadinessSummary {
  status: "ok" | "missing" | "exceed" | "empty";
  missingCount: number;
  coveragePercent: number;
  total: number;
}

export interface PortfolioReadiness {
  portfolioId: string;
  templateId: string;
  templateName: string;
  summary: ReadinessSummary;
  rules: ReadinessRuleResult[];
}

export interface FeedbackComment {
  id: string;
  portfolioId: string;
  workId?: string | null;
  authorName: string;
  role?: string | null;
  text: string;
  createdAt: number;
}