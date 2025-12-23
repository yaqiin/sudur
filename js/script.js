const loadSVG = () => {
  const xhr = new XMLHttpRequest();
  xhr.open('GET', './assets/quran-heart.svg', true);
  xhr.onreadystatechange = () => {
    if (xhr.readyState === 4 && (xhr.status === 0 || xhr.status === 200)) {
      const svgContainer = document.getElementById('svg-container');
      if (svgContainer && xhr.responseText) {
        svgContainer.innerHTML = xhr.responseText;
        initializeApp(svgContainer);
      }
    }
  };
  xhr.send();
};

const initializeApp = (svgContainer) => {
  const svg = svgContainer.querySelector('svg');
  if (!svg) return;

  if (!svg.getAttribute('viewBox')) {
    svg.setAttribute('viewBox', '0 0 1080 1920');
  }

  const surahMap = buildSurahMap(svgContainer);
  restoreSelections(surahMap);
  setupSurahClickHandlers(svgContainer, surahMap);
  setupUI(svg, svgContainer, surahMap);
};

const buildSurahMap = (container) => {
  const surahMap = new Map();
  const surahGroups = container.querySelectorAll('.surah-group');
  
  surahGroups.forEach(group => {
    const nameEl = group.querySelector('.surah-name');
    if (nameEl) {
      surahMap.set(nameEl.textContent.trim(), group);
    }
  });
  
  return surahMap;
};

const restoreSelections = (surahMap) => {
  const saved = JSON.parse(localStorage.getItem('selectedSurahs') || '[]');
  saved.forEach(name => {
    const group = surahMap.get(name);
    if (group) {
      group.querySelectorAll('.surah-path').forEach(p => p.classList.add('active'));
    }
  });
};

const setupSurahClickHandlers = (container, surahMap) => {
  const surahGroups = container.querySelectorAll('.surah-group');
  
  surahGroups.forEach(group => {
    group.addEventListener('click', () => {
      const nameEl = group.querySelector('.surah-name');
      const name = nameEl ? nameEl.textContent.trim() : null;
      if (!name) return;

      const paths = group.querySelectorAll('.surah-path');
      const wasActive = paths[0]?.classList.contains('active');
      
      paths.forEach(p => p.classList.toggle('active', !wasActive));
      updateLocalStorage(name, !wasActive);
    });
  });
};

const updateLocalStorage = (surahName, isSelected) => {
  let selections = JSON.parse(localStorage.getItem('selectedSurahs') || '[]');
  if (isSelected) {
    if (!selections.includes(surahName)) selections.push(surahName);
  } else {
    selections = selections.filter(n => n !== surahName);
  }
  localStorage.setItem('selectedSurahs', JSON.stringify(selections));
};

const setupUI = (svg, svgContainer, surahMap) => {
  const els = getUIElements();
  initializeDefaults(els);
  
  setupZoom(els, svg);
  setupSearch(els, svgContainer, surahMap);
  setupDownload(els, svg);
  setupColorPicker(els);
};

const getUIElements = () => ({
  zoomIn: document.getElementById('zoom-in'),
  zoomOut: document.getElementById('zoom-out'),
  zoomReset: document.getElementById('zoom-reset'),
  colorPickerBtn: document.getElementById('color-picker-btn'),
  colorPickerPanel: document.getElementById('color-picker-panel'),
  downloadBtn: document.getElementById('download-btn'),
  searchInput: document.getElementById('search-input'),
  clearBtn: document.getElementById('clear-search'),
  resultsPanel: document.getElementById('search-results-panel'),
  results: document.getElementById('search-results'),
  downloadPanel: document.getElementById('download-panel'),
  customBtn: document.getElementById('custom-download-btn'),
  customSizeModal: document.getElementById('custom-size-modal'),
  customSizeCancel: document.getElementById('custom-size-cancel'),
  customWidth: document.getElementById('custom-width'),
  customHeight: document.getElementById('custom-height'),
  customConfirm: document.getElementById('custom-download-confirm'),
  downloadOptions: document.querySelectorAll('.download-option-btn')
});

const initializeDefaults = (els) => {
  els.customWidth.value = window.screen.width;
  els.customHeight.value = window.screen.height;
};

const setupZoom = (els, svg) => {
  let zoom = 1;
  const minZoom = 0.5;
  const maxZoom = 3;
  const zoomStep = 0.1;

  const updateZoom = () => {
    if (svg) svg.style.transform = `scale(${zoom})`;
  };

  els.zoomIn.addEventListener('click', () => {
    if (zoom < maxZoom) {
      zoom = Math.min(zoom + zoomStep, maxZoom);
      updateZoom();
    }
  });

  els.zoomOut.addEventListener('click', () => {
    if (zoom > minZoom) {
      zoom = Math.max(zoom - zoomStep, minZoom);
      updateZoom();
    }
  });

  els.zoomReset.addEventListener('click', () => {
    zoom = 1;
    updateZoom();
  });
};

