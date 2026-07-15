const STORE_BRANCHES = [
  {id:101,chainId:1,chain:"Walmart",branch:"South Edmonton Common",address:"1203 Parsons Rd NW, Edmonton, AB T6N 0A9",lat:53.4467,lng:-113.4874},
  {id:102,chainId:1,chain:"Walmart",branch:"Tamarack",address:"775 Tamarack Way NW, Edmonton, AB",lat:53.4590,lng:-113.3810},
  {id:103,chainId:1,chain:"Walmart",branch:"Windermere",address:"6110 Currents Drive NW, Edmonton, AB",lat:53.4367,lng:-113.6038},
  {id:104,chainId:1,chain:"Walmart",branch:"Clareview",address:"13703 40 Street NW, Edmonton, AB",lat:53.6002,lng:-113.4008},
  {id:105,chainId:1,chain:"Walmart",branch:"Northgate",address:"9499 137 Avenue NW, Edmonton, AB",lat:53.6001,lng:-113.4904},
  {id:106,chainId:1,chain:"Walmart",branch:"Kingsway",address:"1 Kingsway Garden Mall NW, Edmonton, AB",lat:53.5626,lng:-113.5067},
  {id:107,chainId:1,chain:"Walmart",branch:"Capilano",address:"5004 98 Avenue NW, Edmonton, AB",lat:53.5374,lng:-113.4198},
  {id:108,chainId:1,chain:"Walmart",branch:"West Edmonton",address:"18521 Stony Plain Road NW, Edmonton, AB",lat:53.5401,lng:-113.6440},
  {id:109,chainId:1,chain:"Walmart",branch:"Meadowlark",address:"156 St NW & 87 Ave NW, Edmonton, AB",lat:53.5208,lng:-113.5915},
  {id:110,chainId:1,chain:"Walmart",branch:"Calgary Trail",address:"3931 Calgary Trail NW, Edmonton, AB",lat:53.4745,lng:-113.4936},
  {id:111,chainId:1,chain:"Walmart",branch:"Albany",address:"16940 127 Street NW, Edmonton, AB",lat:53.6316,lng:-113.5415},
  {id:112,chainId:1,chain:"Walmart",branch:"Southeast Edmonton",address:"110 Watt Common SW, Edmonton, AB",lat:53.4155,lng:-113.4342},

  {id:201,chainId:2,chain:"No Frills",branch:"Mill Woods",address:"2331 66 St NW, Edmonton, AB T6K 4B4",lat:53.4563,lng:-113.4285},
  {id:202,chainId:2,chain:"No Frills",branch:"40 Avenue",address:"11405 40 Avenue NW, Edmonton, AB",lat:53.4768,lng:-113.5248},
  {id:203,chainId:2,chain:"No Frills",branch:"Ottewell",address:"6204 90 Avenue NW, Edmonton, AB",lat:53.5270,lng:-113.4304},
  {id:204,chainId:2,chain:"No Frills",branch:"Whyte Avenue",address:"10467 80 Avenue NW, Edmonton, AB",lat:53.5165,lng:-113.4995},
  {id:205,chainId:2,chain:"No Frills",branch:"Jasper Place",address:"10126 150 Street NW, Edmonton, AB",lat:53.5427,lng:-113.5798},
  {id:206,chainId:2,chain:"No Frills",branch:"Castle Downs",address:"15411 97 Street NW, Edmonton, AB",lat:53.6171,lng:-113.4920},
  {id:207,chainId:2,chain:"No Frills",branch:"McConachie",address:"403 McConachie Way NW, Edmonton, AB",lat:53.6329,lng:-113.4265},
  {id:208,chainId:2,chain:"No Frills",branch:"Rosenthal",address:"21546 92 Avenue NW, Edmonton, AB",lat:53.5280,lng:-113.6898},
  {id:209,chainId:2,chain:"No Frills",branch:"Beverly",address:"3425 118 Avenue NW, Edmonton, AB",lat:53.5712,lng:-113.3934},
  {id:210,chainId:2,chain:"No Frills",branch:"West Edmonton",address:"17515 Stony Plain Road NW, Edmonton, AB",lat:53.5409,lng:-113.6268},

  {id:301,chainId:3,chain:"Superstore",branch:"Walker",address:"615 54 Street SW, Edmonton, AB",lat:53.4247,lng:-113.4248},
  {id:302,chainId:3,chain:"Superstore",branch:"South Edmonton Common",address:"9711 23 Avenue NW, Edmonton, AB",lat:53.4530,lng:-113.4810},
  {id:303,chainId:3,chain:"Superstore",branch:"Calgary Trail",address:"4821 Calgary Trail NW, Edmonton, AB",lat:53.4876,lng:-113.4935},
  {id:304,chainId:3,chain:"Superstore",branch:"Windermere",address:"1155 Windermere Way SW, Edmonton, AB",lat:53.4376,lng:-113.6054},
  {id:305,chainId:3,chain:"Superstore",branch:"Heritage Valley",address:"11835 26 Avenue SW, Edmonton, AB",lat:53.4089,lng:-113.5271},
  {id:306,chainId:3,chain:"Superstore",branch:"The Meadows",address:"4410 17 Street NW, Edmonton, AB",lat:53.4808,lng:-113.3708},
  {id:307,chainId:3,chain:"Superstore",branch:"Clareview",address:"4950 137 Avenue NW, Edmonton, AB",lat:53.6000,lng:-113.4146},
  {id:308,chainId:3,chain:"Superstore",branch:"Kingsway",address:"11541 Kingsway Avenue NW, Edmonton, AB",lat:53.5667,lng:-113.5204},
  {id:309,chainId:3,chain:"Superstore",branch:"Stony Plain Road",address:"17303 Stony Plain Road NW, Edmonton, AB",lat:53.5417,lng:-113.6199},
  {id:310,chainId:3,chain:"Superstore",branch:"Westmount",address:"12350 137 Avenue NW, Edmonton, AB",lat:53.6002,lng:-113.5367},

  {id:401,chainId:4,chain:"Costco",branch:"South Edmonton",address:"2616 91 St NW, Edmonton, AB T6N 1N2",lat:53.4578,lng:-113.4826},
  {id:402,chainId:4,chain:"Costco",branch:"East Edmonton",address:"13650 50 St NW, Edmonton, AB T5A 4Y3",lat:53.5980,lng:-113.4200},
  {id:403,chainId:4,chain:"Costco",branch:"West Edmonton",address:"7259 Winterburn Rd NW, Edmonton, AB T5T 4K2",lat:53.5062,lng:-113.6886},
  {id:404,chainId:4,chain:"Costco",branch:"North Edmonton",address:"12450 149 St NW, Edmonton, AB T5V 1G9",lat:53.5790,lng:-113.5786}
,
  {id:211,chainId:2,chain:"No Frills",branch:"Londonderry",address:"1 Londonderry Mall NW, Edmonton, AB T5C 3C8",lat:53.6035,lng:-113.4468},
  {id:212,chainId:2,chain:"No Frills",branch:"Calgary Trail",address:"3227 Calgary Trail NW, Edmonton, AB T6J 5X8",lat:53.4630,lng:-113.4945},
  {id:213,chainId:2,chain:"No Frills",branch:"Central Edmonton",address:"11850 103 Street NW, Edmonton, AB T5G 2J2",lat:53.5702,lng:-113.4967}

];

