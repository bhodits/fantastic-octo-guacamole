// Ozarks City Builder - Main Game Engine

// ==================== GAME CONFIGURATION ====================
const CONFIG = {
    GRID_WIDTH: 40,
    GRID_HEIGHT: 30,
    TILE_SIZE: 40,
    TICK_RATE: 1000, // ms per game tick
    SEASONS: ['Spring', 'Summer', 'Fall', 'Winter'],
    TICKS_PER_SEASON: 30,
};

// ==================== TERRAIN TYPES ====================
const TERRAIN = {
    GRASS: { id: 'grass', name: 'Grassland', color: '#5a8a4a', buildable: true },
    FOREST: { id: 'forest', name: 'Forest', color: '#2d5a27', buildable: true, hasResource: 'lumber' },
    WATER: { id: 'water', name: 'Lake', color: '#4a90a4', buildable: false, hasResource: 'fish' },
    HILL: { id: 'hill', name: 'Hills', color: '#7a9a5a', buildable: true },
    MOUNTAIN: { id: 'mountain', name: 'Mountain', color: '#8b8b7a', buildable: false, hasResource: 'stone' },
    RIVER: { id: 'river', name: 'River', color: '#5ba3b8', buildable: false, hasResource: 'fish' },
};

// ==================== BUILDING DEFINITIONS ====================
const BUILDINGS = {
    // Housing
    cabin: {
        id: 'cabin',
        name: 'Log Cabin',
        icon: '🏠',
        category: 'housing',
        description: 'A cozy cabin for settlers. Provides housing for 4 people.',
        cost: { money: 100, lumber: 20 },
        provides: { population: 4 },
        upkeep: { money: 2 },
        size: 1,
    },
    farmhouse: {
        id: 'farmhouse',
        name: 'Farmhouse',
        icon: '🏡',
        category: 'housing',
        description: 'A larger home with land. Houses 6 people and produces food.',
        cost: { money: 250, lumber: 40, stone: 10 },
        provides: { population: 6 },
        produces: { money: 5 },
        upkeep: { money: 3 },
        size: 1,
    },
    mansion: {
        id: 'mansion',
        name: 'Lake Mansion',
        icon: '🏰',
        category: 'housing',
        description: 'A grand lakeside estate. Houses 10 wealthy residents.',
        cost: { money: 1000, lumber: 80, stone: 50 },
        provides: { population: 10, happiness: 10 },
        produces: { money: 25 },
        upkeep: { money: 15 },
        requiresAdjacent: ['water'],
        size: 1,
    },

    // Economy
    sawmill: {
        id: 'sawmill',
        name: 'Sawmill',
        icon: '🪚',
        category: 'economy',
        description: 'Harvests lumber from nearby forests. Must be near trees.',
        cost: { money: 200, lumber: 30 },
        produces: { lumber: 3 },
        upkeep: { money: 5 },
        requiresAdjacent: ['forest'],
        requiresWorkers: 2,
        size: 1,
    },
    quarry: {
        id: 'quarry',
        name: 'Stone Quarry',
        icon: '⛏️',
        category: 'economy',
        description: 'Extracts stone from the mountains.',
        cost: { money: 300, lumber: 40 },
        produces: { stone: 2 },
        upkeep: { money: 8 },
        requiresAdjacent: ['mountain'],
        requiresWorkers: 3,
        size: 1,
    },
    general_store: {
        id: 'general_store',
        name: 'General Store',
        icon: '🏪',
        category: 'economy',
        description: 'A country store selling goods. Generates income from population.',
        cost: { money: 300, lumber: 35, stone: 15 },
        produces: { money: 10 },
        provides: { happiness: 5 },
        upkeep: { money: 3 },
        requiresWorkers: 2,
        size: 1,
    },
    bank: {
        id: 'bank',
        name: 'Bank',
        icon: '🏦',
        category: 'economy',
        description: 'Increases income from all businesses by 20%.',
        cost: { money: 800, lumber: 50, stone: 40 },
        produces: { money: 20 },
        upkeep: { money: 10 },
        requiresWorkers: 3,
        bonus: { incomeMultiplier: 1.2 },
        size: 1,
    },

    // Nature & Recreation
    park: {
        id: 'park',
        name: 'Town Park',
        icon: '🌳',
        category: 'nature',
        description: 'A peaceful park. Increases happiness of nearby residents.',
        cost: { money: 150, lumber: 10 },
        provides: { happiness: 15 },
        upkeep: { money: 2 },
        size: 1,
    },
    campground: {
        id: 'campground',
        name: 'Campground',
        icon: '⛺',
        category: 'nature',
        description: 'Attracts tourists who love the outdoors.',
        cost: { money: 200, lumber: 25 },
        produces: { money: 8 },
        provides: { happiness: 5 },
        upkeep: { money: 3 },
        requiresAdjacent: ['forest'],
        size: 1,
    },
    trail: {
        id: 'trail',
        name: 'Hiking Trail',
        icon: '🥾',
        category: 'nature',
        description: 'A scenic trail through the hills. Popular with hikers.',
        cost: { money: 100, lumber: 5 },
        produces: { money: 3 },
        provides: { happiness: 8 },
        upkeep: { money: 1 },
        requiresAdjacent: ['hill', 'forest', 'mountain'],
        size: 1,
    },

    // Tourism
    fishing_dock: {
        id: 'fishing_dock',
        name: 'Fishing Dock',
        icon: '🎣',
        category: 'tourism',
        description: 'Catch bass and catfish from the lake!',
        cost: { money: 150, lumber: 30 },
        produces: { fish: 3, money: 5 },
        upkeep: { money: 3 },
        requiresAdjacent: ['water', 'river'],
        requiresWorkers: 1,
        size: 1,
    },
    boat_rental: {
        id: 'boat_rental',
        name: 'Boat Rental',
        icon: '🚤',
        category: 'tourism',
        description: 'Rent boats to tourists exploring the lake.',
        cost: { money: 400, lumber: 40 },
        produces: { money: 15 },
        provides: { happiness: 10 },
        upkeep: { money: 5 },
        requiresAdjacent: ['water'],
        requiresWorkers: 2,
        size: 1,
    },
    resort: {
        id: 'resort',
        name: 'Lake Resort',
        icon: '🏨',
        category: 'tourism',
        description: 'A lakeside resort attracting visitors from far and wide.',
        cost: { money: 1500, lumber: 100, stone: 60 },
        produces: { money: 50 },
        provides: { happiness: 20, population: 5 },
        upkeep: { money: 25 },
        requiresAdjacent: ['water'],
        requiresWorkers: 8,
        size: 1,
    },
    country_music_hall: {
        id: 'country_music_hall',
        name: 'Music Hall',
        icon: '🎸',
        category: 'tourism',
        description: 'Home of Ozark country music! Major tourist attraction.',
        cost: { money: 1200, lumber: 80, stone: 50 },
        produces: { money: 40 },
        provides: { happiness: 30 },
        upkeep: { money: 20 },
        requiresWorkers: 5,
        size: 1,
    },

    // Infrastructure
    dirt_road: {
        id: 'dirt_road',
        name: 'Dirt Road',
        icon: '🛤️',
        category: 'infrastructure',
        description: 'A simple country road connecting buildings.',
        cost: { money: 10 },
        isRoad: true,
        size: 1,
    },
    paved_road: {
        id: 'paved_road',
        name: 'Paved Road',
        icon: '🛣️',
        category: 'infrastructure',
        description: 'A proper paved road. Increases efficiency.',
        cost: { money: 30, stone: 5 },
        isRoad: true,
        bonus: { efficiencyBonus: 1.1 },
        size: 1,
    },
    bridge: {
        id: 'bridge',
        name: 'Bridge',
        icon: '🌉',
        category: 'infrastructure',
        description: 'Cross rivers and connect your town.',
        cost: { money: 200, lumber: 50, stone: 30 },
        isRoad: true,
        canBuildOn: ['water', 'river'],
        size: 1,
    },
};

