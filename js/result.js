// ── GEOCODIFICAÇÃO REVERSA DOS NOMES DE CIDADE ───────────
async function updateDayCityNames(){
  for(var di=0;di<itin.length;di++){
    var day=itin[di];
    var reg=day.stops.filter(function(s){return !isAirportCat(s.cat)&&s.cat!=='hotel';});
    if(!reg.length)continue;
    var cLat=reg.reduce(function(s,p){return s+p.lat;},0)/reg.length;
    var cLng=reg.reduce(function(s,p){return s+p.lng;},0)/reg.length;
    try{
      var url='https://nominatim.openstreetmap.org/reverse?lat='+cLat+'&lon='+cLng+'&format=json&zoom=10&namedetails=1&accept-language=pt-BR,pt;q=0.9,en;q=0.5';
      var resp=await fetch(url,{headers:{'Accept-Language':'pt-BR,pt;q=0.9,en;q=0.5'}});
      var data=await resp.json();
      if(data&&data.address){
        var a=data.address;
        var nd=data.namedetails||{};
        var nm=nd['name:pt']||nd['name:en']||a.city||a.town||a.village||a.county||a.state||'';
        if(nm)day.cityName=nm;
      }
    }catch(e){}
    if(di<itin.length-1)await new Promise(function(r){setTimeout(r,1100);});
  }
  renderTL();
}

// ── OTIMIZAR POR HOSPEDAGEM ───────────────────────────────
function optimizeByHotels(){
  document.getElementById('optimize-confirm-overlay').style.display='none';
  // Coleta blocos de hotel (nome → {stop, dayIndices})
  var hotelMap={};
  itin.forEach(function(day,di){
    day.stops.forEach(function(s){
      if(s.cat==='hotel'){
        if(!hotelMap[s.name])hotelMap[s.name]={stop:s,dayIndices:[]};
        hotelMap[s.name].dayIndices.push(di);
      }
    });
  });
  var hotelBlocks=Object.keys(hotelMap).map(function(k){return hotelMap[k];});
  if(!hotelBlocks.length)return;

  // Preserva aeroportos e hotéis por dia
  var arrByDay={},depByDay={},hotelByDay={};
  itin.forEach(function(day,di){
    arrByDay[di]=day.stops.filter(function(s){return s.cat==='aeroporto-chegada';});
    depByDay[di]=day.stops.filter(function(s){return s.cat==='aeroporto-saida'||s.cat==='aeroporto';});
    hotelByDay[di]=day.stops.filter(function(s){return s.cat==='hotel';});
  });

  // Dias sem hotel
  var nonHotelDis=[];
  itin.forEach(function(_,di){if(!hotelByDay[di]||!hotelByDay[di].length)nonHotelDis.push(di);});

  // Coleta todas as paradas regulares
  var allRegular=[];
  itin.forEach(function(day){
    day.stops.forEach(function(s){
      if(!isAirportCat(s.cat)&&s.cat!=='hotel')allRegular.push(s);
    });
  });
  if(!allRegular.length){renderTL();renderMap();return;}

  // Associa cada parada ao hotel mais próximo
  allRegular.forEach(function(s){
    var minD=Infinity,best=null;
    hotelBlocks.forEach(function(b){
      var d=hav(s.lat,s.lng,b.stop.lat,b.stop.lng);
      if(d<minD){minD=d;best=b;}
    });
    s._hotelBlock=best;
    s._hotelDist=minD;
  });

  // Distribui stops dentro de cada bloco de hotel (nearest-neighbor ao redor do hotel)
  hotelBlocks.forEach(function(b){
    var blockStops=allRegular.filter(function(s){return s._hotelBlock===b;});
    var ordered=nearestNeighborH(blockStops,b.stop);
    var perDay=Math.max(1,Math.ceil(ordered.length/Math.max(1,b.dayIndices.length)));
    b.dayIndices.forEach(function(di,idx){
      var chunk=ordered.slice(idx*perDay,(idx+1)*perDay);
      itin[di].stops=(arrByDay[di]||[]).concat(hotelByDay[di]||[]).concat(chunk).concat(depByDay[di]||[]);
      recalcTravel(di);
    });
  });

  // Dias sem hotel: paradas que ficaram (nenhuma, pois todas foram para algum hotel)
  // Mas garante que dias sem hotel não ficam com stops errados
  nonHotelDis.forEach(function(di){
    itin[di].stops=(arrByDay[di]||[]).concat(depByDay[di]||[]);
    recalcTravel(di);
  });

  // Limpa propriedade temporária
  allRegular.forEach(function(s){delete s._hotelBlock;delete s._hotelDist;});

  sortItinByDate();
  updateHotelBanner();renderTL();renderMap();

  var overlay=document.getElementById('hotel-success-overlay');
  var msg=document.getElementById('hotel-success-msg');
  if(overlay&&msg){
    msg.textContent='Passeios redistribuídos por proximidade às hospedagens!';
    overlay.style.display='flex';
  }
}

