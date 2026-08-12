// ── CONFIG ──────────────────────────────────────────────
var SUPABASE_URL='https://esqmcffhwoivxaxzmzlo.supabase.co';
var SUPABASE_KEY='sb_publishable_kFyKK7Xu6W0qUVsdKuIJCQ_eF9jOe0x';
var GKEY='AIzaSyDuGj669oGWH40MCfO_kOgl771dpcbntCY';
// ────────────────────────────────────────────────────────

// ── STATE ───────────────────────────────────────────────
var user=null, mapObj=null, itin=[], kmlFile=null, manualPts=[], hotel=null;
var selectedCat='atracao', addTarget='pre';
var airports={arrival:null,departure:null};
var cities=[]; // [{name,lat,lng,days,hotel,hotelConfirmed}]
var wizStep=1;
var hotelCityIdx=-1;
var hotelDayIdx=-1;
var _hotelRecalcDi=-1;
var mapDayFilter=-1;
var _pendingHotelStop=null,_pendingHotelFromDi=-1;
var undoStack=[];
var _searchItinT=null;
var _wikiObserver=null;
var calViewDate=null;
// ────────────────────────────────────────────────────────

var CAT_CONFIG={
  hotel:              {emoji:'🏨',label:'Hospedagem',         color:'#E74C3C',bg:'#fff0f0',idealH:null},
  aeroporto:          {emoji:'✈️',label:'Aeroporto',          color:'#E74C3C',bg:'#fff0f0',idealH:null},
  'aeroporto-chegada':{emoji:'🛬',label:'Aeroporto - Chegada',color:'#E74C3C',bg:'#fff0f0',idealH:null},
  'aeroporto-saida':  {emoji:'🛫',label:'Aeroporto - Saída',  color:'#E74C3C',bg:'#fff0f0',idealH:null},
  cafe:     {emoji:'🍴',label:'Café da manhã',color:'#c0392b',bg:'#fff5f5',idealH:8},
  almoco:   {emoji:'🍴',label:'Almoço',       color:'#e67e22',bg:'#fff9f0',idealH:12},
  jantar:   {emoji:'🍴',label:'Jantar',       color:'#922b21',bg:'#fff5f5',idealH:19},
  compras:  {emoji:'🛍️',label:'Compras',      color:'#2980b9',bg:'#f0f8ff',idealH:16},
  atracao:  {emoji:'⭐️',label:'Experiência',  color:'#E74C3C',bg:'#fff8f8',idealH:null},
  templo:   {emoji:'⛩️',label:'Templo',       color:'#6d4c41',bg:'#fdf8f5',idealH:null},
  natureza: {emoji:'🌿',label:'Natureza',     color:'#16a085',bg:'#f0fff8',idealH:null},
  outro:    {emoji:'📍',label:'Outros',       color:'#545454',bg:'#f9f9f9',idealH:null}
};
var DEFAULT_ROUTE_COLORS=['#E74C3C','#e67e22','#d35400','#16a085','#2980b9','#c0392b','#27ae60'];
var DEFAULT_PIN_COLORS  =['#E74C3C','#e67e22','#d35400','#16a085','#2980b9','#c0392b','#27ae60'];

// Drag state
var dragSrc=null;
var _airT={};
var _cityT=null;
var _citDragSrc=null;
var _searchT=null;
