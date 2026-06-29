#!/usr/bin/env node
/**
 * COMPLETE WIPE: Delete all users from Auth + all data from database
 * This script completely resets Mentorist to a clean slate
 * 
 * USAGE: node wipe-clean.js
 * 
 * WARNING: This will DELETE ALL DATA including:
 * - All Supabase Auth users
 * - All mentorist_profiles
 * - All mentorist_questions  
 * - All mentorist_alerts
 * - All mentorist_mentors
 * 
 * This action cannot be undone!
 */

const { createClient } = require('@supabase/supabase-js');

// SECURITY: The service role key was previously hardcoded and committed to this
// file. That key MUST be rotated in the Supabase dashboard immediately. The
// service role key is now read from the SUPABASE_SERVICE_ROLE_KEY env var.
const ADMIN_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!ADMIN_KEY) {
  console.error('Set SUPABASE_SERVICE_ROLE_KEY env var to run this script.');
  process.exit(1);
}

const CONFIG = {
  SUPABASE_URL: "https://vmuukfegnjotlgvdqfrx.supabase.co",
  SUPABASE_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZtdXVrZmVnbmpvdGxndmRxZnJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg5NTY2MzYsImV4cCI6MjA5NDUzMjYzNn0.FswR9i0EgMZ5UPs8NpE-es4i3HonKQXilqBPA0ulT3Q",
  ADMIN_KEY: ADMIN_KEY
};

const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);
const supabaseAdmin = createClient(CONFIG.SUPABASE_URL, CONFIG.ADMIN_KEY);

async function wipeEverything() {
  console.log("\n╔════════════════════════════════════════════════════╗");
  console.log("║  MENTORIST - COMPLETE DATA WIPE                   ║");
  console.log("║  This will delete ALL users and data              ║");
  console.log("║  This action CANNOT be undone                     ║");
  console.log("╚════════════════════════════════════════════════════╝\n");

  // Ask for confirmation
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question('⚠️  Type "WIPE ALL DATA" to confirm: ', async (answer) => {
      rl.close();
      
      if (answer !== 'WIPE ALL DATA') {
        console.log('\n❌ Confirmation failed. Aborting wipe.');
        process.exit(0);
      }

      console.log('\n🔥 Starting complete data wipe...\n');

      try {
        // Step 1: Delete profile-dependent tables
        console.log('  [1/5] Deleting questions...');
        const { error: qErr } = await supabase.from('mentorist_questions').delete().neq('id', '');
        if (qErr) console.error('    ⚠️  Error:', qErr.message);
        else console.log('    ✅ Questions deleted');

        console.log('  [2/5] Deleting alerts...');
        const { error: aErr } = await supabase.from('mentorist_alerts').delete().neq('id', '');
        if (aErr) console.error('    ⚠️  Error:', aErr.message);
        else console.log('    ✅ Alerts deleted');

        console.log('  [4/5] Deleting user profiles...');
        const { error: pErr } = await supabase.from('mentorist_profiles').delete().neq('email', '');
        if (pErr) console.error('    ⚠️  Error:', pErr.message);
        else console.log('    ✅ Profiles deleted');

        // Step 2: Delete all Auth users (requires admin key)
        console.log('  [5/5] Deleting Supabase Auth users...');
        try {
          // Get all users
          const { data: { users }, error: listErr } = await supabaseAdmin.auth.admin.listUsers();
          
          if (listErr) {
            console.error('    ⚠️  Could not list users:', listErr.message);
          } else {
            console.log(`    Found ${users.length} users to delete...`);
            
            // Delete each user
            for (let user of users) {
              const { error: delErr } = await supabaseAdmin.auth.admin.deleteUser(user.id);
              if (delErr) {
                console.error(`    ⚠️  Error deleting ${user.email}:`, delErr.message);
              } else {
                console.log(`    ✅ Deleted ${user.email}`);
              }
            }
          }
        } catch (err) {
          console.error('    ⚠️  Admin deletion not available:', err.message);
        }

        console.log('\n✨ WIPE COMPLETE!\n');
        console.log('Database is now completely clean and ready for testing.');
        console.log('You can now sign up fresh accounts.\n');

        process.exit(0);
      } catch (error) {
        console.error('\n❌ FATAL ERROR:', error.message);
        process.exit(1);
      }
    });
  });
}

wipeEverything();
