const STORAGE_PREFIX = "emotion-thermometer:";

function pageKey() {
  return STORAGE_PREFIX + document.body.dataset.page;
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

function wireForm(form) {
  loadForm(form);
  form.addEventListener("input", () => saveForm(form));
  form.querySelector("[data-action=clear]")?.addEventListener("click", () => {
    if (!confirm("Clear all fields on this page?")) return;
    form.reset();
    localStorage.removeItem(pageKey());
  });
}

document.querySelectorAll("form[data-thermometer]").forEach(wireForm);
