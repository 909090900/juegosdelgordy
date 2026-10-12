"use strict";
/* ---------- Datos ---------- */
const FAM = {
  alkane: {n:"Alcanos", s:"-ano", rule:"Solo enlaces sencillos C–C. Fórmula general CₙH₂ₙ₊₂.", use:"Es la base del gas natural, la gasolina y las parafinas."},
  alkene: {n:"Alquenos", s:"-eno", rule:"Tienen un doble enlace C=C. Fórmula general CₙH₂ₙ.", use:"Son la materia prima de plásticos como el polietileno."},
  alkyne: {n:"Alquinos", s:"-ino", rule:"Tienen un triple enlace C≡C. Fórmula general CₙH₂ₙ₋₂.", use:"El etino se quema en sopletes de soldadura."},
  cycloalkane: {n:"Cicloalcanos", s:"-ano", rule:"Cadena cerrada en anillo, con enlaces sencillos. Fórmula general CₙH₂ₙ.", use:"Se usan como disolventes y en combustibles."},
  aromatic: {n:"Aromáticos", s:"", rule:"Anillo de seis carbonos con dobles enlaces alternados.", use:"Están en disolventes, medicamentos y colorantes."}
};
const PRE = ["","met","et","prop","but","pent","hex"];
const ch = (name,formula,family,bonds,branches=[]) => ({name,formula,family,shape:{type:"chain",bonds,branches}});
const rg = (name,formula,family,n,doubles=[],substituent=null) => ({name,formula,family,shape:{type:"ring",n,doubles,substituent}});
const MOL = [
  ch("Etano","C₂H₆","alkane",[1]), ch("Propano","C₃H₈","alkane",[1,1]), ch("Butano","C₄H₁₀","alkane",[1,1,1]),
  ch("Pentano","C₅H₁₂","alkane",[1,1,1,1]), ch("Hexano","C₆H₁₄","alkane",[1,1,1,1,1]),
  ch("2-Metilpropano","C₄H₁₀","alkane",[1,1],[1]), ch("2-Metilbutano","C₅H₁₂","alkane",[1,1,1],[1]),
  ch("Eteno","C₂H₄","alkene",[2]), ch("Propeno","C₃H₆","alkene",[2,1]), ch("1-Buteno","C₄H₈","alkene",[2,1,1]),
  ch("2-Buteno","C₄H₈","alkene",[1,2,1]),
  Object.assign(ch("1,3-Butadieno","C₄H₆","alkene",[2,1,2]),{note:"Es un dieno: tiene dos dobles enlaces."}),
  ch("Etino","C₂H₂","alkyne",[3]), ch("Propino","C₃H₄","alkyne",[3,1]), ch("1-Butino","C₄H₆","alkyne",[3,1,1]),
  ch("2-Butino","C₄H₆","alkyne",[1,3,1]),
  rg("Ciclopropano","C₃H₆","cycloalkane",3), rg("Ciclohexano","C₆H₁₂","cycloalkane",6),
  rg("Benceno","C₆H₆","aromatic",6,[0,2,4]), rg("Tolueno","C₇H₈","aromatic",6,[0,2,4],3)
];
const POINTS = 10, NS = "http://www.w3.org/2000/svg", RM = matchMedia("(prefers-reduced-motion: reduce)");
const $ = id => document.getElementById(id);
const mainN = sh => sh.type === "ring" ? sh.n : sh.bonds.length + 1;

/* ---------- Utilidades ---------- */
function shuffle(a){const c=[...a];for(let i=c.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[c[i],c[j]]=[c[j],c[i]]}return c}
function el(tag,cls,text){const e=document.createElement(tag);if(cls)e.className=cls;if(text!=null)e.textContent=text;return e}

