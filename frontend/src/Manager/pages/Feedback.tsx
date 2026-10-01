import { useState } from "react";
import { FiCheck, FiInbox, FiMessageSquare, FiRotateCcw, FiSmile, FiStar } from "react-icons/fi";
import { useFeedback, useSetFeedbackStatus } from "../api/feedback";
import Badge from "../components/Badge";
import Button from "../components/Button";
import Card from "../components/Card";
import OrderDetailsModal from "../components/OrderDetailsModal";
import PageHeader from "../components/PageHeader";
import { ErrorNotice, Loading } from "../components/QueryState";
import SearchInput from "../components/SearchInput";
import Stars from "../components/Stars";
import StatCard from "../components/StatCard";
import { FEEDBACK_STATUS } from "../components/status";
import { FOCUS_RING } from "../components/styles";
import Tabs from "../components/Tabs";
import { useNotifyError, useToast } from "../components/toastContext";
import type { Feedback as FeedbackRow, FeedbackStatus } from "../types";
import { formatDateTime } from "../utils/format";

type StatusFilter = FeedbackStatus | "all";
const RATINGS = [5, 4, 3, 2, 1] as const;

export default function Feedback() {
  const notify = useToast();
  const notifyError = useNotifyError();
  const [status, setStatus] = useState<StatusFilter>("new");
  const [rating, setRating] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [viewingOrder, setViewingOrder] = useState<number | null>(null);

  const feedback = useFeedback();
  const setFeedbackStatus = useSetFeedbackStatus();
  const all = feedback.data ?? [];
  const average = all.length ? all.reduce((sum, f) => sum + f.rating, 0) / all.length : 0;
  const positive = all.filter((f) => f.rating >= 4).length;
  const count = (s: FeedbackStatus) => all.filter((f) => f.status === s).length;

  const customerName = (f: FeedbackRow) => f.customer_name ?? "Anonymous";

  const visible = all
    .filter((f) => {
      const q = query.trim().toLowerCase();
      return (
        (status === "all" || f.status === status) &&
        (rating === null || f.rating === rating) &&
        (!q || f.comment.toLowerCase().includes(q) || customerName(f).toLowerCase().includes(q))
      );
    })
    .sort((a, b) => b.created_at.localeCompare(a.created_at));

  const mark = (ids: number[], next: FeedbackStatus, done?: string) =>
    setFeedbackStatus.mutate(
      { ids, status: next },
      { onSuccess: () => done && notify(done), onError: notifyError },
    );

  const markAllReviewed = () => {
    const ids = visible.filter((f) => f.status === "new").map((f) => f.feedback_id);
    mark(ids, "reviewed", `${ids.length} ${ids.length === 1 ? "review" : "reviews"} marked as reviewed.`);
  };

  const unreviewedShown = visible.some((f) => f.status === "new");

  return (
    <>
      <PageHeader
        title="Customer feedback"
        description="Ratings and comments customers leave after an order. Mark them reviewed once you've read or acted on them."
      />

      {feedback.error && (
        <ErrorNotice className="mb-6" title="Couldn't load feedback" error={feedback.error} onRetry={() => void feedback.refetch()} />
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Average rating"
          value={
            <span className="flex items-center gap-2">
              {average.toFixed(1)}
              <Stars rating={Math.round(average)} />
            </span>
          }
          hint={`From ${all.length} reviews`}
          icon={FiStar}
        />
        <StatCard
          label="Positive"
          value={`${all.length ? Math.round((positive / all.length) * 100) : 0}%`}
          hint="Rated 4 or 5 stars"
          icon={FiSmile}
        />
        <StatCard label="Waiting for review" value={count("new")} hint="New since you last checked" icon={FiInbox} />
        <StatCard
          label="Low ratings"
          value={all.filter((f) => f.rating <= 2).length}
          hint="Rated 1 or 2 stars"
          icon={FiMessageSquare}
        />
      </div>

      <div className="mt-6 grid grid-cols-1 items-start gap-6 xl:grid-cols-[18rem_minmax(0,1fr)]">
        <Card title="Rating breakdown" description="Select a rating to filter">
          <ul className="space-y-1">
            {RATINGS.map((r) => {
              const n = all.filter((f) => f.rating === r).length;
              const pct = all.length ? Math.round((n / all.length) * 100) : 0;
              const active = rating === r;
              return (
                <li key={r}>
                  <button
                    type="button"
                    aria-pressed={active}
                    onClick={() => setRating(active ? null : r)}
                    className={`flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-sm ${FOCUS_RING} ${
                      active ? "bg-(--mgr-accent)/12" : "hover:bg-(--mgr-ink)/5"
                    }`}
                  >
                    <span className="w-10 shrink-0 text-left tabular-nums">{r} ★</span>
                    <span className="h-2 flex-1 overflow-hidden rounded-full bg-(--mgr-grid)" aria-hidden>
                      <span className="block h-full rounded-full bg-amber-500" style={{ width: `${pct}%` }} />
                    </span>
                    <span className="w-8 shrink-0 text-right text-(--mgr-muted) tabular-nums">{n}</span>
                  </button>
                </li>
              );
            })}
          </ul>
          {rating !== null && (
            <Button size="sm" variant="ghost" className="mt-3" onClick={() => setRating(null)}>
              Show all ratings
            </Button>
          )}
        </Card>

        <Card flush>
          <div className="flex flex-col gap-3 border-b border-(--mgr-line) p-4 lg:flex-row lg:items-center lg:justify-between">
            <Tabs
              label="Filter by status"
              value={status}
              onChange={setStatus}
              options={[
                { value: "new", label: "New", count: count("new") },
                { value: "reviewed", label: "Reviewed", count: count("reviewed") },
                { value: "all", label: "All", count: all.length },
              ]}
            />
            <div className="flex flex-col gap-2 sm:flex-row">
              <SearchInput value={query} onChange={setQuery} placeholder="Search comments or names" className="sm:w-60" />
              {unreviewedShown && (
                <Button icon={FiCheck} onClick={markAllReviewed}>
                  Mark shown as reviewed
                </Button>
              )}
            </div>
          </div>

          <ul className="divide-y divide-(--mgr-line)">
            {visible.map((f) => {
              const s = FEEDBACK_STATUS[f.status];
              return (
                <li key={f.feedback_id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-start">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Stars rating={f.rating} />
                      <Badge tone={s.tone}>{s.label}</Badge>
                    </div>
                    <p className="mt-2 text-sm">{f.comment}</p>
                    <p className="mt-1 text-xs text-(--mgr-muted)">
                      {customerName(f)} · {formatDateTime(f.created_at)}
                      {f.order_id !== null && (
                        <>
                          {" · "}
                          <button
                            type="button"
                            onClick={() => setViewingOrder(f.order_id)}
                            className={`rounded font-medium text-(--mgr-ink) underline decoration-(--mgr-line) underline-offset-2 hover:decoration-(--mgr-ink) ${FOCUS_RING}`}
                          >
                            Order #{f.order_id}
                          </button>
                        </>
                      )}
                    </p>
                  </div>
                  {f.status === "new" ? (
                    <Button size="sm" icon={FiCheck} onClick={() => mark([f.feedback_id], "reviewed", "Marked as reviewed.")}>
                      Mark reviewed
                    </Button>
                  ) : (
                    <Button size="sm" variant="ghost" icon={FiRotateCcw} onClick={() => mark([f.feedback_id], "new")}>
                      Mark as new
                    </Button>
                  )}
                </li>
              );
            })}
            {feedback.isPending && (
              <li>
                <Loading label="Loading feedback…" />
              </li>
            )}
            {feedback.isSuccess && visible.length === 0 && (
              <li className="px-5 py-10 text-center text-sm text-(--mgr-muted)">
                {status === "new" && rating === null && !query ? "You're all caught up." : "No feedback matches these filters."}
              </li>
            )}
          </ul>
        </Card>
      </div>

      <OrderDetailsModal orderId={viewingOrder} onClose={() => setViewingOrder(null)} />
    </>
  );
}
