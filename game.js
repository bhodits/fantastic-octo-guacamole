// Lake of the Ozarks Tycoon - Main Game Engine
// Build your lakefront empire at Missouri's premier party lake!

// ==================== GAME CONFIGURATION ====================
const CONFIG = {
    GRID_WIDTH: 50,
    GRID_HEIGHT: 35,
    TILE_SIZE: 40,
    TICK_RATE: 1000,
    SEASONS: ['Spring', 'Summer', 'Summer', 'Fall'], // Double summer for lake life!
    TICKS_PER_SEASON: 25,
    LAKE_MILE_MARKERS: 92, // The real lake has mile markers 0-92
};

// ==================== TERRAIN TYPES ====================
const TERRAIN = {
    LAND: { id: 'land', name: 'Shoreline', color: '#4a7c3f', buildable: true },
    FOREST: { id: 'forest', name: 'Woods', color: '#2d5a27', buildable: true },
    WATER: { id: 'water', name: 'Lake', color: '#2d7eb5', buildable: false, isWater: true },
    DEEP_WATER: { id: 'deep_water', name: 'Deep Channel', color: '#1a5a8a', buildable: false, isWater: true },
    COVE: { id: 'cove', name: 'Cove', color: '#4090b8', buildable: false, isWater: true, isCove: true },
    SHALLOW: { id: 'shallow', name: 'Shallow Water', color: '#5ab0d0', buildable: false, isWater: true },
    DOCK_ZONE: { id: 'dock_zone', name: 'Dock Area', color: '#3a9ac0', buildable: true, isWater: true },
    DAM: { id: 'dam', name: 'Bagnell Dam', color: '#666666', buildable: false },
    STRIP: { id: 'strip', name: 'The Strip', color: '#8b7355', buildable: true, isStrip: true },
    PARKING: { id: 'parking', name: 'Parking Lot', color: '#555555', buildable: true },
};

