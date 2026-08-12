// ── GEO/ALGORITHM ─────────────────────────────────────────
function kmeansInertia(clusters){
  var score=0;
  clusters.forEach(function(cl){
    if(!cl.length)return;
    var cLat=cl.reduce(function(s,p){return s+p.lat;},0)/cl.length;
    var cLng=cl.reduce(function(s,p){return s+p.lng;},0)/cl.length;
    cl.forEach(function(p){score+=hav(p.lat,p.lng,cLat,cLng);});
  });
  return score;
}
function kmeansMulti(pts,k,runs){
  runs=runs||5;
  if(pts.length<=k)return pts.map(function(p){return[p];});
  var best=null,bestScore=Infinity;
  for(var r=0;r<runs;r++){
    var cl=kmeans(pts,k);cl=balanceClusters(cl,k);
    var score=kmeansInertia(cl);
    if(score<bestScore){bestScore=score;best=cl;}
  }
  return best||[pts];
}
function kmeans(pts,k){
  if(pts.length<=k)return pts.map(function(p){return[p];});
  var cs=[Object.assign({},pts[Math.floor(Math.random()*pts.length)])];
  while(cs.length<k){
    var ds=pts.map(function(p){return Math.min.apply(null,cs.map(function(c){return hav(p.lat,p.lng,c.lat,c.lng);}));});
    var tot=ds.reduce(function(a,b){return a+b;},0),r=Math.random()*tot,ch=0;
    for(var i=0;i<ds.length;i++){r-=ds[i];if(r<=0){ch=i;break;}}
    cs.push(Object.assign({},pts[ch]));
  }
  var cl;for(var it=0;it<60;it++){
    cl=[];for(var x=0;x<k;x++)cl.push([]);
    pts.forEach(function(p){var md=Infinity,b=0;cs.forEach(function(c,i){var d=hav(p.lat,p.lng,c.lat,c.lng);if(d<md){md=d;b=i;}});cl[b].push(p);});
    for(var i=0;i<k;i++){if(!cl[i].length){var lg=0;for(var j=1;j<k;j++)if(cl[j].length>cl[lg].length)lg=j;if(cl[lg].length>1)cl[i].push(cl[lg].pop());}}
    cs=cl.map(function(c){if(!c.length)return cs[0];return{lat:c.reduce(function(s,p){return s+p.lat;},0)/c.length,lng:c.reduce(function(s,p){return s+p.lng;},0)/c.length};});
  }return cl;
}
function balanceClusters(clusters,k){
  var cl=clusters.filter(function(c){return c.length>0;});
  if(cl.length<=1)return cl;
  var n=cl.reduce(function(s,c){return s+c.length;},0),ideal=n/cl.length,maxPD=Math.ceil(ideal)+1;
  var changed=true,passes=0;
  while(changed&&passes<20){changed=false;passes++;
    // Funcionalidade 6: calcula centróide de cada cluster no início da iteração
    var centroids=cl.map(function(c){
      if(!c.length)return {lat:0,lng:0};
      return {
        lat:c.reduce(function(s,p){return s+p.lat;},0)/c.length,
        lng:c.reduce(function(s,p){return s+p.lng;},0)/c.length
      };
    });
    for(var i=0;i<cl.length;i++){if(cl[i].length<=maxPD)continue;
      for(var j=0;j<cl.length;j++){if(i===j||cl[j].length>=Math.ceil(ideal))continue;
        var cjLat=centroids[j].lat;
        var cjLng=centroids[j].lng;
        var ciLat=centroids[i].lat;
        var ciLng=centroids[i].lng;
        var bIdx=-1,bDist=Infinity;
        for(var x=0;x<cl[i].length;x++){
          var dJ=hav(cl[i][x].lat,cl[i][x].lng,cjLat,cjLng);
          var dI=hav(cl[i][x].lat,cl[i][x].lng,ciLat,ciLng);
          // Funcionalidade 6: só move se j tem menos paradas E ponto está mais próximo de j
          if(cl[j].length<cl[i].length&&dJ<dI&&dJ<bDist){bDist=dJ;bIdx=x;}
        }
        if(bIdx>=0){cl[j].push(cl[i].splice(bIdx,1)[0]);changed=true;if(cl[i].length<=maxPD)break;}
      }
    }
  }return cl;
}
// Agrupa pontos por proximidade geográfica (union-find).
// eps = distância máxima em km para considerar a mesma região.
// Garante que pontos de regiões distintas nunca fiquem no mesmo grupo.
function geoClusters(pts,eps){
  if(!pts.length)return[];
  var parent=pts.map(function(_,i){return i;});
  function find(x){while(parent[x]!==x){parent[x]=parent[parent[x]];x=parent[x];}return x;}
  function union(a,b){parent[find(a)]=find(b);}
  for(var i=0;i<pts.length;i++){
    for(var j=i+1;j<pts.length;j++){
      if(hav(pts[i].lat,pts[i].lng,pts[j].lat,pts[j].lng)<=eps)union(i,j);
    }
  }
  var map={};
  pts.forEach(function(p,i){var r=find(i);if(!map[r])map[r]=[];map[r].push(p);});
  return Object.keys(map).map(function(k){return map[k];});
}
// Garante coerência geográfica: se algum par de pontos num cluster
// está a mais de maxKm um do outro, o cluster é dividido com geoClusters.
// Impede que locais de regiões distintas fiquem no mesmo dia.
function ensureGeoCoherence(clusters, maxKm){
  var result=[];
  clusters.forEach(function(cluster){
    if(!cluster||cluster.length<=1){result.push(cluster||[]);return;}
    var ok=true;
    outer:for(var i=0;i<cluster.length;i++){
      for(var j=i+1;j<cluster.length;j++){
        if(hav(cluster[i].lat,cluster[i].lng,cluster[j].lat,cluster[j].lng)>maxKm){ok=false;break outer;}
      }
    }
    if(ok){result.push(cluster);return;}
    // Divide com eps = 60% do limite para garantir separação real
    var subs=geoClusters(cluster,maxKm*0.6);
    if(subs.length<=1){result.push(cluster);return;}
    subs.forEach(function(s){result.push(s);});
  });
  return result;
}
function nearestNeighbor(pts){
  if(pts.length<=1)return pts;
  var vis={},rt=[pts[0]];vis[0]=true;
  while(rt.length<pts.length){var last=rt[rt.length-1],md=Infinity,ni=-1;for(var i=0;i<pts.length;i++){if(!vis[i]){var d=hav(last.lat,last.lng,pts[i].lat,pts[i].lng);if(d<md){md=d;ni=i;}}}vis[ni]=true;rt.push(pts[ni]);}
  return rt;
}
function nearestNeighborH(pts,hotelPt){
  if(!hotelPt||pts.length<=1)return nearestNeighbor(pts);
  var vis={},rt=[],bestD=Infinity,bestI=0;
  pts.forEach(function(p,i){var d=hav(hotelPt.lat,hotelPt.lng,p.lat,p.lng);if(d<bestD){bestD=d;bestI=i;}});
  vis[bestI]=true;rt.push(pts[bestI]);
  while(rt.length<pts.length){var last=rt[rt.length-1],md=Infinity,ni=-1;for(var i=0;i<pts.length;i++){if(!vis[i]){var d=hav(last.lat,last.lng,pts[i].lat,pts[i].lng);if(d<md){md=d;ni=i;}}}vis[ni]=true;rt.push(pts[ni]);}
  return rt;
}

