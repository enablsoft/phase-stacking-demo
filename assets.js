// Phaser texture generation for player, log, and house
function createTextures(scene) {
    // Player: blue rectangle
    const playerGfx = scene.add.graphics();
    playerGfx.fillStyle(0x3366ff, 1);
    playerGfx.fillRect(0, 0, 32, 48);
    playerGfx.generateTexture('player', 32, 48);
    playerGfx.destroy();
  
    // Log: brown rounded rectangle
    const logGfx = scene.add.graphics();
    logGfx.fillStyle(0x8B5A2B, 1);
    logGfx.fillRoundedRect(0, 0, 32, 12, 6);
    logGfx.lineStyle(2, 0x5C3317, 1);
    logGfx.strokeRoundedRect(0, 0, 32, 12, 6);
    logGfx.generateTexture('log', 32, 12);
    logGfx.destroy();
  
    // House: yellow square with red roof
    const houseGfx = scene.add.graphics();
    houseGfx.fillStyle(0xFFD700, 1);
    houseGfx.fillRect(0, 16, 48, 32);
    houseGfx.fillStyle(0xCC3333, 1);
    houseGfx.fillTriangle(0, 16, 24, 0, 48, 16);
    houseGfx.generateTexture('house', 48, 48);
    houseGfx.destroy();
  }
  