// ==================== BUILDING DEFINITIONS ====================
const BUILDINGS = {
    // Marina Category
    boat_dock: {
        id: 'boat_dock',
        name: 'Boat Dock',
        icon: '🛥️',
        category: 'marina',
        description: 'Basic dock for boat storage. Every lakefront empire starts here!',
        cost: { money: 500 },
        produces: { money: 10 },
        provides: { boats: 4 },
        upkeep: { money: 5 },
        requiresTerrain: ['dock_zone', 'shallow', 'cove'],
        size: 1,
    },
    marina: {
        id: 'marina',
        name: 'Full Service Marina',
        icon: '⚓',
        category: 'marina',
        description: 'Gas, repairs, and slip rentals. The backbone of lake business.',
        cost: { money: 2500 },
        produces: { money: 50, boats: 2 },
        provides: { boats: 12 },
        upkeep: { money: 20 },
        requiresTerrain: ['dock_zone', 'shallow', 'cove'],
        requiresWorkers: 3,
        size: 1,
    },
    boat_rental: {
        id: 'boat_rental',
        name: 'Boat Rental',
        icon: '🚤',
        category: 'marina',
        description: 'Rent pontoons and ski boats to tourists. Summer gold mine!',
        cost: { money: 3000 },
        produces: { money: 80, tourism: 5 },
        provides: { boats: 8 },
        upkeep: { money: 25 },
        requiresTerrain: ['dock_zone', 'shallow'],
        requiresWorkers: 2,
        size: 1,
    },
    yacht_club: {
        id: 'yacht_club',
        name: 'Yacht Club',
        icon: '⛵',
        category: 'marina',
        description: 'Exclusive club for the lake elite. Major reputation boost.',
        cost: { money: 15000 },
        produces: { money: 200, reputation: 3 },
        provides: { boats: 20 },
        upkeep: { money: 80 },
        requiresTerrain: ['dock_zone', 'cove'],
        requiresWorkers: 5,
        size: 1,
    },
    boat_dealer: {
        id: 'boat_dealer',
        name: 'Boat Dealership',
        icon: '🏪',
        category: 'marina',
        description: 'Sell new boats to lake lovers. Big profits, big reputation.',
        cost: { money: 8000 },
        produces: { money: 150, boats: 5 },
        upkeep: { money: 40 },
        requiresTerrain: ['land', 'strip'],
        requiresWorkers: 4,
        size: 1,
    },

    // Lodging Category
    lake_cabin: {
        id: 'lake_cabin',
        name: 'Lake Cabin',
        icon: '🏠',
        category: 'lodging',
        description: 'Cozy cabin rental. Attracts families and fishermen.',
        cost: { money: 800 },
        produces: { money: 15, tourism: 2 },
        provides: { population: 4 },
        upkeep: { money: 5 },
        requiresTerrain: ['land', 'forest'],
        size: 1,
    },
    condo: {
        id: 'condo',
        name: 'Lakefront Condo',
        icon: '🏢',
        category: 'lodging',
        description: 'Modern condos with lake views. Popular with weekenders.',
        cost: { money: 5000 },
        produces: { money: 60, tourism: 8 },
        provides: { population: 12 },
        upkeep: { money: 25 },
        requiresAdjacent: ['water', 'cove', 'shallow', 'dock_zone'],
        requiresTerrain: ['land'],
        size: 1,
    },
    resort: {
        id: 'resort',
        name: 'Lake Resort',
        icon: '🏨',
        category: 'lodging',
        description: 'Full-service resort with pools and amenities. Tourist magnet!',
        cost: { money: 20000 },
        produces: { money: 250, tourism: 25, reputation: 2 },
        provides: { population: 20 },
        upkeep: { money: 100 },
        requiresAdjacent: ['water', 'cove', 'shallow', 'dock_zone'],
        requiresTerrain: ['land'],
        requiresWorkers: 10,
        size: 1,
    },
    houseboat: {
        id: 'houseboat',
        name: 'Houseboat',
        icon: '🛳️',
        category: 'lodging',
        description: 'Live on the water! The ultimate lake lifestyle.',
        cost: { money: 3500 },
        produces: { money: 40, tourism: 5 },
        provides: { population: 6, boats: 1 },
        upkeep: { money: 15 },
        requiresTerrain: ['cove', 'dock_zone'],
        size: 1,
    },

    // Entertainment Category
    tiki_bar: {
        id: 'tiki_bar',
        name: 'Tiki Bar',
        icon: '🍹',
        category: 'entertainment',
        description: 'Swim-up bar vibes! Party central on the water.',
        cost: { money: 2000 },
        produces: { money: 45, tourism: 8 },
        provides: { reputation: 5 },
        upkeep: { money: 15 },
        requiresTerrain: ['dock_zone', 'shallow', 'cove'],
        requiresWorkers: 3,
        size: 1,
    },
    party_cove: {
        id: 'party_cove',
        name: 'Party Cove',
        icon: '🎉',
        category: 'entertainment',
        description: 'THE legendary party spot. Massive tourism but watch your reputation!',
        cost: { money: 5000 },
        produces: { money: 150, tourism: 50 },
        provides: { reputation: -5 },
        upkeep: { money: 30 },
        requiresTerrain: ['cove'],
        size: 1,
    },
    mini_golf: {
        id: 'mini_golf',
        name: 'Mini Golf',
        icon: '⛳',
        category: 'entertainment',
        description: 'Family fun off the water. Good for rainy days.',
        cost: { money: 1500 },
        produces: { money: 25, tourism: 5 },
        provides: { reputation: 3 },
        upkeep: { money: 8 },
        requiresTerrain: ['land', 'strip'],
        requiresWorkers: 2,
        size: 1,
    },
    waterpark: {
        id: 'waterpark',
        name: 'Waterpark',
        icon: '🎢',
        category: 'entertainment',
        description: 'Big Surf style! Major attraction for families.',
        cost: { money: 25000 },
        produces: { money: 300, tourism: 40, reputation: 5 },
        upkeep: { money: 120 },
        requiresTerrain: ['land'],
        requiresWorkers: 15,
        size: 1,
    },
    live_music: {
        id: 'live_music',
        name: 'Live Music Venue',
        icon: '🎸',
        category: 'entertainment',
        description: 'Country and rock on the lake. Draws crowds every weekend.',
        cost: { money: 6000 },
        produces: { money: 80, tourism: 15 },
        provides: { reputation: 8 },
        upkeep: { money: 30 },
        requiresTerrain: ['land', 'strip'],
        requiresWorkers: 4,
        size: 1,
    },
    casino_boat: {
        id: 'casino_boat',
        name: 'Casino Boat',
        icon: '🎰',
        category: 'entertainment',
        description: 'Floating casino! High risk, high reward.',
        cost: { money: 30000 },
        produces: { money: 400, tourism: 30 },
        provides: { reputation: -3 },
        upkeep: { money: 150 },
        requiresTerrain: ['deep_water', 'water'],
        requiresWorkers: 12,
        size: 1,
    },

    // Dining Category
    fish_shack: {
        id: 'fish_shack',
        name: 'Fish Shack',
        icon: '🐟',
        category: 'dining',
        description: 'Fresh catfish and crappie. Lake tradition!',
        cost: { money: 600 },
        produces: { money: 20, tourism: 3 },
        upkeep: { money: 5 },
        requiresTerrain: ['land', 'strip'],
        requiresWorkers: 2,
        size: 1,
    },
    bbq_joint: {
        id: 'bbq_joint',
        name: 'BBQ Joint',
        icon: '🍖',
        category: 'dining',
        description: 'Missouri BBQ at its finest. Smells bring em in!',
        cost: { money: 1200 },
        produces: { money: 35, tourism: 5 },
        provides: { reputation: 2 },
        upkeep: { money: 10 },
        requiresTerrain: ['land', 'strip'],
        requiresWorkers: 3,
        size: 1,
    },
    lakeside_grill: {
        id: 'lakeside_grill',
        name: 'Lakeside Grill',
        icon: '🍽️',
        category: 'dining',
        description: 'Upscale dining with sunset views. Date night destination.',
        cost: { money: 4000 },
        produces: { money: 70, tourism: 10 },
        provides: { reputation: 5 },
        upkeep: { money: 25 },
        requiresAdjacent: ['water', 'cove', 'dock_zone'],
        requiresTerrain: ['land'],
        requiresWorkers: 5,
        size: 1,
    },
    gas_station: {
        id: 'gas_station',
        name: 'Gas & Snacks',
        icon: '⛽',
        category: 'dining',
        description: 'Fuel and quick bites. Every road trip needs one.',
        cost: { money: 1000 },
        produces: { money: 30 },
        upkeep: { money: 8 },
        requiresTerrain: ['land', 'strip', 'parking'],
        requiresWorkers: 2,
        size: 1,
    },

    // Infrastructure Category
    road: {
        id: 'road',
        name: 'Road',
        icon: '🛣️',
        category: 'infrastructure',
        description: 'Connect your properties. Essential for growth.',
        cost: { money: 50 },
        isRoad: true,
        requiresTerrain: ['land', 'strip', 'forest'],
        size: 1,
    },
    parking_lot: {
        id: 'parking_lot',
        name: 'Parking Lot',
        icon: '🅿️',
        category: 'infrastructure',
        description: 'Where the boats come from! Visitors need parking.',
        cost: { money: 200 },
        produces: { money: 5, tourism: 2 },
        requiresTerrain: ['land', 'strip'],
        size: 1,
    },
    boat_ramp: {
        id: 'boat_ramp',
        name: 'Boat Ramp',
        icon: '📐',
        category: 'infrastructure',
        description: 'Public launch = more boats on the water.',
        cost: { money: 800 },
        produces: { boats: 3, tourism: 5 },
        requiresTerrain: ['shallow', 'dock_zone'],
        size: 1,
    },
    bridge: {
        id: 'bridge',
        name: 'Bridge',
        icon: '🌉',
        category: 'infrastructure',
        description: 'Cross the coves! Opens up new development areas.',
        cost: { money: 5000 },
        isRoad: true,
        requiresTerrain: ['water', 'shallow', 'cove'],
        size: 1,
    },
};

