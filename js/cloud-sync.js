const CloudSync = (() => {
  let client = null;
  let currentUser = null;
  let realtimeChannel = null;
  let syncInProgress = false;

  function configured() {
    return Boolean(
      window.APP_CONFIG &&
      window.APP_CONFIG.isConfigured &&
      window.APP_CONFIG.isConfigured()
    );
  }

  function getClient() {
    if (!configured()) return null;

    if (!window.supabase?.createClient) {
      throw new Error("Supabase library did not load.");
    }

    if (!client) {
      client = window.supabase.createClient(
        window.APP_CONFIG.supabaseUrl,
        window.APP_CONFIG.supabaseAnonKey,
        {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true
          }
        }
      );
    }

    return client;
  }

  async function ensureCustomerSession() {
    const supabaseClient = getClient();
    if (!supabaseClient) return null;

    const sessionResult = await supabaseClient.auth.getSession();
    if (sessionResult.error) throw sessionResult.error;

    if (sessionResult.data.session?.user) {
      currentUser = sessionResult.data.session.user;
      return currentUser;
    }

    const anonymousResult = await supabaseClient.auth.signInAnonymously({
      options: {
        data: {
          display_name:
            localStorage.getItem("groceryProfileName") ||
            "GrocerySaver User"
        }
      }
    });

    if (anonymousResult.error) {
      throw new Error(
        "Anonymous sign-in failed. Enable Anonymous Sign-Ins in Supabase Authentication settings."
      );
    }

    currentUser = anonymousResult.data.user;
    return currentUser;
  }

  async function getCurrentUser() {
    const supabaseClient = getClient();
    if (!supabaseClient) return null;

    const result = await supabaseClient.auth.getUser();
    if (result.error) throw result.error;

    currentUser = result.data.user || null;
    return currentUser;
  }

  async function isAdmin() {
    const supabaseClient = getClient();
    const user = await getCurrentUser();

    if (!supabaseClient || !user) return false;

    const result = await supabaseClient
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .maybeSingle();

    if (result.error) throw result.error;

    return Boolean(result.data?.is_admin);
  }

  function mapCloudProduct(row) {
    return {
      id: Number(row.id),
      name: row.name,
      brand: row.brand || "No Brand",
      category: row.category || "Other",
      unit: row.unit || "1 item",
      icon: row.icon || "🛒",
      imageUrl: row.image_url || ""
    };
  }

  function mapCloudStore(row) {
    return {
      id: Number(row.id),
      name: row.name,
      address: row.address || "",
      lat: Number(row.latitude || 0),
      lng: Number(row.longitude || 0)
    };
  }

  function mapCloudPrice(row) {
    return {
      productId: Number(row.product_id),
      storeId: Number(row.store_id),
      price: Number(row.price_cents) / 100,
      source: row.source || "Cloud",
      checkedDate: row.checked_date || "",
      updatedAt: row.updated_at || "",
      crowdVerified: Boolean(row.crowd_verified),
      reportCount: Number(row.report_count || 0),
      manual: row.source === "manual_admin"
    };
  }

  async function syncCatalog() {
    if (syncInProgress || !configured()) return false;
    syncInProgress = true;

    try {
      const supabaseClient = getClient();

      const [productsResult, storesResult, pricesResult, aliasesResult] =
        await Promise.all([
          supabaseClient
            .from("products")
            .select("*")
            .eq("active", true)
            .order("name"),

          supabaseClient
            .from("stores")
            .select("*")
            .eq("active", true)
            .order("id"),

          supabaseClient
            .from("prices")
            .select("*")
            .order("product_id"),

          supabaseClient
            .from("product_aliases")
            .select("product_id,alias")
            .order("product_id")
        ]);

      for (const result of [
        productsResult,
        storesResult,
        pricesResult,
        aliasesResult
      ]) {
        if (result.error) throw result.error;
      }

      localStorage.setItem(
        "products",
        JSON.stringify(
          (productsResult.data || []).map(mapCloudProduct)
        )
      );

      localStorage.setItem(
        "stores",
        JSON.stringify(
          (storesResult.data || []).map(mapCloudStore)
        )
      );

      localStorage.setItem(
        "prices",
        JSON.stringify((pricesResult.data || []).map(mapCloudPrice))
      );

      const aliasGroups = new Map();

      (aliasesResult.data || []).forEach(row => {
        const productId = Number(row.product_id);
        if (!aliasGroups.has(productId)) {
          aliasGroups.set(productId, {
            productId,
            aliases: []
          });
        }
        aliasGroups.get(productId).aliases.push(row.alias);
      });

      localStorage.setItem(
        "productAliases",
        JSON.stringify([...aliasGroups.values()])
      );

      localStorage.setItem(
        "grocerySaverCloudCatalogActive",
        "true"
      );

      localStorage.setItem(
        "grocerySaverLastCloudSync",
        new Date().toISOString()
      );

      document.dispatchEvent(
        new CustomEvent("grocerysaver:catalog-updated")
      );

      return true;
    } finally {
      syncInProgress = false;
    }
  }

  async function syncMyReceipts() {
    if (!configured()) return;

    const supabaseClient = getClient();
    const user = await ensureCustomerSession();

    const [receiptResult, itemResult] = await Promise.all([
      supabaseClient.from("receipts").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabaseClient.from("receipt_items").select("*").eq("user_id", user.id).order("created_at", { ascending: true })
    ]);
    if (receiptResult.error) throw receiptResult.error;
    if (itemResult.error) throw itemResult.error;

    const localReceipts = (() => { try { return JSON.parse(localStorage.getItem("receipts") || "[]"); } catch (_) { return []; } })();
    const localByClientId = new Map(localReceipts.map(r => [String(r.clientReceiptId || r.id), r]));
    const groupedItems = new Map();
    (itemResult.data || []).forEach(row => {
      const key = String(row.receipt_id);
      if (!groupedItems.has(key)) groupedItems.set(key, []);
      groupedItems.get(key).push({
        id: row.id,
        rawName: row.raw_name,
        normalizedName: row.normalized_name,
        matchedProductId: row.matched_product_id,
        matchedName: row.matched_name,
        confidence: Number(row.match_confidence || 0),
        quantity: Number(row.quantity || 1),
        unitPrice: Number(row.unit_price || 0),
        price: Number(row.unit_price || 0) * Number(row.quantity || 1)
      });
    });

    const cloudReceipts = (receiptResult.data || []).map(row => {
      const local = localByClientId.get(String(row.client_receipt_id || row.id)) || {};
      return {
        ...local,
        id: row.id,
        clientReceiptId: row.client_receipt_id,
        userId: row.user_id,
        storeId: Number(row.store_id),
        receiptDate: row.receipt_date,
        totalSpent: Number(row.total_spent),
        cheapestTotal: Number(row.cheapest_total || 0),
        savings: Number(row.savings || 0),
        regularPriceTotal: Number(row.regular_price_total || 0),
        imageName: row.image_name || local.imageName || "",
        rawText: row.raw_text || local.rawText || "",
        items: groupedItems.get(String(row.id)) || local.items || [],
        cloudSaved: true,
        createdAt: row.created_at
      };
    });

    const merged = new Map(localReceipts.map(r => [String(r.clientReceiptId || r.id), r]));
    cloudReceipts.forEach(r => merged.set(String(r.clientReceiptId || r.id), r));
    const receipts = [...merged.values()].sort((a,b) => new Date(b.createdAt || b.receiptDate || 0) - new Date(a.createdAt || a.receiptDate || 0));
    localStorage.setItem("receipts", JSON.stringify(receipts));
    document.dispatchEvent(new CustomEvent("grocerysaver:receipts-updated"));
  }

  async function syncMyProfile() {
    if (!configured()) return;

    const supabaseClient = getClient();
    const user = await ensureCustomerSession();

    const result = await supabaseClient
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (result.error) throw result.error;
    if (!result.data) return;

    if (result.data.display_name) {
      localStorage.setItem(
        "groceryProfileName",
        result.data.display_name
      );
    }

    if (result.data.monthly_budget !== null) {
      localStorage.setItem(
        "monthlyGroceryBudget",
        String(result.data.monthly_budget)
      );
    }
  }

  async function saveMyProfile({ displayName, monthlyBudget }) {
    const supabaseClient = getClient();
    const user = await ensureCustomerSession();

    const result = await supabaseClient
      .from("profiles")
      .update({
        display_name: displayName || "GrocerySaver User",
        monthly_budget: Number(monthlyBudget || 0),
        updated_at: new Date().toISOString()
      })
      .eq("id", user.id);

    if (result.error) throw result.error;
  }

  async function signInAdmin(email, password) {
    const supabaseClient = getClient();

    await supabaseClient.auth.signOut();

    const result = await supabaseClient.auth.signInWithPassword({
      email,
      password
    });

    if (result.error) throw result.error;

    currentUser = result.data.user;

    if (!(await isAdmin())) {
      await supabaseClient.auth.signOut();
      throw new Error("This account is not an administrator.");
    }

    return currentUser;
  }

  async function signOutAdmin() {
    const supabaseClient = getClient();
    await supabaseClient.auth.signOut();
    currentUser = null;
  }

  async function requireAdmin() {
    if (!configured()) {
      throw new Error("Supabase is not configured in js/app-config.js.");
    }

    if (!(await isAdmin())) {
      throw new Error("Admin login required.");
    }
  }

  async function upsertProduct(product) {
    await requireAdmin();

    const result = await getClient()
      .from("products")
      .upsert(
        {
          id: Number(product.id),
          name: product.name,
          brand: product.brand,
          category: product.category,
          unit: product.unit,
          icon: product.icon || "🛒",
          image_url: product.imageUrl || null,
          active: true,
          updated_at: new Date().toISOString()
        },
        { onConflict: "id" }
      );

    if (result.error) throw result.error;
    await syncCatalog();
  }

  async function deleteProduct(productId) {
    await requireAdmin();

    const result = await getClient()
      .from("products")
      .update({
        active: false,
        updated_at: new Date().toISOString()
      })
      .eq("id", Number(productId));

    if (result.error) throw result.error;
    await syncCatalog();
  }

  async function upsertPrice(price) {
    await requireAdmin();

    const result = await getClient()
      .from("prices")
      .upsert(
        {
          product_id: Number(price.productId),
          store_id: Number(price.storeId),
          price_cents: Math.round(Number(price.price) * 100),
          source: "manual_admin",
          crowd_verified: false,
          report_count: 0,
          checked_date: price.checkedDate || new Date().toISOString().slice(0, 10),
          updated_at: new Date().toISOString()
        },
        { onConflict: "product_id,store_id" }
      );

    if (result.error) throw result.error;
    await syncCatalog();
  }

  async function deletePrice(productId, storeId) {
    await requireAdmin();

    const result = await getClient()
      .from("prices")
      .delete()
      .eq("product_id", Number(productId))
      .eq("store_id", Number(storeId));

    if (result.error) throw result.error;
    await syncCatalog();
  }

  async function replaceAliases(productId, aliases) {
    await requireAdmin();

    const supabaseClient = getClient();

    const deleteResult = await supabaseClient
      .from("product_aliases")
      .delete()
      .eq("product_id", Number(productId));

    if (deleteResult.error) throw deleteResult.error;

    const cleanAliases = [...new Set(
      aliases
        .map(alias => String(alias).trim().toLowerCase())
        .filter(Boolean)
    )];

    if (cleanAliases.length) {
      const insertResult = await supabaseClient
        .from("product_aliases")
        .insert(
          cleanAliases.map(alias => ({
            product_id: Number(productId),
            alias,
            normalized_alias: alias
              .replace(/[^a-z0-9 ]/g, " ")
              .replace(/\s+/g, " ")
              .trim()
          }))
        );

      if (insertResult.error) throw insertResult.error;
    }

    await syncCatalog();
  }

  async function getAdminUsers() {
    await requireAdmin();

    const result = await getClient()
      .from("admin_user_summary")
      .select("*")
      .order("created_at", { ascending: false });

    if (result.error) throw result.error;
    return result.data || [];
  }

  async function deleteUserAppData(userId) {
    await requireAdmin();

    const result = await getClient().rpc(
      "admin_delete_user_app_data",
      { target_user_id: userId }
    );

    if (result.error) throw result.error;
  }

  async function getAliasCandidates() {
    await requireAdmin();

    const result = await getClient()
      .from("admin_alias_candidates")
      .select("*")
      .order("last_seen_at", { ascending: false });

    if (result.error) throw result.error;
    return result.data || [];
  }

  async function assignReceiptAlias(normalizedName, productId, storeId) {
    await requireAdmin();

    const result = await getClient().rpc(
      "admin_assign_receipt_alias",
      {
        target_normalized_name: normalizedName,
        target_product_id: Number(productId),
        target_store_id: storeId ? Number(storeId) : null
      }
    );

    if (result.error) throw result.error;
    await syncCatalog();
    return result.data;
  }

  async function getAdminReceiptData() {
    await requireAdmin();

    const supabaseClient = getClient();

    const [receipts, items, reports, profiles] = await Promise.all([
      supabaseClient
        .from("receipts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100),

      supabaseClient
        .from("receipt_items")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500),

      supabaseClient
        .from("crowd_price_reports")
        .select("*")
        .order("reported_at", { ascending: false })
        .limit(1000),

      supabaseClient
        .from("profiles")
        .select("id,display_name,email")
        .limit(1000)
    ]);

    if (receipts.error) throw receipts.error;
    if (items.error) throw items.error;
    if (reports.error) throw reports.error;
    if (profiles.error) throw profiles.error;

    return {
      receipts: receipts.data || [],
      items: items.data || [],
      reports: reports.data || [],
      profiles: profiles.data || []
    };
  }


  async function updateAdminReceiptStore(receiptId, storeId) {
    await requireAdmin();
    const supabaseClient = getClient();
    const receiptResult = await supabaseClient
      .from("receipts")
      .update({ store_id: Number(storeId) })
      .eq("id", receiptId);
    if (receiptResult.error) throw receiptResult.error;
    const itemResult = await supabaseClient
      .from("receipt_items")
      .update({ store_id: Number(storeId) })
      .eq("receipt_id", receiptId);
    if (itemResult.error) throw itemResult.error;
    const reportResult = await supabaseClient
      .from("crowd_price_reports")
      .update({ store_id: Number(storeId) })
      .eq("receipt_id", receiptId);
    if (reportResult.error) throw reportResult.error;
    return true;
  }
  function subscribeCatalog() {
    if (!configured() || realtimeChannel) return;

    realtimeChannel = getClient()
      .channel("grocerysaver-catalog")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "products"
        },
        () => syncCatalog()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "prices"
        },
        () => syncCatalog()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "product_aliases"
        },
        () => syncCatalog()
      )
      .subscribe();
  }

  async function boot() {
    if (!configured()) {
      document.dispatchEvent(
        new CustomEvent("grocerysaver:cloud-missing")
      );
      return;
    }

    try {
      await ensureCustomerSession();
      await Promise.all([
        syncCatalog(),
        syncMyReceipts(),
        syncMyProfile()
      ]);
      subscribeCatalog();

      document.dispatchEvent(
        new CustomEvent("grocerysaver:cloud-ready")
      );
    } catch (error) {
      console.error("Cloud boot error:", error);
      document.dispatchEvent(
        new CustomEvent("grocerysaver:cloud-error", {
          detail: error
        })
      );
    }
  }

  return {
    configured,
    getClient,
    boot,
    syncCatalog,
    syncMyReceipts,
    syncMyProfile,
    saveMyProfile,
    ensureCustomerSession,
    getCurrentUser,
    isAdmin,
    signInAdmin,
    signOutAdmin,
    requireAdmin,
    upsertProduct,
    deleteProduct,
    upsertPrice,
    deletePrice,
    replaceAliases,
    getAdminUsers,
    deleteUserAppData,
    getAdminReceiptData,
    updateAdminReceiptStore,
    getAliasCandidates,
    assignReceiptAlias
  };
})();

window.addEventListener("DOMContentLoaded", () => {
  CloudSync.boot();
});


window.addEventListener("focus", () => {
  if (CloudSync.configured()) {
    CloudSync.syncCatalog().catch(console.error);
  }
});

window.addEventListener("pageshow", () => {
  if (CloudSync.configured()) {
    CloudSync.syncCatalog().catch(console.error);
  }
});

document.addEventListener("visibilitychange", () => {
  if (
    document.visibilityState === "visible" &&
    CloudSync.configured()
  ) {
    CloudSync.syncCatalog().catch(console.error);
  }
});
