/* ==========================================================================
   Rakhsha Ride - Core Application Logic
   ========================================================================== */

// Global State
let map = null;
let userMarker = null;
let driverMarker = null;
let routePolyline = null;
let tileLayer = null;
let isDarkMap = true;

// Default Coordinates: New Delhi Center (used as base/fallback)
let userCoords = { lat: 28.6139, lng: 77.2090 };
let driverCoords = { lat: 28.6210, lng: 77.2180 };
let cabSpeed = 36;
let distanceKm = 1.8;

// Call State
let isCallActive = false;
let callInterval = null;
let callSeconds = 0;
let isMuted = false;
let isSpeaker = false;
let ringAudioTimer = null;

// Police Call State
let isPoliceCallActive = false;
let policeCallInterval = null;
let policeCallSeconds = 0;

// SOS State
let sosCountdown = 5;
let sosInterval = null;

// Ultra Saver State
let isUltraSaverActive = false;
let userManualOverride = false;

// Unread Chat Count
let unreadMessages = 0;

// Nearby Police Station Dataset
const policeStations = [
    { name: "Central Police Station HQ", distance: "0.6 km", phone: "011-23412345", address: "Block B, Connaught Place" },
    { name: "Parliament Street Police Station", distance: "1.2 km", phone: "011-23345678", address: "Sansad Marg" },
    { name: "Women Safety Cell & 24x7 Helpline", distance: "1.8 km", phone: "1091", address: "Emergency Response Wing" },
    { name: "National Emergency Command Center", distance: "Direct SOS", phone: "112", address: "Nationwide Rapid Response" }
];

// Contextual Driver Responses
const driverResponses = [
    "Namaste sir! Following the GPS route, reaching your pickup in 5 minutes.",
    "Yes sir, cab speed is normal and safe. AC is already on.",
    "Don't worry sir, I am on the designated route. Reaching shortly.",
    "Acknowledged sir! I have arrived right near your gate.",
    "Yes sir, trip is locked on Rakhsha Ride safety radar."
];

/* ==========================================================================
   Audio Synthesizer Engine (HTML5 Web Audio API - Zero External Files)
   ========================================================================== */
let audioCtx = null;

function getAudioContext() {
    if (!audioCtx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) {
            audioCtx = new AudioContext();
        }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    return audioCtx;
}

function playTone(freq, type = 'sine', duration = 0.15, gainVal = 0.15) {
    try {
        const ctx = getAudioContext();
        if (!ctx) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        gain.gain.setValueAtTime(gainVal, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + duration);
    } catch (e) {
        console.warn("Audio playback not permitted yet", e);
    }
}

function playChime(incoming = false) {
    if (incoming) {
        playTone(520, 'sine', 0.12, 0.1);
        setTimeout(() => playTone(680, 'sine', 0.2, 0.12), 120);
    } else {
        playTone(680, 'sine', 0.1, 0.1);
        setTimeout(() => playTone(840, 'sine', 0.15, 0.12), 90);
    }
}

function playPhoneRing() {
    playTone(440, 'sine', 0.4, 0.15);
    setTimeout(() => playTone(480, 'sine', 0.4, 0.15), 50);
}

function playSiren() {
    playTone(850, 'sawtooth', 0.25, 0.2);
    setTimeout(() => playTone(650, 'sawtooth', 0.25, 0.2), 250);
}

function playPowerDown() {
    try {
        const ctx = getAudioContext();
        if (!ctx) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(400, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.6);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.6);
    } catch (e) {}
}

/* ==========================================================================
   DOM Ready Initialization (Guarded with Try/Catch Blocks)
   ========================================================================== */
document.addEventListener("DOMContentLoaded", () => {
    try { initMap(); } catch (err) { console.error("Map init error:", err); }
    try { initLocationTracking(); } catch (err) { console.error("Location init error:", err); }
    try { initBatteryDiagnostics(); } catch (err) { console.error("Battery init error:", err); }
    try { initPhoneDetails(); } catch (err) { console.error("Phone details init error:", err); }
    try { renderPoliceStations(); } catch (err) { console.error("Police render error:", err); }
    try { setupBatterySlider(); } catch (err) { console.error("Slider setup error:", err); }

    // Click anywhere to wake audio context
    document.addEventListener("click", () => { getAudioContext(); }, { once: true });
});

