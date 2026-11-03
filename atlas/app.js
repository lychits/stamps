'use strict';
const records=window.COLLECTION||[], el=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const rub=n=>new Intl.NumberFormat('ru-RU').format(n)+' ₽';
const known=v=>v!=null&&v!==''&&!/^(не установ|не определ|уточня|неизвест|не подтверж)/i.test(String(v));
const priced=r=>Number.isFinite(r.low)&&Number.isFinite(r.high);
const roundRub=n=>new Intl.NumberFormat('ru-RU',{maximumFractionDigits:0}).format(n)+' ₽';
const price=r=>priced(r)?(r.low===r.high?rub(r.low):rub(r.low)+' – '+rub(r.high)):'Оценки пока нет';
const confirmed=r=>r.identified===true||/^подтвержд/i.test(r.status||'');
const vals=(a)=>[...new Set(a.filter(Boolean))].sort((a,b)=>String(a).localeCompare(String(b),'ru',{numeric:true}));
const opts=(id,items)=>{el(id).replaceChildren(new Option('Любые',''),...vals(items).map(v=>new Option(v,v)))};
const fields=[
 ['series','Серия'],['catalogSystem','Каталог'],['catalogNo','Каталожный номер','text'],['face','Номинал'],['oneYear','Точный год'],['yearMin','Год от','number'],['yearMax','Год до','number'],['cancellation','Гашение'],['conditionGroup','Состояние'],['type','Тип объекта'],['ident','Идентификация'],['estimate','Наличие оценки'],['quoteKind','Ценовые данные'],['basis','Основание оценки'],['minPrice','Стоимость от, ₽','number'],['maxPrice','Стоимость до, ₽','number']
];
el('advanced').innerHTML=fields.map(([id,label,type])=>'<label><span>'+label+'</span>'+(type?'<input id="'+id+'" type="'+type+'"'+(type==='number'?' min="0"':'')+'>':'<select id="'+id+'"></select>')+'</label>').join('');
const systems=r=>r.catalogSystems||(['АО «Марка»','ЦФА','Michel','Scott','Yvert','Загорский','Соловьёв','Stanley Gibbons','Rusphil','Stampworld','StampWorld','Fischer','ИТЦ «Марка»','MOK','Colnect'].filter(x=>(r.catalogue||'').includes(x)));
for(const key of ['country','topic','series','face','cancellation','conditionGroup','type'])opts(key,records.map(r=>r[key]));
opts('oneYear',records.map(r=>r.year));opts('type',[...records.map(r=>r.type),'Отдельная марка','Блок','Пара','Сцепка']);opts('cancellation',['Гашёная','Негашёная','Гашение не установлено']);opts('catalogSystem',records.flatMap(systems));opts('ident',['Подтверждена','Требует уточнения']);opts('estimate',['Есть оценка','Без оценки']);
opts('quoteKind',['Состоявшиеся сделки','Продажи отдельных марок и блоков','Продажи комплектов и лотов','Цены продавцов','Каталожные цены']);
let page=1,matching=[],selected=null;const size=32,allIds=['search','country','topic',...fields.map(x=>x[0])];
const v=id=>el(id).value.trim(),norm=s=>String(s??'').toLocaleLowerCase('ru').replaceAll('ё','е');
const basisNames={sold:'По сделкам',asking:'По предложениям',catalogue:'По каталогу',none:'Без оценки'};
opts('basis',Object.values(basisNames));
const quoteLabels={sold:'Состоявшиеся сделки',asking:'Цены продавцов',catalogue:'Каталожные цены'};
const facetIds=['country','topic','series','face','oneYear','catalogSystem','cancellation','conditionGroup','type','ident','estimate','quoteKind','basis'];
function facetValues(r,id){
 if(id==='oneYear')return r.year?[String(r.year)]:[];
 if(id==='catalogSystem')return systems(r);
 if(id==='ident')return [confirmed(r)?'Подтверждена':'Требует уточнения'];
 if(id==='basis')return [basisNames[r.basisKind||'none']];
 if(id==='estimate')return [priced(r)?'Есть оценка':'Без оценки'];
 if(id==='quoteKind'){
  const labels=new Set();
  for(const q of r.market||[]){
   labels.add(quoteLabels[q.kind]);
   if(q.kind==='sold')labels.add(['single','block'].includes(q.unit)?'Продажи отдельных марок и блоков':'Продажи комплектов и лотов');
  }
  return [...labels];
 }
 return r[id]?[r[id]]:[];
}
function matchesRangesAndText(r){
 if(v('catalogNo')&&!norm(r.catalogue).includes(norm(v('catalogNo'))))return false;
 if((v('yearMin')||v('yearMax'))&&(!r.year||(v('yearMin')&&r.year<+v('yearMin'))||(v('yearMax')&&r.year>+v('yearMax'))))return false;
 if((v('minPrice')||v('maxPrice'))&&(!priced(r)||(v('minPrice')&&r.high<+v('minPrice'))||(v('maxPrice')&&r.low>+v('maxPrice'))))return false;
 return !v('search')||norm([r.id,r.title,r.description,r.country,r.year,r.series,r.catalogue,r.topic,r.designer,...(r.keywords||[])].join(' ')).includes(norm(v('search')));
}
function updateResultsAndCounts(){
 const choices=facetIds.filter(id=>v(id));
 const counters=Object.fromEntries(facetIds.map(id=>[id,new Map()]));
 const filtered=[];
 for(const r of records){
  if(!matchesRangesAndText(r))continue;
  const failed=choices.filter(id=>!facetValues(r,id).includes(v(id)));
  if(failed.length===0)filtered.push(r);
  if(failed.length>1)continue;
  for(const id of failed.length===1?failed:facetIds){
   const c=counters[id];
   for(const key of new Set(['',...facetValues(r,id)]))c.set(key,(c.get(key)||0)+1);
  }
 }
 for(const id of facetIds){
  for(const opt of el(id).options){
   const label=opt.dataset.baseLabel??opt.textContent;
   opt.dataset.baseLabel=label;
   const count=counters[id].get(opt.value)||0;
   const next=label+' ('+count+')';
   if(opt.textContent!==next)opt.textContent=next;
   opt.disabled=Boolean(opt.value)&&count===0&&!opt.selected;
  }
 }
 return filtered;
}
function compare(a,b){
 let s=v('sort');if(s==='title')return a.title.localeCompare(b.title,'ru');
 if(s==='album')return 0;
 const num=r=>s.includes('year')?r.year:(priced(r)?(r.low+r.high)/2:null);
 return num(a)==null?(num(b)==null?0:1):num(b)==null?-1:(s.startsWith('-')?-1:1)*(num(a)-num(b));
}
function card(r){
 const showPrices=['price','-price'].includes(v('sort'))||v('estimate')||v('quoteKind')||v('minPrice')||v('maxPrice');
 const tag=showPrices&&priced(r)?'<span class="priceTag">'+esc(price(r))+'</span>':'';
 return '<button class="card" data-id="'+esc(r.id)+'"><div class="tray"><img loading="lazy" decoding="async" src="'+esc(r.thumb||r.image)+'" alt="'+esc(r.title)+'">'+tag+'</div><small>'+esc([r.country,r.year].filter(Boolean).join(' · '))+'</small><h3>'+esc(r.title)+'</h3><span class="code">'+esc(r.id)+' · '+esc(r.face||'Номинал уточняется')+'</span></button>'}
