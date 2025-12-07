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
  }
  