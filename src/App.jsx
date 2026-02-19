import { useState, useEffect, useRef, useCallback, forwardRef } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

const C = {bg:"#0a0e14",bg2:"#111820",bg3:"#1a2130",grn:"#3fdf5c",blu:"#79b8ff",red:"#ff8073",txt:"#e6edf3",txt2:"#8b949e",brd:"#21262d",amber:"#f0c040"};
const dateStr=(d=new Date())=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
const mondayOf=(d=new Date())=>{const c=new Date(d);const wd=c.getDay();c.setDate(c.getDate()-(wd===0?6:wd-1));return c;};
const goalColor=g=>g==="Bajar grasa"?C.red:g==="Ganar musculo"?C.grn:C.blu;
const goalEmoji=g=>g==="Bajar grasa"?"🔥":g==="Ganar musculo"?"💪":"⚖️";
const uid=()=>"u"+Date.now().toString(36)+Math.random().toString(36).slice(2,6);

/* ═══ localStorage wrapper ═══ */
const S={
  get:k=>{try{const v=localStorage.getItem(k);return v?{value:v}:null}catch{return null}},
  set:(k,v)=>{try{localStorage.setItem(k,v);return true}catch{return null}},
  del:k=>{try{localStorage.removeItem(k);return true}catch{return null}},
};

/* ═══ MACROS ═══ */
const calcMacros=p=>{
  const w=Number(p.weight)||70,h=Number(p.height)||170,a=Number(p.age)||30;
  const bmr=p.sex==="Masculino"?(10*w+6.25*h-5*a+5):(10*w+6.25*h-5*a-161);
  const fac={"Sedentario":1.2,"Ligero":1.375,"Moderado":1.55,"Muy activo":1.725};
  const tdee=bmr*(fac[p.activityLevel]||1.375);
  const adj=p.goal==="Bajar grasa"?-400:p.goal==="Ganar musculo"?300:-150;
  const kcal=Math.round(tdee+adj),protG=Math.round(w*(p.goal==="Ganar musculo"?2.0:1.8)),fatG=Math.round(kcal*0.25/9),carbG=Math.max(0,Math.round((kcal-protG*4-fatG*9)/4));
  return{kcal,protG,fatG,carbG};
};

/* ═══ PERSONALIZED MEAL PLAN GENERATOR ═══ */
const genMealPlan=(u)=>{
  const k=u.macros?.kcal||2000,p=u.macros?.protG||120,f=u.macros?.fatG||60,c=u.macros?.carbG||200;
  const n=parseInt(u.mealsPerDay)||4;
  const likes=(u.favProteins||"").toLowerCase();
  const dislikes=(u.dislikedFoods||"").toLowerCase();
  const favMeals=(u.favMeals||"").toLowerCase();
  const bkfStyle=u.breakfastStyle||"Completo";
  const isLoss=u.goal==="Bajar grasa",isGain=u.goal==="Ganar musculo";
  const ck=u.cookingHabit||"Mezclo";
  const times=u.mealTimes?u.mealTimes.split(",").map(t=>t.trim()):n===2?["12:00","20:00"]:n===3?["8:00","13:00","20:00"]:n>=5?["7:30","10:00","13:00","16:30","20:30"]:["8:00","12:00","16:00","20:00"];

  const ok=food=>!dislikes||!dislikes.split(",").some(d=>d.trim()&&food.toLowerCase().includes(d.trim()));
  const likesP=food=>!likes||likes.split(",").some(l=>l.trim()&&food.toLowerCase().includes(l.trim()));
  const pick=arr=>{const valid=arr.filter(a=>ok(a.n));const fav=valid.filter(a=>likesP(a.n));return(fav.length?fav:valid)[Math.floor(Math.random()*(fav.length||valid.length))]||arr[0];};

  const proteins=[
    {n:"pollo",meals:[`Pechuga de pollo grillada (200g)`,`Pollo al horno con especias (200g)`,`Pollo saltado con verduras (200g)`]},
    {n:"carne",meals:[`Bife de lomo (180g) a la plancha`,`Carne magra al horno (180g)`,`Hamburguesa casera de carne (2 x 90g)`]},
    {n:"pescado",meals:[`Salmon al horno (180g)`,`Merluza grillada (200g)`,`Atun fresco a la plancha (180g)`]},
    {n:"cerdo",meals:[`Lomo de cerdo al horno (180g)`,`Bondiola de cerdo grillada (170g)`]},
    {n:"huevo",meals:[`Tortilla de 3 huevos con verduras`,`Huevos revueltos (3) con espinaca`,`Omelette de 3 huevos con jamon y queso`]},
    {n:"legumbres",meals:[`Guiso de lentejas con verduras (300g)`,`Ensalada de garbanzos (250g)`,`Porotos negros con arroz (300g)`]},
    {n:"atun",meals:[`Ensalada de atun (1 lata) con verduras`,`Tarta de atun y verduras`,`Atun al natural (2 latas) con arroz`]},
    {n:"tofu",meals:[`Tofu firme salteado (200g) con salsa de soja`,`Tofu grillado (200g) con verduras`]},
  ];

  const carbSources=ok("arroz")?[`arroz integral (150g cocido)`,`arroz basmati (150g cocido)`]:ok("papa")?[`papa al horno (200g)`,`pure de papa (200g)`]:ok("batata")?[`batata asada (200g)`]:[`quinoa (150g cocida)`,`fideos integrales (150g cocidos)`];
  const veggies=[`ensalada mixta (lechuga, tomate, pepino)`,`brocoli al vapor (150g)`,`ensalada de rucula y tomate`,`verduras grilladas (zapallito, berenjena)`,`espinaca saltada (100g)`,`ensalada de zanahoria rallada`].filter(v=>ok(v));

  const bkfDulce=[
    {n:"avena",t:`Avena (60g) con banana ${isGain?"y mantequilla de mani (1 cda)":""}, canela`},
    {n:"pancake",t:`Pancakes de avena (3): 80g avena + 2 huevos + banana. ${isLoss?"Sin miel":"Con miel"}`},
    {n:"yogur",t:`Yogur griego (200g) con frutas, granola (${isLoss?"20g":"40g"}) y semillas`},
    {n:"smoothie",t:`Smoothie: banana, leche, avena (40g), ${isGain?"1 scoop proteina, ":""}frutos rojos`},
    {n:"tostada",t:`Tostadas integrales (2) con mermelada sin azucar y queso untable`},
  ];
  const bkfSalado=[
    {n:"huevo",t:`2 huevos revueltos con tostada integral, palta y tomate`},
    {n:"omelette",t:`Omelette de 3 huevos con jamon, queso y espinaca`},
    {n:"tostada",t:`Tostadas integrales (2) con queso, jamon y tomate`},
    {n:"wrap",t:`Wrap integral con huevo, queso y verduras`},
  ];
  const bkfRapido=[
    {n:"smoothie",t:`Smoothie proteico: banana, leche, avena (40g)${isGain?", 1 scoop proteina":""}`},
    {n:"yogur",t:`Yogur griego con banana y granola (30g) — listo en 2 min`},
    {n:"overnight",t:`Overnight oats: avena (60g) + leche + chia + frutas (preparar noche anterior)`},
  ];

  const snacks=[
    {n:"yogur",t:`Yogur griego con frutas`},
    {n:"banana",t:`Banana con mantequilla de mani (${isLoss?"1 cda":"2 cdas"})`},
    {n:"frutos",t:`Mix de frutos secos (${isLoss?"20g":"35g"}) + 1 fruta`},
    {n:"tostada",t:`Tostada integral con queso untable y tomate`},
    {n:"huevo",t:`2 huevos duros con sal y pimienta`},
    {n:"proteina",t:`Batido de proteina con leche${isGain?" y banana":""}`},
    {n:"hummus",t:`Bastones de zanahoria/apio con hummus (3 cdas)`},
    {n:"queso",t:`Queso port salut (2 fetas) con 4 galletas integrales`},
  ].filter(s=>ok(s.n));

  let plan=`🍽️ PLAN DE COMIDAS PERSONALIZADO\n`;
  plan+=`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  plan+=`🎯 ${k} kcal | P: ${p}g | G: ${f}g | C: ${c}g\n`;
  plan+=`👤 ${u.name} — ${u.goal}\n`;
  if(u.restrictions&&u.restrictions!=="ninguna")plan+=`⚠️ Restricciones: ${u.restrictions}\n`;
  if(dislikes)plan+=`🚫 Evitar: ${u.dislikedFoods}\n`;
  plan+=`\n`;

  // BREAKFAST
  let bkfPool=bkfStyle==="Dulce"?bkfDulce:bkfStyle==="Salado"?bkfSalado:bkfStyle==="Rapido"?bkfRapido:[...bkfDulce,...bkfSalado];
  let bkfPick=bkfPool.filter(b=>ok(b.n));
  if(!bkfPick.length)bkfPick=bkfPool;
  const bkf=bkfPick[Math.floor(Math.random()*bkfPick.length)];

  let mealIdx=0;
  if(n>=3){
    plan+=`☀️ DESAYUNO (${times[0]||"8:00"})\n`;
    plan+=`   ${bkf.t}\n`;
    plan+=`   + Cafe o te sin azucar\n\n`;
    mealIdx++;
  }

  // LUNCH
  if(n>=2){
    const mainProt=pick(proteins);
    const mainMeal=mainProt.meals[Math.floor(Math.random()*mainProt.meals.length)];
    const carb=carbSources[Math.floor(Math.random()*carbSources.length)];
    const veg=veggies[Math.floor(Math.random()*veggies.length)]||"ensalada mixta";
    plan+=`🥗 ALMUERZO (${times[mealIdx]||"13:00"})\n`;
    plan+=`   ${mainMeal}\n`;
    plan+=`   + ${carb}\n`;
    plan+=`   + ${veg} con aceite oliva\n\n`;
    mealIdx++;
  }

  // SNACK(S)
  if(n>=4){
    const snk=snacks[Math.floor(Math.random()*snacks.length)]||snacks[0];
    plan+=`🍎 MERIENDA (${times[mealIdx]||"16:00"})\n`;
    plan+=`   ${snk.t}\n\n`;
    mealIdx++;
  }
  if(n>=5){
    const snk2=snacks[Math.floor(Math.random()*snacks.length)]||snacks[1];
    plan+=`🍌 SNACK TARDE (${times[mealIdx]||"17:30"})\n`;
    plan+=`   ${snk2.t}\n\n`;
    mealIdx++;
  }

  // DINNER
  const dinProt=pick(proteins);
  const dinMeal=dinProt.meals[Math.floor(Math.random()*dinProt.meals.length)];
  const dinVeg=veggies[Math.floor(Math.random()*veggies.length)]||"ensalada verde";
  plan+=`🌙 CENA (${times[times.length-1]||"20:00"})\n`;
  plan+=`   ${dinMeal}\n`;
  plan+=`   + ${dinVeg}\n`;
  if(!isLoss)plan+=`   + ${carbSources[Math.floor(Math.random()*carbSources.length)]} (porcion chica)\n`;
  plan+=`\n`;

  plan+=`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  plan+=`💧 Agua: ${Math.round(Number(u.weight||70)*35/1000*10)/10}L diarios\n`;
  if(isGain)plan+=`💪 Si no llegas a ${k}kcal, agrega 1 cda aceite oliva o 30g frutos secos extra.\n`;
  if(isLoss)plan+=`🔥 Prioriza proteina y fibra para saciedad. Evita ultraprocesados.\n`;
  if(favMeals)plan+=`📌 Tus platos favoritos (${u.favMeals}) se pueden incorporar ajustando porciones.\n`;
  if(ck.includes("comprado"))plan+=`🛒 Opciones rapidas: pollo rotiseria, ensaladas preparadas, atun enlatado.\n`;
  return plan;
};

