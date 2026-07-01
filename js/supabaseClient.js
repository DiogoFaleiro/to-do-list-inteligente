(function (App) {
  const SUPABASE_URL = 'https://taekholvkqwhuuncdzan.supabase.co';
  const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_OESN0ltS0Uwg97FUNQy9CA_0qyI-sya';

  const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

  function signUp(email, password) {
    return client.auth.signUp({ email, password });
  }

  function signIn(email, password) {
    return client.auth.signInWithPassword({ email, password });
  }

  function signOut() {
    return client.auth.signOut();
  }

  function getSession() {
    return client.auth.getSession();
  }

  function onAuthStateChange(callback) {
    return client.auth.onAuthStateChange(callback);
  }

  async function getCurrentProfile(userId) {
    const { data, error } = await client.from('profiles').select('*').eq('id', userId).single();
    if (error) throw error;
    return data;
  }

  function updatePassword(newPassword) {
    return client.auth.updateUser({ password: newPassword });
  }

  App.supabaseClient = client;
  App.auth = {
    signUp,
    signIn,
    signOut,
    getSession,
    onAuthStateChange,
    getCurrentProfile,
    updatePassword
  };
})(window.App = window.App || {});
