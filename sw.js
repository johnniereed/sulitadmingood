const CACHE='sulit-targeted-spacing-brand-v2';
const CORE=['./','./index.html','./add.html','./list.html','./stores.html','./plans.html','./route.html','./savings.html','./profile.html','./receipts.html','./css/styles.css','./css/appstore.css','./css/ios-green.css','./css/sulit-native.css','./css/consumer-edition.css','./js/data.js'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;e.respondWith(fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r}).catch(()=>caches.match(e.request)))})
