function calculateStoreBasket(storeId) {
  const groceryList=getList(); let total=0,foundItems=0;
  const rows=groceryList.map(item=>{
    const product=productById(item.productId); const savedPrice=priceFor(item.productId,storeId);
    if(savedPrice){const itemTotal=savedPrice.price*item.quantity;total+=itemTotal;foundItems++;return{product,productName:product?.name||"Unknown",quantity:item.quantity,unitPrice:savedPrice.price,itemTotal,hasPrice:true}}
    return{product,productName:product?.name||"Unknown",quantity:item.quantity,unitPrice:0,itemTotal:0,hasPrice:false};
  });
  return{total,foundItems,totalItems:groceryList.length,isComplete:foundItems===groceryList.length,rows};
}
function renderStores(){
  const list=getList(); if(!list.length){document.getElementById("stores").innerHTML='<a class="card empty empty-link" href="add.html"><strong>Your grocery list is empty.</strong><div class="muted" style="margin-top:6px">Tap here to add groceries.</div></a>';return}
  const sorted=getStores().map(store=>({store,basket:calculateStoreBasket(store.id)})).sort((a,b)=>{
    if(a.basket.isComplete&&!b.basket.isComplete)return-1;if(!a.basket.isComplete&&b.basket.isComplete)return 1;return a.basket.total-b.basket.total;
  });
  document.getElementById("stores").innerHTML=sorted.map((result,index)=>`
    <div class="store-card" onclick="showStore(${result.store.id})" style="--store-color:${result.store.color||'#2ca43b'}">
      <div class="store-card-top"><div class="store-logo">${storeLogo(result.store)}</div>
        <div class="store-copy"><strong>${result.store.name}</strong><div class="muted">${result.basket.foundItems}/${result.basket.totalItems} items priced</div>${result.basket.foundItems===0
      ?'<div class="muted">There\'s no product available in this store.</div>'
      :(!result.basket.isComplete
        ?'<div class="muted">Some products are not yet available at this store.</div>'
        :'')}</div>
        <div class="store-price"><div class="price">${result.basket.foundItems>0?money(result.basket.total):'—'}</div>${index===0&&result.basket.isComplete?'<span class="badge cheapest-badge">Cheapest</span>':''}</div>
      </div></div>
    </div>`).join("");
}
function showStore(id){
  setSelectedStore(id);const store=storeById(id),basket=calculateStoreBasket(id);
  document.getElementById("storeDetails").innerHTML=`<div class="card featured">
    <div class="row"><div class="store-logo" style="--store-color:${store.color||'#2ca43b'}">${storeLogo(store)}</div><div><h2 style="margin:0">${store.name} basket</h2><div class="muted">Tap Start Shopping to compare route plans</div></div></div>
    <div class="color-strip" style="margin-top:14px"></div>
    ${basket.rows.map(row=>`<div class="item row space"><div class="row"><div class="list-product-logo">${productIcon(row.product)}</div><div><strong>${row.productName}</strong><div class="muted">Quantity: ${row.quantity}</div></div></div><div style="text-align:right">${row.hasPrice?`<strong>${money(row.itemTotal)}</strong><div class="muted">${money(row.unitPrice)} each</div>`:'<strong>Unavailable</strong>'}</div></div>`).join("")}
    <div class="item row space"><strong>Known-price total</strong><strong>${money(basket.total)}</strong></div>
    ${basket.foundItems===0
      ?`<div class="notice">There’s no product available in this store.</div>`
      :(!basket.isComplete
        ?`<div class="notice">Some products are not yet available at this store.</div>`
        :"")}
    ${basket.foundItems>0
      ?`<br><a class="button" href="plans.html">Start shopping →</a>`
      :`<br><a class="button secondary" href="stores.html">Choose another store</a>`}
  </div>`;
}
renderStores();


document.addEventListener("grocerysaver:catalog-updated",renderStores);
