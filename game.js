// Lake of the Ozarks Tycoon - Main Game Engine
// Build your lakefront empire at Missouri's premier party lake!

// ==================== GLOBAL MODAL FUNCTIONS ====================
// These must be global for onclick handlers in HTML
function hideWelcomeModal() {
    const modal = document.getElementById('welcome-modal');
    if (modal) {
        modal.style.display = 'none';
        modal.style.visibility = 'hidden';
        modal.style.pointerEvents = 'none';
        modal.classList.add('hidden');

        // Set player name
        const nameInput = document.getElementById('town-name-input');
        if (nameInput && nameInput.value) {
            gameState.playerName = nameInput.value;
        } else {
            gameState.playerName = 'Lake Boss';
        }

        // Update UI
        if (typeof updateUI === 'function') {
            updateUI();
        }
    }
}
window.hideWelcomeModal = hideWelcomeModal;

// ==================== GAME CONFIGURATION ====================
const CONFIG = {
    GRID_WIDTH: 50,
    GRID_HEIGHT: 35,
    TILE_SIZE: 40,
    TICK_RATE: 1000,
    SEASONS: ['Spring', 'Summer', 'Summer', 'Fall'], // Double summer for lake life!
    TICKS_PER_SEASON: 25,
    LAKE_MILE_MARKERS: 92, // The real lake has mile markers 0-92
    SHOOTOUT_WEEK: 20, // Shootout happens late summer (tick 20 of summer)
};

// ==================== TERRAIN TYPES ====================
// Natural Ozark color palette
const TERRAIN = {
    LAND: { id: 'land', name: 'Shoreline', color: '#6b8c5a', buildable: true },
    FOREST: { id: 'forest', name: 'Woods', color: '#3a5a40', buildable: true },
    WATER: { id: 'water', name: 'Lake', color: '#4a7a6a', buildable: false, isWater: true },
    DEEP_WATER: { id: 'deep_water', name: 'Deep Channel', color: '#2a4a42', buildable: false, isWater: true },
    RACE_LANE: { id: 'race_lane', name: 'Race Lane', color: '#1a3a32', buildable: false, isWater: true, isRaceLane: true },
    COVE: { id: 'cove', name: 'Cove', color: '#5a8a7a', buildable: false, isWater: true, isCove: true },
    SHALLOW: { id: 'shallow', name: 'Shallow Water', color: '#7aaa9a', buildable: false, isWater: true },
    DOCK_ZONE: { id: 'dock_zone', name: 'Dock Area', color: '#5a9080', buildable: true, isWater: true },
    RACE_STAGING: { id: 'race_staging', name: 'Race Staging', color: '#3a6a5a', buildable: true, isWater: true, isRacing: true },
    DAM: { id: 'dam', name: 'Bagnell Dam', color: '#8a8a80', buildable: false },
    STRIP: { id: 'strip', name: 'The Strip', color: '#a89070', buildable: true, isStrip: true },
    PARKING: { id: 'parking', name: 'Parking Lot', color: '#605850', buildable: true },
};