// ==================== GAME STATE ====================
let gameState = {
    townName: 'Ozark Hollow',
    resources: {
        population: 0,
        money: 1000,
        lumber: 50,
        stone: 30,
        fish: 0,
        happiness: 100,
    },
    grid: [],
    buildings: [],
    selectedBuilding: null,
    demolishMode: false,
    gameSpeed: 1,
    paused: false,
    tick: 0,
    season: 0,
    year: 1,
    events: [],
    camera: { x: 0, y: 0, zoom: 1 },
    workers: { total: 0, employed: 0 },
};

// ==================== CANVAS & RENDERING ====================
let canvas, ctx;
let isDragging = false;
let lastMouse = { x: 0, y: 0 };
let hoverTile = null;

function initCanvas() {
    canvas = document.getElementById('game-canvas');
    ctx = canvas.getContext('2d');
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
}

function resizeCanvas() {
    const container = document.getElementById('game-area');
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;

    // Center camera on map
    const mapWidth = CONFIG.GRID_WIDTH * CONFIG.TILE_SIZE;
    const mapHeight = CONFIG.GRID_HEIGHT * CONFIG.TILE_SIZE;
    gameState.camera.x = (canvas.width - mapWidth * gameState.camera.zoom) / 2;
    gameState.camera.y = (canvas.height - mapHeight * gameState.camera.zoom) / 2;

    render();
}

function render() {
    // Clear canvas
    ctx.fillStyle = '#1a3d18';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(gameState.camera.x, gameState.camera.y);
    ctx.scale(gameState.camera.zoom, gameState.camera.zoom);

    // Draw terrain
    for (let y = 0; y < CONFIG.GRID_HEIGHT; y++) {
        for (let x = 0; x < CONFIG.GRID_WIDTH; x++) {
            const tile = gameState.grid[y][x];
            drawTile(x, y, tile);
        }
    }

    // Draw buildings
    gameState.buildings.forEach(building => {
        drawBuilding(building);
    });

    // Draw hover highlight
    if (hoverTile && gameState.selectedBuilding) {
        const canPlace = canPlaceBuilding(gameState.selectedBuilding, hoverTile.x, hoverTile.y);
        ctx.fillStyle = canPlace ? 'rgba(100, 200, 100, 0.4)' : 'rgba(200, 100, 100, 0.4)';
        ctx.fillRect(
            hoverTile.x * CONFIG.TILE_SIZE,
            hoverTile.y * CONFIG.TILE_SIZE,
            CONFIG.TILE_SIZE,
            CONFIG.TILE_SIZE
        );
    } else if (hoverTile && gameState.demolishMode) {
        ctx.fillStyle = 'rgba(200, 50, 50, 0.4)';
        ctx.fillRect(
            hoverTile.x * CONFIG.TILE_SIZE,
            hoverTile.y * CONFIG.TILE_SIZE,
            CONFIG.TILE_SIZE,
            CONFIG.TILE_SIZE
        );
    }

    ctx.restore();

    // Draw minimap
    drawMinimap();
}

