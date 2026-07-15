const DEFAULT_PRODUCTS = [
  {id:1,name:"Milk 2L",brand:"Great Value",category:"Dairy",unit:"2 L",icon:"🥛"},
  {id:2,name:"Eggs",brand:"Great Value",category:"Dairy",unit:"12 pack",icon:"🥚"},
  {id:3,name:"White Bread",brand:"Wonder",category:"Bakery",unit:"675 g",icon:"🍞"},
  {id:4,name:"Bananas",brand:"No Brand",category:"Fruit",unit:"1 kg",icon:"🍌"},
  {id:5,name:"Chicken Breast",brand:"No Brand",category:"Meat",unit:"1 kg",icon:"🍗"},
  {id:6,name:"Tomatoes",brand:"No Brand",category:"Vegetables",unit:"1 kg",icon:"🍅"},
  {id:7,name:"Potatoes",brand:"No Brand",category:"Vegetables",unit:"5 lb",icon:"🥔"},
  {id:8,name:"Rice",brand:"Rooster",category:"Pantry",unit:"8 kg",icon:"🍚"},
  {id:9,name:"Apples",brand:"No Brand",category:"Fruit",unit:"3 lb",icon:"🍎"},
  {id:10,name:"Ground Beef",brand:"No Brand",category:"Meat",unit:"1 kg",icon:"🥩"},
  {id:11,name:"Olive Oil",brand:"No Brand",category:"Pantry",unit:"1 L",icon:"🫒"}
];

const DEFAULT_STORES = [
  {id:1,name:"Walmart",lat:53.4616,lng:-113.4320,address:"Edmonton",logo:"★",color:"#0b63ce"},
  {id:2,name:"No Frills",lat:53.4726,lng:-113.4470,address:"Edmonton",logo:"NF",color:"#f7c900"},
  {id:3,name:"Superstore",lat:53.4447,lng:-113.4493,address:"Edmonton",logo:"🍁",color:"#d92828"},
  {id:4,name:"Costco",lat:53.4461,lng:-113.4880,address:"Edmonton",logo:"C",color:"#d51f2b"}
];

const DEFAULT_PRICES = [
  {productId:1,storeId:1,price:4.48},{productId:1,storeId:2,price:4.79},{productId:1,storeId:3,price:4.69},{productId:1,storeId:4,price:4.29},
  {productId:2,storeId:1,price:3.68},{productId:2,storeId:2,price:3.99},{productId:2,storeId:3,price:3.79},{productId:2,storeId:4,price:3.45},
  {productId:3,storeId:1,price:2.47},{productId:3,storeId:2,price:2.29},{productId:3,storeId:3,price:2.49},{productId:3,storeId:4,price:2.59},
  {productId:4,storeId:1,price:1.69},{productId:4,storeId:2,price:1.58},{productId:4,storeId:3,price:1.66},{productId:4,storeId:4,price:1.49},
  {productId:5,storeId:1,price:13.19},{productId:5,storeId:2,price:12.98},{productId:5,storeId:3,price:13.49},{productId:5,storeId:4,price:11.99},
  {productId:6,storeId:1,price:3.97},{productId:6,storeId:2,price:3.49},{productId:6,storeId:3,price:3.79},{productId:6,storeId:4,price:3.59},
  {productId:7,storeId:1,price:4.97},{productId:7,storeId:2,price:4.49},{productId:7,storeId:3,price:4.79},{productId:7,storeId:4,price:4.39},
  {productId:8,storeId:1,price:18.97},{productId:8,storeId:2,price:19.49},{productId:8,storeId:3,price:18.79},{productId:8,storeId:4,price:17.99},
  {productId:9,storeId:1,price:5.97},{productId:9,storeId:2,price:5.49},{productId:9,storeId:3,price:5.79},{productId:9,storeId:4,price:5.29},
  {productId:10,storeId:1,price:12.97},{productId:10,storeId:2,price:12.49},{productId:10,storeId:3,price:13.29},{productId:10,storeId:4,price:11.99},
  {productId:11,storeId:1,price:10.97},{productId:11,storeId:2,price:11.49},{productId:11,storeId:3,price:10.79},{productId:11,storeId:4,price:9.99}
];

function readJson(key, fallback = []) {
  try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); }
  catch { return fallback; }
}

function mergeById(defaults, saved, deletedIds = []) {
  const deleted = new Set(deletedIds.map(Number));
  const map = new Map(defaults.filter(x => !deleted.has(Number(x.id))).map(x => [Number(x.id), {...x}]));
  saved.forEach(item => {
    if (!deleted.has(Number(item.id))) map.set(Number(item.id), {...map.get(Number(item.id)), ...item});
  });
  return [...map.values()].sort((a,b) => Number(a.id)-Number(b.id));
}

