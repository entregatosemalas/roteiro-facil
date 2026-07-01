// ── AUTH ─────────────────────────────────────────────────
async function doLogin(){
  var em=document.getElementById('em').value.trim(),pw=document.getElementById('pw').value,err=document.getElementById('le');
  if(!em||!em.includes('@')){err.textContent='Digite um e-mail válido.';err.style.display='block';return;}
  if(pw.length<4){err.textContent='Senha muito curta.';err.style.display='block';return;}
  err.style.display='none';
  var btn=document.getElementById('btn-login');btn.textContent='Verificando...';btn.disabled=true;
  try{
    var res=await fetch(SUPABASE_URL+'/rest/v1/usuarios_liberados?email=eq.'+encodeURIComponent(em.toLowerCase())+'&liberado=eq.true&select=email,nome',
      {headers:{'apikey':SUPABASE_KEY,'Authorization':'Bearer '+SUPABASE_KEY}});
    var data=await res.json();
    if(!data||!data.length){err.textContent='Acesso não encontrado. Verifique o e-mail ou fale com o suporte.';err.style.display='block';btn.textContent='Entrar';btn.disabled=false;return;}
    user={email:em,name:data[0].nome||em.split('@')[0]};
    document.getElementById('uname').textContent=user.name;
    document.getElementById('uname2').textContent=user.name;
    var _draft=null;
    try{var _raw=localStorage.getItem('roteiro_rascunho_'+em.toLowerCase());if(_raw)_draft=JSON.parse(_raw);}catch(e){}
    if(_draft&&_draft.itin&&_draft.itin.length){
      _pendingDraft=_draft;
      showDraftModal(_draft);
    }else{
      goStep(1);show('s-wizard');
    }
  }catch(e){err.textContent='Erro ao verificar acesso. Tente novamente.';err.style.display='block';}
  btn.textContent='Entrar';btn.disabled=false;
}
function doLogout(){
  user=null;resetWizardState();
  show('s-login');
}

// ── KML ──────────────────────────────────────────────────
function onFile(e){
  var f=e.target.files[0];if(!f)return;
  kmlFile=f;
  // Atualiza a Tela 4 do wizard se estiver aberta
  if(typeof renderWizKml==='function')renderWizKml();
}
function parseKML(txt){
  var doc=new DOMParser().parseFromString(txt,'text/xml'),pts=[];
  doc.querySelectorAll('Placemark').forEach(function(pm){
    var name=(pm.querySelector('name')?.textContent||'Sem nome').trim();
    var descEl=pm.querySelector('description');
    var desc=descEl?descEl.textContent.trim().replace(/<[^>]+>/g,''):'';
    var cEl=pm.querySelector('Point coordinates')||pm.querySelector('coordinates');
    if(!cEl)return;
    var raw=cEl.textContent.trim().split(/[\s\n]+/)[0],parts=raw.split(',').map(Number);
    if(parts.length<2||isNaN(parts[0])||isNaN(parts[1]))return;
    pts.push({name:name,lat:parts[1],lng:parts[0],desc:desc,note:'',cat:'atracao'});
  });
  return pts;
}
function analyzeKML(){
  if(!kmlFile)return;
  kmlFile.text().then(function(txt){
    var pts=parseKML(txt);
    var wrap=document.getElementById('kml-analysis-wrap');
    var content=document.getElementById('kml-analysis-content');
    if(!wrap||!content)return;
    wrap.style.display='block';
    if(!pts.length){content.innerHTML='<div style="color:#E74C3C;font-size:13px;padding:4px 0;">Nenhum ponto encontrado no KML.</div>';return;}
    var cityPtCounts=cities.map(function(){return 0;});
    var unassigned=0;
    pts.forEach(function(pt){
      if(!cities.length){unassigned++;return;}
      var minD=Infinity,bestCi=0;
      cities.forEach(function(city,ci){var d=hav(pt.lat,pt.lng,city.lat,city.lng);if(d<minD){minD=d;bestCi=ci;}});
      if(minD<120)cityPtCounts[bestCi]++;else unassigned++;
    });
    var html='<div style="font-size:12px;font-weight:700;color:#E74C3C;margin-bottom:8px;">'+pts.length+' locais encontrados</div>';
    cities.forEach(function(city,ci){
      var count=cityPtCounts[ci],perDay=city.days>0?(count/city.days).toFixed(1):'—';
      var over=parseFloat(perDay)>7;
      html+='<div class="analysis-row"><span>📍 <b>'+city.name+'</b></span>'
        +'<span style="font-size:12px;color:'+(over?'#E74C3C':'#545454')+';">'+count+' locais · '+city.days+' dia(s) · ~'+perDay+'/dia'+(over?' ⚠️':'')+'</span></div>';
    });
    if(unassigned>0)html+='<div class="analysis-row"><span style="color:#999;">Não identificados</span><span style="color:#999;">'+unassigned+'</span></div>';
    if(!cities.length)html+='<div style="font-size:12px;color:#545454;margin-top:6px;">Adicione cidades no passo 2 para ver a distribuição.</div>';
    content.innerHTML=html;
  });
}

