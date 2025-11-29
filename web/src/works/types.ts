export interface Work {
    id: string;
    userEmail: string;
    title: string;
    description?: string | null;
    createdAt: number;
    imageData?: string | null; // data URL (base64) 형태로 이미지 저장
  }