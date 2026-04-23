const sharp = require('sharp');
const path  = require('path');
const root  = process.cwd();

/* ─── zhaocha ─── */
const svgZhaocha = `<svg xmlns='http://www.w3.org/2000/svg' width='1200' height='630' viewBox='0 0 1200 630'>
  <defs>
    <linearGradient id='sky' x1='0' y1='0' x2='0' y2='1'>
      <stop offset='0%'  stop-color='#0a1a2e'/>
      <stop offset='100%' stop-color='#0d2a1a'/>
    </linearGradient>
    <linearGradient id='ov' x1='0' y1='0' x2='1' y2='0'>
      <stop offset='0%'   stop-color='#071522' stop-opacity='0.5'/>
      <stop offset='38%'  stop-color='#071522' stop-opacity='0.82'/>
      <stop offset='65%'  stop-color='#071522' stop-opacity='0.65'/>
      <stop offset='100%' stop-color='#071522' stop-opacity='0.15'/>
    </linearGradient>
    <linearGradient id='bf' x1='0' y1='0' x2='0' y2='1'>
      <stop offset='55%' stop-color='#0a1a2e' stop-opacity='0'/>
      <stop offset='100%' stop-color='#0a1a2e' stop-opacity='0.65'/>
    </linearGradient>
    <linearGradient id='r1' x1='0' y1='1' x2='0' y2='0'>
      <stop offset='0%'  stop-color='#16412a'/>
      <stop offset='100%' stop-color='#3d7a52' stop-opacity='0.65'/>
    </linearGradient>
    <linearGradient id='r2' x1='0' y1='1' x2='0' y2='0'>
      <stop offset='0%'  stop-color='#0a2018'/>
      <stop offset='100%' stop-color='#254d34' stop-opacity='0.45'/>
    </linearGradient>
  </defs>
  <rect width='1200' height='630' fill='url(#sky)'/>
  <polygon points='0,630 0,370 150,330 300,290 450,260 580,240 700,245 820,250 950,240 1080,255 1200,270 1200,630' fill='url(#r2)'/>
  <polygon points='0,630 0,450 100,420 230,380 360,340 490,305 600,285 700,278 800,285 920,295 1040,280 1140,295 1200,310 1200,630' fill='url(#r1)'/>
  <circle cx='820' cy='110' r='65' fill='rgba(255,200,80,0.08)'/>
  <circle cx='820' cy='110' r='40' fill='rgba(255,215,100,0.14)'/>
  <circle cx='820' cy='110' r='20' fill='rgba(255,230,120,0.55)'/>
  <rect width='1200' height='630' fill='url(#ov)'/>
  <rect width='1200' height='630' fill='url(#bf)'/>

  <!-- 上：組別 -->
  <text x='120' y='145' font-family='Arial Black,Arial,sans-serif' font-size='58' font-weight='900' fill='rgba(255,255,255,0.90)' letter-spacing='-1'>12K 採茶組</text>
  <!-- 下：賽事名稱 -->
  <text x='120' y='268' font-family='Arial Black,Arial,sans-serif' font-size='98' font-weight='900' fill='#38bdf8' letter-spacing='-3'>找茶越野</text>
  <text x='122' y='318' font-family='Arial Black,Arial,sans-serif' font-size='30' font-weight='700' fill='rgba(255,255,255,0.55)'>賽道深度拆解</text>
  <line x1='120' y1='340' x2='640' y2='340' stroke='rgba(255,255,255,0.14)' stroke-width='1'/>

  <rect x='120' y='360' width='560' height='94' rx='10' fill='rgba(255,255,255,0.06)' stroke='rgba(255,255,255,0.10)' stroke-width='1'/>
  <text x='158' y='394' font-family='Arial,sans-serif' font-size='12' fill='rgba(255,255,255,0.5)'>距離</text>
  <text x='158' y='422' font-family='Arial Black,Arial,sans-serif' font-size='27' font-weight='900' fill='#60a5fa'>12.23km</text>
  <line x1='300' y1='372' x2='300' y2='440' stroke='rgba(255,255,255,0.12)' stroke-width='1'/>
  <text x='320' y='394' font-family='Arial,sans-serif' font-size='12' fill='rgba(255,255,255,0.5)'>爬升 D+</text>
  <text x='320' y='422' font-family='Arial Black,Arial,sans-serif' font-size='27' font-weight='900' fill='#f97316'>527m</text>
  <line x1='455' y1='372' x2='455' y2='440' stroke='rgba(255,255,255,0.12)' stroke-width='1'/>
  <text x='474' y='394' font-family='Arial,sans-serif' font-size='12' fill='rgba(255,255,255,0.5)'>最高海拔</text>
  <text x='474' y='422' font-family='Arial Black,Arial,sans-serif' font-size='27' font-weight='900' fill='#4ade80'>589m</text>

  <rect x='120' y='476' width='270' height='32' rx='6' fill='rgba(22,163,74,0.68)'/>
  <text x='138' y='497' font-family='Arial,sans-serif' font-size='14' font-weight='700' fill='white'>GPX × 地形 × 氣象完整分析</text>
  <text x='120' y='552' font-family='Arial,sans-serif' font-size='14' fill='rgba(255,255,255,0.40)'>2026  ·  新北市坪林  ·  08:00 起跑  ·  限時 5h</text>
  <text x='120' y='600' font-family='Arial,sans-serif' font-size='16' font-weight='700' fill='rgba(255,255,255,0.30)'>YR 運動研究室</text>
</svg>`;

