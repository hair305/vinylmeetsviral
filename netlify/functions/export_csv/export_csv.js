export default async (request) => {
  function readCookie(name){const h=request.headers.get('cookie')||'';const m=h.match(new RegExp('(?:^|; )'+name+'=([^;]*)'));return m?decodeURIComponent(m[1]):null;}
  const token=readCookie('vmv_sp_access');
  if(!token) return new Response('Not authenticated',{status:401});
  const r=await fetch('https://api.spotify.com/v1/me/tracks?limit=50',{headers:{Authorization:`Bearer ${token}`}});
  if(!r.ok) return new Response('Spotify API error',{status:502});
  const data=await r.json();
  const rows=(data.items||[]).map(it=>{const tr=it.track||{};const artist=(tr.artists&&tr.artists[0]&&tr.artists[0].name)||'—';return{track:tr.name||'—',artist,album:tr.album?.name||'—',duration_ms:tr.duration_ms||0,added_at:it.added_at,spotify_url:tr.external_urls?.spotify||'#',youtube_url:`https://www.youtube.com/results?search_query=${encodeURIComponent(tr.name+' '+artist)}`};});
  rows.sort((a,b)=> new Date(b.added_at)-new Date(a.added_at) || a.track.localeCompare(b.track));
  const header=['Track','Artist','Album','Duration_ms','Added','Spotify','YouTube'];
  const esc=v=>`"${String(v).replaceAll('"','""')}"`; const lines=[header.join(',')];
  for(const r2 of rows){lines.push([esc(r2.track),esc(r2.artist),esc(r2.album),r2.duration_ms,esc(r2.added_at),esc(r2.spotify_url),esc(r2.youtube_url)].join(','));}
  const csv=lines.join('\n');
  return new Response(csv,{status:200,headers:{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="liked_songs.csv"'}});
};
