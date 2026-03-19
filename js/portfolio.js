const SKILLS = [
  { id:'js',         label:'JavaScript', pct:89, cls:'c0' },
  { id:'java',       label:'Java',        pct:72, cls:'c1' },
  { id:'html',       label:'HTML',        pct:95, cls:'c2' },
  { id:'css',        label:'CSS',         pct:50, cls:'c3' },
  { id:'python',     label:'Python',      pct:5,  cls:'c4' },
  { id:'sketchware', label:'Sketchware',  pct:82, cls:'c5' }
];

let skillsDone = false;

function buildSkills() {
  const wrap = document.getElementById('skills-wrap');
  if (!wrap) return;
  wrap.innerHTML = SKILLS.map(s => `
    <div class="sk">
      <div class="sk-hdr">
        <span class="sk-name">${s.label}</span>
        <span class="sk-pct" id="pct-${s.id}">0%</span>
      </div>
      <div class="sk-track">
        <div class="sk-bar ${s.cls}" id="bar-${s.id}"></div>
      </div>
    </div>`).join('');
}

function animSkills() {
  if (skillsDone) return;
  skillsDone = true;
  SKILLS.forEach((s, i) => {
    setTimeout(() => {
      document.getElementById('bar-' + s.id).style.width = s.pct + '%';
      let cur = 0;
      const step = Math.max(1, Math.ceil(s.pct / 55));
      const t = setInterval(() => {
        cur = Math.min(cur + step, s.pct);
        document.getElementById('pct-' + s.id).textContent = cur + '%';
        if (cur >= s.pct) clearInterval(t);
      }, 18);
    }, i * 100);
  });
}

function initBirthday() {
  const el = document.getElementById('bday-text');
  if (!el) return;
  function tick() {
    const now = new Date(), y = now.getFullYear();
    let bd = new Date(y, 10, 30);
    if (now >= bd) bd = new Date(y + 1, 10, 30);
    const d = Math.floor((bd - now) / 86400000);
    el.textContent = d === 0 ? '🎉 Hari ini ulang tahun!' : d + ' hari lagi ulang tahun!';
  }
  tick();
  setInterval(tick, 60000);
}

function initReveal() {
  const obs = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (!en.isIntersecting) return;
      en.target.classList.add('on');
      if (en.target.id === 'skill-card') animSkills();
      obs.unobserve(en.target);
    });
  }, { threshold: 0.08 });
  document.querySelectorAll('.reveal').forEach(el => obs.observe(el));
}

document.addEventListener('DOMContentLoaded', () => {
  buildSkills();
  initBirthday();
  initReveal();
});
