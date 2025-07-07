// Phaser stacking game demo
const config = {
    type: Phaser.AUTO,
    width: window.innerWidth,
    height: Math.floor(window.innerHeight * 0.8),
    backgroundColor: '#cceeff',
    parent: 'game-container',
    physics: { default: 'arcade', arcade: { gravity: { y: 0 }, debug: false } },
    input: {
        keyboard: true,
        mouse: true,
        touch: true,
        gamepad: false
    },
    scene: { preload, create, update }
};

let player, cursors, logs, houses, stack = [], carrying = 0, maxCarry = 5, carryText;
let houseData = [];
let houseTexts = [];
let trees;
let camera;
let moveButtons = {};
let gameInstance; // Store game instance globally
let currentLevel = 1;
let currentScene;
let successPopup;
let targetPosition = null;
let isMovingToTarget = false;
let moveSpeed = 180;
let gameStarted = false;
let gameStats = {
    currentLevel: 1,
    highestLevel: 1,
    totalLogs: 0,
    gamesPlayed: 0
};
let levelData = {}; // Store generated level data

// Level configuration
const LEVEL_CONFIG = {
    1: { width: 800, height: 800, houses: 1, requirements: [8], maxLogs: 30 },
    2: { width: 1000, height: 1000, houses: 2, requirements: [10, 12], maxLogs: 40 },
    3: { width: 1200, height: 1200, houses: 3, requirements: [12, 15, 18], maxLogs: 50 },
    4: { width: 1400, height: 1400, houses: 4, requirements: [15, 18, 20, 25], maxLogs: 60 },
    5: { width: 1600, height: 1600, houses: 5, requirements: [18, 20, 25, 30, 35], maxLogs: 70 }
};

const LOG_RESPAWN_INTERVAL = 2000; // ms - faster respawn
const MIN_HOUSE_DISTANCE = 200; // Minimum distance between houses

// Load level from local storage
function loadLevel() {
    const savedLevel = localStorage.getItem('stackingGameLevel');
    currentLevel = savedLevel ? parseInt(savedLevel) : 1;
    return currentLevel;
}

// Save level to local storage
function saveLevel(level) {
    localStorage.setItem('stackingGameLevel', level.toString());
}

// Load game stats from local storage
function loadGameStats() {
    const savedStats = localStorage.getItem('stackingGameStats');
    if (savedStats) {
        gameStats = JSON.parse(savedStats);
    }
    return gameStats;
}

// Save game stats to local storage
function saveGameStats() {
    localStorage.setItem('stackingGameStats', JSON.stringify(gameStats));
}

// Update stats display
function updateStatsDisplay() {
    document.getElementById('current-level').textContent = gameStats.currentLevel;
    document.getElementById('highest-level').textContent = gameStats.highestLevel;
    document.getElementById('total-logs').textContent = gameStats.totalLogs;
    document.getElementById('games-played').textContent = gameStats.gamesPlayed;
}

// Show appropriate menu based on progress
function showAppropriateMenu() {
    // Don't show any menus if the game is already started
    if (gameStarted) {
        document.getElementById('first-time-menu').style.display = 'none';
        document.getElementById('main-menu').style.display = 'none';
        return;
    }
    
    if (gameStats.gamesPlayed === 0) {
        // First time player - show simple start menu
        document.getElementById('first-time-menu').style.display = 'flex';
        document.getElementById('main-menu').style.display = 'none';
    } else {
        // Returning player - show full main menu
        document.getElementById('first-time-menu').style.display = 'none';
        document.getElementById('main-menu').style.display = 'flex';
    }
}

// Load level data from local storage
function loadLevelData() {
    const savedLevelData = localStorage.getItem('stackingGameLevelData');
    if (savedLevelData) {
        levelData = JSON.parse(savedLevelData);
    }
    return levelData;
}

// Save level data to local storage
function saveLevelData() {
    localStorage.setItem('stackingGameLevelData', JSON.stringify(levelData));
}

// Generate level data for a specific level
function generateLevelData(level) {
    const levelConfig = LEVEL_CONFIG[level];
    const data = {
        houses: [],
        requirements: levelConfig.requirements,
        width: levelConfig.width,
        height: levelConfig.height,
        maxLogs: levelConfig.maxLogs
    };
    
    // Generate house positions (same algorithm as in create function)
    let housePositions = [];
    for (let i = 0; i < levelConfig.houses; i++) {
        let attempts = 0;
        let validPosition = false;
        let hx, hy;
        
        while (!validPosition && attempts < 100) {
            hx = Phaser.Math.Between(100, levelConfig.width-100);
            hy = Phaser.Math.Between(100, levelConfig.height-100);
            validPosition = true;
            
            // Check distance from other houses
            for (let pos of housePositions) {
                let distance = Phaser.Math.Distance.Between(hx, hy, pos.x, pos.y);
                if (distance < MIN_HOUSE_DISTANCE) {
                    validPosition = false;
                    break;
                }
            }
            attempts++;
        }
        
        if (validPosition) {
            housePositions.push({x: hx, y: hy});
            data.houses.push({
                x: hx,
                y: hy,
                required: levelConfig.requirements[i],
                delivered: 0
            });
        }
    }
    
    return data;
}

