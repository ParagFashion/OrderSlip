// maker.js — OrderSlip Maker (FULL CODE keys, no auto-number)
(() => {
  // ---- DOM refs ----
  const chartName = document.getElementById('chartName');
  const pageSelect = document.getElementById('pageSelect');
  const pageImagePath = document.getElementById('pageImagePath');
  const imgUpload = document.getElementById('imgUpload');
  const addPageBtn = document.getElementById('addPageBtn');
  const importBtn = document.getElementById('importBtn');
  const exportBtn = document.getElementById('exportBtn');

  const cropContainer = document.getElementById('cropContainer');
  const mainImage = document.getElementById('mainImage');
  const fullContainer = document.getElementById('fullContainer');
  const fullImage = document.getElementById('fullImage');
  const boxesLayer = document.getElementById('boxesLayer');

  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  const itemSelect = document.getElementById('itemSelect');

  const displayCode = document.getElementById('displayCode');
  const displayColor = document.getElementById('displayColor');
  const defaultQty = document.getElementById('defaultQty');
  const yesBtn = document.getElementById('yesBtn');
  const noBtn = document.getElementById('noBtn');

  const itemListEl = document.getElementById('itemList');
  const jsonOutput = document.getElementById('jsonOutput');

  // popup
  const popup = document.getElementById('popup');
  const pCode = document.getElementById('pCode');
  const pPage = document.getElementById('pPage');
  const pX = document.getElementById('pX');
  const pY = document.getElementById('pY');
  const pW = document.getElementById('pW');
  const pH = document.getElementById('pH');
  const pColor = document.getElementById('pColor');
  const pSave = document.getElementById('pSave');
  const pCancel = document.getElementById('pCancel');
  const popupTitle = document.getElementById('popupTitle');

  // ---- internal state ----
  let chart = { name: "Sample Chart", pages: [], items: {} }; // items: { "G401": {page,x,y,w,h,color} }
  let pagePreviewUrl = null; // preview image object URL for the currently uploaded image
  let currentPage = null;
  let itemKeys = []; // ordered array of full codes (strings)
  let currentIndex = 0;
  let isFullView = false;
  let tempRect = null; // when drawing new box
  let editingKey = null; // if editing existing item (old key)

  // ---- helpers ----
  function updatePageSelectUI() {
    pageSelect.innerHTML = '';
    chart.pages.forEach(p => {
      const o = document.createElement('option');
      o.value = p.id;
      o.textContent = `Page ${p.id}`;
      pageSelect.appendChild(o);
    });
    // update pPage select in popup
    pPage.innerHTML = '';
    chart.pages.forEach(p => {
      const o = document.createElement('option');
      o.value = p.id;
      o.textContent = `Page ${p.id}`;
      pPage.appendChild(o);
    });
  }

  function updateItemKeys() {
    itemKeys = Object.keys(chart.items).sort(codeCompare);
    // rebuild itemSelect dropdown
    itemSelect.innerHTML = '';
    itemKeys.forEach((k, i) => {
      const o = document.createElement('option');
      o.value = i;
      o.textContent = k;
      itemSelect.appendChild(o);
    });
    // ensure currentIndex valid
    if (currentIndex >= itemKeys.length) currentIndex = Math.max(0, itemKeys.length - 1);
  }

  // sorting by prefix then number (G401 < G402 < H100)
  function parseCode(code) {
    const m = String(code).match(/^([^\d]*)(\d+)$/);
    if (m) return { prefix: m[1] || '', num: parseInt(m[2], 10) };
    return { prefix: code, num: 0 };
  }
  function codeCompare(a,b){
    const A = parseCode(a), B = parseCode(b);
    if (A.prefix < B.prefix) return -1;
    if (A.prefix > B.prefix) return 1;
    return A.num - B.num;
  }

  function updateUI() {
    // page select
    updatePageSelectUI();
    updateItemKeys();
    renderList();
    renderJSON();
    renderForCurrent();
  }

  function renderJSON() {
    const out = {
      name: chart.name || '',
      pages: chart.pages.map(p => ({ id: p.id, image: p.image })),
      items: chart.items
    };
    jsonOutput.value = JSON.stringify(out, null, 2);
  }

  // ---- image & preview rendering ----

  // show current item: either crop preview or full view boxes
  function renderForCurrent() {
    if (!itemKeys.length) {
      displayCode.value = '';
      displayColor.value = '';
      itemSelect.selectedIndex = -1;
      prevBtn.disabled = true;
      nextBtn.disabled = true;
      return;
    }
    itemSelect.selectedIndex = currentIndex;
    const key = itemKeys[currentIndex];
    const item = chart.items[key];
    displayCode.value = key;
    displayColor.value = item.color || '';

    prevBtn.disabled = (currentIndex === 0);
    nextBtn.disabled = (currentIndex === itemKeys.length - 1);

    // show appropriate image
    const pageObj = chart.pages.find(p => p.id === item.page);
    if (!pageObj) {
      mainImage.src = '';
      fullImage.src = '';
      return;
    }

    // prefer preview URL if page has been uploaded during this session
    const previewUrl = pageObj.__previewUrl || pagePreviewUrl || null;

    // Use previewUrl if present (uploaded), else use pageObj.image (path)
    const useSrc = previewUrl || pageObj.image || '';
    mainImage.src = useSrc;
    fullImage.src = useSrc;

    if (!isFullView) {
      // crop preview: position mainImage so that item region is shown inside container
      mainImage.onload = () => {
        // desired display crop width (cropContainer width)
        const displayW = cropContainer.clientWidth;
        const scale = displayW / item.w;
        const displayH = Math.round(item.h * scale);
        cropContainer.style.height = displayH + 'px';

        const natW = mainImage.naturalWidth;
        const natH = mainImage.naturalHeight;

        const newImgW = Math.round(natW * scale);
        const newImgH = Math.round(natH * scale);

        mainImage.style.position = 'absolute';
        mainImage.style.width = newImgW + 'px';
        mainImage.style.height = newImgH + 'px';
        mainImage.style.left = (-item.x * scale) + 'px';
        mainImage.style.top = (-item.y * scale) + 'px';

        // hide full container
        fullContainer.style.display = 'none';
        cropContainer.style.display = 'block';
      };
    } else {
      // full view: show full image and draw all boxes
      fullImage.onload = () => {
        cropContainer.style.display = 'none';
        fullContainer.style.display = 'block';
        drawAllBoxes();
      };
    }
  }

  // draw boxes for full view (all items on the current page)
  function drawAllBoxes() {
    boxesLayer.innerHTML = '';
    const pageInner = chart.pages.find(p => p.id === currentPage) || chart.pages[0];
    if (!pageInner) return;
    const src = pageInner.__previewUrl || pageInner.image || '';
    if (!fullImage.naturalWidth) return;
    const scale = fullImage.clientWidth / fullImage.naturalWidth;

    Object.keys(chart.items).forEach(code => {
      const it = chart.items[code];
      if (it.page !== pageInner.id) return;
      const div = document.createElement('div');
      div.className = 'box';
      if (code === itemKeys[currentIndex]) div.classList.add('current');

      div.style.left = (it.x * scale) + 'px';
      div.style.top = (it.y * scale) + 'px';
      div.style.width = (it.w * scale) + 'px';
      div.style.height = (it.h * scale) + 'px';
      div.textContent = code;
      boxesLayer.appendChild(div);
    });
  }

  // ---- drawing new box on cropContainer ----
  let dragStart = null;
  cropContainer.addEventListener('mousedown', (e) => {
    if (isFullView) return; // drawing only in crop mode
    if (!currentPage) return alert('Add/select a page first');

    const rect = cropContainer.getBoundingClientRect();
    const startX = e.clientX - rect.left;
    const startY = e.clientY - rect.top;

    // temp visual box
    const temp = document.createElement('div');
    temp.className = 'box';
    temp.style.left = startX + 'px';
    temp.style.top = startY + 'px';
    temp.style.width = '2px';
    temp.style.height = '2px';
    temp.style.pointerEvents = 'none';
    cropContainer.appendChild(temp);

    function moveHandler(ev) {
      const mx = ev.clientX - rect.left;
      const my = ev.clientY - rect.top;
      let w = mx - startX;
      let h = my - startY;
      if (startX + w > cropContainer.clientWidth) w = cropContainer.clientWidth - startX;
      if (startY + h > cropContainer.clientHeight) h = cropContainer.clientHeight - startY;
      temp.style.width = Math.max(2, w) + 'px';
      temp.style.height = Math.max(2, h) + 'px';
    }

    function upHandler(ev) {
      document.removeEventListener('mousemove', moveHandler);
      document.removeEventListener('mouseup', upHandler);

      const wPx = parseFloat(temp.style.width);
      const hPx = parseFloat(temp.style.height);
      if (wPx < 6 || hPx < 6) {
        temp.remove();
        return;
      }

      // convert temp pixel coords into natural image coords
      // We used scale = displayW / item.w when rendering the crop; invert compute nat scale.
      const key = itemKeys[currentIndex];
      const item = chart.items[key];
      // The calculation: displayW / item.w = scale used earlier => item.w * scale = displayW
      // But we must map temp left/top in crop container to natural coordinates:
      // scaleToNat = mainImage.naturalWidth / mainImage.clientWidth
      const scaleToNat = mainImage.naturalWidth / mainImage.clientWidth;
      const left = parseFloat(temp.style.left) * scaleToNat;
      const top = parseFloat(temp.style.top) * scaleToNat;
      const wNat = wPx * scaleToNat;
      const hNat = hPx * scaleToNat;

      temp.remove();

      // store as tempRect and open popup to allow entering full code etc.
      tempRect = {
        page: currentPage,
        x: Math.round(left),
        y: Math.round(top),
        w: Math.round(wNat),
        h: Math.round(hNat),
        color: ''
      };

      openPopupForNew();
    }

    document.addEventListener('mousemove', moveHandler);
    document.addEventListener('mouseup', upHandler);
  });

  // ---- popup handlers ----
  function openPopupForNew() {
    editingKey = null;
    popupTitle.textContent = 'Add Item';
    pCode.value = '';
    pPage.value = tempRect.page;
    pX.value = tempRect.x;
    pY.value = tempRect.y;
    pW.value = tempRect.w;
    pH.value = tempRect.h;
    pColor.value = '';
    popup.style.display = 'flex';
    popup.setAttribute('aria-hidden', 'false');
  }

  function openPopupForEdit(key) {
    editingKey = key;
    popupTitle.textContent = 'Edit Item';
    const it = chart.items[key];
    pCode.value = key;
    pPage.value = it.page;
    pX.value = it.x;
    pY.value = it.y;
    pW.value = it.w;
    pH.value = it.h;
    pColor.value = it.color || '';
    popup.style.display = 'flex';
    popup.setAttribute('aria-hidden', 'false');
  }

  function closePopup() {
    popup.style.display = 'none';
    popup.setAttribute('aria-hidden', 'true');
    tempRect = null;
    editingKey = null;
  }

  pCancel.addEventListener('click', () => {
    closePopup();
  });

  pSave.addEventListener('click', () => {
    const code = (pCode.value || '').trim();
    if (!code) return alert('Full code required (e.g. G401)');

    // check duplicate (if renaming)
    if (editingKey) {
      if (code !== editingKey && chart.items[code]) {
        return alert('Duplicate code exists');
      }
      // rename safely
      const obj = chart.items[editingKey];
      obj.page = parseInt(pPage.value);
      obj.x = Number(pX.value);
      obj.y = Number(pY.value);
      obj.w = Number(pW.value);
      obj.h = Number(pH.value);
      obj.color = pColor.value;

      if (code !== editingKey) {
        chart.items[code] = obj;
        delete chart.items[editingKey];
      }
    } else {
      if (chart.items[code]) return alert('Duplicate code exists');
      chart.items[code] = {
        page: parseInt(pPage.value),
        x: Number(pX.value),
        y: Number(pY.value),
        w: Number(pW.value),
        h: Number(pH.value),
        color: pColor.value
      };
    }

    updateItemKeys();
    renderList();
    renderJSON();
    closePopup();
    // if new item added on current page, make it current
    const idx = itemKeys.indexOf(code);
    if (idx >= 0) {
      currentIndex = idx;
      renderForCurrent();
    }
  });

  // double click card opens edit
  function makeCardFor(code) {
    const item = chart.items[code];
    const div = document.createElement('div');
    div.className = 'card';
    div.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center">
        <strong>${code}</strong>
        <small>Page ${item.page}</small>
      </div>
      <div style="margin-top:6px;color:${item.color || '#666'}">
        x:${item.x} y:${item.y} w:${item.w} h:${item.h}
      </div>
      <div style="margin-top:8px;display:flex;gap:8px">
        <button data-edit="${code}">Edit</button>
        <button data-delete="${code}">Delete</button>
      </div>
    `;
    // handlers
    div.querySelector('[data-edit]').addEventListener('click', () => openPopupForEdit(code));
    div.querySelector('[data-delete]').addEventListener('click', () => {
      if (!confirm('Delete ' + code + '?')) return;
      delete chart.items[code];
      updateItemKeys();
      renderList();
      renderJSON();
      renderForCurrent();
    });
    return div;
  }

  function renderList() {
    itemListEl.innerHTML = '';
    if (!itemKeys.length) {
      itemListEl.innerHTML = '<div style="color:#666">No items</div>';
    } else {
      // show items for the current page first (optional), here we list all
      itemKeys.forEach(k => {
        itemListEl.appendChild(makeCardFor(k));
      });
    }
    // update select
    itemSelect.innerHTML = '';
    itemKeys.forEach((k,i) => {
      const o = document.createElement('option');
      o.value = i; o.textContent = k;
      itemSelect.appendChild(o);
    });
    if (itemKeys.length) itemSelect.selectedIndex = currentIndex;
  }

  // ---- adding pages ----
  addPageBtn.addEventListener('click', () => {
    const imagePath = pageImagePath.value.trim();
    if (!imagePath) return alert('Enter image path for JSON (e.g. charts/images/page1.png)');
    if (!pagePreviewUrl) return alert('Upload an image for preview (preview only)');

    const id = chart.pages.length + 1;
    const pageObj = { id: id, image: imagePath, __previewUrl: pagePreviewUrl };
    chart.pages.push(pageObj);
    currentPage = id;
    pagePreviewUrl = null; // clear session preview for next page
    imgUpload.value = '';
    pageImagePath.value = '';
    updatePageSelectUI();
    updateItemKeys();
    renderJSON();
    // make newly added page selected
    pageSelect.value = id;
    renderForCurrent();
    alert('Page added (preview only). Remember to upload image to hosting and update image path in JSON when ready.');
  });

  // image upload handling (preview only)
  let pagePreviewUrl = null;
  imgUpload.addEventListener('change', (ev) => {
    const f = ev.target.files[0];
    if (!f) return;
    try {
      pagePreviewUrl = URL.createObjectURL(f);
      // show in preview image immediately
      mainImage.src = pagePreviewUrl;
      fullImage.src = pagePreviewUrl;
    } catch (err) {
      console.error(err);
      alert('Failed to load image');
    }
  });

  // ---- navigation ----
  prevBtn.addEventListener('click', () => {
    if (currentIndex > 0) {
      currentIndex--;
      renderForCurrent();
    }
  });
  nextBtn.addEventListener('click', () => {
    if (currentIndex < itemKeys.length - 1) {
      currentIndex++;
      renderForCurrent();
    }
  });
  itemSelect.addEventListener('change', () => {
    const i = parseInt(itemSelect.value);
    if (!isNaN(i)) {
      currentIndex = i;
      renderForCurrent();
    }
  });

  // yes/no actions (these are placeholders in Maker — you may wire to ordering)
  yesBtn.addEventListener('click', () => {
    alert('YES pressed for ' + (itemKeys[currentIndex] || '-'));
  });
  noBtn.addEventListener('click', () => {
    if (currentIndex < itemKeys.length - 1) {
      currentIndex++;
      renderForCurrent();
    }
  });

  // toggle cropped/full on image click
  cropContainer.addEventListener('click', () => {
    isFullView = !isFullView;
    renderForCurrent();
  });
  fullContainer.addEventListener('click', () => {
    isFullView = !isFullView;
    renderForCurrent();
  });

  // keyboard navigation & popup shortcuts
  document.addEventListener('keydown', (e) => {
    // if popup open, allow Enter = Save, Escape/Backspace = Cancel
    if (popup.style.display === 'flex') {
      if (e.key === 'Enter') { e.preventDefault(); pSave.click(); }
      if (e.key === 'Escape' || e.key === 'Backspace') { e.preventDefault(); pCancel.click(); }
      return;
    }

    // ignore if input focused (we allow only in non-input areas)
    const active = document.activeElement;
    if (active && (active.tagName === 'INPUT' || active.tagName === 'SELECT' || active.tagName === 'TEXTAREA')) {
      // allow some keys on specific fields (e.g. arrow navigation for dropdown stays native)
      return;
    }

    if (e.key === 'ArrowRight') { e.preventDefault(); if (currentIndex < itemKeys.length - 1) { currentIndex++; renderForCurrent(); } }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); if (currentIndex > 0) { currentIndex--; renderForCurrent(); } }
    else if (e.key === 'Enter') { e.preventDefault(); yesBtn.click(); }
    else if (e.key === 'Backspace') { e.preventDefault(); noBtn.click(); }
  });

  // ---- import/export JSON (optional for production) ----
  importBtn.addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const f = e.target.files[0];
      if (!f) return;
      const r = new FileReader();
      r.onload = () => {
        try {
          const parsed = JSON.parse(r.result);
          if (!parsed || !parsed.items) return alert('Invalid chart JSON');
          chart.name = parsed.name || chart.name;
          chart.pages = (parsed.pages || []).map(p => ({ id: p.id, image: p.image }));
          chart.items = parsed.items || {};
          currentIndex = 0;
          currentPage = chart.pages.length ? chart.pages[0].id : null;
          updateUI();
        } catch (err) { alert('Failed to parse JSON'); }
      };
      r.readAsText(f);
    };
    input.click();
  });

  exportBtn.addEventListener('click', () => {
    const payload = { name: chart.name, pages: chart.pages.map(p => ({ id: p.id, image: p.image })), items: chart.items };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = (chart.name || 'chart') + '.json';
    a.click();
  });

  // ---- initialize with empty chart ----
  updateUI();

  // Expose some methods for debugging in console (optional)
  window._maker = {
    chart,
    updateUI,
    openPopupForEdit
  };

})();