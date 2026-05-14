// ── SWAP DAYS (Funcionalidade 2) ─────────────────────────
function swapDays(di,direction){
  if(typeof undoStack!=='undefined')pushUndo();
  var other=direction==='up'?di-1:di+1;
  if(other<0||other>=itin.length)return;
  // Datas e hotelGroup pertencem à POSIÇÃO no calendário, não ao conteúdo.
  // Salva os valores posicionais antes de trocar.
  var dateA=itin[di].date,    groupA=itin[di].hotelGroup;
  var dateB=itin[other].date, groupB=itin[other].hotelGroup;
  // Troca os objetos (paradas, cidade, cores, etc.)
  var tmp=itin[di];itin[di]=itin[other];itin[other]=tmp;
  // Restaura datas e grupos às posições originais
  itin[di].date=dateA;    itin[di].hotelGroup=groupA;
  itin[other].date=dateB; itin[other].hotelGroup=groupB;
  renderTL();renderMap();
}

// ── SEARCH ITIN (Funcionalidade 3) ──────────────────────
function searchItin(q){
  document.querySelectorAll('.stop-card').forEach(function(c){c.classList.remove('search-highlight');});
  var noRes=document.getElementById('search-itin-nores');
  if(noRes)noRes.style.display='none';
  if(!q||q.length<2)return;
  var qn=q.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
  var found=[];
  itin.forEach(function(day,di){
    day.stops.forEach(function(stop,si){
      var sn=stop.name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
      if(sn.indexOf(qn)>=0){found.push({di:di,si:si});}
    });
  });
  if(!found.length){
    if(noRes)noRes.style.display='block';
    return;
  }
  found.forEach(function(f){
    var card=document.querySelector('.stop-card[data-di="'+f.di+'"][data-si="'+f.si+'"]');
    if(card)card.classList.add('search-highlight');
  });
  var firstCard=document.querySelector('.stop-card[data-di="'+found[0].di+'"][data-si="'+found[0].si+'"]');
  if(firstCard)firstCard.scrollIntoView({behavior:'smooth',block:'center'});
  clearTimeout(_searchItinT);
  _searchItinT=setTimeout(function(){
    document.querySelectorAll('.stop-card').forEach(function(c){c.classList.remove('search-highlight');});
  },3000);
}

// Funcionalidade 9: adiciona um novo dia à cidade
function addDayToCity(cityIdx){
  if(typeof pushUndo==='function')pushUndo();
  var lastIdx=-1,template=null;
  for(var i=0;i<itin.length;i++){
    if(itin[i].cityIdx===cityIdx){lastIdx=i;template=itin[i];}
  }
  if(lastIdx<0||!template)return;
  var newDay={
    routeColor:template.routeColor||DEFAULT_ROUTE_COLORS[0],
    pinColor:template.pinColor||DEFAULT_PIN_COLORS[0],
    startH:9,startM:0,endH:21,endM:0,date:'',stops:[],geo:null,
    cityName:template.cityName||'',cityIdx:cityIdx,hotelGroup:null
  };
  itin.splice(lastIdx+1,0,newDay);
  // reaplica cores em ordem
  itin.forEach(function(day,di){
    day.routeColor=DEFAULT_ROUTE_COLORS[di%DEFAULT_ROUTE_COLORS.length];
    day.pinColor=DEFAULT_PIN_COLORS[di%DEFAULT_PIN_COLORS.length];
  });
  renderTL();renderMap();
}

