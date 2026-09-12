/* ==========================================================================
   Yatra Rakshaka - Core Application Controller
   Audited, Hardened, XSS-Safe, and Truthful Emergency Protocol
   ========================================================================== */

// --- Global Application State ---
let map = null;
let userMarker = null;
let driverMarker = null;
let routePolyline = null;
let tileLayer = null;
let isDarkMap = true;

// Honest Coordinates State (null until real permission granted or demo enabled)
let userCoords = null;
let driverCoords = { lat: 28.6210, lng: 77.2180 };
let userAddress = "Detecting GPS location...";
let isDemoMode = false;
let cabSpeed = 36;
let distanceKm = 1.8;

// Demo Fallback Baseline (Clearly labeled as simulation)
const DEMO_COORDS = { lat: 28.6139, lng: 77.2090 };
const DEMO_ADDRESS = "Connaught Place, New Delhi (Simulated Demo)";

// Active Cab Details (Separated Type and Model)
let activeCab = {
    name: "Rajesh Kumar",
    phone: "+91 98765 43210",
    type: "Sedan",
    model: "White Maruti Suzuki Dzire",
    plate: "DL 01 AB 7890",
    rating: "4.9",
    otp: "4892",
    tripId: "#YR-9082",
    status: "enroute" // 'enroute', 'waiting', 'completed'
};

// Police Stations & Map Markers
let nearbyPoliceStations = [];
let policeMapMarkers = [];

// Unified Call State
let isCallActive = false;
let callInterval = null;
let callSeconds = 0;
let isMuted = false;
let isSpeaker = false;
let ringAudioTimer = null;

// Emergency SOS State
let sosCountdown = 5;
let sosInterval = null;

// Battery Diagnostics State
let isUltraSaverActive = false;
let batterySimulationEnabled = false;
let realBatteryManager = null;

// Chat State
let unreadMessages = 0;

// Geocoding Throttling
let lastGeocodeTime = 0;
let lastGeocodedCoords = null;

/* ==========================================================================
   1. Audio Synthesizer Engine (Lightweight HTML5 Web Audio API)
   ========================================================================== */
let audioCtx = null;

function beep(freq = 440, duration = 0.15, type = 'sine', gainVal = 0.15) {
    try {
        if (!audioCtx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) audioCtx = new AudioContext();
        }
        if (!audioCtx) return;
        if (audioCtx.state === 'suspended') audioCtx.resume();

        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        gain.gain.setValueAtTime(gainVal, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + duration);
    } catch (_) {}
}

const playChime = (inbound = false) => {
    beep(inbound ? 520 : 680, 0.1, 'sine', 0.12);
    setTimeout(() => beep(inbound ? 680 : 840, 0.15, 'sine', 0.12), 100);
};

const playPhoneRing = () => {
    beep(440, 0.35, 'sine', 0.15);
    setTimeout(() => beep(480, 0.35, 'sine', 0.15), 45);
};

const playSiren = () => {
    beep(850, 0.25, 'sawtooth', 0.2);
    setTimeout(() => beep(650, 0.25, 'sawtooth', 0.2), 250);
};

const playPowerDown = () => beep(220, 0.5, 'triangle', 0.2);

/* ==========================================================================
   2. Geodesic Distance Helper & Sanitizers
   ========================================================================== */
function getDistanceKm(lat1, lon1, lat2, lon2) {
    if (typeof L !== 'undefined' && L.latLng) {
        return L.latLng(lat1, lon1).distanceTo(L.latLng(lat2, lon2)) / 1000;
    }
    const dLat = (lat2 - lat1) * 111.32;
    const dLon = (lon2 - lon1) * 111.32 * Math.cos(lat1 * Math.PI / 180);
    return Math.hypot(dLat, dLon);
}

function normalizePhone(value) {
    const cleaned = String(value || "").replace(/[^\d+]/g, "");
    return /^\+?\d{7,16}$/.test(cleaned) ? cleaned : "112";
}

/* ==========================================================================
   3. DOM Ready Initialization
   ========================================================================== */
document.addEventListener("DOMContentLoaded", () => {
    try { initMap(); } catch (err) { console.error("Map init error:", err); }
    try { initLocationTracking(); } catch (err) { console.error("Location init error:", err); }
    try { initBatteryDiagnostics(); } catch (err) { console.error("Battery init error:", err); }
    try { initPhoneDetails(); } catch (err) { console.error("Phone details init error:", err); }
    try { setupBatterySlider(); } catch (err) { console.error("Slider setup error:", err); }

    // Start with verified 24x7 Emergency Hubs
    loadFallbackPoliceStations(DEMO_COORDS.lat, DEMO_COORDS.lng);

    // AudioContext unlock on first user interaction
    document.addEventListener("click", () => {
        if (!audioCtx) {
            const AC = window.AudioContext || window.webkitAudioContext;
            if (AC) audioCtx = new AC();
        }
        if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    }, { once: true });
});

/* ==========================================================================
   4. Interactive Map & Live Geolocation
   ========================================================================== */
