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

// Posição inicial da plaquinha (em px no canvas 1080x1350)
let plaquinhaX = 140;
let plaquinhaY = 1000;

/* ===========================
   CANVAS + PLAQUINHA
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
    r.onload = (ev) => {
      fotoImg = new Image();
      fotoImg.onload = gerarPost;
      fotoImg.src = ev.target.result;
    };
    if (e.target.files && e.target.files[0]) r.readAsDataURL(e.target.files[0]);
  });

  ['imgScale', 'imgX', 'imgY', 'nomeArtista'].forEach((id) => {
    document.getElementById(id)?.addEventListener('input', gerarPost);
  });

  document.fonts?.ready?.then(() => {
    gerarPost();
    updatePlaquinha();
  });

  window.addEventListener('resize', updatePlaquinha);
}

function updatePlaquinha() {
  const tag = document.getElementById('plaquinhaNome');
  if (!tag || !canvas) return;

  const nome = (document.getElementById('nomeArtista')?.value || '').trim();
  if (!nome) {
    tag.style.display = 'none';
    return;
  }

  tag.textContent = nome;
  tag.style.display = 'inline-block';

  const scale = canvas.clientWidth / canvas.width;
  tag.style.left = (plaquinhaX * scale) + 'px';
  tag.style.top = (plaquinhaY * scale) + 'px';
  tag.style.transformOrigin = 'top left';
  tag.style.transform = `scale(${scale})`;
}

/* ===========================
   GERAR POST
   =========================== */
function gerarPost() {
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

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

  if (frameImg?.complete && frameImg.naturalWidth) {
    ctx.drawImage(frameImg, 0, 0, canvas.width, canvas.height);
  }

  updatePlaquinha();

  const aviso = document.getElementById('avisoTexto');
  if (aviso) { aviso.textContent = ''; aviso.style.display = 'none'; }
}

/* ===========================
   RESTANTE DO SEU JS ORIGINAL
   =========================== */
// ... [toda a parte de envio, validação, review, wizard etc. permanece igual]

