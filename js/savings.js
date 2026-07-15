
const receiptCameraInput =
  document.getElementById(
    "receiptCameraInput"
  );

const receiptGalleryInput =
  document.getElementById(
    "receiptGalleryInput"
  );

let scannedImageName = "";
let matchedReceiptItems = [];
let currentReceiptStoreId = 1;
let currentReceiptTotal = 0;
let currentReceiptRawText = "";

function showReceiptMessage(
  text,
  type = "success"
) {
  const target =
    document.getElementById(
      "receiptMessage"
    );

  if (!target) return;

  target.innerHTML = `
    <div class="${type}">
      ${text}
    </div>
  `;
}

function moneyValue(value) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function getSavedProfileName() {
  return (
    localStorage.getItem(
      "groceryProfileName"
    ) || ""
  ).trim();
}

function getSavedMonthlyBudget() {
  return Number(
    localStorage.getItem(
      "monthlyGroceryBudget"
    ) || 0
  );
}

function hasBudgetProfile() {
  return Boolean(
    getSavedProfileName() &&
    getSavedMonthlyBudget() > 0
  );
}

function currentMonthReceipts() {
  const now = new Date();

  return getReceipts().filter(
    receipt => {
      const date = new Date(
        receipt.receiptDate ||
        receipt.createdAt ||
        Date.now()
      );

      return (
        date.getFullYear() ===
          now.getFullYear() &&
        date.getMonth() ===
          now.getMonth()
      );
    }
  );
}

function getReceiptRegularPriceTotal(
  receipt
) {
  return Number(
    receipt.regularPriceTotal ||
    receipt.highestStoreTotal ||
    receipt.totalSpent ||
    0
  );
}

function calculateMonthlyBudgetStats() {
  const receipts =
    currentMonthReceipts();

  const spent = receipts.reduce(
    (total, receipt) =>
      total +
      Number(
        receipt.totalSpent || 0
      ),
    0
  );

  const savings = receipts.reduce(
    (total, receipt) => {
      const regular =
        getReceiptRegularPriceTotal(
          receipt
        );

      const actual =
        Number(
          receipt.totalSpent || 0
        );

      return total +
        Math.max(
          0,
          regular - actual
        );
    },
    0
  );

  const budget =
    getSavedMonthlyBudget();

  return {
    budget,
    spent,
    remaining:
      budget - spent,
    savings
  };
}

function calculateHighestRegularPriceTotal(
  items
) {
  if (!Array.isArray(items)) {
    return 0;
  }

  const completeTotals = [];

  getStores().forEach(store => {
    let total = 0;
    let found = 0;

    items.forEach(item => {
      const productId =
        Number(
          item.matchedProductId ||
          item.productId
        );

      const quantity =
        Number(
          item.quantity || 1
        );

      const savedPrice =
        priceFor(
          productId,
          store.id
        );

      if (savedPrice) {
        total +=
          Number(
            savedPrice.price
          ) *
          quantity;

        found++;
      }
    });

    if (
      items.length > 0 &&
      found === items.length
    ) {
      completeTotals.push(total);
    }
  });

  if (completeTotals.length) {
    return Math.max(
      ...completeTotals
    );
  }

  return items.reduce(
    (total, item) => {
      const productId =
        Number(
          item.matchedProductId ||
          item.productId
        );

      const quantity =
        Number(
          item.quantity || 1
        );

      const prices =
        getPrices()
          .filter(price =>
            Number(
              price.productId
            ) === productId
          )
          .map(price =>
            Number(
              price.price
            )
          );

      const highest =
        prices.length
          ? Math.max(...prices)
          : Number(
              item.unitPrice || 0
            );

      return total +
        highest * quantity;
    },
    0
  );
}

