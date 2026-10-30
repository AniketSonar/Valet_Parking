const supabase = require("../config/supabase");

/**
 * Automatic valet dispatch.
 *
 * Replaces the old three-step hand-off (check in -> key management -> assign
 * valet). When a valet-parking vehicle is checked in, the system picks the valet
 * who is free at that moment, assigns the session to them and hands them the
 * key in the same step.
 *
 * "Free" means the valet has no open job that needs their hands: a car waiting
 * to be parked (checked_in), or a retrieval in progress (retrieval_requested,
 * retrieving). Cars they have already parked do not make them busy.
 *
 * Choice order:
 *   1. valets standing at a post on a floor (the manager placed them) before the rest
 *   2. fewest open jobs (a completely free valet always wins)
 *   3. the valet who has gone longest without a new car, so work is shared out
 *
 * If nobody is completely free, the least busy valet still gets the car, so a
 * customer is never left without a named valet. Nothing here throws: check-in
 * must still succeed if dispatch cannot find anyone.
 */

const OPEN_JOB_STATUSES = ["checked_in", "retrieval_requested", "retrieving"];

const loadCandidates = async () => {
  const { data: employees, error } = await supabase
    .from("employees")
    .select("id, name, phone, email")
    .eq("role", "valet")
    .eq("is_active", true);

  if (error) throw error;
  if (!employees?.length) return [];

  const valetIds = employees.map((e) => e.id);
  const emails = employees.map((e) => e.email).filter(Boolean);

  const [usersRes, postsRes, jobsRes, lastRes] = await Promise.all([
    supabase
      .from("users")
      .select("id, email")
      .eq("role", "valet")
      .eq("is_active", true)
      .in("email", emails),
    supabase
      .from("valet_assignments")
      .select("valet_id, floor_id")
      .eq("is_active", true)
      .in("valet_id", valetIds),
    supabase
      .from("parking_sessions")
      .select("valet_id")
      .in("valet_id", valetIds)
      .in("status", OPEN_JOB_STATUSES),
    supabase
      .from("parking_sessions")
      .select("valet_id, checked_in_at")
      .in("valet_id", valetIds)
      .order("checked_in_at", { ascending: false })
      .limit(500)
  ]);

  for (const result of [usersRes, postsRes, jobsRes, lastRes]) {
    if (result.error) throw result.error;
  }

  const userByEmail = new Map((usersRes.data || []).map((u) => [u.email, u]));
  const postedIds = new Set((postsRes.data || []).map((p) => p.valet_id));

  const openJobs = new Map();
  for (const row of jobsRes.data || []) {
    openJobs.set(row.valet_id, (openJobs.get(row.valet_id) || 0) + 1);
  }

  const lastAssigned = new Map();
  for (const row of lastRes.data || []) {
    if (!lastAssigned.has(row.valet_id)) lastAssigned.set(row.valet_id, row.checked_in_at);
  }

  return employees
    // a valet needs a login account so the key can be handed to them
    .filter((e) => userByEmail.has(e.email))
    .map((e) => ({
      ...e,
      user_id: userByEmail.get(e.email).id,
      posted: postedIds.has(e.id),
      open_jobs: openJobs.get(e.id) || 0,
      last_assigned_at: lastAssigned.get(e.id) || null
    }));
};

const rank = (a, b) => {
  if (a.posted !== b.posted) return a.posted ? -1 : 1;
  if (a.open_jobs !== b.open_jobs) return a.open_jobs - b.open_jobs;

  if (a.last_assigned_at !== b.last_assigned_at) {
    if (!a.last_assigned_at) return -1;
    if (!b.last_assigned_at) return 1;
    return new Date(a.last_assigned_at) - new Date(b.last_assigned_at);
  }

  return String(a.name).localeCompare(String(b.name));
};

/** Hand the vehicle key of a session to the valet's login account. */
const handKeyToValet = async (session, userId) => {
  const { data: existing, error: findError } = await supabase
    .from("keys")
    .select("id, status")
    .eq("parking_session_id", session.id)
    .maybeSingle();

  if (findError) throw findError;

  const patch = {
    assigned_to: userId,
    status: "assigned",
    assigned_at: new Date().toISOString(),
    returned_at: null
  };

  if (existing) {
    const { data, error } = await supabase
      .from("keys")
      .update(patch)
      .eq("id", existing.id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  const { data, error } = await supabase
    .from("keys")
    .insert([{
      key_number: `KEY-${session.ticket_code || session.id}`,
      parking_session_id: session.id,
      notes: "Key received at check-in and handed to the valet automatically.",
      ...patch
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
};

/**
 * Pick the available valet for a freshly checked-in session and assign it.
 * Resolves to { assigned: true, valet, was_free } or { assigned: false, message }.
 */
const assignAvailableValet = async (session, actor = null) => {
  try {
    const candidates = (await loadCandidates()).sort(rank);

    // Rule 1: if a valet is the one checking the car in, the car is theirs.
    // (No manual key-management / assign-valet step.)
    const actorEmail = String(actor?.email || "").toLowerCase();
    const isValetActor = ["valet", "valet_attendant"].includes(actor?.role);
    const self = isValetActor
      ? candidates.find((c) => String(c.email || "").toLowerCase() === actorEmail)
      : null;

    if (candidates.length === 0 && !self) {
      return {
        assigned: false,
        message: "No active valet is available right now. Assign one from Valet Management."
      };
    }

    const pick = self || candidates[0];

    const { error: sessionError } = await supabase
      .from("parking_sessions")
      .update({ valet_id: pick.id })
      .eq("id", session.id);

    if (sessionError) throw sessionError;

    try {
      await handKeyToValet(session, pick.user_id);
    } catch (keyError) {
      // never leave a session pointing at a valet who does not hold the key
      await supabase.from("parking_sessions").update({ valet_id: null }).eq("id", session.id);
      throw keyError;
    }

    return {
      assigned: true,
      was_free: pick.open_jobs === 0,
      valet: { id: pick.id, name: pick.name, phone: pick.phone, email: pick.email }
    };
  } catch (error) {
    console.error("Auto-assign valet error:", error);

    return {
      assigned: false,
      message: "Vehicle checked in, but a valet could not be assigned automatically."
    };
  }
};

module.exports = { assignAvailableValet };
