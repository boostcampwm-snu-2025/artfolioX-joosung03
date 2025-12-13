import type {
  FeedbackComment,
  PortfolioItem,
  PortfolioReadiness,
  PortfolioVersion,
  Template,
} from "../portfolios/types";
import type { Work } from "../works/types";

export type SharedItem = { item: PortfolioItem; work: Work | null };

export type SharedResponse = {
  portfolio: PortfolioVersion;
  template: Template | null;
  readiness: PortfolioReadiness | null;
  items: SharedItem[];
  comments: FeedbackComment[];
};

export async function fetchSharedPortfolio(apiHost: string, slug: string) {
  const res = await fetch(`${apiHost}/api/shared/${slug}`);
  if (!res.ok) {
    const t = await res.text();
    throw new Error(t || "공유 포트폴리오를 불러올 수 없습니다.");
  }
  return (await res.json()) as SharedResponse;
}

export async function postSharedComment(
  apiHost: string,
  slug: string,
  payload: {
    authorName: string;
    role: string;
    text: string;
    workId: string | null;
  }
) {
  const res = await fetch(`${apiHost}/api/shared/${slug}/comments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(t || "코멘트 저장에 실패했습니다.");
  }
  return (await res.json()) as FeedbackComment;
}

