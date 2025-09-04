/* =========================================================
   CONFIG – ARTISTAS (IDs, URLs e moldes)
   ========================================================= */
const FRAME_URL = 'https://cdn.jsdelivr.net/gh/automacaopostcmb-bit/CadastroCMB@main/assets/areaartista.png';
const WEBAPP_URL = "https://script.google.com/macros/s/AKfycbyAIRNSN5yaoSIKzxgf5rnme1ryxveWHmePMC6qRDtrkso3pZtQ-7iMW4pi94LbW1uS/exec";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;

/* Campos que entram na revisão final */
const REVIEW_FIELDS = [
  { id: 'nomeCompleto',    label: 'Nome completo' },
  { id: 'nomeArtistico',   label: 'Nome artístico' },
  { id: 'emailArtista',    label: 'E-mail do artista' },
  { id: 'telefoneArtista', label: 'Telefone do artista' },
  { id: 'nomeAjudante',    label: 'Nome do ajudante' },
  { id: 'emailAjudante',   label: 'E-mail do ajudante' },
  { id: 'observacao',     label: 'Observação' },
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
// Saneia e-mails (remove invisíveis e espaços, normaliza)
function cleanEmailValue(raw) {
  let v = (raw || '');
  if (v.normalize) v = v.normalize('NFKC');
  v = v.replace(/[\u200B-\u200D\uFEFF\u202A-\u202E\u2066-\u2069]/g, '');
  v = v.replace(/\s+/g, '');
  return v;
}
// Telefone simples: mantém dígitos; válido se tiver >= 8 dígitos
function normalizePhone(raw) {
  return (raw || '').replace(/\D+/g, '');
}

/* ===========================
   VARS DO CANVAS / PREVIEW
   =========================== */
let canvas, ctx, frameImg, fotoImg;
let fontsReady = false;

// posição da plaquinha no canvas (1080x1350)
let plaquinhaX = 140;  // + direita
let plaquinhaY = 180;  // + baixo

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

  // sliders + nome artístico (muda a plaquinha)
  ['imgScale', 'imgX', 'imgY', 'nomeArtistico'].forEach((id) => {
    document.getElementById(id)?.addEventListener('input', gerarPost);
  });

  document.fonts?.ready?.then(() => { fontsReady = true; gerarPost(); });
}

/* ===========================
   DESENHO
   =========================== */
function gerarPost() {
  if (!ctx) return;

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

  // plaquinha com o Nome artístico
  const nome = (document.getElementById('nomeArtistico')?.value || '').trim();
  if (nome) drawPlaquinhaCanvas(ctx, nome, plaquinhaX, plaquinhaY);

  const aviso = document.getElementById('avisoTexto');
  if (aviso) { aviso.textContent = ''; aviso.style.display = 'none'; }
}

/* ===========================
   PLAQUINHA NO CANVAS
   =========================== */
function drawPlaquinhaCanvas(c, text, x, y) {
  const PADDING_X = 28;
  const PADDING_Y = 14;
  const BORDER = 6;
  const RADIUS = 6;
  const SHADOW_X = -7;
  const SHADOW_Y = 7;
  const MAX_WIDTH = 940; // limite para não estourar

  let fontSize = 64;
  c.font = `700 ${fontSize}px "Comic Relief", Arial, sans-serif`;
  if (!fontsReady) c.font = `700 ${fontSize}px Arial, sans-serif`;

  let textW = c.measureText(text).width;
  while (textW > MAX_WIDTH && fontSize > 16) {
    fontSize -= 2;
    c.font = `700 ${fontSize}px "Comic Relief", Arial, sans-serif`;
    textW = c.measureText(text).width;
  }

  const rectW = Math.ceil(textW + PADDING_X * 2);
  const rectH = Math.ceil(fontSize * 1.1 + PADDING_Y * 2);

  // sombra
  drawRoundedRect(c, x + SHADOW_X, y + SHADOW_Y, rectW + BORDER * 2, rectH + BORDER * 2, RADIUS);
  c.fillStyle = '#000'; c.fill();

  // caixa amarela
  drawRoundedRect(c, x, y, rectW, rectH, RADIUS);
  c.fillStyle = '#ffd400'; c.fill();

  // borda
  c.lineWidth = BORDER; c.strokeStyle = '#000'; c.stroke();

  // texto
  c.fillStyle = '#111';
  c.textAlign = 'left';
  c.textBaseline = 'top';
  c.fillText(text, x + PADDING_X, y + PADDING_Y);
}
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
   DOWNLOAD + CAPTION VISÍVEL
   =========================== */
