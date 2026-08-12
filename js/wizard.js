// ── WIZARD ───────────────────────────────────────────────
var PRESET_CITIES=[
  {name:'Tokyo',     lat:35.6762,lng:139.6503,sugDays:3,emoji:'🗼'},
  {name:'Kyoto',     lat:35.0116,lng:135.7681,sugDays:3,emoji:'⛩️'},
  {name:'Osaka',     lat:34.6937,lng:135.5023,sugDays:2,emoji:'🏯'},
  {name:'Hakone',    lat:35.2329,lng:139.1069,sugDays:1,emoji:'🗻'},
  {name:'Nara',      lat:34.6851,lng:135.8048,sugDays:1,emoji:'🦌'},
  {name:'Hiroshima', lat:34.3853,lng:132.4553,sugDays:1,emoji:'🕊️'},
  {name:'Miyajima',  lat:34.2953,lng:132.3199,sugDays:1,emoji:'🌊'},
  {name:'Fukuoka',   lat:33.5904,lng:130.4017,sugDays:2,emoji:'🍜'}
];

function goWiz(n){
  wizStep=n;
  [1,2,3,4].forEach(function(i){
    var ws=document.getElementById('ws-'+i);
    if(ws)ws.className='wiz-step'+(i===n?' on':'');
  });
  renderWizProgress(n);
  if(n===3)renderCityChips();
  if(n===4)renderWiz4();
}
// Compatibilidade com chamadas legadas (doLogin, doReset)
function goStep(n){goWiz(n);}

function renderWizProgress(current){
  var el=document.getElementById('wiz-progress');if(!el)return;
  var labels=['Datas','Passagem','Cidades','Resumo'];
  var html='';
  for(var i=1;i<=4;i++){
    var done=i<current,active=i===current;
    var cls='wp-dot'+(done?' done':active?' active':'');
    html+='<div style="display:flex;flex-direction:column;align-items:center;gap:4px;">'
      +'<div class="'+cls+'"></div>'
      +'<span style="font-size:10px;font-weight:600;color:'+(active?'#E74C3C':done?'#E74C3C':'#bbb')+';white-space:nowrap;">'+labels[i-1]+'</span>'
      +'</div>';
    if(i<4)html+='<div class="wp-line'+(done?' done':'')+'"></div>';
  }
  el.innerHTML=html;
}

// ── TELA 1: DATAS ─────────────────────────────────────────
function getTotalTripDays(){
  var a=document.getElementById('wiz-arr-date');
  var d=document.getElementById('wiz-dep-date');
  if(!a||!d||!a.value||!d.value)return 0;
  return Math.max(0,Math.round((new Date(d.value)-new Date(a.value))/86400000));
}

function updateWiz1Days(){
  var days=getTotalTripDays();
  var info=document.getElementById('wiz-days-info');
  var num=document.getElementById('wiz-days-num');
  if(!info||!num)return;
  if(days>0){
    num.textContent=days;
    info.style.display='block';
  }else{
    info.style.display='none';
  }
}

// ── TELA 3: CIDADES ───────────────────────────────────────
function updateDaysCounter(){
  var el=document.getElementById('wiz-days-counter');if(!el)return;
  var used=cities.reduce(function(s,c){return s+c.days;},0);
  if(!cities.length){el.style.display='none';return;}
  var total=getTotalTripDays();
  el.style.display='block';
  var over=total>0&&used>total;
  var pctW=total>0?Math.min(100,Math.round(used/total*100)):0;
  el.innerHTML='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:7px;">'
    +'<span style="color:#545454;">Dias planejados</span>'
    +'<span style="font-size:15px;font-weight:700;color:'+(over?'#E74C3C':'#000')+';">'
    +used+(total?' / '+total+' dias':' dias')+'</span>'
    +'</div>'
    +(total
      ?'<div style="height:5px;background:#f0e8e9;border-radius:3px;overflow:hidden;">'
        +'<div style="width:'+pctW+'%;height:100%;background:#E74C3C;border-radius:3px;transition:width .3s;"></div>'
        +'</div>'
        +(over?'<div style="font-size:11px;color:#E74C3C;margin-top:5px;">⚠️ '+(used-total)+' dia'+(used-total>1?'s':'')+' a mais que a duração da viagem</div>':'')
      :'');
}

