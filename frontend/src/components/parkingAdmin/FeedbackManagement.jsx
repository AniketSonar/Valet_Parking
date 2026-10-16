import { useCallback, useEffect, useMemo, useState } from "react";
import {
  MessageSquare,
  RefreshCw,
  Star,
  Users,
  TrendingUp,
  Ticket,
  X,
} from "lucide-react";

import {
  getFeedback,
  getFeedbackStats,
} from "../../api/parkingApi";

import "./css/FeedbackManagement.css";

const dateTime = (value) =>
  value
    ? new Date(value).toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "—";

const StarDisplay = ({ rating }) => (
  <div className="admin-feedback-stars">
    {[1, 2, 3, 4, 5].map((star) => (
      <Star
        key={star}
        size={14}
        fill={star <= rating ? "currentColor" : "none"}
        className={star <= rating ? "filled" : ""}
      />
    ))}
  </div>
);

function FeedbackManagement() {
  const [feedback, setFeedback] = useState([]);
  const [stats, setStats] = useState({
    total_feedback: 0,
    average_rating: 0,
    five_star: 0,
    four_star: 0,
    three_star: 0,
    two_star: 0,
    one_star: 0,
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  // ============================================================
  // LOAD FEEDBACK
  // ============================================================

  const load = useCallback(async (initial = false) => {
    try {
      initial ? setLoading(true) : setRefreshing(true);

      setError("");

      const [feedbackResponse, statsResponse] =
        await Promise.all([
          getFeedback(),
          getFeedbackStats(),
        ]);

      if (!feedbackResponse?.success) {
        throw new Error(
          feedbackResponse?.message ||
            "Unable to load feedback."
        );
      }

      if (!statsResponse?.success) {
        throw new Error(
          statsResponse?.message ||
            "Unable to load feedback statistics."
        );
      }

      setFeedback(
        Array.isArray(feedbackResponse.feedback)
          ? feedbackResponse.feedback
          : []
      );

      setStats(
        statsResponse.stats || {}
      );
    } catch (err) {
      console.error(
        "Feedback management error:",
        err
      );

      setError(
        err?.message ||
          "Unable to load feedback."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // ============================================================
  // INITIAL LOAD
  // ============================================================

  useEffect(() => {
    load(true);
  }, [load]);

  // ============================================================
  // RATING DISTRIBUTION
  // ============================================================

  const ratingDistribution = useMemo(
    () => [
      {
        label: "5 Stars",
        value: stats.five_star ?? 0,
      },
      {
        label: "4 Stars",
        value: stats.four_star ?? 0,
      },
      {
        label: "3 Stars",
        value: stats.three_star ?? 0,
      },
      {
        label: "2 Stars",
        value: stats.two_star ?? 0,
      },
      {
        label: "1 Star",
        value: stats.one_star ?? 0,
      },
    ],
    [stats]
  );

  const maxRatingCount = Math.max(
    ...ratingDistribution.map(
      (item) => item.value
    ),
    1
  );

  // ============================================================
  // LOADING STATE
  // ============================================================

  if (loading) {
    return (
      <main className="feedback-admin-page feedback-admin-state">
        <RefreshCw
          size={28}
          className="feedback-spin"
        />

        <p>Loading feedback...</p>
      </main>
    );
  }

  // ============================================================
  // MAIN UI
  // ============================================================

  return (
    <main className="feedback-admin-page">

      {/* ======================================================
          HEADER
      ====================================================== */}

      <header className="feedback-admin-header">

        <div>

          <span className="feedback-admin-eyebrow">
            CUSTOMER EXPERIENCE
          </span>

          <h1>
            Feedback Management
          </h1>

          <p>
            Monitor customer feedback and overall
            parking experience.
          </p>

        </div>

        <button
          type="button"
          className="feedback-admin-refresh"
          onClick={() => load()}
          disabled={refreshing}
        >
          <RefreshCw
            size={15}
            className={
              refreshing
                ? "feedback-spin"
                : ""
            }
          />

          {refreshing
            ? "Refreshing..."
            : "Refresh"}
        </button>

      </header>

      {/* ======================================================
          ERROR
      ====================================================== */}

      {error && (
        <div className="feedback-admin-alert">

          <span>
            {error}
          </span>

          <button
            type="button"
            onClick={() => setError("")}
          >
            <X size={16} />
          </button>

        </div>
      )}

      {/* ======================================================
          SUMMARY CARDS
      ====================================================== */}

      <section className="feedback-admin-summary">

        {/* Total Feedback */}

        <div className="feedback-stat-card">

          <div className="feedback-stat-icon purple">
            <MessageSquare size={19} />
          </div>

          <span>
            Total Feedback
          </span>

          <strong>
            {stats.total_feedback ?? 0}
          </strong>

        </div>

        {/* Average Rating */}

        <div className="feedback-stat-card">

          <div className="feedback-stat-icon amber">
            <Star size={19} />
          </div>

          <span>
            Average Rating
          </span>

          <strong>
            {Number(
              stats.average_rating ?? 0
            ).toFixed(2)}
          </strong>

          <StarDisplay
            rating={Math.round(
              Number(
                stats.average_rating ?? 0
              )
            )}
          />

        </div>

        {/* Five Star */}

        <div className="feedback-stat-card">

          <div className="feedback-stat-icon blue">
            <Users size={19} />
          </div>

          <span>
            5-Star Feedback
          </span>

          <strong>
            {stats.five_star ?? 0}
          </strong>

        </div>

        {/* Positive Rating */}

        <div className="feedback-stat-card">

          <div className="feedback-stat-icon green">
            <TrendingUp size={19} />
          </div>

          <span>
            Positive Rating
          </span>

          <strong>
            {(stats.five_star ?? 0) +
              (stats.four_star ?? 0)}
          </strong>

          <small>
            4 and 5 star responses
          </small>

        </div>

      </section>

      {/* ======================================================
          RATING DISTRIBUTION
      ====================================================== */}

      <section className="feedback-admin-distribution">

        <div className="feedback-section-title">

          <div>

            <h2>
              Rating Distribution
            </h2>

            <p>
              Breakdown of customer ratings.
            </p>

          </div>

        </div>

        <div className="rating-bars">

          {ratingDistribution.map(
            (item) => (
              <div
                className="rating-bar-row"
                key={item.label}
              >

                <span className="rating-bar-label">
                  {item.label}
                </span>

                <div className="rating-bar-track">

                  <div
                    className="rating-bar-fill"
                    style={{
                      width: `${
                        (item.value /
                          maxRatingCount) *
                        100
                      }%`,
                    }}
                  />

                </div>

                <strong>
                  {item.value}
                </strong>

              </div>
            )
          )}

        </div>

      </section>

      {/* ======================================================
          CUSTOMER FEEDBACK LIST
      ====================================================== */}

      <section className="feedback-admin-list-section">

        <div className="feedback-section-title">

          <div>

            <h2>
              Customer Feedback
            </h2>

            <p>
              Latest feedback submitted by customers.
            </p>

          </div>

          <span className="feedback-count">
            {feedback.length}{" "}
            {feedback.length === 1
              ? "response"
              : "responses"}
          </span>

        </div>

        {/* EMPTY STATE */}

        {feedback.length === 0 ? (

          <div className="feedback-admin-empty">

            <MessageSquare size={27} />

            <h3>
              No feedback yet
            </h3>

            <p>
              Customer feedback will appear here
              once submitted.
            </p>

          </div>

        ) : (

          /* ====================================================
             FEEDBACK TABLE
          ==================================================== */

          <div className="feedback-table-wrapper">

            <table className="feedback-table">

              <thead>

                <tr>
                  <th>
                    Customer
                  </th>

                  <th>
                    Parking Session
                  </th>

                  <th>
                    Rating
                  </th>

                  <th>
                    Comment
                  </th>

                  <th>
                    Submitted
                  </th>
                </tr>

              </thead>

              <tbody>

                {feedback.map(
                  (item) => (
                    <tr key={item.id}>

                      {/* CUSTOMER */}

                      <td>

                        <div className="feedback-customer-cell">

                          <strong>
                            {item.customer?.name ||
                              "Customer unavailable"}
                          </strong>

                          <span>
                            {item.customer?.email ||
                              "Email unavailable"}
                          </span>

                        </div>

                      </td>

                      {/* PARKING SESSION */}

                      <td>

                        <div className="feedback-ticket-cell">

                          <Ticket size={14} />

                          <strong>
                            {item.parking_session
                              ?.ticket_code ||
                              item.parking_session_id}
                          </strong>

                        </div>

                      </td>

                      {/* RATING */}

                      <td>

                        <StarDisplay
                          rating={item.rating}
                        />

                      </td>

                      {/* COMMENT */}

                      <td>

                        <div className="feedback-comment-cell">

                          {item.comment ||
                            "No comment provided."}

                        </div>

                      </td>

                      {/* SUBMITTED DATE */}

                      <td>

                        <span className="feedback-date">

                          {dateTime(
                            item.created_at
                          )}

                        </span>

                      </td>

                    </tr>
                  )
                )}

              </tbody>

            </table>

          </div>
        )}

      </section>

    </main>
  );
}

export default FeedbackManagement;