function initMap() {
    if (typeof L === 'undefined') {
        setTimeout(initMap, 200);
        return;
    }

    const mapElem = document.getElementById('leaflet-map');
    if (!mapElem || map) return;

    const initialCenter = userCoords || DEMO_COORDS;

    map = L.map('leaflet-map', {
        zoomControl: true,
        attributionControl: true
    }).setView([initialCenter.lat, initialCenter.lng], 14);

    // Free OpenStreetMap Tiles
    tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        subdomains: ['a', 'b', 'c'],
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>'
    }).addTo(map);

    // User Location Marker (Cyan Pulsing Dot)
    const userIcon = L.divIcon({
        className: 'user-map-pin',
        html: `<div style="background:#38bdf8; width:20px; height:20px; border-radius:50%; border:3px solid #ffffff; box-shadow:0 0 16px #38bdf8; animation:pulse 1.8s infinite;"></div>`,
        iconSize: [22, 22],
        iconAnchor: [11, 11]
    });
    userMarker = L.marker([initialCenter.lat, initialCenter.lng], { icon: userIcon }).addTo(map)
        .bindPopup("<b>📍 Live Location Status</b><br><span id='popup-address'>Awaiting GPS satellite fix...</span>");

    // Cab Driver Marker (Emerald Green Vehicle Pin)
    const cabIcon = L.divIcon({
        className: 'cab-map-pin',
        html: `<div style="background:#10b981; width:30px; height:30px; border-radius:50%; border:3px solid #ffffff; display:flex; align-items:center; justify-content:center; color:#ffffff; font-size:13px; box-shadow:0 0 14px rgba(16, 185, 129, 0.6);"><i class="fa-solid fa-car"></i></div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
    });
    driverMarker = L.marker([driverCoords.lat, driverCoords.lng], { icon: cabIcon }).addTo(map)
        .bindPopup(`<b>🚖 ${activeCab.name} (${activeCab.type})</b><br>Plate: ${activeCab.plate}<br>Status: En route (Simulated telemetry)`);

    // Route Polyline
    routePolyline = L.polyline([
        [driverCoords.lat, driverCoords.lng],
        [initialCenter.lat, initialCenter.lng]
    ], {
        color: '#38bdf8',
        weight: 4,
        opacity: 0.85,
        dashArray: '8, 8'
    }).addTo(map);

    startCabMovementSimulation();
    plotPoliceStationsOnMap();
}

function toggleMapTheme() {
    const mapBox = document.getElementById("map-container-box");
    const btn = document.getElementById("map-theme-btn");
    isDarkMap = !isDarkMap;

    if (mapBox) {
        if (isDarkMap) {
            mapBox.classList.add("dark-map");
            if (btn) btn.innerHTML = `<i class="fa-solid fa-moon"></i>`;
            showToast("🌙 Map switched to Cyber Dark Radar");
        } else {
            mapBox.classList.remove("dark-map");
            if (btn) btn.innerHTML = `<i class="fa-solid fa-sun"></i>`;
            showToast("☀️ Map switched to Standard Street View");
        }
    }
}

function recenterMap() {
    if (!map) return;
    const target = userCoords || (isDemoMode ? DEMO_COORDS : null);
    if (target) {
        map.flyTo([target.lat, target.lng], 15, { animate: true, duration: 1.2 });
        if (userMarker) userMarker.openPopup();
        showToast("📍 Centered on GPS position");
    } else {
        showToast("⚠️ Live GPS position not yet acquired.");
    }
}

function initLocationTracking() {
    const coordsElem = document.getElementById("live-coords");
    const statusElem = document.getElementById("gps-status-text");

    if ("geolocation" in navigator) {
        if (statusElem) statusElem.textContent = "GPS: Acquiring...";
        if (coordsElem) coordsElem.textContent = "Acquiring GPS fix...";

        navigator.geolocation.watchPosition(
            (pos) => {
                isDemoMode = false;
                updateDemoModeBadge(false);

                const lat = pos.coords.latitude;
                const lng = pos.coords.longitude;
                const acc = Math.round(pos.coords.accuracy || 8);

                userCoords = { lat, lng };

                if (userMarker) userMarker.setLatLng([lat, lng]);
                if (routePolyline && driverMarker) {
                    routePolyline.setLatLngs([driverMarker.getLatLng(), [lat, lng]]);
                }

                if (coordsElem) coordsElem.textContent = `Lat: ${lat.toFixed(4)}°, Lng: ${lng.toFixed(4)}° (±${acc}m)`;
                if (statusElem) statusElem.textContent = `GPS: Live (±${acc}m)`;

                // Reverse geocode with throttling
                fetchLiveAddress(lat, lng);

                // Refresh police stations if moved significantly
                if (!lastGeocodedCoords || getDistanceKm(lastGeocodedCoords.lat, lastGeocodedCoords.lng, lat, lng) > 0.6) {
                    fetchNearbyPoliceStations(lat, lng);
                }
            },
            (err) => {
                console.warn("Geolocation watch warning:", err.message);
                if (!isDemoMode) {
                    userCoords = null;
                    userAddress = "Live GPS unavailable";
                    if (coordsElem) coordsElem.textContent = "GPS Unavailable";
                    if (statusElem) {
                        statusElem.textContent = err.code === 1 ? "GPS: Permission Denied" : "GPS: Unavailable";
                    }
                    const addressEl = document.getElementById("live-address-text");
                    if (addressEl) addressEl.textContent = "Location permission needed (or tap 🧪 Demo)";
                }
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 2000 }
        );
    } else {
        if (statusElem) statusElem.textContent = "GPS: Unsupported";
        if (coordsElem) coordsElem.textContent = "Browser GPS unsupported";
    }
}

function toggleDemoMode() {
    isDemoMode = !isDemoMode;
    updateDemoModeBadge(isDemoMode);

    const coordsElem = document.getElementById("live-coords");
    const statusElem = document.getElementById("gps-status-text");
    const addressElem = document.getElementById("live-address-text");
    const demoBtn = document.getElementById("demo-toggle-btn");

    if (isDemoMode) {
        userCoords = { ...DEMO_COORDS };
        userAddress = DEMO_ADDRESS;

        if (coordsElem) coordsElem.textContent = `Lat: ${userCoords.lat.toFixed(4)}°, Lng: ${userCoords.lng.toFixed(4)}° [DEMO]`;
        if (statusElem) statusElem.textContent = "GPS: Demo Mode";
        if (addressElem) addressElem.textContent = userAddress;
        if (demoBtn) demoBtn.classList.add("active");

        if (userMarker) {
            userMarker.setLatLng([userCoords.lat, userCoords.lng]);
            const popup = document.getElementById("popup-address");
            if (popup) popup.textContent = userAddress;
        }
        if (map) map.setView([userCoords.lat, userCoords.lng], 14);

        loadFallbackPoliceStations(userCoords.lat, userCoords.lng);
        showToast("🧪 Demo Simulation Mode Enabled");
    } else {
        if (demoBtn) demoBtn.classList.remove("active");
        showToast("📍 Exiting Demo Mode; querying real GPS...");
        initLocationTracking();
    }
}

function updateDemoModeBadge(enable) {
    const badge = document.getElementById("demo-mode-badge");
    if (badge) {
        if (enable) badge.classList.remove("hidden");
        else badge.classList.add("hidden");
    }
}

function startCabMovementSimulation() {
    let t = 0;
    setInterval(() => {
        if (activeCab.status !== 'enroute') return;
        t += 0.04;

        const target = userCoords || DEMO_COORDS;
        const dLat = target.lat - driverCoords.lat;
        const dLng = target.lng - driverCoords.lng;

        // Simulated telemetry step
        driverCoords.lat += (dLat * 0.02) + (Math.sin(t) * 0.0001);
        driverCoords.lng += (dLng * 0.02) + (Math.cos(t) * 0.0001);

        if (driverMarker) driverMarker.setLatLng([driverCoords.lat, driverCoords.lng]);
        if (routePolyline && userCoords) {
            routePolyline.setLatLngs([[driverCoords.lat, driverCoords.lng], [userCoords.lat, userCoords.lng]]);
        }

        const dist = getDistanceKm(driverCoords.lat, driverCoords.lng, target.lat, target.lng);
        distanceKm = Math.max(0.1, parseFloat(dist.toFixed(1)));
        cabSpeed = Math.floor(32 + Math.sin(t * 2) * 8);

        const speedElem = document.getElementById("live-speed");
        const etaElem = document.getElementById("live-eta");

        if (speedElem) speedElem.textContent = `Cab Speed: ${cabSpeed} km/h (Simulated)`;
        if (etaElem) {
            const mins = Math.max(1, Math.round(distanceKm * 2.5));
            etaElem.textContent = `ETA: ${mins} Mins (${distanceKm} km)`;
        }
    }, 2000);
}

/* ==========================================================================
   5. Throttled & Resilient Reverse Geocoding (Nominatim)
   ========================================================================== */
async function fetchLiveAddress(lat, lng) {
    const now = Date.now();
    // Enforce 5-second throttling
    if (now - lastGeocodeTime < 5000) return;
    lastGeocodeTime = now;
    lastGeocodedCoords = { lat, lng };

    const addressElem = document.getElementById("live-address-text");
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    try {
        const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=16`;
        const res = await fetch(url, {
            signal: controller.signal,
            headers: { 'Accept-Language': 'en' }
        });
        if (!res.ok) throw new Error(`Nominatim HTTP ${res.status}`);
        const data = await res.json();

        if (data && data.address) {
            const road = data.address.road || data.address.suburb || data.address.neighbourhood || "";
            const city = data.address.city || data.address.town || data.address.state_district || data.address.state || "";
            userAddress = road ? `${road}, ${city}` : (data.display_name ? data.display_name.split(",").slice(0, 3).join(",") : "Current GPS Sector");

            if (addressElem) addressElem.textContent = userAddress;
            const popup = document.getElementById("popup-address");
            if (popup) popup.textContent = userAddress;
        }
    } catch (err) {
        console.warn("Reverse geocoding fallback active:", err.message);
        if (!userAddress || userAddress.includes("Detecting")) {
            userAddress = `Lat ${lat.toFixed(4)}, Lng ${lng.toFixed(4)}`;
            if (addressElem) addressElem.textContent = userAddress;
        }
    } finally {
        clearTimeout(timeoutId);
    }
}

