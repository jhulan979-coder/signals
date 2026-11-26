(function(){
'use strict';
var X=window.SIG;
if(!X||!X.tab||!X.getCandles||!X.today||!X.idxResolved)return;
var f2=X.f2,esc=X.esc,ld=X.ld,sv=X.sv,M=X.M;
var $=function(id){return document.getElementById(id)};
function mk(tag,cls,html){var e=document.createElement(tag);if(cls)e.className=cls;if(html!=null)e.innerHTML=html;return e}
function sleep(ms){return new Promise(function(r){setTimeout(r,ms)})}
function mins(t){return (+t.slice(0,2))*60+(+t.slice(3))}
function hh(m){return String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0')}

/* ================= data ================= */
function group(cs){
 var by={};cs.forEach(function(c){(by[c.d]=by[c.d]||[]).push(c)});
 Object.keys(by).forEach(function(d){by[d].sort(function(a,b){return a.t<b.t?-1:1})});
 return by;
}
function agg(cs,tf){
 if(tf<=5)return cs.map(function(c){return {d:c.d,t:c.t,o:c.o,h:c.h,l:c.l,c:c.c,v:c.v}});
 var by=group(cs),out=[],k=tf/5;
 Object.keys(by).sort().forEach(function(d){
  var cur=null,key=-1;
  by[d].forEach(function(c){
   var s=Math.floor((mins(c.t)-555)/5),b=Math.floor(s/k);
   if(b!==key){if(cur)out.push(cur);cur={d:d,t:c.t,o:c.o,h:c.h,l:c.l,c:c.c,v:c.v};key=b}
   else{cur.h=Math.max(cur.h,c.h);cur.l=Math.min(cur.l,c.l);cur.c=c.c;cur.v+=c.v}
  });
  if(cur)out.push(cur);
 });
 return out;
}
async function loadBase(it,days){
 var td=X.ymd(X.istNow()),from=X.addDays(td,-(days*2+5)),cs=await X.getCandles(it.token,from,td),by=group(cs),ds=Object.keys(by).sort().slice(-days),out=[];
 ds.forEach(function(d){out=out.concat(by[d])});
 return out;
}
function ema(vals,n){var k=2/(n+1),o=[],e=null;vals.forEach(function(v,i){e=e==null?v:(v*k+e*(1-k));o.push(i<n-1?null:e)});return o}
function rsi(vals,n){
 var o=[],g=0,l=0;
 for(var i=0;i<vals.length;i++){
  if(i===0){o.push(null);continue}
  var d=vals[i]-vals[i-1],up=d>0?d:0,dn=d<0?-d:0;
  if(i<=n){g+=up;l+=dn;if(i===n){g/=n;l/=n;o.push(l===0?100:100-100/(1+g/l))}else o.push(null)}
  else{g=(g*(n-1)+up)/n;l=(l*(n-1)+dn)/n;o.push(l===0?100:100-100/(1+g/l))}
 }
 return o;
}
function dayLine(cs){ // VWAP (volume ho to) warna din ka average bhav; har din se naya
 var out=[],pv=0,vv=0,tp=0,n=0,cd='';
 cs.forEach(function(c){
  if(c.d!==cd){cd=c.d;pv=0;vv=0;tp=0;n=0}
  var t=(c.h+c.l+c.c)/3;pv+=t*c.v;vv+=c.v;tp+=t;n++;out.push(vv>0?pv/vv:tp/n);
 });
 return out;
}
function swing(cs){
 var H=-1e18,L=1e18,tH=-1,tL=-1;cs.forEach(function(c,i){if(c.h>H){H=c.h;tH=i}if(c.l<L){L=c.l;tL=i}});
 if(tH<0||H<=L)return null;return {H:H,L:L,leg:H-L,down:tL>tH,legPct:(H-L)/cs[cs.length-1].c*100};
}

/* ================= pro chart ================= */
var CH={it:null,tf:5,days:3,base:[],cs:[],start:0,count:80,cross:-1,fl:{fib:true,ema:true,rsi:true,lv:true,sig:true},atEnd:true,busy:false};
var ptrs={},pinch=null,meta=null;
function sigsFor(sym){
 var out=[],T=X.today(),td=X.ymd(X.istNow());
 (T.sigs||[]).forEach(function(s){if(s.sym===sym)out.push({s:s,src:'ORB'})});
 var F=ld('sig_fib_today',null);if(F&&F.date===td)(F.sigs||[]).forEach(function(s){if(s.sym===sym)out.push({s:s,src:'Fib'})});
 return out;
}
function draw(){
 var cv=$('hcv');if(!cv)return;
 var dpr=window.devicePixelRatio||1,W=cv.clientWidth||340,H=cv.clientHeight||440;
 cv.width=W*dpr;cv.height=H*dpr;var g=cv.getContext('2d');g.setTransform(dpr,0,0,dpr,0,0);
 g.fillStyle='#0f1215';g.fillRect(0,0,W,H);
 var cs=CH.cs,n=cs.length;
 if(!n){g.fillStyle='#9aa7b0';g.font='13px sans-serif';g.fillText(CH.busy?'Data aa raha hai...':'Candle data nahi mila',12,24);meta=null;return}
 CH.count=Math.max(12,Math.min(n,Math.round(CH.count)));CH.start=Math.max(0,Math.min(n-CH.count,CH.start));
 var s0=Math.round(CH.start),cnt=CH.count,s1=Math.min(n,s0+cnt),vis=cs.slice(s0,s1);
 var L=4,R=58,T=6,B=20,pw=W-L-R,cw=pw/cnt,plotH=H-T-B;
 var hasVol=cs.some(function(c){return c.v>0}),showRsi=CH.fl.rsi&&n>20;
 var rsiH=showRsi?Math.round(plotH*0.2):0,volH=hasVol?Math.round(plotH*0.13):0,gap=4,mainH=plotH-rsiH-volH-(rsiH?gap:0)-(volH?gap:0);
 var yMain0=T,yVol0=T+mainH+(volH?gap:0),yRsi0=yVol0+volH+(rsiH?gap:0);
 function Xp(i){return L+(i-s0)*cw+cw/2}
 // indicators
 var closes=cs.map(function(c){return c.c}),e9=ema(closes,9),e21=ema(closes,21),dl=dayLine(cs),rs=rsi(closes,14);
 var td=cs[n-1].d,iToday=0;for(var q=0;q<n;q++){if(cs[q].d===td){iToday=q;break}}
 var prev=null;for(var q2=iToday-1;q2>=0;q2--){var pd=cs[q2].d;prev={d:pd,H:-1e18,L:1e18};for(var z=q2;z>=0&&cs[z].d===pd;z--){prev.H=Math.max(prev.H,cs[z].h);prev.L=Math.min(prev.L,cs[z].l)}break}
 // overlays for today (from 5m base)
 var baseToday=CH.base.filter(function(c){return c.d===td}),orBox=null,fib=null;
 if(baseToday.length>=3){var oh=-1e18,ol=1e18;for(var a=0;a<3;a++){oh=Math.max(oh,baseToday[a].h);ol=Math.min(ol,baseToday[a].l)}orBox={H:oh,L:ol}}
 if(CH.fl.fib){var sw=swing(baseToday);if(sw&&baseToday.length>=7&&sw.legPct>=0.3){fib=[];[[0,'0','#6b7780'],[0.5,'0.5','#ff9933'],[0.618,'0.618','#9aa7b0'],[0.786,'0.786','#ff9933'],[1,'1','#3ddc84']].forEach(function(k){fib.push({y:sw.down?sw.L+k[0]*sw.leg:sw.H-k[0]*sw.leg,t:'Fib '+k[1],c:k[2]})})}}
 var sg=CH.fl.sig?sigsFor(CH.it.sym):[];
 // price range
 var lo=1e18,hi=-1e18;vis.forEach(function(c){lo=Math.min(lo,c.l);hi=Math.max(hi,c.h)});
 var rg0=hi-lo||1;
 function inc(y){if(y>lo-rg0*0.5&&y<hi+rg0*0.5){lo=Math.min(lo,y);hi=Math.max(hi,y)}}
 if(CH.fl.lv){if(orBox){inc(orBox.H);inc(orBox.L)}if(prev){inc(prev.H);inc(prev.L)}}
 if(fib)fib.forEach(function(l){inc(l.y)});
 sg.forEach(function(x){inc(x.s.entry);inc(x.s.sl);inc(x.s.tgt)});
 var pad=(hi-lo)*0.05||1;lo-=pad;hi+=pad;
 function Y(p){return yMain0+mainH*(1-(p-lo)/(hi-lo))}
 g.font='10px sans-serif';g.textBaseline='middle';
 for(var k=0;k<=4;k++){var p=lo+(hi-lo)*k/4,yy=Y(p);g.strokeStyle='#1c2329';g.lineWidth=1;g.beginPath();g.moveTo(L,yy);g.lineTo(W-R,yy);g.stroke();g.fillStyle='#9aa7b0';g.textAlign='left';g.fillText(f2(p),W-R+4,yy)}
 // day separators + time labels
 g.textBaseline='top';g.textAlign='center';var lastLab=-99;
 for(var i=s0;i<s1;i++){
  var c=cs[i],x=Xp(i);
  if(i>0&&cs[i-1].d!==c.d){g.strokeStyle='#2c343c';g.setLineDash([2,3]);g.beginPath();g.moveTo(x-cw/2,T);g.lineTo(x-cw/2,H-B);g.stroke();g.setLineDash([]);g.fillStyle='#9aa7b0';g.fillText(c.d.slice(8)+'/'+c.d.slice(5,7),x,H-B+4);lastLab=i}
  else if(i-lastLab>=Math.max(6,Math.round(cnt/6))&&(c.t.slice(3)==='00'||c.t.slice(3)==='30'||CH.tf>=15)){g.fillStyle='#9aa7b0';g.fillText(c.t,x,H-B+4);lastLab=i}
 }
 // OR box + prev-day lines + fib (today's x range)
 var xT=Math.max(L,Xp(iToday)-cw/2),xE=W-R;
 if(CH.fl.lv&&orBox&&iToday<s1){
  var nOR=Math.max(1,Math.round(15/CH.tf)),x2=Math.min(xE,Xp(iToday+nOR-1)+cw/2);
  g.fillStyle='rgba(255,153,51,0.10)';g.fillRect(xT,Y(orBox.H),Math.max(0,x2-xT),Y(orBox.L)-Y(orBox.H));
  g.strokeStyle='rgba(255,153,51,0.65)';g.setLineDash([4,4]);[orBox.H,orBox.L].forEach(function(v){g.beginPath();g.moveTo(xT,Y(v));g.lineTo(xE,Y(v));g.stroke()});g.setLineDash([]);
 }
 if(CH.fl.lv&&prev){g.strokeStyle='rgba(154,167,176,0.55)';g.setLineDash([6,4]);[prev.H,prev.L].forEach(function(v,ix){g.beginPath();g.moveTo(L,Y(v));g.lineTo(xE,Y(v));g.stroke();g.fillStyle='#9aa7b0';g.textAlign='left';g.textBaseline='middle';g.fillText((ix?'Kal L ':'Kal H ')+f2(v),L+2,Y(v)-6)});g.setLineDash([])}
 if(fib&&iToday<s1){
  var z618=fib[2].y,z786=fib[3].y;g.fillStyle='rgba(255,153,51,0.10)';g.fillRect(xT,Math.min(Y(z618),Y(z786)),xE-xT,Math.abs(Y(z618)-Y(z786)));
  g.setLineDash([4,3]);fib.forEach(function(l){g.strokeStyle=l.c;g.lineWidth=1;g.beginPath();g.moveTo(xT,Y(l.y));g.lineTo(xE,Y(l.y));g.stroke();g.fillStyle=l.c;g.textAlign='left';g.textBaseline='middle';g.font='bold 9px sans-serif';g.fillText(l.t,xE-44,Y(l.y)-5)});g.setLineDash([]);g.font='10px sans-serif';
 }
 // volume panel
 if(volH){var mv=1;vis.forEach(function(c){mv=Math.max(mv,c.v)});vis.forEach(function(c,k2){var i2=s0+k2,x=Xp(i2);g.fillStyle=c.c>=c.o?'rgba(61,220,132,0.45)':'rgba(255,82,82,0.45)';g.fillRect(x-cw*0.35,yVol0+volH-(c.v/mv)*volH,cw*0.7,(c.v/mv)*volH)})}
 // candles
 vis.forEach(function(c,k2){
  var i2=s0+k2,x=Xp(i2),up=c.c>=c.o,col=up?'#3ddc84':'#ff5252';
  g.strokeStyle=col;g.fillStyle=col;g.lineWidth=1;g.beginPath();g.moveTo(x,Y(c.h));g.lineTo(x,Y(c.l));g.stroke();
  var y1=Y(Math.max(c.o,c.c)),y2=Y(Math.min(c.o,c.c));g.fillRect(x-Math.max(1,cw*0.34),y1,Math.max(2,cw*0.68),Math.max(1,y2-y1));
 });
 function line(arr,col,w){g.strokeStyle=col;g.lineWidth=w;g.beginPath();var st=false;for(var i3=s0;i3<s1;i3++){var v=arr[i3];if(v==null||(i3>0&&cs[i3-1].d!==cs[i3].d&&arr===dl)){st=false;if(v==null)continue}var x=Xp(i3),y=Y(v);if(!st){g.moveTo(x,y);st=true}else g.lineTo(x,y)}g.stroke()}
 line(dl,'#4fc3f7',1.4);
 if(CH.fl.ema){line(e9,'#ffd54f',1.2);line(e21,'#ba68c8',1.2)}
 // signals
 sg.forEach(function(x){
  var s=x.s,idx=-1;for(var i4=iToday;i4<n;i4++){if(mins(cs[i4].t)<=mins(s.t)&&(i4===n-1||mins(cs[i4+1].t)>mins(s.t)||cs[i4+1].d!==td)){idx=i4;break}}
  if(idx<0)return;
  var buy=s.dir>0,xx=Xp(idx),yy=Y(buy?cs[idx].l:cs[idx].h);
  if(idx>=s0&&idx<s1){g.fillStyle=buy?'#3ddc84':'#ff5252';g.beginPath();if(buy){g.moveTo(xx,yy+4);g.lineTo(xx-6,yy+14);g.lineTo(xx+6,yy+14)}else{g.moveTo(xx,yy-4);g.lineTo(xx-6,yy-14);g.lineTo(xx+6,yy-14)}g.closePath();g.fill();g.fillStyle='#fff';g.font='bold 9px sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText((s.idx?(buy?'CALL':'PUT'):(buy?'BUY':'SELL'))+' '+x.src,xx,buy?yy+22:yy-22);g.font='10px sans-serif'}
  [[s.entry,'#ffffff','Entry'],[s.sl,'#ff5252','SL'],[s.tgt,'#3ddc84','Target']].forEach(function(l){var x0=Math.max(L,Math.min(xx,xE));g.strokeStyle=l[1];g.lineWidth=1.2;g.setLineDash([]);g.beginPath();g.moveTo(x0,Y(l[0]));g.lineTo(xE,Y(l[0]));g.stroke();g.fillStyle=l[1];g.textAlign='right';g.textBaseline='middle';g.font='bold 9px sans-serif';g.fillText(l[2]+' '+f2(l[0]),xE-2,Y(l[0])-6);g.font='10px sans-serif'});
 });
 // last price tag
 var last=cs[n-1],ly=Y(last.c);g.strokeStyle=last.c>=last.o?'#3ddc84':'#ff5252';g.setLineDash([2,3]);g.lineWidth=1;g.beginPath();g.moveTo(L,ly);g.lineTo(W-R,ly);g.stroke();g.setLineDash([]);
 g.fillStyle=g.strokeStyle;g.fillRect(W-R,ly-8,R-2,16);g.fillStyle='#101316';g.font='bold 10px sans-serif';g.textAlign='left';g.textBaseline='middle';g.fillText(f2(last.c),W-R+3,ly);g.font='10px sans-serif';
 // RSI panel
 if(rsiH){
  g.fillStyle='#12171b';g.fillRect(L,yRsi0,pw,rsiH);
  function Yr(v){return yRsi0+rsiH*(1-v/100)}
  g.strokeStyle='#2c343c';g.setLineDash([3,3]);[30,70].forEach(function(v){g.beginPath();g.moveTo(L,Yr(v));g.lineTo(W-R,Yr(v));g.stroke();g.fillStyle='#9aa7b0';g.textAlign='left';g.textBaseline='middle';g.fillText(String(v),W-R+4,Yr(v))});g.setLineDash([]);
  g.strokeStyle='#ce93d8';g.lineWidth=1.3;g.beginPath();var st2=false;for(var i5=s0;i5<s1;i5++){var v2=rs[i5];if(v2==null)continue;var x5=Xp(i5);if(!st2){g.moveTo(x5,Yr(v2));st2=true}else g.lineTo(x5,Yr(v2))}g.stroke();
  g.fillStyle='#ce93d8';g.textAlign='left';g.fillText('RSI 14',L+3,yRsi0+8);
 }
 // crosshair
 if(CH.cross>=s0&&CH.cross<s1){var xc=Xp(CH.cross);g.strokeStyle='rgba(255,255,255,0.45)';g.setLineDash([3,3]);g.beginPath();g.moveTo(xc,T);g.lineTo(xc,H-B);g.stroke();g.setLineDash([])}
 meta={L:L,cw:cw,s0:s0,cnt:cnt,pw:pw,e9:e9,e21:e21,rs:rs,dl:dl};
 info();
}
function info(){
 var el=$('hInfo');if(!el)return;var cs=CH.cs;if(!cs.length||!CH.it){el.textContent='';return}
 var i=CH.cross>=0&&CH.cross<cs.length?CH.cross:cs.length-1,c=cs[i],p=i>0&&cs[i-1].d===c.d?cs[i-1].c:null,ch=p?(c.c/p-1)*100:0;
 var ex=meta?[meta.e9[i],meta.e21[i],meta.rs[i]]:[];
 el.innerHTML='<b>'+esc(CH.it.sym)+'</b> '+c.d.slice(5)+' '+c.t+'  O '+f2(c.o)+'  H '+f2(c.h)+'  L '+f2(c.l)+'  C <b class="'+(c.c>=c.o?'g':'r')+'">'+f2(c.c)+'</b>'+(p?' ('+(ch>=0?'+':'')+f2(ch)+'%)':'')+(c.v>0?'  Vol '+Math.round(c.v).toLocaleString('en-IN'):'')+(ex[0]!=null?'  EMA9 '+f2(ex[0]):'')+(ex[1]!=null?'  EMA21 '+f2(ex[1]):'')+(ex[2]!=null?'  RSI '+f2(ex[2]):'');
}
function rebuild(keepEnd){
 CH.cs=agg(CH.base,CH.tf);
 var n=CH.cs.length,perDay=CH.tf===5?75:CH.tf===15?25:13;
 if(keepEnd||CH.atEnd){CH.count=Math.min(n,CH.count);CH.start=n-CH.count}
 if(CH.cross>=n)CH.cross=-1;
 draw();
}
async function load(first){
 if(!CH.it)return;CH.busy=true;if(first){CH.cs=[];draw()}
 try{CH.base=await loadBase(CH.it,CH.days)}catch(e){CH.base=[];$('hInfo').innerHTML='<span class="r">Dikkat: '+esc(e.message)+'</span>'}
 CH.busy=false;
 if(first){var perDay=CH.tf===5?75:CH.tf===15?25:13;CH.count=Math.min(Math.round(perDay*1.15),agg(CH.base,CH.tf).length)||80;CH.atEnd=true}
 rebuild(false);
}
function setIt(it){CH.it=it;CH.cross=-1;Array.prototype.forEach.call(document.querySelectorAll('[data-hi]'),function(b){b.classList.toggle('on',b.getAttribute('data-hi')===it.sym)});load(true)}
function setTf(tf){CH.tf=tf;CH.cross=-1;Array.prototype.forEach.call(document.querySelectorAll('[data-htf]'),function(b){b.classList.toggle('on',+b.getAttribute('data-htf')===tf)});var perDay=tf===5?75:tf===15?25:13;CH.count=Math.min(Math.round(perDay*1.15),agg(CH.base,tf).length)||80;CH.atEnd=true;rebuild(true)}
function setDays(d){CH.days=d;Array.prototype.forEach.call(document.querySelectorAll('[data-hd]'),function(b){b.classList.toggle('on',+b.getAttribute('data-hd')===d)});load(true)}
function zoom(f,cx){
 var n=CH.cs.length;if(!n||!meta)return;
 var cwOld=meta.cw,center=meta.s0+((cx==null?(meta.L+meta.pw/2):cx)-meta.L)/cwOld,frac=((cx==null?(meta.L+meta.pw/2):cx)-meta.L)/meta.pw;
 var nc=Math.max(12,Math.min(n,CH.count/f));CH.count=nc;CH.start=center-frac*nc;CH.atEnd=Math.round(CH.start)>=n-Math.round(nc);draw();
}
function pan(dBars){var n=CH.cs.length;CH.start=Math.max(0,Math.min(n-CH.count,CH.start+dBars));CH.atEnd=Math.round(CH.start)>=n-Math.round(CH.count);draw()}
function bindCanvas(cv){
 cv.style.touchAction='none';
 cv.addEventListener('pointerdown',function(e){try{cv.setPointerCapture(e.pointerId)}catch(x){}ptrs[e.pointerId]={x:e.clientX,y:e.clientY,sx:e.clientX,moved:false};pinch=null});
 cv.addEventListener('pointermove',function(e){
  var p=ptrs[e.pointerId];if(!p||!meta)return;
  var ids=Object.keys(ptrs);
  if(ids.length>=2){
   var a=ptrs[ids[0]],b=ptrs[ids[1]];p.x=e.clientX;p.y=e.clientY;
   var d=Math.hypot(a.x-b.x,a.y-b.y);
   if(pinch&&pinch>0&&d>0){var r=cv.getBoundingClientRect();zoom(d/pinch,(a.x+b.x)/2-r.left)}
   pinch=d;p.moved=true;return;
  }
  var dx=e.clientX-p.x;if(Math.abs(e.clientX-p.sx)>6)p.moved=true;
  if(p.moved){pan(-dx/meta.cw)}
  p.x=e.clientX;p.y=e.clientY;
 });
 function up(e){
  var p=ptrs[e.pointerId];if(!p)return;
  if(!p.moved&&Object.keys(ptrs).length===1&&meta){var r=cv.getBoundingClientRect(),i=Math.floor(meta.s0+(e.clientX-r.left-meta.L)/meta.cw);i=Math.max(0,Math.min(CH.cs.length-1,i));CH.cross=(CH.cross===i)?-1:i;draw()}
  delete ptrs[e.pointerId];pinch=null;
 }
 cv.addEventListener('pointerup',up);cv.addEventListener('pointercancel',function(e){delete ptrs[e.pointerId];pinch=null});
 cv.addEventListener('wheel',function(e){e.preventDefault();var r=cv.getBoundingClientRect();zoom(e.deltaY<0?1.15:1/1.15,e.clientX-r.left)},{passive:false});
}

/* ================= Auto Pilot ================= */
var PL=ld('sig_pilot',{on:false});
function nowD(){return X.istNow()}
function mState(){var n=nowD(),w=n.getDay(),t=X.hm(n);if(w===0||w===6)return 'Chhutti (market band)';if(t<'09:00')return 'Market khulne se pehle';if(t<'09:15')return 'Pre-open';if(t<='15:30')return 'Market khula hai';return 'Market band'}
function orbRunning(){return !!X.S.run}
function fibRunning(){var b=$('flGo');return !!(b&&b.disabled)}
function note(t,b,tag){try{if(window.XT&&XT.notify)XT.notify(t,b,tag)}catch(e){}}
var pilotBusy=false;
async function pilotTick(){
 if(!PL.on||pilotBusy)return;pilotBusy=true;
 try{
  var n=nowD(),t=X.hm(n),w=n.getDay(),td=X.ymd(n);
  if(w===0||w===6)return;
  if(!X.S.jwt){if(t>='09:10'&&t<='15:20'&&PL.warn!==td){PL.warn=td;sv('sig_pilot',PL);note('Login chahiye','Settings me login karo, tabhi scan chalega','login')}return}
  if(t>='09:30'&&t<'15:20'){
   if(!orbRunning()){var b=$('bStart');if(b&&!b.disabled)b.click()}
   if(!fibRunning()&&t>='09:40'&&window.FIB&&FIB.startLive)FIB.startLive();
  }
  if(t>='15:25'&&PL.closed!==td){
   PL.closed=td;sv('sig_pilot',PL);
   var bs=$('bStop');if(bs&&orbRunning())bs.click();var fs=$('flStop');if(fs&&fibRunning())fs.click();
   var be=$('bEval');if(be)be.click();
   if(window.FIB&&FIB.evalHist)await FIB.evalHist();
   note('Aaj ka din poora','Scan band, natija nikaal liya. Home me track record dekho.','close');
  }
 }finally{pilotBusy=false}
}

/* ================= Home ================= */
var sec=mk('div','sec');sec.id='tHome';
var tabsEl=$('tabs'),tb=mk('button','tab','Home');tb.setAttribute('data-tab','tHome');tb.onclick=function(){X.tab('tHome');render()};tabsEl.insertBefore(tb,tabsEl.firstChild);
document.body.insertBefore(sec,$('tMarket'));
sec.innerHTML=
 '<div class="card" id="hStat"></div>'+
 '<div class="card"><b>📈 Pro chart</b><div class="chips" id="hIt" style="margin-top:6px"></div>'+
 '<div class="row" style="margin-top:6px"><div><input id="hSym" placeholder="Kisi bhi stock ka naam (jaise RELIANCE)"></div><div style="flex:0 0 90px"><button id="hGo" style="margin:0;width:100%">Chart</button></div></div>'+
 '<div class="chips" style="margin-top:8px"><button class="chip on" data-htf="5">5m</button><button class="chip" data-htf="15">15m</button><button class="chip" data-htf="30">30m</button><span style="width:8px"></span><button class="chip" data-hd="1">1 din</button><button class="chip on" data-hd="3">3 din</button><button class="chip" data-hd="5">5 din</button></div>'+
 '<div class="chips" style="margin-top:6px"><button class="chip on" data-hf="fib">Fib</button><button class="chip on" data-hf="ema">EMA</button><button class="chip on" data-hf="rsi">RSI</button><button class="chip on" data-hf="lv">Levels</button><button class="chip on" data-hf="sig">Signal</button><button class="chip" id="hZm">−</button><button class="chip" id="hZp">+</button><button class="chip" id="hEnd">Aaj ▶</button></div>'+
 '<div class="mu" id="hInfo" style="margin:8px 0;min-height:34px"></div>'+
 '<canvas id="hcv" style="width:100%;height:470px;background:#0f1215;border-radius:10px"></canvas>'+
 '<div class="mu" style="margin-top:6px">Ungli se sarkao (pan), do ungli se zoom, kisi candle par tap karo to uska bhav. Neeli line = VWAP (index me din ka average), peeli/baingni = EMA 9/21, narangi patti = pehli 15 min ki range, dotted = Fib zone aur kal ke High/Low.</div></div>'+
 '<div class="card"><b>🔔 Aaj ke signal</b><div id="hFeed"></div></div>'+
 '<div class="card"><b>🌡 Market ka mood</b><div id="hMood"></div></div>'+
 '<div class="card"><b>🏆 Track record</b><canvas id="hEq" style="width:100%;height:110px;border-radius:10px;margin-top:6px"></canvas><div id="hRec"></div><button class="s" id="hUp">Natija update karo</button></div>'+
 '<div class="card"><b>🩺 Sab theek hai? (signal kyun nahi aaya ye yahan dikhega)</b><div id="hDiag"></div></div>'+
 '<div class="card"><b>🕘 Din ka plan</b><div class="mu" id="hPlan"></div></div>';
function inr(x){return (x<0?'-':'')+Math.abs(Math.round(x)).toLocaleString('en-IN')}
function stat(){
 var n=nowD(),on=!!PL.on;
 $('hStat').innerHTML='<div class="row"><div><div class="mu">Abhi</div><div style="font-size:24px;font-weight:800">'+X.hm(n)+'</div><div class="mu">'+mState()+'</div></div><div><div class="mu">Login</div><div style="font-size:18px;font-weight:700" class="'+(X.S.jwt?'g':'r')+'">'+(X.S.jwt?'Chalu ✓':'Nahi ✗')+'</div><div class="mu">ORB scan: '+(orbRunning()?'chal raha':'band')+'<br>Fib scan: '+(fibRunning()?'chal raha':'band')+'</div></div></div>'+
 '<button id="hPilot" style="width:100%;font-size:17px;padding:14px;background:'+(on?'#0d5c2e':'var(--sf)')+';color:'+(on?'#fff':'#1a1100')+'">🚀 Auto Pilot: '+(on?'ON (band karne ke liye dabao)':'OFF (chalu karne ke liye dabao)')+'</button>'+
 '<div class="mu">ON rakhne par app 9:30 par khud ORB scan aur 9:40 ke baad Fib scan shuru karta hai, 3:25 par scan band karke natija nikaal deta hai. Login (TOTP) roz tumhe karna hoga. App khula aur screen on rakho.</div>';
 $('hPilot').onclick=function(){PL.on=!PL.on;sv('sig_pilot',PL);stat();pilotTick()};
}
function feed(){
 var T=X.today(),td=X.ymd(X.istNow()),all=[];
 (T.sigs||[]).forEach(function(s){all.push({s:s,src:'ORB'})});
 var F=ld('sig_fib_today',null);if(F&&F.date===td)(F.sigs||[]).forEach(function(s){all.push({s:s,src:'Fib'})});
 all.sort(function(a,b){return a.s.t<b.s.t?-1:1});
 var h='';
 all.forEach(function(x){
  var s=x.s,buy=s.dir>0,lab=s.idx?(buy?'BUY CALL':'BUY PUT'):(buy?'BUY':'SELL');
  h+='<div class="box '+(buy?'buy':'sell')+'"><b style="font-size:17px">'+lab+' '+esc(s.sym)+'</b> <span class="pill po">'+x.src+' | Score '+f2(s.score)+'</span><div class="mu">Trigger '+s.t+'</div><pre>Entry '+f2(s.entry)+'   SL '+f2(s.sl)+'   Target '+f2(s.tgt)+(s.idx?'':'\nQty '+s.qty)+(s.pcr&&s.pcr.now!=null?'\nPCR '+f2(s.pcr.now)+' ('+(s.pcr.state==='ok'?'confirm ✓':s.pcr.state==='opp'?'ulta ✗':'flat')+')':'')+'</pre><button class="s" data-hs="'+esc(s.sym)+'">📈 Chart par dekho</button></div>';
 });
 $('hFeed').innerHTML=h||'<div class="mu">Abhi koi signal nahi. Auto Pilot ON rakho, signal aate hi yahan, alarm aur notification me aayega.</div>';
 Array.prototype.forEach.call($('hFeed').querySelectorAll('[data-hs]'),function(b){b.onclick=function(){var sym=b.getAttribute('data-hs'),it=X.idxResolved().concat(X.uniResolved()).filter(function(q){return q.sym===sym})[0];if(it){setIt(it);window.scrollTo(0,0)}}});
}
function mood(){
 var b=null;try{b=X.breadth()}catch(e){}
 var h='',idx=X.idxResolved();
 idx.forEach(function(it){var x=M.snap[it.token];if(x)h+='<span style="margin-right:12px"><b>'+esc(it.sym)+'</b> '+f2(x.ltp)+' <span class="'+(x.pct>=0?'g':'r')+'">'+(x.pct>=0?'+':'')+f2(x.pct)+'%</span></span> '});
 if(b&&b.n)h+='<div class="mu" style="margin-top:6px">Poora market: <span class="g">'+b.up+' badhe</span>, <span class="r">'+b.dn+' gire</span>, average '+(b.avg>=0?'+':'')+f2(b.avg)+'%</div>';
 var p=null;try{p=window.FIB&&FIB.pcrStore?FIB.pcrStore():null}catch(e){}
 if(p&&p.s){var parts=[];Object.keys(p.s).forEach(function(k){var a=p.s[k];if(a&&a.length)parts.push(k+' '+f2(a[a.length-1][1]))});if(parts.length)h+='<div class="mu" style="margin-top:4px">PCR: '+parts.join(' | ')+'</div>'}
 $('hMood').innerHTML=h||'<div class="mu">Market tab me ek baar refresh karo, tab yahan mood dikhega.</div>';
}
function record(){
 var orb=ld('sig_journal',[]).filter(function(s){return s.res&&!s.res.skip&&s.taken!==false}).map(function(s){return {date:s.date,net:s.res.net,src:'ORB'}});
 var fib=ld('sig_fib_hist',[]).filter(function(s){return s.res&&!s.res.skip&&!s.blocked}).map(function(s){return {date:s.date,net:s.res.net,src:'Fib'}});
 var all=orb.concat(fib).sort(function(a,b){return a.date<b.date?-1:1});
 function line(name,arr){if(!arr.length)return '<div class="mu">'+name+': abhi koi poora signal nahi.</div>';var s=X.stats(arr);return '<div><b>'+name+'</b>: '+s.n+' signal, win '+f2(s.win)+'%, average '+(s.avg>=0?'+':'')+f2(s.avg)+'R, kul '+(s.sum>=0?'+':'')+f2(s.sum)+'R</div>'}
 $('hRec').innerHTML=line('ORB',orb)+line('Fib',fib)+line('Dono milake',all)+'<div class="mu">R = risk ki ikai (1R = jitna stop-loss me jaane ka risk tha). 30 se kam signal par nateeje par bharosa mat karo.</div>';
 var cv=$('hEq'),dpr=window.devicePixelRatio||1,W=cv.clientWidth||340,H=cv.clientHeight||110;cv.width=W*dpr;cv.height=H*dpr;var g=cv.getContext('2d');g.setTransform(dpr,0,0,dpr,0,0);g.fillStyle='#0f1215';g.fillRect(0,0,W,H);
 if(all.length<2){g.fillStyle='#9aa7b0';g.font='12px sans-serif';g.fillText('Kamai ka graph (R me) kam se kam 2 signal ke baad dikhega',10,22);return}
 var pts=[0],c=0;all.forEach(function(x){c+=x.net;pts.push(c)});var lo=Math.min.apply(null,pts),hi=Math.max.apply(null,pts),rg=(hi-lo)||1;
 g.strokeStyle=c>=0?'#3ddc84':'#ff5252';g.lineWidth=2;g.beginPath();pts.forEach(function(v,i){var x=8+(W-16)*i/(pts.length-1),y=H-8-(H-16)*(v-lo)/rg;if(i===0)g.moveTo(x,y);else g.lineTo(x,y)});g.stroke();
 g.strokeStyle='#2c343c';g.setLineDash([3,3]);var y0=H-8-(H-16)*(0-lo)/rg;g.beginPath();g.moveTo(8,y0);g.lineTo(W-8,y0);g.stroke();g.setLineDash([]);
}
function diag(){
 var td=X.ymd(nowD()),rows=[],orr=ld('sig_or',null),orn=orr&&orr.d===td?Object.keys(orr.m||{}).length:0,perm='-';
 try{perm=window.Capacitor&&Capacitor.isNativePlatform&&Capacitor.isNativePlatform()?'App (native)':(window.Notification?Notification.permission:'nahi')}catch(e){}
 function r(ok,t,d){rows.push('<div style="padding:6px 0;border-bottom:1px solid var(--line)"><span class="'+(ok===true?'g':ok===false?'r':'mu')+'">'+(ok===true?'✓':ok===false?'✗':'•')+'</span> <b>'+t+'</b><div class="mu">'+d+'</div></div>')}
 r(!!X.S.jwt,'Login','Aaj ka login '+(X.S.jwt?'chalu hai.':'nahi hai. Settings tab me TOTP daal ke login karo, bina login ke kuch nahi chalega.'));
 r(X.uniResolved().length>=150,'Market list ke token',X.uniResolved().length+' stock, '+X.idxResolved().length+' index. '+(X.uniResolved().length<150?'Settings me "Poora market dhundo" dabao.':''));
 r(PL.on,'Auto Pilot',PL.on?'ON hai.':'OFF hai. Chalu karoge to scan khud shuru hoga.');
 r(orbRunning(),'ORB scan',orbRunning()?'Chal raha hai. '+($('liveSt')?$('liveSt').textContent.slice(0,150):''):'Band hai. Signal tab me "Scan shuru" ya Auto Pilot ON.');
 r(fibRunning(),'Fib scan',fibRunning()?'Chal raha hai. '+($('flSt')?$('flSt').textContent.slice(0,150):''):'Band hai. Fib tab me "Fib scan shuru" ya Auto Pilot ON.');
 r(orn>=30?true:(orbRunning()?false:null),'ORB ki opening range ('+orn+' stock)',orn>=30?'Aaj ki range save hai.':'9:30 par save hoti hai. Der se shuru karne par scan 5-6 minute lagake candle se nikalta hai.');
 r(perm==='granted'||perm.indexOf('App')===0,'Notification','Ijazat: '+perm+'. Signal tab me "Notification chalu karo" dabao.');
 r(null,'Screen aur app','Scan tabhi chalta hai jab app khula ho. Phone charging par rakho.');
 $('hDiag').innerHTML=rows.join('');
}
function plan(){
 var t=X.hm(nowD()),steps=[['09:15','Market khulta hai'],['09:30','Opening range save (ORB ke liye)'],['09:35','ORB scan shuru'],['09:45','Fib scan: swing banne ke baad'],['10:55','ORB signal ka samay khatam'],['12:30','Fib signal ka samay khatam'],['15:20','Scan band'],['15:25','Natija apne aap nikalta hai (Auto Pilot ON ho to)']];
 $('hPlan').innerHTML=steps.map(function(s){return '<div style="padding:3px 0;'+(t>=s[0]?'opacity:.55':'font-weight:700;color:var(--tx)')+'">'+(t>=s[0]?'✓ ':'• ')+s[0]+'  '+s[1]+'</div>'}).join('');
}
function render(){
 if(!$('tHome')||!$('tHome').classList.contains('on'))return;
 stat();feed();mood();record();diag();plan();
}
/* ===== wiring ===== */
function buildChips(){
 var h='';X.idxResolved().forEach(function(it){h+='<button class="chip" data-hi="'+esc(it.sym)+'">'+esc(it.sym)+'</button>'});
 $('hIt').innerHTML=h||'<span class="mu">Settings me index ke token dhundo.</span>';
 Array.prototype.forEach.call($('hIt').querySelectorAll('[data-hi]'),function(b){b.onclick=function(){var it=X.idxResolved().filter(function(q){return q.sym===b.getAttribute('data-hi')})[0];if(it)setIt(it)}});
}
Array.prototype.forEach.call(sec.querySelectorAll('[data-htf]'),function(b){b.onclick=function(){setTf(+b.getAttribute('data-htf'))}});
Array.prototype.forEach.call(sec.querySelectorAll('[data-hd]'),function(b){b.onclick=function(){setDays(+b.getAttribute('data-hd'))}});
Array.prototype.forEach.call(sec.querySelectorAll('[data-hf]'),function(b){b.onclick=function(){var k=b.getAttribute('data-hf');CH.fl[k]=!CH.fl[k];b.classList.toggle('on',CH.fl[k]);draw()}});
$('hZm').onclick=function(){zoom(1/1.4)};$('hZp').onclick=function(){zoom(1.4)};$('hEnd').onclick=function(){CH.atEnd=true;CH.cross=-1;CH.start=CH.cs.length-CH.count;draw()};
$('hGo').onclick=function(){var n=$('hSym').value.trim().toUpperCase(),it=X.idxResolved().concat(X.uniResolved()).filter(function(q){return q.sym.toUpperCase()===n})[0];if(!it){alert(n+' ka token nahi mila (Settings me token dhundo).');return}setIt(it)};
$('hUp').onclick=async function(){var be=$('bEval');if(be)be.click();if(window.FIB&&FIB.evalHist)await FIB.evalHist();record()};
bindCanvas($('hcv'));
buildChips();
var first=X.idxResolved().filter(function(q){return q.sym==='Nifty 50'})[0]||X.idxResolved()[0];
if(first)setIt(first);
window.addEventListener('resize',function(){draw()});
setInterval(function(){
 if($('tHome').classList.contains('on')){render();if(CH.it&&mState()==='Market khula hai'&&!CH.busy&&(Date.now()-(CH.last||0)>45000)){CH.last=Date.now();load(false)}}
 pilotTick();
},3000);
X.tab('tHome');render();
window.HOME={draw:draw,setIt:setIt,setTf:setTf,setDays:setDays,zoom:zoom,pan:pan,CH:CH,pilotTick:pilotTick,PL:function(){return PL},render:render};
})();