const genWorkout=(u)=>{
  const level=u.trainingLevel||"Intermedio",place=u.trainingPlace||"Gimnasio",goal=u.goal;
  const sets=level==="Principiante"?"3":level==="Avanzado"?"4-5":"3-4";
  const reps=goal==="Ganar musculo"?"8-12":goal==="Bajar grasa"?"12-15":"10-12";
  const rest=goal==="Ganar musculo"?"90s":goal==="Bajar grasa"?"45-60s":"60-90s";
  const injuries=(u.injuries||"").toLowerCase();
  let w=`💪 RUTINA DE ENTRENAMIENTO\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  w+=`📊 Nivel: ${level} | 📍 ${place} | 🎯 ${goal}\n`;
  w+=`🔢 Series: ${sets} | Reps: ${reps} | ⏱ Descanso: ${rest}\n`;
  if(injuries&&injuries!=="ninguna")w+=`⚠️ Cuidado: ${u.injuries}\n`;
  w+=`\n⏱️ CALENTAMIENTO (5-10 min)\n   Cardio suave + movilidad articular\n\n`;
  if(place==="Casa"||place==="Mixto"){
    w+=`🏠 CIRCUITO EN CASA:\n\n`;
    const exs=[`Sentadillas`,`Flexiones${level==="Principiante"?" (rodillas)":""}`,`Zancadas alternas (12 c/pierna)`,`Plancha (${level==="Principiante"?"20-30s":"45-60s"})`,`Mountain climbers (20 reps)`,`Hip thrust en piso`,`Superman (espalda) x 15`,`Burpees${level==="Principiante"?" (sin salto)":""} x ${level==="Principiante"?"6":"10"}`];
    if(injuries.includes("rodilla")){exs[0]="Sentadillas parciales (sin bajar mucho)";exs[2]="Step-ups suaves (12 c/pierna)";}
    if(injuries.includes("lumbar")){exs[3]="Plancha lateral (20s c/lado)";exs[6]="Bird-dog x 12 c/lado";}
    exs.forEach((e,i)=>{w+=`   ${i+1}. ${e}: ${sets} x ${reps}\n`;});
  }
  if(place==="Gimnasio"||place==="Mixto"){
    w+=place==="Mixto"?`\n🏋️ RUTINA EN GYM:\n\n`:`🏋️ EJERCICIOS:\n\n`;
    let exs=[`Sentadilla con barra`,`Press banca`,`Remo con barra`,`Press militar`,`Peso muerto rumano`,`Curl biceps + Extension triceps`,`Elevaciones laterales (3x15)`,`Abdominales (3x20)`];
    if(injuries.includes("rodilla")){exs[0]="Prensa de piernas (rango parcial)";}
    if(injuries.includes("hombro")){exs[1]="Press banca con mancuernas (neutro)";exs[3]="Press Arnold suave";}
    if(injuries.includes("lumbar")){exs[4]="Hip thrust con barra";}
    exs.forEach((e,i)=>{w+=`   ${i+1}. ${e}: ${sets} x ${reps}\n`;});
  }
  w+=`\n🧊 VUELTA A LA CALMA (5 min)\n   Stretching de los grupos trabajados\n`;
  if(goal==="Bajar grasa")w+=`\n🔥 FINISHER (opcional): 15 min HIIT o cardio moderado\n`;
  if(goal==="Ganar musculo")w+=`\n🍌 POST-ENTRENO: Batido proteico + carbohidrato rapido (banana)\n`;
  return w;
};

const genMedical=(u)=>{
  let m=`🩺 CONSEJOS DE SALUD PERSONALIZADOS\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
  m+=`Para ${u.name}, ${u.age} anos, ${u.weight}kg:\n\n`;
  m+=`1. 💧 Hidratacion: ${Math.round(Number(u.weight||70)*35/1000*10)/10}L agua/dia. Mas si entrenas.\n\n`;
  m+=`2. 😴 Sueno: 7-9 horas. Crucial para recuperacion y regulacion hormonal.\n\n`;
  m+=`3. 🏥 Chequeo anual: glucemia, lipidos, vitamina D, hierro, tiroides.\n\n`;
  if(u.injuries&&u.injuries!=="ninguna")m+=`4. ⚠️ ${u.injuries}: consulta kinesiologo. Fortalece la zona progresivamente.\n\n`;
  else m+=`4. 🛡️ Prevencion: calentamiento siempre, no ignores dolores persistentes.\n\n`;
  m+=`5. 💊 Suplementos: ${u.supplements&&u.supplements!=="ninguno"?u.supplements+". Verifica dosis con profesional.":"Considera vitamina D, omega-3 y proteina si no llegas al target."}\n\n`;
  m+=`6. 🧠 Manejo del estres: meditacion, caminatas, respiracion profunda.\n`;
  return m;
};