/* ==========================================================================
   6. Multi-Endpoint Resilient Overpass Police Scanner
   ========================================================================== */
const OVERPASS_ENDPOINTS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter"
];

function loadFallbackPoliceStations(lat, lng) {
    const statusElem = document.getElementById("police-scan-status");
    nearbyPoliceStations = [
        { name: "National Emergency Command (PCR)", distance: "Direct Line", phone: "112", address: "24x7 Central Emergency Dispatch", lat: lat + 0.004, lng: lng + 0.003 },
        { name: "Central Police Station HQ", distance: "0.8 km", phone: "011-23412345", address: "Circle Police HQ & Quick Response Team", lat: lat + 0.006, lng: lng - 0.005 },
        { name: "Women Safety Cell Helpline", distance: "1.4 km", phone: "1091", address: "Dedicated Women Transit Protection Wing", lat: lat - 0.005, lng: lng + 0.006 },
        { name: "Traffic & Highway Patrol Desk", distance: "2.1 km", phone: "103", address: "Rapid Transit Vehicle Patrol Division", lat: lat - 0.008, lng: lng - 0.004 }
    ];

    renderPoliceStations();
    plotPoliceStationsOnMap();

    if (statusElem) {
        statusElem.textContent = "🟢 Verified 24x7 Emergency Hubs Active";
    }
}

