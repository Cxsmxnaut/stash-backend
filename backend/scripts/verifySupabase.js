const { supabase } = require('../config/supabaseClient');

async function main() {
  const urlSet = !!process.env.SUPABASE_URL;
  const keySet = !!process.env.SUPABASE_ANON_KEY;

  if (!urlSet || !keySet) {
    console.error('Missing SUPABASE_URL or SUPABASE_ANON_KEY.');
    process.exit(1);
  }

  const { data, error } = await supabase
    .from('users')
    .select('id')
    .limit(1);

  if (error) {
    console.error('Supabase connectivity check returned an error:');
    console.error(error.message);
    process.exit(1);
  }

  console.log('Supabase client connected. users rows fetched:', data.length);
}

main().catch((err) => {
  console.error('Unexpected error:', err.message || err);
  process.exit(1);
});
