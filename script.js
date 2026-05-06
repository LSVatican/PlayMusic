let db;
let currentAudio = new Audio();
let audioList = [];
let currentIndex = -1;

// 1. Database Setup (IndexedDB)
const request = indexedDB.open("PlayMusicDB", 1);

request.onupgradeneeded = (e) => {
    db = e.target.result;
    db.createObjectStore("songs", { keyPath: "id", autoIncrement: true });
};

request.onsuccess = (e) => {
    db = e.target.result;
    renderList();
};

// 2. Fungsi Izin Browser
function enableAudio() {
    document.getElementById('permission-overlay').style.display = 'none';
    currentAudio.play().catch(() => {}); // Pancing interaksi user
}

function togglePopup(id) {
    const popup = document.getElementById(id);
    popup.style.display = (popup.style.display === 'flex') ? 'none' : 'flex';
}

// 3. Upload & Progress Bar
function uploadAudio() {
    const fileInput = document.getElementById('audio-input');
    const file = fileInput.files[0];
    
    if (!file) return alert("Pilih file dulu!");
    
    const validTypes = ['audio/mpeg', 'audio/wav', 'audio/ogg'];
    if (!validTypes.includes(file.type)) {
        return alert("Format harus MP3, WAV, atau OGG!");
    }

    const progressContainer = document.getElementById('progress-container');
    const progressBar = document.getElementById('progress-bar');
    progressContainer.style.display = 'block';

    const reader = new FileReader();
    
    reader.onprogress = (e) => {
        if (e.lengthComputable) {
            const percent = (e.loaded / e.total) * 100;
            progressBar.style.width = percent + '%';
        }
    };

    reader.onload = (e) => {
        const transaction = db.transaction(["songs"], "readwrite");
        const store = transaction.objectStore("songs");
        
        const newSong = {
            name: file.name,
            data: e.target.result
        };

        store.add(newSong).onsuccess = () => {
            progressContainer.style.display = 'none';
            progressBar.style.width = '0%';
            togglePopup('upload-popup');
            renderList();
        };
    };

    reader.readAsDataURL(file);
}

// 4. Render List Audio
function renderList() {
    const listContainer = document.getElementById('audio-list');
    listContainer.innerHTML = "";
    
    const transaction = db.transaction(["songs"], "readonly");
    const store = transaction.objectStore("songs");
    
    audioList = [];
    store.openCursor().onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor) {
            audioList.push(cursor.value);
            const div = document.createElement('div');
            div.className = 'audio-item';
            div.innerHTML = `
                <span onclick="playTrack(${audioList.length - 1})">${cursor.value.name}</span>
                <button class="btn-delete" onclick="deleteAudio(${cursor.value.id})"><i class="fas fa-trash"></i></button>
            `;
            listContainer.appendChild(div);
            cursor.continue();
        }
    };
}

// 5. Player Logic
function playTrack(index) {
    currentIndex = index;
    const song = audioList[index];
    currentAudio.src = song.data;
    currentAudio.play();
    
    document.getElementById('player-bar').classList.remove('hide');
    document.getElementById('player-title').innerText = song.name;
    document.getElementById('play-pause-btn').innerHTML = '<i class="fas fa-pause"></i>';
}

function togglePlay() {
    if (currentAudio.paused) {
        currentAudio.play();
        document.getElementById('play-pause-btn').innerHTML = '<i class="fas fa-pause"></i>';
    } else {
        currentAudio.pause();
        document.getElementById('play-pause-btn').innerHTML = '<i class="fas fa-play"></i>';
    }
}

function stopAudio() {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    document.getElementById('player-bar').classList.add('hide');
}

function nextTrack() {
    if (currentIndex < audioList.length - 1) playTrack(currentIndex + 1);
    else playTrack(0);
}

function prevTrack() {
    if (currentIndex > 0) playTrack(currentIndex - 1);
    else playTrack(audioList.length - 1);
}

// Update Seekbar & Auto-Loop
currentAudio.ontimeupdate = () => {
    const percent = (currentAudio.currentTime / currentAudio.duration) * 100;
    document.getElementById('seek-bar').style.width = percent + '%';
};

currentAudio.onended = () => {
    playTrack(currentIndex); // Auto-loop terulang dari awal
};

// 6. Delete Audio
function deleteAudio(id) {
    if (confirm("Hapus audio ini secara permanen?")) {
        const transaction = db.transaction(["songs"], "readwrite");
        transaction.objectStore("songs").delete(id).onsuccess = () => {
            renderList();
        };
    }
}