// Create game scene without starting gameplay (for background display)
function createGameScene(scene, levelConfig, FOREST_WIDTH, FOREST_HEIGHT, NUM_HOUSES, HOUSE_REQUIREMENTS, MAX_LOGS) {
    // Get or generate level data for the current level
    const currentLevel = loadLevel();
    if (!levelData[currentLevel]) {
        levelData[currentLevel] = generateLevelData(currentLevel);
        saveLevelData();
    }
    const currentLevelData = levelData[currentLevel];
    
    // World bounds
    scene.physics.world.setBounds(0, 0, FOREST_WIDTH, FOREST_HEIGHT);
    scene.cameras.main.setBounds(0, 0, FOREST_WIDTH, FOREST_HEIGHT);

    // Draw ground
    for (let x = 0; x < FOREST_WIDTH; x += 64) {
        for (let y = 0; y < FOREST_HEIGHT; y += 32) {
            scene.add.image(x, y, 'ground').setAlpha(0.7);
        }
    }

    // Generate sparse forest
    trees = scene.add.group();
    for (let x = 0; x < FOREST_WIDTH; x += 48) {
        for (let y = 0; y < FOREST_HEIGHT; y += 48) {
            if (Math.random() < 0.4) {
                let tree = scene.add.image(x + Phaser.Math.Between(-8,8), y + Phaser.Math.Between(-8,8), 'tree');
                tree.setScale(0.8 + Math.random()*0.3);
                trees.add(tree);
            }
        }
    }

    // Add houses using saved level data
    houses = scene.physics.add.staticGroup();
    for (let i = 0; i < currentLevelData.houses.length; i++) {
        const houseInfo = currentLevelData.houses[i];
        let house = houses.create(houseInfo.x, houseInfo.y, 'house').setScale(1.1);
        house.refreshBody();
    }

    // Add player at center (but don't enable controls)
    player = scene.physics.add.sprite(FOREST_WIDTH/2, FOREST_HEIGHT/2, 'player').setScale(1.2);
    player.setCollideWorldBounds(true);

    // Camera follows player closely
    camera = scene.cameras.main;
    camera.startFollow(player, true, 0.12, 0.12);
    camera.setZoom(2.2);

    // Add logs group
    logs = scene.physics.add.group();
    for (let i = 0; i < Math.floor(MAX_LOGS * 0.5); i++) {
        spawnLog(scene, FOREST_WIDTH, FOREST_HEIGHT);
    }
}

// Create visual target indicator
function createTargetIndicator(scene, x, y) {
    // Remove any existing target indicator
    const existingIndicator = scene.children.getByName('targetIndicator');
    if (existingIndicator) {
        existingIndicator.destroy();
    }
    
    // Create new target indicator
    const indicator = scene.add.circle(x, y, 20, 0x00ff00, 0.3).setName('targetIndicator');
    indicator.setDepth(10);
    
    // Add a pulsing animation
    scene.tweens.add({
        targets: indicator,
        scaleX: 1.5,
        scaleY: 1.5,
        alpha: 0.1,
        duration: 1000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
    });
    
    // Remove indicator after 3 seconds
    scene.time.delayedCall(3000, () => {
        if (indicator && indicator.active) {
            indicator.destroy();
        }
    });
}

function preload() {
    this.load.image('player', 'assets/player.png');
    this.load.image('log', 'assets/log.png');
    this.load.image('house', 'assets/house.png');
    this.load.image('tree', 'assets/tree.png');
    this.load.image('ground', 'assets/ground.png');
}

window.addEventListener('resize', () => {
    if (gameInstance) {
        gameInstance.scale.resize(window.innerWidth, Math.floor(window.innerHeight * 0.8));
    }
});

function create() {
    currentScene = this;
    
    // Load game stats and level data
    loadGameStats();
    loadLevelData();
    updateStatsDisplay();
    showAppropriateMenu();
    
    // Load current level configuration first
    currentLevel = loadLevel();
    const levelConfig = LEVEL_CONFIG[currentLevel] || LEVEL_CONFIG[1];
    
    // Update game world size based on level
    const FOREST_WIDTH = levelConfig.width;
    const FOREST_HEIGHT = levelConfig.height;
    const NUM_HOUSES = levelConfig.houses;
    const HOUSE_REQUIREMENTS = levelConfig.requirements;
    const MAX_LOGS = levelConfig.maxLogs;
    
    // For first-time players, show the game scene as background
    if (!gameStarted && gameStats.gamesPlayed === 0) {
        // Create the game scene but don't start gameplay
        createGameScene(this, levelConfig, FOREST_WIDTH, FOREST_HEIGHT, NUM_HOUSES, HOUSE_REQUIREMENTS, MAX_LOGS);
        return;
    }
    
    // For returning players, show the current level as background
    if (!gameStarted && gameStats.gamesPlayed > 0) {
        // Create the game scene for the current level but don't start gameplay
        createGameScene(this, levelConfig, FOREST_WIDTH, FOREST_HEIGHT, NUM_HOUSES, HOUSE_REQUIREMENTS, MAX_LOGS);
        return;
    }
    
    // Don't start the game immediately - wait for menu
    if (!gameStarted) {
        return;
    }
    
    // Get or generate level data for this level
    if (!levelData[currentLevel]) {
        levelData[currentLevel] = generateLevelData(currentLevel);
        saveLevelData();
    }
    const currentLevelData = levelData[currentLevel];
    
    // World bounds
    this.physics.world.setBounds(0, 0, FOREST_WIDTH, FOREST_HEIGHT);
    this.cameras.main.setBounds(0, 0, FOREST_WIDTH, FOREST_HEIGHT);

    // Draw ground
    for (let x = 0; x < FOREST_WIDTH; x += 64) {
        for (let y = 0; y < FOREST_HEIGHT; y += 32) {
            this.add.image(x, y, 'ground').setAlpha(0.7);
        }
    }

    // Generate sparse forest (reduced tree density)
    trees = this.add.group();
    for (let x = 0; x < FOREST_WIDTH; x += 48) { // Increased spacing
        for (let y = 0; y < FOREST_HEIGHT; y += 48) { // Increased spacing
            if (Math.random() < 0.4) { // Reduced probability
                let tree = this.add.image(x + Phaser.Math.Between(-8,8), y + Phaser.Math.Between(-8,8), 'tree');
                tree.setScale(0.8 + Math.random()*0.3);
                trees.add(tree);
            }
        }
    }

    // Add houses using saved level data
    houses = this.physics.add.staticGroup();
    
    for (let i = 0; i < currentLevelData.houses.length; i++) {
        const houseInfo = currentLevelData.houses[i];
        let house = houses.create(houseInfo.x, houseInfo.y, 'house').setScale(1.1);
        house.refreshBody();
    }

    // Add player at center
    player = this.physics.add.sprite(FOREST_WIDTH/2, FOREST_HEIGHT/2, 'player').setScale(1.2);
    player.setCollideWorldBounds(true);

    // Camera follows player closely (first-person-like)
    camera = this.cameras.main;
    camera.startFollow(player, true, 0.12, 0.12);
    camera.setZoom(2.2); // Close view for immersion

    // Add logs group (scattered throughout the map)
    logs = this.physics.add.group();
    for (let i = 0; i < Math.floor(MAX_LOGS * 0.5); i++) { // Initial logs
        spawnLog(this, FOREST_WIDTH, FOREST_HEIGHT);
    }

    // Setup HTML controls
    setupHTMLControls(this);
    
    // Show in-game menu button
    document.getElementById('game-menu-btn').style.display = 'flex';
    
    // Setup gameplay functionality
    setupGameplay(this);
    
    // Setup keyboard controls
    setupKeyboardControls(this);
    
    console.log('Game creation complete. Player:', player, 'Logs:', logs, 'Houses:', houses);
}