// Funcionalidade 1: distribui pontos entre cidades com raio dinâmico
function assignPointsToCities(allPts, citiesArr){
  var groups=[];
  for(var i=0;i<citiesArr.length;i++)groups.push([]);
  var orphans=[];
  if(!citiesArr||!citiesArr.length){
    return {groups:groups, orphans:(allPts||[]).slice()};
  }
  if(citiesArr.length===1){
    groups[0]=(allPts||[]).slice();
    return {groups:groups, orphans:[]};
  }
  // raio dinâmico = menor distância entre par de cidades / 2 (ignora pares quase idênticos)
  var minPair=Infinity;
  for(var a=0;a<citiesArr.length;a++){
    for(var b=a+1;b<citiesArr.length;b++){
      var d=hav(citiesArr[a].lat,citiesArr[a].lng,citiesArr[b].lat,citiesArr[b].lng);
      if(d>5&&d<minPair)minPair=d;
    }
  }
  if(minPair===Infinity)minPair=100;
  var radius=minPair/2;
  (allPts||[]).forEach(function(pt){
    var bestCi=0,bestD=Infinity;
    citiesArr.forEach(function(city,ci){
      var d=hav(pt.lat,pt.lng,city.lat,city.lng);
      if(d<bestD){bestD=d;bestCi=ci;}
    });
    if(bestD>radius)orphans.push(pt);
    else groups[bestCi].push(pt);
  });
  return {groups:groups, orphans:orphans};
}

