/* Battaglia Navale - Multiplayer Firebase (Corretto e Ottimizzato) */
"use strict";

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, set, onValue, get, update } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// --- TUA CONFIGURAZIONE FIREBASE ---
const firebaseConfig = {
    apiKey: "AIzaSyBkc2s0vZjby7EnGd_9gsrd8eySFFb-s50",
    authDomain: "battaglia-navale-multiplayer.firebaseapp.com",
    databaseURL: "https://battaglia-navale-multiplayer-default-rtdb.firebaseio.com",
    projectId: "battaglia-navale-multiplayer",
    storageBucket: "battaglia-navale-multiplayer.firebasestorage.app",
    messagingSenderId: "788659808148",
    appId: "1:788659808148:web:9d23a20f776eb1d6e99181"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const SIZE = 10;
const LETTERS = "ABCDEFGHIJ".split("");

const FLEET_TEMPLATE = [
    { length: 1, label: "Elicottero", count: 2, image: "assets/ships/1elicottero.gif" },
    { length: 2, label: "Motovedetta", count: 2, image: "assets/ships/2motovedetta.gif" },
    { length: 3, label: "Sottomarino", count: 1, image: "assets/ships/3sottomarino.gif" },
    { length: 3, label: "Incrociatore", count: 1, image: "assets/ships/3incrociatore.gif" },
    { length: 4, label: "Corazzata", count: 1, image: "assets/ships/4incrociatore.gif" },
    { length: 5, label: "Portaerei", count: 1, image: "assets/ships/5portaerei.gif" }
];[cite: 1]

const SHIP_IMAGES = {
    1: "assets/ships/1elicottero.gif",
    2: "assets/ships/2motovedetta.gif",
    3: "assets/ships/3sottomarino.gif",
    4: "assets/ships/4incrociatore.gif",
    5: "assets/ships/5portaerei.gif"
};[cite: 1]

const SOUND_FILES = {
    shot: "assets/sounds/shot.mp3",
    water: "assets/sounds/water.mp3",
    hit: "assets/sounds/hit.mp3",
    sinking: "assets/sounds/sinking.mp3",
    victory: "assets/sounds/victory.mp3",
    defeat: "assets/sounds/defeat.mp3",
    click: "assets/sounds/click.mp3",
    inizio: "assets/sounds/inizio.mp3"
};[cite: 1]

const $ = id => document.getElementById(id);

const ui = {
    roomPanel: $("room-panel"),
    roomCodeInput: $("room-code-input"),
    joinRoomBtn: $("join-room-btn"),
    roomStatusBox: $("room-status-box"),
    roomMenuBtn: $("room-menu-btn"),
    statusTitle: $("status-title"),
    statusMessage: $("status-message"),
    statusLight: $("status-light"),
    playerShipsLeft: $("player-ships-left"),
    enemyShipsLeft: $("enemy-ships-left"),
    setupPanel: $("setup-panel"),
    battlePanel: $("battle-panel"),
    fleetList: $("fleet-list"),
    setupBoard: $("setup-board"),
    playerBoard: $("player-board"),
    enemyBoard: $("enemy-board"),
    placedCount: $("placed-count"),
    rotate: $("rotate-ship"),
    autoPlace: $("auto-place"),
    start: $("start-game"),
    soundToggle: $("sound-toggle"),
    shots: $("shots-count"),
    hits: $("hits-count"),
    accuracy: $("accuracy-count"),
    turn: $("turn-count"),
    playerChip: $("player-board-chip"),
    enemyChip: $("enemy-board-chip"),
    rulesToggle: $("rules-toggle"),
    rulesDialog: $("rules-dialog"),
    resultDialog: $("result-dialog"),
    resultTitle: $("result-title"),
    resultMessage: $("result-message"),
    playAgain: $("play-again")
};

const game = {
    roomCode: null,
    playerRole: null,
    playerShips: [],
    enemyShips: [],
    myShots: new Set(),
    opponentShots: new Set(),
    selectedShipId: null,
    orientation: "H",
    phase: "room",
    soundEnabled: true,
    playerShotCount: 0,
    playerHitCount: 0,
    previewCells: []
};

function makeFleet() {
    const fleet = [];
    let id = 1;
    FLEET_TEMPLATE.forEach(type => {
        for (let i = 0; i < type.count; i++) {
            fleet.push({
                id: `ship-${id++}`,
                length: type.length,
                label: type.label,
                image: type.image,
                cells: [],
                hits: [],
                sunk: false
            });
        }
    });
    return fleet.sort((a, b) => b.length - a.length);[cite: 1]
}

const key = (r, c) => `${r},${c}`;
const inBounds = (r, c) => r >= 0 && r < SIZE && c >= 0 && c < SIZE;
const cellLabel = (r, c) => `${LETTERS[c]}${r + 1}`;

function shipAt(ships, r, c) {
    return ships.find(ship => ship.cells && ship.cells.some(([sr, sc]) => sr === r && sc === c));
}

function setStatus(title, message, color = "gold") {
    ui.statusTitle.textContent = title;
    ui.statusMessage.textContent = message;

    const colors = {
        red: { bg: "#ff645f", shadow: "rgba(255,100,95,.6)" },
        cyan: { bg: "#56d7e9", shadow: "rgba(86,215,233,.6)" },
        gold: { bg: "#e8bd68", shadow: "rgba(232,189,104,.6)" }
    };

    const current = colors[color] || colors.gold;
    ui.statusLight.style.background = current.bg;
    ui.statusLight.style.boxShadow = `0 0 12px ${current.shadow}`;[cite: 1]
}

function playSound(name) {
    if (!game.soundEnabled) return;
    const audio = new Audio(SOUND_FILES[name]);
    audio.volume = 0.45;
    audio.play().catch(() => {});
}

function shipImage(ship, className = "ship-image") {
    const img = document.createElement("img");
    img.className = className;
    img.alt = "";
    img.draggable = false;
    img.src = ship.image || SHIP_IMAGES[ship.length];
    img.onerror = () => img.remove();
    return img;[cite: 1]
}

function getPlacementCells(r, c, length, dir) {
    const cells = [];
    for (let i = 0; i < length; i++) {
        cells.push([
            r + (dir === "V" ? i : 0),
            c + (dir === "H" ? i : 0)
        ]);
    }
    return cells;[cite: 1]
}

function isPlacementValid(cells, ships, ignoredShipId = null) {
    const occupied = new Set();
    ships
        .filter(s => s.id !== ignoredShipId)
        .forEach(s => s.cells.forEach(([r, c]) => occupied.add(key(r, c))));

    for (const [r, c] of cells) {
        if (!inBounds(r, c) || occupied.has(key(r, c))) return false;
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                if (inBounds(r + dr, c + dc) && occupied.has(key(r + dr, c + dc))) {
                    return false;
                }
            }
        }
    }
    return true;[cite: 1]
}