// ── COLOR PICKERS ─────────────────────────────────────────
function renderDayColorPickers(){
  var container=document.getElementById('day-color-pickers');if(!container)return;
  container.innerHTML='';
  itin.forEach(function(day,di){
    var wrap=document.createElement('div');wrap.style.cssText='display:flex;align-items:center;gap:4px;background:#f9f0f1;border-radius:8px;padding:4px 8px;';
    wrap.innerHTML='<span style="font-size:11px;font-weight:600;color:#545454;">Dia '+(di+1)+'</span>'
      +'<div style="display:flex;align-items:center;gap:3px;font-size:10px;color:#888;">Rota<input type="color" value="'+day.routeColor+'" data-di="'+di+'" data-t="r" class="dclr" style="width:22px;height:22px;border:1px solid #ddd;border-radius:4px;padding:1px;cursor:pointer;" title="Cor da rota"></div>'
      +'<div style="display:flex;align-items:center;gap:3px;font-size:10px;color:#888;">Pins<input type="color" value="'+day.pinColor+'" data-di="'+di+'" data-t="p" class="dclr" style="width:22px;height:22px;border:1px solid #ddd;border-radius:4px;padding:1px;cursor:pointer;" title="Cor dos pins"></div>';
    container.appendChild(wrap);
  });
  container.querySelectorAll('.dclr').forEach(function(el){
    el.addEventListener('input',function(){var di=parseInt(this.getAttribute('data-di'));if(this.getAttribute('data-t')==='r')itin[di].routeColor=this.value;else itin[di].pinColor=this.value;renderMap();});
  });
}

