/* =========================================================
   CONFIGURAÇÃO
   ========================================================= */
const FRAME_URL = 'https://cdn.jsdelivr.net/gh/automacaopostcmb-bit/CadastroCMB@main/assets/Frame.png';

const CHAR_LIMITS = {
  titulo:    { min: 25,  max: 100  },
  descricao: { min: 150, max: 230 }
};
const PHONE_ALLOWED_LENGTHS = [10, 11];
const EMAIL_REGEX  = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
const INSTA_REGEX  = /^@?[a-zA-Z0-9._]{1,30}$/;

const REVIEW_FIELDS = [
  { id: 'nome',           label: 'Nome' },
  { id: 'email',          label: 'E-mail' },
  { id: 'telefone',       label: 'Telefone' },
  { id: 'masterclass',    label: 'Master Class' },
  { id: 'palco',          label: 'Dinâmica de Palco' },
  { id: 'empresa',        label: 'Empresa' },
  { id: 'site',           label: 'Site',    format: v => normalizeUrlMaybe(v) },
  { id: 'insta',          label: 'Instagram' },
  { id: 'titulo',         label: 'Título' },
  { id: 'descricao',      label: 'Descrição' },
  { id: 'descricaolonga', label: 'Bio' }
];

const step5Messages = { charError: '' };
const validationFlags = { overflow: false };

/* ===========================
   HELPERS
   =========================== */
function showFieldError(inputId, msg) {
  const box = document.getElementById(inputId + 'Error');
  const input = document.getElementById(inputId);
  if (box) { box.textContent = msg || ''; box.style.display = msg ? 'block' : 'none'; }
  if (input) input.classList.toggle('invalid', !!msg);
}
function formatPhone(digits) {
  if (digits.length <= 2)  return '(' + digits;
  if (digits.length <= 6)  return `(${digits.slice(0,2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0,2)}) ${digits.slice(2,6)}-${digits.slice(6)}`;
  return `(${digits.slice(0,2)}) ${digits.slice(2,7)}-${digits.slice(7,11)}`;
}
function normalizeUrlMaybe(url) {
  let u = (url || '').trim();
  if (!u) return '';
  if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
  return u;
}
function updateStep5Warning() {
  const aviso = document.getElementById('avisoTexto');
  const msgs = [];
  if (validationFlags.overflow) msgs.push('* Ups, seu texto ultrapassou da caixa. Por favor ajuste!');
  if (step5Messages.charError) msgs.push(step5Messages.charError);
  const text = msgs.join(' ');
  aviso.textContent = text;
  aviso.style.display = text ? 'block' : 'none';
}
function escapeHtml(s) {
  return String(s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
}

/* ===========================
   VARS DO CANVAS / PREVIEW
   =========================== */
let canvas, ctx, frameImg, logoImg, lateralImg;

/* ===========================
   PREVIEW / CANVAS
   =========================== */
function initCanvas() {
  canvas = document.getElementById('canvas');
  if (!canvas) return;
  ctx = canvas.getContext('2d');

  frameImg = new Image();
  frameImg.crossOrigin = 'anonymous';
  frameImg.referrerPolicy = 'no-referrer';
  frameImg.onload = gerarPost;
  frameImg.onerror = () => {
    const m = document.getElementById('mensagem');
    if (m) {
      m.style.display = 'block';
      m.style.color = 'red';
      m.textContent = '❌ Não consegui carregar a moldura.';
    }
    console.error('Falha ao carregar frame:', FRAME_URL);
  };
  frameImg.src = FRAME_URL + '?v=' + Date.now();

  const logoInput = document.getElementById('logo');
  const lateralInput = document.getElementById('lateral');

  if (logoInput) {
    logoInput.addEventListener('change', (e) => {
      const reader = new FileReader();
      reader.onload = (ev) => { logoImg = new Image(); logoImg.onload = gerarPost; logoImg.src = ev.target.result; };
      reader.readAsDataURL(e.target.files[0]);
    });
  }
  if (lateralInput) {
    lateralInput.addEventListener('change', (e) => {
      const reader = new FileReader();
      reader.onload = (ev) => { lateralImg = new Image(); lateralImg.onload = gerarPost; lateralImg.src = ev.target.result; };
      reader.readAsDataURL(e.target.files[0]);
    });
  }

  ['imgScale', 'imgX', 'imgY', 'titulo', 'descricao'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', gerarPost);
  });

  document.fonts?.ready?.then(gerarPost);
}

