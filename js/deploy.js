const SK = 'sibayu_deploy_v1';
const get  = () => { try { return JSON.parse(localStorage.getItem(SK)) || {}; } catch { return {}; } };
const set  = o  => localStorage.setItem(SK, JSON.stringify({ ...get(), ...o }));
const enc  = (s, k = 'sb_dk25') => btoa(s.split('').map((c, i) => String.fromCharCode(c.charCodeAt(0) ^ k.charCodeAt(i % k.length))).join(''));
const dec  = (s, k = 'sb_dk25') => { try { return atob(s).split('').map((c, i) => String.fromCharCode(c.charCodeAt(0) ^ k.charCodeAt(i % k.length))).join(''); } catch { return ''; } };
const gTok = k => { const d = get(); return d['t_' + k] ? dec(d['t_' + k]) : ''; };
const sTok = (k, v) => set({ ['t_' + k]: enc(v) });

const SB = { background: '#252732', color: '#d4d8e8', customClass: { popup: 'swal-ptero' } };
const al = (icon, text) => Swal.fire({ icon, text, confirmButtonColor: '#4875f0', ...SB });

const files = { vcl: null };

/* ── TOKEN ── */
function saveToken(k) {
  const v = document.getElementById('ti-' + k).value.trim();
  if (!v) { al('warning', 'Token tidak boleh kosong.'); return; }
  sTok(k, v);
  document.getElementById('ti-' + k).value = '';
  refreshTokenUI();
  const n = { vcl: 'Vercel' };
  Swal.fire({ icon: 'success', title: 'Token ' + n[k] + ' tersimpan', text: 'Terenkripsi di browser kamu.', confirmButtonColor: '#4875f0', ...SB });
}

function clearToken(k) {
  const n = { vcl: 'Vercel' };
  Swal.fire({ title: 'Hapus token ' + n[k] + '?', text: 'Token akan dihapus.', icon: 'warning', showCancelButton: true, confirmButtonText: 'Hapus', cancelButtonText: 'Batal', confirmButtonColor: '#e3504f', cancelButtonColor: '#374151', ...SB })
    .then(r => {
      if (!r.isConfirmed) return;
      const d = get(); delete d['t_' + k]; localStorage.setItem(SK, JSON.stringify(d));
      refreshTokenUI();
      Swal.fire({ icon: 'info', title: 'Token dihapus', timer: 1200, showConfirmButton: false, ...SB });
    });
}

function refreshTokenUI() {
  const has = !!gTok('vcl');
  const badge = document.getElementById('tbadge-vcl');
  const sdot  = document.getElementById('sdot-vcl');
  const scval = document.getElementById('scval-vcl');
  const scdot = document.getElementById('scdot-vcl');
  const sc    = document.getElementById('sc-vcl');
  if (badge) { badge.textContent = has ? 'Tersimpan' : 'Belum diset'; badge.className = has ? 'badge ok' : 'badge off'; }
  if (sdot)  { sdot.classList.toggle('on', has); }
  if (scval) scval.textContent = has ? 'Connected' : 'Not connected';
  if (scdot) scdot.className = 'sc-dot ' + (has ? 'g' : 'r');
  if (sc) sc.classList.toggle('ok', has);
}

/* ── DROPZONE ── */
function initDropzone(k) {
  const dz  = document.getElementById('dz-' + k);
  const inp = document.getElementById('file-' + k);
  if (!dz || !inp) return;
  inp.addEventListener('change', e => { if (e.target.files[0]) setFile(k, e.target.files[0]); });
  dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('drag'); });
  dz.addEventListener('dragleave', () => dz.classList.remove('drag'));
  dz.addEventListener('drop', e => {
    e.preventDefault(); dz.classList.remove('drag');
    const f = e.dataTransfer.files[0];
    if (f && (f.name.endsWith('.zip') || f.name.endsWith('.html'))) setFile(k, f);
    else al('warning', 'Hanya file .zip atau .html yang diterima.');
  });
}

function setFile(k, f) {
  files[k] = f;
  document.getElementById('fn-' + k).textContent = f.name;
  document.getElementById('fs-' + k).textContent = fmtSize(f.size);
  document.getElementById('fi-' + k).classList.add('show');
}

function clearFile(k) {
  files[k] = null;
  const inp = document.getElementById('file-' + k);
  if (inp) inp.value = '';
  document.getElementById('fi-' + k).classList.remove('show');
}

function fmtSize(b) {
  if (b < 1024) return b + 'B';
  if (b < 1048576) return (b / 1024).toFixed(1) + 'KB';
  return (b / 1048576).toFixed(1) + 'MB';
}

