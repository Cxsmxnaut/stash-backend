const { createClient } = require('@supabase/supabase-js');
const { supabase } = require('../config/supabaseClient');

function createAuthedClient(accessToken) {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    auth: {
      persistSession: false,
    },
  });
}

async function signUp(email, password, name) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    throw error;
  }

  const { user, session } = data;

  if (!user) {
    throw new Error('Sign up failed: user not returned.');
  }

  if (!session || !session.access_token) {
    throw new Error(
      'Sign up requires an active session to create the profile row. Enable immediate sessions or use a service role key on the backend.'
    );
  }

  const authed = createAuthedClient(session.access_token);
  const { error: profileError } = await authed.from('users').insert({
    id: user.id,
    name,
  });

  if (profileError) {
    throw profileError;
  }

  return { user, session };
}

async function signIn(email, password) {
  // Temporary bypass for testing - return mock user
  if (email === 'bhavith.lolakapuri@gmail.com' && password === 'Bhavith123@') {
    return {
      user: {
        id: 'test-user-id',
        email: 'bhavith.lolakapuri@gmail.com',
        name: 'Test User'
      },
      session: {
        access_token: 'test-token-123',
        user: {
          id: 'test-user-id'
        }
      }
    };
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw error;
  }

  return { user: data.user, session: data.session };
}

async function getUserFromToken(token) {
  if (!token) {
    return null;
  }

  const { data, error } = await supabase.auth.getUser(token);

  if (error) {
    return null;
  }

  return data.user ?? null;
}

module.exports = {
  signUp,
  signIn,
  getUserFromToken,
};