const genRecovery=(u)=>{
  let r=`🧘 PLAN DE RECUPERACION\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
  r+=`📋 STRETCHING POST-ENTRENO (10-15 min):\n\n`;
  r+=`   1. Cuadriceps de pie: 30s c/pierna\n`;
  r+=`   2. Isquiotibiales sentado: 30s c/pierna\n`;
  r+=`   3. Pecho en marco de puerta: 30s\n`;
  r+=`   4. Cat-cow (columna): 10 reps\n`;
  r+=`   5. Child's pose: 45s\n`;
  r+=`   6. Hombro cruzado: 30s c/brazo\n`;
  r+=`   7. Torsion espinal acostado: 30s c/lado\n`;
  r+=`   8. Flexores de cadera: 30s c/lado\n\n`;
  r+=`🔄 MOVILIDAD (5-10 min):\n\n`;
  r+=`   1. Circulos de cadera: 10 c/direccion\n`;
  r+=`   2. Rotaciones de hombro: 10 c/direccion\n`;
  r+=`   3. Sentadilla profunda hold: 3 x 15s\n`;
  r+=`   4. Rotaciones toraxicas: 8 c/lado\n\n`;
  r+=`😴 DESCANSO:\n\n`;
  r+=`   • 7-9 horas sueno en horario fijo\n`;
  r+=`   • Sin pantallas 30 min antes de dormir\n`;
  r+=`   • 1 dia descanso activo (caminata, yoga)\n`;
  if(u.injuries&&u.injuries!=="ninguna")r+=`   • Hielo/calor en ${u.injuries} post-entreno si hay molestia\n`;
  r+=`   • Foam roller: 1-2 min por grupo muscular\n`;
  return r;
};

const genGoldenRules=(u)=>{
  const rules=[];
  rules.push(u.goal==="Bajar grasa"?`Deficit calorico: come ${u.macros?.kcal}kcal sin saltear comidas`:u.goal==="Ganar musculo"?`Superavit controlado: ${u.macros?.kcal}kcal y ${u.macros?.protG}g proteina diarios`:`Mantene ${u.macros?.kcal}kcal: alterna dias de mas y menos calorias`);
  rules.push(`Proteina en cada comida: ~${Math.round((u.macros?.protG||120)/(parseInt(u.mealsPerDay)||4))}g por comida`);
  rules.push(`Hidratacion: ${Math.round(Number(u.weight||70)*35/1000*10)/10}L de agua minimo`);
  rules.push(u.trainingLevel==="Principiante"?"Consistencia > intensidad: mejor suave que no ir":"Progresion gradual: aumenta peso/volumen cada 1-2 semanas");
  rules.push("Dormi 7+ horas: sin descanso no hay progreso real");
  return rules;
};

const genAnalysis=(meals,u)=>{
  const count=meals.length;const hasProt=meals.some(m=>/pollo|carne|huevo|pescado|atun|protein|whey|leche|yogur|legumbres/i.test(m.desc));const hasVeg=meals.some(m=>/ensalada|verdura|brocoli|tomate|lechuga|espinaca|zapallo/i.test(m.desc));const hasCarb=meals.some(m=>/arroz|papa|batata|pan|avena|pasta|fideos/i.test(m.desc));
  const target=u.macros?.kcal||2000;const estKcal=Math.round(target*(count>=4?0.95:count===3?0.85:0.7)+(Math.random()*200-100));const estProt=Math.round((u.macros?.protG||120)*(hasProt?0.9:0.5));const estFat=Math.round((u.macros?.fatG||60)*(0.7+Math.random()*0.4));const estCarbs=Math.round((u.macros?.carbG||200)*(hasCarb?0.85:0.6));
  let score=5;if(hasProt)score+=1.5;if(hasVeg)score+=1.5;if(count>=3)score+=1;if(hasCarb)score+=0.5;score=Math.min(10,Math.max(1,Math.round(score)));
  let fb="";if(!hasProt)fb+="Falta proteina. ";if(!hasVeg)fb+="Agrega verduras. ";if(count<3)fb+="Pocas comidas. ";if(score>=7)fb+="Buen dia!";else if(score>=4)fb+="Aceptable, se puede mejorar.";else fb+="Necesitas mejorar.";
  return JSON.stringify({kcal:estKcal,prot:estProt,fat:estFat,carbs:estCarbs,score,feedback:fb.trim()});
};

/* ═══ COACH RESPONSES ═══ */
const coachResponses=[
  {k:/comida|comer|aliment|dieta|nutri|macro|calor|prote/i,r:u=>"Para "+u.goal+" con "+u.macros?.kcal+"kcal:\n\n- Distribuir "+u.macros?.protG+"g proteina en "+u.mealsPerDay+" comidas\n- Priorizar alimentos integrales\n- Verduras en almuerzo y cena\n- "+Math.round(Number(u.weight||70)*35/1000*10)/10+"L agua\n\nQueres ejemplos?"},
  {k:/entre|ejerc|ruti|peso|fuerza|cardio|gym/i,r:u=>"Nivel "+u.trainingLevel+", "+u.trainingDays+" dias/sem en "+u.trainingPlace+":\n\n- Ejercicios compuestos (sentadilla, press, remo)\n- "+(u.goal==="Bajar grasa"?"15-20 min cardio post-entreno":"Sobrecarga progresiva")+"\n- 48h descanso entre grupos grandes\n- Calentamiento 5-10 min siempre"},
  {k:/peso|kilos|baj|sub|adelgaz|grasa/i,r:u=>"Target: "+u.macros?.kcal+"kcal para "+u.goal+".\n\n- Progreso real en semanas, no dias\n- Pesate siempre misma hora\n- ~"+Math.round(Number(u.weight||70)*0.005*10)/10+"kg/semana es ritmo saludable\n- No solo balanza: espejo y ropa tambien"},
  {k:/dormir|sueno|descan|recup|estres/i,r:()=>"Descanso es fundamental:\n\n- 7-9 horas/noche\n- Horario consistente\n- Sin cafeina despues de 14:00\n- Sin pantallas 30 min antes\n- 1-2 dias descanso activo/semana"},
];

const extractJSON=raw=>{try{const c=raw.replace(/```json|```/gi,"").trim();const m=c.match(/\{[\s\S]*\}/);if(m)return JSON.parse(m[0]);}catch{}return null;};

const Input=forwardRef(({label,...props},ref)=>(<div style={{marginBottom:16,width:"100%"}}>{label&&<label style={{display:"block",marginBottom:6,color:C.txt2,fontFamily:"'DM Sans',sans-serif",fontSize:14}}>{label}</label>}<input ref={ref} {...props} style={{width:"100%",boxSizing:"border-box",background:C.bg2,border:`1px solid ${C.brd}`,borderRadius:8,color:C.txt,padding:"12px 14px",fontSize:16,fontFamily:"'DM Sans',sans-serif",outline:"none",minHeight:44,...(props.style||{})}} aria-label={props["aria-label"]||label||props.placeholder}/></div>));

const OptBtn=({label,selected,onClick})=>(<button onClick={onClick} aria-label={label} style={{width:"100%",padding:"14px 16px",marginBottom:10,borderRadius:10,border:selected?`2px solid ${C.grn}`:`1px solid ${C.brd}`,background:selected?C.bg3:C.bg2,color:selected?C.grn:C.txt,fontFamily:"'DM Sans',sans-serif",fontSize:16,cursor:"pointer",textAlign:"left",minHeight:44,transition:"all .15s"}}>{label}</button>);

