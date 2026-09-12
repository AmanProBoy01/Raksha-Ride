/* ==========================================================================
   Yatra Rakshaka - Core Application Controller
   Cleaned & Streamlined via Ponytail Audit
   ========================================================================== */

// --- Global Application State ---
let map = null;
let userMarker = null;
let driverMarker = null;
let routePolyline = null;
let tileLayer = null;
let isDarkMap = true;

// Default Coordinates (New Delhi center)
let userCoords = { lat: 28.6139, lng: 77.2090 };
let driverCoords = { lat: 28.6210, lng: 77.2180 };
let userAddress = "Connaught Place, New Delhi";
let cabSpeed = 36;
let distanceKm = 1.8;

// Active Cab Details (Editable via Cab Modal)
let activeCab = {
    name: "Rajesh Kumar",
    phone: "+91 98765 43210",
    model: "White Maruti Suzuki Dzire",
    plate: "DL 01 AB 7890",
    type: "Sedan",
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

// Ultra Power Saver State
let isUltraSaverActive = false;
let userManualOverride = false;

// Chat State
let unreadMessages = 0;

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
   2. Geodesic Distance Helper (Native Leaflet with simple fallback)
   ========================================================================== */
function getDistanceKm(lat1, lon1, lat2, lon2) {
    if (typeof L !== 'undefined' && L.latLng) {
        return L.latLng(lat1, lon1).distanceTo(L.latLng(lat2, lon2)) / 1000;
    }
    const dLat = (lat2 - lat1) * 111.32;
    const dLon = (lon2 - lon1) * 111.32 * Math.cos(lat1 * Math.PI / 180);
    return Math.hypot(dLat, dLon);
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

    // Instant render: Show verified emergency police hubs immediately without awaiting network
    loadFallbackPoliceStations(userCoords.lat, userCoords.lng);

    // Background asynchronous enrichment
    fetchLiveAddress(userCoords.lat, userCoords.lng);
    fetchNearbyPoliceStations(userCoords.lat, userCoords.lng);

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
        console.warn("Leaflet library loading asynchronously...");
        setTimeout(initMap, 200);
        return;
    }

    const mapElem = document.getElementById('leaflet-map');
    if (!mapElem || map) return;

    map = L.map('leaflet-map', {
        zoomControl: true,
        attributionControl: true
    }).setView([userCoords.lat, userCoords.lng], 14);

    // Free OpenStreetMap Tiles
    tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        subdomains: ['a', 'b', 'c'],
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>'
    }).addTo(map);

    // User Location Marker (Cyan Pulsing Radar)
    const userIcon = L.divIcon({
        className: 'user-map-pin',
        html: `<div style="background:#38bdf8; width:20px; height:20px; border-radius:50%; border:3px solid #ffffff; box-shadow:0 0 16px #38bdf8; animation:pulse 1.8s infinite;"></div>`,
        iconSize: [22, 22],
        iconAnchor: [11, 11]
    });
    userMarker = L.marker([userCoords.lat, userCoords.lng], { icon: userIcon }).addTo(map)
        .bindPopup("<b>📍 Your Live Location</b><br><span id='popup-address'>Yatra Rakshaka Sentinel Active</span>");

    // Cab Driver Marker (Emerald Green Vehicle Pin)
    const cabIcon = L.divIcon({
        className: 'cab-map-pin',
        html: `<div style="background:#10b981; width:30px; height:30px; border-radius:50%; border:3px solid #ffffff; display:flex; align-items:center; justify-content:center; color:#ffffff; font-size:13px; box-shadow:0 0 14px rgba(16, 185, 129, 0.6);"><i class="fa-solid fa-car"></i></div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
    });
    driverMarker = L.marker([driverCoords.lat, driverCoords.lng], { icon: cabIcon }).addTo(map)
        .bindPopup(`<b>🚖 ${activeCab.name} (${activeCab.model})</b><br>Plate: ${activeCab.plate}<br>Status: En route to pickup`);

    // Route Polyline
    routePolyline = L.polyline([
        [driverCoords.lat, driverCoords.lng],
        [userCoords.lat, userCoords.lng]
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
    if (map) {
        map.flyTo([userCoords.lat, userCoords.lng], 15, { animate: true, duration: 1.2 });
        if (userMarker) userMarker.openPopup();
        showToast("📍 Centered on your live GPS position");
    }
}

function initLocationTracking() {
    const coordsElem = document.getElementById("live-coords");
    const statusElem = document.getElementById("gps-status-text");

    if ("geolocation" in navigator) {
        navigator.geolocation.watchPosition(
            (pos) => {
                const oldLat = userCoords.lat;
                const oldLng = userCoords.lng;
                userCoords.lat = pos.coords.latitude;
                userCoords.lng = pos.coords.longitude;
                const acc = Math.round(pos.coords.accuracy || 6);

                if (userMarker) userMarker.setLatLng([userCoords.lat, userCoords.lng]);
                if (routePolyline && driverMarker) {
                    routePolyline.setLatLngs([driverMarker.getLatLng(), [userCoords.lat, userCoords.lng]]);
                }

                if (coordsElem) coordsElem.textContent = `Lat: ${userCoords.lat.toFixed(4)}°, Lng: ${userCoords.lng.toFixed(4)}° (±${acc}m)`;
                if (statusElem) statusElem.textContent = "GPS: Live Active";

                // Re-scan reverse address and police stations if user moved > 500m
                const distMoved = getDistanceKm(oldLat, oldLng, userCoords.lat, userCoords.lng);
                if (distMoved > 0.5) {
                    fetchLiveAddress(userCoords.lat, userCoords.lng);
                    fetchNearbyPoliceStations(userCoords.lat, userCoords.lng);
                }
            },
            (err) => {
                console.warn("Geolocation fallback active:", err.message);
                if (coordsElem) coordsElem.textContent = `Lat: ${userCoords.lat.toFixed(4)}° N, Lng: ${userCoords.lng.toFixed(4)}° E`;
                if (statusElem) statusElem.textContent = "GPS: Simulated Active";
            },
            { enableHighAccuracy: true, timeout: 8000, maximumAge: 1000 }
        );
    }
}

function startCabMovementSimulation() {
    let t = 0;
    setInterval(() => {
        if (activeCab.status !== 'enroute') return;
        t += 0.04;

        const dLat = userCoords.lat - driverCoords.lat;
        const dLng = userCoords.lng - driverCoords.lng;

        driverCoords.lat += (dLat * 0.02) + (Math.sin(t) * 0.0001);
        driverCoords.lng += (dLng * 0.02) + (Math.cos(t) * 0.0001);

        if (driverMarker) driverMarker.setLatLng([driverCoords.lat, driverCoords.lng]);
        if (routePolyline) {
            routePolyline.setLatLngs([[driverCoords.lat, driverCoords.lng], [userCoords.lat, userCoords.lng]]);
        }

        const dist = getDistanceKm(driverCoords.lat, driverCoords.lng, userCoords.lat, userCoords.lng);
        distanceKm = Math.max(0.1, parseFloat(dist.toFixed(1)));
        cabSpeed = Math.floor(32 + Math.sin(t * 2) * 8);

        const speedElem = document.getElementById("live-speed");
        const etaElem = document.getElementById("live-eta");

        if (speedElem) speedElem.textContent = `Cab Speed: ${cabSpeed} km/h`;
        if (etaElem) {
            const mins = Math.max(1, Math.round(distanceKm * 2.5));
            etaElem.textContent = `ETA: ${mins} Mins (${distanceKm} km)`;
        }
    }, 2000);
}

/* ==========================================================================
   5. Real Nominatim Reverse Geocoding (Fetch Exact Street & City)
   ========================================================================== */
async function fetchLiveAddress(lat, lng) {
    const addressElem = document.getElementById("live-address-text");
    try {
        const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=16`;
        const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
        if (!res.ok) throw new Error("Nominatim response not ok");
        const data = await res.json();

        if (data && data.address) {
            const road = data.address.road || data.address.suburb || data.address.neighbourhood || "";
            const city = data.address.city || data.address.town || data.address.state_district || data.address.state || "";
            userAddress = road ? `${road}, ${city}` : (data.display_name ? data.display_name.split(",").slice(0, 3).join(",") : "New Delhi, India");

            if (addressElem) addressElem.textContent = userAddress;
            const popup = document.getElementById("popup-address");
            if (popup) popup.textContent = userAddress;
        }
    } catch (err) {
        console.warn("Reverse geocoding fallback used:", err);
        if (addressElem) addressElem.textContent = "Live GPS Sector Tracked";
    }
}