function drawTile(x, y, tile) {
    const terrain = TERRAIN[tile.terrain.toUpperCase()];
    const px = x * CONFIG.TILE_SIZE;
    const py = y * CONFIG.TILE_SIZE;

    // Base terrain color
    ctx.fillStyle = terrain.color;
    ctx.fillRect(px, py, CONFIG.TILE_SIZE, CONFIG.TILE_SIZE);

    // Add terrain details
    if (tile.terrain === 'forest') {
        drawForestDetail(px, py, tile.variation);
    } else if (tile.terrain === 'water') {
        drawWaterDetail(px, py);
    } else if (tile.terrain === 'hill') {
        drawHillDetail(px, py, tile.variation);
    } else if (tile.terrain === 'mountain') {
        drawMountainDetail(px, py);
    } else if (tile.terrain === 'river') {
        drawRiverDetail(px, py, tile.riverDirection);
    }

    // Grid lines (subtle)
    ctx.strokeStyle = 'rgba(0,0,0,0.1)';
    ctx.strokeRect(px, py, CONFIG.TILE_SIZE, CONFIG.TILE_SIZE);
}

function drawForestDetail(px, py, variation) {
    ctx.fillStyle = '#1a4d1a';
    const trees = variation || 3;
    for (let i = 0; i < trees; i++) {
        const tx = px + 8 + (i % 2) * 18;
        const ty = py + 8 + Math.floor(i / 2) * 16;
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.lineTo(tx + 8, ty + 14);
        ctx.lineTo(tx - 8, ty + 14);
        ctx.closePath();
        ctx.fill();
    }
}

function drawWaterDetail(px, py) {
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    const time = Date.now() / 1000;
    for (let i = 0; i < 3; i++) {
        const wx = px + 5 + i * 12 + Math.sin(time + i) * 2;
        const wy = py + 15 + i * 8;
        ctx.fillRect(wx, wy, 10, 2);
    }
}

function drawHillDetail(px, py, variation) {
    ctx.fillStyle = '#6a8a4a';
    ctx.beginPath();
    ctx.arc(px + 20, py + 25, 15, Math.PI, 0);
    ctx.fill();
    if (variation > 1) {
        ctx.beginPath();
        ctx.arc(px + 12, py + 30, 10, Math.PI, 0);
        ctx.fill();
    }
}

function drawMountainDetail(px, py) {
    ctx.fillStyle = '#6b6b5a';
    ctx.beginPath();
    ctx.moveTo(px + 20, py + 5);
    ctx.lineTo(px + 35, py + 35);
    ctx.lineTo(px + 5, py + 35);
    ctx.closePath();
    ctx.fill();

    // Snow cap
    ctx.fillStyle = '#ddd';
    ctx.beginPath();
    ctx.moveTo(px + 20, py + 5);
    ctx.lineTo(px + 26, py + 15);
    ctx.lineTo(px + 14, py + 15);
    ctx.closePath();
    ctx.fill();
}

function drawRiverDetail(px, py, direction) {
    ctx.fillStyle = '#4a90a4';
    if (direction === 'horizontal') {
        ctx.fillRect(px, py + 12, CONFIG.TILE_SIZE, 16);
    } else {
        ctx.fillRect(px + 12, py, 16, CONFIG.TILE_SIZE);
    }
}

function drawBuilding(building) {
    const def = BUILDINGS[building.type];
    const px = building.x * CONFIG.TILE_SIZE;
    const py = building.y * CONFIG.TILE_SIZE;

    // Building background
    ctx.fillStyle = building.working ? '#e8d8b8' : '#c8b898';
    ctx.fillRect(px + 2, py + 2, CONFIG.TILE_SIZE - 4, CONFIG.TILE_SIZE - 4);

    // Border
    ctx.strokeStyle = building.working ? '#8b6914' : '#6b4914';
    ctx.lineWidth = 2;
    ctx.strokeRect(px + 2, py + 2, CONFIG.TILE_SIZE - 4, CONFIG.TILE_SIZE - 4);

    // Icon
    ctx.font = '22px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(def.icon, px + CONFIG.TILE_SIZE/2, py + CONFIG.TILE_SIZE/2);

    // Not working indicator
    if (!building.working && def.requiresWorkers) {
        ctx.fillStyle = 'rgba(255,0,0,0.3)';
        ctx.fillRect(px + 2, py + 2, CONFIG.TILE_SIZE - 4, CONFIG.TILE_SIZE - 4);
    }
}

