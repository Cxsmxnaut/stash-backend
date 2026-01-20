require('dotenv').config();
const { signUp, signIn, getUserFromToken } = require('../auth/authService');

function randomEmail() {
  const stamp = Date.now();
  return `testuser_${stamp}@example.com`;
}

async function main() {
  const email = process.env.TEST_EMAIL || randomEmail();
  const password = process.env.TEST_PASSWORD || 'ChangeMe123!';
  const name = process.env.TEST_NAME || 'Test User';

  console.log('Using email:', email);

  let session;
  try {
    const signUpResult = await signUp(email, password, name);
    session = signUpResult.session;
    console.log('Sign up ok. user id:', signUpResult.user.id);
  } catch (error) {
    console.error('Sign up failed:', error.message || error);
    console.error('If email confirmation is enabled, signUp will not return a session.');
  }

  try {
    const signInResult = await signIn(email, password);
    session = signInResult.session;
    console.log('Sign in ok. user id:', signInResult.user.id);
  } catch (error) {
    console.error('Sign in failed:', error.message || error);
    process.exit(1);
  }

  const token = session && session.access_token;
  const user = await getUserFromToken(token);

  if (!user) {
    console.error('Token verification failed.');
    process.exit(1);
  }

  console.log('Token verified for user id:', user.id);
}

main().catch((err) => {
  console.error('Unexpected error:', err.message || err);
  process.exit(1);
});
