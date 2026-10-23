require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey || supabaseUrl.includes("your-project")) {
  console.error("Please configure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in backend/.env before running seed.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const DEFAULT_PASSWORD = "Password123!";

const ACCOUNTS = [
  {
    name: "System Super Admin",
    email: "superadmin@valet.com",
    role: "super_admin",
    phone: "+919000000001",
  },
  {
    name: "Parking Facility Admin",
    email: "parkingadmin@valet.com",
    role: "manager",
    phone: "+919000000002",
  },
  {
    name: "Valet Security Officer",
    email: "security@valet.com",
    role: "valet",
    phone: "+919000000003",
  },
  {
    name: "Lead Valet Driver",
    email: "valet@valet.com",
    role: "valet",
    phone: "+919000000005",
  },
  {
    name: "Valet Attendant Staff",
    email: "attendant@valet.com",
    role: "valet",
    phone: "+919000000006",
  },
  {
    name: "Registered Customer",
    email: "customer@valet.com",
    role: "customer",
    phone: "+919876543210",
  }
];

async function seed() {
  console.log("=================================================");
  console.log("  AURA VALET PARKING - DATABASE SEED SCRIPT");
  console.log("=================================================\n");

  for (const account of ACCOUNTS) {
    console.log(`Processing: ${account.name} (${account.email})...`);

    // 1. Create or fetch Auth user
    let authUser = null;
    const { data: userList } = await supabase.auth.admin.listUsers();
    const existingAuth = (userList?.users || []).find((u) => u.email === account.email);

    if (existingAuth) {
      authUser = existingAuth;
      console.log(`  -> Auth user already exists: ${authUser.id}`);
    } else {
      const { data: newAuth, error: createError } = await supabase.auth.admin.createUser({
        email: account.email,
        password: DEFAULT_PASSWORD,
        email_confirm: true,
      });

      if (createError) {
        console.error(`  -> Auth creation failed for ${account.email}:`, createError.message);
        continue;
      }
      authUser = newAuth.user;
      console.log(`  -> Auth user created: ${authUser.id}`);
    }

    // 2. Insert or update public.users
    const { data: existingAppUser } = await supabase
      .from("users")
      .select("id")
      .eq("email", account.email)
      .maybeSingle();

    if (existingAppUser) {
      await supabase
        .from("users")
        .update({
          auth_user_id: authUser.id,
          name: account.name,
          role: account.role,
          phone: account.phone,
          is_active: true
        })
        .eq("id", existingAppUser.id);
      console.log(`  -> Application user record updated in public.users`);
    } else {
      await supabase
        .from("users")
        .insert({
          auth_user_id: authUser.id,
          name: account.name,
          email: account.email,
          role: account.role,
          phone: account.phone,
          is_active: true
        });
      console.log(`  -> Application user record created in public.users`);
    }

    // 3. For valet, ensure public.employees record exists
    if (account.role === "valet" || account.role === "valet_attendant") {
      const { data: existingEmp } = await supabase
        .from("employees")
        .select("id")
        .eq("email", account.email)
        .maybeSingle();

      if (existingEmp) {
        await supabase
          .from("employees")
          .update({
            name: account.name,
            role: "valet",
            phone: account.phone,
            is_active: true
          })
          .eq("id", existingEmp.id);
      } else {
        await supabase
          .from("employees")
          .insert({
            name: account.name,
            role: "valet",
            email: account.email,
            phone: account.phone,
            is_active: true
          });
      }
      console.log(`  -> Synced valet record in public.employees`);
    }

    // 4. For customer, ensure public.customers record exists
    if (account.role === "customer") {
      const { data: existingCust } = await supabase
        .from("customers")
        .select("id")
        .eq("email", account.email)
        .maybeSingle();

      if (existingCust) {
        await supabase
          .from("customers")
          .update({
            name: account.name,
            phone: account.phone
          })
          .eq("id", existingCust.id);
      } else {
        await supabase
          .from("customers")
          .insert({
            name: account.name,
            email: account.email,
            phone: account.phone
          });
      }
      console.log(`  -> Synced customer record in public.customers`);
    }
  }

  // 5. Seed sample parking floor and slots if empty
  const { data: existingSlots } = await supabase.from("parking_slots").select("id").limit(1);
  if (!existingSlots || existingSlots.length === 0) {
    console.log("\nSeeding sample parking slots (A-01 to A-10, B-01 to B-10)...");
    const slots = [];
    for (let i = 1; i <= 10; i++) {
      slots.push({ slot_number: `A-${String(i).padStart(2, "0")}`, parking_type: "car", status: "available" });
      slots.push({ slot_number: `B-${String(i).padStart(2, "0")}`, parking_type: "car", status: "available" });
    }
    await supabase.from("parking_slots").insert(slots);
    console.log(`  -> Added ${slots.length} parking slots.`);
  }

  console.log("\n=================================================");
  console.log("  SEED COMPLETED SUCCESSFULLY!");
  console.log("  Default password for all accounts: " + DEFAULT_PASSWORD);
  console.log("=================================================\n");
}

seed().catch(console.error);