const setupSearch = (els, svgContainer, surahMap) => {
  const showResults = () => {
    if (els.searchInput.value.trim()) {
      els.resultsPanel.classList.add('active');
      els.clearBtn.style.display = 'flex';
    } else {
      els.resultsPanel.classList.remove('active');
      els.clearBtn.style.display = 'none';
    }
  };

  const hideResults = () => {
    els.resultsPanel.classList.remove('active');
    els.searchInput.value = '';
    els.results.innerHTML = '';
    els.clearBtn.style.display = 'none';
  };

  const renderResults = (query) => {
    els.results.innerHTML = '';
    if (!query) {
      showResults();
      return;
    }

    const filtered = Array.from(surahMap.keys())
      .filter(s => s.includes(query) || s.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 10);

    if (filtered.length === 0) {
      els.results.innerHTML = '<div class="no-results">لا توجد نتائج</div>';
      showResults();
      return;
    }

    filtered.forEach(name => {
      const item = createSearchResultItem(name, surahMap.get(name), svgContainer, els, hideResults);
      els.results.appendChild(item);
    });
    
    showResults();
  };

  els.clearBtn.addEventListener('click', hideResults);
  els.searchInput.addEventListener('input', (e) => renderResults(e.target.value.trim()));
  
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && els.resultsPanel.classList.contains('active')) {
      hideResults();
    }
  });
};

const createSearchResultItem = (name, group, svgContainer, els, hideResults) => {
  const isActive = group?.querySelector('.surah-path').classList.contains('active');
  const item = document.createElement('div');
  item.className = `search-result-item ${isActive ? 'active' : ''}`;
  item.innerHTML = `<span class="result-text">${name}</span>${isActive ? '<span class="result-badge">✓</span>' : ''}`;
  
  item.addEventListener('click', () => {
    if (group) {
      const paths = group.querySelectorAll('.surah-path');
      const wasActive = paths[0].classList.contains('active');
      
      paths.forEach(p => p.classList.toggle('active', !wasActive));
      updateLocalStorage(name, !wasActive);
      
      item.classList.toggle('active', !wasActive);
      item.innerHTML = `<span class="result-text">${name}</span>${!wasActive ? '<span class="result-badge">✓</span>' : ''}`;
      
      scrollToSurah(group, svgContainer);
      setTimeout(hideResults, 500);
    }
  });
  
  return item;
};

const scrollToSurah = (group, container) => {
  const rect = group.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();
  container.scrollTo({
    left: rect.left - containerRect.left + container.scrollLeft - containerRect.width / 2 + rect.width / 2,
    top: rect.top - containerRect.top + container.scrollTop - containerRect.height / 2 + rect.height / 2,
    behavior: 'smooth'
  });
};

const setupDownload = (els, svg) => {
  const showPanel = () => {
    els.downloadPanel.classList.add('active');
  };

  const hidePanel = () => {
    els.downloadPanel.classList.remove('active');
  };

  const wrapper = els.downloadBtn.closest('.download-wrapper');
  
  wrapper.addEventListener('mouseenter', showPanel);
  wrapper.addEventListener('mouseleave', hidePanel);

  els.downloadOptions.forEach(btn => {
    if (btn.id !== 'custom-download-btn') {
      btn.addEventListener('click', () => {
        downloadImage(parseInt(btn.dataset.width), parseInt(btn.dataset.height), svg);
      });
    }
  });

  els.customBtn.addEventListener('click', () => {
    els.customSizeModal.classList.add('active');
  });

  els.customSizeCancel.addEventListener('click', () => {
    els.customSizeModal.classList.remove('active');
  });

  els.customSizeModal.addEventListener('click', (e) => {
    if (e.target === els.customSizeModal) {
      els.customSizeModal.classList.remove('active');
    }
  });

  els.customConfirm.addEventListener('click', () => {
    const w = parseInt(els.customWidth.value);
    const h = parseInt(els.customHeight.value);
    if (w >= 100 && w <= 10000 && h >= 100 && h <= 10000) {
      downloadImage(w, h, svg);
      els.customSizeModal.classList.remove('active');
    } else {
      alert('الرجاء إدخال أبعاد صحيحة بين 100 و 10000 بكسل');
    }
  });
};

const downloadImage = (w, h, svg) => {
  if (!svg) return;

  const cloned = svg.cloneNode(true);
  const { scaledWidth, scaledHeight, x, y } = calculateImageDimensions(w, h, svg);
  
  prepareSVGForDownload(cloned, svg, scaledWidth, scaledHeight);
  renderAndDownload(cloned, w, h, x, y, scaledWidth, scaledHeight);
};