function drawMinimap() {
    const minimapSize = 120;
    const margin = 10;
    const mx = canvas.width - minimapSize - margin;
    const my = margin;

    // Background
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(mx - 2, my - 2, minimapSize + 4, minimapSize + 4);

    const scaleX = minimapSize / CONFIG.GRID_WIDTH;
    const scaleY = minimapSize / CONFIG.GRID_HEIGHT;

    // Draw terrain
    for (let y = 0; y < CONFIG.GRID_HEIGHT; y++) {
        for (let x = 0; x < CONFIG.GRID_WIDTH; x++) {
            const tile = gameState.grid[y][x];
            const terrain = TERRAIN[tile.terrain.toUpperCase()];
            ctx.fillStyle = terrain.color;
            ctx.fillRect(mx + x * scaleX, my + y * scaleY, scaleX + 0.5, scaleY + 0.5);
        }
    }

    // Draw buildings
    ctx.fillStyle = '#f5f0e6';
    gameState.buildings.forEach(b => {
        ctx.fillRect(mx + b.x * scaleX, my + b.y * scaleY, scaleX * 1.5, scaleY * 1.5);
    });

    // Viewport indicator
    const viewX = -gameState.camera.x / (CONFIG.TILE_SIZE * gameState.camera.zoom);
    const viewY = -gameState.camera.y / (CONFIG.TILE_SIZE * gameState.camera.zoom);
    const viewW = canvas.width / (CONFIG.TILE_SIZE * gameState.camera.zoom);
    const viewH = canvas.height / (CONFIG.TILE_SIZE * gameState.camera.zoom);

    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.strokeRect(mx + viewX * scaleX, my + viewY * scaleY, viewW * scaleX, viewH * scaleY);
}

// ==================== MAP GENERATION ====================
function generateMap() {
    gameState.grid = [];

    // Initialize with grass
    for (let y = 0; y < CONFIG.GRID_HEIGHT; y++) {
        gameState.grid[y] = [];
        for (let x = 0; x < CONFIG.GRID_WIDTH; x++) {
            gameState.grid[y][x] = {
                terrain: 'grass',
                building: null,
                variation: Math.floor(Math.random() * 3) + 1,
            };
        }
    }

    // Generate lake (Table Rock Lake style)
    generateLake();

    // Generate river flowing into lake
    generateRiver();

    // Generate forests
    generateForests();

    // Generate hills and mountains
    generateHills();

    // Ensure some buildable starting area
    clearStartingArea();
}

function generateLake() {
    // Create an irregular lake shape
    const centerX = CONFIG.GRID_WIDTH * 0.6;
    const centerY = CONFIG.GRID_HEIGHT * 0.5;
    const baseRadius = 6;

    for (let y = 0; y < CONFIG.GRID_HEIGHT; y++) {
        for (let x = 0; x < CONFIG.GRID_WIDTH; x++) {
            const dx = x - centerX;
            const dy = y - centerY;
            const noise = Math.sin(x * 0.5) * 2 + Math.cos(y * 0.7) * 2;
            const dist = Math.sqrt(dx * dx + dy * dy * 1.5);

            if (dist < baseRadius + noise) {
                gameState.grid[y][x].terrain = 'water';
            }
        }
    }

    // Add a second smaller lake section (like lake branches)
    const branch1X = centerX - 8;
    const branch1Y = centerY - 3;
    for (let y = 0; y < CONFIG.GRID_HEIGHT; y++) {
        for (let x = 0; x < CONFIG.GRID_WIDTH; x++) {
            const dx = x - branch1X;
            const dy = y - branch1Y;
            const dist = Math.sqrt(dx * dx * 0.8 + dy * dy * 2);
            if (dist < 4) {
                gameState.grid[y][x].terrain = 'water';
            }
        }
    }
}

function generateRiver() {
    // River flowing from top-left toward the lake
    let rx = 5;
    let ry = 0;

    while (ry < CONFIG.GRID_HEIGHT && gameState.grid[ry][rx].terrain !== 'water') {
        gameState.grid[ry][rx].terrain = 'river';
        gameState.grid[ry][rx].riverDirection = 'vertical';

        ry++;
        if (Math.random() < 0.3) {
            rx += Math.random() < 0.5 ? 1 : -1;
            rx = Math.max(2, Math.min(rx, CONFIG.GRID_WIDTH - 3));
            if (ry < CONFIG.GRID_HEIGHT) {
                gameState.grid[ry][rx].terrain = 'river';
                gameState.grid[ry][rx].riverDirection = 'horizontal';
            }
        }
    }
}

function generateForests() {
    // Create forest clusters
    const numClusters = 8;
    for (let i = 0; i < numClusters; i++) {
        const cx = Math.floor(Math.random() * CONFIG.GRID_WIDTH);
        const cy = Math.floor(Math.random() * CONFIG.GRID_HEIGHT);
        const size = Math.floor(Math.random() * 4) + 3;

        for (let dy = -size; dy <= size; dy++) {
            for (let dx = -size; dx <= size; dx++) {
                const x = cx + dx;
                const y = cy + dy;
                if (x >= 0 && x < CONFIG.GRID_WIDTH && y >= 0 && y < CONFIG.GRID_HEIGHT) {
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < size && Math.random() < 0.7) {
                        const tile = gameState.grid[y][x];
                        if (tile.terrain === 'grass') {
                            tile.terrain = 'forest';
                            tile.variation = Math.floor(Math.random() * 3) + 2;
                        }
                    }
                }
            }
        }
    }
}