function renderBudgetExperience() {
  const receiptFirstState =
    document.getElementById(
      "receiptFirstState"
    );

  const setup =
    document.getElementById(
      "budgetSetupCard"
    );

  const dashboard =
    document.getElementById(
      "budgetDashboard"
    );

  if (
    !receiptFirstState ||
    !setup ||
    !dashboard
  ) {
    return;
  }

  const hasReceipt =
    getReceipts().length > 0;

  const hasProfile =
    hasBudgetProfile();

  /*
    State 1:
    No receipt yet. Show scanner only.
  */
  if (!hasReceipt) {
    receiptFirstState.classList.remove(
      "hidden"
    );

    setup.classList.add("hidden");
    dashboard.classList.add("hidden");
    return;
  }

  /*
    State 2:
    Receipt saved, but no name/budget yet.
    Show setup form at top.
  */
  if (!hasProfile) {
    receiptFirstState.classList.add(
      "hidden"
    );

    setup.classList.remove("hidden");
    dashboard.classList.add("hidden");
    return;
  }

  /*
    State 3:
    Receipt and profile both exist.
    Show complete dashboard.
  */
  receiptFirstState.classList.add(
    "hidden"
  );

  setup.classList.add("hidden");
  dashboard.classList.remove("hidden");

  const stats =
    calculateMonthlyBudgetStats();

  document.getElementById(
    "budgetOwnerTitle"
  ).textContent =
    `${getSavedProfileName()}'s Budget`;

  document.getElementById(
    "monthlyBudgetValue"
  ).textContent =
    moneyValue(
      stats.budget
    );

  document.getElementById(
    "spentThisMonthValue"
  ).textContent =
    moneyValue(
      stats.spent
    );

  const remaining =
    document.getElementById(
      "remainingBudgetValue"
    );

  remaining.textContent =
    stats.remaining >= 0
      ? moneyValue(
          stats.remaining
        )
      : `Over ${moneyValue(
          Math.abs(
            stats.remaining
          )
        )}`;

  document.getElementById(
    "monthlySavingsValue"
  ).textContent =
    moneyValue(
      stats.savings
    );

  const percent =
    stats.budget > 0
      ? Math.min(
          100,
          Math.round(
            (
              stats.spent /
              stats.budget
            ) *
            100
          )
        )
      : 0;

  document.getElementById(
    "budgetProgressText"
  ).textContent =
    `${percent}%`;

  document.getElementById(
    "budgetProgressBar"
  ).style.width =
    `${percent}%`;

  renderReceiptHistory();
}

async function saveBudgetProfile() {
  const name =
    document
      .getElementById(
        "profileName"
      )
      .value
      .trim();

  const budget =
    Math.max(
      0,
      Number(
        document.getElementById(
          "monthlyBudget"
        ).value
      ) || 0
    );

  if (!name) {
    showReceiptMessage(
      "Enter your name.",
      "error"
    );
    return;
  }

  if (budget <= 0) {
    showReceiptMessage(
      "Enter a monthly grocery budget.",
      "error"
    );
    return;
  }

  localStorage.setItem(
    "groceryProfileName",
    name
  );

  localStorage.setItem(
    "monthlyGroceryBudget",
    String(budget)
  );

  if (
    window.CloudSync &&
    CloudSync.configured()
  ) {
    try {
      await CloudSync.saveMyProfile({
        displayName: name,
        monthlyBudget: budget
      });
    } catch (error) {
      console.error(error);

      showReceiptMessage(
        "Budget saved on this device, but cloud sync failed.",
        "error"
      );
    }
  }

  renderBudgetExperience();
}

function openBudgetEditor() {
  document.getElementById(
    "editMonthlyBudget"
  ).value =
    getSavedMonthlyBudget();

  document.getElementById(
    "budgetEditModal"
  ).classList.add("show");
}

function closeBudgetEditor() {
  document.getElementById(
    "budgetEditModal"
  ).classList.remove("show");
}

async function saveEditedBudget() {
  const budget =
    Math.max(
      0,
      Number(
        document.getElementById(
          "editMonthlyBudget"
        ).value
      ) || 0
    );

  if (budget <= 0) {
    return;
  }

  localStorage.setItem(
    "monthlyGroceryBudget",
    String(budget)
  );

  if (
    window.CloudSync &&
    CloudSync.configured()
  ) {
    try {
      await CloudSync.saveMyProfile({
        displayName:
          getSavedProfileName(),
        monthlyBudget: budget
      });
    } catch (error) {
      console.error(error);
    }
  }

  closeBudgetEditor();
  renderBudgetExperience();
}

