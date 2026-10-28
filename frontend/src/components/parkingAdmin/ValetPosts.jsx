import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, RefreshCw, X } from "lucide-react";
import {
  getMyAreas,
  getFloorMap,
  getAssignableValets,
  createGate,
  deleteGate,
  createPost,
  updatePost,
  deletePost,
  assignValetToPost,
  removeValetAssignment,
} from "../../api/areaApi";
import "../areas/areas.css";

const GATE_TYPE_LABEL = { entry: "Entry", exit: "Exit", entry_exit: "Entry / Exit" };

const initials = (name = "") =>
  name.split(" ").filter(Boolean).map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "V";

function ValetPosts() {
  const [floors, setFloors] = useState([]);
  const [floorId, setFloorId] = useState("");
  const [map, setMap] = useState(null);
  const [valets, setValets] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ post_name: "", gate_id: "", capacity: 2 });
  const [pick, setPick] = useState({}); // postId -> valetId
  const [gateForm, setGateForm] = useState({ gate_name: "", gate_type: "entry_exit", side: "front" });

  const loadFloor = useCallback(async (id) => {
    if (!id) {
      setMap(null);
      setValets([]);
      return;
    }
    const [mapResult, valetResult] = await Promise.all([getFloorMap(id), getAssignableValets()]);
    setMap(mapResult);
    setValets(valetResult.valets || []);
  }, []);

  const loadAll = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const areas = await getMyAreas();
      const list = areas.floors || [];
      setFloors(list);

      const next = list.some((f) => f.id === floorId) ? floorId : list[0]?.id || "";
      setFloorId(next);
      await loadFloor(next);
    } catch (err) {
      setError(err.message || "Failed to load valet posts.");
    } finally {
      setLoading(false);
    }
  }, [floorId, loadFloor]);

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const run = async (action, successMessage) => {
    try {
      setError("");
      setNotice("");
      const result = await action();
      setNotice(result?.message || successMessage || "");
      await loadFloor(floorId);
      return true;
    } catch (err) {
      setError(err.message || "Something went wrong.");
      return false;
    }
  };

  const changeFloor = async (id) => {
    setFloorId(id);
    try {
      setError("");
      await loadFloor(id);
    } catch (err) {
      setError(err.message);
    }
  };

  const submitPost = async (e) => {
    e.preventDefault();
    const ok = await run(
      () =>
        createPost({
          floor_id: floorId,
          gate_id: form.gate_id || null,
          post_name: form.post_name,
          capacity: Number(form.capacity),
        }),
      "Post added."
    );
    if (ok) {
      setShowForm(false);
      setForm({ post_name: "", gate_id: "", capacity: 2 });
    }
  };

  // Entry / exit points used to be drawn on the Area Map; they are managed here now.
  const submitGate = async (e) => {
    e.preventDefault();
    const ok = await run(
      () => createGate({ floor_id: floorId, ...gateForm, gate_name: gateForm.gate_name.trim() }),
      "Entry / exit point added."
    );
    if (ok) setGateForm((prev) => ({ ...prev, gate_name: "" }));
  };

  // "2 valets in front, 2 at the back" in one click
  const quickSetup = async () => {
    const existing = new Set((map?.posts || []).map((p) => p.post_name.toLowerCase()));
    const wanted = ["Front", "Back"].filter((name) => !existing.has(name.toLowerCase()));

    if (wanted.length === 0) {
      setNotice("Front and Back posts already exist.");
      return;
    }

    await run(async () => {
      for (const name of wanted) {
        await createPost({ floor_id: floorId, post_name: name, capacity: 2 });
      }
      return { message: `${wanted.join(" and ")} post${wanted.length > 1 ? "s" : ""} created with room for 2 valets each.` };
    });
  };

  const posts = map?.posts || [];
  const gates = useMemo(() => map?.gates || [], [map]);
  const gateById = useMemo(() => new Map(gates.map((g) => [g.id, g])), [gates]);

  const freeValets = valets.filter((v) => v.assignable);
  const postedCount = valets.filter((v) => v.assignment?.in_my_area).length;

  if (!loading && floors.length === 0) {
    return (
      <div className="ar-page">
        <header className="ar-header">
          <div>
            <h1>Valet Positions</h1>
            <p>Decide where each valet stands in your area.</p>
          </div>
        </header>
        {error && <div className="ar-alert ar-alert-error" role="alert">{error}</div>}
        <div className="ar-card ar-empty">
          No floor has been assigned to you yet, so there is nothing to staff. Ask the administrator to
          assign you a floor first.
        </div>
      </div>
    );
  }

  return (
    <div className="ar-page">
      <header className="ar-header">
        <div>
          <h1>Valet Positions</h1>
          <p>
            Create posts such as Front or Back, say how many valets each needs, optionally tie them to an
            entry or exit gate, then place valets on them. Only valets posted in your area can be given
            customer cars.
          </p>
        </div>
        <button type="button" className="ar-btn" onClick={loadAll} disabled={loading}>
          <RefreshCw size={15} /> Refresh
        </button>
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
        <button type="button" className="ar-btn ar-btn-primary" onClick={() => setShowForm((v) => !v)}>
          <Plus size={15} /> New post
        </button>
        <button type="button" className="ar-btn" onClick={quickSetup}>
          Front 2 + Back 2
        </button>
        <span className="ar-muted" style={{ fontSize: 13 }}>
          {postedCount} valet{postedCount === 1 ? "" : "s"} posted
        </span>
      </div>

      <section className="ar-card" style={{ marginBottom: 18 }}>
        <h2>Entry / exit points</h2>
        <p className="ar-sub">Where customers drive in and out of this floor. Link a post to one below.</p>

        {gates.length > 0 && (
          <ul className="ar-list" style={{ marginBottom: 12 }}>
            {gates.map((g) => (
              <li key={g.id}>
                <span>
                  <strong>{g.gate_name}</strong>{" "}
                  <span className="ar-muted">
                    {GATE_TYPE_LABEL[g.gate_type]} · {g.side}
                  </span>
                </span>
                <button
                  type="button"
                  className="ar-btn ar-btn-sm ar-btn-danger"
                  onClick={() => run(() => deleteGate(g.id), "Entry / exit point removed.")}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}

        <form className="ar-form" onSubmit={submitGate}>
          <label className="ar-field">
            <span>Name</span>
            <input
              className="ar-input"
              required
              placeholder="Main gate"
              value={gateForm.gate_name}
              onChange={(e) => setGateForm({ ...gateForm, gate_name: e.target.value })}
            />
          </label>
          <label className="ar-field" style={{ maxWidth: 160 }}>
            <span>Type</span>
            <select
              className="ar-select"
              value={gateForm.gate_type}
              onChange={(e) => setGateForm({ ...gateForm, gate_type: e.target.value })}
            >
              <option value="entry_exit">Entry / Exit</option>
              <option value="entry">Entry</option>
              <option value="exit">Exit</option>
            </select>
          </label>
          <label className="ar-field" style={{ maxWidth: 130 }}>
            <span>Side</span>
            <select
              className="ar-select"
              value={gateForm.side}
              onChange={(e) => setGateForm({ ...gateForm, side: e.target.value })}
            >
              <option value="front">Front</option>
              <option value="back">Back</option>
              <option value="left">Left</option>
              <option value="right">Right</option>
            </select>
          </label>
          <button type="submit" className="ar-btn ar-btn-primary">Add point</button>
        </form>
      </section>

      {showForm && (
        <form className="ar-card ar-form" style={{ marginBottom: 18 }} onSubmit={submitPost}>
          <label className="ar-field" style={{ flex: 2 }}>
            <span>Post name</span>
            <input
              className="ar-input"
              required
              placeholder="Front, Back, North entry…"
              value={form.post_name}
              onChange={(e) => setForm({ ...form, post_name: e.target.value })}
            />
          </label>
          <label className="ar-field">
            <span>Gate (optional)</span>
            <select
              className="ar-select"
              value={form.gate_id}
              onChange={(e) => setForm({ ...form, gate_id: e.target.value })}
            >
              <option value="">No gate</option>
              {gates.map((g) => (
                <option key={g.id} value={g.id}>{g.gate_name} ({GATE_TYPE_LABEL[g.gate_type]})</option>
              ))}
            </select>
          </label>
          <label className="ar-field" style={{ maxWidth: 110 }}>
            <span>Valets needed</span>
            <input
              className="ar-input"
              type="number"
              min="1"
              max="50"
              value={form.capacity}
              onChange={(e) => setForm({ ...form, capacity: e.target.value })}
            />
          </label>
          <button type="submit" className="ar-btn ar-btn-primary">Create post</button>
        </form>
      )}

      {posts.length === 0 ? (
        <div className="ar-card ar-empty">
          No posts yet. Use “Front 2 + Back 2” for the usual setup, or create your own posts.
        </div>
      ) : (
        <div className="ar-posts" style={{ marginBottom: 22 }}>
          {posts.map((post) => {
            const gate = post.gate_id ? gateById.get(post.gate_id) : null;
            const full = post.valets.length >= post.capacity;
            const options = freeValets.filter((v) => v.assignment?.post_id !== post.id);

            return (
              <section key={post.id} className="ar-card">
                <div className="ar-post-head">
                  <div>
                    <h3>{post.post_name}</h3>
                    <span className="ar-muted" style={{ fontSize: 12 }}>
                      {gate ? `${gate.gate_name} · ${GATE_TYPE_LABEL[gate.gate_type]}` : "No gate linked"}
                    </span>
                  </div>
                  <span className={`ar-chip ${full ? "ar-chip-green" : "ar-chip-amber"}`}>
                    {post.valets.length}/{post.capacity}
                  </span>
                </div>

                <div className="ar-meter" data-full={full}>
                  <span style={{ width: `${Math.min(100, (post.valets.length / post.capacity) * 100)}%` }} />
                </div>

                {post.valets.length === 0 ? (
                  <p className="ar-muted" style={{ fontSize: 13, margin: "0 0 12px" }}>No valet here yet.</p>
                ) : (
                  <ul className="ar-list" style={{ marginBottom: 12 }}>
                    {post.valets.map((valet) => (
                      <li key={valet.assignment_id}>
                        <span className="ar-person">
                          <span className="ar-avatar" aria-hidden="true">{initials(valet.name)}</span>
                          <span>
                            <strong>{valet.name}</strong>
                            <span className="ar-muted">{valet.phone || valet.email}</span>
                          </span>
                        </span>
                        <button
                          type="button"
                          className="ar-btn ar-btn-sm"
                          aria-label={`Remove ${valet.name} from ${post.post_name}`}
                          onClick={() => run(() => removeValetAssignment(valet.assignment_id), "Valet removed from post.")}
                        >
                          <X size={13} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="ar-form">
                  <label className="ar-field">
                    <span>Add valet</span>
                    <select
                      className="ar-select"
                      value={pick[post.id] || ""}
                      disabled={full}
                      onChange={(e) => setPick({ ...pick, [post.id]: e.target.value })}
                    >
                      <option value="">{full ? "Post is full" : "Choose a valet"}</option>
                      {options.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.name}{v.assignment ? ` (now at ${v.assignment.post_name})` : ""}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    className="ar-btn ar-btn-primary"
                    disabled={!pick[post.id] || full}
                    onClick={async () => {
                      const ok = await run(() => assignValetToPost(pick[post.id], post.id), "Valet assigned.");
                      if (ok) setPick((prev) => ({ ...prev, [post.id]: "" }));
                    }}
                  >
                    Assign
                  </button>
                </div>

                <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                  <button
                    type="button"
                    className="ar-btn ar-btn-sm"
                    onClick={() => {
                      const next = window.prompt(`How many valets does ${post.post_name} need?`, String(post.capacity));
                      if (next) run(() => updatePost(post.id, { capacity: Number(next) }), "Capacity updated.");
                    }}
                  >
                    Change size
                  </button>
                  <button
                    type="button"
                    className="ar-btn ar-btn-sm ar-btn-danger"
                    onClick={() => {
                      if (window.confirm(`Remove the ${post.post_name} post? Its valets become unposted.`)) {
                        run(() => deletePost(post.id), "Post removed.");
                      }
                    }}
                  >
                    Remove post
                  </button>
                </div>
              </section>
            );
          })}
        </div>
      )}

      <section className="ar-card">
        <h2>Valets</h2>
        <p className="ar-sub">
          Valets already working another manager’s floor are not available to you until that manager
          releases them.
        </p>

        {valets.length === 0 ? (
          <div className="ar-empty">No active valets found.</div>
        ) : (
          <div className="ar-scroll">
            <table className="ar-table">
              <thead>
                <tr>
                  <th>Valet</th>
                  <th>Contact</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {valets.map((v) => (
                  <tr key={v.id}>
                    <td>
                      <span className="ar-person">
                        <span className="ar-avatar" aria-hidden="true">{initials(v.name)}</span>
                        <strong>{v.name}</strong>
                      </span>
                    </td>
                    <td className="ar-muted">{v.phone || v.email}</td>
                    <td>
                      {!v.assignment && <span className="ar-chip ar-chip-amber">Not posted</span>}
                      {v.assignment?.in_my_area && (
                        <span className="ar-chip ar-chip-green">At {v.assignment.post_name}</span>
                      )}
                      {v.assignment && !v.assignment.in_my_area && (
                        <span className="ar-chip">Another area</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

export default ValetPosts;
