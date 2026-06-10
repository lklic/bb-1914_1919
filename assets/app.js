'use strict';
let DATA = null, book = null, idx = 0, twoUp = true, viewer = null;

// GitHub repo hosting the transcription Markdown sources (md paths in data.json
// are relative to the repo root). Used to build "edit on GitHub" links.
const GH_EDIT_BASE = 'https://github.com/lklic/bb-1914_1919/edit/main/';

const $ = s => document.querySelector(s);
const esc = s => (s == null ? '' : String(s)).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

// Render an uncertain-aware, place-aware handwritten line.
function renderHand(line){
  let h = esc(line);
  h = h.replace(/\[\?\]/g, '<span class="unc">[?]</span>')
       .replace(/\[illegible\]/gi, '<span class="unc">[illegible]</span>');
  // emphasise BLOCK-CAPITAL place words (>=3 consecutive caps)
  h = h.replace(/\b([A-ZÀ-Þ]{3,}(?:\s+[A-ZÀ-Þ]{2,})*)\b/g, '<span class="caps">$1</span>');
  return h;
}

function dayHTML(d){
  const lines = (d.hand_lines || []).filter(x => x && x.trim());
  const body = lines.length
    ? lines.map(l => `<span class="hand">${renderHand(l)}</span>`).join('')
    : `<span class="hand empty">— no writing —</span>`;
  return `<div class="day">
    <div class="dateline"><span class="date">${esc(d.date||'')}</span>${d.weekday?`<span class="wd">${esc(d.weekday)}</span>`:''}</div>
    ${d.printed_note?`<div class="pnote">${esc(d.printed_note)}</div>`:''}
    ${body}
  </div>`;
}

function chips(arr, cls){
  if(!arr || !arr.length) return '';
  return `<div class="chips">${arr.filter(Boolean).map(p=>`<span class="chip ${cls}">${esc(p)}</span>`).join('')}</div>`;
}

function pageBlockHTML(p, sideLabel){
  const days = (p.days||[]).map(dayHTML).join('');
  const loose = (p.loose_text&&p.loose_text.length)
    ? `<div class="loose">${p.loose_text.map(l=>`<span class="hand">${renderHand(l)}</span>`).join('')}</div>` : '';
  const empty = (!days && !loose) ? `<div class="hand empty">— blank / no writing on this page —</div>`:'';
  const editLink = p.md
    ? `<a class="editlink" href="${esc(GH_EDIT_BASE + p.md)}" target="_blank" rel="noopener" title="Edit this page's transcription on GitHub">✎ Edit transcription</a>`
    : '';
  return `<div class="pageblock">
    <div class="sidehead">${esc(sideLabel)} · page ${p.seq}<span class="ptype">${esc(p.page_type||'')}</span>${editLink}</div>
    ${days}${loose}${empty}
    ${chips(p.places,'place')}${chips(p.people,'person')}
    ${p.notes?`<div class="notes">${esc(p.notes)}</div>`:''}
  </div>`;
}

function pages(){ return book.pages; }

function currentPair(){
  // In two-up mode, show a left+right spread (left = odd seq). Anchor to spread.
  const p = pages()[idx];
  if(!twoUp) return [p];
  if(p.side === 'left'){ const r = pages()[idx+1]; return r && r.spread===p.spread ? [p, r] : [p]; }
  const l = pages()[idx-1]; return l && l.spread===p.spread ? [l, p] : [p];
}

function loadImages(list){
  // gutter-aligned halves placed edge-to-edge => seamless spine in two-up
  const items = list.map((p,i)=>({
    tileSource:{type:'image', url:p.image},
    x: i*1.0, y:0, width:1
  }));
  viewer.open(items);
}

