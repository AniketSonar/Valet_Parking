import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  RefreshCw,
  Search,
  ParkingSquare,
} from "lucide-react";

import { getValetParkingSlots } from "../../api/parkingApi";

// import "./css/ParkingSlots.css";
import "./css/ValetPages.css";

const ParkingSlots = () => {
  const [slots, setSlots] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadSlots = async () => {
    try {
      setLoading(true);
      setError("");

      const response =
        await getValetParkingSlots();

      const data =
        response?.slots ||
        response?.data ||
        response ||
        [];

      setSlots(
        Array.isArray(data)
          ? data
          : []
      );
    } catch (err) {
      setError(
        err?.message ||
          "Unable to load parking slots."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSlots();
  }, []);

  const filteredSlots = useMemo(() => {
    const term =
      search.trim().toLowerCase();

    if (!term) return slots;

    return slots.filter((slot) =>
      JSON.stringify(slot)
        .toLowerCase()
        .includes(term)
    );
  }, [slots, search]);

  const getSlotNumber = (slot) =>
    slot.slot_number ||
    slot.slotNumber ||
    slot.number ||
    slot.name ||
    "—";

  const getStatus = (slot) =>
    String(
      slot.status ||
        slot.slot_status ||
        "unknown"
    ).toLowerCase();

  return (
    <section className="parking-slots-page">
      <div className="parking-slots-header">
        <div>
          <span className="page-eyebrow">
            PARKING
          </span>

          <h1>Parking Slots</h1>

          <p>
            View parking slots available for
            vehicle assignment.
          </p>
        </div>

        <button
          className="page-refresh-btn"
          onClick={loadSlots}
          disabled={loading}
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      <div className="slot-toolbar">
        <div className="slot-search">
          <Search size={17} />

          <input
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
            placeholder="Search slot..."
          />
        </div>
      </div>

      {error && (
        <div className="page-error">
          {error}
        </div>
      )}

      {loading ? (
        <div className="page-loading">
          Loading parking slots...
        </div>
      ) : filteredSlots.length === 0 ? (
        <div className="page-empty">
          <ParkingSquare size={32} />

          <h3>No parking slots found</h3>

          <p>
            Parking slot information is currently
            unavailable.
          </p>
        </div>
      ) : (
        <div className="slots-grid">
          {filteredSlots.map((slot) => {
            const status =
              getStatus(slot);

            return (
              <div
                className={`slot-card slot-${status}`}
                key={
                  slot.id ||
                  getSlotNumber(slot)
                }
              >
                <div className="slot-icon">
                  <ParkingSquare
                    size={20}
                  />
                </div>

                <div className="slot-info">
                  <strong>
                    {getSlotNumber(slot)}
                  </strong>

                  <span>
                    {slot.zone ||
                      slot.section ||
                      "Parking"}
                  </span>
                </div>

                <span className="slot-status">
                  {status.replaceAll(
                    "_",
                    " "
                  )}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default ParkingSlots;