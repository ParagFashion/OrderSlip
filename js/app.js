document.addEventListener("DOMContentLoaded", () => {

  // ================= STATE =================
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

  // ================= DOM =================
  const chartSelect = $("chartSelect");
  const cropContainer = document.querySelector(".crop-container");
  const fullContainer = document.querySelector(".full-container");
  const chartImg = $("chartImg");
  const chartFullImg = $("chartFullImg");
  const highlightBox = document.querySelector(".highlight-box");
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

  // ================= START ORDER =================
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

    liveSelect.innerHTML = "";
    chartNumbers.forEach(num => {
      const opt = document.createElement("option");
      opt.value = num;
      opt.textContent = num;
      liveSelect.appendChild(opt);
    });

    $("resumeBtn").style.display = "none";

    showPage("pageOrder");
    updatePreview();
    updateCount();
    updateProgress();
  });

  // ================= RESUME =================
  bind("resumeBtn", () => {
    if (!chartData) return;
    showPage("pageOrder");
  });

  // ================= BACK TO START =================
  bind("backStartBtn", () => {
    showPage("pageStart");
    if (chartData) {
      const btn = $("resumeBtn");
      btn.style.display = "inline-block";
      btn.innerText = `Resume Order (${items.length} items)`;
    }
  });

  // ================= SEE LIST =================
  bind("seeListBtn", () => {
    if (items.length === 0) {
      alert("No items selected");
      return;
    }
    buildPrintPage();
    showPage("pagePrint");
  });

  bind("backOrderBtn", () => showPage("pageOrder"));
  bind("printBtn", () => window.print());

  // ================= BUILD PRINT PAGE =================
  function buildPrintPage() {

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

    items.forEach((item, index) => {

      totalQty += item.qty;

      const cell = document.createElement("div");
      cell.className = "cell";
      cell.dataset.index = index;

      cell.innerHTML = `
        <div class="cell-inner">
          <div class="code">${item.number}</div>
          <div class="line"></div>
          <div class="qty">${item.qty}</div>
        </div>
      `;

      cell.onclick = () => openPopup(index);
      grid.appendChild(cell);
    });

    $("pTotalItems").innerText = items.length;
    $("pTotalQty").innerText = totalQty;
  }

  // ================= PREVIEW =================
  function updatePreview() {

    if (!chartData) return;

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

    if (isFull) setTimeout(highlightBoxPosition, 50);

    updateProgress();
  }

  function updateProgress() {
    let prog = $("progressText");
    if (!prog) {
      prog = document.createElement("div");
      prog.id = "progressText";
      prog.style.marginTop = "8px";
      liveSelect.parentElement.appendChild(prog);
    }
    prog.innerText = `${currentIndex + 1} / ${chartNumbers.length}`;
  }

  // ================= NAVIGATION =================
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

  liveSelect.onchange = function () {
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
    if (isFull) setTimeout(highlightBoxPosition, 50);
    else highlightBox.style.display = "none";
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

  // ================= YES / NO =================
  bind("yesBtn", () => {

    const number = chartNumbers[currentIndex];
    const qty = parseInt($("liveQty").value) || 0;

    const existing = items.find(i => i.number === number);

    if (existing) {
      existing.qty = qty;
    } else {
      items.push({
        number,
        qty,
        extra: "",
        color: chartData.items[number].color || ""
      });
    }

    markOrdered(number);
    nextItem();
    updateCount();
  });

  bind("noBtn", () => nextItem());

  function nextItem() {
    if (currentIndex < chartNumbers.length - 1) {
      currentIndex++;
      updatePreview();
    }
  }

  function markOrdered(number) {
    const opt = [...liveSelect.options].find(o => o.value === number);
    if (opt) {
      opt.style.background = "#c8e6c9";
      opt.style.fontWeight = "bold";
    }
  }

  function updateCount() {
    $("countItems").innerText = items.length;
    $("countQty").innerText =
      items.reduce((s, i) => s + i.qty, 0);
  }

  // ================= POPUP =================
  function openPopup(index) {

    activeIndex = index;
    const item = items[index];
    if (!item) return;

    $("popCode").value = item.number;
    $("popQty").value = item.qty;
    $("popExtra").value = item.extra || "";
    $("popColor").value = item.color || "";

    popup.style.display = "flex";
  }

  bind("popClose", () => popup.style.display = "none");

  bind("popUpdate", () => {

    if (activeIndex === null) return;

    items[activeIndex].qty =
      parseInt($("popQty").value) || 1;

    items[activeIndex].extra =
      $("popExtra").value;

    items[activeIndex].color =
      $("popColor").value;

    popup.style.display = "none";
    updateCount();
    buildPrintPage();
  });

  bind("popDelete", () => {

    if (activeIndex === null) return;

    items.splice(activeIndex, 1);

    popup.style.display = "none";
    updateCount();
    buildPrintPage();
  });

  // ================= PAGE SWITCH =================
  function showPage(id) {
    document.querySelectorAll(".page")
      .forEach(p => p.classList.remove("active"));
    const page = $(id);
    if (page) page.classList.add("active");
  }

});