// ── MANUAL PLACES ────────────────────────────────────────
function renderManualList(){
  var c=document.getElementById('manual-items'),w=document.getElementById('manual-list');
  if(!c||!w)return;
  if(!manualPts.length){w.style.display='none';return;}
  w.style.display='block';
  c.innerHTML=manualPts.map(function(p,i){
    var cfg=CAT_CONFIG[p.cat]||CAT_CONFIG.outro;
    return '<div style="display:flex;align-items:center;justify-content:space-between;background:#fdf9f3;border:1px solid #eee;border-radius:8px;padding:8px 12px;">'
      +'<span style="font-size:13px;font-weight:500;">'+cfg.emoji+' '+p.name+'</span>'
      +'<button data-i="'+i+'" class="rm-manual ghost" style="font-size:11px;padding:3px 8px;color:#E74C3C;border-color:#E8B4B8;">✕</button>'
      +'</div>';
  }).join('');
  document.querySelectorAll('.rm-manual').forEach(function(b){b.addEventListener('click',function(){manualPts.splice(parseInt(this.getAttribute('data-i')),1);renderManualList();});});
}

// ── MODAL ─────────────────────────────────────────────────
function openAddModal(target,isHotel){
  addTarget=target||'pre';selectedCat=isHotel?'hotel':'atracao';
  document.querySelectorAll('.cat-pill').forEach(function(p){p.classList.toggle('selected',p.getAttribute('data-cat')===selectedCat);});
  ['search-input','add-name','add-desc','add-note','add-address'].forEach(function(id){var el=document.getElementById(id);if(el)el.value='';});
  document.getElementById('add-lat').value='';document.getElementById('add-lng').value='';
  document.getElementById('search-results').style.display='none';document.getElementById('search-results').innerHTML='';
  document.getElementById('manual-form').style.display='none';document.getElementById('btn-add-confirm').style.display='none';
  document.getElementById('add-err').style.display='none';document.getElementById('geocode-status').textContent='';
  document.getElementById('modal-title').textContent=isHotel?'🏨 Adicionar hospedagem':'📍 Adicionar local';
  document.getElementById('modal-add').classList.add('on');
}
function closeAddModal(){document.getElementById('modal-add').classList.remove('on');}