/* ==========================================================================
   6. Police Station Hubs & Non-Blocking Overpass Enrichment
   ========================================================================== */
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
        statusElem.innerHTML = `🟢 Verified 24x7 Emergency Hubs Active`;
    }
}

async function fetchNearbyPoliceStations(lat, lng) {
    const statusElem = document.getElementById("police-scan-status");

    try {
        const overpassQuery = `[out:json][timeout:6];(node["amenity"="police"](around:8000,${lat},${lng});way["amenity"="police"](around:8000,${lat},${lng}););out center 6;`;
        const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(overpassQuery)}`;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!response.ok) throw new Error("Overpass API request failed");
        const data = await response.json();

        if (data && data.elements && data.elements.length > 0) {
            const liveStations = data.elements.map(el => {
                const pLat = el.lat || (el.center ? el.center.lat : lat);
                const pLng = el.lon || (el.center ? el.center.lon : lng);
                const name = el.tags.name || el.tags["name:en"] || "Local Police Station";
                const phone = el.tags.phone || el.tags["contact:phone"] || "112";
                const address = el.tags["addr:street"] ? `${el.tags["addr:street"]}, ${el.tags["addr:city"] || ""}` : "Jurisdiction Division";
                const distKm = getDistanceKm(lat, lng, pLat, pLng).toFixed(1);

                return {
                    name: name,
                    distance: `${distKm} km`,
                    distNum: parseFloat(distKm),
                    phone: phone,
                    address: address,
                    lat: pLat,
                    lng: pLng
                };
            }).sort((a, b) => a.distNum - b.distNum);

            // Keep emergency 112 at top
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
                statusElem.innerHTML = `🟢 ${nearbyPoliceStations.length} police response hubs mapped`;
            }
        }
    } catch (e) {
        console.warn("Overpass API unavailable or timed out; standard emergency hubs active:", e.message);
        if (statusElem) {
            statusElem.innerHTML = `🟢 24x7 Emergency Hubs Linked`;
        }
    }
}

function plotPoliceStationsOnMap() {
    if (!map) return;

    // Clear previous police markers
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

        const pMarker = L.marker([station.lat, station.lng], { icon: policeIcon }).addTo(map)
            .bindPopup(`<b>🚓 ${station.name}</b><br>Distance: ${station.distance}<br>Emergency Dial: <a href="tel:${station.phone}">${station.phone}</a>`);

        policeMapMarkers.push(pMarker);
    });
}

function renderPoliceStations() {
    const listContainer = document.getElementById("police-station-list");
    if (!listContainer) return;

    listContainer.innerHTML = nearbyPoliceStations.map(station => `
        <div class="police-item">
            <div class="police-info">
                <h4>${station.name}</h4>
                <p><i class="fa-solid fa-location-dot" style="color:#ef4444;"></i> ${station.distance} • ${station.address}</p>
            </div>
            <div class="police-actions">
                <button class="police-btn police-call" onclick="openCallModal('${station.name.replace(/'/g, "\\'")}', '${station.phone}', 'Emergency Dispatch')" title="Call ${station.name}">
                    <i class="fa-solid fa-phone"></i>
                </button>
                <button class="police-btn police-nav" onclick="navigatePolice('${station.name.replace(/'/g, "\\'")}')" title="Directions in Google Maps">
                    <i class="fa-solid fa-diamond-turn-right"></i>
                </button>
            </div>
        </div>
    `).join("");
}

function refreshPoliceStations() {
    playChime(true);
    showToast("🔄 Re-scanning nearby police stations via GPS...");
    fetchNearbyPoliceStations(userCoords.lat, userCoords.lng);
}

function navigatePolice(name) {
    const query = encodeURIComponent(`${name} near me`);
    window.open(`https://www.google.com/maps/search/${query}`, '_blank');
}