/* ---------- Geometría y dibujo (enlace = 1 unidad) ---------- */
const dir=(a,b)=>{const x=b.x-a.x,y=b.y-a.y,l=Math.hypot(x,y)||1;return{x:x/l,y:y/l}};
function chain({bonds,branches=[]}){
  const p=[{x:0,y:0}],s=[];let h=Math.PI/6,t=-Math.PI/3;
  bonds.forEach((o,i)=>{const a=p[i],b={x:a.x+Math.cos(h),y:a.y+Math.sin(h)};p.push(b);s.push({a,b,o});
    if(!(o===3||bonds[i+1]===3)){h+=t;t=-t}});          // el triple enlace es lineal
  branches.forEach(i=>{const c=p[i],u=dir(c,p[i-1]),w=dir(c,p[i+1]),d=dir({x:0,y:0},{x:-(u.x+w.x),y:-(u.y+w.y)});
    s.push({a:c,b:{x:c.x+d.x,y:c.y+d.y},o:1,br:1})});
  return s;
}
function ring({n,doubles=[],substituent=null}){
  const r=1/(2*Math.sin(Math.PI/n)),p=Array.from({length:n},(_,i)=>{const t=-Math.PI/2+2*Math.PI*i/n;return{x:r*Math.cos(t),y:r*Math.sin(t)}});
  const s=p.map((a,i)=>({a,b:p[(i+1)%n],o:doubles.includes(i)?2:1}));
  if(substituent!=null){const a=p[substituent],d=dir({x:0,y:0},a);s.push({a,b:{x:a.x+d.x,y:a.y+d.y},o:1,br:1})}
  return s;
}
const OFF={1:[0],2:[-4,4],3:[-6.5,0,6.5]};
function draw(g,shape,W,H,pad,max,anim,atoms){
  const segs=shape.type==="ring"?ring(shape):chain(shape);
  const xs=segs.flatMap(s=>[s.a.x,s.b.x]),ys=segs.flatMap(s=>[s.a.y,s.b.y]);
  const x0=Math.min(...xs),x1=Math.max(...xs),y0=Math.min(...ys),y1=Math.max(...ys);
  const k=Math.min(x1>x0?(W-2*pad)/(x1-x0):Infinity,y1>y0?(H-2*pad)/(y1-y0):Infinity,max);
  const ox=W/2-(x0+x1)/2*k,oy=H/2-(y0+y1)/2*k,lines=[],nodes=new Map();
  const P=q=>({x:q.x*k+ox,y:q.y*k+oy});
  const node=(q,br)=>{const id=q.x.toFixed(2)+","+q.y.toFixed(2);
    if(!nodes.has(id))nodes.set(id,{p:P(q),nb:[],br:false});const n=nodes.get(id);if(br)n.br=true;return n};
  segs.forEach(({a,b,o,br})=>{
    const A=P(a),B=P(b),d=dir(A,B),len=Math.hypot(B.x-A.x,B.y-A.y);
    node(a).nb.push(B);node(b,br).nb.push(A);
    OFF[o].forEach(f=>{
      const l=document.createElementNS(NS,"line");l.setAttribute("class","bond");
      l.setAttribute("x1",A.x-d.y*f);l.setAttribute("y1",A.y+d.x*f);l.setAttribute("x2",B.x-d.y*f);l.setAttribute("y2",B.y+d.x*f);
      if(anim&&!RM.matches)l.animate([{strokeDasharray:len,strokeDashoffset:len},{strokeDasharray:len,strokeDashoffset:0}],
        {duration:420,delay:lines.length*50,fill:"backwards",easing:"ease-out"});
      lines.push(l);
    });
  });
  if(atoms){                                   // un punto por carbono, numerado; los metilos se rotulan CH₃
    let num=0;
    [...nodes.values()].forEach(n=>{
      const dot=document.createElementNS(NS,"circle");dot.setAttribute("class","dot");
      dot.setAttribute("cx",n.p.x);dot.setAttribute("cy",n.p.y);dot.setAttribute("r",4.6);
      let u={x:0,y:0};n.nb.forEach(q=>{const v=dir(n.p,q);u.x-=v.x;u.y-=v.y});
      const l=Math.hypot(u.x,u.y);u=l>.3?{x:u.x/l,y:u.y/l}:{x:0,y:-1};
      const t=document.createElementNS(NS,"text");t.setAttribute("class",n.br?"num br":"num");
      t.setAttribute("x",n.p.x+u.x*16);t.setAttribute("y",n.p.y+u.y*16);t.textContent=n.br?"CH₃":++num;
      if(anim&&!RM.matches)[dot,t].forEach(e=>e.animate([{opacity:0},{opacity:1}],{duration:300,delay:lines.length*50,fill:"backwards"}));
      lines.push(dot,t);
    });
  }
  g.replaceChildren(...lines);
}