async function doModalSearch(q){
  try{
    var res=await fetch('https://nominatim.openstreetmap.org/search?q='+encodeURIComponent(q)+'&format=json&limit=5',{headers:{'Accept-Language':'pt-BR,pt;q=0.9'}});
    var data=await res.json();
    var box=document.getElementById('search-results');
    if(!data.length){box.innerHTML='<div class="sr-item" style="color:#999;">Nenhum resultado. Preencha o endereço abaixo.</div>';box.style.display='block';showManualForm('','','','');return;}
    box.innerHTML='';
    data.forEach(function(r){
      var div=document.createElement('div');div.className='sr-item';
      div.innerHTML='<div class="sr-name">'+r.display_name.split(',')[0]+'</div><div class="sr-addr">'+r.display_name+'</div>';
      div.addEventListener('click',function(){
        showManualForm(r.display_name.split(',')[0].trim(),parseFloat(r.lat).toFixed(6),parseFloat(r.lon).toFixed(6),r.display_name);
        box.style.display='none';document.getElementById('search-input').value=r.display_name.split(',')[0].trim();
      });
      box.appendChild(div);
    });
    box.style.display='block';
  }catch(e){showManualForm('','','','');}
}
function showManualForm(name,lat,lng,address){
  document.getElementById('add-name').value=name;
  document.getElementById('add-lat').value=lat;document.getElementById('add-lng').value=lng;
  if(address!==undefined)document.getElementById('add-address').value=address||'';
  if(lat&&lng){document.getElementById('geocode-status').textContent='✅ Localização encontrada';document.getElementById('geocode-status').style.color='#16a085';}
  document.getElementById('manual-form').style.display='block';document.getElementById('btn-add-confirm').style.display='inline-block';
}
async function geocodeAddress(){
  var addr=document.getElementById('add-address').value.trim();
  var status=document.getElementById('geocode-status');
  if(!addr){status.textContent='Digite um endereço primeiro.';status.style.color='#E74C3C';return;}
  status.textContent='Buscando...';status.style.color='#545454';
  try{
    var res=await fetch('https://maps.googleapis.com/maps/api/geocode/json?address='+encodeURIComponent(addr)+'&key='+GKEY+'&language=pt-BR');
    var data=await res.json();
    if(!data.results||!data.results.length){status.textContent='❌ Não encontrado.';status.style.color='#E74C3C';return;}
    var r=data.results[0],loc=r.geometry.location;
    document.getElementById('add-lat').value=loc.lat.toFixed(6);document.getElementById('add-lng').value=loc.lng.toFixed(6);
    if(!document.getElementById('add-name').value)document.getElementById('add-name').value=r.formatted_address.split(',')[0].trim();
    status.textContent='✅ '+r.formatted_address;status.style.color='#16a085';
    document.getElementById('manual-form').style.display='block';document.getElementById('btn-add-confirm').style.display='inline-block';
  }catch(e){status.textContent='❌ Erro ao buscar.';status.style.color='#E74C3C';}
}
function confirmAddLocal(){
  var name=document.getElementById('add-name').value.trim();
  var lat=parseFloat(document.getElementById('add-lat').value);
  var lng=parseFloat(document.getElementById('add-lng').value);
  var desc=document.getElementById('add-desc').value.trim();
  var note=document.getElementById('add-note').value.trim();
  var cat=selectedCat,err=document.getElementById('add-err');
  if(!name){err.textContent='Informe o nome.';err.style.display='block';return;}
  if(isNaN(lat)||isNaN(lng)){err.textContent='Endereço não encontrado. Use "Buscar endereço".';err.style.display='block';return;}
  err.style.display='none';
  if(cat==='aeroporto-chegada'||cat==='aeroporto-saida'){
    var stop=makeStop({name:name,lat:lat,lng:lng,desc:desc,note:note,cat:cat},0);
    stop.cat=cat;
    if(addTarget==='res'&&itin.length){
      if(cat==='aeroporto-chegada'){itin[0].stops.unshift(stop);recalcTravel(0);}
      else{itin[itin.length-1].stops.push(stop);recalcTravel(itin.length-1);}
      var toast=document.getElementById('recalc-toast');
      var _airDi=cat==='aeroporto-chegada'?0:itin.length-1;
      toast.querySelector('span').textContent=(cat==='aeroporto-chegada'?'🛬 Aeroporto de chegada adicionado! Reordenar o Dia 1 a partir dele?':'🛫 Aeroporto de saída adicionado! Reordenar o último dia até ele?');
      _hotelRecalcDi=_airDi;toast.style.display='flex';
      renderTL();renderMap();
      closeAddModal();
      openAirportDatePopup(cat==='aeroporto-chegada'?'chegada':'saida',_airDi);
      return;
    }else{manualPts.push({name:name,lat:lat,lng:lng,desc:desc,note:note,cat:cat,manual:true});renderManualList();}
    closeAddModal();return;
  }
  if(cat==='hotel'){
    if(addTarget==='city-hotel'&&hotelCityIdx>=0){
      cities[hotelCityIdx].hotel={name:name,lat:lat,lng:lng};
      renderCities();closeAddModal();return;
    }
    if(addTarget==='day-hotel'&&hotelDayIdx>=0&&hotelDayIdx<itin.length){
      closeAddModal();
      openHotelAssignPopup({name:name,lat:lat,lng:lng,desc:desc,note:note},hotelDayIdx);
      return;
    }
    // addTarget==='res' or generic — open popup if roteiro exists
    closeAddModal();
    if(itin.length){
      openHotelAssignPopup({name:name,lat:lat,lng:lng,desc:desc,note:note},-1);
    }else{
      hotel={name:name,lat:lat,lng:lng,desc:desc,note:note};
      updateHotelBanner();
    }
    return;
  }
  var pt={name:name,lat:lat,lng:lng,desc:desc,note:note,cat:cat,manual:true};
  if(addTarget==='pre'){manualPts.push(pt);renderManualList();}
  else{
    var stop=makeStop(pt,0);
    itin[0].stops.push(stop);smartSortDay(0);recalcTravel(0);renderTL();renderMap();
  }
  closeAddModal();
}