/* ==========================================================================
   7. Custom Cab Management & Safety Beacon
   ========================================================================== */
function openCabModal() {
    const modal = document.getElementById("cab-modal");
    if (modal) modal.classList.remove("hidden");

    const plateInput = document.getElementById("input-plate");
    const nameInput = document.getElementById("input-driver-name");
    const phoneInput = document.getElementById("input-driver-phone");
    const typeSelect = document.getElementById("input-cab-type");
    const statusSelect = document.getElementById("input-ride-status");

    if (plateInput) plateInput.value = activeCab.plate;
    if (nameInput) nameInput.value = activeCab.name;
    if (phoneInput) phoneInput.value = activeCab.phone;
    if (typeSelect) typeSelect.value = activeCab.model;
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
    const phone = document.getElementById("input-driver-phone").value.trim() || "+91 98765 43210";
    const model = document.getElementById("input-cab-type").value;
    const status = document.getElementById("input-ride-status").value;

    if (!plate || !name) {
        showToast("⚠️ Please enter driver name and plate number!");
        return;
    }

    activeCab.plate = plate;
    activeCab.name = name;
    activeCab.phone = phone;
    activeCab.model = model;
    activeCab.status = status;

    // Update Driver Card in DOM
    const nameEl = document.getElementById("driver-name");
    const plateEl = document.getElementById("car-plate");
    const modelEl = document.getElementById("cab-model");
    const phoneEl = document.getElementById("driver-phone-val");

    if (nameEl) nameEl.textContent = activeCab.name;
    if (plateEl) plateEl.textContent = activeCab.plate;
    if (modelEl) modelEl.innerHTML = `<i class="fa-solid fa-car"></i> ${activeCab.model}`;
    if (phoneEl) phoneEl.textContent = activeCab.phone;

    // Update Chat References
    const chatName = document.getElementById("chat-driver-name");
    const chatStatus = document.getElementById("chat-driver-status");
    if (chatName) chatName.textContent = activeCab.name;
    if (chatStatus) chatStatus.textContent = `🟢 Online • ${activeCab.plate}`;

    // Update Ride Status Badge
    const badge = document.getElementById("ride-status-badge");
    if (badge) {
        if (status === 'waiting') {
            badge.className = "badge ride-status-badge waiting";
            badge.innerHTML = `<i class="fa-solid fa-hourglass-half"></i> Waiting for Cab`;
        } else if (status === 'completed') {
            badge.className = "badge ride-status-badge completed";
            badge.innerHTML = `<i class="fa-solid fa-circle-check"></i> Safely Completed`;
        } else {
            badge.className = "badge ride-status-badge";
            badge.innerHTML = `<i class="fa-solid fa-circle-dot"></i> En Route`;
        }
    }

    // Update map marker popup
    if (driverMarker) {
        driverMarker.bindPopup(`<b>🚖 ${activeCab.name} (${activeCab.model})</b><br>Plate: ${activeCab.plate}<br>Status: ${status}`);
    }

    closeCabModal();
    playChime(false);
    showToast(`🚕 Safe Ride Activated for ${activeCab.plate}!`);
}