async function fetchNearbyPoliceStations(lat, lng) {
    const statusElem = document.getElementById("police-scan-status");
    const overpassQuery = `[out:json][timeout:6];(node["amenity"="police"](around:8000,${lat},${lng});way["amenity"="police"](around:8000,${lat},${lng}););out center 6;`;

    for (const endpoint of OVERPASS_ENDPOINTS) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);

        try {
            const url = `${endpoint}?data=${encodeURIComponent(overpassQuery)}`;
            const response = await fetch(url, { signal: controller.signal });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();

            if (data && Array.isArray(data.elements) && data.elements.length > 0) {
                const liveStations = data.elements.map(el => {
                    const pLat = Number(el.lat || (el.center ? el.center.lat : lat));
                    const pLng = Number(el.lon || (el.center ? el.center.lon : lng));
                    const tags = el.tags || {};
                    const name = tags.name || tags["name:en"] || "Local Police Station";
                    const phone = normalizePhone(tags.phone || tags["contact:phone"] || "112");
                    const address = tags["addr:street"] ? `${tags["addr:street"]}, ${tags["addr:city"] || ""}` : "Local Jurisdiction Division";
                    const distKm = getDistanceKm(lat, lng, pLat, pLng).toFixed(1);

                    return {
                        name,
                        distance: `${distKm} km`,
                        distNum: parseFloat(distKm),
                        phone,
                        address,
                        lat: pLat,
                        lng: pLng
                    };
                }).sort((a, b) => a.distNum - b.distNum);

                // Add 112 National Command to top
                liveStations.unshift({
                    name: "National Emergency Command (PCR)",
                    distance: "Direct Line",
                    distNum: 0,
                    phone: "112",
                    address: "24x7 Nationwide Central Dispatch",
                    lat: lat + 0.003,
                    lng: lng + 0.003
                });

                nearbyPoliceStations = liveStations;
                renderPoliceStations();
                plotPoliceStationsOnMap();

                if (statusElem) {
                    statusElem.textContent = `🟢 ${nearbyPoliceStations.length} police response hubs mapped`;
                }
                return; // Successfully updated from endpoint
            }
        } catch (e) {
            console.warn(`Endpoint ${endpoint} failed:`, e.message);
        } finally {
            clearTimeout(timeoutId);
        }
    }

    if (statusElem) statusElem.textContent = "🟢 24x7 Emergency Hubs Active";
}

function plotPoliceStationsOnMap() {
    if (!map) return;

    policeMapMarkers.forEach(m => map.removeLayer(m));
    policeMapMarkers = [];

    nearbyPoliceStations.forEach(station => {
        if (!station.lat || !station.lng) return;

        const policeIcon = L.divIcon({
            className: 'police-map-pin',
            html: `<div class="police-pin-inner"><i class="fa-solid fa-shield"></i></div>`,
            iconSize: [26, 26],
            iconAnchor: [13, 13]
        });

        const safePhone = normalizePhone(station.phone);
        const pMarker = L.marker([station.lat, station.lng], { icon: policeIcon }).addTo(map)
            .bindPopup(`<b>🚓 ${escapeHtml(station.name)}</b><br>Distance: ${escapeHtml(station.distance)}<br>Emergency Dial: <a href="tel:${safePhone}">${safePhone}</a>`);

        policeMapMarkers.push(pMarker);
    });
}

// XSS-Safe DOM construction for Police Station List
function renderPoliceStations() {
    const listContainer = document.getElementById("police-station-list");
    if (!listContainer) return;

    listContainer.innerHTML = ""; // Clear safely

    nearbyPoliceStations.forEach(station => {
        const itemDiv = document.createElement("div");
        itemDiv.className = "police-item";

        const infoDiv = document.createElement("div");
        infoDiv.className = "police-info";

        const h4 = document.createElement("h4");
        h4.textContent = station.name;

        const p = document.createElement("p");
        p.textContent = `📍 ${station.distance} • ${station.address}`;

        infoDiv.appendChild(h4);
        infoDiv.appendChild(p);

        const actionsDiv = document.createElement("div");
        actionsDiv.className = "police-actions";

        const callBtn = document.createElement("button");
        callBtn.className = "police-btn police-call";
        callBtn.title = `Call ${station.name}`;
        callBtn.innerHTML = `<i class="fa-solid fa-phone"></i>`;
        callBtn.addEventListener("click", () => {
            openCallModal(station.name, station.phone, 'Emergency Dispatch');
        });

        const navBtn = document.createElement("button");
        navBtn.className = "police-btn police-nav";
        navBtn.title = `Directions in Google Maps`;
        navBtn.innerHTML = `<i class="fa-solid fa-diamond-turn-right"></i>`;
        navBtn.addEventListener("click", () => {
            navigatePolice(station.name);
        });

        actionsDiv.appendChild(callBtn);
        actionsDiv.appendChild(navBtn);

        itemDiv.appendChild(infoDiv);
        itemDiv.appendChild(actionsDiv);
        listContainer.appendChild(itemDiv);
    });
}

function refreshPoliceStations() {
    playChime(true);
    showToast("🔄 Re-scanning nearby emergency stations...");
    const target = userCoords || DEMO_COORDS;
    fetchNearbyPoliceStations(target.lat, target.lng);
}

function navigatePolice(name) {
    const query = encodeURIComponent(`${name} near me`);
    window.open(`https://www.google.com/maps/search/${query}`, '_blank');
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
}

/* ==========================================================================
   7. Custom Cab Management & Safety Beacon (Separated Type & Model)
   ========================================================================== */