// ==================== CUSTOM ICON DRAWING SYSTEM ====================
// Hand-drawn icons for a more authentic Ozark feel
const ICONS = {
    // Draw a pontoon/deck boat
    boat_dock: (ctx, cx, cy, size) => {
        const s = size * 0.4;
        // Dock planks
        ctx.fillStyle = '#8B7355';
        ctx.fillRect(cx - s, cy - s*0.3, s*2, s*0.6);
        // Dock posts
        ctx.fillStyle = '#5D4E37';
        ctx.fillRect(cx - s*0.8, cy + s*0.2, s*0.15, s*0.4);
        ctx.fillRect(cx + s*0.65, cy + s*0.2, s*0.15, s*0.4);
        // Boat
        ctx.fillStyle = '#E8E0D5';
        ctx.beginPath();
        ctx.moveTo(cx - s*0.5, cy - s*0.1);
        ctx.lineTo(cx + s*0.6, cy - s*0.1);
        ctx.lineTo(cx + s*0.4, cy - s*0.4);
        ctx.lineTo(cx - s*0.4, cy - s*0.4);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#6B5B4F';
        ctx.lineWidth = 1;
        ctx.stroke();
    },

    // Full service marina with fuel pump
    marina: (ctx, cx, cy, size) => {
        const s = size * 0.4;
        // Main dock
        ctx.fillStyle = '#7A6B5A';
        ctx.fillRect(cx - s, cy - s*0.2, s*2, s*0.8);
        // Fuel pump
        ctx.fillStyle = '#CC4444';
        ctx.fillRect(cx - s*0.2, cy - s*0.6, s*0.4, s*0.5);
        ctx.fillStyle = '#333';
        ctx.fillRect(cx - s*0.1, cy - s*0.8, s*0.2, s*0.2);
        // Hose
        ctx.strokeStyle = '#222';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx + s*0.1, cy - s*0.4);
        ctx.quadraticCurveTo(cx + s*0.5, cy - s*0.5, cx + s*0.4, cy - s*0.2);
        ctx.stroke();
        // Anchor symbol
        ctx.fillStyle = '#4A6B8A';
        ctx.beginPath();
        ctx.arc(cx, cy + s*0.4, s*0.2, 0, Math.PI * 2);
        ctx.fill();
    },

    // Boat rental with multiple boats
    boat_rental: (ctx, cx, cy, size) => {
        const s = size * 0.35;
        // Draw 3 small boats
        for (let i = 0; i < 3; i++) {
            const bx = cx - s + i * s;
            const by = cy - s*0.3 + (i % 2) * s*0.4;
            ctx.fillStyle = ['#E74C3C', '#3498DB', '#F1C40F'][i];
            ctx.beginPath();
            ctx.ellipse(bx, by, s*0.4, s*0.2, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 1;
            ctx.stroke();
        }
        // Sign
        ctx.fillStyle = '#2C3E50';
        ctx.fillRect(cx - s*0.6, cy + s*0.3, s*1.2, s*0.4);
        ctx.fillStyle = '#ECF0F1';
        ctx.font = `${s*0.25}px Arial`;
        ctx.textAlign = 'center';
        ctx.fillText('RENT', cx, cy + s*0.58);
    },

    // Yacht club with sailboat
    yacht_club: (ctx, cx, cy, size) => {
        const s = size * 0.4;
        // Building
        ctx.fillStyle = '#F5F5F0';
        ctx.fillRect(cx - s*0.8, cy - s*0.2, s*1.6, s*0.8);
        // Roof
        ctx.fillStyle = '#2C5F7C';
        ctx.beginPath();
        ctx.moveTo(cx - s, cy - s*0.2);
        ctx.lineTo(cx, cy - s*0.7);
        ctx.lineTo(cx + s, cy - s*0.2);
        ctx.closePath();
        ctx.fill();
        // Sailboat flag
        ctx.fillStyle = '#E74C3C';
        ctx.beginPath();
        ctx.moveTo(cx + s*0.5, cy - s*0.5);
        ctx.lineTo(cx + s*0.8, cy - s*0.4);
        ctx.lineTo(cx + s*0.5, cy - s*0.3);
        ctx.closePath();
        ctx.fill();
    },

    // Boat dealership
    boat_dealer: (ctx, cx, cy, size) => {
        const s = size * 0.4;
        // Showroom building
        ctx.fillStyle = '#ECF0F1';
        ctx.fillRect(cx - s, cy - s*0.3, s*2, s*0.9);
        // Windows
        ctx.fillStyle = '#85C1E9';
        ctx.fillRect(cx - s*0.8, cy - s*0.1, s*0.5, s*0.4);
        ctx.fillRect(cx + s*0.3, cy - s*0.1, s*0.5, s*0.4);
        // Sign
        ctx.fillStyle = '#1A5276';
        ctx.fillRect(cx - s*0.7, cy - s*0.6, s*1.4, s*0.25);
        // Display boat silhouette
        ctx.fillStyle = '#2C3E50';
        ctx.beginPath();
        ctx.moveTo(cx - s*0.4, cy + s*0.1);
        ctx.lineTo(cx + s*0.5, cy + s*0.1);
        ctx.lineTo(cx + s*0.3, cy - s*0.05);
        ctx.lineTo(cx - s*0.3, cy - s*0.05);
        ctx.closePath();
        ctx.fill();
    },

    // Lakefront resort
    resort: (ctx, cx, cy, size) => {
        const s = size * 0.4;
        // Main building
        ctx.fillStyle = '#D4A574';
        ctx.fillRect(cx - s*0.9, cy - s*0.4, s*1.8, s);
        // Roof
        ctx.fillStyle = '#6B4423';
        ctx.beginPath();
        ctx.moveTo(cx - s, cy - s*0.4);
        ctx.lineTo(cx, cy - s*0.9);
        ctx.lineTo(cx + s, cy - s*0.4);
        ctx.closePath();
        ctx.fill();
        // Windows
        ctx.fillStyle = '#F7DC6F';
        for (let i = 0; i < 3; i++) {
            ctx.fillRect(cx - s*0.7 + i*s*0.5, cy - s*0.2, s*0.25, s*0.3);
        }
        // Door
        ctx.fillStyle = '#5D4E37';
        ctx.fillRect(cx - s*0.1, cy + s*0.1, s*0.2, s*0.4);
    },

    // Lake condo
    condo: (ctx, cx, cy, size) => {
        const s = size * 0.4;
        // Tall building
        ctx.fillStyle = '#BDC3C7';
        ctx.fillRect(cx - s*0.5, cy - s*0.8, s, s*1.4);
        // Windows grid
        ctx.fillStyle = '#5DADE2';
        for (let row = 0; row < 4; row++) {
            for (let col = 0; col < 2; col++) {
                ctx.fillRect(cx - s*0.35 + col*s*0.4, cy - s*0.65 + row*s*0.35, s*0.2, s*0.2);
            }
        }
        // Balconies
        ctx.strokeStyle = '#7F8C8D';
        ctx.lineWidth = 1;
        ctx.strokeRect(cx - s*0.45, cy - s*0.3, s*0.9, s*0.15);
        ctx.strokeRect(cx - s*0.45, cy + s*0.2, s*0.9, s*0.15);
    },

    // Cabin rentals
    cabin: (ctx, cx, cy, size) => {
        const s = size * 0.4;
        // Log cabin body
        ctx.fillStyle = '#8B6914';
        ctx.fillRect(cx - s*0.7, cy - s*0.2, s*1.4, s*0.7);
        // Log texture lines
        ctx.strokeStyle = '#5D4E37';
        ctx.lineWidth = 1;
        for (let i = 0; i < 4; i++) {
            ctx.beginPath();
            ctx.moveTo(cx - s*0.7, cy - s*0.1 + i*s*0.18);
            ctx.lineTo(cx + s*0.7, cy - s*0.1 + i*s*0.18);
            ctx.stroke();
        }
        // Roof
        ctx.fillStyle = '#4A4A4A';
        ctx.beginPath();
        ctx.moveTo(cx - s*0.85, cy - s*0.2);
        ctx.lineTo(cx, cy - s*0.7);
        ctx.lineTo(cx + s*0.85, cy - s*0.2);
        ctx.closePath();
        ctx.fill();
        // Chimney
        ctx.fillStyle = '#7B7B7B';
        ctx.fillRect(cx + s*0.3, cy - s*0.8, s*0.2, s*0.35);
    },

    // RV park
    rv_park: (ctx, cx, cy, size) => {
        const s = size * 0.35;
        // RV body
        ctx.fillStyle = '#ECF0F1';
        ctx.fillRect(cx - s*0.8, cy - s*0.3, s*1.6, s*0.7);
        // Windows
        ctx.fillStyle = '#3498DB';
        ctx.fillRect(cx - s*0.6, cy - s*0.15, s*0.3, s*0.25);
        ctx.fillRect(cx + s*0.1, cy - s*0.15, s*0.4, s*0.25);
        // Wheels
        ctx.fillStyle = '#2C3E50';
        ctx.beginPath();
        ctx.arc(cx - s*0.4, cy + s*0.4, s*0.15, 0, Math.PI * 2);
        ctx.arc(cx + s*0.4, cy + s*0.4, s*0.15, 0, Math.PI * 2);
        ctx.fill();
        // Awning
        ctx.fillStyle = '#E74C3C';
        ctx.beginPath();
        ctx.moveTo(cx - s*0.8, cy - s*0.3);
        ctx.lineTo(cx - s*1.1, cy + s*0.1);
        ctx.lineTo(cx - s*0.8, cy + s*0.1);
        ctx.closePath();
        ctx.fill();
    },

    // Tiki bar
    tiki_bar: (ctx, cx, cy, size) => {
        const s = size * 0.4;
        // Thatched roof
        ctx.fillStyle = '#C4A35A';
        ctx.beginPath();
        ctx.moveTo(cx - s, cy - s*0.3);
        ctx.lineTo(cx, cy - s*0.8);
        ctx.lineTo(cx + s, cy - s*0.3);
        ctx.closePath();
        ctx.fill();
        // Thatch texture
        ctx.strokeStyle = '#8B7355';
        ctx.lineWidth = 1;
        for (let i = 0; i < 5; i++) {
            ctx.beginPath();
            ctx.moveTo(cx - s*0.8 + i*s*0.4, cy - s*0.2);
            ctx.lineTo(cx - s*0.4 + i*s*0.2, cy - s*0.6);
            ctx.stroke();
        }
        // Bar counter
        ctx.fillStyle = '#5D4E37';
        ctx.fillRect(cx - s*0.7, cy - s*0.1, s*1.4, s*0.4);
        // Stools
        ctx.fillStyle = '#8B4513';
        ctx.beginPath();
        ctx.arc(cx - s*0.4, cy + s*0.5, s*0.12, 0, Math.PI * 2);
        ctx.arc(cx + s*0.4, cy + s*0.5, s*0.12, 0, Math.PI * 2);
        ctx.fill();
    },

    // Lakeside restaurant
    restaurant: (ctx, cx, cy, size) => {
        const s = size * 0.4;
        // Building
        ctx.fillStyle = '#E8D4B8';
        ctx.fillRect(cx - s*0.8, cy - s*0.3, s*1.6, s*0.9);
        // Roof
        ctx.fillStyle = '#922B21';
        ctx.fillRect(cx - s*0.9, cy - s*0.45, s*1.8, s*0.2);
        // Door
        ctx.fillStyle = '#5D4E37';
        ctx.fillRect(cx - s*0.15, cy + s*0.15, s*0.3, s*0.45);
        // Windows
        ctx.fillStyle = '#F9E79F';
        ctx.fillRect(cx - s*0.6, cy - s*0.1, s*0.3, s*0.3);
        ctx.fillRect(cx + s*0.3, cy - s*0.1, s*0.3, s*0.3);
        // Sign
        ctx.fillStyle = '#1A5276';
        ctx.beginPath();
        ctx.arc(cx + s*0.6, cy - s*0.6, s*0.2, 0, Math.PI * 2);
        ctx.fill();
    },

    // Party cove float
    party_cove: (ctx, cx, cy, size) => {
        const s = size * 0.4;
        // Large float/platform
        ctx.fillStyle = '#F39C12';
        ctx.beginPath();
        ctx.ellipse(cx, cy, s*0.9, s*0.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#D68910';
        ctx.lineWidth = 2;
        ctx.stroke();
        // Party people (simple shapes)
        ctx.fillStyle = '#E74C3C';
        ctx.beginPath();
        ctx.arc(cx - s*0.3, cy - s*0.1, s*0.15, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#3498DB';
        ctx.beginPath();
        ctx.arc(cx + s*0.2, cy + s*0.1, s*0.15, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#2ECC71';
        ctx.beginPath();
        ctx.arc(cx, cy - s*0.25, s*0.12, 0, Math.PI * 2);
        ctx.fill();
        // Music notes
        ctx.fillStyle = '#333';
        ctx.font = `${s*0.4}px Arial`;
        ctx.fillText('♪', cx + s*0.5, cy - s*0.3);
    },

    // Mini golf
    mini_golf: (ctx, cx, cy, size) => {
        const s = size * 0.4;
        // Green
        ctx.fillStyle = '#27AE60';
        ctx.beginPath();
        ctx.ellipse(cx, cy, s*0.8, s*0.5, 0, 0, Math.PI * 2);
        ctx.fill();
        // Hole
        ctx.fillStyle = '#1A1A1A';
        ctx.beginPath();
        ctx.arc(cx + s*0.3, cy, s*0.1, 0, Math.PI * 2);
        ctx.fill();
        // Flag
        ctx.strokeStyle = '#ECF0F1';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx + s*0.3, cy);
        ctx.lineTo(cx + s*0.3, cy - s*0.6);
        ctx.stroke();
        ctx.fillStyle = '#E74C3C';
        ctx.beginPath();
        ctx.moveTo(cx + s*0.3, cy - s*0.6);
        ctx.lineTo(cx + s*0.6, cy - s*0.45);
        ctx.lineTo(cx + s*0.3, cy - s*0.3);
        ctx.closePath();
        ctx.fill();
        // Sand trap
        ctx.fillStyle = '#F5DEB3';
        ctx.beginPath();
        ctx.ellipse(cx - s*0.4, cy + s*0.2, s*0.2, s*0.1, 0, 0, Math.PI * 2);
        ctx.fill();
    },

    // Arcade
    arcade: (ctx, cx, cy, size) => {
        const s = size * 0.4;
        // Building
        ctx.fillStyle = '#2C3E50';
        ctx.fillRect(cx - s*0.8, cy - s*0.4, s*1.6, s);
        // Neon sign glow
        ctx.fillStyle = '#FF6B9D';
        ctx.fillRect(cx - s*0.6, cy - s*0.6, s*1.2, s*0.25);
        // Door
        ctx.fillStyle = '#1A1A1A';
        ctx.fillRect(cx - s*0.2, cy + s*0.1, s*0.4, s*0.5);
        // Game screen
        ctx.fillStyle = '#00FF00';
        ctx.fillRect(cx - s*0.55, cy - s*0.2, s*0.3, s*0.35);
        ctx.fillStyle = '#FF00FF';
        ctx.fillRect(cx + s*0.25, cy - s*0.2, s*0.3, s*0.35);
    },

    // Water park
    water_park: (ctx, cx, cy, size) => {
        const s = size * 0.4;
        // Slide tower
        ctx.fillStyle = '#3498DB';
        ctx.fillRect(cx - s*0.3, cy - s*0.8, s*0.6, s*0.5);
        // Slide
        ctx.strokeStyle = '#E74C3C';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(cx, cy - s*0.3);
        ctx.quadraticCurveTo(cx + s*0.6, cy, cx + s*0.8, cy + s*0.5);
        ctx.stroke();
        // Pool
        ctx.fillStyle = '#85C1E9';
        ctx.beginPath();
        ctx.ellipse(cx, cy + s*0.3, s*0.7, s*0.3, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#2980B9';
        ctx.lineWidth = 2;
        ctx.stroke();
    },

    // Gas station
    gas_station: (ctx, cx, cy, size) => {
        const s = size * 0.4;
        // Canopy
        ctx.fillStyle = '#ECF0F1';
        ctx.fillRect(cx - s*0.9, cy - s*0.6, s*1.8, s*0.15);
        // Canopy supports
        ctx.fillStyle = '#BDC3C7';
        ctx.fillRect(cx - s*0.8, cy - s*0.45, s*0.1, s*0.6);
        ctx.fillRect(cx + s*0.7, cy - s*0.45, s*0.1, s*0.6);
        // Pumps
        ctx.fillStyle = '#E74C3C';
        ctx.fillRect(cx - s*0.4, cy - s*0.3, s*0.25, s*0.45);
        ctx.fillRect(cx + s*0.15, cy - s*0.3, s*0.25, s*0.45);
        // Store
        ctx.fillStyle = '#85929E';
        ctx.fillRect(cx - s*0.5, cy + s*0.2, s, s*0.4);
    },

    // Bait shop
    bait_shop: (ctx, cx, cy, size) => {
        const s = size * 0.4;
        // Small shack
        ctx.fillStyle = '#A04000';
        ctx.fillRect(cx - s*0.6, cy - s*0.2, s*1.2, s*0.7);
        // Roof
        ctx.fillStyle = '#5D4E37';
        ctx.beginPath();
        ctx.moveTo(cx - s*0.75, cy - s*0.2);
        ctx.lineTo(cx, cy - s*0.6);
        ctx.lineTo(cx + s*0.75, cy - s*0.2);
        ctx.closePath();
        ctx.fill();
        // Sign
        ctx.fillStyle = '#F4D03F';
        ctx.fillRect(cx - s*0.4, cy - s*0.05, s*0.8, s*0.25);
        ctx.fillStyle = '#1A1A1A';
        ctx.font = `${s*0.2}px Arial`;
        ctx.textAlign = 'center';
        ctx.fillText('BAIT', cx, cy + s*0.12);
        // Bucket
        ctx.fillStyle = '#5DADE2';
        ctx.fillRect(cx + s*0.5, cy + s*0.25, s*0.2, s*0.2);
    },

    // Souvenir shop
    souvenir_shop: (ctx, cx, cy, size) => {
        const s = size * 0.4;
        // Building
        ctx.fillStyle = '#F1948A';
        ctx.fillRect(cx - s*0.7, cy - s*0.3, s*1.4, s*0.9);
        // Awning
        ctx.fillStyle = '#E74C3C';
        ctx.beginPath();
        ctx.moveTo(cx - s*0.7, cy - s*0.3);
        ctx.lineTo(cx - s*0.85, cy);
        ctx.lineTo(cx + s*0.85, cy);
        ctx.lineTo(cx + s*0.7, cy - s*0.3);
        ctx.closePath();
        ctx.fill();
        // Stripes on awning
        ctx.fillStyle = '#FFFFFF';
        for (let i = 0; i < 4; i++) {
            ctx.fillRect(cx - s*0.6 + i*s*0.35, cy - s*0.25, s*0.1, s*0.3);
        }
        // Window
        ctx.fillStyle = '#85C1E9';
        ctx.fillRect(cx - s*0.35, cy + s*0.1, s*0.7, s*0.35);
    },

    // Parking structure
    parking_structure: (ctx, cx, cy, size) => {
        const s = size * 0.4;
        // Multi-level structure
        ctx.fillStyle = '#7F8C8D';
        ctx.fillRect(cx - s*0.8, cy - s*0.5, s*1.6, s*1.1);
        // Levels
        ctx.strokeStyle = '#566573';
        ctx.lineWidth = 2;
        for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.moveTo(cx - s*0.8, cy - s*0.3 + i*s*0.35);
            ctx.lineTo(cx + s*0.8, cy - s*0.3 + i*s*0.35);
            ctx.stroke();
        }
        // Entrance
        ctx.fillStyle = '#1A1A1A';
        ctx.fillRect(cx - s*0.3, cy + s*0.25, s*0.6, s*0.35);
        // P sign
        ctx.fillStyle = '#3498DB';
        ctx.beginPath();
        ctx.arc(cx, cy - s*0.1, s*0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#FFF';
        ctx.font = `bold ${s*0.25}px Arial`;
        ctx.textAlign = 'center';
        ctx.fillText('P', cx, cy - s*0.03);
    },

    // Road
    road: (ctx, cx, cy, size) => {
        const s = size * 0.45;
        // Asphalt
        ctx.fillStyle = '#4A4A4A';
        ctx.fillRect(cx - s, cy - s*0.4, s*2, s*0.8);
        // Center line
        ctx.strokeStyle = '#F1C40F';
        ctx.lineWidth = 2;
        ctx.setLineDash([s*0.2, s*0.15]);
        ctx.beginPath();
        ctx.moveTo(cx - s, cy);
        ctx.lineTo(cx + s, cy);
        ctx.stroke();
        ctx.setLineDash([]);
    },

    // === RACING BUILDINGS ===
    race_dock: (ctx, cx, cy, size) => {
        const s = size * 0.4;
        // Heavy duty dock
        ctx.fillStyle = '#5D4E37';
        ctx.fillRect(cx - s*0.9, cy - s*0.2, s*1.8, s*0.6);
        // Metal reinforcement
        ctx.strokeStyle = '#7B7B7B';
        ctx.lineWidth = 2;
        ctx.strokeRect(cx - s*0.85, cy - s*0.15, s*1.7, s*0.5);
        // Speed boat
        ctx.fillStyle = '#C0392B';
        ctx.beginPath();
        ctx.moveTo(cx - s*0.5, cy - s*0.3);
        ctx.lineTo(cx + s*0.6, cy - s*0.3);
        ctx.lineTo(cx + s*0.7, cy - s*0.5);
        ctx.lineTo(cx - s*0.3, cy - s*0.5);
        ctx.closePath();
        ctx.fill();
        // Racing stripe
        ctx.fillStyle = '#F1C40F';
        ctx.fillRect(cx - s*0.4, cy - s*0.45, s*0.8, s*0.08);
    },

    timing_tower: (ctx, cx, cy, size) => {
        const s = size * 0.4;
        // Tower structure
        ctx.fillStyle = '#2C3E50';
        ctx.fillRect(cx - s*0.4, cy - s*0.8, s*0.8, s*1.4);
        // Windows
        ctx.fillStyle = '#85C1E9';
        ctx.fillRect(cx - s*0.3, cy - s*0.65, s*0.6, s*0.35);
        // Clock/timer display
        ctx.fillStyle = '#E74C3C';
        ctx.fillRect(cx - s*0.25, cy - s*0.2, s*0.5, s*0.25);
        ctx.fillStyle = '#FFF';
        ctx.font = `${s*0.2}px Arial`;
        ctx.textAlign = 'center';
        ctx.fillText('00:00', cx, cy - s*0.02);
        // Antenna
        ctx.strokeStyle = '#7B7B7B';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx, cy - s*0.8);
        ctx.lineTo(cx, cy - s*1.1);
        ctx.stroke();
    },

    spectator_stands: (ctx, cx, cy, size) => {
        const s = size * 0.4;
        // Bleacher rows
        for (let i = 0; i < 4; i++) {
            ctx.fillStyle = i % 2 === 0 ? '#BDC3C7' : '#95A5A6';
            ctx.fillRect(cx - s*0.8, cy - s*0.4 + i*s*0.3, s*1.6, s*0.25);
        }
        // Support structure
        ctx.fillStyle = '#7B7B7B';
        ctx.beginPath();
        ctx.moveTo(cx - s*0.9, cy + s*0.5);
        ctx.lineTo(cx - s*0.7, cy - s*0.5);
        ctx.lineTo(cx + s*0.7, cy - s*0.5);
        ctx.lineTo(cx + s*0.9, cy + s*0.5);
        ctx.closePath();
        ctx.fill();
        // People (colored dots)
        const colors = ['#E74C3C', '#3498DB', '#F1C40F', '#2ECC71', '#9B59B6'];
        for (let i = 0; i < 8; i++) {
            ctx.fillStyle = colors[i % colors.length];
            ctx.beginPath();
            ctx.arc(cx - s*0.6 + (i % 4)*s*0.4, cy - s*0.25 + Math.floor(i/4)*s*0.3, s*0.08, 0, Math.PI * 2);
            ctx.fill();
        }
    },

    speed_boat_shop: (ctx, cx, cy, size) => {
        const s = size * 0.4;
        // Building
        ctx.fillStyle = '#2C3E50';
        ctx.fillRect(cx - s*0.8, cy - s*0.3, s*1.6, s*0.9);
        // Large window/showroom
        ctx.fillStyle = '#85C1E9';
        ctx.fillRect(cx - s*0.65, cy - s*0.15, s*1.3, s*0.5);
        // Display boat
        ctx.fillStyle = '#E74C3C';
        ctx.beginPath();
        ctx.moveTo(cx - s*0.4, cy + s*0.15);
        ctx.lineTo(cx + s*0.5, cy + s*0.15);
        ctx.lineTo(cx + s*0.6, cy);
        ctx.lineTo(cx - s*0.3, cy);
        ctx.closePath();
        ctx.fill();
        // Racing stripes
        ctx.fillStyle = '#F1C40F';
        ctx.fillRect(cx - s*0.3, cy + s*0.03, s*0.6, s*0.05);
        // Sign
        ctx.fillStyle = '#C0392B';
        ctx.fillRect(cx - s*0.5, cy - s*0.55, s, s*0.2);
    },

    race_fuel_station: (ctx, cx, cy, size) => {
        const s = size * 0.4;
        // Canopy
        ctx.fillStyle = '#C0392B';
        ctx.fillRect(cx - s*0.9, cy - s*0.5, s*1.8, s*0.15);
        // Pillars
        ctx.fillStyle = '#7B7B7B';
        ctx.fillRect(cx - s*0.8, cy - s*0.35, s*0.15, s*0.7);
        ctx.fillRect(cx + s*0.65, cy - s*0.35, s*0.15, s*0.7);
        // Racing fuel pumps
        ctx.fillStyle = '#F1C40F';
        ctx.fillRect(cx - s*0.35, cy - s*0.25, s*0.3, s*0.5);
        ctx.fillRect(cx + s*0.05, cy - s*0.25, s*0.3, s*0.5);
        // High octane label
        ctx.fillStyle = '#E74C3C';
        ctx.fillRect(cx - s*0.3, cy - s*0.15, s*0.2, s*0.15);
        ctx.fillRect(cx + s*0.1, cy - s*0.15, s*0.2, s*0.15);
    },

    vip_race_lounge: (ctx, cx, cy, size) => {
        const s = size * 0.4;
        // Luxury building
        ctx.fillStyle = '#1A1A1A';
        ctx.fillRect(cx - s*0.8, cy - s*0.4, s*1.6, s);
        // Gold trim
        ctx.strokeStyle = '#F1C40F';
        ctx.lineWidth = 3;
        ctx.strokeRect(cx - s*0.75, cy - s*0.35, s*1.5, s*0.9);
        // Large tinted windows
        ctx.fillStyle = '#2C3E50';
        ctx.fillRect(cx - s*0.6, cy - s*0.2, s*1.2, s*0.4);
        // VIP text
        ctx.fillStyle = '#F1C40F';
        ctx.font = `bold ${s*0.25}px Arial`;
        ctx.textAlign = 'center';
        ctx.fillText('VIP', cx, cy + s*0.45);
        // Stars
        ctx.font = `${s*0.2}px Arial`;
        ctx.fillText('★★★', cx, cy - s*0.55);
    },

    helicopter_pad: (ctx, cx, cy, size) => {
        const s = size * 0.4;
        // Pad surface
        ctx.fillStyle = '#4A4A4A';
        ctx.beginPath();
        ctx.arc(cx, cy, s*0.9, 0, Math.PI * 2);
        ctx.fill();
        // H marking
        ctx.strokeStyle = '#F1C40F';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(cx - s*0.4, cy - s*0.5);
        ctx.lineTo(cx - s*0.4, cy + s*0.5);
        ctx.moveTo(cx + s*0.4, cy - s*0.5);
        ctx.lineTo(cx + s*0.4, cy + s*0.5);
        ctx.moveTo(cx - s*0.4, cy);
        ctx.lineTo(cx + s*0.4, cy);
        ctx.stroke();
        // Circle marking
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, s*0.7, 0, Math.PI * 2);
        ctx.stroke();
    },

    race_team_hq: (ctx, cx, cy, size) => {
        const s = size * 0.4;
        // Main building
        ctx.fillStyle = '#2C3E50';
        ctx.fillRect(cx - s*0.8, cy - s*0.5, s*1.6, s*1.1);
        // Garage doors
        ctx.fillStyle = '#7B7B7B';
        ctx.fillRect(cx - s*0.65, cy, s*0.5, s*0.5);
        ctx.fillRect(cx + s*0.15, cy, s*0.5, s*0.5);
        // Racing logo
        ctx.fillStyle = '#E74C3C';
        ctx.beginPath();
        ctx.arc(cx, cy - s*0.25, s*0.25, 0, Math.PI * 2);
        ctx.fill();
        // Checkered pattern
        ctx.fillStyle = '#FFF';
        ctx.fillRect(cx - s*0.15, cy - s*0.35, s*0.1, s*0.1);
        ctx.fillRect(cx + s*0.05, cy - s*0.25, s*0.1, s*0.1);
        ctx.fillRect(cx - s*0.15, cy - s*0.15, s*0.1, s*0.1);
        // Flag
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.moveTo(cx + s*0.6, cy - s*0.5);
        ctx.lineTo(cx + s*0.6, cy - s*0.85);
        ctx.lineTo(cx + s*0.85, cy - s*0.7);
        ctx.lineTo(cx + s*0.6, cy - s*0.55);
        ctx.closePath();
        ctx.fill();
    },

    // Default fallback icon
    default: (ctx, cx, cy, size) => {
        const s = size * 0.35;
        ctx.fillStyle = '#95A5A6';
        ctx.fillRect(cx - s, cy - s, s*2, s*2);
        ctx.strokeStyle = '#7F8C8D';
        ctx.lineWidth = 2;
        ctx.strokeRect(cx - s, cy - s, s*2, s*2);
        ctx.fillStyle = '#FFF';
        ctx.font = `${s}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('?', cx, cy);
    }
};

// ==================== BOAT RACING SYSTEM ====================
// The Shootout is the heart of Lake of the Ozarks - like New Year's Eve!

// Boat Classes - Different categories for racing
const BOAT_CLASSES = {
    STOCK: { id: 'stock', name: 'Stock Outboard', minSpeed: 40, maxSpeed: 70 },
    MODIFIED: { id: 'modified', name: 'Modified', minSpeed: 70, maxSpeed: 120 },
    SUPERSTOCK: { id: 'superstock', name: 'Super Stock', minSpeed: 100, maxSpeed: 160 },
    PRO: { id: 'pro', name: 'Pro Class', minSpeed: 140, maxSpeed: 200 },
    UNLIMITED: { id: 'unlimited', name: 'Unlimited', minSpeed: 180, maxSpeed: 250 },
    TOP_SPEED: { id: 'top_speed', name: 'Top Speed', minSpeed: 200, maxSpeed: 300 },
};

// Boat Hulls - Base boat types you can buy
const BOAT_HULLS = {
    pontoon: {
        id: 'pontoon', name: 'Party Pontoon', price: 2000,
        baseSpeed: 25, handling: 40, durability: 90,
        description: 'Slow but steady. Great for learning.',
        maxClass: 'STOCK',
    },
    fishing: {
        id: 'fishing', name: 'Bass Boat', price: 8000,
        baseSpeed: 45, handling: 60, durability: 70,
        description: 'Nimble fishing boat with decent speed.',
        maxClass: 'STOCK',
    },
    bowrider: {
        id: 'bowrider', name: 'Bowrider', price: 25000,
        baseSpeed: 55, handling: 70, durability: 65,
        description: 'Popular family boat, can be modified.',
        maxClass: 'MODIFIED',
    },
    deckboat: {
        id: 'deckboat', name: 'Deck Boat', price: 35000,
        baseSpeed: 50, handling: 65, durability: 75,
        description: 'Spacious with room for upgrades.',
        maxClass: 'MODIFIED',
    },
    cigarette: {
        id: 'cigarette', name: 'Cigarette Boat', price: 150000,
        baseSpeed: 85, handling: 55, durability: 50,
        description: 'Classic offshore racer. Built for speed.',
        maxClass: 'PRO',
    },
    catamaran: {
        id: 'catamaran', name: 'Racing Catamaran', price: 300000,
        baseSpeed: 100, handling: 70, durability: 45,
        description: 'Twin-hull speed machine.',
        maxClass: 'UNLIMITED',
    },
    hydroplane: {
        id: 'hydroplane', name: 'Hydroplane', price: 500000,
        baseSpeed: 120, handling: 40, durability: 30,
        description: 'Skims the water at incredible speeds.',
        maxClass: 'TOP_SPEED',
    },
    custom: {
        id: 'custom', name: 'Custom Build', price: 1000000,
        baseSpeed: 80, handling: 80, durability: 60,
        description: 'Start from scratch. Unlimited potential.',
        maxClass: 'TOP_SPEED',
    },
};

// Engine Upgrades
const ENGINES = {
    stock: { id: 'stock', name: 'Stock Engine', price: 0, speedBonus: 0, reliability: 95 },
    tuned: { id: 'tuned', name: 'Tuned Engine', price: 5000, speedBonus: 15, reliability: 90 },
    performance: { id: 'performance', name: 'Performance', price: 15000, speedBonus: 30, reliability: 85 },
    racing: { id: 'racing', name: 'Racing Engine', price: 40000, speedBonus: 50, reliability: 75 },
    supercharged: { id: 'supercharged', name: 'Supercharged', price: 80000, speedBonus: 70, reliability: 65 },
    turbocharged: { id: 'turbocharged', name: 'Twin Turbo', price: 120000, speedBonus: 90, reliability: 55 },
    nitro: { id: 'nitro', name: 'Nitro Injected', price: 200000, speedBonus: 120, reliability: 40 },
};

// Propeller Upgrades
const PROPELLERS = {
    stock: { id: 'stock', name: 'Stock Prop', price: 0, speedBonus: 0, handling: 0 },
    stainless: { id: 'stainless', name: 'Stainless Steel', price: 2000, speedBonus: 5, handling: 5 },
    cleaver: { id: 'cleaver', name: 'Cleaver Prop', price: 8000, speedBonus: 12, handling: -5 },
    racing: { id: 'racing', name: 'Racing Prop', price: 15000, speedBonus: 20, handling: 0 },
    surface: { id: 'surface', name: 'Surface Drive', price: 35000, speedBonus: 35, handling: 10 },
};

// Hull Modifications
const HULL_MODS = {
    none: { id: 'none', name: 'Stock Hull', price: 0, speedBonus: 0, handling: 0 },
    gel_coat: { id: 'gel_coat', name: 'Gel Coat Polish', price: 3000, speedBonus: 3, handling: 0 },
    fiberglass: { id: 'fiberglass', name: 'Fiberglass Reinforced', price: 10000, speedBonus: 5, handling: 5 },
    carbon_fiber: { id: 'carbon_fiber', name: 'Carbon Fiber', price: 50000, speedBonus: 15, handling: 10 },
    kevlar: { id: 'kevlar', name: 'Kevlar Composite', price: 100000, speedBonus: 25, handling: 15 },
};

// Weight Reduction
const WEIGHT_MODS = {
    none: { id: 'none', name: 'Stock Weight', price: 0, speedBonus: 0 },
    light: { id: 'light', name: 'Lightweight Interior', price: 5000, speedBonus: 8 },
    stripped: { id: 'stripped', name: 'Stripped Down', price: 12000, speedBonus: 18 },
    racing: { id: 'racing', name: 'Racing Stripped', price: 30000, speedBonus: 30 },
    skeleton: { id: 'skeleton', name: 'Skeleton Build', price: 75000, speedBonus: 45 },
};

// Paint Jobs / Wraps
const PAINT_JOBS = {
    stock: { id: 'stock', name: 'Factory Paint', price: 0, style: 'basic' },
    metallic: { id: 'metallic', name: 'Metallic', price: 3000, style: 'shiny' },
    pearl: { id: 'pearl', name: 'Pearl White', price: 5000, style: 'elegant' },
    flames: { id: 'flames', name: 'Racing Flames', price: 8000, style: 'aggressive' },
    lightning: { id: 'lightning', name: 'Lightning Bolt', price: 8000, style: 'electric' },
    camo: { id: 'camo', name: 'Lake Camo', price: 6000, style: 'stealth' },
    custom_wrap: { id: 'custom_wrap', name: 'Custom Wrap', price: 15000, style: 'unique' },
    chrome: { id: 'chrome', name: 'Chrome Finish', price: 25000, style: 'flashy' },
    gold: { id: 'gold', name: 'Gold Plated', price: 100000, style: 'luxury' },
};

// Racing Calendar - Events throughout the year
const RACE_CALENDAR = [
    { week: 8, name: 'Spring Splash', type: 'circuit', purse: 5000, prestige: 10 },
    { week: 12, name: 'Gravois Arm GP', type: 'circuit', purse: 10000, prestige: 20 },
    { week: 16, name: 'Party Cove Classic', type: 'circuit', purse: 15000, prestige: 30 },
    { week: 20, name: 'Niangua Shootout Preview', type: 'circuit', purse: 25000, prestige: 50 },
    { week: 24, name: 'THE SHOOTOUT - Day 1', type: 'shootout', purse: 50000, prestige: 100 },
    { week: 25, name: 'THE SHOOTOUT - Day 2', type: 'shootout', purse: 75000, prestige: 150 },
    { week: 26, name: 'THE SHOOTOUT - Day 3', type: 'shootout', purse: 100000, prestige: 200 },
    { week: 27, name: 'THE SHOOTOUT - FINALS', type: 'shootout_finals', purse: 250000, prestige: 500 },
];

// Create a new boat
function createBoat(hullId, name) {
    const hull = BOAT_HULLS[hullId];
    return {
        id: Date.now(),
        name: name || `${hull.name} #${Math.floor(Math.random() * 999)}`,
        hull: hullId,
        engine: 'stock',
        propeller: 'stock',
        hullMod: 'none',
        weightMod: 'none',
        paint: 'stock',
        stats: calculateBoatStats(hullId, 'stock', 'stock', 'none', 'none'),
        races: 0,
        wins: 0,
        bestSpeed: 0,
        totalEarnings: 0,
    };
}

// Calculate boat's total stats based on parts
function calculateBoatStats(hullId, engineId, propId, hullModId, weightModId) {
    const hull = BOAT_HULLS[hullId];
    const engine = ENGINES[engineId];
    const prop = PROPELLERS[propId];
    const hullMod = HULL_MODS[hullModId];
    const weightMod = WEIGHT_MODS[weightModId];

    const speed = hull.baseSpeed + engine.speedBonus + prop.speedBonus + hullMod.speedBonus + weightMod.speedBonus;
    const handling = hull.handling + prop.handling + hullMod.handling;
    const reliability = Math.max(10, engine.reliability - (100 - hull.durability) / 5);

    return {
        speed: Math.round(speed),
        topSpeed: Math.round(speed * 1.15), // Top speed with perfect run
        handling: Math.max(10, Math.min(100, handling)),
        reliability: Math.round(reliability),
        class: determineBoatClass(speed),
    };
}

// Determine which racing class a boat qualifies for
function determineBoatClass(speed) {
    if (speed >= 200) return 'TOP_SPEED';
    if (speed >= 180) return 'UNLIMITED';
    if (speed >= 140) return 'PRO';
    if (speed >= 100) return 'SUPERSTOCK';
    if (speed >= 70) return 'MODIFIED';
    return 'STOCK';
}

// Calculate race result
function simulateRace(boat, raceType, weather = 'clear') {
    const stats = boat.stats;
    let baseSpeed = stats.speed;

    // Weather effects
    const weatherMods = {
        clear: 1.0,
        cloudy: 0.98,
        windy: 0.92,
        choppy: 0.85,
        stormy: 0.75,
    };
    baseSpeed *= weatherMods[weather] || 1.0;

    // Handling affects consistency
    const handlingFactor = stats.handling / 100;
    const variance = (1 - handlingFactor) * 15; // More handling = less variance

    // Reliability check - can break down!
    const breakdownRoll = Math.random() * 100;
    if (breakdownRoll > stats.reliability) {
        return {
            success: false,
            speed: 0,
            breakdown: true,
            message: 'Mechanical failure! DNF',
        };
    }

    // Calculate final speed with some randomness
    const randomFactor = 1 + (Math.random() - 0.5) * (variance / 100);
    const finalSpeed = Math.round(baseSpeed * randomFactor);

    // Determine placement based on speed and class
    const classInfo = BOAT_CLASSES[stats.class];
    const competitorSpeeds = [];
    const numCompetitors = raceType === 'shootout_finals' ? 15 : raceType === 'shootout' ? 10 : 6;

    for (let i = 0; i < numCompetitors; i++) {
        const compSpeed = classInfo.minSpeed + Math.random() * (classInfo.maxSpeed - classInfo.minSpeed);
        competitorSpeeds.push(compSpeed);
    }
    competitorSpeeds.sort((a, b) => b - a);

    let placement = 1;
    for (const compSpeed of competitorSpeeds) {
        if (compSpeed > finalSpeed) placement++;
    }

    return {
        success: true,
        speed: finalSpeed,
        placement: placement,
        totalRacers: numCompetitors + 1,
        breakdown: false,
    };
}

// Get value of a boat (for selling)
function getBoatValue(boat) {
    const hull = BOAT_HULLS[boat.hull];
    const engine = ENGINES[boat.engine];
    const prop = PROPELLERS[boat.propeller];
    const hullMod = HULL_MODS[boat.hullMod];
    const weightMod = WEIGHT_MODS[boat.weightMod];
    const paint = PAINT_JOBS[boat.paint];

    const totalValue = hull.price + engine.price + prop.price + hullMod.price + weightMod.price + paint.price;
    // Depreciation based on races
    const depreciation = Math.max(0.5, 1 - (boat.races * 0.02));
    // Wins add value
    const winBonus = boat.wins * 500;

    return Math.round(totalValue * depreciation * 0.7 + winBonus);
}

// Starter boat for Year 1
function createStarterBoat() {
    return {
        id: 1,
        name: 'Old Faithful',
        hull: 'fishing',
        engine: 'stock',
        propeller: 'stock',
        hullMod: 'none',
        weightMod: 'none',
        paint: 'stock',
        stats: calculateBoatStats('fishing', 'stock', 'stock', 'none', 'none'),
        races: 0,
        wins: 0,
        bestSpeed: 0,
        totalEarnings: 0,
        isStarter: true,
    };
}

// ==================== BUILDING DEFINITIONS ====================
const BUILDINGS = {
    // Marina Category
    boat_dock: {
        id: 'boat_dock',
        name: 'Boat Dock',
        icon: '[D]',
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
        icon: '[M]',
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
        icon: '[R]',
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
        icon: '[Y]',
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
        icon: '[BD]',
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
        icon: '[C]',
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
        icon: '[CO]',
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
        icon: '[RS]',
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
        icon: '[HB]',
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
        icon: '[TB]',
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
        icon: '[PC]',
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
        icon: '[MG]',
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
        icon: '[WP]',
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
        icon: '[LM]',
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
        icon: '[CB]',
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
        icon: '[FS]',
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
        icon: '[BBQ]',
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
        icon: '[LG]',
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
        icon: '[GS]',
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
        icon: '[RD]',
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
        icon: '[PK]',
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
        icon: '[BR]',
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
        icon: '[BG]',
        category: 'infrastructure',
        description: 'Cross the coves! Opens up new development areas.',
        cost: { money: 5000 },
        isRoad: true,
        requiresTerrain: ['water', 'shallow', 'cove'],
        size: 1,
    },

    // Racing Category - THE SHOOTOUT!
    race_dock: {
        id: 'race_dock',
        name: 'Race Dock',
        icon: '[RC]',
        category: 'racing',
        description: 'Launch point for speed boats. Essential for the Shootout!',
        cost: { money: 2000 },
        produces: { money: 20, speedBoats: 1 },
        provides: { racingRep: 5 },
        upkeep: { money: 15 },
        requiresTerrain: ['race_staging', 'dock_zone'],
        requiresWorkers: 2,
        size: 1,
    },
    timing_tower: {
        id: 'timing_tower',
        name: 'Timing Tower',
        icon: '[TT]',
        category: 'racing',
        description: 'Official race timing and control. Major Shootout infrastructure!',
        cost: { money: 8000 },
        produces: { money: 50, racingRep: 2 },
        provides: { racingRep: 15 },
        upkeep: { money: 40 },
        requiresTerrain: ['land'],
        requiresAdjacent: ['race_lane', 'race_staging', 'deep_water'],
        requiresWorkers: 4,
        size: 1,
    },
    spectator_stands: {
        id: 'spectator_stands',
        name: 'Spectator Stands',
        icon: '[SS]',
        category: 'racing',
        description: 'Bleachers for race fans. Packed during the Shootout!',
        cost: { money: 3000 },
        produces: { money: 30, tourism: 10 },
        provides: { racingRep: 8 },
        upkeep: { money: 15 },
        requiresTerrain: ['land'],
        requiresAdjacent: ['water', 'deep_water', 'race_lane', 'dock_zone'],
        size: 1,
    },
    speed_boat_shop: {
        id: 'speed_boat_shop',
        name: 'Speed Boat Shop',
        icon: '[SB]',
        category: 'racing',
        description: 'Performance parts and racing boat sales. Feed the need for speed!',
        cost: { money: 6000 },
        produces: { money: 100, speedBoats: 2 },
        provides: { racingRep: 10 },
        upkeep: { money: 35 },
        requiresTerrain: ['land', 'strip'],
        requiresWorkers: 3,
        size: 1,
    },
    race_fuel_station: {
        id: 'race_fuel_station',
        name: 'Race Fuel Station',
        icon: '[GS]',
        category: 'racing',
        description: 'High-octane fuel for racing boats. Required for serious racers.',
        cost: { money: 4000 },
        produces: { money: 60, speedBoats: 1 },
        provides: { racingRep: 5 },
        upkeep: { money: 25 },
        requiresTerrain: ['dock_zone', 'race_staging'],
        requiresWorkers: 2,
        size: 1,
    },
    vip_race_lounge: {
        id: 'vip_race_lounge',
        name: 'VIP Race Lounge',
        icon: '[VIP]',
        category: 'racing',
        description: 'Exclusive viewing for high rollers. Premium Shootout experience!',
        cost: { money: 15000 },
        produces: { money: 200, tourism: 20, racingRep: 3 },
        provides: { racingRep: 20, reputation: 10 },
        upkeep: { money: 80 },
        requiresTerrain: ['land'],
        requiresAdjacent: ['race_lane', 'deep_water'],
        requiresWorkers: 6,
        size: 1,
    },
    helicopter_pad: {
        id: 'helicopter_pad',
        name: 'Helicopter Pad',
        icon: '🚁',
        category: 'racing',
        description: 'Aerial views and VIP transport. The ultimate race day experience!',
        cost: { money: 20000 },
        produces: { money: 150, tourism: 15, racingRep: 2 },
        provides: { racingRep: 15, reputation: 8 },
        upkeep: { money: 60 },
        requiresTerrain: ['land'],
        requiresWorkers: 3,
        size: 1,
    },
    race_team_hq: {
        id: 'race_team_hq',
        name: 'Race Team HQ',
        icon: '[W]',
        category: 'racing',
        description: 'Home base for a professional racing team. Boost your Shootout cred!',
        cost: { money: 25000 },
        produces: { money: 100, speedBoats: 5, racingRep: 5 },
        provides: { racingRep: 30, reputation: 15 },
        upkeep: { money: 100 },
        requiresTerrain: ['land'],
        requiresAdjacent: ['dock_zone', 'race_staging'],
        requiresWorkers: 8,
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
        speedBoats: 0,
        tourism: 0,
        power: 100,
        reputation: 50,
        racingRep: 0,
    },
    grid: [],
    buildings: [],
    mileMarkers: [],
    coves: [],
    selectedBuilding: null,
    demolishMode: false,
    gameSpeed: 1,
    paused: false,
    tick: 0,
    season: 0,
    year: 1,
    week: 24, // Start at Shootout week!
    events: [],
    camera: { x: 0, y: 0, zoom: 1 },
    workers: { total: 0, employed: 0 },
    lakeLevel: 660,
    weekendBonus: false,

    // ===== BOAT GARAGE & RACING =====
    garage: {
        boats: [], // Owned boats
        activeBoat: null, // Currently selected boat for racing
        maxSlots: 3, // Can expand with buildings
    },
    racing: {
        currentRace: null,
        upcomingRaces: [],
        completedRaces: [],
        seasonWins: 0,
        seasonEarnings: 0,
        careerWins: 0,
        careerEarnings: 0,
        bestSpeed: 0,
        shootoutWins: 0, // Career Shootout victories
    },
    shootout: {
        active: false,
        day: 0,
        qualified: false,
        results: [],
        currentYearBest: 0,
    },
    raceHistory: [], // All race results ever
    showingBoatShop: false,
    showingGarage: false,
    showingRaceEvent: false,
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
    const size = CONFIG.TILE_SIZE;

    // Create gradient for more natural look
    if (terrain.isWater) {
        const gradient = ctx.createLinearGradient(px, py, px + size, py + size);
        gradient.addColorStop(0, terrain.color);
        gradient.addColorStop(0.5, lightenColor(terrain.color, 10));
        gradient.addColorStop(1, terrain.color);
        ctx.fillStyle = gradient;
    } else if (tile.terrain === 'land') {
        // Grass texture with variation
        ctx.fillStyle = terrain.color;
        ctx.fillRect(px, py, size, size);
        drawGrassDetail(px, py, x, y);
        return;
    } else {
        ctx.fillStyle = terrain.color;
    }
    ctx.fillRect(px, py, size, size);

    // Add terrain details
    if (tile.terrain === 'forest') {
        drawTreeDetail(px, py, x, y);
    } else if (terrain.isWater) {
        drawWaterDetail(px, py, tile.terrain, x, y);
    } else if (tile.terrain === 'dam') {
        drawDamDetail(px, py);
    } else if (tile.terrain === 'strip') {
        drawStripDetail(px, py);
    } else if (tile.terrain === 'parking') {
        drawParkingDetail(px, py);
    }
}

// Helper to lighten colors
function lightenColor(color, percent) {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.min(255, (num >> 16) + amt);
    const G = Math.min(255, ((num >> 8) & 0x00FF) + amt);
    const B = Math.min(255, (num & 0x0000FF) + amt);
    return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
}

function drawGrassDetail(px, py, tileX, tileY) {
    const size = CONFIG.TILE_SIZE;
    // Pseudo-random based on position for consistent look
    const seed = (tileX * 7 + tileY * 13) % 100;

    // Add grass texture variations
    ctx.fillStyle = 'rgba(90, 120, 70, 0.3)';
    for (let i = 0; i < 5; i++) {
        const gx = px + ((seed + i * 17) % size);
        const gy = py + ((seed + i * 23) % size);
        ctx.beginPath();
        ctx.moveTo(gx, gy + 6);
        ctx.lineTo(gx - 1, gy);
        ctx.lineTo(gx + 1, gy);
        ctx.closePath();
        ctx.fill();
    }

    // Add some darker patches
    ctx.fillStyle = 'rgba(50, 80, 40, 0.15)';
    ctx.beginPath();
    ctx.arc(px + (seed % 25) + 8, py + ((seed * 3) % 25) + 8, 6, 0, Math.PI * 2);
    ctx.fill();
}

function drawTreeDetail(px, py, tileX, tileY) {
    const size = CONFIG.TILE_SIZE;
    const seed = (tileX * 11 + tileY * 7) % 100;

    // Draw 2-4 trees per tile with variety
    const treeCount = 2 + (seed % 3);
    const treePositions = [
        [10 + (seed % 8), 12 + (seed % 6)],
        [28 - (seed % 6), 10 + (seed % 8)],
        [18 + (seed % 4), 26 - (seed % 5)],
        [8, 28]
    ];

    for (let i = 0; i < treeCount; i++) {
        const [ox, oy] = treePositions[i];
        const treeType = (seed + i) % 3; // Different tree types

        // Tree shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
        ctx.beginPath();
        ctx.ellipse(px + ox + 3, py + oy + 8, 6, 3, 0, 0, Math.PI * 2);
        ctx.fill();

        // Tree trunk
        ctx.fillStyle = '#5D4E37';
        ctx.fillRect(px + ox - 2, py + oy, 4, 8);

        if (treeType === 0) {
            // Oak tree - round canopy
            ctx.fillStyle = '#2d4a27';
            ctx.beginPath();
            ctx.arc(px + ox, py + oy - 4, 8, 0, Math.PI * 2);
            ctx.fill();
            // Highlight
            ctx.fillStyle = '#4a6b40';
            ctx.beginPath();
            ctx.arc(px + ox - 2, py + oy - 6, 4, 0, Math.PI * 2);
            ctx.fill();
        } else if (treeType === 1) {
            // Pine/Cedar tree - triangular
            ctx.fillStyle = '#1a4030';
            ctx.beginPath();
            ctx.moveTo(px + ox, py + oy - 14);
            ctx.lineTo(px + ox + 8, py + oy + 2);
            ctx.lineTo(px + ox - 8, py + oy + 2);
            ctx.closePath();
            ctx.fill();
            // Second layer
            ctx.fillStyle = '#254a38';
            ctx.beginPath();
            ctx.moveTo(px + ox, py + oy - 10);
            ctx.lineTo(px + ox + 6, py + oy - 2);
            ctx.lineTo(px + ox - 6, py + oy - 2);
            ctx.closePath();
            ctx.fill();
        } else {
            // Hickory - oval canopy
            ctx.fillStyle = '#3a5a35';
            ctx.beginPath();
            ctx.ellipse(px + ox, py + oy - 5, 7, 10, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#4a6a45';
            ctx.beginPath();
            ctx.ellipse(px + ox - 1, py + oy - 7, 4, 5, 0, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

function drawWaterDetail(px, py, terrainType, tileX, tileY) {
    const time = Date.now() / 1500;
    const size = CONFIG.TILE_SIZE;
    const seed = (tileX * 13 + tileY * 17) % 100;

    if (terrainType === 'race_lane') {
        // Race lane buoy markers
        ctx.fillStyle = 'rgba(200, 80, 50, 0.4)';
        ctx.fillRect(px + 2, py + 2, size - 4, 3);
        ctx.fillRect(px + 2, py + size - 5, size - 4, 3);

        // Animated wake during Shootout
        if (gameState.shootout.active) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
            const offset = (Date.now() / 30) % size;
            ctx.beginPath();
            ctx.moveTo(px + offset, py + 12);
            ctx.lineTo(px + offset + 15, py + 18);
            ctx.lineTo(px + offset, py + 24);
            ctx.closePath();
            ctx.fill();
        }
        return;
    } else if (terrainType === 'race_staging') {
        // Checkered buoy pattern
        ctx.fillStyle = 'rgba(200, 80, 50, 0.25)';
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                if ((i + j) % 2 === 0) {
                    ctx.fillRect(px + i * 10, py + j * 10, 10, 10);
                }
            }
        }
        return;
    }

    // Animated water ripples
    const waveOffset1 = Math.sin(time + tileX * 0.5 + tileY * 0.3) * 2;
    const waveOffset2 = Math.cos(time * 0.7 + tileX * 0.3 + tileY * 0.5) * 2;

    // Light reflection ripples
    ctx.fillStyle = terrainType === 'deep_water'
        ? 'rgba(100, 140, 130, 0.2)'
        : 'rgba(150, 200, 180, 0.25)';

    // Draw curved ripple lines
    ctx.beginPath();
    ctx.moveTo(px + 5, py + 10 + waveOffset1);
    ctx.quadraticCurveTo(px + 20, py + 8 + waveOffset1, px + 35, py + 12 + waveOffset1);
    ctx.lineTo(px + 35, py + 14 + waveOffset1);
    ctx.quadraticCurveTo(px + 20, py + 10 + waveOffset1, px + 5, py + 12 + waveOffset1);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(px + 8, py + 25 + waveOffset2);
    ctx.quadraticCurveTo(px + 22, py + 23 + waveOffset2, px + 32, py + 27 + waveOffset2);
    ctx.lineTo(px + 32, py + 29 + waveOffset2);
    ctx.quadraticCurveTo(px + 22, py + 25 + waveOffset2, px + 8, py + 27 + waveOffset2);
    ctx.closePath();
    ctx.fill();

    // Occasional sparkle effect on shallow water
    if (terrainType === 'shallow' || terrainType === 'cove') {
        const sparkle = (Date.now() / 200 + seed) % 20;
        if (sparkle < 2) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.beginPath();
            ctx.arc(px + (seed % 30) + 5, py + ((seed * 2) % 30) + 5, 2, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

function drawDamDetail(px, py) {
    const size = CONFIG.TILE_SIZE;

    // Concrete dam base
    const gradient = ctx.createLinearGradient(px, py, px, py + size);
    gradient.addColorStop(0, '#9a9a90');
    gradient.addColorStop(0.5, '#7a7a70');
    gradient.addColorStop(1, '#6a6a60');
    ctx.fillStyle = gradient;
    ctx.fillRect(px + 3, py + 3, size - 6, size - 6);

    // Dam texture - horizontal lines
    ctx.strokeStyle = '#5a5a50';
    ctx.lineWidth = 1;
    for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(px + 5, py + 8 + i * 8);
        ctx.lineTo(px + size - 5, py + 8 + i * 8);
        ctx.stroke();
    }

    // Spillway detail
    ctx.fillStyle = '#4a6a5a';
    ctx.fillRect(px + 12, py + 12, 16, 16);

    // Water spray effect at base
    ctx.fillStyle = 'rgba(150, 200, 200, 0.4)';
    ctx.beginPath();
    ctx.ellipse(px + 20, py + size - 5, 12, 4, 0, 0, Math.PI * 2);
    ctx.fill();
}

function drawStripDetail(px, py) {
    const size = CONFIG.TILE_SIZE;

    // Asphalt road base
    ctx.fillStyle = '#5a5048';
    ctx.fillRect(px + 2, py + 2, size - 4, size - 4);

    // Road texture - cracks and patches
    ctx.strokeStyle = 'rgba(80, 70, 60, 0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(px + 8, py + 5);
    ctx.lineTo(px + 15, py + 20);
    ctx.lineTo(px + 12, py + 35);
    ctx.stroke();

    // Center line markings (dashed)
    ctx.fillStyle = '#d4a855';
    for (let i = 0; i < 3; i++) {
        ctx.fillRect(px + 17, py + 5 + i * 14, 6, 8);
    }

    // Sidewalk edge
    ctx.fillStyle = '#8a8070';
    ctx.fillRect(px + 2, py + 2, 4, size - 4);
    ctx.fillRect(px + size - 6, py + 2, 4, size - 4);
}

function drawParkingDetail(px, py) {
    const size = CONFIG.TILE_SIZE;

    // Gravel texture
    ctx.fillStyle = '#555550';
    ctx.fillRect(px, py, size, size);

    // Parking lines
    ctx.strokeStyle = '#888880';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(px + 10, py + 5);
    ctx.lineTo(px + 10, py + size - 5);
    ctx.moveTo(px + 30, py + 5);
    ctx.lineTo(px + 30, py + size - 5);
    ctx.stroke();

    // Gravel texture dots
    ctx.fillStyle = 'rgba(100, 100, 95, 0.5)';
    for (let i = 0; i < 8; i++) {
        const gx = px + (i * 5 + 3) % size;
        const gy = py + (i * 7 + 2) % size;
        ctx.beginPath();
        ctx.arc(gx, gy, 1.5, 0, Math.PI * 2);
        ctx.fill();
    }
}

function drawMileMarkers() {
    gameState.mileMarkers.forEach(marker => {
        const px = marker.x * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
        const py = marker.y * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;

        // Buoy shadow in water
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.beginPath();
        ctx.ellipse(px + 2, py + 10, 7, 3, 0, 0, Math.PI * 2);
        ctx.fill();

        // Buoy body - cylindrical shape
        const gradient = ctx.createLinearGradient(px - 7, py, px + 7, py);
        gradient.addColorStop(0, '#d4a855');
        gradient.addColorStop(0.3, '#f4c862');
        gradient.addColorStop(0.7, '#f4c862');
        gradient.addColorStop(1, '#c49845');
        ctx.fillStyle = gradient;

        // Main buoy body
        ctx.beginPath();
        ctx.ellipse(px, py, 8, 10, 0, 0, Math.PI * 2);
        ctx.fill();

        // Red stripe
        ctx.fillStyle = '#c44';
        ctx.fillRect(px - 8, py - 2, 16, 4);

        // Buoy top
        ctx.fillStyle = '#333';
        ctx.beginPath();
        ctx.moveTo(px - 3, py - 10);
        ctx.lineTo(px + 3, py - 10);
        ctx.lineTo(px + 2, py - 6);
        ctx.lineTo(px - 2, py - 6);
        ctx.closePath();
        ctx.fill();

        // Mile number on white background
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(px, py + 3, 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#1a1a1a';
        ctx.font = 'bold 8px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(marker.mile, px, py + 3);
    });
}

function drawBuilding(building) {
    const def = BUILDINGS[building.type];
    const px = building.x * CONFIG.TILE_SIZE;
    const py = building.y * CONFIG.TILE_SIZE;
    const size = CONFIG.TILE_SIZE;
    const cx = px + size / 2;
    const cy = py + size / 2;

    // Building shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.beginPath();
    ctx.ellipse(cx + 3, py + size - 3, size * 0.4, size * 0.15, 0, 0, Math.PI * 2);
    ctx.fill();

    // Draw custom icon if available, otherwise use emoji fallback
    const iconDrawer = ICONS[building.type] || ICONS.default;

    ctx.save();

    // Dim if not working
    if (!building.working && def.requiresWorkers) {
        ctx.globalAlpha = 0.6;
    }

    // Draw the custom icon
    iconDrawer(ctx, cx, cy, size);

    ctx.restore();

    // Shootout glow effect for racing buildings during event
    if (def.category === 'racing' && gameState.shootout.active) {
        const glowIntensity = 0.3 + Math.sin(Date.now() / 200) * 0.2;
        ctx.strokeStyle = `rgba(200, 100, 50, ${glowIntensity})`;
        ctx.lineWidth = 3;
        ctx.strokeRect(px + 1, py + 1, size - 2, size - 2);
    }

    // Not working indicator - red overlay
    if (!building.working && def.requiresWorkers) {
        ctx.fillStyle = 'rgba(180, 80, 80, 0.3)';
        ctx.fillRect(px + 2, py + 2, size - 4, size - 4);

        // "Needs workers" icon
        ctx.fillStyle = '#c44';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('!', cx, cy - size * 0.3);
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

    // Generate the Shootout race course (1-mile stretch near mile 30-35)
    generateRaceCourse();
}

function generateRaceCourse() {
    // The Shootout race course - a straight 1-mile stretch
    // Located in a wider section of the lake (around mile 30 area)
    const raceStartX = Math.floor(CONFIG.GRID_WIDTH * 0.4);
    const raceEndX = raceStartX - 12; // ~12 tiles = 1 mile course
    const raceY = Math.floor(CONFIG.GRID_HEIGHT / 2);

    // Create the race lane (wider, straighter section)
    for (let x = raceEndX; x <= raceStartX; x++) {
        for (let dy = -2; dy <= 2; dy++) {
            const y = raceY + dy;
            if (y >= 0 && y < CONFIG.GRID_HEIGHT) {
                if (Math.abs(dy) <= 1) {
                    gameState.grid[y][x].terrain = 'race_lane';
                } else {
                    // Race staging areas on the sides
                    if (gameState.grid[y][x].terrain !== 'land' && gameState.grid[y][x].terrain !== 'forest') {
                        gameState.grid[y][x].terrain = 'race_staging';
                    }
                }
            }
        }
    }

    // Add staging areas at start and finish
    for (let dy = -3; dy <= 3; dy++) {
        const y = raceY + dy;
        if (y >= 0 && y < CONFIG.GRID_HEIGHT) {
            // Start staging
            if (gameState.grid[y][raceStartX + 1]) {
                gameState.grid[y][raceStartX + 1].terrain = 'race_staging';
            }
            // Finish staging
            if (gameState.grid[y][raceEndX - 1]) {
                gameState.grid[y][raceEndX - 1].terrain = 'race_staging';
            }
        }
    }

    // Add a mile marker for the race area
    gameState.mileMarkers.push({ x: raceStartX, y: raceY, mile: 32 });
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

    // Check for Shootout event (late Summer - second summer season)
    const tickInSeason = gameState.tick % CONFIG.TICKS_PER_SEASON;
    const isSummer = CONFIG.SEASONS[gameState.season] === 'Summer';
    const isLateAugust = gameState.season === 2 && tickInSeason >= CONFIG.SHOOTOUT_WEEK;

    // Start Shootout
    if (isLateAugust && tickInSeason === CONFIG.SHOOTOUT_WEEK && !gameState.shootout.active) {
        startShootout();
    }

    // Process Shootout days
    if (gameState.shootout.active) {
        processShootoutDay();
    }

    // Calculate production
    let income = 0;
    let boatProduction = 0;
    let speedBoatProduction = 0;
    let tourismProduction = 0;
    let reputationChange = 0;
    let racingRepChange = 0;
    let expenses = 0;

    const seasonMultiplier = isSummer ? 2.0 : (CONFIG.SEASONS[gameState.season] === 'Spring' ? 1.2 : 0.6);
    const weekendMultiplier = gameState.weekendBonus ? 1.5 : 1.0;
    const shootoutMultiplier = gameState.shootout.active ? 3.0 : 1.0; // HUGE boost during Shootout!

    updateWorkerAssignments();

    gameState.buildings.forEach(building => {
        const def = BUILDINGS[building.type];

        if (building.working && def.produces) {
            let multiplier = seasonMultiplier * weekendMultiplier;

            // Racing buildings get extra boost during Shootout
            if (def.category === 'racing' && gameState.shootout.active) {
                multiplier *= shootoutMultiplier;
            }

            if (def.produces.money) income += def.produces.money * multiplier;
            if (def.produces.boats) boatProduction += def.produces.boats;
            if (def.produces.speedBoats) speedBoatProduction += def.produces.speedBoats;
            if (def.produces.tourism) tourismProduction += def.produces.tourism * multiplier;
            if (def.produces.reputation) reputationChange += def.produces.reputation;
            if (def.produces.racingRep) racingRepChange += def.produces.racingRep;
        }

        if (def.upkeep?.money) expenses += def.upkeep.money;
    });

    // Tourism affects income
    income += gameState.resources.tourism * 2;

    // Shootout bonus income based on racing reputation
    if (gameState.shootout.active) {
        const racingBonus = gameState.resources.racingRep * 10;
        income += racingBonus;
        gameState.shootout.totalEarnings += racingBonus;
    }

    // Apply resources
    gameState.resources.money += Math.floor(income - expenses);
    gameState.resources.boats += boatProduction;
    gameState.resources.speedBoats += speedBoatProduction;
    gameState.resources.tourism = Math.floor(Math.max(0, gameState.resources.tourism * 0.95 + tourismProduction));
    gameState.resources.reputation = Math.max(0, Math.min(100,
        gameState.resources.reputation + reputationChange * 0.1
    ));
    gameState.resources.racingRep = Math.max(0, Math.min(100,
        gameState.resources.racingRep + racingRepChange * 0.1
    ));

    // Random events
    if (Math.random() < 0.03) {
        triggerRandomEvent();
    }

    // Weekend party event
    if (gameState.weekendBonus && isSummer && Math.random() < 0.1 && !gameState.shootout.active) {
        addEvent('Weekend warriors flood the lake! ', 'party');
        gameState.resources.tourism += 20;
        gameState.resources.money += 500;
    }

    document.getElementById('income').textContent = `+$${Math.floor(income - expenses)}/s`;
    document.getElementById('lake-level').textContent = gameState.shootout.active ?
        `SHOOTOUT DAY ${gameState.shootout.day + 1}!` : `${gameState.lakeLevel} ft`;

    updateUI();
    render();
}

// ==================== SHOOTOUT EVENT SYSTEM ====================
function startShootout() {
    gameState.shootout.active = true;
    gameState.shootout.day = 0;
    gameState.shootout.totalEarnings = 0;
    gameState.shootout.bestSpeed = 0;

    addEvent('THE SHOOTOUT BEGINS! ', 'racing');
    addEvent('Thousands of racing fans descend on the lake!', 'racing');

    // Massive tourism spike
    gameState.resources.tourism += 100;
}

function processShootoutDay() {
    const tickInSeason = gameState.tick % CONFIG.TICKS_PER_SEASON;
    const dayOfShootout = tickInSeason - CONFIG.SHOOTOUT_WEEK;

    if (dayOfShootout !== gameState.shootout.day) {
        gameState.shootout.day = dayOfShootout;

        if (dayOfShootout < 4) {
            // Each day of the Shootout
            const dayNames = ['Qualifying Day', 'Time Trials', 'Semi-Finals', 'FINALS DAY'];
            addEvent(`Shootout ${dayNames[dayOfShootout]}!`, 'racing');

            // Generate race results based on racing rep and speed boats
            const speed = 150 + Math.floor(Math.random() * 50) +
                (gameState.resources.racingRep / 2) +
                (gameState.resources.speedBoats * 2);

            if (speed > gameState.shootout.bestSpeed) {
                gameState.shootout.bestSpeed = speed;
                addEvent(`New top speed: ${speed} MPH! `, 'racing');
            }

            // Daily earnings based on infrastructure
            const racingBuildings = gameState.buildings.filter(b =>
                BUILDINGS[b.type].category === 'racing'
            ).length;
            const dailyBonus = 1000 * (racingBuildings + 1) * (1 + gameState.resources.racingRep / 50);
            gameState.resources.money += dailyBonus;
            gameState.shootout.totalEarnings += dailyBonus;

            // Tourism surge each day
            gameState.resources.tourism += 30;

        } else {
            // Shootout ends
            endShootout();
        }
    }
}

function endShootout() {
    gameState.shootout.active = false;

    const earnings = Math.floor(gameState.shootout.totalEarnings);
    const topSpeed = Math.floor(gameState.shootout.bestSpeed);

    addEvent(`SHOOTOUT COMPLETE! `, 'racing');
    addEvent(`Total Shootout earnings: $${earnings.toLocaleString()}`, 'positive');
    addEvent(`Top recorded speed: ${topSpeed} MPH`, 'racing');

    // Store results
    gameState.raceResults.push({
        year: gameState.year,
        earnings: earnings,
        topSpeed: topSpeed,
        racingRep: gameState.resources.racingRep,
    });

    // Reputation boost from successful Shootout
    if (earnings > gameState.shootout.lastYearEarnings) {
        gameState.resources.reputation += 5;
        gameState.resources.racingRep += 5;
        addEvent('Your Shootout was bigger than last year!', 'positive');
    }

    gameState.shootout.lastYearEarnings = earnings;

    // Cool down tourism after event
    gameState.resources.tourism = Math.floor(gameState.resources.tourism * 0.7);
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
    const hasRacingInfra = gameState.buildings.some(b => BUILDINGS[b.type].category === 'racing');

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
        // Racing Events
        {
            text: 'Speed boat test run hits 180 MPH!',
            effect: () => { gameState.resources.racingRep += 8; gameState.resources.tourism += 20; },
            type: 'racing',
            requiresRacing: true
        },
        {
            text: 'Racing team chooses your marina for practice!',
            effect: () => { gameState.resources.money += 500; gameState.resources.racingRep += 5; gameState.resources.speedBoats += 2; },
            type: 'racing',
            requiresRacing: true
        },
        {
            text: 'Cigarette boat rally passes through!',
            effect: () => { gameState.resources.tourism += 35; gameState.resources.racingRep += 3; },
            type: 'racing',
            requiresSummer: true
        },
        {
            text: 'Racing documentary crew filming at the lake!',
            effect: () => { gameState.resources.reputation += 10; gameState.resources.racingRep += 10; gameState.resources.tourism += 25; },
            type: 'racing',
            requiresRacing: true
        },
        {
            text: 'Pro racer buys property on your stretch!',
            effect: () => { gameState.resources.money += 1000; gameState.resources.racingRep += 8; gameState.resources.reputation += 5; },
            type: 'racing',
            requiresRacing: true
        },
        {
            text: 'Mini boat race draws a crowd!',
            effect: () => { gameState.resources.money += 300; gameState.resources.tourism += 15; },
            type: 'racing',
            requiresSummer: true
        },
        {
            text: 'Speed record attempt announced for your area!',
            effect: () => { gameState.resources.tourism += 50; gameState.resources.racingRep += 12; },
            type: 'racing',
            requiresRacing: true,
            requiresSummer: true
        },
        {
            text: 'Boat engine explosion - thankfully no injuries!',
            effect: () => { gameState.resources.money -= 300; gameState.resources.speedBoats -= 1; },
            type: 'negative',
            requiresRacing: true
        },
    ];

    // Filter events based on requirements
    const validEvents = events.filter(e => {
        if (e.requiresSummer && !isSummer) return false;
        if (e.requiresRacing && !hasRacingInfra) return false;
        return true;
    });

    const event = validEvents[Math.floor(Math.random() * validEvents.length)];
    event.effect();
    addEvent(event.text, event.type);
}

// ==================== UI FUNCTIONS ====================
function updateUI() {
    document.getElementById('population').textContent = gameState.resources.population;
    document.getElementById('money').textContent = Math.floor(gameState.resources.money);
    document.getElementById('boats').textContent = gameState.resources.boats;
    document.getElementById('speedBoats').textContent = gameState.resources.speedBoats;
    document.getElementById('tourism').textContent = Math.floor(gameState.resources.tourism);
    document.getElementById('racingRep').textContent = Math.floor(gameState.resources.racingRep);
    document.getElementById('reputation').textContent = Math.floor(gameState.resources.reputation);

    let seasonText = CONFIG.SEASONS[gameState.season];
    if (gameState.shootout.active) {
        seasonText = 'SHOOTOUT!';
    } else if (gameState.weekendBonus) {
        seasonText += ' (Weekend!)';
    }
    document.getElementById('season').textContent = seasonText;
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
        document.getElementById('btn-speed').textContent = `${gameState.gameSpeed}x`;
        clearInterval(gameLoop);
        startGameLoop();
    });

    // Dock/Boat Shop button
    const dockBtn = document.getElementById('btn-dock');
    if (dockBtn) {
        dockBtn.addEventListener('click', () => {
            openBoatShop();
        });
    }

    function startGame() {
        try {
            // Hide modal FIRST
            const modal = document.getElementById('welcome-modal');
            if (modal) {
                modal.style.display = 'none';
                modal.classList.add('hidden');
            }

            // Then set player name
            const nameInput = document.getElementById('town-name-input');
            gameState.playerName = (nameInput && nameInput.value) ? nameInput.value : 'Lake Boss';

            // Update UI
            updateUI();
        } catch (err) {
            console.error('Error starting game:', err);
            // Still hide modal even if there's an error
            const modal = document.getElementById('welcome-modal');
            if (modal) modal.style.display = 'none';
        }
    }

    const startBtn = document.getElementById('start-game');
    if (startBtn) {
        startBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            startGame();
        });
        startBtn.addEventListener('touchend', function(e) {
            e.preventDefault();
            e.stopPropagation();
            startGame();
        });
        // Also handle mousedown for Brave browser
        startBtn.addEventListener('mousedown', function(e) {
            e.preventDefault();
            startGame();
        });
    }

    // Allow Enter key to start game
    const nameInput = document.getElementById('town-name-input');
    if (nameInput) {
        nameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                startGame();
            }
        });
    }
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

