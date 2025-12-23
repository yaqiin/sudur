let colorsConfig = {};

const loadColors = () => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', './assets/config/colors.json', true);
    xhr.onreadystatechange = () => {
      if (xhr.readyState === 4 && (xhr.status === 0 || xhr.status === 200)) {
        try {
          const colorsArray = JSON.parse(xhr.responseText);
          colorsConfig = {};
          colorsArray.forEach(item => {
            colorsConfig[item.id] = item.color;
          });
          resolve(colorsConfig);
        } catch (e) {
          console.error('Error parsing colors.json:', e);
          reject(e);
        }
      }
    };
    xhr.send();
  });
};

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

  const sizeError = document.getElementById('size-error');
  
  const hideError = () => {
    sizeError.style.display = 'none';
    sizeError.textContent = '';
  };

  const showError = (message) => {
    sizeError.textContent = message;
    sizeError.style.display = 'block';
  };

  const validateAndDownload = () => {
    const w = parseInt(els.customWidth.value);
    const h = parseInt(els.customHeight.value);
    
    if (isNaN(w) || isNaN(h)) {
      showError('الرجاء إدخال أبعاد صحيحة');
      return;
    }
    
    if (w < 100 || w > 10000) {
      showError('العرض يجب أن يكون بين 100 و 10000 بكسل');
      return;
    }
    
    if (h < 100 || h > 10000) {
      showError('الارتفاع يجب أن يكون بين 100 و 10000 بكسل');
      return;
    }
    
    hideError();
    downloadImage(w, h, svg);
    els.customSizeModal.classList.remove('active');
  };

  els.customBtn.addEventListener('click', () => {
    els.customSizeModal.classList.add('active');
    hideError();
    setTimeout(() => els.customWidth.focus(), 100);
  });

  els.customSizeCancel.addEventListener('click', () => {
    els.customSizeModal.classList.remove('active');
    hideError();
  });

  els.customSizeModal.addEventListener('click', (e) => {
    if (e.target === els.customSizeModal) {
      els.customSizeModal.classList.remove('active');
      hideError();
    }
  });

  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      els.customWidth.value = btn.dataset.width;
      els.customHeight.value = btn.dataset.height;
      hideError();
      els.customWidth.focus();
    });
  });

  [els.customWidth, els.customHeight].forEach(input => {
    input.addEventListener('input', hideError);
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        validateAndDownload();
      }
    });
  });

  els.customConfirm.addEventListener('click', validateAndDownload);
};

const downloadImage = (w, h, svg) => {
  if (!svg) return;

  const cloned = svg.cloneNode(true);
  cloned.style.transform = 'none';
  cloned.style.width = '';
  cloned.style.height = '';
  
  const { scaledWidth, scaledHeight, x, y } = calculateImageDimensions(w, h, svg);
  
  prepareSVGForDownload(cloned, svg, scaledWidth, scaledHeight);
  renderAndDownload(cloned, w, h, x, y, scaledWidth, scaledHeight);
};

const calculateImageDimensions = (w, h, svg) => {
  const viewBox = svg.getAttribute('viewBox') || '0 0 1080 1920';
  const [,, vw, vh] = viewBox.split(' ').map(Number);
  const ratio = vw / vh;
  const targetRatio = w / h;
  
  const padding = 5;
  const availableWidth = w - padding * 2;
  const availableHeight = h - padding * 2;
  
  let sw, sh;
  if (ratio > targetRatio) {
    sw = availableWidth;
    sh = sw / ratio;
  } else {
    sh = availableHeight;
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
  
  cloned.removeAttribute('style');
  cloned.removeAttribute('width');
  cloned.removeAttribute('height');
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
  
  const savedColor = localStorage.getItem('backgroundColor') || 'gradient-1';
  const colorValue = colorsConfig[savedColor] || colorsConfig['gradient-1'] || colorsConfig[Object.keys(colorsConfig)[0]] || '#1a1f2e';
  
  if (colorValue.startsWith('linear-gradient')) {
    const grad = ctx.createLinearGradient(0, 0, canvasWidth, canvasHeight);
    const colorMatches = colorValue.matchAll(/#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3}/g);
    const colors = Array.from(colorMatches).map(m => m[0]);
    const percentMatches = colorValue.matchAll(/(\d+(?:\.\d+)?)%/g);
    const percents = Array.from(percentMatches).map(m => parseFloat(m[1]) / 100);
    
    if (colors.length > 0) {
      if (percents.length === colors.length) {
        colors.forEach((color, i) => {
          grad.addColorStop(percents[i], color);
        });
      } else {
        colors.forEach((color, i) => {
          grad.addColorStop(i / (colors.length - 1 || 1), color);
        });
      }
    }
    ctx.fillStyle = grad;
  } else {
    ctx.fillStyle = colorValue;
  }
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
      link.download = `صورة-القرأن-${canvasWidth}x${canvasHeight}.png`;
      link.href = URL.createObjectURL(blob);
      link.click();
      URL.revokeObjectURL(link.href);
    }, 'image/png', 1.0);
    
    URL.revokeObjectURL(url);
  };
  
  img.src = url;
};

const setupColorPicker = (els) => {
  const colorOptionsContainer = els.colorPickerPanel.querySelector('.color-options');
  colorOptionsContainer.innerHTML = '';
  
  Object.keys(colorsConfig).forEach(key => {
    const colorOption = document.createElement('div');
    colorOption.className = 'color-option';
    colorOption.dataset.color = key;
    colorOption.style.background = colorsConfig[key];
    colorOptionsContainer.appendChild(colorOption);
  });

  const savedColor = localStorage.getItem('backgroundColor') || Object.keys(colorsConfig)[0] || 'gradient-1';
  applyBackgroundColor(savedColor);

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
      applyBackgroundColor(colorKey);
      localStorage.setItem('backgroundColor', colorKey);
    });
  });
};

const applyBackgroundColor = (colorKey) => {
  const body = document.body;
  const html = document.documentElement;
  const colorValue = colorsConfig[colorKey] || colorsConfig[Object.keys(colorsConfig)[0]];
  if (!colorValue) return;
  
  body.style.background = colorValue;
  html.style.background = colorValue;
  
  document.querySelectorAll('.color-option').forEach(opt => {
    opt.classList.remove('active');
    if (opt.dataset.color === colorKey) {
      opt.classList.add('active');
    }
  });
};

loadColors().then(() => {
  loadSVG();
}).catch(() => {
  console.error('Failed to load colors, using defaults');
  loadSVG();
});
