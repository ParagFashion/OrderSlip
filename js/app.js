// app.js - main application logic
const app = (() => {
  // DOM refs
  const chartSelect = document.getElementById('chartSelect');
  const startBtn = document.getElementById('startBtn');
  const resumeBtn = document.getElementById('resumeBtn');
  const shopCode = document.getElementById('shopCode');
  const orderBy = document.getElementById('orderBy');
  const startFrom = document.getElementById('startFrom');
  const prefix = document.getElementById('prefix');
  const defaultQty = document.getElementById('defaultQty');
  const cols = document.getElementById('cols');

  const pageStart = document.getElementById('pageStart');
  const pageOrder = document.getElementById('pageOrder');
  const pagePrint = document.getElementById('pagePrint');

  // preview elements
  const cropContainer = document.getElementById('cropContainer');
  const chartImg = document.getElementById('chartImg');
  const fullContainer = document.getElementById('fullContainer');
  const chartFullImg = document.getElementById('chartFullImg');
  const highlightBox = document.getElementById('highlightBox');
  const colorLabel = document.getElementById('colorLabel');

  // live controls
  const livePrefix = document.getElementById('livePrefix');
  const liveNumber = document.getElementById('liveNumber');
  const liveQty = document.getElementById('liveQty');
  const yesBtn = document.getElementById('yesBtn');
  const noBtn = document.getElementById('noBtn');
  const seeListBtn = document.getElementById('seeListBtn');
  const backStartBtn = document.getElementById('backStartBtn');

  // print/list
  const orderGrid = document.getElementById('orderGrid');
  const pShop = document.getElementById('pShop');
  const pDate = document.getElementById('pDate');
  const pChartName = document.getElementById('pChartName');
  const pOrderBy = document.getElementById('pOrderBy');
  const pRemarks = document.getElementById('pRemarks');
  const pTotalItems = document.getElementById('pTotalItems');
  const pTotalQty = document.getElementById('pTotalQty');
  const countItems = document.getElementById('countItems');
  const countQty = document.getElementById('countQty');
  const remarks = document.getElementById('remarks');
  const printBtn = document.getElementById('printBtn');
  const backOrderBtn = document.getElementById('backOrderBtn');

  // popup
  const popup = document.getElementById('popup');
  const popCode = document.getElementById('popCode');
  const popQty = document.getElementById('popQty');
  const popExtra = document.getElementById('popExtra');
  const popColor = document.getElementById('popColor');
  const popUpdate = document.getElementById('popUpdate');
  const popDelete = document.getElementById('popDelete');
  const popClose = document.getElementById('popClose');

  // state
  let chartsRegistry = null;
  let chartData = null;   // loaded chart JSON
  let currentChartName = '';
  let items = [];         // { code, qty, number, extra, color }
  let current = 0;
  let started = false;
  let isFullView = false;
  let activeIndex = null;

  // load charts registry
  async function loadChartsRegistry() {
    try {
      const res = await fetch('charts/charts.json');
      chartsRegistry = await res.json();
      populateChartSelect();
    } catch (err) {
      console.error('Failed to load charts registry', err);
      alert('Unable to load charts registry (charts/charts.json). Put charts JSON in place.');
    }
  }

  function populateChartSelect(){
    if(!chartsRegistry || !chartsRegistry.charts) return;
    chartSelect.innerHTML = '';
    chartsRegistry.charts.forEach(ch=>{
      const opt = document.createElement('option');
      opt.value = ch.json_url;
      opt.textContent = ch.name;
      chartSelect.appendChild(opt);
    });
  }

  // load selected chart JSON
  async function loadChart(jsonUrl){
    try {
      const res = await fetch(jsonUrl);
      chartData = await res.json();
      currentChartName = chartData.name || '';
    } catch (err) {
      console.error('failed to load chart json', err);
      alert('Unable to load chart JSON: ' + jsonUrl);
    }
  }

  function showPage(id){
    document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
    document.getElementById(id).classList.add('active');
  }

  // start ordering fresh
  async function startOrdering(){
    const selected = chartSelect.value;
    if(!selected){
      alert('Select a chart first');
      return;
    }
    await loadChart(selected);
    items = [];
    current = +startFrom.value;
    liveNumber.value = current;
    liveQty.value = defaultQty.value;
    livePrefix.value = prefix.value;
    started = true;
    isFullView = false;
    //hideFullView();
    updatePreview();
    updateCount();
    resumeBtn.style.display = 'none';
    showPage('pageOrder');
  }

  function resumeOrdering(){
    if(!chartSelect.value){
      alert('Select a chart first');
      return;
    }
    loadChart(chartSelect.value).then(()=> {
      livePrefix.value = prefix.value;
      liveQty.value = defaultQty.value;
      updateLiveDisplay();
      updateCount();
      showPage('pageOrder');
    });
  }

  function backToStart(){
    if(started) resumeBtn.style.display = 'inline-block';
    showPage('pageStart');
  }

  function updateLiveDisplay(){
    liveNumber.value = current;
    updatePreview();
  }

  // manual change of live number
  function changeLiveNumber(){
    const v = +liveNumber.value;
    if(Number.isFinite(v)) {
      current = v;
      updatePreview();
    }
  }

  // update preview: load page image and compute crop
  function updatePreview(){
      // If already in full view, update highlight for new item
    if(isFullView){
       setTimeout(refreshFullHighlight, 50);
    }
    if(!chartData) {
      chartImg.src = '';
      chartFullImg.src = '';
      colorLabel.textContent = 'Color: -';
      return;
    }
    const item = chartData.items && chartData.items[current];
    if(!item){
      // no mapping for this number
      chartImg.src = '';
      chartFullImg.src = '';
      colorLabel.textContent = 'Color: -';
      // show "no image" placeholder or blank
      cropContainer.style.background = '#f5f5f5';
      // hide highlight if any
      highlightBox.style.display = 'none';
      return;
    }

    // set label
    colorLabel.textContent = item.color ? ('Color: ' + item.color) : 'Color: -';

    // find page entry
    const page = (chartData.pages || []).find(p => p.id === item.page);
    if(!page){
      chartImg.src = '';
      chartFullImg.src = '';
      return;
    }
    const imgSrc = page.image;

    // set images
    chartImg.style.visibility = 'hidden';
    chartImg.src = imgSrc;

    // also prepare full image
    chartFullImg.src = imgSrc;

    // when chartImg loads we will compute crop
    chartImg.onload = () => {
      // desired display crop size (we will enlarge cropped area to this container)
      const displayW = cropContainer.clientWidth;
      const scaleForWidth = displayW / item.w;
      const displayH = Math.round(item.h * scaleForWidth);

      // set container size to display crop size
      cropContainer.style.height = displayH + 'px';

      // compute scale relative to natural image
      const natW = chartImg.naturalWidth;
      const natH = chartImg.naturalHeight;

      // the image needs to be scaled so that item.w in natural px becomes displayW
      const scale = displayW / item.w;
      const newImgW = Math.round(natW * scale);
      const newImgH = Math.round(natH * scale);

      // position image so that crop region (item.x,item.y) aligns in container
      chartImg.style.position = 'absolute';
      chartImg.style.left = (-item.x * scale) + 'px';
      chartImg.style.top = (-item.y * scale) + 'px';
      chartImg.style.width = newImgW + 'px';
      chartImg.style.height = newImgH + 'px';
      chartImg.style.visibility = 'visible';

      // hide full view highlight
      highlightBox.style.display = 'none';
    };

    // full image onload sets highlight box scaling when toggled
    chartFullImg.onload = () => {
      // nothing here until user toggles full view
    };
  }


  // toggle between cropped preview and full chart
  function toggleFullView(){

  if(!chartData) return;

  isFullView = !isFullView;

  if(isFullView){

    document.getElementById('cropContainer').style.display = 'none';
    fullContainer.style.display = 'block';

    refreshFullHighlight();

  } else {

    document.getElementById('cropContainer').style.display = 'block';
    fullContainer.style.display = 'none';
    highlightBox.style.display = 'none';

    // 🔥 IMPORTANT FIX
    updatePreview();   // <-- refresh crop immediately
  }
}

function refreshFullHighlight(){

  if(!chartData) return;

  const item = chartData.items && chartData.items[current];
  if(!item) {
    highlightBox.style.display = 'none';
    return;
  }

  const page = (chartData.pages || []).find(p => p.id === item.page);
  if(!page) return;

  // Always ensure correct image
  if(chartFullImg.src !== page.image){
    chartFullImg.src = page.image;
  }

  function positionBox(){

    const scaleX = chartFullImg.clientWidth / chartFullImg.naturalWidth;
    const scaleY = chartFullImg.clientHeight / chartFullImg.naturalHeight;

    highlightBox.style.left = (item.x * scaleX) + 'px';
    highlightBox.style.top = (item.y * scaleY) + 'px';
    highlightBox.style.width = (item.w * scaleX) + 'px';
    highlightBox.style.height = (item.h * scaleY) + 'px';
    highlightBox.style.display = 'block';
  }

  if(chartFullImg.complete && chartFullImg.naturalWidth){
    positionBox();
  } else {
    chartFullImg.onload = positionBox;
  }
}

function updateFullHighlight(item){

  function positionBox(){

    const dispW = chartFullImg.clientWidth;
    const natW = chartFullImg.naturalWidth;

    if(!natW) return;

    const scale = dispW / natW;

    highlightBox.style.left = (item.x * scale) + 'px';
    highlightBox.style.top = (item.y * scale) + 'px';
    highlightBox.style.width = (item.w * scale) + 'px';
    highlightBox.style.height = (item.h * scale) + 'px';
    highlightBox.style.display = 'block';
  }

  // If image already loaded
  if(chartFullImg.complete && chartFullImg.naturalWidth){
    positionBox();
  } else {
    chartFullImg.onload = positionBox;
  }
}

  // add or update item when YES pressed - prevents duplicates
  function yesItem(){
    const number = current;
    const codeValue = (livePrefix.value ? (livePrefix.value + '-' + number) : number.toString());
    const q = +liveQty.value || 0;

    // check existing by number
    const existingIndex = items.findIndex(it => it.number === number);
    if(existingIndex !== -1){
      items[existingIndex].code = codeValue;
      items[existingIndex].qty = q;
      // keep existing extra/color unless overwritten via popup edit
    } else {
      // find color from chart mapping if available
      const map = chartData && chartData.items && chartData.items[number];
      const color = map && map.color ? map.color : '';
      items.push({ code: codeValue, qty: q, number: number, extra: '', color });
    }

    // advance
    current++;
    updateLiveDisplay();
    updateCount();
  }

  function noItem(){
    current++;
    updateLiveDisplay();
  }

  // update counts
  function updateCount(){
    countItems.innerText = items.length;
    countQty.innerText = items.reduce((s,i)=>s + (+i.qty||0),0);
  }

  // render print/list (grid) - clicking a cell edits item
  function renderPrint(){
    document.documentElement.style.setProperty('--cols', cols.value || 5);

    pShop.innerText = shopCode.value;
    pDate.innerText = new Date().toLocaleDateString('en-GB').replaceAll('/','-');
    pChartName.innerText = currentChartName;
    pOrderBy.innerText = orderBy.value;
    pRemarks.innerText = remarks.value;

    orderGrid.innerHTML = '';
    let tq = 0;

    // sort by number for display
    const sorted = items.slice().sort((a,b)=>a.number - b.number);
    sorted.forEach((it) => {
      tq += +it.qty;
      const d = document.createElement('div');
      d.className = 'cell';
      d.innerHTML = `
        <div class="cell-inner">
          ${it.extra ? `<div class="extra">${escapeHtml(it.extra)}</div>` : ''}
          <div class="code">${escapeHtml(it.code)}</div>
          <div class="line"></div>
          <div class="qty">${escapeHtml(String(it.qty))}</div>
        </div>
      `;

      // clicking must open popup for that original item index
      d.addEventListener('click', () => {
        // find original index by number (should be unique)
        const origIndex = items.findIndex(x => x.number === it.number);
        if(origIndex !== -1) openPopup(origIndex);
      });

      orderGrid.appendChild(d);
    });

    pTotalItems.innerText = items.length;
    pTotalQty.innerText = tq;
    updateCount();
  }

  // popup operations
  function openPopup(index){
    activeIndex = index;
    const it = items[index];
    popCode.value = it.code;
    popQty.value = it.qty;
    popExtra.value = it.extra || '';
    popColor.value = it.color || '';
    popup.style.display = 'flex';
  }
  function closePopup(){
    popup.style.display = 'none';
    activeIndex = null;
  }
  function updateItem(){
    if(activeIndex === null) return;
    items[activeIndex].code = popCode.value;
    items[activeIndex].qty = +popQty.value;
    items[activeIndex].extra = popExtra.value;
    items[activeIndex].color = popColor.value;
    renderPrint();
    closePopup();
  }
  function deleteItem(){
    if(activeIndex === null) return;
    items.splice(activeIndex,1);
    renderPrint();
    closePopup();
  }

  // print using a clean popup window (keeps layout EXACT like original print grid)
  function doPrintWindow(){
    // build HTML that mirrors the print layout you already liked
    const sorted = items.slice().sort((a,b)=>a.number - b.number);
    const colsCount = +cols.value || 5;
    const pageTitle = currentChartName || 'Chart';

    let html = `
<!doctype html>
<html>
<head>
<meta charset="utf-8"/>
<title>${escapeHtml(pageTitle)} - Print</title>
<style>
body{font-family:Arial, sans-serif; padding:16px; color:#000}
.header{display:flex;justify-content:space-between;font-size:28px;color:#000;margin:0 10%}
.party{text-align:center;font-size:26px;margin:10px 0}
.grid{display:grid;grid-template-columns:repeat(${colsCount},1fr);gap:10px}
.cell{min-height:80px;border-radius:8px;padding:8px;text-align:center;}
.code{font-size:20px}
.qty{font-size:20px}
.line{width:60%;margin:6px auto;border-top:2px solid #000}
.footer{display:flex;justify-content:space-between;margin-top:12px}
</style>
</head>
<body>
<div class="header"><div>Shop: ${escapeHtml(shopCode.value)}</div><div>Date: ${escapeHtml(new Date().toLocaleDateString('en-GB'))}</div></div>
<div class="party">${escapeHtml(pageTitle)}</div>
<hr>
<div class="grid">
`;

    sorted.forEach(it => {
      html += `<div class="cell">
        <div class="code">${escapeHtml(it.code)}</div>
        <div class="line"></div>
        <div class="qty">${escapeHtml(String(it.qty))}</div>
      </div>`;
    });

    html += `
</div>
<hr>
<div class="footer"><div>Order By: ${escapeHtml(orderBy.value)}<br>Remarks: ${escapeHtml(remarks.value)}</div><div>Items: ${sorted.length}<br>Qty: ${sorted.reduce((s,i)=>s + (+i.qty||0),0)}</div></div>
</body>
</html>`;

    const w = window.open('', '_blank');
    w.document.write(html);
    w.document.close();
    // call print after short timeout to ensure rendering
    setTimeout(()=>{ w.print(); }, 300);
  }

  // helper: escape HTML
  function escapeHtml(str){
    if(!str) return '';
    return String(str)
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;');
  }

  // attach event listeners
  function attachEvents(){
    startBtn.addEventListener('click', startOrdering);
    resumeBtn.addEventListener('click', resumeOrdering);
    backStartBtn.addEventListener('click', backToStart);

    document.getElementById('seeListBtn').addEventListener('click', () => {
      renderPrint();
      showPage('pagePrint');
    });

    yesBtn.addEventListener('click', yesItem);
    noBtn.addEventListener('click', noItem);

    // preview click toggles full view
    chartImg.parentElement.addEventListener('click', () => {
      toggleFullView();
    });
    chartFullImg.parentElement.addEventListener('click', () => {
      toggleFullView();
    });

    // popup events
    popClose.addEventListener('click', closePopup);
    popUpdate.addEventListener('click', updateItem);
    popDelete.addEventListener('click', deleteItem);

    // list page controls
    printBtn.addEventListener('click', doPrintWindow);
    backOrderBtn.addEventListener('click', () => showPage('pageOrder'));
  }

  // public API for small calls used inline in HTML
  function changeLiveNumber(){
    changeLiveNumber_internal();
  }

  function changeLiveNumber_internal(){
    const v = +liveNumber.value;
    if(Number.isFinite(v)){
      current = v;
      updatePreview();
    }
  }

  // init
  function init(){
    attachEvents();
    loadChartsRegistry();
    // default: hide full container
    document.getElementById('fullContainer').style.display = 'none';
  }

  // expose needed functions (used by inline handlers too)
  return {
    init,
    startOrdering,
    resumeOrdering,
    changeLiveNumber: changeLiveNumber_internal,
    updatePreview,
    renderPrint: renderPrint,
    yesItem,
    noItem
  };
})();

document.addEventListener('DOMContentLoaded', ()=>{ app.init(); });
