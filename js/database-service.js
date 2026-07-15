const DatabaseService = (() => {
  function isSupabaseMode() {
    return Boolean(
      window.APP_CONFIG?.databaseMode === "supabase" &&
      CloudSync.configured()
    );
  }

  async function saveConfirmedReceipt(receipt, matchedItems) {
    // Always keep a device-side admin copy first. This prevents a failed network
    // request from making the receipt disappear and gives the admin fallback data.
    saveReceiptLocally(receipt, matchedItems);
    if (!isSupabaseMode()) return { mode: "local", receiptId: receipt.id };
    return saveReceiptToSupabase(receipt, matchedItems);
  }

  function saveReceiptLocally(receipt, matchedItems) {
    const adminReceipts = JSON.parse(
      localStorage.getItem("adminReceipts") || "[]"
    );
    const adminItems = JSON.parse(
      localStorage.getItem("adminReceiptItems") || "[]"
    );
    const reports = JSON.parse(
      localStorage.getItem("crowdPriceReports") || "[]"
    );
    const userId = getLocalUserId();

    const receiptRow = { ...receipt, userId };
    const existingReceiptIndex = adminReceipts.findIndex(row => String(row.id) === String(receipt.id));
    if (existingReceiptIndex >= 0) adminReceipts[existingReceiptIndex] = receiptRow;
    else adminReceipts.push(receiptRow);

    // A retry replaces this receipt's local item/report rows instead of duplicating them.
    for (let index = adminItems.length - 1; index >= 0; index--) {
      if (String(adminItems[index].receiptId) === String(receipt.id)) adminItems.splice(index, 1);
    }
    for (let index = reports.length - 1; index >= 0; index--) {
      if (String(reports[index].receiptId) === String(receipt.id)) reports.splice(index, 1);
    }

    const seen = new Set();
    (matchedItems || []).forEach(item => {
      const normalized = String(item.normalizedName || item.rawName || '').trim().toLowerCase();
      const quantity = Number(item.quantity || 1);
      const unitPrice = Number(item.unitPrice || 0);
      const key = `${normalized}|${quantity.toFixed(3)}|${unitPrice.toFixed(2)}`;
      if (!normalized || seen.has(key)) return;
      seen.add(key);
      adminItems.push({ ...item, receiptId: receipt.id, userId, storeId: Number(receipt.storeId) });

      if (item.matchedProductId && unitPrice > 0) {
        reports.push({
          id: item.id,
          userId,
          receiptId: receipt.id,
          productId: item.matchedProductId,
          storeId: receipt.storeId,
          price: Number(unitPrice.toFixed(2)),
          priceCents: Math.round(unitPrice * 100),
          reportedAt: receipt.createdAt
        });
      }
    });

    localStorage.setItem(
      "adminReceipts",
      JSON.stringify(adminReceipts)
    );
    localStorage.setItem(
      "adminReceiptItems",
      JSON.stringify(adminItems)
    );
    localStorage.setItem(
      "crowdPriceReports",
      JSON.stringify(reports)
    );

    return {
      mode: "local",
      receiptId: receipt.id
    };
  }

  async function saveReceiptToSupabase(receipt, matchedItems) {
    const client = CloudSync.getClient();
    const user = await CloudSync.ensureCustomerSession();

    const receiptResult = await client
      .from("receipts")
      .upsert({
        client_receipt_id: String(receipt.id),
        user_id: user.id,
        store_id: Number(receipt.storeId),
        receipt_date: receipt.receiptDate,
        total_spent: Number(receipt.totalSpent),
        cheapest_total: Number(receipt.cheapestTotal || 0),
        savings: Number(receipt.savings || 0),
        regular_price_total: Number(receipt.regularPriceTotal || 0),
        image_name: receipt.imageName || null,
        raw_text: receipt.rawText || null,
        created_at: receipt.createdAt
      }, { onConflict: "user_id,client_receipt_id" })
      .select("id")
      .single();

    if (receiptResult.error) throw receiptResult.error;

    const cloudReceiptId = receiptResult.data.id;

    const dedupedItems = [];
    const seenItemKeys = new Set();
    (matchedItems || []).forEach(item => {
      const normalized = String(item.normalizedName || item.rawName || "").trim().toLowerCase();
      const quantity = Number(item.quantity || 1);
      const unitPrice = Number(item.unitPrice || 0);
      const key = `${normalized}|${quantity.toFixed(3)}|${unitPrice.toFixed(2)}`;
      if (!normalized || seenItemKeys.has(key)) return;
      seenItemKeys.add(key);
      dedupedItems.push(item);
    });

    // A retry should replace the digitized lines instead of duplicating them.
    const deleteItems = await client.from("receipt_items").delete().eq("receipt_id", cloudReceiptId);
    if (deleteItems.error) throw deleteItems.error;
    const deleteReports = await client.from("crowd_price_reports").delete().eq("receipt_id", cloudReceiptId);
    if (deleteReports.error) throw deleteReports.error;

    const itemRows = dedupedItems.map(item => ({
      receipt_id: cloudReceiptId,
      user_id: user.id,
      store_id: Number(receipt.storeId),
      raw_name: item.rawName,
      normalized_name: item.normalizedName,
      matched_product_id: item.matchedProductId,
      matched_name: item.matchedName,
      match_confidence: Number(item.confidence || 0),
      quantity: Number(item.quantity || 1),
      unit_price: Number(item.unitPrice || 0),
      price_cents: Math.round(Number(item.unitPrice || 0) * 100),
      created_at: receipt.createdAt
    }));

    if (itemRows.length) {
      const itemResult = await client
        .from("receipt_items")
        .insert(itemRows);

      if (itemResult.error) throw itemResult.error;
    }

    const reportRows = dedupedItems
      .filter(item =>
        item.matchedProductId &&
        Number(item.unitPrice) > 0
      )
      .map(item => ({
        user_id: user.id,
        receipt_id: cloudReceiptId,
        product_id: Number(item.matchedProductId),
        store_id: Number(receipt.storeId),
        price_cents: Math.round(Number(item.unitPrice) * 100),
        reported_at: receipt.createdAt
      }));

    if (reportRows.length) {
      const reportResult = await client
        .from("crowd_price_reports")
        .upsert(reportRows, {
          onConflict:
            "user_id,receipt_id,product_id,store_id,price_cents",
          ignoreDuplicates: true
        });

      if (reportResult.error) throw reportResult.error;
    }

    await CloudSync.syncMyReceipts();

    return {
      mode: "supabase",
      receiptId: cloudReceiptId
    };
  }

  function applyLocalSevenUserConsensus() {
    const reports = JSON.parse(
      localStorage.getItem("crowdPriceReports") || "[]"
    );
    const prices = getPrices();
    const grouped = new Map();

    reports.forEach(report => {
      const cents = Number(report.priceCents || Math.round(Number(report.price || 0) * 100));
      if (!report.productId || !report.storeId || cents <= 0) return;
      const key = `${report.productId}|${report.storeId}|${cents}`;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push({ ...report, priceCents: cents });
    });

    grouped.forEach(group => {
      const distinctUsers = new Set(group.map(report => String(report.userId)));
      const distinctReceipts = new Set(group.map(report => String(report.receiptId)));
      if (distinctUsers.size < 3 || distinctReceipts.size < 3) return;

      const sample = group[0];
      const existing = prices.find(price =>
        Number(price.productId) === Number(sample.productId) &&
        Number(price.storeId) === Number(sample.storeId)
      );
      const promoted = {
        productId: Number(sample.productId),
        storeId: Number(sample.storeId),
        price: Number((sample.priceCents / 100).toFixed(2)),
        source: "crowd_receipts_3_users_3_receipts",
        crowdVerified: true,
        reportCount: Math.min(distinctUsers.size, distinctReceipts.size),
        checkedDate: new Date().toISOString().slice(0, 10),
        updatedAt: new Date().toISOString(),
        manual: false
      };
      if (existing) Object.assign(existing, promoted);
      else prices.push(promoted);
    });

    savePrices(prices);
  }

  return {
    isSupabaseMode,
    saveConfirmedReceipt,
    applyLocalSevenUserConsensus
  };
})();
