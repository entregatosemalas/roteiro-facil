// ── CALENDÁRIO / PLANNER ──────────────────────────────────
var _calOpenDi=-1;
var _calOpenStop={di:-1,si:-1};

function renderCalendar(){
  var header=document.getElementById('cal-header');
  var grid=document.getElementById('cal-grid');
  if(!header||!grid)return;

  if(!calViewDate){
    var firstDated=itin.find(function(d){return d.date;});
    calViewDate=firstDated?new Date(firstDated.date+'T12:00:00'):new Date();
  }

  var y=calViewDate.getFullYear(),m=calViewDate.getMonth();
  var monthName=calViewDate.toLocaleDateString('pt-BR',{month:'long',year:'numeric'});
  header.innerHTML=
    '<button data-cal-action="prev" class="ghost" style="padding:6px 14px;">&#8249;</button>'+
    '<span style="font-weight:700;font-size:16px;text-transform:capitalize;min-width:160px;text-align:center;">'+monthName+'</span>'+
    '<button data-cal-action="next" class="ghost" style="padding:6px 14px;">&#8250;</button>';

  var byDate={};
  itin.forEach(function(day,di){if(day.date)byDate[day.date]=di;});

  var firstOfMonth=new Date(y,m,1);
  var startDate=new Date(firstOfMonth);
  startDate.setDate(startDate.getDate()-startDate.getDay());
  var todayISO=new Date().toISOString().split('T')[0];

  var html='<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:1px;background:#eee;border:1px solid #eee;border-radius:10px;overflow:hidden;">';
  ['Dom','Seg','Ter','Qua','Qui','Sex','S&#225;b'].forEach(function(wd){
    html+='<div style="background:#fff8f8;padding:6px;text-align:center;font-size:11px;font-weight:700;color:#E74C3C;">'+wd+'</div>';
  });
  var cursor=new Date(startDate);
  for(var i=0;i<42;i++){
    var iso=cursor.getFullYear()+'-'+String(cursor.getMonth()+1).padStart(2,'0')+'-'+String(cursor.getDate()).padStart(2,'0');
    var di=byDate[iso];
    var inMonth=cursor.getMonth()===m;
    var isToday=iso===todayISO;
    html+='<div class="cal-cell'+(isToday?' today':'')+'" '+(di!==undefined?'data-cal-day data-day-idx="'+di+'"':'')+
      ' style="background:#fff;min-height:92px;padding:5px;cursor:'+(di!==undefined?'pointer':'default')+';'+(inMonth?'':'opacity:.35;')+'">';
    html+='<div style="font-size:11px;font-weight:'+(isToday?'800':'600')+';color:'+(isToday?'#E74C3C':'#000')+';">'+cursor.getDate()+'</div>';
    if(di!==undefined){
      var day=itin[di];
      html+='<div style="font-size:9px;color:#999;margin-bottom:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">'+(day.cityName||'')+'</div>';
      var sorted=day.stops.map(function(s,si){return{s:s,si:si,t:stopTime(di,si).s};}).sort(function(a,b){return a.t-b.t;});
      sorted.slice(0,3).forEach(function(item){
        var cfg=CAT_CONFIG[item.s.cat]||CAT_CONFIG.outro;
        html+='<div data-cal-stop data-day-idx="'+di+'" data-stop-idx="'+item.si+'" style="font-size:9px;background:'+cfg.bg+';color:'+cfg.color+';border-radius:4px;padding:1px 4px;margin-bottom:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="'+item.s.name+'">'+fmt(item.t)+' '+cfg.emoji+' '+item.s.name+'</div>';
      });
      if(sorted.length>3)html+='<div style="font-size:9px;color:#999;">+'+(sorted.length-3)+'</div>';
    }
    html+='</div>';
    cursor.setDate(cursor.getDate()+1);
  }
  html+='</div>';
  grid.innerHTML=html;
}

function changeCalMonth(delta){calViewDate.setMonth(calViewDate.getMonth()+delta);renderCalendar();}

