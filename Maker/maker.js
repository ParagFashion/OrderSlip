const app = {};

let chart={name:"",pages:[]};
let currentPageIndex=-1;
let nextNumber=401;

const img=document.getElementById("mainImage");
const boxLayer=document.getElementById("boxLayer");

let startX,startY,drawing=false;
let tempItemData=null;

/* AUTO JSON UPDATE */
function updateJSON(){
  chart.name=document.getElementById("chartName").value;
  document.getElementById("jsonOutput").value=
    JSON.stringify(chart,null,2);
}

/* IMAGE LOAD */
app.loadImageUrl=function(){
  const url=document.getElementById("imgUrl").value;
  if(!url)return;
  img.src=url;
};

document.getElementById("imgFile").onchange=function(e){
  const file=e.target.files[0];
  if(!file)return;
  img.src=URL.createObjectURL(file);
};

img.onload=function(){
  boxLayer.style.width=img.clientWidth+"px";
  boxLayer.style.height=img.clientHeight+"px";
};

/* PAGE */
app.addPage=function(){
  if(!img.src)return alert("Load image first");

  nextNumber=parseInt(document.getElementById("startNumber").value)||1;

  chart.pages.push({
    id:Date.now(),
    image:img.src,
    items:[]
  });

  currentPageIndex=chart.pages.length-1;
  refreshSelect();
  renderBoxes();
  updateJSON();
};

app.changePage=function(){
  currentPageIndex=pageSelect.selectedIndex;
  img.src=chart.pages[currentPageIndex].image;
  renderBoxes();
};

app.deletePage=function(){
  if(currentPageIndex<0)return;
  chart.pages.splice(currentPageIndex,1);
  currentPageIndex=-1;
  refreshSelect();
  boxLayer.innerHTML="";
  document.getElementById("boxList").innerHTML="";
  updateJSON();
};

function refreshSelect(){
  const sel=document.getElementById("pageSelect");
  sel.innerHTML="";
  chart.pages.forEach((p,i)=>{
    const o=document.createElement("option");
    o.text="Page "+(i+1);
    sel.add(o);
  });
  sel.selectedIndex=currentPageIndex;
}

/* DRAW */
boxLayer.addEventListener("mousedown",startDraw);
boxLayer.addEventListener("touchstart",startDraw);

function startDraw(e){
  if(currentPageIndex<0)return;

  const rect=boxLayer.getBoundingClientRect();
  const clientX=e.touches?e.touches[0].clientX:e.clientX;
  const clientY=e.touches?e.touches[0].clientY:e.clientY;

  startX=clientX-rect.left;
  startY=clientY-rect.top;

  let temp=document.createElement("div");
  temp.className="box";
  temp.style.left=startX+"px";
  temp.style.top=startY+"px";
  boxLayer.appendChild(temp);

  drawing=true;

  function move(ev){
  if(!drawing) return;

  const cx = ev.touches ? ev.touches[0].clientX : ev.clientX;
  const cy = ev.touches ? ev.touches[0].clientY : ev.clientY;

  let newW = cx - rect.left - startX;
  let newH = cy - rect.top - startY;

  // Prevent going outside right side
  if(startX + newW > boxLayer.clientWidth)
    newW = boxLayer.clientWidth - startX;

  // Prevent going outside bottom
  if(startY + newH > boxLayer.clientHeight)
    newH = boxLayer.clientHeight - startY;

  // Prevent negative overflow left/top
  if(startX + newW < 0)
    newW = -startX;

  if(startY + newH < 0)
    newH = -startY;

  temp.style.width = newW + "px";
  temp.style.height = newH + "px";
}
  function stop(){
    drawing=false;
    document.removeEventListener("mousemove",move);
    document.removeEventListener("mouseup",stop);
    document.removeEventListener("touchmove",move);
    document.removeEventListener("touchend",stop);

    const w=parseFloat(temp.style.width);
    const h=parseFloat(temp.style.height);

    if(Math.abs(w)<5||Math.abs(h)<5){
      temp.remove();
      return;
    }

    const scale=img.naturalWidth/img.clientWidth;

    const realX=parseFloat(temp.style.left)*scale;
    const realY=parseFloat(temp.style.top)*scale;
    const realW=w*scale;
    const realH=h*scale;

    temp.remove();
    openPopup(realX,realY,realW,realH);
  }

  document.addEventListener("mousemove",move);
  document.addEventListener("mouseup",stop);
  document.addEventListener("touchmove",move);
  document.addEventListener("touchend",stop);
}

/* POPUP */
function openPopup(x,y,w,h){
  let auto=document.getElementById("autoNumber").checked;
  let numberValue="";

  if(auto)numberValue=nextNumber;

  tempItemData={x,y,w,h};

  popupNumber.value=numberValue;
  popupColor.value="";
  popupX.value=Math.round(x);
  popupY.value=Math.round(y);
  popupW.value=Math.round(w);
  popupH.value=Math.round(h);

  itemPopup.style.display="flex";
}

function savePopup(){
  if(!tempItemData)return;

  chart.pages[currentPageIndex].items.push({
    number:popupNumber.value,
    x:tempItemData.x,
    y:tempItemData.y,
    w:tempItemData.w,
    h:tempItemData.h,
    color:popupColor.value
  });

  if(document.getElementById("autoNumber").checked){
    const step=parseInt(numberStep.value)||1;
    nextNumber+=step;
  }

  tempItemData=null;
  itemPopup.style.display="none";

  renderBoxes();
  updateJSON();
}

function cancelPopup(){
  tempItemData=null;
  itemPopup.style.display="none";
}

/* RENDER */
function renderBoxes(){
  boxLayer.innerHTML="";
  if(currentPageIndex<0)return;

  const page=chart.pages[currentPageIndex];
  const scale=img.clientWidth/img.naturalWidth;

  page.items.forEach(item=>{

    const div=document.createElement("div");
    div.className="box";

    div.style.left=(item.x*scale)+"px";
    div.style.top=(item.y*scale)+"px";
    div.style.width=(item.w*scale)+"px";
    div.style.height=(item.h*scale)+"px";

    // Overlay number inside box
    div.textContent = item.number || "";

    boxLayer.appendChild(div);
  });

  renderList();
}
/* LIST */
function renderList(){
  const list=document.getElementById("boxList");
  list.innerHTML="";
  if(currentPageIndex<0)return;

  const page=chart.pages[currentPageIndex];

  page.items.forEach((item,index)=>{
    const card=document.createElement("div");
    card.className="box-card";

    card.innerHTML=`
      <div><b>${item.number}</b></div>
      X:<input value="${Math.round(item.x)}">
      Y:<input value="${Math.round(item.y)}">
      W:<input value="${Math.round(item.w)}">
      H:<input value="${Math.round(item.h)}">
      Color:<input value="${item.color||""}">
      <button>Apply</button>
      <button>Delete</button>
    `;

    const inputs=card.querySelectorAll("input");

    card.querySelectorAll("button")[0].onclick=function(){
      item.x=parseFloat(inputs[0].value)||0;
      item.y=parseFloat(inputs[1].value)||0;
      item.w=parseFloat(inputs[2].value)||0;
      item.h=parseFloat(inputs[3].value)||0;
      item.color=inputs[4].value;
      renderBoxes();
      updateJSON();
    };

    card.querySelectorAll("button")[1].onclick=function(){
      page.items.splice(index,1);
      renderBoxes();
      updateJSON();
    };

    list.appendChild(card);
  });
}