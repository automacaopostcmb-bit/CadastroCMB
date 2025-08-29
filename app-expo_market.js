/* =========================================================
   CONFIGURAÇÃO
   ========================================================= */
const FRAME_URL =
  'https://cdn.jsdelivr.net/gh/automacaopostcmb-bit/CadastroCMB@main/assets/Frame_expo_market.png';

const FRAME_URL_PREVIEW =
  'https://cdn.jsdelivr.net/gh/automacaopostcmb-bit/CadastroCMB@main/assets/Frame_prepreview_expo_market.png';

const TARJAS = {
  artista: { src: 'assets/tarja-artista.png', x: 90, y: 190, scale: 0.2 },
  empresa: { src: 'assets/tarja-empresa.png', x: 90, y: 190, scale: 0.2 }
};

let canvas4, ctx4, frameImgPreview;
let canvas5, ctx5, frameImgFinal;
let lateralImg = null;
let apoio_nX = 0.3, apoio_nY = 0.3, apoio_nW = 0.4; // posição e tamanho normalizados
let drawnW4 = 0; // largura da imagem no preview 4
let posX4 = 0, posY4 = 0; // posição da imagem no preview 4

/* ===========================
   CANVAS
   =========================== */
function initCanvas() {
  canvas4 = document.getElementById('canvas4');
  ctx4 = canvas4?.getContext('2d');
  canvas5 = document.getElementById('canvas5');
  ctx5 = canvas5?.getContext('2d');

  // Carrega frame FINAL
  frameImgFinal = new Image();
  frameImgFinal.crossOrigin = 'anonymous';
  frameImgFinal.onload = gerarPost;
  frameImgFinal.src = FRAME_URL + '?v=' + Date.now();

  // Carrega frame do PREVIEW
  frameImgPreview = new Image();
  frameImgPreview.crossOrigin = 'anonymous';
  frameImgPreview.onload = drawStep4;
  frameImgPreview.src = FRAME_URL_PREVIEW + '?v=' + Date.now();

  // Upload da imagem de apoio
  const lateralInput = document.getElementById('lateral');
  lateralInput?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const r = new FileReader();
    r.onload = (ev) => {
      localStorage.setItem('apoio_b64', ev.target.result);
      lateralImg = new Image();
      lateralImg.onload = () => {
        // tamanho inicial: 40% da largura final (canvas5)
        apoio_nW = 0.4;
        drawnW4 = canvas4.width * apoio_nW;
        const drawnH4 = drawnW4 * (lateralImg.naturalHeight / lateralImg.naturalWidth);
        posX4 = (canvas4.width - drawnW4) / 2;
        posY4 = (canvas4.height - drawnH4) / 2;
        updateNormalizedFromPreview();
        drawStep4();
        gerarPost();
      };
      lateralImg.src = ev.target.result;
    };
    r.readAsDataURL(file);
  });

  // Sliders do preview (E4)
  document.getElementById('imgScale4')?.addEventListener('input', () => {
    if (!canvas4 || !lateralImg) return;
    const pct = parseFloat(document.getElementById('imgScale4').value || '40');
    drawnW4 = canvas4.width * (pct / 100);
    clampPreviewPosition();
    updateNormalizedFromPreview();
    drawStep4();
  });
  document.getElementById('imgX4')?.addEventListener('input', () => {
    if (!canvas4 || !lateralImg) return;
    const val = parseFloat(document.getElementById('imgX4').value || '50');
    const drawnH4 = drawnW4 * (lateralImg.naturalHeight / lateralImg.naturalWidth);
    posX4 = (canvas4.width - drawnW4) * (val / 100);
    posX4 = Math.max(0, Math.min(posX4, canvas4.width - drawnW4));
    posY4 = Math.max(0, Math.min(posY4, canvas4.height - drawnH4));
    updateNormalizedFromPreview();
    drawStep4();
  });
  document.getElementById('imgY4')?.addEventListener('input', () => {
    if (!canvas4 || !lateralImg) return;
    const val = parseFloat(document.getElementById('imgY4').value || '50');
    const drawnH4 = drawnW4 * (lateralImg.naturalHeight / lateralImg.naturalWidth);
    posY4 = (canvas4.height - drawnH4) * (val / 100);
    posY4 = Math.max(0, Math.min(posY4, canvas4.height - drawnH4));
    posX4 = Math.max(0, Math.min(posX4, canvas4.width - drawnW4));
    updateNormalizedFromPreview();
    drawStep4();
  });
}

/* ===========================
   CALCULAR POSIÇÃO NORMALIZADA
   =========================== */
function updateNormalizedFromPreview() {
  if (!canvas4 || !lateralImg) return;
  // converte posição do preview para porcentagem do canvas FINAL (1080x1350)
  apoio_nX = posX4 / canvas4.width;
  apoio_nY = posY4 / canvas4.height;
  apoio_nW = drawnW4 / canvas4.width;

  localStorage.setItem('apoio_nX', String(apoio_nX));
  localStorage.setItem('apoio_nY', String(apoio_nY));
  localStorage.setItem('apoio_nW', String(apoio_nW));
}

/* ===========================
   DESENHO: ETAPA 4 (preview)
   =========================== */
function drawStep4() {
  if (!ctx4 || !canvas4) return;

  ctx4.clearRect(0, 0, canvas4.width, canvas4.height);
  ctx4.fillStyle = '#fff';
  ctx4.fillRect(0, 0, canvas4.width, canvas4.height);

  if (lateralImg && drawnW4 > 0) {
    const drawnH4 = drawnW4 * (lateralImg.naturalHeight / lateralImg.naturalWidth);
    ctx4.drawImage(lateralImg, posX4, posY4, drawnW4, drawnH4);
  }

  if (frameImgPreview?.complete && frameImgPreview.naturalWidth) {
    ctx4.drawImage(frameImgPreview, 0, 0, canvas4.width, canvas4.height);
  }
}

/* ===========================
   DESENHO: ETAPA 5 (final)
   =========================== */
function gerarPost() {
  if (!ctx5 || !canvas5) return;

  // Pega valores normalizados salvos
  const nx = parseFloat(localStorage.getItem('apoio_nX') || `${apoio_nX}`) || 0;
  const ny = parseFloat(localStorage.getItem('apoio_nY') || `${apoio_nY}`) || 0;
  const nw = parseFloat(localStorage.getItem('apoio_nW') || `${apoio_nW}`) || 0.4;

  ctx5.clearRect(0, 0, canvas5.width, canvas5.height);
  ctx5.fillStyle = '#fff';
  ctx5.fillRect(0, 0, canvas5.width, canvas5.height);

  if (lateralImg) {
    const drawnW5 = nw * canvas5.width;
    const drawnH5 = drawnW5 * (lateralImg.naturalHeight / lateralImg.naturalWidth);
    const x5 = nx * canvas5.width;
    const y5 = ny * canvas5.height;
    ctx5.drawImage(lateralImg, x5, y5, drawnW5, drawnH5);
  }

  if (frameImgFinal?.complete && frameImgFinal.naturalWidth) {
    ctx5.drawImage(frameImgFinal, 0, 0, canvas5.width, canvas5.height);
  }
}

function clampPreviewPosition() {
  if (!canvas4 || !lateralImg) return;
  const drawnH4 = drawnW4 * (lateralImg.naturalHeight / lateralImg.naturalWidth);
  posX4 = Math.max(0, Math.min(posX4, canvas4.width - drawnW4));
  posY4 = Math.max(0, Math.min(posY4, canvas4.height - drawnH4));
}