function render(){
  const list = currentPair();
  const first = list[0];
  // normalise idx to the left page of the pair for stable nav
  loadImages(list);
  // transcription
  $('#transBody').innerHTML = list.map(p=>pageBlockHTML(p, p.side==='left'?'Left page':'Right page')).join('');
  $('#transBody').scrollTop = 0;
  // labels
  const dr = list.map(p=>p.days&&p.days.length?p.days.map(d=>d.date).filter(Boolean).join(', '):'').filter(Boolean).join('  ·  ');
  $('#pageLabel').textContent = `${book.label}  —  ${list.length>1?`pp. ${list[0].seq}–${list[list.length-1].seq}`:`p. ${first.seq}`}${dr?`  ·  ${dr}`:''}`;
  const locs = [...new Set(list.map(p=>p.location).filter(Boolean))];
  $('#locBadge').textContent = locs.length?`📍 ${locs.join(' · ')}`:'';
  $('#pageRange').value = idx;
  history.replaceState(null,'',`#${book.id}/${first.seq}`);
  // filmstrip active
  document.querySelectorAll('.filmstrip img').forEach(im=>im.classList.toggle('active', list.some(p=>p.seq==im.dataset.seq)));
  const active = $('.filmstrip img.active'); if(active) active.scrollIntoView({inline:'center',block:'nearest',behavior:'smooth'});
  $('#prev').disabled = idx<=0;
  $('#next').disabled = idx>=pages().length-1;
}

function clampIdx(i){ return Math.max(0, Math.min(pages().length-1, i)); }

function step(dir){
  if(twoUp){
    let cur = idx; if(pages()[cur].side==='right') cur--;     // anchor to left of pair
    idx = clampIdx(cur + dir*2);
    if(pages()[idx].side==='right' && idx>0) idx--;
  }else{
    idx = clampIdx(idx + dir);
  }
  render();
}

function gotoSeq(seq){
  idx = Math.max(0, Math.min(pages().length-1, seq-1));
  if(twoUp){ const p=pages()[idx]; if(p.side==='right'&&idx>0) idx--; }
  render();
}

function buildFilmstrip(){
  const fs = $('#filmstrip'); fs.innerHTML='';
  pages().forEach(p=>{
    const im = document.createElement('img');
    im.src = p.thumb || p.image; im.dataset.seq = p.seq; im.loading='lazy';
    im.title = `p.${p.seq}${p.location?' · '+p.location:''}`;
    im.onclick = ()=>gotoSeq(p.seq);
    fs.appendChild(im);
  });
}

function selectBook(id){
  book = DATA.books.find(b=>b.id===id);
  idx = 0;
  document.querySelectorAll('#bookTabs button').forEach(b=>b.classList.toggle('active', b.dataset.id===id));
  $('#manifestLink').href = book.manifest || '#';
  $('#pageRange').max = pages().length-1;
  buildFilmstrip();
  render();
}

function initViewer(){
  viewer = OpenSeadragon({
    element: $('#osd'), prefixUrl:'https://cdn.jsdelivr.net/npm/openseadragon@4.1.0/build/openseadragon/images/',
    showNavigationControl:true, navigatorPosition:'BOTTOM_RIGHT', showNavigator:false,
    gestureSettingsMouse:{clickToZoom:false}, animationTime:.4, springStiffness:8,
    background:'#100f0d', minZoomImageRatio:.6, maxZoomPixelRatio:3, visibilityRatio:.9
  });
}

function bind(){
  $('#prev').onclick=()=>step(-1);
  $('#next').onclick=()=>step(1);
  $('#pageRange').oninput=e=>{ idx=+e.target.value; if(twoUp){const p=pages()[idx]; if(p.side==='right'&&idx>0) idx--;} render(); };
  $('#viewToggle').onclick=()=>{ twoUp=!twoUp; $('#viewToggle').textContent=twoUp?'Two-page':'Single'; render(); };
  document.addEventListener('keydown',e=>{
    if(e.target.tagName==='INPUT') return;
    if(e.key==='ArrowLeft') step(-1);
    else if(e.key==='ArrowRight') step(1);
    else if(e.key==='f' && viewer) viewer.viewport.goHome();
  });
}

(async function(){
  try{
    DATA = await (await fetch('data.json',{cache:'no-store'})).json();
    document.title = DATA.title || document.title;
    const tabs = $('#bookTabs');
    DATA.books.forEach(b=>{
      const btn=document.createElement('button'); btn.textContent=b.label; btn.dataset.id=b.id;
      btn.onclick=()=>selectBook(b.id); tabs.appendChild(btn);
    });
    initViewer(); bind();
    const m = decodeURIComponent(location.hash.slice(1)).split('/');
    const startBook = DATA.books.find(b=>b.id===m[0]) ? m[0] : DATA.books[0].id;
    selectBook(startBook);
    if(m[1]) gotoSeq(+m[1]);
    $('#loading').classList.add('hidden');
    $('#viewToggle').textContent = twoUp?'Two-page':'Single';
  }catch(err){
    $('#loading').textContent='Failed to load data.json — '+err.message;
    console.error(err);
  }
})();
