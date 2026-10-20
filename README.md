# WeldMonitor — Industrial Robotic Welding Monitoring System

[![Node.js Version](https://img.shields.io/badge/Node.js-v18%2B-green.svg)](https://nodejs.org/)
[![React Version](https://img.shields.io/badge/React-18-blue.svg)](https://react.dev/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-v4-black.svg)](https://socket.io/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v3-cyan.svg)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-amber.svg)](LICENSE)

> **Industry:** Automotive Manufacturing & Heavy Metal Fabrication  
> **Primary Goal:** Monitor 10 robotic welding cells, live telemetry (voltage, current, temperature), bead quality analytics, shift production, non-overlapping downtime tracking, preventive maintenance schedules, and full alert lifecycles through an ultra-premium futuristic control center.

---

## ⚡ Executive Summary

**WeldMonitor** is a portfolio-grade, full-stack MERN industrial monitoring platform designed for automotive assembly and structural fabrication plants. It provides a real-time command dashboard delivering continuous machine telemetry updates every **5 seconds** via WebSockets (Socket.IO).

The platform features an **MQTT-ready abstraction boundary**, allowing seamless transition from realistic simulation to physical edge gateways (PLC/IoT brokers like Mosquitto or HiveMQ) without refactoring dashboard presentation or business layers.

---

## 🏗️ Architecture & Conceptual Flow

```
[ Industrial Robot Cells / 5s Physics Simulator / Future MQTT Edge Adapter ]
                                      │
                                      ▼
                        [ Machine Data Ingestion Service ]
                                      │
                 ┌────────────────────┴────────────────────┐
                 ▼                                         ▼
   [ Validation & DB Persistence ]            [ Real-time Socket.IO Engine ]
   (MongoDB / Mongoose / Audit Log)           (Room subscriptions & broadcast)
                 │                                         │
                 └────────────────────┬────────────────────┘
                                      ▼
                 [ RESTful API (v1) & React Frontend ]
```

---

## 👥 User Roles & Access Control (RBAC)

The system enforces strict server-side Role-Based Access Control on all protected REST endpoints and Socket actions.

| Role | Authorized Google Account | Google OAuth Identity | Scope & Permitted Actions |
| :--- | :--- | :--- | :--- |
| **System Admin** | `admin@weldmonitor.io` | `google_oauth_admin_1001` | Full control: user directory, role assignment, account activation, machine threshold configuration, simulation controls, system audits. |
| **Welding Operator** | `operator@weldmonitor.io` | `google_oauth_operator_1002` | Live machine monitoring, interactive factory-floor inspection, manual defect logging, reporting manual faults, authorized demo controls. |
| **Maintenance Lead** | `maintenance@weldmonitor.io` | `google_oauth_maint_1003` | Equipment health diagnostics, alert assignment, investigation notes, fault resolution, scheduling preventive maintenance tasks. |
| **Production Manager** | `manager@weldmonitor.io` | `google_oauth_mgr_1004` | Factory-wide output KPIs, hourly targets vs actual, downtime analytics by root cause, and multi-format report exports. |

> 💡 **Instant Google OAuth Login:** The sign-in page features 1-click Google Account sign-in buttons for all four roles and allows direct Google authentication. Traditional passwords are removed.

---

## 🤖 10 Robotic Welding Cells Fleet

The initial release comes pre-configured with 10 uniquely identified industrial welding robots arranged across 3 manufacturing zones:

| Machine ID | Robot Model | Station Name | Zone | Process Type | Target Welds/Shift |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **WM-101** | KUKA CyberWeld Alpha | Station 1A - Front Subframe | Zone A: Heavy Fab | 6-Axis Industrial MIG | 1,400 |
| **WM-102** | ABB IRB 1600 ArcMaster | Station 1B - Rear Axle Beam | Zone A: Heavy Fab | Twin-Torch Arc Robotic Cell | 1,350 |
| **WM-103** | Fanuc ArcMate 120iD | Station 2A - B-Pillar Reinforced | Zone A: Heavy Fab | CO2 Laser/MIG Hybrid | 1,200 |
| **WM-104** | Yaskawa Motoman MA2010 | Station 2B - Floorpan Crossmember | Zone A: Heavy Fab | Inverted Gantry MIG | 1,100 |
| **WM-105** | Panasonic Tawers WG III | Station 3A - Roof Rail Matrix | Zone B: Precision | Ultra-Fast Spot & Seam | 1,500 |
| **WM-106** | Comau Smart NJ4 110 | Station 3B - Engine Cradle Mount | Zone B: Precision | Heavy Spot Welding Arm | 1,150 |
| **WM-107** | Fronius TPS/i Robotic | Station 4A - Door Ring Beam | Zone B: Precision | Cold Metal Transfer (CMT) | 1,300 |
| **WM-108** | KUKA KR 30 Jet Gantry | Station 4B - Battery Tray Enclosure | Zone C: EV Battery | Automotive EV Aluminum Laser | 1,600 |
| **WM-109** | Fanuc CR-15iA Cobot | Station 5A - Exhaust Flange TIG | Zone C: EV Battery | Collaborative Orbital TIG | 950 |
| **WM-110** | Universal Robots UR10e Pro | Station 5B - Final Body Seal & Tack | Zone C: EV Battery | Micro-Plasma Finishing Arm | 1,250 |

---

## 📊 Core Modules & Capabilities

### 1. Interactive Factory-Floor Schematic
- 2D responsive SVG schematic topology of the factory floor divided into **Zone A**, **Zone B**, and **Zone C**.
- Animated conveyor lines and robotic work-cell perimeters.
- Clickable station nodes displaying live torch temperature, voltage, and current with pulsing fault indicators.

### 2. Welding Quality & Defect Tracking
- Automatic and manual laser bead inspection logging.
- Defect categories: `POROSITY`, `CRACK`, `UNDERCUT`, `INCOMPLETE_PENETRATION`, `SPATTER`, `BURN_THROUGH`, `MISALIGNMENT`.
- Formatted metrics:
  $$\text{Success Rate} = \frac{\text{Successful Welds}}{\text{Total Welds}} \times 100$$
  $$\text{Defect Rate} = \frac{\text{Defective Welds}}{\text{Total Welds}} \times 100$$

### 3. Non-Overlapping Downtime Tracking
- Automatic outage logging when machines enter `ERROR` or `STOPPED`.
- Root-cause categorization (`ELECTRODE_REPLACEMENT`, `FEEDER_JAM`, `OVERHEATING`, `ROBOT_PATH_ERROR`, etc.).
- Algorithmically merges overlapping downtime periods to eliminate double-counted downtime minutes.

### 4. 5-Stage Alert & Fault Lifecycle
Enforces deterministic workflow transitions:
$$\text{OPEN} \longrightarrow \text{ACKNOWLEDGED} \longrightarrow \text{INVESTIGATING} \longrightarrow \text{RESOLVED} \longrightarrow \text{CLOSED}$$
- Full chronological audit history preserving actor names, timestamps, and resolution notes.
- Deduplication and 5-minute cooldown rules preventing alert spam during high-frequency telemetry.
- Brevo transactional email notification on `CRITICAL` severity faults.

### 5. Multi-Format Report Generation Engine
Server-side generation for 5 categories: Production, Quality, Downtime, Maintenance, and Machine Performance.
- **PDF**: Styled shareable document with headers and layout.
- **XLSX**: Formatted Microsoft Excel workbook.
- **CSV**: Tabular comma-separated values for analytical pipelines.

### 6. Controllable Industrial Simulation Engine
- Continuous 5-second interval loop with realistic physics bounded fluctuations.
- Manual authorized controls:
  - Simulate Overheat Surge (surges temperature to 318°C)
  - Inject Robotic Faults (servo tracking errors, wire feed jam, argon pressure loss)
  - Force Operational States (`RUNNING`, `IDLE`, `STOPPED`, `ERROR`)
  - One-click machine recovery to nominal baseline

---

## 🛠️ Technology Stack

- **Frontend:** React 18, Vite, Tailwind CSS, React Router v6, Recharts, Lucide Icons, Socket.IO Client, Axios.
- **Backend:** Node.js, Express, MongoDB, Mongoose, Socket.IO, JWT, bcryptjs, Helmet, Morgan, Express-Rate-Limit.
- **Reporting Engine:** PDFKit, XLSX, custom streaming CSV formatter.
- **Email Delivery:** Brevo API (with development console fallback logger).
- **Embedded Database:** `mongodb-memory-server` support for zero-dependency local test execution when external MongoDB is not configured.

---

## 🚀 Local Installation & Setup

### Prerequisites
- Node.js v18.0.0 or higher
- npm v9+

### 1. Clone & Install Dependencies

```bash
# Clone the repository
git clone https://github.com/your-username/weldmonitor.git
cd weldmonitor

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Environment Configuration

Copy the example environment files:

```bash
# In backend/
cp .env.example .env

# In frontend/
cp .env.example .env
```

> **Zero-Config Database:** If `MONGODB_URI` is left blank or unreachable, the backend automatically starts an in-memory MongoDB instance with pre-seeded demo machines, users, alerts, and historical data!

### 3. Run the Development Servers

Open two terminals:

**Terminal 1 (Backend Server):**
```bash
cd backend
npm run dev
# Starts on http://localhost:5000
```

**Terminal 2 (Frontend Client):**
```bash
cd frontend
npm run dev
# Starts on http://localhost:5173
```

Navigate your browser to `http://localhost:5173`. Click any of the **Demo Role buttons** on the login page to enter the console.

---

## 🌐 Production Deployment Guide

- **Frontend (Vercel):**
  - Root directory: `frontend`
  - Build command: `npm run build`
  - Output directory: `dist`
  - Environment variables: `VITE_API_BASE_URL=https://your-backend.onrender.com/api/v1`, `VITE_SOCKET_URL=https://your-backend.onrender.com`

- **Backend (Render / Railway):**
  - Root directory: `backend`
  - Build command: `npm install`
  - Start command: `node src/server.js`
  - Environment variables: `NODE_ENV=production`, `CLIENT_URL=https://your-frontend.vercel.app`, `MONGODB_URI=<Atlas_Connection_String>`, `JWT_SECRET=<Random_32_Byte_Key>`, `BREVO_API_KEY=<Optional_Key>`.

---

## 📜 Industrial Disclaimer

*WeldMonitor is an engineering monitoring and portfolio demonstration system. It is not certified for direct safety-critical hardware emergency stops or unmonitored life-safety industrial robotic cells.*