/* ---------- Pestaña Aprender ---------- */
function renderLearn(){
  $("prefixes").replaceChildren(...PRE.slice(1).map((p,i)=>{const li=el("li");const b=el("b",null,p+"-");li.append(b," = "+(i+1)+" C");return li}));
  $("fams").replaceChildren(...Object.entries(FAM).map(([k,f])=>{
    const ex=MOL.filter(m=>m.family===k);let n=0;
    const card=el("article","card");card.dataset.family=k;
    const svg=document.createElementNS(NS,"svg");svg.setAttribute("viewBox","0 0 200 90");svg.setAttribute("class","mini");
    const g=document.createElementNS(NS,"g");svg.append(g);
    const cap=el("div","cap"),btn=el("button","btn ghost","Ver otro ejemplo");btn.type="button";
    const show=()=>{const m=ex[n%ex.length];draw(g,m.shape,200,90,22,26,true,true);cap.textContent=`${m.name}, ${m.formula}`};
    btn.onclick=()=>{n++;show()};
    card.append(el("h3",null,f.n),el("p",null,f.rule),el("p","note",f.use+(f.s?` Terminación ${f.s}.`:"")),svg,cap,btn);
    show();return card;
  }));
}

/* ---------- Celebración ---------- */
function toast(text){
  const t=$("toast");t.textContent=text;
  t.animate(RM.matches?[{opacity:0},{opacity:1,offset:.15},{opacity:1,offset:.8},{opacity:0}]:[
    {opacity:0,transform:"translate(-50%,14px) scale(.8)"},{opacity:1,transform:"translate(-50%,0) scale(1.1)",offset:.2},
    {opacity:1,transform:"translate(-50%,0) scale(1)",offset:.75},{opacity:0,transform:"translate(-50%,-10px) scale(1)"}],
    {duration:1700,easing:"ease-out"});
}
function confetti(count){
  const st=getComputedStyle(document.documentElement),cols=Object.keys(FAM).map(f=>st.getPropertyValue("--"+f).trim());
  const r=$("stage").getBoundingClientRect(),vis=r.width>0,cx=vis?r.left+r.width/2:innerWidth/2,cy=vis?r.top+r.height/2:innerHeight/3;
  for(let i=0;i<count;i++){
    const p=el("span",i%3===0?"cf hex":"cf"),sz=8+Math.random()*8;
    p.style.cssText=`width:${sz}px;height:${sz}px;background:${cols[i%cols.length]};left:${cx-sz/2}px;top:${cy-sz/2}px`;
    const a=-Math.PI/2+(Math.random()-.5)*Math.PI*1.3,d=90+Math.random()*150,dx=Math.cos(a)*d,dy=Math.sin(a)*d,sp=(Math.random()-.5)*720;
    p.animate([{transform:"translate(0,0) rotate(0)",opacity:1},{transform:`translate(${dx}px,${dy}px) rotate(${sp/2}deg)`,opacity:1,offset:.45},
      {transform:`translate(${dx*1.15}px,${dy+160}px) rotate(${sp}deg) scale(.6)`,opacity:0}],
      {duration:1100+Math.random()*600,easing:"cubic-bezier(.2,.7,.4,1)"}).onfinish=()=>p.remove();
    $("fx").append(p);
  }
}
const pulse=(node,s)=>node.animate([{transform:"scale(1)"},{transform:`scale(${s})`},{transform:"scale(1)"}],{duration:450,easing:"ease-out"});
function shake(){if(!RM.matches)$("stage").animate([{transform:"translateX(0)"},{transform:"translateX(-9px)"},{transform:"translateX(9px)"},{transform:"translateX(-5px)"},{transform:"translateX(0)"}],{duration:380})}

/* ---------- Juego ---------- */
const S={deck:[],i:0,score:0,streak:0,lives:3,hits:0,miss:[],locked:false,hinted:false,type:"name"};
const PRAISE=["¡Felicidades!","¡Muy bien!","¡Exacto!","¡Así se hace!"];

