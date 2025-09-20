export default async (request) => {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  if (!code) return new Response('Missing code', { status: 400 });

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: `${process.env.URL}/.netlify/functions/callback_spotify`,
    client_id: process.env.SPOTIFY_CLIENT_ID || process.env.SPOTIPY_CLIENT_ID,
    client_secret: process.env.SPOTIFY_CLIENT_SECRET || process.env.SPOTIPY_CLIENT_SECRET
  });

  const tokenResp = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  });

  if (!tokenResp.ok) {
    const t = await tokenResp.text();
    return new Response(`Token exchange failed: ${t}`, { status: 500 });
  }

  const token = await tokenResp.json();
  const expiresAt = Math.floor(Date.now()/1000) + token.expires_in - 30;
  const cookies = [
    `vmv_sp_access=${token.access_token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${token.expires_in}`,
    token.refresh_token ? `vmv_sp_refresh=${token.refresh_token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000` : '',
    `vmv_sp_exp=${expiresAt}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`
  ].filter(Boolean);

  return new Response(null, { status: 302, headers: { 'Set-Cookie': cookies, 'Location': '/' } });
};