// ==================== GAME STATE ====================
let gameState = {
    playerName: 'Lake Boss',
    resources: {
        population: 0,
        money: 5000,
        boats: 0,
        tourism: 0,
        power: 100,
        reputation: 50,
    },
    grid: [],
    buildings: [],
    mileMarkers: [], // Store mile marker positions
    coves: [], // Named coves
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
    lakeLevel: 660, // Normal pool level
    weekendBonus: false,
};

// Famous Lake of the Ozarks cove names
const COVE_NAMES = [
    'Party Cove', 'Millionaire\'s Cove', 'Gravois Arm', 'Glaize Arm',
    'Niangua Arm', 'Grand Glaize', 'Linn Creek Cove', 'Hurricane Deck',
    'Horseshoe Bend', 'Tan-Tar-A Cove', 'Ha Ha Tonka', 'Bagnel Dam Area'
];

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

    const mapWidth = CONFIG.GRID_WIDTH * CONFIG.TILE_SIZE;
    const mapHeight = CONFIG.GRID_HEIGHT * CONFIG.TILE_SIZE;
    gameState.camera.x = (canvas.width - mapWidth * gameState.camera.zoom) / 2;
    gameState.camera.y = (canvas.height - mapHeight * gameState.camera.zoom) / 2;

    render();
}