/* ═══ TUTORIAL ═══ */
const TUT=[{icon:"📋",t:"Tab Hoy",d:"Registra tu peso diario y comidas. Analiza para ver calorias y macros estimados."},{icon:"📅",t:"Tab Semana",d:"Resumen semanal. Puntos: verde=comidas, amarillo=peso, azul=analisis."},{icon:"🎯",t:"Tab Mi Plan",d:"Genera planes personalizados de comidas, entrenamiento, salud y recuperacion."},{icon:"🤖",t:"Tab Coach",d:"Tu coach virtual. Preguntale sobre nutricion, ejercicios o progreso."},{icon:"📊",t:"Tab Progreso",d:"Grafico de peso, adherencia 90 dias, Reglas de Oro y gestion de perfil."}];
function Tutorial({onFinish}){const[s,setS]=useState(0);const c=TUT[s];return(<div style={{position:"fixed",inset:0,zIndex:999,background:"rgba(0,0,0,0.88)",display:"flex",alignItems:"center",justifyContent:"center",padding:20}}><div style={{maxWidth:420,width:"100%",background:C.bg2,borderRadius:20,padding:"32px 24px",textAlign:"center",border:`1px solid ${C.brd}`,animation:"fadeIn .3s"}}><div style={{fontSize:56,marginBottom:16}}>{c.icon}</div><div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:28,letterSpacing:2,color:C.grn,marginBottom:8}}>{c.t}</div><div style={{fontSize:16,color:C.txt2,lineHeight:1.6,marginBottom:28,minHeight:60}}>{c.d}</div><div style={{display:"flex",gap:6,justifyContent:"center",marginBottom:24}}>{TUT.map((_,i)=><div key={i} style={{width:i===s?24:8,height:8,borderRadius:4,background:i===s?C.grn:C.brd,transition:"all .3s"}}/>)}</div><div style={{display:"flex",gap:10}}>{s>0&&<button onClick={()=>setS(x=>x-1)} style={{flex:1,padding:14,borderRadius:10,background:C.bg3,color:C.txt,fontFamily:"'Bebas Neue',sans-serif",fontSize:18,minHeight:48}}>ANTERIOR</button>}<button onClick={()=>{if(s<TUT.length-1)setS(x=>x+1);else onFinish();}} style={{flex:1,padding:14,borderRadius:10,background:C.grn,color:C.bg,fontFamily:"'Bebas Neue',sans-serif",fontSize:18,letterSpacing:1,minHeight:48}}>{s===TUT.length-1?"COMENZAR!":"SIGUIENTE"}</button></div><button onClick={onFinish} style={{marginTop:16,color:C.txt2,fontSize:14,background:"none",border:"none",cursor:"pointer",fontFamily:"'DM Sans',sans-serif",minHeight:44}}>Saltar tutorial</button></div></div>);}