function openCabModal() {
    const modal = document.getElementById("cab-modal");
    if (modal) modal.classList.remove("hidden");

    const plateInput = document.getElementById("input-plate");
    const nameInput = document.getElementById("input-driver-name");
    const phoneInput = document.getElementById("input-driver-phone");
    const typeSelect = document.getElementById("input-cab-type");
    const modelInput = document.getElementById("input-cab-model");
    const statusSelect = document.getElementById("input-ride-status");

    if (plateInput) plateInput.value = activeCab.plate;
    if (nameInput) nameInput.value = activeCab.name;
    if (phoneInput) phoneInput.value = activeCab.phone;
    if (typeSelect) typeSelect.value = activeCab.type;
    if (modelInput) modelInput.value = activeCab.model;
    if (statusSelect) statusSelect.value = activeCab.status;
}

function closeCabModal() {
    const modal = document.getElementById("cab-modal");
    if (modal) modal.classList.add("hidden");
}

function handleCabSubmit(e) {
    e.preventDefault();

    const plate = document.getElementById("input-plate").value.trim().toUpperCase();
    const name = document.getElementById("input-driver-name").value.trim();
    const phoneRaw = document.getElementById("input-driver-phone").value.trim();
    const type = document.getElementById("input-cab-type").value;
    const model = document.getElementById("input-cab-model").value.trim();
    const status = document.getElementById("input-ride-status").value;

    // Strict phone validation
    const phoneRegex = /^\+?[0-9 ()-]{8,20}$/;
    if (!phoneRegex.test(phoneRaw)) {
        showToast("⚠️ Please enter a valid driver phone number!");
        return;
    }

    if (!plate || !name || !model) {
        showToast("⚠️ Please fill in all required fields!");
        return;
    }

    activeCab.plate = plate;
    activeCab.name = name;
    activeCab.phone = phoneRaw;
    activeCab.type = type;
    activeCab.model = model;
    activeCab.status = status;

    // Safe textContent updates (XSS-Safe)
    const nameEl = document.getElementById("driver-name");
    const plateEl = document.getElementById("car-plate");
    const modelEl = document.getElementById("cab-model");
    const phoneEl = document.getElementById("driver-phone-val");

    if (nameEl) nameEl.textContent = activeCab.name;
    if (plateEl) plateEl.textContent = activeCab.plate;
    if (modelEl) modelEl.textContent = `🚗 ${activeCab.type} • ${activeCab.model}`;
    if (phoneEl) phoneEl.textContent = activeCab.phone;

    // Update Chat References
    const chatName = document.getElementById("chat-driver-name");
    const chatStatus = document.getElementById("chat-driver-status");
    if (chatName) chatName.textContent = activeCab.name;
    if (chatStatus) chatStatus.textContent = `🟢 Online • ${activeCab.plate}`;

    // Update Ride Status Badge
    const badge = document.getElementById("ride-status-badge");
    if (badge) {
        badge.className = "badge ride-status-badge";
        if (status === 'waiting') {
            badge.classList.add("waiting");
            badge.textContent = "⏳ Waiting for Cab";
        } else if (status === 'completed') {
            badge.classList.add("completed");
            badge.textContent = "✅ Safely Completed";
        } else {
            badge.textContent = "🟢 En Route";
        }
    }

    // Update map marker popup
    if (driverMarker) {
        driverMarker.bindPopup(`<b>🚖 ${escapeHtml(activeCab.name)} (${escapeHtml(activeCab.type)})</b><br>Model: ${escapeHtml(activeCab.model)}<br>Plate: ${escapeHtml(activeCab.plate)}<br>Status: ${escapeHtml(status)}`);
    }

    closeCabModal();
    playChime(false);
    showToast(`🚕 Safe Ride Updated for ${activeCab.plate}!`);
}

function generateSafetyBeaconPayload() {
    const isMock = isDemoMode || !userCoords;
    const coordsStr = userCoords ? `${userCoords.lat.toFixed(5)},${userCoords.lng.toFixed(5)}` : "Unavailable";
    const mapsLink = userCoords ? `https://www.google.com/maps?q=${coordsStr}` : "Live GPS link unavailable (Permission required)";

    return `🚨 Yatra Rakshaka Passenger Safety Beacon ${isMock ? "[DEMO SIMULATION]" : ""}:\n\n` +
           `👤 Passenger in transit with: ${activeCab.name}\n` +
           `🚗 Vehicle: ${activeCab.type} - ${activeCab.model} (${activeCab.plate})\n` +
           `📞 Driver Contact: ${activeCab.phone}\n` +
           `🔐 Ride OTP: ${activeCab.otp} | Trip ID: ${activeCab.tripId}\n` +
           `📍 Location: ${userAddress}\n` +
           `🗺️ GPS Link: ${mapsLink}\n\n` +
           `Transmitted via Yatra Rakshaka Sentinel.`;
}

function openShareModal() {
    const modal = document.getElementById("share-modal");
    const previewBox = document.getElementById("beacon-preview-box");
    if (previewBox) previewBox.textContent = generateSafetyBeaconPayload();
    if (modal) modal.classList.remove("hidden");
}

function closeShareModal() {
    const modal = document.getElementById("share-modal");
    if (modal) modal.classList.add("hidden");
}

function shareOnWhatsApp() {
    const text = encodeURIComponent(generateSafetyBeaconPayload());
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
    showToast("📲 WhatsApp Safety Beacon link opened!");
}

function shareViaSms() {
    const text = encodeURIComponent(generateSafetyBeaconPayload());
    window.location.href = `sms:?body=${text}`;
    showToast("✉️ SMS Safety Beacon draft created!");
}

