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
  getParkingAreas,
  createParkingArea,
  deleteParkingArea,
} from "../../api/areaApi";
import "../areas/areas.css";

const floorLabel = (floor) =>
  `${floor.building?.building_name ? `${floor.building.building_name} · ` : ""}${floor.floor_name}`;

// Same padding the server uses when it creates the slots (A-01 ... A-50, A-001 ... A-120).
const slotLabel = (area, number) =>
  `${area.block_code}-${String(number).padStart(Math.max(2, String(area.end_number).length), "0")}`;

function AreaManagement() {
  const [buildings, setBuildings] = useState([]);
  const [floors, setFloors] = useState([]);
  const [managers, setManagers] = useState([]);
  const [areas, setAreas] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [buildingForm, setBuildingForm] = useState({ building_name: "", address: "" });
  const [floorForm, setFloorForm] = useState({ building_id: "", floor_name: "", floor_number: "" });
  const [areaForm, setAreaForm] = useState({
    manager_id: "",
    floor_id: "",
    block: "",
    start_number: "1",
    end_number: "",
    parking_type: "car",
  });

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [b, f, m, a] = await Promise.all([
        getBuildings(),
        getFloors(),
        getManagersWithAreas(),
        getParkingAreas(),
      ]);

      setBuildings(b.buildings || []);
      setFloors(f.floors || []);
      setManagers(m.managers || []);
      setAreas(a.areas || []);
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

  // Only managers that already hold a floor can be given a parking area.
  const managersWithFloors = useMemo(
    () => activeManagers.filter((m) => floors.some((f) => f.manager?.id === m.id)),
    [activeManagers, floors]
  );

  const floorsOfPickedManager = useMemo(
    () => floors.filter((f) => areaForm.manager_id && f.manager?.id === areaForm.manager_id),
    [floors, areaForm.manager_id]
  );

  const pickManager = (managerId) => {
    const owned = floors.filter((f) => f.manager?.id === managerId);
    setAreaForm((prev) => ({
      ...prev,
      manager_id: managerId,
      floor_id: owned.length === 1 ? owned[0].id : "",
    }));
  };

  const previewRange = useMemo(() => {
    const block = areaForm.block.trim().toUpperCase();
    const start = Number(areaForm.start_number);
    const end = Number(areaForm.end_number);
    if (!block || !Number.isInteger(start) || !Number.isInteger(end) || start < 1 || end < start) {
      return "";
    }
    const width = Math.max(2, String(end).length);
    const label = (n) => `${block}-${String(n).padStart(width, "0")}`;
    return `${label(start)} to ${label(end)} (${end - start + 1} slots)`;
  }, [areaForm.block, areaForm.start_number, areaForm.end_number]);

  const submitArea = async (e) => {
    e.preventDefault();
    const ok = await run(
      () =>
        createParkingArea({
          floor_id: areaForm.floor_id,
          block: areaForm.block,
          start_number: Number(areaForm.start_number),
          end_number: Number(areaForm.end_number),
          parking_type: areaForm.parking_type,
        }),
      "Parking area created."
    );
    if (ok) setAreaForm((prev) => ({ ...prev, block: "", start_number: "1", end_number: "" }));
  };

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
            Set up buildings and floors, give each floor to a manager, then create the parking area
            for that manager, for example block A with slots 1 to 50. A manager only sees the floors
            and slots assigned to them and manages the valets there.
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

      <section className="ar-card" style={{ marginBottom: 18 }}>
        <h2>Create a parking area</h2>
        <p className="ar-sub">
          Name a block and a slot range. For example block A, slots 1 to 50 creates A-01 to A-50
          for that manager.
        </p>

        {managersWithFloors.length === 0 ? (
          <div className="ar-empty">Assign a manager to a floor above before creating a parking area.</div>
        ) : (
          <form className="ar-form" onSubmit={submitArea}>
            <label className="ar-field">
              <span>Manager</span>
              <select
                className="ar-select"
                required
                value={areaForm.manager_id}
                onChange={(e) => pickManager(e.target.value)}
              >
                <option value="">Choose a manager</option>
                {managersWithFloors.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </label>
            <label className="ar-field">
              <span>Floor</span>
              <select
                className="ar-select"
                required
                value={areaForm.floor_id}
                onChange={(e) => setAreaForm({ ...areaForm, floor_id: e.target.value })}
                disabled={!areaForm.manager_id}
              >
                <option value="">Choose a floor</option>
                {floorsOfPickedManager.map((f) => (
                  <option key={f.id} value={f.id}>{floorLabel(f)}</option>
                ))}
              </select>
            </label>
            <label className="ar-field" style={{ maxWidth: 110 }}>
              <span>Block</span>
              <input
                className="ar-input"
                required
                maxLength={6}
                placeholder="A"
                value={areaForm.block}
                onChange={(e) => setAreaForm({ ...areaForm, block: e.target.value.toUpperCase() })}
              />
            </label>
            <label className="ar-field" style={{ maxWidth: 110 }}>
              <span>Slot from</span>
              <input
                className="ar-input"
                required
                type="number"
                min="1"
                step="1"
                value={areaForm.start_number}
                onChange={(e) => setAreaForm({ ...areaForm, start_number: e.target.value })}
              />
            </label>
            <label className="ar-field" style={{ maxWidth: 110 }}>
              <span>Slot to</span>
              <input
                className="ar-input"
                required
                type="number"
                min="1"
                step="1"
                placeholder="50"
                value={areaForm.end_number}
                onChange={(e) => setAreaForm({ ...areaForm, end_number: e.target.value })}
              />
            </label>
            <label className="ar-field" style={{ maxWidth: 130 }}>
              <span>Vehicle type</span>
              <select
                className="ar-select"
                value={areaForm.parking_type}
                onChange={(e) => setAreaForm({ ...areaForm, parking_type: e.target.value })}
              >
                <option value="car">Car</option>
                <option value="bike">Bike</option>
                <option value="truck">Truck</option>
              </select>
            </label>
            <button type="submit" className="ar-btn ar-btn-primary">Create slots</button>
          </form>
        )}

        {previewRange && <p className="ar-sub" style={{ marginTop: 10 }}>Will create {previewRange}.</p>}

        {areas.length > 0 && (
          <div className="ar-scroll" style={{ marginTop: 14 }}>
            <table className="ar-table">
              <thead>
                <tr>
                  <th>Block</th>
                  <th>Slots</th>
                  <th>Floor</th>
                  <th>Manager</th>
                  <th>In use</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {areas.map((area) => (
                  <tr key={area.id}>
                    <td><strong>{area.block_code}</strong></td>
                    <td>
                      {slotLabel(area, area.start_number)} to {slotLabel(area, area.end_number)}
                      <span className="ar-muted"> ({area.slot_count})</span>
                    </td>
                    <td>{floorLabel(area.floor || {})}</td>
                    <td>{area.manager?.name || <span className="ar-muted">Unassigned</span>}</td>
                    <td>{area.occupied_count}/{area.slot_count}</td>
                    <td style={{ textAlign: "right" }}>
                      <button
                        type="button"
                        className="ar-btn ar-btn-sm ar-btn-danger"
                        onClick={() => {
                          if (window.confirm(`Remove block ${area.block_code} and its ${area.slot_count} slots?`)) {
                            run(() => deleteParkingArea(area.id), "Parking area removed.");
                          }
                        }}
                      >
                        Remove
                      </button>
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
