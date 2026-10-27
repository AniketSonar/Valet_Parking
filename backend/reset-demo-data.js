require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");

const BUCKET = "vehicle-inspection-photos";
const PAGE_SIZE = 1000;
const DELETE_BATCH_SIZE = 100;
const TABLES_TO_CLEAR = [
  "vehicle_inspection_photos",
  "vehicle_inspections",
  "feedback",
  "payments",
  "keys",
  "notifications",
  "incidents",
  "valet_assignments",
  "staff_assignments",
  "manager_assignments",
  "parking_sessions",
  "parking_bookings",
  "parking_positions",
  "parking_systems",
  "parking_slots",
  "valet_posts",
  "parking_gates",
  "parking_zones",
  "parking_floors",
  "parking_buildings",
  "employees",
  "vehicles",
  "customers",
];

function assertNoError(error, operation) {
  if (error) {
    throw new Error(`${operation} failed: ${error.message}`);
  }
}

async function listAuthUsers(supabase) {
  const users = [];
  for (let page = 1; ; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: PAGE_SIZE,
    });
    assertNoError(error, "Listing authentication users");
    users.push(...data.users);
    if (data.users.length < PAGE_SIZE) {
      return users;
    }
  }
}

async function listStorageFiles(bucket, prefix = "") {
  const files = [];
  const folders = [];

  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await bucket.list(prefix, {
      limit: PAGE_SIZE,
      offset,
    });
    assertNoError(error, `Listing storage objects in ${prefix || BUCKET}`);

    for (const item of data) {
      const path = prefix ? `${prefix}/${item.name}` : item.name;
      if (item.id === null) {
        folders.push(path);
      } else {
        files.push(path);
      }
    }
    if (data.length < PAGE_SIZE) {
      break;
    }
  }

  for (const folder of folders) {
    files.push(...(await listStorageFiles(bucket, folder)));
  }
  return files;
}

async function countRows(supabase, table) {
  const { count, error } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true });
  assertNoError(error, `Counting ${table}`);
  return count;
}

async function run() {
  if (!process.argv.includes("--confirm")) {
    throw new Error(
      "This permanently deletes demo data. Re-run with --confirm to proceed."
    );
  }

  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured.");
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: admins, error: adminError } = await supabase
    .from("users")
    .select("id, auth_user_id")
    .eq("role", "super_admin");
  assertNoError(adminError, "Finding the super-admin account");
  if (!admins || admins.length === 0 || admins.some((admin) => !admin.auth_user_id)) {
    throw new Error(
      "Expected at least one super-admin with a linked auth account; no data was cleared."
    );
  }
  const superAdminIds = new Set(admins.map((admin) => admin.id));
  const superAdminAuthIds = new Set(admins.map((admin) => admin.auth_user_id));

  for (const authUserId of superAdminAuthIds) {
    const { data: linkedAuth, error: linkedAuthError } =
      await supabase.auth.admin.getUserById(authUserId);
    assertNoError(linkedAuthError, "Verifying a super-admin auth account");
    if (!linkedAuth.user) {
      throw new Error("A super-admin auth account was not found; no data was cleared.");
    }
  }

  const tableCounts = {};
  for (const table of TABLES_TO_CLEAR) {
    tableCounts[table] = await countRows(supabase, table);
  }
  tableCounts.users = await countRows(supabase, "users");

  const authUsers = await listAuthUsers(supabase);
  const storage = supabase.storage.from(BUCKET);
  const storageFiles = await listStorageFiles(storage);

  console.log("Preflight passed. Records to clear:");
  for (const [table, count] of Object.entries(tableCounts)) {
    console.log(`  ${table}: ${table === "users" ? count - admins.length : count}`);
  }
  console.log(`  super-admin accounts to keep: ${admins.length}`);
  console.log(`  auth users: ${authUsers.filter((user) => !superAdminAuthIds.has(user.id)).length}`);
  console.log(`  inspection photos: ${storageFiles.length}`);

  for (const table of TABLES_TO_CLEAR) {
    const { error } = await supabase
      .from(table)
      .delete()
      .not("id", "is", null);
    assertNoError(error, `Clearing ${table}`);
  }

  const { error: appUsersError } = await supabase
    .from("users")
    .delete()
    .neq("role", "super_admin");
  assertNoError(appUsersError, "Clearing non-admin application users");

  for (const user of authUsers) {
    if (!superAdminAuthIds.has(user.id)) {
      const { error } = await supabase.auth.admin.deleteUser(user.id);
      assertNoError(error, "Deleting a non-admin auth user");
    }
  }

  for (let offset = 0; offset < storageFiles.length; offset += DELETE_BATCH_SIZE) {
    const { error } = await storage.remove(
      storageFiles.slice(offset, offset + DELETE_BATCH_SIZE)
    );
    assertNoError(error, "Deleting inspection photos");
  }

  for (const table of TABLES_TO_CLEAR) {
    const count = await countRows(supabase, table);
    if (count !== 0) {
      throw new Error(`Verification failed: ${table} still contains ${count} rows.`);
    }
  }
  const { data: remainingAdmins, error: verifyAdminError } = await supabase
    .from("users")
    .select("id, auth_user_id")
    .eq("role", "super_admin");
  assertNoError(verifyAdminError, "Verifying the super-admin account");
  if (
    !remainingAdmins ||
    remainingAdmins.length !== superAdminIds.size ||
    remainingAdmins.some(
      (admin) =>
        !superAdminIds.has(admin.id) || !superAdminAuthIds.has(admin.auth_user_id)
    )
  ) {
    throw new Error("Verification failed: the super-admin application account changed.");
  }
  const remainingAppUsers = await countRows(supabase, "users");
  if (remainingAppUsers !== superAdminIds.size) {
    throw new Error(
      `Verification failed: expected ${superAdminIds.size} application users, found ${remainingAppUsers}.`
    );
  }
  const remainingStorageFiles = await listStorageFiles(storage);
  if (remainingStorageFiles.length !== 0) {
    throw new Error(
      `Verification failed: ${remainingStorageFiles.length} inspection photos remain.`
    );
  }
  const remainingAuthUsers = await listAuthUsers(supabase);
  if (
    remainingAuthUsers.length !== superAdminAuthIds.size ||
    remainingAuthUsers.some((user) => !superAdminAuthIds.has(user.id))
  ) {
    throw new Error(
      `Verification failed: expected ${superAdminAuthIds.size} super-admin auth accounts, found ${remainingAuthUsers.length}.`
    );
  }

  console.log("Demo data cleared. All super-admin accounts were preserved.");
}

run().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
