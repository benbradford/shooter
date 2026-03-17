import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ headless: false, args: ['--window-size=1280,800'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });
  
  const logs = [];
  page.on('console', msg => {
    const text = msg.text();
    logs.push(text);
    if (text.includes('[PetManager]') || text.includes('[GameScene]') || text.includes('[PET]')) {
      console.log(text);
    }
  });
  
  page.on('pageerror', error => console.log('💥 CRASH:', error.message));
  
  console.log('Loading game...');
  await page.goto('http://localhost:5174');
  
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  const result = await page.evaluate(() => {
    const gameScene = window.game.scene.getScene('game');
    if (!gameScene) return { error: 'No game scene' };
    
    const petEntities = gameScene.entityManager.getByType('pet');
    const allEntities = gameScene.entityManager.getAll();
    
    return {
      petCount: petEntities.length,
      petIds: petEntities.map(e => e.id),
      totalEntities: allEntities.length,
      entityTypes: [...new Set(allEntities.map(e => e.id.replace(/\d+$/, '')))]
    };
  });
  
  console.log('\n=== Pet Spawn Test ===');
  console.log('Result:', JSON.stringify(result, null, 2));
  console.log('\n=== Relevant Logs ===');
  logs.filter(l => l.includes('[Pet') || l.includes('pet')).forEach(l => console.log(l));
  
  console.log('\nPress Ctrl+C to close...');
  await new Promise(resolve => setTimeout(resolve, 60000));
  await browser.close();
})();
