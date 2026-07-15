let oneStorePlan = null;
let twoStorePlan = null;
let recommendedPlan = null;
let alternativePlan = null;

function tripTotal(plan){return Number(plan?.basketTotal||0)+Number(plan?.gasCost||0)}

function buildBestSingleStorePlan(requireComplete=true){
  const list=getList();
  if(!list.length)return null;
  let best=null;
  getStores().forEach(store=>{
    let basketTotal=0,foundItems=0;
    list.forEach(item=>{const saved=priceFor(item.productId,store.id);if(saved){basketTotal+=Number(saved.price)*Number(item.quantity||1);foundItems++}});
    const complete=foundItems===list.length;
    if(requireComplete&&!complete)return;
    if(foundItems<1)return;
    const plan={type:'one',title:'Shopping Route',storeIds:[store.id],storeNames:[store.name],basketTotal,foundItems,totalItems:list.length,gasCost:2.20,estimatedTime:20,isComplete:complete};
    if(!best||tripTotal(plan)<tripTotal(best))best=plan;
  });
  return best;
}

function buildBestTwoStorePlan(){
  const stores=getStores(),list=getList();
  if(!list.length)return null;
  let best=null;
  for(let i=0;i<stores.length;i++)for(let j=i+1;j<stores.length;j++){
    const a=stores[i],b=stores[j];let basketTotal=0,foundItems=0;const used=new Set();
    list.forEach(item=>{
      const pa=priceFor(item.productId,a.id),pb=priceFor(item.productId,b.id);let chosen=null,storeId=null;
      if(pa&&pb){if(Number(pa.price)<=Number(pb.price)){chosen=pa;storeId=a.id}else{chosen=pb;storeId=b.id}}
      else if(pa){chosen=pa;storeId=a.id}else if(pb){chosen=pb;storeId=b.id}
      if(chosen){basketTotal+=Number(chosen.price)*Number(item.quantity||1);foundItems++;used.add(storeId)}
    });
    if(foundItems!==list.length||used.size!==2)continue;
    const usedIds=[...used],names=usedIds.map(id=>storeById(id)?.name||'Store');
    const plan={type:'two',title:'Shopping Route',storeIds:usedIds,storeNames:names,basketTotal,foundItems,totalItems:list.length,gasCost:3.80,estimatedTime:35,isComplete:true};
    if(!best||tripTotal(plan)<tripTotal(best))best=plan;
  }
  return best;
}

function planCard(plan,number,badge,note,key){
  return `<article class="plan-card ${number===1?'selected':''}">
    <div class="row space"><div><div class="row" style="gap:7px"><strong>Route ${number}</strong><span class="badge">${badge}</span></div><div class="muted" style="margin-top:7px">${plan.storeNames.join(' + ')}</div></div>
    <label class="route-radio"><input type="radio" name="routeChoice" ${number===1?'checked':''} onchange="selectPlan('${key}')"><span></span></label></div>
    <div class="route-metrics"><div><small>Total</small><b>${money(tripTotal(plan))}</b></div><div><small>Est. time</small><b>${plan.estimatedTime} min</b></div><div><small>Stops</small><b>${plan.storeIds.length}</b></div></div>
    <div class="${note.type==='warning'?'notice':'success'}" style="margin-top:12px">${note.text}</div>
    <button type="button" style="margin-top:13px" onclick="selectPlan('${key}')">Choose Route ${number}</button>
  </article>`;
}

function renderPlans(){
  const list=getList(),host=document.getElementById('plans');
  if(!list.length){host.innerHTML='<a class="card empty empty-link" href="add.html"><strong>Add groceries first.</strong><div class="muted" style="margin-top:6px">Tap here to start your grocery list.</div></a>';return}

  oneStorePlan=buildBestSingleStorePlan(true);
  twoStorePlan=buildBestTwoStorePlan();
  const complete=[oneStorePlan,twoStorePlan].filter(Boolean).sort((a,b)=>tripTotal(a)-tripTotal(b));
  recommendedPlan=complete[0]||null;
  alternativePlan=null;

  if(recommendedPlan?.storeIds.length===2&&oneStorePlan){alternativePlan=oneStorePlan}
  else if(recommendedPlan?.storeIds.length===1&&twoStorePlan&&tripTotal(twoStorePlan)+8<=tripTotal(recommendedPlan)){alternativePlan=twoStorePlan}

  if(!recommendedPlan){
    const incomplete=buildBestSingleStorePlan(false);
    if(!incomplete){host.innerHTML='<div class="card empty"><h2>No route yet</h2><p class="muted">No store has pricing for the products in your list.</p><a class="button" href="stores.html">Return to stores</a></div>';localStorage.removeItem('selectedPlan');return}
    const missing=Math.max(0,incomplete.totalItems-incomplete.foundItems);
    recommendedPlan=incomplete;
    host.innerHTML=planCard(incomplete,1,'Missing Items',{type:'warning',text:`Missing ${missing} ${missing===1?'item':'items'} from your grocery list.`},'recommended');
    return;
  }

  let html=planCard(recommendedPlan,1,'★ Recommended',{type:'success',text:'Complete shopping list available.'},'recommended');
  if(alternativePlan){
    const more=Math.max(0,tripTotal(alternativePlan)-tripTotal(recommendedPlan));
    const badge=alternativePlan.storeIds.length===1?'✓ One Stop':'💰 Best Savings';
    const text=alternativePlan.storeIds.length===1?`Complete shopping list available.${more>0?` Costs ${money(more)} more for one-store convenience.`:''}`:`Complete shopping list available. Save approximately ${money(Math.max(0,tripTotal(recommendedPlan)-tripTotal(alternativePlan)))}.`;
    html+=planCard(alternativePlan,2,badge,{type:'success',text},'alternative');
  }
  host.innerHTML=html;
}

function selectPlan(key){
  const plan=key==='alternative'?alternativePlan:recommendedPlan;
  if(!plan)return;
  if(typeof saveSelectedPlan==='function')saveSelectedPlan(plan);else localStorage.setItem('selectedPlan',JSON.stringify(plan));
  location.href='route.html';
}
renderPlans();
document.addEventListener('grocerysaver:catalog-updated',renderPlans);