/* ═══ MAIN ═══ */
export default function BodySync(){
  const[screen,setScreen]=useState("home");const[users,setUsers]=useState([]);const[activeUser,setActiveUser]=useState(null);const[loaded,setLoaded]=useState(false);const[delConf,setDelConf]=useState(null);const[showTut,setShowTut]=useState(false);
  useEffect(()=>{const r=S.get("bs_users");if(r?.value)try{setUsers(JSON.parse(r.value))}catch{}setLoaded(true);},[]);
  const saveUsers=u=>{setUsers(u);S.set("bs_users",JSON.stringify(u));};
  const deleteUser=id=>{saveUsers(users.filter(u=>u.id!==id));setDelConf(null);};
  const finishOnboarding=(profile,tut)=>{const macros=calcMacros(profile);const full={...profile,macros,id:uid(),createdAt:dateStr()};saveUsers([...users,full]);setActiveUser(full);if(tut)setShowTut(true);setScreen("tracker");};

  if(!loaded)return(<div style={{background:C.bg,minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center"}}><div style={{color:C.grn,fontFamily:"'Bebas Neue',sans-serif",fontSize:28,letterSpacing:4}}>CARGANDO...</div></div>);
  return(
    <div style={{background:C.bg,minHeight:"100vh",fontFamily:"'DM Sans',sans-serif",color:C.txt}}>
      <style>{`button{cursor:pointer;border:none;background:none;color:inherit;font-family:inherit}input,textarea,select{font-size:16px!important}:focus-visible{outline:3px solid ${C.grn};outline-offset:2px}::-webkit-scrollbar{width:6px}::-webkit-scrollbar-track{background:${C.bg}}::-webkit-scrollbar-thumb{background:${C.brd};border-radius:3px}@keyframes fadeIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}`}</style>
      <div style={{maxWidth:500,margin:"0 auto",minHeight:"100vh",position:"relative"}}>
        {showTut&&<Tutorial onFinish={()=>setShowTut(false)}/>}
        {screen==="home"&&<HomeScreen users={users} onNew={()=>setScreen("onboarding")} onOpen={u=>{setActiveUser(u);setScreen("tracker");}} delConf={delConf} setDelConf={setDelConf} onDelete={deleteUser}/>}
        {screen==="onboarding"&&<OnboardingScreen onFinish={finishOnboarding} onBack={()=>setScreen("home")}/>}
        {screen==="tracker"&&activeUser&&<TrackerScreen user={activeUser} onHome={()=>{setScreen("home");setActiveUser(null);}} onDeleteUser={()=>{deleteUser(activeUser.id);setScreen("home");setActiveUser(null);}}/>}
      </div>
    </div>
  );
}

/* ═══ HOME ═══ */
function HomeScreen({users,onNew,onOpen,delConf,setDelConf,onDelete}){return(<div style={{padding:"40px 20px",animation:"fadeIn .4s"}}><div style={{textAlign:"center",marginBottom:40}}><div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:52,letterSpacing:6,color:C.grn,lineHeight:1}}>BODYSYNC</div><div style={{fontFamily:"'DM Mono',monospace",fontSize:13,color:C.txt2,marginTop:6,letterSpacing:2}}>AI FITNESS TRACKER</div></div>{users.length===0&&<div style={{textAlign:"center",padding:"40px 20px",color:C.txt2,fontSize:16}}><div style={{fontSize:48,marginBottom:16}}>🏋️</div>No hay perfiles. Crea uno!</div>}{users.map(u=>(<div key={u.id} style={{background:C.bg2,borderRadius:14,padding:"16px 18px",marginBottom:12,display:"flex",alignItems:"center",gap:14,border:`1px solid ${C.brd}`}}><button onClick={()=>onOpen(u)} aria-label={"Abrir "+u.name} style={{display:"flex",alignItems:"center",gap:14,flex:1,textAlign:"left",minHeight:44}}><div style={{width:46,height:46,borderRadius:"50%",background:goalColor(u.goal),display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Bebas Neue',sans-serif",fontSize:22,color:C.bg,flexShrink:0}}>{(u.name||"?").charAt(0).toUpperCase()}</div><div style={{flex:1,minWidth:0}}><div style={{fontWeight:700,fontSize:17,marginBottom:2}}>{u.name}</div><span style={{fontSize:13,color:goalColor(u.goal),fontFamily:"'DM Mono',monospace",background:goalColor(u.goal)+"18",padding:"2px 8px",borderRadius:6}}>{goalEmoji(u.goal)} {u.goal}</span></div></button>{delConf===u.id?(<div role="alertdialog" style={{display:"flex",gap:6}}><button onClick={()=>onDelete(u.id)} style={{background:C.red,color:C.bg,borderRadius:8,padding:"6px 12px",fontSize:13,fontWeight:700,minHeight:44}}>Si</button><button onClick={()=>setDelConf(null)} style={{background:C.brd,color:C.txt,borderRadius:8,padding:"6px 12px",fontSize:13,minHeight:44}}>No</button></div>):(<button onClick={()=>setDelConf(u.id)} aria-label={"Eliminar "+u.name} style={{fontSize:20,color:C.txt2,minHeight:44,minWidth:44,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>)}</div>))}<button onClick={onNew} style={{width:"100%",padding:16,marginTop:20,borderRadius:12,background:"linear-gradient(135deg,"+C.grn+",#2abf48)",color:C.bg,fontFamily:"'Bebas Neue',sans-serif",fontSize:22,letterSpacing:3,minHeight:52}}>+ NUEVO PERFIL</button></div>);}

/* ═══ ONBOARDING — 22 STEPS (4 new food prefs) ═══ */
const STEPS=[
  {key:"name",label:"Como te llamas?",type:"text",placeholder:"Tu nombre"},
  {key:"sex",label:"Sexo biologico",type:"opts",options:["Masculino","Femenino"]},
  {key:"age",label:"Cuantos anos tenes?",type:"number",min:12,max:99,placeholder:"Ej: 28"},
  {key:"weight",label:"Peso actual (kg)",type:"number",min:30,max:300,placeholder:"Ej: 75"},
  {key:"height",label:"Altura (cm)",type:"number",min:100,max:250,placeholder:"Ej: 175"},
  {key:"goal",label:"Cual es tu objetivo?",type:"opts",options:["Bajar grasa","Ganar musculo","Recomposicion corporal"]},
  {key:"focusZone",label:"Zona de enfoque (opcional)",type:"text",placeholder:"Ej: abdomen, gluteos...",optional:true},
  {key:"trainingLevel",label:"Nivel de entrenamiento",type:"opts",options:["Principiante","Intermedio","Avanzado"]},
  {key:"trainingDays",label:"Dias de entrenamiento/semana",type:"opts",options:["2","3","4","5","6"]},
  {key:"trainingPlace",label:"Donde entrenas?",type:"opts",options:["Casa","Gimnasio","Mixto"]},
  {key:"activityLevel",label:"Nivel de actividad diaria",type:"opts",options:["Sedentario","Ligero","Moderado","Muy activo"]},
  {key:"mealsPerDay",label:"Cuantas comidas/dia?",type:"opts",options:["2","3","4","5+"]},
  {key:"mealTimes",label:"Horarios de comidas (opcional)",type:"text",placeholder:"Ej: 8am, 1pm, 8pm",optional:true},
  {key:"breakfastStyle",label:"Que tipo de desayuno preferis?",type:"opts",options:["Dulce (avena, frutas, tostadas)","Salado (huevos, tostadas con queso)","Rapido (smoothie, yogur)","Completo (mezcla de todo)"]},
  {key:"favProteins",label:"Que proteinas te gustan?",type:"text",placeholder:"Ej: pollo, carne, pescado, huevos, legumbres..."},
  {key:"dislikedFoods",label:"Alimentos que NO te gustan? (opcional)",type:"text",placeholder:"Ej: brocoli, higado, mariscos...",optional:true},
  {key:"favMeals",label:"Platos o comidas favoritas? (opcional)",type:"text",placeholder:"Ej: milanesas, tacos, pasta...",optional:true},
  {key:"cookingHabit",label:"Como cocinas?",type:"opts",options:["Cocino todo","Mezclo cocina y comprado","Casi todo comprado"]},
  {key:"restrictions",label:"Restricciones alimentarias (opcional)",type:"text",placeholder:"Ej: sin lactosa, vegano, celiaco...",optional:true},
  {key:"injuries",label:"Lesiones o limitaciones (opcional)",type:"text",placeholder:"Ej: dolor lumbar, rodilla...",optional:true},
  {key:"supplements",label:"Suplementos actuales (opcional)",type:"text",placeholder:"Ej: proteina, creatina...",optional:true},
  {key:"country",label:"Pais de residencia (opcional)",type:"text",placeholder:"Ej: Argentina",optional:true},
];

function OnboardingScreen({onFinish,onBack}){
  const[step,setStep]=useState(0);const[data,setData]=useState({});const[selOpt,setSelOpt]=useState(null);const inputRef=useRef(null);const dataRef=useRef(data);dataRef.current=data;
  const cur=STEPS[step],total=STEPS.length;
  useEffect(()=>{if(cur?.type!=="opts")inputRef.current?.focus();setSelOpt(null);},[step]);
  const advance=useCallback(optVal=>{const c=STEPS[step],cd={...dataRef.current};if(optVal!==undefined)cd[c.key]=optVal;if(c.type==="text"&&!c.optional&&!(cd[c.key]||"").trim())return;if(c.type==="number"){const v=Number(cd[c.key]);if(!v||(c.min&&v<c.min)||(c.max&&v>c.max))return;}setData(cd);dataRef.current=cd;if(step<total-1)setStep(s=>s+1);else{const rules=genGoldenRules({...cd,macros:calcMacros(cd)});onFinish({...cd,goldenRules:rules},true);};},[step]);
  const handleOpt=useCallback(opt=>{setSelOpt(opt);const nd={...dataRef.current,[STEPS[step].key]:opt};setData(nd);dataRef.current=nd;setTimeout(()=>{if(step<total-1)setStep(s=>s+1);else{const rules=genGoldenRules({...nd,macros:calcMacros(nd)});onFinish({...nd,goldenRules:rules},true);}},180);},[step]);
  const setVal=v=>{const nd={...data,[cur.key]:v};setData(nd);dataRef.current=nd;};
  return(
    <div style={{padding:20,animation:"fadeIn .3s"}}>
      <div style={{display:"flex",alignItems:"center",marginBottom:24,gap:12}}><button onClick={step>0?()=>setStep(s=>s-1):onBack} aria-label="Volver" style={{fontSize:22,minHeight:44,minWidth:44,display:"flex",alignItems:"center",justifyContent:"center",color:C.txt2}}>←</button><div style={{flex:1}}><div role="progressbar" aria-valuenow={step+1} aria-valuemin={1} aria-valuemax={total} style={{height:6,background:C.bg3,borderRadius:3,overflow:"hidden"}}><div style={{height:"100%",width:((step+1)/total*100)+"%",background:C.grn,borderRadius:3,transition:"width .3s"}}/></div><div style={{fontFamily:"'DM Mono',monospace",fontSize:12,color:C.txt2,marginTop:4,textAlign:"right"}}>{step+1}/{total}</div></div></div>
      <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:28,letterSpacing:1,marginBottom:24}}>{cur.label}</div>
      {cur.type==="text"&&<div><Input ref={inputRef} placeholder={cur.placeholder} value={data[cur.key]||""} onChange={e=>setVal(e.target.value)} onKeyDown={e=>e.key==="Enter"&&advance()} aria-label={cur.label}/><button onClick={()=>advance()} style={{width:"100%",padding:14,borderRadius:10,background:C.grn,color:C.bg,fontFamily:"'Bebas Neue',sans-serif",fontSize:20,letterSpacing:2,minHeight:48}}>{cur.optional&&!(data[cur.key]||"").trim()?"SALTAR":"SIGUIENTE"}</button></div>}
      {cur.type==="number"&&<div><Input ref={inputRef} type="number" inputMode="numeric" placeholder={cur.placeholder} min={cur.min} max={cur.max} value={data[cur.key]||""} onChange={e=>setVal(e.target.value)} onKeyDown={e=>e.key==="Enter"&&advance()} aria-label={cur.label}/><div style={{fontSize:13,color:C.txt2,marginBottom:12}}>{cur.min&&cur.max?"Rango: "+cur.min+" - "+cur.max:""}</div><button onClick={()=>advance()} style={{width:"100%",padding:14,borderRadius:10,background:C.grn,color:C.bg,fontFamily:"'Bebas Neue',sans-serif",fontSize:20,letterSpacing:2,minHeight:48}}>SIGUIENTE</button></div>}
      {cur.type==="opts"&&<div>{cur.options.map(o=><OptBtn key={o} label={o} selected={selOpt===o} onClick={()=>handleOpt(o)}/>)}</div>}
    </div>
  );
}

/* ═══ TRACKER + ALL TABS ═══ */
const TABS=[{id:"hoy",label:"Hoy",icon:"📋"},{id:"semana",label:"Semana",icon:"📅"},{id:"plan",label:"Mi Plan",icon:"🎯"},{id:"coach",label:"Coach",icon:"🤖"},{id:"progreso",label:"Progreso",icon:"📊"}];
function TrackerScreen({user,onHome,onDeleteUser}){const[tab,setTab]=useState("hoy");const[viewDate,setViewDate]=useState(dateStr());return(<div style={{paddingBottom:80,animation:"fadeIn .3s"}}><div style={{padding:"16px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",borderBottom:"1px solid "+C.brd}}><button onClick={onHome} style={{fontSize:22,minHeight:44,minWidth:44,display:"flex",alignItems:"center",justifyContent:"center",color:C.txt2}}>←</button><div style={{textAlign:"center"}}><div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:20,letterSpacing:3,color:C.grn}}>BODYSYNC</div><div style={{fontSize:13,color:C.txt2}}>{user.name}</div></div><div style={{width:44}}/></div><div style={{padding:"12px 20px",display:"flex",justifyContent:"space-around",background:C.bg2,borderBottom:"1px solid "+C.brd}}>{[{l:"KCAL",v:user.macros?.kcal,c:C.amber},{l:"PROT",v:user.macros?.protG+"g",c:C.red},{l:"GRASA",v:user.macros?.fatG+"g",c:C.blu},{l:"CARBS",v:user.macros?.carbG+"g",c:C.grn}].map(m=>(<div key={m.l} style={{textAlign:"center"}}><div style={{fontFamily:"'DM Mono',monospace",fontSize:11,color:C.txt2,letterSpacing:1}}>{m.l}</div><div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:22,color:m.c}}>{m.v}</div></div>))}</div><div style={{padding:"16px 20px"}}>{tab==="hoy"&&<TabHoy user={user} viewDate={viewDate} setViewDate={setViewDate}/>}{tab==="semana"&&<TabSemana user={user} setTab={setTab} setViewDate={setViewDate}/>}{tab==="plan"&&<TabPlan user={user}/>}{tab==="coach"&&<TabCoach user={user}/>}{tab==="progreso"&&<TabProgreso user={user} onDelete={onDeleteUser}/>}</div><div role="tablist" style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:500,display:"flex",background:C.bg2,borderTop:"1px solid "+C.brd,zIndex:100}}>{TABS.map(t=>(<button key={t.id} role="tab" aria-selected={tab===t.id} onClick={()=>setTab(t.id)} style={{flex:1,padding:"10px 4px",textAlign:"center",minHeight:56,background:tab===t.id?C.bg3:"transparent",borderTop:tab===t.id?"2px solid "+C.grn:"2px solid transparent",transition:"all .2s"}}><div style={{fontSize:18}}>{t.icon}</div><div style={{fontSize:11,fontFamily:"'DM Mono',monospace",color:tab===t.id?C.grn:C.txt2,marginTop:2}}>{t.label}</div></button>))}</div></div>);}