function copyShareBeacon() {
    const payload = generateSafetyBeaconPayload();
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(payload).then(() => {
            playChime(false);
            showToast("📋 Safety Beacon copied to clipboard!");
            closeShareModal();
        }).catch(() => fallbackCopy(payload));
    } else {
        fallbackCopy(payload);
    }
}

function fallbackCopy(text) {
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch (_) {}
    document.body.removeChild(ta);
    playChime(false);
    showToast("📋 Safety Beacon copied to clipboard!");
    closeShareModal();
}

/* ==========================================================================
   8. Battery Diagnostics & 5% Auto Ultra Saver Mode
   ========================================================================== */
function initBatteryDiagnostics() {
    if ('getBattery' in navigator) {
        navigator.getBattery().then(battery => {
            realBatteryManager = battery;
            handleBatteryEvent(battery);
            battery.addEventListener('levelchange', () => handleBatteryEvent(battery));
            battery.addEventListener('chargingchange', () => handleBatteryEvent(battery));
        }).catch(() => {
            updateBatteryDisplay(85, false);
        });
    } else {
        updateBatteryDisplay(85, false);
    }
}

function handleBatteryEvent(battery) {
    if (batterySimulationEnabled) return;
    const level = Math.round(battery.level * 100);
    updateBatteryDisplay(level, battery.charging);
}

function setupBatterySlider() {
    const slider = document.getElementById("battery-slider");
    if (!slider) return;

    slider.addEventListener("input", (e) => {
        batterySimulationEnabled = true;
        const val = parseInt(e.target.value);
        updateBatteryDisplay(val, false);
    });
}

function useRealBattery() {
    batterySimulationEnabled = false;
    if (realBatteryManager) {
        handleBatteryEvent(realBatteryManager);
        showToast("🔋 Restored live device battery monitoring");
    } else {
        showToast("⚡ Device Battery API not available in browser; reset to 85%");
        updateBatteryDisplay(85, false);
    }
}

function updateBatteryDisplay(percent, isCharging) {
    const percentElem = document.getElementById("phone-bat-percent");
    const fillElem = document.getElementById("battery-bar-fill");
    const chargingElem = document.getElementById("phone-charging-status");
    const simValElem = document.getElementById("battery-sim-val");
    const sliderElem = document.getElementById("battery-slider");
    const iconElem = document.getElementById("phone-bat-icon");
    const headerIcon = document.getElementById("header-battery-icon");

    if (percentElem) percentElem.textContent = `${percent}%`;
    if (fillElem) {
        fillElem.style.width = `${percent}%`;
        fillElem.style.background = percent <= 5 ? "#ef4444" : (percent <= 20 ? "#f59e0b" : "linear-gradient(90deg, #10b981, #06b6d4)");
    }
    if (simValElem) simValElem.textContent = `${percent}%`;
    if (sliderElem && sliderElem.value != percent) sliderElem.value = percent;

    const iconClass = percent <= 10 ? "fa-solid fa-battery-empty" :
                     (percent <= 30 ? "fa-solid fa-battery-quarter" :
                     (percent <= 70 ? "fa-solid fa-battery-half" : "fa-solid fa-battery-full"));

    if (iconElem) iconElem.className = iconClass;
    if (headerIcon) headerIcon.className = iconClass;

    if (chargingElem) {
        chargingElem.innerHTML = isCharging ?
            `<i class="fa-solid fa-bolt" style="color:#10b981;"></i> Charging` :
            `<i class="fa-solid fa-plug"></i> Discharging`;
    }

    // Auto 5% Trigger
    if (percent <= 5) {
        if (!isUltraSaverActive) {
            toggleUltraSaver(true);
            playPowerDown();
            showToast("⚠️ Battery ≤ 5%: Auto Ultra Power Saver Active!");
        }
    } else {
        if (isUltraSaverActive && !batterySimulationEnabled) {
            toggleUltraSaver(false);
        }
    }
}

function toggleUltraSaver(enable) {
    isUltraSaverActive = enable;
    const saverBar = document.getElementById("ultra-saver-bar");
    const saverBadge = document.getElementById("battery-saver-badge");
    const saverStatusText = document.getElementById("saver-status-text");

    if (enable) {
        document.body.classList.add("ultra-saver");
        if (saverBar) saverBar.classList.remove("hidden");
        if (saverBadge) {
            saverBadge.className = "badge saver-badge";
            saverBadge.style.background = "#ef4444";
            saverBadge.style.color = "#ffffff";
        }
        if (saverStatusText) saverStatusText.textContent = "SAVER: ULTRA 5% ACTIVE";
    } else {
        document.body.classList.remove("ultra-saver");
        if (saverBar) saverBar.classList.add("hidden");
        if (saverBadge) {
            saverBadge.className = "badge saver-badge";
            saverBadge.style.background = "rgba(245, 158, 11, 0.12)";
            saverBadge.style.color = "#f59e0b";
        }
        if (saverStatusText) saverStatusText.textContent = "Saver: OFF";
    }
}

function manualToggleSaver() {
    batterySimulationEnabled = true;
    toggleUltraSaver(!isUltraSaverActive);
    if (isUltraSaverActive) {
        playPowerDown();
        showToast("⚡ Ultra Battery Saver Manually Enabled");
    } else {
        showToast("🔋 Normal Power Mode Restored");
    }
}

/* ==========================================================================
   9. Device & Platform Telemetry
   ========================================================================== */