// ==================== BOAT SHOP UI ====================
function openBoatShop() {
    const modal = document.getElementById('boat-shop-modal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.style.display = 'flex';
        updateShopMoney();
        renderShopContent('buy');

        // Set up tab listeners
        document.querySelectorAll('.shop-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.shop-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                renderShopContent(tab.dataset.tab);
            });
        });
    }
}

function closeBoatShop() {
    const modal = document.getElementById('boat-shop-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.style.display = 'none';
    }
}

// Make closeBoatShop available globally for onclick
window.closeBoatShop = closeBoatShop;

function updateShopMoney() {
    const shopMoney = document.getElementById('shop-money');
    if (shopMoney) {
        shopMoney.textContent = Math.floor(gameState.resources.money);
    }
}

function renderShopContent(tab) {
    const content = document.getElementById('shop-content');
    if (!content) return;

    switch(tab) {
        case 'buy':
            renderBuyBoats(content);
            break;
        case 'upgrade':
            renderUpgrades(content);
            break;
        case 'dock':
        case 'garage':
            renderGarage(content);
            break;
        case 'paint':
            renderPaintShop(content);
            break;
    }
}

function renderBuyBoats(container) {
    let html = '<div class="boat-grid">';

    Object.entries(BOAT_HULLS).forEach(([id, hull]) => {
        const canAfford = gameState.resources.money >= hull.basePrice;
        const stats = calculateBoatStats(id, 'stock', 'stock', 'none', 'none');

        html += `
            <div class="boat-card ${!canAfford ? 'disabled' : ''}">
                <div class="boat-image"></div>
                <h3>${hull.name}</h3>
                <div class="boat-stats">
                    <span>${stats.topSpeed} MPH</span>
                    <span>${Math.round(stats.handling * 100)}%</span>
                    <span>${Math.round(stats.reliability * 100)}%</span>
                </div>
                <div class="boat-price">$${hull.basePrice.toLocaleString()}</div>
                <button class="buy-btn" onclick="buyBoat('${id}')" ${!canAfford ? 'disabled' : ''}>
                    ${canAfford ? 'Buy' : 'Too Expensive'}
                </button>
            </div>
        `;
    });

    html += '</div>';
    container.innerHTML = html;
}

