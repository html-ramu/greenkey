// ============================================================
//  GreenKey — Green Screen Remover (v2.1 - Clean UI + Live Sliders)
// ============================================================

// ---- DOM References ----------------------------------------
const imageUpload      = document.getElementById("imageUpload");
const fileNameEl       = document.getElementById("fileName");
const keyColorInput    = document.getElementById("keyColor");
const colorHexEl       = document.getElementById("colorHex");
const toleranceSlider  = document.getElementById("tolerance");
const toleranceVal     = document.getElementById("toleranceVal");
const smoothnessSlider = document.getElementById("smoothness");
const smoothnessVal    = document.getElementById("smoothnessVal");
const spillToggle      = document.getElementById("spillToggle");
const skinToggle       = document.getElementById("skinToggle");
const applyBtn         = document.getElementById("applyBtn");
const resetBtn         = document.getElementById("resetBtn");
const downloadBtn      = document.getElementById("downloadBtn");
const originalCanvas   = document.getElementById("originalCanvas");
const resultCanvas     = document.getElementById("resultCanvas");
const emptyState       = document.getElementById("emptyState");
const tabOriginal      = document.getElementById("tabOriginal");
const tabResult        = document.getElementById("tabResult");
const statusText       = document.getElementById("statusText");
const imageDimensions  = document.getElementById("imageDimensions");
const themeToggle      = document.getElementById("themeToggle");
const themeIcon        = document.getElementById("themeIcon");

// ---- Canvas Contexts ----------------------------------------
const origCtx   = originalCanvas.getContext("2d");
const resultCtx = resultCanvas.getContext("2d", { willReadFrequently: true });

// ---- State --------------------------------------------------
let originalImage = null;
let activeTab     = "original";
let isProcessed   = false; // Tracks if the user has clicked "Apply"

// ============================================================
//  THEME TOGGLE
// ============================================================
themeToggle.addEventListener("click", () => {
  const html = document.documentElement;
  if (html.dataset.theme === "dark") {
    html.dataset.theme = "light";
    themeIcon.textContent = "🌙";
  } else {
    html.dataset.theme = "dark";
    themeIcon.textContent = "☀️";
  }
});

// ============================================================
//  IMAGE UPLOAD
// ============================================================
imageUpload.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;

  fileNameEl.textContent = file.name;
  setStatus("Loading image…");

  const reader = new FileReader();
  reader.onload = (ev) => {
    const img = new Image();
    img.onload = () => {
      originalImage = img;
      isProcessed = false;

      originalCanvas.width  = img.width;
      originalCanvas.height = img.height;
      resultCanvas.width    = img.width;
      resultCanvas.height   = img.height;

      origCtx.drawImage(img, 0, 0);
      resultCtx.drawImage(img, 0, 0);

      emptyState.style.display     = "none";
      originalCanvas.style.display = "block";
      resultCanvas.style.display   = "none";

      applyBtn.disabled    = false;
      resetBtn.disabled    = false;
      downloadBtn.disabled = false;

      switchTab("original");

      imageDimensions.textContent = `${img.width} × ${img.height} px`;
      setStatus("Image loaded. Ready to apply.");
    };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
});

// ============================================================
//  SLIDER & TOGGLE LABELS AND LIVE UPDATES
// ============================================================
function handleControlChange() {
  if (isProcessed) {
    applyChromaKey(); // Auto-update if already applied
  }
}

keyColorInput.addEventListener("input", () => {
  colorHexEl.textContent = keyColorInput.value;
  handleControlChange();
});

toleranceSlider.addEventListener("input", () => {
  toleranceVal.textContent = toleranceSlider.value;
  handleControlChange();
});

smoothnessSlider.addEventListener("input", () => {
  smoothnessVal.textContent = smoothnessSlider.value;
  handleControlChange();
});

spillToggle.addEventListener("change", handleControlChange);
skinToggle.addEventListener("change", handleControlChange);

// ============================================================
//  APPLY
// ============================================================
applyBtn.addEventListener("click", () => {
  if (!originalImage) return;
  setStatus("Processing…");
  setTimeout(() => {
    applyChromaKey();
    isProcessed = true;
    switchTab("result");
    setStatus("Done! Background removed.");
  }, 30);
});

// ============================================================
//  CORE: RGB → HSV CONVERTER
// ============================================================
function rgbToHsv(r, g, b) {
  r /= 255; g /= 255; b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  let h = 0;
  if (delta !== 0) {
    if      (max === r) h = 60 * (((g - b) / delta) % 6);
    else if (max === g) h = 60 * (((b - r) / delta) + 2);
    else                h = 60 * (((r - g) / delta) + 4);
  }
  if (h < 0) h += 360;

  const s = max === 0 ? 0 : delta / max;
  const v = max;

  return { h, s, v };
}