function generateHills() {
    // Create hill regions along edges and scattered
    const hillRegions = [
        { x: 0, y: 0, w: 10, h: 8 },
        { x: CONFIG.GRID_WIDTH - 8, y: 0, w: 8, h: 10 },
        { x: 0, y: CONFIG.GRID_HEIGHT - 6, w: 12, h: 6 },
    ];

    hillRegions.forEach(region => {
        for (let y = region.y; y < region.y + region.h && y < CONFIG.GRID_HEIGHT; y++) {
            for (let x = region.x; x < region.x + region.w && x < CONFIG.GRID_WIDTH; x++) {
                const tile = gameState.grid[y][x];
                if (tile.terrain === 'grass' || tile.terrain === 'forest') {
                    if (Math.random() < 0.4) {
                        tile.terrain = 'hill';
                        tile.variation = Math.floor(Math.random() * 2) + 1;
                    } else if (Math.random() < 0.15) {
                        tile.terrain = 'mountain';
                    }
                }
            }
        }
    });

    // Add some scattered mountains
    for (let i = 0; i < 5; i++) {
        const x = Math.floor(Math.random() * CONFIG.GRID_WIDTH);
        const y = Math.floor(Math.random() * (CONFIG.GRID_HEIGHT / 2));
        if (gameState.grid[y][x].terrain === 'grass' || gameState.grid[y][x].terrain === 'hill') {
            gameState.grid[y][x].terrain = 'mountain';
        }
    }
}

function clearStartingArea() {
    // Ensure there's a nice buildable area to start
    const startX = 12;
    const startY = 12;
    const clearSize = 6;

    for (let y = startY; y < startY + clearSize; y++) {
        for (let x = startX; x < startX + clearSize; x++) {
            if (y < CONFIG.GRID_HEIGHT && x < CONFIG.GRID_WIDTH) {
                const tile = gameState.grid[y][x];
                if (tile.terrain !== 'water' && tile.terrain !== 'river') {
                    tile.terrain = 'grass';
                }
            }
        }
    }
}

// ==================== BUILDING SYSTEM ====================
function canPlaceBuilding(buildingType, x, y) {
    if (x < 0 || x >= CONFIG.GRID_WIDTH || y < 0 || y >= CONFIG.GRID_HEIGHT) {
        return false;
    }

    const tile = gameState.grid[y][x];
    const def = BUILDINGS[buildingType];

    // Check if tile already has a building
    if (tile.building) {
        return false;
    }

    // Check terrain restrictions
    const terrain = TERRAIN[tile.terrain.toUpperCase()];

    // Bridges can be built on water
    if (def.canBuildOn && def.canBuildOn.includes(tile.terrain)) {
        return canAfford(def.cost);
    }

    // Normal buildable check
    if (!terrain.buildable) {
        return false;
    }

    // Check adjacent requirements
    if (def.requiresAdjacent) {
        const adjacent = getAdjacentTiles(x, y);
        const hasRequired = adjacent.some(adj =>
            def.requiresAdjacent.includes(adj.terrain)
        );
        if (!hasRequired) {
            return false;
        }
    }

    // Check cost
    return canAfford(def.cost);
}

function canAfford(cost) {
    for (const [resource, amount] of Object.entries(cost)) {
        if (gameState.resources[resource] < amount) {
            return false;
        }
    }
    return true;
}

function getAdjacentTiles(x, y) {
    const adjacent = [];
    const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1]];

    dirs.forEach(([dx, dy]) => {
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && nx < CONFIG.GRID_WIDTH && ny >= 0 && ny < CONFIG.GRID_HEIGHT) {
            adjacent.push(gameState.grid[ny][nx]);
        }
    });

    return adjacent;
}

function placeBuilding(buildingType, x, y) {
    if (!canPlaceBuilding(buildingType, x, y)) {
        return false;
    }

    const def = BUILDINGS[buildingType];

    // Deduct costs
    for (const [resource, amount] of Object.entries(def.cost)) {
        gameState.resources[resource] -= amount;
    }

    // Create building
    const building = {
        type: buildingType,
        x: x,
        y: y,
        working: true,
        level: 1,
    };

    // Check if can work (has workers if required)
    if (def.requiresWorkers) {
        const availableWorkers = gameState.workers.total - gameState.workers.employed;
        if (availableWorkers >= def.requiresWorkers) {
            gameState.workers.employed += def.requiresWorkers;
            building.working = true;
        } else {
            building.working = false;
        }
    }

    gameState.buildings.push(building);
    gameState.grid[y][x].building = building;

    // Apply immediate provides
    if (def.provides) {
        for (const [resource, amount] of Object.entries(def.provides)) {
            if (resource === 'population') {
                gameState.resources.population += amount;
                gameState.workers.total += Math.floor(amount * 0.6); // 60% work
            } else {
                gameState.resources[resource] += amount;
            }
        }
    }

    addEvent(`Built ${def.name}!`, 'positive');
    updateUI();
    render();

    return true;
}