function safeReceiptDisplayDate(receipt) {
  const fallback = new Date(receipt.createdAt || Date.now());
  const parsed = new Date(receipt.receiptDate || receipt.createdAt || Date.now());
  const now = new Date();
  const oneYearAgo = new Date(now); oneYearAgo.setFullYear(now.getFullYear()-1);
  const thirtyDaysAhead = new Date(now); thirtyDaysAhead.setDate(now.getDate()+30);
  const safe = Number.isNaN(parsed.getTime()) || parsed < oneYearAgo || parsed > thirtyDaysAhead ? fallback : parsed;
  return safe.toLocaleDateString(undefined,{month:"short",day:"numeric",year:safe.getFullYear()===now.getFullYear()?undefined:"numeric"});
}

function renderReceiptHistory() {
  const container = document.getElementById("receiptHistory");
  const badge = document.getElementById("receiptCountBadge");
  if (!container || !badge) return;

  const receipts = getReceipts().slice().sort((a, b) =>
    new Date(b.createdAt || b.receiptDate) - new Date(a.createdAt || a.receiptDate)
  );

  badge.textContent = `${receipts.length} receipt${receipts.length === 1 ? "" : "s"}`;

  if (!receipts.length) {
    container.innerHTML = `<div class="empty">No receipts yet.</div>`;
    return;
  }

  container.innerHTML = receipts.map(receipt => {
    const store = storeById(Number(receipt.storeId));
    const saved = Math.max(0, getReceiptRegularPriceTotal(receipt) - Number(receipt.totalSpent || 0));
    return `
      <a class="item row space receipt-history-link" href="receipts.html#${encodeURIComponent(receipt.id)}">
        <div>
          <strong>${safeReceiptDisplayDate(receipt)}</strong>
          <div class="muted">${store?.name || "Store"}</div>
        </div>
        <div style="text-align:right">
          <strong>${moneyValue(receipt.totalSpent)}</strong>
          <div class="muted">Saved ${moneyValue(saved)} · View receipt ›</div>
        </div>
      </a>`;
  }).join("");
}

function openReceiptCamera() {
  receiptCameraInput.value = "";
  receiptCameraInput.click();
}

function openReceiptGallery() {
  receiptGalleryInput.value = "";
  receiptGalleryInput.click();
}

async function handleReceiptFile(
  event
) {
  const file =
    event.target.files &&
    event.target.files[0];

  if (!file) return;

  scannedImageName =
    file.name ||
    "receipt-image";

  showReceiptPreview(file);
  await scanReceiptImage(file);
}

function showReceiptPreview(file) {
  const workspace = document.getElementById("receiptWorkspace");
  if (workspace) workspace.classList.remove("hidden");

  const preview =
    document.getElementById(
      "receiptPreview"
    );

  const url =
    URL.createObjectURL(file);

  preview.innerHTML = `
    <img
      src="${url}"
      alt="Receipt preview"
      style="width:100%;border-radius:16px"
    >
  `;

  preview.classList.remove("hidden");
}

async function scanReceiptImage(file) {
  const progress = document.getElementById("ocrProgress");
  const review = document.getElementById("receiptReview");
  progress.classList.remove("hidden");
  if (review) review.classList.add("hidden");

  try {
    progress.innerHTML = `<div class="receipt-processing"><div class="processing-spinner"></div><strong>Reading your receipt…</strong><div class="muted" id="receiptScanProgress">Preparing scanner</div></div>`;

    const result = await ReceiptMatcher.extract(file, percent => {
      const label = document.getElementById("receiptScanProgress");
      if (label) label.textContent = `Reading products ${percent}%`;
    });

    matchedReceiptItems = Array.isArray(result.items) ? result.items : [];
    currentReceiptStoreId = Number(result.storeId || getSelectedStore() || 0);
    currentReceiptTotal = Number(result.total || matchedReceiptItems.reduce((sum, item) => sum + Number(item.lineTotal || (item.unitPrice * item.quantity) || 0), 0));
    currentReceiptRawText = result.rawText || "";
    progress.classList.add("hidden");

    if (!matchedReceiptItems.length) {
      renderReceiptReview();
      showReceiptMessage("We could not clearly read the product lines. Confirm the store and total, then save the receipt.", "error");
      return;
    }

    document.getElementById("receiptPreview")?.classList.add("receipt-preview-compact");
    renderReceiptReview();
    showReceiptMessage(`${matchedReceiptItems.length} receipt item${matchedReceiptItems.length === 1 ? "" : "s"} detected. Review the digital receipt and save it.`, "success");
  } catch (error) {
    console.error(error);
    progress.classList.add("hidden");
    matchedReceiptItems = [];
    currentReceiptRawText = "";
    renderReceiptReview();
    showReceiptMessage(error.message || "The receipt could not be read. Confirm the store and total below.", "error");
  }
}

