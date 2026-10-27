import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import {
  getBuildings,
  createBuilding,
  getFloors,
  createFloor,
  getManagersWithAreas,
  assignManagerToFloor,
  removeManagerAssignment,
} from "../../api/areaApi";
import "../areas/areas.css";

const floorLabel = (floor) =>
  `${floor.building?.building_name ? `${floor.building.building_name} · ` : ""}${floor.floor_name}`;

function AreaManagement() {
  const [buildings, setBuildings] = useState([]);
  const [floors, setFloors] = useState([]);
  const [managers, setManagers] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [buildingForm, setBuildingForm] = useState({ building_name: "", address: "" });
  const [floorForm, setFloorForm] = useState({ building_id: "", floor_name: "", floor_number: "" });

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [b, f, m] = await Promise.all([
        getBuildings(),
        getFloors(),
        getManagersWithAreas(),
      ]);

      setBuildings(b.buildings || []);
      setFloors(f.floors || []);
      setManagers(m.managers || []);
    } catch (err) {
      setError(err.message || "Failed to load areas.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const run = async (action, successMessage) => {
    try {
      setError("");
      setNotice("");
      const result = await action();
      setNotice(result?.message || successMessage);
      await load();
      return true;
    } catch (err) {
      setError(err.message || "Something went wrong.");
      return false;
    }
  };

  const activeManagers = useMemo(() => managers.filter((m) => m.is_active), [managers]);

  const submitBuilding = async (e) => {
    e.preventDefault();
    const ok = await run(() => createBuilding(buildingForm), "Building added.");
    if (ok) setBuildingForm({ building_name: "", address: "" });
  };

  const submitFloor = async (e) => {
    e.preventDefault();
    const ok = await run(
      () =>
        createFloor({
          building_id: floorForm.building_id || null,
          floor_name: floorForm.floor_name,
          floor_number: Number(floorForm.floor_number),
        }),
      "Floor added."
    );
    if (ok) setFloorForm((prev) => ({ ...prev, floor_name: "", floor_number: "" }));
  };

  return (
    <div className="ar-page">
      <header className="ar-header">
        <div>
          <h1>Areas &amp; Managers</h1>
          <p>
            Set up buildings and floors, then give each floor to a manager. A manager only sees and
            controls the floors assigned to them, and builds their own zones, gates and valet posts there.
          </p>
        </div>
        <button type="button" className="ar-btn" onClick={load} disabled={loading}>
          <RefreshCw size={15} /> Refresh
        </button>
      </header>

      {error && <div className="ar-alert ar-alert-error" role="alert">{error}</div>}
      {notice && <div className="ar-alert ar-alert-ok" role="status">{notice}</div>}

      <div className="ar-grid-2">
        <section className="ar-card">
          <h2>Add a building</h2>
          <p className="ar-sub">A building groups floors, for example a mall or a hotel tower.</p>
          <form className="ar-form" onSubmit={submitBuilding}>
            <label className="ar-field">
              <span>Building name</span>
              <input
                className="ar-input"
                required
                value={buildingForm.building_name}
                onChange={(e) => setBuildingForm({ ...buildingForm, building_name: e.target.value })}
              />
            </label>
            <label className="ar-field">
              <span>Address (optional)</span>
              <input
                className="ar-input"
                value={buildingForm.address}
                onChange={(e) => setBuildingForm({ ...buildingForm, address: e.target.value })}
              />
            </label>
            <button type="submit" className="ar-btn ar-btn-primary">Add building</button>
          </form>
        </section>

        <section className="ar-card">
          <h2>Add a floor</h2>
          <p className="ar-sub">Use a negative number for basements, such as -1 for Basement 1.</p>
          <form className="ar-form" onSubmit={submitFloor}>
            <label className="ar-field">
              <span>Building</span>
              <select
                className="ar-select"
                value={floorForm.building_id}
                onChange={(e) => setFloorForm({ ...floorForm, building_id: e.target.value })}
              >
                <option value="">No building</option>
                {buildings.map((b) => (
                  <option key={b.id} value={b.id}>{b.building_name}</option>
                ))}
              </select>
            </label>
            <label className="ar-field">
              <span>Floor name</span>
              <input
                className="ar-input"
                required
                placeholder="Basement parking"
                value={floorForm.floor_name}
                onChange={(e) => setFloorForm({ ...floorForm, floor_name: e.target.value })}
              />
            </label>
            <label className="ar-field" style={{ maxWidth: 110 }}>
              <span>Number</span>
              <input
                className="ar-input"
                required
                type="number"
                step="1"
                value={floorForm.floor_number}
                onChange={(e) => setFloorForm({ ...floorForm, floor_number: e.target.value })}
              />
            </label>
            <button type="submit" className="ar-btn ar-btn-primary">Add floor</button>
          </form>
        </section>
      </div>

      <section className="ar-card" style={{ marginBottom: 18 }}>
        <h2>Floor assignments</h2>
        <p className="ar-sub">
          Each floor has one manager. Choosing a different manager moves the floor to them, and valets
          posted there are released.
        </p>

        {floors.length === 0 ? (
          <div className="ar-empty">No floors yet. Add a floor above to start assigning.</div>
        ) : (
          <div className="ar-scroll">
            <table className="ar-table">
              <thead>
                <tr>
                  <th>Building</th>
                  <th>Floor</th>
                  <th>Manager</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {floors.map((floor) => (
                  <tr key={floor.id}>
                    <td>{floor.building?.building_name || <span className="ar-muted">None</span>}</td>
                    <td>
                      {floor.floor_name} <span className="ar-muted">(level {floor.floor_number})</span>
                    </td>
                    <td style={{ minWidth: 240 }}>
                      <select
                        className="ar-select"
                        aria-label={`Manager for ${floor.floor_name}`}
                        value={floor.manager?.id || ""}
                        onChange={(e) =>
                          e.target.value &&
                          run(() => assignManagerToFloor(e.target.value, floor.id), "Manager assigned.")
                        }
                      >
                        <option value="">Unassigned</option>
                        {activeManagers.map((m) => (
                          <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                      </select>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      {floor.assignment_id && (
                        <button
                          type="button"
                          className="ar-btn ar-btn-sm ar-btn-danger"
                          onClick={() => run(() => removeManagerAssignment(floor.assignment_id), "Manager removed.")}
                        >
                          Remove manager
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="ar-card">
          <h2>Managers</h2>
          <p className="ar-sub">What each manager is responsible for right now.</p>
          {managers.length === 0 ? (
            <div className="ar-empty">No managers yet. Create one from Staff Management.</div>
          ) : (
            <ul className="ar-list">
              {managers.map((m) => (
                <li key={m.id}>
                  <span>
                    <strong>{m.name}</strong>
                    <br />
                    <span className="ar-muted">{m.email}</span>
                  </span>
                  <span style={{ textAlign: "right" }}>
                    {m.assignments.length === 0 ? (
                      <span className="ar-chip ar-chip-amber">No area</span>
                    ) : (
                      m.assignments.map((a) => (
                        <span key={a.id} className="ar-chip" style={{ margin: "2px 0 2px 4px" }}>
                          {floorLabel(a.floor || {})}
                        </span>
                      ))
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
      </section>
    </div>
  );
}

export default AreaManagement;
