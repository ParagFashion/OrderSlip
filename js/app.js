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
  const liveSelect = $("liveNumber");
  
  // ================= LOAD CHART LIST =================
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
  
  // ================= START NEW ORDER =================
  bind("startBtn", async () => {
    
    const res = await fetch(chartSelect.value);
    chartData = await res.json();
    
    chartNumbers = Object.keys(chartData.items).sort((a, b) => {
      const getNum = v => {
        const m = v.match(/\d+/);
        return m ? parseInt(m[0]) : 0;
      };
      return getNum(a) - getNum(b);
    });
    
    currentIndex = 0;
    items = [];
    
    $("liveQty").value = $("defaultQty").value;
    
    // Populate dropdown
    liveSelect.innerHTML = "";
    chartNumbers.forEach(num => {
      const opt = document.createElement("option");
      opt.value = num;
      opt.textContent = num;
      liveSelect.appendChild(opt);
    });
    
    liveSelect.value = chartNumbers[0];
    
    $("resumeBtn").style.display = "none";
    
    showPage("pageOrder");
    updatePreview();
    updateCount();
    updateArrows();
    updateProgress();
  });
  
  // ================= RESUME ORDER =================
  bind("resumeBtn", () => {
    if (!chartData) return;
    showPage("pageOrder");
  });
  
  // ================= BACK TO START =================
  bind("backStartBtn", () => {
    
    showPage("pageStart");
    
    if (chartData) {
      const resumeBtn = $("resumeBtn");
      resumeBtn.style.display = "inline-block";
      resumeBtn.innerText = `Resume Order (${items.length} items)`;
    }
  });
  
  // ================= SEE LIST =================
bind("seeListBtn", () => {

  if(items.length === 0){
    alert("No items selected");
    return;
  }

  buildPrintPage();
  showPage("pagePrint");

});

bind("backOrderBtn", () => {
  showPage("pageOrder");
});

// ================= RENDER LIST =================
function buildPrintPage(){

  const grid = document.querySelector(".order-grid");
  grid.innerHTML = "";

  const cols = parseInt($("cols").value) || 5;
  grid.style.setProperty("--cols", cols);

  $("pShop").innerText = $("shopCode").value;
  $("pDate").innerText = new Date().toLocaleDateString();
  $("pChartName").innerText =
    chartSelect.options[chartSelect.selectedIndex].text;
  $("pOrderBy").innerText = $("orderBy").value;
  $("pRemarks").innerText = "";

  let totalQty = 0;

  items.forEach(item => {

    totalQty += item.qty;

    const cell = document.createElement("div");
    cell.className = "cell";

    cell.innerHTML = `
      <div class="cell-inner">
        <div class="code">${item.number}</div>
        <div class="line"></div>
        <div class="qty">${item.qty}</div>
      </div>
    `;

    grid.appendChild(cell);
  });

  $("pTotalItems").innerText = items.length;
  $("pTotalQty").innerText = totalQty;
}