async function saveReceiptAutomatically(storeId, totalSpent) {
  const regularPriceTotal = matchedReceiptItems.length ? calculateHighestRegularPriceTotal(matchedReceiptItems) : totalSpent;
  const receipt = { id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()), storeId:Number(storeId), receiptDate:new Date().toISOString().slice(0,10), totalSpent:Number(totalSpent), cheapestTotal:Number(totalSpent), savings:Math.max(0,regularPriceTotal-totalSpent), regularPriceTotal, imageName: scannedImageName,
    rawText: currentReceiptRawText,
    items: matchedReceiptItems.map(item => ({
      name: item.matchedName || item.rawName || "Item",
      rawName: item.rawName || item.matchedName || "Item",
      productId: Number(item.matchedProductId || item.productId || 0) || null,
      quantity: Number(item.quantity || 1),
      unitPrice: Number(item.unitPrice || 0),
      price: Number(item.unitPrice || 0) * Number(item.quantity || 1)
    })),
    createdAt:new Date().toISOString() };
  const receipts=getReceipts(); receipts.push(receipt); saveReceipts(receipts);
  window.dispatchEvent(new CustomEvent("sulit:receipt-saved", { detail: receipt }));
  try { if(window.DatabaseService?.saveConfirmedReceipt) await DatabaseService.saveConfirmedReceipt(receipt,matchedReceiptItems); }
  catch(error){ console.error(error); showReceiptMessage(`Receipt saved on this device. Cloud save failed: ${error.message||"Unknown error"}`,"error"); }
  document.getElementById("receiptReview")?.classList.add("hidden");
  document.getElementById("receiptPreview")?.classList.add("hidden");
  document.getElementById("receiptWorkspace")?.classList.add("hidden");
  localStorage.removeItem("completedShoppingPlan"); localStorage.removeItem("completedShoppingList");
  showReceiptMessage(hasBudgetProfile()?"Receipt added! Your savings dashboard has been updated.":"Receipt added! Set your name and monthly budget next.");
  renderBudgetExperience();
}

function renderReceiptReview() {
  const workspace = document.getElementById("receiptWorkspace");
  if (workspace) workspace.classList.remove("hidden");

  const review = document.getElementById("receiptReview");
  const stores = getStores();
  const itemRows = matchedReceiptItems.length
    ? matchedReceiptItems.map(item => `
      <div class="digital-receipt-row">
        <div>
          <strong>${item.matchedName || item.normalizedName || item.rawName || "Item"}</strong>
          <small>${item.quantity > 1 ? `Quantity ${item.quantity}` : "Receipt item"}</small>
        </div>
        <b>${moneyValue(item.lineTotal || (Number(item.unitPrice || 0) * Number(item.quantity || 1)))}</b>
      </div>`).join("")
    : `<div class="empty">No readable product lines were found.</div>`;

  review.innerHTML = `
    <div class="card">
      <h2>Digital receipt</h2>
      <div class="digital-receipt-items">${itemRows}</div>

      <label>Store</label>
      <select id="receiptStoreSelect">
        <option value="">Choose the store</option>
        ${stores.map(store => `<option value="${store.id}" ${Number(store.id) === Number(currentReceiptStoreId) ? "selected" : ""}>${store.name}</option>`).join("")}
      </select>

      <label>Receipt total</label>
      <input id="receiptTotalInput" type="number" min="0" step="0.01" value="${currentReceiptTotal > 0 ? currentReceiptTotal.toFixed(2) : ""}" placeholder="0.00">

      <br>
      <button type="button" onclick="saveReceiptFromReview()">Add to My Savings</button>
    </div>`;

  review.classList.remove("hidden");
}