/* ==========================================================================
   1. Interactive Map & Live Geolocation (100% Free OpenStreetMap)
   ========================================================================== */
function initMap() {
    if (typeof L === 'undefined') {
        console.error("Leaflet library not loaded yet");
        return;
    }

    const mapElem = document.getElementById('leaflet-map');
    if (!mapElem) return;

    map = L.map('leaflet-map', {
        zoomControl: true,
        attributionControl: true
    }).setView([userCoords.lat, userCoords.lng], 14);

    // 100% Free & Open-Access OpenStreetMap Tiles (Zero API Key, Zero Watermarks)
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
    userMarker = L.marker([userCoords.lat, userCoords.lng], { icon: userIcon }).addTo(map)
        .bindPopup("<b>📍 Your Pickup Location</b><br>Rakhsha Ride Guard Active");

    // Cab Driver Marker (Emerald Green Vehicle Icon)
    const cabIcon = L.divIcon({
        className: 'cab-map-pin',
        html: `<div style="background:#10b981; width:30px; height:30px; border-radius:50%; border:3px solid #ffffff; display:flex; align-items:center; justify-content:center; color:#ffffff; font-size:13px; box-shadow:0 0 14px rgba(16, 185, 129, 0.6);"><i class="fa-solid fa-car"></i></div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
    });
    driverMarker = L.marker([driverCoords.lat, driverCoords.lng], { icon: cabIcon }).addTo(map)
        .bindPopup("<b>🚖 Rajesh Kumar (Maruti Dzire)</b><br>Reg: DL 01 AB 7890<br>Status: En route to your location");

    // Dynamic Connecting Route Polyline
    routePolyline = L.polyline([
        [driverCoords.lat, driverCoords.lng],
        [userCoords.lat, userCoords.lng]
    ], {
        color: '#38bdf8',
        weight: 4,
        opacity: 0.85,
        dashArray: '8, 8'
    }).addTo(map);

    // Start Live Cab Simulation Movement
    startCabMovementSimulation();
}

function toggleMapTheme() {
    const mapBox = document.getElementById("map-container-box");
    const btn = document.getElementById("map-theme-btn");
    isDarkMap = !isDarkMap;

    if (mapBox) {
        if (isDarkMap) {
            mapBox.classList.add("dark-map");
            if (btn) btn.innerHTML = `<i class="fa-solid fa-moon"></i>`;
            showToast("🌙 Map switched to Cyber Dark Mode");
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
        showToast("📍 Map centered on your live location");
    }
}

function initLocationTracking() {
    const coordsElem = document.getElementById("live-coords");
    const statusElem = document.getElementById("gps-status-text");

    if ("geolocation" in navigator) {
        navigator.geolocation.watchPosition(
            (pos) => {
                userCoords.lat = pos.coords.latitude;
                userCoords.lng = pos.coords.longitude;
                const acc = Math.round(pos.coords.accuracy || 8);

                if (userMarker) userMarker.setLatLng([userCoords.lat, userCoords.lng]);
                if (routePolyline && driverMarker) {
                    routePolyline.setLatLngs([driverMarker.getLatLng(), [userCoords.lat, userCoords.lng]]);
                }

                if (coordsElem) coordsElem.textContent = `Lat: ${userCoords.lat.toFixed(4)}°, Lng: ${userCoords.lng.toFixed(4)}° (±${acc}m)`;
                if (statusElem) statusElem.textContent = "GPS: Live Active";
            },
            (err) => {
                console.warn("Geolocation fallback active:", err.message);
                if (coordsElem) coordsElem.textContent = `Lat: ${userCoords.lat.toFixed(4)}° N, Lng: ${userCoords.lng.toFixed(4)}° E`;
                if (statusElem) statusElem.textContent = "GPS: Simulated High Acc";
            },
            { enableHighAccuracy: true, timeout: 8000, maximumAge: 1000 }
        );
    } else {
        if (coordsElem) coordsElem.textContent = `Lat: 28.6139° N, Lng: 77.2090° E`;
        if (statusElem) statusElem.textContent = "GPS: Simulated";
    }
}

function startCabMovementSimulation() {
    let t = 0;
    setInterval(() => {
        t += 0.04;
        // Smoothly interpolate cab towards user location
        const dLat = userCoords.lat - driverCoords.lat;
        const dLng = userCoords.lng - driverCoords.lng;
        
        // Slight natural curve
        driverCoords.lat += (dLat * 0.02) + (Math.sin(t) * 0.0001);
        driverCoords.lng += (dLng * 0.02) + (Math.cos(t) * 0.0001);

        if (driverMarker) {
            driverMarker.setLatLng([driverCoords.lat, driverCoords.lng]);
        }
        if (routePolyline) {
            routePolyline.setLatLngs([[driverCoords.lat, driverCoords.lng], [userCoords.lat, userCoords.lng]]);
        }

        // Calculate simulated distance and speed
        const dist = Math.sqrt(Math.pow(dLat, 2) + Math.pow(dLng, 2)) * 111; // rough km
        distanceKm = Math.max(0.2, dist.toFixed(1));
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
   2. 5% Battery Auto Ultra Saving Mode Logic
   ========================================================================== */
function initBatteryDiagnostics() {
    if ('getBattery' in navigator) {
        navigator.getBattery().then(battery => {
            handleBatteryEvent(battery);
            battery.addEventListener('levelchange', () => handleBatteryEvent(battery));
            battery.addEventListener('chargingchange', () => handleBatteryEvent(battery));
        }).catch(err => {
            console.warn("Battery status API not permitted, fallback to demo simulator:", err);
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

    if (percentElem) percentElem.textContent = `${percent}%`;
    if (fillElem) {
        fillElem.style.width = `${percent}%`;
        if (percent <= 5) fillElem.style.background = "#ff0000";
        else if (percent <= 20) fillElem.style.background = "#f59e0b";
        else fillElem.style.background = "linear-gradient(90deg, #10b981, #06b6d4)";
    }
    if (simValElem) simValElem.textContent = `${percent}%`;
    if (sliderElem && sliderElem.value != percent) sliderElem.value = percent;

    if (iconElem) {
        if (percent <= 10) iconElem.className = "fa-solid fa-battery-empty";
        else if (percent <= 30) iconElem.className = "fa-solid fa-battery-quarter";
        else if (percent <= 70) iconElem.className = "fa-solid fa-battery-half";
        else iconElem.className = "fa-solid fa-battery-full";
    }

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
            showToast("⚠️ Battery &le; 5%: Auto Ultra Power Saver Active!");
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
   3. Phone Details & Hardware Diagnostics
   ========================================================================== */
function initPhoneDetails() {
    const ua = navigator.userAgent;
    let osInfo = "Android Mobile Device";

    if (/Android/i.test(ua)) osInfo = "Android 14 (ARM64)";
    else if (/iPhone|iPad|iPod/i.test(ua)) osInfo = "Apple iOS Device (A-Series)";
    else if (/Linux/i.test(ua)) osInfo = "Linux Workstation / Mobile";
    else if (/Windows/i.test(ua)) osInfo = "Windows 11 (x86_64)";
    else if (/Mac/i.test(ua)) osInfo = "macOS (Apple Silicon)";

    const osElem = document.getElementById("phone-os-info");
    if (osElem) osElem.textContent = osInfo;

    // Display Screen Resolution & DPI
    const w = window.screen.width;
    const h = window.screen.height;
    const ratio = window.devicePixelRatio || 1;
    const resElem = document.getElementById("phone-res-info");
    if (resElem) resElem.textContent = `${w} x ${h} (${ratio}x DPI)`;

    // CPU Cores & Memory
    const cores = navigator.hardwareConcurrency || 8;
    const ram = navigator.deviceMemory ? `${navigator.deviceMemory}GB RAM` : "8GB RAM";
    const hwElem = document.getElementById("phone-hw-info");
    if (hwElem) hwElem.textContent = `${cores} CPU Cores | ${ram}`;

    // Network Status & Ping
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
   4. Nearby Police Stations Directory & Emergency Actions
   ========================================================================== */
function renderPoliceStations() {
    const listContainer = document.getElementById("police-station-list");
    if (!listContainer) return;

    listContainer.innerHTML = policeStations.map(station => `
        <div class="police-item">
            <div class="police-info">
                <h4>${station.name}</h4>
                <p><i class="fa-solid fa-location-dot" style="color:#ef4444;"></i> ${station.distance} • ${station.address}</p>
            </div>
            <div class="police-actions">
                <button class="police-btn police-call" onclick="openPoliceCallModal('${station.name}', '${station.phone}')" title="Emergency Call ${station.name}">
                    <i class="fa-solid fa-phone"></i>
                </button>
                <button class="police-btn police-nav" onclick="navigatePolice('${station.name}')" title="Directions in Maps">
                    <i class="fa-solid fa-diamond-turn-right"></i>
                </button>
            </div>
        </div>
    `).join("");
}

function refreshPoliceStations() {
    playChime(true);
    showToast("🔄 Re-scanning nearby police stations via GPS...");
    setTimeout(() => {
        renderPoliceStations();
        showToast("✅ 4 nearest police stations verified and linked");
    }, 600);
}

function navigatePolice(name) {
    const query = encodeURIComponent(`${name} near me`);
    window.open(`https://www.google.com/maps/search/${query}`, '_blank');
}

/* Emergency Police Dispatch Modal */
function openPoliceCallModal(name, phone) {
    const modal = document.getElementById("police-call-modal");
    const title = document.getElementById("police-modal-title");
    const number = document.getElementById("police-modal-number");
    const timer = document.getElementById("police-modal-timer");

    if (title) title.textContent = name;
    if (number) number.textContent = `Dialing Emergency Helpline: ${phone}`;
    if (timer) timer.textContent = "Connecting to Police Dispatch Desk...";

    if (modal) modal.classList.remove("hidden");
    isPoliceCallActive = true;
    policeCallSeconds = 0;

    playPhoneRing();
    ringAudioTimer = setInterval(playPhoneRing, 3000);

    setTimeout(() => {
        if (!isPoliceCallActive) return;
        if (ringAudioTimer) clearInterval(ringAudioTimer);
        if (timer) timer.textContent = "Connected • Officer Deshmukh on Line";
        playChime(true);

        policeCallInterval = setInterval(() => {
            policeCallSeconds++;
            const mins = String(Math.floor(policeCallSeconds / 60)).padStart(2, '0');
            const secs = String(policeCallSeconds % 60).padStart(2, '0');
            if (timer) timer.textContent = `Connected: ${mins}:${secs} (Audio Recording Active)`;
        }, 1000);
    }, 3200);
}

function closePoliceCallModal() {
    const modal = document.getElementById("police-call-modal");
    if (modal) modal.classList.add("hidden");
    if (ringAudioTimer) clearInterval(ringAudioTimer);
    if (policeCallInterval) clearInterval(policeCallInterval);
    isPoliceCallActive = false;
    playTone(320, 'square', 0.2, 0.1);
    showToast("📞 Police emergency call ended");
}

/* ==========================================================================
   5. Trip Sharing & OTP Verification
   ========================================================================== */
function shareTripDetails() {
    const text = `🚨 Rakhsha Ride Live Safety Beacon:\nDriver: Rajesh Kumar (White Maruti Dzire - DL 01 AB 7890)\nTrip ID: #RR-9082 | Secure OTP: 4892\nLive GPS: Lat ${userCoords.lat.toFixed(4)}, Lng ${userCoords.lng.toFixed(4)}\nTracking link: http://localhost:8888`;
    
    if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => {
            playChime(false);
            showToast("📋 Live trip tracking & OTP copied to clipboard!");
        }).catch(() => {
            alert(text);
        });
    } else {
        alert(text);
    }
}

