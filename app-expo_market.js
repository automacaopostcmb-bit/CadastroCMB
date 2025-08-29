/* =========================================================
   CONFIG
   ========================================================= */
const FRAME_URL =
  'https://cdn.jsdelivr.net/gh/automacaopostcmb-bit/CadastroCMB@main/assets/Frame_expo_market.png';
const FRAME_URL_PREVIEW =
  'https://cdn.jsdelivr.net/gh/automacaopostcmb-bit/CadastroCMB@main/assets/Frame_prepreview_expo_market.png';

const FINAL = { w: 1080, h: 1350 };   // etapa 5 (padrão do post)
const PREVIEW = { w: 771,  h: 1173 };  // etapa 4 (confirmado)

/* 🔴 RECORTE DO PRÉ-PREVIEW DENTRO DO POSTER FINAL
   Proporção idêntica ao preview: 771x1173.
   Ajuste fino x/y se quiser (2–5px).
*/
const CROP_FINAL = { x: 66, y: 170, width: 771, height: 1173 };

/* TARJAS (fixas no final) */
const TARJAS = {
  artista: { src: 'assets/tarja-artista.png', x: 90, y: 190, scale: 0.2 },
  empresa: { src: 'assets/tarja-empresa.png', x: 90, y: 190, scale: 0.2 }
};

const CHAR_LIMITS = { titulo: { min: 5, max: 60 }, descricao: { min: 150, max: 250 } };
const PHONE_ALLOWED_LENGTHS = [10, 11];
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
const INSTA_REGEX = /^@?[a-zA-Z0-9._]{1,30}$/;

const step5Messages = { charError: '' };
const validationFlags = { overflow: false };

const REVIEW_FIELDS = [
  { id: 'nome', label: 'Nome' },
  { id: 'email', label: 'E-mail' },
  { id: 'telefone', label: 'Telefone' },
  { id: 'empresa', label: 'Empresa' },
  { id: 'site', label: 'Site', format: (v) => normalizeUrlMaybe(v) },
  { id: 'insta', label: 'Instagram' }
];

/* =========================================================
   HELPERS
   ========================================================= */
