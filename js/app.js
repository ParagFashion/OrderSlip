let chartsList = [];
let currentChart = null;
let itemCodes = [];
let currentIndex = 0;
let selectedItems = [];
let showFull = false;

const canvas = document.getElementById("itemCanvas");
const ctx = canvas.getContext("2d");
let currentImage = new Image();

const chartSelect = document.getElementById("chartSelect");
const itemSelect = document.getElementById("itemSelect");

const page1 = document.getElementById("page1");
const page2 = document.getElementById("page2");

const progressText = document.getElementById("progressText");
const selectedCount = document.getElementById("selectedCount");

document.getElementById("startBtn").addEventListener("click", startOrder);
document.getElementById("prevBtn").addEventListener("click", prevItem);
document.getElementById("nextBtn").addEventListener("click", nextItem);
document.getElementById("yesBtn").addEventListener("click", yesItem);
document.getElementById("noBtn").addEventListener("click", noItem);
document.getElementById("backBtn").addEventListener("click", goBack);
itemSelect.addEventListener("change", e => loadItem(e.target.value));

canvas.addEventListener("click", () => {
  showFull = !showFull;
  loadItem(itemCodes[currentIndex]);
});

// Load charts list
async function loadCharts() {
  const res = await fetch("charts/charts.json");
  const data = await res.json();
  chartsList = data.charts;
  
  chartSelect.innerHTML = "";
  chartsList.forEach(chart => {
    let opt = document.createElement("option");
    opt.value = chart.json_url;
    opt.textContent = chart.name;
    chartSelect.appendChild(opt);
  });
}

loadCharts();

// Start Order
async function startOrder() {
  const chartFile = chartSelect.value;
  const res = await fetch(chartFile);
  currentChart = await res.json();
  
  itemCodes = Object.keys(currentChart.items);
  currentIndex = 0;
  
  itemSelect.innerHTML = "";
  itemCodes.forEach(code => {
    let opt = document.createElement("option");
    opt.value = code;
    opt.textContent = code;
    itemSelect.appendChild(opt);
  });
  
  page1.style.display = "none";
  page2.style.display = "block";
  
  restoreAuto();
  loadItem(itemCodes[0]);
}

// Load Item
function loadItem(code) {
  
  const item = currentChart.items[code];
  const page = currentChart.pages.find(p => p.id === item.page);
  
  currentImage.src = page.image;
  
  currentImage.onload = () => {
    drawItem(item);
  };
  
  currentIndex = itemCodes.indexOf(code);
  itemSelect.value = code;
  updateProgress();
}

// Draw Crop / Full
function drawItem(item) {
  
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  if (!showFull) {
    canvas.width = item.w;
    canvas.height = item.h;
    
    ctx.drawImage(
      currentImage,
      item.x, item.y, item.w, item.h,
      0, 0, item.w, item.h
    );
  } else {
    canvas.width = currentImage.width;
    canvas.height = currentImage.height;
    
    ctx.drawImage(currentImage, 0, 0);
    
    ctx.strokeStyle = "red";
    ctx.lineWidth = 8;
    ctx.strokeRect(item.x, item.y, item.w, item.h);
  }
}

// Navigation
function prevItem() {
  if (currentIndex > 0) {
    currentIndex--;
    loadItem(itemCodes[currentIndex]);
  }
}

function nextItem() {
  if (currentIndex < itemCodes.length - 1) {
    currentIndex++;
    loadItem(itemCodes[currentIndex]);
  }
}

// YES / NO
function yesItem() {
  const qty = parseInt(document.getElementById("defaultQty").value) || 1;
  selectedItems.push({ code: itemCodes[currentIndex], qty: qty });
  saveAuto();
  nextItem();
}

function noItem() {
  nextItem();
}

// Progress
function updateProgress() {
  progressText.innerText =
    (currentIndex + 1) + " / " + itemCodes.length;
  
  selectedCount.innerText =
    "Selected: " + selectedItems.length;
}

// Auto Save
function saveAuto() {
  localStorage.setItem("orderData", JSON.stringify(selectedItems));
}

function restoreAuto() {
  let data = localStorage.getItem("orderData");
  if (data) {
    selectedItems = JSON.parse(data);
  }
}

// Back
function goBack() {
  page2.style.display = "none";
  page1.style.display = "block";
}

// Swipe
let touchStart = 0;
document.addEventListener("touchstart", e => {
  touchStart = e.changedTouches[0].screenX;
});
document.addEventListener("touchend", e => {
  let diff = e.changedTouches[0].screenX - touchStart;
  if (diff > 50) prevItem();
  if (diff < -50) nextItem();
});