function getProducts() {
  const cloudCatalogActive =
    localStorage.getItem(
      "grocerySaverCloudCatalogActive"
    ) === "true";

  const saved = readJson("products");

  /*
    Once Supabase has synced successfully, its product list is
    authoritative. Do not merge deleted cloud products back in
    from DEFAULT_PRODUCTS.
  */
  if (cloudCatalogActive && saved.length) {
    return saved
      .map(item => ({ ...item }))
      .sort((a, b) => Number(a.id) - Number(b.id));
  }

  /*
    If cloud sync is enabled but the browser cache is temporarily empty
    (slow network, first load, or a failed sync), keep the built-in catalog
    available so searches such as "egg" still work.
  */

  const products = mergeById(
    DEFAULT_PRODUCTS,
    saved,
    readJson("deletedProductIds")
  );

  localStorage.setItem(
    "products",
    JSON.stringify(products)
  );

  return products;
}
function saveProducts(products) { localStorage.setItem("products", JSON.stringify(products)); }
function deleteProductById(id) {
  const deleted = new Set(readJson("deletedProductIds").map(Number));
  deleted.add(Number(id));
  localStorage.setItem("deletedProductIds", JSON.stringify([...deleted]));
  saveProducts(getProducts().filter(p => Number(p.id) !== Number(id)));
  savePrices(getPrices().filter(p => Number(p.productId) !== Number(id)));
  saveList(getList().filter(item => Number(item.productId) !== Number(id)));
}
function restoreProductById(id) {
  const deleted = readJson("deletedProductIds").map(Number).filter(x => x !== Number(id));
  localStorage.setItem("deletedProductIds", JSON.stringify(deleted));
}

function getStores() {
  const cloudCatalogActive =
    localStorage.getItem(
      "grocerySaverCloudCatalogActive"
    ) === "true";

  const saved = readJson("stores");

  if (cloudCatalogActive) {
    return saved
      .map(item => ({ ...item }))
      .sort((a, b) => Number(a.id) - Number(b.id));
  }

  const stores = mergeById(
    DEFAULT_STORES,
    saved
  );

  localStorage.setItem(
    "stores",
    JSON.stringify(stores)
  );

  return stores;
}
function saveStores(stores) { localStorage.setItem("stores", JSON.stringify(stores)); }

function getPrices() {
  const cloudCatalogActive =
    localStorage.getItem(
      "grocerySaverCloudCatalogActive"
    ) === "true";

  const saved = readJson("prices");

  if (cloudCatalogActive) {
    return saved.map(item => ({ ...item }));
  }

  const deleted =
    new Set(readJson("deletedPriceKeys"));

  const map = new Map(
    DEFAULT_PRICES
      .filter(price =>
        !deleted.has(
          `${price.productId}|${price.storeId}`
        )
      )
      .map(price => [
        `${price.productId}|${price.storeId}`,
        { ...price }
      ])
  );

  saved.forEach(price => {
    const key =
      `${price.productId}|${price.storeId}`;

    if (!deleted.has(key)) {
      map.set(key, {
        ...map.get(key),
        ...price
      });
    }
  });

  const prices = [...map.values()];

  localStorage.setItem(
    "prices",
    JSON.stringify(prices)
  );

  return prices;
}
function savePrices(prices) { localStorage.setItem("prices", JSON.stringify(prices)); }
function restorePriceEntry(productId, storeId) {
  const key = `${productId}|${storeId}`;
  localStorage.setItem("deletedPriceKeys", JSON.stringify(readJson("deletedPriceKeys").filter(x => x !== key)));
}
function deletePriceEntry(productId, storeId) {
  const key = `${productId}|${storeId}`;
  const deleted = new Set(readJson("deletedPriceKeys"));
  deleted.add(key);
  localStorage.setItem("deletedPriceKeys", JSON.stringify([...deleted]));
  savePrices(getPrices().filter(p => !(Number(p.productId) === Number(productId) && Number(p.storeId) === Number(storeId))));
}

function getLocalUserId(){
  let userId=localStorage.getItem("grocerySaverUserId");
  if(!userId){
    userId=(crypto.randomUUID ? crypto.randomUUID() : `user-${Date.now()}-${Math.random().toString(16).slice(2)}`);
    localStorage.setItem("grocerySaverUserId",userId);
  }
  return userId;
}
function getList(){return readJson("groceryList")}
function saveList(x){localStorage.setItem("groceryList",JSON.stringify(x))}
function getReceipts(){return readJson("receipts")}
function saveReceipts(x){localStorage.setItem("receipts",JSON.stringify(x))}
function money(x){return "$"+Number(x||0).toFixed(2)}
function productById(id){return getProducts().find(p=>Number(p.id)===Number(id))}
function storeById(id){return getStores().find(s=>Number(s.id)===Number(id))}
function priceFor(productId,storeId){return getPrices().find(p=>Number(p.productId)===Number(productId)&&Number(p.storeId)===Number(storeId))}
function lowestPrice(productId){return getPrices().filter(p=>Number(p.productId)===Number(productId)).sort((a,b)=>a.price-b.price)[0]||null}
function showMessage(id,text,type="success"){const e=document.getElementById(id);if(e)e.innerHTML=`<div class="${type}">${text}</div>`}
function setSelectedStore(id){localStorage.setItem("selectedStoreId",String(id))}
function getSelectedStore(){return Number(localStorage.getItem("selectedStoreId")||1)}
function setSelectedPlan(plan){localStorage.setItem("selectedPlan",JSON.stringify(plan))}
function getSelectedPlan(){return readJson("selectedPlan",null)}