function TabHoy({user,viewDate,setViewDate}){
  const[weight,setWeight]=useState("");const[meals,setMeals]=useState([]);const[mealTime,setMealTime]=useState("");const[mealDesc,setMealDesc]=useState("");const[analysis,setAnalysis]=useState(null);const[analyzing,setAnalyzing]=useState(false);const[savedW,setSavedW]=useState(null);
  useEffect(()=>{const wR=S.get("w:"+user.id+":"+viewDate);if(wR?.value){setWeight(wR.value);setSavedW(wR.value);}else{setWeight("");setSavedW(null);}const mR=S.get("m:"+user.id+":"+viewDate);if(mR?.value)try{setMeals(JSON.parse(mR.value))}catch{setMeals([])}else setMeals([]);const aR=S.get("a:"+user.id+":"+viewDate);if(aR?.value)setAnalysis(aR.value);else setAnalysis(null);},[viewDate]);
  const saveWeight=()=>{if(!weight)return;S.set("w:"+user.id+":"+viewDate,weight);setSavedW(weight);let h={};const hR=S.get("wh:"+user.id);if(hR?.value)try{h=JSON.parse(hR.value)}catch{}h[viewDate]=Number(weight);S.set("wh:"+user.id,JSON.stringify(h));};
  const addMeal=()=>{if(!mealDesc.trim())return;const nm=[...meals,{time:mealTime||"--:--",desc:mealDesc.trim(),id:Date.now()}];setMeals(nm);S.set("m:"+user.id+":"+viewDate,JSON.stringify(nm));setMealDesc("");setMealTime("");};
  const delMeal=id=>{const nm=meals.filter(m=>m.id!==id);setMeals(nm);S.set("m:"+user.id+":"+viewDate,JSON.stringify(nm));};
  const analyzeDay=()=>{if(!meals.length)return;setAnalyzing(true);const raw=genAnalysis(meals,user);setAnalysis(raw);S.set("a:"+user.id+":"+viewDate,raw);setAnalyzing(false);};
  const pa=analysis?extractJSON(analysis):null;const chgDate=off=>{const d=new Date(viewDate+"T12:00:00");d.setDate(d.getDate()+off);setViewDate(dateStr(d));};
  return(<div role="tabpanel" style={{animation:"fadeIn .3s"}}><div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:16,marginBottom:20}}><button onClick={()=>chgDate(-1)} style={{fontSize:20,minHeight:44,minWidth:44,display:"flex",alignItems:"center",justifyContent:"center",color:C.txt2}}>◀</button><div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:22,letterSpacing:1}}>{viewDate}</div><button onClick={()=>chgDate(1)} style={{fontSize:20,minHeight:44,minWidth:44,display:"flex",alignItems:"center",justifyContent:"center",color:C.txt2}}>▶</button></div>
    <div style={{background:C.bg2,borderRadius:12,padding:16,marginBottom:16,border:"1px solid "+C.brd}}><div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:18,marginBottom:10,letterSpacing:1,color:C.amber}}>⚖️ PESO DEL DIA</div><div style={{display:"flex",gap:10,alignItems:"center"}}><input type="number" inputMode="decimal" placeholder="kg" value={weight} onChange={e=>setWeight(e.target.value)} aria-label="Peso" style={{flex:1,background:C.bg3,border:"1px solid "+C.brd,borderRadius:8,color:C.txt,padding:"10px 14px",fontSize:16,fontFamily:"'DM Sans',sans-serif",minHeight:44}}/><button onClick={saveWeight} style={{background:C.grn,color:C.bg,borderRadius:8,padding:"10px 16px",fontFamily:"'Bebas Neue',sans-serif",fontSize:16,letterSpacing:1,minHeight:44}}>{savedW?"✓ OK":"GUARDAR"}</button></div></div>
    <div style={{background:C.bg2,borderRadius:12,padding:16,marginBottom:16,border:"1px solid "+C.brd}}><div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:18,marginBottom:10,letterSpacing:1,color:C.grn}}>🍽️ COMIDAS</div><div style={{display:"flex",gap:10,marginBottom:10}}><input type="time" value={mealTime} onChange={e=>setMealTime(e.target.value)} style={{width:110,background:C.bg3,border:"1px solid "+C.brd,borderRadius:8,color:C.txt,padding:10,fontSize:16,fontFamily:"'DM Sans',sans-serif",minHeight:44}}/><input placeholder="Descripcion..." value={mealDesc} onChange={e=>setMealDesc(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addMeal()} style={{flex:1,background:C.bg3,border:"1px solid "+C.brd,borderRadius:8,color:C.txt,padding:"10px 14px",fontSize:16,fontFamily:"'DM Sans',sans-serif",minHeight:44}}/></div><button onClick={addMeal} style={{width:"100%",padding:12,borderRadius:8,background:C.bg3,color:C.grn,border:"1px solid "+C.grn+"40",fontFamily:"'Bebas Neue',sans-serif",fontSize:16,letterSpacing:1,minHeight:44}}>+ AGREGAR</button></div>
    {meals.length>0&&<div style={{marginBottom:16}}>{meals.map(m=>(<div key={m.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",background:C.bg2,borderRadius:8,marginBottom:6,border:"1px solid "+C.brd}}><span style={{fontFamily:"'DM Mono',monospace",fontSize:14,color:C.blu,minWidth:50}}>{m.time}</span><span style={{flex:1,fontSize:15}}>{m.desc}</span><button onClick={()=>delMeal(m.id)} style={{color:C.red,fontSize:18,minHeight:44,minWidth:44,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button></div>))}</div>}
    {meals.length>0&&<button onClick={analyzeDay} disabled={analyzing} style={{width:"100%",padding:14,borderRadius:10,background:analyzing?C.bg3:"linear-gradient(135deg,"+C.blu+",#5a9eef)",color:analyzing?C.txt2:"#fff",fontFamily:"'Bebas Neue',sans-serif",fontSize:18,letterSpacing:2,minHeight:48,marginBottom:16}}>🧠 ANALIZAR COMIDAS</button>}
    {pa&&<div style={{background:C.bg2,borderRadius:12,padding:16,border:"1px solid "+C.blu+"40"}}><div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:18,color:C.blu,marginBottom:12,letterSpacing:1}}>📊 ANALISIS</div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>{[{l:"Kcal",v:pa.kcal,c:C.amber},{l:"Prot",v:pa.prot+"g",c:C.red},{l:"Grasas",v:pa.fat+"g",c:C.blu},{l:"Carbos",v:pa.carbs+"g",c:C.grn}].map(x=>(<div key={x.l} style={{background:C.bg3,borderRadius:8,padding:"10px 12px",textAlign:"center"}}><div style={{fontSize:12,color:C.txt2,fontFamily:"'DM Mono',monospace"}}>{x.l}</div><div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:24,color:x.c}}>{x.v||"—"}</div></div>))}</div><div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}><span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:18}}>Score:</span><span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:28,color:pa.score>=7?C.grn:pa.score>=4?C.amber:C.red}}>{pa.score}/10</span></div>{pa.feedback&&<div style={{fontSize:15,color:C.txt2,lineHeight:1.5}}>{pa.feedback}</div>}</div>}
    {analysis&&!pa&&<div style={{background:C.bg2,borderRadius:12,padding:16,border:"1px solid "+C.blu+"40",fontSize:15,lineHeight:1.6,whiteSpace:"pre-wrap"}}>{analysis}</div>}
  </div>);
}