function render() {
    // Sky/water background
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#87ceeb');
    gradient.addColorStop(1, '#1e5f8a');
    ctx.fillStyle = gradient;
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

    // Draw mile markers
    drawMileMarkers();

    // Draw buildings
    gameState.buildings.forEach(building => {
        drawBuilding(building);
    });

    // Draw hover highlight
    if (hoverTile && gameState.selectedBuilding) {
        const canPlace = canPlaceBuilding(gameState.selectedBuilding, hoverTile.x, hoverTile.y);
        ctx.fillStyle = canPlace ? 'rgba(0, 210, 106, 0.4)' : 'rgba(200, 50, 50, 0.4)';
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

    // Update mile marker display
    updateMileMarkerDisplay();
}

function drawTile(x, y, tile) {
    const terrain = TERRAIN[tile.terrain.toUpperCase()];
    const px = x * CONFIG.TILE_SIZE;
    const py = y * CONFIG.TILE_SIZE;

    ctx.fillStyle = terrain.color;
    ctx.fillRect(px, py, CONFIG.TILE_SIZE, CONFIG.TILE_SIZE);

    // Add terrain details
    if (tile.terrain === 'forest') {
        drawTreeDetail(px, py);
    } else if (terrain.isWater) {
        drawWaterDetail(px, py, tile.terrain);
    } else if (tile.terrain === 'dam') {
        drawDamDetail(px, py);
    } else if (tile.terrain === 'strip') {
        drawStripDetail(px, py);
    }

    // Subtle grid
    ctx.strokeStyle = 'rgba(0,0,0,0.05)';
    ctx.strokeRect(px, py, CONFIG.TILE_SIZE, CONFIG.TILE_SIZE);
}

function drawTreeDetail(px, py) {
    ctx.fillStyle = '#1a4d1a';
    const positions = [[12, 10], [28, 15], [18, 28]];
    positions.forEach(([ox, oy]) => {
        ctx.beginPath();
        ctx.moveTo(px + ox, py + oy - 8);
        ctx.lineTo(px + ox + 6, py + oy + 6);
        ctx.lineTo(px + ox - 6, py + oy + 6);
        ctx.closePath();
        ctx.fill();
    });
}

function drawWaterDetail(px, py, terrainType) {
    const time = Date.now() / 2000;
    ctx.fillStyle = 'rgba(255,255,255,0.15)';

    if (terrainType === 'deep_water') {
        // Darker ripples for channel
        ctx.fillStyle = 'rgba(0,0,0,0.1)';
    }

    for (let i = 0; i < 2; i++) {
        const wx = px + 8 + i * 15 + Math.sin(time + px * 0.1 + i) * 3;
        const wy = py + 12 + i * 12;
        ctx.fillRect(wx, wy, 12, 2);
    }
}

function drawDamDetail(px, py) {
    // Dam structure
    ctx.fillStyle = '#555';
    ctx.fillRect(px + 5, py + 5, CONFIG.TILE_SIZE - 10, CONFIG.TILE_SIZE - 10);
    ctx.fillStyle = '#777';
    ctx.fillRect(px + 8, py + 15, CONFIG.TILE_SIZE - 16, 10);
}

function drawStripDetail(px, py) {
    // Road markings
    ctx.fillStyle = '#6b5a45';
    ctx.fillRect(px + 2, py + 2, CONFIG.TILE_SIZE - 4, CONFIG.TILE_SIZE - 4);
}

function drawMileMarkers() {
    ctx.font = 'bold 10px Arial';
    ctx.textAlign = 'center';

    gameState.mileMarkers.forEach(marker => {
        const px = marker.x * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
        const py = marker.y * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;

        // Buoy
        ctx.fillStyle = '#f4b942';
        ctx.beginPath();
        ctx.arc(px, py, 8, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#000';
        ctx.fillText(marker.mile, px, py + 3);
    });
}

function drawBuilding(building) {
    const def = BUILDINGS[building.type];
    const px = building.x * CONFIG.TILE_SIZE;
    const py = building.y * CONFIG.TILE_SIZE;

    // Building background
    let bgColor = building.working ? '#f5f0e6' : '#d0c8b8';
    if (def.category === 'entertainment') bgColor = building.working ? '#ffe4ec' : '#e0d0d8';
    if (def.category === 'marina') bgColor = building.working ? '#e4f0ff' : '#d0dce8';

    ctx.fillStyle = bgColor;
    ctx.fillRect(px + 2, py + 2, CONFIG.TILE_SIZE - 4, CONFIG.TILE_SIZE - 4);

    // Border
    ctx.strokeStyle = building.working ? '#1e5f8a' : '#888';
    ctx.lineWidth = 2;
    ctx.strokeRect(px + 2, py + 2, CONFIG.TILE_SIZE - 4, CONFIG.TILE_SIZE - 4);

    // Icon
    ctx.font = '22px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(def.icon, px + CONFIG.TILE_SIZE/2, py + CONFIG.TILE_SIZE/2);

    // Not working indicator
    if (!building.working && def.requiresWorkers) {
        ctx.fillStyle = 'rgba(255,100,100,0.4)';
        ctx.fillRect(px + 2, py + 2, CONFIG.TILE_SIZE - 4, CONFIG.TILE_SIZE - 4);
    }
}

function drawMinimap() {
    const minimapSize = 130;
    const margin = 10;
    const mx = canvas.width - minimapSize - margin;
    const my = margin;

    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(mx - 2, my - 2, minimapSize + 4, minimapSize + 4);

    const scaleX = minimapSize / CONFIG.GRID_WIDTH;
    const scaleY = minimapSize / CONFIG.GRID_HEIGHT;

    for (let y = 0; y < CONFIG.GRID_HEIGHT; y++) {
        for (let x = 0; x < CONFIG.GRID_WIDTH; x++) {
            const tile = gameState.grid[y][x];
            const terrain = TERRAIN[tile.terrain.toUpperCase()];
            ctx.fillStyle = terrain.color;
            ctx.fillRect(mx + x * scaleX, my + y * scaleY, scaleX + 0.5, scaleY + 0.5);
        }
    }

    // Buildings
    ctx.fillStyle = '#f4b942';
    gameState.buildings.forEach(b => {
        ctx.fillRect(mx + b.x * scaleX - 1, my + b.y * scaleY - 1, 3, 3);
    });

    // Viewport
    const viewX = -gameState.camera.x / (CONFIG.TILE_SIZE * gameState.camera.zoom);
    const viewY = -gameState.camera.y / (CONFIG.TILE_SIZE * gameState.camera.zoom);
    const viewW = canvas.width / (CONFIG.TILE_SIZE * gameState.camera.zoom);
    const viewH = canvas.height / (CONFIG.TILE_SIZE * gameState.camera.zoom);

    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.strokeRect(mx + viewX * scaleX, my + viewY * scaleY, viewW * scaleX, viewH * scaleY);
}

function updateMileMarkerDisplay() {
    const display = document.getElementById('current-mile');
    if (hoverTile) {
        // Find nearest mile marker
        let nearest = null;
        let minDist = Infinity;
        gameState.mileMarkers.forEach(m => {
            const dist = Math.abs(m.x - hoverTile.x) + Math.abs(m.y - hoverTile.y);
            if (dist < minDist) {
                minDist = dist;
                nearest = m;
            }
        });
        if (nearest && minDist < 10) {
            display.textContent = `Mile Marker: ${nearest.mile}`;
        } else {
            display.textContent = 'Mile Marker: --';
        }
    }
}

// ==================== MAP GENERATION ====================
function generateMap() {
    gameState.grid = [];
    gameState.mileMarkers = [];

    // Initialize with forest
    for (let y = 0; y < CONFIG.GRID_HEIGHT; y++) {
        gameState.grid[y] = [];
        for (let x = 0; x < CONFIG.GRID_WIDTH; x++) {
            gameState.grid[y][x] = {
                terrain: Math.random() < 0.6 ? 'land' : 'forest',
                building: null,
            };
        }
    }

    // Generate the serpentine Lake of the Ozarks shape
    generateLakeOfTheOzarks();

    // Add The Strip (entertainment district)
    generateTheStrip();

    // Add Bagnell Dam at mile 0
    generateBagnellDam();
}

function generateLakeOfTheOzarks() {
    // The lake is famous for its serpentine shape - let's create that!
    // Main channel runs roughly from dam (east) going west with lots of arms

    const mainChannel = [];

    // Start at Bagnell Dam (right side)
    let x = CONFIG.GRID_WIDTH - 5;
    let y = Math.floor(CONFIG.GRID_HEIGHT / 2);

    // Create main winding channel
    let mile = 0;
    while (x > 3) {
        mainChannel.push({ x, y, mile });

        // Add mile marker every few tiles
        if (mile % 8 === 0) {
            gameState.mileMarkers.push({ x, y, mile: Math.floor(mile / 8) * 10 });
        }

        // Carve out the channel (3 tiles wide)
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                const nx = x + dx;
                const ny = y + dy;
                if (ny >= 0 && ny < CONFIG.GRID_HEIGHT && nx >= 0 && nx < CONFIG.GRID_WIDTH) {
                    gameState.grid[ny][nx].terrain = dy === 0 ? 'deep_water' : 'water';
                }
            }
        }

        // Add shallow water edges
        for (let dy = -2; dy <= 2; dy++) {
            const ny = y + dy;
            if (ny >= 0 && ny < CONFIG.GRID_HEIGHT) {
                if (Math.abs(dy) === 2 && gameState.grid[ny][x].terrain !== 'deep_water') {
                    if (Math.random() < 0.7) {
                        gameState.grid[ny][x].terrain = 'shallow';
                    }
                }
            }
        }

        // Serpentine movement
        x -= 1;
        if (Math.random() < 0.4) {
            y += Math.random() < 0.5 ? 1 : -1;
            y = Math.max(4, Math.min(CONFIG.GRID_HEIGHT - 5, y));
        }

        mile++;

        // Create cove arms branching off
        if (mile % 12 === 6 && Math.random() < 0.8) {
            createCove(x, y, Math.random() < 0.5 ? -1 : 1);
        }
    }

    // Add dock zones along shoreline
    addDockZones();
}

