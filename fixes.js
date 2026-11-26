(function(){
'use strict';
var X=window.SIG;
if(!X||!X.ld||!$id('tFib'))return;
function $id(i){return document.getElementById(i)}
var $=$id,ld=X.ld,esc=X.esc;
var BASE='https://apiconnect.angelbroking.com';
function sleep(ms){return new Promise(function(r){setTimeout(r,ms)})}
function hdrs(){return {'Content-Type':'application/json','Accept':'application/json','X-UserType':'USER','X-SourceID':'WEB','X-ClientLocalIP':'127.0.0.1','X-ClientPublicIP':X.S.pubIp||'127.0.0.1','X-MACAddress':'00:00:00:00:00:00','X-PrivateKey':ld('sig_key',''),'Authorization':'Bearer '+X.S.jwt}}
/* ek seedhi candle request: HTTP status aur jawab ka tukda dikhata hai (koi retry ya chhota-tukda nahi) */
async function raw(token,from,to){
 var url=BASE+'/rest/secure/angelbroking/historical/v1/getCandleData',body={exchange:'NSE',symboltoken:String(token),interval:'FIVE_MINUTE',fromdate:from+' 09:15',todate:to+' 15:30'};
 try{
  var cap=window.Capacitor&&window.Capacitor.Plugins&&window.Capacitor.Plugins.CapacitorHttp,status,text;
  if(cap&&cap.request){var r=await cap.request({url:url,method:'POST',headers:hdrs(),data:body});status=r.status;text=typeof r.data==='string'?r.data:JSON.stringify(r.data)}
  else{var res=await fetch(url,{method:'POST',headers:hdrs(),body:JSON.stringify(body)});status=res.status;text=await res.text()}
  var rows=0,msg='';try{var j=JSON.parse(text);rows=(j.data||[]).length;msg=j.message||j.errorcode||''}catch(e){}
  return {status:status,rows:rows,snip:(msg||text||'').toString().slice(0,110)};
 }catch(e){return {status:0,rows:0,snip:'Request hi nahi gayi: '+e.message}}
}
function prevWd(d){var x=X.addDays(d,-1);for(var i=0;i<6;i++){var w=new Date(x+'T12:00:00').getDay();if(w!==0&&w!==6)return x;x=X.addDays(x,-1)}return x}
function find(sym){return X.idxResolved().concat(X.uniResolved()).filter(function(q){return q.sym.toLowerCase()===sym.toLowerCase()})[0]}
async function dataTest(){
 var out=$('dtOut'),btn=$('dtGo');
 if(!X.S.jwt){out.innerHTML='<span class="r">Pehle login karo (Settings tab).</span>';return}
 btn.disabled=true;
 var td=X.ymd(X.istNow()),y=prevWd(td),nifty=find('Nifty 50'),bank=find('Bank Nifty'),rel=find('RELIANCE');
 var tests=[];
 if(nifty){tests.push(['Nifty 50, 1 din',nifty,y,y]);tests.push(['Nifty 50, 30 din',nifty,X.addDays(y,-29),y]);tests.push(['Nifty 50, 6 mahine',nifty,X.addDays(y,-200),y])}
 if(bank)tests.push(['Bank Nifty, 1 din',bank,y,y]);
 if(rel){tests.push(['RELIANCE, 1 din',rel,y,y]);tests.push(['RELIANCE, 30 din',rel,X.addDays(y,-29),y])}
 var res=[];
 for(var i=0;i<tests.length;i++){
  out.textContent='Jaanch '+(i+1)+'/'+tests.length+': '+tests[i][0]+'...';
  var r=await raw(tests[i][1].token,tests[i][2],tests[i][3]);r.label=tests[i][0];res.push(r);await sleep(900);
 }
 var by={};res.forEach(function(r){by[r.label]=r});
 function ok(l){return by[l]&&by[l].status===200&&by[l].rows>0}
 var anyOk=res.some(function(r){return r.status===200&&r.rows>0}),all403=res.length&&res.every(function(r){return r.status===403}),concl;
 if(!res.length)concl='Index/stock ke token nahi mile. Settings me token dhundo.';
 else if(all403)concl='<b>Har request par 403:</b> Angel One abhi candle data dene se mana kar raha hai. Ye aksar bahut zyada requests (rate-limit) ya login/IP ke masle se hota hai. 10-15 minute ruko, Settings me dobara login karo, phir ye test dobara chalao. Na chale to neeche ke jawab ka tukda mujhe bhej do.';
 else if(!anyOk)concl='<b>Koi request data nahi la saki.</b> Neeche status dekho, aur wo mujhe bhej do.';
 else if(ok('Nifty 50, 1 din')&&!ok('Nifty 50, 6 mahine'))concl='<b>1 din ka data aata hai, lambi range par fail hota hai.</b> Backtest me "3 mahine" chuno (6 nahi) aur dobara chalao. Phir bhi fail ho to jawab ka tukda bhej do.';
 else if(!ok('Nifty 50, 1 din')&&(ok('RELIANCE, 1 din')||ok('Bank Nifty, 1 din')))concl='<b>Nifty ka data nahi aa raha, baaki aa raha hai.</b> Nifty ka token galat ya index ke liye history band ho sakti hai. Neeche ka jawab mujhe bhej do.';
 else if(!ok('Nifty 50, 1 din')&&!by['Nifty 50, 1 din'])concl='Nifty 50 ka token nahi mila.';
 else concl='<span class="g"><b>Data test theek hai.</b></span> Ab Fib backtest "3 mahine" se dobara chalao.';
 var h='<div class="box">'+concl+'</div><table style="width:100%;border-collapse:collapse;font-size:12.5px"><tr class="mu"><td>Test</td><td>HTTP</td><td>Row</td><td>Jawab</td></tr>';
 res.forEach(function(r){h+='<tr style="border-top:1px solid var(--line)"><td>'+esc(r.label)+'</td><td class="'+(r.status===200?'g':'r')+'">'+r.status+'</td><td>'+r.rows+'</td><td class="mu">'+esc(r.snip)+'</td></tr>'});
 out.innerHTML=h+'</table>';
 btn.disabled=false;
}
var card=document.createElement('div');card.className='card';
card.innerHTML='<b>🧪 Data test</b><div class="mu">Backtest me "HTTP 403" ya "data nahi mila" aaye to ye Angel One se candle data lene ki chhoti-chhoti koshish karke batata hai ki dikkat kahan hai.</div><button id="dtGo">Data test chalao</button><div id="dtOut"></div>';
$('tFib').appendChild(card);
$('dtGo').onclick=dataTest;
/* backtest ka error 403 ho to seedha ishara */
var st=$('fbSt');
if(st&&window.MutationObserver){
 new MutationObserver(function(){
  if(/403|nahi mila/.test(st.textContent)&&!$('fbHint')){var d=document.createElement('div');d.id='fbHint';d.className='warn';d.innerHTML='Candle data nahi aaya. Is card ke neeche <b>🧪 Data test</b> chalao, wo bata dega ki dikkat kahan hai.';st.parentNode.insertBefore(d,st.nextSibling)}
  if(/^(Ho gaya|Data le raha)/.test(st.textContent)){var h=$('fbHint');if(h)h.remove()}
 }).observe(st,{childList:true,characterData:true,subtree:true});
}
/* "2:30" jaise samay ko 14:30 banao (9 baje se pehle ka ghanta = dopahar) */
var fl=$('fLast');
if(fl)fl.addEventListener('change',function(){
 var m=/^\s*(\d{1,2})[:.](\d{2})\s*$/.exec(fl.value);if(!m)return;
 var h=+m[1],mi=+m[2];if(h<9)h+=12;if(h>15||mi>59)return;
 fl.value=String(h).padStart(2,'0')+':'+String(mi).padStart(2,'0');
});
window.FIXES={dataTest:dataTest,raw:raw};
})();