// ── RENDER TL ─────────────────────────────────────────────
function renderTL(){
  var c=document.getElementById('tlc');if(!c)return;
  renderDayColorPickers();
  var html='';
  itin.forEach(function(day,di){
    var tkm=0,tmin=0;
    day.stops.forEach(function(s,si){tmin+=s.duration;if(si<day.stops.length-1){tmin+=s.travelMin||0;tkm+=parseFloat(s.distKm)||0;}});
    var hh=Math.floor(tmin/60),mm=tmin%60;
    var dur=(hh>0?hh+'h ':'')+(mm+'min');
    var col=day.pinColor||day.routeColor||'#E74C3C';
    var tv=(day.startH<10?'0':'')+day.startH+':'+(day.startM<10?'0':'')+day.startM;
    var evEnd=(day.endH<10?'0':'')+day.endH+':'+(day.endM<10?'0':'')+day.endM;
    var dateLabel=day.date?fmtDate(day.date):'';
    var dayEndMin=day.startH*60+day.startM+tmin,limitMin=(day.endH||21)*60+(day.endM||0),overDay=dayEndMin>limitMin;
    var collapsed=day.collapsed?'collapsed':'';

    // City separator
    if(di>0&&day.cityName&&itin[di-1].cityName&&day.cityName!==itin[di-1].cityName){
      var addBtnHtml=(day.cityIdx!==undefined&&day.cityIdx!==-1)?'<button class="add-day-btn" data-add-day="'+day.cityIdx+'">+ Dia</button>':'';
      html+='<div class="city-sep" style="display:flex;align-items:center;justify-content:center;gap:10px;">― Chegando em '+day.cityName+' ―'+addBtnHtml+'</div>';
    }else if(di===0&&day.cityName&&day.cityIdx!==undefined&&day.cityIdx!==-1){
      html+='<div class="city-sep" style="display:flex;align-items:center;justify-content:center;gap:10px;">― '+day.cityName+' ―<button class="add-day-btn" data-add-day="'+day.cityIdx+'">+ Dia</button></div>';
    }

    // Check city jump warning (last stop prev day → first stop this day)
    var jumpWarnHtml='';
    if(di>0&&itin[di-1].stops.length&&day.stops.length){
      var prevLast=itin[di-1].stops[itin[di-1].stops.length-1];
      var nextFirst=day.stops[0];
      if(prevLast&&nextFirst){
        var jumpKm=hav(prevLast.lat,prevLast.lng,nextFirst.lat,nextFirst.lng);
        if(jumpKm>40)jumpWarnHtml='<div class="jump-warn">🚅 Transfer de ~'+jumpKm.toFixed(0)+'km entre dias</div>';
      }
    }
    html+=jumpWarnHtml;

    var _activePts=day.stops.filter(function(s){return !isAirportCat(s.cat)&&s.cat!=='hotel';});
    var overloadBtn=_activePts.length>8?'<button onclick="event.stopPropagation();openOverloadPopup('+di+')" style="font-size:11px;padding:2px 8px;background:#E74C3C;color:#fff;border:none;border-radius:5px;cursor:pointer;margin-left:6px;">⚠️ Muitas paradas</button>':'';

    html+='<div class="day-block '+collapsed+'" data-di="'+di+'">';
    html+='<div class="day-header" onclick="toggleDay('+di+')">';
    html+='<div style="width:13px;height:13px;border-radius:50%;background:'+col+';flex-shrink:0;box-shadow:0 0 0 3px rgba(231,76,60,.15);"></div>';
    html+='<div style="flex:1;">';
    html+='<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">';
    html+='<span style="font-weight:700;font-size:15px;">Dia '+(di+1)+(day.cityName?' — '+day.cityName:'')+'</span>';
    html+='<input type="date" value="'+(day.date||'')+'" data-di="'+di+'" class="date-input" onclick="event.stopPropagation();" style="font-size:12px;padding:3px 8px;border:1px solid #E8B4B8;border-radius:6px;background:#fff;width:auto;">';
    if(dateLabel)html+='<span style="font-size:12px;color:#545454;font-style:italic;">'+dateLabel+'</span>';
    html+='</div>';
    var overDayWarn=overDay?' &middot; <b>⚠️ Passa das '+fmt(limitMin)+'</b>':'';
    html+='<div style="font-size:11px;color:'+(overDay?'#E74C3C':'#999')+';margin-top:2px;">'+day.stops.length+' paradas &middot; '+tkm.toFixed(1)+' km &middot; ~'+dur+overDayWarn+overloadBtn+'</div>';
    html+='</div>';
    html+='<div style="display:flex;align-items:center;gap:8px;flex-shrink:0;flex-wrap:wrap;" onclick="event.stopPropagation();">';
    html+='<div style="display:flex;align-items:center;gap:4px;"><span style="font-size:12px;color:#545454;">In&iacute;cio</span><input type="time" value="'+tv+'" data-di="'+di+'" class="start-input" style="font-size:12px;padding:3px 8px;width:80px;border:1px solid #E8B4B8;border-radius:6px;background:#fff;"></div>';
    html+='<div style="display:flex;align-items:center;gap:4px;"><span style="font-size:12px;color:#545454;">T&eacute;rmino</span><input type="time" value="'+evEnd+'" data-di="'+di+'" class="end-input" style="font-size:12px;padding:3px 8px;width:80px;border:1px solid #E8B4B8;border-radius:6px;background:#fff;"></div>';
    html+='<button onclick="openDayHotelModal('+di+')" title="Adicionar hospedagem neste dia" style="font-size:11px;padding:3px 9px;border:1px solid #E8B4B8;border-radius:6px;background:#fff;cursor:pointer;color:#E74C3C;white-space:nowrap;">🏨</button>';
    html+='<button class="swap-btn" data-di="'+di+'" data-dir="up" title="Mover dia para cima"'+(di===0?' disabled':'')+'>↑</button>';
    html+='<button class="swap-btn" data-di="'+di+'" data-dir="down" title="Mover dia para baixo"'+(di===itin.length-1?' disabled':'')+'>↓</button>';
    html+='<span style="font-size:14px;color:#999;">'+(day.collapsed?'▾':'▴')+'</span>';
    html+='</div></div>';
    html+='<div class="day-stops">';
    if(_activePts.length<2&&!day.collapsed){
      html+='<div style="margin:6px 0 10px;padding:9px 13px;background:#fff9f0;border:1px solid #f0d080;border-radius:8px;font-size:12px;color:#856404;">⚠️ Dia com poucas paradas — considere adicionar mais locais ou redistribuir entre os dias.</div>';
    }
    day.stops.forEach(function(stop,si){
      var t=stopTime(di,si),isLast=si===day.stops.length-1;
      var cfg=CAT_CONFIG[stop.cat]||CAT_CONFIG.outro;
      var timeColor=t.overLimit?'#E74C3C':'#545454';
      var _isAir=stop.cat==='aeroporto'||stop.cat==='aeroporto-chegada'||stop.cat==='aeroporto-saida';
      var extraClass=(stop.cat==='hotel'?' hotel-card':_isAir?' airport-card':'');
      html+='<div class="stop-card'+extraClass+'" draggable="true" data-di="'+di+'" data-si="'+si+'">';
      html+='<div class="stop-inner">';
      html+='<div class="drag-handle" title="Arrastar">⠿</div>';
      html+='<div style="flex:1;"><div class="stop-content">';
      html+='<div class="stop-name-row">';
      html+='<div style="display:flex;align-items:center;flex-wrap:wrap;gap:4px;">';
      html+='<a href="'+mapsLink(stop.lat,stop.lng)+'" target="_blank" class="stop-name">'+stop.name+'</a>';
      html+='<span class="cat-badge" style="background:'+cfg.bg+';color:'+cfg.color+';">'+cfg.emoji+' '+cfg.label+'</span>';
      if(t.overLimit)html+='<span style="font-size:10px;color:#E74C3C;font-weight:600;">⚠️</span>';
      html+='</div>';
      html+='<div class="time-badge"><div class="time-lbl" style="color:'+timeColor+';">'+fmt(t.s)+'</div><div class="time-lbl" style="color:'+timeColor+';font-weight:'+(t.overLimit?700:400)+';">'+fmt(t.e)+'</div></div>';
      html+='<div class="wiki-photo-slot" data-di="'+di+'" data-si="'+si+'"></div>';
      html+='</div>';
      if(stop.descLoading){html+='<div id="d-'+di+'-'+si+'" class="stop-desc"><span class="shimmer"></span></div>';}
      else{html+='<div id="d-'+di+'-'+si+'" class="stop-desc">'+(stop.desc||'<em style="color:#ccc;font-size:11px;">Sem descri&ccedil;&atilde;o.</em>')+'</div>';}
      if(stop.note){
        html+='<div class="stop-note-area"><div class="note-lbl">📝 Minhas observa&ccedil;&otilde;es</div>';
        html+='<textarea class="note-input" data-di="'+di+'" data-si="'+si+'" placeholder="Hor&aacute;rio, o que pedir, ingressos...">'+stop.note+'</textarea></div>';
      }else{
        html+='<div class="stop-note-empty"><textarea class="note-input" data-di="'+di+'" data-si="'+si+'" placeholder="📝 nota..." rows="1"></textarea></div>';
      }
      html+='<div class="stop-ctrls">';
      html+='<div class="dur-wrap"><input type="number" min="0" max="720" value="'+stop.duration+'" data-di="'+di+'" data-si="'+si+'" class="dur-input"><span>min</span></div>';
      if(stop.cat!=='aeroporto'){
        html+='<select data-di="'+di+'" data-si="'+si+'" class="cat-select">';
        Object.keys(CAT_CONFIG).forEach(function(k){if(k==='aeroporto')return;var cfg2=CAT_CONFIG[k];html+='<option value="'+k+'"'+(stop.cat===k?' selected':'')+'>'+cfg2.emoji+' '+cfg2.label+'</option>';});
        html+='</select>';
      }
      if(itin.length>1){html+='<select data-di="'+di+'" data-si="'+si+'" class="mv-select"><option value="">Mover...</option>';itin.forEach(function(_,dj){if(dj!==di)html+='<option value="'+dj+'">Dia '+(dj+1)+'</option>';});html+='</select>';}
      html+='<button class="ghost rm-btn" data-di="'+di+'" data-si="'+si+'" style="font-size:11px;padding:3px 10px;color:#E74C3C;border-color:#E8B4B8;">✕</button>';
      html+='</div></div></div></div></div>';
      if(!isLast&&stop.travelMin>0){
        var carSlow=stop.travelMinCarSlow||stop.travelMinCar||stop.travelMin;
        var tkColor=carSlow>45?'#e67e22':'#bbb';
        var ttype=stop.transportType||(parseFloat(stop.distKm)>=30?'transport':'walk');
        var ttypeLabel=ttype==='walk'
          ?'<span style="color:'+tkColor+';">'+stop.travelMin+' min a pé &middot; '+stop.distKm+' km</span>'
          :'<span style="color:#E74C3C;font-weight:600;">~'+stop.travelMin+' min de transporte &middot; '+stop.distKm+' km</span>';
        html+='<div class="travel-row"><span style="color:'+col+';font-size:14px;">↓</span> '+ttypeLabel+'</div>';
      }
    });
    html+='</div></div>';
  });
  c.innerHTML=html;
  bindTLEvents();
}
function toggleDay(di){if(itin[di])itin[di].collapsed=!itin[di].collapsed;renderTL();}

