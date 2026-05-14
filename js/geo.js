// ── GEO HELPERS ──────────────────────────────────────────
function recalcTravel(di){
  var day=itin[di];
  for(var i=0;i<day.stops.length-1;i++){
    var a=day.stops[i],b=day.stops[i+1];
    // fator 1.3x: ruas reais são ~30% mais longas que linha reta
    var km=hav(a.lat,a.lng,b.lat,b.lng)*1.3;
    a.travelMinCarFast=Math.max(1,Math.round(km/40*60));  // fora do pico ~40 km/h
    a.travelMinCarSlow=Math.max(1,Math.round(km/20*60));  // horário de pico ~20 km/h
    a.travelMinCar=Math.max(1,Math.round(km/30*60));      // média para cálculo de horários
    a.travelMinWalk=Math.max(1,Math.round(km/4*60));      // 4 km/h a pé
    // Funcionalidade 8: tipo de deslocamento e travelMin baseado nele
    // Aeroportos sempre usam transporte (60 km/h)
    var rawKm=hav(a.lat,a.lng,b.lat,b.lng);
    if(rawKm<30&&!isAirportCat(a.cat)&&!isAirportCat(b.cat)){
      a.transportType='walk';
      a.travelMin=Math.ceil(rawKm/4*60);
    }else{
      a.transportType='transport';
      a.travelMin=Math.ceil(rawKm/60*60);
    }
    a.distKm=km.toFixed(2);
  }
  if(day.stops.length>0){var ls=day.stops[day.stops.length-1];ls.travelMin=0;ls.travelMinCar=0;ls.travelMinCarFast=0;ls.travelMinCarSlow=0;ls.travelMinWalk=0;ls.distKm='0.00';ls.transportType='walk';}
}
function catSortOrder(cat){var o={cafe:0,almoco:2,atracao:1,templo:1,natureza:1,compras:3,jantar:4,hotel:5,aeroporto:6,'aeroporto-chegada':-1,'aeroporto-saida':99,outro:1};return o[cat]!==undefined?o[cat]:1;}
function isAirportCat(cat){return cat==='aeroporto'||cat==='aeroporto-chegada'||cat==='aeroporto-saida';}
function smartSortDay(di){
  var day=itin[di];
  var arrival=day.stops.filter(function(s){return s.cat==='aeroporto-chegada';});
  var departure=day.stops.filter(function(s){return s.cat==='aeroporto-saida'||s.cat==='aeroporto';});
  var hotels=day.stops.filter(function(s){return s.cat==='hotel';});
  var rest=day.stops.filter(function(s){return !isAirportCat(s.cat)&&s.cat!=='hotel';});
  rest.sort(function(a,b){return catSortOrder(a.cat)-catSortOrder(b.cat);});
  day.stops=arrival.concat(hotels).concat(rest).concat(departure);
}
function catDuration(cat){var d={cafe:25,almoco:60,jantar:75,compras:90,atracao:90,templo:60,natureza:60,hotel:0,aeroporto:60,outro:60};return d[cat]!==undefined?d[cat]:90;}