function placeShip(ship, r, c, dir, ships) {
    const cells = getPlacementCells(r, c, ship.length, dir);
    if (!isPlacementValid(cells, ships, ship.id)) return false;
    ship.cells = cells;
    ship.hits = [];
    ship.sunk = false;
    return true;
}

function randomPlacement(ships) {
    const ordered = [...ships].sort((a, b) => b.length - a.length);
    ordered.forEach(ship => {
        ship.cells = [];
        ship.hits = [];
        ship.sunk = false;
    });

    for (const ship of ordered) {
        let placed = false;
        for (let tries = 0; tries < 5000 && !placed; tries++) {
            const dir = Math.random() < 0.5 ? "H" : "V";
            const r = Math.floor(Math.random() * SIZE);
            const c = Math.floor(Math.random() * SIZE);
            placed = placeShip(ship, r, c, dir, ships);
        }
        if (!placed) return false;
    }
    return true;[cite: 1]
}

function createBoard(container, boardType) {
    container.innerHTML = "";
    const board = document.createElement("div");
    board.className = "board";
    board.setAttribute("role", "grid");

    const corner = document.createElement("div");
    corner.className = "axis";
    board.appendChild(corner);

    LETTERS.forEach(letter => {
        const axis = document.createElement("div");
        axis.className = "axis";
        axis.textContent = letter;
        board.appendChild(axis);
    });

    for (let r = 0; r < SIZE; r++) {
        const axis = document.createElement("div");
        axis.className = "axis";
        axis.textContent = r + 1;
        board.appendChild(axis);

        for (let c = 0; c < SIZE; c++) {
            const cell = document.createElement("button");
            cell.type = "button";
            cell.className = "cell";
            cell.dataset.r = r;
            cell.dataset.c = c;
            cell.setAttribute("role", "gridcell");

            if (boardType === "setup") {
                cell.addEventListener("mouseenter", () => showPreview(r, c));
                cell.addEventListener("focus", () => showPreview(r, c));
                cell.addEventListener("mouseleave", clearPreview);
                cell.addEventListener("blur", clearPreview);
                cell.addEventListener("click", () => handleSetupCell(r, c));
            } else if (boardType === "enemy") {
                cell.addEventListener("click", () => handlePlayerShot(r, c));
            }
            board.appendChild(cell);
        }
    }
    container.appendChild(board);[cite: 1]
}

