(function(){
'use strict';
var X=window.SIG;
if(!X||!X.getCandles||!X.simulate||!X.volProfile||!X.walkForward||!X.tab)return;
var M=X.M,f2=X.f2,esc=X.esc,ld=X.ld,sv=X.sv;
var $=function(id){return document.getElementById(id)};
function mk(tag,cls,html){var e=document.createElement(tag);if(cls)e.className=cls;if(html!=null)e.innerHTML=html;return e}
function sleep(ms){return new Promise(function(r){setTimeout(r,ms)})}

/* ---------- settings ---------- */
var DEF={pcrMode:'narm',only:'idx',lo:0.618,hi:0.786,minLeg:0.6,maxLeg:3,last:'12:30',minScore:4,minVol:1,maxSig:2,maxRisk:1.5};
function cfg(){var c=ld('sig_fib',{}),o={};for(var k in DEF)o[k]=(c[k]!=null?c[k]:DEF[k]);return o}

/* ---------- core: Fibonacci swing + rejection ---------- */
function slot(t){var a=t.split(':');return Math.round((+a[0]*60+ +a[1]-555)/5)}
function vws(cs){var pv=0,vv=0,tp=0;return cs.map(function(c,i){var t=(c.h+c.l+c.c)/3;pv+=t*c.v;vv+=c.v;tp+=t;return vv>0?pv/vv:tp/(i+1)})}
function swingOf(cs){
 var H=-1e18,L=1e18,tH=-1,tL=-1;
 cs.forEach(function(c,i){if(c.h>H){H=c.h;tH=i}if(c.l<L){L=c.l;tL=i}});
 if(tH<0||H<=L)return null;
 var leg=H-L;return {H:H,L:L,tH:tH,tL:tL,leg:leg,legPct:leg/cs[cs.length-1].c*100,down:tL>tH};
}
function fibGrid(cs,F){
 var sw=swingOf(cs);if(!sw||cs.length<7||sw.legPct<F.minLeg)return [];
 var ks=[[0,'0','#6b7780'],[0.5,'0.5','#ff9933'],[0.618,'0.618','#9aa7b0'],[0.786,'0.786','#ff9933'],[1,'1','#3ddc84']];
 return ks.map(function(k){return {y:sw.down?sw.L+k[0]*sw.leg:sw.H-k[0]*sw.leg,t:'Fib '+k[1],c:k[2],dash:1}});
}
/* Swing = ab tak (is candle se pehle) ka din ka high-low. Gira hua swing (high pehle, low baad me) ->
   upar ke bounce me 0.618-0.786 zone me wick + neeche band + laal candle = SELL. Mirror = BUY.
   Stop = swing ka doosra kinara. Koi lookahead nahi: decision sirf pichle candle tak ke swing se. */
function detectFib(cs,F,breadth,prof,isIdx){
 var vw=vws(cs),H=-1e18,L=1e18,tH=-1,tL=-1,cumV=0;
 for(var i=0;i<cs.length;i++){
  var c=cs[i];
  if(c.t>F.last)break;
  if(i>=6&&H>L&&Math.abs(tH-tL)>=4){
   var leg=H-L,legPct=leg/c.c*100;
   if(legPct>=F.minLeg&&legPct<=F.maxLeg){
    var down=tL>tH,zLo,zHi,touched,rej;
    if(down){zLo=L+F.lo*leg;zHi=L+F.hi*leg;touched=c.h>=zLo&&c.h<=H;rej=c.c<zLo&&c.c<c.o}
    else{zHi=H-F.lo*leg;zLo=H-F.hi*leg;touched=c.l<=zHi&&c.l>=L;rej=c.c>zHi&&c.c>c.o}
    if(touched&&rej){
     var br=breadth?breadth(c.t):0,okV=isIdx?(down?c.c<cs[0].o:c.c>cs[0].o):(down?c.c<vw[i]:c.c>vw[i]),okB=isIdx?true:(down?br<0:br>0);
     if(okV&&okB){
      var rc=c.h-c.l,wick=down?(c.h-Math.max(c.o,c.c)):(Math.min(c.o,c.c)-c.l),wr=rc>0?wick/rc:0;
      var avgV=i>0?cumV/i:0,pv=prof?prof[slot(c.t)]:0,vr=pv>0?c.v/pv:(avgV>0?c.v/avgV:1);
      var reach=down?(c.h-L)/leg:(H-c.l)/leg;
      var s1=isIdx?1:Math.min(vr,3)/3*2,s2=Math.min(wr/0.5,1)*2,s3=isIdx?1:Math.min(Math.abs(br)/0.5,1)*2,s4=(reach>=F.lo&&reach<=Math.min(F.hi+0.1,1))?1:0.5,s5=Math.min(legPct/1.0,1)*2,s6=c.t<='11:30'?1:0;
      if(isIdx)vr=99;
      return {strat:'fib',idx:!!isIdx,i:i,t:c.t,dir:down?-1:1,close:c.c,sl:down?H:L,orH:H,orL:L,vr:vr,body:wr,br:br,rng:legPct,okV:okV,okB:okB,okR:true,vw:vw[i],score:s1+s2+s3+s4+s5+s6,fib:{H:H,L:L,down:down,reach:reach},
       reasons:['Fibonacci: '+(down?'gire hue swing me upar ka bounce':'badhe hue swing me neeche ka pullback')+' '+f2(reach*100)+'% tak gaya','Rejection wick '+Math.round(wr*100)+'%',(isIdx?'Index (volume/breadth filter lagu nahi)':'Volume '+f2(vr)+'x (usi samay ke normal se)'),(isIdx?'Index din ke open ke '+(down?'neeche':'upar')+' hai':'Market '+(br>0?'upar ':'neeche ')+f2(br)+'%'),'Swing '+f2(legPct)+'%']};
     }
    }
   }
  }
  cumV+=c.v;
  if(c.h>H){H=c.h;tH=i}
  if(c.l<L){L=c.l;tL=i}
 }
 return null;
}
function idxList(){return X.idxResolved().filter(function(x){return x.sym!=='India VIX'})}
function fIdx(F){return Object.assign({},F,{minLeg:Math.min(F.minLeg,0.3)})}
function simP(F){return Object.assign({},X.cfg(),{maxRisk:F.only==='idx'?Math.min(F.maxRisk,1.0):F.maxRisk,minRisk:0.1,maxSig:F.maxSig,minScore:F.minScore,minVol:F.minVol})}

/* ---------- backtest (ek ek stock padhta hai, yaad nahi rakhta) ---------- */
async function buildFib(list,from,to,F,prog,stopRef){
 var BR={},loaded=[],t0=Date.now(),fromX=X.addDays(from,-20),i,P=simP(F);
 for(i=0;i<list.length;i++){
  if(stopRef.stop)break;
  prog('Data le raha hoon: '+list[i].sym+' ('+(i+1)+'/'+list.length+')'+(i>2?'  ~'+Math.max(1,Math.round((Date.now()-t0)/i*(list.length-i)/60000))+' minute baaki':''));
  try{
   var days=X.byDay(await X.getCandles(list[i].token,fromX,to));
   if(!list[i].idx)Object.keys(days).forEach(function(d){if(d<from)return;var cs=days[d],o=cs[0].o,bd=BR[d]=BR[d]||{};cs.forEach(function(c){var x=bd[c.t]=bd[c.t]||{s:0,n:0};x.s+=(c.c/o-1)*100;x.n++})});
   loaded.push(list[i]);
  }catch(e){stopRef.err=e.message;await sleep(300)}
 }
 if(loaded.length<(F.only==='idx'?1:5))throw new Error('Kaafi data nahi mila.'+(stopRef.err?' Aakhri error: '+stopRef.err:''));
 var K={n:0,ok:0,s:0},cands={},dset={};
 function brFn(d){var bd=BR[d]||{};return function(t){var x=bd[t];return x&&x.n>=3?x.s/x.n:0}}
 for(var j=0;j<loaded.length;j++){
  var dd=X.byDay(await X.getCandles(loaded[j].token,fromX,to)),dl=Object.keys(dd).sort(),hist=[];
  dl.forEach(function(d){
   var cs=dd[d],prof=X.volProfile(hist.slice(-10));hist.push(cs);
   if(d<from)return;
   dset[d]=1;if(!prof)return;
   var isI=!!loaded[j].idx,tr=detectFib(cs,isI?fIdx(F):F,brFn(d),prof,isI);if(!tr)return;
   K.n++;
   var sim=X.simulate(cs,tr,P);if(!sim){K.s++;return}
   K.ok++;delete tr.reasons;(cands[d]=cands[d]||[]).push({sym:loaded[j].sym,tr:tr,sim:sim});
  });
  if(j%20===0){prog('Hisaab ho raha hai ('+(j+1)+'/'+loaded.length+')...');await sleep(0)}
 }
 var ds=Object.keys(dset).sort();ds.forEach(function(d){if(!cands[d])cands[d]=[]});
 return {pr:{ds:ds,cands:cands,K:K},loaded:loaded,P:P};
}
function tbl(title,rows){
 var h='<div class="box"><b>'+title+'</b><table style="width:100%;border-collapse:collapse;margin-top:6px;font-size:13px"><tr class="mu"><td>Hissa</td><td>Trade</td><td>Win%</td><td>Avg R</td></tr>';
 rows.forEach(function(r){var a=r.n?r.s/r.n:0,ok=r.n>=30&&a>=0.1;h+='<tr style="border-top:1px solid var(--line)"><td>'+r.l+'</td><td>'+r.n+'</td><td>'+(r.n?f2(r.w/r.n*100)+'%':'-')+'</td><td class="'+(a>0?'g':'r')+'">'+(r.n?((a>=0?'+':'')+f2(a)):'-')+(ok?' ✓':'')+'</td></tr>'});
 return h+'</table></div>';
}
function buck(pr,spec,val){
 var rows=spec.map(function(s){return {l:s[2],lo:s[0],hi:s[1],n:0,w:0,s:0}});
 pr.ds.forEach(function(d){pr.cands[d].forEach(function(c){var v=val(c);rows.forEach(function(r){if(v>=r.lo&&v<r.hi){r.n++;r.s+=c.sim.net;if(c.sim.net>0)r.w++}})})});
 return rows;
}
function mins(t){return (+t.slice(0,2))*60+(+t.slice(3))}
var BTSTOP={stop:false,err:''},BUSY=false;
async function runBt(){
 if(BUSY)return;
 var st=$('fbSt'),out=$('fbOut'),F=cfg();out.innerHTML='';
 if(!X.S.jwt){st.textContent='Pehle login karo (Settings tab).';return}
 var u=$('fbU').value,list;
 if(F.only==='idx')list=idxList();
 else list=(u==='wl'?X.resolved():(u==='all'?X.uniResolved():X.uniResolved().slice(0,+u))).concat(idxList());
 if(list.length<(F.only==='idx'?1:5)){st.textContent=F.only==='idx'?'Index ke token nahi mile. Settings me "Pehle 200 bade stock + index" dabao.':'Kam se kam 5 stock ke token chahiye.';return}
 var months=+$('fbM').value,to=X.addDays(X.ymd(X.istNow()),-1),from=X.addDays(to,-30*months+1);
 BUSY=true;BTSTOP.stop=false;BTSTOP.err='';$('fbGo').disabled=true;
 try{
  var res=await buildFib(list,from,to,F,function(t){st.textContent=t},BTSTOP),pr=res.pr,P=res.P;
  window.FIBLAST=pr;
  var wf=X.walkForward(pr,P),v=X.verdict(wf.oos),tot=0,wd=0;
  pr.ds.forEach(function(d){var n=X.pick(pr.cands[d].slice(),P).length;tot+=n;if(n)wd++});
  var h='<div class="box"><span class="pill '+v.k+'">'+esc(v.t)+'</span></div>';
  h+='<div class="box"><b>Pehle 60% din (setting chunne ke liye)</b><br><span class="mu">volume '+wf.best.v+'x, score '+wf.best.sc+'</span><pre>'+esc(X.stats?fmt(wf.inS):'')+'</pre></div>';
  h+='<div class="box"><b>Baaki 40% din (asli parakh, ye dekho)</b><pre>'+esc(fmt(wf.oos))+'</pre></div>';
  h+='<div class="box mu"><b>Filter ka hisaab:</b> '+res.pr.K.n+' Fibonacci rejection mile (VWAP aur market-disha pass), risk size se hate '+res.pr.K.s+', bache '+res.pr.K.ok+'. Is setting par roz average '+f2(pr.ds.length?tot/pr.ds.length:0)+' signal, '+f2(pr.ds.length?wd/pr.ds.length*100:0)+'% din me kam se kam 1.</div>';
  h+=tbl('Score ke hisaab se',buck(pr,[[0,3,'3 se kam'],[3,4,'3-4'],[4,5,'4-5'],[5,6,'5-6'],[6,11,'6 se zyada']],function(c){return c.tr.score}));
  h+=tbl('Volume (x) ke hisaab se',buck(pr,[[0,0.8,'0.8x se kam'],[0.8,1.2,'0.8-1.2x'],[1.2,2,'1.2-2x'],[2,99,'2x se zyada']],function(c){return c.tr.vr}));
  h+=tbl('Samay ke hisaab se',buck(pr,[[555,630,'9:15-10:30'],[630,690,'10:30-11:30'],[690,750,'11:30-12:30']],function(c){return mins(c.tr.t)}));
  h+=tbl('Disha ke hisaab se',buck(pr,[[1,2,'BUY (pullback)'],[-2,0,'SELL (bounce)']],function(c){return c.tr.dir}));
  h+=tbl('Fib kitna gehra gaya',buck(pr,[[0.5,0.7,'0.5-0.7'],[0.7,0.8,'0.7-0.8'],[0.8,1.01,'0.8-1.0']],function(c){return c.tr.fib.reach}));
  h+='<div class="mu">'+res.loaded.length+(F.only==='idx'?' index (Nifty, Bank Nifty...), ':' stock/index, ')+pr.ds.length+' din, kharcha '+X.cfg().cost+'%. Entry = trigger ke agle candle ka open, target 2x risk, stop = swing ka doosra kinara. ✓ = 30+ trade aur avg +0.1R se zyada. 30 se kam trade wali row par bharosa mat karo.</div>';
  h+='<button class="s" id="fbRep">📋 Report copy karo</button><div id="fbRm" class="mu"></div>';
  out.innerHTML=h;st.textContent='Ho gaya.';
  $('fbRep').onclick=function(){
   var t='FIB BACKTEST '+new Date().toLocaleString()+'\nSetting: zone '+F.lo+'-'+F.hi+', swing '+F.minLeg+'-'+F.maxLeg+'%, last '+F.last+', score>='+F.minScore+', vol>='+F.minVol+'\n'+v.t+'\nParakh: '+fmt(wf.oos).replace(/\n/g,'; ')+'\n'+out.innerText.split('\n').filter(function(l){return /\t/.test(l)||/hisaab se|Filter/.test(l)}).join('\n');
   try{navigator.clipboard.writeText(t).then(function(){$('fbRm').textContent='Report copy ho gayi.'})}catch(e){$('fbRm').textContent='Copy nahi hui.'}
  };
 }catch(e){st.textContent='Rukk gaya: '+e.message}
 BUSY=false;$('fbGo').disabled=false;
}
function fmt(s){
 if(!s||!s.n)return 'Koi trade nahi bana.';
 return 'Trade: '+s.n+'\nWin rate: '+f2(s.win)+'%\nAverage (kharche ke baad): '+(s.avg>=0?'+':'')+f2(s.avg)+'R\nKul: '+(s.sum>=0?'+':'')+f2(s.sum)+'R\nProfit factor: '+f2(s.pf)+'\nSabse bada girna: '+f2(s.dd)+'R\n90% andaaza (neeche ka): '+(s.p5>=0?'+':'')+f2(s.p5)+'R';
}

/* ---------- chart (Fib grid jaisa tumhare screenshot me) ---------- */
function chart(cv,cs,levels,title){
 var dpr=window.devicePixelRatio||1,W=cv.clientWidth||340,H=cv.clientHeight||340;cv.width=W*dpr;cv.height=H*dpr;var g=cv.getContext('2d');g.setTransform(dpr,0,0,dpr,0,0);
 g.fillStyle='#0f1215';g.fillRect(0,0,W,H);
 if(!cs.length){g.fillStyle='#9aa7b0';g.font='13px sans-serif';g.fillText('Candle data nahi mila',12,24);return}
 var L=6,R=58,T=14,B=22,vh=Math.round(H*0.14),pw=W-L-R,ph=H-T-B-vh-6,cw=pw/75,lo=1e18,hi=-1e18;
 cs.forEach(function(c){lo=Math.min(lo,c.l);hi=Math.max(hi,c.h)});
 var rg=hi-lo||1;levels.forEach(function(l){if(l.y>lo-rg*0.6&&l.y<hi+rg*0.6){lo=Math.min(lo,l.y);hi=Math.max(hi,l.y)}});
 var pad=(hi-lo)*0.05||1;lo-=pad;hi+=pad;
 function Y(p){return T+ph*(1-(p-lo)/(hi-lo))}function Xp(i){return L+i*cw+cw/2}
 g.font='10px sans-serif';g.textBaseline='middle';
 var zs=levels.filter(function(l){return /0\.618|0\.786/.test(l.t)});
 if(zs.length===2){g.fillStyle='rgba(255,153,51,0.13)';g.fillRect(L,Math.min(Y(zs[0].y),Y(zs[1].y)),pw,Math.abs(Y(zs[0].y)-Y(zs[1].y)))}
 var maxV=1;cs.forEach(function(c){maxV=Math.max(maxV,c.v)});
 cs.forEach(function(c,i){var up=c.c>=c.o,col=up?'#3ddc84':'#ff5252',x=Xp(i);g.strokeStyle=col;g.fillStyle=col;g.beginPath();g.moveTo(x,Y(c.h));g.lineTo(x,Y(c.l));g.stroke();var y1=Y(Math.max(c.o,c.c)),y2=Y(Math.min(c.o,c.c));g.fillRect(x-cw*0.35,y1,cw*0.7,Math.max(1,y2-y1));g.globalAlpha=0.35;g.fillRect(x-cw*0.35,H-B-(c.v/maxV)*vh,cw*0.7,(c.v/maxV)*vh);g.globalAlpha=1});
 var pv=0,vv=0;g.strokeStyle='#4fc3f7';g.lineWidth=1.5;g.beginPath();cs.forEach(function(c,i){pv+=(c.h+c.l+c.c)/3*c.v;vv+=c.v;var w=vv>0?pv/vv:c.c;if(i===0)g.moveTo(Xp(i),Y(w));else g.lineTo(Xp(i),Y(w))});g.stroke();
 g.lineWidth=1.2;g.textAlign='left';
 levels.forEach(function(l){g.setLineDash(l.dash?[4,3]:[]);g.strokeStyle=l.c;g.beginPath();g.moveTo(L,Y(l.y));g.lineTo(W-R,Y(l.y));g.stroke();g.setLineDash([]);g.fillStyle=l.c;g.font='bold 10px sans-serif';g.fillText(l.t+' '+f2(l.y),W-R+3,Y(l.y))});
 g.textBaseline='top';g.fillStyle='#9aa7b0';g.font='10px sans-serif';g.fillText(title+'   (neeli = VWAP, narangi patti = Fib 0.618-0.786 zone)',L+2,2);
 g.textAlign='center';[0,12,24,36,48,60,72].forEach(function(i){var m=555+i*5;g.fillText(String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0'),Xp(i),H-B+5)});
}
var modal=mk('div','', '<div class="card" style="max-width:620px;margin:auto"><div class="row"><b id="fcT" style="flex:1"></b><button class="s" id="fcX" style="flex:0 0 auto;margin:0">Band</button></div><canvas id="fcv" style="width:100%;height:360px;background:#0f1215;border-radius:10px"></canvas><pre id="fcL" style="margin-top:6px"></pre></div>');
modal.id='fModal';modal.style.cssText='display:none;position:fixed;left:0;top:0;right:0;bottom:0;background:rgba(0,0,0,.82);z-index:60;padding:10px;overflow:auto';document.body.appendChild(modal);
$('fcX').onclick=function(){modal.style.display='none'};
async function lastDay(token){
 var d=X.ymd(X.istNow()),cs=await X.getCandles(token,X.addDays(d,-6),d),by={};
 cs.forEach(function(c){(by[c.d]=by[c.d]||[]).push(c)});
 var ds=Object.keys(by).sort(),l=ds[ds.length-1];return {date:l,cs:l?by[l].sort(function(a,b){return a.t<b.t?-1:1}):[]};
}
function explainFib(cs,F,br,isI){
 var o=[],sw=swingOf(cs);
 if(!sw||cs.length<7){o.push('Abhi swing banne ke liye kaafi candle nahi (9:45 ke baad).');return o}
 o.push('Swing: '+(sw.down?'gira (high '+f2(sw.H)+' se low '+f2(sw.L)+')':'badha (low '+f2(sw.L)+' se high '+f2(sw.H)+')')+', lambai '+f2(sw.legPct)+'%');
 if(sw.legPct<F.minLeg||sw.legPct>F.maxLeg)o.push('Swing '+F.minLeg+'% se '+F.maxLeg+'% ke bahar hai, isliye Fib signal nahi banta.');
 var last=cs[cs.length-1],r=sw.down?(last.c-sw.L)/sw.leg:(sw.H-last.c)/sw.leg;
 o.push('Abhi bhav swing ke '+f2(r*100)+'% retrace par hai (zone '+F.lo+' se '+F.hi+').');
 var t=detectFib(cs,isI?fIdx(F):F,function(){return br},null,isI);
 o.push(t?('Fib trigger: '+t.t+' par '+(t.dir>0?(isI?'BUY CALL':'BUY'):(isI?'BUY PUT':'SELL'))+', score '+f2(t.score)+', stop '+f2(t.sl)+(isI?'':', volume '+f2(t.vr)+'x')):'Abhi koi Fib trigger nahi bana.');
 return o;
}
async function openChart(sym,token,sig){
 modal.style.display='block';$('fcT').textContent=sym+' - Fibonacci chart';$('fcL').textContent='Data aa raha hai...';
 try{
  var r=await lastDay(token),F=cfg(),cs=r.cs,live=r.date===X.ymd(X.istNow()),now=X.hm(X.istNow());
  var isI=X.idxResolved().some(function(x){return String(x.token)===String(token)});
  var done=live?cs.filter(function(c){return X.addMin(c.t,5)<=now}):cs,br=isI?0:X.breadth().avg,lv=fibGrid(done,isI?fIdx(F):F);
  if(sig)lv=lv.concat([{y:sig.entry,t:'Entry',c:'#ffffff'},{y:sig.sl,t:'SL',c:'#ff5252'},{y:sig.tgt,t:'Target',c:'#3ddc84'}]);
  chart($('fcv'),cs,lv,sym+'  '+(r.date||''));
  $('fcL').textContent=explainFib(done,F,br,isI).join('\n');
 }catch(e){$('fcL').textContent='Dikkat: '+e.message}
}


/* ---------- Index PCR (Angel One putCallRatio, GET) ---------- */
var BASEURL='https://apiconnect.angelbroking.com';
var PN={'Nifty 50':'NIFTY','Bank Nifty':'BANKNIFTY','Fin Nifty':'FINNIFTY','Midcap Select':'MIDCPNIFTY'};
var MON={JAN:0,FEB:1,MAR:2,APR:3,MAY:4,JUN:5,JUL:6,AUG:7,SEP:8,OCT:9,NOV:10,DEC:11};
async function pcrGet(){
 var cap=window.Capacitor&&window.Capacitor.Plugins&&window.Capacitor.Plugins.CapacitorHttp,j;
 var h={'Content-Type':'application/json','Accept':'application/json','X-UserType':'USER','X-SourceID':'WEB','X-ClientLocalIP':'127.0.0.1','X-ClientPublicIP':X.S.pubIp||'127.0.0.1','X-MACAddress':'00:00:00:00:00:00','X-PrivateKey':ld('sig_key',''),'Authorization':'Bearer '+X.S.jwt};
 var url=BASEURL+'/rest/secure/angelbroking/marketData/v1/putCallRatio';
 if(cap&&cap.request){var r=await cap.request({url:url,method:'GET',headers:h});j=typeof r.data==='string'?JSON.parse(r.data):r.data}
 else{var res=await fetch(url,{method:'GET',headers:h});j=await res.json()}
 if(!j||!(j.status===true||j.success===true))throw new Error((j&&j.message)||'PCR nahi aaya');
 return j.data||[];
}
function pcrParse(rows){
 var td=X.ymd(X.istNow()),by={};
 rows.forEach(function(r){
  var m=/^([A-Z]+?)(\d{2})([A-Z]{3})(\d{2})FUT$/.exec(String(r.tradingSymbol||''));
  if(!m||!(m[1] in {NIFTY:1,BANKNIFTY:1,FINNIFTY:1,MIDCPNIFTY:1})||!(m[3] in MON))return;
  var d=new Date(2000+ +m[4],MON[m[3]],+m[2],12),ds=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  if(ds<td)return;
  (by[m[1]]=by[m[1]]||[]).push({pcr:+r.pcr,sym:r.tradingSymbol,exp:ds});
 });
 Object.keys(by).forEach(function(k){by[k].sort(function(a,b){return a.exp<b.exp?-1:1})});
 return by;
}
function pcrStore(){var o=ld('sig_pcr',null),d=X.ymd(X.istNow());if(!o||o.d!==d){o={d:d,s:{}};sv('sig_pcr',o)}return o}
var PCR={cur:null,err:''};
async function pcrRefresh(){
 try{
  var by=pcrParse(await pcrGet()),o=pcrStore(),t=X.hm(X.istNow());
  Object.keys(by).forEach(function(k){var a=o.s[k]=o.s[k]||[],v=by[k][0].pcr;if(!a.length||a[a.length-1][1]!==v)a.push([t,v])});
  sv('sig_pcr',o);PCR.cur=by;PCR.err='';
 }catch(e){PCR.err=e.message}
 renderPcr();
 return PCR.cur;
}
function pcrMood(p){
 if(!(p>0))return '-';
 if(p<0.7)return 'Call bahut zyada (tezi ka josh, thaka hua ho sakta)';
 if(p<0.9)return 'Call thode zyada';
 if(p<1.1)return 'Santulit';
 if(p<1.3)return 'Put thode zyada';
 return 'Put bahut zyada (darr ya hedging)';
}
function pcrFor(sym){
 var k=PN[sym];if(!k||!PCR.cur||!PCR.cur[k])return null;
 var a=pcrStore().s[k]||[],now=PCR.cur[k][0].pcr;
 return {now:now,chg:a.length?now-a[0][1]:0};
}
function pcrBase(k){
 var a=pcrStore().s[k]||[],lim=mins(X.hm(X.istNow()))-20,p=null;
 for(var i=0;i<a.length;i++){if(mins(a[i][0])<=lim)p=a[i]}
 return p||a[0]||null;
}
/* CALL (BUY) ko PCR badhta hua, PUT ko PCR girta hua confirm karta hai (pichle ~20 minute ke muqable). */
function pcrConfirm(sym,dir){
 var k=PN[sym];
 if(!k||!PCR.cur||!PCR.cur[k])return {state:'none',now:null,chg:0};
 var now=PCR.cur[k][0].pcr,b=pcrBase(k),chg=b?now-b[1]:0,st;
 if(!b||Math.abs(chg)<=0.005)st='flat';else st=((chg>0)===(dir>0))?'ok':'opp';
 return {state:st,now:now,chg:chg};
}
function pcrTxt(p,dir){
 if(!p||p.now==null)return 'PCR data nahi mila';
 var lab={ok:'PCR ne confirm kiya ✓',flat:'PCR flat (na confirm, na ulta)',opp:'PCR ulta hai ✗',none:'PCR data nahi'}[p.state];
 return 'PCR '+f2(p.now)+' (~20 min me '+(p.chg>=0?'+':'')+f2(p.chg)+'): '+lab;
}
function renderPcr(){
 var el=$('pcOut');if(!el)return;
 if(PCR.err&&!PCR.cur){el.innerHTML='<span class="r">PCR nahi aaya: '+esc(PCR.err)+'</span>';return}
 if(!PCR.cur){el.innerHTML='<div class="mu">"PCR dekho" dabao.</div>';return}
 var o=pcrStore(),h='<table style="width:100%;border-collapse:collapse;font-size:13px"><tr class="mu"><td>Index</td><td>PCR</td><td>Subah se</td><td>Matlab</td></tr>';
 Object.keys(PN).forEach(function(n){
  var k=PN[n],v=PCR.cur[k];if(!v||!v.length)return;
  var a=o.s[k]||[],now=v[0].pcr,chg=a.length?now-a[0][1]:0;
  h+='<tr style="border-top:1px solid var(--line)"><td><b>'+esc(n)+'</b><div class="mu">'+v[0].exp+'</div></td><td><b>'+f2(now)+'</b></td><td class="'+(chg>=0?'g':'r')+'">'+(chg>=0?'+':'')+f2(chg)+'</td><td class="mu">'+pcrMood(now)+'</td></tr>';
 });
 h+='</table><div class="mu" style="margin-top:6px">'+X.hm(X.istNow())+' par update. Ye Angel One ka volume wala PCR hai (sabse paas ki expiry). PCR akele disha nahi batata aur kayi baar ulta bhi chalta hai, isliye har Fib signal ke saath PCR likh lete hain taaki neeche "Mere Fib signal ka natija" me asli data se dikhe ki PCR ka kya asar raha.</div>';
 el.innerHTML=h;
}

/* ---------- live scan ---------- */
var LIVE={run:false};
function todayF(){var t=ld('sig_fib_today',null),d=X.ymd(X.istNow());if(!t||t.date!==d){t={date:d,sigs:[],emitted:[]};sv('sig_fib_today',t)}return t}
function candidates(F){
 if(F.only==='idx')return idxList();
 var c=X.cfg(),out=[];
 X.stocksNow().forEach(function(x){
  if(!X.liquid(x,c)||X.circuitNear(x)||!(x.h>x.l)||x.l<=0)return;
  var legPct=(x.h-x.l)/x.l*100;if(legPct<F.minLeg||legPct>F.maxLeg)return;
  var r=(x.ltp-x.l)/(x.h-x.l),d=Math.min(Math.abs(r-0.70),Math.abs(r-0.30));
  if(d>0.2)return;
  out.push({sym:x.n,token:x.t,idx:false,dist:d});
 });
 out.sort(function(a,b){return a.dist-b.dist});
 return out.slice(0,80).concat(idxList());
}
function alarm(s){
 var old=$('fAlarm');if(old)old.remove();
 var buy=s.dir>0,el=mk('div','','<div style="max-width:420px;margin:auto;text-align:center"><div>🔔 FIB SIGNAL</div><div style="font-size:30px;font-weight:900;margin:8px 0">'+(s.idx?(buy?'BUY CALL ':'BUY PUT '):(buy?'BUY ':'SELL '))+esc(s.sym)+'</div><div style="font-size:16px;line-height:1.7">Entry '+f2(s.entry)+'<br>Stop-loss '+f2(s.sl)+'<br>Target '+f2(s.tgt)+(s.idx?'':'<br>Quantity '+s.qty)+(s.pcr?'<br>'+pcrTxt(s.pcr,s.dir):'')+'</div><button id="fAlOk" style="margin-top:16px;font-size:17px;padding:14px 26px;background:#fff;color:#111">Dekh liya</button></div>');
 el.id='fAlarm';el.style.cssText='position:fixed;left:0;top:0;right:0;bottom:0;z-index:99;display:flex;align-items:center;justify-content:center;padding:20px;color:#fff;background:'+(buy?'#0d5c2e':'#7a1414');
 document.body.appendChild(el);$('fAlOk').onclick=function(){el.remove()};
 try{navigator.vibrate&&navigator.vibrate([250,120,250])}catch(e){}
}
async function liveOnce(){
 var F=cfg(),T=todayF(),now=X.istNow(),nowT=X.hm(now),dow=now.getDay(),st=$('flSt'),C=X.cfg();
 if(dow===0||dow===6){st.textContent='Aaj chhutti hai.';return}
 if(nowT<'09:45'){st.textContent='Fib signal 9:45 ke baad shuru hote hain (pehle swing banna chahiye).';return}
 if(nowT>F.last){st.textContent='Fib signal ka samay ('+F.last+' tak) nikal gaya.';render(T);return}
 if(T.sigs.length>=F.maxSig){st.textContent='Aaj ke '+F.maxSig+' Fib signal ho gaye.';render(T);return}
 try{await pcrRefresh()}catch(e){}
 if(F.only!=='idx'&&(!M.t||Date.now()-M.t>90000)){st.textContent=nowT+' par poora market dekh raha hoon...';await X.refreshMarket()}
 if(!LIVE.run)return;
 var cand=candidates(F),data={},total=F.only==='idx'?cand.length:X.stocksNow().length,br=F.only==='idx'?0:X.breadth().avg,found=[];
 for(var i=0;i<cand.length&&LIVE.run;i++){
  st.textContent='Fib jaanch: '+cand[i].sym+' ('+(i+1)+'/'+cand.length+')';
  try{
   var cs=await X.getCandles(cand[i].token,T.date,T.date);if(!cs.length)continue;
   var done=cs.filter(function(c){return X.addMin(c.t,5)<=nowT}),prof=null;
   if(!cand[i].idx){try{var pd=X.byDay(await X.getCandles(cand[i].token,X.addDays(T.date,-20),X.addDays(T.date,-1)));prof=X.volProfile(Object.keys(pd).sort().slice(-10).map(function(d){return pd[d]}))}catch(e2){}}
   var Fi=cand[i].idx?fIdx(F):F,tr=detectFib(done,Fi,function(){return br},prof,!!cand[i].idx);
   if(!tr||T.emitted.indexOf(cand[i].sym)>=0)continue;
   var R=Math.abs(tr.close-tr.sl),last=done[done.length-1],fresh=tr.i>=done.length-2&&Math.abs(last.c-tr.close)<=0.5*R;
   if(!fresh||tr.score<F.minScore||(!cand[i].idx&&tr.vr<F.minVol))continue;
   var rp=R/tr.close*100;if(rp>(cand[i].idx?1.0:F.maxRisk)||rp<0.05)continue;
   found.push({c:cand[i],tr:tr,R:R});
  }catch(e){st.textContent='Dikkat '+cand[i].sym+': '+e.message}
 }
 found.sort(function(a,b){return b.tr.score-a.tr.score});
 for(var k=0;k<found.length&&T.sigs.length<F.maxSig;k++){
  var f=found[k],tr2=f.tr,tgt=tr2.close+tr2.dir*2*f.R,risk=C.cap*C.riskPct/100;
  var pc=f.c.idx?pcrConfirm(f.c.sym,tr2.dir):null,blocked=!!(pc&&((F.pcrMode==='sakht'&&pc.state!=='ok')||(F.pcrMode==='narm'&&pc.state==='opp')));
  var s={id:Date.now()+'-'+f.c.sym+'-fib',date:T.date,sym:f.c.sym,idx:!!f.c.idx,token:f.c.token,dir:tr2.dir,t:tr2.t,i:tr2.i,entry:tr2.close,sl:tr2.sl,tgt:tgt,R:f.R,qty:f.c.idx?0:Math.floor(risk/f.R),opt:f.c.idx?(tr2.dir>0?'CALL':'PUT'):'',pcr:pc&&pc.now!=null?{now:pc.now,chg:pc.chg,state:pc.state}:(pc?{now:null,chg:0,state:'none'}:null),blocked:blocked,score:tr2.score,reasons:tr2.reasons,orH:tr2.orH,orL:tr2.orL,strat:'fib',res:null};
  T.emitted.push(s.sym);
  var hist=ld('sig_fib_hist',[]);hist.push(s);sv('sig_fib_hist',hist);
  if(blocked){T.blocked=(T.blocked||0)+1;continue}
  T.sigs.push(s);
  alarm(s);
  try{if(window.XT&&XT.notify)XT.notify('Fib signal: '+(s.idx?(s.dir>0?'BUY CALL ':'BUY PUT '):(s.dir>0?'BUY ':'SELL '))+s.sym,'Entry '+f2(s.entry)+'  SL '+f2(s.sl)+'  Target '+f2(s.tgt)+(s.idx?(s.pcr?'  | '+pcrTxt(s.pcr,s.dir):''):'  Qty '+s.qty),s.id)}catch(e){}
 }
 sv('sig_fib_today',T);render(T);
 st.textContent=X.hm(X.istNow())+' tak scan hua. '+(F.only==='idx'?cand.length+' index ke candle jaanche':total+' stock ka bhav dekha, '+cand.length+' Fib setup ke paas ke stock/index ke candle jaanche')+'. Aaj '+T.sigs.length+'/'+F.maxSig+' Fib signal'+(T.blocked?' ('+T.blocked+' signal PCR ke ulta hone se roke gaye)':'')+'.';
}
function startLive(){
 if(LIVE.run)return;
 if(!X.S.jwt){$('flSt').textContent='Pehle login karo (Settings tab).';return}
 LIVE.run=true;$('flGo').disabled=true;
 (async function loop(){
  while(LIVE.run){
   try{await liveOnce()}catch(e){$('flSt').textContent='Dikkat: '+e.message}
   var n=X.istNow(),wait=(5-(n.getMinutes()%5))*60-n.getSeconds()+10;
   for(var k=0;k<wait&&LIVE.run;k++)await sleep(1000);
  }
  $('flGo').disabled=false;
 })();
}
function render(T){
 var h='';
 T.sigs.forEach(function(s){
  var buy=s.dir>0;
  h+='<div class="box '+(buy?'buy':'sell')+'"><b>'+(s.idx?(buy?'BUY CALL':'BUY PUT'):(buy?'BUY':'SELL'))+' '+esc(s.sym)+'</b> <span class="pill po">Fib | Score '+f2(s.score)+'/10</span><div class="mu">Trigger '+s.t+' ke candle par</div><pre>Entry (abhi ke aas-paas): '+f2(s.entry)+'\nStop-loss: '+f2(s.sl)+'\nTarget (2x): '+f2(s.tgt)+'\nRisk: '+f2(s.R)+(s.idx?' points (index ke levels; option ka strike aur premium tum khud dekho)':' per share\nQuantity: '+s.qty)+(s.pcr?'\n'+pcrTxt(s.pcr,s.dir)+(s.pcr.now!=null?' | '+pcrMood(s.pcr.now):''):'')+'\nKaaran: '+esc(s.reasons.join(', '))+'</pre><div class="mu">Broker app me bhav check karo. Alag dikhe to trade mat lo.</div><button class="s" data-fc="'+s.id+'">📈 Fib chart</button>'+(s.idx?'':'<button data-fp="'+s.id+'">🎮 Paper trade</button>')+'</div>';
 });
 $('flList').innerHTML=h||'<div class="mu">Abhi koi Fib signal nahi. (Aaj '+T.sigs.length+'/'+cfg().maxSig+')</div>';
 Array.prototype.forEach.call($('flList').querySelectorAll('[data-fc]'),function(b){b.onclick=function(){var s=T.sigs.filter(function(x){return x.id===b.getAttribute('data-fc')})[0];if(s)openChart(s.sym,s.token,s)}});
 Array.prototype.forEach.call($('flList').querySelectorAll('[data-fp]'),function(b){b.onclick=function(){
  var s=T.sigs.filter(function(x){return x.id===b.getAttribute('data-fp')})[0];if(!s)return;
  if(window.XT&&XT.openPaper){if(XT.openPaper({sym:s.sym,token:s.token,dir:s.dir,entry:s.entry,sl:s.sl,tgt:s.tgt,qty:s.qty,from:'signal'})){X.tab('tGame');if(XT.onTab)XT.onTab('tGame')}}
  else alert('Game tab (extras.js) nahi mila.');
 }});
}
async function evalHist(){
 var h=ld('sig_fib_hist',[]),F=cfg(),P=simP(F),now=X.ymd(X.istNow()),st=$('fhSt');
 st.textContent='Natija nikaal raha hoon...';
 for(var i=0;i<h.length;i++){
  var s=h[i];if(s.res||s.date>=now&&X.hm(X.istNow())<'15:20')continue;
  try{
   var cs=X.byDay(await X.getCandles(s.token,s.date,s.date))[s.date];if(!cs)continue;
   var idx=-1;cs.forEach(function(c,k){if(c.t===s.t)idx=k});if(idx<0)continue;
   var r=X.simulate(cs,{i:idx,dir:s.dir,orH:s.orH,orL:s.orL,sl:s.sl},s.idx?Object.assign({},P,{maxRisk:1.0}):P);
   s.res=r?{net:r.net,gross:r.gross,exit:r.exitT}:{net:0,gross:0,exit:'-',skip:true};
  }catch(e){st.textContent='Dikkat: '+e.message;break}
 }
 sv('sig_fib_hist',h);
 var allDone=h.filter(function(s){return s.res&&!s.res.skip}),done=allDone.filter(function(s){return !s.blocked}),S2=X.stats(done.map(function(s){return {date:s.date,net:s.res.net}}));
 var cb=[['ok','PCR ne confirm kiya'],['flat','PCR flat'],['none','PCR data nahi'],['opp','PCR ulta (ye roke gaye)']].map(function(b){return {k:b[0],l:b[1],n:0,w:0,s:0}});
 allDone.forEach(function(x){var st=x.pcr?x.pcr.state:'none';cb.forEach(function(r){if(r.k===st){r.n++;r.s+=x.res.net;if(x.res.net>0)r.w++}})});
 var pb=[[0,0.8,'PCR 0.8 se kam'],[0.8,1.2,'PCR 0.8 se 1.2'],[1.2,99,'PCR 1.2 se zyada']].map(function(b){return {l:b[2],n:0,w:0,s:0,lo:b[0],hi:b[1]}});
 done.forEach(function(x){if(!x.pcr||x.pcr.now==null)return;pb.forEach(function(r){if(x.pcr.now>=r.lo&&x.pcr.now<r.hi){r.n++;r.s+=x.res.net;if(x.res.net>0)r.w++}})});
 $('fhOut').innerHTML='<pre>'+esc(done.length?fmt(S2):'Abhi koi poora hua Fib signal nahi.')+'</pre>'+(allDone.some(function(x){return x.pcr})?tbl('PCR confirm ke hisaab se (roke gaye signal bhi ginti me, taaki pata chale filter kaam karta hai ya nahi)',cb)+tbl('PCR ke star ke hisaab se',pb)+'<div class="mu">30 se kam signal par ye tables bharose ke layak nahi.</div>':'')+h.slice().reverse().slice(0,15).map(function(s){return '<div class="mu">'+s.date+' '+(s.dir>0?'BUY':'SELL')+' '+esc(s.sym)+': '+(s.res?(s.res.net>=0?'+':'')+f2(s.res.net)+'R':'baaki')+'</div>'}).join('');
 st.textContent='';
}

/* ---------- UI ---------- */
var tb=mk('button','tab','Fib');tb.setAttribute('data-tab','tFib');tb.onclick=function(){X.tab('tFib')};$('tabs').appendChild(tb);
var sec=mk('div','sec');sec.id='tFib';document.body.appendChild(sec);
sec.innerHTML='<div class="card"><b>📐 Fibonacci (OTE) strategy</b><div class="mu">Din ka swing (high se low ya low se high) lo. Gire hue swing me bhav upar bounce karke 0.618-0.786 zone me wick banaye aur wapas neeche band ho (laal candle) to SELL. Badhe hue swing me mirror se BUY. Stop = swing ka doosra kinara, target = 2x risk. VWAP aur market ki disha ka saath zaroori.</div>'+
 '<div class="row"><div><label>Kahan lagana hai</label><select id="fOnly"><option value="idx">Sirf index (Nifty, Bank Nifty...)</option><option value="all">Index + stock</option></select></div></div>'+
 '<div class="row"><div><label>PCR confirm</label><select id="fPcr"><option value="off">Off (PCR sirf dikhao)</option><option value="narm">Narm (PCR ulta ho to signal roko)</option><option value="sakht">Sakht (PCR confirm kare tabhi lo)</option></select></div></div>'+
 '<div class="row"><div><label>Zone shuru</label><input id="fLo" type="number" step="0.01"></div><div><label>Zone ant</label><input id="fHi" type="number" step="0.01"></div></div>'+
 '<div class="row"><div><label>Swing kam se kam (%)</label><input id="fMin" type="number" step="0.1"></div><div><label>Swing zyada se zyada (%)</label><input id="fMax" type="number" step="0.1"></div></div>'+
 '<div class="row"><div><label>Kam se kam score (10 me)</label><input id="fSc" type="number" step="0.5"></div><div><label>Kam se kam volume (x)</label><input id="fVo" type="number" step="0.1"></div></div>'+
 '<div class="row"><div><label>Signal kab tak (HH:MM)</label><input id="fLast"></div><div><label>Din me max Fib signal</label><input id="fMS" type="number" min="1" max="2"></div></div>'+
 '<button id="fSave">Fib settings save karo</button><span id="fSm" class="mu"></span></div>'+
 '<div class="card"><b>📊 Index PCR (Put-Call Ratio)</b><button id="pcGo">PCR dekho</button><div id="pcOut"></div></div>'+
 '<div class="card"><b>Live Fib scan</b><div class="row"><button id="flGo">Fib scan shuru</button><button class="s" id="flStop">Ruko</button></div><div id="flSt" class="mu"></div><div id="flList"></div></div>'+
 '<div class="card"><b>Fib chart (kisi bhi stock ka)</b><label>Stock ka naam</label><input id="fcSym" placeholder="Nifty 50"><button id="fcGo">Chart dekho</button></div>'+
 '<div class="card"><b>Fib backtest (accuracy)</b><div class="row"><div><label>Kitne mahine</label><select id="fbM"><option>3</option><option>6</option></select></div><div><label>Kaun se stock</label><select id="fbU"><option value="wl">Meri watchlist</option><option value="60">Market list ke pehle 60</option><option value="300">Market list ke pehle 300</option><option value="all">Sab (jitne token save hain)</option></select></div></div><button id="fbGo">Fib backtest chalao</button><button class="s" id="fbStop">Roko aur ab tak ka nateeja dikhao</button><div id="fbSt" class="mu"></div><div id="fbOut"></div></div>'+
 '<div class="card"><b>Mere Fib signal ka natija</b><button class="s" id="fhGo">Natija nikaalo</button><div id="fhSt" class="mu"></div><div id="fhOut"></div></div>';
function loadUi(){var c=cfg();$('fPcr').value=c.pcrMode;$('fOnly').value=c.only;$('fLo').value=c.lo;$('fHi').value=c.hi;$('fMin').value=c.minLeg;$('fMax').value=c.maxLeg;$('fSc').value=c.minScore;$('fVo').value=c.minVol;$('fLast').value=c.last;$('fMS').value=c.maxSig}
$('fSave').onclick=function(){
 var c=cfg();
 c.pcrMode=$('fPcr').value||c.pcrMode;c.only=$('fOnly').value||c.only;c.lo=+$('fLo').value||c.lo;c.hi=+$('fHi').value||c.hi;c.minLeg=+$('fMin').value||c.minLeg;c.maxLeg=+$('fMax').value||c.maxLeg;c.minScore=(+$('fSc').value)||c.minScore;c.minVol=(+$('fVo').value)||c.minVol;
 c.last=/^\d\d:\d\d$/.test($('fLast').value)?$('fLast').value:c.last;c.maxSig=Math.max(1,Math.min(2,+$('fMS').value||c.maxSig));
 sv('sig_fib',c);$('fSm').textContent=' Save ho gaya.';
};
$('flGo').onclick=startLive;$('flStop').onclick=function(){LIVE.run=false;$('flSt').textContent='Fib scan roka.'};
$('fcGo').onclick=function(){
 var n=$('fcSym').value.trim().toUpperCase(),it=X.uniResolved().concat(X.idxResolved()).filter(function(x){return x.sym.toUpperCase()===n})[0];
 if(!it){alert(n+' ka token nahi mila (Settings me token dhundo).');return}
 openChart(it.sym,it.token,null);
};
$('pcGo').onclick=function(){$('pcOut').textContent='PCR aa raha hai...';pcrRefresh()};
$('fbGo').onclick=runBt;$('fbStop').onclick=function(){BTSTOP.stop=true};
$('fhGo').onclick=evalHist;
loadUi();render(todayF());renderPcr();
window.FIB={pcrConfirm:pcrConfirm,pcrStore:pcrStore,pcrParse:pcrParse,pcrRefresh:pcrRefresh,pcrMood:pcrMood,detectFib:detectFib,swingOf:swingOf,fibGrid:fibGrid,cfg:cfg,runBt:runBt,liveOnce:liveOnce,startLive:startLive,openChart:openChart,candidates:candidates,buildFib:buildFib,evalHist:evalHist};
})();
