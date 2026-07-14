#!/usr/bin/env node
/**
 * Reset all Mentorist users and data for clean testing
 * Clears: mentorist_profiles, mentorist_questions, mentorist_alerts
 * Run with: node reset-users.js
 */

const { createClient } = require('@supabase/supabase-js');

const CONFIG = {
  SUPABASE_URL: "https://vmuukfegnjotlgvdqfrx.supabase.co",
  SUPABASE_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZtdXVrZmVnbmpvdGxndmRxZnJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg5NTY2MzYsImV4cCI6MjA5NDUzMjYzNn0.FswR9i0EgMZ5UPs8NpE-es4i3HonKQXilqBPA0ulT3Q",
};

const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);

async function resetAllData() {
  console.log("🔄 Starting complete Mentorist data reset...\n");

  try {
    // Clear mentorist_questions first (dependencies)
    console.log("  ⏳ Deleting all questions...");
    const { error: questionsErr, count: questionsCount } = await supabase
      .from('mentorist_questions')
      .delete()
      .neq('id', '');
    
    if (questionsErr) {
      console.error("  ❌ Error deleting questions:", questionsErr.message);
    } else {
      console.log("  ✅ Questions cleared");
    }

    // Clear mentorist_alerts
    console.log("  ⏳ Deleting all alerts...");
    const { error: alertsErr } = await supabase
      .from('mentorist_alerts')
      .delete()
      .neq('id', '');
    
    if (alertsErr) {
      console.error("  ❌ Error deleting alerts:", alertsErr.message);
    } else {
      console.log("  ✅ Alerts cleared");
    }

    // Clear mentorist_profiles (main user table)
    console.log("  ⏳ Deleting all user profiles...");
    const { error: usersErr } = await supabase
      .from('mentorist_profiles')
      .delete()
      .neq('email', '');
    
    if (usersErr) {
      console.error("  ❌ Error deleting users:", usersErr.message);
    } else {
      console.log("  ✅ User profiles cleared");
    }

    console.log("\n✨ All Mentorist data reset successfully!\n");
    console.log("📝 Next steps:");
    console.log("   1. Go to Supabase Dashboard → Authentication → Users");
    console.log("   2. Delete all test users manually");
    console.log("   3. Return to Mentorist and start fresh!\n");
    console.log("💾 Local storage will be cleared automatically when you reload the page.\n");

  } catch (error) {
    console.error("❌ Unexpected error:", error);
    process.exit(1);
  }
}

resetAllData();