// Funcionalidade 2: tenta colocar órfãos no caminho entre cidades consecutivas
function placeOrphans(orphans, citiesArr, groups){
  var groupsAddition=[];
  for(var i=0;i<citiesArr.length;i++)groupsAddition.push([]);
  var trueOrphans=[];
  if(!orphans||!orphans.length)return {groupsAddition:groupsAddition,trueOrphans:trueOrphans};
  if(!citiesArr||citiesArr.length<2){
    return {groupsAddition:groupsAddition,trueOrphans:orphans.slice()};
  }
  orphans.forEach(function(pt){
    var placed=false;
    for(var k=0;k<citiesArr.length-1;k++){
      var A=citiesArr[k],B=citiesArr[k+1];
      var dPA=hav(pt.lat,pt.lng,A.lat,A.lng);
      var dPB=hav(pt.lat,pt.lng,B.lat,B.lng);
      var dAB=hav(A.lat,A.lng,B.lat,B.lng);
      var desvio=dPA+dPB-dAB;
      if(desvio<40){
        var idx=dPA<=dPB?k:k+1;
        groupsAddition[idx].push(pt);
        placed=true;
        break;
      }
    }
    if(!placed)trueOrphans.push(pt);
  });
  return {groupsAddition:groupsAddition,trueOrphans:trueOrphans};
}

// Funcionalidade 3: k-means++ com semente influenciada pelo hotel
function kmeanspp(pts,k,hotelRef){
  if(!pts.length)return [];
  if(pts.length<=k)return pts.map(function(p){return[p];});
  var cs=[];
  // 1º centróide
  if(hotelRef&&typeof hotelRef.lat==='number'){
    var bD=Infinity,bI=0;
    pts.forEach(function(p,i){var d=hav(p.lat,p.lng,hotelRef.lat,hotelRef.lng);if(d<bD){bD=d;bI=i;}});
    cs.push({lat:pts[bI].lat,lng:pts[bI].lng});
  }else{
    // ponto mais central (menor soma de distâncias)
    var bestS=Infinity,bestIdx=0;
    for(var i=0;i<pts.length;i++){
      var sum=0;
      for(var j=0;j<pts.length;j++){if(i!==j)sum+=hav(pts[i].lat,pts[i].lng,pts[j].lat,pts[j].lng);}
      if(sum<bestS){bestS=sum;bestIdx=i;}
    }
    cs.push({lat:pts[bestIdx].lat,lng:pts[bestIdx].lng});
  }
  // próximos centróides com prob ∝ dist²
  while(cs.length<k){
    var ds2=pts.map(function(p){
      var m=Infinity;
      cs.forEach(function(c){var d=hav(p.lat,p.lng,c.lat,c.lng);if(d<m)m=d;});
      return m*m;
    });
    var tot=ds2.reduce(function(a,b){return a+b;},0);
    if(tot<=0){cs.push({lat:pts[0].lat,lng:pts[0].lng});continue;}
    var r=Math.random()*tot,ch=0;
    for(var x=0;x<ds2.length;x++){r-=ds2[x];if(r<=0){ch=x;break;}}
    cs.push({lat:pts[ch].lat,lng:pts[ch].lng});
  }
  var cl=null;
  for(var it=0;it<50;it++){
    cl=[];for(var z=0;z<k;z++)cl.push([]);
    pts.forEach(function(p){
      var md=Infinity,b=0;
      cs.forEach(function(c,ci){var d=hav(p.lat,p.lng,c.lat,c.lng);if(d<md){md=d;b=ci;}});
      cl[b].push(p);
    });
    for(var y=0;y<k;y++){
      if(!cl[y].length){
        var lg=0;
        for(var w=1;w<k;w++)if(cl[w].length>cl[lg].length)lg=w;
        if(cl[lg].length>1)cl[y].push(cl[lg].pop());
      }
    }
    var maxDelta=0;
    var newCs=cl.map(function(c,ci){
      if(!c.length)return cs[ci];
      var la=c.reduce(function(s,p){return s+p.lat;},0)/c.length;
      var ln=c.reduce(function(s,p){return s+p.lng;},0)/c.length;
      var dlt=hav(la,ln,cs[ci].lat,cs[ci].lng);
      if(dlt>maxDelta)maxDelta=dlt;
      return {lat:la,lng:ln};
    });
    cs=newCs;
    if(maxDelta<0.01)break;
  }
  return cl||[pts];
}