// ── REDISTRIBUIR DIA SOBRECARREGADO ──────────────────────
var _overloadDi=-1;
function openOverloadPopup(di){
  _overloadDi=di;
  var regular=itin[di].stops.filter(function(s){return !isAirportCat(s.cat)&&s.cat!=='hotel';});
  // Encontra vizinho com menos paradas (mesma cidade preferencial)
  var targetDi=findLightestNeighbor(di);
  if(targetDi<0){
    alert('Não há dia vizinho disponível para redistribuir.');return;
  }
  var targetRegular=itin[targetDi].stops.filter(function(s){return !isAirportCat(s.cat)&&s.cat!=='hotel';});
  var total=regular.length+targetRegular.length;
  var toMove=regular.length-Math.floor(total/2);
  var msg=document.getElementById('overload-msg');
  if(msg)msg.textContent='Este dia tem '+regular.length+' atrações. Mover '+toMove+' para o Dia '+(targetDi+1)+' ('+targetRegular.length+' atrações), deixando ambos com ~'+Math.round(total/2)+'?';
  var btn=document.getElementById('btn-overload-confirm');
  if(btn)btn.onclick=function(){redistributeDay(_overloadDi,targetDi,toMove);};
  document.getElementById('overload-overlay').style.display='flex';
}
function findLightestNeighbor(di){
  var cityName=itin[di].cityName||'';
  var candidates=[];
  // Prefere vizinhos da mesma cidade
  [-1,1].forEach(function(delta){
    var n=di+delta;
    if(n>=0&&n<itin.length){
      var score=(itin[n].cityName||''===cityName)?0:1;
      var count=itin[n].stops.filter(function(s){return !isAirportCat(s.cat)&&s.cat!=='hotel';}).length;
      candidates.push({di:n,score:score,count:count});
    }
  });
  if(!candidates.length)return -1;
  candidates.sort(function(a,b){return a.score-b.score||a.count-b.count;});
  return candidates[0].di;
}
function redistributeDay(fromDi,toDi,toMove){
  document.getElementById('overload-overlay').style.display='none';
  pushUndo();
  var regular=itin[fromDi].stops.filter(function(s){return !isAirportCat(s.cat)&&s.cat!=='hotel';});
  // Calcula centróide do dia origem
  if(!regular.length)return;
  var cLat=regular.reduce(function(s,p){return s+p.lat;},0)/regular.length;
  var cLng=regular.reduce(function(s,p){return s+p.lng;},0)/regular.length;
  // Ordena do mais distante ao mais próximo do centróide (candidatos a mover)
  var sorted=regular.slice().sort(function(a,b){
    return hav(b.lat,b.lng,cLat,cLng)-hav(a.lat,a.lng,cLat,cLng);
  });
  var moving=sorted.slice(0,toMove);
  // Remove do dia origem e adiciona no destino
  moving.forEach(function(stop){
    var idx=itin[fromDi].stops.indexOf(stop);
    if(idx>=0)itin[fromDi].stops.splice(idx,1);
    itin[toDi].stops.push(stop);
  });
  recalcTravel(fromDi);recalcTravel(toDi);
  renderTL();renderMap();
}