function renderUpgrades(container) {
    const activeBoat = gameState.garage.boats.find(b => b.id === gameState.garage.activeBoat);

    if (!activeBoat) {
        container.innerHTML = '<div class="no-boat"><p>Select a boat in your garage first!</p></div>';
        return;
    }

    let html = `<div class="active-boat-header">
        <h3>Upgrading: ${activeBoat.name}</h3>
        <span class="current-speed">Current Speed: ${activeBoat.stats.topSpeed} MPH</span>
    </div>`;

    // Engines
    html += '<div class="upgrade-section"><h4>Engines</h4><div class="upgrade-grid">';
    Object.entries(ENGINES).forEach(([id, engine]) => {
        const isOwned = activeBoat.engine === id;
        const canAfford = gameState.resources.money >= engine.price;
        html += `
            <div class="upgrade-card ${isOwned ? 'owned' : ''} ${!canAfford && !isOwned ? 'disabled' : ''}">
                <h5>${engine.name}</h5>
                <span class="stat">+${engine.speedBonus} MPH</span>
                <span class="stat"> +${engine.weight} lbs</span>
                ${isOwned ?
                    '<span class="badge">Installed</span>' :
                    `<button onclick="purchaseUpgrade('engine', '${id}')" ${!canAfford ? 'disabled' : ''}>$${engine.price.toLocaleString()}</button>`
                }
            </div>
        `;
    });
    html += '</div></div>';

    // Propellers
    html += '<div class="upgrade-section"><h4>⚙️ Propellers</h4><div class="upgrade-grid">';
    Object.entries(PROPELLERS).forEach(([id, prop]) => {
        const isOwned = activeBoat.propeller === id;
        const canAfford = gameState.resources.money >= prop.price;
        html += `
            <div class="upgrade-card ${isOwned ? 'owned' : ''} ${!canAfford && !isOwned ? 'disabled' : ''}">
                <h5>${prop.name}</h5>
                <span class="stat">+${prop.speedBonus} MPH</span>
                <span class="stat">${prop.handlingMod > 0 ? '+' : ''}${Math.round(prop.handlingMod * 100)}%</span>
                ${isOwned ?
                    '<span class="badge">Installed</span>' :
                    `<button onclick="purchaseUpgrade('propeller', '${id}')" ${!canAfford ? 'disabled' : ''}>$${prop.price.toLocaleString()}</button>`
                }
            </div>
        `;
    });
    html += '</div></div>';

    // Hull Mods
    html += '<div class="upgrade-section"><h4>🛥️ Hull Modifications</h4><div class="upgrade-grid">';
    Object.entries(HULL_MODS).forEach(([id, mod]) => {
        const isOwned = activeBoat.hullMod === id;
        const canAfford = gameState.resources.money >= mod.price;
        html += `
            <div class="upgrade-card ${isOwned ? 'owned' : ''} ${!canAfford && !isOwned ? 'disabled' : ''}">
                <h5>${mod.name}</h5>
                <span class="stat">+${mod.speedBonus} MPH</span>
                <span class="stat">${mod.handlingMod > 0 ? '+' : ''}${Math.round(mod.handlingMod * 100)}%</span>
                ${isOwned ?
                    '<span class="badge">Installed</span>' :
                    `<button onclick="purchaseUpgrade('hullMod', '${id}')" ${!canAfford ? 'disabled' : ''}>$${mod.price.toLocaleString()}</button>`
                }
            </div>
        `;
    });
    html += '</div></div>';

    // Weight Mods
    html += '<div class="upgrade-section"><h4> Weight Reduction</h4><div class="upgrade-grid">';
    Object.entries(WEIGHT_MODS).forEach(([id, mod]) => {
        const isOwned = activeBoat.weightMod === id;
        const canAfford = gameState.resources.money >= mod.price;
        html += `
            <div class="upgrade-card ${isOwned ? 'owned' : ''} ${!canAfford && !isOwned ? 'disabled' : ''}">
                <h5>${mod.name}</h5>
                <span class="stat">${mod.speedBonus > 0 ? '+' : ''}${mod.speedBonus} MPH</span>
                <span class="stat">${mod.reliabilityMod > 0 ? '+' : ''}${Math.round(mod.reliabilityMod * 100)}%</span>
                ${isOwned ?
                    '<span class="badge">Installed</span>' :
                    `<button onclick="purchaseUpgrade('weightMod', '${id}')" ${!canAfford ? 'disabled' : ''}>$${mod.price.toLocaleString()}</button>`
                }
            </div>
        `;
    });
    html += '</div></div>';

    container.innerHTML = html;
}

