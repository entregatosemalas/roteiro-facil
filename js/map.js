// ── MAP ───────────────────────────────────────────────────
function goTab(which){
  document.querySelectorAll('.tab-btn').forEach(function(b){b.classList.remove('on');});
  if(which==='map'){
    document.getElementById('tb-map').classList.add('on');
    document.getElementById('v-tl').style.display='none';document.getElementById('v-map').style.display='flex';
    if(!mapObj){mapObj=L.map('map');L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap',maxZoom:19}).addTo(mapObj);}
    setTimeout(function(){mapObj.invalidateSize();renderMapFilter();renderMap();},100);
  }else{
    document.getElementById('tb-tl').classList.add('on');
    document.getElementById('v-map').style.display='none';document.getElementById('v-tl').style.display='block';
    renderTL();
  }
}
function renderMapFilter(){
  var bar=document.getElementById('map-filter-bar');if(!bar)return;
  var b='<span style="font-size:12px;font-weight:600;color:#545454;white-space:nowrap;margin-right:2px;">Dia:</span>';
  var allOn=mapDayFilter===-1;
  b+='<button onclick="setMapDayFilter(-1)" style="font-size:11px;padding:3px 11px;border:1px solid '+(allOn?'#E74C3C':'#ddd')+';border-radius:99px;background:'+(allOn?'#E74C3C':'#fff')+';color:'+(allOn?'#fff':'#000')+';cursor:pointer;white-space:nowrap;">Todos</button>';
  itin.forEach(function(day,di){
    var on=mapDayFilter===di;var col=day.routeColor||'#E74C3C';
    b+='<button onclick="setMapDayFilter('+di+')" style="font-size:11px;padding:3px 11px;border:1px solid '+(on?col:'#ddd')+';border-radius:99px;background:'+(on?col:'#fff')+';color:'+(on?'#fff':'#000')+';cursor:pointer;white-space:nowrap;">Dia '+(di+1)+(day.cityName?' · '+day.cityName.split(' ')[0]:'')+'</button>';
  });
  bar.innerHTML=b;
}
function setMapDayFilter(di){mapDayFilter=di;renderMapFilter();renderMap();}
function renderMap(){
  if(!mapObj)return;
  mapObj.eachLayer(function(l){if(!(l instanceof L.TileLayer))mapObj.removeLayer(l);});
  var all=[];
  itin.forEach(function(day,di){
    if(mapDayFilter!==-1&&di!==mapDayFilter)return;
    var routeCol=day.routeColor||'#E74C3C',pinCol=day.pinColor||'#E74C3C';
    if(day.stops.length>1)L.polyline(day.stops.map(function(s){return[s.lat,s.lng];}),{color:routeCol,weight:2.5,opacity:.7,dashArray:'6,4'}).addTo(mapObj);
    day.stops.forEach(function(s,i){
      if(!s.lat&&!s.lng)return;
      all.push([s.lat,s.lng]);
      var cfg=CAT_CONFIG[s.cat]||CAT_CONFIG.outro;
      var icon=L.divIcon({className:'',html:'<div style="background:'+pinCol+';color:#fff;width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;border:2px solid #fff;box-shadow:0 2px 5px rgba(0,0,0,.25);">'+cfg.emoji+'</div>',iconSize:[26,26],iconAnchor:[13,13]});
      L.marker([s.lat,s.lng],{icon:icon}).addTo(mapObj).bindPopup('<b>Dia '+(di+1)+' · '+(i+1)+'</b><br><b>'+s.name+'</b><br><small>'+cfg.label+'</small>'+(s.note?'<br><em>'+s.note+'</em>':''));
    });
  });
  if(all.length)mapObj.fitBounds(all,{padding:[32,32]});
}