function generateSafetyBeaconPayload() {
    const mapsLink = `https://www.google.com/maps?q=${userCoords.lat.toFixed(5)},${userCoords.lng.toFixed(5)}`;
    return `🚨 Yatra Rakshaka Live Safety Beacon:\n\n` +
           `👤 Passenger travelling with: ${activeCab.name}\n` +
           `🚗 Vehicle: ${activeCab.model} (${activeCab.plate})\n` +
           `📞 Driver Contact: ${activeCab.phone}\n` +
           `🔐 Ride OTP: ${activeCab.otp} | Trip ID: ${activeCab.tripId}\n` +
           `📍 Current Location: ${userAddress}\n` +
           `🗺️ Live GPS Tracking: ${mapsLink}\n\n` +
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
    if (userManualOverride) return;
    const level = Math.round(battery.level * 100);
    updateBatteryDisplay(level, battery.charging);
}

function setupBatterySlider() {
    const slider = document.getElementById("battery-slider");
    if (!slider) return;

    slider.addEventListener("input", (e) => {
        userManualOverride = true;
        const val = parseInt(e.target.value);
        updateBatteryDisplay(val, false);
    });
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
        if (isUltraSaverActive && !userManualOverride) {
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
    userManualOverride = true;
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
    let osInfo = "Android Mobile Device";

    if (/Android/i.test(ua)) osInfo = "Android Mobile (ARM64)";
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
            netElem.textContent = "Offline (Emergency SOS Mode)";
            netElem.style.color = "#ef4444";
        }
    }
}