function setupHTMLControls(scene) {
    console.log('Setting up HTML controls...');
    
    // Clear existing event listeners by cloning and replacing elements
    const collectBtn = document.getElementById('collect-btn');
    const deliverBtn = document.getElementById('deliver-btn');
    const leftBtn = document.getElementById('btn-left');
    const rightBtn = document.getElementById('btn-right');
    const upBtn = document.getElementById('btn-up');
    const downBtn = document.getElementById('btn-down');
    
    console.log('Found buttons:', { collectBtn, deliverBtn, leftBtn, rightBtn, upBtn, downBtn });
    
    // Clone and replace to remove all event listeners
    const newCollectBtn = collectBtn.cloneNode(true);
    const newDeliverBtn = deliverBtn.cloneNode(true);
    const newLeftBtn = leftBtn.cloneNode(true);
    const newRightBtn = rightBtn.cloneNode(true);
    const newUpBtn = upBtn.cloneNode(true);
    const newDownBtn = downBtn.cloneNode(true);
    
    collectBtn.parentNode.replaceChild(newCollectBtn, collectBtn);
    deliverBtn.parentNode.replaceChild(newDeliverBtn, deliverBtn);
    leftBtn.parentNode.replaceChild(newLeftBtn, leftBtn);
    rightBtn.parentNode.replaceChild(newRightBtn, rightBtn);
    upBtn.parentNode.replaceChild(newUpBtn, upBtn);
    downBtn.parentNode.replaceChild(newDownBtn, downBtn);
    
    // Reset move buttons state
    moveButtons = { _left: false, _right: false, _up: false, _down: false };
    
    // Collect button
    newCollectBtn.addEventListener('click', () => {
        console.log('Collect button clicked!');
        performCollectAction(scene);
    });
    newCollectBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        console.log('Collect button touched!');
        performCollectAction(scene);
    });
    
    // Deliver button
    newDeliverBtn.addEventListener('click', () => {
        console.log('Deliver button clicked!');
        performDeliverAction(scene);
    });
    newDeliverBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        console.log('Deliver button touched!');
        performDeliverAction(scene);
    });
    
    // Arrow button controls
    newLeftBtn.addEventListener('touchstart', () => {
        console.log('Left button pressed');
        moveButtons._left = true;
    });
    newLeftBtn.addEventListener('touchend', () => {
        console.log('Left button released');
        moveButtons._left = false;
    });
    newRightBtn.addEventListener('touchstart', () => {
        console.log('Right button pressed');
        moveButtons._right = true;
    });
    newRightBtn.addEventListener('touchend', () => {
        console.log('Right button released');
        moveButtons._right = false;
    });
    newUpBtn.addEventListener('touchstart', () => {
        console.log('Up button pressed');
        moveButtons._up = true;
    });
    newUpBtn.addEventListener('touchend', () => {
        console.log('Up button released');
        moveButtons._up = false;
    });
    newDownBtn.addEventListener('touchstart', () => {
        console.log('Down button pressed');
        moveButtons._down = true;
    });
    newDownBtn.addEventListener('touchend', () => {
        console.log('Down button released');
        moveButtons._down = false;
    });

    // Also support mouse for desktop
    ['mousedown', 'touchstart'].forEach(evt => {
      newLeftBtn.addEventListener(evt, () => {
          console.log('Left button pressed (mouse/touch)');
          moveButtons._left = true;
      });
      newRightBtn.addEventListener(evt, () => {
          console.log('Right button pressed (mouse/touch)');
          moveButtons._right = true;
      });
      newUpBtn.addEventListener(evt, () => {
          console.log('Up button pressed (mouse/touch)');
          moveButtons._up = true;
      });
      newDownBtn.addEventListener(evt, () => {
          console.log('Down button pressed (mouse/touch)');
          moveButtons._down = true;
      });
    });
    ['mouseup', 'mouseleave', 'touchend', 'touchcancel'].forEach(evt => {
      newLeftBtn.addEventListener(evt, () => moveButtons._left = false);
      newRightBtn.addEventListener(evt, () => moveButtons._right = false);
      newUpBtn.addEventListener(evt, () => moveButtons._up = false);
      newDownBtn.addEventListener(evt, () => moveButtons._down = false);
    });
    
    console.log('HTML controls setup complete');
}