const getBoardCell = (container, r, c) => container.querySelector(`.cell[data-r="${r}"][data-c="${c}"]`);

function renderFleetList() {
    ui.fleetList.innerHTML = "";
    game.playerShips.forEach(ship => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "fleet-item" +
            (ship.id === game.selectedShipId ? " selected" : "") +
            (ship.cells.length ? " placed" : "");
        button.disabled = game.phase !== "setup";

        const icon = document.createElement("span");
        icon.className = "fleet-icon";
        for (let i = 0; i < ship.length; i++) {
            icon.appendChild(document.createElement("i"));
        }

        const text = document.createElement("span");
        text.className = "fleet-text";
        const title = document.createElement("strong");
        title.textContent = ship.label;
        const sub = document.createElement("small");
        sub.textContent = ship.cells.length ? `Posizionata: ${cellLabel(...ship.cells[0])}` : "Da posizionare";
        text.append(title, sub);

        const state = document.createElement("span");
        state.className = "fleet-state";
        state.textContent = ship.cells.length ? "OK" : "Scegli";

        button.append(icon, text, state);
        button.addEventListener("click", () => {
            game.selectedShipId = ship.id;
            renderSetupBoard();
        });
        ui.fleetList.appendChild(button);
    });[cite: 1]
}

function addShipOverlay(board, ship) {
    if (!ship.cells || !ship.cells.length) return;
    const [startR, startC] = ship.cells[0];
    const [endR, endC] = ship.cells[ship.cells.length - 1];

    const firstCell = getBoardCell(board, startR, startC);
    const lastCell = getBoardCell(board, endR, endC);
    if (!firstCell || !lastCell) return;

    board.style.position = "relative";
    const boardRect = board.getBoundingClientRect();
    const firstRect = firstCell.getBoundingClientRect();
    const lastRect = lastCell.getBoundingClientRect();

    const left = firstRect.left - boardRect.left - board.clientLeft;
    const top = firstRect.top - boardRect.top - board.clientTop;
    const right = lastRect.right - boardRect.left - board.clientLeft;
    const bottom = lastRect.bottom - boardRect.top - board.clientTop;

    const areaWidth = right - left;
    const areaHeight = bottom - top;
    const vertical = startC === endC && ship.length > 1;

    const img = shipImage(ship, "ship-overlay");
    img.style.position = "absolute";
    img.style.zIndex = "5";
    img.style.pointerEvents = "none";
    img.style.objectFit = "fill";

    if (vertical) {
        img.style.width = `${areaHeight}px`;
        img.style.height = `${areaWidth}px`;
        img.style.left = `${left + (areaWidth - areaHeight) / 2}px`;
        img.style.top = `${top + (areaHeight - areaWidth) / 2}px`;
        img.style.transform = "rotate(90deg)";
        img.style.transformOrigin = "center center";
    } else {
        img.style.left = `${left}px`;
        img.style.top = `${top}px`;
        img.style.width = `${areaWidth}px`;
        img.style.height = `${areaHeight}px`;
        img.style.transform = "none";
    }
    board.appendChild(img);[cite: 1]
}

