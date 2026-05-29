const root = document.documentElement;

const themeToggle = document.getElementById("theme-toggle");
const themeIcon = document.getElementById("theme-icon");
const themeLabel = document.getElementById("theme-label");

const modeSelect = document.getElementById("mode-select");
const textMode = document.getElementById("text-mode");
const wifiMode = document.getElementById("wifi-mode");

const input = document.getElementById("qr-input");
const wifiSsid = document.getElementById("wifi-ssid");
const wifiPass = document.getElementById("wifi-pass");
const wifiType = document.getElementById("wifi-type");
const wifiHidden = document.getElementById("wifi-hidden");

const colorPicker = document.getElementById("qr-color");
const sizeSlider = document.getElementById("qr-size");
const sizeLabel = document.getElementById("size-label");
const shapeSelect = document.getElementById("qr-shape");
const cornerStyleSelect = document.getElementById("corner-style");

const logoInput = document.getElementById("qr-logo");
const uploadBtn = document.getElementById("upload-btn");
const clearLogoBtn = document.getElementById("clear-logo-btn");
const logoName = document.getElementById("logo-name");

const downloadBtn = document.getElementById("download-btn");
const copyBtn = document.getElementById("copy-btn");
const charCount = document.getElementById("char-count");
const qrContainer = document.getElementById("qr-container");
const statusEl = document.getElementById("status");

const STORAGE_KEY = "qr-generator-v3";

let logoDataUrl = "";
let updateTimer = null;

const defaultState = {
  theme: "dark",
  mode: "text",
  text: "https://example.com",
  wifi: {
    ssid: "",
    pass: "",
    type: "WPA",
    hidden: false
  },
  color: "#111111",
  size: 300,
  shape: "rounded",
  cornerStyle: "extra-rounded",
  logoName: ""
};

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return structuredClone(defaultState);
    const parsed = JSON.parse(saved);
    return {
      ...structuredClone(defaultState),
      ...parsed,
      wifi: { ...structuredClone(defaultState.wifi), ...(parsed.wifi || {}) }
    };
  } catch {
    return structuredClone(defaultState);
  }
}

function saveState() {
  const state = {
    theme: root.dataset.theme || "dark",
    mode: modeSelect.value,
    text: input.value,
    wifi: {
      ssid: wifiSsid.value,
      pass: wifiPass.value,
      type: wifiType.value,
      hidden: wifiHidden.checked
    },
    color: colorPicker.value,
    size: Number(sizeSlider.value),
    shape: shapeSelect.value,
    cornerStyle: cornerStyleSelect.value,
    logoName: logoName.textContent === "No logo selected" ? "" : logoName.textContent,
    logoDataUrl
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore storage failures
  }
}

function setStatus(message) {
  statusEl.textContent = message;
}

function setTheme(theme) {
  root.dataset.theme = theme;
  const isDark = theme === "dark";
  themeIcon.textContent = isDark ? "🌙" : "☀️";
  themeLabel.textContent = isDark ? "Dark" : "Light";
  saveState();
}

function updateModeUI() {
  const isWifi = modeSelect.value === "wifi";
  textMode.classList.toggle("hidden", isWifi);
  wifiMode.classList.toggle("hidden", !isWifi);
}

function updateCounters() {
  const isWifi = modeSelect.value === "wifi";
  const payloadLength = isWifi ? buildWifiPayload().length : input.value.length;
  charCount.textContent = `${payloadLength} character${payloadLength === 1 ? "" : "s"}`;
  sizeLabel.textContent = `${sizeSlider.value}px`;
}

function escapeWifiValue(value) {
  return String(value)
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/:/g, "\\:");
}

function buildWifiPayload() {
  const ssid = wifiSsid.value.trim();
  const pass = wifiPass.value;
  const type = wifiType.value;
  const hidden = wifiHidden.checked ? "true" : "false";

  if (!ssid) return "";

  const escapedSsid = escapeWifiValue(ssid);
  const escapedPass = escapeWifiValue(pass);

  if (type === "nopass") {
    return `WIFI:T:nopass;S:${escapedSsid};H:${hidden};;`;
  }

  return `WIFI:T:${type};S:${escapedSsid};P:${escapedPass};H:${hidden};;`;
}

function buildData() {
  if (modeSelect.value === "wifi") {
    return buildWifiPayload();
  }
  return input.value.trim();
}

function buildOptions() {
  const data = buildData();

  return {
    width: Number(sizeSlider.value),
    height: Number(sizeSlider.value),
    type: "canvas",
    data: data || " ",
    image: logoDataUrl || undefined,
    margin: 10,
    qrOptions: {
      errorCorrectionLevel: "H"
    },
    dotsOptions: {
      color: colorPicker.value,
      type: shapeSelect.value
    },
    cornersSquareOptions: {
      color: colorPicker.value,
      type: cornerStyleSelect.value
    },
    cornersDotOptions: {
      color: colorPicker.value,
      type: "dot"
    },
    backgroundOptions: {
      color: "transparent"
    },
    imageOptions: {
      hideBackgroundDots: true,
      imageSize: 0.34,
      margin: 10,
      crossOrigin: "anonymous"
    }
  };
}

