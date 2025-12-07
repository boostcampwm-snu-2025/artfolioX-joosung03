// src/works/types.ts
export interface Work {
    id: string;
    userEmail: string;
    title: string;
    description?: string | null;
    createdAt: number;
    imageUrl?: string | null;  // 이제 서버에서 온 이미지 URL
    project?: string | null;
    year?: string | null;
    tags?: string[];
  }
  