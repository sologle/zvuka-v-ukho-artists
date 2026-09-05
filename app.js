"use strict";

const CATEGORY_META = Object.freeze([
  Object.freeze({ key: "popular", title: "🔥 Популярные", sectionId: "categoryPopular" }),
  Object.freeze({ key: "cis", title: "🎤 СНГ артисты", sectionId: "categoryCis" }),
  Object.freeze({ key: "world", title: "🌍 Мировые артисты", sectionId: "categoryWorld" }),
]);

const state = {
  activeCategory: "popular",
  catalog: null,
  searchQuery: "",
};

const CYR2LAT = Object.freeze({
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z",
  и: "i", й: "i", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r",
  с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "ts", ч: "ch", ш: "sh",
  щ: "sch", ъ: "", ы: "i", ь: "", э: "e", ю: "yu", я: "ya",
});

const PHONETIC_RULES = Object.freeze([
  [/dzh/g, "j"], [/tch/g, "ch"], [/dge/g, "j"], [/ph/g, "f"], [/wh/g, "w"],
  [/kh/g, "h"], [/th/g, "t"], [/ck/g, "k"], [/qu/g, "kw"], [/ea/g, "i"],
  [/ee/g, "i"], [/oo/g, "u"], [/ou/g, "au"], [/ai/g, "ei"], [/ay/g, "ei"],
  [/ey/g, "ei"], [/oy/g, "oi"], [/ce/g, "se"], [/ci/g, "si"], [/cy/g, "si"],
  [/c/g, "k"], [/x/g, "ks"],
]);

function normalize(value) {
  return value.toLowerCase().replace(/ё/g, "е");
}

function getTokens(value) {
  return normalize(value).split(/[^\p{L}\p{N}$]+/gu).filter(Boolean);
}

function transliterate(value) {
  let result = "";
  for (const character of value) {
    result += Object.hasOwn(CYR2LAT, character) ? CYR2LAT[character] : character;
  }
  return result;
}

function simplifyPhonetic(value) {
  let result = value.toLowerCase().replace(/[^a-z0-9]/g, "");
  result = result.replace(/([a-z])\1+/g, "$1");
  for (const [pattern, replacement] of PHONETIC_RULES) {
    result = result.replace(pattern, replacement);
  }
  result = result.replace(/([a-z])\1+/g, "$1");
  if (
    result.length > 3
    && result.endsWith("e")
    && !"aeiou".includes(result[result.length - 2])
  ) {
    result = result.slice(0, -1);
  }
  return result;
}

function phoneticKey(word) {
  const lowered = word.toLowerCase();
  return simplifyPhonetic(/[а-яё]/i.test(word) ? transliterate(lowered) : lowered);
}

function levenshtein(left, right) {
  if (!left) return right.length;
  if (!right) return left.length;
  const row = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    let previous = row[0];
    row[0] = leftIndex;
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const old = row[rightIndex];
      row[rightIndex] = Math.min(
        row[rightIndex] + 1,
        row[rightIndex - 1] + 1,
        previous + (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1),
      );
      previous = old;
    }
  }
  return row[right.length];
}

function wordMatchesToken(queryWord, queryPhonetic, rawToken, phoneticToken) {
  if (rawToken.startsWith(queryWord) || phoneticToken.startsWith(queryPhonetic)) {
    return true;
  }
  const crossScript = /[а-яё]/i.test(queryWord) !== /[а-яё]/i.test(rawToken);
  if (!crossScript || queryPhonetic.length < 4) {
    return false;
  }
  const compareLength = Math.min(phoneticToken.length, Math.max(queryPhonetic.length, 3));
  const distance = levenshtein(queryPhonetic, phoneticToken.slice(0, compareLength));
  const threshold = queryPhonetic.length <= 4 ? 1 : queryPhonetic.length <= 7 ? 2 : 3;
  return distance <= threshold;
}