function addFireOverlay(cell) {
    if (cell.querySelector(".fire-overlay")) return;
    const fireImg = document.createElement("img");
    fireImg.src = "assets/ships/fuoco.gif";
    fireImg.className = "fire-overlay";
    fireImg.alt = "Colpito";
    fireImg.draggable = false;
    fireImg.style.position = "absolute";
    fireImg.style.inset = "0";
    fireImg.style.width = "100%";
    fireImg.style.height = "100%";
    fireImg.style.objectFit = "contain";
    fireImg.style.zIndex = "10";
    fireImg.style.pointerEvents = "none";
    cell.appendChild(fireImg);[cite: 1]
}

function renderSetupBoard() {
    createBoard(ui.setupBoard, "setup");
    const board = ui.setupBoard.querySelector(".board");

    board.querySelectorAll(".cell").forEach(cell => {
        const r = Number(cell.dataset.r);
        const c = Number(cell.dataset.c);
        const ship = shipAt(game.playerShips, r, c);
        if (ship) cell.classList.add("ship");
    });

    game.playerShips.forEach(ship => {
        if (ship.cells.length) addShipOverlay(board, ship);
    });

    const placedCount = game.playerShips.filter(s => s.cells.length).length;
    ui.placedCount.textContent = `${placedCount} / ${game.playerShips.length} posizionate`;
    ui.start.disabled = game.playerShips.some(s => !s.cells.length);
    renderFleetList();[cite: 1]
}

function clearPreview() {
    game.previewCells.forEach(({ r, c }) => {
        const cell = getBoardCell(ui.setupBoard, r, c);
        if (cell) cell.classList.remove("preview", "invalid");
    });
    game.previewCells = [];[cite: 1]
}

function showPreview(r, c) {
    if (game.phase !== "setup") return;
    clearPreview();
    const ship = game.playerShips.find(s => s.id === game.selectedShipId);
    if (!ship || ship.cells.length) return;

    const cells = getPlacementCells(r, c, ship.length, game.orientation);
    const valid = isPlacementValid(cells, game.playerShips, ship.id);

    cells.forEach(([rr, cc]) => {
        if (!inBounds(rr, cc)) return;
        const cell = getBoardCell(ui.setupBoard, rr, cc);
        if (cell) {
            cell.classList.add("preview");
            if (!valid) cell.classList.add("invalid");
        }
        game.previewCells.push({ r: rr, c: cc });
    });[cite: 1]
}

function handleSetupCell(r, c) {
    if (game.phase !== "setup") return;
    const existing = shipAt(game.playerShips, r, c);
    if (existing) {
        existing.cells = [];
        existing.hits = [];
        existing.sunk = false;
        game.selectedShipId = existing.id;
        playSound("click");
        renderSetupBoard();
        return;
    }

    const ship = game.playerShips.find(s => s.id === game.selectedShipId);
    if (!ship) return;

    if (!placeShip(ship, r, c, game.orientation, game.playerShips)) {
        playSound("click");
        return;
    }

    playSound("click");
    game.selectedShipId = game.playerShips.find(s => !s.cells.length)?.id || null;
    renderSetupBoard();[cite: 1]
}

function autoPlacePlayer() {
    if (game.phase !== "setup") return;
    playSound("click");
    if (!randomPlacement(game.playerShips)) return;
    game.selectedShipId = null;
    renderSetupBoard();[cite: 1]
}

