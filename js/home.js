function normalizeProductName(value) {
  return String(value || "").trim().toLowerCase();
}

let pendingHomeProductName = "";

function variantsForName(name) {
  const key = normalizeProductName(name);
  return getProducts().filter(product => normalizeProductName(product.name) === key);
}

function cheapestVariant(name) {
  const variants = variantsForName(name);
  return variants.slice().sort((a, b) => {
    const ap = lowestPrice(a.id)?.price ?? Number.POSITIVE_INFINITY;
    const bp = lowestPrice(b.id)?.price ?? Number.POSITIVE_INFINITY;
    return ap - bp;
  })[0] || null;
}

function listItemForName(name) {
  const ids = new Set(variantsForName(name).map(product => Number(product.id)));
  return getList().find(item => ids.has(Number(item.productId))) || null;
}

function searchTokens(value) {
  return normalizeProductName(value)
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map(token => token.endsWith("s") && token.length > 3 ? token.slice(0, -1) : token);
}

function matchingNames(searchText) {
  const queryTokens = searchTokens(searchText);
  if (!queryTokens.length) return [];

  const groups = new Map();
  const aliasGroups = typeof getProductAliases === "function" ? getProductAliases() : [];
  getProducts().forEach(product => {
    const aliasText = (aliasGroups.find(group => Number(group.productId) === Number(product.id))?.aliases || []).join(" ");
    const searchableTokens = searchTokens(`${product.name} ${product.category || ""} ${product.brand || ""} ${aliasText}`);
    const searchableText = searchableTokens.join(" ");
    const matches = queryTokens.every(query =>
      searchableTokens.some(token => token.startsWith(query) || query.startsWith(token)) ||
      searchableText.includes(query)
    );
    if (!matches) return;

    const key = normalizeProductName(product.name);
    if (!groups.has(key)) groups.set(key, product.name);
  });

  return [...groups.values()]
    .sort((a, b) => {
      const aExact = normalizeProductName(a).startsWith(normalizeProductName(searchText)) ? 0 : 1;
      const bExact = normalizeProductName(b).startsWith(normalizeProductName(searchText)) ? 0 : 1;
      return aExact - bExact || a.localeCompare(b);
    })
    .slice(0, 8);
}

function renderProducts(searchText) {
  const results = document.getElementById("results");
  const addButton = document.getElementById("searchAddButton");
  const names = matchingNames(searchText);

  if (pendingHomeProductName) {
    results.innerHTML = "";
    addButton.classList.add("hidden");
    renderQuantityEditor();
    return;
  }

  document.getElementById("quantityEditor").innerHTML = "";
  if (!normalizeProductName(searchText)) {
    results.innerHTML = "";
    addButton.classList.add("hidden");
    addButton.dataset.name = "";
    return;
  }

  if (names.length === 1) {
    const name = names[0];
    const existing = listItemForName(name);
    addButton.classList.remove("hidden");
    addButton.dataset.name = name;
    addButton.textContent = existing ? "Edit" : "Add";
    const product = cheapestVariant(name);
    results.innerHTML = `<button type="button" class="home-simple-result" onclick="selectHomeSearchResult('${encodeURIComponent(name)}')">
      <span class="home-result-main"><span class="home-result-icon">${productIcon(product)}</span><span>${name}</span></span>
      <b>${existing ? "Edit" : "Add"}</b>
    </button>`;
    return;
  }

  addButton.classList.add("hidden");
  addButton.dataset.name = "";
  results.innerHTML = names.length ? names.map(name => {
    const product = cheapestVariant(name);
    const existing = listItemForName(name);
    return `<button type="button" class="home-simple-result" onclick="selectHomeSearchResult('${encodeURIComponent(name)}')">
      <span class="home-result-main"><span class="home-result-icon">${productIcon(product)}</span><span>${name}</span></span><b>${existing ? "Edit" : "Add"}</b>
    </button>`;
  }).join("") : '<div class="empty">No matching grocery found. Try a shorter word.</div>';
}

function selectHomeSearchResult(encodedName) {
  const name = decodeURIComponent(encodedName);
  document.getElementById("search").value = name;
  document.getElementById("searchAddButton").dataset.name = name;
  startHomeQuantity(name);
}

function startHomeQuantity(name) {
  const product = cheapestVariant(name);
  if (!product) return;
  const list = getList();
  const variantIds = new Set(variantsForName(name).map(item => Number(item.id)));
  const index = list.findIndex(item => variantIds.has(Number(item.productId)));
  if (index < 0) list.push({ productId: product.id, quantity: 1 });
  saveList(list);
  localStorage.removeItem("selectedPlan");
  pendingHomeProductName = name;
  updateItemCount();
  renderProducts(name);
}

function renderQuantityEditor() {
  const wrap = document.getElementById("quantityEditor");
  const item = listItemForName(pendingHomeProductName);
  if (!item) {
    pendingHomeProductName = "";
    wrap.innerHTML = "";
    return;
  }
  wrap.innerHTML = `<div class="home-quantity-row">
    <div class="quantity-control">
      <button type="button" aria-label="Decrease quantity" onclick="changePendingHomeQuantity(-1)">−</button>
      <b>${Number(item.quantity || 1)}</b>
      <button type="button" aria-label="Increase quantity" onclick="changePendingHomeQuantity(1)">+</button>
    </div>
    <button type="button" class="home-confirm-add" onclick="finishHomeAdd()">Add</button>
  </div>`;
}

function changePendingHomeQuantity(change) {
  if (!pendingHomeProductName) return;
  const list = getList();
  const variantIds = new Set(variantsForName(pendingHomeProductName).map(item => Number(item.id)));
  const index = list.findIndex(item => variantIds.has(Number(item.productId)));
  if (index < 0) return;
  list[index].quantity = Math.max(1, Number(list[index].quantity || 1) + change);
  saveList(list);
  localStorage.removeItem("selectedPlan");
  updateItemCount();
  renderQuantityEditor();
}

function finishHomeAdd() {
  pendingHomeProductName = "";
  const search = document.getElementById("search");
  search.value = "";
  document.getElementById("quantityEditor").innerHTML = "";
  document.getElementById("results").innerHTML = "";
  document.getElementById("searchAddButton").classList.add("hidden");
  search.focus();
  updateItemCount();
}

function updateItemCount() {
  const count = getList().reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const label = document.getElementById("itemCountLabel");
  if (label) label.textContent = `${count} ${count === 1 ? "item" : "items"} on the list`;
}

const searchInput = document.getElementById("search");
const searchAddButton = document.getElementById("searchAddButton");
searchInput.addEventListener("input", event => {
  if (pendingHomeProductName) pendingHomeProductName = "";
  renderProducts(event.target.value);
});
searchAddButton.addEventListener("click", () => {
  const name = searchAddButton.dataset.name || matchingNames(searchInput.value)[0];
  if (name) startHomeQuantity(name);
});
updateItemCount();
document.addEventListener("grocerysaver:catalog-updated", () => {
  renderProducts(searchInput?.value || "");
  updateItemCount();
});