/* ==========================================================================
   6. In-App Messaging Chat Drawer
   ========================================================================== */
function openChatDrawer() {
    const drawer = document.getElementById("chat-drawer");
    if (drawer) drawer.classList.add("open");

    // Clear unread badge
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

    // Show driver typing indicator
    const typing = document.getElementById("typing-indicator");
    if (typing) typing.classList.remove("hidden");

    // Automated Driver Response
    setTimeout(() => {
        if (typing) typing.classList.add("hidden");
        const reply = driverResponses[Math.floor(Math.random() * driverResponses.length)];
        appendChatMessage(reply, "incoming");
        playChime(true);

        // If drawer is closed, show unread count
        const drawer = document.getElementById("chat-drawer");
        if (drawer && !drawer.classList.contains("open")) {
            unreadMessages++;
            const badge = document.getElementById("chat-unread-badge");
            if (badge) {
                badge.textContent = unreadMessages;
                badge.style.display = "inline-block";
            }
            showToast(`💬 Driver: "${reply.substring(0, 35)}..."`);
        }
    }, 1400);
}

function sendQuickMessage(msg) {
    appendChatMessage(msg, "outgoing");
    playChime(false);

    const typing = document.getElementById("typing-indicator");
    if (typing) typing.classList.remove("hidden");

    setTimeout(() => {
        if (typing) typing.classList.add("hidden");
        const reply = msg.includes("Stop") || msg.includes("unsafe") ? 
            "⚠️ Sir, pulling over to the side immediately! Safety alert registered." : 
            "Ji sir, acknowledged! Reaching right there.";
        appendChatMessage(reply, "incoming");
        playChime(true);
    }, 1200);
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
   7. Voice Call Simulator Modal
   ========================================================================== */
function openCallModal() {
    const modal = document.getElementById("call-modal");
    if (modal) modal.classList.remove("hidden");

    isCallActive = true;
    callSeconds = 0;
    isMuted = false;
    isSpeaker = false;

    const timer = document.getElementById("call-timer-text");
    const title = document.getElementById("call-status-title");

    if (title) title.textContent = "Calling Rajesh Kumar...";
    if (timer) timer.textContent = "Ringing...";

    playPhoneRing();
    ringAudioTimer = setInterval(playPhoneRing, 2800);

    // Answer call after 2.8s
    setTimeout(() => {
        if (!isCallActive) return;
        if (ringAudioTimer) clearInterval(ringAudioTimer);
        if (title) title.textContent = "Connected • Rajesh Kumar";
        playChime(true);

        callInterval = setInterval(() => {
            callSeconds++;
            const mins = String(Math.floor(callSeconds / 60)).padStart(2, '0');
            const secs = String(callSeconds % 60).padStart(2, '0');
            if (timer) timer.textContent = `${mins}:${secs}`;
        }, 1000);
    }, 2800);
}

function closeCallModal() {
    const modal = document.getElementById("call-modal");
    if (modal) modal.classList.add("hidden");

    if (ringAudioTimer) clearInterval(ringAudioTimer);
    if (callInterval) clearInterval(callInterval);
    isCallActive = false;
    playTone(300, 'square', 0.2, 0.1);
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
   8. Emergency SOS Siren & Beacon
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

    playTone(900, 'sawtooth', 0.5, 0.3);

    alert(`🚨 EMERGENCY SOS BROADCASTED!\n\n` +
          `1. Live GPS Location (Lat: ${userCoords.lat.toFixed(4)}, Lng: ${userCoords.lng.toFixed(4)}) sent to Central Police Control Room.\n` +
          `2. Emergency SMS sent to pre-configured family contacts.\n` +
          `3. Vehicle Maruti Dzire (DL 01 AB 7890) flagged in PCR network.\n` +
          `4. In-cab emergency audio recording initiated.`);

    showToast("🚨 POLICE DISPATCH ALERT BROADCASTED!");
}

/* ==========================================================================
   Toast Notification Utility
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
    }, 3000);
}