function bindTLEvents(){
  document.querySelectorAll('.stop-card').forEach(function(card){
    var di=parseInt(card.getAttribute('data-di')),si=parseInt(card.getAttribute('data-si'));
    card.addEventListener('dragstart',function(e){onDragStart(e,di,si);});
    card.addEventListener('dragend',onDragEnd);
    card.addEventListener('dragover',function(e){onDragOver(e,di,si);});
    card.addEventListener('drop',function(e){onDrop(e,di,si);});
  });
  document.querySelectorAll('.date-input').forEach(function(el){el.addEventListener('change',function(){
    var di=parseInt(this.getAttribute('data-di'));
    var oldGroup=itin[di].hotelGroup;
    itin[di].date=this.value;
    itin[di].hotelGroup=null;
    if(oldGroup)itin.forEach(function(day){if(day.hotelGroup===oldGroup)day.hotelGroup=null;});
    // Calendário encadeado: preenche dias seguintes sem hotelGroup
    if(this.value){
      var parts=this.value.split('-');
      var baseUTC=Date.UTC(parseInt(parts[0]),parseInt(parts[1])-1,parseInt(parts[2]));
      var offset=1;
      for(var nx=di+1;nx<itin.length;nx++){
        if(!itin[nx].hotelGroup){
          var ms=baseUTC+offset*86400000;
          var dd=new Date(ms);
          itin[nx].date=dd.getUTCFullYear()+'-'+String(dd.getUTCMonth()+1).padStart(2,'0')+'-'+String(dd.getUTCDate()).padStart(2,'0');
        }
        offset++;
      }
    }
    sortItinByDate();renderTL();renderMap();
  });});
  document.querySelectorAll('.start-input').forEach(function(el){el.addEventListener('change',function(){var di=parseInt(this.getAttribute('data-di')),p=this.value.split(':');itin[di].startH=parseInt(p[0])||9;itin[di].startM=parseInt(p[1])||0;renderTL();});});
  document.querySelectorAll('.end-input').forEach(function(el){el.addEventListener('change',function(){var di=parseInt(this.getAttribute('data-di')),p=this.value.split(':');itin[di].endH=parseInt(p[0])||21;itin[di].endM=parseInt(p[1])||0;renderTL();});});
  document.querySelectorAll('.dur-input').forEach(function(el){el.addEventListener('change',function(){var di=parseInt(this.getAttribute('data-di')),si=parseInt(this.getAttribute('data-si'));itin[di].stops[si].duration=Math.max(0,parseInt(this.value)||0);renderTL();});});
  document.querySelectorAll('.cat-select').forEach(function(el){el.addEventListener('change',function(){
    pushUndo();
    var di=parseInt(this.getAttribute('data-di')),si=parseInt(this.getAttribute('data-si'));
    var newCat=this.value;
    itin[di].stops[si].cat=newCat;
    if(newCat==='aeroporto-chegada'){
      var aerStop=itin[di].stops.splice(si,1)[0];
      if(di!==0)recalcTravel(di);
      itin[0].stops.unshift(aerStop);
      recalcTravel(0);renderTL();renderMap();
      var toast=document.getElementById('recalc-toast');
      toast.querySelector('span').textContent='🛬 Aeroporto de chegada definido! Deseja reordenar o Dia 1 a partir dele?';
      _hotelRecalcDi=0;toast.style.display='flex';
      openAirportDatePopup('chegada',0);
    }else if(newCat==='aeroporto-saida'){
      var aerStop2=itin[di].stops.splice(si,1)[0];
      var lastDi=itin.length-1;
      if(di!==lastDi)recalcTravel(di);
      itin[lastDi].stops.push(aerStop2);
      recalcTravel(lastDi);renderTL();renderMap();
      var toast=document.getElementById('recalc-toast');
      toast.querySelector('span').textContent='🛫 Aeroporto de saída definido! Deseja reordenar o último dia até ele?';
      _hotelRecalcDi=lastDi;toast.style.display='flex';
      openAirportDatePopup('saida',lastDi);
    }else if(newCat==='aeroporto'){
      var aerStop3=itin[di].stops.splice(si,1)[0];
      if(di===itin.length-1){itin[di].stops.push(aerStop3);}
      else{itin[di].stops.unshift(aerStop3);}
      recalcTravel(di);renderTL();renderMap();
    }else if(newCat==='hotel'){
      var extracted=itin[di].stops.splice(si,1)[0];
      recalcTravel(di);renderTL();renderMap();
      openHotelAssignPopup({name:extracted.name,lat:extracted.lat,lng:extracted.lng,
        desc:extracted.desc||'',note:extracted.note||''},di);
    }else{
      renderTL();renderMap();
      var cfg=CAT_CONFIG[newCat];
      if(cfg&&cfg.idealH!==null){window._catChangedDi=di;var toast2=document.getElementById('cat-toast');toast2.style.display='flex';toast2.scrollIntoView({behavior:'smooth',block:'nearest'});}
    }
  });});
  document.querySelectorAll('.mv-select').forEach(function(el){el.addEventListener('change',function(){
    var fD=parseInt(this.getAttribute('data-di')),si=parseInt(this.getAttribute('data-si')),tD=parseInt(this.value);
    if(isNaN(tD))return;pushUndo();var stop=itin[fD].stops.splice(si,1)[0];itin[tD].stops.push(stop);recalcTravel(fD);recalcTravel(tD);renderTL();renderMap();
  });});
  document.querySelectorAll('.note-input').forEach(function(el){el.addEventListener('input',function(){itin[parseInt(this.getAttribute('data-di'))].stops[parseInt(this.getAttribute('data-si'))].note=this.value;});});
  document.querySelectorAll('.rm-btn').forEach(function(el){el.addEventListener('click',function(){pushUndo();var di=parseInt(this.getAttribute('data-di')),si=parseInt(this.getAttribute('data-si'));itin[di].stops.splice(si,1);recalcTravel(di);renderTL();renderMap();});});
  // Swap day buttons (Funcionalidade 2)
  document.querySelectorAll('.swap-btn').forEach(function(btn){
    btn.addEventListener('click',function(){
      if(this.disabled||this.getAttribute('disabled')!==null)return;
      var di=parseInt(this.getAttribute('data-di'));
      var dir=this.getAttribute('data-dir');
      swapDays(di,dir);
    });
  });
  // Funcionalidade 9: botão "+ Dia" no separador de cidade
  document.querySelectorAll('.add-day-btn').forEach(function(btn){
    btn.addEventListener('click',function(e){
      e.stopPropagation();
      var ci=parseInt(this.getAttribute('data-add-day'));
      if(!isNaN(ci))addDayToCity(ci);
    });
  });
  // Init wiki photo observer (Funcionalidade 5)
  initWikiObserver();
}
