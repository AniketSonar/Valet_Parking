import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  MessageSquare,
  RefreshCw,
  Star,
  Ticket,
  CarFront,
  Clock3,
  X,
} from "lucide-react";

import {
  createFeedback,
  getMyFeedback,
  getCustomerHistory,
} from "../../api/customerApi";

import "./css/CustomerFeedback.css";

const dateTime = (value) =>
  value
    ? new Date(value).toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "Unavailable";

const StarRating = ({ value, onChange, readOnly = false }) => {
  return (
    <div className={`feedback-stars ${readOnly ? "readonly" : ""}`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readOnly}
          onClick={() => onChange?.(star)}
          aria-label={`${star} star${star > 1 ? "s" : ""}`}
          className={star <= value ? "selected" : ""}
        >
          <Star
            size={readOnly ? 15 : 28}
            fill={star <= value ? "currentColor" : "none"}
          />
        </button>
      ))}
    </div>
  );
};

function CustomerFeedback() {
  const [history, setHistory] = useState([]);
  const [feedback, setFeedback] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [selectedSession, setSelectedSession] = useState(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadFeedback = useCallback(async (initial = false) => {
    try {
      initial ? setLoading(true) : setRefreshing(true);

      setError("");

      const [historyResponse, feedbackResponse] =
        await Promise.all([
          getCustomerHistory(),
          getMyFeedback(),
        ]);

      if (!historyResponse?.success) {
        throw new Error(
          historyResponse?.message ||
            "Unable to load parking history."
        );
      }

      if (!feedbackResponse?.success) {
        throw new Error(
          feedbackResponse?.message ||
            "Unable to load feedback."
        );
      }

      setHistory(
        Array.isArray(historyResponse.history)
          ? historyResponse.history
          : []
      );

      setFeedback(
        Array.isArray(feedbackResponse.feedback)
          ? feedbackResponse.feedback
          : []
      );
    } catch (err) {
      console.error("Customer feedback error:", err);

      setError(
        err?.message ||
          "Unable to load your feedback information."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadFeedback(true);
  }, [loadFeedback]);

  const feedbackBySession = useMemo(() => {
    return new Map(
      feedback.map((item) => [
        item.parking_session_id,
        item,
      ])
    );
  }, [feedback]);

  const completedSessions = useMemo(
    () =>
      history.filter(
        (session) =>
          session.status === "returned_completed"
      ),
    [history]
  );

  const openFeedbackForm = (session) => {
    setSelectedSession(session);
    setRating(0);
    setComment("");
    setError("");
    setSuccess("");
  };

  const closeFeedbackForm = () => {
    if (submitting) return;

    setSelectedSession(null);
    setRating(0);
    setComment("");
  };

  const submit = async () => {
    if (!selectedSession) return;

    if (!rating) {
      setError("Please select a rating from 1 to 5 stars.");
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      setSuccess("");

      const response = await createFeedback({
        parking_session_id: selectedSession.id,
        rating,
        comment: comment.trim(),
      });

      if (!response?.success) {
        throw new Error(
          response?.message ||
            "Unable to submit feedback."
        );
      }

      setSuccess(
        response.message ||
          "Thank you! Your feedback has been submitted."
      );

      setSelectedSession(null);
      setRating(0);
      setComment("");

      await loadFeedback();
    } catch (err) {
      console.error("Submit feedback error:", err);

      setError(
        err?.message ||
          "Unable to submit feedback."
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <main className="customer-page customer-feedback-state">
        <RefreshCw
          size={28}
          className="customer-spin"
        />
        <p>Loading your feedback...</p>
      </main>
    );
  }

  return (
    <main className="customer-page customer-feedback-page">
      <header className="customer-page-header">
        <div>
          <span className="customer-eyebrow">
            CUSTOMER PORTAL
          </span>

          <h1>Feedback</h1>

          <p>
            Share your experience after your vehicle
            has been returned.
          </p>
        </div>

        <button
          type="button"
          className="customer-action-button secondary"
          onClick={() => loadFeedback()}
          disabled={refreshing}
        >
          <RefreshCw
            size={15}
            className={
              refreshing ? "customer-spin" : ""
            }
          />

          {refreshing ? "Refreshing..." : "Refresh"}
        </button>
      </header>

      {error && (
        <div className="customer-alert error">
          <span>{error}</span>

          <button
            type="button"
            onClick={() => setError("")}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {success && (
        <div className="customer-alert success">
          <CheckCircle2 size={17} />
          <span>{success}</span>

          <button
            type="button"
            onClick={() => setSuccess("")}
          >
            <X size={16} />
          </button>
        </div>
      )}

      <section className="customer-section-heading">
        <div>
          <h2>Completed Parking Sessions</h2>

          <p>
            Feedback is available only after your
            vehicle has been returned.
          </p>
        </div>
      </section>

      {completedSessions.length === 0 ? (
        <section className="customer-feedback-empty">
          <div className="customer-feedback-empty-icon">
            <MessageSquare size={26} />
          </div>

          <h3>No completed sessions yet</h3>

          <p>
            Once a parking session is completed and
            your vehicle is returned, you can share
            your feedback here.
          </p>
        </section>
      ) : (
        <div className="customer-feedback-session-list">
          {completedSessions.map((session) => {
            const existing =
              feedbackBySession.get(session.id);

            const vehicle = session.vehicle;

            return (
              <article
                className="customer-feedback-session-card"
                key={session.id}
              >
                <div className="feedback-session-main">
                  <div className="feedback-session-icon">
                    <CarFront size={21} />
                  </div>

                  <div>
                    <span className="feedback-ticket">
                      {session.ticket_code ||
                        "Ticket unavailable"}
                    </span>

                    <h3>
                      {vehicle?.license_plate ||
                        "Vehicle unavailable"}
                    </h3>

                    <p>
                      {[
                        vehicle?.make,
                        vehicle?.model,
                        vehicle?.color,
                      ]
                        .filter(Boolean)
                        .join(" · ") ||
                        "Vehicle details unavailable"}
                    </p>
                  </div>
                </div>

                <div className="feedback-session-meta">
                  <div>
                    <Ticket size={15} />
                    <span>
                      <small>Parking Session</small>
                      <strong>
                        {session.ticket_code ||
                          session.id}
                      </strong>
                    </span>
                  </div>

                  <div>
                    <Clock3 size={15} />
                    <span>
                      <small>Completed</small>
                      <strong>
                        {dateTime(
                          session.completed_at
                        )}
                      </strong>
                    </span>
                  </div>
                </div>

                {existing ? (
                  <div className="submitted-feedback">
                    <div className="submitted-feedback-header">
                      <div>
                        <span className="feedback-submitted-label">
                          FEEDBACK SUBMITTED
                        </span>

                        <StarRating
                          value={existing.rating}
                          readOnly
                        />
                      </div>

                      <span className="feedback-submitted-date">
                        {dateTime(
                          existing.created_at
                        )}
                      </span>
                    </div>

                    <p>
                      {existing.comment ||
                        "No comment provided."}
                    </p>
                  </div>
                ) : (
                  <div className="feedback-session-action">
                    <span>
                      How was your parking experience?
                    </span>

                    <button
                      type="button"
                      className="customer-action-button primary"
                      onClick={() =>
                        openFeedbackForm(session)
                      }
                    >
                      <Star size={15} />
                      Give Feedback
                    </button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {selectedSession && (
        <div className="feedback-modal-backdrop">
          <div
            className="feedback-modal"
            role="dialog"
            aria-modal="true"
          >
            <div className="feedback-modal-header">
              <div>
                <span className="customer-eyebrow">
                  PARKING FEEDBACK
                </span>

                <h2>How was your experience?</h2>

                <p>
                  {selectedSession.ticket_code ||
                    "Parking session"}
                </p>
              </div>

              <button
                type="button"
                className="feedback-close"
                onClick={closeFeedbackForm}
                disabled={submitting}
              >
                <X size={18} />
              </button>
            </div>

            <div className="feedback-modal-session">
              <CarFront size={19} />

              <div>
                <strong>
                  {selectedSession.vehicle
                    ?.license_plate ||
                    "Vehicle unavailable"}
                </strong>

                <span>
                  {dateTime(
                    selectedSession.completed_at
                  )}
                </span>
              </div>
            </div>

            <div className="feedback-rating-field">
              <label>Your rating</label>

              <StarRating
                value={rating}
                onChange={setRating}
              />

              <span>
                {rating
                  ? `${rating} out of 5`
                  : "Select a rating"}
              </span>
            </div>

            <div className="feedback-comment-field">
              <label htmlFor="feedback-comment">
                Comment
              </label>

              <textarea
                id="feedback-comment"
                value={comment}
                onChange={(event) =>
                  setComment(event.target.value)
                }
                placeholder="Tell us about your parking experience..."
                rows={5}
                maxLength={1000}
              />

              <small>
                {comment.length}/1000
              </small>
            </div>

            <div className="feedback-modal-actions">
              <button
                type="button"
                className="customer-action-button secondary"
                onClick={closeFeedbackForm}
                disabled={submitting}
              >
                Cancel
              </button>

              <button
                type="button"
                className="customer-action-button primary"
                onClick={submit}
                disabled={
                  submitting || !rating
                }
              >
                {submitting ? (
                  <>
                    <RefreshCw
                      size={15}
                      className="customer-spin"
                    />
                    Submitting...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={15} />
                    Submit Feedback
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default CustomerFeedback;