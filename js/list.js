const pageParameters = new URLSearchParams(window.location.search);
const shoppingMode = pageParameters.get("shopping") === "1" || localStorage.getItem("shoppingSessionActive") === "true";
let expandedProductIndex = null;

function getCheckedItems(){ return JSON.parse(localStorage.getItem("checkedGroceryItems") || "[]"); }
function saveCheckedItems(items){ localStorage.setItem("checkedGroceryItems", JSON.stringify(items)); }
function sameNameProducts(product){ return getProducts().filter(item => String(item.name).trim().toLowerCase() === String(product.name).trim().toLowerCase()); }
function selectedOneStorePlan(){
  try {
    const plan = typeof getSelectedPlan === "function" ? getSelectedPlan() : JSON.parse(localStorage.getItem("selectedPlan") || "null");
    return plan && plan.type === "one" && Array.isArray(plan.storeIds) && plan.storeIds.length === 1 ? plan : null;
  } catch (_) { return null; }
}
function displayedPriceForItem(item){
  const onePlan = selectedOneStorePlan();
  if (onePlan) {
    const exact = priceFor(item.productId, Number(onePlan.storeIds[0]));
    return { price: exact, store: exact ? storeById(Number(onePlan.storeIds[0])) : null, selectedStore: true };
  }
  const best = lowestPrice(item.productId);
  return { price: best, store: best ? storeById(best.storeId) : null, selectedStore: false };
}

function changeQuantity(index, change){
  const list=getList();
  if(!list[index]) return;
  list[index].quantity=Number(list[index].quantity||1)+change;
  if(list[index].quantity<=0) list.splice(index,1);
  saveList(list); localStorage.removeItem("selectedPlan"); render();
}
function toggleProductDetails(index){ expandedProductIndex=expandedProductIndex===index?null:index; render(); }
function chooseInlineBrand(index, productId){ const list=getList(); if(!list[index])return; list[index].productId=Number(productId); saveList(list); localStorage.removeItem("selectedPlan"); expandedProductIndex=null; render(); }

function render(){
  const list=getList(), box=document.getElementById("list"), checkedItems=getCheckedItems(); let total=0;
  if(!list.length){ box.innerHTML='<a class="card empty empty-link" href="add.html"><strong>Your grocery list is empty.</strong><div class="muted" style="margin-top:6px">Tap here to add groceries.</div></a>'; document.getElementById("bestTotal").textContent="$0.00"; updateShoppingCompletion(); return; }
  box.innerHTML=list.map((item,index)=>{
    const product=productById(item.productId), displayed=displayedPriceForItem(item), best=displayed.price, store=displayed.store, isChecked=checkedItems.includes(item.productId), variants=sameNameProducts(product);
    if(best) total+=best.price*item.quantity;
    const choices=expandedProductIndex===index && variants.length>1 ? `<div class="inline-brand-options"><div class="muted">Choose a brand</div>${variants.map(v=>{const vp=lowestPrice(v.id);return `<button type="button" class="inline-brand-option ${Number(v.id)===Number(product.id)?'selected':''}" onclick="event.stopPropagation();chooseInlineBrand(${index},${v.id})"><span>${v.brand||'No Brand'}</span><small>${v.unit||''}${vp?' · from '+money(vp.price):''}</small></button>`}).join('')}</div>` : '';
    return `<div class="list-item-card ${isChecked?'item-completed':''}">
      <div class="row space product-main-row" onclick="${shoppingMode?'':'toggleProductDetails('+index+')'}">
        <div class="row">${shoppingMode?`<input class="shopping-check" type="checkbox" ${isChecked?'checked':''} onclick="event.stopPropagation()" onchange="toggleShoppingItem(${item.productId},this.checked)">`:''}<div class="list-product-logo">${productIcon(product)}</div><div><strong>${product.name}</strong><div class="muted">${product.brand||'No Brand'} · ${product.unit||''}</div>${!shoppingMode&&variants.length>1?'<div class="tap-brand-hint">Tap product to change brand</div>':''}</div></div>
        ${shoppingMode?'':`<div class="product-actions-inline" onclick="event.stopPropagation()"><div class="quantity-control"><button type="button" onclick="changeQuantity(${index},-1)">−</button><b>${item.quantity}</b><button type="button" onclick="changeQuantity(${index},1)">+</button></div><button type="button" class="secondary compact-product-action" onclick="changeQuantity(${index},1)">Add</button></div>`}
      </div>${choices}
      <div class="row space price-row"><div class="muted">${displayed.selectedStore?'Selected store price':'Best known price'}</div><div style="text-align:right"><strong>${best?money(best.price*item.quantity):'Unavailable'}</strong><div class="muted">${store?storeLogo(store)+' '+store.name:''}</div></div></div>
    </div>`;
  }).join('');
  document.getElementById("bestTotal").textContent=money(total); updateShoppingCompletion();
}

