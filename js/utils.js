// ── UTILS ────────────────────────────────────────────────
function show(id){
  ['s-login','s-wizard','s-load','s-res'].forEach(function(s){
    var el=document.getElementById(s);if(!el)return;
    el.classList.remove('on');el.style.display='none';
  });
  var t=document.getElementById(id);if(!t)return;
  t.classList.add('on');
  // s-login e s-load são flex containers para centralizar o conteúdo
  // s-wizard e s-res são block (wizard-wrap e inner divs cuidam do layout)
  t.style.display=(id==='s-login'||id==='s-load')?'flex':'block';
}
function fmt(m){var h=Math.floor(m/60)%24,mn=m%60;return(h<10?'0':'')+h+':'+(mn<10?'0':'')+mn;}
function mapsLink(lat,lng){return 'https://www.google.com/maps/search/?api=1&query='+lat+','+lng;}
function fmtDate(iso){
  if(!iso)return null;
  var p=iso.split('-');
  return new Date(+p[0],+p[1]-1,+p[2]).toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long'});
}
function hav(la1,ln1,la2,ln2){
  var R=6371,dL=(la2-la1)*Math.PI/180,dN=(ln2-ln1)*Math.PI/180;
  var a=Math.sin(dL/2)*Math.sin(dL/2)+Math.cos(la1*Math.PI/180)*Math.cos(la2*Math.PI/180)*Math.sin(dN/2)*Math.sin(dN/2);
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}

// Normaliza nomes de cidades para detectar duplicatas
function normName(n){
  var map={'toquio':'tokyo','tóquio':'tokyo','tokio':'tokyo','tokyo':'tokyo',
    'quioto':'kyoto','kyoto':'kyoto',
    'osaca':'osaka','osaka':'osaka',
    'hiroshima':'hiroshima','hiroshima':'hiroshima',
    'nara':'nara',
    'nikko':'nikko','nikkō':'nikko',
    'hakone':'hakone',
    'sapporo':'sapporo',
    'nagoya':'nagoya',
    'yokohama':'yokohama',
    'kamakura':'kamakura',
    'fujisan':'fuji','fujiyama':'fuji'
  };
  var s=n.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z]/g,'');
  return map[s]||s;
}

// Drag handlers (stops)
function onDragStart(e,di,si){dragSrc={di:di,si:si};e.dataTransfer.effectAllowed='move';setTimeout(function(){var c=document.querySelector('.stop-card[data-di="'+di+'"][data-si="'+si+'"]');if(c)c.classList.add('dragging');},0);}
function onDragEnd(){document.querySelectorAll('.stop-card').forEach(function(c){c.classList.remove('dragging','drag-over');});dragSrc=null;}
function onDragOver(e,di,si){e.preventDefault();document.querySelectorAll('.stop-card').forEach(function(c){c.classList.remove('drag-over');});var card=document.querySelector('.stop-card[data-di="'+di+'"][data-si="'+si+'"]');if(card&&!(dragSrc&&dragSrc.di===di&&dragSrc.si===si))card.classList.add('drag-over');}
function onDrop(e,toDi,toSi){
  e.preventDefault();if(!dragSrc)return;
  var fD=dragSrc.di,fS=dragSrc.si;if(fD===toDi&&fS===toSi)return;
  var stop=itin[fD].stops.splice(fS,1)[0];
  if(fD===toDi){itin[toDi].stops.splice(toSi>fS?toSi-1:toSi,0,stop);}
  else{itin[toDi].stops.splice(toSi,0,stop);}
  recalcTravel(fD);if(fD!==toDi)recalcTravel(toDi);renderTL();renderMap();
}

// ── STOP TIME ─────────────────────────────────────────────
function stopTime(di,si){
  var day=itin[di],cur=day.startH*60+day.startM;
  for(var i=0;i<si;i++){cur+=day.stops[i].duration;if(i<day.stops.length-1)cur+=day.stops[i].travelMin||0;}
  var e=cur+day.stops[si].duration,lim=(day.endH||21)*60+(day.endM||0);
  return{s:cur,e:e,overLimit:e>lim};
}

function makeStop(s,legDist){
  return{name:s.name,lat:s.lat,lng:s.lng,duration:catDuration(s.cat),cat:s.cat||'atracao',
    desc:s.desc||'',note:s.note||'',descLoading:!(s.desc),
    travelMin:0,distKm:'0.00',manual:s.manual||false};
}

function citiesAreSame(a,b){
  return normName(a)===normName(b);
}