function demolishBuilding(x, y) {
    const tile = gameState.grid[y][x];
    if (!tile.building) return false;

    const building = tile.building;
    const def = BUILDINGS[building.type];

    // Remove building
    const index = gameState.buildings.indexOf(building);
    if (index > -1) {
        gameState.buildings.splice(index, 1);
    }
    tile.building = null;

    // Remove provides
    if (def.provides) {
        for (const [resource, amount] of Object.entries(def.provides)) {
            if (resource === 'population') {
                gameState.resources.population -= amount;
                gameState.workers.total -= Math.floor(amount * 0.6);
            } else {
                gameState.resources[resource] -= amount;
            }
        }
    }

    // Free workers
    if (def.requiresWorkers && building.working) {
        gameState.workers.employed -= def.requiresWorkers;
    }

    // Refund some materials
    if (def.cost.lumber) {
        gameState.resources.lumber += Math.floor(def.cost.lumber * 0.3);
    }
    if (def.cost.stone) {
        gameState.resources.stone += Math.floor(def.cost.stone * 0.3);
    }

    addEvent(`Demolished ${def.name}`, 'neutral');
    updateUI();
    render();

    return true;
}

// ==================== GAME LOOP ====================
let lastTick = 0;
let gameLoop;

function startGameLoop() {
    gameLoop = setInterval(() => {
        if (!gameState.paused) {
            gameTick();
        }
    }, CONFIG.TICK_RATE / gameState.gameSpeed);
}

function gameTick() {
    gameState.tick++;

    // Update season/year
    if (gameState.tick % CONFIG.TICKS_PER_SEASON === 0) {
        gameState.season = (gameState.season + 1) % 4;
        if (gameState.season === 0) {
            gameState.year++;
            addEvent(`Year ${gameState.year} begins!`, 'neutral');
        }
        addEvent(`${CONFIG.SEASONS[gameState.season]} has arrived`, 'neutral');
    }

    // Calculate income and production
    let income = 0;
    let lumberProduction = 0;
    let stoneProduction = 0;
    let fishProduction = 0;
    let expenses = 0;

    // Check worker availability and update building status
    updateWorkerAssignments();

    gameState.buildings.forEach(building => {
        const def = BUILDINGS[building.type];

        if (building.working) {
            // Production
            if (def.produces) {
                if (def.produces.money) income += def.produces.money;
                if (def.produces.lumber) lumberProduction += def.produces.lumber;
                if (def.produces.stone) stoneProduction += def.produces.stone;
                if (def.produces.fish) fishProduction += def.produces.fish;
            }
        }

        // Upkeep always applies
        if (def.upkeep) {
            if (def.upkeep.money) expenses += def.upkeep.money;
        }
    });

    // Apply bank bonus if exists
    const hasBank = gameState.buildings.some(b => b.type === 'bank' && b.working);
    if (hasBank) {
        income = Math.floor(income * 1.2);
    }

    // Season effects
    if (CONFIG.SEASONS[gameState.season] === 'Winter') {
        lumberProduction = Math.floor(lumberProduction * 0.5);
        fishProduction = Math.floor(fishProduction * 0.3);
        income = Math.floor(income * 0.7);
    } else if (CONFIG.SEASONS[gameState.season] === 'Summer') {
        income = Math.floor(income * 1.3); // Tourism boost
    }

    // Population happiness affects income
    const happinessMultiplier = gameState.resources.happiness / 100;
    income = Math.floor(income * happinessMultiplier);

    // Apply resources
    gameState.resources.money += income - expenses;
    gameState.resources.lumber += lumberProduction;
    gameState.resources.stone += stoneProduction;
    gameState.resources.fish += fishProduction;

    // Sell excess fish for money
    if (gameState.resources.fish > 50) {
        const sold = gameState.resources.fish - 50;
        gameState.resources.money += sold * 2;
        gameState.resources.fish = 50;
    }

    // Update happiness based on various factors
    updateHappiness();

    // Random events (rare)
    if (Math.random() < 0.02) {
        triggerRandomEvent();
    }

    // Bankruptcy check
    if (gameState.resources.money < 0) {
        gameState.resources.money = 0;
        addEvent('Town treasury is empty!', 'negative');
    }

    // Update income display
    document.getElementById('income').textContent = `+$${income - expenses}/s`;

    updateUI();
    render();
}

function updateWorkerAssignments() {
    const availableWorkers = gameState.workers.total - gameState.workers.employed;

    gameState.buildings.forEach(building => {
        const def = BUILDINGS[building.type];
        if (def.requiresWorkers) {
            if (!building.working && availableWorkers >= def.requiresWorkers) {
                building.working = true;
                gameState.workers.employed += def.requiresWorkers;
            }
        }
    });
}

function updateHappiness() {
    let targetHappiness = 50; // Base happiness

    // Buildings that provide happiness
    gameState.buildings.forEach(building => {
        const def = BUILDINGS[building.type];
        if (def.provides && def.provides.happiness) {
            targetHappiness += def.provides.happiness;
        }
    });

    // Population density penalty
    const density = gameState.resources.population / gameState.buildings.filter(b =>
        BUILDINGS[b.type].provides?.population
    ).length || 1;
    if (density > 8) {
        targetHappiness -= (density - 8) * 2;
    }

    // Season effects
    if (CONFIG.SEASONS[gameState.season] === 'Summer') {
        targetHappiness += 10;
    } else if (CONFIG.SEASONS[gameState.season] === 'Winter') {
        targetHappiness -= 10;
    }

    // Gradually move toward target
    targetHappiness = Math.max(10, Math.min(150, targetHappiness));
    gameState.resources.happiness += (targetHappiness - gameState.resources.happiness) * 0.1;
    gameState.resources.happiness = Math.round(gameState.resources.happiness);
}