function TabSemana({user,setTab,setViewDate}){const[wd,setWd]=useState({});const today=dateStr();useEffect(()=>{const mon=mondayOf();const d={};for(let i=0;i<7;i++){const dt=new Date(mon);dt.setDate(dt.getDate()+i);const ds=dateStr(dt);const wR=S.get("w:"+user.id+":"+ds);const mR=S.get("m:"+user.id+":"+ds);const aR=S.get("a:"+user.id+":"+ds);let mc=0;if(mR?.value)try{mc=JSON.parse(mR.value).length}catch{}d[ds]={weight:wR?.value||null,meals:mc,analysis:!!(aR?.value)};}setWd(d);},[]);const DAYS=["LUN","MAR","MIE","JUE","VIE","SAB","DOM"];const mon=mondayOf();const wds=Array.from({length:7},(_,i)=>{const d=new Date(mon);d.setDate(d.getDate()+i);return dateStr(d);});return(<div role="tabpanel" style={{animation:"fadeIn .3s"}}><div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:22,letterSpacing:1,marginBottom:16}}>ESTA SEMANA</div><div role="grid" style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:6,marginBottom:20}}>{wds.map((ds,i)=>{const d=wd[ds]||{};const it=ds===today;return(<button key={ds} onClick={()=>{setViewDate(ds);setTab("hoy");}} style={{padding:"10px 4px",borderRadius:10,background:it?C.bg3:C.bg2,border:it?"2px solid "+C.grn:"1px solid "+C.brd,textAlign:"center",minHeight:80,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"space-between"}}><div style={{fontFamily:"'DM Mono',monospace",fontSize:11,color:it?C.grn:C.txt2}}>{DAYS[i]}</div><div style={{fontSize:14,fontWeight:700,color:it?C.grn:C.txt,margin:"4px 0"}}>{ds.slice(8)}</div><div style={{display:"flex",gap:3,justifyContent:"center"}}>{d.meals>0&&<div style={{width:6,height:6,borderRadius:"50%",background:C.grn}}/>}{d.weight&&<div style={{width:6,height:6,borderRadius:"50%",background:C.amber}}/>}{d.analysis&&<div style={{width:6,height:6,borderRadius:"50%",background:C.blu}}/>}</div></button>);})}</div><div style={{background:C.bg2,borderRadius:12,padding:16,border:"1px solid "+C.brd}}><div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:18,marginBottom:12,letterSpacing:1}}>RESUMEN</div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>{[{l:"COMIDAS",v:Object.values(wd).reduce((s,d)=>s+(d.meals||0),0),c:C.grn},{l:"PESAJES",v:Object.values(wd).filter(d=>d.weight).length+"/7",c:C.amber},{l:"ANALISIS",v:Object.values(wd).filter(d=>d.analysis).length+"/7",c:C.blu}].map(x=>(<div key={x.l} style={{textAlign:"center"}}><div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:28,color:x.c}}>{x.v}</div><div style={{fontSize:12,color:C.txt2,fontFamily:"'DM Mono',monospace"}}>{x.l}</div></div>))}</div></div></div>);}

function AIBlock({title,emoji,sKey,genFn}){const[content,setContent]=useState(null);const[loading,setLoading]=useState(false);const[loaded,setLoaded]=useState(false);useEffect(()=>{const r=S.get(sKey);if(r?.value)setContent(r.value);setLoaded(true);},[sKey]);const generate=()=>{setLoading(true);setContent(null);setTimeout(()=>{const result=genFn();setContent(result);S.set(sKey,result);setLoading(false);},50);};if(!loaded)return null;return(<div style={{background:C.bg2,borderRadius:12,padding:16,marginBottom:14,border:"1px solid "+C.brd}}><div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:content?12:0}}><div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:18,letterSpacing:1}}>{emoji} {title}</div><button onClick={generate} disabled={loading} style={{background:loading?C.bg3:C.grn,color:loading?C.txt2:C.bg,borderRadius:8,padding:"8px 14px",fontFamily:"'DM Mono',monospace",fontSize:13,minHeight:44}}>{content?"REGENERAR":"GENERAR"}</button></div>{content&&<div style={{fontSize:15,lineHeight:1.7,color:C.txt2,whiteSpace:"pre-wrap",marginTop:8,wordBreak:"break-word"}}>{content}</div>}</div>);}

function TabPlan({user}){const td=dateStr();return(<div role="tabpanel" style={{animation:"fadeIn .3s"}}><div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:22,letterSpacing:1,marginBottom:16}}>MI PLAN — {td}</div><AIBlock title="PLAN DE COMIDAS" emoji="🍽️" sKey={"pf:"+user.id+":"+td} genFn={()=>genMealPlan(user)}/><AIBlock title="ENTRENAMIENTO" emoji="💪" sKey={"pw:"+user.id+":"+td} genFn={()=>genWorkout(user)}/><AIBlock title="CONSEJO MEDICO" emoji="🩺" sKey={"pm:"+user.id+":"+td} genFn={()=>genMedical(user)}/><AIBlock title="RECUPERACION" emoji="🧘" sKey={"pr:"+user.id+":"+td} genFn={()=>genRecovery(user)}/></div>);}

