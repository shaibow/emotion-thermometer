const STORAGE_PREFIX = "emotion-thermometer:";
const CELEBRATION_COLORS = ["#ff5a70", "#ff9f1c", "#ffd166", "#4ecdc4", "#7c5cff"];
const SESSION_NAME_KEY = `${STORAGE_PREFIX}session-name`;
const HISTORY_LIMIT = 8;
const OTHER_EMOTION = "Other";
const ZONE_DETAILS = {
  red: "Very intense",
  orange: "Strong emotion",
  yellow: "Early warning",
  green: "Calm and steady",
};
const COLUMN_LABELS = {
  feeling: "Feeling",
  physical: "Physical signals",
  thoughts: "Thoughts",
  behavior: "Behavior",
  coping: "What can I do?",
};

function pageKey() {
  return STORAGE_PREFIX + document.body.dataset.page;
}

function zoneKey() {
  return `${pageKey()}:selected-zone`;
}

function historyKey() {
  return `${pageKey()}:feeling-history`;
}

function currentHistoryIdKey() {
  return `${pageKey()}:current-history-id`;
}

function todayInputValue() {
  const today = new Date();
  today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
  return today.toISOString().slice(0, 10);
}

function readFormData(form) {
  const data = {};
  form.querySelectorAll("[data-field]").forEach((el) => {
    data[el.dataset.field] = el.value;
  });
  return data;
}

function setStoredValue(form, field, value, data) {
  if (field.tagName === "SELECT") {
    const optionValues = [...field.options].map((option) => option.value);
    if (optionValues.includes(value)) {
      field.value = value;
      return;
    }

    if (field.dataset.field === "emotion" && optionValues.includes(OTHER_EMOTION)) {
      field.value = OTHER_EMOTION;
      const otherField = form.querySelector("[data-field='emotionOther']");
      if (otherField && !data.emotionOther) {
        otherField.value = value;
      }
      return;
    }
  }

  field.value = value;
}

function saveForm(form) {
  const data = readFormData(form);
  localStorage.setItem(pageKey(), JSON.stringify(data));
  return data;
}

function loadForm(form) {
  const raw = localStorage.getItem(pageKey());
  if (!raw) return {};
  try {
    const data = JSON.parse(raw);
    form.querySelectorAll("[data-field]").forEach((el) => {
      let value = data[el.dataset.field];
      if (el.dataset.field === "emotion" && value == null && data.theme != null) {
        value = data.theme;
      }
      if (value != null) {
        setStoredValue(form, el, value, data);
      }
    });
    return data;
  } catch {
    /* ignore corrupt storage */
    return {};
  }
}

function getFields(form) {
  return [...form.querySelectorAll("[data-field]")].filter((field) => !field.disabled);
}

function getProgressFields(form) {
  return getFields(form).filter((field) => {
    if (field.closest("[hidden]")) return false;
    if (field.dataset.field === "name") return false;

    const zoneRow = field.closest("tr[data-zone]");
    return !zoneRow || zoneRow.classList.contains("is-selected");
  });
}

function hydrateSessionName(form) {
  const nameField = form.querySelector("[data-field='name']");
  if (!nameField) return false;

  const storedName = sessionStorage.getItem(SESSION_NAME_KEY);
  if (storedName != null) {
    nameField.value = storedName;
    return true;
  }

  if (nameField.value.trim()) {
    sessionStorage.setItem(SESSION_NAME_KEY, nameField.value);
  }
  return false;
}

function saveSessionName(form) {
  const nameField = form.querySelector("[data-field='name']");
  if (!nameField) return;
  sessionStorage.setItem(SESSION_NAME_KEY, nameField.value);
}

function prefillDate(form) {
  const dateField = form.querySelector("[data-field='date']");
  if (!dateField || dateField.value) return false;
  dateField.value = todayInputValue();
  return true;
}

function updateEmotionOther(form) {
  const emotionField = form.querySelector("[data-field='emotion']");
  const otherWrap = form.querySelector("[data-emotion-other]");
  const otherField = form.querySelector("[data-field='emotionOther']");
  if (!emotionField || !otherWrap || !otherField) return;

  const isOther = emotionField.value === OTHER_EMOTION;
  otherWrap.hidden = !isOther;
  otherField.disabled = !isOther;
}

