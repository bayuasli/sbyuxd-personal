const SK_R = 'sibayu_repo_v1';
const rget  = () => { try { return JSON.parse(localStorage.getItem(SK_R)) || {}; } catch { return {}; } };
const rset  = o  => localStorage.setItem(SK_R, JSON.stringify({ ...rget(), ...o }));
const renc  = (s, k = 'sb_rp25') => btoa(s.split('').map((c, i) => String.fromCharCode(c.charCodeAt(0) ^ k.charCodeAt(i % k.length))).join(''));
const rdec  = (s, k = 'sb_rp25') => { try { return atob(s).split('').map((c, i) => String.fromCharCode(c.charCodeAt(0) ^ k.charCodeAt(i % k.length))).join(''); } catch { return ''; } };
const rTok  = () => { const d = rget(); return d.gh_tok ? rdec(d.gh_tok) : ''; };

const GH = 'https://api.github.com';
const SBR = { background: '#252732', color: '#d4d8e8', customClass: { popup: 'swal-ptero' } };
const alr = (icon, text) => Swal.fire({ icon, text, confirmButtonColor: '#4875f0', ...SBR });

let ghUser = null;

function ghHeaders() {
  return { Authorization: 'Bearer ' + rTok(), Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
}

/* ── TOKEN ── */
function saveGHToken() {
  const v = document.getElementById('gh-tok-input').value.trim();
  if (!v) { alr('warning', 'Token tidak boleh kosong.'); return; }
  rset({ gh_tok: renc(v) });
  document.getElementById('gh-tok-input').value = '';
  refreshTokenBadge();
  Swal.fire({ icon: 'success', title: 'Token GitHub tersimpan', text: 'Terenkripsi dan aman di browser.', confirmButtonColor: '#4875f0', ...SBR });
}

function clearGHToken() {
  Swal.fire({ title: 'Hapus token GitHub?', icon: 'warning', showCancelButton: true, confirmButtonText: 'Hapus', cancelButtonText: 'Batal', confirmButtonColor: '#e3504f', cancelButtonColor: '#374151', ...SBR })
    .then(r => {
      if (!r.isConfirmed) return;
      const d = rget(); delete d.gh_tok; localStorage.setItem(SK_R, JSON.stringify(d));
      ghUser = null;
      refreshTokenBadge();
      Swal.fire({ icon: 'info', title: 'Token dihapus', timer: 1200, showConfirmButton: false, ...SBR });
    });
}

function refreshTokenBadge() {
  const has = !!rTok();
  const badge = document.getElementById('gh-tok-badge');
  const sdot  = document.getElementById('sdot-gh-repo');
  if (badge) { badge.textContent = has ? 'Tersimpan' : 'Belum diset'; badge.className = has ? 'badge ok' : 'badge off'; }
  if (sdot) sdot.classList.toggle('on', has);
}

/* ── AUTH ── */
async function ensureUser() {
  if (ghUser) return ghUser;
  const token = rTok();
  if (!token) throw new Error('Token GitHub belum diset. Set dulu di bagian Token.');
  const res = await fetch(GH + '/user', { headers: ghHeaders() });
  if (!res.ok) throw new Error('Token tidak valid atau expired.');
  const d = await res.json();
  ghUser = d.login;
  return ghUser;
}

/* ── LOADING HELPERS ── */
function showLoading(msg = 'Memuat...') {
  Swal.fire({ title: msg, allowOutsideClick: false, showConfirmButton: false, didOpen: () => Swal.showLoading(), ...SBR });
}

/* ── LIST REPOS ── */
async function listRepos() {
  const el = document.getElementById('repo-list-wrap');
  if (!el) return;
  el.innerHTML = '<div class="empty"><i class="fas fa-circle-notch fa-spin"></i>Memuat...</div>';
  try {
    const u = await ensureUser();
    const res = await fetch(`${GH}/users/${u}/repos?per_page=50&sort=updated`, { headers: ghHeaders() });
    if (!res.ok) throw new Error('Gagal memuat repo.');
    const repos = await res.json();
    if (!repos.length) { el.innerHTML = '<div class="empty"><i class="fab fa-github"></i>Tidak ada repo ditemukan.</div>'; return; }
    el.innerHTML = `<table class="ptable">
      <thead><tr><th>Nama</th><th>Visibility</th><th>Stars</th><th>Bahasa</th><th>Aksi</th></tr></thead>
      <tbody>` + repos.map(r => `<tr>
        <td>
          <div style="font-weight:500">${r.name}</div>
          <div style="font-size:0.68rem;color:var(--text3);margin-top:1px">${r.description || '—'}</div>
        </td>
        <td><span class="badge ${r.private ? 'off' : 'blue'}">${r.private ? 'Private' : 'Public'}</span></td>
        <td style="color:var(--text2)"><i class="fas fa-star" style="font-size:0.65rem;margin-right:3px"></i>${r.stargazers_count}</td>
        <td style="color:var(--text3)">${r.language || '—'}</td>
        <td>
          <div style="display:flex;gap:5px;flex-wrap:wrap">
            <a class="btn btn-ghost btn-sm" href="${r.html_url}" target="_blank"><i class="fab fa-github"></i></a>
            <button class="btn btn-ghost btn-sm" onclick="openRepoInfo('${r.name}')"><i class="fas fa-circle-info"></i></button>
            <button class="btn btn-sm" onclick="toggleVis('${r.name}',${r.private})" style="background:rgba(240,164,41,0.09);color:#f0a429;border:1px solid rgba(240,164,41,0.2)">${r.private ? '<i class="fas fa-lock-open"></i>' : '<i class="fas fa-lock"></i>'}</button>
            <button class="btn btn-danger btn-sm" onclick="deleteRepo('${r.name}')"><i class="fas fa-trash"></i></button>
          </div>
        </td>
      </tr>`).join('') + `</tbody></table>`;
  } catch (e) { el.innerHTML = `<div class="empty"><i class="fas fa-circle-exclamation"></i>${e.message}</div>`; }
}

/* ── CREATE REPO ── */
async function createRepo() {
  const name = document.getElementById('cr-name').value.trim();
  const desc = document.getElementById('cr-desc').value.trim();
  const priv = document.getElementById('cr-private').checked;
  if (!name) { alr('warning', 'Nama repo wajib diisi.'); return; }
  if (!/^[a-zA-Z0-9._-]+$/.test(name)) { alr('warning', 'Nama repo tidak valid.'); return; }
  showLoading('Membuat repo...');
  try {
    await ensureUser();
    const res = await fetch(GH + '/user/repos', { method: 'POST', headers: { ...ghHeaders(), 'Content-Type': 'application/json' }, body: JSON.stringify({ name, private: priv, description: desc, auto_init: true }) });
    if (!res.ok) { const e = await res.json(); throw new Error(e.message || 'Gagal membuat repo.'); }
    const r = await res.json();
    document.getElementById('cr-name').value = '';
    document.getElementById('cr-desc').value = '';
    document.getElementById('cr-private').checked = false;
    Swal.fire({ icon: 'success', title: 'Repo dibuat!', html: `<code>${r.name}</code><br><a href="${r.html_url}" target="_blank" style="color:#4875f0">${r.html_url}</a>`, confirmButtonColor: '#4875f0', ...SBR });
    listRepos();
  } catch (e) { alr('error', e.message); }
}

/* ── DELETE REPO ── */
async function deleteRepo(name) {
  Swal.fire({ title: 'Hapus repo ' + name + '?', text: 'Tindakan ini TIDAK bisa dibatalkan!', icon: 'warning', showCancelButton: true, confirmButtonText: 'Hapus', cancelButtonText: 'Batal', confirmButtonColor: '#e3504f', cancelButtonColor: '#374151', ...SBR })
    .then(async r => {
      if (!r.isConfirmed) return;
      showLoading('Menghapus...');
      try {
        const u = await ensureUser();
        const res = await fetch(`${GH}/repos/${u}/${name}`, { method: 'DELETE', headers: ghHeaders() });
        if (res.ok || res.status === 204) {
          Swal.fire({ icon: 'success', title: 'Repo dihapus!', timer: 1300, showConfirmButton: false, ...SBR });
          listRepos();
        } else { const e = await res.json(); throw new Error(e.message || 'Gagal hapus.'); }
      } catch (e) { alr('error', e.message); }
    });
}

/* ── RENAME REPO ── */
async function renameRepo() {
  const oldName = document.getElementById('rn-old').value.trim();
  const newName = document.getElementById('rn-new').value.trim();
  if (!oldName || !newName) { alr('warning', 'Isi nama lama dan nama baru.'); return; }
  showLoading('Merename...');
  try {
    const u = await ensureUser();
    const res = await fetch(`${GH}/repos/${u}/${oldName}`, { method: 'PATCH', headers: { ...ghHeaders(), 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newName }) });
    if (!res.ok) { const e = await res.json(); throw new Error(e.message || 'Gagal rename.'); }
    const r = await res.json();
    document.getElementById('rn-old').value = '';
    document.getElementById('rn-new').value = '';
    Swal.fire({ icon: 'success', title: 'Repo di-rename!', html: `<code>${oldName}</code> → <code>${r.name}</code>`, confirmButtonColor: '#4875f0', ...SBR });
    listRepos();
  } catch (e) { alr('error', e.message); }
}