// --- LOGICA MULTIPLAYER FIREBASE ---

ui.joinRoomBtn.addEventListener("click", () => {
    const code = ui.roomCodeInput.value.trim().toUpperCase();
    if (!code) {
        alert("Inserisci un codice stanza valido!");
        return;
    }
    game.roomCode = code;
    connectToRoom(code);
});

function connectToRoom(code) {
    const roomRefPath = `battaglia_rooms/${code}`;
    ui.roomStatusBox.textContent = "Connessione alla stanza in corso...";

    get(ref(db, roomRefPath)).then(snapshot => {
        const roomData = snapshot.val() || {};

        if (!roomData.p1) {
            game.playerRole = "p1";
            set(ref(db, `${roomRefPath}/p1`), { ready: false });
        } else if (!roomData.p2) {
            game.playerRole = "p2";
            set(ref(db, `${roomRefPath}/p2`), { ready: false });
        } else {
            game.playerRole = "p2";
        }

        ui.roomPanel.classList.add("hidden");
        ui.setupPanel.classList.remove("hidden");
        game.phase = "setup";
        game.playerShips = makeFleet();
        game.selectedShipId = game.playerShips[0].id;
        renderSetupBoard();

        setStatus("Schiera la tua flotta", `Connesso come Giocatore ${game.playerRole === "p1" ? "1" : "2"}.`);
        initFirebaseListeners(roomRefPath);
    });
}

ui.start.addEventListener("click", () => {
    if (game.playerShips.some(s => !s.cells.length)) return;

    const serializedShips = game.playerShips.map(s => ({
        id: s.id,
        length: s.length,
        label: s.label,
        image: s.image,
        cells: s.cells
    }));

    update(ref(db, `battaglia_rooms/${game.roomCode}/${game.playerRole}`), {
        ready: true,
        ships: serializedShips
    });

    game.phase = "waiting_opponent";
    ui.setupPanel.classList.add("hidden");
    ui.battlePanel.classList.remove("hidden");
    setStatus("In attesa dell'avversario", "Hai schierato la flotta. Aspettando che l'altro giocatore sia pronto...");
    playSound("inizio");
    renderBattleBoards(false);
});

function initFirebaseListeners(roomRefPath) {
    onValue(ref(db, roomRefPath), snapshot => {
        const data = snapshot.val();
        if (!data) return;

        const p1 = data.p1;
        const p2 = data.p2;
        const opponentRole = game.playerRole === "p1" ? "p2" : "p1";
        const opponentData = data[opponentRole];

        if (opponentData && opponentData.ships) {
            game.enemyShips = opponentData.ships;
        }

        if (p1 && p2 && p1.ready && p2.ready) {
            if (game.phase === "waiting_opponent") {
                game.phase = "battle";
            }
            if (!data.turn) {
                set(ref(db, `${roomRefPath}/turn`), "p1");
            }
        }

        if (game.phase === "battle" || game.phase === "waiting_opponent") {
            updateBattleStateFromFirebase(data);
        }
    });
}

function updateBattleStateFromFirebase(data) {
    const opponentRole = game.playerRole === "p1" ? "p2" : "p1";
    const myData = data[game.playerRole] || {};
    const opponentData = data[opponentRole] || {};

    if (opponentData.shotsFired) {
        game.opponentShots = new Set(opponentData.shotsFired);
    }

    if (myData.shotsFired) {
        game.myShots = new Set(myData.shotsFired);
    }

    const isMyTurn = data.turn === game.playerRole && game.phase === "battle";
    renderBattleBoards(isMyTurn);

    if (game.phase === "waiting_opponent") {
        ui.turn.textContent = "In attesa";
        setStatus("In attesa dell'avversario", "In attesa che l'altro giocatore schieri la flotta...");
        return;
    }

    if (isMyTurn) {
        ui.turn.textContent = "Tuo turno";
        ui.enemyChip.textContent = "Il tuo turno: Spara!";
        setStatus("È il tuo turno!", "Clicca su una casella del settore avversario per sparare.", "cyan");
    } else {
        ui.turn.textContent = "Avversario";
        ui.enemyChip.textContent = "Turno avversario";
        setStatus("Turno avversario", "L'avversario sta mirando...", "gold");
    }

    checkWinConditions(data);
}