// Funcionalidade 4 (auxiliar): começa pelo ponto mais ao norte
function northFirst(pts){
  if(!pts||!pts.length)return pts||[];
  if(pts.length===1)return pts.slice();
  var sorted=pts.slice().sort(function(a,b){return b.lat-a.lat;});
  return typeof nearestNeighborH==='function'?nearestNeighborH(pts,sorted[0]):nearestNeighbor(pts);
}

// Funcionalidade 5: 2-opt refinement (mantém extremidades fixas)
function twoOpt(stops){
  if(!stops||stops.length<4)return stops||[];
  var arr=stops.slice();
  function isFixed(s){return !!(s&&(s.isHotelMarker||s.isEndpoint));}
  function segDist(a,b){return hav(a.lat,a.lng,b.lat,b.lng);}
  var limit=Math.min(50,arr.length*arr.length);
  var iter=0,improved=true;
  while(improved&&iter<limit){
    improved=false;
    for(var i=0;i<arr.length-1;i++){
      if(isFixed(arr[i]))continue;
      for(var j=i+1;j<arr.length-1;j++){
        if(isFixed(arr[j])||isFixed(arr[j+1]))continue;
        if(i===0&&isFixed(arr[0]))continue;
        // arestas: (i, i+1) e (j, j+1)
        var d1=segDist(arr[i],arr[i+1])+segDist(arr[j],arr[j+1]);
        var d2=segDist(arr[i],arr[j])+segDist(arr[i+1],arr[j+1]);
        if(d2<d1-0.0001){
          // inverte [i+1..j]
          var seg=arr.slice(i+1,j+1).reverse();
          arr=arr.slice(0,i+1).concat(seg).concat(arr.slice(j+1));
          improved=true;
          iter++;
          if(iter>=limit)break;
        }
      }
      if(iter>=limit)break;
    }
  }
  return arr;
}

function groupCitiesByName(citiesArr){
  var order=[],map={};
  citiesArr.forEach(function(city,ci){
    var key=normName(city.name);
    if(!map[key]){map[key]={city:city,occurrences:[]};order.push(key);}
    map[key].occurrences.push({idx:ci,days:Math.max(1,city.days||1)});
  });
  return {order:order,map:map};
}

function sliceClustersByOccurrences(clusters,occurrences){
  var totalDays=occurrences.reduce(function(s,o){return s+o.days;},0);
  var totalClusters=clusters.length;
  var result=[],cursor=0,acc=0;
  occurrences.forEach(function(occ,oi){
    acc+=occ.days;
    var end=oi===occurrences.length-1?totalClusters:Math.round(totalClusters*acc/totalDays);
    result.push(clusters.slice(cursor,end));
    cursor=end;
  });
  return result;
}

function assignPtsToCity(pts){
  if(!cities.length)return pts.map(function(p){return{pt:p,ci:0};});
  return pts.map(function(pt){
    var minD=Infinity,bestCi=0;
    cities.forEach(function(city,ci){var d=hav(pt.lat,pt.lng,city.lat,city.lng);if(d<minD){minD=d;bestCi=ci;}});
    return{pt:pt,ci:bestCi};
  });
}