function createProgressMeter(form) {
  const meter = document.createElement("section");
  meter.className = "progress-card no-print";
  meter.setAttribute("aria-live", "polite");
  meter.innerHTML = `
    <div class="progress-topline">
      <div>
        <p class="eyebrow">Fill progress</p>
        <strong data-progress-label>0%</strong>
      </div>
      <span class="progress-spark">Keep going</span>
    </div>
    <div class="progress-track" aria-hidden="true">
      <span data-progress-bar></span>
    </div>
    <p data-progress-copy>Start with any cell. Your edits save automatically.</p>
  `;
  const anchor = form.querySelector(".meta-fields") || form.querySelector(".thermometer-intro");
  if (anchor) {
    anchor.insertAdjacentElement("afterend", meter);
  } else {
    form.prepend(meter);
  }

  return {
    element: meter,
    bar: meter.querySelector("[data-progress-bar]"),
    label: meter.querySelector("[data-progress-label]"),
    copy: meter.querySelector("[data-progress-copy]"),
    spark: meter.querySelector(".progress-spark"),
  };
}

function getZoneRows(form) {
  return [...form.querySelectorAll("tr[data-zone]")];
}

function createHistoryPanel(form) {
  if (!form.querySelector(".meta-fields")) return null;

  const panel = document.createElement("section");
  panel.className = "history-card no-print";
  panel.dataset.historyCard = "";
  panel.innerHTML = `
    <div class="history-card-header">
      <div>
        <p class="eyebrow">Browser memory</p>
        <h2>Past feeling inputs</h2>
      </div>
      <button type="button" data-action="clear-history">Clear history</button>
    </div>
    <div class="history-list" data-history-list></div>
  `;

  const actions = form.querySelector(".actions");
  if (actions) {
    actions.insertAdjacentElement("afterend", panel);
  } else {
    form.appendChild(panel);
  }
  return panel;
}

function getHistory() {
  try {
    const history = JSON.parse(localStorage.getItem(historyKey()) || "[]");
    return Array.isArray(history) ? history : [];
  } catch {
    return [];
  }
}

function setHistory(history) {
  localStorage.setItem(historyKey(), JSON.stringify(history));
}

function getCurrentHistoryId() {
  let id = localStorage.getItem(currentHistoryIdKey());
  if (!id) {
    id = window.crypto?.randomUUID ? window.crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    localStorage.setItem(currentHistoryIdKey(), id);
  }
  return id;
}

function getEmotionLabel(form, data = readFormData(form)) {
  const emotion = (data.emotion || data.theme || "").trim();
  if (emotion === OTHER_EMOTION) {
    return (data.emotionOther || "").trim() || OTHER_EMOTION;
  }
  return emotion;
}

function getZoneSnapshots(form, data = readFormData(form)) {
  return getZoneRows(form)
    .map((row) => {
      const fields = [...row.querySelectorAll("textarea[data-field]")]
        .map((ta) => {
          const colKey = ta.dataset.field.replace(/^[^-]+-/, "");
          return {
            key: colKey,
            label: COLUMN_LABELS[colKey] || colKey,
            value: (data[ta.dataset.field] || "").trim(),
          };
        })
        .filter((f) => f.value);
      return {
        zone: row.dataset.zone,
        label: row.cells[0]?.textContent.trim() || row.dataset.zone,
        fields,
      };
    })
    .filter((item) => item.fields.length > 0);
}

function saveFeelingHistory(form, data = readFormData(form)) {
  if (!form.querySelector("[data-history-card]")) return;

  const zones = getZoneSnapshots(form, data);
  if (!zones.length) {
    renderHistory(form);
    return;
  }

  const entry = {
    id: getCurrentHistoryId(),
    savedAt: new Date().toISOString(),
    date: data.date || todayInputValue(),
    name: (data.name || "").trim(),
    emotion: getEmotionLabel(form, data),
    activeZone: form.dataset.activeZone || "",
    zones,
  };
  const history = [entry, ...getHistory().filter((item) => item.id !== entry.id)].slice(0, HISTORY_LIMIT);
  setHistory(history);
  renderHistory(form);
}

