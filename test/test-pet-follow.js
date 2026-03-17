import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });
  
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('[Pet') || text.includes('pet_rock')) {
      console.log(text);
    }
  });
  
  await page.goto('http://localhost:5174', { waitUntil: 'networkidle0' });
  
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Enable remote input
  await page.evaluate(() => {
    const gameScene = window.game.scene.getScene('game');
    const player = gameScene.entityManager.getFirst('player');
    const { RemoteInputComponent } = window;
    player.add(new RemoteInputComponent());
  });
  
  // Check initial state
  let result = await page.evaluate(() => {
    const gameScene = window.game.scene.getScene('game');
    const player = gameScene.entityManager.getFirst('player');
    const pet = gameScene.entityManager.getFirst('pet');
    
    if (!pet) return { error: 'No pet found' };
    
    const playerTransform = player.require(window.TransformComponent);
    const petTransform = pet.require(window.TransformComponent);
    
    return {
      playerPos: { x: playerTransform.x, y: playerTransform.y },
      petPos: { x: petTransform.x, y: petTransform.y },
      distance: Math.hypot(playerTransform.x - petTransform.x, playerTransform.y - petTransform.y)
    };
  });
  
  console.log('Initial state:', result);
  
  // Move player right
  await page.evaluate(() => {
    const gameScene = window.game.scene.getScene('game');
    const player = gameScene.entityManager.getFirst('player');
    const remote = player.require(window.RemoteInputComponent);
    remote.setWalkInput(1, 0);
  });
  
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Stop
  await page.evaluate(() => {
    const gameScene = window.game.scene.getScene('game');
    const player = gameScene.entityManager.getFirst('player');
    const remote = player.require(window.RemoteInputComponent);
    remote.setWalkInput(0, 0);
  });
  
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Check if pet followed
  result = await page.evaluate(() => {
    const gameScene = window.game.scene.getScene('game');
    const player = gameScene.entityManager.getFirst('player');
    const pet = gameScene.entityManager.getFirst('pet');
    
    const playerTransform = player.require(window.TransformComponent);
    const petTransform = pet.require(window.TransformComponent);
    
    return {
      playerPos: { x: playerTransform.x, y: playerTransform.y },
      petPos: { x: petTransform.x, y: petTransform.y },
      distance: Math.hypot(playerTransform.x - petTransform.x, playerTransform.y - petTransform.y)
    };
  });
  
  console.log('After movement:', result);
  console.log('Pet followed:', result.distance < 200 ? 'YES' : 'NO');
  
  await new Promise(resolve => setTimeout(resolve, 5000));
  await browser.close();
})();