function showFieldError(inputId, msg) {
  const box = document.getElementById(inputId + 'Error');
  const input = document.getElementById(inputId);
  if (box) { box.textContent = msg || ''; box.style.display = msg ? 'block' : 'none'; }
  if (input) input.classList.toggle('invalid', !!msg);
}
function formatPhone(d){ if(d.length<=2) return '('+d; if(d.length<=6) return `(${d.slice(0,2)}) ${d.slice(2)}`;
  if(d.length<=10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`; return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7,11)}`; }
function normalizeUrlMaybe(u){u=(u||'').trim(); if(!u) return ''; if(!/^https?:\/\//i.test(u)) u='https://'+u; return u;}
function escapeHtml(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');}
function loadImage(src){ const bust=(/\?/.test(src)?'&':'?')+'v='+Date.now();
  return new Promise((res,rej)=>{const img=new Image(); img.crossOrigin='anonymous'; img.onload=()=>res(img); img.onerror=rej; img.src=src+bust;}); }
function wrapText(text,maxW,ctx){const ws=text.split(' ');const ls=[];let l='';
  ws.forEach(p=>{const t=l+p+' '; if(ctx.measureText(t).width>maxW && l!==''){ls.push(l.trim()); l=p+' ';} else {l=t;}});
  if(l!=='') ls.push(l.trim()); return ls; }
function buildCaptionFromForm(){
  const empresa=(document.getElementById('empresa')?.value||'').trim();
  let insta=(document.getElementById('insta')?.value||'').trim(); if(insta) insta='@'+insta.replace(/^@+/,'');
  const descLonga=(document.getElementById('descricaolonga')?.value||'').trim();
  const descCurta=(document.getElementById('descricao')?.value||'').trim();
  const descricao=descLonga||descCurta||'';
  const head=`Expositor confirmado! ${empresa||'—'} ${insta||''} no CMB @comicmarketbrasil`;
  const tags='#ComicMarketBrasil #QuadrinhosNacionais #QuadrinhosBrasileiros #hqbr #mangabr #historiaemquadrinhos #desenhistabrasileiro #ilustradorbrasileiro #fapcom';
  return [head,'',descricao,'',tags].join('\n');
}
function updateStep5Warning(){
  const aviso=document.getElementById('avisoTexto'); if(!aviso) return;
  const msgs=[]; if(validationFlags.overflow) msgs.push('* Ups, seu texto ultrapassou da caixa. Por favor ajuste!');
  if(step5Messages.charError) msgs.push(step5Messages.charError);
  const text=msgs.join(' '); aviso.textContent=text; aviso.style.display=text?'block':'none';
}

/* =========================================================
   STATE / CANVAS
   ========================================================= */
let canvas4, ctx4, frame4;
let canvas5, ctx5, frame5;

// offscreen para renderizar o pôster final e depois recortar para a etapa 4
const offFinal = document.createElement('canvas'); offFinal.width=FINAL.w; offFinal.height=FINAL.h;
const offCtx = offFinal.getContext('2d');

let logoImg=null, lateralImg=null;
let tarjaImg=null, tarjaCfg=null, categoriaSelecionada=null;

/* posição/escala NORMALIZADAS (relativas ao poster final) */
let nX=0.30, nY=0.30, nW=0.40; // top-left + largura; altura respeita proporção

/* =========================================================
   INIT
   ========================================================= */
document.addEventListener('DOMContentLoaded', () => {
  const overlay=document.getElementById('overlay'); if(overlay) overlay.style.display='none';

  canvas4=document.getElementById('canvas4'); ctx4=canvas4?.getContext('2d');
  canvas5=document.getElementById('canvas5'); ctx5=canvas5?.getContext('2d');

  // frames
  Promise.all([loadImage(FRAME_URL), loadImage(FRAME_URL_PREVIEW)])
    .then(([f5,f4])=>{ frame5=f5; frame4=f4; drawStep4(); drawStep5(); });

  // uploads — separados (não invertem mais)
  document.getElementById('logo')?.addEventListener('change', e=>{
    const f=e.target.files[0]; if(!f) return;
    const r=new FileReader(); r.onload=ev=>{logoImg=new Image(); logoImg.onload=()=>{savePos(); redrawAll();}; logoImg.src=ev.target.result;}; r.readAsDataURL(f);
  });
  document.getElementById('lateral')?.addEventListener('change', e=>{
    const f=e.target.files[0]; if(!f) return;
    const r=new FileReader(); r.onload=ev=>{
      localStorage.setItem('apoio_b64', ev.target.result);
      lateralImg=new Image(); lateralImg.onload=()=>{ setSizeFromPercent(40); centerInsideCrop(); savePos(); redrawAll(); };
      lateralImg.src=ev.target.result;
    }; r.readAsDataURL(f);
  });

  // sliders E4 (tudo relativo ao MIÓLO/CROP)
  document.getElementById('size4')?.addEventListener('input', e=>{
    setSizeFromPercent(parseFloat(e.target.value||'40')); clampInsideCrop(); savePos(); redrawAll();
  });
  document.getElementById('x4')?.addEventListener('input', e=>{
    setPosXFromPercent(parseFloat(e.target.value||'50')); clampInsideCrop(); savePos(); redrawAll();
  });
  document.getElementById('y4')?.addEventListener('input', e=>{
    setPosYFromPercent(parseFloat(e.target.value||'50')); clampInsideCrop(); savePos(); redrawAll();
  });

  // textos (E5)
  ['titulo','descricao'].forEach(id=>document.getElementById(id)?.addEventListener('input', drawStep5));

  bindCategoriaRadios();
  setupWizard();
});

/* =========================================================
   CONVERSÃO SLIDERS -> NORMALIZADO (POSTER FINAL)
   ========================================================= */
function setSizeFromPercent(pct){
  // largura desejada = pct% da largura do miolo (CROP_FINAL)
  const wFracCrop = (pct/100);                  // 0..1 da largura do CROP
  const wFracFinal = wFracCrop * (CROP_FINAL.width / FINAL.w); // fração da largura do POSTER
  nW = Math.max(0.05, Math.min(wFracFinal, 1));
}

function setPosXFromPercent(pct){
  if(!lateralImg) return;
  const pxW = nW * FINAL.w;
  const min = CROP_FINAL.x;
  const max = CROP_FINAL.x + CROP_FINAL.width - pxW;
  const x = min + (pct/100) * (max - min);
  nX = x / FINAL.w;
}

function setPosYFromPercent(pct){
  if(!lateralImg) return;
  const pxW = nW * FINAL.w;
  const pxH = pxW * (lateralImg.naturalHeight / lateralImg.naturalWidth);
  const min = CROP_FINAL.y;
  const max = CROP_FINAL.y + CROP_FINAL.height - pxH;
  const y = min + (pct/100) * (max - min);
  nY = y / FINAL.h;
}

function centerInsideCrop(){
  if(!lateralImg) return;
  const pxW = nW * FINAL.w;
  const pxH = pxW * (lateralImg.naturalHeight / lateralImg.naturalWidth);
  const x = CROP_FINAL.x + (CROP_FINAL.width - pxW)/2;
  const y = CROP_FINAL.y + (CROP_FINAL.height - pxH)/2;
  nX = x / FINAL.w; nY = y / FINAL.h;
}

function clampInsideCrop(){
  if(!lateralImg) return;
  const pxW = nW * FINAL.w;
  const pxH = pxW * (lateralImg.naturalHeight / lateralImg.naturalWidth);
  let x = nX * FINAL.w, y = nY * FINAL.h;
  x = Math.max(CROP_FINAL.x, Math.min(x, CROP_FINAL.x + CROP_FINAL.width  - pxW));
  y = Math.max(CROP_FINAL.y, Math.min(y, CROP_FINAL.y + CROP_FINAL.height - pxH));
  nX = x / FINAL.w; nY = y / FINAL.h;
}

function savePos(){
  localStorage.setItem('apoio_nX', String(nX));
  localStorage.setItem('apoio_nY', String(nY));
  localStorage.setItem('apoio_nW', String(nW));
}

function redrawAll(){ drawStep5(); drawStep4(); }

/* =========================================================
   DESENHOS
   ========================================================= */
function drawFinalTo(ctx, W, H){
  ctx.clearRect(0,0,W,H);
  ctx.fillStyle='#fff'; ctx.fillRect(0,0,W,H);

  // imagem de apoio
  if(lateralImg){
    const w = nW * W;
    const h = w * (lateralImg.naturalHeight / lateralImg.naturalWidth);
    const x = nX * W;
    const y = nY * H;
    ctx.drawImage(lateralImg, x, y, w, h);
  }

  // frame final
  if (frame5?.complete && frame5.naturalWidth){
    ctx.drawImage(frame5, 0, 0, W, H);
  }

  // tarja
  if (tarjaCfg){
    if (tarjaImg){
      const w = tarjaImg.naturalWidth * tarjaCfg.scale;
      const h = tarjaImg.naturalHeight * tarjaCfg.scale;
      ctx.drawImage(tarjaImg, tarjaCfg.x, tarjaCfg.y, w, h);
    } else {
      ctx.fillStyle='#ffd400'; ctx.strokeStyle='#000'; ctx.lineWidth=10;
      ctx.fillRect(tarjaCfg.x, tarjaCfg.y, 460*tarjaCfg.scale, 92*tarjaCfg.scale);
      ctx.strokeRect(tarjaCfg.x, tarjaCfg.y, 460*tarjaCfg.scale, 92*tarjaCfg.scale);
    }
  }

  // logo (centro superior)
  if (logoImg){
    const maxW=500, maxH=350;
    const s=Math.min(maxW/logoImg.width, maxH/logoImg.height);
    const w=logoImg.width*s, h=logoImg.height*s;
    const centerY=450;
    ctx.drawImage(logoImg, (W-w)/2, centerY - h/2, w, h);
  }
}

function drawStep4(){
  if(!ctx4) return;

  // 1) renderiza o pôster final num offscreen 1080x1350
  drawFinalTo(offCtx, FINAL.w, FINAL.h);

  // 2) recorta o miolo (CROP_FINAL) e escala/posiciona no canvas4 771x1173
  ctx4.clearRect(0,0,PREVIEW.w,PREVIEW.h);
  ctx4.drawImage(
    offFinal,
    CROP_FINAL.x, CROP_FINAL.y, CROP_FINAL.width, CROP_FINAL.height,
    0, 0, PREVIEW.w, PREVIEW.h
  );

  // 3) sobrepõe a moldura do pré-preview
  if(frame4?.complete && frame4.naturalWidth){
    ctx4.drawImage(frame4, 0, 0, PREVIEW.w, PREVIEW.h);
  }
}

function drawStep5(){
  if(!ctx5) return;

  // lê normalizados (se recarregar a página)
  nX = parseFloat(localStorage.getItem('apoio_nX') || `${nX}`) || nX;
  nY = parseFloat(localStorage.getItem('apoio_nY') || `${nY}`) || nY;
  nW = parseFloat(localStorage.getItem('apoio_nW') || `${nW}`) || nW;

  drawFinalTo(ctx5, FINAL.w, FINAL.h);

  // textos
  const titulo=(document.getElementById('titulo')?.value||'').trim();
  ctx5.font='bold 48px "Comic Relief"'; ctx5.fillStyle='#FFFFFF'; ctx5.textAlign='left';
  const tituloX=400, tituloYBase=880, tituloMaxW=600, tituloMaxLin=2;
  const tLines=wrapText(titulo, tituloMaxW, ctx5); const overT=tLines.length>tituloMaxLin;
  const tUse=tLines.slice(0,tituloMaxLin); let offY=(tUse.length===1)?30:0;
  tUse.forEach((l,i)=>ctx5.fillText(l, tituloX, tituloYBase + i*54 + offY));

  const descricao=(document.getElementById('descricao')?.value||'').trim();
  ctx5.font='28px "Comic Relief"'; ctx5.fillStyle='#333';
  const dX=400, dY=1050, dMaxW=600, dMaxLin=5;
  const parts=descricao.split('\n'); let all=[]; parts.forEach(l=>all.push(...wrapText(l,dMaxW,ctx5)));
  const overD=all.length>dMaxLin; all.slice(0,dMaxLin).forEach((l,i)=>ctx5.fillText(l, dX, dY + i*40));

  validationFlags.overflow=(overT||overD);
  updateStep5Warning();
}

/* =========================================================
   TARJAS / CATEGORIA
   ========================================================= */
function bindCategoriaRadios(){
  document.querySelectorAll('input[name="categoria"]').forEach(r=>{
    r.addEventListener('change', ()=> selectCategoria(r.value));
  });
  const pre=document.querySelector('input[name="categoria"]:checked');
  if(pre) selectCategoria(pre.value);
}
async function selectCategoria(value){
  categoriaSelecionada=value; tarjaCfg={...TARJAS[value]};
  try{ tarjaImg=await loadImage(tarjaCfg.src); }catch(e){ tarjaImg=null; }
  drawStep4(); drawStep5(); revalidateStepNav();
}

/* =========================================================
   ENVIO (Apps Script)
   ========================================================= */
async function enviarParaGoogle() {
  const obrig=['nome','email','telefone','empresa','site','insta','logo','lateral','titulo','descricao'];
  const faltando=obrig.filter(id=>{
    const el=document.getElementById(id);
    if(!el) return false;
    if(el.type==='file') return !(el.files && el.files.length);
    return !(el.value||'').trim();
  });
  const msg=document.getElementById('mensagem');
  if(faltando.length){
    msg.textContent='❌ Preencha todos os campos obrigatórios.'; msg.style.color='red'; msg.style.display='block'; return;
  }

  const toBase64=(file)=>new Promise((res,rej)=>{const r=new FileReader(); r.readAsDataURL(file); r.onload=()=>res(r.result); r.onerror=rej;});
  async function processarImagem(id){const f=document.getElementById(id).files[0]; if(!f) return null; const b64=await toBase64(f); return {name:f.name,type:f.type,content:b64.split(',')[1]};}

  const logoBase64=await processarImagem('logo');
  const lateralBase64=await processarImagem('lateral');
  const backgroundBase64=await processarImagem('background');

  let previewBase64=null; if(canvas5){const dataURL=canvas5.toDataURL('image/png'); previewBase64={name:'preview.png',type:'image/png',content:dataURL.split(',')[1]};}

  const dados={
    nome:document.getElementById('nome').value,
    email:document.getElementById('email').value,
    telefone:document.getElementById('telefone').value,
    empresa:document.getElementById('empresa').value,
    site:document.getElementById('site').value,
    insta:document.getElementById('insta').value,
    titulo:document.getElementById('titulo').value,
    descricao:document.getElementById('descricao').value,
    descricaolonga:document.getElementById('descricaolonga').value,
    legenda:buildCaptionFromForm(),
    logo:logoBase64,
    lateral:lateralBase64,
    background:backgroundBase64,
    preview:previewBase64,
    categoria:categoriaSelecionada||'',
    apoio_nX:nX, apoio_nY:nY, apoio_nW:nW
  };

  const overlay=document.getElementById('overlay'); if(overlay) overlay.style.display='flex';
  try{
    const response=await fetch('https://script.google.com/macros/s/AKfycbyMbkkFdzYC_BfMsi5WKW6xbOKdjbNbW635vovOLYHGXdso2S_1a2Wdfvur790y0BM46g/exec',{method:'POST',body:JSON.stringify(dados)});
    const result=await response.json();
    msg.style.display='block';
    if(result.status==='success'){
      msg.textContent='✅ Enviado com sucesso!'; msg.style.color='green';
      document.getElementById('step7').style.display='none';
      document.getElementById('wizard-indicator').style.display='none';
      document.getElementById('link-topo').style.display='none';
      document.getElementById('final-screen').style.display='block';
      window.scrollTo({ top:0, behavior:'smooth' });
    } else {
      msg.textContent='❌ Erro ao enviar: '+(result.message||'Tente novamente.'); msg.style.color='red';
    }
  } catch(err){
    msg.textContent='❌ Erro de rede. Tente novamente.'; msg.style.color='red'; msg.style.display='block'; console.error(err);
  } finally {
    if(overlay) overlay.style.display='none';
    setTimeout(()=>{ if(msg) msg.textContent=''; }, 5000);
  }
}

/* =========================================================
   AUTH / WIZARD
   ========================================================= */
const API_URL='https://script.google.com/macros/s/AKfycbyMbkkFdzYC_BfMsi5WKW6xbOKdjbNbW635vovOLYHGXdso2S_1a2Wdfvur790y0BM46g/exec';
const PAGINA='expo_market';
async function checkAuth(){
  const chave=(localStorage.getItem('chave')||'').trim();
  if(!chave){ alert('Faça login primeiro.'); window.location.href='index.html'; return; }
  const resp=await fetch(`${API_URL}?chave=${encodeURIComponent(chave)}&pagina=${encodeURIComponent(PAGINA)}`);
  const data=await resp.json();
  if(!data.permitido){ alert('Você não tem permissão para acessar esta página.'); window.location.href='index.html'; }
}

const REQUIRED_BY_STEP={1:[],2:['nome','email','telefone'],3:['empresa','site','insta'],4:['logo','lateral'],5:['titulo','descricao'],6:[]};
const STEP_VALIDATORS={
  2:()=>{const email=(document.getElementById('email').value||'').trim(); const okEmail=EMAIL_REGEX.test(email); showFieldError('email', okEmail?'':'Informe um e-mail válido.');
         const raw=(document.getElementById('telefone').value||'').replace(/\D/g,''); const okTel=PHONE_ALLOWED_LENGTHS.includes(raw.length); showFieldError('telefone', okTel?'':'Telefone com DDD (10 ou 11 dígitos).'); return okEmail&&okTel;},
  3:()=>{const siteInput=document.getElementById('site'); let url=normalizeUrlMaybe(siteInput.value); let okSite=false;
         try{const u=new URL(url); okSite=!!u.hostname&&u.hostname.includes('.'); if(okSite) siteInput.value=url;}catch{okSite=false;}
         showFieldError('site', okSite?'':'Digite um site válido. Ex.: https://suaempresa.com');
         const instaInput=document.getElementById('insta'); let ig=(instaInput.value||'').trim(); const okInsta=INSTA_REGEX.test(ig);
         showFieldError('insta', okInsta?'':'Use apenas letras, números, ponto e underline.'); if(okInsta){ ig=ig.replace(/^@?/, '@'); instaInput.value=ig.toLowerCase(); }
         return okSite && okInsta;},
  5:()=>{const t=(document.getElementById('titulo').value||'').trim(); const d=(document.getElementById('descricao').value||'').trim();
         let ok=true; step5Messages.charError='';
         if(t.length<CHAR_LIMITS.titulo.min||t.length>CHAR_LIMITS.titulo.max){ step5Messages.charError=`* O título deve ter entre ${CHAR_LIMITS.titulo.min} e ${CHAR_LIMITS.titulo.max} caracteres.`; ok=false; }
         else if(d.length<CHAR_LIMITS.descricao.min||d.length>CHAR_LIMITS.descricao.max){ step5Messages.charError=`* A descrição deve ter entre ${CHAR_LIMITS.descricao.min} e ${CHAR_LIMITS.descricao.max} caracteres.`; ok=false; }
         const selected=document.querySelector('input[name="categoria"]:checked'); const catErr=document.getElementById('categoriaError');
         if(!selected){ ok=false; catErr && (catErr.textContent='Selecione uma categoria para continuar.'); } else { catErr && (catErr.textContent=''); }
         updateStep5Warning(); if(validationFlags.overflow) ok=false; return ok;},
  7:()=>{ buildReview(); return true; }
};

function isFilled(id){ const el=document.getElementById(id); if(!el) return true; if(el.type==='file') return el.files && el.files.length>0; return (el.value||'').trim().length>0; }
function markValidity(ids=[]){ ids.forEach(id=>{ const el=document.getElementById(id); if(!el) return; el.classList.remove('invalid'); if(!isFilled(id)) el.classList.add('invalid'); }); }
function validateStep(stepNumber){
  const required=REQUIRED_BY_STEP[stepNumber] || []; markValidity(required);
  let ok = required.every(isFilled); if(!ok) return false;
  const fn=STEP_VALIDATORS[stepNumber]; if(fn && fn()===false) return false;
  return true;
}
function revalidateStepNav(){
  const active=steps[currentStep-1]; const nextBtn=active?.querySelector('[data-next]'); if(!nextBtn) return;
  if(currentStep===1){ nextBtn.disabled=false; return; }
  nextBtn.disabled=!validateStep(currentStep);
}

let steps=[], totalSteps=0, currentStep=1;
function updateIndicator(){ const ind=document.getElementById('wizard-indicator'); if(ind) ind.textContent=`Etapa ${currentStep} de ${totalSteps}`; }
function showStep(n){
  currentStep=Math.max(1, Math.min(totalSteps, n));
  steps.forEach((el,idx)=>{ const active=(idx===currentStep-1); el.classList.toggle('active', active); el.style.display=active?'block':'none'; });
  if(currentStep===4) drawStep4();
  if(currentStep===5) drawStep5();
  if(currentStep===7) buildReview();
  updateIndicator(); revalidateStepNav();
  window.scrollTo({ top:0, behavior:'smooth' });
}
function buildReview(){
  const box=document.getElementById('review-list'); if(!box) return;
  const parts=REVIEW_FIELDS.map(({id,label,format})=>{
    const el=document.getElementById(id); let val=''; if(el){ if(el.type==='file') val=(el.files&&el.files[0])?el.files[0].name:'—'; else val=(el.value||'').trim(); }
    if(typeof format==='function') val=format(val); if(!val) val='—';
    return `<div class="review-item"><span class="review-label">${label}:</span><div class="review-value">${escapeHtml(val)}</div></div>`;
  });
  box.innerHTML=parts.join('');
}
function setupWizard(){
  steps = Array.from(document.querySelectorAll('.step'));
  totalSteps = steps.length;

  const tel = document.getElementById('telefone');
  tel?.addEventListener('input', e=>{ const only=e.target.value.replace(/\D/g,'').slice(0,11); e.target.value=formatPhone(only); });

  document.addEventListener('input', e=>{ const active=steps[currentStep-1]; if(!active?.contains(e.target)) return; revalidateStepNav(); });
  document.addEventListener('change', e=>{ const active=steps[currentStep-1]; if(!active?.contains(e.target)) return; revalidateStepNav(); });
  document.addEventListener('click', e=>{
    if(e.target.matches('[data-next]')){ if(validateStep(currentStep)){ if(currentStep===4) savePos(); showStep(currentStep+1); } }
    if(e.target.matches('[data-prev]')) showStep(currentStep-1);
  });

  showStep(1);
}

/* =========================================================
   MENU
   ========================================================= */
function goToMenu(){
  const base = location.href.replace(/[^/]+$/, '');
  window.location.href = base + 'index.html?back=1';
}

/* =========================================================
   EXPORTS GLOBAIS QUE O HTML USA
   ========================================================= */
window.enviarParaGoogle = enviarParaGoogle;
window.goToMenu = goToMenu;
