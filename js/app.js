let chartsRegistry;
let chartData;
let itemKeys=[];
let currentIndex=0;
let items=[];
let isFullView=false;

const pageStart=document.getElementById("pageStart");
const pageOrder=document.getElementById("pageOrder");
const pagePrint=document.getElementById("pagePrint");

const chartSelect=document.getElementById("chartSelect");
const startBtn=document.getElementById("startBtn");

const cropContainer=document.getElementById("cropContainer");
const chartImg=document.getElementById("chartImg");
const fullContainer=document.getElementById("fullContainer");
const chartFullImg=document.getElementById("chartFullImg");
const highlightBox=document.getElementById("highlightBox");

const liveNumber=document.getElementById("liveNumber");
const liveQty=document.getElementById("liveQty");
const itemDropdown=document.getElementById("itemDropdown");

function showPage(p){
  document.querySelectorAll(".page").forEach(x=>x.classList.remove("active"));
  p.classList.add("active");
}

async function loadCharts(){
  const res=await fetch("charts/charts.json");
  chartsRegistry=await res.json();
  chartsRegistry.charts.forEach(c=>{
    const opt=document.createElement("option");
    opt.value=c.json_url;
    opt.textContent=c.name;
    chartSelect.appendChild(opt);
  });
}

async function loadChart(url){
  const res=await fetch(url);
  chartData=await res.json();
  itemKeys=Object.keys(chartData.items).sort();
  currentIndex=0;
  populateDropdown();
}

function populateDropdown(){
  itemDropdown.innerHTML="";
  itemKeys.forEach((k,i)=>{
    const opt=document.createElement("option");
    opt.value=i;
    opt.textContent=k;
    itemDropdown.appendChild(opt);
  });
}

function updatePreview(){
  const key=itemKeys[currentIndex];
  const item=chartData.items[key];
  liveNumber.value=key;
  itemDropdown.value=currentIndex;

  const page=chartData.pages.find(p=>p.id===item.page);
  chartImg.src=page.image;
  chartFullImg.src=page.image;

  chartImg.onload=()=>{
    const scale=cropContainer.clientWidth/item.w;
    chartImg.style.position="absolute";
    chartImg.style.left=(-item.x*scale)+"px";
    chartImg.style.top=(-item.y*scale)+"px";
    chartImg.style.width=(chartImg.naturalWidth*scale)+"px";
  };

  if(isFullView) refreshHighlight();
}

function refreshHighlight(){
  const key=itemKeys[currentIndex];
  const item=chartData.items[key];
  const scale=chartFullImg.clientWidth/chartFullImg.naturalWidth;
  highlightBox.style.left=(item.x*scale)+"px";
  highlightBox.style.top=(item.y*scale)+"px";
  highlightBox.style.width=(item.w*scale)+"px";
  highlightBox.style.height=(item.h*scale)+"px";
}

function yesItem(){
  const key=itemKeys[currentIndex];
  const qty=+liveQty.value||1;
  if(!items.find(i=>i.code===key)){
    items.push({code:key,qty});
  }
  moveNext();
}

function moveNext(){
  if(currentIndex<itemKeys.length-1){
    currentIndex++;
    updatePreview();
  }
}

function movePrev(){
  if(currentIndex>0){
    currentIndex--;
    updatePreview();
  }
}

document.getElementById("yesBtn").onclick=yesItem;
document.getElementById("noBtn").onclick=moveNext;
document.getElementById("prevBtn").onclick=movePrev;
document.getElementById("nextBtn").onclick=moveNext;

itemDropdown.onchange=()=>{
  currentIndex=+itemDropdown.value;
  updatePreview();
};

startBtn.onclick=async()=>{
  await loadChart(chartSelect.value);
  showPage(pageOrder);
  updatePreview();
};

document.addEventListener("keydown",e=>{
  if(pageOrder.classList.contains("active")){
    if(e.key==="ArrowRight"){e.preventDefault();moveNext();}
    if(e.key==="ArrowLeft"){e.preventDefault();movePrev();}
    if(e.key==="Enter"){e.preventDefault();yesItem();}
    if(e.key==="Backspace"){e.preventDefault();moveNext();}
  }
});

loadCharts();