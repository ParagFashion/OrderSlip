document.addEventListener("DOMContentLoaded", () => {
  
  let chartData = null;
  let chartNumbers = [];
  let currentIndex = 0;
  let items = [];
  let isFull = false;
  let activeIndex = null;
  
  const $ = id => document.getElementById(id);
  const bind = (id, fn) => {
    const el = $(id);
    if (el) el.onclick = fn;
  };
  
  // DOM
  const chartSelect = $("chartSelect");
  const cropContainer = document.querySelector(".crop-container");
  const fullContainer = document.querySelector(".full-container");
  const chartImg = $("chartImg");
  const chartFullImg = $("chartFullImg");
  const highlightBox = document.querySelector(".highlight-box");
  const orderGrid = document.querySelector(".order-grid");
  const popup = document.querySelector(".popup");
  
  // Load chart list
  fetch("charts/charts.json")
    .then(r => r.json())
    .then(data => {
      data.charts.forEach(c => {
        const opt = document.createElement("option");
        opt.value = c.json_url;
        opt.textContent = c.name;
        chartSelect.appendChild(opt);
      });
    });
  
  // START
  bind("startBtn", async () => {
    
    const res = await fetch(chartSelect.value);
    chartData = await res.json();
    
    chartNumbers = Object.keys(chartData.items)
      .map(n => parseInt(n))
      .sort((a, b) => a - b);
    
    currentIndex = 0;
    items = [];
    
    $("liveQty").value = $("defaultQty").value;
    
    showPage("pageOrder");
    updatePreview();
    updateCount();
  });
  
  // PREVIEW
  function updatePreview() {
    
    const number = chartNumbers[currentIndex];
    $("liveNumber").value = number;
    
    const item = chartData.items[String(number)];
    if (!item) return;
    
    const page = chartData.pages.find(p => p.id === item.page);
    if (!page) return;
    
    chartImg.src = page.image;
    chartFullImg.src = page.image;
    
    chartImg.onload = () => {
      const displayW = cropContainer.clientWidth;
      const scale = displayW / item.w;
      
      chartImg.style.position = "absolute";
      chartImg.style.left = (-item.x * scale) + "px";
      chartImg.style.top = (-item.y * scale) + "px";
      chartImg.style.width = (chartImg.naturalWidth * scale) + "px";
    };
  }
  
  // TOGGLE FULL
  cropContainer.onclick = () => toggleFull();
  fullContainer.onclick = () => toggleFull();
  
  function toggleFull() {
    isFull = !isFull;
    
    cropContainer.style.display = isFull ? "none" : "block";
    fullContainer.style.display = isFull ? "block" : "none";
    
    if (isFull) highlightBoxPosition();
    else highlightBox.style.display = "none";
  }
  
  function highlightBoxPosition() {
    
    const number = chartNumbers[currentIndex];
    const item = chartData.items[String(number)];
    if (!item) return;
    
    const scale = chartFullImg.clientWidth / chartFullImg.naturalWidth;
    
    highlightBox.style.left = (item.x * scale) + "px";
    highlightBox.style.top = (item.y * scale) + "px";
    highlightBox.style.width = (item.w * scale) + "px";
    highlightBox.style.height = (item.h * scale) + "px";
    highlightBox.style.display = "block";
  }
  
  // YES
  bind("yesBtn", () => {
    
    const number = chartNumbers[currentIndex];
    const qty = parseInt($("liveQty").value) || 0;
    
    const existing = items.find(i => i.number === number);
    
    if (existing) {
      existing.qty = qty;
    } else {
      items.push({
        number,
        code: number.toString(),
        qty,
        extra: "",
        color: chartData.items[String(number)].color || ""
      });
    }
    
    nextItem();
    updateCount();
  });
  
  // NO
  bind("noBtn", () => nextItem());
  
  function nextItem() {
    if (currentIndex < chartNumbers.length - 1) {
      currentIndex++;
      updatePreview();
    }
  }
  
  // COUNT
  function updateCount() {
    $("countItems").innerText = items.length;
    $("countQty").innerText =
      items.reduce((s, i) => s + i.qty, 0);
  }
  
  // SEE LIST
  bind("seeListBtn", () => {
    renderPrint();
    showPage("pagePrint");
  });
  
  // PRINT PAGE
  function renderPrint() {
    
    document.documentElement.style.setProperty("--cols", $("cols").value || 5);
    
    $("pShop").innerText = $("shopCode").value;
    $("pDate").innerText = new Date().toLocaleDateString("en-GB");
    $("pChartName").innerText = chartData.name;
    $("pOrderBy").innerText = $("orderBy").value;
    $("pRemarks").innerText = "";
    
    orderGrid.innerHTML = "";
    
    let total = 0;
    
    items.sort((a, b) => a.number - b.number)
      .forEach((it, index) => {
        
        total += it.qty;
        
        const cell = document.createElement("div");
        cell.className = "cell";
        
        cell.innerHTML = `
      <div class="cell-inner">
        ${it.extra?`<div class="extra">${it.extra}</div>`:""}
        <div class="code">${it.code}</div>
        <div class="line"></div>
        <div class="qty">${it.qty}</div>
      </div>
    `;
        
        cell.onclick = () => openPopup(index);
        
        orderGrid.appendChild(cell);
      });
    
    $("pTotalItems").innerText = items.length;
    $("pTotalQty").innerText = total;
  }
  
  // POPUP
  function openPopup(index) {
    
    activeIndex = index;
    const it = items[index];
    
    $("popCode").value = it.code;
    $("popQty").value = it.qty;
    $("popExtra").value = it.extra;
    $("popColor").value = it.color;
    
    popup.style.display = "flex";
  }
  
  bind("popUpdate", () => {
    const it = items[activeIndex];
    it.code = $("popCode").value;
    it.qty = parseInt($("popQty").value) || 0;
    it.extra = $("popExtra").value;
    it.color = $("popColor").value;
    popup.style.display = "none";
    renderPrint();
  });
  
  bind("popDelete", () => {
    items.splice(activeIndex, 1);
    popup.style.display = "none";
    renderPrint();
  });
  
  bind("popClose", () => popup.style.display = "none");
  
  bind("printBtn", () => window.print());
  bind("backOrderBtn", () => showPage("pageOrder"));
  
  function showPage(id) {
    document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
    $(id).classList.add("active");
  }
  
});