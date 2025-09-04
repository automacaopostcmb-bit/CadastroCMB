/* =========================================================
   CONFIG – ARTISTAS (IDs, URLs e moldes)
   ========================================================= */
const FRAME_URL = 'https://cdn.jsdelivr.net/gh/automacaopostcmb-bit/CadastroCMB@main/assets/areaartista.png';
const WEBAPP_URL = "https://script.google.com/macros/s/AKfycbyAIRNSN5yaoSIKzxgf5rnme1ryxveWHmePMC6qRDtrkso3pZtQ-7iMW4pi94LbW1uS/exec";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;

const REVIEW_FIELDS = [
  { id: 'nomeArtista',   label: 'Nome do artista' },
  { id: 'emailArtista',  label: 'E-mail do artista' },
  { id: 'nomeAjudante',  label: 'Nome do ajudante' },
  { id: 'emailAjudante', label: 'E-mail do ajudante' }
];

/* ===========================
   VARS DO CANVAS / PREVIEW
   =========================== */
let canvas, ctx, frameImg, fotoImg;
let fontsReady = false;

// Posição da plaquinha (coordenadas do canvas 1080x1350)
let plaquinhaX = 140;  // esquerda/direita
let plaquinhaY = 180;  // cima/baixo

/* ===========================
   CANVAS
   =========================== */
function initCanvas() {
  canvas = document.getElementById('canvas');
  if (!canvas) return;
  ctx = canvas.getContext('2d');

  frameImg = new Image();
  frameImg.crossOrigin = 'anonymous';
  frameImg.referrerPolicy = 'no-referrer';
  frameImg.onload = gerarPost;
  frameImg.onerror = () => console.error('Falha ao carregar frame:', FRAME_URL);
  frameImg.src = FRAME_URL + '?v=' + Date.now();

  const fotoInput = document.getElementById('fotoDivulgacao');
  fotoInput?.addEventListener('change', (e) => {
    const r = new FileReader();
    r.onload = (ev) => { fotoImg = new Image(); fotoImg.onload = gerarPost; fotoImg.src = ev.target.result; };
    if (e.target.files && e.target.files[0]) r.readAsDataURL(e.target.files[0]);
  });

  ['imgScale', 'imgX', 'imgY', 'nomeArtista'].forEach((id) => {
    document.getElementById(id)?.addEventListener('input', gerarPost);
  });

  document.fonts?.ready?.then(() => { fontsReady = true; gerarPost(); });
}

/* ===========================
   DESENHO
   =========================== */
function gerarPost() {
  if (!ctx) return;

  // fundo branco
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // foto base
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

  // plaquinha no canvas
  const nome = (document.getElementById('nomeArtista')?.value || '').trim();
  if (nome) drawPlaquinhaCanvas(ctx, nome, plaquinhaX, plaquinhaY);

  const aviso = document.getElementById('avisoTexto');
  if (aviso) { aviso.textContent = ''; aviso.style.display = 'none'; }
}

/* ===========================
   PLAQUINHA NO CANVAS
   =========================== */
// Mesmo visual do CSS: fundo amarelo, borda 6px, raio 6px, sombra -7, +7, 1 linha só
function drawPlaquinhaCanvas(c, text, x, y) {
  // constantes visuais
  const PADDING_X = 28;      // ~0.8em
  const PADDING_Y = 14;      // ~0.3em
  const BORDER = 6;
  const RADIUS = 6;
  const SHADOW_X = -7;
  const SHADOW_Y = 7;
  const MAX_WIDTH = 920;     // limite da área do texto (ajuste se quiser)

  // tamanho de fonte: tenta grande e ajusta pra caber em 1 linha
  let fontSize = 64;         // tamanho base
  c.font = `700 ${fontSize}px "Comic Relief", Arial, sans-serif`;
  if (!fontsReady) {
    // evita medir errado antes da fonte carregar
    c.font = `700 ${fontSize}px Arial, sans-serif`;
  }

  // reduz fonte até o texto caber no MAX_WIDTH
  let textW = c.measureText(text).width;
  while (textW > MAX_WIDTH && fontSize > 16) {
    fontSize -= 2;
    c.font = `700 ${fontSize}px "Comic Relief", Arial, sans-serif`;
    textW = c.measureText(text).width;
  }

  const rectW = Math.ceil(textW + PADDING_X * 2);
  const rectH = Math.ceil(fontSize * 1.1 + PADDING_Y * 2);

  // sombra (retângulo atrás, mesmo tamanho do "border-box")
  drawRoundedRect(c, x + SHADOW_X, y + SHADOW_Y, rectW + BORDER * 2, rectH + BORDER * 2, RADIUS);
  c.fillStyle = '#000';
  c.fill();

  // caixa amarela (conteúdo)
  drawRoundedRect(c, x, y, rectW, rectH, RADIUS);
  c.fillStyle = '#ffd400';
  c.fill();

  // borda preta
  c.lineWidth = BORDER;
  c.strokeStyle = '#000';
  c.stroke();

  // texto (alinhado à esquerda, 1 linha)
  c.fillStyle = '#111';
  c.textAlign = 'left';
  c.textBaseline = 'top';
  c.fillText(text, x + PADDING_X, y + PADDING_Y);
}

// utilitário: caminho de retângulo arredondado
function drawRoundedRect(c, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  c.beginPath();
  c.moveTo(x + rr, y);
  c.lineTo(x + w - rr, y);
  c.quadraticCurveTo(x + w, y, x + w, y + rr);
  c.lineTo(x + w, y + h - rr);
  c.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  c.lineTo(x + rr, y + h);
  c.quadraticCurveTo(x, y + h, x, y + h - rr);
  c.lineTo(x, y + rr);
  c.quadraticCurveTo(x, y, x + rr, y);
  c.closePath();
}

/* ===========================
   DOWNLOAD
   =========================== */
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

  const corpo = bio ? `${nome ? nome + ' — ' : ''}${bio}` : (nome || '');
  return [head, '', corpo, '', place, date, '', tickets, '', tags].join('\n');
}

/* ===========================
   ENVIO / AUTH (Apps Script)
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