// ── AI DESC ───────────────────────────────────────────────
async function fetchDesc(di,si){
  var stop=itin[di]&&itin[di].stops[si];if(!stop||!stop.descLoading)return;
  if(stop.cat==='hotel'||stop.cat==='aeroporto'){stop.descLoading=false;return;}
  try{
    var res=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',
      headers:{'Content-Type':'application/json','anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},
      body:JSON.stringify({model:'claude-haiku-4-5-20251001',max_tokens:80,
        messages:[{role:'user',content:'Descreva em 1 frase curta o que é "'+stop.name+'" como ponto turístico no Japão. Apenas a descrição, sem aspas.'}]})});
    var data=await res.json();
    stop.desc=(data.content&&data.content[0])?data.content[0].text.trim():'';
  }catch(e){stop.desc='';}
  stop.descLoading=false;
  var el=document.getElementById('d-'+di+'-'+si);
  if(el)el.innerHTML=stop.desc||'<em style="color:#ccc;font-size:11px;">Sem descrição disponível.</em>';
}

// ── PDF (HTML print — suporta japonês, emojis e qualquer charset) ──────────
function doPDF(){
  var w=window.open('','_blank');
  if(!w){alert('Permita pop-ups neste site para gerar o PDF.');return;}
  var h='<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">';
  h+='<title>Roteiro de Viagem – @entregatosemalas</title><style>';
  h+='*{box-sizing:border-box;margin:0;padding:0;}';
  h+='body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#fff;color:#000;padding:32px;max-width:780px;margin:0 auto;font-size:13px;line-height:1.5;}';
  h+='.print-bar{background:#E74C3C;color:#fff;padding:10px 16px;border-radius:8px;margin-bottom:24px;display:flex;align-items:center;justify-content:space-between;gap:12px;}';
  h+='.print-bar button{background:#fff;color:#E74C3C;border:none;border-radius:6px;padding:5px 14px;cursor:pointer;font-weight:700;font-size:13px;}';
  h+='.rh{border-bottom:2px solid #E74C3C;padding-bottom:14px;margin-bottom:24px;}';
  h+='.rh h1{font-size:22px;font-weight:800;letter-spacing:-.3px;}';
  h+='.rh .brand{color:#E74C3C;font-size:12px;margin-top:2px;}';
  h+='.rh .airports{font-size:12px;color:#545454;margin-top:8px;display:flex;flex-direction:column;gap:2px;}';
  h+='.day{margin-bottom:28px;page-break-inside:avoid;}';
  h+='.day-title{font-size:14px;font-weight:700;padding:7px 14px;background:#fff8f8;border-left:3px solid #E74C3C;border-radius:0 6px 6px 0;margin-bottom:12px;}';
  h+='.stop{display:flex;gap:12px;margin-bottom:6px;padding-bottom:6px;border-bottom:1px solid #f5f5f5;}';
  h+='.time{font-size:11px;color:#aaa;min-width:48px;text-align:right;padding-top:1px;line-height:1.6;}';
  h+='.stop-body{flex:1;}';
  h+='.stop-name{font-weight:600;color:#000;text-decoration:none;border-bottom:1px solid #E8B4B8;}';
  h+='.stop-name:hover{color:#E74C3C;}';
  h+='.stop-cat{font-size:11px;color:#888;margin-top:2px;}';
  h+='.stop-desc{font-size:12px;color:#545454;margin-top:3px;}';
  h+='.stop-note{font-size:11px;color:#922b21;background:#fff8f8;padding:4px 8px;border-radius:4px;margin-top:4px;}';
  h+='.travel{font-size:11px;color:#ccc;padding:2px 0 4px 60px;}';
  h+='.city-sep{text-align:center;font-size:11px;font-weight:700;color:#E74C3C;letter-spacing:.07em;padding:10px 0 6px;text-transform:uppercase;}';
  h+='@media print{.print-bar{display:none!important;}body{padding:16px;}@page{margin:12mm;}}';
  h+='</style></head><body>';
  h+='<div class="print-bar"><span>📄 Para salvar como PDF: use <b>Arquivo → Imprimir → Salvar como PDF</b> no seu navegador</span><button onclick="window.print()">🖨️ Imprimir / Salvar PDF</button></div>';
  var _uname=user&&user.name?user.name:'';
  h+='<div class="rh"><h1>Roteiro de Viagem'+(_uname?' — '+_uname:'')+'</h1><div class="brand">@entregatosemalas</div>';
  if(airports.arrival||airports.departure){
    h+='<div class="airports">';
    if(airports.arrival)h+='<span>✈️ Chegada: <b>'+airports.arrival.name+'</b></span>';
    if(airports.departure)h+='<span>✈️ Saída: <b>'+airports.departure.name+'</b></span>';
    h+='</div>';
  }
  h+='</div>';
  itin.forEach(function(day,di){
    if(di>0&&day.cityName&&itin[di-1].cityName&&day.cityName!==itin[di-1].cityName)
      h+='<div class="city-sep">― Chegando em '+day.cityName+' ―</div>';
    var dayTitle='Dia '+(di+1)+(day.cityName?' — '+day.cityName:'');
    if(day.date){var dl=fmtDate(day.date);if(dl)dayTitle+=' | '+dl;}
    h+='<div class="day"><div class="day-title">'+dayTitle+'</div>';
    var cur=day.startH*60+day.startM;
    day.stops.forEach(function(stop,si){
      var cfg=CAT_CONFIG[stop.cat]||CAT_CONFIG.outro;
      var gmLink=mapsLink(stop.lat,stop.lng);
      h+='<div class="stop">';
      h+='<div class="time">'+fmt(cur)+'<br>'+fmt(cur+stop.duration)+'</div>';
      h+='<div class="stop-body">';
      h+='<a class="stop-name" href="'+gmLink+'" target="_blank">'+stop.name+'</a>';
      h+='<div class="stop-cat">'+cfg.emoji+' '+cfg.label+'</div>';
      if(stop.desc)h+='<div class="stop-desc">'+stop.desc+'</div>';
      if(stop.note)h+='<div class="stop-note">📝 '+stop.note+'</div>';
      h+='</div></div>';
      cur+=stop.duration;
      if(si<day.stops.length-1&&stop.travelMin>0){
        h+='<div class="travel">↓ '+stop.travelMin+' min a pé · '+stop.distKm+' km</div>';
        cur+=stop.travelMin;
      }
    });
    h+='</div>';
  });
  h+='<div style="margin-top:40px;padding:16px;background:#fffdf5;border:1px solid #f0d080;border-radius:8px;font-size:11px;color:#666;line-height:1.6;">';
  h+='<b style="color:#000;">⚠️ Aviso importante</b><br><br>';
  h+='O <b>Roteiro Fácil</b> é uma ferramenta de apoio ao planejamento de viagens e não substitui a verificação pessoal de cada informação. ';
  h+='Os roteiros gerados são <b>sugestões automáticas</b> baseadas nos locais selecionados. Sempre confirme antes da viagem: horários de funcionamento, disponibilidade e necessidade de reserva antecipada, tempo real de deslocamento, condições climáticas e sazonais, valores de ingresso e formas de pagamento.<br><br>';
  h+='A <b>@entregatosemalas</b> não se responsabiliza por informações desatualizadas, locais fechados, alterações de rota ou qualquer inconveniente decorrente do uso deste roteiro sem verificação prévia.<br>';
  h+='<em>Este app é um ponto de partida — a experiência final depende da sua pesquisa e planejamento.</em>';
  h+='</div>';
  h+='</body></html>';
  w.document.write(h);w.document.close();
  setTimeout(function(){w.print();},500);
}

