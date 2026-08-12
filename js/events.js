// ── CAT PILL CLICKS ──────────────────────────────────────
document.querySelectorAll('.cat-pill').forEach(function(pill){
  pill.addEventListener('click',function(){
    var note=document.getElementById('airport-cat-note');
    if(!note)return;
    var cat=this.getAttribute('data-cat');
    if(cat==='aeroporto-chegada'){
      note.textContent='🛬 Será posicionado no início do Dia 1 e irá recalcular a rota ao adicionar.';
      note.style.display='block';
    }else if(cat==='aeroporto-saida'){
      note.textContent='🛫 Será posicionado no final do último dia e irá recalcular a rota ao adicionar.';
      note.style.display='block';
    }else{
      note.style.display='none';
    }
  });
});
document.querySelectorAll('.cat-pill').forEach(function(pill){
  pill.addEventListener('click',function(){
    document.querySelectorAll('.cat-pill').forEach(function(p){p.classList.remove('selected');});
    this.classList.add('selected');selectedCat=this.getAttribute('data-cat');
  });
});

document.getElementById('search-input').addEventListener('input',function(){
  clearTimeout(_searchT);var q=this.value.trim();
  if(q.length<3){document.getElementById('search-results').style.display='none';return;}
  _searchT=setTimeout(function(){doModalSearch(q);},500);
});

// ── BIND ─────────────────────────────────────────────────
document.getElementById('btn-login').addEventListener('click',doLogin);
document.getElementById('btn-logout').addEventListener('click',doLogout);
document.getElementById('pw').addEventListener('keydown',function(e){if(e.key==='Enter')doLogin();});

// Tela 1 — Datas
document.getElementById('btn-wiz1-next').addEventListener('click',function(){
  var arrV=document.getElementById('wiz-arr-date').value;
  var depV=document.getElementById('wiz-dep-date').value;
  var err=document.getElementById('s1-err');
  if(!arrV||!depV){if(err){err.textContent='Informe as datas de chegada e retorno.';err.style.display='block';}return;}
  if(Math.round((new Date(depV)-new Date(arrV))/86400000)<=0){
    if(err){err.textContent='A data de retorno deve ser após a chegada.';err.style.display='block';}return;
  }
  if(err)err.style.display='none';
  goWiz(2);
});
// Tela 2 — Passagem
document.getElementById('btn-has-ticket').addEventListener('click',function(){
  document.querySelectorAll('.wiz-choice').forEach(function(b){b.classList.remove('selected');});
  this.classList.add('selected');
  document.getElementById('wiz-airport-section').style.display='block';
});
document.getElementById('btn-no-ticket').addEventListener('click',function(){
  document.querySelectorAll('.wiz-choice').forEach(function(b){b.classList.remove('selected');});
  this.classList.add('selected');
  document.getElementById('wiz-airport-section').style.display='none';
  airports.arrival=null;airports.departure=null;
  renderAirportTag('arrival');renderAirportTag('departure');
});
document.getElementById('btn-wiz2-next').addEventListener('click',function(){goWiz(3);});
document.getElementById('btn-wiz2-back').addEventListener('click',function(){goWiz(1);});
// Tela 3 — Cidades
document.getElementById('btn-wiz3-next').addEventListener('click',function(){goWiz(4);});
document.getElementById('btn-wiz3-back').addEventListener('click',function(){goWiz(2);});
// Tela 4 — Confirmação
document.getElementById('btn-wiz4-back').addEventListener('click',function(){goWiz(3);});
document.getElementById('btn-gen').addEventListener('click',doGen);

document.getElementById('same-airport').addEventListener('change',function(){
  if(this.checked&&airports.arrival){airports.departure=airports.arrival;renderAirportTag('departure');}
  else{airports.departure=null;renderAirportTag('departure');}
  document.getElementById('dep-wrap').style.opacity=this.checked?'0.4':'1';
  document.getElementById('dep-search').disabled=this.checked;
});

document.getElementById('fi').addEventListener('change',onFile);
// Datas: atualiza contador ao digitar
document.getElementById('wiz-arr-date').addEventListener('change',updateWiz1Days);
document.getElementById('wiz-dep-date').addEventListener('change',updateWiz1Days);

document.getElementById('tb-map').addEventListener('click',function(){goTab('map');});
document.getElementById('tb-tl').addEventListener('click',function(){goTab('tl');});
document.getElementById('tb-cal').addEventListener('click',function(){goTab('cal');});

// ── CALENDÁRIO: delegação única (nunca perde listener em re-render) ──────────
document.getElementById('v-cal').addEventListener('click',function(e){
  var prevBtn=e.target.closest('[data-cal-action="prev"]');
  if(prevBtn){changeCalMonth(-1);return;}
  var nextBtn=e.target.closest('[data-cal-action="next"]');
  if(nextBtn){changeCalMonth(1);return;}
  var stopEl=e.target.closest('[data-cal-stop]');
  if(stopEl){
    openStopInfoModal(parseInt(stopEl.getAttribute('data-day-idx')),parseInt(stopEl.getAttribute('data-stop-idx')));
    return;
  }
  var dayEl=e.target.closest('[data-cal-day]');
  if(dayEl){openDayInfoModal(parseInt(dayEl.getAttribute('data-day-idx')));}
});