function performCollectAction(scene) {
    console.log('performCollectAction called');
    console.log('Player:', player);
    console.log('Logs group:', logs);
    console.log('Carrying:', carrying, 'Max carry:', maxCarry);
    
    if (!player || !logs) {
        console.log('Player or logs not found!');
        return;
    }
    
    // Try to pick up log
    scene.physics.overlap(player, logs, (player, log) => {
        console.log('Overlap detected with log:', log);
        if (!log.getData('collected') && carrying < maxCarry) {
            console.log('Collecting log!');
            log.setData('collected', true);
            log.destroy(); // Actually destroy the log sprite
            carrying++;
            updateCarryText();
            stack.push({});
            console.log('Log collected! New carrying count:', carrying);
        } else {
            console.log('Cannot collect log. Collected:', log.getData('collected'), 'Carrying:', carrying, 'Max:', maxCarry);
        }
    });
    
    // If no overlap found, log that too
    if (!scene.physics.overlap(player, logs)) {
        console.log('No logs in range to collect');
    }
}

function performDeliverAction(scene) {
    // Try to unload at a house
    scene.physics.overlap(player, houses, (player, house) => {
        let idx = house.getData('index');
        let h = houseData[idx];
        if (carrying > 0 && h.delivered < h.required) {
            let deliver = Math.min(carrying, h.required - h.delivered);
            h.delivered += deliver;
            carrying -= deliver;
            stack.splice(0, deliver);
            updateCarryText();
            houseTexts[idx].setText(`Delivered: ${h.delivered} / ${h.required}`);
            
            // Update stats
            gameStats.totalLogs += deliver;
            saveGameStats();
            
            // Update level data
            levelData[currentLevel].houses[idx].delivered = h.delivered;
            saveLevelData();
            
            // Check if level is complete
            checkLevelComplete();
        }
    });
}

function checkLevelComplete() {
    const levelConfig = LEVEL_CONFIG[currentLevel];
    const allComplete = houseData.every(house => house.delivered >= house.required);
    
    if (allComplete) {
        showSuccessPopup();
    }
}

function showSuccessPopup() {
    // Create popup overlay
    const popup = document.createElement('div');
    popup.id = 'success-popup';
    popup.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.7);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
    `;
    
    const popupContent = document.createElement('div');
    popupContent.style.cssText = `
        background: white;
        padding: 30px;
        border-radius: 15px;
        text-align: center;
        max-width: 400px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.3);
    `;
    
    popupContent.innerHTML = `
        <h2 style="color: #4CAF50; margin-bottom: 20px;">🎉 Level ${currentLevel} Complete! 🎉</h2>
        <p style="margin-bottom: 25px; font-size: 18px;">Great job! You've delivered all the logs!</p>
        <div style="display: flex; gap: 15px; justify-content: center;">
            <button id="replay-btn" style="
                padding: 12px 24px;
                background: #2196F3;
                color: white;
                border: none;
                border-radius: 8px;
                font-size: 16px;
                cursor: pointer;
            ">Replay Level</button>
            <button id="next-btn" style="
                padding: 12px 24px;
                background: #4CAF50;
                color: white;
                border: none;
                border-radius: 8px;
                font-size: 16px;
                cursor: pointer;
            ">Next Level</button>
        </div>
    `;
    
    popup.appendChild(popupContent);
    document.body.appendChild(popup);
    
    // Button event listeners
    document.getElementById('replay-btn').addEventListener('click', () => {
        document.body.removeChild(popup);
        restartLevel();
    });
    
    document.getElementById('next-btn').addEventListener('click', () => {
        document.body.removeChild(popup);
        nextLevel();
    });
}

function restartLevel() {
    // Reset game state
    carrying = 0;
    stack = [];
    updateCarryText();
    
    // Reset target movement
    isMovingToTarget = false;
    targetPosition = null;
    
    // Remove any target indicators
    if (currentScene) {
        const indicator = currentScene.children.getByName('targetIndicator');
        if (indicator) {
            indicator.destroy();
        }
    }
    
    // Restart the scene
    currentScene.scene.restart();
}

function nextLevel() {
    const nextLevelNum = currentLevel + 1;
    if (LEVEL_CONFIG[nextLevelNum]) {
        saveLevel(nextLevelNum);
        currentLevel = nextLevelNum;
        
        // Update stats
        gameStats.currentLevel = nextLevelNum;
        if (nextLevelNum > gameStats.highestLevel) {
            gameStats.highestLevel = nextLevelNum;
        }
        saveGameStats();
        
        restartLevel();
    } else {
        // Game complete - show final message
        const popup = document.createElement('div');
        popup.id = 'game-complete-popup';
        popup.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.7);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
        `;
        
        const popupContent = document.createElement('div');
        popupContent.style.cssText = `
            background: white;
            padding: 30px;
            border-radius: 15px;
            text-align: center;
            max-width: 400px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        `;
        
        popupContent.innerHTML = `
            <h2 style="color: #FF9800; margin-bottom: 20px;">🏆 Congratulations! 🏆</h2>
            <p style="margin-bottom: 25px; font-size: 18px;">You've completed all levels! You're a master logger!</p>
            <button id="restart-game-btn" style="
                padding: 12px 24px;
                background: #2196F3;
                color: white;
                border: none;
                border-radius: 8px;
                font-size: 16px;
                cursor: pointer;
            ">Play Again</button>
        `;
        
        popup.appendChild(popupContent);
        document.body.appendChild(popup);
        
        document.getElementById('restart-game-btn').addEventListener('click', () => {
            document.body.removeChild(popup);
            saveLevel(1);
            currentLevel = 1;
            restartLevel();
        });
    }
}

function spawnLog(scene, forestWidth, forestHeight) {
    // Spawn logs throughout the map, not too close to houses
    let safe = false, x, y;
    let attempts = 0;
    
    while (!safe && attempts < 50) {
        x = Phaser.Math.Between(50, forestWidth-50);
        y = Phaser.Math.Between(50, forestHeight-50);
        safe = true;
        
        // Check distance from houses
        for (let house of houses.getChildren()) {
            let distance = Phaser.Math.Distance.Between(x, y, house.x, house.y);
            if (distance < 80) {
                safe = false;
                break;
            }
        }
        attempts++;
    }
    
    if (safe) {
        const log = scene.physics.add.sprite(x, y, 'log');
        log.setData('collected', false);
        logs.add(log);
    }
}

