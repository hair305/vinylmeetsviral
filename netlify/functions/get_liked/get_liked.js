export default async (request) => {
  function readCookie(name){const h=request.headers.get('cookie')||'';const m=h.match(new RegExp('(?:^|; )'+name+'=([^;]*)'));return m?decodeURIComponent(m[1]):null;}
  const token=readCookie('vmv_sp_access');
  if(!token) return new Response(JSON.stringify({error:'Not authenticated'}),{status:401,headers:{'Content-Type':'application/json'}});
  const r=await fetch('https://api.spotify.com/v1/me/tracks?limit=50',{headers:{Authorization:`Bearer ${token}`}});
  if(!r.ok){const t=await r.text();return new Response(JSON.stringify({error:'Spotify API error',detail:t}),{status:502,headers:{'Content-Type':'application/json'}});}
  const data=await r.json();
  const items=(data.items||[]).map(it=>{const tr=it.track||{};const artist=(tr.artists&&tr.artists[0]&&tr.artists[0].name)||'—';return{track:tr.name||'—',artist,album:tr.album?.name||'—',duration_ms:tr.duration_ms||0,added_at:it.added_at,spotify_url:tr.external_urls?.spotify||'#',youtube_url:`https://www.youtube.com/results?search_query=${encodeURIComponent(tr.name+' '+artist)}`};});
  return new Response(JSON.stringify({items}),{headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
};
