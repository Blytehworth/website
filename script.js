// ===================== AUDIO (synthesized typewriter click) =====================
let audioCtx = null;
let soundEnabled = true;

function getAudioCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioCtx;
}

function unlockAudio() {
  const ctx = getAudioCtx();
  if (ctx.state === 'suspended') ctx.resume();
}

['pointerdown', 'keydown', 'touchstart', 'wheel'].forEach(evt => {
  document.addEventListener(evt, unlockAudio, { once: true, passive: true });
});

function playKeySound() {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioCtx();
    if (ctx.state === 'suspended') return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const freq = 700 + Math.random() * 500;
    osc.type = 'square';
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.045, now + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.03);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.035);
  } catch (e) { /* audio not available */ }
}

const soundToggle = document.getElementById('soundToggle');
const soundIcon = document.getElementById('soundIcon');
soundToggle.addEventListener('click', () => {
  unlockAudio();
  soundEnabled = !soundEnabled;
  soundIcon.innerHTML = soundEnabled ? '&#128266;' : '&#128263;';
  soundToggle.style.opacity = soundEnabled ? '1' : '0.5';
});

// ===================== HERO TYPING =====================
const heroLines = [
  { el: document.getElementById('line1'), text: 'Welcome to Blytheworth', speed: 55 },
  { el: document.getElementById('line2'), text: 'We help companies to assess, analyze, and scale their business.', speed: 22 },
  { el: document.getElementById('line3'), text: 'What is your biggest challenge right now?', speed: 40 }
];

const scrollCue = document.getElementById('scrollCue');

let heroAutoScrollCancelled = false;
function cancelHeroAutoScroll() { heroAutoScrollCancelled = true; }
document.addEventListener('wheel', cancelHeroAutoScroll, { once: true, passive: true });
document.addEventListener('touchstart', cancelHeroAutoScroll, { once: true, passive: true });
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', cancelHeroAutoScroll, { once: true });
});

function typeLine(lineIndex, callback) {
  const line = heroLines[lineIndex];
  const target = line.el.querySelector('.typed-text');
  line.el.classList.add('active');
  let i = 0;

  function step() {
    if (i < line.text.length) {
      target.textContent += line.text[i];
      if (line.text[i] !== ' ') playKeySound();
      i++;
      setTimeout(step, line.speed + Math.random() * 40);
    } else {
      line.el.classList.remove('active');
      setTimeout(callback, 400);
    }
  }
  step();
}

function runHeroSequence(index) {
  if (index >= heroLines.length) {
    scrollCue.classList.add('visible');
    setTimeout(() => {
      if (!heroAutoScrollCancelled && window.scrollY < 100) {
        document.getElementById('diagnostic').scrollIntoView({ behavior: 'smooth' });
      }
    }, 1400);
    return;
  }
  typeLine(index, () => runHeroSequence(index + 1));
}

window.addEventListener('load', () => {
  setTimeout(() => runHeroSequence(0), 500);
});

scrollCue.addEventListener('click', () => {
  document.getElementById('diagnostic').scrollIntoView({ behavior: 'smooth' });
});

// ===================== DIAGNOSTIC BOX NAVIGATION =====================
document.querySelectorAll('.diag-box').forEach(box => {
  box.addEventListener('click', () => {
    const target = document.querySelector(box.dataset.target);
    if (target) target.scrollIntoView({ behavior: 'smooth' });
  });
});

// ===================== REVEAL DIAGNOSTIC ON SCROLL =====================
const diagnosticSection = document.getElementById('diagnostic');
const diagObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      diagnosticSection.classList.add('revealed');
      diagObserver.disconnect();
    }
  });
}, { threshold: 0.25 });
diagObserver.observe(diagnosticSection);

// ===================== LEAD FORM =====================
const AIRTABLE_BASE_ID = 'appFveTTQXKfQkP7R';
const AIRTABLE_TABLE_ID = 'tblXlPYCLGyCxyLkQ';
const AIRTABLE_TOKEN = 'patJPVVNaZR0Hc5nI.b6fe6a2feb0eaaeb09ee359b62db3bf4da5ba30d60952e190016f34e3701717e';

const leadForm = document.getElementById('leadForm');
const leadSuccess = document.getElementById('leadSuccess');
const formError = document.getElementById('formError');
const leadSubmitBtn = document.getElementById('leadSubmitBtn');
const otherInput = document.getElementById('lf-other');
const bottleneckRadios = document.querySelectorAll('input[name="bottleneck"]');

