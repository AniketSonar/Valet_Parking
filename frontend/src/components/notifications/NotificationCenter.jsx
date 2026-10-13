import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Bell,
  CarFront,
  CheckCircle2,
  Clock3,
  Info,
  KeyRound,
  Loader2,
  Mail,
  RefreshCw,
  ShieldAlert,
  X,
} from "lucide-react";

import { getMyNotifications } from "../../api/parkingApi";
import "./css/NotificationCenter.css";

const formatDateTime = (value) => {
  if (!value) return "Date unavailable";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date unavailable";
  }

  return date.toLocaleString([], {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getNotificationType = (notification) => {
  const explicitType =
    notification?.type ||
    notification?.notification_type ||
    notification?.context;

  if (explicitType) {
    return String(explicitType)
      .replace(/[_-]+/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }

  const message = String(notification?.message || "").toLowerCase();

  if (message.includes("parked")) return "Vehicle Parked";
  if (message.includes("retrieval") && message.includes("request")) {
    return "Retrieval Requested";
  }
  if (message.includes("retrieval") && message.includes("start")) {
    return "Retrieval Started";
  }
  if (message.includes("ready")) return "Ready For Pickup";
  if (message.includes("returned")) return "Vehicle Returned";
  if (message.includes("lost key") || message.includes("key")) {
    return "Key Alert";
  }
  if (message.includes("incident")) return "Incident";
  if (message.includes("pre-book") || message.includes("prebook")) {
    return "Pre-booked Arrival";
  }

  return "Notification";
};

const getNotificationIcon = (notification) => {
  const type = getNotificationType(notification).toLowerCase();
  const message = String(notification?.message || "").toLowerCase();

  if (
    type.includes("incident") ||
    message.includes("incident")
  ) {
    return ShieldAlert;
  }

  if (
    type.includes("key") ||
    message.includes("key")
  ) {
    return KeyRound;
  }

  if (
    type.includes("retrieval") ||
    message.includes("retrieval") ||
    message.includes("pickup")
  ) {
    return CarFront;
  }

  if (
    type.includes("parked") ||
    message.includes("parked")
  ) {
    return CheckCircle2;
  }

  if (
    type.includes("arrival") ||
    message.includes("arrival")
  ) {
    return Clock3;
  }

  return Info;
};

const getStatusLabel = (status) => {
  if (!status) return null;

  return String(status)
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const isUnread = (notification) => {
  /*
   * The current backend does not expose a dedicated read/read_at
   * property. We only use explicit read fields if they are ever
   * provided by the API.
   */
  if (typeof notification?.is_read === "boolean") {
    return !notification.is_read;
  }

  if (notification?.read_at !== undefined) {
    return !notification.read_at;
  }

  return false;
};

const NotificationCenter = ({
  className = "",
  maxItems = 20,
}) => {
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const containerRef = useRef(null);

  const fetchNotifications = async (showLoader = true) => {
    try {
      if (showLoader) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      setError("");

      const response = await getMyNotifications();

      const incoming = Array.isArray(response?.notifications)
        ? response.notifications
        : [];

      const sorted = [...incoming].sort((a, b) => {
        const first = new Date(a?.created_at || 0).getTime();
        const second = new Date(b?.created_at || 0).getTime();

        return second - first;
      });

      setNotifications(sorted);
    } catch (err) {
      console.error("Failed to load notifications:", err);
      setError(
        err?.message || "Unable to load notifications."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutsideClick
      );
    };
  }, []);

  const visibleNotifications = useMemo(
    () => notifications.slice(0, maxItems),
    [notifications, maxItems]
  );

  const unreadCount = useMemo(
    () =>
      notifications.filter((notification) =>
        isUnread(notification)
      ).length,
    [notifications]
  );

  const handleRefresh = async () => {
    await fetchNotifications(false);
  };

  return (
    <div
      ref={containerRef}
      className={`notification-center ${className}`}
    >
      <button
        type="button"
        className={`notification-trigger ${
          isOpen ? "is-active" : ""
        }`}
        onClick={() => setIsOpen((previous) => !previous)}
        aria-label="Notifications"
        aria-expanded={isOpen}
      >
        <Bell size={20} strokeWidth={2} />

        {unreadCount > 0 && (
          <span className="notification-badge">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="notification-panel">
          <div className="notification-panel-header">
            <div>
              <h3>Notifications</h3>

              <p>
                {notifications.length > 0
                  ? `${notifications.length} notification${
                      notifications.length === 1 ? "" : "s"
                    }`
                  : "You're all caught up"}
              </p>
            </div>

            <div className="notification-header-actions">
              <button
                type="button"
                className="notification-icon-button"
                onClick={handleRefresh}
                disabled={refreshing}
                aria-label="Refresh notifications"
                title="Refresh"
              >
                {refreshing ? (
                  <Loader2
                    size={17}
                    className="notification-spin"
                  />
                ) : (
                  <RefreshCw size={17} />
                )}
              </button>

              <button
                type="button"
                className="notification-icon-button"
                onClick={() => setIsOpen(false)}
                aria-label="Close notifications"
                title="Close"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          <div className="notification-panel-body">
            {loading ? (
              <div className="notification-state">
                <Loader2
                  size={28}
                  className="notification-spin"
                />
                <p>Loading notifications...</p>
              </div>
            ) : error ? (
              <div className="notification-state notification-error-state">
                <div className="notification-state-icon">
                  <AlertCircle size={24} />
                </div>

                <h4>Couldn't load notifications</h4>

                <p>{error}</p>

                <button
                  type="button"
                  className="notification-retry-button"
                  onClick={() => fetchNotifications()}
                >
                  Try again
                </button>
              </div>
            ) : visibleNotifications.length === 0 ? (
              <div className="notification-state">
                <div className="notification-empty-icon">
                  <Bell size={25} />
                </div>

                <h4>No notifications</h4>

                <p>
                  New activity and parking updates will appear
                  here.
                </p>
              </div>
            ) : (
              <div className="notification-list">
                {visibleNotifications.map((notification) => {
                  const Icon = getNotificationIcon(
                    notification
                  );

                  const type = getNotificationType(
                    notification
                  );

                  const status = getStatusLabel(
                    notification?.status
                  );

                  const unread = isUnread(notification);

                  return (
                    <article
                      key={
                        notification?.id ||
                        `${notification?.created_at}-${notification?.message}`
                      }
                      className={`notification-item ${
                        unread ? "is-unread" : ""
                      }`}
                    >
                      <div className="notification-item-icon">
                        <Icon size={18} strokeWidth={2} />
                      </div>

                      <div className="notification-item-content">
                        <div className="notification-item-top">
                          <span className="notification-type">
                            {type}
                          </span>

                          {unread && (
                            <span
                              className="notification-unread-dot"
                              aria-label="Unread"
                            />
                          )}
                        </div>

                        <p className="notification-message">
                          {notification?.message ||
                            "Notification message unavailable."}
                        </p>

                        <div className="notification-meta">
                          <span>
                            {formatDateTime(
                              notification?.created_at
                            )}
                          </span>

                          {notification?.channel && (
                            <span className="notification-meta-item">
                              <Mail size={13} />
                              {String(
                                notification.channel
                              ).replace(
                                /\b\w/g,
                                (char) =>
                                  char.toUpperCase()
                              )}
                            </span>
                          )}

                          {status && (
                            <span className="notification-status">
                              {status}
                            </span>
                          )}
                        </div>

                        {notification?.parking_session_id && (
                          <div className="notification-session">
                            Session:{" "}
                            <span>
                              {notification.parking_session
                                ?.ticket_code ||
                                notification.parking_session_id}
                            </span>
                          </div>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>

          {visibleNotifications.length > 0 &&
            notifications.length > maxItems && (
              <div className="notification-panel-footer">
                Showing latest {maxItems} notifications
              </div>
            )}
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;