/* ── TOGGLE VISIBILITY ── */
async function toggleVis(name, isPrivate) {
  const action = isPrivate ? 'Public' : 'Private';
  Swal.fire({ title: `Ubah ke ${action}?`, text: `Repo "${name}" akan dijadikan ${action}.`, icon: 'question', showCancelButton: true, confirmButtonText: 'Ya', cancelButtonText: 'Batal', confirmButtonColor: '#4875f0', cancelButtonColor: '#374151', ...SBR })
    .then(async r => {
      if (!r.isConfirmed) return;
      showLoading('Mengubah...');
      try {
        const u = await ensureUser();
        const res = await fetch(`${GH}/repos/${u}/${name}`, { method: 'PATCH', headers: { ...ghHeaders(), 'Content-Type': 'application/json' }, body: JSON.stringify({ private: !isPrivate }) });
        if (!res.ok) { const e = await res.json(); throw new Error(e.message || 'Gagal.'); }
        Swal.fire({ icon: 'success', title: `Diubah ke ${action}!`, timer: 1300, showConfirmButton: false, ...SBR });
        listRepos();
      } catch (e) { alr('error', e.message); }
    });
}

/* ── REPO INFO ── */
async function openRepoInfo(name) {
  showLoading('Memuat info...');
  try {
    const u = await ensureUser();
    const res = await fetch(`${GH}/repos/${u}/${name}`, { headers: ghHeaders() });
    if (!res.ok) throw new Error('Gagal memuat info repo.');
    const r = await res.json();
    Swal.fire({
      title: r.name,
      html: `
        <div style="text-align:left;font-size:0.82rem;line-height:1.8;color:#d4d8e8">
          <div><b style="color:#8892aa">Deskripsi:</b> ${r.description || '—'}</div>
          <div><b style="color:#8892aa">Visibility:</b> ${r.private ? 'Private' : 'Public'}</div>
          <div><b style="color:#8892aa">Bahasa:</b> ${r.language || '—'}</div>
          <div><b style="color:#8892aa">Stars:</b> ${r.stargazers_count}</div>
          <div><b style="color:#8892aa">Forks:</b> ${r.forks_count}</div>
          <div><b style="color:#8892aa">Branch default:</b> ${r.default_branch}</div>
          <div><b style="color:#8892aa">Dibuat:</b> ${new Date(r.created_at).toLocaleDateString('id-ID')}</div>
          <div><b style="color:#8892aa">Update terakhir:</b> ${new Date(r.updated_at).toLocaleDateString('id-ID')}</div>
          <div style="margin-top:8px"><a href="${r.html_url}" target="_blank" style="color:#4875f0">${r.html_url}</a></div>
        </div>`,
      confirmButtonColor: '#4875f0', ...SBR
    });
  } catch (e) { alr('error', e.message); }
}

/* ── INIT ── */
document.addEventListener('DOMContentLoaded', () => {
  refreshTokenBadge();
  listRepos();
});
