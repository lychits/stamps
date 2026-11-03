'use strict';
(() => {
 const points=window.ATLAS_POINTS, svg=el('atlasMap'), pins=el('pins'), country=el('country');
 const totals=new Map();
 for(const r of records)totals.set(r.country,(totals.get(r.country)||0)+1);
 let group=null,showAll=false,region='world';
 const regions={world:[0,0,1000,412],europe:[453,54,183,91],asia:[593,64,282,158]};
 const ns='http://www.w3.org/2000/svg';
 function choose(name){
  country.value=country.value===name?'':name;group=null;
  country.dispatchEvent(new Event('input',{bubbles:true}));render();
 }
 function render(){
  const selected=country.value;
  svg.setAttribute('viewBox',regions[region].join(' '));pins.replaceChildren();
  for(const p of points){
   const sum=p.countries.reduce((n,k)=>n+(totals.get(k)||0),0);
   if(!sum)continue;
   const pin=document.createElementNS(ns,'g'),dot=document.createElementNS(ns,'circle'),tip=document.createElementNS(ns,'title'),hit=document.createElementNS(ns,'circle');
   const f=region==='world'?1:region==='europe'?.32:.50;
   const radius=f*(2.9+Math.sqrt(sum)*.32);
   pin.setAttribute('class','pin'+(p.countries.includes(selected)?' active':''));pin.setAttribute('tabindex','0');pin.setAttribute('role','button');
   const label=p.countries.map(c=>c+' · '+totals.get(c)).join(', ');pin.setAttribute('aria-label',label);tip.textContent=label;
   pin.setAttribute('transform','translate('+p.x+' '+p.y+')');
   hit.setAttribute('r',Math.max(radius+1,6*f));hit.setAttribute('fill','transparent');
   dot.setAttribute('r',radius);dot.setAttribute('stroke-width',Math.max(.3,f));pin.append(tip,hit,dot);
   const pick=()=>{if(p.countries.length===1){choose(p.countries[0]);return}group=p;showAll=false;render();el('mapList').querySelector('button')?.focus()};
   pin.addEventListener('click',pick);pin.addEventListener('keydown',e=>{if(['Enter',' '].includes(e.key)){e.preventDefault();pick()}});pins.append(pin);
  }
  const sorted=[...totals.keys()].sort((a,b)=>totals.get(b)-totals.get(a)||a.localeCompare(b,'ru'));
  let rows=group?group.countries:showAll?sorted:sorted.slice(0,5);
  if(selected&&!rows.includes(selected)&&!group)rows=[selected,...rows];
  el('goCards').textContent=selected?'К карточкам · '+selected+' ↓':'К карточкам ↓';
  el('map-title').textContent=group?('Эмитенты · '+group.city):showAll?'Все страны и территории':'Крупнейшие разделы';
  el('mapList').replaceChildren(...rows.map(c=>{
   const b=document.createElement('button');b.type='button';b.className='geoRow'+(c===selected?' chosen':'');b.setAttribute('aria-pressed',String(c===selected));b.title='Показать марки · '+c;b.innerHTML='<span>'+esc(c)+'</span><b>'+totals.get(c)+'</b>';b.style.setProperty('--share',(100*totals.get(c)/Math.max(...totals.values()))+'%');b.onclick=()=>choose(c);return b;
  }));
  el('mapAll').textContent=group?'К списку стран':showAll?'Свернуть':'Все страны ('+totals.size+')';
 }
 el('mapAll').onclick=()=>{if(group){group=null;showAll=true}else showAll=!showAll;render()};
 document.querySelectorAll('[data-region]').forEach(b=>b.onclick=()=>{region=b.dataset.region;document.querySelectorAll('[data-region]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));render()});
 country.addEventListener('input',render);el('clear').addEventListener('click',()=>{group=null;render()});render();
})();