function renderGarage(container) {
    const boats = gameState.garage.boats;

    if (boats.length === 0) {
        container.innerHTML = '<div class="empty-garage"><p>Your garage is empty! Buy a boat to get started.</p></div>';
        return;
    }

    let html = '<div class="garage-grid">';

    boats.forEach(boat => {
        const isActive = boat.id === gameState.garage.activeBoat;
        const boatClass = determineBoatClass(boat.stats.topSpeed);
        const boatValue = getBoatValue(boat);

        html += `
            <div class="garage-boat ${isActive ? 'active-boat' : ''}">
                <div class="boat-header">
                    <h3>${boat.name}</h3>
                    ${isActive ? '<span class="active-badge">Racing</span>' : ''}
                </div>
                <div class="boat-image large"></div>
                <div class="boat-details">
                    <div class="stat-row"><span>Class:</span><span>${boatClass.name}</span></div>
                    <div class="stat-row"><span>Top Speed:</span><span>${boat.stats.topSpeed} MPH</span></div>
                    <div class="stat-row"><span>Handling:</span><span>${Math.round(boat.stats.handling * 100)}%</span></div>
                    <div class="stat-row"><span>Reliability:</span><span>${Math.round(boat.stats.reliability * 100)}%</span></div>
                    <div class="stat-row"><span>Value:</span><span>$${boatValue.toLocaleString()}</span></div>
                </div>
                <div class="boat-record">
                    <span>Races: ${boat.races}</span>
                    <span>Wins: ${boat.wins}</span>
                    <span>Best: ${boat.bestSpeed || '--'} MPH</span>
                </div>
                <div class="boat-actions">
                    ${!isActive ? `<button onclick="selectActiveBoat(${boat.id})">Select for Racing</button>` : ''}
                    ${!boat.isStarter ? `<button class="sell-btn" onclick="sellBoat(${boat.id})">Sell ($${Math.floor(boatValue * 0.7).toLocaleString()})</button>` : ''}
                </div>
            </div>
        `;
    });

    html += '</div>';
    container.innerHTML = html;
}

