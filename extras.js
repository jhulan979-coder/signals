(function(){
'use strict';
var X=window.SIG;if(!X||!X.M||!X.getCandles)return;
var M=X.M,f2=X.f2,esc=X.esc,ld=X.ld,sv=X.sv;
var $=function(id){return document.getElementById(id)};
function mk(tag,cls,html){var e=document.createElement(tag);if(cls)e.className=cls;if(html!=null)e.innerHTML=html;return e}
function sleep(ms){return new Promise(function(r){setTimeout(r,ms)})}

/* ---------- sectors ---------- */
var SECT={};
(function(){var src={'Bank':'HDFCBANK ICICIBANK SBIN KOTAKBANK AXISBANK INDUSINDBK BANKBARODA CANBK PNB UNIONBANK FEDERALBNK IDFCFIRSTB AUBANK BANDHANBNK RBLBANK YESBANK',
'Finance':'BAJFINANCE BAJAJFINSV SHRIRAMFIN CHOLAFIN MUTHOOTFIN MANAPPURAM LICHSGFIN PFC RECLTD SBICARD HDFCAMC JIOFIN LTF POONAWALLA IRFC HUDCO ANGELONE CDSL BSE MFSL LICI SBILIFE HDFCLIFE ICICIGI ICICIPRULI POLICYBZR',
'IT':'TCS INFY HCLTECH WIPRO TECHM COFORGE MPHASIS PERSISTENT KPITTECH OFSS TATAELXSI NAUKRI',
'Auto':'MARUTI M&M EICHERMOT HEROMOTOCO BAJAJ-AUTO TVSMOTOR ASHOKLEY BALKRISIND BHARATFORG BOSCHLTD MRF MOTHERSON UNOMINDA SONACOMS EXIDEIND ESCORTS TIINDIA',
'Pharma':'SUNPHARMA CIPLA DRREDDY DIVISLAB APOLLOHOSP LUPIN AUROPHARMA BIOCON GLENMARK IPCALAB LAURUSLABS TORNTPHARM ZYDUSLIFE SYNGENE MAXHEALTH',
'FMCG':'HINDUNILVR ITC NESTLEIND BRITANNIA TATACONSUM DABUR COLPAL GODREJCP MARICO VBL',
'Metal':'TATASTEEL JSWSTEEL HINDALCO VEDL JINDALSTEL SAIL NMDC APLAPOLLO',
'Oil-Gas':'RELIANCE ONGC BPCL IOC HINDPETRO GAIL OIL PETRONET IGL COALINDIA',
'Power':'NTPC POWERGRID TATAPOWER ADANIPOWER ADANIGREEN JSWENERGY NHPC SJVN TORNTPOWER CGPOWER',
'Infra-Capex':'LT ABB SIEMENS BEL HAL BHEL CUMMINSIND HAVELLS POLYCAB RVNL CONCOR ADANIPORTS ADANIENT GMRAIRPORT SUZLON',
'Cement-Material':'ULTRACEMCO GRASIM AMBUJACEM ACC SHREECEM ASIANPAINT BERGEPAINT PIDILITIND SRF UPL TATACHEM PIIND DEEPAKNTR SUPREMEIND ASTRAL',
'Consumer-Realty':'TITAN TRENT DLF LODHA GODREJPROP OBEROIRLTY PRESTIGE PHOENIXLTD INDHOTEL JUBLFOOD KALYANKJIL PAGEIND DIXON VOLTAS CROMPTON NYKAA ETERNAL IRCTC INDIGO DELHIVERY',
'Telecom':'BHARTIARTL TATACOMM INDUSTOWER'};
Object.keys(src).forEach(function(k){src[k].split(' ').forEach(function(s){SECT[s]=k})})})();
function sector(sym){return SECT[sym]||'Anya'}

/* ---------- styles + tabs ---------- */
var st=mk('style','',
'#xModal{display:none;position:fixed;left:0;top:0;right:0;bottom:0;background:rgba(0,0,0,.82);z-index:50;padding:10px;overflow:auto}'+
'.xb{margin:4px 5px 4px 0;padding:7px 11px;font-size:13px}.xs{height:10px;border-radius:5px;background:#2b333b;overflow:hidden;position:relative}.xs i{position:absolute;left:0;top:0;bottom:0}'+
'.xr{display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid var(--line)}.xr .n{width:120px;font-size:13px}.xr .bw{flex:1;height:14px;background:#2b333b;border-radius:7px;position:relative}.xr .bw i{position:absolute;top:0;bottom:0;border-radius:7px}'+
'.bdg{display:inline-block;border:1px solid var(--line);border-radius:14px;padding:4px 9px;margin:3px;font-size:12px}.bdg.on{border-color:var(--sf);color:var(--sf)}');
document.head.appendChild(st);
var tabsEl=$('tabs');
[['tMap','Naksha'],['tGame','Game'],['tRep','Replay'],['tAI','AI']].forEach(function(t){
 var b=mk('button','tab',t[1]);b.setAttribute('data-tab',t[0]);b.onclick=function(){X.tab(t[0])};tabsEl.appendChild(b);
 var s=mk('div','sec');s.id=t[0];document.body.appendChild(s);
});
tabsEl.addEventListener('click',function(e){var id=e.target.getAttribute&&e.target.getAttribute('data-tab');if(id)setTimeout(function(){onTab(id)},0)});
var modal=mk('div','', '<div class="card" style="max-width:620px;margin:auto"><div class="row"><b id="xcT" style="flex:1"></b><button class="s xb" id="xcX" style="flex:0 0 auto">Band</button></div><canvas id="xcv" style="width:100%;height:340px;background:#0f1215;border-radius:10px"></canvas><div id="xcI" class="mu" style="margin-top:6px"></div><pre id="xcL" style="margin-top:6px"></pre></div>');
modal.id='xModal';document.body.appendChild(modal);
$('xcX').onclick=function(){modal.style.display='none'};

/* ---------- candle chart ---------- */
function drawChart(cv,cs,o){
 var dpr=window.devicePixelRatio||1,W=cv.clientWidth||340,H=cv.clientHeight||340;
 cv.width=W*dpr;cv.height=H*dpr;var g=cv.getContext('2d');g.setTransform(dpr,0,0,dpr,0,0);
 g.fillStyle='#0f1215';g.fillRect(0,0,W,H);
 if(!cs.length){g.fillStyle='#9aa7b0';g.font='13px sans-serif';g.fillText('Candle data nahi mila',12,24);return null}
 var L=6,R=52,T=14,B=24,vh=Math.round(H*0.15),pw=W-L-R,ph=H-T-B-vh-6,slots=75,cw=pw/slots;
 var lo=1e18,hi=-1e18;cs.forEach(function(c){lo=Math.min(lo,c.l);hi=Math.max(hi,c.h)});
 var rg=hi-lo||1,lv=(o.levels||[]).filter(function(l){return l.y>lo-rg*1.2&&l.y<hi+rg*1.2});
 lv.forEach(function(l){lo=Math.min(lo,l.y);hi=Math.max(hi,l.y)});
 var pad=(hi-lo)*0.06||1;lo-=pad;hi+=pad;
 function Y(p){return T+ph*(1-(p-lo)/(hi-lo))}
 function Xp(i){return L+i*cw+cw/2}
 g.font='10px sans-serif';g.textBaseline='middle';
 for(var k=0;k<=4;k++){var p=lo+(hi-lo)*k/4,yy=Y(p);g.strokeStyle='#1f262c';g.lineWidth=1;g.beginPath();g.moveTo(L,yy);g.lineTo(W-R,yy);g.stroke();g.fillStyle='#9aa7b0';g.textAlign='left';g.fillText(f2(p),W-R+4,yy)}
 g.textAlign='center';g.textBaseline='top';
 for(var h=0;h<=6;h++){var i=h*12;g.fillStyle='#9aa7b0';var mins=9*60+15+i*5;g.fillText(String(Math.floor(mins/60)).padStart(2,'0')+':'+String(mins%60).padStart(2,'0'),Xp(i),H-B+6)}
 var nOR=Math.min(3,cs.length),orH=-1e18,orL=1e18;
 for(var q=0;q<nOR;q++){orH=Math.max(orH,cs[q].h);orL=Math.min(orL,cs[q].l)}
 g.fillStyle='rgba(255,153,51,0.10)';g.fillRect(Xp(0)-cw/2,Y(orH),cw*nOR,Y(orL)-Y(orH));
 g.setLineDash([4,4]);g.lineWidth=1;g.strokeStyle='rgba(255,153,51,0.7)';
 [orH,orL].forEach(function(v){g.beginPath();g.moveTo(Xp(0)-cw/2,Y(v));g.lineTo(W-R,Y(v));g.stroke()});
 g.setLineDash([]);
 var maxV=1;cs.forEach(function(c){maxV=Math.max(maxV,c.v)});
 cs.forEach(function(c,i){
  var up=c.c>=c.o,col=up?'#3ddc84':'#ff5252',x=Xp(i);
  g.strokeStyle=col;g.fillStyle=col;g.lineWidth=1;
  g.beginPath();g.moveTo(x,Y(c.h));g.lineTo(x,Y(c.l));g.stroke();
  var y1=Y(Math.max(c.o,c.c)),y2=Y(Math.min(c.o,c.c));g.fillRect(x-cw*0.35,y1,cw*0.7,Math.max(1,y2-y1));
  g.globalAlpha=0.35;g.fillRect(x-cw*0.35,H-B-(c.v/maxV)*vh,cw*0.7,(c.v/maxV)*vh);g.globalAlpha=1;
 });
 var pv=0,vv=0;g.strokeStyle='#4fc3f7';g.lineWidth=1.5;g.beginPath();
 cs.forEach(function(c,i){pv+=(c.h+c.l+c.c)/3*c.v;vv+=c.v;var vw=vv>0?pv/vv:c.c;if(i===0)g.moveTo(Xp(i),Y(vw));else g.lineTo(Xp(i),Y(vw))});
 g.stroke();
 g.textAlign='left';g.textBaseline='middle';
 lv.forEach(function(l){g.setLineDash(l.dash?[3,3]:[]);g.strokeStyle=l.c;g.lineWidth=1.3;g.beginPath();g.moveTo(L,Y(l.y));g.lineTo(W-R,Y(l.y));g.stroke();g.setLineDash([]);g.fillStyle=l.c;g.font='bold 10px sans-serif';g.fillText(l.t+' '+f2(l.y),Math.max(L+2,W-R-98),Y(l.y)-7)});
 var last=cs[cs.length-1],ly=Y(last.c);g.fillStyle=last.c>=last.o?'#3ddc84':'#ff5252';g.fillRect(W-R,ly-8,R-2,16);g.fillStyle='#101316';g.font='bold 10px sans-serif';g.fillText(f2(last.c),W-R+3,ly);
 g.fillStyle='#9aa7b0';g.font='10px sans-serif';g.textAlign='left';g.textBaseline='top';g.fillText((o.title||'')+'   (narangi = pehli 15 min ki range, neeli = VWAP)',L+2,2);
 return {Xp:Xp,cw:cw,L:L,n:cs.length};
}
function attachCross(cv,cs,meta,info){
 cv.onclick=function(e){
  if(!meta)return;var r=cv.getBoundingClientRect(),x=e.clientX-r.left,i=Math.round((x-meta.L)/meta.cw-0.5);
  if(i<0||i>=cs.length)return;var c=cs[i];
  info.textContent=c.t+'  O '+f2(c.o)+'  H '+f2(c.h)+'  L '+f2(c.l)+'  C '+f2(c.c)+'  Vol '+Math.round(c.v).toLocaleString('en-IN');
 };
}
async function lastDayCandles(token){
 var d=X.ymd(X.istNow()),cs=await X.getCandles(token,X.addDays(d,-6),d),by={};
 cs.forEach(function(c){(by[c.d]=by[c.d]||[]).push(c)});
 var ds=Object.keys(by).sort(),ld2=ds[ds.length-1];
 return {date:ld2,cs:ld2?by[ld2].sort(function(a,b){return a.t<b.t?-1:1}):[]};
}
function levelsFor(sig,cs){
 var lv=[];
 if(sig){lv.push({y:sig.entry,t:'Entry',c:'#ffffff'},{y:sig.sl,t:'SL',c:'#ff5252'},{y:sig.tgt,t:'Target',c:'#3ddc84'});return lv}
 return lv;
}
async function openChart(sym,token,sig){
 modal.style.display='block';$('xcT').textContent=sym+' - 5 minute chart';$('xcI').textContent='Data aa raha hai...';$('xcL').textContent='';
 try{
  var r=await lastDayCandles(token),cs=r.cs,P=X.cfg(),levels=levelsFor(sig,cs),txt=[];
  var br=X.breadth().avg,now=X.hm(X.istNow()),live=r.date===X.ymd(X.istNow()),done=live?cs.filter(function(c){return X.addMin(c.t,5)<=now}):cs;
  if(!sig&&done.length>=5){
   var fb=X.firstBreak(done,P,function(){return br});
   if(fb&&fb.okV&&fb.okB&&fb.okR){var sl=fb.dir>0?fb.orL:fb.orH,R=Math.abs(fb.close-sl);levels=[{y:fb.close,t:'Entry?',c:'#cfd8dc',dash:1},{y:sl,t:'SL?',c:'#ff8a80',dash:1},{y:fb.close+fb.dir*2*R,t:'Target?',c:'#a5d6a7',dash:1}]}
  }
  txt=X.explain(done,P,function(){return br});
  var cv=$('xcv'),meta=drawChart(cv,cs,{levels:levels,title:sym+'  '+(r.date||'')});
  attachCross(cv,cs,meta,$('xcI'));
  $('xcI').textContent=(sig?'Signal ke Entry/SL/Target lines dikh rahi hain. ':(levels.length?'Dotted lines = agar signal bana to ye levels hote. ':''))+'Candle par tap karo to OHLC dikhega.';
  $('xcL').textContent=txt.join('\n');
 }catch(e){$('xcI').innerHTML='<span class="r">Dikkat: '+esc(e.message)+'</span>'}
}

/* ---------- heatmap / sector / radar ---------- */
var MV='heat',MAPR=[];
function mix(a,b,t){return 'rgb('+Math.round(a[0]+(b[0]-a[0])*t)+','+Math.round(a[1]+(b[1]-a[1])*t)+','+Math.round(a[2]+(b[2]-a[2])*t)+')'}
function colOf(p){var t=Math.max(-3,Math.min(3,p))/3;return t>=0?mix([43,51,59],[40,170,80],t):mix([43,51,59],[210,50,50],-t)}
function squarify(items,x,y,w,h){
 var out=[],tot=0;items.forEach(function(i){tot+=i.v});if(!tot)return out;
 var sc=w*h/tot,list=items.map(function(i){return {it:i,a:i.v*sc}}),row=[],rc={x:x,y:y,w:w,h:h};
 function worst(r,side){var s=0,mx=0,mn=1e18;r.forEach(function(q){s+=q.a;mx=Math.max(mx,q.a);mn=Math.min(mn,q.a)});return Math.max(side*side*mx/(s*s),s*s/(side*side*mn))}
 function lay(r,c){var s=0;r.forEach(function(q){s+=q.a});
  if(c.w>=c.h){var rw=s/c.h,yy=c.y;r.forEach(function(q){var rh=q.a/rw;out.push({it:q.it,x:c.x,y:yy,w:rw,h:rh});yy+=rh});return {x:c.x+rw,y:c.y,w:c.w-rw,h:c.h}}
  var rh2=s/c.w,xx=c.x;r.forEach(function(q){var rw2=q.a/rh2;out.push({it:q.it,x:xx,y:c.y,w:rw2,h:rh2});xx+=rw2});return {x:c.x,y:c.y+rh2,w:c.w,h:c.h-rh2}}
 while(list.length){var side=Math.min(rc.w,rc.h),c=list[0],nr=row.concat([c]);if(!row.length||worst(nr,side)<=worst(row,side)){row=nr;list.shift()}else{rc=lay(row,rc);row=[]}}
 if(row.length)lay(row,rc);
 return out;
}
function liq(){var c=X.cfg();return X.stocksNow().filter(function(x){return X.liquid(x,c)})}
function drawHeat(cv){
 var dpr=window.devicePixelRatio||1,W=cv.clientWidth||340,H=cv.clientHeight||420;cv.width=W*dpr;cv.height=H*dpr;var g=cv.getContext('2d');g.setTransform(dpr,0,0,dpr,0,0);
 g.fillStyle='#0f1215';g.fillRect(0,0,W,H);MAPR=[];
 var it=liq().map(function(x){return {x:x,v:Math.max(1,x.vol*x.ltp)}}).sort(function(a,b){return b.v-a.v}).slice(0,70);
 if(!it.length){g.fillStyle='#9aa7b0';g.font='13px sans-serif';g.fillText('Pehle Market tab me refresh karo.',12,24);return}
 squarify(it,0,0,W,H).forEach(function(r){
  var x=r.it.x;g.fillStyle=colOf(x.pct);g.fillRect(r.x+1,r.y+1,r.w-2,r.h-2);MAPR.push({x:r.x,y:r.y,w:r.w,h:r.h,t:x.t,n:x.n});
  if(r.w>34&&r.h>20){g.fillStyle='#fff';g.textAlign='center';g.textBaseline='middle';var fs=Math.max(8,Math.min(15,r.w/(x.n.length*0.62)));g.font='bold '+fs+'px sans-serif';g.fillText(x.n,r.x+r.w/2,r.y+r.h/2-(r.h>38?6:0));if(r.h>38){g.font=Math.max(8,fs-2)+'px sans-serif';g.fillText((x.pct>=0?'+':'')+f2(x.pct)+'%',r.x+r.w/2,r.y+r.h/2+8)}}
 });
}
function drawRadar(cv,tt){
 var dpr=window.devicePixelRatio||1,W=cv.clientWidth||340,H=cv.clientHeight||420;cv.width=W*dpr;cv.height=H*dpr;var g=cv.getContext('2d');g.setTransform(dpr,0,0,dpr,0,0);
 g.fillStyle='#0f1215';g.fillRect(0,0,W,H);MAPR=[];
 var L=30,R=10,T=10,B=26,pw=W-L-R,ph=H-T-B;
 function PX(p){return L+pw*(Math.max(-4,Math.min(4,p))+4)/8}function PY(q){return T+ph*(1-q)}
 g.fillStyle='rgba(61,220,132,0.08)';g.fillRect(PX(0.4),T,W-R-PX(0.4),PY(0.9)-T);g.fillStyle='rgba(255,82,82,0.08)';g.fillRect(L,PY(0.1),PX(-0.4)-L,T+ph-PY(0.1));
 g.strokeStyle='#2c343c';g.lineWidth=1;g.strokeRect(L,T,pw,ph);g.beginPath();g.moveTo(PX(0),T);g.lineTo(PX(0),T+ph);g.stroke();
 g.fillStyle='#9aa7b0';g.font='10px sans-serif';g.textAlign='center';g.textBaseline='top';[-4,-2,0,2,4].forEach(function(v){g.fillText(v+'%',PX(v),H-B+6)});
 g.save();g.translate(10,T+ph/2);g.rotate(-Math.PI/2);g.fillText('din ki range me jagah (neeche=low, upar=high)',0,0);g.restore();
 g.fillStyle='rgba(61,220,132,0.8)';g.textAlign='right';g.fillText('BREAKOUT ZONE (upar)',W-R-4,T+4);g.fillStyle='rgba(255,82,82,0.8)';g.textAlign='left';g.fillText('BREAKDOWN ZONE (neeche)',L+4,T+ph-14);
 var a=liq().sort(function(p,q){return q.vol*q.ltp-p.vol*p.ltp}).slice(0,160),hot=[];
 a.forEach(function(x){
  var pos=x.h>x.l?(x.ltp-x.l)/(x.h-x.l):0.5,r=Math.max(3,Math.min(11,Math.sqrt(x.vol*x.ltp/1e7)*0.7)),cx=PX(x.pct),cy=PY(pos);
  var isHot=(x.pct>=0.4&&pos>=0.9)||(x.pct<=-0.4&&pos<=0.1);
  g.beginPath();g.arc(cx,cy,r,0,7);g.fillStyle=x.vw>0?(x.ltp>x.vw?'rgba(61,220,132,0.75)':'rgba(255,82,82,0.75)'):'rgba(154,167,176,0.7)';g.fill();
  if(isHot){var pulse=0.5+0.5*Math.sin((tt||0)/260);g.strokeStyle='rgba(255,153,51,'+(0.4+0.6*pulse)+')';g.lineWidth=2;g.beginPath();g.arc(cx,cy,r+3+pulse*3,0,7);g.stroke();hot.push({x:x,cx:cx,cy:cy})}
  MAPR.push({x:cx-r-3,y:cy-r-3,w:2*r+6,h:2*r+6,t:x.t,n:x.n});
 });
 hot.sort(function(p,q){return Math.abs(q.x.pct)-Math.abs(p.x.pct)}).slice(0,9).forEach(function(h){g.fillStyle='#fff';g.font='bold 10px sans-serif';g.textAlign='center';g.textBaseline='bottom';g.fillText(h.x.n,h.cx,h.cy-9)});
}
function sectorsHtml(){
 var m={};liq().forEach(function(x){var s=sector(x.n),o=m[s]=m[s]||{n:s,w:0,p:0,c:0,a:[]},v=Math.max(1,x.vol*x.ltp);o.w+=v;o.p+=x.pct*v;o.c++;o.a.push(x)});
 var a=Object.keys(m).map(function(k){var o=m[k];o.avg=o.p/o.w;return o}).sort(function(p,q){return q.avg-p.avg});
 if(!a.length)return '<div class="mu">Pehle Market tab me refresh karo.</div>';
 var mx=Math.max.apply(null,a.map(function(o){return Math.abs(o.avg)}).concat([0.5]));
 return a.map(function(o){
  var w=Math.abs(o.avg)/mx*50,up=o.avg>=0,top=o.a.slice().sort(function(p,q){return q.pct-p.pct});
  return '<div class="xr"><div class="n"><b>'+esc(o.n)+'</b><div class="mu">'+o.c+' stock</div></div><div class="bw"><i style="'+(up?'left:50%':'right:50%')+';width:'+w+'%;background:'+(up?'var(--g)':'var(--r)')+'"></i></div><div style="width:64px;text-align:right" class="'+(up?'g':'r')+'">'+(up?'+':'')+f2(o.avg)+'%</div></div><div class="mu" style="padding:2px 0 6px">Top: '+esc(top[0].n)+' ('+f2(top[0].pct)+'%)  |  Kamzor: '+esc(top[top.length-1].n)+' ('+f2(top[top.length-1].pct)+'%)</div>';
 }).join('');
}
function buildMap(){
 var s=$('tMap');
 s.innerHTML='<div class="card"><div class="chips" id="xmv"></div><canvas id="xmc" style="width:100%;height:430px;background:#0f1215;border-radius:10px;margin-top:8px"></canvas><div id="xsec" style="display:none"></div><div class="mu" id="xmn" style="margin-top:6px"></div></div>';
 $('xmv').innerHTML=[['heat','Heatmap'],['sec','Sector'],['rad','Radar']].map(function(v){return '<button class="chip" data-v="'+v[0]+'">'+v[1]+'</button>'}).join('');
 $('xmv').onclick=function(e){var v=e.target.getAttribute&&e.target.getAttribute('data-v');if(v){MV=v;renderMap()}};
 $('xmc').onclick=function(e){var r=$('xmc').getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;for(var i=MAPR.length-1;i>=0;i--){var q=MAPR[i];if(x>=q.x&&x<=q.x+q.w&&y>=q.y&&y<=q.y+q.h){X.tab('tMarket');X.showDet(q.t);return}}};
}
function renderMap(){
 if(!$('xmv'))return;
 Array.prototype.forEach.call($('xmv').children,function(b){b.classList.toggle('on',b.getAttribute('data-v')===MV)});
 var cv=$('xmc');cv.style.display=MV==='sec'?'none':'block';$('xsec').style.display=MV==='sec'?'block':'none';
 if(MV==='heat'){drawHeat(cv);$('xmn').textContent='Tile ka size = turnover (kitna paisa laga), rang = aaj ka % badlav (hara badha, laal gira). Tap karo to stock khulega.'}
 else if(MV==='sec'){$('xsec').innerHTML=sectorsHtml();$('xmn').textContent='Sector ka average % turnover ke hisaab se. Sirf liquid stock gine gaye.'}
 else{drawRadar(cv,Date.now());$('xmn').textContent='Har dot ek stock hai. Dot bada = zyada turnover. Hara = VWAP ke upar, laal = neeche. Chamakne wale dot breakout/breakdown zone me hain. Tap karo.'}
}
setInterval(function(){if(MV==='rad'&&$('tMap')&&$('tMap').classList.contains('on'))drawRadar($('xmc'),Date.now())},180);

/* ---------- AI: plan + news ---------- */
async function gem(prompt,search,model){
 var key=(($('aiK')&&$('aiK').value)||ld('sig_gem','')).trim();
 if(!key)throw new Error('Pehle AI tab me Gemini API key daalo.');
 sv('sig_gem',key);
 var body={contents:[{parts:[{text:prompt}]}],generationConfig:{temperature:0.5,maxOutputTokens:1600}};
 if(search)body.tools=[{google_search:{}}];
 var res=await fetch('https://generativelanguage.googleapis.com/v1beta/models/'+(model||'gemini-flash-latest')+':generateContent',{method:'POST',headers:{'content-type':'application/json','x-goog-api-key':key},body:JSON.stringify(body)});
 var d=null;try{d=await res.json()}catch(e){}
 if(!res.ok||!d){var m=(d&&d.error&&d.error.message)||('Error '+res.status),er=new Error(m);er.quota=(res.status===429||/quota|RESOURCE_EXHAUSTED|rate limit/i.test(m));throw er}
 var c=d.candidates&&d.candidates[0],text=((c&&c.content&&c.content.parts)||[]).map(function(p){return p.text||''}).join('');
 var src=[];((c&&c.groundingMetadata&&c.groundingMetadata.groundingChunks)||[]).forEach(function(x){var t=x.web&&x.web.title;if(t&&src.indexOf(t)<0)src.push(t)});
 if(!text)throw new Error('AI ne jawab nahi diya.');
 return {text:text,sources:src.slice(0,5)};
}
function planContext(){
 var l=[],b=X.breadth();
 X.idxResolved().forEach(function(it){var x=M.snap[it.token];if(x)l.push(it.sym+': '+f2(x.ltp)+' ('+(x.pct>=0?'+':'')+f2(x.pct)+'%)')});
 l.push('Breadth: '+b.up+' badhe, '+b.dn+' gire, average '+f2(b.avg)+'%');
 var m={};liq().forEach(function(x){var s=sector(x.n),o=m[s]=m[s]||{w:0,p:0};var v=Math.max(1,x.vol*x.ltp);o.w+=v;o.p+=x.pct*v});
 l.push('Sector: '+Object.keys(m).map(function(k){return k+' '+f2(m[k].p/m[k].w)+'%'}).join(', '));
 var a=liq().sort(function(p,q){return q.pct-p.pct});
 l.push('Top gainers: '+a.slice(0,8).map(function(x){return x.n+' '+f2(x.pct)+'%'}).join(', '));
 l.push('Top losers: '+a.slice(-8).map(function(x){return x.n+' '+f2(x.pct)+'%'}).join(', '));
 return l.join('\n');
}
function showAI(el,r){el.innerHTML='<div class="box" style="white-space:pre-wrap">'+esc(r.text)+'</div>'+(r.sources.length?'<div class="mu">Sources: '+r.sources.map(esc).join(', ')+'</div>':'')+'<div class="mu">AI ki baat galat ho sakti hai. Ye signal ke score me nahi judta (iska backtest nahi ho sakta), sirf chetavni hai.</div>'}
var QMSG='Gemini ka free quota khatam hai. Kal dobara koshish karo, ya billing wali key lagao. Agar ye key Pehredaar ya Creator Studio me bhi chal rahi hai to unhone bhi quota kha liya hoga.';
async function planAI(){
 var el=$('aiOut');el.textContent='AI soch raha hai (Google Search se khabar dhundh raha hai)...';
 if(!M.t){el.innerHTML='<span class="r">Pehle Market tab me refresh karo.</span>';return}
 var tail='\n\nHinglish me 130 shabdon ke andar likho: 1) market ka mood 2) kaun se sector/theme strong ya kamzor aur kyun 3) aaj kin events/khabron se savdhan rehna 4) breakout trade ke liye ek dhyan rakhne wali baat. Kisi stock ko khareedne ya bechne ki salah mat do.';
 try{
  var r=await gem('Tum ek Indian intraday market analyst ho. Aaj ki tareekh ke hisaab se Google Search se India ke bade news, global cues (US/Asia market, crude, dollar-rupee, FII/DII) aur aaj ke events dekho. Ye mera live market data hai:\n'+planContext()+tail,true);
  showAI(el,r);
 }catch(e){
  if(!e.quota){el.innerHTML='<span class="r">Dikkat: '+esc(e.message)+'</span>';return}
  try{
   el.textContent='Google Search ki limit khatam, ab sirf tumhare market data se plan bana raha hoon...';
   var r2=await gem('Tum ek Indian intraday market analyst ho. Tumhare paas internet nahi hai, isliye sirf neeche diye gaye data par bolo aur koi khabar ya global cue mat banao. Ye mera live market data hai:\n'+planContext()+tail,false,'gemini-flash-lite-latest');
   r2.text='[Google Search ki limit khatam. Ye plan sirf tumhare market data se bana hai, aaj ki khabar ya global cues nahi dekhe gaye.]\n\n'+r2.text;
   showAI(el,r2);
  }catch(e2){el.innerHTML='<span class="r">'+(e2.quota?esc(QMSG):'Dikkat: '+esc(e2.message))+'</span>'}
 }
}
async function newsAI(sym,el,dir){
 el.textContent='Khabar dhundh raha hoon...';
 try{
  var r=await gem('Google Search se NSE stock "'+sym+'" ki aaj aur pichle 2 din ki khabar dhundo (results, SEBI/regulator action, block/bulk deal, brokerage upgrade/downgrade, bada order, management change). Sirf is format me jawab do, aur kuch nahi: {"mood":"positive ya negative ya neutral ya mixed","summary":"1-2 line Hinglish","flag":"koi bada jokhim ya none"}. Agar koi khaas khabar nahi mili to mood neutral likho.',true);
  var m=r.text.match(/\{[\s\S]*\}/),j=null;try{j=JSON.parse(m[0])}catch(e){}
  if(!j){showAI(el,r);return}
  var mood=String(j.mood||'neutral').toLowerCase(),warn='';
  if(dir>0&&mood==='negative')warn='<div class="warn">Khabar BUY signal ke khilaaf hai. Savdhan.</div>';
  if(dir<0&&mood==='positive')warn='<div class="warn">Khabar SELL signal ke khilaaf hai. Savdhan.</div>';
  if(j.flag&&String(j.flag).toLowerCase()!=='none')warn+='<div class="warn">Jokhim: '+esc(j.flag)+'</div>';
  el.innerHTML='<div class="box"><span class="pill '+(mood==='positive'?'pg':(mood==='negative'?'pr':'po'))+'">'+esc(mood)+'</span> '+esc(j.summary||'')+'</div>'+warn+(r.sources.length?'<div class="mu">Sources: '+r.sources.map(esc).join(', ')+'</div>':'');
 }catch(e){
  if(e.quota)el.innerHTML='<div class="warn">Google Search wali free limit khatam hai, isliye khabar dekh nahi sakta. Bina search ke AI aaj ki khabar nahi jaanta, to main andaaza lagakar jawab nahi de raha.</div>';
  else el.innerHTML='<span class="r">Dikkat: '+esc(e.message)+'</span>';
 }
}
function buildAI(){
 $('tAI').innerHTML='<div class="card"><b>AI market plan aur news</b><label>Gemini API key (sirf is browser me save hoti hai)</label><input id="aiK" type="password" autocomplete="off"><button id="aiP">Aaj ka market plan</button><div id="aiOut" class="mu"></div></div>'+
 '<div class="card"><b>Kisi bhi stock ki khabar</b><label>NSE naam (jaise RELIANCE)</label><input id="aiS" placeholder="RELIANCE"><button id="aiN">News check</button><div id="aiNo"></div><div class="mu">Signal ke card par aur stock ke page par bhi 📰 button hai.</div></div>';
 $('aiK').value=ld('sig_gem','');
 $('aiP').onclick=planAI;
 $('aiN').onclick=function(){var s=$('aiS').value.trim().toUpperCase();if(s)newsAI(s,$('aiNo'),0)};
}

/* ---------- paper game ---------- */
var LT={};
function pp(){var p=ld('sig_paper',null);if(!p||!p.start){p={start:100000,pos:[],hist:[],xp:0};sv('sig_paper',p)}return p}
function ppSave(p){sv('sig_paper',p)}
function ltpOf(t){return LT[t]||(M.snap[t]&&M.snap[t].ltp)||0}
function costOf(entry,qty){return entry*qty*X.cfg().cost/100}
function calcPnl(p,exit){return (exit-p.entry)*p.dir*p.qty-costOf(p.entry,p.qty)}
function closePaper(P,p,exit,reason){
 var pnl=calcPnl(p,exit),risk=Math.abs(p.entry-p.sl)*p.qty||1,r=pnl/risk;
 P.pos=P.pos.filter(function(q){return q.id!==p.id});
 P.hist.push({id:p.id,sym:p.sym,dir:p.dir,qty:p.qty,entry:p.entry,exit:exit,sl:p.sl,tgt:p.tgt,pnl:pnl,r:r,reason:reason,date:p.date,from:p.from});
 P.xp=Math.max(0,P.xp+(pnl>0?10+Math.round(Math.min(r,3)*10):Math.max(-6,Math.round(r*6))));
}
function openPaper(o){
 var P=pp(),eq=equity(P);
 if(!o.entry||!o.sl||o.entry===o.sl){alert('Entry/SL galat hai.');return}
 var risk=eq*X.cfg().riskPct/100,qty=o.qty||Math.max(1,Math.floor(risk/Math.abs(o.entry-o.sl)));
 var maxQ=Math.max(1,Math.floor(eq*5/o.entry));qty=Math.min(qty,maxQ);
 if(P.pos.some(function(q){return q.sym===o.sym})){alert(o.sym+' ka paper trade pehle se khula hai.');return}
 P.pos.push({id:Date.now()+'-'+o.sym,sym:o.sym,token:o.token,dir:o.dir,qty:qty,entry:o.entry,sl:o.sl,tgt:o.tgt,date:X.ymd(X.istNow()),t:X.hm(X.istNow()),from:o.from||'manual'});
 ppSave(P);renderGame();
 return true;
}
function equity(P){var u=0;P.pos.forEach(function(p){var l=ltpOf(p.token);if(l)u+=calcPnl(p,l)});var r=0;P.hist.forEach(function(h){r+=h.pnl});return P.start+r+u}
function tick(){
 var P=pp(),ch=false,now=X.hm(X.istNow()),td=X.ymd(X.istNow());
 P.pos.slice().forEach(function(p){
  var l=ltpOf(p.token);if(!l)return;
  if(p.date<td){closePaper(P,p,l,'Purana (agle din band)');ch=true;return}
  var hitSL=p.dir>0?l<=p.sl:l>=p.sl,hitT=p.dir>0?l>=p.tgt:l<=p.tgt;
  if(hitSL){closePaper(P,p,p.sl,'Stop-loss');ch=true}
  else if(hitT){closePaper(P,p,p.tgt,'Target');ch=true}
  else if(now>='15:15'){closePaper(P,p,l,'3:15 ka time');ch=true}
 });
 if(ch)ppSave(P);
 if($('tGame')&&$('tGame').classList.contains('on'))renderGame();
}
async function liveFor(){
 var P=pp(),tk=P.pos.map(function(p){return p.token});if(!tk.length)return;
 try{var f=await X.quote(tk.slice(0,50));f.forEach(function(q){LT[String(q.symbolToken)]=+q.ltp});}catch(e){}
 tick();
}
var TITLES=['Naya khiladi','Seekhta trader','Samajhdaar trader','Pro trader','Master','Guru'];
function lvl(xp){var l=1+Math.floor(Math.sqrt(xp/25));return {l:l,t:TITLES[Math.min(TITLES.length-1,l-1)],next:25*l*l,cur:25*(l-1)*(l-1)}}
function streaks(h){var s=0,mx=0,cur=0;h.forEach(function(x){if(x.pnl>0){cur++;mx=Math.max(mx,cur)}else cur=0});for(var i=h.length-1;i>=0&&h[i].pnl>0;i--)s++;return {now:s,max:mx}}
function badges(h){
 var st=streaks(h),days={};h.forEach(function(x){var d=days[x.date]=days[x.date]||{n:0,p:0};d.n++;d.p+=x.pnl});
 var disc=Object.keys(days).some(function(k){return days[k].n<=2&&days[k].p>0});
 return [['Pehla trade',h.length>=1],['3 jeet lagatar',st.max>=3],['10 trade poore',h.length>=10],['Target ka sabr (3 baar)',h.filter(function(x){return x.reason==='Target'}).length>=3],['Anushasan: din me 2 trade, plus',disc],['Scanner ke signal par 5 trade',h.filter(function(x){return x.from==='signal'}).length>=5]];
}
function curve(cv,h,start){
 var dpr=window.devicePixelRatio||1,W=cv.clientWidth||340,H=cv.clientHeight||110;cv.width=W*dpr;cv.height=H*dpr;var g=cv.getContext('2d');g.setTransform(dpr,0,0,dpr,0,0);
 g.fillStyle='#0f1215';g.fillRect(0,0,W,H);
 var pts=[start],c=start;h.forEach(function(x){c+=x.pnl;pts.push(c)});
 if(pts.length<2){g.fillStyle='#9aa7b0';g.font='12px sans-serif';g.fillText('Trade hone par curve dikhegi',10,20);return}
 var lo=Math.min.apply(null,pts),hi=Math.max.apply(null,pts),rg=(hi-lo)||1;
 g.strokeStyle=c>=start?'#3ddc84':'#ff5252';g.lineWidth=2;g.beginPath();
 pts.forEach(function(v,i){var x=8+(W-16)*i/(pts.length-1),y=H-8-(H-16)*(v-lo)/rg;if(i===0)g.moveTo(x,y);else g.lineTo(x,y)});g.stroke();
 g.strokeStyle='#2c343c';g.setLineDash([3,3]);var y0=H-8-(H-16)*(start-lo)/rg;g.beginPath();g.moveTo(8,y0);g.lineTo(W-8,y0);g.stroke();g.setLineDash([]);
}
function inr(x){return (x<0?'-':'')+'₹'+Math.abs(Math.round(x)).toLocaleString('en-IN')}
function renderGame(){
 var el=$('tGame');if(!el)return;
 var P=pp(),eq=equity(P),tot=eq-P.start,L=lvl(P.xp),td=X.ymd(X.istNow());
 var todayP=0;P.hist.forEach(function(h){if(h.date===td)todayP+=h.pnl});
 var wins=P.hist.filter(function(h){return h.pnl>0}).length,wr=P.hist.length?wins/P.hist.length*100:0,sk=streaks(P.hist);
 var h='<div class="card"><div class="row"><div><div class="mu">Khate ki keemat</div><div style="font-size:22px;font-weight:800">'+inr(eq)+'</div></div><div><div class="mu">Kul faayda/nuksan</div><div style="font-size:22px;font-weight:800" class="'+(tot>=0?'g':'r')+'">'+inr(tot)+'</div></div></div>'+
 '<div class="row" style="margin-top:8px"><div class="mu">Aaj: <b class="'+(todayP>=0?'g':'r')+'">'+inr(todayP)+'</b></div><div class="mu">Win rate: <b>'+f2(wr)+'%</b> ('+P.hist.length+' trade)</div><div class="mu">Lagatar jeet: <b>'+sk.now+'</b></div></div>'+
 '<div style="margin-top:10px"><b>Level '+L.l+': '+L.t+'</b> <span class="mu">'+P.xp+' XP</span><div class="xs" style="margin-top:4px"><i style="width:'+Math.min(100,(P.xp-L.cur)/(L.next-L.cur)*100)+'%;background:var(--sf)"></i></div></div>'+
 '<canvas id="xcurve" style="width:100%;height:110px;margin-top:10px;border-radius:10px"></canvas>'+
 '<div style="margin-top:6px">'+badges(P.hist).map(function(b){return '<span class="bdg'+(b[1]?' on':'')+'">'+(b[1]?'🏅 ':'🔒 ')+esc(b[0])+'</span>'}).join('')+'</div></div>';
 h+='<div class="card"><b>Khule paper trade</b> <button class="s xb" id="xgl">Live bhav lao</button>';
 if(!P.pos.length)h+='<div class="mu">Koi nahi. Signal ke card ya stock ke page par "Paper trade" dabao.</div>';
 P.pos.forEach(function(p){
  var l=ltpOf(p.token),pn=l?calcPnl(p,l):0,span=Math.abs(p.tgt-p.sl)||1,pos=l?Math.max(0,Math.min(1,(l-Math.min(p.sl,p.tgt))/span)):0.5;
  h+='<div class="box '+(p.dir>0?'buy':'sell')+'"><b>'+(p.dir>0?'BUY ':'SELL ')+esc(p.sym)+'</b> x'+p.qty+' <span class="'+(pn>=0?'g':'r')+'" style="float:right;font-weight:700">'+inr(pn)+'</span><div class="mu">Entry '+f2(p.entry)+'  SL '+f2(p.sl)+'  Target '+f2(p.tgt)+'  Abhi '+(l?f2(l):'-')+'</div><div class="xs" style="margin:6px 0"><i style="left:'+(pos*100)+'%;width:6px;background:var(--sf)"></i></div><button class="s xb" data-cl="'+p.id+'">Abhi band karo</button></div>';
 });
 h+='</div><div class="card"><b>Purane trade</b>';
 if(!P.hist.length)h+='<div class="mu">Abhi koi nahi.</div>';
 P.hist.slice().reverse().slice(0,25).forEach(function(x){h+='<div class="xr"><div class="n"><b>'+(x.dir>0?'BUY ':'SELL ')+esc(x.sym)+'</b><div class="mu">'+x.date+'  '+esc(x.reason)+'</div></div><div style="flex:1" class="mu">'+f2(x.entry)+' → '+f2(x.exit)+'</div><div class="'+(x.pnl>=0?'g':'r')+'" style="text-align:right">'+inr(x.pnl)+'<div class="mu">'+(x.r>=0?'+':'')+f2(x.r)+'R</div></div></div>'});
 h+='<button class="s" id="xrs" style="margin-top:8px">Khel naye sire se shuru (reset)</button><div class="mu">Ye sirf nakli paise ka khel hai (₹1,00,000 se shuru). Kharcha Settings wale % se kata jata hai.</div></div>';
 el.innerHTML=h;curve($('xcurve'),P.hist,P.start);
 $('xgl').onclick=liveFor;
 $('xrs').onclick=function(){if(confirm('Sab paper trade aur XP mita dein?')){sv('sig_paper',null);renderGame()}};
 Array.prototype.forEach.call(el.querySelectorAll('[data-cl]'),function(b){b.onclick=function(){var P2=pp(),p=P2.pos.filter(function(q){return q.id===b.getAttribute('data-cl')})[0];if(!p)return;var l=ltpOf(p.token)||p.entry;closePaper(P2,p,l,'Haath se band');ppSave(P2);renderGame()}});
}

/* ---------- hooks into the main page ---------- */
function sigById(id){var T=X.today(),r=null;T.sigs.forEach(function(s){if(s.id===id)r=s});return r}
function decorateSigs(){
 var box=$('sigs');if(!box)return;
 Array.prototype.forEach.call(box.querySelectorAll('.box'),function(b){
  if(b.querySelector('.xb'))return;
  var bt=b.querySelector('[data-take],[data-skip]'),id=bt&&(bt.getAttribute('data-take')||bt.getAttribute('data-skip')),s=id&&sigById(id);if(!s)return;
  var d=mk('div','', '<button class="s xb" data-x="chart">📈 Chart</button><button class="s xb" data-x="news">📰 News</button>'+(s.idx?'':'<button class="xb" data-x="paper">🎮 Paper trade</button>')+'<div class="xn"></div>');
  b.appendChild(d);
  d.querySelector('[data-x=chart]').onclick=function(){openChart(s.sym,s.token,s)};
  d.querySelector('[data-x=news]').onclick=function(){newsAI(s.sym,d.querySelector('.xn'),s.dir)};
  var pb=d.querySelector('[data-x=paper]');if(pb)pb.onclick=function(){if(openPaper({sym:s.sym,token:s.token,dir:s.dir,entry:(M.snap[s.token]&&M.snap[s.token].ltp)||s.entry,sl:s.sl,tgt:s.tgt,qty:s.qty,from:'signal'})){X.tab('tGame');onTab('tGame')}};
 });
}
function decorateDet(){
 var d=$('mDet');if(!d||$('xdb')||!M.sel||!M.snap[M.sel])return;
 var x=M.snap[M.sel],bx=mk('div','', '<button class="s xb" data-x="chart">📈 Chart</button>'+(x.idx?'':'<button class="s xb" data-x="news">📰 News</button><button class="xb" data-x="pb">🎮 Paper BUY</button><button class="xb" data-x="ps">🎮 Paper SELL</button>')+'<div class="xn"></div>');
 bx.id='xdb';d.appendChild(bx);
 bx.querySelector('[data-x=chart]').onclick=function(){openChart(x.n,x.t,null)};
 var nb=bx.querySelector('[data-x=news]');if(nb)nb.onclick=function(){newsAI(x.n,bx.querySelector('.xn'),0)};
 function quick(dir){var sl=x.ltp*(dir>0?0.994:1.006),tg=x.ltp*(dir>0?1.012:0.988);if(openPaper({sym:x.n,token:x.t,dir:dir,entry:x.ltp,sl:sl,tgt:tg,from:'manual'})){X.tab('tGame');onTab('tGame')}}
 var pb=bx.querySelector('[data-x=pb]'),ps=bx.querySelector('[data-x=ps]');if(pb)pb.onclick=function(){quick(1)};if(ps)ps.onclick=function(){quick(-1)};
}
new MutationObserver(function(){decorateSigs()}).observe($('sigs'),{childList:true,subtree:true});
new MutationObserver(function(){decorateDet()}).observe($('mDet'),{childList:true,subtree:true});
var lastT=0;
setInterval(function(){if(M.t&&M.t!==lastT){lastT=M.t;LT={};tick();if($('tMap').classList.contains('on'))renderMap()}},800);
function onTab(id){
 if(id==='tMap')renderMap();
 if(id==='tGame'){renderGame();liveFor()}
 if(id==='tRep'){repOpts();renderRep()}
}

/* ---------- Time Machine (replay) ---------- */
var RP=null,RPT=null,RPSTOP=false;
function repOpts(){
 var sel=$('rpU');if(!sel)return;var n=X.uniResolved().length,cur=sel.value||'wl';
 if(sel.options.length===5){sel.options[4].textContent='Sab ('+n+' stock)';return}
 var o=[['wl','Meri watchlist'],['80','Market list ke pehle 80'],['300','Market list ke pehle 300'],['600','Market list ke pehle 600'],['all','Sab ('+n+' stock)']];
 sel.innerHTML=o.map(function(x){return '<option value="'+x[0]+'">'+x[1]+'</option>'}).join('');sel.value=cur;if(sel.value!==cur)sel.value='wl';
}
function weekdays(n){var d=X.ymd(X.istNow()),out=[];while(out.length<n){d=X.addDays(d,-1);var w=new Date(d+'T12:00:00').getDay();if(w!==0&&w!==6)out.push(d)}return out}
function buildRep(){
 $('tRep').innerHTML='<div class="card"><b>⏳ Time Machine</b><div class="mu">Koi purana din chuno, usse 5-5 minute aage chalao jaise market live ho. Scanner us waqt jo signal deta, wo dikhega. Tum nakli trade lo, din ke ant me tumhara nateeja scanner ke 2 signal se milaya jayega.</div>'+
 '<div class="row"><div><label>Din</label><select id="rpD">'+weekdays(30).map(function(d){return '<option>'+d+'</option>'}).join('')+'</select></div><div><label>Kaun se stock</label><select id="rpU"></select></div></div>'+
 '<button id="rpL">Din load karo</button><button class="s" id="rpX">Roko aur ab tak ke stock se chalao</button><div id="rpSt" class="mu"></div><div class="mu">Zyada stock = zyada samay (pehli baar ~0.5 sec har stock), par ek baar load hone par phone me save rehta hai.</div></div><div id="rpV"></div>';
 $('rpL').onclick=repLoad;$('rpX').onclick=function(){RPSTOP=true};repOpts();
}
async function repLoad(){
 if(!$('rpL'))return;var date=$('rpD').value,u=$('rpU').value,st=$('rpSt');
 var list=u==='wl'?X.resolved():(u==='all'?X.uniResolved():X.uniResolved().slice(0,+u));
 if(list.length<5){st.textContent='Kam se kam 5 stock ke token chahiye (Settings me token dhundo).';return}
 $('rpL').disabled=true;RPSTOP=false;var data={},tok={},meta={},t0=Date.now();
 for(var i=0;i<list.length;i++){
  if(RPSTOP&&Object.keys(data).length>=5)break;
  st.textContent='Data aa raha hai: '+list[i].sym+' ('+(i+1)+'/'+list.length+')'+(i>2?'  ~'+Math.max(1,Math.round((Date.now()-t0)/i*(list.length-i)/60000))+' minute baaki':'');
  try{
   var cs=(await X.getCandles(list[i].token,date,date)).filter(function(c){return c.d===date});
   if(cs.length>=40){
    data[list[i].sym]=cs;tok[list[i].sym]=list[i].token;
    try{var pd=X.byDay(await X.getCandles(list[i].token,X.addDays(date,-20),X.addDays(date,-1)));meta[list[i].sym]={prof:X.volProfile(Object.keys(pd).sort().slice(-10).map(function(d){return pd[d]}))}}catch(e3){}
   }
  }catch(e){st.textContent='Dikkat '+list[i].sym+': '+e.message;await sleep(500)}
 }
 $('rpL').disabled=false;
 if(Object.keys(data).length<5){st.textContent='Is din ka kaafi data nahi mila (chhutti ho sakti hai). Dusra din chuno.';return}
 var ref=Object.keys(data).sort(function(a,b){return data[b].length-data[a].length})[0];
 RP={date:date,data:data,tok:tok,meta:meta,ref:ref,N:data[ref].length,i:3,pos:[],hist:[],sigs:[],emitted:[],sel:'',playing:false,start:100000};
 st.textContent=Object.keys(data).length+' stock ka data aa gaya. Ab chalao.';
 repStepTo(3,true);renderRep();
}
function repBr(i){var s=0,n=0;Object.keys(RP.data).forEach(function(k){var cs=RP.data[k];if(cs[i]){s+=(cs[i].c/cs[0].o-1)*100;n++}});return n?s/n:0}
function repPnl(p,exit){return (exit-p.entry)*p.dir*p.qty-p.entry*p.qty*X.cfg().cost/100}
function repClose(p,exit,reason){RP.pos=RP.pos.filter(function(q){return q.id!==p.id});RP.hist.push({sym:p.sym,dir:p.dir,qty:p.qty,entry:p.entry,exit:exit,pnl:repPnl(p,exit),reason:reason})}
function repOne(k){
 var P=X.cfg();
 RP.pos.slice().forEach(function(p){
  var arr=RP.data[p.sym],c=arr[k];if(k<=p.k)return;if(!c){if(k>=RP.N-1)repClose(p,arr[arr.length-1].c,'Din khatam');return}
  var hs=p.dir>0?c.l<=p.sl:c.h>=p.sl,ht=p.dir>0?c.h>=p.tgt:c.l<=p.tgt;
  if(hs)repClose(p,p.sl,'Stop-loss');else if(ht)repClose(p,p.tgt,'Target');else if(k>=RP.N-1)repClose(p,c.c,'Din khatam');
 });
 var part={};Object.keys(RP.data).forEach(function(s){part[s]=RP.data[s].slice(0,k+1)});
 var nowT=X.addMin(RP.data[RP.ref][Math.min(k,RP.N-1)].t,5),T={date:RP.date,emitted:RP.emitted,sigs:RP.sigs};
 var r=X.scanData(part,nowT,P,T,RP.meta,repBr(k));
 for(var j=0;j<r.sigs.length&&RP.sigs.length<P.maxSig;j++){
  var s=X.makeSignal(r.sigs[j],RP.tok[r.sigs[j].sym],P);s.date=RP.date;RP.sigs.push(s);RP.emitted.push(s.sym);if(!RP.sel)RP.sel=s.sym;
 }
}
function repStepTo(j,init){
 j=Math.min(j,RP.N-1);
 if(init){repOne(RP.i);return}
 for(var k=RP.i+1;k<=j;k++){repOne(k)}
 RP.i=Math.max(RP.i,j);
}
function repSummary(){
 var P=X.cfg(),mine=0;RP.hist.forEach(function(h){mine+=h.pnl});
 var rs=[];RP.sigs.forEach(function(s){var cs=RP.data[s.sym],r=X.simulate(cs,{i:s.i,dir:s.dir,orH:s.orH,orL:s.orL},P);rs.push({s:s,r:r})});
 var algoR=0;rs.forEach(function(x){if(x.r)algoR+=x.r.net});
 var h='<div class="card"><b>Din ka nateeja</b><div>Tumhara: <b class="'+(mine>=0?'g':'r')+'">'+inr(mine)+'</b> ('+RP.hist.length+' trade)</div>';
 h+='<div class="mu">Scanner ke signal (agle candle ke open par entry, 2R target, kharcha ke baad):</div>';
 if(!rs.length)h+='<div class="mu">Scanner ne is din koi signal nahi diya.</div>';
 rs.forEach(function(x){h+='<div class="xr"><div class="n"><b>'+(x.s.dir>0?'BUY ':'SELL ')+esc(x.s.sym)+'</b><div class="mu">'+x.s.t+'</div></div><div style="flex:1" class="'+(x.r&&x.r.net>0?'g':'r')+'">'+(x.r?((x.r.net>=0?'+':'')+f2(x.r.net)+'R ('+(x.r.gross>=2?'target laga':(x.r.gross<=-1?'stop laga':'3:15 par band'))+')'):'trade ban hi nahi sakta (risk size)')+'</div></div>'});
 if(rs.length)h+='<div style="margin-top:6px">Scanner ka kul: <b class="'+(algoR>=0?'g':'r')+'">'+(algoR>=0?'+':'')+f2(algoR)+'R</b></div>';
 return h+'</div>';
}
function renderRep(){
 var v=$('rpV');if(!v)return;
 if(!RP){v.innerHTML='';return}
 var P=X.cfg(),i=RP.i,t=RP.data[RP.ref][i].t,end=i>=RP.N-1,syms=Object.keys(RP.data);
 var mv=syms.map(function(s){var c=RP.data[s][i]||RP.data[s][RP.data[s].length-1],o=RP.data[s][0].o;return {s:s,p:(c.c/o-1)*100,c:c.c}}).sort(function(a,b){return b.p-a.p});
 var h='<div class="card"><div class="row"><div><b style="font-size:18px">'+RP.date+'  '+X.addMin(t,5)+'</b><div class="mu">Candle '+(i+1)+'/'+RP.N+', market ka average '+f2(repBr(i))+'%</div></div></div>'+
 '<input type="range" id="rpS" min="3" max="'+(RP.N-1)+'" value="'+i+'" style="margin-top:8px">'+
 '<button class="s xb" id="rpB">◀ 5 min peeche (dekho)</button><button class="xb" id="rpF">5 min aage ▶</button><button class="xb" id="rpP">'+(RP.playing?'⏸ Ruko':'▶ Chalao')+'</button><button class="s xb" id="rpN">Agle signal tak</button></div>';
 h+='<div class="card"><b>Signal ('+RP.sigs.length+'/'+P.maxSig+')</b>';
 if(!RP.sigs.length)h+='<div class="mu">Abhi tak scanner ne koi signal nahi diya.</div>';
 RP.sigs.forEach(function(s,k){h+='<div class="box '+(s.dir>0?'buy':'sell')+'"><b>'+(s.dir>0?'BUY ':'SELL ')+esc(s.sym)+'</b> <span class="pill po">Score '+f2(s.score)+'</span> <span class="mu">'+s.t+' par</span><div class="mu">Entry '+f2(s.entry)+'  SL '+f2(s.sl)+'  Target '+f2(s.tgt)+'  Qty '+s.qty+'</div><button class="xb" data-rt="'+k+'">Is par nakli trade lo</button><button class="s xb" data-rc="'+s.sym+'">Chart dekho</button></div>'});
 h+='</div><div class="card"><b>Chart</b><select id="rpC">'+syms.map(function(s){return '<option'+(s===RP.sel?' selected':'')+'>'+esc(s)+'</option>'}).join('')+'</select><canvas id="rpcv" style="width:100%;height:320px;background:#0f1215;border-radius:10px;margin-top:8px"></canvas></div>';
 h+='<div class="card"><b>Is waqt ke sabse tez</b><div class="mu">Badhe: '+mv.slice(0,6).map(function(x){return '<a data-rs="'+esc(x.s)+'" style="color:var(--g)">'+esc(x.s)+' '+f2(x.p)+'%</a>'}).join(' • ')+'</div><div class="mu" style="margin-top:4px">Gire: '+mv.slice(-6).reverse().map(function(x){return '<a data-rs="'+esc(x.s)+'" style="color:var(--r)">'+esc(x.s)+' '+f2(x.p)+'%</a>'}).join(' • ')+'</div></div>';
 h+='<div class="card"><b>Tumhare nakli trade</b>';
 var mine=0;RP.hist.forEach(function(x){mine+=x.pnl});
 if(!RP.pos.length&&!RP.hist.length)h+='<div class="mu">Abhi koi nahi.</div>';
 RP.pos.forEach(function(p){var c=RP.data[p.sym][Math.min(i,RP.data[p.sym].length-1)].c,pn=repPnl(p,c);h+='<div class="box"><b>'+(p.dir>0?'BUY ':'SELL ')+esc(p.sym)+'</b> x'+p.qty+' <span class="'+(pn>=0?'g':'r')+'" style="float:right">'+inr(pn)+'</span><div class="mu">Entry '+f2(p.entry)+'  SL '+f2(p.sl)+'  Target '+f2(p.tgt)+'  Abhi '+f2(c)+'</div><button class="s xb" data-rx="'+p.id+'">Abhi band karo</button></div>'});
 RP.hist.forEach(function(x){h+='<div class="xr"><div class="n"><b>'+(x.dir>0?'BUY ':'SELL ')+esc(x.sym)+'</b><div class="mu">'+esc(x.reason)+'</div></div><div style="flex:1" class="mu">'+f2(x.entry)+' → '+f2(x.exit)+'</div><div class="'+(x.pnl>=0?'g':'r')+'">'+inr(x.pnl)+'</div></div>'});
 h+='</div>';
 if(end)h+=repSummary();
 v.innerHTML=h;
 var sel=RP.sel||mv[0].s;RP.sel=sel;
 var cs=RP.data[sel].slice(0,i+1),lv=[];
 RP.sigs.forEach(function(s){if(s.sym===sel)lv=levelsFor(s)});
 RP.pos.forEach(function(p){if(p.sym===sel)lv=[{y:p.entry,t:'Entry',c:'#fff'},{y:p.sl,t:'SL',c:'#ff5252'},{y:p.tgt,t:'Target',c:'#3ddc84'}]});
 var meta=drawChart($('rpcv'),cs,{levels:lv,title:sel+'  '+RP.date});
 $('rpS').oninput=function(){repGo(+this.value)};
 $('rpF').onclick=function(){repGo(RP.i+1)};
 $('rpB').onclick=function(){alert('Time Machine me peeche nahi jaya ja sakta, kyunki trade aage ho chuke hote hain. Naya din load karke dobara khelo.')};
 $('rpP').onclick=repPlay;
 $('rpN').onclick=function(){var n=RP.sigs.length;while(RP.i<RP.N-1&&RP.sigs.length===n&&RP.sigs.length<P.maxSig){RP.i++;repOne(RP.i)}renderRep()};
 $('rpC').onchange=function(){RP.sel=this.value;renderRep()};
 Array.prototype.forEach.call(v.querySelectorAll('[data-rs]'),function(a){a.onclick=function(){RP.sel=a.getAttribute('data-rs');renderRep()}});
 Array.prototype.forEach.call(v.querySelectorAll('[data-rc]'),function(b){b.onclick=function(){RP.sel=b.getAttribute('data-rc');renderRep()}});
 Array.prototype.forEach.call(v.querySelectorAll('[data-rt]'),function(b){b.onclick=function(){
  var s=RP.sigs[+b.getAttribute('data-rt')],c=RP.data[s.sym][RP.i].c;
  if(RP.pos.some(function(q){return q.sym===s.sym})||RP.hist.some(function(q){return q.sym===s.sym})){alert('Is stock me tum pehle trade le chuke ho.');return}
  var risk=RP.start*P.riskPct/100,qty=Math.max(1,Math.floor(risk/Math.abs(c-s.sl)));
  RP.pos.push({id:Date.now()+'-'+s.sym,sym:s.sym,dir:s.dir,qty:qty,entry:c,sl:s.sl,tgt:s.dir>0?c+2*(c-s.sl):c-2*(s.sl-c),k:RP.i});renderRep()}});
 Array.prototype.forEach.call(v.querySelectorAll('[data-rx]'),function(b){b.onclick=function(){var p=RP.pos.filter(function(q){return q.id===b.getAttribute('data-rx')})[0];if(p){repClose(p,RP.data[p.sym][RP.i].c,'Haath se band');renderRep()}}});
}
function repGo(j){if(!RP)return;if(j>RP.i){repStepTo(j)}renderRep()}
function repPlay(){
 if(!RP)return;
 if(RP.playing){RP.playing=false;clearInterval(RPT);renderRep();return}
 RP.playing=true;renderRep();
 RPT=setInterval(function(){if(!RP||RP.i>=RP.N-1){if(RP)RP.playing=false;clearInterval(RPT);renderRep();return}RP.i++;repOne(RP.i);renderRep()},900);
}

/* ---------- accuracy lab (backtest ke baad) ---------- */
function tableHtml(title,rows){
 var h='<div class="box"><b>'+title+'</b><table style="width:100%;border-collapse:collapse;margin-top:6px;font-size:13px"><tr class="mu"><td>Hissa</td><td>Trade</td><td>Win%</td><td>Avg R</td></tr>';
 rows.forEach(function(r){var avg=r.n?r.s/r.n:0,ok=r.n>=30&&avg>=0.1;h+='<tr style="border-top:1px solid var(--line)"><td>'+r.l+'</td><td>'+r.n+'</td><td>'+(r.n?f2(r.w/r.n*100)+'%':'-')+'</td><td class="'+(avg>0?'g':'r')+'">'+(r.n?((avg>=0?'+':'')+f2(avg)):'-')+(ok?' ✓':'')+'</td></tr>'});
 return h+'</table></div>';
}
function bucketize(pr,spec,val){
 var rows=spec.map(function(s){return {l:s[2],lo:s[0],hi:s[1],n:0,w:0,s:0}});
 pr.ds.forEach(function(d){pr.cands[d].forEach(function(c){var v=val(c);rows.forEach(function(r){if(v>=r.lo&&v<r.hi){r.n++;r.s+=c.sim.net;if(c.sim.net>0)r.w++}})})});
 return rows;
}
function tmv(t){return (+t.slice(0,2))*60+(+t.slice(3))}
function renderBuckets(){
 var pr=X.lastPr,out=$('btOut');
 if(!pr||!out||$('xbk')||!out.querySelector('.pill'))return;
 var h='<div id="xbk"><div class="mu" style="margin:8px 0"><b>Accuracy lab:</b> asli data par kaun si setting kitni sahi rahi. "Win%" = kharche ke baad plus trade. "Avg R" = har trade ka average. ✓ = 30+ trade aur avg +0.1R se zyada. 30 se kam trade wali row par bharosa mat karo.</div>';
 h+=tableHtml('Score ke hisaab se',bucketize(pr,[[0,4,'4 se kam'],[4,5,'4-5'],[5,6,'5-6'],[6,7,'6-7'],[7,11,'7 se zyada']],function(c){return c.tr.score}));
 h+=tableHtml('Volume (x) ke hisaab se',bucketize(pr,[[0,1,'1x se kam'],[1,1.5,'1-1.5x'],[1.5,2,'1.5-2x'],[2,99,'2x se zyada']],function(c){return c.tr.vr}));
 h+=tableHtml('Breakout ke samay ke hisaab se',bucketize(pr,[[555,600,'9:15-10:00'],[600,630,'10:00-10:30'],[630,660,'10:30-11:00']],function(c){return tmv(c.tr.t)}));
 h+=tableHtml('Disha ke hisaab se',bucketize(pr,[[1,2,'BUY (upar)'],[-2,0,'SELL (neeche)']],function(c){return c.tr.dir}));
 h+='<div class="mu">Kaise use karo: jis score ya volume wali row me avg R sabse achha aur trade zyada hon, Settings me "kam se kam score/volume" wahi rakho. Accuracy badhegi to signal ki ginti kam hogi, ye lena-dena hai.</div></div>';
 out.insertAdjacentHTML('beforeend',h);
}
new MutationObserver(function(){renderBuckets()}).observe($('btOut'),{childList:true});


/* ---------- notification, awaaz, screen on ---------- */
var NF={seen:{},date:'',WL:null,init:false};
async function notify(title,body,tag){
 var ok=false;
 try{
  if('Notification' in window&&Notification.permission==='granted'){
   var reg=navigator.serviceWorker&&await navigator.serviceWorker.getRegistration();
   if(reg&&reg.showNotification){await reg.showNotification(title,{body:body,tag:tag,vibrate:[300,150,300],requireInteraction:true});ok=true}
   else{new Notification(title,{body:body,tag:tag});ok=true}
  }
 }catch(er){}
 var topic=(ld('sig_ntfy','')||'').trim();
 if(topic){try{await fetch('https://ntfy.sh/'+encodeURIComponent(topic),{method:'POST',body:body,headers:{'Title':title,'Priority':'high','Tags':'chart_with_upwards_trend'}});ok=true}catch(er2){}}
 return ok;
}
function sigMsg(s){return {t:'Signal: '+(s.dir>0?'BUY ':'SELL ')+s.sym,b:'Entry '+f2(s.entry)+'  SL '+f2(s.sl)+'  Target '+f2(s.tgt)+(s.idx?'':'  Qty '+s.qty)+'  Score '+f2(s.score)}}
function buildNotif(){
 var c=mk('div','card','<b>🔔 Notification</b><div class="mu">Signal milte hi notification, awaaz aur vibration. Scan chalte waqt screen on rakhi jati hai (warna phone browser ko rok deta hai aur scan ruk jata hai).</div>'+
 '<button id="nfOn">Notification chalu karo</button><button class="s" id="nfTest">Test notification</button><div id="nfSt" class="mu"></div>'+
 '<label>ntfy topic (optional)</label><input id="nfTopic" placeholder="jaise: sig-8f3k29xq (lamba, random rakho)"><button class="s" id="nfSave">ntfy save + test</button>'+
 '<div class="mu">ntfy: phone par ntfy app lagao aur yahi topic subscribe karo. Tab notification doosre app ke upar bhi aati hai. Topic sabke liye khula hota hai, isliye random naam rakho. Isme sirf stock ka naam aur levels jate hain.</div>');
 $('tSig').appendChild(c);
 $('nfTopic').value=ld('sig_ntfy','');
 function stat(){var p=('Notification' in window)?Notification.permission:'nahi hai';$('nfSt').textContent='Notification ki ijazat: '+p+(NF.WL?'  |  Screen on: haan':'')}
 $('nfOn').onclick=async function(){
  try{if('serviceWorker' in navigator)await navigator.serviceWorker.register('sw.js')}catch(er){$('nfSt').textContent='sw.js nahi mili (file repo me daali?)'}
  try{await Notification.requestPermission()}catch(er){}
  stat();
 };
 $('nfTest').onclick=async function(){var ok=await notify('Test: Market Scanner','Notification theek chal rahi hai','test');$('nfSt').textContent=ok?'Test bhej diya. Notification aayi?':'Nahi gayi. Pehle "Notification chalu karo" dabao (aur browser me ijazat do).';};
 $('nfSave').onclick=async function(){sv('sig_ntfy',$('nfTopic').value.trim());var ok=await notify('Test: ntfy','ntfy se notification theek chal rahi hai','test2');$('nfSt').textContent=ok?'Bhej diya.':'Nahi gayi.'};
 stat();
 try{if('serviceWorker' in navigator&&'Notification' in window&&Notification.permission==='granted')navigator.serviceWorker.register('sw.js').catch(function(){})}catch(er){}
}
function watchSignals(){
 var T=X.today();
 if(NF.date!==T.date){NF.date=T.date;if(!NF.init)NF.seen={}}
 if(!NF.init){T.sigs.forEach(function(s){NF.seen[s.id]=1});NF.init=true;return}
 T.sigs.forEach(function(s){if(NF.seen[s.id])return;NF.seen[s.id]=1;var m=sigMsg(s);notify(m.t,m.b,s.id)});
}
function watchWake(){
 try{
  if(X.S.run&&!NF.WL&&navigator.wakeLock){navigator.wakeLock.request('screen').then(function(l){NF.WL=l;l.addEventListener('release',function(){NF.WL=null})}).catch(function(){})}
  if(!X.S.run&&NF.WL){NF.WL.release();NF.WL=null}
 }catch(er){}
}
setInterval(function(){watchSignals();watchWake();if($('tRep')&&$('tRep').classList.contains('on'))repOpts()},2500);
document.addEventListener('visibilitychange',function(){if(!document.hidden)watchWake()});

buildMap();buildAI();buildRep();buildNotif();renderGame();
window.XT={notify:notify,tick:tick,openPaper:openPaper,pp:pp,renderMap:renderMap,openChart:openChart,repLoad:repLoad,rp:function(){return RP},repGo:repGo,onTab:onTab,LT:function(){return LT},planAI:planAI,newsAI:newsAI};
})();