function renderCityChips(){
  var el=document.getElementById('city-chips');if(!el)return;
  el.innerHTML=PRESET_CITIES.map(function(pc,idx){
    var count=cities.filter(function(c){return normName(c.name)===normName(pc.name);}).length;
    var sel=count>0;
    return '<div class="city-chip'+(sel?' sel':'')+'" data-chip-idx="'+idx+'">'
      +'<div class="chip-top"><span class="chip-emoji">'+pc.emoji+'</span>'
      +'<span class="chip-name">'+pc.name+'</span></div>'
      +(sel
        ?'<div class="chip-days-hint" style="color:#E74C3C;font-weight:700;">'+(count>1?'&#10003; '+count+'x adicionado':'&#10003; adicionado')+'</div>'
        :'<div class="chip-days-hint">'+pc.sugDays+'d &middot; sugest&atilde;o</div>')
      +'</div>';
  }).join('');
  el.querySelectorAll('.city-chip').forEach(function(chip){
    chip.addEventListener('click',function(){
      togglePresetCity(parseInt(this.getAttribute('data-chip-idx')));
    });
  });
  updateDaysCounter();
  renderCities();
}

function togglePresetCity(idx){
  var pc=PRESET_CITIES[idx];
  cities.push({name:pc.name,lat:pc.lat,lng:pc.lng,days:pc.sugDays,hotel:null,hotelConfirmed:false});
  renderCityChips();
}

// ── AIRPORT SEARCH ───────────────────────────────────────
function setupAirportSearch(inputId,resultsId,which){
  var el=document.getElementById(inputId);if(!el)return;
  el.addEventListener('input',function(){
    clearTimeout(_airT[which]);var q=this.value.trim();
    if(q.length<2){document.getElementById(resultsId).style.display='none';return;}
    _airT[which]=setTimeout(function(){
      nominatimSearch(q+' airport',resultsId,function(r){
        setAirport(which,r);
        document.getElementById(inputId).value=r.name;
      });
    },450);
  });
}

async function nominatimSearch(q,resultsId,onSelect){
  try{
    var res=await fetch('https://nominatim.openstreetmap.org/search?q='+encodeURIComponent(q)+'&format=json&limit=5&namedetails=1&accept-language=pt-BR,pt;q=0.9,en;q=0.5',
      {headers:{'Accept-Language':'pt-BR,pt;q=0.9,en;q=0.5'}});
    var data=await res.json();
    var box=document.getElementById(resultsId);if(!box)return;
    if(!data.length){box.style.display='none';return;}
    box.innerHTML='';
    data.forEach(function(r){
      var nd=r.namedetails||{};
      var bestName=(nd['name:pt']||nd['name:en']||r.display_name.split(',')[0]).trim();
      var div=document.createElement('div');div.className='sr-item';
      div.innerHTML='<div class="sr-name">'+bestName+'</div><div class="sr-addr">'+r.display_name+'</div>';
      div.addEventListener('click',function(){
        onSelect({name:bestName,lat:parseFloat(r.lat),lng:parseFloat(r.lon),fullName:r.display_name});
        box.style.display='none';box.innerHTML='';
      });
      box.appendChild(div);
    });
    box.style.display='block';
  }catch(e){}
}

function setAirport(which,data){
  airports[which]=data;renderAirportTag(which);
  if(which==='arrival'){var cb=document.getElementById('same-airport');if(cb&&cb.checked){airports.departure=data;renderAirportTag('departure');}}
}

function renderAirportTag(which){
  var el=document.getElementById(which==='arrival'?'arr-selected':'dep-selected');if(!el)return;
  var a=airports[which];
  if(a){
    el.style.display='flex';
    el.innerHTML='<span>✈️ <b>'+a.name+'</b></span>'
      +'<button onclick="clearAirport(\''+which+'\')" style="font-size:11px;padding:2px 8px;border:1px solid #E8B4B8;border-radius:6px;background:#fff;cursor:pointer;color:#E74C3C;">✕</button>';
  }else{
    el.style.display='none';
  }
}

function clearAirport(which){airports[which]=null;renderAirportTag(which);}

// ── CITY SEARCH (cidade customizada) ─────────────────────
function setupCitySearch(){
  var el=document.getElementById('city-search');if(!el)return;
  el.addEventListener('input',function(){
    clearTimeout(_cityT);var q=this.value.trim();
    if(q.length<2){document.getElementById('city-results').style.display='none';return;}
    _cityT=setTimeout(function(){
      nominatimSearch(q,'city-results',function(r){
        doAddCity(r);
        document.getElementById('city-search').value='';
      });
    },450);
  });
}

function doAddCity(data){
  var warn=document.getElementById('dup-warning');
  var norm=normName(data.name);
  var isRevisit=cities.some(function(c){return normName(c.name)===norm;});
  cities.push({name:data.name,lat:data.lat,lng:data.lng,days:2,hotel:null,hotelConfirmed:false});
  if(warn){
    if(isRevisit){warn.style.display='block';warn.textContent='📍 '+data.name+' já está no seu roteiro — isso será tratado como uma nova visita (bate-e-volta). Reordene a lista abaixo se precisar.';}
    else warn.style.display='none';
  }
  renderCityChips();
}

