
(function(){
'use strict';

var PETORIA_MODE_SELECTED_KEY='petoria_mode_selected_v1';

function petoriaHideFirstStart(){
  var el=document.getElementById('petoriaFirstStart');
  if(el)el.classList.remove('show');
  document.body.style.removeProperty('overflow');
}

function petoriaShowFirstStart(){
  var el=document.getElementById('petoriaFirstStart');
  if(!el)return;
  el.classList.add('show');
  document.body.style.overflow='hidden';
}

function petoriaSelectFirstMode(mode){
  mode=mode==='breeder'?'breeder':'particular';
  if(!data.settings)data.settings={};
  data.settings.mode=mode;
  try{localStorage.setItem(PETORIA_MODE_SELECTED_KEY,'1')}catch(e){}
  save(function(){
    applyAppMode();
    render();
    petoriaHideFirstStart();
    cmGoPage('inicio');
  });
}

function petoriaSetupFirstStart(){
  var selected=false;
  try{selected=localStorage.getItem(PETORIA_MODE_SELECTED_KEY)==='1'}catch(e){}
  var p=document.getElementById('petoriaChooseParticular');
  var b=document.getElementById('petoriaChooseBreeder');
  if(p)p.onclick=function(){petoriaSelectFirstMode('particular')};
  if(b)b.onclick=function(){petoriaSelectFirstMode('breeder')};
  if(!selected)petoriaShowFirstStart();
}


var DB_NAME='SendaRivasDB', DB_VER=1, STORE='appdata', KEY='main';
var data={dogs:[]}, current=null, currentDocFile=null;
var pendingDogPhoto=null;
var cropState={img:null,scale:1,x:0,y:0,naturalW:0,naturalH:0,drag:false,startX:0,startY:0,baseX:0,baseY:0};

function q(id){return document.getElementById(id)}
function speciesEmoji(s){var m={'Perro':'🐶','Gato':'🐱','Otro':'🐾'};return m[s]||'🐾'}
function uid(){return 'id_'+Date.now()+'_'+Math.random().toString(36).slice(2,8)}
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function fmt(d){if(!d)return '—';var p=d.split('-');return p[2]+'/'+p[1]+'/'+p[0]}
function today(){var d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
function days(d){if(!d)return 9999;var p=d.split('-'),x=new Date(+p[0],+p[1]-1,+p[2]),t=new Date();t.setHours(0,0,0,0);return Math.round((x-t)/86400000)}
function dog(id){return data.dogs.find(function(x){return x.id===id})}
function ageText(birth){
 if(!birth)return '';
 var p=birth.split('-'),b=new Date(+p[0],+p[1]-1,+p[2]),t=new Date();
 var months=(t.getFullYear()-b.getFullYear())*12+(t.getMonth()-b.getMonth());
 if(t.getDate()<b.getDate())months--;
 if(months<0)return '';
 if(months<24)return months+' meses';
 return Math.floor(months/12)+' años '+(months%12)+' meses';
}


function restoreMainNavigation(){
 document.body.classList.remove('cm-modal-open','child-modal-open','doc-viewer-open','repro-open');
 document.body.style.overflow='';
 document.querySelectorAll('.modal').forEach(function(m){
   m.classList.remove('open','repro-screen-open','transfer-open');
   if(m.id!=='docViewerModal')m.style.removeProperty('display');
 });
 var nav=document.querySelector('.nav');
 if(nav){
   nav.style.removeProperty('display');
   nav.style.removeProperty('visibility');
   nav.style.removeProperty('opacity');
 }
 var plus=document.querySelector('.plus');
 if(plus){plus.style.removeProperty('display');plus.style.removeProperty('visibility')}
}


function forceBottomNavVisible(){
 var nav=document.querySelector('.cm-bottom-nav')||document.querySelector('.nav');
 if(nav){
   nav.style.setProperty('display','grid','important');
   nav.style.setProperty('visibility','visible','important');
   nav.style.setProperty('opacity','1','important');
   nav.style.setProperty('pointer-events','auto','important');
 }
 var plus=document.querySelector('.plus');
 if(plus && !document.body.classList.contains('cm-modal-open') && !document.body.classList.contains('child-modal-open')){
   plus.style.removeProperty('display');
   plus.style.removeProperty('visibility');
 }
}
function syncBottomNav(){
 var anyOpen=document.querySelector('.modal.open,.modal.repro-screen-open,.modal.transfer-open');
 if(anyOpen){
   return;
 }
 document.body.classList.remove('cm-modal-open','child-modal-open','doc-viewer-open','repro-open');
 document.body.style.overflow='';
 forceBottomNavVisible();
}

function cmGoPage(page){
 document.body.classList.remove('cm-modal-open','child-modal-open','doc-viewer-open','repro-open');
 document.body.style.overflow='';
 forceBottomNavVisible();
 var b=document.querySelector('.nav [data-page="'+page+'"]');
 if(b){b.click();setTimeout(forceBottomNavVisible,0);return}
 document.querySelectorAll('.page').forEach(function(p){p.classList.remove('active')});
 if(q(page))q(page).classList.add('active');
 setTimeout(forceBottomNavVisible,0);
}
function cmOpenModal(id){
 var el=q(id);if(!el)return;
 // Always move the window to the end of BODY so it is above the window that opened it.
 document.body.appendChild(el);
 el.classList.add('open');
 el.style.setProperty('display','flex','important');
 document.body.classList.add('cm-modal-open');
 document.body.style.overflow='hidden';
}
function cmCloseModal(id){
 var el=q(id);
 if(el){
  el.classList.remove('open','repro-screen-open','transfer-open');
  el.style.removeProperty('display');
 }
 var another=document.querySelector('.modal.open,.modal.repro-screen-open,.modal.transfer-open');
 if(another){
  document.body.classList.add('cm-modal-open');
  document.body.style.overflow='hidden';
 }else{
  document.body.classList.remove('cm-modal-open');
  document.body.style.overflow='';
  setTimeout(syncBottomNav,0);
 }
}

function alertIconV532(title){
 var t=(title||'').toLowerCase(),svg='';
 if(t.indexOf('celo')>=0){
  svg='<svg viewBox="0 0 48 48"><rect x="22" y="7" width="19" height="17" rx="3"/><path d="M26 5v5M37 5v5M22 13h19"/><circle cx="14" cy="27" r="7"/><path d="M14 34v9M10 39h8"/></svg>';
 }else if(t.indexOf('monta')>=0){
  svg='<svg viewBox="0 0 48 48"><circle cx="10" cy="12" r="6"/><path d="M10 18v9M6 23h8"/><circle cx="38" cy="12" r="6"/><path d="M42 8l4-4M42 4h4v4"/><path d="M24 40s-10-6-10-13c0-6 8-8 10-2 2-6 10-4 10 2 0 7-10 13-10 13z"/></svg>';
 }else if(t.indexOf('parto')>=0){
  svg='<svg viewBox="0 0 48 48"><path d="M24 42S7 32 7 19c0-9 12-12 17-3 5-9 17-6 17 3 0 13-17 23-17 23z"/><circle cx="24" cy="27" r="4"/><circle cx="17" cy="22" r="2.5"/><circle cx="31" cy="22" r="2.5"/><circle cx="20" cy="18" r="2.3"/><circle cx="28" cy="18" r="2.3"/></svg>';
 }else if(t.indexOf('veterin')>=0||t.indexOf('revisión')>=0||t.indexOf('revision')>=0){
  svg='<svg viewBox="0 0 48 48"><circle cx="24" cy="12" r="7"/><path d="M11 41c1-10 6-15 13-15s12 5 13 15"/><path d="M18 28v6c0 8 12 8 12 0v-6"/><circle cx="35" cy="35" r="3"/><path d="M24 30v8M20 34h8"/></svg>';
 }else if(t.indexOf('vacuna')>=0){
  svg='<svg viewBox="0 0 48 48"><path d="M12 36l22-22M29 9l10 10M9 31l8 8M8 40l-2 2M19 20l9 9M16 24l-4-4M24 16l-4-4"/></svg>';
 }else if(t.indexOf('desparasitación interna')>=0){
  svg='<svg viewBox="0 0 48 48"><path d="M8 28c7-13 14 11 22-4 5-9 11-4 10 4-2 11-18 14-27 8-7-5-7-13-2-18"/></svg>';
 }else if(t.indexOf('desparasitación')>=0){
  svg='<svg viewBox="0 0 48 48"><path d="M24 5l15 6v10c0 10-6 18-15 22C15 39 9 31 9 21V11z"/><path d="M17 24l5 5 10-11"/></svg>';
 }else if(t.indexOf('tratamiento')>=0||t.indexOf('medic')>=0){
  svg='<svg viewBox="0 0 48 48"><path d="M15 10l23 23a8 8 0 01-11 11L4 21A8 8 0 0115 10z"/><path d="M13 30l17-17"/></svg>';
 }else if(t.indexOf('anal')>=0||t.indexOf('prueba')>=0){
  svg='<svg viewBox="0 0 48 48"><path d="M17 5h14M20 5v12L9 38c-2 4 1 6 5 6h20c4 0 7-2 5-6L28 17V5"/><path d="M14 32h20"/></svg>';
 }else{
  svg='<svg viewBox="0 0 48 48"><path d="M13 20a11 11 0 0122 0v9l4 6H9l4-6z"/><path d="M20 39h8"/></svg>';
 }
 return '<span class="alert-line-icon">'+svg+'</span>';
}


function homeAlertCalendarIcon(title){
 var t=(title||'').toLowerCase(),type=title||'',group='Salud';
 if(t.indexOf('celo')>=0||t.indexOf('monta')>=0||t.indexOf('parto')>=0)group='Reproducción';
 return eventIcon({type:type,title:title||'',group:group});
}


var homeAlertsExpandedV56=false;

function findAlertSourceV56(ev){
 var d=dog(ev.dogid);if(!d)return null;
 if(ev.source==='health')return (d.health||[]).find(function(x){return x.id===ev.sourceId})||null;
 if(ev.source==='repro')return (d.repro||[]).find(function(x){return x.id===ev.sourceId})||null;
 return null;
}
function completeAlertV56(ev){
 var rec=findAlertSourceV56(ev);if(!rec)return;
 if(!confirm('¿Confirmar que este aviso ya se ha realizado?'))return;
 rec.completed=true;
 rec.completedAt=new Date().toISOString();
 if(ev.source==='health')rec.next='';
 if(ev.source==='repro')rec.expected='';
 save(function(){render();renderCalendar()});
}
function postponeAlertV56(ev){
 var rec=findAlertSourceV56(ev);if(!rec)return;
 var value=prompt('¿Cuántos días quieres posponer este aviso?','7');
 if(value===null)return;
 var n=parseInt(value,10);
 if(!n||n<1||n>180){alert('Introduce entre 1 y 180 días.');return}
 var d=new Date(ev.date+'T12:00:00');d.setDate(d.getDate()+n);
 var newDate=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
 if(ev.source==='health')rec.next=newDate;
 if(ev.source==='repro')rec.expected=newDate;
 rec.postponedAt=new Date().toISOString();
 rec.postponedDays=n;
 save(function(){render();renderCalendar()});
}
function alertColorV56(e){
 var t=((e.type||'')+' '+(e.title||'')).toLowerCase();
 if(t.indexOf('vacuna')>=0)return '#d63232';
 if(t.indexOf('desparas')>=0)return '#d98a00';
 if(t.indexOf('veterin')>=0||t.indexOf('revisión')>=0||t.indexOf('revision')>=0)return '#3f8f88';
 if(t.indexOf('parto')>=0)return '#41934c';
 if(t.indexOf('monta')>=0)return '#bd8a2d';
 if(t.indexOf('celo')>=0)return '#d56f9b';
 return '#707070';
}


function hasPendingAlert15V561(d){
 var nowEvents=allCalendarEvents();
 return nowEvents.some(function(e){
   if(e.dogid!==d.id)return false;
   var n=days(e.date);
   return n>=0&&n<=15;
 });
}
function petBirthTextV561(d){
 return d.birth?fmt(d.birth):'Nacimiento sin registrar';
}

function cmRenderHome(){
 if(q('cmPetCards')){
  q('cmPetCards').innerHTML=(data.dogs||[]).map(function(d){
   var bell=hasPendingAlert15V561(d)?'<span class="pet-alert-bell-v561" aria-label="Aviso pendiente en los próximos 15 días">🔔</span>':'';
   return '<button class="cm-pet-card" data-cm-pet="'+esc(d.id)+'" type="button">'+bell+'<div class="photo">'+
   (d.photo?'<img src="'+d.photo+'" alt="Foto">':speciesEmoji(d.species))+
   (d.sex==='Macho'?'<span class="sex-badge male" aria-label="Macho">&#9794;</span>':d.sex==='Hembra'?'<span class="sex-badge female" aria-label="Hembra">&#9792;</span>':'')+
   '</div><strong>'+esc(d.name||'Mascota')+'</strong><small>'+esc(d.breed||d.species||'')+'</small>'+
   '<span class="cm-pet-birth-v561">'+esc(petBirthTextV561(d))+'</span></button>';
  }).join('')||'<div class="small">Aún no hay mascotas.</div>';
  document.querySelectorAll('[data-cm-pet]').forEach(function(b){b.onclick=function(){showDog(b.dataset.cmPet)}});
 }
 var allAlerts=allCalendarEvents();
 var visibleAlerts=homeAlertsExpandedV56
   ? allAlerts
   : allAlerts.filter(function(e){var n=days(e.date);return n<=7;});
 if(q('cmAlertCount'))q('cmAlertCount').textContent=allAlerts.filter(function(e){return days(e.date)<=7}).length;
 if(q('cmAllAlerts')){
   q('cmAllAlerts').textContent=homeAlertsExpandedV56?'Solo 7 días ↑':'Ver todos ↓';
   q('cmAllAlerts').onclick=function(){homeAlertsExpandedV56=!homeAlertsExpandedV56;cmRenderHome()};
 }
 if(q('cmAlertsList')){
   q('cmAlertsList').innerHTML=visibleAlerts.length?visibleAlerts.map(function(e){
     var df=days(e.date),st=df<0?'ATRASADO':df===0?'HOY':df===1?'MAÑANA':fmt(e.date);
     var color=alertColorV56(e);
     return '<div class="cm-alert-row-v56 '+(df<0?'overdue':'')+'" data-alert-event="'+esc(e.id)+'" style="--alert-color:'+color+'">'+
       '<div class="cm-alert-main-v56" data-open-alert="'+esc(e.id)+'">'+
         '<div class="cm-alert-icon">'+eventIcon(e)+'</div>'+
         '<div><div class="cm-alert-title">'+esc(e.title)+'</div><div class="cm-alert-pet">'+esc(e.dog)+'</div></div>'+
         '<div class="cm-alert-date">'+st+'</div><div class="cm-alert-arrow">›</div>'+
       '</div>'+
       '<div class="cm-alert-actions-v56">'+
         '<button type="button" class="done-v56" data-alert-done="'+esc(e.id)+'">✓ Realizado</button>'+
         '<button type="button" class="postpone-v56" data-alert-postpone="'+esc(e.id)+'">⏰ Posponer</button>'+
       '</div>'+
     '</div>';
   }).join(''):'<div class="cm-alert-empty-v56">No hay avisos pendientes en los próximos 7 días.</div>';
 }
 document.querySelectorAll('[data-open-alert]').forEach(function(el){
   el.onclick=function(){
     var ev=allAlerts.find(function(x){return x.id===el.dataset.openAlert});if(!ev)return;
     showDog(ev.dogid);
     setTimeout(function(){activateInner(ev.group==='Reproducción'?'reproduccion':'salud')},0);
   };
 });
 document.querySelectorAll('[data-alert-done]').forEach(function(b){
   b.onclick=function(e){e.preventDefault();e.stopPropagation();var ev=allAlerts.find(function(x){return x.id===b.dataset.alertDone});if(ev)completeAlertV56(ev)};
 });
 document.querySelectorAll('[data-alert-postpone]').forEach(function(b){
   b.onclick=function(e){e.preventDefault();e.stopPropagation();var ev=allAlerts.find(function(x){return x.id===b.dataset.alertPostpone});if(ev)postponeAlertV56(ev)};
 });
}
function cmBindPetShortcuts(){
 document.querySelectorAll('[data-cm-inner]').forEach(function(b){
  b.onclick=function(e){e.preventDefault();if(current&&dog(current))activateInner(b.dataset.cmInner)};
 });
}



function showCustomLogo(){
 var wrap=q('customLogoWrap'),hwrap=q('cmHeroLogoWrap');
 if(wrap)wrap.classList.add('hidden');
 if(hwrap)hwrap.classList.add('hidden');
}
function setupCropFromFile(file){
 if(!file)return;
 var r=new FileReader();
 r.onload=function(){
   var im=q('cropImg');
   im.onload=function(){
     cropState.naturalW=im.naturalWidth;
     cropState.naturalH=im.naturalHeight;
     cropState.scale=1;cropState.x=0;cropState.y=0;
     q('cropZoom').value='1';
     positionCropImage();
     cmOpenModal('cropModal');
   };
   im.src=r.result;
 };
 r.readAsDataURL(file);
}
function positionCropImage(){
 var area=q('cropArea'),im=q('cropImg');
 if(!area||!im||!cropState.naturalW)return;
 var aw=area.clientWidth,ah=area.clientHeight;
 var base=Math.max(aw/cropState.naturalW,ah/cropState.naturalH);
 var w=cropState.naturalW*base*cropState.scale;
 var h=cropState.naturalH*base*cropState.scale;
 im.style.width=w+'px';im.style.height=h+'px';
 im.style.left=(aw/2-w/2+cropState.x)+'px';
 im.style.top=(ah/2-h/2+cropState.y)+'px';
}
function cropToCircleData(){
 var area=q('cropArea'),im=q('cropImg');
 if(!area||!im||!im.naturalWidth)return null;
 var ar=area.getBoundingClientRect(),ir=im.getBoundingClientRect();
 var size=512,canvas=document.createElement('canvas');
 canvas.width=size;canvas.height=size;
 var ctx=canvas.getContext('2d');
 ctx.fillStyle='#ffffff';ctx.fillRect(0,0,size,size);

 // Convert the visible crop area back to source-image coordinates.
 var scaleX=im.naturalWidth/ir.width, scaleY=im.naturalHeight/ir.height;
 var sx=(ar.left-ir.left)*scaleX;
 var sy=(ar.top-ir.top)*scaleY;
 var sw=ar.width*scaleX;
 var sh=ar.height*scaleY;

 sx=Math.max(0,Math.min(im.naturalWidth-sw,sx));
 sy=Math.max(0,Math.min(im.naturalHeight-sh,sy));
 sw=Math.min(sw,im.naturalWidth);
 sh=Math.min(sh,im.naturalHeight);

 ctx.drawImage(im,sx,sy,sw,sh,0,0,size,size);
 return canvas.toDataURL('image/jpeg',0.82);
}

function openDB(cb){
 if(!('indexedDB' in window)){cb(null);return}
 var req=indexedDB.open(DB_NAME,DB_VER);
 req.onupgradeneeded=function(e){
   var db=e.target.result;
   if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE);
 };
 req.onsuccess=function(){cb(req.result)};
 req.onerror=function(){cb(null)};
}
function load(cb){
 openDB(function(db){
   if(!db){loadFallback();cb();return}
   var tx=db.transaction(STORE,'readonly'),st=tx.objectStore(STORE),r=st.get(KEY);
   r.onsuccess=function(){
     if(r.result&&Array.isArray(r.result.dogs))data=r.result; else loadFallback();
     normalize();cb();
   };
   r.onerror=function(){loadFallback();normalize();cb()};
 });
}
function loadFallback(){
 try{
   var s=localStorage.getItem('senda_rivas_libreta_v1')||localStorage.getItem('senda_rivas_libreta_v1_backup');
   if(s){var x=JSON.parse(s);if(x&&Array.isArray(x.dogs))data=x}
 }catch(e){}
}
function normalize(){

 data.dogs.forEach(function(d){if(!d.species)d.species='Perro';if(!d.species)d.species='Perro'; if(['Perro','Gato','Otro'].indexOf(d.species)<0)d.species='Otro';
   if(!Array.isArray(d.measures))d.measures=[];
   if(!Array.isArray(d.health))d.health=[];
   if(!Array.isArray(d.docs))d.docs=[];
   if(!Array.isArray(d.repro))d.repro=[];
   if(typeof d.generalNotes!=='string')d.generalNotes=d.notes||''; if(!Array.isArray(d.contracts))d.contracts=[]; if(!Array.isArray(d.gallery))d.gallery=[]; if(!Array.isArray(d.litters))d.litters=[]; d.litters.forEach(function(l){if(!Array.isArray(l.puppiesList))l.puppiesList=[];}); if(!d.vet)d.vet={};
 });
 if(!data.settings)data.settings={};
 if(typeof data.settings.logo!=='string')data.settings.logo='';
 if(!data.settings.seller)data.settings.seller={}; if(!data.settings.mode)data.settings.mode='particular';
}
function persist(cb){
 normalize();
 try{localStorage.setItem('senda_rivas_libreta_v1_backup',JSON.stringify(data))}catch(e){}
 openDB(function(db){
   if(!db){render();if(cb)cb();return}
   var tx=db.transaction(STORE,'readwrite');
   tx.objectStore(STORE).put(data,KEY);
   tx.oncomplete=function(){render();if(cb)cb()};
   tx.onerror=function(){render();alert('No se ha podido guardar correctamente. Exporta una copia de seguridad.');if(cb)cb()};
 });
}
function save(cb){
 try{localStorage.setItem('libreta_emergency_v23',JSON.stringify(data));localStorage.setItem('libreta_emergency_date',new Date().toISOString())}catch(e){}persist(cb)}

function open(id){
 var el=q(id);
 if(!el)return;
 if(el.parentNode!==document.body && el.classList.contains('modal')){
   document.body.appendChild(el);
 }
 el.classList.add('open');
 document.body.style.overflow='hidden';
}
function close(id){
 var el=q(id);
 if(el)el.classList.remove('open');
 if(id==='docViewerModal'){
   var b=q('docViewerBody'),u=b&&b.dataset?b.dataset.objectUrl:null;
   if(u){try{URL.revokeObjectURL(u)}catch(e){};delete b.dataset.objectUrl}
 }
 if(!document.querySelector('.modal.open'))document.body.style.overflow='';
}
function photo(file,cb){if(!file)return cb(null);var r=new FileReader();r.onload=function(){cb(r.result)};r.onerror=function(){cb(null)};r.readAsDataURL(file)}
function fileToData(file,cb){
 if(!file){cb(null);return}
 var nm=(file.name||'').toLowerCase();
 var type=(file.type||'').toLowerCase();
 var looksImage=type.indexOf('image/')===0 || /\.(jpg|jpeg|png|webp|gif|heic|heif)$/i.test(nm);

 if(looksImage){
   var url=URL.createObjectURL(file),img=new Image();
   img.onload=function(){
     try{
       var maxSide=1800,w=img.naturalWidth,h=img.naturalHeight;
       var scale=Math.min(1,maxSide/Math.max(w,h));
       var cw=Math.max(1,Math.round(w*scale)),ch=Math.max(1,Math.round(h*scale));
       var canvas=document.createElement('canvas');canvas.width=cw;canvas.height=ch;
       var ctx=canvas.getContext('2d');
       ctx.fillStyle='#fff';ctx.fillRect(0,0,cw,ch);
       ctx.drawImage(img,0,0,cw,ch);
       var data=canvas.toDataURL('image/jpeg',0.88);
       URL.revokeObjectURL(url);
       cb({name:(file.name||'documento').replace(/\.[^.]+$/,'')+'.jpg',type:'image/jpeg',data:data,size:data.length});
     }catch(e){
       URL.revokeObjectURL(url);
       fallback();
     }
   };
   img.onerror=function(){URL.revokeObjectURL(url);fallback()};
   img.src=url;
   return;
 }

 fallback();

 function fallback(){
   var inferred=file.type||'';
   if(!inferred){
     if(nm.endsWith('.pdf'))inferred='application/pdf';
     else inferred='application/octet-stream';
   }
   var r=new FileReader();
   r.onload=function(){cb({name:file.name,type:inferred,data:r.result,size:file.size||0})};
   r.onerror=function(){cb(null)};
   r.readAsDataURL(file);
 }
}
function addInterval(date,num,unit){
 if(!date||!num)return '';
 var p=date.split('-'),d=new Date(+p[0],+p[1]-1,+p[2]);
 num=parseInt(num,10);
 if(unit==='months')d.setMonth(d.getMonth()+num);
 else if(unit==='weeks')d.setDate(d.getDate()+num*7);
 else d.setDate(d.getDate()+num);
 return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
}
function alerts(){
 var a=[];
 data.dogs.forEach(function(d){(d.health||[]).forEach(function(h){if(h.next)a.push({dog:d.name,dogid:d.id,type:h.type,product:h.product||'',next:h.next})})});
 return a.sort(function(a,b){return a.next.localeCompare(b.next)});
}


function applyAppMode(){
 var mode=(data.settings&&data.settings.mode)||'particular';
 if(mode!=='breeder')mode='particular';

 document.body.classList.toggle('mode-owner-v55',mode==='particular');
 document.body.classList.toggle('mode-breeder-v55',mode==='breeder');

 document.querySelectorAll('[data-breeder-only="1"]').forEach(function(el){
   var hide=mode!=='breeder';
   el.classList.toggle('breeder-hidden',hide);
   el.hidden=hide;
   if(el.classList.contains('nav-repro-v575'))el.style.display=hide?'none':'';
 });

 if(q('appMode'))q('appMode').value=mode;

 document.querySelectorAll('[data-mode-value]').forEach(function(b){
   b.classList.toggle('active',b.dataset.modeValue===mode);
 });

 if(q('modeHelp')){
   q('modeHelp').innerHTML=mode==='breeder'
    ?'<span class="mode-pill">Criador / Profesional</span><br>Están activadas reproducción, camadas, cachorros, contratos y las herramientas profesionales.'
    :'<span class="mode-pill">Particular</span><br>La aplicación muestra una experiencia más sencilla centrada en cuidado, salud, crecimiento, calendario, avisos y documentos.';
 }

 if(mode!=='breeder'){
   if(q('estado-reproductivo')&&q('estado-reproductivo').classList.contains('active'))cmGoPage('inicio');
   var active=document.querySelector('[data-inner].active');
   if(active&&active.dataset&&['reproduccion','camadas','contratos'].indexOf(active.dataset.inner)>=0){
     activateInner('datos');
   }
 }
}


function render(){
 cmRenderHome();
 renderSmartAlerts();
 applyAppMode();
 renderBreederFemalesV57();
 renderReproStatusPageV575();
 if(q('appVersion'))q('appVersion').textContent='v1.0';
 showCustomLogo();
 q('dogCount').textContent=data.dogs.length;
 var a=alerts(),soon=a.filter(function(x){return days(x.next)<=30});
 q('homeAlerts').textContent=soon.length;
 var docCount=0;data.dogs.forEach(function(d){docCount+=(d.docs||[]).length});q('homeDocs').textContent=docCount;
 q('homeNext').innerHTML=a.length?'<b>'+esc(a[0].dog)+'</b> · '+esc(a[0].type)+' · '+fmt(a[0].next):'No hay avisos pendientes.';
 var dueNow=a.filter(function(x){return days(x.next)<=0}).length, week=a.filter(function(x){var n=days(x.next);return n>0&&n<=7}).length;
 if(q('calendarDog')){
   var cur=q('calendarDog').value;
   q('calendarDog').innerHTML='<option value="">Todos</option>'+data.dogs.map(function(d){return '<option value="'+esc(d.id)+'">'+esc(d.name)+'</option>'}).join('');
   q('calendarDog').value=cur;
 }
 q('todaySummary').innerHTML=dueNow?'<span class="status-dot due"></span><b>'+dueNow+'</b> aviso(s) vencido(s) o para hoy.':week?'<span class="status-dot warn"></span><b>'+week+'</b> aviso(s) en los próximos 7 días.':'<span class="status-dot ok"></span>Todo al día.';

 q('homeDogPhotos').innerHTML=data.dogs.length?data.dogs.map(function(d){
   return '<div class="home-dog" data-home-dog="'+esc(d.id)+'"><div class="photo">'+(d.photo?'<img src="'+d.photo+'">':speciesEmoji(d.species))+'</div><div class="small"><b>'+esc(d.name)+'</b></div></div>';
 }).join(''):'<div class="small">Aún no hay perros. Pulsa + para añadir el primero.</div>';
 Array.prototype.forEach.call(document.querySelectorAll('[data-home-dog]'),function(el){el.onclick=function(){showDog(el.getAttribute('data-home-dog'))}});

 renderPetsFilteredV575();

 q('alertList').innerHTML=a.length?a.map(function(x){
   var n=days(x.next),txt=n<0?'Vencido':n===0?'Hoy':n===1?'Mañana':'En '+n+' días';
   return '<div class="card"><div class="name">'+esc(x.dog)+'</div><div>'+esc(x.type)+(x.product?' · '+esc(x.product):'')+'</div><div class="small">'+fmt(x.next)+'</div><div class="rowactions"><span class="badge '+(n<=7?'due':'')+'">'+txt+'</span><button class="btn gold cal" data-name="'+esc(x.dog)+'" data-type="'+esc(x.type)+'" data-date="'+esc(x.next)+'">Calendario</button></div></div>';
 }).join(''):'<div class="card empty">No hay avisos pendientes.</div>';
 Array.prototype.forEach.call(document.querySelectorAll('.cal'),function(b){b.onclick=function(){calendar(b.dataset.name,b.dataset.type,b.dataset.date)}});

 var hist=[];
 data.dogs.forEach(function(d){
   (d.measures||[]).forEach(function(m){hist.push({date:m.date,html:'<b>'+esc(d.name)+'</b> · Peso/medidas'+(m.weight?' · '+esc(m.weight)+' kg':'')})});
   (d.health||[]).forEach(function(h){hist.push({date:h.date,html:'<b>'+esc(d.name)+'</b> · '+esc(h.type)+(h.product?' · '+esc(h.product):'')})});
   (d.repro||[]).forEach(function(r){hist.push({date:r.date,html:'<b>'+esc(d.name)+'</b> · Reproducción · '+esc(r.type)+(r.value?' · '+esc(r.value):'')})});
 });
 hist.sort(function(a,b){return (b.date||'').localeCompare(a.date||'')});
 q('history').innerHTML=hist.length?'<div class="card">'+hist.map(function(h){return '<div class="record">'+h.html+'<div class="small">'+fmt(h.date)+'</div></div>'}).join('')+'</div>':'<div class="card empty">Todavía no hay historial.</div>';
}

function drawWeightChart(ms){
 var c=q('weightChart'),ctx=c.getContext('2d'),W=c.width,H=c.height;
 ctx.clearRect(0,0,W,H);ctx.fillStyle='#fffdf8';ctx.fillRect(0,0,W,H);
 var pts=ms.filter(function(m){return m.weight!==''&&m.weight!=null}).slice().sort(function(a,b){return a.date.localeCompare(b.date)});
 ctx.strokeStyle='#d9bd86';ctx.lineWidth=1;
 for(var i=1;i<=4;i++){var y=i*H/5;ctx.beginPath();ctx.moveTo(30,y);ctx.lineTo(W-15,y);ctx.stroke()}
 if(pts.length<1){ctx.fillStyle='#76685f';ctx.font='16px sans-serif';ctx.fillText('Añade pesos para ver la evolución',40,H/2);return}
 var vals=pts.map(function(p){return parseFloat(p.weight)}),min=Math.min.apply(null,vals),max=Math.max.apply(null,vals);
 if(min===max){min-=1;max+=1}
 var left=40,right=W-20,top=20,bottom=H-35;
 ctx.strokeStyle='#8d3a25';ctx.lineWidth=3;ctx.beginPath();
 pts.forEach(function(p,i){
   var x=pts.length===1?(left+right)/2:left+(right-left)*i/(pts.length-1);
   var y=bottom-(parseFloat(p.weight)-min)/(max-min)*(bottom-top);
   if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
 });
 ctx.stroke();
 ctx.fillStyle='#75695d';ctx.font='11px sans-serif';ctx.fillText('Peso (kg)',6,13);
 pts.forEach(function(p,i){
   var x=pts.length===1?(left+right)/2:left+(right-left)*i/(pts.length-1);
   var y=bottom-(parseFloat(p.weight)-min)/(max-min)*(bottom-top);
   ctx.fillStyle='#c58a17';ctx.beginPath();ctx.arc(x,y,5,0,Math.PI*2);ctx.fill();
   ctx.fillStyle='#3c170e';ctx.font='12px sans-serif';ctx.fillText(p.weight+' kg',Math.max(4,x-18),Math.max(12,y-10));
 });
}


function speciesEmoji(species){
 var m={'Perro':'🐶','Gato':'🐱','Otro':'🐾'};
 return m[species]||'🐾';
}
function applySpeciesView(d){
 var species=(d&&d.species)||'Perro';
 document.querySelectorAll('[data-dog-only="1"]').forEach(function(el){
   el.classList.toggle('species-hidden',species!=='Perro');
 });
}


var healthHistoryFilter='';
function healthFilterMatch(h,filter){
 if(!filter)return true;
 if(filter==='Desparasitación')return (h.type||'').indexOf('Desparasitación')===0;
 if(filter==='Tratamiento')return (h.type||'').indexOf('Tratamiento')===0;
 if(filter==='Veterinaria')return h.type==='Visita veterinaria'||h.type==='Cirugía / intervención';
 if(filter==='Prueba')return h.type==='Analítica / prueba';
 return h.type===filter;
}
function healthStatus(date){
 if(!date)return '';
 var n=days(date);
 if(n<0)return '<span class="health-history-status overdue">VENCIDO</span>';
 if(n===0)return '<span class="health-history-status today">HOY</span>';
 return '<span class="health-history-status upcoming">'+fmt(date)+'</span>';
}
function renderHealthHistory(){
 var d=dog(current);if(!d)return;
 q('healthHistoryPet').textContent=d.name||'Mascota';
 var arr=(d.health||[]).filter(function(h){return healthFilterMatch(h,healthHistoryFilter)}).slice().sort(function(a,b){return (b.date||'').localeCompare(a.date||'')});
 q('healthHistoryList').innerHTML=arr.length?arr.map(function(h){
   return '<div class="health-history-item">'+
    '<div class="health-history-head"><div><div class="health-history-title">'+esc(h.type||'Salud')+'</div><div class="health-history-meta">'+fmt(h.date)+(h.vet?' · '+esc(h.vet):'')+'</div></div>'+
    (h.next?healthStatus(h.next):'')+'</div>'+
    (h.product?'<div class="small"><b>Detalle:</b> '+esc(h.product)+'</div>':'')+
    (h.dose?'<div class="small"><b>Dosis/pauta:</b> '+esc(h.dose)+'</div>':'')+
    (h.diagnosis?'<div class="small"><b>Diagnóstico/resultado:</b> '+esc(h.diagnosis)+'</div>':'')+
    (h.notes?'<div class="small">'+esc(h.notes)+'</div>':'')+
    '<div class="health-history-actions">'+
      (h.file?'<button class="btn gold health-history-doc" data-health-id="'+esc(h.id)+'">📎 Adjunto</button>':'')+
      '<button class="btn gold health-history-edit" data-health-id="'+esc(h.id)+'">Editar</button>'+
      '<button class="btn danger health-history-delete" data-health-id="'+esc(h.id)+'">Eliminar</button>'+
    '</div></div>';
 }).join(''):'<div class="small" style="padding:12px 0">No hay registros en este filtro.</div>';
 document.querySelectorAll('.health-history-doc').forEach(function(b){
  b.onclick=function(){
   var rec=(d.health||[]).find(function(x){return x.id===b.dataset.healthId});
   if(!rec||!rec.file)return;
   var temp='healthhist_'+Date.now();
   d.docs=d.docs||[];d.docs.push({id:temp,file:rec.file,name:rec.product||rec.type,type:rec.type});
   openDocument(temp);
   d.docs=d.docs.filter(function(x){return x.id!==temp});
  };
 });
 document.querySelectorAll('.health-history-edit').forEach(function(b){
  b.onclick=function(){
   cmCloseModal('healthHistoryModal');
   openHealthEditor(b.dataset.healthId);
  };
 });
 document.querySelectorAll('.health-history-delete').forEach(function(b){
  b.onclick=function(){
   if(!confirm('¿Eliminar este registro de salud?'))return;
   d.health=(d.health||[]).filter(function(x){return x.id!==b.dataset.healthId});
   save(function(){renderHealthHistory();showDog(current);setTimeout(function(){activateInner('salud')},0)});
  };
 });
}


function v53SummaryHTML(d){
 var hs=(d.health||[]).slice(), ms=(d.measures||[]).slice().sort(function(a,b){return (b.date||'').localeCompare(a.date||'')});
 var next=hs.filter(function(h){return h.next}).sort(function(a,b){return (a.next||'').localeCompare(b.next||'')})[0];
 var rp=(d.repro||[]).filter(function(r){return r.expected}).sort(function(a,b){return (a.expected||'').localeCompare(b.expected||'')})[0];
 var weight=ms[0]&&ms[0].weight?ms[0].weight+' kg':'Sin registrar';
 return '<div class="pet-summary-v53">'+
 '<div class="sum"><b>Edad</b><span>'+(d.birth?esc(ageText(d.birth)):'Sin registrar')+'</span></div>'+
 '<div class="sum"><b>Peso actual</b><span>'+esc(weight)+'</span></div>'+
 '<div class="sum"><b>Próxima salud</b><span>'+(next?esc(next.type)+' · '+fmt(next.next):'Sin avisos')+'</span></div>'+
 '<div class="sum"><b>Reproducción</b><span>'+(rp?esc(rp.type==='Celo'?'Próximo celo':rp.type==='Monta'?'Parto previsto':rp.type)+' · '+fmt(rp.expected):'Sin previsión')+'</span></div>'+
 '</div>';
}



var editingReproId=null;

function applyReproSexVisibility(d){
 var female=!!(d&&d.sex==='Hembra');
 document.querySelectorAll('.female-only-repro').forEach(function(el){
   el.classList.toggle('is-hidden',!female);
 });
}


function configureReproFormBySexV572(d,keepType){
 var male=!!(d&&d.sex==='Macho');
 var type=q('rType');
 var previous=keepType||type.value||'Celo';
 var options=male?['Celo','Monta','Otro']:['Celo','Progesterona','Monta','Ecografía','Parto','Otro'];
 type.innerHTML=options.map(function(x){return '<option value="'+x+'">'+x+'</option>'}).join('');
 type.value=options.indexOf(previous)>=0?previous:'Celo';
 configureReproFieldsV572(d);
}

function configureReproFieldsV572(d){
 var male=!!(d&&d.sex==='Macho');
 var t=q('rType').value;
 var valueField=q('rValueField'),refField=q('rReferenceField'),valueLabel=q('rValueLabel'),refLabel=q('rReferenceLabel');
 if(!valueField||!refField)return;

 valueField.classList.remove('hidden');
 refField.classList.remove('hidden');
 q('rExpectedField').classList.remove('hidden');

 if(male&&t==='Monta'){
   valueField.classList.add('hidden');
   refLabel.textContent='Hembra montada';
   q('rMale').placeholder='Nombre de la hembra';
 }else if(male&&t==='Celo'){
   valueLabel.textContent='Referencia / observación';
   refLabel.textContent='Hembra / referencia';
   q('rMale').placeholder='Opcional';
 }else if(male&&t==='Otro'){
   valueLabel.textContent='Valor / resultado';
   refField.classList.add('hidden');
   q('rExpectedField').classList.add('hidden');
 }else{
   valueLabel.textContent='Valor / resultado';
   refLabel.textContent=t==='Monta'?'Macho utilizado':'Macho / referencia';
   q('rMale').placeholder='';
   if(t!=='Celo'&&t!=='Monta')q('rExpectedField').classList.add('hidden');
 }

 updateReproExpectedLabel(false);
}

function openReproRecordEditor(id){
 var d=dog(current);if(!d)return;
 editingReproId=id||null;
 q('reproForm').reset();
 var rec=id?(d.repro||[]).find(function(x){return x.id===id}):null;
 configureReproFormBySexV572(d,rec&&rec.type?rec.type:'Celo');
 q('rDate').value=rec&&rec.date?rec.date:today();
 if(rec){
   q('rValue').value=rec.value||'';
   q('rMale').value=rec.male||'';
   q('rExpected').value=rec.expected||'';
   q('rNotes').value=rec.notes||'';
 }
 configureReproFieldsV572(d);
 updateReproExpectedLabel(false);
 openReproEditor();
}

function closeReproRecordEditor(){
 editingReproId=null;
 editingReproId=null;closeReproEditor(true);
}

function v54Num(v){
 var n=parseFloat(String(v==null?'':v).replace(',','.'));
 return isNaN(n)?null:n;
}
function v54GrowthSummary(ms){
 var withWeight=ms.filter(function(m){return v54Num(m.weight)!=null});
 var current=withWeight[0]||null, previous=withWeight[1]||null;
 var latest=ms[0]||null;
 var cur=current?v54Num(current.weight):null, prev=previous?v54Num(previous.weight):null;
 var diff=(cur!=null&&prev!=null)?cur-prev:null;
 var diffText='Sin comparación',diffClass='neutral';
 if(diff!=null){
   diffText=(diff>0?'+':'')+diff.toFixed(2).replace('.',',')+' kg';
   diffClass=diff>0?'positive':diff<0?'negative':'neutral';
 }
 return '<div class="growth-summary-v54">'+
  '<div class="growth-stat-v54"><b>Peso actual</b><span>'+(cur!=null?cur.toFixed(2).replace('.',',')+' kg':'Sin registrar')+'</span></div>'+
  '<div class="growth-stat-v54"><b>Peso anterior</b><span>'+(prev!=null?prev.toFixed(2).replace('.',',')+' kg':'Sin registrar')+'</span></div>'+
  '<div class="growth-stat-v54"><b>Variación</b><span class="'+diffClass+'">'+diffText+'</span></div>'+
  '<div class="growth-stat-v54"><b>Altura actual</b><span>'+(latest&&latest.height?esc(latest.height)+' cm':'Sin registrar')+'</span></div>'+
 '</div>';
}
function v54LatestByType(arr,type){
 return arr.filter(function(r){return r.type===type}).slice().sort(function(a,b){return (b.date||'').localeCompare(a.date||'')})[0]||null;
}
function v54ReproTimeline(d){
 var rs=d.repro||[], litters=d.litters||[];
 var heat=v54LatestByType(rs,'Celo');
 var mate=v54LatestByType(rs,'Monta');
 var litter=litters.slice().sort(function(a,b){return (b.birth||'').localeCompare(a.birth||'')})[0]||null;
 var birthDate=(mate&&mate.expected)||'';
 var heatDate=heat&&heat.date||'', mateDate=mate&&mate.date||'', litterDate=litter&&litter.birth||'';
 var born=!!litterDate;
 var steps=[
  {icon:'♀',label:'Celo',date:heatDate,done:!!heatDate},
  {icon:'♡',label:'Monta',date:mateDate,done:!!mateDate},
  {icon:'🐾',label:'Parto previsto',date:birthDate,done:born,next:!!birthDate&&!born},
  {icon:'🐶',label:'Camada',date:litterDate,done:born,click:true}
 ];
 var html='<div class="repro-timeline-v54">'+steps.map(function(s){
   var cls=s.done?' done':s.next?' next':'';
   var inside='<div class="repro-step-icon-v54">'+s.icon+'</div><div class="repro-step-label-v54">'+esc(s.label)+'</div><div class="repro-step-date-v54">'+(s.date?fmt(s.date):'—')+'</div>';
   return '<div class="repro-step-v54'+cls+'">'+(s.click?'<button type="button" data-v54-litters="1">'+inside+'</button>':inside)+'</div>';
 }).join('')+'</div>';
 var future='';
 if(heat&&heat.expected)future+='<div><b>Próximo celo previsto:</b> '+fmt(heat.expected)+'</div>';
 if(mate&&mate.expected)future+='<div><b>Fecha prevista de parto:</b> '+fmt(mate.expected)+'</div>';
 if(future)html+='<div class="repro-future-v54">'+future+'</div>';
 return html;
}
function v54BindReproTimeline(){
 var b=document.querySelector('[data-v54-litters]');
 if(b)b.onclick=function(){activateInner('camadas')};
}


function addMonthsSafeV57(dateStr,months){
 if(!dateStr)return '';
 var p=dateStr.split('-'),y=Number(p[0]),m=Number(p[1])-1,d=Number(p[2]||1);
 var dt=new Date(y,m+months,1);
 var last=new Date(dt.getFullYear(),dt.getMonth()+1,0).getDate();
 dt.setDate(Math.min(d,last));
 return isoDateV56(dt);
}
function latestLitterV57(d){
 return (d.litters||[]).slice().filter(function(x){return x.birth}).sort(function(a,b){return (b.birth||'').localeCompare(a.birth||'')})[0]||null;
}
function latestHeatV57(d){
 return (d.repro||[]).filter(function(r){return r.type==='Celo'&&r.date}).slice().sort(function(a,b){return (b.date||'').localeCompare(a.date||'')})[0]||null;
}
function latestMateV57(d){
 return (d.repro||[]).filter(function(r){return r.type==='Monta'&&r.date}).slice().sort(function(a,b){return (b.date||'').localeCompare(a.date||'')})[0]||null;
}
function breedingRestCyclesV57(d){
 var v=d.breedingRestCycles;
 /* compatibility with v57/v57.2 */
 if(v==='retired')return 'nonbreeding';
 if(v==='nonbreeding')return 'nonbreeding';
 if(v==='sterilized')return 'sterilized';
 if(v===0||v==='0')return 0;
 if(v===2||v==='2')return 2;
 return 1;
}
function breedingStateV57(d){
 if(!d||d.sex!=='Hembra')return null;
 var plan=breedingRestCyclesV57(d);
 if(plan==='sterilized')return {key:'sterilized',label:'Esterilizada',icon:'⚪',detail:'Esterilizada · fuera del circuito reproductivo'};
 if(plan==='nonbreeding')return {key:'nonbreeding',label:'No reproductora',icon:'⚪',detail:'No destinada actualmente a reproducción'};
 var litter=latestLitterV57(d),heat=latestHeatV57(d),mate=latestMateV57(d),now=today();

 // Gestation when a mating has a future expected birth and no litter after that mating.
 if(mate&&mate.expected&&mate.expected>=now&&(!litter||litter.birth<mate.date)){
   return {key:'pregnant',label:'Gestante',icon:'🟣',detail:'Parto previsto '+fmt(mate.expected),expected:mate.expected};
 }

 // Active litter/lactation for 8 weeks after birth.
 if(litter&&litter.birth){
   var lactEnd=addDaysDate(litter.birth,56);
   if(now<=lactEnd){
     return {key:'lactation',label:'Lactancia',icon:'🟣',detail:'Camada '+fmt(litter.birth),litter:litter};
   }
 }

 if(litter&&plan>0){
   // Prefer the system's own next-heat estimate from the last registered heat.
   var nextHeat=heat&&heat.expected?heat.expected:'';
   var eligible=nextHeat?addMonthsSafeV57(nextHeat,6*(plan-1+1)):'';
   // If a post-litter heat has already been registered, move through the number of required skipped heats.
   var postHeats=(d.repro||[]).filter(function(r){return r.type==='Celo'&&r.date>litter.birth}).sort(function(a,b){return a.date.localeCompare(b.date)});
   if(postHeats.length>=plan){
     var lastSkipped=postHeats[plan-1];
     var nextEligible=lastSkipped.expected||addMonthsSafeV57(lastSkipped.date,6);
     var nd=nextEligible?days(nextEligible):999;
     if(nd>=0&&nd<=45)return {key:'soon',label:'Celo próximo',icon:'🟡',detail:'Apta desde '+fmt(nextEligible),eligible:nextEligible};
     return {key:'ready',label:'Apta',icon:'🟢',detail:nextEligible?'Próximo celo '+fmt(nextEligible):'Descanso completado',eligible:nextEligible};
   }
   return {
     key:'rest',label:'Descanso',icon:'🟠',
     detail:nextHeat?'No montar en celo '+fmt(nextHeat):'Pendiente de registrar el próximo celo',
     nextHeat:nextHeat,eligible:eligible,litter:litter,remaining:plan-postHeats.length
   };
 }

 var next=heat&&heat.expected?heat.expected:'';
 var diff=next?days(next):999;
 if(diff>=0&&diff<=45)return {key:'soon',label:'Celo próximo',icon:'🟡',detail:'Previsto '+fmt(next),eligible:next};
 return {key:'ready',label:'Apta',icon:'🟢',detail:next?'Próximo celo '+fmt(next):'Sin restricciones',eligible:next};
}

function latestHeatRecordV575(d){
 return (d.repro||[]).filter(function(r){return r.type==='Celo'&&r.date}).slice().sort(function(a,b){return (b.date||'').localeCompare(a.date||'')})[0]||null;
}
function heatCycleInfoV576(d){
 var h=latestHeatRecordV575(d);if(!h||!h.date)return null;
 var elapsed=-days(h.date);
 if(elapsed<0||elapsed>20)return null;
 var day=elapsed+1;
 var end=addDaysDate(h.date,20);
 return {record:h,start:h.date,end:end,day:day,remaining:21-day};
}
function isInHeatV575(d){
 return !!heatCycleInfoV576(d);
}
function reproductiveDisplayStateV575(d){
 var s=breedingStateV57(d)||{key:'ready',label:'Apta',icon:'🟢',detail:''};
 var heatInfo=heatCycleInfoV576(d);
 if(heatInfo && ['pregnant','lactation','nonbreeding','sterilized'].indexOf(s.key)<0){
   return {
     key:'heat',label:'En celo',icon:'🌸',
     detail:'Día '+heatInfo.day+' de celo · desde '+fmt(heatInfo.start),
     heatDate:heatInfo.start,heatEnd:heatInfo.end,heatDay:heatInfo.day,
     heatRemaining:heatInfo.remaining,base:s
   };
 }
 return s;
}
function reproductiveDateInfoV575(d,s){
 var litter=latestLitterV57(d),mate=latestMateV57(d),heat=latestHeatRecordV575(d);
 if(s.key==='pregnant'&&mate&&mate.expected)return {label:'Parto aprox.',date:mate.expected};
 if(s.key==='lactation'&&litter&&litter.birth)return {label:'Fin lactancia aprox.',date:addDaysDate(litter.birth,56)};
 if(s.key==='rest'){
   var nx=s.nextHeat||(heat&&heat.expected)||'';
   return {label:'Próximo celo estimado',date:nx};
 }
 if(s.key==='heat'){
   return {label:'Fin estimado del celo',date:s.heatEnd||addDaysDate(s.heatDate,20)};
 }
 if(s.key==='soon'||s.key==='ready'){
   var nx2=s.eligible||(heat&&heat.expected)||'';
   return {label:'Próximo celo estimado',date:nx2};
 }
 if(s.key==='sterilized')return {label:'Estado',date:'Esterilizada'};
 if(s.key==='nonbreeding')return {label:'Estado',date:'No reproductora'};
 return {label:'',date:''};
}
var reproStatusFilterV577='';
function renderReproStatusPageV575(){
 var list=q('reproFullListV575');if(!list)return;
 var females=(data.dogs||[]).filter(function(d){return d.sex==='Hembra'&&(d.species||'Perro')==='Perro'});
 var states=females.map(function(d){return {dog:d,state:reproductiveDisplayStateV575(d)}});
 var rank={pregnant:0,lactation:1,rest:2,heat:3,soon:4,ready:5,nonbreeding:6,sterilized:7};
 states.sort(function(a,b){return (rank[a.state.key]??9)-(rank[b.state.key]??9)});
 if(q('reproTotalV575'))q('reproTotalV575').textContent=females.length;

 var counts={pregnant:0,lactation:0,rest:0,heat:0,soon:0,ready:0,inactive:0};
 states.forEach(function(x){
   if(x.state.key==='nonbreeding'||x.state.key==='sterilized')counts.inactive++;
   else if(counts[x.state.key]!=null)counts[x.state.key]++;
 });
 if(q('reproSummaryV575')){
   q('reproSummaryV575').innerHTML=[
    ['pregnant','🟣','Gestantes'],['lactation','🔵','Lactancia'],['rest','🟠','Descanso'],
    ['heat','🌸','En celo'],['soon','🟡','Celo próximo'],['ready','🟢','Aptas'],['inactive','⚪','No reproductoras / Esterilizadas']
   ].map(function(x){
     return '<button type="button" class="repro-summary-item-v575 '+x[0]+'" data-repro-filter-v577="'+x[0]+'"><span>'+x[1]+' '+x[2]+'</span><b>'+counts[x[0]]+'</b></button>';
   }).join('');
 }

 var visibleStates=reproStatusFilterV577?states.filter(function(x){
   if(reproStatusFilterV577==='inactive')return x.state.key==='nonbreeding'||x.state.key==='sterilized';
   return x.state.key===reproStatusFilterV577;
 }):states;
 list.innerHTML=visibleStates.length?visibleStates.map(function(x){
   var d=x.dog,s=x.state,di=reproductiveDateInfoV575(d,s);
   var cls=s.key==='heat'?'soon':s.key;
   var heatPill=s.key==='heat'?'<span class="repro-heat-pill-v575">🌸 EN CELO</span>':'';
   var detail=s.detail||'';
   return '<button type="button" class="repro-full-row-v575" data-repro-dog-v575="'+esc(d.id)+'">'+
    '<div class="photo">'+(d.photo?'<img src="'+d.photo+'" alt="">':'♀')+'</div>'+
    '<div><div class="repro-name-v575">'+esc(d.name)+'</div>'+
      '<div><span class="repro-state-v57 '+esc(cls)+'">'+s.icon+' '+esc(s.label)+'</span>'+heatPill+'</div>'+
      '<div class="repro-detail-v575">'+esc(detail)+'</div></div>'+
    '<div class="repro-row-right-v575">'+(di.label?'<div class="repro-date-label-v575">'+esc(di.label)+'</div>':'')+
      (di.date?'<div class="repro-date-v575">'+(di.date.indexOf('-')===4?fmt(di.date):esc(di.date))+'</div>':'')+'<div>›</div></div>'+
   '</button>';
 }).join(''):'<div class="pet-search-empty-v575">'+(reproStatusFilterV577?'No hay hembras en este estado.':'No hay hembras registradas.')+'</div>';

 document.querySelectorAll('[data-repro-filter-v577]').forEach(function(b){
   b.classList.toggle('active-filter-v577',b.dataset.reproFilterV577===reproStatusFilterV577);
   b.onclick=function(){
     var f=b.dataset.reproFilterV577;
     reproStatusFilterV577=(reproStatusFilterV577===f?'':f);
     renderReproStatusPageV575();
   };
 });
 document.querySelectorAll('[data-repro-dog-v575]').forEach(function(b){
   b.onclick=function(){showDog(b.dataset.reproDogV575);setTimeout(function(){activateInner('reproduccion')},0)};
 });

}
function renderPetsFilteredV575(){
 var target=q('dogList');if(!target)return;
 var term=(q('petSearchNameV575')?q('petSearchNameV575').value:'').trim().toLowerCase();
 var sex=q('petSearchSexV575')?q('petSearchSexV575').value:'';
 var arr=(data.dogs||[]).filter(function(d){
   return (!term||(d.name||'').toLowerCase().indexOf(term)>=0)&&(!sex||d.sex===sex);
 });
 target.innerHTML=arr.length?arr.map(function(d){
   var bell=hasPendingAlert15V561(d)?'<span class="dog-alert-bell-v561" aria-label="Aviso pendiente en los próximos 15 días">🔔</span>':'';
   var reproIcon='',reproLine='';
   if(d.sex==='Hembra'&&(d.species||'Perro')==='Perro'){
     var rs;
     try{rs=reproductiveDisplayStateV575(d)}catch(err){rs=null}
     if(rs){
       var symbol=rs.key==='heat'?'🌸':'♀';
       reproIcon='<span class="pet-repro-icon-v576 '+esc(rs.key)+'" title="'+esc(rs.label)+'" aria-label="Estado reproductivo: '+esc(rs.label)+'">'+symbol+'</span>';
       var di=reproductiveDateInfoV575(d,rs),dateText='';
       if(rs.key==='heat'&&rs.heatEnd)dateText='Hasta aprox. '+fmt(rs.heatEnd);
       else if(di&&di.date)dateText=(di.date.indexOf('-')===4?fmt(di.date):di.date);
       reproLine='<div class="pet-repro-line-v576"><span class="pet-repro-pill-v576 '+esc(rs.key)+'">'+rs.icon+' '+esc(rs.label)+'</span>'+
        (dateText?'<span class="pet-repro-date-v576">'+esc(dateText)+'</span>':'')+'</div>';
     }
   }
   var topIcons=(bell||reproIcon)?'<div class="pet-card-top-icons-v576">'+bell+reproIcon+'</div>':'';
   return '<div class="card dog dog-card-v561" data-dog="'+esc(d.id)+'">'+topIcons+
     '<div class="photo">'+(d.photo?'<img src="'+d.photo+'">':speciesEmoji(d.species))+
       (d.sex==='Macho'?'<span class="sex-badge male" aria-label="Macho">&#9794;</span>':d.sex==='Hembra'?'<span class="sex-badge female" aria-label="Hembra">&#9792;</span>':'')+
     '</div><div><div class="name">'+esc(d.name)+'</div><div class="small">'+esc(d.breed||d.species||'')+(d.sex?' · '+esc(d.sex):'')+
     '</div><div class="dog-birth-v561">📅 '+esc(petBirthTextV561(d))+'</div>'+reproLine+'</div><span class="dog-arrow-v561">›</span></div>';
 }).join(''):'<div class="card pet-search-empty-v575">No se han encontrado mascotas.</div>';
 document.querySelectorAll('[data-dog]').forEach(function(el){el.onclick=function(){showDog(el.getAttribute('data-dog'))}});
}

function renderBreederFemalesV57(){
 var panel=q('breederFemalesListV57');if(!panel)return;
 var females=(data.dogs||[]).filter(function(d){return d.sex==='Hembra' && (d.species||'Perro')==='Perro'});
 if(q('breederFemalesCountV57'))q('breederFemalesCountV57').textContent=females.length;

 var counts={pregnant:0,lactation:0,rest:0,heat:0,soon:0,ready:0,inactive:0};
 females.forEach(function(d){
   var s;
   try{s=reproductiveDisplayStateV575(d)}catch(err){s=null}
   if(!s)return;
   if(s.key==='nonbreeding'||s.key==='sterilized')counts.inactive++;
   else if(counts[s.key]!=null)counts[s.key]++;
 });

 panel.className='home-repro-summary-v581';
 panel.innerHTML=[
   ['pregnant','🟣','Gestantes'],
   ['lactation','🔵','Lactancia'],
   ['rest','🟠','Descanso'],
   ['heat','🌸','En celo'],
   ['soon','🟡','Celo próximo'],
   ['ready','🟢','Aptas'],
   ['inactive','⚪','No reproduct.']
 ].map(function(x){
   return '<div class="home-repro-summary-item-v581"><span>'+x[1]+' '+x[2]+'</span><b>'+counts[x[0]]+'</b></div>';
 }).join('');
}
function renderBreedingPlanV57(d){
 if(!q('breedingPlanCardV57'))return;
 var female=d&&d.sex==='Hembra';
 q('breedingPlanCardV57').classList.toggle('is-hidden',!female);
 if(!female)return;
 var plan=breedingRestCyclesV57(d),select=q('breedingRestCyclesV57');
 if(select)select.value=String(plan);
 var s=breedingStateV57(d),box=q('breedingPlanStatusV57');
 if(!box||!s)return;
 box.className='breeding-plan-status-v57 '+(s.key==='rest'?'warning':(s.key==='nonbreeding'||s.key==='sterilized')?'inactive':'ok');
 var litter=latestLitterV57(d);
 var text='<b>'+s.icon+' '+esc(s.label)+'</b><br>'+esc(s.detail||'');
 if(litter)text+='<br>Último parto: '+fmt(litter.birth);
 if(s.nextHeat)text+='<br>Próximo celo estimado: '+fmt(s.nextHeat);
 if(s.eligible)text+='<br>Próximo celo apto estimado: '+fmt(s.eligible);
 box.innerHTML=text;
}
function matingNeedsRestWarningV57(d,date){
 if(!d||d.sex!=='Hembra')return false;
 var s=breedingStateV57(d);
 if(!s||s.key==='nonbreeding'||s.key==='sterilized'||s.key!=='rest')return false;
 if(s.eligible&&date>=s.eligible)return false;
 return true;
}


function petReproSummaryCardV576(d){
 if(!d||d.sex!=='Hembra'||(d.species||'Perro')!=='Perro')return '';
 var s;
 try{s=reproductiveDisplayStateV575(d)}catch(err){return ''}
 if(!s)return '';
 var di=reproductiveDateInfoV575(d,s);
 var dateValue='';
 if(s.key==='heat'&&s.heatEnd)dateValue='Fin estimado '+fmt(s.heatEnd);
 else if(di&&di.date)dateValue=(di.date.indexOf('-')===4?fmt(di.date):di.date);
 return '<div class="card pet-detail-repro-v576">'+
  '<div class="pet-detail-repro-head-v576"><span class="female-symbol-detail-v576">♀</span><b>Estado reproductivo</b>'+
   '<span class="pet-repro-pill-v576 '+esc(s.key)+'">'+s.icon+' '+esc(s.label)+'</span></div>'+
  '<div class="small">'+esc(s.detail||'')+(dateValue?' · '+esc(dateValue):'')+'</div>'+
 '</div>';
}

function showDog(id){
 current=id;var d=dog(id);if(!d)return;applySpeciesView(d);applyReproSexVisibility(d);applyAppMode();renderBreedingPlanV57(d);
 q('detailTitle').textContent=d.name;
 q('detailHead').innerHTML='<div class="profile-head"><div class="photo">'+(d.photo?'<img src="'+d.photo+'" alt="Foto">':speciesEmoji(d.species))+(d.sex==='Macho'?'<span class="sex-badge male" aria-label="Macho">&#9794;</span>':d.sex==='Hembra'?'<span class="sex-badge female" aria-label="Hembra">&#9792;</span>':'')+'</div><div class="profile-main"><div class="profile-name">'+esc(d.name||'Mascota')+'</div><div class="profile-meta">'+esc(d.breed||'')+(d.sex?' · '+esc(d.sex):'')+(d.birth?' · '+ageText(d.birth):'')+'</div></div></div>';
 q('dataPanel').innerHTML=v53SummaryHTML(d)+'<div class="card"><div class="small"><b>Especie:</b> '+esc(d.species||'Perro')+'<br><b>Nacimiento:</b> '+fmt(d.birth)+'<br><b>Microchip:</b> '+esc(d.chip||'—')+'<br><b>Color:</b> '+esc(d.color||'—')+'<br><b>Procedencia:</b> '+esc(d.origin||'—')+'</div></div>'+petReproSummaryCardV576(d);

 var ms=(d.measures||[]).slice().sort(function(a,b){return (b.date||'').localeCompare(a.date||'')});
 if(q('growthSummaryV54'))q('growthSummaryV54').innerHTML=v54GrowthSummary(ms);
 q('measureList').innerHTML=ms.length?ms.map(function(m){return '<div class="record"><b>'+fmt(m.date)+'</b><div class="small">'+(m.weight?'Peso '+esc(m.weight)+' kg · ':'')+(m.height?'Altura '+esc(m.height)+' cm · ':'')+(m.length?'Largo '+esc(m.length)+' cm · ':'')+(m.chest?'Pecho '+esc(m.chest)+' cm':'')+'</div></div>'}).join(''):'<div class="small" style="padding:10px">Sin controles.</div>';
 drawWeightChart(ms);

 var hs=(d.health||[]).slice().sort(function(a,b){return (b.date||'').localeCompare(a.date||'')});
 var summaryGroups=[
  ['Vacuna','Vacunas'],
  ['Desparasitación interna','Desparasitación interna'],
  ['Desparasitación externa','Desparasitación externa'],
  ['Tratamiento / medicación','Tratamientos / medicación'],
  ['Visita veterinaria','Visitas veterinarias'],
  ['Cirugía / intervención','Cirugías / intervenciones'],
  ['Analítica / prueba','Analíticas / pruebas'],
  ['Otro','Otros']
 ];
 q('healthSummary').innerHTML=summaryGroups.map(function(g){
   var arr=hs.filter(function(h){return h.type===g[0]});
   var next=arr.filter(function(h){return h.next}).sort(function(a,b){return a.next.localeCompare(b.next)})[0];
   return '<div class="health-card"><b>'+esc(g[1])+'</b><div class="small">'+arr.length+' registro(s)</div>'+
     (next?'<span class="badge '+(days(next.next)<=7?'due':'')+'">Próxima '+fmt(next.next)+'</span>':'')+'</div>';
 }).join('');
 q('healthList').innerHTML='';
 var ds=(d.docs||[]).slice().sort(function(a,b){return (b.date||'').localeCompare(a.date||'')});
 var cats=[['Cartilla sanitaria','📘'],['Pasaporte','🛂'],['Pedigree','📜'],['Pruebas genéticas','🧬'],['Certificado veterinario','🩺'],['Contrato','📄'],['Cesión / cambio de titularidad','🔁'],['Traslado entre comunidades','🗺️'],['Otro','🗂️']];
 q('docFolders').innerHTML=cats.map(function(c){
   var arr=ds.filter(function(x){return x.type===c[0]});
   var body=arr.length?arr.map(function(doc){
     return '<div class="record"><div class="doc-meta"><div class="doc-name">'+esc(doc.name||doc.type)+'</div><div class="small">'+(doc.date?fmt(doc.date):'')+'</div>'+(doc.notes?'<div class="small">'+esc(doc.notes)+'</div>':'')+'</div><div class="doc-actions">'+(doc.file?'<button class="btn gold open-doc" data-doc="'+esc(doc.id)+'">Abrir</button>':'')+'<button class="btn danger del-doc" data-doc="'+esc(doc.id)+'">Eliminar</button></div></div>';
   }).join(''):'<div class="small" style="padding:11px 0">Todavía no hay archivos en esta categoría.</div>';
   return '<div class="doc-category"><div class="doc-category-head"><div class="doc-category-title"><div class="doc-category-icon">'+c[1]+'</div><div><div class="doc-category-name">'+esc(c[0])+'</div><div class="doc-category-count">'+arr.length+' archivo(s)</div></div></div><button class="btn gold doc-category-add" data-add-doc="'+esc(c[0])+'">+ Añadir</button></div><div class="doc-category-body">'+body+'</div></div>';
 }).join('');
 Array.prototype.forEach.call(document.querySelectorAll('[data-add-doc]'),function(b){b.onclick=function(){openDocForCategory(b.dataset.addDoc)}});
 Array.prototype.forEach.call(document.querySelectorAll('.open-doc'),function(b){b.onclick=function(){openDocument(b.dataset.doc)}});
 Array.prototype.forEach.call(document.querySelectorAll('.del-doc'),function(b){b.onclick=function(){deleteDocument(b.dataset.doc)}});

 var rs=(d.repro||[]).slice().sort(function(a,b){return (b.date||'').localeCompare(a.date||'')});
 if(q('reproTimelineV54')){q('reproTimelineV54').innerHTML=d.sex==='Hembra'?v54ReproTimeline(d):'';if(d.sex==='Hembra')v54BindReproTimeline();}
 q('reproList').innerHTML=rs.length?'<div class="card">'+rs.map(function(r){
   var expectedText='';
   if(r.expected){
     if(r.type==='Celo')expectedText=' · Próximo celo aprox. '+fmt(r.expected);
     else if(r.type==='Monta')expectedText=' · Parto aprox. '+fmt(r.expected);
     else expectedText=' · Prevista '+fmt(r.expected);
   }
   return '<div class="timeline-item"><b>'+esc(r.type)+'</b>'+
     '<div class="small">'+fmt(r.date)+(r.value?' · '+esc(r.value):'')+(r.male?' · '+esc(r.male):'')+expectedText+'</div>'+
     (r.notes?'<div class="small">'+esc(r.notes)+'</div>':'')+
     '<div class="repro-record-actions">'+
       '<button class="btn gold edit-repro-record" data-repro-id="'+esc(r.id)+'">Editar</button>'+
       '<button class="btn danger delete-repro-record" data-repro-id="'+esc(r.id)+'">Eliminar</button>'+
     '</div></div>';
 }).join('')+'</div>':'<div class="small" style="padding:10px">Sin registros de reproducción.</div>';
 document.querySelectorAll('.edit-repro-record').forEach(function(b){
  b.onclick=function(){openReproRecordEditor(b.dataset.reproId)};
 });
 document.querySelectorAll('.delete-repro-record').forEach(function(b){
  b.onclick=function(){
   if(!confirm('¿Eliminar este registro de reproducción?'))return;
   d.repro=(d.repro||[]).filter(function(x){return x.id!==b.dataset.reproId});
   save(function(){
    showDog(current);
    setTimeout(function(){activateInner('reproduccion')},0);
   });
  };
 });

 var cs=(d.contracts||[]).slice().sort(function(a,b){return (b.date||'').localeCompare(a.date||'')});
 q('contractHistory').innerHTML=cs.length?'<div class="card"><div class="name">Contratos generados</div>'+cs.map(function(c){
   return '<div class="record"><b>'+esc(c.type==='breeding'?'Compraventa + acuerdo de cría':'Compraventa')+'</b>'+
    '<div class="small">'+fmt(c.date)+' · '+esc(c.buyer||'')+(c.price?' · '+esc(c.price)+' €':'')+'</div>'+
    '<div class="contract-history-actions">'+
      '<button class="btn gold view-contract" data-contract="'+esc(c.id)+'">Ver</button>'+
      '<button class="btn danger delete-contract" data-contract="'+esc(c.id)+'">Eliminar</button>'+
    '</div></div>';
 }).join('')+'</div>':'<div class="small" style="padding:10px">Todavía no hay contratos generados.</div>';
 Array.prototype.forEach.call(document.querySelectorAll('.view-contract'),function(b){
  b.onclick=function(){
   var rec=(d.contracts||[]).find(function(x){return x.id===b.dataset.contract});
   if(!rec)return;
   if(!rec.payload){alert('Este contrato fue creado con una versión anterior y no guardó todos los datos necesarios para volver a mostrarlo. Puedes eliminarlo o generar uno nuevo.');return}
   contractReturnTab='contratos';
   cmOpenModal('contractPreviewModal');
   renderContractCanvas(rec.payload,rec.animalData||d,rec.seller||((data.settings&&data.settings.seller)||{}));
  };
 });
 Array.prototype.forEach.call(document.querySelectorAll('.delete-contract'),function(b){
  b.onclick=function(){
   if(!confirm('¿Eliminar este contrato generado?'))return;
   d.contracts=(d.contracts||[]).filter(function(x){return x.id!==b.dataset.contract});
   save(function(){showDog(current);setTimeout(function(){activateInner('contratos')},0)});
  };
 });
 
 var v=d.vet||{};
 q('vetClinic').value=v.clinic||'';q('vetPhone').value=v.phone||'';q('vetRecord').value=v.record||'';
 q('vetAllergies').value=v.allergies||'';q('vetConditions').value=v.conditions||'';q('vetMedication').value=v.medication||'';
 var lastVaccine=(d.health||[]).filter(function(h){return h.type==='Vacuna'}).sort(function(a,b){return (b.date||'').localeCompare(a.date||'')})[0];
 var lastInternal=(d.health||[]).filter(function(h){return h.type==='Desparasitación interna'}).sort(function(a,b){return (b.date||'').localeCompare(a.date||'')})[0];
 var lastExternal=(d.health||[]).filter(function(h){return h.type==='Desparasitación externa'}).sort(function(a,b){return (b.date||'').localeCompare(a.date||'')})[0];
 q('healthHighlights').innerHTML='<div class="card"><div class="name">Resumen veterinario</div><div class="health-grid">'+
  '<div class="health-card"><b>'+(lastVaccine?fmt(lastVaccine.date):'—')+'</b><div class="small">Última vacuna</div></div>'+
  '<div class="health-card"><b>'+(lastInternal?fmt(lastInternal.date):'—')+'</b><div class="small">Desparasitación interna</div></div>'+
  '<div class="health-card"><b>'+(lastExternal?fmt(lastExternal.date):'—')+'</b><div class="small">Desparasitación externa</div></div>'+
  '</div></div>';


 q('galleryGrid').innerHTML=(d.gallery||[]).length?(d.gallery||[]).map(function(g){
   return '<div class="gallery-item"><img src="'+g.data+'" alt="Foto"><button class="gallery-del" data-gallery="'+g.id+'">×</button></div>';
 }).join(''):'<div class="small">Aún no hay fotos en la galería.</div>';
 Array.prototype.forEach.call(document.querySelectorAll('[data-gallery]'),function(b){b.onclick=function(e){e.stopPropagation();var id=b.dataset.gallery;d.gallery=d.gallery.filter(function(x){return x.id!==id});save();showDog(current);activateInner('galeria')}});

 q('litterList').innerHTML=(d.litters||[]).length?(d.litters||[]).slice().sort(function(a,b){return (b.birth||'').localeCompare(a.birth||'')}).map(function(l){
   var pups=l.puppiesList||[];
   return '<div class="litter-card"><div class="litter-head"><div><div class="name">Camada '+fmt(l.birth)+'</div><div class="small"><b>Padre:</b> '+esc(l.father||'—')+' · <b>Madre:</b> '+esc(l.mother||'—')+' · <b>Cachorros:</b> '+pups.length+'</div></div><div class="litter-head-actions"><button class="btn gold add-puppy" data-litter="'+esc(l.id)+'">+ Cachorro</button><button class="btn danger delete-litter" data-litter="'+esc(l.id)+'">Eliminar camada</button></div></div>'+
   (l.notes?'<div class="small" style="margin-top:7px">'+esc(l.notes)+'</div>':'')+
   '<div class="puppy-grid">'+(pups.length?pups.map(function(p){
      var weights=p.weights||[],last=weights.slice().sort(function(a,b){return (b.date||'').localeCompare(a.date||'')})[0];
      var currentWeight=last?last.weight:(p.birthWeight||'');
      return '<div class="puppy-card"><div class="puppy-top"><div class="puppy-photo">'+(p.photo?'<img src="'+p.photo+'">':'🐶')+'</div><div><div class="puppy-name">'+esc(p.name||'Cachorro')+'</div><div class="small">'+esc(p.sex||'—')+(p.color?' · '+esc(p.color):'')+'</div><span class="puppy-status">'+esc(p.status||'Disponible')+'</span></div></div>'+
       '<div class="puppy-weight-line">'+(p.birthWeight?'Nacimiento: '+esc(p.birthWeight)+' g':'')+(currentWeight?' · Último peso: '+esc(currentWeight)+' g':'')+(p.chip?' · Chip: '+esc(p.chip):'')+'</div>'+
       '<div class="puppy-actions">'+
       '<button class="btn gold edit-puppy" data-litter="'+esc(l.id)+'" data-pup="'+esc(p.id)+'">Editar</button>'+
       '<button class="btn gold weigh-puppy" data-litter="'+esc(l.id)+'" data-pup="'+esc(p.id)+'">+ Peso</button>'+
       '<button class="btn primary puppy-contract" data-litter="'+esc(l.id)+'" data-pup="'+esc(p.id)+'">Contrato</button>'+
       '<button class="btn gold puppy-transfer" data-litter="'+esc(l.id)+'" data-pup="'+esc(p.id)+'">RAIA/REIAC</button>'+
       '<button class="btn primary convert-puppy" data-litter="'+esc(l.id)+'" data-pup="'+esc(p.id)+'">Convertir en mascota</button>'+
       '<button class="btn danger delete-puppy" data-litter="'+esc(l.id)+'" data-pup="'+esc(p.id)+'">Eliminar</button>'+
       '</div></div>';
   }).join(''):'<div class="small">Aún no hay cachorros individuales.</div>')+'</div></div>';
 }).join(''):'<div class="small" style="padding:10px">Sin camadas registradas.</div>';
 bindPuppyActions(d);

 q('generalNotes').value=d.generalNotes||'';
 cmBindPetShortcuts();
 activateInner('datos');
 open('detailModal');
}
function activateInner(name){
 Array.prototype.forEach.call(document.querySelectorAll('.inner-tabs button'),function(b){b.classList.toggle('active',b.dataset.inner===name)});
 Array.prototype.forEach.call(document.querySelectorAll('[data-cm-inner]'),function(b){b.classList.toggle('active',b.dataset.cmInner===name)});
 Array.prototype.forEach.call(document.querySelectorAll('.inner-page'),function(p){p.classList.toggle('active',p.id==='inner-'+name)});
}
Array.prototype.forEach.call(document.querySelectorAll('.inner-tabs button'),function(b){b.onclick=function(){activateInner(b.dataset.inner)}});


function dataUrlToFile(dataUrl,name,type){
 try{
   var arr=dataUrl.split(','),mime=type||((arr[0].match(/:(.*?);/)||[])[1])||'application/octet-stream';
   var binary=atob(arr[1]),len=binary.length,u8=new Uint8Array(len);
   for(var i=0;i<len;i++)u8[i]=binary.charCodeAt(i);
   return new File([u8],name||'documento',{type:mime});
 }catch(e){return null}
}

function openDocForCategory(type){
 q('docForm').reset();
 q('docDate').value=today();
 q('docType').value=type||'Otro';
 cmOpenModal('docModal');
}

function openChildModal(id){
 var el=q(id);
 if(!el)return;
 // Hide dog detail while editing so the child window can never sit behind it.
 if(q('detailModal'))q('detailModal').classList.remove('open');
 if(el.parentNode!==document.body)document.body.appendChild(el);
 document.body.classList.add('child-modal-open');
 document.body.style.overflow='hidden';
 el.classList.add('open');
 el.style.setProperty('display','flex','important');
 el.style.setProperty('position','fixed','important');
 el.style.setProperty('inset','0','important');
 el.style.setProperty('z-index','2147483000','important');
}
function closeChildModal(id,returnTab){
 var el=q(id);
 if(el){
   el.classList.remove('open');
   el.style.removeProperty('display');
   el.style.removeProperty('position');
   el.style.removeProperty('inset');
   el.style.removeProperty('z-index');
 }
 document.body.classList.remove('child-modal-open');
 document.body.style.overflow='';
 setTimeout(syncBottomNav,0);
 if(current){
   showDog(current);
   if(returnTab)setTimeout(function(){activateInner(returnTab)},0);
 }
}

function openDocument(id){
 var d=dog(current),doc=(d.docs||[]).find(function(x){return x.id===id});
 if(!doc||!doc.file||!doc.file.data){
   alert('Este documento no contiene un archivo válido. Elimínalo y vuelve a adjuntarlo.');
   return;
 }

 currentDocFile=doc.file;
 var screen=q('docViewerModal'),body=q('docViewerBody');
 q('docViewerTitle').textContent=doc.name||doc.type||'Documento';

 // Move viewer outside every app/modal stacking context.
 if(screen.parentNode!==document.body){
   document.body.appendChild(screen);
 }

 // Completely hide every underlying modal, especially the dog's sheet.
 document.querySelectorAll('.modal').forEach(function(el){
   if(el!==screen){
     el.classList.remove('open');
     el.style.setProperty('display','none','important');
   }
 });

 document.body.classList.add('doc-viewer-open');
 document.body.style.overflow='hidden';

 // Force this screen above absolutely everything.
 screen.classList.remove('hidden');
 screen.style.setProperty('display','flex','important');
 screen.style.setProperty('position','fixed','important');
 screen.style.setProperty('inset','0','important');
 screen.style.setProperty('z-index','2147483647','important');
 screen.style.setProperty('visibility','visible','important');
 screen.style.setProperty('opacity','1','important');

 if(body.dataset.objectUrl){
   try{URL.revokeObjectURL(body.dataset.objectUrl)}catch(e){}
   delete body.dataset.objectUrl;
 }
 body.innerHTML='';

 var type=(doc.file.type||'').toLowerCase();
 var name=(doc.file.name||'').toLowerCase();

 if(type.indexOf('image/')===0 || /\.(jpg|jpeg|png|webp|gif)$/i.test(name)){
   var img=document.createElement('img');
   img.alt='Documento';
   img.src=doc.file.data;
   img.style.maxWidth='100%';
   img.style.maxHeight='100%';
   img.style.objectFit='contain';
   img.onerror=function(){
     body.innerHTML='<div class="doc-view-fallback">La imagen guardada no puede mostrarse. Vuelve a adjuntarla.</div>';
   };
   body.appendChild(img);
   requestAnimationFrame(function(){screen.scrollIntoView({block:'start'});body.scrollTop=0});
   return;
 }

 if(type==='application/pdf' || name.endsWith('.pdf')){
   var f=dataUrlToFile(doc.file.data,doc.file.name,'application/pdf');
   if(!f){
     body.innerHTML='<div class="doc-view-fallback">No se ha podido preparar este PDF.</div>';
     return;
   }
   var url=URL.createObjectURL(f);
   body.dataset.objectUrl=url;

   var iframe=document.createElement('iframe');
   iframe.title='Documento PDF';
   iframe.src=url+'#view=FitH';
   iframe.style.width='100%';
   iframe.style.height='100%';
   iframe.style.border='0';
   body.appendChild(iframe);

   var fb=document.createElement('div');
   fb.className='doc-pdf-fallback';
   fb.innerHTML='Si el PDF no aparece, pulsa aquí:<br><button class="btn gold" style="margin-top:6px">Abrir PDF</button>';
   body.appendChild(fb);
   fb.querySelector('button').onclick=function(){
     var w=window.open(url,'_blank');
     if(!w)location.href=url;
   };
   setTimeout(function(){fb.style.display='block'},1800);
   requestAnimationFrame(function(){screen.scrollIntoView({block:'start'});body.scrollTop=0});
   return;
 }

 body.innerHTML='<div class="doc-view-fallback">Este tipo de archivo no tiene vista previa.<br><button id="externalDocBtn" class="btn gold" style="margin-top:12px">Abrir archivo</button></div>';
 setTimeout(function(){
   var b=q('externalDocBtn');
   if(b)b.onclick=function(){
     var f=dataUrlToFile(doc.file.data,doc.file.name,doc.file.type);
     if(!f)return;
     var u=URL.createObjectURL(f),w=window.open(u,'_blank');
     if(!w)location.href=u;
   };
 },0);
}
function deleteDocument(id){
 if(!confirm('¿Eliminar este documento?'))return;var d=dog(current);d.docs=(d.docs||[]).filter(function(x){return x.id!==id});save();showDog(current);
}

function allCalendarEvents(){
 var ev=[];
 data.dogs.forEach(function(d){
   (d.health||[]).forEach(function(h){
     if(h.next && !h.completed){
       ev.push({
         id:'health-'+(h.id||''), sourceId:h.id||'', date:h.next, dog:d.name, dogid:d.id,
         group:'Salud', type:h.type||'Salud',
         title:h.product||h.type||'Control de salud',
         source:'health'
       });
     }
   });
   (d.repro||[]).forEach(function(r){
     if(r.expected && !r.completed){
       var title=r.type==='Celo'?'Próximo celo':r.type==='Monta'?'Parto aproximado':(r.type||'Reproducción');
       ev.push({
         id:'repro-'+(r.id||''), sourceId:r.id||'', date:r.expected, dog:d.name, dogid:d.id,
         group:'Reproducción', type:r.type||'Reproducción', title:title, source:'repro'
       });
     }
   });
 });
 return ev.sort(function(a,b){return (a.date||'').localeCompare(b.date||'')});
}

function eventState(date){
 var diff=days(date);
 if(diff<0)return 'overdue';
 if(diff===0)return 'today';
 return 'upcoming';
}
function eventStateText(date){
 var diff=days(date);
 if(diff<0)return 'Vencido '+Math.abs(diff)+' d';
 if(diff===0)return 'Hoy';
 if(diff===1)return 'Mañana';
 return 'En '+diff+' d';
}
function eventIcon(ev){
 var t=(ev.type||'').toLowerCase();
 if(t.indexOf('vacuna')>=0)return '💉';
 if(t.indexOf('desparas')>=0)return '🪱';
 if(t.indexOf('tratamiento')>=0 || t.indexOf('medic')>=0)return '💊';
 if(t.indexOf('visita')>=0 || t.indexOf('revisión')>=0)return '🩺';
 if(t.indexOf('celo')>=0)return '🌸';
 if(t.indexOf('monta')>=0 || (ev.title||'').toLowerCase().indexOf('parto')>=0)return '🐾';
 return ev.group==='Reproducción'?'🧬':'📅';
}
function renderSmartAlerts(){
 if(!q('smartAlerts'))return;
 var arr=allCalendarEvents().filter(function(e){return days(e.date)<=45}).sort(function(a,b){return a.date.localeCompare(b.date)});
 // Prioritize overdue/today, then upcoming; cap at 8
 arr=arr.slice(0,8);
 q('smartAlerts').innerHTML=arr.length?arr.map(function(e){
   var st=eventState(e.date);
   return '<div class="alert-item" data-alert-dog="'+esc(e.dogid)+'" data-alert-group="'+esc(e.group)+'">'+
    '<div class="alert-icon">'+eventIcon(e)+'</div>'+
    '<div><div class="alert-title">'+esc(e.dog)+' · '+esc(e.title)+'</div><div class="alert-sub">'+fmt(e.date)+' · '+esc(e.group)+'</div></div>'+
    '<div class="alert-state '+st+'">'+eventStateText(e.date)+'</div></div>';
 }).join(''):'<div class="small" style="padding:10px 0">No hay avisos próximos.</div>';
 Array.prototype.forEach.call(document.querySelectorAll('[data-alert-dog]'),function(el){
   el.onclick=function(){
     showDog(el.dataset.alertDog);
     setTimeout(function(){activateInner(el.dataset.alertGroup==='Reproducción'?'reproduccion':'salud')},0);
   };
 });
}


function isoDateV56(d){
 return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
}
function addMonthsV56(date,n){
 var d=new Date(date.getFullYear(),date.getMonth()+n,date.getDate());
 return d;
}
function calendarRangeV56(){
 var mode=q('calendarRangeMode').value;
 var start,end;
 if(mode==='months'){
   var fm=q('calendarMonthFrom').value,tm=q('calendarMonthTo').value;
   if(!fm||!tm)return null;
   start=fm+'-01';
   var parts=tm.split('-'),last=new Date(Number(parts[0]),Number(parts[1]),0);
   end=isoDateV56(last);
 }else{
   start=q('calendarDateFrom').value;end=q('calendarDateTo').value;
   if(!start||!end)return null;
 }
 var s=new Date(start+'T12:00:00'),e=new Date(end+'T12:00:00');
 if(e<s)return {error:'La fecha final no puede ser anterior a la inicial.'};
 var max=addMonthsV56(s,6);
 if(e>max)return {error:'El periodo máximo de búsqueda es de 6 meses.'};
 return {start:start,end:end};
}
function updateCalendarRangeModeV56(){
 var mode=q('calendarRangeMode').value;
 q('calendarMonthRange').classList.toggle('hidden',mode!=='months');
 q('calendarDateRange').classList.toggle('hidden',mode!=='dates');
 renderCalendar();
}

function renderCalendar(){
 if(!q('calendarDog'))return;
 var dogid=q('calendarDog').value;
 var grp=q('calendarType')?q('calendarType').value:'';
 var range=calendarRangeV56();
 var help=q('calendarRangeHelp');
 if(range&&range.error){
   if(help){help.textContent=range.error;help.classList.add('error')}
   q('calendarList').innerHTML='<div class="card empty">'+esc(range.error)+'</div>';
   return;
 }
 if(help){help.textContent='Máximo 6 meses por búsqueda.';help.classList.remove('error')}
 var arr=allCalendarEvents().filter(function(e){
   var okRange=!range||(e.date>=range.start&&e.date<=range.end);
   return okRange&&(!dogid||e.dogid===dogid)&&(!grp||e.group===grp);
 });
 q('calendarList').innerHTML=arr.length?arr.map(function(e){
   var st=eventState(e.date);
   return '<div class="card calendar-event '+st+'" data-cal-dog="'+esc(e.dogid)+'" data-cal-group="'+esc(e.group)+'">'+
    '<div class="name">'+eventIcon(e)+' '+esc(e.dog)+'</div>'+
    '<div>'+esc(e.title)+'</div>'+
    '<div class="small">'+fmt(e.date)+' · '+esc(e.group)+' · '+eventStateText(e.date)+'</div></div>';
 }).join(''):'<div class="card empty">No hay eventos en este periodo.</div>';
 Array.prototype.forEach.call(document.querySelectorAll('[data-cal-dog]'),function(el){
   el.onclick=function(){
     showDog(el.dataset.calDog);
     setTimeout(function(){activateInner(el.dataset.calGroup==='Reproducción'?'reproduccion':'salud')},0);
   };
 });
}


function renderSearch(){
 var term=(q('searchInput').value||'').trim().toLowerCase();
 if(!term){q('searchResults').innerHTML='<div class="card empty">Escribe para buscar.</div>';return}
 var hits=[];
 data.dogs.forEach(function(d){
   var hay=[d.name,d.chip,d.species,d.breed,d.color,d.origin].join(' ').toLowerCase();
   var docMatch=(d.docs||[]).some(function(x){return ((x.name||'')+' '+(x.type||'')).toLowerCase().indexOf(term)>=0});
   if(hay.indexOf(term)>=0||docMatch)hits.push(d);
 });
 q('searchResults').innerHTML=hits.length?hits.map(function(d){
   return '<div class="card dog search-hit" data-search-dog="'+esc(d.id)+'"><div class="photo">'+(d.photo?'<img src="'+d.photo+'">':speciesEmoji(d.species))+'</div><div><div class="name">'+esc(d.name)+'</div><div class="small">'+esc(d.breed||'')+' · '+esc(d.chip||'')+'</div></div><span>›</span></div>';
 }).join(''):'<div class="card empty">No hay resultados.</div>';
 Array.prototype.forEach.call(document.querySelectorAll('[data-search-dog]'),function(el){el.onclick=function(){showDog(el.dataset.searchDog)}});
}

function calendar(name,type,date){
 var ds=date.replace(/-/g,''),next=new Date(date+'T12:00:00');next.setDate(next.getDate()+1);
 var y=next.getFullYear()+String(next.getMonth()+1).padStart(2,'0')+String(next.getDate()).padStart(2,'0');
 var ics='BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Petoria//ES\r\nBEGIN:VEVENT\r\nDTSTART;VALUE=DATE:'+ds+'\r\nDTEND;VALUE=DATE:'+y+'\r\nSUMMARY:'+type+' - '+name+'\r\nBEGIN:VALARM\r\nTRIGGER:-P1D\r\nACTION:DISPLAY\r\nDESCRIPTION:Recordatorio Petoria\r\nEND:VALARM\r\nEND:VEVENT\r\nEND:VCALENDAR';
 var blob=new Blob([ics],{type:'text/calendar'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='Senda-de-Rivas-'+date+'.ics';document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(url)},1000)
}

Array.prototype.forEach.call(document.querySelectorAll('.nav button'),function(b){b.onclick=function(){
 Array.prototype.forEach.call(document.querySelectorAll('.nav button'),function(x){x.classList.remove('active')});
 Array.prototype.forEach.call(document.querySelectorAll('.page'),function(x){x.classList.remove('active')});
 b.classList.add('active');
 q(b.dataset.page).classList.add('active');
 q('addBtn').classList.toggle('hidden',b.dataset.page!=='perros');
}});
Array.prototype.forEach.call(document.querySelectorAll('[data-close]'),function(b){b.onclick=function(){close(b.dataset.close)}});


if(q('petSearchNameV575'))q('petSearchNameV575').addEventListener('input',renderPetsFilteredV575);
if(q('petSearchSexV575'))q('petSearchSexV575').addEventListener('change',renderPetsFilteredV575);
if(q('openReproStatusV575'))q('openReproStatusV575').onclick=function(){cmGoPage('estado-reproductivo')};
if(q('openReproPlusV580'))q('openReproPlusV580').onclick=function(){cmGoPage('estado-reproductivo')};

q('addBtn').onclick=function(){
 pendingDogPhoto=null;q('dogForm').reset();q('dogSpecies').value='Perro';q('dogId').value='';
 q('dogPhotoPreview').classList.add('hidden');q('dogPhotoPreviewImg').removeAttribute('src');
 q('dogModalTitle').textContent='Nueva ficha';cmOpenModal('dogModal');
};
q('dogForm').onsubmit=function(e){
 e.preventDefault();
 var id=q('dogId').value||uid(),old=dog(id);
 var chosenPhoto=pendingDogPhoto||(old&&old.photo)||null;
 var d={
   id:id,name:q('dogName').value.trim(),birth:q('dogBirth').value,sex:q('dogSex').value,
   species:q('dogSpecies').value||'Perro',breed:q('dogBreed').value.trim(),color:q('dogColor').value.trim(),chip:q('dogChip').value.trim(),
   origin:q('dogOrigin').value.trim(),notes:q('dogNotes').value.trim(),
   generalNotes:(old&&old.generalNotes)||q('dogNotes').value.trim(),
   photo:chosenPhoto,
   measures:(old&&old.measures)||[],health:(old&&old.health)||[],docs:(old&&old.docs)||[],
   repro:(old&&old.repro)||[],contracts:(old&&old.contracts)||[],gallery:(old&&old.gallery)||[],litters:(old&&old.litters)||[],vet:(old&&old.vet)||{}
 };
 if(old)Object.assign(old,d);else data.dogs.push(d);
 current=id;
 save(function(){
   pendingDogPhoto=null;q('dogPhoto').value='';
   cmCloseModal('dogModal');render();
 });
};
q('editDog').onclick=function(){
 pendingDogPhoto=null;var d=dog(current);
 if(d.photo){q('dogPhotoPreviewImg').src=d.photo;q('dogPhotoPreview').classList.remove('hidden')}
 else{q('dogPhotoPreview').classList.add('hidden');q('dogPhotoPreviewImg').removeAttribute('src')}
q('dogId').value=d.id;q('dogName').value=d.name;q('dogBirth').value=d.birth||'';q('dogSex').value=d.sex||'';q('dogSpecies').value=d.species||'Perro';q('dogBreed').value=d.breed||'';q('dogColor').value=d.color||'';q('dogChip').value=d.chip||'';q('dogOrigin').value=d.origin||'';q('dogNotes').value=d.notes||'';q('dogModalTitle').textContent='Editar ficha';close('detailModal');cmOpenModal('dogModal')};
q('deleteDog').onclick=function(){if(confirm('¿Eliminar esta ficha?')){data.dogs=data.dogs.filter(function(d){return d.id!==current});save();close('detailModal')}};


q('dogPhoto').onchange=function(e){
 var f=e.target.files[0];
 if(f)setupCropFromFile(f);
};

(function(){
 var x=document.querySelector('#cropModal [data-close="cropModal"]');
 if(x)x.onclick=function(e){
  e.preventDefault();e.stopPropagation();
  cmCloseModal('cropModal');
 };
})();

q('cropZoom').oninput=function(){cropState.scale=parseFloat(this.value)||1;positionCropImage()};
q('cropReset').onclick=function(){cropState.scale=1;cropState.x=0;cropState.y=0;q('cropZoom').value='1';positionCropImage()};
q('cropUse').onclick=function(){
 var result=cropToCircleData();
 if(!result||result==='data:,'){alert('No se ha podido preparar la foto. Inténtalo de nuevo.');return}
 pendingDogPhoto=result;
 q('dogPhotoPreviewImg').src=result;
 q('dogPhotoPreview').classList.remove('hidden');
 cmCloseModal('cropModal');
};
(function(){
 var area=q('cropArea');
 function point(e){var t=e.touches&&e.touches[0]?e.touches[0]:e;return {x:t.clientX,y:t.clientY}}
 function down(e){cropState.drag=true;var p=point(e);cropState.startX=p.x;cropState.startY=p.y;cropState.baseX=cropState.x;cropState.baseY=cropState.y}
 function move(e){if(!cropState.drag)return;e.preventDefault();var p=point(e);cropState.x=cropState.baseX+(p.x-cropState.startX);cropState.y=cropState.baseY+(p.y-cropState.startY);positionCropImage()}
 function up(){cropState.drag=false}
 area.addEventListener('touchstart',down,{passive:true});area.addEventListener('touchmove',move,{passive:false});area.addEventListener('touchend',up);
 area.addEventListener('mousedown',down);window.addEventListener('mousemove',move);window.addEventListener('mouseup',up);
})();
q('logoInput').onchange=function(e){
 var f=e.target.files[0];if(!f)return;
 var r=new FileReader();r.onload=function(){data.settings=data.settings||{};data.settings.logo=r.result;save(function(){showCustomLogo()})};r.readAsDataURL(f);
};
q('removeLogo').onclick=function(){data.settings=data.settings||{};data.settings.logo='';q('logoInput').value='';save()};


function loadSellerForm(){
 var s=(data.settings&&data.settings.seller)||{};
 q('sellerName').value=s.name||'';q('sellerDni').value=s.dni||'';q('sellerPhone').value=s.phone||'';
 q('sellerAddress').value=s.address||'';q('sellerEmail').value=s.email||'';
}

function updateHealthFormByType(){
 var t=q('hType').value;
 q('hProductLabel').textContent = (t==='Visita veterinaria') ? 'Motivo de consulta' :
   (t==='Cirugía / intervención') ? 'Intervención' :
   (t==='Analítica / prueba') ? 'Prueba / analítica' :
   (t==='Tratamiento / medicación') ? 'Medicamento / tratamiento' :
   'Producto / detalle';

 q('hDiagnosisLabel').textContent = (t==='Analítica / prueba') ? 'Resultado' :
   (t==='Visita veterinaria') ? 'Diagnóstico' :
   (t==='Cirugía / intervención') ? 'Resultado / evolución' :
   'Diagnóstico / observaciones clínicas';

 var needsNext = ['Vacuna','Desparasitación interna','Desparasitación externa','Tratamiento / medicación'].indexOf(t)>=0;
 q('hNextField').classList.toggle('hidden',!needsNext);
 q('hNextLabel').textContent = t==='Tratamiento / medicación' ? 'Fecha fin / revisión' : 'Próxima fecha';
}

function addMonthsDate(dateStr,months){
 if(!dateStr)return '';
 var p=dateStr.split('-'),y=Number(p[0]),m=Number(p[1])-1,d=Number(p[2]);
 var dt=new Date(y,m,d);
 var targetMonth=m+months;
 var ty=y+Math.floor(targetMonth/12),tm=((targetMonth%12)+12)%12;
 var lastDay=new Date(ty,tm+1,0).getDate();
 var td=Math.min(d,lastDay);
 return ty+'-'+String(tm+1).padStart(2,'0')+'-'+String(td).padStart(2,'0');
}
function addDaysDate(dateStr,daysToAdd){
 if(!dateStr)return '';
 var p=dateStr.split('-'),dt=new Date(Number(p[0]),Number(p[1])-1,Number(p[2]));
 dt.setDate(dt.getDate()+daysToAdd);
 return dt.getFullYear()+'-'+String(dt.getMonth()+1).padStart(2,'0')+'-'+String(dt.getDate()).padStart(2,'0');
}
function updateReproExpectedLabel(autoFill){
 var t=q('rType').value,date=q('rDate').value,d=dog(current),male=!!(d&&d.sex==='Macho');
 if(t==='Celo'){
   if(male){
     q('rExpectedField').classList.add('hidden');
     q('rExpected').value='';
     if(q('rExpectedHelp'))q('rExpectedHelp').textContent='';
   }else{
     q('rExpectedField').classList.remove('hidden');
     q('rExpectedLabel').textContent='Fecha prevista del próximo celo';
     if(q('rExpectedHelp'))q('rExpectedHelp').textContent='Calculada automáticamente a 6 meses del celo registrado.';
     if(autoFill!==false&&date)q('rExpected').value=addMonthsDate(date,6);
   }
 }else if(t==='Monta'){
   q('rExpectedField').classList.remove('hidden');
   q('rExpectedLabel').textContent='Fecha aproximada de parto';
   if(q('rExpectedHelp'))q('rExpectedHelp').textContent='Calculada automáticamente a 63 días de la fecha de monta.';
   if(autoFill!==false&&date)q('rExpected').value=addDaysDate(date,63);
 }else{
   q('rExpectedField').classList.add('hidden');
   q('rExpected').value='';
   if(q('rExpectedHelp'))q('rExpectedHelp').textContent='';
 }
}

var activePuppyContext=null;
function findLitter(d,id){return (d.litters||[]).find(function(l){return l.id===id})}
function findPuppy(d,litterId,pupId){var l=findLitter(d,litterId);return l&&(l.puppiesList||[]).find(function(p){return p.id===pupId})}
function puppyAnimal(d,l,p){
 return {name:p.name||'Cachorro',birth:l.birth||'',breed:d.breed||'',chip:p.chip||'',sex:p.sex||'',color:p.color||'',species:'Perro',origin:d.origin||'',photo:p.photo||null};
}
function animalForForms(){return activePuppyContext?activePuppyContext.animal:dog(current)}

function openPuppyEditor(litterId,pupId){
 var d=dog(current),l=findLitter(d,litterId),p=pupId?findPuppy(d,litterId,pupId):null;if(!l)return;
 q('puppyForm').reset();q('pLitterId').value=litterId;q('pId').value=p?p.id:'';
 q('puppyModalTitle').textContent=p?'Editar cachorro':'Nuevo cachorro';
 q('pName').value=p?p.name:'';q('pSex').value=p?p.sex:'';q('pColor').value=p?p.color:'';
 q('pBirthWeight').value=p?p.birthWeight:'';q('pChip').value=p?p.chip:'';q('pStatus').value=p?(p.status||'Disponible'):'Disponible';q('pNotes').value=p?p.notes:'';
 openChildModal('puppyModal');
}
q('closePuppyModal').onclick=function(){closeChildModal('puppyModal','camadas')};
q('cancelPuppyModal').onclick=function(){closeChildModal('puppyModal','camadas')};
q('puppyForm').onsubmit=function(e){
 e.preventDefault();var d=dog(current),l=findLitter(d,q('pLitterId').value);if(!l)return;
 var existing=q('pId').value?findPuppy(d,l.id,q('pId').value):null;
 function commit(photo){
  var p=existing||{id:uid(),weights:[]};
  p.name=q('pName').value.trim();p.sex=q('pSex').value;p.color=q('pColor').value.trim();p.birthWeight=q('pBirthWeight').value;
  p.chip=q('pChip').value.trim();p.status=q('pStatus').value;p.notes=q('pNotes').value.trim();
  if(photo)p.photo=photo.data;
  if(!existing)l.puppiesList.push(p);
  l.count=l.puppiesList.length;
  save(function(){closeChildModal('puppyModal','camadas')});
 }
 var f=q('pPhoto').files[0];if(f)fileToData(f,function(x){commit(x)});else commit(null);
};
function openPuppyWeight(litterId,pupId){
 q('puppyWeightForm').reset();q('pwLitterId').value=litterId;q('pwPuppyId').value=pupId;q('pwDate').value=today();openChildModal('puppyWeightModal');
}
q('closePuppyWeight').onclick=function(){closeChildModal('puppyWeightModal','camadas')};
q('puppyWeightForm').onsubmit=function(e){
 e.preventDefault();var d=dog(current),p=findPuppy(d,q('pwLitterId').value,q('pwPuppyId').value);if(!p)return;
 p.weights=p.weights||[];p.weights.push({id:uid(),date:q('pwDate').value,weight:q('pwWeight').value,notes:q('pwNotes').value.trim()});
 save(function(){closeChildModal('puppyWeightModal','camadas')});
};
function convertPuppy(litterId,pupId){
 var d=dog(current),l=findLitter(d,litterId),p=findPuppy(d,litterId,pupId);if(!l||!p)return;
 if(!confirm('Se creará una ficha nueva en Mis mascotas y el cachorro se eliminará de esta camada. ¿Continuar?'))return;
 // Avoid creating the same pet twice by microchip when one exists.
 if(p.chip && (data.dogs||[]).some(function(x){return x.chip&&x.chip===p.chip})){
   alert('Ya existe una mascota con este microchip.');
   return;
 }
 var nd={id:uid(),name:p.name||'Cachorro',birth:l.birth||'',sex:p.sex||'',species:'Perro',breed:d.breed||'',color:p.color||'',chip:p.chip||'',origin:d.origin||'',notes:p.notes||'',generalNotes:p.notes||'',photo:p.photo||null,
 measures:[],health:[],docs:[],repro:[],contracts:[],gallery:[],litters:[],vet:{}};
 (p.weights||[]).forEach(function(w){nd.measures.push({id:uid(),date:w.date,weight:w.weight?String(Number(w.weight)/1000):'',height:'',length:'',chest:'',notes:w.notes||''})});
 data.dogs.push(nd);
 l.puppiesList=(l.puppiesList||[]).filter(function(x){return x.id!==pupId});
 l.count=l.puppiesList.length;
 save(function(){render();showDog(nd.id)});
}
function usePuppyForContract(litterId,pupId){
 var d=dog(current),l=findLitter(d,litterId),p=findPuppy(d,litterId,pupId);if(!l||!p)return;
 activePuppyContext={litterId:litterId,pupId:pupId,animal:puppyAnimal(d,l,p)};
 openContract('sale');
}
function usePuppyForTransfer(litterId,pupId){
 var d=dog(current),l=findLitter(d,litterId),p=findPuppy(d,litterId,pupId);if(!l||!p)return;
 activePuppyContext={litterId:litterId,pupId:pupId,animal:puppyAnimal(d,l,p)};
 if(confirm('Pulsa Aceptar para RAIA o Cancelar para REIAC.'))openTransferEditor('raia');else openTransferEditor('reiac');
}
function bindPuppyActions(d){
 document.querySelectorAll('.add-puppy').forEach(function(b){b.onclick=function(){openPuppyEditor(b.dataset.litter,'')}});
 document.querySelectorAll('.edit-puppy').forEach(function(b){b.onclick=function(){openPuppyEditor(b.dataset.litter,b.dataset.pup)}});
 document.querySelectorAll('.weigh-puppy').forEach(function(b){b.onclick=function(){openPuppyWeight(b.dataset.litter,b.dataset.pup)}});
 document.querySelectorAll('.convert-puppy').forEach(function(b){b.onclick=function(){convertPuppy(b.dataset.litter,b.dataset.pup)}});
 document.querySelectorAll('.puppy-contract').forEach(function(b){b.onclick=function(){usePuppyForContract(b.dataset.litter,b.dataset.pup)}});
 document.querySelectorAll('.puppy-transfer').forEach(function(b){b.onclick=function(){usePuppyForTransfer(b.dataset.litter,b.dataset.pup)}});
 document.querySelectorAll('.delete-litter').forEach(function(b){b.onclick=function(){
  var l=findLitter(d,b.dataset.litter);if(!l)return;
  var pups=(l.puppiesList||[]).length;
  var msg=pups?'Esta camada contiene '+pups+' cachorro'+(pups===1?'':'s')+'. Al eliminarla se borrarán también sus registros. ¿Eliminar la camada?':'¿Eliminar esta camada registrada?';
  if(!confirm(msg))return;
  d.litters=(d.litters||[]).filter(function(x){return x.id!==b.dataset.litter});
  save(function(){showDog(current);setTimeout(function(){activateInner('camadas')},0)});
 }});
 document.querySelectorAll('.delete-puppy').forEach(function(b){b.onclick=function(){
  var l=findLitter(d,b.dataset.litter);if(!l)return;if(!confirm('¿Eliminar este cachorro de la camada?'))return;
  l.puppiesList=(l.puppiesList||[]).filter(function(p){return p.id!==b.dataset.pup});l.count=l.puppiesList.length;save(function(){showDog(current);activateInner('camadas')});
 }});
}


var contractReturnTab='contratos';
function closeContractEditor(){
 cmCloseModal('contractModal');
 if(current&&dog(current)){
   showDog(current);
   setTimeout(function(){activateInner(contractReturnTab||'contratos')},0);
 }
 activePuppyContext=null;
}
function closeContractPreview(){
 var m=q('contractPreviewModal');
 if(m){
   m.classList.remove('open','repro-screen-open','transfer-open');
   m.style.removeProperty('display');
   m.style.removeProperty('position');
   m.style.removeProperty('inset');
   m.style.removeProperty('z-index');
 }
 document.body.classList.remove('cm-modal-open','child-modal-open','doc-viewer-open','repro-open');
 document.body.style.overflow='';
 if(current&&dog(current)){
   showDog(current);
   setTimeout(function(){activateInner(contractReturnTab||'contratos')},0);
 }else{
   cmGoPage('inicio');
 }
 activePuppyContext=null;
}

function openContract(type){
 var d=animalForForms(); if(!d)return;
 contractReturnTab=activePuppyContext?'camadas':'contratos';
 if(q('detailModal'))q('detailModal').classList.remove('open');
 q('contractForm').reset();q('contractType').value=type;q('cDate').value=today();
 q('contractModalTitle').textContent=type==='breeding'?'Compraventa + acuerdo de cría':'Contrato de compraventa';
 q('breedingFields').classList.toggle('hidden',type!=='breeding');
 cmOpenModal('contractModal');
}
var lastContractData=null;
function drawTextOnLine(ctx,text,x,y,maxWidth,size,align){
 if(text==null||text==='')return;
 ctx.save();
 ctx.font=(size||15)+'px Georgia, serif';
 ctx.fillStyle='#17110d';
 ctx.textBaseline='alphabetic';
 ctx.textAlign=align||'left';
 var t=String(text);
 if(maxWidth){
   while(ctx.measureText(t).width>maxWidth && t.length>2)t=t.slice(0,-1);
 }
 ctx.fillText(t,x,y,maxWidth||undefined);
 ctx.restore();
}
function renderContractCanvas(c,d,s,done){
 var breeding=c.type==='breeding';
 var src=breeding?'contrato-cria.jpg':'contrato-compraventa.jpg';
 var canvas=q('contractCanvas'),ctx=canvas.getContext('2d'),img=new Image();

 img.onload=function(){
   canvas.width=img.naturalWidth;canvas.height=img.naturalHeight;
   ctx.clearRect(0,0,canvas.width,canvas.height);
   ctx.drawImage(img,0,0);

   var dp=(c.date||'').split('-'),day=dp[2]||'',month=dp[1]||'',year=(dp[0]||'').slice(-2);

   if(breeding){
     // PLANTILLA COMPRAVENTA + ACUERDO DE CRÍA
     // Baselines measured directly from the original 1024 x 1536 image.
     drawTextOnLine(ctx,c.place,228,194,220,15);
     drawTextOnLine(ctx,day,482,194,40,15);
     drawTextOnLine(ctx,month,554,194,190,15);
     drawTextOnLine(ctx,year,813,194,42,15);

     // Vendedora
     drawTextOnLine(ctx,s.name,207,323,255,15);
     drawTextOnLine(ctx,s.dni,103,358,195,15);
     drawTextOnLine(ctx,s.address,146,393,316,14);
     drawTextOnLine(ctx,s.phone,133,459,190,15);
     drawTextOnLine(ctx,s.email,119,490,205,14);

     // Comprador
     drawTextOnLine(ctx,c.buyerName,705,323,250,15);
     drawTextOnLine(ctx,c.buyerDni,611,358,180,15);
     drawTextOnLine(ctx,c.buyerAddress,646,393,308,14);
     drawTextOnLine(ctx,c.buyerPhone,642,459,170,15);
     drawTextOnLine(ctx,c.buyerEmail,633,490,180,14);

     // Animal
     drawTextOnLine(ctx,d.name,125,635,205,15);
     drawTextOnLine(ctx,fmt(d.birth),542,635,120,14);
     drawTextOnLine(ctx,d.breed,105,671,225,15);
     drawTextOnLine(ctx,d.chip,520,671,140,14);
     drawTextOnLine(ctx,d.sex,105,706,82,15);
     drawTextOnLine(ctx,d.color,435,706,205,15);

     // Observaciones
     ctx.save();
     ctx.font='13px Georgia, serif';ctx.fillStyle='#17110d';ctx.textBaseline='alphabetic';
     var obs=String(c.obs||''),words=obs.split(/\s+/),lines=[],line='';
     words.forEach(function(w){
       var test=(line?line+' ':'')+w;
       if(ctx.measureText(test).width>235&&line){lines.push(line);line=w}else line=test;
     });
     if(line)lines.push(line);
     [635,671,706].forEach(function(y,i){if(lines[i])ctx.fillText(lines[i],700,y,235)});
     ctx.restore();

     // Precio dentro del recuadro
     drawTextOnLine(ctx,c.price?c.price+' €':'',331,855,115,18,'center');

     // Firmas: líneas reales del contrato de cría
     drawTextOnLine(ctx,s.name,193,1388,215,12);
     drawTextOnLine(ctx,s.dni,127,1409,145,12);
     drawTextOnLine(ctx,c.buyerName,730,1388,190,12);
     drawTextOnLine(ctx,c.buyerDni,688,1409,125,12);

   }else{
     // PLANTILLA DE COMPRAVENTA NORMAL (se mantiene como estaba)
     drawTextOnLine(ctx,c.place,228,198,220,15);
     drawTextOnLine(ctx,day,482,198,40,15);
     drawTextOnLine(ctx,month,554,198,190,15);
     drawTextOnLine(ctx,year,813,198,42,15);

     drawTextOnLine(ctx,s.name,207,325,255,15);
     drawTextOnLine(ctx,s.dni,103,362,195,15);
     drawTextOnLine(ctx,s.address,146,398,316,14);
     drawTextOnLine(ctx,s.phone,133,472,190,15);
     drawTextOnLine(ctx,s.email,119,508,205,14);

     drawTextOnLine(ctx,c.buyerName,695,325,260,15);
     drawTextOnLine(ctx,c.buyerDni,611,362,180,15);
     drawTextOnLine(ctx,c.buyerAddress,646,398,308,14);
     drawTextOnLine(ctx,c.buyerPhone,642,472,170,15);
     drawTextOnLine(ctx,c.buyerEmail,633,508,180,14);

     drawTextOnLine(ctx,d.name,125,633,205,15);
     drawTextOnLine(ctx,fmt(d.birth),523,633,120,14);
     drawTextOnLine(ctx,d.breed,105,670,225,15);
     drawTextOnLine(ctx,d.chip,520,670,132,14);
     drawTextOnLine(ctx,d.sex,105,706,82,15);
     drawTextOnLine(ctx,d.color,435,706,205,15);

     ctx.save();
     ctx.font='13px Georgia, serif';ctx.fillStyle='#17110d';ctx.textBaseline='alphabetic';
     var obs2=String(c.obs||''),words2=obs2.split(/\s+/),lines2=[],line2='';
     words2.forEach(function(w){
       var test=(line2?line2+' ':'')+w;
       if(ctx.measureText(test).width>235&&line2){lines2.push(line2);line2=w}else line2=test;
     });
     if(line2)lines2.push(line2);
     [633,670,706].forEach(function(y,i){if(lines2[i])ctx.fillText(lines2[i],700,y,235)});
     ctx.restore();

     drawTextOnLine(ctx,c.price?c.price+' €':'',346,848,135,18,'center');

     drawTextOnLine(ctx,s.name,181,1425,220,12);
     drawTextOnLine(ctx,s.dni,128,1446,145,12);
     drawTextOnLine(ctx,c.buyerName,728,1425,190,12);
     drawTextOnLine(ctx,c.buyerDni,688,1446,125,12);
   }

   lastContractData={c:c,d:d,s:s};
   if(done)done();
 };

 img.onerror=function(){alert('No se ha podido cargar la plantilla del contrato.')};
 img.src=src+'?v=10';
}
q('contractSale').onclick=function(){activePuppyContext=null;openContract('sale')};
q('contractBreeding').onclick=function(){activePuppyContext=null;openContract('breeding')};
q('saveSeller').onclick=function(){
 data.settings=data.settings||{};data.settings.seller={name:q('sellerName').value.trim(),dni:q('sellerDni').value.trim(),phone:q('sellerPhone').value.trim(),address:q('sellerAddress').value.trim(),email:q('sellerEmail').value.trim()};save();alert('Datos de la vendedora guardados.');
};
q('contractForm').onsubmit=function(e){
 e.preventDefault();
 var ownerDog=dog(current),d=animalForForms(),s=(data.settings&&data.settings.seller)||{};
 var c={id:uid(),type:q('contractType').value,date:q('cDate').value,place:q('cPlace').value.trim(),
 buyerName:q('cBuyerName').value.trim(),buyerDni:q('cBuyerDni').value.trim(),buyerPhone:q('cBuyerPhone').value.trim(),
 buyerAddress:q('cBuyerAddress').value.trim(),buyerEmail:q('cBuyerEmail').value.trim(),price:q('cPrice').value,obs:q('cObs').value.trim()};
 ownerDog.contracts=ownerDog.contracts||[];
 ownerDog.contracts.push({id:c.id,type:c.type,date:c.date,buyer:c.buyerName,price:c.price,animal:d.name||'',animalData:{name:d.name||'',birth:d.birth||'',breed:d.breed||'',chip:d.chip||'',sex:d.sex||'',color:d.color||'',species:d.species||'Perro',origin:d.origin||'',photo:d.photo||null},payload:c,seller:{name:s.name||'',dni:s.dni||'',phone:s.phone||'',address:s.address||'',email:s.email||''}});
 save(function(){
   cmCloseModal('contractModal');cmOpenModal('contractPreviewModal');
   renderContractCanvas(c,d,s);
 });
};
q('printContract').onclick=function(){
 var canvas=q('contractCanvas');if(!canvas)return;
 var url=canvas.toDataURL('image/jpeg',0.98);
 var w=window.open('','_blank');
 if(!w){alert('Safari ha bloqueado la ventana. Permite ventanas emergentes para guardar el contrato.');return}
 var h='<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Contrato</title><style>'+
 'html,body{margin:0;background:#ddd;font-family:Arial,sans-serif}.bar{position:sticky;top:0;z-index:5;background:#fff;display:flex;justify-content:center;gap:14px;padding:14px;box-shadow:0 2px 8px #999}.bar button{border:0;background:#ececec;border-radius:999px;padding:10px 18px;font-size:16px}.doc{max-width:1024px;margin:auto;background:#fff}.doc img{width:100%;height:auto;display:block}@media print{.bar{display:none}.doc{max-width:none}}'+
 '</style></head><body><div class="bar"><button onclick="window.print()">Imprimir / Guardar PDF</button><button onclick="window.close()">Cerrar</button></div><div class="doc"><img src="'+url+'"></div></body></html>';
 w.document.write(h);w.document.close();
};





var contractX=document.querySelector('#contractModal [data-close="contractModal"]');
if(contractX)contractX.onclick=function(e){e.preventDefault();e.stopPropagation();closeContractEditor()};
var contractPreviewX=document.querySelector('#contractPreviewModal [data-close="contractPreviewModal"]');
if(contractPreviewX)contractPreviewX.onclick=function(e){e.preventDefault();e.stopPropagation();closeContractPreview()};
if(q('closeContractPreviewBtn'))q('closeContractPreviewBtn').onclick=closeContractPreview;

var reproCloseBtn=document.querySelector('#reproModal [data-close="reproModal"]');
if(reproCloseBtn)reproCloseBtn.onclick=function(e){e.preventDefault();closeChildModal('reproModal','reproduccion')};
var litterCloseBtn=document.querySelector('#litterModal [data-close="litterModal"]');
if(litterCloseBtn)litterCloseBtn.onclick=function(e){e.preventDefault();closeChildModal('litterModal','camadas')};


function openReproEditor(){
 var modal=q('reproModal');
 if(!modal)return;

 q('reproForm').reset();
 q('rDate').value=today();
 updateReproExpectedLabel(true);

 // Move to body to escape any stacking context.
 if(modal.parentNode!==document.body)document.body.appendChild(modal);

 // Hide the dog's sheet while editing reproduction.
 if(q('detailModal'))q('detailModal').classList.remove('open');

 document.body.classList.add('repro-open','cm-modal-open');
 document.body.style.overflow='hidden';

 modal.classList.remove('open');
 modal.classList.add('repro-screen-open');
 modal.style.setProperty('display','flex','important');
 modal.style.setProperty('z-index','2147483646','important');
}

function closeReproEditor(returnToTab){
 var modal=q('reproModal');
 if(modal){
   modal.classList.remove('repro-screen-open');
   modal.style.removeProperty('display');
   modal.style.removeProperty('z-index');
 }
 document.body.classList.remove('repro-open','cm-modal-open');
 document.body.style.overflow='';

 if(returnToTab && current){
   showDog(current);
   setTimeout(function(){activateInner('reproduccion')},0);
 }
}


if(q('reproLittersBtn'))q('reproLittersBtn').onclick=function(){
 if(!current||!dog(current))return;
 activateInner('camadas');
};

q('newRepro').addEventListener('click',function(e){e.preventDefault();e.stopPropagation();openReproRecordEditor(null);});

q('reproForm').addEventListener('submit',function(e){
 e.preventDefault();
 var d=dog(current);if(!d)return;
 var newType=q('rType').value,newDate=q('rDate').value;
 if(newType==='Monta' && matingNeedsRestWarningV57(d,newDate)){
   var s=breedingStateV57(d);
   var msg='⚠️ '+d.name+' está en periodo de descanso reproductivo tras su última camada.';
   if(s&&s.nextHeat)msg+='\n\nEste celo ('+fmt(s.nextHeat)+') está marcado para descanso.';
   if(s&&s.eligible)msg+='\nPróximo celo apto estimado: '+fmt(s.eligible)+'.';
   msg+='\n\n¿Quieres registrar la monta de todos modos?';
   if(!confirm(msg))return;
 }
 d.repro=d.repro||[];
 var rec=editingReproId?d.repro.find(function(x){return x.id===editingReproId}):null;
 if(!rec){rec={id:uid()};d.repro.push(rec)}
 rec.type=q('rType').value;
 rec.date=q('rDate').value;
 var isMale=d.sex==='Macho';
 rec.value=(isMale&&rec.type==='Monta')?'':q('rValue').value.trim();
 rec.male=(isMale&&rec.type==='Otro')?'':q('rMale').value.trim();
 rec.expected=(rec.type==='Monta'||(!isMale&&rec.type==='Celo'))?q('rExpected').value:'';
 rec.notes=q('rNotes').value.trim();
 save(function(){
   editingReproId=null;
   closeReproEditor(true);
 });
});

q('rType').addEventListener('change',function(){configureReproFieldsV572(dog(current));updateReproExpectedLabel(true)});
q('rDate').addEventListener('change',function(){updateReproExpectedLabel(true)});

var reproX=document.querySelector('#reproModal [data-close="reproModal"]');
if(reproX){
 reproX.onclick=function(e){
   e.preventDefault();
   e.stopPropagation();
   closeReproEditor(true);
 };
}

q('openRaiaForm').onclick=function(){window.open('formulario-raia-representacion.pdf','_blank')};

function openTransferEditor(kind){
 var d=animalForForms(); if(!d)return;
 q('transferKind').value=kind;
 q('transferFormTitle').textContent=kind==='reiac'?'REIAC - Cesión / traslado':'RAIA - Documento de representación';
 q('tfDogName').value=d.name||'';q('tfChip').value=d.chip||'';q('tfBreed').value=d.breed||'';q('tfSex').value=d.sex||'';q('tfBirth').value=d.birth||'';q('tfDate').value=today();
 var s=(data.settings&&data.settings.seller)||{};
 q('tfOldName').value=s.name||'';q('tfOldDni').value=s.dni||'';q('tfOldPhone').value=s.phone||'';q('tfOldEmail').value=s.email||'';q('tfOldAddress').value=s.address||'';
 q('reiacOptions').style.display=kind==='reiac'?'block':'none';q('raiaOptions').style.display=kind==='raia'?'block':'none';
 var m=q('transferFormModal'); if(m.parentNode!==document.body)document.body.appendChild(m);
 if(q('detailModal'))q('detailModal').classList.remove('open');
 m.classList.add('transfer-open');document.body.classList.add('cm-modal-open');document.body.style.overflow='hidden';
}
function closeTransferEditor(){
 var m=q('transferFormModal');m.classList.remove('transfer-open');document.body.classList.remove('cm-modal-open');document.body.style.overflow='';
 if(current){showDog(current);setTimeout(function(){activateInner('documentos')},0)}
}

q('contractRaia').onclick=function(){activePuppyContext=null;openTransferEditor('raia')};
q('contractReiac').onclick=function(){activePuppyContext=null;openTransferEditor('reiac')};
q('contractRaiaOriginal').onclick=function(){window.open('formulario-raia-representacion.pdf','_blank')};
q('contractReiacOriginal').onclick=function(){window.open('formulario-reiac-cesion-traslado.pdf','_blank')};

q('fillRaiaForm').onclick=function(){activePuppyContext=null;openTransferEditor('raia')};
q('fillReiacForm').onclick=function(){activePuppyContext=null;openTransferEditor('reiac')};
q('closeTransferForm').onclick=closeTransferEditor;q('cancelTransferForm').onclick=closeTransferEditor;

function val(id){return esc((q(id).value||'').trim())}
q('transferForm').onsubmit=function(e){
 e.preventDefault();
 var kind=q('transferKind').value,w=window.open('','_blank');
 if(!w){alert('Permite ventanas emergentes para preparar el documento original.');return}

 function V(id){return (q(id).value||'').trim()}
 function splitName(full){
   var a=full.trim().split(/\s+/);
   if(a.length===0)return {name:'',last1:'',last2:''};
   if(a.length===1)return {name:a[0],last1:'',last2:''};
   if(a.length===2)return {name:a[0],last1:a[1],last2:''};
   return {name:a.slice(0,a.length-2).join(' '),last1:a[a.length-2],last2:a[a.length-1]};
 }
 var oldn=splitName(V('tfOldName')),newn=splitName(V('tfNewName'));
 var bg=kind==='raia'?'raia-original.png':'reiac-original.png';

 var fields=[];
 function F(x,y,wid,val,cls){fields.push({x:x,y:y,w:wid,v:val||'',c:cls||''})}
 function C(x,y,on){if(on)fields.push({x:x,y:y,w:2.0,v:'✓',c:'check'})}

 if(kind==='raia'){
   // BLOQUE 1 - propietario/autorizante. Calibrado contra el PDF original 1190x1682.
   F(16.8,20.75,37.5,oldn.name);
   F(63.2,20.75,31.5,V('tfOldDni'));
   F(16.8,22.65,37.5,oldn.last1);
   F(63.2,22.65,31.5,V('tfOldPhone'));
   F(16.8,24.58,37.5,oldn.last2);
   F(63.2,24.58,31.5,V('tfOldEmail'));
   F(16.8,26.52,77.8,V('tfOldAddress'));
   F(16.8,28.45,8.0,V('tfOldZip'));
   F(34.0,28.45,28.5,V('tfOldCity'));
   F(72.3,28.45,22.2,V('tfOldProvince'));

   // BLOQUE 2 - autorizado
   F(16.8,45.30,37.5,newn.name);
   F(63.2,45.30,31.5,V('tfNewDni'));
   F(16.8,47.22,37.5,newn.last1);
   F(63.2,47.22,31.5,V('tfNewPhone'));
   F(16.8,49.15,37.5,newn.last2);
   F(63.2,49.15,31.5,V('tfNewEmail'));
   F(16.8,51.08,77.8,V('tfNewAddress'));
   F(16.8,53.02,8.0,V('tfNewZip'));
   F(34.0,53.02,28.5,V('tfNewCity'));
   F(72.3,53.02,22.2,V('tfNewProvince'));

   // BLOQUE 3 - primera fila de operación.
   var act=q('tfRaiaAction').value;
   C(6.65,60.02,act==='Alta');
   C(10.52,60.02,act==='Baja');
   C(14.38,60.02,act==='Cambio');
   F(20.1,60.08,11.7,V('tfDogName'));
   F(34.0,60.08,6.8,'Perro');
   F(42.2,60.08,16.3,V('tfBreed'));
   F(59.3,60.08,7.0,V('tfSex'));
   F(67.5,60.08,8.4,V('tfBirth'));
   F(77.6,60.08,16.6,V('tfChip'));

   // Fecha al pie del formulario (sin inventar localidad si no se ha pedido).
   F(72.5,79.32,18.0,V('tfDate'));
 }else{
   // REIAC: coordenadas medidas directamente sobre el original 1190 × 1682.
   // Cabecera
   F(18.15,17.05,37.6,V('tfChip'));
   F(63.30,17.05,29.2,V('tfDate'));

   // Tipo de operación: marca dentro de la casilla, no al lado.
   var op=q('tfOperation').value;
   C(9.30,22.05,op==='traslado');
   C(9.30,23.52,op==='cesion');

   // Nuevo propietario
   if(op==='cesion'){
     F(31.05,25.45,58.0,V('tfNewName'));
     F(19.10,27.35,19.8,V('tfNewDni'));
   }

   // Propietario en la base de datos de origen
   F(24.00,36.55,65.0,V('tfOldName'));
   F(11.65,38.48,17.8,V('tfOldDni'));

   // Base de datos de origen
   var origin=V('tfOrigin');
   var db={
     'Andalucía - RAIA':[9.20,43.55],
     'Aragón - RIACA':[9.20,44.77],
     'Asturias - RIAPA':[9.20,45.99],
     'Baleares - RIACIB':[9.20,47.21],
     'Canarias - ZOOCAN':[9.20,48.43],
     'Cantabria - RACIC':[32.75,43.55],
     'Castilla La Mancha - SIIA-CLM':[32.75,44.77],
     'Castilla y León - SIACYL':[32.75,45.99],
     'Cataluña - AIAC':[32.75,47.21],
     'Ceuta - SIACE':[32.75,48.43],
     'Extremadura - RIACE':[54.75,43.55],
     'Galicia - REGIAC':[54.75,44.77],
     'La Rioja - RIAC':[54.75,45.99],
     'Madrid - RIAC':[54.75,47.21],
     'Melilla - SIAMEL':[54.75,48.43],
     'Murcia - SIAMU':[77.30,43.55],
     'Navarra - REIAC':[77.30,44.77],
     'País Vasco - REGIA':[77.30,45.99],
     'Valencia - RIVIA':[77.30,47.21]
   };
   if(db[origin])C(db[origin][0],db[origin][1],true);

   // Veterinario de destino
   F(24.00,70.95,65.0,V('tfVetName'));
   F(19.20,72.90,16.0,V('tfVetNumber'));
   F(50.50,72.90,17.5,V('tfVetProvince'));
 }

 var overlays=fields.map(function(f){
   return '<div class="f '+f.c+'" style="left:'+f.x+'%;top:'+f.y+'%;width:'+f.w+'%">'+
     String(f.v).replace(/&/g,'&amp;').replace(/</g,'&lt;')+'</div>';
 }).join('');

 var title=kind==='raia'?'RAIA - Documento original rellenado':'REIAC - Documento original rellenado';
 var h='<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+title+'</title><style>'+
 'html,body{margin:0;background:#ddd;font-family:Arial,sans-serif}.bar{position:sticky;top:0;z-index:9;background:#fff;padding:10px;display:flex;gap:8px;justify-content:center;box-shadow:0 2px 8px #999}.page{position:relative;width:min(100vw,794px);aspect-ratio:595/841;margin:12px auto;background:#fff}.page>img{position:absolute;inset:0;width:100%;height:100%}.f{position:absolute;font-size:clamp(8px,1.05vw,10px);line-height:1;color:#111;white-space:nowrap;overflow:hidden;text-overflow:clip}.check{font-size:clamp(11px,1.5vw,14px);font-weight:bold;line-height:1}.note{max-width:794px;margin:8px auto 20px;background:#fff;padding:10px;font-size:12px}@media(min-width:795px){.f{font-size:10px}.check{font-size:15px}}@media print{.bar,.note{display:none}.page{width:210mm;height:297mm;margin:0}.f{font-size:8.5pt}.check{font-size:11pt}}'+
 '</style></head><body><div class="bar"><button onclick="window.print()">Imprimir / Guardar PDF</button><button onclick="window.close()">Cerrar</button></div>'+
 '<div class="page"><img src="'+bg+'">'+overlays+'</div><div class="note">Documento oficial original con datos superpuestos. Revisa los datos antes de imprimir o guardar el PDF; firmas y apartados profesionales deben cumplimentarse donde corresponda.</div></body></html>';
 w.document.write(h);w.document.close();
};

q('openReiacForm').onclick=function(){window.open('formulario-reiac-cesion-traslado.pdf','_blank')};
q('saveVet').onclick=function(){
 var d=dog(current);d.vet={
   clinic:q('vetClinic').value.trim(),phone:q('vetPhone').value.trim(),record:q('vetRecord').value.trim(),
   allergies:q('vetAllergies').value.trim(),conditions:q('vetConditions').value.trim(),medication:q('vetMedication').value.trim()
 };save();alert('Ficha veterinaria guardada.');
};

q('addGalleryPhoto').onclick=function(){q('galleryFile').click()};
q('galleryFile').onchange=function(e){
 var files=Array.from(e.target.files||[]),d=dog(current);if(!files.length)return;
 var pending=files.length;
 files.forEach(function(file){
   fileToData(file,function(f){
     if(f&&f.data)d.gallery.push({id:uid(),data:f.data,name:f.name});
     pending--;
     if(pending===0){q('galleryFile').value='';save();showDog(current);activateInner('galeria')}
   });
 });
};

q('newLitter').onclick=function(){
 q('litterForm').reset();
 q('lBirth').value=today();
 openChildModal('litterModal');
};
q('litterForm').onsubmit=function(e){
 e.preventDefault();
 var d=dog(current);d.litters=d.litters||[];
 d.litters.push({id:uid(),birth:q('lBirth').value,count:q('lCount').value,father:q('lFather').value.trim(),mother:q('lMother').value.trim(),notes:q('lNotes').value.trim(),puppiesList:[]});
 if(d.sex==='Hembra' && d.breedingRestCycles==null)d.breedingRestCycles=1;
 save(function(){
   render();
   renderBreederFemalesV57();
   closeChildModal('litterModal','camadas');
   if(current){showDog(current);setTimeout(function(){activateInner('camadas')},0)}
 });
};

q('exportDog').onclick=function(){
 var d=dog(current),w=window.open('','_blank');
 if(!w){alert('Permite ventanas emergentes para exportar.');return}
 var sexIcon=d.sex==='Macho'?'♂':d.sex==='Hembra'?'♀':'';
 var h='<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Ficha '+esc(d.name)+'</title><style>'+
 'body{margin:0;background:#efe6d9;font-family:-apple-system,BlinkMacSystemFont,Arial;color:#4e321a}.wrap{max-width:760px;margin:auto;background:linear-gradient(180deg,#fffaf2,#fbf4e8);min-height:100vh;padding:24px;box-sizing:border-box}.brand{text-align:center;font-family:Georgia,serif;font-size:30px;margin:8px 0 22px}.hero{display:flex;align-items:center;gap:18px;background:#fffdf8;border:1px solid #ead7b5;border-radius:22px;padding:16px}.photo{width:112px;height:112px;border-radius:50%;overflow:hidden;border:3px solid #d2a653;background:#f1dfbc;display:grid;place-items:center;font-size:46px;position:relative}.photo img{width:100%;height:100%;object-fit:cover}.sex{position:absolute;right:3px;bottom:3px;width:28px;height:28px;border-radius:50%;background:#2a2119;color:white;display:grid;place-items:center;font-weight:bold}.name{font:700 28px Georgia,serif}.meta{color:#75614d;margin-top:5px}.grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin-top:14px}.card{background:#fffdf8;border:1px solid #ead7b5;border-radius:18px;padding:14px}.head{font-weight:850;margin-bottom:8px}.row{padding:6px 0;border-bottom:1px dashed #eadcca;font-size:13px}.row:last-child{border-bottom:0}.icon{color:#b68122;margin-right:6px}@media(max-width:520px){.grid{grid-template-columns:1fr}.hero{align-items:flex-start}.photo{width:88px;height:88px;min-width:88px}}@media print{body{background:white}.wrap{padding:0}.no-print{display:none}}'+
 '</style></head><body><div class="wrap"><div class="brand">🐾 PETORIA</div><div class="hero"><div class="photo">'+(d.photo?'<img src="'+d.photo+'">':'🐾')+(sexIcon?'<span class="sex">'+sexIcon+'</span>':'')+'</div><div><div class="name">'+esc(d.name)+'</div><div class="meta">'+esc(d.breed||d.species||'')+(d.sex?' · '+esc(d.sex):'')+(d.birth?' · '+fmt(d.birth):'')+'</div></div></div>'+
 '<div class="grid"><section class="card"><div class="head"><span class="icon">ⓘ</span>Datos</div><div class="row"><b>Especie:</b> '+esc(d.species||'Perro')+'</div><div class="row"><b>Microchip:</b> '+esc(d.chip||'—')+'</div><div class="row"><b>Color:</b> '+esc(d.color||'—')+'</div><div class="row"><b>Procedencia:</b> '+esc(d.origin||'—')+'</div></section>'+
 '<section class="card"><div class="head"><span class="icon">♡</span>Salud</div>'+((d.health||[]).slice().sort(function(a,b){return (b.date||'').localeCompare(a.date||'')}).map(function(x){return '<div class="row">'+fmt(x.date)+' · '+esc(x.type)+(x.product?' · '+esc(x.product):'')+'</div>'}).join('')||'<div class="row">Sin registros</div>')+'</section>'+
 '<section class="card"><div class="head"><span class="icon">↗</span>Crecimiento</div>'+((d.measures||[]).slice().sort(function(a,b){return (b.date||'').localeCompare(a.date||'')}).map(function(x){return '<div class="row">'+fmt(x.date)+(x.weight?' · '+esc(x.weight)+' kg':'')+'</div>'}).join('')||'<div class="row">Sin registros</div>')+'</section>'+
 '<section class="card"><div class="head"><span class="icon">🐾</span>Reproducción</div>'+((d.repro||[]).slice().sort(function(a,b){return (b.date||'').localeCompare(a.date||'')}).map(function(x){return '<div class="row">'+fmt(x.date)+' · '+esc(x.type)+(x.expected?' · Prevista '+fmt(x.expected):'')+'</div>'}).join('')||'<div class="row">Sin registros</div>')+'</section></div>'+
 '<div class="no-print" style="margin-top:18px;text-align:center"><button onclick="window.print()" style="padding:12px 20px;border:0;border-radius:12px;background:#2a2119;color:white;font-weight:bold">Imprimir / Guardar PDF</button></div></div></body></html>';
 w.document.write(h);w.document.close();
};


q('goCalendar').onclick=function(){
 var b=document.querySelector('[data-page="calendario"]');
 if(b)b.click();
};

(function(){
 var now=new Date(),from=now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0');
 var toDate=new Date(now.getFullYear(),now.getMonth()+1,1);
 var to=toDate.getFullYear()+'-'+String(toDate.getMonth()+1).padStart(2,'0');
 q('calendarMonthFrom').value=from;q('calendarMonthTo').value=to;
 q('calendarDateFrom').value=isoDateV56(now);
 var end=new Date(now);end.setDate(end.getDate()+30);q('calendarDateTo').value=isoDateV56(end);
 q('calendarRangeMode').onchange=updateCalendarRangeModeV56;
 ['calendarMonthFrom','calendarMonthTo','calendarDateFrom','calendarDateTo'].forEach(function(id){q(id).onchange=renderCalendar});
 q('calendarDog').onchange=renderCalendar;
 if(q('calendarType'))q('calendarType').onchange=renderCalendar;
})();
q('searchInput').oninput=renderSearch;


document.querySelectorAll('[data-mode-value]').forEach(function(b){
 b.onclick=function(){
   q('appMode').value=b.dataset.modeValue;
   var old=data.settings.mode;
   data.settings.mode=b.dataset.modeValue;
   applyAppMode();
   data.settings.mode=old;
 };
});

q('saveMode').onclick=function(){
 data.settings.mode=q('appMode').value;
 try{localStorage.setItem(PETORIA_MODE_SELECTED_KEY,'1')}catch(e){}
 save(function(){applyAppMode();render();alert(data.settings.mode==='breeder'?'Modo Criador / Profesional activado.':'Modo Particular activado.');});
};


if(q('breedingRestCyclesV57'))q('breedingRestCyclesV57').onchange=function(){
 var d=dog(current);if(!d)return;
 var v=q('breedingRestCyclesV57').value;
 d.breedingRestCycles=(v==='nonbreeding'||v==='sterilized')?v:Number(v);
 save(function(){renderBreedingPlanV57(d);renderBreederFemalesV57();render()});
};

q('newMeasure').onclick=function(){q('measureForm').reset();q('mDate').value=today();cmOpenModal('measureModal')};
q('measureForm').onsubmit=function(e){e.preventDefault();var d=dog(current);d.measures=d.measures||[];d.measures.push({id:uid(),date:q('mDate').value,weight:q('mWeight').value,height:q('mHeight').value,length:q('mLength').value,chest:q('mChest').value,notes:q('mNotes').value});save();closeChildModal('measureModal','crecimiento');showDog(current);activateInner('crecimiento')};


var editingHealthId=null;
function openHealthEditor(id){
 var d=dog(current);if(!d)return;
 q('healthForm').reset();
 editingHealthId=id||null;
 var rec=id?(d.health||[]).find(function(x){return x.id===id}):null;
 q('hDate').value=rec&&rec.date?rec.date:today();
 if(rec){
  q('hType').value=rec.type||'Otro';
  q('hProduct').value=rec.product||'';
  q('hNext').value=rec.next||'';
  q('hVet').value=rec.vet||'';
  q('hDose').value=rec.dose||'';
  q('hDiagnosis').value=rec.diagnosis||'';
  q('hNotes').value=rec.notes||'';
 }
 updateHealthFormByType();
 cmOpenModal('healthModal');
}
function closeHealthEditor(){
 editingHealthId=null;
 q('hFile').value='';
 cmCloseModal('healthModal');
 if(current){
  showDog(current);
  setTimeout(function(){activateInner('salud')},0);
 }
}

q('hType').onchange=updateHealthFormByType;
q('newHealth').onclick=function(){openHealthEditor(null);};
q('healthForm').onsubmit=function(e){
 e.preventDefault();
 var d=dog(current);if(!d)return;
 var existing=editingHealthId?(d.health||[]).find(function(x){return x.id===editingHealthId}):null;
 var selected=q('hFile').files&&q('hFile').files[0];
 function commit(fileObj,keepExistingFile){
  var rec=existing||{id:uid()};
  rec.type=q('hType').value;
  rec.date=q('hDate').value;
  rec.product=q('hProduct').value.trim();
  rec.next=q('hNext').value;
  rec.vet=q('hVet').value.trim();
  rec.dose=q('hDose').value.trim();
  rec.diagnosis=q('hDiagnosis').value.trim();
  rec.notes=q('hNotes').value.trim();
  if(fileObj)rec.file=fileObj;
  else if(!keepExistingFile&&!existing)rec.file=null;
  if(!existing){d.health=d.health||[];d.health.push(rec)}
  save(function(){closeHealthEditor();});
 }
 if(selected){fileToData(selected,function(f){commit(f,true)})}
 else commit(null,true);
};


(function(){
 var x=document.querySelector('#docModal [data-close="docModal"]');
 if(x)x.onclick=function(e){
  e.preventDefault();e.stopPropagation();
  cmCloseModal('docModal');
  if(current){showDog(current);setTimeout(function(){activateInner('documentos')},0)}
 };
})();

q('docForm').onsubmit=function(e){
 e.preventDefault();
 var d=dog(current);if(!d)return;
 var file=q('docFile').files&&q('docFile').files[0];
 if(!file){alert('Selecciona una foto o PDF para adjuntar.');return}
 fileToData(file,function(fileObj){
  if(!fileObj){alert('No se ha podido leer el documento.');return}
  d.docs=d.docs||[];
  d.docs.push({
   id:uid(),
   type:q('docType').value||'Otro',
   name:q('docName').value.trim()||fileObj.name||q('docType').value,
   date:q('docDate').value||today(),
   notes:q('docNotes').value.trim(),
   file:fileObj
  });
  save(function(){
   q('docFile').value='';
   cmCloseModal('docModal');
   showDog(current);
   setTimeout(function(){activateInner('documentos')},0);
  });
 });
};

q('rType').onchange=updateReproExpectedLabel;
q('saveNotes').onclick=function(){var d=dog(current);d.generalNotes=q('generalNotes').value.trim();save();alert('Notas guardadas.')};


function closeDocumentScreen(){
 var screen=q('docViewerModal'),body=q('docViewerBody');

 screen.classList.add('hidden');
 screen.style.removeProperty('display');
 screen.style.removeProperty('position');
 screen.style.removeProperty('inset');
 screen.style.removeProperty('z-index');
 screen.style.removeProperty('visibility');
 screen.style.removeProperty('opacity');

 if(body.dataset.objectUrl){
   try{URL.revokeObjectURL(body.dataset.objectUrl)}catch(e){}
   delete body.dataset.objectUrl;
 }
 body.innerHTML='';

 document.body.classList.remove('doc-viewer-open');
 document.body.style.overflow='';

 // Remove hard display:none overrides added while viewing.
 document.querySelectorAll('.modal').forEach(function(el){
   el.style.removeProperty('display');
 });

 if(current){
   showDog(current);
   setTimeout(function(){activateInner('documentos')},0);
 }
}
q('docViewerClose').onclick=closeDocumentScreen;
q('docViewerBack').onclick=closeDocumentScreen;

q('downloadDoc').onclick=function(){
 if(!currentDocFile)return;
 var f=dataUrlToFile(currentDocFile.data,currentDocFile.name,currentDocFile.type);
 if(!f){alert('No se ha podido preparar el archivo.');return}
 var url=URL.createObjectURL(f);
 var a=document.createElement('a');
 a.href=url;
 a.download=currentDocFile.name||'documento';
 a.target='_blank';
 document.body.appendChild(a);
 a.click();
 a.remove();
 setTimeout(function(){URL.revokeObjectURL(url)},10000);
};
q('shareDoc').onclick=async function(){
 if(!currentDocFile)return;
 var f=dataUrlToFile(currentDocFile.data,currentDocFile.name,currentDocFile.type);
 if(!f){alert('No se ha podido preparar el archivo.');return}
 try{
   if(navigator.share && (!navigator.canShare || navigator.canShare({files:[f]}))){
     await navigator.share({title:currentDocFile.name||'Documento',files:[f]});
   }else{
     var url=URL.createObjectURL(f);
     window.open(url,'_blank');
     setTimeout(function(){URL.revokeObjectURL(url)},10000);
   }
 }catch(e){
   if(e && e.name!=='AbortError')alert('No se ha podido compartir el documento.');
 }
};

q('exportBtn').onclick=function(){var blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='Senda-de-Rivas-copia-v4.json';a.click();setTimeout(function(){URL.revokeObjectURL(url)},1000)};
q('importFile').onchange=function(e){var f=e.target.files[0];if(!f)return;var r=new FileReader();r.onload=function(){try{var x=JSON.parse(r.result);if(!x||!Array.isArray(x.dogs))throw 0;data=x;normalize();persist(function(){alert('Copia restaurada.')})}catch(err){alert('La copia no es válida.')}};r.readAsText(f)};



function updateBackupInfoV545(){
 if(q('copyPetCountV545'))q('copyPetCountV545').textContent=(data.dogs||[]).length;
 if(q('copyApproxSizeV545')){
   try{
     var bytes=new Blob([JSON.stringify(data)]).size;
     q('copyApproxSizeV545').textContent=bytes<1024?(bytes+' B'):bytes<1048576?((bytes/1024).toFixed(1)+' KB'):((bytes/1048576).toFixed(1)+' MB');
   }catch(e){q('copyApproxSizeV545').textContent='—'}
 }
 if(q('copyLastDateV545')){
   var raw=localStorage.getItem('control_mascota_last_backup_v545');
   q('copyLastDateV545').textContent=raw||'—';
 }
}

function downloadFullBackup(){
 try{
   var payload={app:'Petoria',version:23,created:new Date().toISOString(),data:data};
   var blob=new Blob([JSON.stringify(payload)],{type:'application/json'});
   var url=URL.createObjectURL(blob),a=document.createElement('a');
   a.href=url;a.download='libreta-control-canino-copia-'+today()+'.json';
   document.body.appendChild(a);a.click();a.remove();
   setTimeout(function(){URL.revokeObjectURL(url)},5000);
   var stamp=new Date().toLocaleString('es-ES',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});
   localStorage.setItem('control_mascota_last_backup_v545',stamp);
   if(q('backupStatus'))q('backupStatus').textContent='Última copia: '+stamp;
   updateBackupInfoV545();
 }catch(e){alert('No se ha podido crear la copia.')}
}
function importFullBackup(file){
 if(!file)return;
 var r=new FileReader();
 r.onload=function(){
   try{
     var parsed=JSON.parse(r.result),incoming=parsed.data||parsed;
     if(!incoming||!Array.isArray(incoming.dogs))throw new Error('invalid');
     if(!confirm('Se sustituirán los datos actuales de esta instalación por los de la copia. ¿Continuar?'))return;
     data=incoming;
     normalize();
     save(function(){
       render();loadSellerForm();applyAppMode();updateBackupInfoV545();
       alert('Copia recuperada correctamente. Tus perros y registros ya están disponibles.');
     });
   }catch(e){alert('El archivo no es una copia válida de la Petoria.')}
 };
 r.readAsText(file);
}
q('migrationExport').onclick=downloadFullBackup;
q('migrationImport').onclick=function(){q('migrationFile').click()};
q('migrationFile').onchange=function(e){importFullBackup(e.target.files[0]);e.target.value=''};

q('restoreEmergency').onclick=function(){
 try{
   var raw=localStorage.getItem('libreta_emergency_v23');
   if(!raw){alert('No hay una copia local de emergencia disponible en esta instalación.');return}
   var incoming=JSON.parse(raw);
   if(!incoming||!Array.isArray(incoming.dogs))throw new Error('invalid');
   if(!confirm('¿Restaurar la última copia local guardada en este navegador?'))return;
   data=incoming;normalize();save(function(){render();loadSellerForm();applyAppMode();updateBackupInfoV545();alert('Copia local restaurada.')});
 }catch(e){alert('No se ha podido restaurar la copia local.')}
};

// Warn in normal browser mode where adding to home screen may create a separate storage context on iOS.
(function(){
 var standalone=window.matchMedia&&window.matchMedia('(display-mode: standalone)').matches;
 var iosStandalone=('standalone' in navigator)&&navigator.standalone;
 if(q('installNotice')&&!standalone&&!iosStandalone)q('installNotice').style.display='block';
})();


function cmOpenNewPet(){
 pendingDogPhoto=null;
 q('dogForm').reset();q('dogId').value='';
 q('dogPhotoPreview').classList.add('hidden');q('dogPhotoPreviewImg').removeAttribute('src');
 q('dogSpecies').value='Perro';q('dogModalTitle').textContent='Nueva ficha';
 cmOpenModal('dogModal');
}
q('cmMenuBtn').onclick=function(){q('cmSideMenu').classList.add('open');document.body.style.overflow='hidden'};
q('cmMenuClose').onclick=function(){q('cmSideMenu').classList.remove('open');document.body.style.overflow='';};
q('cmSideMenu').onclick=function(e){if(e.target===q('cmSideMenu')){q('cmSideMenu').classList.remove('open');document.body.style.overflow=''}};
document.querySelectorAll('[data-cm-page]').forEach(function(b){b.onclick=function(){q('cmSideMenu').classList.remove('open');document.body.style.overflow='';cmGoPage(b.dataset.cmPage)}});
q('cmAlertsBtn').onclick=function(){cmGoPage('calendario')};

q('cmAllPets').onclick=function(){cmGoPage('perros')};
q('cmAddPet').onclick=cmOpenNewPet;
q('addBtn').onclick=cmOpenNewPet;
(function(){
 var x=document.querySelector('#dogModal [data-close="dogModal"]');
 if(x)x.onclick=function(e){
  e.preventDefault();e.stopPropagation();
  pendingDogPhoto=null;
  q('dogPhoto').value='';
  cmCloseModal('dogModal');
 };
})();


if(q('openHealthHistory'))q('openHealthHistory').onclick=function(){
 healthHistoryFilter='';
 document.querySelectorAll('[data-health-filter]').forEach(function(b){b.classList.toggle('active',b.dataset.healthFilter==='')});
 renderHealthHistory();
 cmOpenModal('healthHistoryModal');
};
if(q('closeHealthHistory'))q('closeHealthHistory').onclick=function(){
 cmCloseModal('healthHistoryModal');
 if(current){showDog(current);setTimeout(function(){activateInner('salud')},0)}
};
document.querySelectorAll('[data-health-filter]').forEach(function(b){
 b.onclick=function(){
  healthHistoryFilter=b.dataset.healthFilter||'';
  document.querySelectorAll('[data-health-filter]').forEach(function(x){x.classList.toggle('active',x===b)});
  renderHealthHistory();
 };
});


(function(){
 var bx=q('closeContractPreviewBtn');
 if(bx)bx.onclick=function(e){if(e){e.preventDefault();e.stopPropagation()}closeContractPreview()};
 var x=document.querySelector('#contractPreviewModal [data-close="contractPreviewModal"]');
 if(x)x.onclick=function(e){e.preventDefault();e.stopPropagation();closeContractPreview()};
})();


document.querySelectorAll('.nav [data-page]').forEach(function(b){
 b.addEventListener('click',function(){
   document.body.classList.remove('cm-modal-open','child-modal-open','doc-viewer-open','repro-open');
   document.body.style.overflow='';
   setTimeout(forceBottomNavVisible,0);
 });
});


(function(){
 var mh=document.querySelector('#healthModal [data-close="healthModal"]');
 if(mh)mh.onclick=function(e){e.preventDefault();e.stopPropagation();closeHealthEditor()};
 var mm=document.querySelector('#measureModal [data-close="measureModal"]');
 if(mm)mm.onclick=function(e){e.preventDefault();e.stopPropagation();closeChildModal('measureModal','crecimiento')};
})();

load(function(){render();updateBackupInfoV545();setTimeout(forceBottomNavVisible,0);loadSellerForm();if(q('appMode'))q('appMode').value=data.settings.mode||'particular';renderCalendar();renderSearch();petoriaSetupFirstStart()});
if('serviceWorker' in navigator){window.addEventListener('load',function(){navigator.serviceWorker.register('sw.js').catch(function(){})})}
})();
