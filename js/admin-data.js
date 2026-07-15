/*
  INTERNAL RECEIPT MATCHING

  Customer dashboards do not show item-level details.
  This file normalizes receipt abbreviations and prepares
  private admin records for DatabaseService.
*/

const DEFAULT_PRODUCT_ALIASES = [
  {
    productId: 1,
    aliases: [
      "milk", "mlk", "gv mlk", "gv milk", "milk 2l",
      "2l milk", "whole milk", "partly skim milk"
    ]
  },
  {
    productId: 2,
    aliases: [
      "egg", "eggs", "large eggs", "lg egg",
      "12 eggs", "eggs 12", "dozen eggs"
    ]
  },
  {
    productId: 3,
    aliases: [
      "bread", "white bread", "wht brd",
      "brd", "wonder bread", "sandwich bread"
    ]
  },
  {
    productId: 4,
    aliases: [
      "banana", "bananas", "bna"
    ]
  },
  {
    productId: 5,
    aliases: [
      "chicken breast", "chkn brst", "bnls chkn",
      "boneless chicken", "chicken", "chkn"
    ]
  },
  {
    productId: 6,
    aliases: [
      "tomato", "tomatoes", "toma"
    ]
  },
  {
    productId: 7,
    aliases: [
      "potato", "potatoes", "russet pot",
      "russet potato", "pot 5lb", "yellow potato"
    ]
  },
  {
    productId: 8,
    aliases: [
      "rice", "rooster rice"
    ]
  },
  {
    productId: 9,
    aliases: [
      "apple", "apples"
    ]
  },
  {
    productId: 10,
    aliases: [
      "ground beef", "grd beef", "ground bf",
      "beef ground", "lean grd beef"
    ]
  },
  {
    productId: 11,
    aliases: [
      "olive oil", "olv oil", "oliveoil", "oil olive"
    ]
  }
];

function normalizeReceiptProductName(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\b\d{5,}\b/g, " ")
    .replace(/\b(?:ea|each|tax|tx)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getProductAliases() {
  const saved =
    JSON.parse(
      localStorage.getItem("productAliases") || "[]"
    );

  const cloudCatalogActive =
    localStorage.getItem(
      "grocerySaverCloudCatalogActive"
    ) === "true";

  if (cloudCatalogActive) {
    return saved;
  }

  const byProduct = new Map(
    saved.map(row => [
      Number(row.productId),
      row
    ])
  );

  DEFAULT_PRODUCT_ALIASES.forEach(row => {
    if (!byProduct.has(row.productId)) {
      byProduct.set(row.productId, {
        ...row,
        aliases: [...row.aliases]
      });
    }
  });

  const aliases =
    [...byProduct.values()];

  localStorage.setItem(
    "productAliases",
    JSON.stringify(aliases)
  );

  return aliases;
}

function saveProductAliases(aliases) {
  localStorage.setItem(
    "productAliases",
    JSON.stringify(aliases)
  );
}

function tokenSimilarity(firstValue, secondValue) {
  const firstTokens = new Set(
    normalizeReceiptProductName(firstValue)
      .split(" ")
      .filter(Boolean)
  );

  const secondTokens = new Set(
    normalizeReceiptProductName(secondValue)
      .split(" ")
      .filter(Boolean)
  );

  if (!firstTokens.size || !secondTokens.size) return 0;

  const shared = [...firstTokens].filter(token =>
    secondTokens.has(token)
  ).length;

  return shared / Math.max(firstTokens.size, secondTokens.size);
}

function matchReceiptProduct(rawName) {
  const normalized = normalizeReceiptProductName(rawName);

  if (!normalized) return null;

  const products = getProducts();
  const aliasRows = getProductAliases();

  // Exact normalized alias match.
  for (const row of aliasRows) {
    const exact = (row.aliases || []).some(alias =>
      normalizeReceiptProductName(alias) === normalized
    );

    if (exact) {
      const product = products.find(item =>
        item.id === Number(row.productId)
      );

      if (product) {
        return {
          productId: product.id,
          matchedName: product.name,
          confidence: 1
        };
      }
    }
  }

  // Containment and token similarity for longer store descriptions.
  let bestMatch = null;

  aliasRows.forEach(row => {
    const product = products.find(item =>
      item.id === Number(row.productId)
    );

    if (!product) return;

    const candidates = [
      product.name,
      ...(row.aliases || [])
    ];

    candidates.forEach(candidate => {
      const candidateText =
        normalizeReceiptProductName(candidate);

      if (!candidateText) return;

      let score = tokenSimilarity(normalized, candidateText);

      if (
        normalized.includes(candidateText) ||
        candidateText.includes(normalized)
      ) {
        score = Math.max(score, 0.85);
      }

      if (!bestMatch || score > bestMatch.confidence) {
        bestMatch = {
          productId: product.id,
          matchedName: product.name,
          confidence: score
        };
      }
    });
  });

  return bestMatch && bestMatch.confidence >= 0.5
    ? bestMatch
    : null;
}

function buildMatchedAdminItems(receipt) {
  const userId = getLocalUserId();

  return receipt.items.map((item, index) => {
    const match = matchReceiptProduct(item.rawName);

    return {
      id: `${receipt.id}-${index}`,
      receiptId: receipt.id,
      userId,
      storeId: receipt.storeId,
      rawName: item.rawName,
      normalizedName:
        normalizeReceiptProductName(item.rawName),
      matchedProductId: match?.productId || null,
      matchedName: match?.matchedName || null,
      confidence: match?.confidence || 0,
      quantity: Number(item.quantity) || 1,
      unitPrice: Number(item.price) || 0,
      receiptDate: receipt.receiptDate,
      createdAt: receipt.createdAt
    };
  });
}

async function saveReceiptToAdminDatabase(receipt) {
  const matchedItems = buildMatchedAdminItems(receipt);

  return DatabaseService.saveConfirmedReceipt(
    receipt,
    matchedItems
  );
}

// Backward-compatible admin helpers.
function getAdminReceipts() {
  return JSON.parse(
    localStorage.getItem("adminReceipts") || "[]"
  );
}

function getAdminReceiptItems() {
  return JSON.parse(
    localStorage.getItem("adminReceiptItems") || "[]"
  );
}

function getPriceReports() {
  return JSON.parse(
    localStorage.getItem("crowdPriceReports") || "[]"
  );
}

function applySevenUserPriceConsensus() {
  DatabaseService.applyLocalSevenUserConsensus();
}