function createCove(startX, startY, direction) {
    let cx = startX;
    let cy = startY;
    const armLength = Math.floor(Math.random() * 8) + 5;

    for (let i = 0; i < armLength; i++) {
        cy += direction;
        if (Math.random() < 0.3) cx += Math.random() < 0.5 ? 1 : -1;

        if (cy < 2 || cy >= CONFIG.GRID_HEIGHT - 2 || cx < 2 || cx >= CONFIG.GRID_WIDTH - 2) break;

        // Cove water
        for (let dx = -1; dx <= 1; dx++) {
            const nx = cx + dx;
            if (nx >= 0 && nx < CONFIG.GRID_WIDTH) {
                gameState.grid[cy][nx].terrain = 'cove';
            }
        }

        // Shallow edges
        if (cy + direction >= 0 && cy + direction < CONFIG.GRID_HEIGHT) {
            if (gameState.grid[cy + direction][cx].terrain.includes('land') ||
                gameState.grid[cy + direction][cx].terrain === 'forest') {
                gameState.grid[cy + direction][cx].terrain = 'shallow';
            }
        }
    }

    // Add a dock zone at cove end
    if (cy >= 0 && cy < CONFIG.GRID_HEIGHT && cx >= 0 && cx < CONFIG.GRID_WIDTH) {
        gameState.grid[cy][cx].terrain = 'dock_zone';
    }
}

