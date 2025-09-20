export default async () => {
  return new Response(JSON.stringify({
    client_id: process.env.SPOTIFY_CLIENT_ID || process.env.SPOTIPY_CLIENT_ID || ''
  }), {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
  });
};