function baixarImagem() {
  const link = document.createElement('a');
  link.download = 'post_artista.png';
  link.href = canvas.toDataURL('image/png');
  link.click();

  // mostrar a caixa de descrição com o texto pronto
  const wrap = document.getElementById('captionWrap');
  const box  = document.getElementById('captionBox');
  if (wrap && box) {
    box.value = buildCaptionFromForm();
    wrap.style.display = 'block';
  }
}

/* ===========================
   LEGENDA (Instagram)
   =========================== */
function buildCaptionFromForm() {
  const nomeArtistico = (document.getElementById('nomeArtistico')?.value || '').trim();
  const bio  = (document.getElementById('biografia')?.value || '').trim();

  const head = `Estarei na área dos artistas do CMB 2026 @comicmarketbrasil!`;
  const place = `📍 FAPCOM – Vila Mariana, São Paulo`;
  const date  = `Dia 16 e 17 de agosto`;
  const tickets = `🎟️ Mais informações e ingressos:\ncomicmarketbrasil.com.br`;
  const tags = `#ComicMarketBrasil #QuadrinhosNacionais #QuadrinhosBrasileiros #hqbr #mangabr #historiaemquadrinhos #desenhistabrasileiro #ilustradorbrasileiro #fapcom`;

  const corpo = bio ? `${nomeArtistico ? nomeArtistico + ' — ' : ''}${bio}` : (nomeArtistico || '');
  return [head, '', corpo, '', place, date, '', tickets, '', tags].join('\n');
}

/* ===========================
   ENVIO / AUTH (Apps Script)
   =========================== */