function addDockZones() {
    // Add dock zones where water meets land
    for (let y = 1; y < CONFIG.GRID_HEIGHT - 1; y++) {
        for (let x = 1; x < CONFIG.GRID_WIDTH - 1; x++) {
            const tile = gameState.grid[y][x];
            if (tile.terrain === 'shallow' || tile.terrain === 'cove') {
                // Check if adjacent to land
                const adjacent = getAdjacentTiles(x, y);
                const nearLand = adjacent.some(a =>
                    a.terrain === 'land' || a.terrain === 'forest' || a.terrain === 'strip'
                );
                if (nearLand && Math.random() < 0.3) {
                    tile.terrain = 'dock_zone';
                }
            }
        }
    }
}

function generateTheStrip() {
    // The Strip - the famous entertainment district near Bagnell Dam
    const stripY = Math.floor(CONFIG.GRID_HEIGHT / 2) - 5;
    const stripStartX = CONFIG.GRID_WIDTH - 12;

    for (let y = stripY; y < stripY + 4; y++) {
        for (let x = stripStartX; x < CONFIG.GRID_WIDTH - 3; x++) {
            if (y >= 0 && y < CONFIG.GRID_HEIGHT && x >= 0 && x < CONFIG.GRID_WIDTH) {
                if (gameState.grid[y][x].terrain !== 'water' &&
                    gameState.grid[y][x].terrain !== 'deep_water') {
                    gameState.grid[y][x].terrain = 'strip';
                }
            }
        }
    }
}

function generateBagnellDam() {
    // Bagnell Dam at the east end (mile 0)
    const damX = CONFIG.GRID_WIDTH - 3;
    const damY = Math.floor(CONFIG.GRID_HEIGHT / 2);

    for (let dy = -2; dy <= 2; dy++) {
        const y = damY + dy;
        if (y >= 0 && y < CONFIG.GRID_HEIGHT) {
            gameState.grid[y][damX].terrain = 'dam';
            gameState.grid[y][damX + 1].terrain = 'dam';
        }
    }

    // Mile marker 0 at dam
    gameState.mileMarkers.push({ x: damX - 2, y: damY, mile: 0 });
}

// ==================== BUILDING SYSTEM ====================
function canPlaceBuilding(buildingType, x, y) {
    if (x < 0 || x >= CONFIG.GRID_WIDTH || y < 0 || y >= CONFIG.GRID_HEIGHT) {
        return false;
    }

    const tile = gameState.grid[y][x];
    const def = BUILDINGS[buildingType];

    if (tile.building) return false;

    // Check terrain requirements
    if (def.requiresTerrain) {
        if (!def.requiresTerrain.includes(tile.terrain)) {
            return false;
        }
    }

    // Check adjacent requirements
    if (def.requiresAdjacent) {
        const adjacent = getAdjacentTiles(x, y);
        const hasRequired = adjacent.some(adj =>
            def.requiresAdjacent.includes(adj.terrain)
        );
        if (!hasRequired) return false;
    }

    return canAfford(def.cost);
}

function canAfford(cost) {
    for (const [resource, amount] of Object.entries(cost)) {
        if ((gameState.resources[resource] || 0) < amount) {
            return false;
        }
    }
    return true;
}