function renderCities(){
  var c=document.getElementById('city-list');if(!c)return;
  if(!cities.length){c.innerHTML='';return;}
  c.innerHTML='<div class="lbl" style="margin-top:4px;">Seu roteiro de cidades (nesta ordem)</div>'
    +cities.map(function(city,i){
      return '<div class="city-item-compact">'
        +'<span style="font-weight:600;font-size:13px;">'+(i+1)+'. 📍 '+city.name+'</span>'
        +'<div style="display:flex;align-items:center;gap:6px;">'
        +'<button class="chip-btn" onclick="var c=cities['+i+'];if(c)c.days=Math.max(1,c.days-1);renderCities();updateDaysCounter();">−</button>'
        +'<span style="min-width:28px;text-align:center;font-size:13px;font-weight:600;">'+city.days+'d</span>'
        +'<button class="chip-btn" onclick="var c=cities['+i+'];if(c)c.days=Math.min(21,c.days+1);renderCities();updateDaysCounter();">+</button>'
        +'<button class="swap-btn" onclick="moveCity('+i+',-1)"'+(i===0?' disabled':'')+' title="Mover para cima">↑</button>'
        +'<button class="swap-btn" onclick="moveCity('+i+',1)"'+(i===cities.length-1?' disabled':'')+' title="Mover para baixo">↓</button>'
        +'<button class="chip-btn" onclick="repeatCity('+i+')" title="Adicionar uma revisita a esta cidade mais tarde">⟲+</button>'
        +'<button onclick="removeCityAt('+i+')" style="font-size:11px;padding:2px 8px;border:1px solid #E8B4B8;border-radius:6px;background:#fff;cursor:pointer;color:#E74C3C;">×</button>'
        +'</div></div>';
    }).join('');
  updateDaysCounter();
}
function moveCity(i,dir){
  var j=i+dir;if(j<0||j>=cities.length)return;
  var tmp=cities[i];cities[i]=cities[j];cities[j]=tmp;
  renderCityChips();
}
function repeatCity(i){
  var src=cities[i];
  cities.splice(i+1,0,{name:src.name,lat:src.lat,lng:src.lng,days:1,hotel:null,hotelConfirmed:false});
  renderCityChips();
}
function removeCityAt(i){cities.splice(i,1);renderCityChips();}

// ── TELA 4: CONFIRMAÇÃO ───────────────────────────────────
function renderWiz4(){
  renderWizSummary();
  renderWizKml();
}

function renderWizSummary(){
  var el=document.getElementById('wiz-summary');if(!el)return;
  var arrVal=document.getElementById('wiz-arr-date').value;
  var depVal=document.getElementById('wiz-dep-date').value;
  var days=getTotalTripDays();
  var rows=[];
  if(arrVal||depVal){
    var dStr=(arrVal?fmtDate(arrVal):'?')+(depVal?' → '+fmtDate(depVal):'')
      +(days?' ('+days+' dia'+(days>1?'s':'')+')':"");
    rows.push({icon:'📅',text:dStr});
  }
  if(airports.arrival)rows.push({icon:'🛬',text:airports.arrival.name});
  if(airports.departure&&(!airports.arrival||airports.departure.name!==airports.arrival.name))
    rows.push({icon:'🛫',text:airports.departure.name});
  for(var i=0;i<cities.length;i++){
    rows.push({icon:'📍',text:'<b>'+cities[i].name+'</b> — '+cities[i].days+' dia'+(cities[i].days>1?'s':'')});
  }
  if(!rows.length){
    el.innerHTML='<div style="text-align:center;color:#999;font-size:13px;padding:12px;">Nenhuma informação preenchida ainda.</div>';
    return;
  }
  el.innerHTML='<div class="sum-card">'
    +rows.map(function(r){
      return '<div class="sum-row"><span class="sum-icon">'+r.icon+'</span><span>'+r.text+'</span></div>';
    }).join('')
    +'</div>';
}