function triggerRandomEvent() {
    const events = [
        {
            text: 'Tourists flock to see the fall colors!',
            effect: () => { gameState.resources.money += 100; },
            type: 'positive',
            season: 'Fall'
        },
        {
            text: 'A fishing tournament brings visitors!',
            effect: () => { gameState.resources.money += 150; gameState.resources.fish += 10; },
            type: 'positive'
        },
        {
            text: 'Storm damages some buildings',
            effect: () => { gameState.resources.money -= 50; },
            type: 'negative',
            season: 'Spring'
        },
        {
            text: 'Country music festival is a hit!',
            effect: () => { gameState.resources.money += 200; gameState.resources.happiness += 10; },
            type: 'positive'
        },
        {
            text: 'New settlers heard about your town!',
            effect: () => { gameState.resources.population += 2; gameState.workers.total += 1; },
            type: 'positive'
        },
        {
            text: 'Lumber prices are up!',
            effect: () => { gameState.resources.money += gameState.resources.lumber * 3; },
            type: 'positive'
        },
    ];

    // Filter by season if applicable
    const currentSeason = CONFIG.SEASONS[gameState.season];
    const validEvents = events.filter(e => !e.season || e.season === currentSeason);

    const event = validEvents[Math.floor(Math.random() * validEvents.length)];
    event.effect();
    addEvent(event.text, event.type);
}

// ==================== UI FUNCTIONS ====================
function updateUI() {
    document.getElementById('population').textContent = gameState.resources.population;
    document.getElementById('money').textContent = Math.floor(gameState.resources.money);
    document.getElementById('lumber').textContent = Math.floor(gameState.resources.lumber);
    document.getElementById('stone').textContent = Math.floor(gameState.resources.stone);
    document.getElementById('fish').textContent = Math.floor(gameState.resources.fish);
    document.getElementById('happiness').textContent = Math.floor(gameState.resources.happiness);

    document.getElementById('season').textContent = CONFIG.SEASONS[gameState.season];
    document.getElementById('year').textContent = gameState.year;
    document.getElementById('town-name').textContent = gameState.townName;

    updateBuildingList();
}

function updateBuildingList() {
    const list = document.getElementById('building-list');
    const activeCategory = document.querySelector('.category-btn.active')?.dataset.category || 'housing';

    list.innerHTML = '';

    Object.values(BUILDINGS).filter(b => b.category === activeCategory).forEach(building => {
        const canAffordIt = canAfford(building.cost);

        const div = document.createElement('div');
        div.className = `building-item ${!canAffordIt ? 'disabled' : ''} ${gameState.selectedBuilding === building.id ? 'selected' : ''}`;
        div.dataset.building = building.id;

        let costText = Object.entries(building.cost)
            .map(([r, a]) => `${a} ${r}`)
            .join(', ');

        div.innerHTML = `
            <div class="building-header">
                <span class="building-icon">${building.icon}</span>
                <span class="building-name">${building.name}</span>
            </div>
            <div class="building-cost">${costText}</div>
        `;

        div.addEventListener('click', () => selectBuilding(building.id));
        list.appendChild(div);
    });
}

function selectBuilding(buildingId) {
    gameState.selectedBuilding = gameState.selectedBuilding === buildingId ? null : buildingId;
    gameState.demolishMode = false;
    document.getElementById('btn-demolish').classList.remove('active');

    updateBuildingList();
    updateBuildingInfo();
    render();
}

function updateBuildingInfo() {
    const info = document.getElementById('building-info');

    if (!gameState.selectedBuilding) {
        info.innerHTML = '<p>Select a building to see details</p>';
        return;
    }

    const building = BUILDINGS[gameState.selectedBuilding];
    let html = `<p><strong>${building.icon} ${building.name}</strong></p>`;
    html += `<p>${building.description}</p>`;

    if (building.produces) {
        html += `<p><em>Produces: ${Object.entries(building.produces).map(([r,a]) => `${a} ${r}`).join(', ')}</em></p>`;
    }
    if (building.requiresWorkers) {
        html += `<p><em>Workers needed: ${building.requiresWorkers}</em></p>`;
    }
    if (building.requiresAdjacent) {
        html += `<p><em>Must be near: ${building.requiresAdjacent.join(' or ')}</em></p>`;
    }

    info.innerHTML = html;
}

function addEvent(text, type = 'neutral') {
    gameState.events.unshift({ text, type, tick: gameState.tick });
    if (gameState.events.length > 20) {
        gameState.events.pop();
    }

    const log = document.getElementById('event-log');
    log.innerHTML = gameState.events.map(e =>
        `<div class="event-item ${e.type}">${e.text}</div>`
    ).join('');
}