function gerarPost() {
  if (!ctx) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (lateralImg) {
    const scale = parseFloat(document.getElementById('imgScale').value || '1');
    const anchorPointX = 150, anchorPointY = 1000;
    const offsetX = parseInt(document.getElementById('imgX').value || '0', 10);
    const offsetY = parseInt(document.getElementById('imgY').value || '0', 10);
    const w = lateralImg.width * scale, h = lateralImg.height * scale;
    const drawX = anchorPointX + offsetX - w / 2;
    const drawY = anchorPointY + offsetY - h / 2;
    ctx.drawImage(lateralImg, drawX, drawY, w, h);
  }

  if (frameImg?.complete && frameImg.naturalWidth) {
    ctx.drawImage(frameImg, 0, 0, canvas.width, canvas.height);
  }

  if (logoImg) {
    const maxWidth = 500, maxHeight = 350;
    const scale = Math.min(maxWidth / logoImg.width, maxHeight / logoImg.height);
    const width = logoImg.width * scale, height = logoImg.height * scale;
    const centerY = 450;
    ctx.drawImage(logoImg, (canvas.width - width) / 2, centerY - height / 2, width, height);
  }

  const titulo = (document.getElementById('titulo').value || '').trim();
  ctx.font = 'bold 48px "Comic Relief"';
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'left';

  const tituloX = 400, tituloYBase = 880;
  const tituloMaxWidth = 600, tituloMaxLinhas = 2;

  const linhasTitulo = wrapText(titulo, tituloMaxWidth, ctx);
  const ultrapassouTitulo = linhasTitulo.length > tituloMaxLinhas;
  const linhasTituloSlice = linhasTitulo.slice(0, tituloMaxLinhas);
  let offsetY = (linhasTituloSlice.length === 1) ? 30 : 0;
  linhasTituloSlice.forEach((linha, i) => ctx.fillText(linha, tituloX, tituloYBase + i * 54 + offsetY));

  const descricao = (document.getElementById('descricao').value || '').trim();
  ctx.font = '28px "Comic Relief"';
  ctx.fillStyle = '#333';
  const descricaoX = 400, descricaoY = 1050;
  const descricaoMaxWidth = 600, descricaoMaxLinhas = 5;

  const linhasManuais = descricao.split('\n');
  let todas = [];
  linhasManuais.forEach(l => todas.push(...wrapText(l, descricaoMaxWidth, ctx)));
  const ultrapassouDescricao = todas.length > descricaoMaxLinhas;
  const linhasDescricao = todas.slice(0, descricaoMaxLinhas);
  linhasDescricao.forEach((linha, i) => ctx.fillText(linha, descricaoX, descricaoY + i * 40));

  validationFlags.overflow = (ultrapassouTitulo || ultrapassouDescricao);
  updateStep5Warning();
  if (typeof revalidateStepNav === 'function') revalidateStepNav();
}
function wrapText(text, maxWidth, context) {
  const palavras = text.split(' ');
  const linhas = [];
  let linha = '';
  palavras.forEach(palavra => {
    const teste = linha + palavra + ' ';
    const largura = context.measureText(teste).width;
    if (largura > maxWidth && linha !== '') {
      linhas.push(linha.trim());
      linha = palavra + ' ';
    } else {
      linha = teste;
    }
  });
  if (linha !== '') linhas.push(linha.trim());
  return linhas;
}
function baixarImagem() {
  const link = document.createElement('a');
  link.download = 'post.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
}

/* ===========================
   ENVIO
   =========================== */
async function enviarParaGoogle() {
  const camposObrigatorios = [
    'nome','email','telefone',
    'empresa','site','insta',
    'logo','lateral',
    'titulo','descricao',
    'descricaolonga'
  ];
  let camposVazios = [];
  camposObrigatorios.forEach(id => {
    const el = document.getElementById(id);
    const valor = (el && el.type !== 'file')
      ? (el.value || '').trim()
      : (el && el.files && el.files.length ? 'ok' : '');
    if (!valor) camposVazios.push(id);
  });
  if (camposVazios.length > 0) {
    const msg = document.getElementById('mensagem');
    msg.textContent = '❌ Preencha todos os campos obrigatórios.';
    msg.style.color = 'red';
    msg.style.display = 'block';
    return;
  }

  const toBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
  });
  async function processarImagem(inputId) {
    const file = document.getElementById(inputId).files[0];
    if (!file) return null;
    const base64 = await toBase64(file);
    return { name: file.name, type: file.type, content: base64.split(',')[1] };
  }

  const logoBase64 = await processarImagem('logo');
  const lateralBase64 = await processarImagem('lateral');
  const backgroundBase64 = await processarImagem('background');

  let previewBase64 = null;
  if (canvas) {
    const previewDataURL = canvas.toDataURL('image/png');
    previewBase64 = { name: 'preview.png', type: 'image/png', content: previewDataURL.split(',')[1] };
  }

  const dados = {
    nome: document.getElementById('nome').value,
    email: document.getElementById('email').value,
    telefone: document.getElementById('telefone').value,
    masterclass: document.getElementById('masterclass').value,
    palco: document.getElementById('palco').value,
    empresa: document.getElementById('empresa').value,
    site: document.getElementById('site').value,
    insta: document.getElementById('insta').value,
    titulo: document.getElementById('titulo').value,
    descricao: document.getElementById('descricao').value,
    descricaolonga: document.getElementById('descricaolonga').value,
    logo: logoBase64,
    lateral: lateralBase64,
    background: backgroundBase64,
    preview: previewBase64
  };

  const overlay = document.getElementById('overlay');
  overlay.style.display = 'flex';

  const response = await fetch("https://script.google.com/macros/s/AKfycbwYlIt_E3FnscPe3Pos3JEPmDvzu3SuPNrrwUqukTsjtT973GP_HLwxfDr3jpvC423Beg/exec", {
    method: "POST",
    body: JSON.stringify(dados)
  });

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

  overlay.style.display = 'none';
  setTimeout(() => { msg.textContent = ''; }, 5000);
}