async function doGen(){
  var err=document.getElementById('gen-err');if(err)err.style.display='none';
  var chk=document.getElementById('chk-disclaimer');
  if(chk&&!chk.checked){
    if(err){err.textContent='Leia e aceite os termos antes de gerar o roteiro.';err.style.display='block';}
    chk.closest('div').scrollIntoView({behavior:'smooth',block:'center'});return;
  }
  var allPts=[];
  if(kmlFile){var txt=await kmlFile.text();allPts=parseKML(txt);}
  allPts=allPts.concat(manualPts);
  var hasCities=cities.length>0;
  if(!allPts.length&&!hasCities){if(err){err.textContent='Adicione locais (KML ou manual) ou configure as cidades.';err.style.display='block';}return;}
  show('s-load');
  document.getElementById('lsub').textContent='Organizando '+allPts.length+' locais...';
  await new Promise(function(r){setTimeout(r,0);});

  itin=[];
  var globalDayIdx=0;

  if(hasCities){
    var grouped=groupCitiesByName(cities);
    var uniqueCityRefs=grouped.order.map(function(k){return grouped.map[k].city;});
    var assignedRes=assignPointsToCities(allPts,uniqueCityRefs);
    var orphRes=placeOrphans(assignedRes.orphans,uniqueCityRefs,assignedRes.groups);
    var cityGroupsByName=assignedRes.groups.map(function(g,gi){return g.concat(orphRes.groupsAddition[gi]||[]);});

    var clustersPerOccurrence={};
    grouped.order.forEach(function(key,gi){
      var group=grouped.map[key];
      var pts=cityGroupsByName[gi]||[];
      var totalDays=group.occurrences.reduce(function(s,o){return s+o.days;},0);
      var k=Math.min(totalDays,pts.length||1);
      var clusters;
      if(!pts.length){clusters=[];for(var z=0;z<totalDays;z++)clusters.push([]);}
      else if(k<=1){clusters=[pts];}
      else{
        var hotelRef=group.city.hotelConfirmed&&group.city.hotel?{lat:group.city.hotel.lat,lng:group.city.hotel.lng}:null;
        clusters=kmeanspp(pts,k,hotelRef);
        clusters=balanceClusters(clusters,k);
        clusters=ensureGeoCoherence(clusters,60);
      }
      var sliced=sliceClustersByOccurrences(clusters,group.occurrences);
      group.occurrences.forEach(function(occ,oi){clustersPerOccurrence[occ.idx]=sliced[oi]||[];});
    });

    cities.forEach(function(city,ci){
      var occClusters=clustersPerOccurrence[ci]||[];
      occClusters.forEach(function(cluster){
        var hotelPt=city.hotelConfirmed&&city.hotel?city.hotel:null;
        var sorted=hotelPt?nearestNeighborH(cluster,hotelPt):northFirst(cluster);
        var stops=sorted.map(function(s){return makeStop(s,0);});
        if(hotelPt){
          var hMarker={name:hotelPt.name,lat:hotelPt.lat,lng:hotelPt.lng,
            duration:0,cat:'hotel',desc:'Hospedagem',note:'',descLoading:false,travelMin:0,distKm:'0.00',manual:false,isHotelMarker:true};
          stops.unshift(hMarker);
        }
        stops=twoOpt(stops);
        itin.push({routeColor:DEFAULT_ROUTE_COLORS[globalDayIdx%DEFAULT_ROUTE_COLORS.length],
          pinColor:DEFAULT_PIN_COLORS[globalDayIdx%DEFAULT_PIN_COLORS.length],
          startH:9,startM:0,endH:21,endM:0,date:'',stops:stops,geo:null,
          cityName:city.name,cityIdx:ci});
        globalDayIdx++;
      });
    });
    // Órfãos verdadeiros — kmeans simples em grupo extra (se houver)
    if(orphRes.trueOrphans&&orphRes.trueOrphans.length){
      var orphK=Math.min(orphRes.trueOrphans.length,Math.max(1,Math.ceil(orphRes.trueOrphans.length/6)));
      var orphClusters=orphK<=1?[orphRes.trueOrphans]:kmeans(orphRes.trueOrphans,orphK);
      orphClusters.forEach(function(cluster){
        var sorted=northFirst(cluster);
        var stops=twoOpt(sorted.map(function(s){return makeStop(s,0);}));
        itin.push({routeColor:DEFAULT_ROUTE_COLORS[globalDayIdx%DEFAULT_ROUTE_COLORS.length],
          pinColor:DEFAULT_PIN_COLORS[globalDayIdx%DEFAULT_PIN_COLORS.length],
          startH:9,startM:0,endH:21,endM:0,date:'',stops:stops,geo:null,
          cityName:'',cityIdx:-1});
        globalDayIdx++;
      });
    }
  }else{
    // ── Sem cidades definidas: pré-agrupa geograficamente (≤40km = mesma região) ──
    // Nunca mistura regiões distintas num mesmo dia — bate e volta é decisão manual do usuário
    var totalDays=Math.max(1,Math.ceil(allPts.length/6));
    // eps=40km evita que a união transitiva do union-find misture regiões distintas
    var geoGroups=geoClusters(allPts,40);

    // Distribui dias proporcionalmente ao tamanho de cada grupo
    var daysPerGroup=geoGroups.map(function(g){
      return Math.max(1,Math.round(totalDays*g.length/allPts.length));
    });
    // Ajusta para a soma bater em totalDays
    var dSum=daysPerGroup.reduce(function(a,b){return a+b;},0);
    if(dSum!==totalDays&&daysPerGroup.length){
      var biggest=0;
      daysPerGroup.forEach(function(d,i){if(d>daysPerGroup[biggest])biggest=i;});
      daysPerGroup[biggest]=Math.max(1,daysPerGroup[biggest]+(totalDays-dSum));
    }

    geoGroups.forEach(function(group,gi){
      var k=Math.min(daysPerGroup[gi],group.length);
      var clusters=k<=1?[group]:kmeansMulti(group,k,5);
      // Garante coerência: pontos > 60km ficam em dias separados
      clusters=ensureGeoCoherence(clusters,60);
      clusters.forEach(function(cluster){
        var sorted=nearestNeighbor(cluster);
        var stops=sorted.map(function(s){return makeStop(s,0);});
        itin.push({routeColor:DEFAULT_ROUTE_COLORS[globalDayIdx%DEFAULT_ROUTE_COLORS.length],
          pinColor:DEFAULT_PIN_COLORS[globalDayIdx%DEFAULT_PIN_COLORS.length],
          startH:9,startM:0,endH:21,endM:0,date:'',stops:stops,geo:null,
          cityName:'',cityIdx:gi});
        globalDayIdx++;
      });
    });
  }

  // Funcionalidade 7: Aeroportos nos extremos com isEndpoint
  if(airports.arrival&&itin.length>0){
    itin[0].stops.unshift({name:airports.arrival.name,lat:airports.arrival.lat,lng:airports.arrival.lng,
      duration:60,cat:'aeroporto-chegada',desc:'Aeroporto de chegada',note:'',descLoading:false,travelMin:0,distKm:'0.00',manual:false,
      isEndpoint:true,isArrival:true});
    var arrDate=document.getElementById('wiz-arr-date');
    if(arrDate&&arrDate.value)itin[0].date=arrDate.value;
  }
  if(airports.departure&&itin.length>0){
    var lastDay=itin[itin.length-1];
    lastDay.stops.push({name:airports.departure.name,lat:airports.departure.lat,lng:airports.departure.lng,
      duration:120,cat:'aeroporto-saida',desc:'Aeroporto de saída',note:'',descLoading:false,travelMin:0,distKm:'0.00',manual:false,
      isEndpoint:true,isArrival:false});
    var depDate=document.getElementById('wiz-dep-date');
    if(depDate&&depDate.value)lastDay.date=depDate.value;
  }

  // Pré-atribui datas sequenciais a todos os dias sem data (base = data de chegada)
  // Isso permite que o hotel assign popup encontre o dia correto por data de check-in
  if(itin.length>0&&itin[0].date){
    var _arrParts=itin[0].date.split('-');
    var _baseMs=Date.UTC(parseInt(_arrParts[0]),parseInt(_arrParts[1])-1,parseInt(_arrParts[2]));
    itin.forEach(function(day,di){
      if(!day.date){
        var _ms=_baseMs+di*86400000;
        var _dd=new Date(_ms);
        day.date=_dd.getUTCFullYear()+'-'+String(_dd.getUTCMonth()+1).padStart(2,'0')+'-'+String(_dd.getUTCDate()).padStart(2,'0');
      }
    });
  }

  itin.forEach(function(_,di){smartSortDay(di);recalcTravel(di);});
  show('s-res');
  document.getElementById('uname2').textContent=user?user.name:'';
  updateHotelBanner();
  if(mapObj){mapObj.remove();mapObj=null;}
  document.getElementById('v-map').style.display='none';
  document.getElementById('v-tl').style.display='block';
  document.getElementById('tb-tl').classList.add('on');document.getElementById('tb-map').classList.remove('on');
  renderTL();
  updateDayCityNames();
  itin.forEach(function(day,di){day.stops.forEach(function(_,si){fetchDesc(di,si);});});
}