function update() {
    // Don't update if game hasn't started or player doesn't exist
    if (!gameStarted || !player) {
        return;
    }
    
    // Player movement (free movement throughout the map)
    player.setVelocity(0);
    
    // Check if we're moving to a target position
    if (isMovingToTarget && targetPosition) {
        const distance = Phaser.Math.Distance.Between(player.x, player.y, targetPosition.x, targetPosition.y);
        
        if (distance > 10) { // If not close enough to target
            // Calculate direction to target
            const angle = Phaser.Math.Angle.Between(player.x, player.y, targetPosition.x, targetPosition.y);
            const velocityX = Math.cos(angle) * moveSpeed;
            const velocityY = Math.sin(angle) * moveSpeed;
            
            player.setVelocity(velocityX, velocityY);
        } else {
            // Reached target
            isMovingToTarget = false;
            targetPosition = null;
            
            // Remove target indicator
            const indicator = player.scene.children.getByName('targetIndicator');
            if (indicator) {
                indicator.destroy();
            }
        }
    } else {
        // Manual controls (only if not moving to target)
        // Keyboard controls
        let left = cursors.left.isDown || moveButtons._left;
        let right = cursors.right.isDown || moveButtons._right;
        let up = cursors.up.isDown || moveButtons._up;
        let down = cursors.down.isDown || moveButtons._down;
        
        // Debug movement controls
        if (left || right || up || down) {
            console.log('Movement detected:', { left, right, up, down, moveButtons });
        }
        
        // Cancel target movement if using manual controls
        if (left || right || up || down) {
            isMovingToTarget = false;
            targetPosition = null;
            
            // Remove target indicator
            const indicator = player.scene.children.getByName('targetIndicator');
            if (indicator) {
                indicator.destroy();
            }
        }
        
        // Keyboard movement
        if (left) player.setVelocityX(-180);
        else if (right) player.setVelocityX(180);
        if (up) player.setVelocityY(-180);
        else if (down) player.setVelocityY(180);
    }

    // Draw stack on player's back
    stack.forEach((_, i) => {
        let logSprite = player.scene.children.getByName('stack' + i);
        if (!logSprite) {
            logSprite = player.scene.add.sprite(player.x, player.y - 30 - i * 14, 'log').setName('stack' + i);
            logSprite.setDepth(1);
        }
        logSprite.x = player.x;
        logSprite.y = player.y - 30 - i * 14;
        logSprite.setVisible(true);
    });
    // Hide unused stack sprites
    let i = stack.length;
    while (true) {
        let logSprite = player.scene.children.getByName('stack' + i);
        if (!logSprite) break;
        logSprite.setVisible(false);
        i++;
    }
}

function updateCarryText() {
    if (carryText) carryText.setText('Carrying: ' + carrying + ' / ' + maxCarry);
}

// Setup gameplay functionality
function setupGameplay(scene) {
    // Load current level
    currentLevel = loadLevel();
    const levelConfig = LEVEL_CONFIG[currentLevel] || LEVEL_CONFIG[1];
    
    // Update game world size based on level
    const FOREST_WIDTH = levelConfig.width;
    const FOREST_HEIGHT = levelConfig.height;
    const NUM_HOUSES = levelConfig.houses;
    const HOUSE_REQUIREMENTS = levelConfig.requirements;
    const MAX_LOGS = levelConfig.maxLogs;
    
    // Get or generate level data for this level
    if (!levelData[currentLevel]) {
        levelData[currentLevel] = generateLevelData(currentLevel);
        saveLevelData();
    }
    const currentLevelData = levelData[currentLevel];
    
    // Setup house data and texts
    houseData = [];
    houseTexts = [];
    
    for (let i = 0; i < currentLevelData.houses.length; i++) {
        const houseInfo = currentLevelData.houses[i];
        let house = houses.getChildren()[i];
        house.setData('index', i);
        houseData.push({
            required: houseInfo.required,
            delivered: houseInfo.delivered || 0
        });
        let txt = scene.add.text(houseInfo.x, houseInfo.y-50, `Delivered: ${houseInfo.delivered || 0} / ${houseInfo.required}`,
            { font: '20px Arial', fill: '#1976d2', fontWeight: 'bold', backgroundColor: '#fff8' }).setOrigin(0.5);
        houseTexts.push(txt);
    }

    // Input
    cursors = scene.input.keyboard.createCursorKeys();
    scene.input.keyboard.on('keydown-SPACE', () => {
        // Check if near a house first (deliver), otherwise collect
        let nearHouse = false;
        scene.physics.overlap(player, houses, (player, house) => {
            nearHouse = true;
        });
        
        if (nearHouse && carrying > 0) {
            performDeliverAction(scene);
        } else {
            performCollectAction(scene);
        }
    });

    // UI
    carryText = scene.add.text(16, 16, '', { font: '20px Arial', fill: '#222', backgroundColor: '#fff8' });
    carryText.setScrollFactor(0);
    
    // Level text
    let levelText = scene.add.text(16, 50, `Level ${currentLevel}`, { font: '24px Arial', fill: '#1976d2', fontWeight: 'bold', backgroundColor: '#fff8' });
    levelText.setScrollFactor(0);
    
    updateCarryText();

    // Regenerate logs over time
    scene.time.addEvent({
        delay: LOG_RESPAWN_INTERVAL,
        loop: true,
        callback: () => {
            if (logs.countActive(true) < MAX_LOGS) {
                spawnLog(scene, FOREST_WIDTH, FOREST_HEIGHT);
            }
        }
    });
    
    // Add tap-to-move functionality
    scene.input.on('pointerdown', (pointer) => {
        console.log('Tap detected at screen coordinates:', pointer.x, pointer.y);
        
        // Convert screen coordinates to world coordinates
        const worldPoint = scene.cameras.main.getWorldPoint(pointer.x, pointer.y);
        console.log('World coordinates:', worldPoint.x, worldPoint.y);
        console.log('Game bounds:', FOREST_WIDTH, FOREST_HEIGHT);
        
        // Check if the tap is within the game world bounds
        if (worldPoint.x >= 0 && worldPoint.x <= FOREST_WIDTH && 
            worldPoint.y >= 0 && worldPoint.y <= FOREST_HEIGHT) {
            
            console.log('Tap is within bounds, setting target position');
            
            // Set target position for automatic movement
            targetPosition = { x: worldPoint.x, y: worldPoint.y };
            isMovingToTarget = true;
            
            // Create a visual indicator at the target location
            createTargetIndicator(scene, worldPoint.x, worldPoint.y);
        } else {
            console.log('Tap is outside game bounds');
        }
    });
    
    // Also add touch events specifically for mobile
    scene.input.on('pointerdown', (pointer) => {
        console.log('Pointer down event triggered');
    });
    
    // Enable input on the game container
    scene.input.setDefaultCursor('pointer');
    scene.input.enabled = true;
}

