const {test}=require('node:test');
const assert=require('node:assert/strict');
const {chromium,webkit}=require('playwright');
const fs=require('node:fs');
const base=process.env.POCOBOT_TEST_URL||'http://localhost:8095';
fs.mkdirSync('test-results/tablet-panel-cards',{recursive:true});
for(const engine of [chromium,webkit]) test(`${engine.name()} tablet panel cards fill their space and remain accessible`,async()=>{
 const browser=await engine.launch();
 try{
  const page=await browser.newPage({viewport:{width:1024,height:644},hasTouch:true,isMobile:true,reducedMotion:'reduce'});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`${base}/mobile-sprite-boceto/compacto-funcional.html`);
  for(const size of [{width:1024,height:644},{width:1180,height:820},{width:1366,height:900}]){
   await page.setViewportSize(size);
   for(const count of [0,1,2,3,4]){
    await page.evaluate(count=>{
     const deck=createDeck();const player=state.players[0];
     player.core={pilot:count?deck.find(c=>c.rank==='K'&&c.suit==='spades'):null,copilot:count?deck.find(c=>c.rank==='Q'&&c.suit==='hearts'):null,booster:count?deck.find(c=>c.rank==='A'&&c.suit==='clubs'):null};
     for(const [zone,suit] of [['attack','spades'],['defense','hearts'],['armor','clubs']])player[zone]=deck.filter(c=>c.suit===suit&&Number(c.rank)>=2).slice(0,count);
     player.fuel=deck.filter(isNumericDiamond).slice(0,count===4?9:1);
     state.selected=[];render();shell.classList.add('board-open');
    },count);
    await page.waitForTimeout(300);
    const result=await page.evaluate(()=>{
     const problems=[];
     for(const zone of document.querySelectorAll('.core-slot,.zone-attack,.zone-defense,.zone-armor,.zone-fuel')){
      const bounds=zone.getBoundingClientRect(),cards=[...zone.querySelectorAll('.card')];
      for(const card of cards){
       const r=card.getBoundingClientRect();
       if(r.left<bounds.left||r.right>bounds.right||r.top<bounds.top||r.bottom>bounds.bottom)problems.push('Clipped card in '+zone.className);
       if(!card.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)))problems.push('Obscured card');
       if(zone.classList.contains('zone-attack')&&r.height<(cards.length<=2?90:60))problems.push('Module cards remain too small: '+r.height);
      }
      for(let i=1;i<cards.length;i++){
       const a=cards[i-1].getBoundingClientRect(),b=cards[i].getBoundingClientRect();
       if(a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top)problems.push('Overlapping cards');
      }
     }
     const fuel=document.querySelector('.zone-fuel').getBoundingClientRect(),foot=document.querySelector('.drawer-foot').getBoundingClientRect();
     if(fuel.bottom>foot.top||foot.bottom>innerHeight)problems.push('Fuel or controls clipped');
     return problems;
    });
    assert.deepEqual(result,[],`${size.width} / ${count} cards`);
    if(count===2||count===4)await page.screenshot({path:`test-results/tablet-panel-cards/${engine.name()}-${size.width}-${count}.png`});
   }
  }
  assert.deepEqual(errors,[]);
 }finally{await browser.close();}
});
