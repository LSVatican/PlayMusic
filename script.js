let audioDatabase = JSON.parse(localStorage.getItem('playMusicDB')) || [];
const audioPlayer = document.getElementById('main-audio');
let currentTrackIndex = -1;

// --- PERMISSION LOGIC ---
window.onload = () => {
    if (localStorage.getItem('audioPermission') === 'granted') {
        document.getElementById('permission-overlay').style.display = 'none';
    } else {
        document.getElementById('permission-overlay').style.display = 'flex';
    }
    renderList();
};

function enableAudio() {
    localStorage.setItem('audioPermission', 'granted');
    document.getElementById('permission-overlay').style.display = 'none';
    // Dummy play to trigger browser interaction context
    const context = new AudioContext();
    context.resume();
}

// --- UPLOAD SYSTEM ---
function openUploadModal() {
    document.getElementById('upload-modal').style.display = 'flex';
}

function closeUploadModal() {
    document.getElementById('upload-modal').style.display = 'none';
    document.getElementById('progress-container').style.display = 'none';
    document.getElementById('file-input').value = "";
}

function processUpload() {
    const file = document.getElementById('file-input').files[0];
    if (!file) return alert("Pilih file terlebih dahulu!");

    const allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/ogg'];
    if (!allowedTypes.includes(file.type)) return alert("Format tidak didukung!");

    document.getElementById('progress-container').style.display = 'block';
    let progress = 0;
    const interval = setInterval(() => {
        progress += 10;
        document.getElementById('progress-bar').style.width = progress + '%';
        if (progress >= 100) {
            clearInterval(interval);
            saveAudio(file);
        }
    }, 200);
}

function saveAudio(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        const newAudio = {
            id: Date.now(),
            title: file.name,
            data: e.target.result,
            size: (file.size / (1024 * 1024)).toFixed(2) + " MB",
            date: new Date().toLocaleString(),
            rawSize: file.size
        };
        audioDatabase.push(newAudio);
        localStorage.setItem('playMusicDB', JSON.stringify(audioDatabase));
        renderList();
        closeUploadModal();
    };
    reader.readAsDataURL(file);
}

// --- RENDERING & FILTERS ---
function renderList(data = audioDatabase) {
    const list = document.getElementById('audio-list');
    list.innerHTML = "";
    data.forEach((item, index) => {
        list.innerHTML += `
            <div class="audio-item glowing-pink" onclick="playTrack(${index})">
                <div class="audio-info">
                    <h4>${item.title}</h4>
                    <span>${item.size} • ${item.date}</span>
                </div>
                <button onclick="confirmDelete(event, ${item.id})" style="background:none; border:none; color:red; cursor:pointer;">Hapus</button>
            </div>
        `;
    });
}

function searchAudio() {
    const query = document.getElementById('search-input').value.toLowerCase();
    const filtered = audioDatabase.filter(a => a.title.toLowerCase().includes(query));
    renderList(filtered);
}

function filterAudio() {
    const val = document.getElementById('filter-select').value;
    let sorted = [...audioDatabase];
    if (val === "terbaru") sorted.reverse();
    if (val === "ukuran") sorted.sort((a,b) => b.rawSize - a.rawSize);
    renderList(sorted);
}

// --- PLAYER CONTROLS ---
function playTrack(index) {
    currentTrackIndex = index;
    const track = audioDatabase[index];
    audioPlayer.src = track.data;
    document.getElementById('current-title').innerText = track.title;
    document.getElementById('player-bar').classList.remove('hidden');
    audioPlayer.play();
    document.getElementById('play-pause-btn').innerText = "⏸";
}

function togglePlay() {
    if (audioPlayer.paused) {
        audioPlayer.play();
        document.getElementById('play-pause-btn').innerText = "⏸";
    } else {
        audioPlayer.pause();
        document.getElementById('play-pause-btn').innerText = "▶";
    }
}

function stopAudio() {
    audioPlayer.pause();
    document.getElementById('player-bar').classList.add('hidden');
}

function nextAudio() {
    if (currentTrackIndex < audioDatabase.length - 1) playTrack(currentTrackIndex + 1);
}

function prevAudio() {
    if (currentTrackIndex > 0) playTrack(currentTrackIndex - 1);
}

// --- DELETE LOGIC ---
function confirmDelete(e, id) {
    e.stopPropagation();
    if (confirm("Hapus audio ini secara permanen?")) {
        audioDatabase = audioDatabase.filter(a => a.id !== id);
        localStorage.setItem('playMusicDB', JSON.stringify(audioDatabase));
        renderList();
        stopAudio();
    }
}