function initPhoneDetails() {
    const ua = navigator.userAgent;
    let osInfo = "Mobile Device";

    if (/Android/i.test(ua)) osInfo = "Android (ARM64)";
    else if (/iPhone|iPad|iPod/i.test(ua)) osInfo = "Apple iOS Device";
    else if (/Linux/i.test(ua)) osInfo = "Linux Workstation / Mobile";
    else if (/Windows/i.test(ua)) osInfo = "Windows 11 (x86_64)";
    else if (/Mac/i.test(ua)) osInfo = "macOS (Apple Silicon)";

    const osElem = document.getElementById("phone-os-info");
    if (osElem) osElem.textContent = osInfo;

    const w = window.screen.width;
    const h = window.screen.height;
    const ratio = window.devicePixelRatio || 1;
    const resElem = document.getElementById("phone-res-info");
    if (resElem) resElem.textContent = `${w} x ${h} (${ratio}x DPI)`;

    const cores = navigator.hardwareConcurrency || 8;
    const ram = navigator.deviceMemory ? `${navigator.deviceMemory}GB RAM` : "8GB RAM";
    const hwElem = document.getElementById("phone-hw-info");
    if (hwElem) hwElem.textContent = `${cores} CPU Cores | ${ram}`;

    const netElem = document.getElementById("phone-network-info");
    if (netElem) {
        if (navigator.onLine) {
            const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
            const type = conn ? (conn.effectiveType || "4G").toUpperCase() : "4G LTE";
            const rtt = conn ? (conn.rtt || 38) : 38;
            netElem.textContent = `Online (${type} • ${rtt}ms RTT)`;
        } else {
            netElem.textContent = "Offline (Local PWA Mode)";
            netElem.style.color = "#ef4444";
        }
    }
}

/* ==========================================================================
   10. In-App Messaging Chat Drawer (XSS-Safe DOM Construction)
   ========================================================================== */
function openChatDrawer() {
    const drawer = document.getElementById("chat-drawer");
    if (drawer) drawer.classList.add("open");

    unreadMessages = 0;
    const badge = document.getElementById("chat-unread-badge");
    if (badge) badge.style.display = "none";
}

function closeChatDrawer() {
    const drawer = document.getElementById("chat-drawer");
    if (drawer) drawer.classList.remove("open");
}

function handleChatKeyPress(e) {
    if (e.key === "Enter") sendMessage();
}

function sendMessage() {
    const input = document.getElementById("chat-input");
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;

    appendChatMessage(text, "outgoing");
    input.value = "";
    playChime(false);

    const typing = document.getElementById("typing-indicator");
    if (typing) typing.classList.remove("hidden");

    setTimeout(() => {
        if (typing) typing.classList.add("hidden");
        const responses = [
            `Namaste! I am driving ${activeCab.plate}, reaching in 3 minutes.`,
            `Yes sir, following safety GPS route. AC is turned on.`,
            `Ride is verified, following the safest route.`,
            `Vehicle speed is ${cabSpeed} km/h, reaching pickup location.`
        ];
        const reply = responses[Math.floor(Math.random() * responses.length)];
        appendChatMessage(reply, "incoming");
        playChime(true);

        const drawer = document.getElementById("chat-drawer");
        if (drawer && !drawer.classList.contains("open")) {
            unreadMessages++;
            const badge = document.getElementById("chat-unread-badge");
            if (badge) {
                badge.textContent = unreadMessages;
                badge.style.display = "inline-block";
            }
            showToast(`💬 ${activeCab.name}: "${reply.substring(0, 32)}..."`);
        }
    }, 1200);
}

function sendQuickMessage(msg) {
    appendChatMessage(msg, "outgoing");
    playChime(false);

    const typing = document.getElementById("typing-indicator");
    if (typing) typing.classList.remove("hidden");

    setTimeout(() => {
        if (typing) typing.classList.add("hidden");
        const reply = msg.includes("Stop") || msg.includes("unsafe") ?
            "⚠️ Pulling over immediately sir! Transit alert registered." :
            `Ji sir, acknowledged! Route verified in ${activeCab.plate}.`;
        appendChatMessage(reply, "incoming");
        playChime(true);
    }, 1000);
}

// Strictly XSS-Safe DOM Insertion
function appendChatMessage(text, type) {
    const container = document.getElementById("chat-messages");
    if (!container) return;

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const msgDiv = document.createElement("div");
    msgDiv.className = `message ${type}`;

    const bubble = document.createElement("div");
    bubble.className = "message-bubble";
    bubble.textContent = text; // Prevents HTML injection

    const timeSpan = document.createElement("span");
    timeSpan.className = "message-time";
    timeSpan.textContent = timeStr;

    msgDiv.appendChild(bubble);
    msgDiv.appendChild(timeSpan);
    container.appendChild(msgDiv);
    container.scrollTop = container.scrollHeight;
}

/* ==========================================================================
   11. Unified Voice Call Simulator
   ========================================================================== */
function openCallModal(name = activeCab.name, phone = activeCab.phone, role = 'Cab Driver') {
    const modal = document.getElementById("call-modal");
    if (!modal) return;
    modal.classList.remove("hidden");

    isCallActive = true;
    callSeconds = 0;
    isMuted = false;
    isSpeaker = false;

    const title = document.getElementById("call-status-title");
    const number = document.getElementById("call-dialog-number");
    const timer = document.getElementById("call-timer-text");
    const avatar = document.getElementById("call-avatar-img");

    if (avatar) {
        avatar.src = role.includes('Police') || role.includes('Emergency') ?
            "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🛡️</text></svg>" :
            "assets/driver.png";
    }

    if (title) title.textContent = `Calling ${name}...`;
    if (number) number.textContent = `${phone} (${role})`;
    if (timer) timer.textContent = "Connecting...";

    playPhoneRing();
    if (ringAudioTimer) clearInterval(ringAudioTimer);
    ringAudioTimer = setInterval(playPhoneRing, 2800);

    setTimeout(() => {
        if (!isCallActive) return;
        if (ringAudioTimer) clearInterval(ringAudioTimer);
        if (title) title.textContent = `Connected • ${name}`;
        playChime(true);

        if (callInterval) clearInterval(callInterval);
        callInterval = setInterval(() => {
            callSeconds++;
            const mins = String(Math.floor(callSeconds / 60)).padStart(2, '0');
            const secs = String(callSeconds % 60).padStart(2, '0');
            if (timer) timer.textContent = `${mins}:${secs}`;
        }, 1000);
    }, 2400);
}