const TOTAL=5;
function hud(){
  $("count").textContent=`Pregunta ${Math.min(S.i+1,TOTAL)} de ${TOTAL}`;
  $("streak").textContent="Racha "+S.streak;$("score").textContent=S.score;
}
function track(){[...$("track").children].forEach((li,i)=>{li.className=i<S.i?(S.deck[i].ok?"c":"w"):i===S.i?"n":""})}
function choices(m){
  const o=MOL.filter(x=>x!==m),same=shuffle(o.filter(x=>x.family===m.family)).slice(0,2);
  return shuffle([m,...[...same,...shuffle(o.filter(x=>!same.includes(x)))].slice(0,3)]);
}
function startGame(){
  Object.assign(S,{deck:shuffle(MOL).slice(0,TOTAL),i:0,score:0,streak:0,hits:0,log:[],locked:false});
  $("track").replaceChildren(...S.deck.map(()=>el("li")));
  $("intro").hidden=$("end").hidden=true;$("game").hidden=false;ask();
}
function ask(){
  const m=S.deck[S.i];S.locked=false;S.hinted=false;S.type="name";
  $("q").textContent=S.type==="name"?"¿Cómo se llama?":"¿A qué familia pertenece?";
  $("clue").replaceChildren(el("div",null,`Fórmula molecular ${m.formula}`),el("div","note","Cada punto es un carbono y se numera. Los hidrógenos no se dibujan. Una línea es enlace sencillo, dos líneas doble y tres líneas triple. CH₃ marca una ramificación."));$("stage").removeAttribute("data-family");
  draw($("g"),m.shape,360,200,30,50,false,true);
  const list=S.type==="name"?choices(m).map(x=>[x.name,x.name]):Object.keys(FAM).map(k=>[k,FAM[k].n]);
  $("opts").replaceChildren(...list.map(([v,t],i)=>{
    const b=el("button","opt");b.type="button";b.dataset.v=v;b.append(el("span","k",i+1),el("span",null,t));return b}));
  $("fb").replaceChildren();$("next").hidden=true;$("hintBtn").disabled=false;hud();track();
}
function hint(){
  if(S.locked||S.hinted)return;S.hinted=true;S.score=Math.max(0,S.score-5);$("hintBtn").disabled=true;hud();
  const m=S.deck[S.i],n=mainN(m.shape),sh=m.shape,extra=(sh.branches&&sh.branches.length)||sh.substituent!=null;
  const t=S.type==="family"?"Mira los enlaces: ¿todos sencillos, hay uno doble o triple, o hay un anillo?"
    :`${sh.type==="ring"?"El anillo":"La cadena principal"} tiene ${n} carbonos: prefijo "${PRE[n]}-".`+(extra?" Lleva un metilo (CH₃) como ramificación.":"");
  $("fb").replaceChildren(el("p",null,"Pista: "+t));
}
function answer(btn){
  if(S.locked)return;S.locked=true;
  const m=S.deck[S.i],good=S.type==="name"?m.name:m.family,ok=btn.dataset.v===good;m.ok=ok;
  const label=v=>S.type==="name"?v:FAM[v].n;
  S.log.push({m,type:S.type,ok,chosen:label(btn.dataset.v),correct:label(good)});
  $("opts").querySelectorAll(".opt").forEach(b=>{b.disabled=true;if(b.dataset.v===good)b.classList.add("ok");else if(b===btn)b.classList.add("no")});
  $("stage").dataset.family=m.family;
  const n=mainN(m.shape),f=FAM[m.family],v=el("strong",ok?"ok":"no");
  const tip=f.s?`Nombre = prefijo ${m.shape.type==="ring"?"ciclo-":""}${PRE[n]}- (${n} C) + terminación ${f.s}.`:"";
  if(ok){
    S.streak++;S.hits++;const gain=POINTS+(S.streak>=3?5:0);S.score+=gain;
    toast(`${S.streak>=3?`¡Racha de ${S.streak}!`:PRAISE[Math.floor(Math.random()*PRAISE.length)]} +${gain}`);
    pulse($("score"),1.6);if(!RM.matches)confetti(30);v.textContent=`Correcto, +${gain} puntos`;
  }else{
    S.streak=0;shake();v.textContent=`Era ${label(good)}`;
  }
  $("fb").replaceChildren(v,el("p",null,`${m.name}: ${m.formula}. ${f.rule} ${m.note||""}`),...(tip?[el("p",null,tip)]:[]));
  hud();$("track").children[S.i].className=ok?"c":"w";
  const last=S.i===TOTAL-1;
  $("next").textContent=last?"Ver mi nota":"Siguiente pregunta";$("next").hidden=false;$("next").focus();
}
function next(){
  if(S.i===TOTAL-1){finish();return}
  S.i++;ask();
}
function finish(){
  $("game").hidden=true;$("end").hidden=false;
  const msg=["Sigue practicando, cada intento te hace mejorar.","Sigue practicando, cada intento te hace mejorar.","Sigue practicando, cada intento te hace mejorar.",
    "¡Buen trabajo, ya casi lo dominas!","¡Excelente trabajo!","¡Perfecto! Respondiste todo bien."][S.hits];
  const pass=S.hits>=3;
  $("endTitle").textContent=pass?"¡Felicitaciones!":"Sigue practicando";
  $("grade").textContent=`Tu nota: ${S.hits},0 de 5,0`;$("grade").classList.toggle("low",!pass);
  $("endText").textContent=pass?`${msg} Sumaste ${S.score} puntos.`
    :`No alcanzaste la nota mínima (3,0). Repasa la pestaña Aprender y vuelve a intentarlo. Sumaste ${S.score} puntos.`;
  $("sign").hidden=!pass;$("toLearn").hidden=pass;
  $("answers").replaceChildren(...S.log.map((r,i)=>{
    const row=el("article","ans "+(r.ok?"good":"bad"));row.dataset.family=r.m.family;
    const svg=document.createElementNS(NS,"svg"),g=document.createElementNS(NS,"g");
    svg.setAttribute("viewBox","0 0 200 90");svg.setAttribute("class","mini");svg.append(g);draw(g,r.m.shape,200,90,22,26,false,true);
    const info=el("div");
    info.append(el("strong",null,`${i+1}. Respuesta correcta: ${r.correct}`),
      el("p",null,r.ok?"Tu respuesta fue correcta.":`Tu respuesta: ${r.chosen}.`),
      el("p","note",`${r.m.name}, ${r.m.formula}. ${FAM[r.m.family].rule}`));
    row.append(svg,info);return row;
  }));
  if(S.hits>=3&&!RM.matches){confetti(80);setTimeout(()=>confetti(50),450)}
  window.scrollTo({top:0});
}