function openDayInfoModal(di){
  var day=itin[di];if(!day)return;
  _calOpenDi=di;
  document.getElementById('day-info-title').textContent='Dia '+(di+1)+(day.cityName?' — '+day.cityName:'');
  var sorted=day.stops.map(function(s,si){return{s:s,si:si,t:stopTime(di,si)};}).sort(function(a,b){return a.t.s-b.t.s;});
  var html='<div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">'
    +'<span class="lbl" style="margin-bottom:0;">Data</span>'
    +'<input type="date" id="day-info-date" value="'+(day.date||'')+'" data-day-idx="'+di+'" style="width:auto;">'
    +'</div>';
  html+=sorted.map(function(item){
    var cfg=CAT_CONFIG[item.s.cat]||CAT_CONFIG.outro;
    return '<div data-cal-stop data-day-idx="'+di+'" data-stop-idx="'+item.si+'" style="display:flex;gap:10px;padding:9px 0;border-bottom:1px solid #f5f5f5;cursor:pointer;">'
      +'<div style="font-size:11px;color:#545454;min-width:42px;">'+fmt(item.t.s)+'</div>'
      +'<div style="flex:1;"><span class="cat-badge" style="background:'+cfg.bg+';color:'+cfg.color+';">'+cfg.emoji+' '+cfg.label+'</span>'
      +'<div style="font-weight:600;font-size:13px;margin-top:2px;">'+item.s.name+'</div></div></div>';
  }).join('');
  document.getElementById('day-info-body').innerHTML=html;
  document.getElementById('day-info-overlay').classList.add('on');
}

function closeDayInfoModal(){document.getElementById('day-info-overlay').classList.remove('on');}

function editDayInList(){
  if(_calOpenDi<0)return;
  var di=_calOpenDi;
  closeDayInfoModal();
  goTab('tl');
  setTimeout(function(){
    var el=document.querySelector('.day-block[data-di="'+di+'"]');
    if(el)el.scrollIntoView({behavior:'smooth',block:'start'});
  },150);
}

function openStopInfoModal(di,si){
  var stop=itin[di]&&itin[di].stops[si];if(!stop)return;
  _calOpenStop={di:di,si:si};
  var cfg=CAT_CONFIG[stop.cat]||CAT_CONFIG.outro;
  var t=stopTime(di,si);
  document.getElementById('stop-info-title').textContent=stop.name;
  document.getElementById('stop-info-body').innerHTML=
    '<span class="cat-badge" style="background:'+cfg.bg+';color:'+cfg.color+';">'+cfg.emoji+' '+cfg.label+'</span>'
    +'<div style="font-size:12px;color:#545454;margin-top:8px;">🕐 '+fmt(t.s)+' – '+fmt(t.e)+' · '+stop.duration+' min</div>'
    +(stop.desc?'<div style="font-size:13px;margin-top:8px;">'+stop.desc+'</div>':'')
    +(stop.note?'<div style="font-size:12px;color:#922b21;background:#fff8f8;padding:6px 10px;border-radius:6px;margin-top:8px;">📝 '+stop.note+'</div>':'')
    +'<a href="'+mapsLink(stop.lat,stop.lng)+'" target="_blank" style="display:inline-block;margin-top:10px;font-size:12px;color:#E74C3C;">📍 Abrir no Google Maps →</a>';
  document.getElementById('stop-info-overlay').classList.add('on');
}

function closeStopInfoModal(){document.getElementById('stop-info-overlay').classList.remove('on');}

function editStopInList(){
  if(_calOpenStop.di<0)return;
  var di=_calOpenStop.di,si=_calOpenStop.si;
  closeStopInfoModal();
  goTab('tl');
  setTimeout(function(){
    var el=document.querySelector('.stop-card[data-di="'+di+'"][data-si="'+si+'"]');
    if(el)el.scrollIntoView({behavior:'smooth',block:'center'});
  },150);
}
