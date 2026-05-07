let audioDatabase = JSON.parse(localStorage.getItem('playMusic_db')) || [];
let currentAudio = new Audio();
let currentIndex = -1;

const audioListDiv = document.getElementById('audioList');
const uploadModal = document.getElementById('uploadModal');

// --- Inisialisasi Perizinan Browser ---
window.addEventListener('load', () => {
    renderList(audioDatabase);
    if (confirm("Izinkan PlayMusic memutar suara secara otomatis?")) {
        console.log("Izin diberikan.");
    }
});

// --- Fungsi Render List ---
function renderList(data) {
    audioListDiv.innerHTML = '';
    data.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'audio-item';
        div.innerHTML = `
            <div onclick="playAudio(${index})">
                <strong>${item.name}</strong><br>
                <small>${item.size} MB | ${item.date}</small>
            </div>
            <button onclick="deleteAudio(${index})">Hapus</button>
        `;
        audioListDiv.appendChild(div);
    });
}

// --- Logika Upload & Progress Bar ---
document.getElementById('openUploadBtn').onclick = () => uploadModal.style.display = 'flex';
document.getElementById('closeModal').onclick = () => uploadModal.style.display = 'none';

document.getElementById('startUpload').onclick = function() {
    const file = document.getElementById('audioFile').files[0];
    if (!file) return alert("Pilih file!");

    const reader = new FileReader();
    document.getElementById('progressContainer').style.display = 'block';

    reader.onprogress = (e) => {
        if (e.lengthComputable) {
            const percent = Math.round((e.loaded / e.total) * 100);
            document.getElementById('progressBar').style.width = percent + '%';
            document.getElementById('progressPercent').innerText = percent + '%';
        }
    };

    reader.onload = (e) => {
        const newAudio = {
            name: file.name,
            size: (file.size / (1024 * 1024)).toFixed(2),
            date: new Date().toLocaleString(),
            src: e.target.result // Base64 storage
        };
        audioDatabase.push(newAudio);
        localStorage.setItem('playMusic_db', JSON.stringify(audioDatabase));
        
        setTimeout(() => {
            uploadModal.style.display = 'none';
            document.getElementById('progressContainer').style.display = 'none';
            renderList(audioDatabase);
        }, 500);
    };
    reader.readAsDataURL(file);
};

// --- Logika Pemutar ---
function playAudio(index) {
    currentIndex = index;
    const item = audioDatabase[index];
    currentAudio.src = item.src;
    currentAudio.play();
    
    document.getElementById('playerBar').style.display = 'flex';
    document.getElementById('playerTitle').innerText = item.name;
    document.getElementById('playPauseBtn').innerText = '⏸';

    // Metadata & Media Session (Favicon di Control Panel Browser)
    if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
            title: item.name,
            artist: 'Daus XD',
            artwork: [{ src: '/Favicon.png', sizes: '96x96', type: 'image/png' }]
        });
    }
}

// Tombol Play/Pause
document.getElementById('playPauseBtn').onclick = () => {
    if (currentAudio.paused) {
        currentAudio.play();
        document.getElementById('playPauseBtn').innerText = '⏸';
    } else {
        currentAudio.pause();
        document.getElementById('playPauseBtn').innerText = '▶';
    }
};

// Fitur Hapus
function deleteAudio(index) {
    if (confirm("Hapus audio ini secara permanen?")) {
        audioDatabase.splice(index, 1);
        localStorage.setItem('playMusic_db', JSON.stringify(audioDatabase));
        renderList(audioDatabase);
    }
}

// --- Fitur Pencarian ---
document.getElementById('searchInput').oninput = (e) => {
    const val = e.target.value.toLowerCase();
    const filtered = audioDatabase.filter(a => a.name.toLowerCase().includes(val));
    renderList(filtered);
};

// Penanganan Stop/Close Player
document.getElementById('stopBtn').onclick = () => {
    currentAudio.pause();
    document.getElementById('playerBar').style.display = 'none';
};