// ── MODAL DO DIA: paradas e edição de data ────────────────────────────────────
document.getElementById('day-info-overlay').addEventListener('click',function(e){
  var stopEl=e.target.closest('[data-cal-stop]');
  if(stopEl){
    openStopInfoModal(parseInt(stopEl.getAttribute('data-day-idx')),parseInt(stopEl.getAttribute('data-stop-idx')));
  }
});
document.getElementById('day-info-overlay').addEventListener('change',function(e){
  if(e.target&&e.target.id==='day-info-date'){
    var di=parseInt(e.target.getAttribute('data-day-idx'));
    var dayRef=itin[di];if(!dayRef)return;
    var oldGroup=dayRef.hotelGroup;
    dayRef.date=e.target.value;
    dayRef.hotelGroup=null;
    if(oldGroup)itin.forEach(function(day){if(day.hotelGroup===oldGroup)day.hotelGroup=null;});
    sortItinByDate();
    renderCalendar();
    var newDi=itin.indexOf(dayRef);
    closeDayInfoModal();
    if(newDi>=0)openDayInfoModal(newDi);
  }
});

document.getElementById('btn-reset').addEventListener('click',doReset);
document.getElementById('btn-pdf').addEventListener('click',doPDF);
document.getElementById('btn-load-cloud').addEventListener('click',loadRoteiro);
document.getElementById('btn-add-res').addEventListener('click',function(){openAddModal('res',false);});
document.getElementById('btn-add-hotel').addEventListener('click',function(){openAddModal('res',true);});
document.getElementById('btn-add-cancel').addEventListener('click',closeAddModal);
document.getElementById('btn-add-confirm').addEventListener('click',confirmAddLocal);
document.getElementById('btn-geocode').addEventListener('click',geocodeAddress);
document.getElementById('add-address').addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();geocodeAddress();}});
document.getElementById('btn-toggle-coords').addEventListener('click',function(){
  var f=document.getElementById('coord-form');
  f.style.display=f.style.display==='none'?'block':'none';
});
document.getElementById('btn-coord-ok').addEventListener('click',function(){
  var lat=parseFloat(document.getElementById('coord-lat-inp').value);
  var lng=parseFloat(document.getElementById('coord-lng-inp').value);
  if(isNaN(lat)||isNaN(lng)||lat<-90||lat>90||lng<-180||lng>180){
    alert('Coordenadas inválidas. Latitude: -90 a 90, Longitude: -180 a 180.');return;
  }
  document.getElementById('add-lat').value=lat.toFixed(6);
  document.getElementById('add-lng').value=lng.toFixed(6);
  document.getElementById('geocode-status').textContent='✅ Coordenadas inseridas ('+lat.toFixed(4)+', '+lng.toFixed(4)+')';
  document.getElementById('geocode-status').style.color='#16a085';
  document.getElementById('manual-form').style.display='block';
  document.getElementById('btn-add-confirm').style.display='inline-block';
  document.getElementById('coord-form').style.display='none';
});
document.getElementById('modal-add').addEventListener('click',function(e){if(e.target===this)closeAddModal();});
document.getElementById('hotel-assign-overlay').addEventListener('click',function(e){if(e.target===this)closeHotelAssignPopup();});
document.getElementById('btn-recalc-yes').addEventListener('click',recalcWithHotel);
document.getElementById('btn-recalc-no').addEventListener('click',function(){_hotelRecalcDi=-1;document.getElementById('recalc-toast').style.display='none';});
document.getElementById('btn-cat-recalc-yes').addEventListener('click',function(){var di=window._catChangedDi;if(di!==undefined){smartSortDay(di);recalcTravel(di);renderTL();renderMap();}document.getElementById('cat-toast').style.display='none';});
document.getElementById('btn-cat-recalc-no').addEventListener('click',function(){document.getElementById('cat-toast').style.display='none';});
document.getElementById('clr-toggle').addEventListener('click',function(){
  var b=document.getElementById('clr-body');
  b.style.display=b.style.display==='none'?'block':'none';
});

// ── UNDO BUTTON & KEYBOARD SHORTCUT ──────────────────────
document.getElementById('btn-undo').addEventListener('click',doUndo);
document.addEventListener('keydown',function(e){
  if((e.ctrlKey||e.metaKey)&&e.key==='z'){
    e.preventDefault();
    doUndo();
  }
});

// ── SEARCH ITIN INPUT ────────────────────────────────────
document.getElementById('search-itin').addEventListener('input',function(){
  clearTimeout(_searchItinT);
  var q=this.value.trim();
  var _self=this;
  _searchItinT=setTimeout(function(){searchItin(_self.value.trim());},400);
});

// ── INIT ─────────────────────────────────────────────────
setupAirportSearch('arr-search','arr-results','arrival');
setupAirportSearch('dep-search','dep-results','departure');
setupCitySearch();
renderWizProgress(1); // barra de progresso começa na Tela 1