// ── HOTEL ASSIGN POPUP ────────────────────────────────────
function openHotelAssignPopup(stop,fromDi){
  _pendingHotelStop=stop;_pendingHotelFromDi=fromDi;
  var body=document.getElementById('hotel-assign-body');
  var actions=document.getElementById('hotel-assign-actions');
  document.getElementById('hotel-assign-name').textContent=stop.name;
  body.innerHTML='';actions.innerHTML='';

  // Default check-in: data do dia de referência (se existir)
  var defCheckin='';
  if(fromDi>=0&&itin[fromDi]&&itin[fromDi].date)defCheckin=itin[fromDi].date;

  body.innerHTML=
    '<p style="font-size:13px;color:#545454;margin-bottom:14px;">As datas serão aplicadas automaticamente aos dias correspondentes do roteiro.</p>'+
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px;">'+
      '<div><div class="lbl">Check-in</div><input type="date" id="hotel-checkin" style="width:100%;" value="'+defCheckin+'"></div>'+
      '<div><div class="lbl">Check-out</div><input type="date" id="hotel-checkout" style="width:100%;"></div>'+
    '</div>'+
    '<div id="hotel-nights-info" style="display:none;font-size:12px;color:#16a085;background:#f0fff8;border:1px solid #b2dfdb;border-radius:8px;padding:8px 12px;margin-bottom:4px;"></div>'+
    '<div id="hotel-date-err" style="display:none;font-size:12px;color:#E74C3C;margin-top:4px;"></div>';

  function updateNightsInfo(){
    var cin=document.getElementById('hotel-checkin').value;
    var cout=document.getElementById('hotel-checkout').value;
    var info=document.getElementById('hotel-nights-info');
    var err=document.getElementById('hotel-date-err');
    if(!info)return;
    err.style.display='none';
    if(cin&&cout){
      var nights=Math.round((new Date(cout)-new Date(cin))/86400000);
      if(nights<=0){info.style.display='none';err.textContent='Check-out deve ser após o check-in.';err.style.display='block';}
      else{
        var startDi=fromDi>=0?fromDi:0;
        var covered=Math.min(nights,itin.length-startDi);
        info.innerHTML='🌙 <b>'+nights+' noite'+(nights>1?'s':'')+'</b> — cobre <b>'+covered+' dia'+(covered>1?'s':'')+'</b> do roteiro';
        info.style.display='block';
      }
    }else{info.style.display='none';}
  }
  setTimeout(function(){
    var ci=document.getElementById('hotel-checkin'),co=document.getElementById('hotel-checkout');
    if(ci)ci.addEventListener('input',updateNightsInfo);
    if(co)co.addEventListener('input',updateNightsInfo);
    updateNightsInfo();
  },0);

  var cancelBtn=document.createElement('button');
  cancelBtn.className='ghost';cancelBtn.textContent='Cancelar';
  cancelBtn.onclick=closeHotelAssignPopup;
  actions.appendChild(cancelBtn);

  var confirmBtn=document.createElement('button');
  confirmBtn.className='primary';confirmBtn.textContent='Adicionar hotel';
  confirmBtn.onclick=function(){
    var cin=document.getElementById('hotel-checkin').value;
    var cout=document.getElementById('hotel-checkout').value;
    var err=document.getElementById('hotel-date-err');
    if(!cin||!cout){err.textContent='Informe as datas de check-in e check-out.';err.style.display='block';return;}
    var nights=Math.round((new Date(cout)-new Date(cin))/86400000);
    if(nights<=0){err.textContent='Check-out deve ser após o check-in.';err.style.display='block';return;}
    // Busca o dia cuja data coincide com o check-in (matching por data)
    var startDi=fromDi>=0?fromDi:0;
    var matchDi=-1;
    itin.forEach(function(day,di){if(day.date===cin)matchDi=di;});
    if(matchDi>=0){
      startDi=matchDi;
    }else if(startDi>0&&itin[startDi-1]&&
       itin[startDi-1].stops.some(function(s){return s.cat==='aeroporto-chegada';})&&
       (!itin[startDi-1].date||itin[startDi-1].date===cin)){
      // Fallback: dia anterior tem aeroporto de chegada e combina com check-in
      startDi=startDi-1;
    }
    var dayIndices=[];
    for(var i=0;i<nights&&(startDi+i)<itin.length;i++)dayIndices.push(startDi+i);
    if(!dayIndices.length){err.textContent='Nenhum dia do roteiro cobre esse período.';err.style.display='block';return;}
    // Aplica as datas nos dias correspondentes e marca como bloco de hotel
    // Usa UTC para evitar deslocamento de fuso horário
    var groupId=stop.name+'_'+Date.now();
    var cinParts=cin.split('-');
    var baseUTC=Date.UTC(parseInt(cinParts[0]),parseInt(cinParts[1])-1,parseInt(cinParts[2]));
    for(var j=0;j<dayIndices.length;j++){
      var ms=baseUTC+j*86400000;
      var dd=new Date(ms);
      itin[dayIndices[j]].date=dd.getUTCFullYear()+'-'+String(dd.getUTCMonth()+1).padStart(2,'0')+'-'+String(dd.getUTCDate()).padStart(2,'0');
      itin[dayIndices[j]].hotelGroup=groupId;
    }
    applyHotelToDays(dayIndices);
  };
  actions.appendChild(confirmBtn);
  document.getElementById('hotel-assign-overlay').classList.add('on');
}