const filterLabels={search:'Поиск',country:'Страна',topic:'Тематика',...Object.fromEntries(fields.map(([id,label])=>[id,label]))};
function syncLocation(){
 const url=new URL(location.href);
 for(const id of [...allIds,'sort']){
  if(v(id)&&(id!=='sort'||v(id)!=='album'))url.searchParams.set(id,v(id));
  else url.searchParams.delete(id);
 }
 if(page>1)url.searchParams.set('page',page);else url.searchParams.delete('page');
 history.replaceState(null,'',url);
}
function draw(){
 matching=updateResultsAndCounts().sort(compare);const pages=Math.max(1,Math.ceil(matching.length/size));page=Math.min(page,pages);
 el('grid').innerHTML=matching.slice((page-1)*size,page*size).map(card).join('')||'<p class="empty">По этим условиям ничего не найдено. Измените или сбросьте фильтры.</p>';
 el('activeFilters').innerHTML=allIds.filter(i=>v(i)).map(i=>'<button type="button" data-reset="'+esc(i)+'" aria-label="Снять фильтр '+esc(filterLabels[i])+'">'+esc(filterLabels[i])+' · '+esc(v(i))+' ×</button>').join('');
 syncLocation();
 el('count').textContent='Найдено '+matching.length+' из '+records.length;el('clear').hidden=!allIds.some(i=>v(i));
 el('pager').innerHTML=pages>1?'<button data-shift="-1" '+(page===1?'disabled':'')+'>← Назад</button><span>'+page+' / '+pages+'</span><button data-shift="1" '+(page===pages?'disabled':'')+'>Далее →</button>':'';
}
const quoteUnits={single:'1 марка',block:'1 блок',set:'серия / комплект',lot:'составной лот',pair:'пара',sheet:'лист'};
const quoteNames={catalogue:'Каталог',asking:'Цена продавца',sold:'Итог торгов'};
const qAmount=q=>new Intl.NumberFormat('ru-RU',{maximumFractionDigits:3}).format(q.amount)+' '+(q.currency==='RUB'?'₽':q.currency);
const dateRu=s=>/^\d{4}-\d{2}-\d{2}$/.test(s||'')?s.split('-').reverse().join('.'):(s||'');
function priceDate(q){
 if(q.kind==='sold')return q.date?'Торги '+dateRu(q.date):'Дата торгов не установлена';
 const checked=q.checked?'Проверено '+dateRu(q.checked):'';
 if(q.kind==='asking')return checked;
 const revision=q.priceDate?'Цена в истории каталога от '+dateRu(q.priceDate):q.edition?'Издание '+q.edition:'Дата цены у издателя неизвестна';
 return [revision,checked].filter(Boolean).join(' · ');
}
function marketPanel(r){
 const quotes=r.market||[];
 const amountHtml=q=>esc(qAmount(q))+(q.currency!=='RUB'&&Number.isFinite(q.rubEquivalent)?' <span class="fx">≈ '+rub(q.rubEquivalent)+'</span>':'');
 const quoteLink=q=>/^https?:\/\//.test(q.url)?'<a href="'+esc(q.url)+'" rel="noopener" target="_blank">'+esc(q.title||'Источник')+'</a>':esc(q.title);
 function summary(kind){
  const group=quotes.filter(q=>q.kind===kind);
  const singles=group.filter(q=>q.unit===(r.type==='Блок'?'block':'single'));
  const match=singles.filter(q=>q.matchCondition);
  const candidates=singles.filter(q=>q.inEstimate);
  const available=candidates.length?candidates:match.length?match:singles;
  const newest=available.slice().sort((a,b)=>Number(Boolean(b.primaryCatalogue))-Number(Boolean(a.primaryCatalogue))||String(b.priceDate||b.date||b.checked||'').localeCompare(String(a.priceDate||a.date||a.checked||'')))[0];
  let body;
  if(newest){
   body='<b>'+amountHtml(newest)+'</b><small>'+esc(newest.condition)+'</small><small>'+esc(priceDate(newest))+'</small>'+quoteLink(newest);
   if(!newest.inEstimate&&!newest.matchCondition)body+='<small>Сохранность аналога отличается или требует сверки.</small>';
  }else body='<b class="noquote">Нет поштучных данных</b>'+(group.length?'<small>Цены комплектов и лотов приведены ниже.</small>':'');
  return '<div><h4>'+quoteNames[kind]+'</h4>'+body+'</div>';
 }
 const groups=['sold','asking','catalogue'].map(kind=>{
  const items=quotes.filter(q=>q.kind===kind);
  if(!items.length)return '';
  return '<h4>'+esc(quoteLabels[kind])+'</h4><ul class="market-list">'+items.map(q=>
   '<li><b>'+amountHtml(q)+'</b> · '+esc(quoteUnits[q.unit]||q.unit)+' · '+esc(q.condition)+'<small>'+esc(priceDate(q))+'</small>'+quoteLink(q)+(q.inEstimate?'<small class="usedPrice">Входит в поштучную оценку</small>':'')+(q.notes?'<small>'+esc(q.notes)+'</small>':'')+'</li>').join('')+'</ul>';
 }).join('');
 const median=Number.isFinite(r.saleMedian)?'<p>Медиана сопоставимых продаж за 12 месяцев · <b>'+rub(r.saleMedian)+'</b> ('+r.recentSalesCount+' сделок)</p>':'';
 return '<section class="prices" id="detailPrices"><h3>Цены и сделки</h3><p class="priceSummary"><b>'+esc(price(r))+'</b> · '+esc(basisNames[r.basisKind||'none'])+'</p>'+median+'<p>'+esc(r.priceBasis)+'</p><div class="quoteGrid">'+['catalogue','asking','sold'].map(summary).join('')+'</div>'+(groups?'<details class="quoteDetails"><summary>Все ценовые записи и источники ('+quotes.length+')</summary>'+groups+'</details>':'')+'</section>';
}
function show(id){
 const r=records.find(x=>x.id===id);if(!r)return;selected=id;
 const rows=[['Страна / территория',r.country],['Серия',r.series],['Год выпуска',r.year],['Дата выпуска',r.issueDate],['Номинал',r.face],['Валюта',r.currency],['Тип объекта',r.type],['Тематика',r.topic],['Каталог и номер',r.catalogue],['Разновидность',r.variant],['Гашение',r.cancellation],['Состояние',r.condition],['Видимые дефекты',r.defects],['Идентификация',r.status],['Уверенность',r.confidence],['Поштучный ориентир',price(r)]];
 const para=(t)=>t?'<p>'+esc(t)+'</p>':'';
 el('detailbody').innerHTML='<div class="spread"><a class="plate" href="'+esc(r.image)+'" target="_blank" rel="noopener" aria-label="Открыть изображение целиком"><img src="'+esc(r.image)+'" alt="'+esc(r.title)+'"></a><div class="info"><div class="eyebrow">Экземпляр '+esc(r.id)+'</div><h2 id="detailtitle">'+esc(r.title)+'</h2><div class="detail-links"><button type="button" data-jump="detailPrices">Цены и сделки ↓</button><button type="button" data-jump="detailPassport">Паспорт ↓</button></div>'+para(r.description)+'<section class="story"><h3>История выпуска</h3>'+para(r.history)+'<p class="note"><b>Автор оформления</b> · '+esc(r.designer||'В доступных источниках не указан')+'</p></section><dl id="detailPassport">'+rows.map(([k,v])=>'<dt>'+esc(k)+'</dt><dd>'+esc(v||'Не установлено')+'</dd>').join('')+'</dl>'+para(r.notes)+marketPanel(r)+(r.keywords?.length?'<p class="note">'+esc(r.keywords.join(' · '))+'</p>':'')+(r.sources?.length?'<p><b>Источники</b></p><ul>'+r.sources.map(s=>'<li>'+((/^https?:\/\//.test(s.url))?'<a href="'+esc(s.url)+'" target="_blank" rel="noopener">'+esc(s.title||s.url)+'</a>':esc(s.title||s))+'</li>').join('')+'</ul>':'')+'<p class="note">Атрибуция выполнена по фотографии. Подлинность требует отдельной экспертизы.</p></div></div>';
 el('detailbody').querySelectorAll('[data-jump]').forEach(b=>b.onclick=()=>el(b.dataset.jump).scrollIntoView({block:'start'}));
 const ix=matching.findIndex(x=>x.id===id);el('prev').disabled=ix<1;el('next').disabled=ix<0||ix===matching.length-1;
 if(!el('detail').open)el('detail').showModal();el('detail').scrollTop=0;history.replaceState(null,'','#'+encodeURIComponent(id));
}
function step(dir){const i=matching.findIndex(r=>r.id===selected);if(matching[i+dir])show(matching[i+dir].id)}
el('grid').onclick=e=>{const b=e.target.closest('[data-id]');if(b)show(b.dataset.id)};
el('detail').querySelector('.close').onclick=()=>el('detail').close();el('detail').onclose=()=>{selected=null;history.replaceState(null,'',location.href.split('#')[0])};el('detail').onclick=e=>{if(e.target===el('detail')){const b=e.target.getBoundingClientRect();if(e.clientX<b.left||e.clientX>b.right||e.clientY<b.top||e.clientY>b.bottom)e.target.close()}};
el('prev').onclick=()=>step(-1);el('next').onclick=()=>step(1);
el('pager').onclick=e=>{const b=e.target.closest('[data-shift]');if(b){page+=+b.dataset.shift;draw();el('collection').scrollIntoView()}};
el('more').onclick=()=>{const a=el('advanced');a.hidden=!a.hidden;el('more').setAttribute('aria-expanded',String(!a.hidden));el('more').innerHTML=a.hidden?'Все фильтры <b>＋</b>':'Скрыть фильтры <b>−</b>'};
for(const i of [...allIds,'sort'])el(i).addEventListener('input',()=>{page=1;draw()});
el('clear').onclick=()=>{for(const id of allIds)el(id).value='';page=1;draw()};
const years=records.map(r=>r.year).filter(Number.isFinite),pricedSet=records.filter(priced),total=k=>pricedSet.reduce((n,r)=>n+r[k],0);
const unique=new Set(records.filter(confirmed).map(r=>r.designKey||[r.country,r.title,r.year,r.face,r.catalogue].join('|'))).size;
const stats=[['Экземпляров',records.length],['Стран и территорий',new Set(records.map(r=>r.country).filter(known)).size],['Годы выпуска',years.length?Math.min(...years)+'–'+Math.max(...years):'Уточняются'],['Разных марок и блоков¹',unique],['Оценённая часть',pricedSet.length?(roundRub(total('low'))+(total('high')!==total('low')?' – '+roundRub(total('high')):'')):'Нет оценки']];
el('stats').innerHTML=stats.map(([k,v])=>'<div><small>'+esc(k)+'</small><strong>'+esc(v)+'</strong></div>').join('');
el('valuation').textContent='¹ Разные рисунки и номиналы посчитаны по подтверждённым записям. Диапазон лет охватывает датированные выпуски. Оценено '+pricedSet.length+' из '+records.length+' экземпляров. Для суммы выбраны сопоставимые поштучные цены. Приоритет имеют продажи, затем предложения и каталожные ориентиры. При неизвестном гашении для диапазона нужны цены обеих категорий из одного типа источников. Цены комплектов показаны отдельно. Для советской части основной справочник — электронный каталог Загорского. При наличии сопоставимой сделки или предложения приоритет переходит к ним. Если за 12 месяцев найдено три сопоставимых поштучных продажи, в карточке также показана их медиана. Рублёвые суммы пересчитаны по курсам Банка России на 03.11.2026. Для архивных котировок в левах использован фиксированный курс 1,95583 лева за евро.';
const basisLabels=['sold','asking','catalogue'];
el('basisBreakdown').innerHTML=basisLabels.map(kind=>{
 const items=pricedSet.filter(r=>r.basisKind===kind);
 const lo=items.reduce((n,r)=>n+r.low,0), hi=items.reduce((n,r)=>n+r.high,0);
 return '<button type="button" data-field="basis" data-value="'+esc(basisNames[kind])+'"><span>'+esc(basisNames[kind])+'</span><strong>'+items.length+'</strong><small>'+roundRub(lo)+(Math.round(hi)!==Math.round(lo)?' – '+roundRub(hi):'')+'</small></button>';
}).join('');
const pricedCount=pricedSet.length;
el('coverageTitle').textContent='Поштучная оценка · '+pricedCount+' из '+records.length;
el('coveragePercent').textContent=new Intl.NumberFormat('ru-RU',{style:'percent',maximumFractionDigits:1}).format(pricedCount/records.length);
el('coverageBar').max=records.length;el('coverageBar').value=pricedCount;
const shortcutData=[
 ['quoteKind','Продажи отдельных марок и блоков','Поштучные сделки'],
 ['quoteKind','Каталожные цены','Есть цена каталога'],
 ['quoteKind','Цены продавцов','Цены продавцов'],
 ['estimate','Без оценки','Без поштучной оценки']
];
el('shortcuts').innerHTML=shortcutData.map(([field,val,label])=>'<button data-field="'+field+'" data-value="'+esc(val)+'">'+esc(label)+' <b>'+records.filter(r=>facetValues(r,field).includes(val)).length+'</b> ↗</button>').join('');
el('basisBreakdown').onclick=el('shortcuts').onclick=e=>{
 const b=e.target.closest('button');if(!b)return;
 for(const id of allIds)el(id).value='';
 el(b.dataset.field).value=b.dataset.value;page=1;el('country').dispatchEvent(new Event('input'));el('collection').scrollIntoView();
};
el('activeFilters').onclick=e=>{const b=e.target.closest('[data-reset]');if(b){const c=el(b.dataset.reset);c.value='';c.dispatchEvent(new Event('input'))}};
const hero=window.COVER_IDS?.map(id=>records.find(r=>r.id===id)).filter(Boolean)||records.slice(0,2);
el('specimens').innerHTML=hero.map(r=>'<img src="'+esc(r.thumb||r.image)+'" alt="">').join('');
el('intro').textContent='От сипухи на советской десятикопеечной марке до венгерского Ford Model T. Листайте альбом или выберите страну на карте.';
const saved=new URLSearchParams(location.search);
for(const id of [...allIds,'sort'])if(saved.has(id))el(id).value=saved.get(id);
page=Math.max(1,parseInt(saved.get('page'),10)||1);
draw();
if(/^#P\d{2}-\d{2}$/.test(location.hash))show(location.hash.slice(1));