// Setup menu controls
function setupMenuControls() {
    // First time start game button
    document.getElementById('first-start-game-btn').addEventListener('click', () => {
        console.log('First time start game button clicked');
        
        gameStarted = true;
        gameStats.gamesPlayed++;
        saveGameStats();
        document.getElementById('first-time-menu').style.display = 'none';
        
        // Reset current level data for fresh start
        const currentLevel = loadLevel();
        if (levelData[currentLevel]) {
            levelData[currentLevel].houses.forEach(house => {
                house.delivered = 0;
            });
            saveLevelData();
        }
        
        // Create a new game instance to ensure fresh start
        if (gameInstance) {
            gameInstance.destroy();
        }
        gameInstance = new Phaser.Game(config);
    });
    
    // Main menu start game button
    document.getElementById('start-game-btn').addEventListener('click', () => {
        console.log('Continue Game button clicked');
        
        gameStarted = true;
        gameStats.gamesPlayed++;
        saveGameStats();
        document.getElementById('main-menu').style.display = 'none';
        
        // Reset current level data for fresh start
        const currentLevel = loadLevel();
        if (levelData[currentLevel]) {
            levelData[currentLevel].houses.forEach(house => {
                house.delivered = 0;
            });
            saveLevelData();
        }
        
        // Create a new game instance to ensure fresh start
        if (gameInstance) {
            gameInstance.destroy();
        }
        gameInstance = new Phaser.Game(config);
    });
    
    // Level select button
    document.getElementById('level-select-btn').addEventListener('click', () => {
        document.getElementById('main-menu').style.display = 'none';
        document.getElementById('level-select-menu').style.display = 'flex';
        generateLevelThumbnails();
    });
    
    // Instructions button
    document.getElementById('instructions-btn').addEventListener('click', () => {
        document.getElementById('main-menu').style.display = 'none';
        document.getElementById('instructions-menu').style.display = 'flex';
    });
    
    // Stats button
    document.getElementById('stats-btn').addEventListener('click', () => {
        document.getElementById('main-menu').style.display = 'none';
        document.getElementById('stats-menu').style.display = 'flex';
        updateStatsDisplay();
    });
    
    // Reset progress button
    document.getElementById('reset-progress-btn').addEventListener('click', () => {
        document.getElementById('main-menu').style.display = 'none';
        document.getElementById('reset-confirmation').style.display = 'flex';
    });
    
    // Reset confirmation controls
    document.getElementById('cancel-reset-btn').addEventListener('click', () => {
        document.getElementById('reset-confirmation').style.display = 'none';
        document.getElementById('main-menu').style.display = 'flex';
    });
    
    document.getElementById('confirm-reset-btn').addEventListener('click', () => {
        // Clear all saved data
        localStorage.removeItem('stackingGameLevel');
        localStorage.removeItem('stackingGameStats');
        localStorage.removeItem('stackingGameLevelData');
        
        // Reset game stats
        gameStats = {
            currentLevel: 1,
            highestLevel: 1,
            totalLogs: 0,
            gamesPlayed: 0
        };
        levelData = {};
        
        // Update display and return to first-time menu
        updateStatsDisplay();
        document.getElementById('reset-confirmation').style.display = 'none';
        showAppropriateMenu();
        
        // Show success message
        showMessage('Progress reset! Starting from Level 1.', 'success');
    });
    
    // Exit game button
    document.getElementById('exit-game-btn').addEventListener('click', () => {
        // Show exit confirmation popup
        const popup = document.createElement('div');
        popup.className = 'menu-overlay';
        popup.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.7);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 2000;
        `;
        
        const popupContent = document.createElement('div');
        popupContent.className = 'menu-content';
        popupContent.innerHTML = `
            <h2 style="color: #f44336; margin-bottom: 20px;">🚪 Exit Game</h2>
            <p style="margin-bottom: 25px; font-size: 16px; color: #666;">
                Are you sure you want to exit the game?<br>
                Your progress will be saved.
            </p>
            <div style="display: flex; gap: 15px; justify-content: center;">
                <button id="cancel-exit-game-btn" style="
                    padding: 12px 24px;
                    background: #2196F3;
                    color: white;
                    border: none;
                    border-radius: 8px;
                    font-size: 16px;
                    cursor: pointer;
                ">Cancel</button>
                <button id="confirm-exit-game-btn" style="
                    padding: 12px 24px;
                    background: #f44336;
                    color: white;
                    border: none;
                    border-radius: 8px;
                    font-size: 16px;
                    cursor: pointer;
                ">Exit Game</button>
            </div>
        `;
        
        popup.appendChild(popupContent);
        document.body.appendChild(popup);
        
        document.getElementById('cancel-exit-game-btn').addEventListener('click', () => {
            document.body.removeChild(popup);
        });
        
        document.getElementById('confirm-exit-game-btn').addEventListener('click', () => {
            // Return to first-time menu (main scene)
            document.body.removeChild(popup);
            document.getElementById('main-menu').style.display = 'none';
            document.getElementById('first-time-menu').style.display = 'flex';
            
            // Reset game stats to show first-time menu
            gameStats.gamesPlayed = 0;
            saveGameStats();
        });
    });
    
    // Back to menu buttons
    document.getElementById('back-to-menu-btn').addEventListener('click', () => {
        document.getElementById('stats-menu').style.display = 'none';
        document.getElementById('main-menu').style.display = 'flex';
    });
    
    document.getElementById('back-to-menu-from-levels-btn').addEventListener('click', () => {
        document.getElementById('level-select-menu').style.display = 'none';
        document.getElementById('main-menu').style.display = 'flex';
    });
    
    document.getElementById('back-from-instructions-btn').addEventListener('click', () => {
        document.getElementById('instructions-menu').style.display = 'none';
        document.getElementById('main-menu').style.display = 'flex';
    });
    
    // In-game menu controls
    document.getElementById('game-menu-btn').addEventListener('click', () => {
        document.getElementById('in-game-menu').style.display = 'flex';
    });
    
    document.getElementById('resume-game-btn').addEventListener('click', () => {
        document.getElementById('in-game-menu').style.display = 'none';
    });
    
    document.getElementById('restart-level-btn').addEventListener('click', () => {
        // Show restart confirmation
        const popup = document.createElement('div');
        popup.className = 'menu-overlay';
        popup.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.7);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 2000;
            padding: 20px;
            box-sizing: border-box;
        `;
        
        const popupContent = document.createElement('div');
        popupContent.className = 'menu-content';
        popupContent.innerHTML = `
            <h2 style="color: #FF9800; margin-bottom: 20px; font-size: clamp(18px, 4vw, 24px);">⚠️ Restart Level</h2>
            <p style="margin-bottom: 25px; font-size: clamp(14px, 3.5vw, 16px); color: #666; line-height: 1.4;">
                Are you sure you want to restart this level?<br>
                All progress for this level will be lost.
            </p>
            <div style="display: flex; gap: 15px; justify-content: center; flex-wrap: wrap;">
                <button id="cancel-restart-btn" style="
                    padding: clamp(10px, 2.5vw, 12px) clamp(20px, 5vw, 24px);
                    background: #2196F3;
                    color: white;
                    border: none;
                    border-radius: 8px;
                    font-size: clamp(14px, 3.5vw, 16px);
                    cursor: pointer;
                    min-width: 80px;
                ">Cancel</button>
                <button id="confirm-restart-btn" style="
                    padding: clamp(10px, 2.5vw, 12px) clamp(20px, 5vw, 24px);
                    background: #FF9800;
                    color: white;
                    border: none;
                    border-radius: 8px;
                    font-size: clamp(14px, 3.5vw, 16px);
                    cursor: pointer;
                    min-width: 80px;
                ">Restart Level</button>
            </div>
        `;
        
        popup.appendChild(popupContent);
        document.body.appendChild(popup);
        
        document.getElementById('cancel-restart-btn').addEventListener('click', () => {
            document.body.removeChild(popup);
        });
        
        document.getElementById('confirm-restart-btn').addEventListener('click', () => {
            // Reset level progress
            levelData[currentLevel].houses.forEach(house => {
                house.delivered = 0;
            });
            saveLevelData();
            
            document.body.removeChild(popup);
            document.getElementById('in-game-menu').style.display = 'none';
            restartLevel();
        });
    });
    
    document.getElementById('exit-to-menu-btn').addEventListener('click', () => {
        // Show exit confirmation
        const popup = document.createElement('div');
        popup.className = 'menu-overlay';
        popup.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.7);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 2000;
            padding: 20px;
            box-sizing: border-box;
        `;
        
        const popupContent = document.createElement('div');
        popupContent.className = 'menu-content';
        popupContent.innerHTML = `
            <h2 style="color: #2196F3; margin-bottom: 20px; font-size: clamp(18px, 4vw, 24px);">🏠 Exit to Menu</h2>
            <p style="margin-bottom: 25px; font-size: clamp(14px, 3.5vw, 16px); color: #666; line-height: 1.4;">
                Are you sure you want to exit to menu?<br>
                Your current progress will be saved.
            </p>
            <div style="display: flex; gap: 15px; justify-content: center; flex-wrap: wrap;">
                <button id="cancel-exit-btn" style="
                    padding: clamp(10px, 2.5vw, 12px) clamp(20px, 5vw, 24px);
                    background: #2196F3;
                    color: white;
                    border: none;
                    border-radius: 8px;
                    font-size: clamp(14px, 3.5vw, 16px);
                    cursor: pointer;
                    min-width: 80px;
                ">Cancel</button>
                <button id="confirm-exit-btn" style="
                    padding: clamp(10px, 2.5vw, 12px) clamp(20px, 5vw, 24px);
                    background: #4CAF50;
                    color: white;
                    border: none;
                    border-radius: 8px;
                    font-size: clamp(14px, 3.5vw, 16px);
                    cursor: pointer;
                    min-width: 80px;
                ">Exit to Menu</button>
            </div>
        `;
        
        popup.appendChild(popupContent);
        document.body.appendChild(popup);
        
        document.getElementById('cancel-exit-btn').addEventListener('click', () => {
            document.body.removeChild(popup);
        });
        
        document.getElementById('confirm-exit-btn').addEventListener('click', () => {
            // Save current progress
            houseData.forEach((house, index) => {
                if (levelData[currentLevel] && levelData[currentLevel].houses[index]) {
                    levelData[currentLevel].houses[index].delivered = house.delivered;
                }
            });
            saveLevelData();
            
            // Return to main menu
            gameStarted = false;
            document.body.removeChild(popup);
            document.getElementById('in-game-menu').style.display = 'none';
            document.getElementById('game-menu-btn').style.display = 'none';
            document.getElementById('main-menu').style.display = 'flex';
            
            // Reset game state
            carrying = 0;
            stack = [];
            isMovingToTarget = false;
            targetPosition = null;
        });
    });
}

// Generate level thumbnails
function generateLevelThumbnails() {
    const levelGrid = document.getElementById('level-grid');
    levelGrid.innerHTML = '';
    
    Object.keys(LEVEL_CONFIG).forEach(levelNum => {
        const level = parseInt(levelNum);
        const levelConfig = LEVEL_CONFIG[level];
        
        // Get or generate level data
        if (!levelData[level]) {
            levelData[level] = generateLevelData(level);
            saveLevelData();
        }
        
        const levelInfo = levelData[level];
        const isUnlocked = level <= gameStats.highestLevel + 1;
        const isCompleted = level < gameStats.currentLevel;
        const isCurrent = level === gameStats.currentLevel;
        
        const thumbnail = document.createElement('div');
        thumbnail.className = `level-thumbnail ${!isUnlocked ? 'locked' : ''}`;
        thumbnail.onclick = () => {
            if (isUnlocked) {
                selectLevel(level);
            }
        };
        
        let statusClass = 'locked';
        if (isCompleted) statusClass = 'completed';
        else if (isCurrent) statusClass = 'current';
        
        thumbnail.innerHTML = `
            <div class="level-status ${statusClass}"></div>
            <div class="level-number">Level ${level}</div>
            <div class="level-info">Map: ${levelConfig.width}×${levelConfig.height}</div>
            <div class="level-info">Houses: ${levelConfig.houses}</div>
            <div class="level-info">Total Required: ${levelConfig.requirements.reduce((a, b) => a + b, 0)} logs</div>
            ${!isUnlocked ? '<div class="level-info" style="color: #f44336;">🔒 Locked</div>' : ''}
            ${isCompleted ? '<div class="level-info" style="color: #4CAF50;">✅ Completed</div>' : ''}
            ${isCurrent ? '<div class="level-info" style="color: #FF9800;">🎯 Current</div>' : ''}
        `;
        
        levelGrid.appendChild(thumbnail);
    });
}

// Select a level to play
function selectLevel(level) {
    saveLevel(level);
    currentLevel = level;
    gameStats.currentLevel = level;
    saveGameStats();
    
    // Reset level data for the selected level
    if (levelData[level]) {
        // Reset all house delivered counts to 0
        levelData[level].houses.forEach(house => {
            house.delivered = 0;
        });
        saveLevelData();
    }
    
    document.getElementById('level-select-menu').style.display = 'none';
    gameStarted = true;
    currentScene.scene.restart();
}

// Show a message popup
function showMessage(message, type = 'info') {
    const popup = document.createElement('div');
    popup.className = 'menu-overlay';
    popup.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.7);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 2000;
        padding: 20px;
        box-sizing: border-box;
    `;
    
    const popupContent = document.createElement('div');
    popupContent.className = 'menu-content';
    popupContent.style.cssText = `
        background: white;
        padding: 25px 20px;
        border-radius: 15px;
        text-align: center;
        max-width: 90vw;
        max-height: 90vh;
        overflow-y: auto;
        box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        box-sizing: border-box;
    `;
    
    const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️';
    const color = type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3';
    
    popupContent.innerHTML = `
        <h2 style="color: ${color}; margin-bottom: 20px; font-size: clamp(18px, 4vw, 24px);">${icon} ${type.charAt(0).toUpperCase() + type.slice(1)}</h2>
        <p style="margin-bottom: 25px; font-size: clamp(14px, 3.5vw, 18px); line-height: 1.4;">${message}</p>
        <button id="ok-btn" style="
            padding: clamp(10px, 2.5vw, 12px) clamp(20px, 5vw, 24px);
            background: ${color};
            color: white;
            border: none;
            border-radius: 8px;
            font-size: clamp(14px, 3.5vw, 16px);
            cursor: pointer;
            min-width: 80px;
        ">OK</button>
    `;
    
    popup.appendChild(popupContent);
    document.body.appendChild(popup);
    
    // Auto-remove after 3 seconds or when OK is clicked
    const removePopup = () => {
        if (popup.parentNode) {
            popup.parentNode.removeChild(popup);
        }
    };
    
    document.getElementById('ok-btn').addEventListener('click', removePopup);
    setTimeout(removePopup, 3000);
}

// Setup keyboard controls
function setupKeyboardControls(scene) {
    // Remove existing keyboard event listener if it exists
    if (window.gameKeyboardHandler) {
        document.removeEventListener('keydown', window.gameKeyboardHandler);
    }
    
    // Create new keyboard handler
    window.gameKeyboardHandler = (event) => {
        // Always allow Escape to open the in-game menu
        if (event.key === 'Escape') {
            event.preventDefault();
            document.getElementById('in-game-menu').style.display = 'flex';
            return;
        }
        // Only handle other keyboard events when game is active
        if (!gameStarted) return;
        switch(event.key) {
            case ' ':
                event.preventDefault();
                // Spacebar for collect action
                performCollectAction(scene);
                break;
            case 'Enter':
                event.preventDefault();
                // Enter for deliver action
                performDeliverAction(scene);
                break;
        }
    };
    
    // Add the new keyboard event listener
    document.addEventListener('keydown', window.gameKeyboardHandler);
}

// Setup menu controls after DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    setupMenuControls();
    
    // Create game instance after DOM is loaded
    gameInstance = new Phaser.Game(config);
});