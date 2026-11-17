import {chromium,expect} from '@playwright/test';
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox','--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try {
const page=await browser.newPage({viewport:{width:1280,height:900}});
const cdp=await page.context().newCDPSession(page);
await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
await page.goto(process.env.PREVIEW_URL ?? 'http://localhost:3000',{waitUntil:'networkidle'});
await expect(page.locator('canvas')).toHaveAttribute('data-ready','true');
await page.waitForTimeout(1500);
await page.evaluate(()=>{window.perfEvents=[];new PerformanceObserver(list=>window.perfEvents.push(...list.getEntries().map(e=>({name:e.name,duration:e.duration,processing:e.processingEnd-e.processingStart,delay:e.processingStart-e.startTime})))).observe({type:'event',buffered:true,durationThreshold:16});});
const runs=[];
for(let run=0;run<3;run++){
await page.keyboard.press('Control+k');await expect(page.locator('.notch-input')).toBeFocused();await page.waitForTimeout(400);
await page.keyboard.press('Escape');await expect(page.locator('.notch')).toHaveAttribute('data-open','false');
await page.waitForTimeout(400);
const frames=await page.evaluate(()=>new Promise(resolve=>{const ms=[];let p;function tick(t){if(p!==undefined)ms.push(t-p);p=t;if(ms.length<120)requestAnimationFrame(tick);else resolve({fps:Math.round(1000/(ms.reduce((a,b)=>a+b)/ms.length)),long:ms.filter(x=>x>50).length});}requestAnimationFrame(tick);}));
runs.push(frames);
}
console.log(JSON.stringify({runs,events:await page.evaluate(()=>window.perfEvents)},null,2));
}finally{await browser.close();}