bottleneckRadios.forEach(radio => {
  radio.addEventListener('change', () => {
    const isOther = radio.value === 'Other' && radio.checked;
    if (isOther) {
      otherInput.classList.remove('hidden');
      otherInput.required = true;
    } else if (document.querySelector('input[name="bottleneck"]:checked')?.value !== 'Other') {
      otherInput.classList.add('hidden');
      otherInput.required = false;
      otherInput.value = '';
    }
  });
});

leadForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  formError.textContent = '';

  if (!leadForm.checkValidity()) {
    leadForm.reportValidity();
    return;
  }

  const name = document.getElementById('lf-name').value.trim();
  const email = document.getElementById('lf-email').value.trim();
  const company = document.getElementById('lf-company').value.trim();
  const bottleneck = document.querySelector('input[name="bottleneck"]:checked')?.value;
  const bottleneckDetail = otherInput.value.trim();

  leadSubmitBtn.disabled = true;
  leadSubmitBtn.textContent = 'Submitting...';

  try {
    const res = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_ID}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fields: {
          'Name': name,
          'Email': email,
          'Company': company,
          'Bottleneck': bottleneck,
          'Bottleneck Detail': bottleneckDetail,
          'Status': 'New'
        }
      })
    });

    if (!res.ok) throw new Error(`Airtable responded ${res.status}`);

    leadForm.hidden = true;
    leadSuccess.hidden = false;
  } catch (err) {
    formError.textContent = "Something went wrong submitting the form. Please try again, or email us directly.";
    leadSubmitBtn.disabled = false;
    leadSubmitBtn.textContent = 'Submit';
  }
});

// ===================== MATRIX RAIN + CLOSING TYPE =====================
const canvas = document.getElementById('matrixCanvas');
const ctx2d = canvas.getContext('2d');
let matrixStarted = false;
let dpr = window.devicePixelRatio || 1;

const glyphs = 'アイウエオカキクケコサシスセソ01234567890BLYTHEWORTH';
let columns, drops;

function sizeCanvas() {
  const rect = canvas.parentElement.getBoundingClientRect();
  dpr = window.devicePixelRatio || 1;
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  canvas.style.width = rect.width + 'px';
  canvas.style.height = rect.height + 'px';
  ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0);
  columns = Math.floor(rect.width / 18);
  drops = new Array(columns).fill(0).map(() => Math.random() * -50);
}
sizeCanvas();
window.addEventListener('resize', sizeCanvas);

let matrixRunning = false;
let matrixRafId = null;

function drawMatrix() {
  const rect = canvas.parentElement.getBoundingClientRect();
  ctx2d.fillStyle = 'rgba(0,0,0,0.08)';
  ctx2d.fillRect(0, 0, rect.width, rect.height);
  ctx2d.font = '16px "JetBrains Mono", monospace';

  for (let i = 0; i < columns; i++) {
    const text = glyphs[Math.floor(Math.random() * glyphs.length)];
    const x = i * 18;
    const y = drops[i] * 18;
    ctx2d.fillStyle = Math.random() > 0.97 ? '#d8ffe9' : 'rgba(0,230,138,0.75)';
    ctx2d.fillText(text, x, y);

    if (y > rect.height && Math.random() > 0.975) drops[i] = 0;
    drops[i]++;
  }
  matrixRafId = requestAnimationFrame(drawMatrix);
}

const matrixVisibilityObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting && !matrixRunning) {
      matrixRunning = true;
      matrixRafId = requestAnimationFrame(drawMatrix);
    } else if (!entry.isIntersecting && matrixRunning) {
      matrixRunning = false;
      if (matrixRafId) cancelAnimationFrame(matrixRafId);
    }
  });
}, { threshold: 0.01 });
matrixVisibilityObserver.observe(document.getElementById('closing'));

const closingLines = [
  { el: document.getElementById('matrixLine1'), text: 'You can stay here.', speed: 70 },
  { el: document.getElementById('matrixLine2'), text: 'You can let us help you scale.', speed: 55 }
];
const matrixCta = document.getElementById('matrixCta');

function typeClosingLine(index, done) {
  if (index >= closingLines.length) { done(); return; }
  const line = closingLines[index];
  const target = line.el.querySelector('.matrix-text');
  let i = 0;
  function step() {
    if (i < line.text.length) {
      target.textContent += line.text[i];
      if (line.text[i] !== ' ') playKeySound();
      i++;
      setTimeout(step, line.speed + Math.random() * 30);
    } else {
      setTimeout(() => typeClosingLine(index + 1, done), 500);
    }
  }
  step();
}

const closingObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting && !matrixStarted) {
      matrixStarted = true;
      setTimeout(() => {
        typeClosingLine(0, () => matrixCta.classList.add('visible'));
      }, 600);
      closingObserver.disconnect();
    }
  });
}, { threshold: 0.4 });
closingObserver.observe(document.getElementById('closing'));