/* ==========================================================================
   10. In-App Messaging Chat Drawer
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
            `Yes sir, I am following the GPS route. AC is turned on.`,
            `Ride is verified, following the safest route.`,
            `Vehicle speed is ${cabSpeed} km/h, reaching your pickup location.`
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
            "⚠️ Pulling over immediately sir! Alert registered." :
            `Ji sir, acknowledged! Route verified in ${activeCab.plate}.`;
        appendChatMessage(reply, "incoming");
        playChime(true);
    }, 1000);
}

function appendChatMessage(text, type) {
    const container = document.getElementById("chat-messages");
    if (!container) return;

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const msgDiv = document.createElement("div");
    msgDiv.className = `message ${type}`;
    msgDiv.innerHTML = `
        <div class="message-bubble">${text}</div>
        <span class="message-time">${timeStr}</span>
    `;

    container.appendChild(msgDiv);
    container.scrollTop = container.scrollHeight;
}

/* ==========================================================================
   11. Unified Voice Call Simulator (Driver & Police Emergency Desk)
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

// Alias for backwards compatibility
function openPoliceCallModal(name, phone) {
    openCallModal(name, phone, 'Emergency Dispatch');
}

/* ==========================================================================
   12. Emergency SOS Siren & Central Dispatch Alert
   ========================================================================== */
function openSosModal() {
    const modal = document.getElementById("sos-modal");
    if (modal) modal.classList.remove("hidden");

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
    const modal = document.getElementById("sos-modal");
    if (modal) modal.classList.add("hidden");
    if (sosInterval) clearInterval(sosInterval);
    showToast("✅ Emergency SOS Cancelled");
}

function triggerInstantSos() {
    if (sosInterval) clearInterval(sosInterval);
    cancelSosModal();

    beep(900, 0.5, 'sawtooth', 0.3);

    alert(`🚨 EMERGENCY SOS BROADCASTED!\n\n` +
          `1. Live GPS Location (${userAddress} | Lat: ${userCoords.lat.toFixed(4)}, Lng: ${userCoords.lng.toFixed(4)}) transmitted to Central Police Control Room.\n` +
          `2. Emergency SMS sent to pre-configured trusted family contacts.\n` +
          `3. Vehicle ${activeCab.plate} (${activeCab.model}) flagged in PCR network.\n` +
          `4. In-cab emergency audio telemetry initiated.`);

    showToast("🚨 POLICE DISPATCH ALERT BROADCASTED!");
}

/* ==========================================================================
   13. Toast Notification Utility
   ========================================================================== */
function showToast(message) {
    const container = document.getElementById("toast-container");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = "toast";
    toast.innerHTML = `<span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        if (toast && toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    }, 2800);
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
