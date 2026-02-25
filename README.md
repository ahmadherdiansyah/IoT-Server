<details open>
<summary>🇬🇧 English</summary>

# Smart Home IoT Dashboard

A web-based IoT dashboard for real-time monitoring and control of smart home devices — built with Node.js, MQTT, and MongoDB.

![Node.js](https://img.shields.io/badge/Node.js-22-339933?logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-4.x-000000?logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-7-47A248?logo=mongodb&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-blue)

---

## Features

- 📊 **Dashboard** — live temperature, humidity, and gas sensor charts
- 🌡️ **Sensors** — real-time per-sensor readings with visual bars
- 💡 **Controls** — toggle smart devices (lights/relays) via MQTT
- 📷 **CCTV** — integrated camera view with servo angle control
- 👥 **User Management** — create, view, and delete users with RFID card and MAC address support
- 🔐 **Authentication** — session-based login with rate-limited POST protection
- 🐳 **Docker** — one-command deployment with Docker Compose (app + MongoDB + EMQX)

---

## Screenshots

| Login | Dashboard |
|-------|-----------|
| ![Login page screenshot](docs/screenshots/login.png) | ![Dashboard screenshot](docs/screenshots/dashboard.png) |

| Sensors | Controls | User Management |
|---------|----------|-----------------|
| ![Sensors screenshot](docs/screenshots/sensors.png) | ![Controls screenshot](docs/screenshots/controls.png) | ![User Management screenshot](docs/screenshots/user-management.png) |

> 📸 _Screenshots coming soon — replace the paths above with your own images._

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 22 |
| Framework | Express 4 |
| Template Engine | EJS 3 |
| Database | MongoDB 7 + Mongoose |
| Message Broker | EMQX 5 (MQTT) |
| Frontend | Bootstrap 5, Chart.js, jQuery |
| Auth | express-session + bcryptjs |
| Deployment | Docker + Docker Compose |

---

## Prerequisites

**Docker path (recommended)**
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) or Docker Engine + Compose plugin

**Manual path**
- Node.js 18+
- MongoDB 6+
- EMQX broker (or any MQTT broker)

---

## Quick Start

### Docker Compose (Recommended)

```bash
git clone https://github.com/ahmadherdiansyah/IoT-Server.git
cd IoT-Server
SESSION_SECRET=your-strong-secret docker compose up -d
```