const calculateImageDimensions = (w, h, svg) => {
  const viewBox = svg.getAttribute('viewBox') || '0 0 1080 1920';
  const [,, vw, vh] = viewBox.split(' ').map(Number);
  const ratio = vw / vh;
  const targetRatio = w / h;
  
  let sw, sh;
  if (ratio > targetRatio) {
    sw = w * 0.8;
    sh = sw / ratio;
  } else {
    sh = h * 0.8;
    sw = sh * ratio;
  }
  
  return {
    scaledWidth: sw,
    scaledHeight: sh,
    x: (w - sw) / 2,
    y: (h - sh) / 2
  };
};

const prepareSVGForDownload = (cloned, original, width, height) => {
  const viewBox = original.getAttribute('viewBox') || '0 0 1080 1920';
  
  cloned.setAttribute('width', width);
  cloned.setAttribute('height', height);
  cloned.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  cloned.setAttribute('viewBox', viewBox);
  
  const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
  style.textContent = `
    .surah-path { fill: #ffffff; }
    .surah-path.active { fill: #e63946; }
    .surah-name { fill: #000000; font-family: 'Tajawal', Arial, sans-serif; font-size: 14px; font-weight: bold; pointer-events: none; user-select: none; }
    .surah-path.active + .surah-name { fill: #ffffff; }
  `;
  cloned.insertBefore(style, cloned.firstChild);
};

const renderAndDownload = (clonedSVG, canvasWidth, canvasHeight, x, y, imgWidth, imgHeight) => {
  const canvas = document.createElement('canvas');
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext('2d');
  
  const grad = ctx.createLinearGradient(0, 0, canvasWidth, canvasHeight);
  grad.addColorStop(0, '#1a1f2e');
  grad.addColorStop(0.5, '#2d1b3d');
  grad.addColorStop(1, '#1a1f2e');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  
  const blob = new Blob([new XMLSerializer().serializeToString(clonedSVG)], { 
    type: 'image/svg+xml;charset=utf-8' 
  });
  const url = URL.createObjectURL(blob);
  const img = new Image();
  
  img.onload = () => {
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, x, y, imgWidth, imgHeight);
    
    canvas.toBlob(blob => {
      const link = document.createElement('a');
      link.download = `quran-heart-${canvasWidth}x${canvasHeight}.png`;
      link.href = URL.createObjectURL(blob);
      link.click();
      URL.revokeObjectURL(link.href);
    }, 'image/png', 1.0);
    
    URL.revokeObjectURL(url);
  };
  
  img.src = url;
};

const setupColorPicker = (els) => {
  const colorMap = {
    'gradient-1': 'linear-gradient(135deg, #1a1f2e 0%, #2d1b3d 50%, #1a1f2e 100%)',
    'gradient-2': 'linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)',
    'gradient-3': 'linear-gradient(135deg, #1e3c72 0%, #2a5298 50%, #1e3c72 100%)',
    'gradient-4': 'linear-gradient(135deg, #2d1b3d 0%, #8b5a9f 50%, #2d1b3d 100%)',
    'gradient-5': 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
    'gradient-6': 'linear-gradient(135deg, #2c1810 0%, #8b4513 50%, #2c1810 100%)',
    'gradient-7': 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 50%, #1a1a1a 100%)',
    'gradient-8': 'linear-gradient(135deg, #0d1b2a 0%, #1b263b 50%, #415a77 100%)'
  };

  const savedColor = localStorage.getItem('backgroundColor') || 'gradient-1';
  applyBackgroundColor(savedColor, colorMap);

  const showPanel = () => {
    els.colorPickerPanel.classList.add('active');
  };

  const hidePanel = () => {
    els.colorPickerPanel.classList.remove('active');
  };

  const wrapper = els.colorPickerBtn.closest('.color-picker-wrapper');
  
  wrapper.addEventListener('mouseenter', showPanel);
  wrapper.addEventListener('mouseleave', hidePanel);

  document.querySelectorAll('.color-option').forEach(option => {
    option.addEventListener('click', () => {
      const colorKey = option.dataset.color;
      applyBackgroundColor(colorKey, colorMap);
      localStorage.setItem('backgroundColor', colorKey);
    });
  });
};

const applyBackgroundColor = (colorKey, colorMap) => {
  const body = document.body;
  const html = document.documentElement;
  const gradient = colorMap[colorKey] || colorMap['gradient-1'];
  body.style.background = gradient;
  html.style.background = gradient;
  
  document.querySelectorAll('.color-option').forEach(opt => {
    opt.classList.remove('active');
    if (opt.dataset.color === colorKey) {
      opt.classList.add('active');
    }
  });
};

loadSVG();