function renderPaintShop(container) {
    const activeBoat = gameState.garage.boats.find(b => b.id === gameState.garage.activeBoat);

    if (!activeBoat) {
        container.innerHTML = '<div class="no-boat"><p>Select a boat in your garage first!</p></div>';
        return;
    }

    let html = `<div class="paint-header">
        <h3>Paint Shop - ${activeBoat.name}</h3>
    </div>`;

    html += '<div class="paint-grid">';
    Object.entries(PAINT_JOBS).forEach(([id, paint]) => {
        const isOwned = activeBoat.paint === id;
        const canAfford = gameState.resources.money >= paint.price;
        html += `
            <div class="paint-card ${isOwned ? 'owned' : ''} ${!canAfford && !isOwned ? 'disabled' : ''}">
                <div class="paint-preview" style="background: ${paint.primary}; border: 3px solid ${paint.secondary || paint.primary};">
                    
                </div>
                <h4>${paint.name}</h4>
                ${isOwned ?
                    '<span class="badge">Applied</span>' :
                    `<button onclick="purchaseUpgrade('paint', '${id}')" ${!canAfford ? 'disabled' : ''}>$${paint.price.toLocaleString()}</button>`
                }
            </div>
        `;
    });
    html += '</div>';

    container.innerHTML = html;
}