function artistMatches(chip, queryTokens) {
  return queryTokens.every((queryWord) => {
    const queryPhonetic = phoneticKey(queryWord);
    return chip.artistTokens.some((rawToken, index) => wordMatchesToken(
      queryWord,
      queryPhonetic,
      rawToken,
      chip.artistPhoneticTokens[index],
    ));
  });
}

function categoryElements(key) {
  const meta = CATEGORY_META.find((item) => item.key === key);
  if (!meta) {
    throw new Error(`CATALOG_CATEGORY_UNKNOWN: ${key}`);
  }
  const section = document.getElementById(meta.sectionId);
  const button = section.querySelector(".section-header");
  const panel = section.querySelector(".section-content");
  const grid = section.querySelector(".grid");
  const count = section.querySelector(".section-count");
  const noResults = section.querySelector(".no-results");
  return { section, button, panel, grid, count, noResults };
}

function setCategoryOpen(key, open) {
  const { section, button, panel } = categoryElements(key);
  section.classList.toggle("is-open", open);
  button.setAttribute("aria-expanded", String(open));
  panel.hidden = !open;
}

function restoreAccordion() {
  for (const { key } of CATEGORY_META) {
    setCategoryOpen(key, key === state.activeCategory);
    categoryElements(key).section.hidden = false;
  }
}

