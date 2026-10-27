import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, RefreshCw } from "lucide-react";
import {
  getMyAreas,
  getFloorMap,
  createZone,
  updateZone,
  deleteZone,
  createSlotOnMap,
  generateSlots,
  deleteSlot,
  removePreviousSlots,
  createGate,
  deleteGate,
} from "../../api/areaApi";
import "../areas/areas.css";

const GATE_TYPE_LABEL = { entry: "Entry", exit: "Exit", entry_exit: "Entry / Exit" };
const SIDE_LABEL = { front: "Front", back: "Back", left: "Left", right: "Right" };

const cellKey = (row, col) => `${row}:${col}`;

function AreaMap() {
  const [floors, setFloors] = useState([]);
  const [floorId, setFloorId] = useState("");
  const [map, setMap] = useState(null);
  const [zoneId, setZoneId] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [showZoneForm, setShowZoneForm] = useState(false);
  const [zoneForm, setZoneForm] = useState({ zone_name: "", zone_code: "", map_rows: 4, map_cols: 6 });

  const [selectedCell, setSelectedCell] = useState(null); // {row, col}
  const [selectedSlotId, setSelectedSlotId] = useState("");
  const [slotForm, setSlotForm] = useState({ slot_number: "", parking_type: "car" });

  const [bulk, setBulk] = useState({ prefix: "", parking_type: "car" });
  const [resize, setResize] = useState({ map_rows: "", map_cols: "" });
  const [gateForm, setGateForm] = useState({ gate_name: "", gate_type: "entry_exit", side: "front", whole_floor: false });

  const loadMap = useCallback(async (id) => {
    if (!id) {
      setMap(null);
      return;
    }
    const result = await getFloorMap(id);
    setMap(result);
    setZoneId((current) =>
      result.zones.some((z) => z.id === current) ? current : result.zones[0]?.id || ""
    );
  }, []);

  const loadAll = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const areas = await getMyAreas();
      const list = areas.floors || [];
      setFloors(list);

      const nextFloor = list.some((f) => f.id === floorId) ? floorId : list[0]?.id || "";
      setFloorId(nextFloor);
      await loadMap(nextFloor);
    } catch (err) {
      setError(err.message || "Failed to load your area.");
    } finally {
      setLoading(false);
    }
  }, [floorId, loadMap]);

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const changeFloor = async (id) => {
    setFloorId(id);
    setSelectedCell(null);
    setSelectedSlotId("");
    try {
      setError("");
      await loadMap(id);
    } catch (err) {
      setError(err.message);
    }
  };

  const run = async (action, successMessage) => {
    try {
      setError("");
      setNotice("");
      const result = await action();
      setNotice(result?.message || successMessage || "");
      await loadMap(floorId);
      return true;
    } catch (err) {
      setError(err.message || "Something went wrong.");
      return false;
    }
  };

  const zone = useMemo(() => map?.zones.find((z) => z.id === zoneId) || null, [map, zoneId]);

  const slotsInZone = useMemo(
    () => (map && zone ? map.slots.filter((s) => s.zone_id === zone.id) : []),
    [map, zone]
  );

  const slotByCell = useMemo(
    () => new Map(slotsInZone.map((s) => [cellKey(s.map_row, s.map_col), s])),
    [slotsInZone]
  );

  const gatesByZone = useMemo(() => {
    const gates = (map?.gates || []).filter((g) => !g.zone_id || g.zone_id === zoneId);
    return Object.keys(SIDE_LABEL).reduce(
      (acc, side) => ({ ...acc, [side]: gates.filter((g) => g.side === side) }),
      {}
    );
  }, [map, zoneId]);

  const selectedSlot = slotsInZone.find((s) => s.id === selectedSlotId) || null;

  const counts = useMemo(
    () => ({
      available: slotsInZone.filter((s) => s.status === "available").length,
      occupied: slotsInZone.filter((s) => s.status === "occupied").length,
      maintenance: slotsInZone.filter((s) => s.status === "maintenance").length,
    }),
    [slotsInZone]
  );

  const pickCell = (row, col) => {
    const existing = slotByCell.get(cellKey(row, col));
    if (existing) {
      setSelectedSlotId(existing.id);
      setSelectedCell(null);
      return;
    }
    setSelectedSlotId("");
    setSelectedCell({ row, col });
    setSlotForm((prev) => ({
      ...prev,
      slot_number: `${zone.zone_code}-${String(slotsInZone.length + 1).padStart(2, "0")}`,
    }));
  };

  const submitZone = async (e) => {
    e.preventDefault();
    const ok = await run(
      () =>
        createZone({
          floor_id: floorId,
          zone_name: zoneForm.zone_name,
          zone_code: zoneForm.zone_code,
          map_rows: Number(zoneForm.map_rows),
          map_cols: Number(zoneForm.map_cols),
        }),
      "Zone created. Click a cell to place slots, or generate them all at once."
    );
    if (ok) {
      setShowZoneForm(false);
      setZoneForm({ zone_name: "", zone_code: "", map_rows: 4, map_cols: 6 });
    }
  };

  const submitSlot = async (e) => {
    e.preventDefault();
    const ok = await run(
      () =>
        createSlotOnMap(zone.id, {
          slot_number: slotForm.slot_number,
          parking_type: slotForm.parking_type,
          map_row: selectedCell.row,
          map_col: selectedCell.col,
        }),
      "Slot added."
    );
    if (ok) setSelectedCell(null);
  };

  const submitBulk = async (e) => {
    e.preventDefault();
    await run(
      () => generateSlots(zone.id, { prefix: bulk.prefix || zone.zone_code, parking_type: bulk.parking_type }),
      "Slots generated."
    );
  };

  const submitResize = async (e) => {
    e.preventDefault();
    await run(
      () =>
        updateZone(zone.id, {
          map_rows: Number(resize.map_rows || zone.map_rows),
          map_cols: Number(resize.map_cols || zone.map_cols),
        }),
      "Map resized."
    );
    setResize({ map_rows: "", map_cols: "" });
  };

  const removeZone = async () => {
    if (!window.confirm(`Remove ${zone.zone_name} and all of its slots?`)) return;
    await run(() => deleteZone(zone.id), "Zone removed.");
  };

  const removeOldSlots = async () => {
    if (!window.confirm("Remove all slots from this floor? This cannot be undone.")) return;
    await run(
      () => removePreviousSlots(floorId),
      "All slots removed."
    );
  };

  const submitGate = async (e) => {
    e.preventDefault();
    const ok = await run(
      () =>
        createGate({
          floor_id: floorId,
          zone_id: gateForm.whole_floor || !zone ? null : zone.id,
          gate_name: gateForm.gate_name,
          gate_type: gateForm.gate_type,
          side: gateForm.side,
        }),
      "Gate added."
    );
    if (ok) setGateForm((prev) => ({ ...prev, gate_name: "" }));
  };

  const currentFloor = floors.find((f) => f.id === floorId);

  /* ------------------------------------------------------------------ */

  if (!loading && floors.length === 0) {
    return (
      <div className="ar-page">
        <header className="ar-header">
          <div>
            <h1>Area Map</h1>
            <p>Your parking area, laid out the way it looks on the ground.</p>
          </div>
        </header>
        {error && <div className="ar-alert ar-alert-error" role="alert">{error}</div>}
        <div className="ar-card ar-empty">
          No floor has been assigned to you yet. Ask the administrator to give you a building floor,
          then you can map its parking here.
        </div>
      </div>
    );
  }

  return (
    <div className="ar-page">
      <header className="ar-header">
        <div>
          <h1>Area Map</h1>
          <p>
            {currentFloor
              ? `${currentFloor.building?.building_name ? `${currentFloor.building.building_name} · ` : ""}${currentFloor.floor_name}. `
              : ""}
            Create zones, place slots on the grid and mark where cars enter and leave.
          </p>
        </div>
        <button type="button" className="ar-btn" onClick={loadAll} disabled={loading}>
          <RefreshCw size={15} /> Refresh
        </button>
        {currentFloor && (
          <button type="button" className="ar-btn ar-btn-danger" onClick={removeOldSlots}>
            Remove all slots
          </button>
        )}
      </header>

      {error && <div className="ar-alert ar-alert-error" role="alert">{error}</div>}
      {notice && <div className="ar-alert ar-alert-ok" role="status">{notice}</div>}

      <div className="ar-toolbar">
        {floors.length > 1 && (
          <select
            className="ar-select"
            style={{ width: "auto", minWidth: 220 }}
            aria-label="Floor"
            value={floorId}
            onChange={(e) => changeFloor(e.target.value)}
          >
            {floors.map((f) => (
              <option key={f.id} value={f.id}>
                {f.building?.building_name ? `${f.building.building_name} · ` : ""}{f.floor_name}
              </option>
            ))}
          </select>
        )}

        <div className="ar-tabs" role="tablist" aria-label="Zones">
          {(map?.zones || []).map((z) => (
            <button
              key={z.id}
              type="button"
              role="tab"
              className="ar-tab"
              aria-selected={z.id === zoneId}
              onClick={() => {
                setZoneId(z.id);
                setSelectedCell(null);
                setSelectedSlotId("");
              }}
            >
              {z.zone_name}
            </button>
          ))}
        </div>

        <button type="button" className="ar-btn ar-btn-primary" onClick={() => setShowZoneForm((v) => !v)}>
          <Plus size={15} /> New zone
        </button>
      </div>

      {showZoneForm && (
        <form className="ar-card ar-form" style={{ marginBottom: 18 }} onSubmit={submitZone}>
          <label className="ar-field" style={{ flex: 2 }}>
            <span>Zone name</span>
            <input
              className="ar-input"
              required
              placeholder="Basement parking A"
              value={zoneForm.zone_name}
              onChange={(e) => setZoneForm({ ...zoneForm, zone_name: e.target.value })}
            />
          </label>
          <label className="ar-field" style={{ maxWidth: 110 }}>
            <span>Code</span>
            <input
              className="ar-input"
              required
              maxLength={6}
              placeholder="A"
              value={zoneForm.zone_code}
              onChange={(e) => setZoneForm({ ...zoneForm, zone_code: e.target.value.toUpperCase() })}
            />
          </label>
          <label className="ar-field" style={{ maxWidth: 110 }}>
            <span>Rows</span>
            <input
              className="ar-input"
              type="number"
              min="1"
              max="40"
              value={zoneForm.map_rows}
              onChange={(e) => setZoneForm({ ...zoneForm, map_rows: e.target.value })}
            />
          </label>
          <label className="ar-field" style={{ maxWidth: 110 }}>
            <span>Columns</span>
            <input
              className="ar-input"
              type="number"
              min="1"
              max="40"
              value={zoneForm.map_cols}
              onChange={(e) => setZoneForm({ ...zoneForm, map_cols: e.target.value })}
            />
          </label>
          <button type="submit" className="ar-btn ar-btn-primary">Create zone</button>
        </form>
      )}

      {map && map.zones.length === 0 && !showZoneForm && (
        <div className="ar-card ar-empty">
          This floor has no zones yet. Create your first zone to start mapping its slots.
        </div>
      )}

      {zone && (
        <div className="ar-map-layout">
          <section className="ar-card">
            <h2>{zone.zone_name}</h2>
            <p className="ar-sub">
              {zone.map_rows} rows × {zone.map_cols} columns. Front is at the top of the map. Click an
              empty cell to add a slot, or a slot to see its details.
            </p>

            <div className="ar-legend">
              <span><i style={{ background: "#e7f6ee", border: "1px solid #1f8a5b" }} />Available ({counts.available})</span>
              <span><i style={{ background: "#8b1230" }} />Occupied ({counts.occupied})</span>
              <span><i style={{ background: "#fdf3df", border: "1px solid #b7791f" }} />Maintenance ({counts.maintenance})</span>
            </div>

            <div className="ar-stage">
              {Object.keys(SIDE_LABEL).map((side) => (
                <div key={side} className={`ar-edge ar-edge-${side}`}>
                  {gatesByZone[side]?.map((gate) => (
                    <span
                      key={gate.id}
                      className="ar-gate"
                      data-inactive={gate.status !== "active"}
                      title={`${gate.gate_name} (${GATE_TYPE_LABEL[gate.gate_type]})`}
                    >
                      {gate.gate_name}
                      <small>{GATE_TYPE_LABEL[gate.gate_type]}</small>
                    </span>
                  ))}
                </div>
              ))}

              <div
                className="ar-grid"
                style={{ gridTemplateColumns: `repeat(${zone.map_cols}, 62px)` }}
                role="grid"
                aria-label={`${zone.zone_name} map`}
              >
                {Array.from({ length: zone.map_rows * zone.map_cols }, (_, index) => {
                  const row = Math.floor(index / zone.map_cols);
                  const col = index % zone.map_cols;
                  const slot = slotByCell.get(cellKey(row, col));
                  const isSelected = slot
                    ? slot.id === selectedSlotId
                    : selectedCell?.row === row && selectedCell?.col === col;

                  return (
                    <button
                      key={cellKey(row, col)}
                      type="button"
                      role="gridcell"
                      aria-pressed={isSelected}
                      aria-label={slot ? `Slot ${slot.slot_number}, ${slot.status}` : `Empty cell row ${row + 1} column ${col + 1}`}
                      className={`ar-cell ${slot ? `ar-cell-${slot.status}` : "ar-cell-empty"}`}
                      onClick={() => pickCell(row, col)}
                    >
                      {slot ? (
                        <>
                          {slot.slot_number}
                          {slot.vehicle && <small>{slot.vehicle}</small>}
                        </>
                      ) : (
                        "+"
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          <aside className="ar-side">
            {selectedCell && (
              <form className="ar-card" onSubmit={submitSlot}>
                <h2>Add slot</h2>
                <p className="ar-sub">Row {selectedCell.row + 1}, column {selectedCell.col + 1}</p>
                <div className="ar-form">
                  <label className="ar-field">
                    <span>Slot number</span>
                    <input
                      className="ar-input"
                      required
                      value={slotForm.slot_number}
                      onChange={(e) => setSlotForm({ ...slotForm, slot_number: e.target.value.toUpperCase() })}
                    />
                  </label>
                  <label className="ar-field">
                    <span>Vehicle type</span>
                    <select
                      className="ar-select"
                      value={slotForm.parking_type}
                      onChange={(e) => setSlotForm({ ...slotForm, parking_type: e.target.value })}
                    >
                      <option value="car">Car</option>
                      <option value="bike">Bike</option>
                      <option value="truck">Truck</option>
                    </select>
                  </label>
                  <button type="submit" className="ar-btn ar-btn-primary">Add slot</button>
                </div>
              </form>
            )}

            {selectedSlot && (
              <section className="ar-card">
                <h2>{selectedSlot.slot_number}</h2>
                <p className="ar-sub">
                  {selectedSlot.parking_type} slot ·{" "}
                  <span className={`ar-chip ${selectedSlot.status === "available" ? "ar-chip-green" : selectedSlot.status === "occupied" ? "ar-chip-red" : "ar-chip-amber"}`}>
                    {selectedSlot.status}
                  </span>
                </p>
                {selectedSlot.vehicle && <p className="ar-muted">Vehicle {selectedSlot.vehicle}</p>}
                <button
                  type="button"
                  className="ar-btn ar-btn-danger ar-btn-sm"
                  disabled={selectedSlot.status !== "available"}
                  onClick={() => run(() => deleteSlot(selectedSlot.id), "Slot removed.")}
                >
                  Remove slot
                </button>
                {selectedSlot.status !== "available" && (
                  <p className="ar-muted" style={{ fontSize: 12, marginTop: 8 }}>
                    Only available slots can be removed.
                  </p>
                )}
              </section>
            )}

            <section className="ar-card">
              <h2>Entry and exit gates</h2>
              <p className="ar-sub">Mark where cars come in and leave. Valets are posted at these gates.</p>

              {(map?.gates || []).length > 0 && (
                <ul className="ar-list" style={{ marginBottom: 12 }}>
                  {map.gates.map((gate) => (
                    <li key={gate.id}>
                      <span>
                        <strong>{gate.gate_name}</strong>
                        <br />
                        <span className="ar-muted">
                          {GATE_TYPE_LABEL[gate.gate_type]} · {SIDE_LABEL[gate.side]}
                          {gate.zone_id ? "" : " · whole floor"}
                        </span>
                      </span>
                      <button
                        type="button"
                        className="ar-btn ar-btn-sm ar-btn-danger"
                        onClick={() => run(() => deleteGate(gate.id), "Gate removed.")}
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <form className="ar-form" onSubmit={submitGate}>
                <label className="ar-field" style={{ flexBasis: "100%" }}>
                  <span>Gate name</span>
                  <input
                    className="ar-input"
                    required
                    placeholder="North entry"
                    value={gateForm.gate_name}
                    onChange={(e) => setGateForm({ ...gateForm, gate_name: e.target.value })}
                  />
                </label>
                <label className="ar-field">
                  <span>Type</span>
                  <select
                    className="ar-select"
                    value={gateForm.gate_type}
                    onChange={(e) => setGateForm({ ...gateForm, gate_type: e.target.value })}
                  >
                    <option value="entry">Entry</option>
                    <option value="exit">Exit</option>
                    <option value="entry_exit">Entry / Exit</option>
                  </select>
                </label>
                <label className="ar-field">
                  <span>Side</span>
                  <select
                    className="ar-select"
                    value={gateForm.side}
                    onChange={(e) => setGateForm({ ...gateForm, side: e.target.value })}
                  >
                    {Object.entries(SIDE_LABEL).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </label>
                <label style={{ flexBasis: "100%", fontSize: 13 }}>
                  <input
                    type="checkbox"
                    checked={gateForm.whole_floor}
                    onChange={(e) => setGateForm({ ...gateForm, whole_floor: e.target.checked })}
                  />{" "}
                  Applies to the whole floor, not just this zone
                </label>
                <button type="submit" className="ar-btn ar-btn-primary">Add gate</button>
              </form>
            </section>

            <section className="ar-card">
              <h2>Zone tools</h2>

              <form className="ar-form" onSubmit={submitBulk} style={{ marginBottom: 14 }}>
                <label className="ar-field">
                  <span>Fill empty cells · prefix</span>
                  <input
                    className="ar-input"
                    placeholder={zone.zone_code}
                    value={bulk.prefix}
                    onChange={(e) => setBulk({ ...bulk, prefix: e.target.value.toUpperCase() })}
                  />
                </label>
                <label className="ar-field">
                  <span>Type</span>
                  <select
                    className="ar-select"
                    value={bulk.parking_type}
                    onChange={(e) => setBulk({ ...bulk, parking_type: e.target.value })}
                  >
                    <option value="car">Car</option>
                    <option value="bike">Bike</option>
                    <option value="truck">Truck</option>
                  </select>
                </label>
                <button type="submit" className="ar-btn">Generate slots</button>
              </form>

              <form className="ar-form" onSubmit={submitResize} style={{ marginBottom: 14 }}>
                <label className="ar-field">
                  <span>Rows</span>
                  <input
                    className="ar-input"
                    type="number"
                    min="1"
                    max="40"
                    placeholder={String(zone.map_rows)}
                    value={resize.map_rows}
                    onChange={(e) => setResize({ ...resize, map_rows: e.target.value })}
                  />
                </label>
                <label className="ar-field">
                  <span>Columns</span>
                  <input
                    className="ar-input"
                    type="number"
                    min="1"
                    max="40"
                    placeholder={String(zone.map_cols)}
                    value={resize.map_cols}
                    onChange={(e) => setResize({ ...resize, map_cols: e.target.value })}
                  />
                </label>
                <button type="submit" className="ar-btn" disabled={!resize.map_rows && !resize.map_cols}>
                  Resize map
                </button>
              </form>

              <button type="button" className="ar-btn ar-btn-danger" onClick={removeZone}>
                Remove this zone
              </button>
            </section>
          </aside>
        </div>
      )}
    </div>
  );
}

export default AreaMap;
