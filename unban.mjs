import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://vmuukfegnjotlgvdqfrx.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZtdXVrZmVnbmpvdGxndmRxZnJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg5NTY2MzYsImV4cCI6MjA5NDUzMjYzNn0.FswR9i0EgMZ5UPs8NpE-es4i3HonKQXilqBPA0ulT3Q";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
  const { data, error } = await supabase.from('mentorist_profiles').select('*').eq('status', 'rejected');
  
  if (error) {
    console.error('Error fetching:', error);
    return;
  }
  
  console.log(`Found ${data.length} rejected users.`);
  
  for (const user of data) {
    const newStatus = user.role === 'mentor' ? 'pending' : 'active';
    console.log(`Unbanning ${user.email} -> ${newStatus}`);
    
    const { error: updateError } = await supabase
      .from('mentorist_profiles')
      .update({ status: newStatus, rejected_at: null })
      .eq('email', user.email);
      
    if (updateError) {
      console.error(`Failed to update ${user.email}:`, updateError);
    } else {
      console.log(`Successfully updated ${user.email}`);
    }
  }
}

run();
