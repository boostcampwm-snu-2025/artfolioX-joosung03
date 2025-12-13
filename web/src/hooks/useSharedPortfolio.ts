import { useEffect, useMemo, useState } from "react";
import { API_BASE_URL } from "../api/config";
import {
  fetchSharedPortfolio,
  postSharedComment,
  type SharedResponse,
} from "../services/sharedPortfolioService";

export function useSharedPortfolio(slug: string | undefined) {
  const apiHost = useMemo(() => API_BASE_URL.replace(/\/api$/, ""), []);
  const [data, setData] = useState<SharedResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function reload() {
    if (!slug) return;
    setLoading(true);
    setError(null);
    try {
      const json = await fetchSharedPortfolio(apiHost, slug);
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "로드 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  async function submitComment(payload: {
    authorName: string;
    role: string;
    text: string;
    workId: string | null;
  }) {
    if (!slug) return;
    if (!data) return;
    setSubmitting(true);
    setError(null);
    try {
      const saved = await postSharedComment(apiHost, slug, payload);
      setData({ ...data, comments: [saved, ...data.comments] });
    } catch (err) {
      setError(err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.");
      throw err;
    } finally {
      setSubmitting(false);
    }
  }

  return { data, loading, error, submitting, submitComment };
}

