const ADMIN_ICONS=["🥛","🥚","🍞","🍌","🍎","🍅","🥔","🥦","🍗","🥩","🐟","🍚","🥫","🫒","🧴","🧻","🥤","🍿","❄️","🛒"];

function openAdminTab(name){
 document.querySelectorAll('.admin-tab').forEach(b=>b.classList.toggle('active',b.dataset.tab===name));
 document.querySelectorAll('.admin-panel').forEach(p=>p.classList.toggle('active',p.id===`panel-${name}`));
}
function safeText(value){return String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function closeAdminMenus(){
 document.querySelectorAll('.row-menu-popover.open').forEach(menu=>menu.classList.remove('open'));
 document.querySelectorAll('.row-menu-trigger[aria-expanded="true"]').forEach(button=>button.setAttribute('aria-expanded','false'));
}
function toggleProductMenu(event,id){
 event.stopPropagation();
 const menu=document.getElementById(`productMenu-${id}`);
 const button=event.currentTarget;
 const shouldOpen=!menu.classList.contains('open');
 closeAdminMenus();
 if(shouldOpen){menu.classList.add('open');button.setAttribute('aria-expanded','true')}
}
document.addEventListener('click',closeAdminMenus);
document.addEventListener('keydown',event=>{if(event.key==='Escape')closeAdminMenus()});
function nextProductId(){return Math.max(0,...getProducts().map(p=>Number(p.id)||0),...DEFAULT_PRODUCTS.map(p=>Number(p.id)||0))+1}
function renderIconPicker(){
 const selected=document.getElementById('adminProductIcon').value;
 document.getElementById('iconPicker').innerHTML=ADMIN_ICONS.map(icon=>`<button type="button" class="icon-choice ${selected===icon?'active':''}" onclick="chooseAdminIcon('${icon}')">${icon}</button>`).join('');
}
function chooseAdminIcon(icon){document.getElementById('adminProductIcon').value=icon;renderIconPicker()}

async function saveAdminProduct(){
 const editId=Number(document.getElementById('productEditId').value||0);
 const name=document.getElementById('adminProductName').value.trim();
 if(!name)return showMessage('adminMessage','Enter a product name.','error');
 const product={
  id:editId||nextProductId(),name,
  brand:document.getElementById('adminProductBrand').value.trim()||'No Brand',
  category:document.getElementById('adminProductCategory').value.trim()||'Other',
  unit:document.getElementById('adminProductUnit').value.trim()||'1 item',
  icon:document.getElementById('adminProductIcon').value.trim()||'🛒'
 };
 if(CloudSync.configured()){
  try{
   await CloudSync.upsertProduct(product);
  }catch(error){
   console.error(error);
   return showMessage(
    'adminMessage',
    error.message||'Product was not saved to Supabase.',
    'error'
   );
  }
 }

 restoreProductById(product.id);
 const products=getProducts();const index=products.findIndex(p=>Number(p.id)===Number(product.id));
 if(index>=0)products[index]={...products[index],...product};else products.push(product);
 saveProducts(products);


 if(!getProductAliases().some(row=>Number(row.productId)===product.id)){const aliases=getProductAliases();aliases.push({productId:product.id,aliases:[product.name.toLowerCase()]});saveProductAliases(aliases)}
 showMessage('adminMessage',editId?'Product updated. Customer screens now use the new information.':'Product added. It is now searchable on Home.');
 resetProductForm();renderAdminDashboard();
}
function editAdminProduct(id){
 const p=productById(id);if(!p)return;
 document.getElementById('productEditId').value=p.id;document.getElementById('adminProductName').value=p.name;document.getElementById('adminProductBrand').value=p.brand||'';document.getElementById('adminProductCategory').value=p.category||'';document.getElementById('adminProductUnit').value=p.unit||'';document.getElementById('adminProductIcon').value=productIcon(p);document.getElementById('productFormTitle').textContent='Edit Product';renderIconPicker();window.scrollTo({top:0,behavior:'smooth'});
}
async function removeAdminProduct(id){
 const p=productById(id);if(!p||!confirm(`Delete ${p.name}? Its prices and aliases will also be removed.`))return;
 if(CloudSync.configured()){
  try{
   await CloudSync.deleteProduct(id);
  }catch(error){
   console.error(error);
   return showMessage(
    'adminMessage',
    error.message||'Product was not deleted from Supabase.',
    'error'
   );
  }
 }
 deleteProductById(id);saveProductAliases(getProductAliases().filter(row=>Number(row.productId)!==Number(id)));showMessage('adminMessage',`${p.name} deleted.`);renderAdminDashboard();
}
function resetProductForm(){['productEditId','adminProductName','adminProductBrand','adminProductCategory','adminProductUnit','adminProductIcon'].forEach(id=>document.getElementById(id).value='');document.getElementById('productFormTitle').textContent='Add Product';renderIconPicker()}

function fillAdminSelects(){
 const products=getProducts(),stores=getStores();
 const productOptions=products.map(p=>`<option value="${p.id}">${safeText(p.name)} · ${safeText(p.unit)}</option>`).join('');
 document.getElementById('adminPriceProduct').innerHTML=productOptions;document.getElementById('adminAliasProduct').innerHTML=productOptions;
 document.getElementById('adminPriceStore').innerHTML=stores.map(s=>`<option value="${s.id}">${safeText(s.name)}</option>`).join('');
}
async function saveAdminPrice(){
 const productId=Number(document.getElementById('adminPriceProduct').value),storeId=Number(document.getElementById('adminPriceStore').value),price=Number(document.getElementById('adminPriceAmount').value);
 if(!productId||!storeId||!price||price<=0)return showMessage('adminMessage','Choose a product, store and valid price.','error');
 restorePriceEntry(productId,storeId);
 const prices=getPrices(),existing=prices.find(p=>Number(p.productId)===productId&&Number(p.storeId)===storeId);
 const row={productId,storeId,price:Number(price.toFixed(2)),checkedDate:document.getElementById('adminPriceDate').value||new Date().toISOString().slice(0,10),source:document.getElementById('adminPriceSource').value.trim()||'Manual admin entry',updatedAt:new Date().toISOString(),manual:true};
 if(CloudSync.configured()){
  try{
   await CloudSync.upsertPrice(row);
  }catch(error){
   console.error(error);
   return showMessage(
    'adminMessage',
    error.message||'Price was not saved to Supabase.',
    'error'
   );
  }
 }

 if(existing)Object.assign(existing,row);else prices.push(row);
 savePrices(prices);


 showMessage('adminMessage',`Price saved: ${productById(productId)?.name} at ${storeById(storeId)?.name}. Store comparison updated.`);resetPriceForm();renderAdminDashboard();
}
function editAdminPrice(productId,storeId){
 const p=priceFor(productId,storeId);if(!p)return;openAdminTab('prices');document.getElementById('adminPriceProduct').value=productId;document.getElementById('adminPriceStore').value=storeId;document.getElementById('adminPriceAmount').value=p.price;document.getElementById('adminPriceDate').value=p.checkedDate||'';document.getElementById('adminPriceSource').value=p.source||'';window.scrollTo({top:0,behavior:'smooth'});
}
async function removeAdminPrice(productId,storeId){
 if(!confirm('Delete this store price?'))return;

 if(CloudSync.configured()){
  try{
   await CloudSync.deletePrice(productId,storeId);
  }catch(error){
   console.error(error);
   return showMessage(
    'adminMessage',
    error.message||'Cloud price delete failed.',
    'error'
   );
  }
 }

 deletePriceEntry(productId,storeId);showMessage('adminMessage','Price deleted.');renderAdminDashboard();
}
function resetPriceForm(){document.getElementById('adminPriceAmount').value='';document.getElementById('adminPriceDate').value=new Date().toISOString().slice(0,10);document.getElementById('adminPriceSource').value=''}

async function saveAdminAliases(){
 const productId=Number(document.getElementById('adminAliasProduct').value);const text=document.getElementById('adminAliasText').value;
 const values=[...new Set(text.split(/[\n,]+/).map(x=>normalizeReceiptProductName(x)).filter(Boolean))];
 if(!productId||!values.length)return showMessage('adminMessage','Choose a product and enter at least one alias.','error');
 if(CloudSync.configured()){
  try{
   await CloudSync.replaceAliases(productId,values);
  }catch(error){
   console.error(error);
   return showMessage(
    'adminMessage',
    error.message||'Aliases were not saved to Supabase.',
    'error'
   );
  }
 }

 const aliases=getProductAliases();
 const row=aliases.find(r=>Number(r.productId)===productId);
 if(row)row.aliases=values;
 else aliases.push({productId,aliases:values});
 saveProductAliases(aliases);


 showMessage('adminMessage',`Aliases saved for ${productById(productId)?.name}.`);resetAliasForm();renderAdminDashboard();
}
function editAdminAliases(productId){
 const row=getProductAliases().find(r=>Number(r.productId)===Number(productId));openAdminTab('aliases');document.getElementById('adminAliasProduct').value=productId;document.getElementById('adminAliasText').value=(row?.aliases||[]).join(', ');window.scrollTo({top:0,behavior:'smooth'});
}
async function removeAdminAliases(productId){
 const aliases=getProductAliases();
 const row=aliases.find(r=>Number(r.productId)===Number(productId));
 if(row)row.aliases=[];
 else aliases.push({productId:Number(productId),aliases:[]});
 saveProductAliases(aliases);

 if(CloudSync.configured()){
  try{
   await CloudSync.replaceAliases(productId,[]);
  }catch(error){
   console.error(error);
   return showMessage(
    'adminMessage',
    error.message||'Cloud aliases delete failed.',
    'error'
   );
  }
 }

 showMessage('adminMessage','Aliases cleared.');renderAdminDashboard();
}
function resetAliasForm(){document.getElementById('adminAliasText').value=''}

function renderProductTable(){
 const search=document.getElementById('productAdminSearch').value.toLowerCase();const products=getProducts().filter(p=>`${p.name} ${p.brand} ${p.category}`.toLowerCase().includes(search));
 document.getElementById('productAdminRows').innerHTML=products.map(p=>{const priceCount=getPrices().filter(x=>Number(x.productId)===Number(p.id)).length;return `<tr><td><div class="admin-mini-product"><div class="admin-mini-icon">${productIcon(p)}</div><div><strong>${safeText(p.name)}</strong><div class="muted">ID ${p.id}</div></div></div></td><td>${safeText(p.brand)}</td><td>${safeText(p.category)}</td><td>${safeText(p.unit)}</td><td>${priceCount}</td><td><div class="row-menu"><button class="row-menu-trigger" type="button" aria-label="Open actions for ${safeText(p.name)}" aria-haspopup="menu" aria-expanded="false" onclick="toggleProductMenu(event,${p.id})">⋯</button><div class="row-menu-popover" id="productMenu-${p.id}" role="menu"><button type="button" role="menuitem" onclick="closeAdminMenus();editAdminProduct(${p.id})"><span>✎</span>Edit product</button><button type="button" role="menuitem" onclick="closeAdminMenus();editAdminAliases(${p.id})"><span>⌁</span>Manage aliases</button><button type="button" class="danger-menu-item" role="menuitem" onclick="closeAdminMenus();removeAdminProduct(${p.id})"><span>⌫</span>Delete product</button></div></div></td></tr>`}).join('')||'<tr><td colspan="6">No products found.</td></tr>';
 document.getElementById('productTableCount').textContent=`${getProducts().length} products`;
}
function renderPriceTable(){
 const search=document.getElementById('priceAdminSearch').value.toLowerCase();const rows=getPrices().filter(p=>`${productById(p.productId)?.name||''} ${storeById(p.storeId)?.name||''}`.toLowerCase().includes(search)).sort((a,b)=>(productById(a.productId)?.name||'').localeCompare(productById(b.productId)?.name||''));
 document.getElementById('priceAdminRows').innerHTML=rows.map(p=>`<tr><td><div class="admin-mini-product"><div class="admin-mini-icon">${productIcon(productById(p.productId))}</div><strong>${safeText(productById(p.productId)?.name||'Unknown')}</strong></div></td><td>${storeLogo(storeById(p.storeId))} ${safeText(storeById(p.storeId)?.name||'Store')}</td><td><strong>${money(p.price)}</strong></td><td>${safeText(p.source|| (p.crowdVerified?'3-user crowd verified':'Default seed'))}</td><td>${safeText(p.checkedDate||p.updatedAt?.slice(0,10)||'—')}</td><td><button class="tiny-button edit-btn" onclick="editAdminPrice(${p.productId},${p.storeId})">Edit</button><button class="tiny-button delete-btn" onclick="removeAdminPrice(${p.productId},${p.storeId})">Delete</button></td></tr>`).join('')||'<tr><td colspan="6">No prices found.</td></tr>';
 document.getElementById('priceTableCount').textContent=`${getPrices().length} prices`;
}
function renderAliasTable(){
 const search=document.getElementById('aliasAdminSearch').value.toLowerCase();const rows=getProductAliases().filter(row=>{const p=productById(row.productId);return p&&`${p.name} ${(row.aliases||[]).join(' ')}`.toLowerCase().includes(search)});
 document.getElementById('aliasAdminRows').innerHTML=rows.map(row=>{const p=productById(row.productId);return `<tr><td><div class="admin-mini-product"><div class="admin-mini-icon">${productIcon(p)}</div><strong>${safeText(p.name)}</strong></div></td><td>${safeText(p.name)}</td><td>${(row.aliases||[]).length?safeText(row.aliases.join(', ')):'<span class="muted">No aliases</span>'}</td><td><button class="tiny-button edit-btn" onclick="editAdminAliases(${p.id})">Edit</button><button class="tiny-button delete-btn" onclick="removeAdminAliases(${p.id})">Clear</button></td></tr>`}).join('')||'<tr><td colspan="4">No alias groups found.</td></tr>';
 document.getElementById('aliasTableCount').textContent=`${getProductAliases().length} groups`;
}
let adminCloudReceipts=[];
let adminCloudReceiptItems=[];
let adminCloudReports=[];

function adminStoreOptions(selectedId){
 return getStores().map(store=>`<option value="${store.id}" ${Number(store.id)===Number(selectedId)?'selected':''}>${safeText(store.name)}</option>`).join('');
}

async function changeAdminReceiptStore(receiptId,storeId){
 try{
  if(CloudSync.configured()) await CloudSync.updateAdminReceiptStore(receiptId,Number(storeId));
  else{
   const receipts=getAdminReceipts(); receipts.forEach(r=>{if(String(r.id)===String(receiptId))r.storeId=Number(storeId)}); localStorage.setItem('adminReceipts',JSON.stringify(receipts));
   const items=getAdminReceiptItems(); items.forEach(i=>{if(String(i.receiptId)===String(receiptId))i.storeId=Number(storeId)}); localStorage.setItem('adminReceiptItems',JSON.stringify(items));
  }
  showMessage('adminMessage','Receipt store updated.');
  await refreshAdminReceiptData();
 }catch(error){console.error(error);showMessage('adminMessage',error.message||'Could not update receipt store.','error')}
}

async function refreshAdminReceiptData(){
 try{
  if(CloudSync.configured()){
   const data=await CloudSync.getAdminReceiptData();
   adminCloudReceipts=(data.receipts||[]).map(r=>({id:r.id,userId:r.user_id,storeId:Number(r.store_id),receiptDate:r.receipt_date,totalSpent:Number(r.total_spent),createdAt:r.created_at,imageName:r.image_name,rawText:r.raw_text}));
   adminCloudReceiptItems=(data.items||[]).map(i=>({id:i.id,receiptId:i.receipt_id,userId:i.user_id,storeId:Number(i.store_id),rawName:i.raw_name,normalizedName:i.normalized_name,matchedProductId:i.matched_product_id,matchedName:i.matched_name,confidence:Number(i.match_confidence||0),quantity:Number(i.quantity||1),unitPrice:Number(i.unit_price||0),createdAt:i.created_at}));
   adminCloudReports=(data.reports||[]).map(r=>({id:r.id,receiptId:r.receipt_id,userId:r.user_id,productId:Number(r.product_id),storeId:Number(r.store_id),price:Number(r.price_cents||0)/100,reportedAt:r.reported_at}));
   if((data.profiles||[]).length) window.adminUserRows=data.profiles;
  }else{
   adminCloudReceipts=getAdminReceipts(); adminCloudReceiptItems=getAdminReceiptItems(); adminCloudReports=getPriceReports();
  }
  renderReceiptAdmin();
 }catch(error){console.error(error);showMessage('adminMessage',error.message||'Could not load cloud receipt data. Make sure this account is marked as admin and run the latest SQL.','error')}
}

function renderReceiptAdmin(){
 const receipts=adminCloudReceipts.length||!CloudSync.configured()?adminCloudReceipts:getAdminReceipts();
 const items=adminCloudReceiptItems.length||!CloudSync.configured()?adminCloudReceiptItems:getAdminReceiptItems();
 const reports=adminCloudReports.length||!CloudSync.configured()?adminCloudReports:getPriceReports();
 const verified=getPrices().filter(p=>p.crowdVerified);
 document.getElementById('adminReceiptCount').textContent=receipts.length;
 document.getElementById('matchedItemCount').textContent=items.length;
 document.getElementById('priceReportCount').textContent=reports.length;
 document.getElementById('promotedCount').textContent=verified.length;
 const query=(document.getElementById('receiptAdminSearch')?.value||'').toLowerCase();
 const userRows=window.adminUserRows||[];
 const rows=receipts.filter(r=>{
  const store=storeById(Number(r.storeId))?.name||'';
  const user=userRows.find(u=>String(u.id)===String(r.userId));
  return `${store} ${user?.display_name||''} ${user?.email||''} ${r.id}`.toLowerCase().includes(query);
 }).map(r=>{
  const count=items.filter(i=>String(i.receiptId)===String(r.id)).length;
  const user=userRows.find(u=>String(u.id)===String(r.userId));
  const detected=Number(r.storeId)>0;
  return `<tr><td><strong>${safeText(r.receiptDate||String(r.createdAt||'').slice(0,10)||'—')}</strong><div class="muted">${safeText(String(r.id).slice(0,8))}</div></td><td>${safeText(user?.display_name||user?.email||String(r.userId||'Anonymous').slice(0,12))}</td><td><select class="admin-inline-select" onchange="changeAdminReceiptStore('${safeText(r.id)}',this.value)">${adminStoreOptions(r.storeId)}</select></td><td><strong>${money(r.totalSpent)}</strong></td><td>${count}</td><td><span class="status-pill ${detected?'success':'warning'}">${detected?'Saved':'Needs store'}</span></td></tr>`;
 }).join('');
 const body=document.getElementById('adminReceiptRows'); if(body)body.innerHTML=rows||'<tr><td colspan="6">No cloud receipts found yet. Upload and press Save Receipt in the customer app.</td></tr>';
 document.getElementById('adminItemList').innerHTML=items.slice(0,80).map(i=>`<div class="admin-receipt-item"><div class="admin-receipt-item-top"><strong>${safeText(i.matchedName||i.normalizedName||i.rawName||'Unread item')}</strong><strong>${money(i.unitPrice)}</strong></div><div class="muted">${safeText(i.matchedProductId?'Matched product':'Waiting for alias review')} · ${safeText(storeById(i.storeId)?.name||'Store not detected')}</div><div class="confidence-track"><span style="width:${Math.max(4,Math.round((i.confidence||0)*100))}%"></span></div></div>`).join('')||'<div class="empty">No digitized receipt items yet.</div>';
 const grouped=new Map();reports.forEach(r=>{const key=`${r.productId}|${r.storeId}|${Number(r.price).toFixed(2)}`;if(!grouped.has(key))grouped.set(key,[]);grouped.get(key).push(r)});
 document.getElementById('consensusList').innerHTML=[...grouped.values()].sort((a,b)=>new Set(b.map(x=>x.userId)).size-new Set(a.map(x=>x.userId)).size).slice(0,30).map(g=>{const sample=g[0],users=new Set(g.map(x=>x.userId)).size,receiptCount=new Set(g.map(x=>x.receiptId)).size;return `<div class="item"><div class="row space"><strong>${safeText(productById(sample.productId)?.name||'Product')} · ${safeText(storeById(sample.storeId)?.name||'Store')}</strong><strong>${money(sample.price)}</strong></div><div class="muted">Verification progress: ${Math.min(users,3)} of 3 users · ${Math.min(receiptCount,3)} of 3 receipts ${users>=3&&receiptCount>=3?'· Verified and live':'· Waiting for confirmations'}</div></div>`}).join('')||'<div class="empty">No crowd price reports yet.</div>';
}
function renderAdminDashboard(){
 fillAdminSelects();document.getElementById('productCount').textContent=getProducts().length;document.getElementById('allPriceCount').textContent=getPrices().length;document.getElementById('aliasGroupCount').textContent=getProductAliases().length;document.getElementById('verifiedPriceCount').textContent=getPrices().filter(p=>p.crowdVerified).length;renderProductTable();renderPriceTable();renderAliasTable();renderReceiptAdmin();
}
['productAdminSearch','priceAdminSearch','aliasAdminSearch'].forEach(id=>document.getElementById(id).addEventListener('input',renderAdminDashboard));
document.getElementById('adminProductIcon').addEventListener('input',renderIconPicker);
applySevenUserPriceConsensus();resetPriceForm();renderIconPicker();renderAdminDashboard();


// ===============================
// USER MANAGEMENT
// ===============================

let selectedUserToDelete=null;

async function renderUsersTable(){
  const body=document.getElementById("usersTableBody");
  if(!body)return;

  if(!CloudSync.configured()){
    const users=getUsers();
    body.innerHTML=users.map(user=>{
      const summary=getUserDataSummary(user.id);
      return `
        <tr>
          <td><strong>${user.name||"Unnamed user"}</strong></td>
          <td>${user.email||"No email"}</td>
          <td>${summary.receiptCount}</td>
          <td>${summary.priceReportCount}</td>
          <td>${user.createdAt
            ?new Date(user.createdAt).toLocaleDateString()
            :"Unknown"}</td>
          <td>
            <button class="danger"
              onclick="openDeleteUserModal('${user.id}')">
              Delete data
            </button>
          </td>
        </tr>
      `;
    }).join("");
    return;
  }

  try{
    const users=await CloudSync.getAdminUsers();
    window.adminUserRows=users;

    body.innerHTML=users.map(user=>`
      <tr>
        <td>
          <strong>${safeText(user.display_name||"GrocerySaver User")}</strong>
          ${user.is_anonymous
            ?'<div class="muted">Anonymous</div>'
            :'<div class="muted">Registered</div>'}
        </td>
        <td>${safeText(user.email||"No email")}</td>
        <td>${Number(user.receipt_count||0)}</td>
        <td>${Number(user.price_report_count||0)}</td>
        <td>${user.created_at
          ?new Date(user.created_at).toLocaleDateString()
          :"Unknown"}</td>
        <td>
          <button class="danger"
            onclick="openDeleteUserModal('${user.id}')">
            Delete data
          </button>
        </td>
      </tr>
    `).join("")||
      '<tr><td colspan="6">No users yet.</td></tr>';
  }catch(error){
    body.innerHTML=`
      <tr>
        <td colspan="6">
          ${safeText(error.message||"Admin login required.")}
        </td>
      </tr>
    `;
  }
}

function addDemoUser(){
  const users=getUsers();

  const nextNumber=users.length+1;

  users.push({
    id:`demo-user-${Date.now()}`,
    name:`Test User ${nextNumber}`,
    email:`test${nextNumber}@example.com`,
    createdAt:new Date().toISOString()
  });

  saveUsers(users);
  renderUsersTable();
}

function openDeleteUserModal(userId){
  selectedUserToDelete=userId;

  const user=getUsers().find(item=>
    String(item.id)===String(userId)
  );

  document.getElementById("deleteUserMessage").textContent=
    `Delete saved data for ${user?.name||"this user"}? Products, store prices and aliases will remain.`;

  document
    .getElementById("deleteUserModal")
    .classList.add("show");
}

function closeDeleteUserModal(){
  selectedUserToDelete=null;

  document
    .getElementById("deleteUserModal")
    .classList.remove("show");
}

async function confirmDeleteUserData(){
  if(!selectedUserToDelete){
    return;
  }

  if(CloudSync.configured()){
    try{
      await CloudSync.deleteUserAppData(
        selectedUserToDelete
      );
      closeDeleteUserModal();
      await renderUsersTable();
      showMessage(
        'adminMessage',
        'The selected user data was deleted.'
      );
      return;
    }catch(error){
      console.error(error);
      return showMessage(
        'adminMessage',
        error.message||'Cloud user delete failed.',
        'error'
      );
    }
  }

  deleteUserData(selectedUserToDelete);

  const users=getUsers().filter(user=>
    String(user.id)!==String(selectedUserToDelete)
  );

  saveUsers(users);

  closeDeleteUserModal();
  renderUsersTable();

  alert("The selected user's data was deleted.");
}

renderUsersTable();


async function refreshAdminCloudStatus(){
  const status=document.getElementById("adminCloudStatus");
  if(!status)return;

  if(!CloudSync.configured()){
    status.innerHTML=
      'Supabase connection is not configured in js/app-config.js.';
    return;
  }

  try{
    const user=await CloudSync.getCurrentUser();
    const admin=user && await CloudSync.isAdmin();

    status.textContent=admin
      ?`Signed in as administrator: ${user.email||user.id}`
      :"Not signed in as an administrator.";

    const warning =
      document.getElementById("cloudWriteWarning");

    if(warning){
      warning.classList.toggle(
        "hidden",
        Boolean(admin)
      );
    }
  }catch(error){
    status.textContent=error.message;
  }
}

async function loginCloudAdmin() {
  try {
    await CloudSync.signInAdmin(
      document
        .getElementById("adminCloudEmail")
        .value
        .trim(),

      document
        .getElementById("adminCloudPassword")
        .value
    );

    await CloudSync.syncCatalog();

    const authorized =
      await updateAdminProtectedUI();

    if (!authorized) {
      throw new Error(
        "This account does not have administrator access."
      );
    }

    await renderUsersTable();
    renderAdminDashboard();
    await refreshAdminReceiptData();

    showMessage(
      "adminMessage",
      "Admin login successful."
    );
  } catch (error) {
    console.error(error);

    await updateAdminProtectedUI();

    showMessage(
      "adminMessage",
      error.message || "Admin login failed.",
      "error"
    );
  }
}

async function logoutCloudAdmin() {
  try {
    await CloudSync.signOutAdmin();
  } finally {
    document
      .getElementById("adminCloudPassword")
      .value = "";

    await updateAdminProtectedUI();
  }
}

document.addEventListener(
  "grocerysaver:catalog-updated",
  ()=>{
    renderAdminDashboard();
  }
);

document.addEventListener(
  "grocerysaver:cloud-ready",
  async () => {
    const authorized =
      await updateAdminProtectedUI();

    if (authorized) {
      await renderUsersTable();
      renderAdminDashboard();
    }
  }
);

refreshAdminCloudStatus();


async function updateAdminProtectedUI() {
  const loginCard =
    document.getElementById("adminCloudLoginCard");

  const dashboard =
    document.getElementById("adminDashboardShell");

  const signedInText =
    document.getElementById("adminSignedInText");

  if (!loginCard || !dashboard) {
    return false;
  }

  try {
    if (!CloudSync.configured()) {
      loginCard.classList.remove("hidden");
      dashboard.classList.add("hidden");

      const status =
        document.getElementById("adminCloudStatus");

      if (status) {
        status.textContent =
          "Supabase is not configured.";
      }

      return false;
    }

    const user =
      await CloudSync.getCurrentUser();

    const admin =
      Boolean(user) &&
      await CloudSync.isAdmin();

    if (!admin) {
      loginCard.classList.remove("hidden");
      dashboard.classList.add("hidden");

      const status =
        document.getElementById("adminCloudStatus");

      if (status) {
        status.textContent =
          "Sign in with your administrator account.";
      }

      return false;
    }

    loginCard.classList.add("hidden");
    dashboard.classList.remove("hidden");

    if (signedInText) {
      signedInText.textContent =
        `Signed in as ${user.email || user.id}`;
    }

    return true;
  } catch (error) {
    console.error(error);

    loginCard.classList.remove("hidden");
    dashboard.classList.add("hidden");

    const status =
      document.getElementById("adminCloudStatus");

    if (status) {
      status.textContent =
        error.message || "Admin session could not be verified.";
    }

    return false;
  }
}


window.addEventListener("DOMContentLoaded", async () => {
  const dashboard =
    document.getElementById("adminDashboardShell");

  if (dashboard) {
    dashboard.classList.add("hidden");
  }

  const authorized =
    await updateAdminProtectedUI();

  if (authorized) {
    await renderUsersTable();
    renderAdminDashboard();
    await refreshAdminReceiptData();
  }
});

// ===============================
// UNMATCHED RECEIPT ALIAS REVIEW
// ===============================

function aliasProductOptions(selectedId=""){
  return getProducts()
    .slice()
    .sort((a,b)=>String(a.name).localeCompare(String(b.name)))
    .map(product=>`<option value="${product.id}" ${String(product.id)===String(selectedId)?'selected':''}>${safeText(product.name)} · ${safeText(product.unit||'')}</option>`)
    .join('');
}

function localAliasCandidates(){
  const grouped=new Map();
  getAdminReceiptItems()
    .filter(item=>!item.matchedProductId && item.normalizedName)
    .forEach(item=>{
      const key=`${item.normalizedName}|${item.storeId}`;
      if(!grouped.has(key)){
        grouped.set(key,{
          normalized_name:item.normalizedName,
          sample_raw_name:item.rawName,
          store_id:Number(item.storeId),
          occurrence_count:0,
          receiptIds:new Set(),
          userIds:new Set(),
          last_seen_at:item.createdAt
        });
      }
      const row=grouped.get(key);
      row.occurrence_count++;
      row.receiptIds.add(item.receiptId);
      row.userIds.add(item.userId);
      if(String(item.createdAt||'')>String(row.last_seen_at||''))row.last_seen_at=item.createdAt;
    });
  return [...grouped.values()].map(row=>({
    ...row,
    receipt_count:row.receiptIds.size,
    user_count:row.userIds.size
  }));
}

function renderAliasCandidateRows(rows){
  const body=document.getElementById('aliasCandidateRows');
  if(!body)return;
  body.innerHTML=rows.map((row,index)=>`
    <tr>
      <td><strong>${safeText(row.sample_raw_name||row.normalized_name)}</strong><div class="muted">${safeText(row.normalized_name)}</div></td>
      <td><select id="aliasCandidateStore-${index}" class="admin-inline-select">${adminStoreOptions(row.store_id)}</select></td>
      <td>${Number(row.occurrence_count||0)} time${Number(row.occurrence_count||0)===1?'':'s'}</td>
      <td><div class="verification-cell"><strong>${Math.min(Number(row.user_count||0),3)} / 3 users</strong><span>${Math.min(Number(row.receipt_count||0),3)} / 3 receipts</span></div></td>
      <td><select id="aliasCandidateProduct-${index}">${aliasProductOptions()}</select></td>
      <td><button class="tiny-button alias-btn" onclick="approveAliasCandidate(${index})">Review & approve</button></td>
    </tr>
  `).join('')||'<tr><td colspan="6">No unmatched receipt names. Everything is currently matching.</td></tr>';
  window.currentAliasCandidates=rows;
}

async function refreshAliasCandidates(){
  const body=document.getElementById('aliasCandidateRows');
  if(body)body.innerHTML='<tr><td colspan="6">Loading unmatched receipt names…</td></tr>';
  try{
    const rows=CloudSync.configured()
      ?await CloudSync.getAliasCandidates()
      :localAliasCandidates();
    renderAliasCandidateRows(rows);
  }catch(error){
    console.error(error);
    if(body)body.innerHTML=`<tr><td colspan="6">${safeText(error.message||'Could not load alias candidates.')}</td></tr>`;
  }
}

function approveLocalAliasCandidate(row,productId){
  const aliases=getProductAliases();
  let aliasRow=aliases.find(item=>Number(item.productId)===Number(productId));
  if(!aliasRow){
    aliasRow={productId:Number(productId),aliases:[]};
    aliases.push(aliasRow);
  }
  const clean=normalizeReceiptProductName(row.normalized_name);
  if(!aliasRow.aliases.some(alias=>normalizeReceiptProductName(alias)===clean))aliasRow.aliases.push(clean);
  saveProductAliases(aliases);

  const items=getAdminReceiptItems();
  const reports=getPriceReports();
  items.forEach(item=>{
    if(item.matchedProductId || item.normalizedName!==row.normalized_name || Number(item.storeId)!==Number(row.store_id))return;
    const product=productById(productId);
    item.matchedProductId=Number(productId);
    item.matchedName=product?.name||null;
    item.confidence=1;
    if(Number(item.unitPrice)>0 && !reports.some(report=>String(report.receiptId)===String(item.receiptId)&&Number(report.productId)===Number(productId)&&Number(report.storeId)===Number(item.storeId)&&Number(report.price)===Number(item.unitPrice))){
      reports.push({
        id:`alias-${item.id}`,
        userId:item.userId,
        receiptId:item.receiptId,
        productId:Number(productId),
        storeId:Number(item.storeId),
        price:Number(item.unitPrice),
        priceCents:Math.round(Number(item.unitPrice)*100),
        reportedAt:item.createdAt
      });
    }
  });
  localStorage.setItem('adminReceiptItems',JSON.stringify(items));
  localStorage.setItem('crowdPriceReports',JSON.stringify(reports));
  applySevenUserPriceConsensus();
}

async function approveAliasCandidate(index){
  const row=(window.currentAliasCandidates||[])[index];
  const select=document.getElementById(`aliasCandidateProduct-${index}`);
  const productId=Number(select?.value||0);
  const selectedStoreId=Number(document.getElementById(`aliasCandidateStore-${index}`)?.value||row?.store_id||0);
  if(!row||!productId)return showMessage('adminMessage','Choose a product first.','error');
  try{
    let result;
    if(CloudSync.configured()){
      result=await CloudSync.assignReceiptAlias(row.normalized_name,productId,selectedStoreId);
    }else{
      row.store_id=selectedStoreId; approveLocalAliasCandidate(row,productId);
      result={updated_items:Number(row.occurrence_count||0),inserted_reports:0};
    }
    showMessage('adminMessage',`Alias approved for ${productById(productId)?.name}. ${Number(result?.updated_items||0)} old receipt item(s) were matched and eligible reports were rechecked.`);
    renderAdminDashboard();
    await refreshAliasCandidates();
  }catch(error){
    console.error(error);
    showMessage('adminMessage',error.message||'Alias approval failed.','error');
  }
}
