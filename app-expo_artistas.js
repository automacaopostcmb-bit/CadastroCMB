/* =========================================================
   CONFIG – ARTISTAS (IDs, URLs e moldes)
   ========================================================= */
const FRAME_URL = 'https://cdn.jsdelivr.net/gh/automacaopostcmb-bit/CadastroCMB@main/assets/areaartista.png';

/* URL do Web App (mesmo arquivo Apps Script abaixo, que tem doGet + doPost).
   Depois de "Deploy > Web app", copie a URL ".../exec" e cole aqui: */
const WEBAPP_URL = 'PASTE_YOUR_DEPLOYED_WEBAPP_EXEC_URL_HERE'; // <<< SUBSTITUIR APÓS DEPLOY

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;

const REVIEW_FIELDS = [
  { id: 'nomeArtista',   label: 'Nome do artista' },
  { id: 'emailArtista',  label: 'E-mail do artista' },
  { id: 'nomeAjudante',  label: 'Nome do ajudante' },
  { id: 'emailAjudante', label: 'E-mail do ajudante' }
];

/* ===========================
   HELPERS
   =========================== */
function showFieldError(inputId, msg) {
  const box = document.getElementById(inputId + 'Error');
  const input = document.getElementById(inputId);
  if (box) { box.textContent = msg || ''; box.style.display = msg ? 'block' : 'none'; }
  if (input) input.classList.toggle('invalid', !!msg);
}
function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}
function loadImage(src) {
  const bust = (/\?/.test(src) ? '&' : '?') + 'v=' + Date.now();
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src + bust;
  });
}

/* ===========================
   VARS DO CANVAS / PREVIEW
   =========================== */
let canvas, ctx, frameImg, fotoImg;

/* ===========================
   CANVAS
   =========================== */
function initCanvas() {
  canvas = document.getElementById('canvas');
  if (!canvas) return;
  ctx = canvas.getContext('2d');

  // frame
  frameImg = new Image();
  frameImg.crossOrigin = 'anonymous';
  frameImg.referrerPolicy = 'no-referrer';
  frameImg.onload = gerarPost;
  frameImg.onerror = () => console.error('Falha ao carregar frame:', FRAME_URL);
  frameImg.src = FRAME_URL + '?v=' + Date.now();

  // upload da foto/arte de divulgação (passo 5)
  const fotoInput = document.getElementById('fotoDivulgacao');
  fotoInput?.addEventListener('change', (e) => {
    const r = new FileReader();
    r.onload = (ev) => { fotoImg = new Image(); fotoImg.onload = gerarPost; fotoImg.src = ev.target.result; };
    if (e.target.files && e.target.files[0]) r.readAsDataURL(e.target.files[0]);
  });

  // sliders + nome
  ['imgScale', 'imgX', 'imgY', 'nomeArtista'].forEach((id) => {
    document.getElementById(id)?.addEventListener('input', gerarPost);
  });

  document.fonts?.ready?.then(gerarPost);
}

/* ---- desenho ---- */
function gerarPost() {
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // foto base (ajustável)
  if (fotoImg) {
    const scale = parseFloat(document.getElementById('imgScale').value || '1');
    const anchorPointX = canvas.width / 2;
    const anchorPointY = canvas.height * 0.52;
    const offsetX = parseInt(document.getElementById('imgX').value || '0', 10);
    const offsetY = parseInt(document.getElementById('imgY').value || '0', 10);
    const w = fotoImg.width * scale, h = fotoImg.height * scale;
    const drawX = anchorPointX + offsetX - w / 2;
    const drawY = anchorPointY + offsetY - h / 2;
    ctx.drawImage(fotoImg, drawX, drawY, w, h);
  }

  // frame
  if (frameImg?.complete && frameImg.naturalWidth) {
    ctx.drawImage(frameImg, 0, 0, canvas.width, canvas.height);
  }

  // Nome do artista (topo)
  const nome = (document.getElementById('nomeArtista')?.value || '').trim();
  if (nome) {
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 8;
    ctx.font = 'bold 80px "Comic Relief"';
    drawTextWithStrokeWrap(ctx, nome, canvas.width / 2, 180, 920, 2, 76);
  }

  const aviso = document.getElementById('avisoTexto');
  if (aviso) { aviso.textContent = ''; aviso.style.display = 'none'; }
}

function drawTextWithStrokeWrap(context, text, centerX, baseY, maxWidth, maxLines, lineHeight) {
  const lines = wrapText(context, text, maxWidth);
  const used = lines.slice(0, maxLines);
  used.forEach((linha, i) => {
    const y = baseY + i * lineHeight;
    context.strokeText(linha, centerX, y);
    context.fillText(linha, centerX, y);
  });
}