function findNearestBranch(chainId, userLatitude, userLongitude) {
  return STORE_BRANCHES
    .filter(branch => branch.chainId === Number(chainId))
    .map(branch => ({...branch, distance:getDistance(userLatitude,userLongitude,branch.lat,branch.lng)}))
    .sort((a,b) => a.distance - b.distance)[0] || null;
}
function getDistance(lat1,lng1,lat2,lng2){
  const R=6371,dLat=toRadians(lat2-lat1),dLng=toRadians(lng2-lng1);
  const a=Math.sin(dLat/2)**2+Math.cos(toRadians(lat1))*Math.cos(toRadians(lat2))*Math.sin(dLng/2)**2;
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}
function toRadians(value){return value*Math.PI/180;}

/*
  Resolve and cache the exact business pin from the store name and address.
  Local coordinates remain a fast fallback when the geocoder is unavailable.
*/
async function resolveBranchCoordinates(branch) {
  const cacheKey = `resolvedBranch:${branch.id}`;
  const cached = JSON.parse(localStorage.getItem(cacheKey) || "null");

  if (cached && Number.isFinite(cached.lat) && Number.isFinite(cached.lng)) {
    return {...branch, lat:cached.lat, lng:cached.lng, locationResolved:true};
  }

  const query = `${branch.chain} ${branch.branch}, ${branch.address}`;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6500);

    const response = await fetch(
      "https://nominatim.openstreetmap.org/search" +
      `?format=jsonv2&limit=1&countrycodes=ca&q=${encodeURIComponent(query)}`,
      {signal:controller.signal, headers:{"Accept-Language":"en"}}
    );

    clearTimeout(timer);

    if (response.ok) {
      const results = await response.json();
      const first = results[0];

      if (first) {
        const exact = {lat:Number(first.lat), lng:Number(first.lon)};

        if (Number.isFinite(exact.lat) && Number.isFinite(exact.lng)) {
          localStorage.setItem(cacheKey, JSON.stringify(exact));
          return {...branch, ...exact, locationResolved:true};
        }
      }
    }
  } catch (error) {
    console.warn("Exact store pin lookup failed; using local fallback.", error);
  }

  return {...branch, locationResolved:false};
}

function branchMapsDestination(branch) {
  return `${branch.chain} ${branch.branch}, ${branch.address}`;
}