const qrCode = new QRCodeStyling(buildOptions());
qrCode.append(qrContainer);

function refreshQR() {
  updateCounters();

  const data = buildData();

  if (modeSelect.value === "wifi" && !data) {
    qrContainer.innerHTML = "";
    setStatus("Enter a Wi-Fi name to generate the code.");
    saveState();
    return;
  }

  if (modeSelect.value === "text" && !data) {
    qrContainer.innerHTML = "";
    setStatus("Paste something and I’ll draw the magic.");
    saveState();
    return;
  }

  try {
    qrCode.update(buildOptions());
    setStatus(
      logoDataUrl
        ? "Live preview updated with logo."
        : modeSelect.value === "wifi"
          ? "Live Wi-Fi QR updated."
          : "Live preview updated."
    );
    saveState();
  } catch (error) {
    console.error(error);
    setStatus("Something got weird while generating the QR.");
  }
}

function scheduleRefresh() {
  clearTimeout(updateTimer);
  updateTimer = setTimeout(refreshQR, 70);
}

function applyState(state) {
  setTheme(state.theme || "dark");

  modeSelect.value = state.mode || "text";
  input.value = state.text || defaultState.text;

  wifiSsid.value = state.wifi?.ssid || "";
  wifiPass.value = state.wifi?.pass || "";
  wifiType.value = state.wifi?.type || "WPA";
  wifiHidden.checked = Boolean(state.wifi?.hidden);

  colorPicker.value = state.color || defaultState.color;
  sizeSlider.value = String(state.size || defaultState.size);
  shapeSelect.value = state.shape || defaultState.shape;
  cornerStyleSelect.value = state.cornerStyle || defaultState.cornerStyle;

  logoDataUrl = state.logoDataUrl || "";
  logoName.textContent = state.logoName || "No logo selected";

  updateModeUI();
  updateCounters();
  refreshQR();
}

function safeFileNameFromPayload(payload) {
  const base = payload.slice(0, 30).replace(/[^\w\-]+/g, "_").replace(/^_+|_+$/g, "");
  return base || (modeSelect.value === "wifi" ? "wifi-qr" : "qr");
}

function syncFileLabel(file) {
  if (!file) {
    logoName.textContent = "No logo selected";
    return;
  }
  logoName.textContent = file.name;
}

function readLogo(file) {
  if (!file) {
    logoDataUrl = "";
    logoName.textContent = "No logo selected";
    refreshQR();
    return;
  }

  if (!file.type.startsWith("image/")) {
    setStatus("That file is not an image.");
    logoInput.value = "";
    return;
  }

  const reader = new FileReader();

  reader.onload = () => {
    logoDataUrl = String(reader.result || "");
    syncFileLabel(file);
    refreshQR();
  };

  reader.onerror = () => {
    setStatus("Could not read that image.");
  };

  reader.readAsDataURL(file);
}

themeToggle.addEventListener("click", () => {
  const nextTheme = root.dataset.theme === "dark" ? "light" : "dark";
  setTheme(nextTheme);
});

modeSelect.addEventListener("change", () => {
  updateModeUI();
  refreshQR();
});

[
  input,
  wifiSsid,
  wifiPass
].forEach((el) => {
  el.addEventListener("input", scheduleRefresh);
});

[
  wifiType,
  wifiHidden,
  colorPicker,
  sizeSlider,
  shapeSelect,
  cornerStyleSelect
].forEach((el) => {
  el.addEventListener(el.tagName === "SELECT" ? "change" : "input", scheduleRefresh);
});

uploadBtn.addEventListener("click", () => {
  logoInput.click();
});

logoInput.addEventListener("change", () => {
  const file = logoInput.files && logoInput.files[0];
  readLogo(file);
});

clearLogoBtn.addEventListener("click", () => {
  logoDataUrl = "";
  logoInput.value = "";
  syncFileLabel(null);
  refreshQR();
  setStatus("Logo removed.");
});

downloadBtn.addEventListener("click", async () => {
  const data = buildData();

  if (!data || (modeSelect.value === "wifi" && !wifiSsid.value.trim())) {
    setStatus("Nothing to download yet.");
    return;
  }

  const safeName = safeFileNameFromPayload(data);

  try {
    await qrCode.download({
      name: safeName,
      extension: "png"
    });
    setStatus("PNG downloaded cleanly.");
  } catch (error) {
    console.error(error);
    setStatus("Download failed for some reason.");
  }
});

copyBtn.addEventListener("click", async () => {
  const payload = buildData();

  if (!payload) {
    setStatus("Nothing to copy.");
    return;
  }

  try {
    await navigator.clipboard.writeText(payload);
    setStatus("Payload copied.");
  } catch (error) {
    console.error(error);
    setStatus("Clipboard blocked by browser.");
  }
});

document.addEventListener("keydown", (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
    event.preventDefault();
    downloadBtn.click();
  }
});

const savedState = loadState();
applyState(savedState);

setTimeout(() => {
  refreshQR();
}, 0);