function wrapText(context, text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const w of words) {
    const test = (line ? line + ' ' : '') + w;
    if (context.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function baixarImagem() {
  const link = document.createElement('a');
  link.download = 'post_artista.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
}

/* ===========================
   LEGENDA (Instagram)
   =========================== */
function buildCaptionFromForm() {
  const nome = (document.getElementById('nomeArtista')?.value || '').trim();
  const bio  = (document.getElementById('biografia')?.value || '').trim();

  const head = `Estarei na área dos artistas do CMB 2026 @comicmarketbrasil!`;
  const place = `📍 FAPCOM – Vila Mariana, São Paulo`;
  const date  = `Dia 16 e 17 de agosto`;
  const tickets = `🎟️ Mais informações e ingressos:\ncomicmarketbrasil.com.br`;
  const tags = `#ComicMarketBrasil #QuadrinhosNacionais #QuadrinhosBrasileiros #hqbr #mangabr #historiaemquadrinhos #desenhistabrasileiro #ilustradorbrasileiro #fapcom`;

  // Coloco o nome antes da bio para personalizar
  const corpo = bio ? `${nome ? nome + ' — ' : ''}${bio}` : (nome || '');
  return [head, '', corpo, '', place, date, '', tickets, '', tags].join('\n');
}

/* ===========================
   ENVIO / AUTH (Apps Script único)
   =========================== */
async function enviarParaGoogle() {
  const obrig = ['comprovante','nomeArtista','emailArtista','biografia','fotoDivulgacao'];

  let faltando = [];
  obrig.forEach((id) => {
    const el = document.getElementById(id);
    const v = (el && el.type === 'file') ? (el.files && el.files.length ? 'ok' : '') : (el?.value || '').trim();
    if (!v) faltando.push(id);
  });

  const emailArtista = (document.getElementById('emailArtista')?.value || '').trim();
  const emailAjudante = (document.getElementById('emailAjudante')?.value || '').trim();

  const okEmailArtista = EMAIL_REGEX.test(emailArtista);
  showFieldError('emailArtista', okEmailArtista ? '' : 'Informe um e-mail válido.');

  let okEmailAjudante = true;
  if (emailAjudante) {
    okEmailAjudante = EMAIL_REGEX.test(emailAjudante);
    showFieldError('emailAjudante', okEmailAjudante ? '' : 'E-mail inválido.');
  }

  if (faltando.length || !okEmailArtista || !okEmailAjudante) {
    const msg = document.getElementById('mensagem');
    msg.textContent = '❌ Preencha os campos obrigatórios e corrija os erros.';
    msg.style.color = 'red';
    msg.style.display = 'block';
    return;
  }

  const toBase64 = (file) => new Promise((res, rej) => {
    const r = new FileReader(); r.readAsDataURL(file);
    r.onload = () => res(r.result);
    r.onerror = rej;
  });
  async function processarImagem(id) {
    const f = document.getElementById(id).files[0];
    if (!f) return null;
    const b64 = await toBase64(f);
    return { name: f.name, type: f.type, content: b64.split(',')[1] };
  }

  const comprovanteB64 = await processarImagem('comprovante');
  const fotoDivulgB64  = await processarImagem('fotoDivulgacao');

  let previewBase64 = null;
  if (canvas) {
    const dataURL = canvas.toDataURL('image/png');
    previewBase64 = { name: 'preview.png', type: 'image/png', content: dataURL.split(',')[1] };
  }

  const legenda = buildCaptionFromForm();
  const dados = {
    nomeArtista:   document.getElementById('nomeArtista').value.trim(),
    emailArtista:  emailArtista,
    nomeAjudante:  (document.getElementById('nomeAjudante').value || '').trim(),
    emailAjudante: emailAjudante,
    biografia:     (document.getElementById('biografia').value || '').trim(),
    legenda,
    comprovante:   comprovanteB64,
    fotoDivulgacao: fotoDivulgB64,
    preview:       previewBase64
  };

  const overlay = document.getElementById('overlay');
  overlay.style.display = 'flex';

  try {
    const response = await fetch(WEBAPP_URL, { method: 'POST', body: JSON.stringify(dados) });
    const result = await response.json();
    const msg = document.getElementById('mensagem');
    msg.style.display = 'block';

    if (result.status === 'success') {
      msg.textContent = '✅ Enviado com sucesso!';
      msg.style.color = 'green';
      document.getElementById('step7').style.display = 'none';
      document.getElementById('wizard-indicator').style.display = 'none';
      document.getElementById('link-topo').style.display = 'none';
      document.getElementById('final-screen').style.display = 'block';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      msg.textContent = '❌ Erro ao enviar: ' + (result.message || 'Tente novamente.');
      msg.style.color = 'red';
    }
  } catch (err) {
    const msg = document.getElementById('mensagem');
    msg.textContent = '❌ Erro de rede. Tente novamente.';
    msg.style.color = 'red';
    msg.style.display = 'block';
    console.error(err);
  } finally {
    overlay.style.display = 'none';
    setTimeout(() => {
      const msg = document.getElementById('mensagem');
      if (msg) msg.textContent = '';
    }, 5000);
  }
}

/* ===========================
   AUTENTICAÇÃO
   =========================== */
const PAGINA = 'expo_artistas';
async function checkAuth() {
  const chave = (localStorage.getItem('chave') || '').trim();
  if (!chave) { alert('Faça login primeiro.'); window.location.href = 'index.html'; return; }
  const url = `${WEBAPP_URL}?chave=${encodeURIComponent(chave)}&pagina=${encodeURIComponent(PAGINA)}&v=${Date.now()}`;
  const resp = await fetch(url);
  const data = await resp.json();
  if (!data.permitido) { alert('Você não tem permissão para acessar esta página.'); window.location.href = 'index.html'; }
}

/* ===========================
   WIZARD / VALIDAÇÕES
   =========================== */
const REQUIRED_BY_STEP = {
  1: [],
  2: ['comprovante'],
  3: ['nomeArtista','emailArtista'],
  4: ['biografia'],
  5: ['fotoDivulgacao'],
  6: [],
  7: []
};

const STEP_VALIDATORS = {
  3: () => {
    const emailArtista = (document.getElementById('emailArtista').value || '').trim();
    const okEmailArtista = EMAIL_REGEX.test(emailArtista);
    showFieldError('emailArtista', okEmailArtista ? '' : 'Informe um e-mail válido.');

    const emailAjudante = (document.getElementById('emailAjudante').value || '').trim();
    let okEmailAjudante = true;
    if (emailAjudante) {
      okEmailAjudante = EMAIL_REGEX.test(emailAjudante);
      showFieldError('emailAjudante', okEmailAjudante ? '' : 'E-mail inválido.');
    }
    return okEmailArtista && okEmailAjudante;
  },
  7: () => { buildReview(); return true; }
};

function isFilled(id) {
  const el = document.getElementById(id);
  if (!el) return true;
  if (el.type === 'file') return el.files && el.files.length > 0;
  return (el.value || '').trim().length > 0;
}
function markValidity(ids = []) {
  ids.forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.remove('invalid');
    if (!isFilled(id)) el.classList.add('invalid');
  });
}
function validateStep(stepNumber) {
  const required = REQUIRED_BY_STEP[stepNumber] || [];
  markValidity(required);

  let ok = required.every(isFilled);
  if (!ok) return false;

  const stepFn = STEP_VALIDATORS[stepNumber];
  if (stepFn && stepFn() === false) return false;

  return true;
}
function revalidateStepNav() {
  const activeStep = steps[currentStep - 1];
  const isValid = validateStep(currentStep);
  const nextBtn = activeStep?.querySelector('[data-next]');
  if (nextBtn) nextBtn.disabled = !isValid;
}