function getAdjacentTiles(x, y) {
    const adjacent = [];
    const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];

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
    if (!canPlaceBuilding(buildingType, x, y)) return false;

    const def = BUILDINGS[buildingType];

    // Deduct costs
    for (const [resource, amount] of Object.entries(def.cost)) {
        gameState.resources[resource] -= amount;
    }

    const building = {
        type: buildingType,
        x: x,
        y: y,
        working: true,
        level: 1,
    };

    // Check workers
    if (def.requiresWorkers) {
        const availableWorkers = gameState.workers.total - gameState.workers.employed;
        if (availableWorkers >= def.requiresWorkers) {
            gameState.workers.employed += def.requiresWorkers;
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
                gameState.workers.total += Math.floor(amount * 0.7);
            } else {
                gameState.resources[resource] = (gameState.resources[resource] || 0) + amount;
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

    const index = gameState.buildings.indexOf(building);
    if (index > -1) gameState.buildings.splice(index, 1);
    tile.building = null;

    if (def.provides) {
        for (const [resource, amount] of Object.entries(def.provides)) {
            if (resource === 'population') {
                gameState.resources.population -= amount;
                gameState.workers.total -= Math.floor(amount * 0.7);
            } else {
                gameState.resources[resource] -= amount;
            }
        }
    }

    if (def.requiresWorkers && building.working) {
        gameState.workers.employed -= def.requiresWorkers;
    }

    // Partial refund
    gameState.resources.money += Math.floor((def.cost.money || 0) * 0.3);

    addEvent(`Demolished ${def.name}`, 'neutral');
    updateUI();
    render();

    return true;
}

// ==================== GAME LOOP ====================
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

    // Weekend bonus (every 7 ticks)
    gameState.weekendBonus = (gameState.tick % 7 === 5 || gameState.tick % 7 === 6);

    // Season change
    if (gameState.tick % CONFIG.TICKS_PER_SEASON === 0) {
        gameState.season = (gameState.season + 1) % 4;
        if (gameState.season === 0) {
            gameState.year++;
            addEvent(`Year ${gameState.year} begins!`, 'neutral');
        }
        const seasonName = CONFIG.SEASONS[gameState.season];
        addEvent(`${seasonName} has arrived!`, 'neutral');

        // Lake level fluctuation
        if (seasonName === 'Spring') {
            gameState.lakeLevel = 660 + Math.floor(Math.random() * 5);
            addEvent('Spring rains fill the lake!', 'positive');
        } else if (seasonName === 'Fall') {
            gameState.lakeLevel = 656 + Math.floor(Math.random() * 4);
        }
    }

    // Calculate production
    let income = 0;
    let boatProduction = 0;
    let tourismProduction = 0;
    let reputationChange = 0;
    let expenses = 0;

    const isSummer = CONFIG.SEASONS[gameState.season] === 'Summer';
    const seasonMultiplier = isSummer ? 2.0 : (CONFIG.SEASONS[gameState.season] === 'Spring' ? 1.2 : 0.6);
    const weekendMultiplier = gameState.weekendBonus ? 1.5 : 1.0;

    updateWorkerAssignments();

    gameState.buildings.forEach(building => {
        const def = BUILDINGS[building.type];

        if (building.working && def.produces) {
            let multiplier = seasonMultiplier * weekendMultiplier;

            if (def.produces.money) income += def.produces.money * multiplier;
            if (def.produces.boats) boatProduction += def.produces.boats;
            if (def.produces.tourism) tourismProduction += def.produces.tourism * multiplier;
            if (def.produces.reputation) reputationChange += def.produces.reputation;
        }

        if (def.upkeep?.money) expenses += def.upkeep.money;
    });

    // Tourism affects income
    income += gameState.resources.tourism * 2;

    // Apply resources
    gameState.resources.money += Math.floor(income - expenses);
    gameState.resources.boats += boatProduction;
    gameState.resources.tourism = Math.floor(Math.max(0, gameState.resources.tourism * 0.95 + tourismProduction));
    gameState.resources.reputation = Math.max(0, Math.min(100,
        gameState.resources.reputation + reputationChange * 0.1
    ));

    // Random events
    if (Math.random() < 0.03) {
        triggerRandomEvent();
    }

    // Weekend party event
    if (gameState.weekendBonus && isSummer && Math.random() < 0.1) {
        addEvent('Weekend warriors flood the lake! 🎉', 'party');
        gameState.resources.tourism += 20;
        gameState.resources.money += 500;
    }

    document.getElementById('income').textContent = `+$${Math.floor(income - expenses)}/s`;
    document.getElementById('lake-level').textContent = `${gameState.lakeLevel} ft`;

    updateUI();
    render();
}

function updateWorkerAssignments() {
    const available = gameState.workers.total - gameState.workers.employed;

    gameState.buildings.forEach(building => {
        const def = BUILDINGS[building.type];
        if (def.requiresWorkers && !building.working && available >= def.requiresWorkers) {
            building.working = true;
            gameState.workers.employed += def.requiresWorkers;
        }
    });
}

function triggerRandomEvent() {
    const isSummer = CONFIG.SEASONS[gameState.season] === 'Summer';

    const events = [
        {
            text: 'Bass tournament brings anglers from KC and STL!',
            effect: () => { gameState.resources.money += 300; gameState.resources.tourism += 15; },
            type: 'positive'
        },
        {
            text: 'Boat parade on the main channel!',
            effect: () => { gameState.resources.tourism += 25; gameState.resources.reputation += 2; },
            type: 'party',
            requiresSummer: true
        },
        {
            text: 'Celebrity spotted at the lake! Social media buzzing!',
            effect: () => { gameState.resources.tourism += 40; gameState.resources.reputation += 5; },
            type: 'positive'
        },
        {
            text: 'Storm rolls through - some dock damage',
            effect: () => { gameState.resources.money -= 200; },
            type: 'negative'
        },
        {
            text: 'Aquapalooza draws huge crowds!',
            effect: () => { gameState.resources.money += 800; gameState.resources.tourism += 50; },
            type: 'party',
            requiresSummer: true
        },
        {
            text: 'Gas prices up - more boaters staying local!',
            effect: () => { gameState.resources.tourism += 20; },
            type: 'positive'
        },
        {
            text: 'Lake featured on travel show!',
            effect: () => { gameState.resources.reputation += 8; gameState.resources.tourism += 30; },
            type: 'positive'
        },
        {
            text: 'Poker run brings high rollers!',
            effect: () => { gameState.resources.money += 600; },
            type: 'positive',
            requiresSummer: true
        },
    ];

    const validEvents = events.filter(e => !e.requiresSummer || isSummer);
    const event = validEvents[Math.floor(Math.random() * validEvents.length)];
    event.effect();
    addEvent(event.text, event.type);
}