function handlePlayerShot(r, c) {
    const roomRefPath = `battaglia_rooms/${game.roomCode}`;
    get(ref(db, roomRefPath)).then(snapshot => {
        const data = snapshot.val();
        if (!data || data.turn !== game.playerRole || game.phase !== "battle") return;

        const shotKey = key(r, c);
        if (game.myShots.has(shotKey)) return;

        game.myShots.add(shotKey);
        game.playerShotCount++;
        playSound("shot");

        const opponentRole = game.playerRole === "p1" ? "p2" : "p1";
        const opponentShips = data[opponentRole].ships || [];

        let hitShip = null;
        for (const ship of opponentShips) {
            if (ship.cells && ship.cells.some(([sr, sc]) => sr === r && sc === c)) {
                hitShip = ship;
                break;
            }
        }

        const shotsArray = Array.from(game.myShots);
        let nextTurn = game.playerRole;

        if (hitShip) {
            const isSunk = hitShip.cells.every(([sr, sc]) => game.myShots.has(key(sr, sc)));
            playSound(isSunk ? "sinking" : "hit");
            game.playerHitCount++;
            setStatus("Colpo a segno!", "Impatto confermato! Tiri ancora.", "cyan");
        } else {
            playSound("water");
            setStatus("Acqua!", "Colpo in acqua. Turno dell'avversario.", "gold");
            nextTurn = opponentRole;
        }

        update(ref(db, `${roomRefPath}/${game.playerRole}`), {
            shotsFired: shotsArray,
            lastShotToOpponent: { r, c, hit: !!hitShip }
        });

        update(ref(db, `${roomRefPath}/${opponentRole}`), {
            lastShot: { r, c }
        });

        set(ref(db, `${roomRefPath}/turn`), nextTurn);
    });
}

function checkWinConditions(data) {
    if (game.phase !== "battle") return;
    const opponentRole = game.playerRole === "p1" ? "p2" : "p1";
    const myData = data[game.playerRole] || {};
    const opponentData = data[opponentRole] || {};

    const myShips = game.playerShips;
    const opponentShips = opponentData.ships || [];
    const myShotsSet = new Set(myData.shotsFired || []);
    const opponentShotsSet = new Set(opponentData.shotsFired || []);

    let enemySunkCount = 0;
    opponentShips.forEach(ship => {
        const allHit = ship.cells && ship.cells.every(([r, c]) => myShotsSet.has(key(r, c)));
        if (allHit && ship.cells.length > 0) enemySunkCount++;
    });

    let mySunkCount = 0;
    myShips.forEach(ship => {
        const allHit = ship.cells && ship.cells.every(([r, c]) => opponentShotsSet.has(key(r, c)));
        if (allHit) mySunkCount++;
    });

    ui.playerShipsLeft.textContent = myShips.length - mySunkCount;
    ui.enemyShipsLeft.textContent = opponentShips.length - enemySunkCount;

    if (enemySunkCount === opponentShips.length && opponentShips.length > 0) {
        finishGame(true);
    } else if (mySunkCount === myShips.length && myShips.length > 0) {
        finishGame(false);
    }
}

function finishGame(playerWon) {
    game.phase = "finished";
    ui.resultTitle.textContent = playerWon ? "Vittoria!" : "Sconfitta";
    ui.resultMessage.textContent = playerWon
        ? `Hai distrutto la flotta avversaria con ${game.playerShotCount} colpi!`
        : "La tua flotta è stata affondata dall'avversario.";

    playSound(playerWon ? "victory" : "defeat");
    setTimeout(() => ui.resultDialog.showModal(), 1000);
}