function recalcWithHotel(){
  if(_hotelRecalcDi>=0&&_hotelRecalcDi<itin.length){
    var di=_hotelRecalcDi;
    var hotelStop=itin[di].stops.find(function(s){return s.cat==='hotel';});
    var arrival=itin[di].stops.find(function(s){return s.cat==='aeroporto-chegada'||(s.cat==='aeroporto'&&s.desc==='Aeroporto de chegada');});
    var departure=itin[di].stops.find(function(s){return s.cat==='aeroporto-saida'||(s.cat==='aeroporto'&&s.desc==='Aeroporto de saída');});
    var rest=itin[di].stops.filter(function(s){return s.cat!=='hotel'&&!isAirportCat(s.cat);});
    var reordered=hotelStop?nearestNeighborH(rest,hotelStop):nearestNeighbor(rest);
    // ordem: chegada → hotel → paradas → saída
    var newStops=[];
    if(arrival)newStops.push(arrival);
    if(hotelStop)newStops.push(hotelStop);
    newStops=newStops.concat(reordered);
    if(departure)newStops.push(departure);
    itin[di].stops=newStops;
    recalcTravel(di);
  }else{
    itin.forEach(function(_,di){smartSortDay(di);recalcTravel(di);});
  }
  _hotelRecalcDi=-1;
  renderTL();renderMap();document.getElementById('recalc-toast').style.display='none';
}