// ==================== UI FUNCTIONS ====================
function updateUI() {
    document.getElementById('population').textContent = gameState.resources.population;
    document.getElementById('money').textContent = Math.floor(gameState.resources.money);
    document.getElementById('boats').textContent = gameState.resources.boats;
    document.getElementById('tourism').textContent = Math.floor(gameState.resources.tourism);
    document.getElementById('power').textContent = gameState.resources.power;
    document.getElementById('reputation').textContent = Math.floor(gameState.resources.reputation);

    document.getElementById('season').textContent = CONFIG.SEASONS[gameState.season] +
        (gameState.weekendBonus ? ' (Weekend!)' : '');
    document.getElementById('year').textContent = gameState.year;
    document.getElementById('town-name').textContent = gameState.playerName;

    updateBuildingList();
}

function updateBuildingList() {
    const list = document.getElementById('building-list');
    const activeCategory = document.querySelector('.category-btn.active')?.dataset.category || 'marina';

    list.innerHTML = '';

    Object.values(BUILDINGS).filter(b => b.category === activeCategory).forEach(building => {
        const canAffordIt = canAfford(building.cost);

        const div = document.createElement('div');
        div.className = `building-item ${!canAffordIt ? 'disabled' : ''} ${gameState.selectedBuilding === building.id ? 'selected' : ''}`;
        div.dataset.building = building.id;

        const costText = `$${building.cost.money || 0}`;

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
    html += `<p style="font-size:0.8rem">${building.description}</p>`;

    if (building.produces) {
        const prods = Object.entries(building.produces).map(([r,a]) => `+${a} ${r}`).join(', ');
        html += `<p><em>Produces: ${prods}</em></p>`;
    }
    if (building.requiresWorkers) {
        html += `<p><em>Workers: ${building.requiresWorkers}</em></p>`;
    }

    info.innerHTML = html;
}

function addEvent(text, type = 'neutral') {
    gameState.events.unshift({ text, type, tick: gameState.tick });
    if (gameState.events.length > 15) gameState.events.pop();

    const log = document.getElementById('event-log');
    log.innerHTML = gameState.events.map(e =>
        `<div class="event-item ${e.type}">${e.text}</div>`
    ).join('');
}

// ==================== INPUT HANDLING ====================
function initInput() {
    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mouseup', () => { isDragging = false; });
    canvas.addEventListener('wheel', onWheel);
    canvas.addEventListener('mouseleave', () => { hoverTile = null; render(); });
    canvas.addEventListener('contextmenu', e => e.preventDefault());

    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            gameState.selectedBuilding = null;
            updateBuildingList();
            updateBuildingInfo();
        });
    });

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
        gameState.camera.zoom = Math.max(0.4, gameState.camera.zoom - 0.2);
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

    document.getElementById('start-game').addEventListener('click', () => {
        gameState.playerName = document.getElementById('town-name-input').value || 'Lake Boss';
        document.getElementById('welcome-modal').classList.add('hidden');
        updateUI();
    });
}

function onMouseDown(e) {
    if (e.button === 0) {
        const tile = getTileAtMouse(e);
        if (tile) {
            if (gameState.selectedBuilding) {
                placeBuilding(gameState.selectedBuilding, tile.x, tile.y);
            } else if (gameState.demolishMode) {
                demolishBuilding(tile.x, tile.y);
            }
        }
    } else {
        isDragging = true;
        lastMouse = { x: e.clientX, y: e.clientY };
    }
    e.preventDefault();
}

function onMouseMove(e) {
    if (isDragging) {
        gameState.camera.x += e.clientX - lastMouse.x;
        gameState.camera.y += e.clientY - lastMouse.y;
        lastMouse = { x: e.clientX, y: e.clientY };
        render();
    } else {
        hoverTile = getTileAtMouse(e);
        render();
        updateTooltip(e);
    }
}

function onWheel(e) {
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    const oldZoom = gameState.camera.zoom;
    gameState.camera.zoom = Math.max(0.4, Math.min(2, gameState.camera.zoom + delta));

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
            text += '<br><span style="color:#ff8888">Needs workers!</span>';
        }
    }

    if (gameState.selectedBuilding) {
        const canPlace = canPlaceBuilding(gameState.selectedBuilding, hoverTile.x, hoverTile.y);
        text += canPlace ?
            '<br><span style="color:#88ff88">Click to build</span>' :
            '<br><span style="color:#ff8888">Cannot build here</span>';
    }

    tooltip.innerHTML = text;
    tooltip.style.left = (e.clientX + 15) + 'px';
    tooltip.style.top = (e.clientY + 15) + 'px';
    tooltip.classList.remove('hidden');
}

// ==================== INITIALIZATION ====================
function init() {
    initCanvas();
    generateMap();
    initInput();
    updateUI();
    render();
    startGameLoop();

    addEvent('Welcome to the Lake! 🚤', 'positive');
    addEvent('Start with boat docks on the water', 'neutral');
    addEvent('Build lodging to grow your workforce', 'neutral');
}

window.addEventListener('load', init);