function renderBattleBoards(isMyTurn) {
    // 1. Plancia del giocatore (difesa)
    createBoard(ui.playerBoard, "player");
    const pBoard = ui.playerBoard.querySelector(".board");
    game.playerShips.forEach(ship => {
        if (ship.cells.length) addShipOverlay(pBoard, ship);
    });

    for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
            const cell = getBoardCell(ui.playerBoard, r, c);
            const k = key(r, c);
            const ship = shipAt(game.playerShips, r, c);
            cell.disabled = true;

            if (game.opponentShots.has(k)) {
                if (ship) {
                    const isSunk = ship.cells.every(([sr, sc]) => game.opponentShots.has(key(sr, sc)));
                    cell.classList.add(isSunk ? "sunk" : "hit");
                    addFireOverlay(cell);
                } else {
                    cell.classList.add("miss");
                }
            }
        }
    }

    // 2. Plancia avversaria (attacco)
    createBoard(ui.enemyBoard, "enemy");
    const eBoard = ui.enemyBoard.querySelector(".board");

    // Mostra le navi avversarie solo se affondate completamente
    (game.enemyShips || []).forEach(ship => {
        if (ship.cells && ship.cells.length > 0) {
            const isSunk = ship.cells.every(([sr, sc]) => game.myShots.has(key(sr, sc)));
            if (isSunk) {
                addShipOverlay(eBoard, ship);
            }
        }
    });

    for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
            const cell = getBoardCell(ui.enemyBoard, r, c);
            const k = key(r, c);
            const isShot = game.myShots.has(k);
            const enemyShip = (game.enemyShips || []).find(s => s.cells && s.cells.some(([sr, sc]) => sr === r && sc === c));

            // Abilita la cella solo se è il tuo turno, la partita è in corso e non è già stata colpita
            cell.disabled = !isMyTurn || game.phase !== "battle" || isShot;

            if (isShot) {
                if (enemyShip) {
                    const isSunk = enemyShip.cells.every(([sr, sc]) => game.myShots.has(key(sr, sc)));
                    cell.classList.add(isSunk ? "sunk" : "hit");
                    addFireOverlay(cell);
                } else {
                    cell.classList.add("miss");
                }
            }
        }
    }

    ui.shots.textContent = game.playerShotCount;
    ui.hits.textContent = game.playerHitCount;
    ui.accuracy.textContent = `${game.playerShotCount ? Math.round((game.playerHitCount / game.playerShotCount) * 100) : 0}%`;
}

ui.rotate.addEventListener("click", () => {
    game.orientation = game.orientation === "H" ? "V" : "H";
    ui.rotate.textContent = `↻ Ruota: ${game.orientation === "H" ? "orizzontale" : "verticale"}`;
    playSound("click");[cite: 1]
});

ui.autoPlace.addEventListener("click", autoPlacePlayer);

ui.soundToggle.addEventListener("click", () => {
    game.soundEnabled = !game.soundEnabled;
    ui.soundToggle.textContent = game.soundEnabled ? "♫ Audio ON" : "♫ Audio OFF";
    if (game.soundEnabled) playSound("click");[cite: 1]
});

ui.roomMenuBtn.addEventListener("click", () => {
    if (confirm("Vuoi tornare alla schermata della stanza?")) {
        location.reload();
    }
});

ui.rulesToggle.addEventListener("click", () => ui.rulesDialog.showModal());
ui.playAgain.addEventListener("click", () => location.reload());

document.addEventListener("keydown", (e) => {
    if (e.code === "Space" && game.phase === "setup") {
        e.preventDefault();
        game.orientation = game.orientation === "H" ? "V" : "H";
        ui.rotate.textContent = `↻ Ruota: ${game.orientation === "H" ? "orizzontale" : "verticale"}`;
        playSound("click");[cite: 1]
    }
});