/* ─── taojin ─── */
const svgTaojin = `<svg xmlns='http://www.w3.org/2000/svg' width='1200' height='630' viewBox='0 0 1200 630'>
  <defs>
    <linearGradient id='sky' x1='0' y1='0' x2='0' y2='1'>
      <stop offset='0%' stop-color='#060f1e'/>
      <stop offset='100%' stop-color='#112a1a'/>
    </linearGradient>
    <linearGradient id='ov' x1='0' y1='0' x2='1' y2='0'>
      <stop offset='0%'   stop-color='#05111f' stop-opacity='0.55'/>
      <stop offset='38%'  stop-color='#05111f' stop-opacity='0.84'/>
      <stop offset='65%'  stop-color='#05111f' stop-opacity='0.68'/>
      <stop offset='100%' stop-color='#05111f' stop-opacity='0.18'/>
    </linearGradient>
    <linearGradient id='bf' x1='0' y1='0' x2='0' y2='1'>
      <stop offset='60%' stop-color='#060f1e' stop-opacity='0'/>
      <stop offset='100%' stop-color='#060f1e' stop-opacity='0.65'/>
    </linearGradient>
    <linearGradient id='r1' x1='0' y1='1' x2='0' y2='0'>
      <stop offset='0%'  stop-color='#1a4a2e'/>
      <stop offset='100%' stop-color='#3a7a50' stop-opacity='0.7'/>
    </linearGradient>
    <linearGradient id='r2' x1='0' y1='1' x2='0' y2='0'>
      <stop offset='0%'  stop-color='#0d2a18'/>
      <stop offset='100%' stop-color='#2a5a38' stop-opacity='0.5'/>
    </linearGradient>
  </defs>
  <rect width='1200' height='630' fill='url(#sky)'/>
  <polygon points='0,630 0,340 120,300 250,240 380,170 480,130 560,100 640,115 720,140 820,170 920,140 1000,110 1060,130 1120,160 1200,180 1200,630' fill='url(#r2)'/>
  <polygon points='0,630 0,420 80,390 180,340 300,270 420,200 510,155 580,135 640,120 700,128 760,150 840,175 900,160 960,130 1020,115 1080,135 1140,170 1200,200 1200,630' fill='url(#r1)'/>
  <circle cx='940' cy='95' r='70' fill='rgba(255,160,0,0.10)'/>
  <circle cx='940' cy='95' r='45' fill='rgba(255,185,50,0.18)'/>
  <circle cx='940' cy='95' r='24' fill='rgba(255,210,80,0.60)'/>
  <circle cx='700' cy='123' r='5' fill='#f59e0b'/>
  <text x='712' y='119' font-family='Arial,sans-serif' font-size='14' fill='#fbbf24' opacity='0.9'>貂山 642m</text>
  <rect width='1200' height='630' fill='url(#ov)'/>
  <rect width='1200' height='630' fill='url(#bf)'/>

  <!-- 上：組別 -->
  <text x='120' y='148' font-family='Arial Black,Arial,sans-serif' font-size='58' font-weight='900' fill='rgba(255,255,255,0.90)' letter-spacing='-1'>20K 越野挑戰組</text>
  <!-- 下：賽事名稱 -->
  <text x='120' y='272' font-family='Arial Black,Arial,sans-serif' font-size='98' font-weight='900' fill='#4ade80' letter-spacing='-3'>淘金越野 GT</text>
  <text x='122' y='322' font-family='Arial Black,Arial,sans-serif' font-size='30' font-weight='700' fill='rgba(255,255,255,0.52)'>賽道深度拆解</text>
  <line x1='120' y1='344' x2='700' y2='344' stroke='rgba(255,255,255,0.14)' stroke-width='1'/>

  <rect x='120' y='364' width='580' height='94' rx='10' fill='rgba(255,255,255,0.06)' stroke='rgba(255,255,255,0.10)' stroke-width='1'/>
  <text x='158' y='398' font-family='Arial,sans-serif' font-size='12' fill='rgba(255,255,255,0.5)'>距離</text>
  <text x='158' y='426' font-family='Arial Black,Arial,sans-serif' font-size='27' font-weight='900' fill='#60a5fa'>19.75km</text>
  <line x1='308' y1='376' x2='308' y2='444' stroke='rgba(255,255,255,0.12)' stroke-width='1'/>
  <text x='328' y='398' font-family='Arial,sans-serif' font-size='12' fill='rgba(255,255,255,0.5)'>爬升 D+</text>
  <text x='328' y='426' font-family='Arial Black,Arial,sans-serif' font-size='27' font-weight='900' fill='#f97316'>1,387m</text>
  <line x1='480' y1='376' x2='480' y2='444' stroke='rgba(255,255,255,0.12)' stroke-width='1'/>
  <text x='500' y='398' font-family='Arial,sans-serif' font-size='12' fill='rgba(255,255,255,0.5)'>起跑體感</text>
  <text x='500' y='426' font-family='Arial Black,Arial,sans-serif' font-size='27' font-weight='900' fill='#ef4444'>33°C</text>

  <rect x='120' y='480' width='316' height='32' rx='6' fill='rgba(220,38,38,0.72)'/>
  <text x='138' y='501' font-family='Arial,sans-serif' font-size='14' font-weight='700' fill='white'>全程體感 33–39°C 高熱挑戰</text>
  <text x='120' y='554' font-family='Arial,sans-serif' font-size='14' fill='rgba(255,255,255,0.40)'>2025/09/28  ·  新北市雙溪  ·  07:30 起跑  ·  限時 6h</text>
  <text x='120' y='602' font-family='Arial,sans-serif' font-size='16' font-weight='700' fill='rgba(255,255,255,0.28)'>YR 運動研究室</text>
</svg>`;

Promise.all([
  sharp(Buffer.from(svgZhaocha)).jpeg({quality:93}).toFile(path.join(root,'assets','og-zhaocha-12k.jpg')),
  sharp(Buffer.from(svgTaojin)).jpeg({quality:93}).toFile(path.join(root,'assets','og-taojin-trail-20k.jpg')),
]).then(()=>console.log('✅ 兩張 OG 圖重製完成')).catch(e=>console.error(e));
