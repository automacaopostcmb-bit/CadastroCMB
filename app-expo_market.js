/* =========================================================
   CONFIGURAÇÃO
   ========================================================= */
const FRAME_URL =
  'https://cdn.jsdelivr.net/gh/automacaopostcmb-bit/CadastroCMB@main/assets/Frame_expo_market.png';

/* ===== TARJAS (AJUSTE AQUI) ===== */
const TARJAS = {
  artista: { src: 'assets/tarja-artista.png', x: 90, y: 190, scale: 0.2 },
  empresa: { src: 'assets/tarja-empresa.png', x: 90, y: 190, scale: 0.2 }
};

const CHAR_LIMITS = { titulo: { min: 5, max: 60 }, descricao: { min: 150, max: 250 } };
const PHONE_ALLOWED_LENGTHS = [10, 11];
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
const INSTA_REGEX = /^@?[a-zA-Z0-9._]{1,30}$/;

const REVIEW_FIELDS = [
  { id: 'nome', label: 'Nome' },
  { id: 'email', label: 'E-mail' },
  { id: 'telefone', label: 'Telefone' },
  { id: 'empresa', label: 'Empresa' },
  { id: 'site', label: 'Site', format: (v) => normalizeUrlMaybe(v) },
  { id: 'insta', label: 'Instagram' }
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
  if (digits.length <= 2) return '(' + digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
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
  if (aviso) {
    aviso.textContent = text;
    aviso.style.display = text ? 'block' : 'none';
  }
}
function buildCaptionFromForm() {
  const empresa = (document.getElementById('empresa')?.value || '').trim();
  let insta = (document.getElementById('insta')?.value || '').trim();
  if (insta) insta = '@' + insta.replace(/^@+/, '');
  const descLonga = (document.getElementById('descricaolonga')?.value || '').trim();
  const descCurta = (document.getElementById('descricao')?.value || '').trim();
  const descricao = descLonga || descCurta || '';
  const head = `Expositor confirmado! ${empresa || '—'} ${insta || ''} no CMB @comicmarketbrasil`;
  const tags =
    '#ComicMarketBrasil #QuadrinhosNacionais #QuadrinhosBrasileiros #hqbr #mangabr #historiaemquadrinhos #desenhistabrasileiro #ilustradorbrasileiro #fapcom';
  return [head, '', descricao, '', tags].join('\n');
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
// Etapa 4 (preview menor)
let canvas4, ctx4;
// Etapa 5 (preview final)
let canvas5, ctx5;

// Alias mantidos (para baixarImagem/enviar)
let canvas, ctx;

let frameImg, logoImg, lateralImg;
let tarjaImg = null, tarjaCfg = null, categoriaSelecionada = null;

// Estado da imagem de apoio (E4, em pixels)
let posX4 = 0, posY4 = 0, drawnW4 = 0;

// Estado NORMALIZADO (usado para transportar E4->E5)
let apoio_nX = 0.3, apoio_nY = 0.3, apoio_nW = 0.4; // defaults

/* ===========================
   CANVAS
   =========================== */
function initCanvas() {
  // Etapa 4
  canvas4 = document.getElementById('canvas4');
  ctx4 = canvas4 ? canvas4.getContext('2d') : null;

  // Etapa 5
  canvas5 = document.getElementById('canvas5');
  ctx5 = canvas5 ? canvas5.getContext('2d') : null;

  // Mantém compatibilidade
  canvas = canvas5;
  ctx = ctx5;

  // Frame (usado nos dois previews)
  frameImg = new Image();
  frameImg.crossOrigin = 'anonymous';
  frameImg.referrerPolicy = 'no-referrer';
  frameImg.onload = () => {
    drawStep4();
    gerarPost(); // desenha E5
  };
  frameImg.onerror = () => console.error('Falha ao carregar frame:', FRAME_URL);
  frameImg.src = FRAME_URL + '?v=' + Date.now();

  // Uploads
  const logoInput = document.getElementById('logo');
  const lateralInput = document.getElementById('lateral');

  logoInput?.addEventListener('change', (e) => {
    const r = new FileReader();
    r.onload = (ev) => { logoImg = new Image(); logoImg.onload = gerarPost; logoImg.src = ev.target.result; };
    r.readAsDataURL(e.target.files[0]);
  });

  lateralInput?.addEventListener('change', (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = (ev) => {
      // salva base64 para E5
      localStorage.setItem('apoio_b64', ev.target.result);
      // cria imagem
      lateralImg = new Image();
      lateralImg.onload = () => {
        // tamanho inicial: 40% da largura do canvas4 (ou defaults se não houver canvas4)
        const cw = canvas4 ? canvas4.width : 1080;
        const ch = canvas4 ? canvas4.height : 1350;

        apoio_nW = 0.4;
        drawnW4 = cw * apoio_nW;
        const drawnH4 = drawnW4 * (lateralImg.naturalHeight / lateralImg.naturalWidth);

        posX4 = (cw - drawnW4) / 2;
        posY4 = (ch - drawnH4) / 2;

        // salva normalizado
        updateNormalizedFromPixels();

        drawStep4();
        gerarPost(); // se já estiver na E5, refaz
      };
      lateralImg.src = ev.target.result;
    };
    r.readAsDataURL(f);
  });

  // Sliders (somente E4)
  document.getElementById('imgScale4')?.addEventListener('input', () => {
    if (!canvas4 || !lateralImg) return;
    const pct = parseFloat(document.getElementById('imgScale4').value || '40'); // 10..90
    drawnW4 = canvas4.width * (pct / 100);
    clampPosE4();
    updateNormalizedFromPixels();
    drawStep4();
  });
  document.getElementById('imgX4')?.addEventListener('input', () => {
    if (!canvas4 || !lateralImg) return;
    const val = parseFloat(document.getElementById('imgX4').value || '50'); // 0..100
    const drawnH4 = drawnW4 * (lateralImg.naturalHeight / lateralImg.naturalWidth);
    posX4 = (canvas4.width - drawnW4) * (val / 100);
    posX4 = Math.max(0, Math.min(posX4, canvas4.width - drawnW4));
    // mantém Y atual dentro do limite
    posY4 = Math.max(0, Math.min(posY4, canvas4.height - drawnH4));
    updateNormalizedFromPixels();
    drawStep4();
  });
  document.getElementById('imgY4')?.addEventListener('input', () => {
    if (!canvas4 || !lateralImg) return;
    const val = parseFloat(document.getElementById('imgY4').value || '50'); // 0..100
    const drawnH4 = drawnW4 * (lateralImg.naturalHeight / lateralImg.naturalWidth);
    posY4 = (canvas4.height - drawnH4) * (val / 100);
    posY4 = Math.max(0, Math.min(posY4, canvas4.height - drawnH4));
    // mantém X atual dentro do limite
    posX4 = Math.max(0, Math.min(posX4, canvas4.width - drawnW4));
    updateNormalizedFromPixels();
    drawStep4();
  });

  // Lado textual (E5) aciona redesenho
  ['titulo', 'descricao'].forEach((id) => {
    document.getElementById(id)?.addEventListener('input', gerarPost);
  });

  bindCategoriaRadios();
  document.fonts?.ready?.then(() => { drawStep4(); gerarPost(); });
}

/* ----- util: mantém pos dentro do canvas E4 ----- */
function clampPosE4() {
  if (!canvas4 || !lateralImg) return;
  const drawnH4 = drawnW4 * (lateralImg.naturalHeight / lateralImg.naturalWidth);
  posX4 = Math.max(0, Math.min(posX4, canvas4.width - drawnW4));
  posY4 = Math.max(0, Math.min(posY4, canvas4.height - drawnH4));
}

/* ----- converte E4 (px) -> normalizado ----- */
function updateNormalizedFromPixels() {
  if (!canvas4 || !lateralImg) return;
  apoio_nX = posX4 / canvas4.width;
  apoio_nY = posY4 / canvas4.height;
  apoio_nW = drawnW4 / canvas4.width;

  // persiste para E5
  localStorage.setItem('apoio_nX', String(apoio_nX));
  localStorage.setItem('apoio_nY', String(apoio_nY));
  localStorage.setItem('apoio_nW', String(apoio_nW));
}

/* ---- radios + tarja (sem sliders) ---- */
function bindCategoriaRadios() {
  const radios = document.querySelectorAll('input[name="categoria"]');
  radios.forEach((radio) => {
    radio.addEventListener('change', () => selectCategoria(radio.value));
  });

  const pre = document.querySelector('input[name="categoria"]:checked');
  if (pre) selectCategoria(pre.value);
}
async function selectCategoria(value) {
  categoriaSelecionada = value;
  tarjaCfg = { ...TARJAS[value] };
  try {
    tarjaImg = await loadImage(tarjaCfg.src);
  } catch (e) {
    console.error('Não foi possível carregar a tarja:', e);
    tarjaImg = null;
  }
  drawStep4();
  gerarPost();
  revalidateStepNav();
}

/* ===========================
   DESENHO: ETAPA 4 (preview menor)
   =========================== */
function drawStep4() {
  if (!ctx4 || !canvas4) return;

  ctx4.clearRect(0, 0, canvas4.width, canvas4.height);
  ctx4.fillStyle = '#fff';
  ctx4.fillRect(0, 0, canvas4.width, canvas4.height);

  // imagem de apoio (usando estado em px da E4)
  if (lateralImg && drawnW4 > 0) {
    const drawnH4 = drawnW4 * (lateralImg.naturalHeight / lateralImg.naturalWidth);
    ctx4.drawImage(lateralImg, posX4, posY4, drawnW4, drawnH4);
  }

  // frame por cima (mesmo asset, escala no canvas4)
  if (frameImg?.complete && frameImg.naturalWidth) {
    ctx4.drawImage(frameImg, 0, 0, canvas4.width, canvas4.height);
  }
}

/* ===========================
   DESENHO: ETAPA 5 (preview final)
   =========================== */
function gerarPost() {
  if (!ctx5 || !canvas5) return;

  // lê normalizados (se tiverem sido salvos)
  const nx = parseFloat(localStorage.getItem('apoio_nX') || `${apoio_nX}`) || 0;
  const ny = parseFloat(localStorage.getItem('apoio_nY') || `${apoio_nY}`) || 0;
  const nw = parseFloat(localStorage.getItem('apoio_nW') || `${apoio_nW}`) || 0.4;

  // se não houver imagem em memória, tenta recarregar do localStorage
  if (!lateralImg) {
    const b64 = localStorage.getItem('apoio_b64');
    if (b64) {
      lateralImg = new Image();
      lateralImg.onload = () => { drawEverythingStep5(nx, ny, nw); };
      lateralImg.src = b64;
      return;
    }
  }

  drawEverythingStep5(nx, ny, nw);
}

function drawEverythingStep5(nx, ny, nw) {
  ctx5.clearRect(0, 0, canvas5.width, canvas5.height);
  ctx5.fillStyle = '#fff';
  ctx5.fillRect(0, 0, canvas5.width, canvas5.height);

  // imagem de apoio: reconstituída em PX a partir dos NORMALIZADOS
  if (lateralImg) {
    const drawnW5 = nw * canvas5.width;
    const drawnH5 = drawnW5 * (lateralImg.naturalHeight / lateralImg.naturalWidth);
    const x5 = nx * canvas5.width;
    const y5 = ny * canvas5.height;
    ctx5.drawImage(lateralImg, x5, y5, drawnW5, drawnH5);
  }

  // frame
  if (frameImg?.complete && frameImg.naturalWidth) {
    ctx5.drawImage(frameImg, 0, 0, canvas5.width, canvas5.height);
  }

  // tarja (sobre o frame)
  if (tarjaCfg) {
    if (tarjaImg) {
      const w = tarjaImg.naturalWidth * tarjaCfg.scale;
      const h = tarjaImg.naturalHeight * tarjaCfg.scale;
      ctx5.drawImage(tarjaImg, tarjaCfg.x, tarjaCfg.y, w, h);
    } else {
      ctx5.fillStyle = '#ffd400';
      ctx5.strokeStyle = '#000';
      ctx5.lineWidth = 10;
      ctx5.fillRect(tarjaCfg.x, tarjaCfg.y, 460 * tarjaCfg.scale, 92 * tarjaCfg.scale);
      ctx5.strokeRect(tarjaCfg.x, tarjaCfg.y, 460 * tarjaCfg.scale, 92 * tarjaCfg.scale);
    }
  }

  // logo
  if (logoImg) {
    const maxWidth = 500, maxHeight = 350;
    const s = Math.min(maxWidth / logoImg.width, maxHeight / logoImg.height);
    const w = logoImg.width * s, h = logoImg.height * s;
    const centerY = 450;
    ctx5.drawImage(logoImg, (canvas5.width - w) / 2, centerY - h / 2, w, h);
  }

  // título
  const titulo = (document.getElementById('titulo')?.value || '').trim();
  ctx5.font = 'bold 48px "Comic Relief"';
  ctx5.fillStyle = '#FFFFFF';
  ctx5.textAlign = 'left';

  const tituloX = 400, tituloYBase = 880;
  const tituloMaxWidth = 600, tituloMaxLinhas = 2;
  const linhasTitulo = wrapText(titulo, tituloMaxWidth, ctx5);
  const ultrapassouTitulo = linhasTitulo.length > tituloMaxLinhas;
  const linhasTituloSlice = linhasTitulo.slice(0, tituloMaxLinhas);
  let offsetY = (linhasTituloSlice.length === 1) ? 30 : 0;
  linhasTituloSlice.forEach((linha, i) => ctx5.fillText(linha, tituloX, tituloYBase + i * 54 + offsetY));

  // descrição
  const descricao = (document.getElementById('descricao')?.value || '').trim();
  ctx5.font = '28px "Comic Relief"';
  ctx5.fillStyle = '#333';
  const descricaoX = 400, descricaoY = 1050;
  const descricaoMaxWidth = 600, descricaoMaxLinhas = 5;
  const linhasManuais = descricao.split('\n');
  let todas = [];
  linhasManuais.forEach((l) => todas.push(...wrapText(l, descricaoMaxWidth, ctx5)));
  const ultrapassouDescricao = todas.length > descricaoMaxLinhas;
  const linhasDescricao = todas.slice(0, descricaoMaxLinhas);
  linhasDescricao.forEach((linha, i) => ctx5.fillText(linha, descricaoX, descricaoY + i * 40));

  validationFlags.overflow = (ultrapassouTitulo || ultrapassouDescricao);
  updateStep5Warning();
  if (typeof revalidateStepNav === 'function') revalidateStepNav();
}

/* ===========================
   TEXT WRAP
   =========================== */
function wrapText(text, maxWidth, context) {
  const palavras = text.split(' ');
  const linhas = [];
  let linha = '';
  palavras.forEach((p) => {
    const teste = linha + p + ' ';
    const largura = context.measureText(teste).width;
    if (largura > maxWidth && linha !== '') {
      linhas.push(linha.trim());
      linha = p + ' ';
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
  link.href = canvas5.toDataURL('image/png');
  link.click();
}

/* ===========================
   ENVIO (Apps Script)
   =========================== */
async function enviarParaGoogle() {
  const obrig = ['nome','email','telefone','empresa','site','insta','logo','lateral','titulo','descricao'];
  let faltando = [];
  obrig.forEach((id) => {
    const el = document.getElementById(id);
    const v = (el && el.type !== 'file') ? (el.value || '').trim() : (el && el.files && el.files.length ? 'ok' : '');
    if (!v) faltando.push(id);
  });
  if (faltando.length) {
    const msg = document.getElementById('mensagem');
    msg.textContent = '❌ Preencha todos os campos obrigatórios.';
    msg.style.color = 'red';
    msg.style.display = 'block';
    return;
  }

  const toBase64 = (file) => new Promise((res, rej) => {
    const r = new FileReader(); r.readAsDataURL(file);
    r.onload = () => res(r.result); r.onerror = rej;
  });
  async function processarImagem(id) {
    const f = document.getElementById(id).files[0];
    if (!f) return null;
    const b64 = await toBase64(f);
    return { name: f.name, type: f.type, content: b64.split(',')[1] };
  }

  const logoBase64 = await processarImagem('logo');
  const lateralBase64 = await processarImagem('lateral');
  const backgroundBase64 = await processarImagem('background');

  let previewBase64 = null;
  if (canvas5) {
    const dataURL = canvas5.toDataURL('image/png');
    previewBase64 = { name: 'preview.png', type: 'image/png', content: dataURL.split(',')[1] };
  }

  const legenda = buildCaptionFromForm();
  const dados = {
    nome: document.getElementById('nome').value,
    email: document.getElementById('email').value,
    telefone: document.getElementById('telefone').value,
    empresa: document.getElementById('empresa').value,
    site: document.getElementById('site').value,
    insta: document.getElementById('insta').value,
    titulo: document.getElementById('titulo').value,
    descricao: document.getElementById('descricao').value,
    descricaolonga: document.getElementById('descricaolonga').value,
    legenda,
    logo: logoBase64,
    lateral: lateralBase64,
    background: backgroundBase64,
    preview: previewBase64,
    categoria: categoriaSelecionada || '',
    // também mando as normalizadas se quiser registrar:
    apoio_nX: parseFloat(localStorage.getItem('apoio_nX') || `${apoio_nX}`),
    apoio_nY: parseFloat(localStorage.getItem('apoio_nY') || `${apoio_nY}`),
    apoio_nW: parseFloat(localStorage.getItem('apoio_nW') || `${apoio_nW}`)
  };

  const overlay = document.getElementById('overlay');
  overlay.style.display = 'flex';

  try {
    const response = await fetch(
      'https://script.google.com/macros/s/AKfycbyMbkkFdzYC_BfMsi5WKW6xbOKdjbNbW635vovOLYHGXdso2S_1a2Wdfvur790y0BM46g/exec',
      { method: 'POST', body: JSON.stringify(dados) }
    );
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
const API_URL =
  'https://script.google.com/macros/s/AKfycbyMbkkFdzYC_BfMsi5WKW6xbOKdjbNbW635vovOLYHGXdso2S_1a2Wdfvur790y0BM46g/exec';
const PAGINA = 'expo_market';
async function checkAuth() {
  const chave = (localStorage.getItem('chave') || '').trim();
  if (!chave) { alert('Faça login primeiro.'); window.location.href = 'index.html'; return; }
  const resp = await fetch(`${API_URL}?chave=${encodeURIComponent(chave)}&pagina=${encodeURIComponent(PAGINA)}`);
  const data = await resp.json();
  if (!data.permitido) { alert('Você não tem permissão para acessar esta página.'); window.location.href = 'index.html'; }
}

/* ===========================
   WIZARD / VALIDAÇÕES
   =========================== */
const REQUIRED_BY_STEP = {
  1: [],
  2: ['nome','email','telefone'],
  3: ['empresa','site','insta'],
  4: ['logo','lateral'],
  5: ['titulo','descricao'], // categoria validada abaixo
  6: []
};
const GLOBAL_VALIDATORS = [];

const STEP_VALIDATORS = {
  2: () => {
    const email = (document.getElementById('email').value || '').trim();
    const okEmail = EMAIL_REGEX.test(email);
    showFieldError('email', okEmail ? '' : 'Informe um e-mail válido.');

    const raw = (document.getElementById('telefone').value || '').replace(/\D/g, '');
    const okTel = PHONE_ALLOWED_LENGTHS.includes(raw.length);
    showFieldError('telefone', okTel ? '' : 'Telefone com DDD (10 ou 11 dígitos).');

    return okEmail && okTel;
  },
  3: () => {
    const siteInput = document.getElementById('site');
    let url = normalizeUrlMaybe(siteInput.value);
    let okSite = false;
    try {
      const u = new URL(url);
      okSite = !!u.hostname && u.hostname.includes('.');
      if (okSite) siteInput.value = url;
    } catch { okSite = false; }
    showFieldError('site', okSite ? '' : 'Digite um site válido. Ex.: https://suaempresa.com');

    const instaInput = document.getElementById('insta');
    let ig = (instaInput.value || '').trim();
    const okInsta = INSTA_REGEX.test(ig);
    showFieldError('insta', okInsta ? '' : 'Use apenas letras, números, ponto e underline.');
    if (okInsta) { ig = ig.replace(/^@?/, '@'); instaInput.value = ig.toLowerCase(); }

    return okSite && okInsta;
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

    const selected = document.querySelector('input[name="categoria"]:checked');
    const catErr = document.getElementById('categoriaError');
    if (!selected) { ok = false; catErr && (catErr.textContent = 'Selecione uma categoria para continuar.'); }
    else { catErr && (catErr.textContent = ''); }

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
  // Ao entrar na E5, redesenha com o que foi salvo na E4
  if (currentStep === 5) gerarPost();
  if (currentStep === 4) drawStep4();
  if (currentStep === 7) { try { buildReview(); } catch (e) { console.error('buildReview error', e); } }
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
      if (el.type === 'file') val = (el.files && el.files[0]) ? el.files[0].name : '—';
      else val = (el.value || '').trim();
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

  const telEl = document.getElementById('telefone');
  telEl?.addEventListener('input', (e) => {
    const only = e.target.value.replace(/\D/g, '').slice(0, 11);
    e.target.value = formatPhone(only);
  });

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
      if (validateStep(currentStep)) {
        // Se está saindo da E4, garante que normalizados estão salvos
        if (currentStep === 4) updateNormalizedFromPixels();
        showStep(currentStep + 1);
      }
    }
    if (e.target.matches('[data-prev]')) showStep(currentStep - 1);
  });

  showStep(1);
});
