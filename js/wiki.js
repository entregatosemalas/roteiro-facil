// ── WIKI PHOTO (Funcionalidade 5) ────────────────────────
function fetchWikiPhoto(di,si){
  var stop=itin[di]&&itin[di].stops[si];
  if(!stop)return;
  if(stop.cat==='hotel'||stop.cat==='aeroporto'||stop.cat==='aeroporto-chegada'||stop.cat==='aeroporto-saida')return;
  if(stop.isHotelMarker||stop.isEndpoint)return;
  if(Object.prototype.hasOwnProperty.call(stop,'wikiPhoto'))return; // already fetched
  stop.wikiPhoto=undefined; // mark as in-progress
  fetch('https://en.wikipedia.org/api/rest_v1/page/summary/'+encodeURIComponent(stop.name))
    .then(function(r){return r.json();})
    .then(function(data){
      if(data&&data.thumbnail&&data.thumbnail.source){
        stop.wikiPhoto=data.thumbnail.source;
        var slot=document.querySelector('.wiki-photo-slot[data-di="'+di+'"][data-si="'+si+'"]');
        if(slot){
          var href=(data.originalimage&&data.originalimage.source)||data.thumbnail.source;
          slot.innerHTML='<a href="'+href+'" target="_blank" rel="noopener"><img src="'+stop.wikiPhoto+'" style="width:56px;height:56px;border-radius:8px;object-fit:cover;flex-shrink:0;" alt="'+stop.name+'"></a>';
        }
      }else{
        stop.wikiPhoto=null;
      }
    })
    .catch(function(){stop.wikiPhoto=null;});
}
function initWikiObserver(){
  if(_wikiObserver){_wikiObserver.disconnect();_wikiObserver=null;}
  if(!('IntersectionObserver' in window))return;
  _wikiObserver=new IntersectionObserver(function(entries){
    entries.forEach(function(entry){
      if(!entry.isIntersecting)return;
      var slot=entry.target;
      var di=parseInt(slot.getAttribute('data-di'));
      var si=parseInt(slot.getAttribute('data-si'));
      fetchWikiPhoto(di,si);
      _wikiObserver.unobserve(slot);
    });
  },{rootMargin:'200px'});
  document.querySelectorAll('.wiki-photo-slot').forEach(function(slot){
    _wikiObserver.observe(slot);
  });
}