// ==================== INPUT HANDLING ====================
function initInput() {
    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('wheel', onWheel);
    canvas.addEventListener('mouseleave', () => { hoverTile = null; render(); });

    // Category buttons
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            gameState.selectedBuilding = null;
            updateBuildingList();
            updateBuildingInfo();
        });
    });

    // Control buttons
    document.getElementById('btn-demolish').addEventListener('click', () => {
        gameState.demolishMode = !gameState.demolishMode;
        gameState.selectedBuilding = null;
        document.getElementById('btn-demolish').classList.toggle('active', gameState.demolishMode);
        updateBuildingList();
    });

    document.getElementById('btn-zoom-in').addEventListener('click', () => {
        gameState.camera.zoom = Math.min(2, gameState.camera.zoom + 0.2);
        render();
    });

    document.getElementById('btn-zoom-out').addEventListener('click', () => {
        gameState.camera.zoom = Math.max(0.5, gameState.camera.zoom - 0.2);
        render();
    });

    document.getElementById('btn-speed').addEventListener('click', () => {
        const speeds = [1, 2, 3];
        const current = speeds.indexOf(gameState.gameSpeed);
        gameState.gameSpeed = speeds[(current + 1) % speeds.length];
        document.getElementById('btn-speed').textContent = `⏩ ${gameState.gameSpeed}x`;
        clearInterval(gameLoop);
        startGameLoop();
    });

    // Welcome modal
    document.getElementById('start-game').addEventListener('click', () => {
        gameState.townName = document.getElementById('town-name-input').value || 'Ozark Hollow';
        document.getElementById('welcome-modal').classList.add('hidden');
        updateUI();
    });
}

function onMouseDown(e) {
    if (e.button === 0) { // Left click
        const tile = getTileAtMouse(e);
        if (tile) {
            if (gameState.selectedBuilding) {
                placeBuilding(gameState.selectedBuilding, tile.x, tile.y);
            } else if (gameState.demolishMode) {
                demolishBuilding(tile.x, tile.y);
            }
        }
    } else if (e.button === 2 || e.button === 1) { // Right or middle click - pan
        isDragging = true;
        lastMouse = { x: e.clientX, y: e.clientY };
    }

    e.preventDefault();
}

function onMouseMove(e) {
    if (isDragging) {
        const dx = e.clientX - lastMouse.x;
        const dy = e.clientY - lastMouse.y;
        gameState.camera.x += dx;
        gameState.camera.y += dy;
        lastMouse = { x: e.clientX, y: e.clientY };
        render();
    } else {
        hoverTile = getTileAtMouse(e);
        render();
        updateTooltip(e);
    }
}

function onMouseUp(e) {
    isDragging = false;
}

function onWheel(e) {
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    const oldZoom = gameState.camera.zoom;
    gameState.camera.zoom = Math.max(0.5, Math.min(2, gameState.camera.zoom + delta));

    // Zoom toward mouse position
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const zoomRatio = gameState.camera.zoom / oldZoom;
    gameState.camera.x = mx - (mx - gameState.camera.x) * zoomRatio;
    gameState.camera.y = my - (my - gameState.camera.y) * zoomRatio;

    render();
    e.preventDefault();
}

function getTileAtMouse(e) {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const worldX = (mx - gameState.camera.x) / gameState.camera.zoom;
    const worldY = (my - gameState.camera.y) / gameState.camera.zoom;

    const tileX = Math.floor(worldX / CONFIG.TILE_SIZE);
    const tileY = Math.floor(worldY / CONFIG.TILE_SIZE);

    if (tileX >= 0 && tileX < CONFIG.GRID_WIDTH && tileY >= 0 && tileY < CONFIG.GRID_HEIGHT) {
        return { x: tileX, y: tileY };
    }
    return null;
}

function updateTooltip(e) {
    const tooltip = document.getElementById('tooltip');

    if (!hoverTile) {
        tooltip.classList.add('hidden');
        return;
    }

    const tile = gameState.grid[hoverTile.y][hoverTile.x];
    const terrain = TERRAIN[tile.terrain.toUpperCase()];

    let text = `<strong>${terrain.name}</strong>`;

    if (tile.building) {
        const def = BUILDINGS[tile.building.type];
        text = `<strong>${def.icon} ${def.name}</strong>`;
        if (!tile.building.working && def.requiresWorkers) {
            text += '<br><span style="color:#f88">Needs workers!</span>';
        }
    }

    if (gameState.selectedBuilding) {
        const canPlace = canPlaceBuilding(gameState.selectedBuilding, hoverTile.x, hoverTile.y);
        text += canPlace ? '<br><span style="color:#8f8">Click to build</span>' : '<br><span style="color:#f88">Cannot build here</span>';
    }

    tooltip.innerHTML = text;
    tooltip.style.left = (e.clientX + 15) + 'px';
    tooltip.style.top = (e.clientY + 15) + 'px';
    tooltip.classList.remove('hidden');
}

// Prevent context menu
canvas?.addEventListener('contextmenu', e => e.preventDefault());

// ==================== INITIALIZATION ====================
function init() {
    initCanvas();
    generateMap();
    initInput();
    updateUI();
    render();
    startGameLoop();

    addEvent('Welcome to the Ozarks!', 'positive');
    addEvent('Build cabins to attract settlers', 'neutral');
}

// Start the game when the page loads
window.addEventListener('load', init);