function applyHotelToDays(dayIndices){
  var stop=_pendingHotelStop;
  if(!stop){closeHotelAssignPopup();return;}

  var hotelStop={name:stop.name,lat:stop.lat,lng:stop.lng,duration:0,cat:'hotel',
    desc:stop.desc||'Hospedagem',note:stop.note||'',descLoading:false,travelMin:0,distKm:'0.00',manual:false};

  // Intervenção mínima: insere o hotel em cada dia do bloco sem redistribuir paradas
  // de outros dias — evita apagar hotéis ou paradas já existentes
  dayIndices.forEach(function(di){
    if(di<0||di>=itin.length)return;
    var existing=itin[di].stops;
    // Remove hotel anterior do mesmo dia (se houver) antes de inserir o novo
    var arrPart=existing.filter(function(s){return s.cat==='aeroporto-chegada';});
    var regular=existing.filter(function(s){return !isAirportCat(s.cat)&&s.cat!=='hotel';});
    var depPart=existing.filter(function(s){return s.cat==='aeroporto-saida'||s.cat==='aeroporto';});
    // Ordem: chegada → hotel → paradas regulares → saída
    itin[di].stops=arrPart.concat([hotelStop]).concat(regular).concat(depPart);
    recalcTravel(di);
  });

  sortItinByDate();
  updateHotelBanner();renderTL();renderMap();
  closeHotelAssignPopup();

  // Popup de confirmação
  var overlay=document.getElementById('hotel-success-overlay');
  var msg=document.getElementById('hotel-success-msg');
  if(overlay&&msg){
    msg.textContent='🏨 "'+stop.name+'" adicionado a '+dayIndices.length+' dia(s). Paradas desses dias foram preservadas.';
    overlay.style.display='flex';
  }
}