function activateCategory(key) {
  const current = categoryElements(key).button.getAttribute("aria-expanded") === "true";
  state.activeCategory = current ? null : key;
  restoreAccordion();
  if (state.activeCategory) {
    categoryElements(key).section.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function createChip(name) {
  const chip = document.createElement("button");
  chip.type = "button";
  chip.className = "chip";
  chip.dataset.name = name;
  chip.artistTokens = getTokens(name);
  chip.artistPhoneticTokens = chip.artistTokens.map(phoneticKey);

  const text = document.createElement("span");
  text.className = "chip-text";
  text.textContent = name;
  const icon = document.createElement("span");
  icon.className = "chip-icon";
  icon.setAttribute("aria-hidden", "true");
  icon.textContent = "⧉";
  chip.append(text, icon);
  chip.addEventListener("click", () => copyName(chip));
  return chip;
}

function validateCatalog(documentData) {
  if (!documentData || typeof documentData !== "object") {
    throw new Error("CATALOG_DATA_INVALID: root must be an object");
  }
  for (const { key } of CATEGORY_META) {
    const names = documentData[key];
    if (
      !Array.isArray(names)
      || names.some((name) => typeof name !== "string" || !name.trim())
      || new Set(names).size !== names.length
    ) {
      throw new Error(`CATALOG_DATA_INVALID: ${key} must contain unique names`);
    }
  }
  const regional = new Set([...documentData.cis, ...documentData.world]);
  if (documentData.popular.some((name) => !regional.has(name))) {
    throw new Error("CATALOG_DATA_INVALID: popular artists must also have a region");
  }
}

function renderCatalog(documentData) {
  validateCatalog(documentData);
  state.catalog = documentData;
  for (const { key } of CATEGORY_META) {
    const { grid, count } = categoryElements(key);
    const fragment = document.createDocumentFragment();
    for (const name of documentData[key]) {
      fragment.append(createChip(name));
    }
    grid.replaceChildren(fragment);
    count.textContent = String(documentData[key].length);
  }
  document.getElementById("totalArtists").textContent = String(
    new Set([...documentData.cis, ...documentData.world]).size,
  );
  restoreAccordion();
}

function filterArtists(rawQuery) {
  if (!state.catalog) return;
  state.searchQuery = rawQuery.trim();
  const queryTokens = getTokens(state.searchQuery);
  const uniqueMatches = new Set();
  const searching = state.searchQuery !== "";

  document.getElementById("searchClear").classList.toggle("show", rawQuery.length > 0);
  for (const { key } of CATEGORY_META) {
    const { section, panel, button, grid, count, noResults } = categoryElements(key);
    let matches = 0;
    for (const chip of grid.querySelectorAll(".chip")) {
      const matched = !searching || artistMatches(chip, queryTokens);
      chip.hidden = !matched;
      if (matched) {
        matches += 1;
        uniqueMatches.add(chip.dataset.name);
      }
    }
    count.textContent = String(searching ? matches : state.catalog[key].length);
    noResults.classList.toggle("show", searching && matches === 0);
    section.hidden = searching && matches === 0;
    if (searching) {
      section.classList.toggle("is-open", matches > 0);
      button.setAttribute("aria-expanded", String(matches > 0));
      panel.hidden = matches === 0;
    }
  }

  const status = document.getElementById("searchStatus");
  if (searching) {
    status.textContent = `Найдено артистов: ${uniqueMatches.size}`;
    status.classList.add("show");
  } else {
    status.classList.remove("show");
    restoreAccordion();
  }
  syncSearchHeight();
}

function clearSearch() {
  const input = document.getElementById("searchInput");
  input.value = "";
  filterArtists("");
  input.focus();
}

function enterSearchMode() {
  document.body.classList.add("search-mode");
  document.getElementById("searchCancel").classList.add("show");
}

function exitSearch() {
  const input = document.getElementById("searchInput");
  input.value = "";
  filterArtists("");
  input.blur();
  document.body.classList.remove("search-mode");
  document.getElementById("searchCancel").classList.remove("show");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function fallbackCopy(text) {
  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.setAttribute("readonly", "");
  textArea.style.position = "fixed";
  textArea.style.left = "-9999px";
  document.body.append(textArea);
  textArea.select();
  const copied = document.execCommand("copy");
  textArea.remove();
  return copied;
}

function showToast(text) {
  const toast = document.getElementById("toast");
  toast.textContent = text;
  toast.classList.add("show");
  clearTimeout(window.catalogToastTimer);
  window.catalogToastTimer = setTimeout(() => toast.classList.remove("show"), 1600);
}

async function copyName(chip) {
  const name = chip.dataset.name;
  let copied = false;
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(name);
      copied = true;
    } else {
      copied = fallbackCopy(name);
    }
  } catch (error) {
    console.error("CATALOG_COPY_FAILED", error);
    copied = fallbackCopy(name);
  }

  if (!copied) {
    showToast("Не удалось скопировать. Нажми и удерживай имя. CATALOG_COPY_FAILED");
    return;
  }
  chip.classList.add("copied");
  setTimeout(() => chip.classList.remove("copied"), 900);
  showToast(`✅ Скопировано: ${name}`);
}

function syncSearchHeight() {
  const height = document.getElementById("searchWrap").offsetHeight;
  document.documentElement.style.setProperty("--search-height", `${height}px`);
}

function bindInteractions() {
  for (const { key } of CATEGORY_META) {
    categoryElements(key).button.addEventListener("click", () => {
      if (!state.searchQuery) activateCategory(key);
    });
  }
  const input = document.getElementById("searchInput");
  input.addEventListener("input", () => filterArtists(input.value));
  input.addEventListener("focus", enterSearchMode);
  input.addEventListener("blur", () => {
    setTimeout(() => {
      if (!input.value.trim() && document.activeElement !== input) {
        document.body.classList.remove("search-mode");
        document.getElementById("searchCancel").classList.remove("show");
      }
    }, 150);
  });
  document.getElementById("searchClear").addEventListener("click", clearSearch);
  document.getElementById("searchCancel").addEventListener("click", exitSearch);
  window.addEventListener("resize", syncSearchHeight, { passive: true });
}

async function initialize() {
  bindInteractions();
  syncSearchHeight();
  try {
    const response = await fetch("data/artists.json", { cache: "no-cache" });
    if (!response.ok) {
      throw new Error(`CATALOG_LOAD_FAILED: HTTP ${response.status}`);
    }
    renderCatalog(await response.json());
  } catch (error) {
    console.error("CATALOG_LOAD_FAILED", error);
    const message = document.createElement("div");
    message.className = "load-error";
    message.textContent = (
      "Не удалось загрузить список артистов. Обнови страницу или попробуй позже. "
      + "CATALOG_LOAD_FAILED"
    );
    document.getElementById("categories").replaceChildren(message);
  }
}

initialize();