function renderWizKml(){
  var el=document.getElementById('wiz-kml-section');if(!el)return;
  if(kmlFile){
    el.innerHTML='<div style="background:#f0fff4;border:1px solid #b2dfdb;border-radius:10px;padding:12px 16px;display:flex;align-items:center;gap:10px;">'
      +'<span style="font-size:20px;">🗺️</span>'
      +'<div style="flex:1;"><div style="font-weight:600;font-size:13px;">Mapa carregado!</div>'
      +'<div style="font-size:11px;color:#545454;margin-top:2px;">'+kmlFile.name+'</div></div>'
      +'<button onclick="kmlFile=null;renderWizKml();" style="font-size:11px;padding:3px 10px;border:1px solid #b2dfdb;border-radius:6px;background:#fff;cursor:pointer;color:#16a085;">trocar</button>'
      +'</div>';
  }else{
    el.innerHTML='<div style="margin-bottom:6px;display:flex;align-items:center;justify-content:space-between;">'
      +'<span class="lbl" style="margin-bottom:0;">Carregar mapa do Google Maps</span>'
      +'<span style="font-size:11px;color:#999;">opcional</span></div>'
      +'<div class="drop-zone" id="wiz-dz" style="padding:14px;">'
      +'<div style="font-size:20px;margin-bottom:4px;">🗺️</div>'
      +'<div style="font-weight:600;font-size:13px;">Arraste o .kml aqui</div>'
      +'<div style="font-size:12px;color:#545454;margin-top:3px;">ou clique para selecionar</div>'
      +'</div>'
      +'<div style="font-size:11px;color:#999;margin-top:6px;">Google Maps → ⋮ → Exportar para KML</div>';
    var fi=document.getElementById('fi');
    var dz=document.getElementById('wiz-dz');
    if(dz&&fi){
      dz.addEventListener('click',function(){fi.click();});
      dz.addEventListener('dragover',function(e){e.preventDefault();this.classList.add('over');});
      dz.addEventListener('dragleave',function(){this.classList.remove('over');});
      dz.addEventListener('drop',function(e){
        e.preventDefault();this.classList.remove('over');
        var f=e.dataTransfer.files[0];
        if(f&&f.name.toLowerCase().endsWith('.kml')){kmlFile=f;renderWizKml();}
      });
    }
  }
}

// ── CITY HOTEL MODALS ─────────────────────────────────────
function openDayHotelModal(di){
  hotelDayIdx=di;addTarget='day-hotel';selectedCat='hotel';
  document.querySelectorAll('.cat-pill').forEach(function(p){p.classList.toggle('selected',p.getAttribute('data-cat')==='hotel');});
  ['search-input','add-name','add-desc','add-note','add-address'].forEach(function(id){var el=document.getElementById(id);if(el)el.value='';});
  document.getElementById('add-lat').value='';document.getElementById('add-lng').value='';
  document.getElementById('search-results').style.display='none';document.getElementById('search-results').innerHTML='';
  document.getElementById('manual-form').style.display='none';document.getElementById('btn-add-confirm').style.display='none';
  document.getElementById('add-err').style.display='none';document.getElementById('geocode-status').textContent='';
  var cityLabel=itin[di]&&itin[di].cityName?' ('+itin[di].cityName+')':'';
  document.getElementById('modal-title').textContent='🏨 Hospedagem — Dia '+(di+1)+cityLabel;
  document.getElementById('modal-add').classList.add('on');
}

function openCityHotelModal(ci){
  hotelCityIdx=ci;addTarget='city-hotel';selectedCat='hotel';
  document.querySelectorAll('.cat-pill').forEach(function(p){p.classList.toggle('selected',p.getAttribute('data-cat')==='hotel');});
  ['search-input','add-name','add-desc','add-note','add-address'].forEach(function(id){var el=document.getElementById(id);if(el)el.value='';});
  document.getElementById('add-lat').value='';document.getElementById('add-lng').value='';
  document.getElementById('search-results').style.display='none';document.getElementById('search-results').innerHTML='';
  document.getElementById('manual-form').style.display='none';document.getElementById('btn-add-confirm').style.display='none';
  document.getElementById('add-err').style.display='none';document.getElementById('geocode-status').textContent='';
  document.getElementById('modal-title').textContent='🏨 Hotel em '+cities[ci].name;
  document.getElementById('modal-add').classList.add('on');
}

// ── RESET ─────────────────────────────────────────────────
function resetWizardState(){
  itin=[];manualPts=[];hotel=null;kmlFile=null;
  airports={arrival:null,departure:null};cities=[];
  wizStep=1;hotelDayIdx=-1;hotelCityIdx=-1;
  if(mapObj){mapObj.remove();mapObj=null;}
  var da=document.getElementById('wiz-arr-date');if(da)da.value='';
  var dd=document.getElementById('wiz-dep-date');if(dd)dd.value='';
  var di=document.getElementById('wiz-days-info');if(di)di.style.display='none';
  var dc=document.getElementById('wiz-days-counter');if(dc)dc.style.display='none';
  var was=document.getElementById('wiz-airport-section');if(was)was.style.display='none';
  var ws=document.getElementById('wiz-summary');if(ws)ws.innerHTML='';
  var wk=document.getElementById('wiz-kml-section');if(wk)wk.innerHTML='';
  document.querySelectorAll('.wiz-choice').forEach(function(b){b.classList.remove('selected');});
  renderAirportTag('arrival');renderAirportTag('departure');
}

function doReset(){
  resetWizardState();
  undoStack=[];
  var bu=document.getElementById('btn-undo');if(bu){bu.style.opacity='0.4';bu.style.cursor='default';}
  goWiz(1);show('s-wizard');
}