Open [http://localhost:3000](http://localhost:3000). The first run creates an admin setup page automatically.

> EMQX dashboard is available at [http://localhost:18083](http://localhost:18083) (default credentials: `admin` / `public`)

### Manual

```bash
git clone https://github.com/ahmadherdiansyah/IoT-Server.git
cd IoT-Server
cp .env.example .env       # fill in your values
npm install
npm start
```

---

## Environment Variables

Create a `.env` file in the project root (copy from `.env.example`):

| Variable | Description | Example |
|----------|-------------|---------|
| `MONGO_URI` | MongoDB connection string | `mongodb://localhost:27017/mqtt` |
| `SESSION_SECRET` | Strong secret for session signing | `change-this-to-a-random-string` |
| `MQTT_HOST` | EMQX / MQTT broker hostname | `localhost` |
| `PORT` | HTTP server port | `3000` |

---

## Project Structure

<details>
<summary>Show folder tree</summary>

```
IoT-Server/
├── app.js                  # Express app setup
├── bin/www                 # HTTP server entry point
├── controllers/
│   ├── apiController.js
│   ├── authController.js
│   ├── mqttController.js
│   └── userManagementController.js
├── middleware/
│   ├── auth.js             # Session auth guard
│   └── errorHandler.js
├── models/
│   ├── mqtt_data.js        # MQTT message schema
│   └── user.js             # User schema
├── routes/
│   ├── api.js
│   ├── control.js
│   ├── login.js
│   ├── mqttapi.js
│   ├── sensors.js
│   ├── user-management.js
│   └── users.js
├── services/
│   ├── mqttService.js      # MQTT client + publish helpers
│   └── userService.js
├── views/
│   ├── partials/           # head, header, sidebar, footer, script
│   ├── home.ejs
│   ├── sensor.ejs
│   ├── controls.ejs
│   ├── cctv.ejs
│   ├── user-management.ejs
│   └── index.ejs
├── public/                 # Static assets (CSS, JS)
├── docker-compose.yml
├── Dockerfile
└── package.json
```

</details>

---

## License

[MIT](LICENSE) © 2026 Ahmad Herdiansyah

</details>

---

<details>
<summary>🇮🇩 Bahasa Indonesia</summary>

# Smart Home IoT Dashboard

Dashboard IoT berbasis web untuk pemantauan dan pengendalian perangkat rumah pintar secara real-time — dibangun dengan Node.js, MQTT, dan MongoDB.

![Node.js](https://img.shields.io/badge/Node.js-22-339933?logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-4.x-000000?logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-7-47A248?logo=mongodb&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-blue)

---

## Fitur

- 📊 **Dashboard** — grafik sensor suhu, kelembaban, dan gas secara langsung
- 🌡️ **Sensor** — pembacaan sensor real-time dengan tampilan batang visual
- 💡 **Kontrol** — nyalakan/matikan perangkat pintar (lampu/relay) melalui MQTT
- 📷 **CCTV** — tampilan kamera terintegrasi dengan kontrol sudut servo
- 👥 **Manajemen Pengguna** — tambah, lihat, dan hapus pengguna dengan dukungan kartu RFID dan MAC address
- 🔐 **Autentikasi** — login berbasis sesi dengan perlindungan rate-limit pada POST
- 🐳 **Docker** — deployment satu perintah dengan Docker Compose (app + MongoDB + EMQX)

---

## Tangkapan Layar

| Login | Dashboard |
|-------|-----------|
| ![Halaman login](docs/screenshots/login.png) | ![Dashboard](docs/screenshots/dashboard.png) |

| Sensor | Kontrol | Manajemen Pengguna |
|--------|---------|-------------------|
| ![Sensor](docs/screenshots/sensors.png) | ![Kontrol](docs/screenshots/controls.png) | ![Manajemen Pengguna](docs/screenshots/user-management.png) |

> 📸 _Tangkapan layar segera hadir — ganti path di atas dengan gambar Anda sendiri._

---

## Teknologi

| Layer | Teknologi |
|-------|-----------|
| Runtime | Node.js 22 |
| Framework | Express 4 |
| Template Engine | EJS 3 |
| Database | MongoDB 7 + Mongoose |
| Message Broker | EMQX 5 (MQTT) |
| Frontend | Bootstrap 5, Chart.js, jQuery |
| Auth | express-session + bcryptjs |
| Deployment | Docker + Docker Compose |

---

## Persyaratan

**Jalur Docker (direkomendasikan)**
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) atau Docker Engine + plugin Compose

**Jalur Manual**
- Node.js 18+
- MongoDB 6+
- EMQX broker (atau broker MQTT lainnya)

---

## Cara Menggunakan

### Docker Compose (Direkomendasikan)

```bash
git clone https://github.com/ahmadherdiansyah/IoT-Server.git
cd IoT-Server
SESSION_SECRET=rahasia-kuat-anda docker compose up -d
```

Buka [http://localhost:3000](http://localhost:3000). Saat pertama kali dijalankan, halaman setup admin akan muncul secara otomatis.

> Dashboard EMQX tersedia di [http://localhost:18083](http://localhost:18083) (kredensial default: `admin` / `public`)

### Manual

```bash
git clone https://github.com/ahmadherdiansyah/IoT-Server.git
cd IoT-Server
cp .env.example .env       # isi nilai yang diperlukan
npm install
npm start
```

---

## Variabel Lingkungan

Buat file `.env` di root project (salin dari `.env.example`):

| Variabel | Keterangan | Contoh |
|----------|------------|--------|
| `MONGO_URI` | String koneksi MongoDB | `mongodb://localhost:27017/mqtt` |
| `SESSION_SECRET` | Secret kuat untuk penandatanganan sesi | `ganti-dengan-string-acak` |
| `MQTT_HOST` | Hostname broker EMQX / MQTT | `localhost` |
| `PORT` | Port server HTTP | `3000` |

---

## Struktur Proyek

<details>
<summary>Tampilkan struktur folder</summary>

```
IoT-Server/
├── app.js                  # Konfigurasi Express
├── bin/www                 # Entry point server HTTP
├── controllers/
│   ├── apiController.js
│   ├── authController.js
│   ├── mqttController.js
│   └── userManagementController.js
├── middleware/
│   ├── auth.js             # Penjaga autentikasi sesi
│   └── errorHandler.js
├── models/
│   ├── mqtt_data.js        # Skema pesan MQTT
│   └── user.js             # Skema pengguna
├── routes/
│   ├── api.js
│   ├── control.js
│   ├── login.js
│   ├── mqttapi.js
│   ├── sensors.js
│   ├── user-management.js
│   └── users.js
├── services/
│   ├── mqttService.js      # Klien MQTT + helper publish
│   └── userService.js
├── views/
│   ├── partials/           # head, header, sidebar, footer, script
│   ├── home.ejs
│   ├── sensor.ejs
│   ├── controls.ejs
│   ├── cctv.ejs
│   ├── user-management.ejs
│   └── index.ejs
├── public/                 # Aset statis (CSS, JS)
├── docker-compose.yml
├── Dockerfile
└── package.json
```

</details>

---

## Lisensi

[MIT](LICENSE) © 2026 Ahmad Herdiansyah

</details>
