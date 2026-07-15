const ReceiptMatcher = (() => {
  function normalize(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/[^a-z0-9% ]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function levenshtein(a, b) {
    a = normalize(a); b = normalize(b);
    const matrix = Array.from({length: b.length + 1}, (_, i) => [i]);
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        matrix[i][j] = b[i-1] === a[j-1]
          ? matrix[i-1][j-1]
          : Math.min(matrix[i-1][j-1] + 1, matrix[i][j-1] + 1, matrix[i-1][j] + 1);
      }
    }
    return matrix[b.length][a.length];
  }

  function similarity(a, b) {
    const left = normalize(a), right = normalize(b);
    if (!left || !right) return 0;
    if (left.includes(right) || right.includes(left)) return 0.94;
    const max = Math.max(left.length, right.length);
    return max ? 1 - levenshtein(left, right) / max : 0;
  }

  function aliasEntries() {
    const products = getProducts();
    const aliases = (() => { try { return JSON.parse(localStorage.getItem("productAliases") || "[]"); } catch (_) { return []; } })();
    const rows = [];
    products.forEach(product => {
      rows.push({ product, text: product.name });
      rows.push({ product, text: `${product.brand || ""} ${product.name}` });
      const group = aliases.find(item => Number(item.productId) === Number(product.id));
      (group?.aliases || []).forEach(alias => rows.push({ product, text: alias }));
    });
    return rows;
  }

  function matchProduct(rawName) {
    let best = null;
    aliasEntries().forEach(entry => {
      const score = similarity(rawName, entry.text);
      if (!best || score > best.score) best = { ...entry, score };
    });
    return best && best.score >= 0.52 ? best : null;
  }

  function detectStore(text) {
    const normalized = normalize(text);
    const stores = getStores();
    const common = [
      ["no frills", /no\s*frills|nofrills|no-frills|loblaw.*no frills/i],
      ["walmart", /wal[\s-]*mart|walmart|wal-mart/i],
      ["superstore", /real\s*canadian\s*superstore|superstore|rcss|loblaw.*superstore/i],
      ["costco", /costco/i],
      ["freshco", /fresh\s*co/i],
      ["save-on-foods", /save.?on.?foods/i]
    ];
    for (const [name, pattern] of common) {
      if (pattern.test(text)) {
        const found = stores.find(store => normalize(store.name).includes(normalize(name)) || normalize(name).includes(normalize(store.name)));
        if (found) return Number(found.id);
      }
    }
    const direct = stores.find(store => normalized.includes(normalize(store.name)));
    if (direct) return Number(direct.id);
    // OCR sometimes damages the header. Use distinctive loyalty/footer phrases.
    const hintMap = [
      ["walmart", /save money live better|walmart rewards/i],
      ["no frills", /pc optimum|no name|president.?s choice/i],
      ["superstore", /real canadian|superstore|pc optimum/i]
    ];
    for (const [name, pattern] of hintMap) {
      if (pattern.test(text)) {
        const found = stores.find(store => normalize(store.name).includes(normalize(name)) || normalize(name).includes(normalize(store.name)));
        if (found) return Number(found.id);
      }
    }
    return 0;
  }

  function detectTotal(lines) {
    const prioritized = lines.filter(line => /\b(total|amount due|balance)\b/i.test(line) && !/subtotal|total saved|tax/i.test(line));
    const candidates = prioritized.length ? prioritized : lines.slice(-12);
    for (let i = candidates.length - 1; i >= 0; i--) {
      const nums = [...candidates[i].matchAll(/(?:\$\s*)?(\d{1,5}[.,]\d{2})\b/g)].map(m => Number(m[1].replace(',', '.')));
      if (nums.length) return nums[nums.length - 1];
    }
    return 0;
  }

  function isNoise(line) {
    return !line || /^(subtotal|total|tax|gst|hst|change|cash|visa|mastercard|debit|approved|thank|store|phone|tel|date|time|receipt|transaction|balance|points|savings)/i.test(line) || /\b(total|subtotal|gst|hst|change due|amount due)\b/i.test(line);
  }

  function parseItemLines(lines) {
    const items = [];
    const seen = new Set();
    lines.forEach((line, index) => {
      const clean = line.replace(/\s+/g, ' ').trim();
      if (isNoise(clean)) return;
      const priceMatches = [...clean.matchAll(/(?:\$\s*)?(\d{1,4}[.,]\d{2})(?!\d)/g)];
      if (!priceMatches.length) return;
      const last = priceMatches[priceMatches.length - 1];
      const linePrice = Number(last[1].replace(',', '.'));
      if (!(linePrice > 0) || linePrice > 10000) return;
      let name = clean.slice(0, last.index).replace(/^[#*\-\s]+/, '').replace(/\b\d+\s*[xX@]\s*\d+[.,]\d{2}\b/g, '').trim();
      if (name.length < 2 || /^\d+$/.test(name)) return;
      let quantity = 1;
      let unitPrice = linePrice;
      const qty = clean.match(/\b(\d+(?:\.\d+)?)\s*[xX@]\s*\$?(\d+[.,]\d{2})/);
      if (qty) {
        quantity = Math.max(1, Number(qty[1]));
        unitPrice = Number(qty[2].replace(',', '.'));
      }
      const match = matchProduct(name);
      const normalizedName = normalize(name);
      const dedupeKey = `${normalizedName}|${Number(quantity).toFixed(3)}|${Number(unitPrice).toFixed(2)}`;
      if (seen.has(dedupeKey)) return;
      seen.add(dedupeKey);
      items.push({
        id: `${Date.now()}-${index}`,
        rawName: name,
        normalizedName,
        matchedProductId: match ? Number(match.product.id) : null,
        matchedName: match ? match.product.name : null,
        confidence: match ? Number(match.score.toFixed(4)) : 0,
        quantity,
        unitPrice: Number(unitPrice.toFixed(2)),
        lineTotal: Number(linePrice.toFixed(2))
      });
    });
    return items;
  }

  async function extract(file, onProgress) {
    if (!window.Tesseract) throw new Error("Receipt scanner did not load. Check your internet connection and try again.");
    const result = await window.Tesseract.recognize(file, "eng", {
      logger: message => {
        if (message.status === "recognizing text" && onProgress) onProgress(Math.round((message.progress || 0) * 100));
      }
    });
    const rawText = result?.data?.text || "";
    const lines = rawText.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
    return {
      rawText,
      storeId: detectStore(rawText),
      total: detectTotal(lines),
      items: parseItemLines(lines)
    };
  }

  return { extract, normalize, matchProduct };
})();
