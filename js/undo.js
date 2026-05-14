// ── UNDO (Funcionalidade 4) ──────────────────────────────
function pushUndo(){
  undoStack.push(JSON.parse(JSON.stringify(itin)));
  if(undoStack.length>10)undoStack.shift();
  var btn=document.getElementById('btn-undo');
  if(btn){btn.style.opacity='1';btn.style.cursor='pointer';}
}
function doUndo(){
  if(!undoStack.length)return;
  itin=undoStack.pop();
  var btn=document.getElementById('btn-undo');
  if(btn){btn.style.opacity=undoStack.length?'1':'0.4';btn.style.cursor=undoStack.length?'pointer':'default';}
  renderTL();renderMap();
}