/* ---------- Eventos ---------- */
document.querySelectorAll(".tab").forEach(t=>t.onclick=()=>{
  document.querySelectorAll(".tab").forEach(x=>x.classList.toggle("on",x===t));
  $("learn").hidden=t.dataset.tab!=="learn";$("play").hidden=t.dataset.tab!=="play";
});
$("startBtn").onclick=$("again").onclick=startGame;
$("toLearn").onclick=()=>document.querySelector("[data-tab=learn]").click();
$("next").onclick=next;$("hintBtn").onclick=hint;
$("opts").onclick=e=>{const b=e.target.closest(".opt");if(b)answer(b)};
document.onkeydown=e=>{
  if($("game").hidden||S.locked)return;
  const n=Number(e.key);if(n>=1)$("opts").children[n-1]?.click();
};
/* ---------- Fondo químico: moléculas que flotan despacio ---------- */
function buildBackground(){
  const cols=4,rows=3,cells=shuffle([...Array(cols*rows).keys()]);
  $("bg").replaceChildren(...cells.map(c=>{
    const m=MOL[Math.floor(Math.random()*MOL.length)],w=150+Math.random()*90;
    const svg=document.createElementNS(NS,"svg"),g=document.createElementNS(NS,"g");
    svg.setAttribute("viewBox","0 0 200 100");svg.dataset.family=m.family;svg.append(g);
    draw(g,m.shape,200,100,10,26,false);
    const x=(c%cols)/cols*100+Math.random()*10,y=Math.floor(c/cols)/rows*100+Math.random()*12;
    svg.style.cssText=`width:${w}px;left:${x}%;top:${y}%;transform:rotate(${Math.random()*40-20}deg)`;
    if(!RM.matches){
      const dy=14+Math.random()*18,r=Math.random()*16-8;
      svg.animate([{transform:`translateY(0) rotate(${-r}deg)`},{transform:`translateY(${dy}px) rotate(${r}deg)`}],
        {duration:9000+Math.random()*9000,direction:"alternate",iterations:Infinity,easing:"ease-in-out"});
    }
    return svg;
  }));
}
buildBackground();
renderLearn();