async function enviarParaGoogle() {
  const obrig = ['comprovante','nomeCompleto','nomeArtistico','emailArtista','telefoneArtista','biografia','fotoDivulgacao'];

  let faltando = [];
  obrig.forEach((id) => {
    const el = document.getElementById(id);
    const v = (el && el.type === 'file') ? (el.files && el.files.length ? 'ok' : '') : (el?.value || '').trim();
    if (!v) faltando.push(id);
  });

  const emailArtista  = cleanEmailValue(document.getElementById('emailArtista')?.value);
  const emailAjudante = cleanEmailValue(document.getElementById('emailAjudante')?.value);
  const telRaw = document.getElementById('telefoneArtista')?.value || '';
  const telNorm = normalizePhone(telRaw);

  const okEmailArtista = EMAIL_REGEX.test(emailArtista);
  showFieldError('emailArtista', okEmailArtista ? '' : 'Informe um e-mail válido.');

  let okEmailAjudante = true;
  if (emailAjudante) {
    okEmailAjudante = EMAIL_REGEX.test(emailAjudante);
    showFieldError('emailAjudante', okEmailAjudante ? '' : 'E-mail inválido.');
  }

  const okTelefone = telNorm.length >= 8;
  showFieldError('telefoneArtista', okTelefone ? '' : 'Telefone inválido.');

  if (faltando.length || !okEmailArtista || !okEmailAjudante || !okTelefone) {
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

// ⬇️ NOVO: pega o texto da observação (ou vazio)
const obs = (document.getElementById('observacao')?.value || '').trim();

const dados = {
  nomeCompleto:   (document.getElementById('nomeCompleto')?.value || '').trim(),
  nomeArtistico:  (document.getElementById('nomeArtistico')?.value || '').trim(),
  emailArtista,
  telefoneArtista: telNorm,
  nomeAjudante:    (document.getElementById('nomeAjudante')?.value || '').trim(),
  emailAjudante,
  biografia:       (document.getElementById('biografia')?.value || '').trim(),
  legenda,
  comprovante:     comprovanteB64,
  fotoDivulgacao:  fotoDivulgB64,
  preview:         previewBase64
};

// ⬇️ NOVO: só envia “observacao” se o usuário escreveu algo
if (obs) {
  dados.observacao = obs;
}


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
      document.getElementById('step8').style.display = 'none';
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
  3: ['nomeCompleto','nomeArtistico','emailArtista','telefoneArtista'],
  4: [], // ajudante opcional
  5: ['biografia'],
  6: ['fotoDivulgacao'],
  7: [],
  8: []
};

const STEP_VALIDATORS = {
  3: () => {
    const nomeCompleto  = (document.getElementById('nomeCompleto')?.value || '').trim();
    const nomeArtistico = (document.getElementById('nomeArtistico')?.value || '').trim();
    const emailArtista  = cleanEmailValue(document.getElementById('emailArtista')?.value);
    const telNorm       = normalizePhone(document.getElementById('telefoneArtista')?.value || '');

    showFieldError('emailArtista', '');
    showFieldError('telefoneArtista', '');

    if (!nomeCompleto || !nomeArtistico) return false;
    if (!EMAIL_REGEX.test(emailArtista)) { showFieldError('emailArtista','Informe um e-mail válido.'); return false; }
    if (telNorm.length < 8) { showFieldError('telefoneArtista','Telefone inválido.'); return false; }
    return true;
  },
  4: () => {
    const emailAjudante = cleanEmailValue(document.getElementById('emailAjudante')?.value);
    showFieldError('emailAjudante','');
    if (emailAjudante && !EMAIL_REGEX.test(emailAjudante)) {
      showFieldError('emailAjudante','E-mail inválido.');
      return false;
    }
    return true;
  },
  8: () => { buildReview(); return true; }
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

// >>> etapa do ajudante para o alerta
const AJUDANTE_STEP = 4;

function updateIndicator() {
  const ind = document.getElementById('wizard-indicator');
  if (ind) ind.textContent = `Etapa ${currentStep} de ${totalSteps}`;
}
function showStep(n) {
  currentStep = Math.max(1, Math.min(totalSteps, n));
  steps.forEach((el, idx) => el.classList.toggle('active', idx === currentStep - 1));
  if (currentStep === 7) { try { gerarPost(); } catch(e) {} }
  if (currentStep === 8) { try { buildReview(); } catch(e) { console.error('buildReview error', e); } }
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

  // revalida ao digitar/colar/blur/autofill nas etapas 3 e 4
  ['nomeCompleto','nomeArtistico','emailArtista','telefoneArtista','nomeAjudante','emailAjudante'].forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    ['input','change','blur','keyup'].forEach(evt =>
      el.addEventListener(evt, () => { revalidateStepNav(); })
    );
  });

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
    if (e.target.matches('[data-next]')) {
      if (!validateStep(currentStep)) return;

      // ⚠️ Aviso ao sair da etapa do ajudante se houver dados preenchidos
      if (currentStep === AJUDANTE_STEP) {
        const nomeAj  = (document.getElementById('nomeAjudante')?.value || '').trim();
        const emailAj = cleanEmailValue(document.getElementById('emailAjudante')?.value || '');
        if (nomeAj || emailAj) {
          const ok = confirm(
            '⚠️ Atenção!\n\n' +
            'Tenha certeza que o seu ajudante já se cadastrou no site de compra de ingressos do CMB \n'+
            'usando este mesmo e-mail de ajudante que você acabou de informar.\n' +
            'Ele apenas precisa apenas fazer o cadastro.'
          );
          if (!ok) return; // não avança se cancelar
        }
      }

      showStep(currentStep + 1);
    }

    if (e.target.matches('[data-prev]')) showStep(currentStep - 1);
  });

  // botão Copiar legenda
  const btnCopy = document.getElementById('btnCopyCaption');
  if (btnCopy) {
    btnCopy.addEventListener('click', async () => {
      const box = document.getElementById('captionBox');
      if (!box) return;
      try {
        await navigator.clipboard.writeText(box.value);
        btnCopy.textContent = 'Copiado ✔';
        setTimeout(()=>btnCopy.textContent='Copiar', 1500);
      } catch(e) {
        // fallback
        box.select(); document.execCommand('copy');
        btnCopy.textContent = 'Copiado ✔';
        setTimeout(()=>btnCopy.textContent='Copiar', 1500);
      }
    });
  }

  showStep(1);
});

/* Expor funções globais */
window.enviarParaGoogle = enviarParaGoogle;
window.baixarImagem = baixarImagem;
window.goToMenu = goToMenu;