/* ── LOG ── */
function log(k, type, msg) {
  const b = document.getElementById('log-' + k);
  if (!b) return;
  b.classList.add('show');
  const t = new Date().toTimeString().slice(0, 8);
  const l = document.createElement('div'); l.className = 'll ' + type;
  l.innerHTML = `<span class="lt">${t}</span><span class="lm">${msg}</span>`;
  b.appendChild(l); b.scrollTop = b.scrollHeight;
}
function clearLog(k) { const b = document.getElementById('log-' + k); if (b) { b.innerHTML = ''; b.classList.remove('show'); } }

/* ── SHA1 ── */
function sha1hex(buf) {
  return crypto.subtle.digest('SHA-1', buf)
    .then(h => Array.from(new Uint8Array(h)).map(b => b.toString(16).padStart(2, '0')).join(''));
}
function b64(buf) { const bytes = new Uint8Array(buf); let s = ''; bytes.forEach(b => s += String.fromCharCode(b)); return btoa(s); }

/* ── HISTORY ── */
function addHist(name, status, url = '') {
  const d = get(); const h = d.hist || [];
  h.unshift({ name, status, url, time: Date.now() });
  if (h.length > 60) h.pop();
  set({ hist: h });
  renderHistory();
}

function renderHistory() {
  const el = document.getElementById('hist-wrap');
  if (!el) return;
  const h = get().hist || [];
  if (!h.length) { el.innerHTML = '<div class="empty"><i class="fas fa-clock-rotate-left"></i>Belum ada riwayat deploy.</div>'; return; }
  el.innerHTML = `<table class="ptable">
    <thead><tr><th>Project</th><th>URL</th><th>Status</th><th>Waktu</th></tr></thead>
    <tbody>` + h.map(item => {
    const sc = item.status === 'success' ? 'ok' : item.status === 'running' ? 'run' : 'err';
    const st = { success: 'Success', running: 'Running', failed: 'Failed' }[item.status] || item.status;
    const dt = new Date(item.time).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
    const urlHtml = item.url ? `<a class="ptable-link" href="${item.url}" target="_blank">${item.url}</a>` : '—';
    return `<tr>
      <td style="font-weight:500">${item.name}</td>
      <td>${urlHtml}</td>
      <td><span class="badge ${sc}">${st}</span></td>
      <td style="color:var(--text3);font-size:0.72rem">${dt}</td>
    </tr>`;
  }).join('') + `</tbody></table>`;
}

function clearHistory() {
  Swal.fire({ title: 'Hapus semua riwayat?', icon: 'question', showCancelButton: true, confirmButtonText: 'Hapus', cancelButtonText: 'Batal', confirmButtonColor: '#e3504f', cancelButtonColor: '#374151', ...SB })
    .then(r => { if (r.isConfirmed) { set({ hist: [] }); renderHistory(); } });
}

/* ── LIST WEBSITES ── */
async function loadWebs() {
  const token = gTok('vcl');
  const el = document.getElementById('webs-wrap');
  if (!el) return;
  if (!token) { el.innerHTML = '<div class="empty"><i class="fas fa-key"></i>Set token Vercel dulu di halaman Tokens.</div>'; return; }
  el.innerHTML = '<div class="empty"><i class="fas fa-circle-notch fa-spin"></i>Memuat...</div>';
  try {
    const res = await fetch('https://api.vercel.com/v9/projects', { headers: { Authorization: 'Bearer ' + token } });
    if (!res.ok) throw new Error('Gagal memuat. Cek token Vercel.');
    const data = await res.json();
    const projs = data.projects || [];
    if (!projs.length) { el.innerHTML = '<div class="empty"><i class="fas fa-globe"></i>Tidak ada project di Vercel.</div>'; return; }
    el.innerHTML = `<table class="ptable">
      <thead><tr><th>Project</th><th>URL</th><th>Aksi</th></tr></thead>
      <tbody>` + projs.map(p => `<tr>
        <td style="font-weight:500">${p.name}</td>
        <td><a class="ptable-link" href="https://${p.name}.vercel.app" target="_blank">https://${p.name}.vercel.app</a></td>
        <td><button class="btn btn-danger btn-sm" onclick="deleteWeb('${p.name}','${p.id}')"><i class="fas fa-trash"></i> Hapus</button></td>
      </tr>`).join('') + `</tbody></table>`;
  } catch (e) { el.innerHTML = `<div class="empty"><i class="fas fa-circle-exclamation"></i>${e.message}</div>`; }
}

async function deleteWeb(name, id) {
  const token = gTok('vcl');
  Swal.fire({ title: 'Hapus project ' + name + '?', text: 'Tidak bisa dibatalkan.', icon: 'warning', showCancelButton: true, confirmButtonText: 'Hapus', cancelButtonText: 'Batal', confirmButtonColor: '#e3504f', cancelButtonColor: '#374151', ...SB })
    .then(async r => {
      if (!r.isConfirmed) return;
      try {
        const res = await fetch(`https://api.vercel.com/v9/projects/${id || name}`, { method: 'DELETE', headers: { Authorization: 'Bearer ' + token } });
        if (res.ok || res.status === 204) { Swal.fire({ icon: 'success', title: 'Project dihapus!', timer: 1300, showConfirmButton: false, ...SB }); loadWebs(); }
        else { const e = await res.json().catch(() => ({})); throw new Error(e.error?.message || 'Gagal hapus.'); }
      } catch (e) { al('error', e.message); }
    });
}

