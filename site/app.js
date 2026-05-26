const STORAGE_PREFIX = "emotion-thermometer:";
const CELEBRATION_COLORS = ["#ff5a70", "#ff9f1c", "#ffd166", "#4ecdc4", "#7c5cff"];
const ZONE_DETAILS = {
  red: "Very intense",
  orange: "Strong emotion",
  yellow: "Early warning",
  green: "Calm and steady",
};

function pageKey() {
  return STORAGE_PREFIX + document.body.dataset.page;
}

function zoneKey() {
  return `${pageKey()}:selected-zone`;
}

function saveForm(form) {
  const data = {};
  form.querySelectorAll("[data-field]").forEach((el) => {
    data[el.dataset.field] = el.value;
  });
  localStorage.setItem(pageKey(), JSON.stringify(data));
}

function loadForm(form) {
  const raw = localStorage.getItem(pageKey());
  if (!raw) return;
  try {
    const data = JSON.parse(raw);
    form.querySelectorAll("[data-field]").forEach((el) => {
      if (data[el.dataset.field] != null) {
        el.value = data[el.dataset.field];
      }
    });
  } catch {
    /* ignore corrupt storage */
  }
}

function getFields(form) {
  return [...form.querySelectorAll("[data-field]")];
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
  const fields = getFields(form);
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
  const meter = createProgressMeter(form);
  const picker = createZonePicker(form);
  if (picker) {
    meter.element.insertAdjacentElement("afterend", picker);
    picker.addEventListener("click", (event) => {
      const button = event.target.closest("[data-zone-choice]");
      if (!button) return;
      selectZone(form, button.dataset.zoneChoice);
    });
  }

  updateProgress(form, meter, { celebrate: false });
  selectZone(form, localStorage.getItem(zoneKey()) || "");

  getFields(form).forEach((field) => {
    field.addEventListener("focus", () => field.closest("tr")?.classList.add("is-active"));
    field.addEventListener("blur", () => field.closest("tr")?.classList.remove("is-active"));
  });

  form.addEventListener("input", () => {
    saveForm(form);
    updateProgress(form, meter, { celebrate: true });
  });

  form.querySelector("[data-action=clear]")?.addEventListener("click", () => {
    if (!confirm("Clear all fields on this page?")) return;
    form.reset();
    localStorage.removeItem(pageKey());
    localStorage.removeItem(zoneKey());
    selectZone(form, "");
    updateProgress(form, meter, { celebrate: false });
  });
}

document.querySelectorAll("form[data-thermometer]").forEach(wireForm);