// ── SORT BY DATE ─────────────────────────────────────────
// Dias marcados com hotelGroup são tratados como bloco indivisível:
// o bloco inteiro se move junto, ordenado pela data do primeiro dia do bloco.
// Isso impede que dias do hotel (com datas consecutivas) sejam separados
// quando outros dias ganham nova data.
function sortItinByDate(){
  var hasDates=itin.some(function(d){return d.date;});
  if(!hasDates)return;

  // Monta lista de "itens de ordenação": dia avulso ou bloco de hotel
  var items=[],i=0;
  while(i<itin.length){
    var day=itin[i];
    if(day.hotelGroup){
      var group=[day],j=i+1;
      while(j<itin.length&&itin[j].hotelGroup===day.hotelGroup){group.push(itin[j]);j++;}
      items.push({days:group,date:group[0].date||''});
      i=j;
    }else{
      items.push({days:[day],date:day.date||''});
      i++;
    }
  }

  // Ordena itens: com data em ordem cronológica, sem data vão ao fim
  items.sort(function(a,b){
    if(!a.date&&!b.date)return 0;
    if(!a.date)return 1;
    if(!b.date)return -1;
    return a.date<b.date?-1:a.date>b.date?1:0;
  });

  // Reconstrói itin e redistribui cores
  var newItin=[];
  items.forEach(function(item){item.days.forEach(function(d){newItin.push(d);});});
  itin=newItin;
  itin.forEach(function(day,di){
    day.routeColor=DEFAULT_ROUTE_COLORS[di%DEFAULT_ROUTE_COLORS.length];
    day.pinColor=DEFAULT_PIN_COLORS[di%DEFAULT_PIN_COLORS.length];
  });
}