function TabCoach({user}){const[msgs,setMsgs]=useState([]);const[input,setInput]=useState("");const chatRef=useRef(null);useEffect(()=>{if(chatRef.current)chatRef.current.scrollTop=chatRef.current.scrollHeight;},[msgs]);const localReply=msg=>{for(const cr of coachResponses){if(cr.k.test(msg))return cr.r(user);}return"Con tu perfil ("+user.goal+", "+user.trainingLevel+", "+user.macros?.kcal+"kcal), mantene consistencia. Registra comidas, entrena "+user.trainingDays+" dias/sem y prioriza descanso. Preguntame algo especifico!";};const send=()=>{if(!input.trim())return;const um=input.trim();setInput("");setMsgs(p=>[...p,{role:"user",content:um}]);setTimeout(()=>{setMsgs(p=>[...p,{role:"assistant",content:localReply(um)}]);},300);};return(<div role="tabpanel" style={{animation:"fadeIn .3s"}}><div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:22,letterSpacing:1,marginBottom:16}}>🤖 COACH</div><div ref={chatRef} role="log" style={{maxHeight:"55vh",overflowY:"auto",marginBottom:16,padding:4}}>{msgs.length===0&&<div style={{textAlign:"center",color:C.txt2,padding:"30px 10px",fontSize:15}}>Preguntame sobre entrenamiento, nutricion o tu progreso!</div>}{msgs.map((m,i)=>(<div key={i} style={{display:"flex",justifyContent:m.role==="user"?"flex-end":"flex-start",marginBottom:10}}><div style={{maxWidth:"85%",padding:"12px 16px",borderRadius:m.role==="user"?"14px 14px 4px 14px":"14px 14px 14px 4px",background:m.role==="user"?C.grn+"22":C.bg2,border:"1px solid "+(m.role==="user"?C.grn+"40":C.brd),fontSize:15,lineHeight:1.6,whiteSpace:"pre-wrap",color:m.role==="user"?C.txt:C.txt2}}>{m.content}</div></div>))}</div><div style={{display:"flex",gap:10}}><textarea value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send();}}} placeholder="Escribi tu mensaje..." rows={2} style={{flex:1,background:C.bg2,border:"1px solid "+C.brd,borderRadius:10,color:C.txt,padding:"12px 14px",fontSize:16,fontFamily:"'DM Sans',sans-serif",resize:"none",minHeight:44}}/><button onClick={send} style={{background:C.grn,color:C.bg,borderRadius:10,padding:"12px 16px",fontFamily:"'Bebas Neue',sans-serif",fontSize:18,letterSpacing:1,minHeight:44,alignSelf:"flex-end"}}>→</button></div></div>);}

function TabProgreso({user,onDelete}){const[wh,setWh]=useState({});const[adh,setAdh]=useState({meals:0,weights:0,analyses:0,plans:0});const[delC,setDelC]=useState(false);useEffect(()=>{const hR=S.get("wh:"+user.id);if(hR?.value)try{setWh(JSON.parse(hR.value))}catch{}let mc=0,wc=0,ac=0,pc=0;const now=new Date();for(let i=0;i<90;i++){const d=new Date(now);d.setDate(d.getDate()-i);const ds=dateStr(d);try{if(S.get("m:"+user.id+":"+ds)?.value&&JSON.parse(S.get("m:"+user.id+":"+ds).value).length>0)mc++;}catch{}if(S.get("w:"+user.id+":"+ds)?.value)wc++;if(S.get("a:"+user.id+":"+ds)?.value)ac++;if(S.get("pf:"+user.id+":"+ds)?.value)pc++;}setAdh({meals:mc,weights:wc,analyses:ac,plans:pc});},[]);const cd=[];const co=new Date();co.setDate(co.getDate()-60);Object.entries(wh).sort((a,b)=>a[0].localeCompare(b[0])).forEach(([d,kg])=>{if(new Date(d+"T12:00:00")>=co)cd.push({date:d.slice(5),kg:Number(kg)});});return(<div role="tabpanel" style={{animation:"fadeIn .3s"}}><div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:22,letterSpacing:1,marginBottom:16}}>📊 PROGRESO</div>{cd.length>1?(<div style={{background:C.bg2,borderRadius:12,padding:16,marginBottom:16,border:"1px solid "+C.brd}}><div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:16,marginBottom:12,color:C.amber,letterSpacing:1}}>PESO — 60 DIAS</div><ResponsiveContainer width="100%" height={200}><LineChart data={cd}><CartesianGrid strokeDasharray="3 3" stroke={C.brd}/><XAxis dataKey="date" stroke={C.txt2} tick={{fontSize:11,fontFamily:"'DM Mono',monospace"}}/><YAxis stroke={C.txt2} tick={{fontSize:11,fontFamily:"'DM Mono',monospace"}} domain={["dataMin-2","dataMax+2"]}/><Tooltip contentStyle={{background:C.bg2,border:"1px solid "+C.brd,borderRadius:8,fontSize:14}}/><Line type="monotone" dataKey="kg" stroke={C.grn} strokeWidth={2} dot={{fill:C.grn,r:4}} activeDot={{r:6}}/></LineChart></ResponsiveContainer></div>):(<div style={{background:C.bg2,borderRadius:12,padding:24,marginBottom:16,textAlign:"center",color:C.txt2,border:"1px solid "+C.brd}}>Registra al menos 2 dias de peso</div>)}
    <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:16,marginBottom:10,letterSpacing:1}}>ADHERENCIA — 90 DIAS</div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:20}}>{[{l:"Comidas",v:adh.meals+"/90",c:C.grn,p:Math.round(adh.meals/90*100)},{l:"Peso",v:adh.weights+"/90",c:C.amber,p:Math.round(adh.weights/90*100)},{l:"Analisis",v:adh.analyses+"/90",c:C.blu,p:Math.round(adh.analyses/90*100)},{l:"Planes",v:adh.plans+"/90",c:C.red,p:Math.round(adh.plans/90*100)}].map(a=>(<div key={a.l} style={{background:C.bg2,borderRadius:10,padding:14,border:"1px solid "+C.brd}}><div style={{fontSize:12,color:C.txt2,fontFamily:"'DM Mono',monospace",marginBottom:6}}>{a.l}</div><div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:26,color:a.c}}>{a.v}</div><div role="progressbar" style={{height:4,background:C.bg3,borderRadius:2,marginTop:6,overflow:"hidden"}}><div style={{height:"100%",width:a.p+"%",background:a.c,borderRadius:2}}/></div></div>))}</div>
    {user.goldenRules?.length>0&&(<div style={{background:C.bg2,borderRadius:12,padding:16,marginBottom:20,border:"1px solid "+C.grn+"30"}}><div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:16,marginBottom:12,color:C.grn,letterSpacing:1}}>⭐ REGLAS DE ORO</div>{user.goldenRules.map((r,i)=><div key={i} style={{padding:"8px 0",borderBottom:i<user.goldenRules.length-1?"1px solid "+C.brd:"none",fontSize:15,color:C.txt2,lineHeight:1.5}}><span style={{color:C.grn,fontWeight:700,marginRight:8}}>{i+1}.</span>{r}</div>)}</div>)}
    <div style={{background:C.red+"10",borderRadius:12,padding:16,border:"1px solid "+C.red+"30"}}><div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:16,color:C.red,marginBottom:12,letterSpacing:1}}>⚠️ ZONA DE PELIGRO</div>{delC?(<div><div style={{fontSize:15,color:C.txt2,marginBottom:12}}>Seguro? Se eliminara todo.</div><div style={{display:"flex",gap:10}}><button onClick={onDelete} style={{flex:1,background:C.red,color:"#fff",borderRadius:8,padding:12,fontFamily:"'Bebas Neue',sans-serif",fontSize:16,minHeight:44}}>ELIMINAR</button><button onClick={()=>setDelC(false)} style={{flex:1,background:C.brd,color:C.txt,borderRadius:8,padding:12,fontFamily:"'Bebas Neue',sans-serif",fontSize:16,minHeight:44}}>CANCELAR</button></div></div>):(<button onClick={()=>setDelC(true)} style={{width:"100%",padding:12,borderRadius:8,border:"1px solid "+C.red,color:C.red,fontFamily:"'Bebas Neue',sans-serif",fontSize:16,letterSpacing:1,minHeight:44,background:"transparent"}}>ELIMINAR PERFIL</button>)}</div>
  </div>);}