function closeHotelAssignPopup(){
  _pendingHotelStop=null;_pendingHotelFromDi=-1;
  document.getElementById('hotel-assign-overlay').classList.remove('on');
}

// ── AIRPORT DATE POPUP ────────────────────────────────────
function openAirportDatePopup(which,targetDi){
  var isArr=which==='chegada';
  var title=document.getElementById('hotel-assign-title');
  var nameEl=document.getElementById('hotel-assign-name');
  var body=document.getElementById('hotel-assign-body');
  var actions=document.getElementById('hotel-assign-actions');
  if(title)title.textContent=isArr?'🛬 Aeroporto de Chegada':'🛫 Aeroporto de Saída';
  nameEl.textContent=isArr?'Qual a data de chegada ao Japão?':'Qual a data do voo de volta?';
  body.innerHTML=
    '<div class="lbl">'+(isArr?'Data de chegada':'Data de saída')+'</div>'+
    '<input type="date" id="airport-date-inp" style="width:100%;margin-top:6px;" value="'+(itin[targetDi]&&itin[targetDi].date?itin[targetDi].date:'')+'">';
  actions.innerHTML='';

  var skipBtn=document.createElement('button');
  skipBtn.className='ghost';skipBtn.textContent='Pular';
  skipBtn.onclick=function(){
    var t=document.getElementById('hotel-assign-title');
    if(t)t.textContent='🏨 Atribuir hospedagem';
    document.getElementById('hotel-assign-overlay').classList.remove('on');
  };
  actions.appendChild(skipBtn);

  var confirmBtn=document.createElement('button');
  confirmBtn.className='primary';confirmBtn.textContent='Confirmar data';
  confirmBtn.onclick=function(){
    var val=document.getElementById('airport-date-inp').value;
    var t=document.getElementById('hotel-assign-title');
    if(val&&targetDi>=0&&targetDi<itin.length){
      itin[targetDi].date=val;
      sortItinByDate();
      renderTL();renderMap();
    }
    if(t)t.textContent='🏨 Atribuir hospedagem';
    document.getElementById('hotel-assign-overlay').classList.remove('on');
  };
  actions.appendChild(confirmBtn);
  document.getElementById('hotel-assign-overlay').classList.add('on');
}