function renderListDeleted(){ //Delete this

  const container = $("listContainer");
  container.innerHTML = "";

  if(items.length === 0){
    container.innerHTML = "<p>No items selected.</p>";
    return;
  }

  items.forEach((item, index)=>{

    const box = document.createElement("div");
    box.className = "order-box";
    box.style.marginBottom = "12px";

    box.innerHTML = `
      <div style="font-size:22px;font-weight:bold;">
        ${item.number}
      </div>

      <div style="margin-top:8px;">
        Qty:
        <input type="number"
               value="${item.qty}"
               min="1"
               style="width:80px;font-size:18px;"
               data-index="${index}"
               class="editQty">
      </div>

      <div style="margin-top:10px;">
        <button class="yes" data-index="${index}">Update</button>
        <button class="no" data-index="${index}">Delete</button>
      </div>
    `;

    container.appendChild(box);
  });

  // UPDATE BUTTON
  document.querySelectorAll(".yes").forEach(btn=>{
    btn.onclick = function(){

      const index = this.dataset.index;
      const input = document.querySelector(`.editQty[data-index='${index}']`);

      items[index].qty = parseInt(input.value) || 1;

      updateCount();
      renderList();
    };
  });

  // DELETE BUTTON
  document.querySelectorAll(".no").forEach(btn=>{
    btn.onclick = function(){

      const index = this.dataset.index;
      items.splice(index,1);

      updateCount();
      renderList();
    };
  });

}
  
  // ================= PREVIEW =================
  function updatePreview() {
    
    if (chartNumbers.length === 0) return;
    
    const number = chartNumbers[currentIndex];
    liveSelect.value = number;
    
    const item = chartData.items[number];
    if (!item) return;
    
    const page = chartData.pages.find(p => p.id === item.page);
    if (!page) return;
    
    chartImg.src = page.image;
    chartFullImg.src = page.image;
    
    chartImg.onload = () => {
      
      const maxWidth = Math.min(window.innerWidth * 0.85, 360);
      const scale = maxWidth / item.w;
      
      cropContainer.style.width = (item.w * scale) + "px";
      cropContainer.style.height = (item.h * scale) + "px";
      
      chartImg.style.position = "absolute";
      chartImg.style.left = (-item.x * scale) + "px";
      chartImg.style.top = (-item.y * scale) + "px";
      chartImg.style.width = (chartImg.naturalWidth * scale) + "px";
    };
    
    if (isFull) {
      setTimeout(highlightBoxPosition, 60);
    }
    
    updateArrows();
    updateProgress();
  }
  
  // ================= PROGRESS =================
  function updateProgress() {
    let prog = $("progressText");
    if (!prog) {
      prog = document.createElement("div");
      prog.id = "progressText";
      prog.style.marginTop = "8px";
      prog.style.fontWeight = "600";
      liveSelect.parentElement.appendChild(prog);
    }
    prog.innerText = `${currentIndex+1} / ${chartNumbers.length}`;
  }
  
  // ================= ARROWS =================
  function updateArrows() {
    const prev = $("prevBtn");
    const next = $("nextBtn");
    
    if (prev) prev.disabled = currentIndex === 0;
    if (next) next.disabled = currentIndex === chartNumbers.length - 1;
  }
  
  bind("prevBtn", () => {
    if (currentIndex > 0) {
      currentIndex--;
      updatePreview();
    }
  });
  
  bind("nextBtn", () => {
    if (currentIndex < chartNumbers.length - 1) {
      currentIndex++;
      updatePreview();
    }
  });
  
  // ================= DROPDOWN =================
  liveSelect.onchange = function() {
    currentIndex = chartNumbers.indexOf(this.value);
    updatePreview();
  };
  
  // ================= FULL SCREEN =================
  cropContainer.onclick = () => toggleFull();
  fullContainer.onclick = () => toggleFull();
  
  function toggleFull() {
    isFull = !isFull;
    
    cropContainer.style.display = isFull ? "none" : "block";
    fullContainer.style.display = isFull ? "block" : "none";
    
    if (isFull) {
      requestAnimationFrame(() => {
        setTimeout(highlightBoxPosition, 60);
      });
    } else {
      highlightBox.style.display = "none";
    }
  }
  
  function highlightBoxPosition() {
    
    const number = chartNumbers[currentIndex];
    const item = chartData.items[number];
    if (!item) return;
    
    const imgWidth = chartFullImg.clientWidth;
    const naturalWidth = chartFullImg.naturalWidth;
    if (!imgWidth || !naturalWidth) return;
    
    const scale = imgWidth / naturalWidth;
    
    highlightBox.style.left = (item.x * scale) + "px";
    highlightBox.style.top = (item.y * scale) + "px";
    highlightBox.style.width = (item.w * scale) + "px";
    highlightBox.style.height = (item.h * scale) + "px";
    highlightBox.style.display = "block";
  }
  
  // ================= YES =================
  bind("yesBtn", () => {
    
    const number = chartNumbers[currentIndex];
    const qty = parseInt($("liveQty").value) || 0;
    
    const existing = items.find(i => i.number === number);
    
    if (existing) {
      existing.qty = qty;
    } else {
      items.push({
        number,
        code: number,
        qty,
        extra: "",
        color: chartData.items[number].color || ""
      });
    }
    
    markOrdered(number);
    nextItem();
    updateCount();
  });
  
  // ================= MARK GREEN =================
  function markOrdered(number) {
    const opt = [...liveSelect.options].find(o => o.value === number);
    if (opt) {
      opt.style.background = "#c8e6c9";
      opt.style.fontWeight = "bold";
    }
  }
  
  // ================= NO =================
  bind("noBtn", () => nextItem());
  
  function nextItem() {
    if (currentIndex < chartNumbers.length - 1) {
      currentIndex++;
      updatePreview();
    }
  }
  
  // ================= COUNT =================
  function updateCount() {
    $("countItems").innerText = items.length;
    $("countQty").innerText =
      items.reduce((s, i) => s + i.qty, 0);
  }
  
  // ================= PAGE SWITCH =================
  function showPage(id) {
    document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
    const page = $(id);
    if (page) page.classList.add("active");
  }
  
});