/* ── DEPLOY VERCEL ── */
async function deployVCL() {
  const token = gTok('vcl');
  const proj  = document.getElementById('vcl-proj').value.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '');
  const team  = document.getElementById('vcl-team')?.value.trim() || '';
  const file  = files.vcl;
  clearLog('vcl');
  if (!token) { scrollToTokens(); al('error', 'Token Vercel belum diset.'); return; }
  if (!proj)  { al('warning', 'Nama project wajib diisi.'); return; }
  if (!file)  { al('warning', 'Pilih file ZIP atau HTML dulu.'); return; }

  const VCL  = 'https://api.vercel.com';
  const H    = { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' };
  const teamQ = team ? '?teamId=' + team : '';

  log('vcl', 'inf', 'Memulai deploy ke Vercel...');
  addHist(proj, 'running');

  try {
    let filesToDeploy = [];

    if (file.name.endsWith('.html')) {
      const buf = await file.arrayBuffer();
      filesToDeploy = [{ filePath: 'index.html', content: new Uint8Array(buf) }];
    } else {
      log('vcl', 'inf', 'Mengekstrak ZIP...');
      const zip = await JSZip.loadAsync(file);
      const entries = Object.keys(zip.files).filter(k => !zip.files[k].dir);
      const topDirs = [...new Set(entries.map(e => e.split('/')[0]))];
      let prefix = '';
      if (topDirs.length === 1 && entries.every(e => e.startsWith(topDirs[0] + '/'))) prefix = topDirs[0] + '/';
      if (!entries.some(e => (prefix ? e.slice(prefix.length) : e) === 'index.html')) throw new Error('index.html tidak ditemukan di dalam ZIP.');
      for (const k of entries) {
        const buf = await zip.files[k].async('arraybuffer');
        filesToDeploy.push({ filePath: prefix ? k.slice(prefix.length) : k, content: new Uint8Array(buf) });
      }
      log('vcl', 'inf', filesToDeploy.length + ' file ditemukan.');
    }

    log('vcl', 'inf', 'Mengupload file...');
    const filesMeta = [];
    for (const f of filesToDeploy) {
      const digest = await sha1hex(f.content.buffer);
      await fetch(VCL + '/v2/files', { method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/octet-stream', 'x-vercel-digest': digest }, body: f.content });
      filesMeta.push({ file: f.filePath, sha: digest, size: f.content.length });
      log('vcl', 'ok', '↑ ' + f.filePath);
    }

    await fetch(VCL + '/v9/projects' + teamQ, { method: 'POST', headers: H, body: JSON.stringify({ name: proj }) }).catch(() => {});

    log('vcl', 'inf', 'Membuat deployment...');
    const depRes = await fetch(VCL + '/v13/deployments' + teamQ, { method: 'POST', headers: H, body: JSON.stringify({ name: proj, project: proj, files: filesMeta, projectSettings: { framework: null } }) });
    if (!depRes.ok) { const e = await depRes.json(); throw new Error(e.error?.message || e.message || 'Deploy gagal'); }
    const dep = await depRes.json();
    log('vcl', 'inf', 'ID: ' + dep.id + ' — Menunggu ready...');

    let ready = null;
    for (let i = 0; i < 15; i++) {
      await new Promise(r => setTimeout(r, 4000));
      const poll = await fetch(VCL + '/v13/deployments/' + dep.id, { headers: H });
      const d = await poll.json();
      if (d.readyState === 'READY') { ready = d; break; }
      if (d.readyState === 'ERROR' || d.readyState === 'CANCELED') throw new Error('State: ' + d.readyState);
      log('vcl', 'inf', d.readyState + '...');
    }
    if (!ready) throw new Error('Timeout.');

    const url = 'https://' + (ready.url || proj + '.vercel.app');
    log('vcl', 'ok', 'Selesai! ' + url);
    addHist(proj, 'success', url);
    Swal.fire({ icon: 'success', title: 'Deploy berhasil!', html: `Project: <code>${proj}</code><br><a href="${url}" target="_blank" style="color:#4875f0">${url}</a>`, confirmButtonColor: '#4875f0', ...SB });
  } catch (e) {
    log('vcl', 'err', e.message);
    addHist(proj, 'failed');
    al('error', e.message);
  }
}

function scrollToTokens() {
  const el = document.getElementById('tok-section');
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ── INIT ── */
document.addEventListener('DOMContentLoaded', () => {
  initDropzone('vcl');
  refreshTokenUI();
  renderHistory();
});