function updateHotelBanner(){
  var banner=document.getElementById('hotel-banner'),info=document.getElementById('hotel-info'),btn=document.getElementById('btn-add-hotel');
  // Agrupa por nome de hotel para evitar repetição
  var hotelMap={};
  itin.forEach(function(day,di){
    day.stops.forEach(function(s){
      if(s.cat==='hotel'){
        if(!hotelMap[s.name])hotelMap[s.name]={name:s.name,cities:[],days:[]};
        if(day.cityName&&hotelMap[s.name].cities.indexOf(day.cityName)<0)hotelMap[s.name].cities.push(day.cityName);
        hotelMap[s.name].days.push(di);
      }
    });
  });
  var uniqueHotels=Object.keys(hotelMap).map(function(k){return hotelMap[k];});
  if(!uniqueHotels.length&&hotel)uniqueHotels=[{name:hotel.name,cities:[],days:[]}];
  if(uniqueHotels.length){
    banner.style.display='';
    banner.classList.add('has-hotel');
    info.innerHTML=uniqueHotels.map(function(h){
      var parts=['<b>'+h.name+'</b>'];
      if(h.days.length>1)parts.push('<span style="color:#999;font-size:11px;">'+h.days.length+' noites</span>');
      if(h.cities.length)parts.push('<span style="color:#999;font-size:11px;">· '+h.cities.join(', ')+'</span>');
      return parts.join(' ');
    }).join('<br style="margin:2px 0;">');
    if(btn)btn.style.display='none';
    var hasAssigned=uniqueHotels.some(function(h){return h.days.length>0;});
    var optBtn=document.getElementById('btn-optimize-hotels');
    if(optBtn)optBtn.style.display=hasAssigned?'inline-flex':'none';
  }else{
    banner.style.display='none'; // sem hospedagem → não ocupa espaço
    var optBtn2=document.getElementById('btn-optimize-hotels');
    if(optBtn2)optBtn2.style.display='none';
  }
}

// ── SAVE / LOAD (arquivo JSON) ────────────────────────────
// ── AUTO-SAVE / RASCUNHO ──────────────────────────────────
var _pendingDraft=null;
var _draftSaveTimer=null;
function _scheduleDraftSave(){
  clearTimeout(_draftSaveTimer);
  _draftSaveTimer=setTimeout(function(){
    if(!user||!itin||!itin.length)return;
    try{
      var d={itin:itin,airports:airports,cities:cities,hotel:hotel,
        savedAt:new Date().toISOString(),userName:user.name,userEmail:user.email};
      localStorage.setItem('roteiro_rascunho_'+user.email.toLowerCase(),JSON.stringify(d));
    }catch(e){}
  },2000);
}

function showDraftModal(draft){
  var ts=draft.savedAt?new Date(draft.savedAt).toLocaleString('pt-BR'):'';
  var days=draft.itin?draft.itin.length:0;
  var msg=document.getElementById('draft-msg');
  if(msg)msg.textContent='Você tem um roteiro de '+days+' dia'+(days===1?'':'s')+' salvo'+(ts?' em '+ts:'')+'.';
  var overlay=document.getElementById('draft-overlay');
  if(overlay)overlay.style.display='flex';
}