let steps = [], totalSteps = 0, currentStep = 1;
function updateIndicator() {
  const ind = document.getElementById('wizard-indicator');
  if (ind) ind.textContent = `Etapa ${currentStep} de ${totalSteps}`;
}
function showStep(n) {
  currentStep = Math.max(1, Math.min(totalSteps, n));
  steps.forEach((el, idx) => el.classList.toggle('active', idx === currentStep - 1));
  if (currentStep === 6) { try { gerarPost(); } catch(e) {} }
  if (currentStep === 7) { try { buildReview(); } catch(e) { console.error('buildReview error', e); } }
  updateIndicator();
  revalidateStepNav();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
function buildReview() {
  const box = document.getElementById('review-list');
  if (!box) return;
  const parts = REVIEW_FIELDS.map(({ id, label }) => {
    const el = document.getElementById(id);
    let val = '';
    if (el) val = (el.value || '').trim();
    if (!val) val = '—';
    return `
      <div class="review-item">
        <span class="review-label">${label}:</span>
        <div class="review-value">${escapeHtml(val)}</div>
      </div>
    `;
  });
  box.innerHTML = parts.join('');
}

/* ===========================
   MENU
   =========================== */
function goToMenu() {
  const base = location.href.replace(/[^/]+$/, '');
  window.location.href = base + 'index.html?back=1';
}

/* ===========================
   BOOTSTRAP
   =========================== */
document.addEventListener('DOMContentLoaded', () => {
  const isWizardPage = !!document.querySelector('.step') && !!document.getElementById('wizard-indicator');
  if (!isWizardPage) return;

  initCanvas();
  checkAuth();

  steps = Array.from(document.querySelectorAll('.step'));
  totalSteps = steps.length;

  document.addEventListener('input', (e) => {
    const activeStep = steps[currentStep - 1];
    if (!activeStep?.contains(e.target)) return;
    revalidateStepNav();
  });
  document.addEventListener('change', (e) => {
    const activeStep = steps[currentStep - 1];
    if (!activeStep?.contains(e.target)) return;
    revalidateStepNav();
  });
  document.addEventListener('click', (e) => {
    if (e.target.matches('[data-next]')) { if (validateStep(currentStep)) showStep(currentStep + 1); }
    if (e.target.matches('[data-prev]')) showStep(currentStep - 1);
  });

  showStep(1);
});

/* Expor funções globais */
window.enviarParaGoogle = enviarParaGoogle;
window.baixarImagem = baixarImagem;
window.goToMenu = goToMenu;
