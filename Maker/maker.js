const app = {};

let chart = {
  name: "",
  pages: []
};

let currentPageIndex = -1;
let currentItemIndex = -1;

let img = document.getElementById("mainImage");
let boxLayer = document.getElementById("boxLayer");

let startX, startY, drawing=false;

app.loadImageUrl = function(){
  const url = document.getElementById("imgUrl").value;
  if(!url) return;
  img.src = url;
};

document.getElementById("imgFile").onchange = function(e){
  const file = e.target.files[0];
  if(!file) return;
  img.src = URL.createObjectURL(file);
};

img.onload = function(){
  boxLayer.style.width = img.clientWidth + "px";
  boxLayer.style.height = img.clientHeight + "px";
};

app.addPage = function(){
  if(!img.src) return alert("Load image first");

  chart.pages.push({
    id: Date.now(),
    image: img.src,
    items: []
  });

  currentPageIndex = chart.pages.length-1;
  refreshPageSelect();
};

app.changePage = function(){
  currentPageIndex = pageSelect.selectedIndex;
  const page = chart.pages[currentPageIndex];
  img.src = page.image;
  renderBoxes();
};

app.deletePage = function(){
  if(currentPageIndex<0) return;
  chart.pages.splice(currentPageIndex,1);
  currentPageIndex=-1;
  refreshPageSelect();
  boxLayer.innerHTML="";
};

function refreshPageSelect(){
  const sel = document.getElementById("pageSelect");
  sel.innerHTML="";
  chart.pages.forEach((p,i)=>{
    const o=document.createElement("option");
    o.text="Page "+(i+1);
    sel.add(o);
  });
  sel.selectedIndex=currentPageIndex;
}

boxLayer.addEventListener("mousedown", startDraw);
boxLayer.addEventListener("touchstart", startDraw);

function startDraw(e){
  if(currentPageIndex<0) return;

  drawing=true;
  const rect=boxLayer.getBoundingClientRect();
  const clientX=e.touches?e.touches[0].clientX:e.clientX;
  const clientY=e.touches?e.touches[0].clientY:e.clientY;
  startX=clientX-rect.left;
  startY=clientY-rect.top;

  const div=document.createElement("div");
  div.className="box";
  div.style.left=startX+"px";
  div.style.top=startY+"px";
  boxLayer.appendChild(div);

  function move(ev){
    if(!drawing) return;
    const cx=ev.touches?ev.touches[0].clientX:ev.clientX;
    const cy=ev.touches?ev.touches[0].clientY:ev.clientY;
    const w=cx-rect.left-startX;
    const h=cy-rect.top-startY;
    div.style.width=w+"px";
    div.style.height=h+"px";
  }

  function stop(ev){
    drawing=false;
    document.removeEventListener("mousemove",move);
    document.removeEventListener("mouseup",stop);
    document.removeEventListener("touchmove",move);
    document.removeEventListener("touchend",stop);

    const scale=img.naturalWidth/img.clientWidth;

    const item={
      number:"",
      x:parseFloat(div.style.left)*scale,
      y:parseFloat(div.style.top)*scale,
      w:parseFloat(div.style.width)*scale,
      h:parseFloat(div.style.height)*scale,
      color:""
    };

    chart.pages[currentPageIndex].items.push(item);
    currentItemIndex=chart.pages[currentPageIndex].items.length-1;

    renderBoxes();
  }

  document.addEventListener("mousemove",move);
  document.addEventListener("mouseup",stop);
  document.addEventListener("touchmove",move);
  document.addEventListener("touchend",stop);
}

function renderBoxes(){
  boxLayer.innerHTML="";
  if(currentPageIndex<0) return;

  const page=chart.pages[currentPageIndex];
  const scale=img.clientWidth/img.naturalWidth;

  page.items.forEach((item,i)=>{
    const div=document.createElement("div");
    div.className="box";
    div.style.left=(item.x*scale)+"px";
    div.style.top=(item.y*scale)+"px";
    div.style.width=(item.w*scale)+"px";
    div.style.height=(item.h*scale)+"px";

    div.onclick=function(){
      currentItemIndex=i;
      document.getElementById("itemNumber").value=item.number;
      document.getElementById("itemColor").value=item.color;
    };

    boxLayer.appendChild(div);
  });
}

app.updateItem=function(){
  if(currentItemIndex<0) return;
  const item=chart.pages[currentPageIndex].items[currentItemIndex];
  item.number=document.getElementById("itemNumber").value;
  item.color=document.getElementById("itemColor").value;
};

app.deleteItem=function(){
  if(currentItemIndex<0) return;
  chart.pages[currentPageIndex].items.splice(currentItemIndex,1);
  currentItemIndex=-1;
  renderBoxes();
};

app.exportJSON=function(){
  chart.name=document.getElementById("chartName").value;
  const data=JSON.stringify(chart,null,2);
  document.getElementById("jsonOutput").value=data;

  const blob=new Blob([data],{type:"application/json"});
  const a=document.createElement("a");
  a.href=URL.createObjectURL(blob);
  a.download="chart.json";
  a.click();
};

document.getElementById("importJson").onchange=function(e){
  const file=e.target.files[0];
  const reader=new FileReader();
  reader.onload=function(){
    chart=JSON.parse(reader.result);
    document.getElementById("chartName").value=chart.name;
    currentPageIndex=0;
    refreshPageSelect();
    img.src=chart.pages[0].image;
  };
  reader.readAsText(file);
};