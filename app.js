import { msToDuration, sanitize, buildShareLinks, toCSV } from './utils/format.js';

const AUTH_URL = 'https://accounts.spotify.com/authorize';
const SCOPES = encodeURIComponent('user-library-read');
const REDIRECT_URI = encodeURIComponent(window.location.origin + '/.netlify/functions/callback_spotify');

const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const authMsg = document.getElementById('authMsg');
const tableSection = document.getElementById('tableSection');
const tableMount = document.getElementById('tableMount');
const refreshBtn = document.getElementById('refreshBtn');
const searchInput = document.getElementById('search');
const sortSelect = document.getElementById('sortSelect');
const downloadCsvBtn = document.getElementById('downloadCsvBtn');

let lastRows = [];
let CLIENT_ID = null;

async function fetchClientId(){
  const r = await fetch('/.netlify/functions/public_env');
  if(!r.ok) throw new Error('Missing SPOTIFY_CLIENT_ID on server');
  const j = await r.json();
  CLIENT_ID = j.client_id;
  if(!CLIENT_ID) throw new Error('SPOTIFY_CLIENT_ID not configured');
}

function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
}

function hasToken() {
  return Boolean(getCookie('vmv_sp_access'));
}

function login() {
  const url = `${AUTH_URL}?client_id=${encodeURIComponent(CLIENT_ID)}&response_type=code&redirect_uri=${REDIRECT_URI}&scope=${SCOPES}&show_dialog=true`;
  window.location.assign(url);
}

async function fetchLiked() {
  const resp = await fetch('/.netlify/functions/get_liked', { credentials: 'include' });
  if (!resp.ok) throw new Error(`Failed to load liked songs (${resp.status})`);
  return resp.json();
}

function applySort(rows){
  const mode = sortSelect.value;
  const copy = rows.slice();
  if (mode === 'date_desc'){
    copy.sort((a,b)=> new Date(b.added_at) - new Date(a.added_at) || a.track.localeCompare(b.track));
  } else if (mode === 'title_desc'){
    copy.sort((a,b)=> b.track.localeCompare(a.track));
  } else {
    copy.sort((a,b)=> a.track.localeCompare(b.track));
  }
  return copy;
}

function renderTable(rows) {
  lastRows = rows;
  const q = searchInput.value.trim().toLowerCase();
  const filtered = q ? rows.filter(r => (r.track + ' ' + r.artist).toLowerCase().includes(q)) : rows;
  const sorted = applySort(filtered);

  const thead = `<thead><tr>
      <th>#</th><th>Track</th><th>Artist</th><th>Album</th><th>Duration</th><th>Added</th><th>Spotify</th><th>YouTube</th><th>Share</th>
    </tr></thead>`;

  const tbody = sorted.map((r,i) => {
    const { ios, whatsapp } = buildShareLinks(r.track, r.artist, r.spotify_url, r.youtube_url);
    return `<tr>
      <td>${i+1}</td><td>${sanitize(r.track)}</td><td>${sanitize(r.artist)}</td><td>${sanitize(r.album)}</td>
      <td>${msToDuration(r.duration_ms)}</td><td>${new Date(r.added_at).toLocaleDateString()}</td>
      <td><a href="${r.spotify_url}" target="_blank">Open</a></td>
      <td><a href="${r.youtube_url}" target="_blank">Search</a></td>
      <td><a href="${ios}" target="_blank">iOS</a> | <a href="${whatsapp}" target="_blank">WhatsApp</a></td>
    </tr>`;
  }).join('');

  tableMount.innerHTML = `<table>${thead}<tbody>${tbody}</tbody></table>`;
}

async function downloadCSV(){
  try{
    const resp = await fetch('/.netlify/functions/export_csv', { credentials: 'include' });
    if (resp.ok){
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'liked_songs.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      return;
    }
  } catch(e){}
  const csv = toCSV(lastRows);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'liked_songs.csv';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

async function boot() {
  try { await fetchClientId(); } catch(e){ authMsg.textContent = e.message; return; }
  if (!hasToken()) {
    tableSection.style.display = 'none';
    loginBtn.style.display = 'inline-block';
    logoutBtn.style.display = 'none';
    authMsg.textContent = 'Not signed in.';
    return;
  }
  loginBtn.style.display = 'none';
  logoutBtn.style.display = 'inline-block';
  authMsg.textContent = 'Signed in. Loading your 50 liked songs…';
  try {
    const data = await fetchLiked();
    tableSection.style.display = 'block';
    renderTable(data.items);
    authMsg.textContent = 'Loaded.';
  } catch (e) { authMsg.textContent = e.message; }
}

loginBtn.addEventListener('click', login);
logoutBtn.addEventListener('click', () => {
  document.cookie = 'vmv_sp_access=; Max-Age=0; path=/;';
  document.cookie = 'vmv_sp_refresh=; Max-Age=0; path=/;';
  document.cookie = 'vmv_sp_exp=; Max-Age=0; path=/;';
  location.reload();
});
refreshBtn.addEventListener('click', boot);
searchInput.addEventListener('input', () => renderTable(lastRows));
sortSelect.addEventListener('change', () => renderTable(lastRows));
downloadCsvBtn.addEventListener('click', downloadCSV);
boot();