// ============================================================
//  SKIN TONE DETECTION (HSV-based)
// ============================================================
function isSkinTone(h, s, v) {
  return (
    h >= 0   && h <= 50  &&
    s >= 0.10 && s <= 0.70 &&
    v >= 0.20
  );
}

// ============================================================
//  MAIN CHROMA KEY FUNCTION
// ============================================================
function applyChromaKey() {
  const tolerance    = parseInt(toleranceSlider.value);
  const smoothness   = parseInt(smoothnessSlider.value);
  const doSpill      = spillToggle.checked;
  const doSkinProtect= skinToggle.checked;
  const hexColor     = keyColorInput.value;

  const keyR = parseInt(hexColor.slice(1, 3), 16);
  const keyG = parseInt(hexColor.slice(3, 5), 16);
  const keyB = parseInt(hexColor.slice(5, 7), 16);
  const keyHsv = rgbToHsv(keyR, keyG, keyB);

  const w = originalCanvas.width;
  const h = originalCanvas.height;

  // Read fresh from ORIGINAL context to prevent degrading quality
  const imageData = origCtx.getImageData(0, 0, w, h);
  const data = imageData.data;

  const hueTol   = (tolerance / 100) * 90;
  const satTol   = (tolerance / 100) * 0.6;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    const { h: pH, s: pS, v: pV } = rgbToHsv(r, g, b);

    if (doSkinProtect && isSkinTone(pH, pS, pV)) {
      continue; 
    }

    let hueDiff = Math.abs(pH - keyHsv.h);
    if (hueDiff > 180) hueDiff = 360 - hueDiff;

    const satDiff = Math.abs(pS - keyHsv.s);
    const score = hueDiff + satDiff * 30; 

    const softMin = hueTol;
    const softMax = hueTol + smoothness * 0.8;

    if (score < softMin) {
      data[i + 3] = 0;
    } else if (score < softMax) {
      const blend = (score - softMin) / (softMax - softMin); 
      data[i + 3] = Math.round(blend * 255);

      if (doSpill) {
        const spillStrength = 1 - blend; 
        const neutralG = (r + b) / 2;
        data[i + 1] = Math.round(g - (g - neutralG) * spillStrength * 0.9);
      }
    } else {
      if (doSpill && pS > 0.35 && hueDiff < hueTol + smoothness * 2) {
        const spillFactor = Math.max(0, 1 - (score - softMax) / (hueTol * 0.5));
        if (spillFactor > 0) {
          const neutralG = (r + b) / 2;
          data[i + 1] = Math.round(g - (g - neutralG) * spillFactor * 0.5);
        }
      }
    }
  }

  resultCtx.clearRect(0, 0, w, h);
  resultCtx.putImageData(imageData, 0, 0);
}

// ============================================================
//  RESET
// ============================================================
resetBtn.addEventListener("click", () => {
  if (!originalImage) return;
  isProcessed = false;
  resultCtx.clearRect(0, 0, resultCanvas.width, resultCanvas.height);
  resultCtx.drawImage(originalImage, 0, 0);
  switchTab("original");
  setStatus("Reset to original.");
});

// ============================================================
//  DOWNLOAD
// ============================================================
downloadBtn.addEventListener("click", () => {
  if (!originalImage) return;
  const link = document.createElement("a");
  link.download = "greenkey_result.png";
  link.href = resultCanvas.toDataURL("image/png");
  link.click();
  setStatus("Downloaded as greenkey_result.png");
});

// ============================================================
//  TAB SWITCHING
// ============================================================
tabOriginal.addEventListener("click", () => switchTab("original"));
tabResult.addEventListener("click",   () => switchTab("result"));

function switchTab(tab) {
  activeTab = tab;
  if (tab === "original") {
    originalCanvas.style.display = originalImage ? "block" : "none";
    resultCanvas.style.display   = "none";
    tabOriginal.classList.add("active");
    tabResult.classList.remove("active");
  } else {
    originalCanvas.style.display = "none";
    resultCanvas.style.display   = originalImage ? "block" : "none";
    tabOriginal.classList.remove("active");
    tabResult.classList.add("active");
  }
}

// ============================================================
//  STATUS BAR
// ============================================================
function setStatus(msg) {
  statusText.textContent = msg;
}
