const app = {};

let chart = { name:"", pages:[] };
let currentPageIndex = -1;
let nextNumber = 401;

const img = document.getElementById("mainImage");
const boxLayer = document.getElementById("boxLayer");

let startX,startY,drawing=false;

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
  boxLayer.style.width = img.clientWidth+"px";
  boxLayer.style.height = img.clientHeight+"px";
};

app.addPage = function(){
  if(!img.src) return alert("Load image first");

  nextNumber = parseInt(document.getElementById("startNumber").value)||1;

  chart.pages.push({
    id:Date.now(),
    image:img.src,
    items:[]
  });

  currentPageIndex = chart.pages.length-1;
  refreshPageSelect();
  renderBoxes();
};

app.changePage = function(){
  currentPageIndex = pageSelect.selectedIndex;
  img.src = chart.pages[currentPageIndex].image;
  renderBoxes();
};

app.deletePage = function(){
  if(currentPageIndex<0) return;
  chart.pages.splice(currentPageIndex,1);
  currentPageIndex=-1;
  refreshPageSelect();
  boxLayer.innerHTML="";
  document.getElementById("boxList").innerHTML="";
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

/* DRAWING SYSTEM */

boxLayer.addEventListener("mousedown", startDraw);
boxLayer.addEventListener("touchstart", startDraw);

function startDraw(e){

  if(currentPageIndex<0) return;

  const rect = boxLayer.getBoundingClientRect();
  const clientX = e.touches?e.touches[0].clientX:e.clientX;
  const clientY = e.touches?e.touches[0].clientY:e.clientY;

  startX = clientX-rect.left;
  startY = clientY-rect.top;

  let tempBox=document.createElement("div");
  tempBox.className="box";
  tempBox.style.left=startX+"px";
  tempBox.style.top=startY+"px";
  boxLayer.appendChild(tempBox);

  drawing=true;

  function move(ev){
    if(!drawing) return;
    const cx=ev.touches?ev.touches[0].clientX:ev.clientX;
    const cy=ev.touches?ev.touches[0].clientY:ev.clientY;
    tempBox.style.width=(cx-rect.left-startX)+"px";
    tempBox.style.height=(cy-rect.top-startY)+"px";
  }

  function stop(ev){
    drawing=false;
    document.removeEventListener("mousemove",move);
    document.removeEventListener("mouseup",stop);
    document.removeEventListener("touchmove",move);
    document.removeEventListener("touchend",stop);

    const w=parseFloat(tempBox.style.width);
    const h=parseFloat(tempBox.style.height);

    if(Math.abs(w)<5||Math.abs(h)<5){
      tempBox.remove();
      return;
    }

    const scale=img.naturalWidth/img.clientWidth;

    let auto=document.getElementById("autoNumber").checked;
    let numberValue="";

    if(auto){
      numberValue=nextNumber;
      const step=parseInt(document.getElementById("numberStep").value)||1;
      nextNumber+=step;
    }

    chart.pages[currentPageIndex].items.push({
      number:numberValue,
      x:parseFloat(tempBox.style.left)*scale,
      y:parseFloat(tempBox.style.top)*scale,
      w:w*scale,
      h:h*scale,
      color:""
    });

    renderBoxes();
  }

  document.addEventListener("mousemove",move);
  document.addEventListener("mouseup",stop);
  document.addEventListener("touchmove",move);
  document.addEventListener("touchend",stop);
}

/* RENDER BOXES */

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
    boxLayer.appendChild(div);
  });

  renderBoxList();
}

/* BOX LIST */

function renderBoxList(){
  const list=document.getElementById("boxList");
  list.innerHTML="";
  if(currentPageIndex<0) return;

  const page=chart.pages[currentPageIndex];

  page.items.forEach((item,index)=>{

    const row=document.createElement("div");
    row.className="box-row";

    row.innerHTML=`
      <input value="${item.number}" data-field="number">
      <input value="${Math.round(item.x)}" data-field="x">
      <input value="${Math.round(item.y)}" data-field="y">
      <input value="${Math.round(item.w)}" data-field="w">
      <input value="${Math.round(item.h)}" data-field="h">
      <input value="${item.color||""}" data-field="color">
      <button data-action="apply">Apply</button>
      <button data-action="delete">Delete</button>
    `;

    row.querySelector('[data-action="apply"]').onclick=function(){
      const inputs=row.querySelectorAll("input");
      inputs.forEach(inp=>{
        const f=inp.dataset.field;
        if(f==="number"||f==="color"){
          item[f]=inp.value;
        }else{
          item[f]=parseFloat(inp.value)||0;
        }
      });
      renderBoxes();
    };

    row.querySelector('[data-action="delete"]').onclick=function(){
      page.items.splice(index,1);
      renderBoxes();
    };

    list.appendChild(row);
  });
}

/* JSON */

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
    renderBoxes();
  };
  reader.readAsText(file);
};