function formatDate(value) {
  if (!value) return "No date";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function removeHistoryEntry(id) {
  setHistory(getHistory().filter((entry) => entry.id !== id));
}

function renderHistory(form) {
  const list = form.querySelector("[data-history-list]");
  if (!list) return;

  list.textContent = "";
  const history = getHistory();
  if (!history.length) {
    const empty = document.createElement("p");
    empty.className = "history-empty";
    empty.textContent = "No saved feeling inputs yet. Start filling in the thermometer and this browser will remember them.";
    list.appendChild(empty);
    return;
  }

  history.forEach((entry) => {
    const article = document.createElement("article");
    article.className = "history-entry";

    const header = document.createElement("div");
    header.className = "history-entry-header";

    const title = document.createElement("h3");
    title.textContent = entry.emotion || "Untitled feeling";

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "history-remove-btn";
    removeBtn.setAttribute("aria-label", "Remove this entry");
    removeBtn.textContent = "×";
    removeBtn.addEventListener("click", () => {
      removeHistoryEntry(entry.id);
      renderHistory(form);
    });

    header.append(title, removeBtn);

    const meta = document.createElement("p");
    meta.className = "history-meta";
    meta.textContent = [formatDate(entry.date), entry.name, entry.activeZone && `${entry.activeZone} zone`]
      .filter(Boolean)
      .join(" - ");

    article.append(header, meta);

    const zones = entry.zones || [];
    const legacyFeelings = !entry.zones && Array.isArray(entry.feelings) ? entry.feelings : [];

    if (zones.length) {
      const zoneList = document.createElement("div");
      zoneList.className = "history-zones";
      zones.forEach((zone) => {
        const zoneEl = document.createElement("div");
        zoneEl.className = `history-zone zone-${zone.zone}`;

        const zoneLabel = document.createElement("span");
        zoneLabel.className = "history-zone-label";
        zoneLabel.textContent = zone.label;
        zoneEl.appendChild(zoneLabel);

        const fieldsList = document.createElement("div");
        fieldsList.className = "history-zone-fields";
        zone.fields.forEach((field) => {
          const chip = document.createElement("span");
          chip.className = `feeling-chip zone-${zone.zone}`;
          chip.textContent = `${field.label}: ${field.value}`;
          fieldsList.appendChild(chip);
        });
        zoneEl.appendChild(fieldsList);
        zoneList.appendChild(zoneEl);
      });
      article.appendChild(zoneList);
    } else if (legacyFeelings.length) {
      const chips = document.createElement("div");
      chips.className = "feeling-chips";
      legacyFeelings.forEach((feeling) => {
        const chip = document.createElement("span");
        chip.className = `feeling-chip zone-${feeling.zone}`;
        chip.textContent = `${feeling.label}: ${feeling.value}`;
        chips.appendChild(chip);
      });
      article.appendChild(chips);
    }

    list.appendChild(article);
  });
}

function updateStepProgress(row) {
  const textareas = [...row.querySelectorAll("textarea[data-field]")];
  const isSelected = row.classList.contains("is-selected");
  textareas.forEach((ta, i) => {
    if (!isSelected) {
      ta.disabled = true;
      return;
    }
    ta.disabled = i > 0 && !textareas[i - 1].value.trim();
  });
}

function updateAllStepProgress(form) {
  getZoneRows(form).forEach(updateStepProgress);
}

function createZonePicker(form) {
  const rows = getZoneRows(form);
  if (!rows.length) return null;

  const picker = document.createElement("section");
  picker.className = "zone-picker no-print";
  picker.setAttribute("aria-label", "Choose a thermometer color");
  picker.innerHTML = `
    <div>
      <p class="eyebrow">Thermometer reading</p>
      <h2>What color are you in right now?</h2>
    </div>
    <div class="zone-buttons" role="group" aria-label="Thermometer colors"></div>
  `;

  const buttons = picker.querySelector(".zone-buttons");
  rows.forEach((row) => {
    const zone = row.dataset.zone;
    const label = row.cells[0]?.textContent.trim() || zone;
    const button = document.createElement("button");
    button.type = "button";
    button.className = `zone-choice zone-${zone}`;
    button.dataset.zoneChoice = zone;
    button.setAttribute("aria-pressed", "false");
    button.innerHTML = `<span>${label}</span><small>${ZONE_DETAILS[zone] || "Select zone"}</small>`;
    buttons.appendChild(button);
  });

  return picker;
}

function selectZone(form, zone) {
  const rows = getZoneRows(form);
  const picker = form.querySelector(".zone-picker");
  const tableWrap = form.querySelector(".table-wrap");
  const activeZone = rows.some((row) => row.dataset.zone === zone) ? zone : "";

  rows.forEach((row) => {
    row.classList.toggle("is-selected", row.dataset.zone === activeZone);
  });

  picker?.querySelectorAll("[data-zone-choice]").forEach((button) => {
    const isSelected = button.dataset.zoneChoice === activeZone;
    button.classList.toggle("is-selected", isSelected);
    button.setAttribute("aria-pressed", String(isSelected));
  });

  tableWrap?.classList.toggle("has-selected-zone", Boolean(activeZone));
  form.dataset.activeZone = activeZone;

  if (activeZone) {
    localStorage.setItem(zoneKey(), activeZone);
  } else {
    localStorage.removeItem(zoneKey());
  }

  updateAllStepProgress(form);
}

function collectStyles() {
  return [...document.styleSheets]
    .map((sheet) => {
      try {
        return [...sheet.cssRules].map((rule) => rule.cssText).join("\n");
      } catch {
        return "";
      }
    })
    .join("\n");
}

function copyFormValues(sourceRoot, cloneRoot) {
  const sourceControls = sourceRoot.querySelectorAll("input, textarea, select");
  const cloneControls = cloneRoot.querySelectorAll("input, textarea, select");

  sourceControls.forEach((sourceControl, index) => {
    const cloneControl = cloneControls[index];
    if (!cloneControl) return;

    if (sourceControl.tagName === "TEXTAREA") {
      cloneControl.textContent = sourceControl.value;
      cloneControl.style.height = `${Math.max(sourceControl.scrollHeight, sourceControl.offsetHeight)}px`;
      return;
    }

    if (sourceControl.tagName === "SELECT") {
      [...cloneControl.options].forEach((option, optionIndex) => {
        option.selected = optionIndex === sourceControl.selectedIndex;
      });
      return;
    }

    cloneControl.setAttribute("value", sourceControl.value);
  });
}

function buildImageSvg(width, height) {
  const clone = document.body.cloneNode(true);
  copyFormValues(document.body, clone);
  clone.querySelectorAll(".no-print").forEach((el) => el.remove());
  clone.style.width = `${width}px`;
  clone.style.minHeight = `${height}px`;
  clone.style.margin = "0";
  clone.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");

  const html = `
    <html xmlns="http://www.w3.org/1999/xhtml">
      <head>
        <meta charset="utf-8" />
        <style>
          ${collectStyles()}
          * { animation: none !important; transition: none !important; }
          .no-print { display: none !important; }
        </style>
      </head>
      ${clone.outerHTML}
    </html>
  `;

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <foreignObject width="100%" height="100%">${html}</foreignObject>
    </svg>
  `;
}

function renderSvgToPng(svg, width, height) {
  return new Promise((resolve, reject) => {
    const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const image = new Image();

    image.onload = () => {
      const scale = Math.min(2, window.devicePixelRatio || 1);
      const canvas = document.createElement("canvas");
      canvas.width = width * scale;
      canvas.height = height * scale;
      const context = canvas.getContext("2d");
      context.scale(scale, scale);
      context.fillStyle = "#fff9f1";
      context.fillRect(0, 0, width, height);
      context.drawImage(image, 0, 0, width, height);
      URL.revokeObjectURL(url);
      canvas.toBlob((pngBlob) => {
        if (pngBlob) {
          resolve(pngBlob);
        } else {
          reject(new Error("The browser could not create the PNG file."));
        }
      }, "image/png");
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("The browser could not render this page as an image."));
    };

    image.src = url;
  });
}

function slugify(value) {
  return (value || "emotion")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "emotion";
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function saveAsImage(form, button) {
  const originalText = button.textContent;
  button.disabled = true;
  button.textContent = "Preparing image...";

  try {
    document.body.classList.add("exporting-image");
    const width = Math.ceil(Math.max(document.body.scrollWidth, document.documentElement.clientWidth, 900));
    const height = Math.ceil(Math.max(document.body.scrollHeight, document.documentElement.clientHeight));
    const svg = buildImageSvg(width, height);
    document.body.classList.remove("exporting-image");
    const pngBlob = await renderSvgToPng(svg, width, height);
    const data = readFormData(form);
    const filename = `emotion-thermometer-${slugify(getEmotionLabel(form, data))}-${data.date || todayInputValue()}.png`;
    downloadBlob(pngBlob, filename);
    button.textContent = "Saved image";
  } catch (error) {
    document.body.classList.remove("exporting-image");
    console.error(error);
    alert("Sorry, this browser could not save the page as an image. You can still use Print / Save as PDF.");
    button.textContent = originalText;
  } finally {
    window.setTimeout(() => {
      button.disabled = false;
      button.textContent = originalText;
    }, 1200);
  }
}

function celebrate(form) {
  const burst = document.createElement("div");
  burst.className = "celebration no-print";
  burst.setAttribute("aria-hidden", "true");

  for (let index = 0; index < 32; index += 1) {
    const piece = document.createElement("span");
    piece.className = "confetti-piece";
    piece.style.setProperty("--x", `${Math.round((Math.random() - 0.5) * 280)}px`);
    piece.style.setProperty("--y", `${Math.round(Math.random() * -180 - 60)}px`);
    piece.style.setProperty("--r", `${Math.round(Math.random() * 540)}deg`);
    piece.style.setProperty("--delay", `${Math.random() * 0.18}s`);
    piece.style.background = CELEBRATION_COLORS[index % CELEBRATION_COLORS.length];
    burst.appendChild(piece);
  }

  form.appendChild(burst);
  window.setTimeout(() => burst.remove(), 1500);
}

function updateProgress(form, meter, options = {}) {
  const hasZoneRows = getZoneRows(form).length > 0;
  if (hasZoneRows && !form.dataset.activeZone) {
    meter.bar.style.width = "0%";
    meter.label.textContent = "0%";
    meter.spark.textContent = "Choose color";
    meter.copy.textContent = "Choose your current color first, then fill in that thermometer reading.";
    form.dataset.wasComplete = "false";
    return;
  }

  const fields = getProgressFields(form);
  const filled = fields.filter((field) => field.value.trim().length > 0).length;
  const percent = fields.length ? Math.round((filled / fields.length) * 100) : 0;
  const isComplete = percent === 100;

  meter.bar.style.width = `${percent}%`;
  meter.label.textContent = `${percent}%`;
  meter.spark.textContent = isComplete ? "Complete" : `${filled}/${fields.length} filled`;
  meter.copy.textContent = isComplete
    ? "Nice work. This thermometer is ready to print or revisit later."
    : "Choose a color, then write short phrases for that thermometer reading.";

  if (options.celebrate && isComplete && form.dataset.wasComplete !== "true") {
    celebrate(form);
  }

  form.dataset.wasComplete = isComplete ? "true" : "false";
}

function wireForm(form) {
  loadForm(form);
  updateEmotionOther(form);
  const shouldSaveInitialState = hydrateSessionName(form) || prefillDate(form);
  if (shouldSaveInitialState) {
    saveForm(form);
  }
  const meter = createProgressMeter(form);
  const picker = createZonePicker(form);
  createHistoryPanel(form);
  if (picker) {
    meter.element.insertAdjacentElement("afterend", picker);
    picker.addEventListener("click", (event) => {
      const button = event.target.closest("[data-zone-choice]");
      if (!button) return;
      selectZone(form, button.dataset.zoneChoice);
      saveFeelingHistory(form);
      updateProgress(form, meter, { celebrate: true });
    });
  }

  selectZone(form, localStorage.getItem(zoneKey()) || "");
  updateAllStepProgress(form);
  updateProgress(form, meter, { celebrate: false });
  renderHistory(form);

  getFields(form).forEach((field) => {
    field.addEventListener("focus", () => field.closest("tr")?.classList.add("is-active"));
    field.addEventListener("blur", () => field.closest("tr")?.classList.remove("is-active"));
  });

  const handleFormChange = () => {
    updateEmotionOther(form);
    saveSessionName(form);
    const data = saveForm(form);
    saveFeelingHistory(form, data);
    updateAllStepProgress(form);
    updateProgress(form, meter, { celebrate: true });
  };

  form.addEventListener("input", handleFormChange);
  form.addEventListener("change", handleFormChange);

  form.querySelector("[data-action=clear]")?.addEventListener("click", () => {
    if (!confirm("Clear this worksheet draft? Your saved history and session name will stay.")) return;
    form.reset();
    localStorage.removeItem(pageKey());
    localStorage.removeItem(zoneKey());
    localStorage.removeItem(currentHistoryIdKey());
    updateEmotionOther(form);
    hydrateSessionName(form);
    prefillDate(form);
    saveForm(form);
    selectZone(form, "");
    updateProgress(form, meter, { celebrate: false });
  });

  form.querySelector("[data-action=clear-history]")?.addEventListener("click", () => {
    if (!confirm("Clear saved feeling history from this browser?")) return;
    localStorage.removeItem(historyKey());
    localStorage.removeItem(currentHistoryIdKey());
    renderHistory(form);
  });

  form.querySelector("[data-action=save-image]")?.addEventListener("click", (event) => {
    saveAsImage(form, event.currentTarget);
  });
}

document.querySelectorAll("form[data-thermometer]").forEach(wireForm);