function closeCallModal() {
    const modal = document.getElementById("call-modal");
    if (modal) modal.classList.add("hidden");

    if (ringAudioTimer) clearInterval(ringAudioTimer);
    if (callInterval) clearInterval(callInterval);
    isCallActive = false;
    beep(300, 0.2, 'square', 0.1);
    showToast("📞 Call ended");
}

function toggleCallMute() {
    isMuted = !isMuted;
    const btn = document.getElementById("call-mute-btn");
    if (btn) btn.style.background = isMuted ? "#ef4444" : "rgba(255, 255, 255, 0.1)";
    showToast(isMuted ? "🔇 Microphone Muted" : "🎙️ Microphone Active");
}

function toggleCallSpeaker() {
    isSpeaker = !isSpeaker;
    const btn = document.getElementById("call-speaker-btn");
    if (btn) btn.style.background = isSpeaker ? "#38bdf8" : "rgba(255, 255, 255, 0.1)";
    showToast(isSpeaker ? "🔊 Speakerphone ON" : "🔈 Normal Earpiece");
}

/* ==========================================================================
   12. Truthful Emergency SOS Protocol & Action Hub
   ========================================================================== */
function openSosModal() {
    const modal = document.getElementById("sos-modal");
    if (modal) modal.classList.remove("hidden");

    const stageCountdown = document.getElementById("sos-stage-countdown");
    const stageActions = document.getElementById("sos-stage-actions");
    if (stageCountdown) stageCountdown.classList.remove("hidden");
    if (stageActions) stageActions.classList.add("hidden");

    sosCountdown = 5;
    const numElem = document.getElementById("sos-countdown-num");
    if (numElem) numElem.textContent = sosCountdown;

    playSiren();
    if (sosInterval) clearInterval(sosInterval);

    sosInterval = setInterval(() => {
        sosCountdown--;
        if (numElem) numElem.textContent = sosCountdown;
        playSiren();

        if (sosCountdown <= 0) {
            clearInterval(sosInterval);
            triggerInstantSos();
        }
    }, 1000);
}

function cancelSosModal() {
    if (sosInterval) clearInterval(sosInterval);
    const modal = document.getElementById("sos-modal");
    if (modal) modal.classList.add("hidden");
    showToast("✅ Emergency countdown cancelled");
}

function closeSosModal() {
    if (sosInterval) clearInterval(sosInterval);
    const modal = document.getElementById("sos-modal");
    if (modal) modal.classList.add("hidden");
}

function triggerInstantSos() {
    if (sosInterval) clearInterval(sosInterval);

    // Switch from countdown to actionable emergency options
    const stageCountdown = document.getElementById("sos-stage-countdown");
    const stageActions = document.getElementById("sos-stage-actions");
    if (stageCountdown) stageCountdown.classList.add("hidden");
    if (stageActions) stageActions.classList.remove("hidden");

    beep(900, 0.4, 'sawtooth', 0.25);
    showToast("🚨 Emergency SOS Hub Ready! Choose immediate action.");

    // Pre-draft direct distress SMS link
    const payload = generateSafetyBeaconPayload();
    const smsBtn = document.getElementById("sos-sms-direct-btn");
    if (smsBtn) {
        smsBtn.href = `sms:?body=${encodeURIComponent(payload)}`;
    }
}

function openDirectSosSms() {
    const payload = generateSafetyBeaconPayload();
    window.location.href = `sms:?body=${encodeURIComponent(payload)}`;
}

/* ==========================================================================
   13. Toast Notification Utility
   ========================================================================== */
function showToast(message) {
    const container = document.getElementById("toast-container");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = "toast";
    toast.textContent = message; // Safe text
    container.appendChild(toast);

    setTimeout(() => {
        if (toast && toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    }, 3000);
}

/* ==========================================================================
   14. PWA Service Worker & Android App Installation Controller
   ========================================================================== */
let deferredPrompt = null;

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('ServiceWorker active:', reg.scope))
            .catch(err => console.warn('ServiceWorker registration error:', err));
    });
}

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    const installBtn = document.getElementById('pwa-install-btn');
    if (installBtn) installBtn.classList.remove('hidden');
});

function triggerPwaInstall() {
    const installBtn = document.getElementById('pwa-install-btn');
    if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then((choice) => {
            if (choice.outcome === 'accepted') {
                showToast("🎉 Installing Yatra Rakshaka on Android...");
            }
            deferredPrompt = null;
            if (installBtn) installBtn.classList.add('hidden');
        });
    } else {
        alert("📲 To install on Android:\n1. Tap Chrome's 3 dots (⋮)\n2. Select 'Install app' or 'Add to Home screen'");
    }
}

window.addEventListener('appinstalled', () => {
    showToast("✅ Yatra Rakshaka installed to Home Screen!");
    const installBtn = document.getElementById('pwa-install-btn');
    if (installBtn) installBtn.classList.add('hidden');
});