/* ===========================
   AUTENTICAÇÃO (Apps Script)
   =========================== */
const AUTH_API_URL = "https://script.google.com/macros/s/AKfycby9W9w8NwLNpyX2XSegURIX5Z2qkJAyYskXePVggOwG6wJhquDFoY7jR91p_YmOyoDmVA/exec";
const PAGINA  = "expo_market";
async function checkAuth() {
  const chave = (localStorage.getItem("chave") || "").trim();
  if (!chave) {
    alert("Faça login primeiro.");
    window.location.href = "index.html";
    return;
  }
  const resp = await fetch(`${AUTH_API_URL}?chave=${encodeURIComponent(chave)}&pagina=${encodeURIComponent(PAGINA)}`);
  const data = await resp.json();
  if (!data.permitido) {
    alert("Você não tem permissão para acessar esta página.");
    window.location.href = "index.html";
  }
}

/* ===========================
   WIZARD / VALIDAÇÕES
   =========================== */
const REQUIRED_BY_STEP = {
  1: [],
  2: ['nome','email','telefone'],
  3: ['empresa','site','insta'],
  4: ['logo','lateral'],
  5: ['titulo','descricao'],
  6: ['descricaolonga'],
  7: []
};
const GLOBAL_VALIDATORS = [];

const STEP_VALIDATORS = {
  2: () => {
    const email = (document.getElementById('email').value || '').trim();
    const emailOK = EMAIL_REGEX.test(email);
    showFieldError('email', emailOK ? '' : 'Informe um e-mail válido.');

    const raw = (document.getElementById('telefone').value || '').replace(/\D/g, '');
    const telOK = PHONE_ALLOWED_LENGTHS.includes(raw.length);
    showFieldError('telefone', telOK ? '' : 'Telefone com DDD (10 ou 11 dígitos).');

    return emailOK && telOK;
  },
  3: () => {
    const siteInput = document.getElementById('site');
    let url = normalizeUrlMaybe(siteInput.value);
    let siteOK = false;
    try {
      const u = new URL(url);
      siteOK = !!u.hostname && u.hostname.includes('.');
      if (siteOK) siteInput.value = url;
    } catch(e) { siteOK = false; }
    showFieldError('site', siteOK ? '' : 'Digite um site válido. Ex.: https://suaempresa.com');

    const instaInput = document.getElementById('insta');
    let ig = (instaInput.value || '').trim();
    const instaOK = INSTA_REGEX.test(ig);
    showFieldError('insta', instaOK ? '' : 'Use apenas letras, números, ponto e underline.');
    if (instaOK) { ig = ig.replace(/^@?/, '@'); instaInput.value = ig.toLowerCase(); }

    return siteOK && instaOK;
  },
  5: () => {
    const t = (document.getElementById('titulo').value || '').trim();
    const d = (document.getElementById('descricao').value || '').trim();
    let ok = true;
    step5Messages.charError = '';

    if (t.length < CHAR_LIMITS.titulo.min || t.length > CHAR_LIMITS.titulo.max) {
      step5Messages.charError = `* O título deve ter entre ${CHAR_LIMITS.titulo.min} e ${CHAR_LIMITS.titulo.max} caracteres.`;
      ok = false;
    } else if (d.length < CHAR_LIMITS.descricao.min || d.length > CHAR_LIMITS.descricao.max) {
      step5Messages.charError = `* A descrição deve ter entre ${CHAR_LIMITS.descricao.min} e ${CHAR_LIMITS.descricao.max} caracteres.`;
      ok = false;
    }

    updateStep5Warning();
    if (validationFlags.overflow) ok = false;
    return ok;
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
  ids.forEach(id => {
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

  for (const fn of GLOBAL_VALIDATORS) {
    if (fn && fn(stepNumber) === false) return false;
  }
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
  if (currentStep === 7) { try { buildReview(); } catch (e) {} }
  updateIndicator();
  revalidateStepNav();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
function buildReview() {
  const box = document.getElementById('review-list');
  if (!box) return;
  const parts = REVIEW_FIELDS.map(({ id, label, format }) => {
    const el = document.getElementById(id);
    let val = '';
    if (el) {
      if (el.type === 'file') {
        val = (el.files && el.files[0]) ? el.files[0].name : '—';
      } else {
        val = (el.value || '').trim();
      }
    }
    if (typeof format === 'function') val = format(val);
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
   MENU: voltar para index
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

  const telEl = document.getElementById('telefone');
  if (telEl) {
    telEl.addEventListener('input', (e) => {
      const onlyDigits = e.target.value.replace(/\D/g, '').slice(0, 11);
      e.target.value = formatPhone(onlyDigits);
    });
  }

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
    if (e.target.matches('[data-next]')) {
      if (validateStep(currentStep)) showStep(currentStep + 1);
    }
    if (e.target.matches('[data-prev]')) showStep(currentStep - 1);
  });

  showStep(1);
});
