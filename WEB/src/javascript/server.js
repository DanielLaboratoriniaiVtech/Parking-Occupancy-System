import {initializeApp} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

// Importuojamos Firebase Firestore funkcijos darbui su duomenų baze
import {
  getFirestore,
  doc,
  onSnapshot,
  collection,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Importuojamos Firebase Authentication funkcijos vartotojų autentifikacijai
import {
    getAuth,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    setPersistence,
    browserSessionPersistence
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";


// Importuojamos Firebase Authentication funkcijos vartotojų autentifikacijai
const firebaseConfig = {
  apiKey: "AIzaSyBseiUspmSXmE4fecKm15UNunZT2s-44PA",
  authDomain: "bakalauras2026.firebaseapp.com",
  projectId: "bakalauras2026",
  storageBucket: "bakalauras2026.firebasestorage.app",
  messagingSenderId: "689929171564",
  appId: "1:689929171564:web:0227f99a13189da8e39e49"
};

// Inicializuojama Firebase aplikacija
const app = initializeApp(firebaseConfig);

// Inicializuojama Firestore duomenų bazė
const db = getFirestore(app);

// Inicializuojama autentifikacijos sistema
const auth = getAuth(app);

// Nustatoma sesijos autentifikacija naršyklėje
await setPersistence(auth, browserSessionPersistence);

// Grafikų objektai
let historyBarChart = null;
let historyPieChart = null;
let chart = null;

// Kintamasis sistemos būsenos laikui saugoti
let lastStatusTimestamp = null;

// Kintamasis tikrina ar dashboard jau paleistas
let dashboardStarted = false;

// Funkcija paleidžia pagrindinį sistemos valdymo skydą
function startDashboard(){

    // Nuoroda į realaus laiko duomenų dokumentą
const liveRef = doc(db, "parkingas", "live");

// Klausomasi realaus laiko pokyčių Firebase duomenų bazėje
onSnapshot(liveRef, (snapshot) => {
    if (snapshot.exists()){
        const data = snapshot.data();

        document.getElementById('cars').innerText = data.Masinos;
        document.getElementById('people').innerText = data.Zmones;
    }
});


// Gaunami istoriniai duomenys iš Firestore kolekcijos
const historyRef = collection(db, "parkingas_history");
const q = query(historyRef, orderBy("timestamp"));

onSnapshot(q, (snapshot) => {

// Funkcija atnaujina istorinių duomenų lentelę
function updateHistoryTable(sorted) {
    const tableBody = document.getElementById("historyTableBody");

    if (!tableBody) return;

    tableBody.innerHTML = "";

    const latest = [...sorted].reverse().slice(0, 50);

    latest.forEach(([key, val]) => {
        const date = new Date(key * 10000);

        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${date.toLocaleString("lt-LT")}</td>
            <td>${val.Masinos}</td>
            <td>${val.Zmones}</td>
        `;

        tableBody.appendChild(row);
    });
}

// Sukuriamas duomenų kaupimo objektas
const buckets = new Map();

snapshot.forEach((doc) => {
    const data = doc.data();
    const date = data.timestamp?.toDate();

    if (!date) return;

    // Sukuriamas unikalus laiko raktas
    const key = Math.floor(date.getTime() / 10000); // 60000ms = 1 min

    buckets.set(key, {
        Masinos: data.Masinos,
        Zmones: data.Zmones
    });
});

    // Duomenys surūšiuojami pagal laiką
    const sorted = [...buckets.entries()].sort((a, b) => a[0] - b[0]);

    const carsData = [];
    const peopleData = [];
    const labels = [];

        // Formuojami grafiko duomenys
    sorted.forEach(([key, val]) => {
        const date = new Date(key * 10000);

        labels.push(date.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit"
        }));

        carsData.push(val.Masinos);
        peopleData.push(val.Zmones);
    });

    // Atnaujinami grafikai
    updateChart(labels, carsData, peopleData);
    updateHistoryBarChart(sorted);
    updateHistoryPieChart(sorted);
});

// Nuoroda į sistemos būsenos dokumentą 
const statusRef = doc(db, "system", "status");


onSnapshot(statusRef, (snapshot) => {
    if (!snapshot.exists()) return;

    const data = snapshot.data();
    lastStatusTimestamp = data.timestamp?.toDate() || null;
});
    setInterval(updateSystemStatus, 5000);
}

// Funkcija tikrina sistemos aktyvumą
function updateSystemStatus() {
    const statusEl = document.getElementById("statusText");

    if (!lastStatusTimestamp) {
        statusEl.textContent = "Neaktyvi";
        statusEl.classList.add("inactive");
        statusEl.classList.remove("active");
        return;
    }

    // Apskaičiuojamas laiko skirtumas
    const now = new Date();
    const diff = (now - lastStatusTimestamp) / 1000;

    // Jei skirtumas mažesnis nei 15 sekundžių – sistema aktyvi
    const isActive = diff < 15;

    if (isActive) {
        statusEl.textContent = "Aktyvi";
        statusEl.classList.add("active");
        statusEl.classList.remove("inactive");
    } else {
        statusEl.textContent = "Neaktyvi";
        statusEl.classList.add("inactive");
        statusEl.classList.remove("active");
    }
}


// Prisijungimo funkcija
window.login = async function (){
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    try {
        // Prisijungiama naudojant Firebase Authentication
        await signInWithEmailAndPassword(auth, email, password);
        alert("Prisijungta sėkmingai");
  } catch (error) {
        alert(error.message);
  }
};

window.logout = async function () {
    await signOut(auth);
    alert("Atsijungta");
};

onAuthStateChanged(auth, (user) => {
    const authBox = document.getElementById("authBox");
    const dashboard = document.getElementById("dashboard");

    if (user) {
        authBox.style.display = "none";
        dashboard.style.display = "block";

        if (!dashboardStarted) {
            startDashboard();
            dashboardStarted = true;
        }
        console.log("Prisijungęs:", user.email);
    } else {
        authBox.style.display = "flex";
        dashboard.style.display = "none";
        console.log("Neprisijungęs");
    }
});

//setInterval(updateSystemStatus, 5000);

function updateChart(labels, carsData, peopleData){
    const ctx = document.getElementById("grafikas");

    if (!chart){
        chart = new Chart(ctx, {
            type: "line",
            data:{
                labels: labels,
                datasets: [
                    {
                        label: "Masinos",
                        data: carsData,
                        borderWidth: 2,
                        tension: 0.4, // smooth lines
                        borderColor: "#00F5FF",
                        backgroundColor: "rgba(0,245,255,0.1)",
                        fill: true,
                        pointRadius: 2,
                        pointHoverRadius: 6,
                    },
                    {
                        label: "Zmones",
                        data: peopleData,
                        borderWidth: 2,
                        tension: 0.4,
                        borderColor: "#FF00C8",
                        backgroundColor: "rgba(255,0,200,0.1)",
                        fill: true,
                        pointRadius: 2,
                        pointHoverRadius: 6,
                    }
                ]
            }
        });
    } else {
        chart.data.labels = labels;
        chart.data.datasets[0].data = carsData;
        chart.data.datasets[1].data = peopleData;
        chart.update();
    }

}

// Funkcija atnaujina istorinių duomenų stulpelinę diagramą
function updateHistoryBarChart(sorted) {
    const hourlyData = new Map();

    // Sukuriami 24 valandų intervalai, kuriuose pradinės reikšmės lygios 0
    for (let h = 0; h < 24; h++) {
        hourlyData.set(h, {
            Masinos: 0,
            Zmones: 0
        });
    }

    // Istoriniai duomenys suskirstomi pagal valandas
    sorted.forEach(([key, val]) => {
        const date = new Date(key * 10000);
        const hour = date.getHours();

        const current = hourlyData.get(hour);

        hourlyData.set(hour, {
            Masinos: Math.max(current.Masinos, val.Masinos),
            Zmones: Math.max(current.Zmones, val.Zmones)
        });
    });

    const labels = [];
    const carsData = [];
    const peopleData = [];

    // Sukuriami 24 valandų intervalai, kuriuose pradinės reikšmės lygios 0
    for (let h = 0; h < 24; h++) {
        labels.push(`${h}:00`);
        carsData.push(hourlyData.get(h).Masinos);
        peopleData.push(hourlyData.get(h).Zmones);
    }

    const ctx = document.getElementById("historyBarChart");

    if (!ctx) return;
// Jeigu diagrama dar nesukurta, ji sukuriama
    if (!historyBarChart) {
        historyBarChart = new Chart(ctx, {
            type: "bar",
            data: {
                labels: labels,
                datasets: [
                    {
                        label: "Mašinos",
                        data: carsData,
                        borderWidth: 1,
                        borderColor: "#00F5FF",
                        backgroundColor: "rgba(0,245,255,0.25)"
                    },
                    {
                        label: "Žmonės",
                        data: peopleData,
                        borderWidth: 1,
                        borderColor: "#FF00C8",
                        backgroundColor: "rgba(255,0,200,0.25)"
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });
    } else {
        // Jeigu diagrama jau egzistuoja, atnaujinami jos duomenys
        historyBarChart.data.labels = labels;
        historyBarChart.data.datasets[0].data = carsData;
        historyBarChart.data.datasets[1].data = peopleData;
        historyBarChart.update();
    }
}

// Funkcija atnaujina istorinių duomenų skritulinę diagramą
function updateHistoryPieChart(sorted) {
    let totalCars = 0;
    let totalPeople = 0;
    // Suskaičiuojamas bendras automobilių ir žmonių kiekis
    sorted.forEach(([key, val]) => {
        totalCars += Number(val.Masinos) || 0;
        totalPeople += Number(val.Zmones) || 0;
    });
    // Gaunamas HTML canvas elementas skritulinei diagramai
    const ctx = document.getElementById("historyPieChart");

    if (!ctx) return;

    if (!historyPieChart) {
        historyPieChart = new Chart(ctx, {
            type: "pie",
            data: {
                labels: ["Mašinos", "Žmonės"],
                datasets: [
                    {
                        data: [totalCars, totalPeople],
                        backgroundColor: [
                            "rgba(0,245,255,0.35)",
                            "rgba(255,0,200,0.35)"
                        ],
                        borderColor: [
                            "#00F5FF",
                            "#FF00C8"
                        ],
                        borderWidth: 2
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: {
                            color: "#ECEDF6"
                        }
                    },
                    title: {
                        display: true,
                        text: "Bendras mašinų ir žmonių santykis",
                        color: "#ECEDF6"
                    }
                }
            }
        });
    } else {
        // Jeigu diagrama jau egzistuoja, atnaujinamos jos reikšmės
        historyPieChart.data.datasets[0].data = [totalCars, totalPeople];
        historyPieChart.update();
    }
}
// Funkcija perjungia vartotojo sąsajos puslapius
window.showPage = function(pageId) {
    document.querySelectorAll(".page").forEach((page) => {
        page.classList.remove("active-page");
    });

    document.getElementById(pageId).classList.add("active-page");

    if (pageId === "historyPage") {
        if (historyBarChart) {
            historyBarChart.resize();
            historyBarChart.update();
        }

        if (historyPieChart) {
            historyPieChart.resize();
            historyPieChart.update();
        }
    }
// Grįžus į valdymo skydelį, atnaujinamas pagrindinis grafikas
    if (pageId === "dashboardPage" && chart) {
        chart.resize();
        chart.update();
    }
        if (pageId == "dashboardPage"){
        const video = document.getElementById("liveVideoDashboard");
        if (video){
            video.src= "http://127.0.0.1:5000/video_feed?t=" + Date.now();
        }
    }

    if (pageId == "cameraPage"){
        const video = document.getElementById("liveVideo");
        if (video){
            video.src= "http://127.0.0.1:5000/video_feed?t=" + Date.now();
        }
    }
};