async function saveReceiptFromReview() {
  const storeId =
    Number(
      document.getElementById(
        "receiptStoreSelect"
      ).value
    );

  const totalSpent =
    Number(
      document.getElementById(
        "receiptTotalInput"
      ).value
    );

  if (!storeId) {
    showReceiptMessage("Choose the store before saving.", "error");
    return;
  }

  if (totalSpent <= 0) {
    showReceiptMessage(
      "Enter the receipt total.",
      "error"
    );
    return;
  }

  const regularPriceTotal =
    matchedReceiptItems.length
      ? calculateHighestRegularPriceTotal(
          matchedReceiptItems
        )
      : totalSpent;

  const receipt = {
    id:
      crypto.randomUUID
        ? crypto.randomUUID()
        : String(Date.now()),

    storeId,
    receiptDate:
      new Date()
        .toISOString()
        .slice(0, 10),

    totalSpent,
    cheapestTotal:
      totalSpent,

    savings:
      Math.max(
        0,
        regularPriceTotal -
        totalSpent
      ),

    regularPriceTotal,
    imageName:
      scannedImageName,

    rawText: currentReceiptRawText,

    items: matchedReceiptItems.map(item => ({
      name: item.matchedName || item.rawName || "Item",
      rawName: item.rawName || item.matchedName || "Item",
      productId: Number(item.matchedProductId || item.productId || 0) || null,
      quantity: Number(item.quantity || 1),
      unitPrice: Number(item.unitPrice || 0),
      price: Number(item.unitPrice || 0) * Number(item.quantity || 1)
    })),

    createdAt:
      new Date()
        .toISOString()
  };

  const receipts =
    getReceipts();

  receipts.push(receipt);

  saveReceipts(receipts);
  window.dispatchEvent(new CustomEvent("sulit:receipt-saved", { detail: receipt }));

  try {
    if (
      window.DatabaseService &&
      DatabaseService.saveConfirmedReceipt
    ) {
      const cloudResult = await DatabaseService.saveConfirmedReceipt(receipt, matchedReceiptItems);
      receipt.cloudSaved = cloudResult?.mode === "supabase";
      saveReceipts(getReceipts().map(item => String(item.id) === String(receipt.id) ? {...item, cloudSaved: receipt.cloudSaved} : item));
    }
  } catch (error) {
    console.error(error);

    showReceiptMessage(
      `Receipt saved locally. Cloud save failed: ${
        error.message ||
        "Unknown error"
      }`,
      "error"
    );
  }

  document.getElementById(
    "receiptReview"
  ).classList.add("hidden");

  document.getElementById("receiptPreview").classList.add("hidden");
  document.getElementById("receiptWorkspace")?.classList.add("hidden");

  const savedAmount = Math.max(0, Number(receipt.savings || 0));
  showReceiptMessage(
    `<strong>Nice! Receipt saved successfully.</strong><br>You spent ${moneyValue(receipt.totalSpent)}${savedAmount>0?` and saved ${moneyValue(savedAmount)}`:""}.` +
    (receipt.cloudSaved ? " It is now available in Sulit Admin." : " It is saved on this device; cloud sync needs attention."),
    receipt.cloudSaved ? "success" : "error"
  );

  renderBudgetExperience();
}

receiptCameraInput.addEventListener(
  "change",
  handleReceiptFile
);

receiptGalleryInput.addEventListener(
  "change",
  handleReceiptFile
);

window.addEventListener(
  "DOMContentLoaded",
  renderBudgetExperience
);

document.addEventListener(
  "grocerysaver:receipts-updated",
  renderBudgetExperience
);

document.addEventListener(
  "grocerysaver:cloud-ready",
  renderBudgetExperience
);