const CATEGORY_ICONS = {
  dairy:"🥛", bakery:"🍞", fruit:"🍎", fruits:"🍎", meat:"🥩", vegetables:"🥦",
  vegetable:"🥦", pantry:"🥫", frozen:"❄️", beverages:"🥤", beverage:"🥤",
  personal:"🧴", "personal care":"🧴", household:"🧻", snacks:"🍿", seafood:"🐟"
};
function productIcon(product) {
  if (product?.icon) return product.icon;
  return CATEGORY_ICONS[String(product?.category||"").toLowerCase()] || "🛒";
}
function storeLogo(store) { return store?.logo || "🏪"; }


// ===============================
// LOCAL USER DATA
// ===============================

function getUsers(){
  const savedUsers=JSON.parse(
    localStorage.getItem("appUsers")||"[]"
  );

  if(savedUsers.length){
    return savedUsers;
  }

  const defaultUser={
    id:getLocalUserId(),
    name:localStorage.getItem("profileName")||"Demo User",
    email:"local-user@grocerysaver.app",
    createdAt:new Date().toISOString()
  };

  localStorage.setItem(
    "appUsers",
    JSON.stringify([defaultUser])
  );

  return [defaultUser];
}

function saveUsers(users){
  localStorage.setItem(
    "appUsers",
    JSON.stringify(users)
  );
}

function getCurrentUserId(){
  return getLocalUserId();
}

function getUserDataSummary(userId){
  const receipts=JSON.parse(
    localStorage.getItem("receipts")||"[]"
  ).filter(receipt=>
    String(receipt.userId||getCurrentUserId())===String(userId)
  );

  const adminReceipts=JSON.parse(
    localStorage.getItem("adminReceipts")||"[]"
  ).filter(receipt=>
    String(receipt.userId||getCurrentUserId())===String(userId)
  );

  const priceReports=JSON.parse(
    localStorage.getItem("crowdPriceReports")||"[]"
  ).filter(report=>
    String(report.userId||getCurrentUserId())===String(userId)
  );

  return {
    receiptCount:receipts.length,
    adminReceiptCount:adminReceipts.length,
    priceReportCount:priceReports.length
  };
}

function deleteUserData(userId){
  const currentUserId=getCurrentUserId();

  const receipts=JSON.parse(
    localStorage.getItem("receipts")||"[]"
  ).filter(receipt=>
    String(receipt.userId||currentUserId)!==String(userId)
  );

  const adminReceipts=JSON.parse(
    localStorage.getItem("adminReceipts")||"[]"
  ).filter(receipt=>
    String(receipt.userId||currentUserId)!==String(userId)
  );

  const adminItems=JSON.parse(
    localStorage.getItem("adminReceiptItems")||"[]"
  ).filter(item=>
    String(item.userId||currentUserId)!==String(userId)
  );

  const priceReports=JSON.parse(
    localStorage.getItem("crowdPriceReports")||"[]"
  ).filter(report=>
    String(report.userId||currentUserId)!==String(userId)
  );

  localStorage.setItem("receipts",JSON.stringify(receipts));
  localStorage.setItem("adminReceipts",JSON.stringify(adminReceipts));
  localStorage.setItem("adminReceiptItems",JSON.stringify(adminItems));
  localStorage.setItem("crowdPriceReports",JSON.stringify(priceReports));

  if(String(userId)===String(currentUserId)){
    localStorage.removeItem("groceryList");
    localStorage.removeItem("checkedGroceryItems");
    localStorage.removeItem("shoppingSessionActive");
    localStorage.removeItem("shoppingReturnPromptPending");
    localStorage.removeItem("shoppingNavigationStartedAt");
    localStorage.removeItem("selectedPlan");
    localStorage.removeItem("selectedStoreId");
    localStorage.removeItem("completedShoppingList");
    localStorage.removeItem("completedShoppingPlan");
    localStorage.removeItem("monthlyBudget");
    localStorage.removeItem("profileName");
  }
}


function saveSelectedPlan(plan) {
  localStorage.setItem(
    "selectedPlan",
    JSON.stringify(plan)
  );
}

function getSelectedPlan() {
  return JSON.parse(
    localStorage.getItem("selectedPlan") || "null"
  );
}