function buyBoat(hullId) {
    const hull = BOAT_HULLS[hullId];
    if (!hull || gameState.resources.money < hull.basePrice) return;

    if (gameState.garage.boats.length >= gameState.garage.maxSlots) {
        addEvent('Garage is full! Sell a boat first.', 'negative');
        return;
    }

    gameState.resources.money -= hull.basePrice;

    const newBoat = createBoat(hullId, hull.name);
    gameState.garage.boats.push(newBoat);

    // Set as active if it's the only boat
    if (gameState.garage.boats.length === 1) {
        gameState.garage.activeBoat = newBoat.id;
    }

    addEvent(`Bought new boat: ${hull.name}! `, 'positive');
    updateShopMoney();
    updateUI();
    renderShopContent('garage');
}

// Make buyBoat available globally
window.buyBoat = buyBoat;

function purchaseUpgrade(type, itemId) {
    const activeBoat = gameState.garage.boats.find(b => b.id === gameState.garage.activeBoat);
    if (!activeBoat) return;

    let item, price;

    switch(type) {
        case 'engine':
            item = ENGINES[itemId];
            price = item?.price || 0;
            break;
        case 'propeller':
            item = PROPELLERS[itemId];
            price = item?.price || 0;
            break;
        case 'hullMod':
            item = HULL_MODS[itemId];
            price = item?.price || 0;
            break;
        case 'weightMod':
            item = WEIGHT_MODS[itemId];
            price = item?.price || 0;
            break;
        case 'paint':
            item = PAINT_JOBS[itemId];
            price = item?.price || 0;
            break;
        default:
            return;
    }

    if (!item || gameState.resources.money < price) return;

    gameState.resources.money -= price;
    activeBoat[type] = itemId;

    // Recalculate boat stats
    activeBoat.stats = calculateBoatStats(
        activeBoat.hull,
        activeBoat.engine,
        activeBoat.propeller,
        activeBoat.hullMod,
        activeBoat.weightMod
    );

    addEvent(`Installed ${item.name}! ${activeBoat.stats.topSpeed} MPH`, 'positive');
    updateShopMoney();
    updateUI();

    // Refresh the current tab
    const activeTab = document.querySelector('.shop-tab.active');
    if (activeTab) {
        renderShopContent(activeTab.dataset.tab);
    }
}