function toggleShoppingItem(productId,checked){
  let checkedItems=getCheckedItems();

  if(checked){
    if(!checkedItems.includes(productId)) checkedItems.push(productId);
  }else{
    checkedItems=checkedItems.filter(id=>id!==productId);
  }

  saveCheckedItems(checkedItems);
  render();
}

function updateShoppingCompletion(){
  const completeCard=document.getElementById("shoppingCompleteCard");

  if(!shoppingMode){
    completeCard.classList.add("hidden");
    return;
  }

  const list=getList();
  const checkedItems=getCheckedItems();
  const completedCount=list.filter(item=>
    checkedItems.includes(item.productId)
  ).length;

  const percent=list.length
    ? Math.round((completedCount/list.length)*100)
    : 0;

  completeCard.classList.remove("hidden");
  document.getElementById("shoppingProgressTitle").textContent=
    `${completedCount} of ${list.length} completed`;
  document.getElementById("shoppingProgressPercent").textContent=
    `${percent}%`;
  document.getElementById("shoppingProgressBar").style.width=
    `${percent}%`;

  document.getElementById("completeShoppingButton").textContent=
    percent===100
      ? "Finish shopping and scan receipt"
      : "Complete shopping";
}

let pendingShoppingCompletion = false;

function completeShopping() {
  const groceryList = getList();

  if (groceryList.length === 0) {
    return;
  }

  const checkedItems = getCheckedItems();

  const incompleteCount = groceryList.filter(item =>
    !checkedItems.includes(item.productId)
  ).length;

  const modal =
    document.getElementById("finishShoppingModal");

  const message =
    document.getElementById("finishShoppingMessage");

  const keepShoppingButton =
    document.getElementById("keepShoppingButton");

  const buttons =
    document.getElementById("finishShoppingButtons");

  const confirmButton =
    document.getElementById(
      "finishShoppingConfirmButton"
    );

  pendingShoppingCompletion = true;

  if (incompleteCount > 0) {
    message.textContent =
      `You still have ${incompleteCount} unchecked item(s). Finish shopping anyway?`;

    keepShoppingButton.classList.remove("hidden");
    buttons.classList.remove("single-button");

    confirmButton.textContent =
      "Yes, finish shopping";
  } else {
    message.textContent =
      "Everything is complete. Continue to scan your receipt.";

    keepShoppingButton.classList.add("hidden");
    buttons.classList.add("single-button");

    confirmButton.textContent =
      "Continue to receipt";
  }

  modal.classList.add("show");
}

function closeFinishShoppingModal() {
  pendingShoppingCompletion = false;

  document
    .getElementById("finishShoppingModal")
    .classList.remove("show");
}

function confirmCompleteShopping() {
  if (!pendingShoppingCompletion) {
    return;
  }

  const groceryList = getList();

  localStorage.setItem(
    "completedShoppingList",
    JSON.stringify(groceryList)
  );

  const selectedPlan =
    typeof getSelectedPlan === "function"
      ? getSelectedPlan()
      : null;

  localStorage.setItem(
    "completedShoppingPlan",
    JSON.stringify(selectedPlan)
  );

  saveList([]);
  saveCheckedItems([]);

  localStorage.removeItem("shoppingSessionActive");
  localStorage.removeItem("shoppingReturnPromptPending");
  localStorage.removeItem("shoppingNavigationStartedAt");
  localStorage.removeItem("selectedPlan");
  localStorage.removeItem("selectedStoreId");

  closeFinishShoppingModal();

  window.location.href =
    "savings.html?fromShopping=1&scan=1";
}

function removeItem(index){
  const list=getList();
  list.splice(index,1);
  saveList(list);
  render();
}

function clearList(){
  saveList([]);
  saveCheckedItems([]);
  render();
}

if(shoppingMode){
  document.getElementById("shoppingModeMessage").classList.remove("hidden");
  document.getElementById("shoppingMessageSpace").classList.remove("hidden");
  document.getElementById("clearListButton").style.display="none";
  document.getElementById("compareStoresButton").style.display="none";
}

render();

document.addEventListener("grocerysaver:catalog-updated",render);
