let chart = {
  name:"",
  prefix:"",
  items:[]
};

let nextNumber = 401;
let currentBoxData = null;

const img = mainImage;
const boxLayer = boxLayer;

/* -------------------- IMAGE LOAD -------------------- */

function loadImage(){
  img.src = imgUrl.value;
}

imgFile.onchange = function(e){
  const file = e.target.files[0];
  if(file) img.src = URL.createObjectURL(file);
};

img.onload = function(){
  boxLayer.style.width = img.clientWidth + "px";
  boxLayer.style.height = img.clientHeight + "px";
  renderBoxes();
};

/* -------------------- PREFIX LIVE -------------------- */

globalPrefix.addEventListener("input", function(){
  chart.prefix = this.value.trim();
  renderBoxes();
  updateJSON();
});

/* -------------------- DRAW SYSTEM -------------------- */

let startX, startY, drawing=false;

boxLayer.addEventListener("mousedown", startDraw);

function startDraw(e){

  const rect = boxLayer.getBoundingClientRect();
  startX = e.clientX - rect.left;
  startY = e.clientY - rect.top;

  const temp = document.createElement("div");
  temp.className = "box";
  temp.style.left = startX + "px";
  temp.style.top = startY + "px";
  boxLayer.appendChild(temp);

  drawing = true;

  function move(ev){
    if(!drawing) return;

    let w = ev.clientX - rect.left - startX;
    let h = ev.clientY - rect.top - startY;

    if(startX + w > boxLayer.clientWidth)
      w = boxLayer.clientWidth - startX;

    if(startY + h > boxLayer.clientHeight)
      h = boxLayer.clientHeight - startY;

    temp.style.width = w + "px";
    temp.style.height = h + "px";
  }

  function stop(){
    drawing = false;
    document.removeEventListener("mousemove", move);
    document.removeEventListener("mouseup", stop);

    const w = parseFloat(temp.style.width);
    const h = parseFloat(temp.style.height);

    if(w < 5 || h < 5){
      temp.remove();
      return;
    }

    const scale = img.naturalWidth / img.clientWidth;

    currentBoxData = {
      x: parseFloat(temp.style.left) * scale,
      y: parseFloat(temp.style.top) * scale,
      w: w * scale,
      h: h * scale
    };

    temp.remove();

    if(autoNumber.checked){
      popupNumber.value = nextNumber;
    }

    popup.style.display = "flex";
  }

  document.addEventListener("mousemove", move);
  document.addEventListener("mouseup", stop);
}

/* -------------------- DUPLICATE CHECK -------------------- */

function isDuplicate(num, ignoreIndex=null){
  return chart.items.some((item,i)=>{
    if(ignoreIndex!==null && i===ignoreIndex) return false;
    return item.number == num;
  });
}

/* -------------------- SAVE ITEM -------------------- */

function saveItem(){

  const num = popupNumber.value.trim();

  if(isDuplicate(num)){
    alert("Duplicate number not allowed");
    return;
  }

  chart.items.push({
    number:num,
    color:popupColor.value,
    ...currentBoxData
  });

  if(autoNumber.checked){
    nextNumber += parseInt(numberStep.value)||1;
  }

  popup.style.display = "none";
  renderBoxes();
  updateJSON();
}

function closePopup(){
  popup.style.display = "none";
}

/* -------------------- RENDER -------------------- */

function renderBoxes(){

  boxLayer.innerHTML = "";

  const scale = img.clientWidth / img.naturalWidth;

  chart.items.forEach(item=>{

    const div = document.createElement("div");
    div.className = "box";

    div.style.left = item.x * scale + "px";
    div.style.top = item.y * scale + "px";
    div.style.width = item.w * scale + "px";
    div.style.height = item.h * scale + "px";

    div.textContent = (chart.prefix || "") + item.number;
    div.style.fontSize = Math.max(12, (item.w * scale)/4) + "px";

    boxLayer.appendChild(div);
  });

  renderList();
}

/* -------------------- LIST -------------------- */

function renderList(){

  boxList.innerHTML = "";

  chart.items.forEach((item,index)=>{

    const card = document.createElement("div");
    card.className = "box-card";

    card.innerHTML = `
      ${chart.prefix || ""}<input value="${item.number}">
      <button>Delete</button>
    `;

    const input = card.querySelector("input");

    input.addEventListener("input",function(){
      if(isDuplicate(this.value,index)){
        this.style.border="2px solid red";
        return;
      }
      this.style.border="";
      item.number = this.value;
      renderBoxes();
      updateJSON();
    });

    card.querySelector("button").onclick=function(){
      chart.items.splice(index,1);
      renderBoxes();
      updateJSON();
    };

    boxList.appendChild(card);
  });
}

/* -------------------- JSON -------------------- */

function updateJSON(){
  chart.name = chartName.value;
  chart.prefix = globalPrefix.value.trim();
  jsonOutput.value = JSON.stringify(chart,null,2);
}