// Make purchaseUpgrade available globally
window.purchaseUpgrade = purchaseUpgrade;

function selectActiveBoat(boatId) {
    const boat = gameState.garage.boats.find(b => b.id === boatId);
    if (boat) {
        gameState.garage.activeBoat = boatId;
        addEvent(`Selected ${boat.name} for racing!`, 'racing');
        renderShopContent('garage');
    }
}

// Make selectActiveBoat available globally
window.selectActiveBoat = selectActiveBoat;

function sellBoat(boatId) {
    const boatIndex = gameState.garage.boats.findIndex(b => b.id === boatId);
    if (boatIndex === -1) return;

    const boat = gameState.garage.boats[boatIndex];
    if (boat.isStarter) {
        addEvent("Can't sell your starter boat!", 'negative');
        return;
    }

    const sellPrice = Math.floor(getBoatValue(boat) * 0.7);
    gameState.resources.money += sellPrice;
    gameState.garage.boats.splice(boatIndex, 1);

    // If we sold the active boat, select another
    if (gameState.garage.activeBoat === boatId && gameState.garage.boats.length > 0) {
        gameState.garage.activeBoat = gameState.garage.boats[0].id;
    }

    addEvent(`Sold ${boat.name} for $${sellPrice.toLocaleString()}!`, 'positive');
    updateShopMoney();
    updateUI();
    renderShopContent('garage');
}

// Make sellBoat available globally
window.sellBoat = sellBoat;

function initializeStarterBoat() {
    // Give player their starter boat
    const starterBoat = createStarterBoat();
    gameState.garage.boats.push(starterBoat);
    gameState.garage.activeBoat = starterBoat.id;
    gameState.resources.speedBoats = 1;
}

// ==================== INITIALIZATION ====================
function init() {
    initCanvas();
    generateMap();

    // Initialize starter boat
    initializeStarterBoat();

    initInput();
    updateUI();
    render();
    startGameLoop();

    addEvent('Welcome to the Shootout! ', 'racing');
    addEvent("Your boat 'Old Faithful' is ready!", 'positive');
    addEvent('Build docks and marinas to earn money', 'neutral');
    addEvent('Upgrade your boat and win THE SHOOTOUT!', 'racing');
}

window.addEventListener('load', init);