function restoreDraft(){
  var overlay=document.getElementById('draft-overlay');
  if(overlay)overlay.style.display='none';
  if(!_pendingDraft)return;
  itin=_pendingDraft.itin||[];
  airports=_pendingDraft.airports||{arrival:null,departure:null};
  cities=_pendingDraft.cities||[];
  hotel=_pendingDraft.hotel||null;
  _pendingDraft=null;
  show('s-res');
  document.getElementById('uname2').textContent=user?user.name:'';
  if(mapObj){mapObj.remove();mapObj=null;}
  document.getElementById('v-map').style.display='none';
  document.getElementById('v-tl').style.display='block';
  document.getElementById('tb-tl').classList.add('on');document.getElementById('tb-map').classList.remove('on');
  renderTL();updateHotelBanner();updateDayCityNames();
}

function discardDraft(){
  var overlay=document.getElementById('draft-overlay');
  if(overlay)overlay.style.display='none';
  if(user)try{localStorage.removeItem('roteiro_rascunho_'+user.email.toLowerCase());}catch(e){}
  _pendingDraft=null;
  goStep(1);show('s-wizard');
}

function saveRoteiro(){
  if(!user)return;
  var data={itin:itin,airports:airports,cities:cities,hotel:hotel,
    savedAt:new Date().toISOString(),userName:user.name,userEmail:user.email};
  var json=JSON.stringify(data,null,2);
  // Backup silencioso no localStorage
  try{localStorage.setItem('roteiro_bkp_'+user.email,json);}catch(e){}
  // Download do arquivo
  var nome=(user.name||'roteiro').replace(/\s+/g,'-').toLowerCase();
  var data_=new Date().toISOString().split('T')[0];
  var blob=new Blob([json],{type:'application/json'});
  var url=URL.createObjectURL(blob);
  var a=document.createElement('a');
  a.href=url;a.download='roteiro-'+nome+'-'+data_+'.json';
  document.body.appendChild(a);a.click();
  document.body.removeChild(a);URL.revokeObjectURL(url);
  showSaveStatus('✅ Arquivo salvo na pasta Downloads!','#16a085');
}

function loadRoteiro(){
  var input=document.createElement('input');
  input.type='file';input.accept='.json';
  input.onchange=function(e){
    var file=e.target.files[0];if(!file)return;
    var reader=new FileReader();
    reader.onload=function(ev){
      try{
        var data=JSON.parse(ev.target.result);
        if(!data.itin&&!data.cities){alert('Arquivo inválido. Selecione um .json gerado pelo Roteiro Fácil.');return;}
        itin=data.itin||[];
        airports=data.airports||{arrival:null,departure:null};
        cities=data.cities||[];
        hotel=data.hotel||null;
        show('s-res');
        document.getElementById('uname2').textContent=user?user.name:'';
        if(mapObj){mapObj.remove();mapObj=null;}
        document.getElementById('v-map').style.display='none';
        document.getElementById('v-tl').style.display='block';
        document.getElementById('tb-tl').classList.add('on');document.getElementById('tb-map').classList.remove('on');
        renderTL();updateHotelBanner();updateDayCityNames();
        var ts=data.savedAt?new Date(data.savedAt).toLocaleString('pt-BR'):'';
        showSaveStatus('✅ Roteiro carregado'+(ts?' (salvo em '+ts+')':''),'#16a085');
      }catch(err){alert('Erro ao ler o arquivo. Certifique-se de que é um .json válido.');}
    };
    reader.readAsText(file);
  };
  input.click();
}

function showSaveStatus(msg,color){
  var el=document.getElementById('save-status');
  if(!el)return;
  el.textContent=msg;el.style.color=color||'#545454';el.style.display='inline';
  clearTimeout(window._saveStatusTimer);
  window._saveStatusTimer=setTimeout(function(){if(el)el.style.display='none';},5000);
}
