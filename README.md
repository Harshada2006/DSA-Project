# EcoNexus 🌱
### Smart Waste Management & Collection System for Nashik, Maharashtra
> *"Monitor municipal waste bins, prioritize overflow risks with C++17 DSA algorithms, and orchestrate civic collection logistics across Nashik."*

[![C++17 Engine](https://img.shields.io/badge/C%2B%2B-17%20DSA%20Engine-blue.svg)](#3-native-c17-dsa-engine)
[![JavaScript Stack](https://img.shields.io/badge/JavaScript-100%25%20Pure%20JS-F7DF1E.svg?logo=javascript&logoColor=black)](#2-technology-stack--strict-constraints)
[![Zero TypeScript](https://img.shields.io/badge/TypeScript-0%25-red.svg)](#2-technology-stack--strict-constraints)
[![No Python Policy](https://img.shields.io/badge/Python-0%25%20Strict-brightgreen.svg)](#2-technology-stack--strict-constraints)
[![Database: SQLite](https://img.shields.io/badge/Database-SQLite%20(Prisma)-003B57.svg)](#4-database--prisma-schema)
[![Stakeholder Roles](https://img.shields.io/badge/Roles-3%20Distinct%20Stakeholders-059669.svg)](#5-three-distinct-stakeholder-roles)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](file:///LICENSE)

---

## 1. Project Overview & Objective

**EcoNexus** is a production-grade smart civic technology and Data Structures & Algorithms (DSA) PBL platform engineered for the **Nashik Municipal Corporation (NMC)** in Maharashtra, India. It bridges real-world civic waste operations with computer science algorithms:

- **Max-Heap 4-Factor Prioritization**: A native **C++17 Max-Heap (`std::priority_queue`)** dynamically ranks collection urgency across Nashik bins using a strictly normalized formula:
  $$\text{priorityScore} = 0.40 \cdot \text{overflowRisk} + 0.25 \cdot \text{pickupDelay} + 0.20 \cdot \text{sensitiveLocationRisk} + 0.15 \cdot \text{missedPickupRisk}$$
- **Shortest Path & Route Planning**: **Dijkstra's Algorithm** computes exact minimum distances across the Nashik road intersection graph ($O((V+E)\log V)$), combined with a **Greedy Nearest-Neighbor Multi-Stop Tour Heuristic** from NMC sanitation depots.
- **Sensor-Free Rate Prediction**: Uses historical field collection timestamps and observation decay rather than claiming physical IoT sensors.
- **Transparent Nashik Provenance**: Explicitly labels verified civic records (NMC Sanitary Reports 2023-24, Census 2011, MPCB Recycler Registry, OpenStreetMap graph) versus synthetic demo records.
- **Three Genuine Stakeholder Portals**: Distinct, purpose-built workflows for **Organization Admins**, **Municipal Field Workers**, and **Nashik Citizens**.

---

## 2. Technology Stack & Strict Constraints

| Layer | Technology | Decision & Architecture |
|---|---|---|
| **DSA Engine** | **C++17** | Native binary (`eco_engine.exe`) using STL `<queue>`, `<vector>`, `<unordered_map>`, compiled with MinGW GCC. Connected to Node.js via JSON IPC over stdin/stdout. |
| **Backend API** | **Node.js (ES Modules)** | Pure JavaScript (`.js`). Express 4, Prisma ORM, JWT, bcryptjs. **Zero TypeScript**. |
| **Database** | **SQLite (Prisma)** | Zero-config local relational database (`apps/api/prisma/eco_collect.db`). |
| **Frontend Web** | **React 18 + Vite** | Pure JavaScript JSX (`.jsx`, `.js`), Tailwind CSS, Lucide React, Recharts. **Zero TypeScript**. |
| **Geospatial GIS** | **Leaflet + OpenStreetMap** | Real cartography centered on Nashik coordinates (19.9975° N, 73.7898° E). |
| **Strict Constraints** | **0% Python, 0% TS** | No Python dependencies, no TypeScript in final code. Exactly 3 stakeholder roles (no NGO role). |

---

## 3. Pre-Seeded Credentials for Testing

| Role | Username / ID | Password | Access URL | Features |
|---|---|---|---|---|
| **Organization Admin** | `admin@econexus.gov.in` | `AdminPassword123!` | `/organization/login` | Full operations control room, C++ Priority Heap, C++ Route Optimizer, Bin Assets, Workers team, Grievance redressal, Recycler handovers, CSV/JSON exports. |
| **Municipal Worker** | `WRK-NSK-101`<br>*(Org: `NMC-SWM`)* | `WorkerPassword123!` | `/worker/login` | Mobile-first field view, assigned collection tasks, record emptying with GPS consent, report missed/blocked bin, QR asset scanner simulator, e-waste pickups. |
| **Citizen** | `citizen@econexus.gov.in`<br>*(or any email)* | *Passwordless OTP* | `/citizen/login` | Report waste grievance (generates ticket `#CMP-...`), track private reports timeline, interactive public map, book doorstep e-waste pickup, segregation guide. |

> [!TIP]
> In dev mode (`DEV_AUTH_MODE=true`), the Citizen login screen displays a **"Auto-Fill Dev OTP"** button so you can test citizen login in 1 click without needing an external SMTP email server!
> Both Worker and Admin sign-in screens also provide a 1-click **"Quick Fill"** button for pre-seeded credentials.

---

## 4. Quick Start & Execution

### Prerequisites
- **Node.js**: v18.0.0 or later
- **MinGW GCC / g++** (or any C++17 compiler) to recompile the C++ engine if desired (`g++ --version`). Pre-compiled binaries `eco_engine.exe` and `eco_engine_tests.exe` are already included in `engine/cpp/bin/`.

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Initialize & Seed Database
```bash
npm run db:push
npm run db:seed
```

### Step 3: Run Automated Test Suites
Runs 100% C++ unit tests and all 11 API integration tests:
```bash
npm test
```

### Step 4: Start Applications
Runs both the REST API (port 4000) and Web Frontend (port 3000):
```bash
npm run dev
```

Visit the application in your browser:
- **Public Portal & Landing Page**: [http://localhost:3000/](http://localhost:3000/)
- **Citizen Portal**: [http://localhost:3000/citizen/login](http://localhost:3000/citizen/login)
- **Field Worker Portal**: [http://localhost:3000/worker/login](http://localhost:3000/worker/login)
- **Organization Admin Portal**: [http://localhost:3000/organization/login](http://localhost:3000/organization/login)
- **REST API Health Endpoint**: [http://localhost:4000/api/v1/health](http://localhost:4000/api/v1/health)

---

## 5. C++17 DSA Implementation Details

### Priority Queue Max-Heap (`engine/cpp/include/priority_queue.hpp`)
- Implements a custom comparator for `std::priority_queue`:
  - Primary criterion: `priorityScore` descending.
  - Secondary tie-breaking: `binCode` ascending (guarantees deterministic, reproducible ranking).
- Four scoring components:
  1. **Overflow Risk (40%)**: Current observed fill percentage normalized with linear accumulation rate.
  2. **Pickup Delay (25%)**: Overdue hours elapsed since last collection normalized against a 72-hour ceiling.
  3. **Sensitive Location Risk (20%)**: High penalty for pilgrimage sites (Ramkund, Panchavati Ghats), schools, hospitals, and vegetable mandis.
  4. **Missed Pickup Risk (15%)**: Cumulative penalty for previously missed or blocked collection rounds.
- Categorization thresholds:
  - **Normal**: 0 – 39
  - **Monitor**: 40 – 59
  - **High**: 60 – 79
  - **Critical**: 80 – 100

### Dijkstra & Greedy TSP Route Optimizer (`engine/cpp/include/graph.hpp`, `route_optimizer.hpp`)
- Ingests Nashik road network graph from OpenStreetMap (`data/samples/road_graph_nashik.json`).
- Solves point-to-point shortest path via Dijkstra's Algorithm ($O((V+E)\log V)$).
- Solves multi-stop municipal collection tours via Nearest-Neighbor Greedy Heuristic starting and finishing at NMC depots.

---

## 6. Project Architecture

```
ECO_collect/
├── apps/
│   ├── api/                     # Node.js + Express (Pure JavaScript ES Modules)
│   │   ├── prisma/
│   │   │   └── schema.prisma    # SQLite schema (User, Ward, Bin, Task, Complaint, EWaste, Facility)
│   │   └── src/
│   │       ├── database/        # Prisma client & seed.js with Nashik data
│   │       ├── engine/          # cppSubprocess.js (JSON IPC over stdio)
│   │       ├── routes/          # Express route controllers
│   │       ├── services/        # Business logic & C++ engine invocation
│   │       └── test/api.test.js # 11 Integration tests (Auth, DSA, Complaints, E-Waste)
│   └── web/                     # React 18 + Vite (Pure JavaScript JSX)
│       ├── src/
│       │   ├── api/client.js    # Typed fetch API client
│       │   ├── components/      # Badges, Cards, Modals, LeafletMap, BinDrawer
│       │   ├── context/         # AuthContext.jsx
│       │   └── pages/           # Dedicated Stakeholder Dashboards & Admin Views
├── engine/
│   └── cpp/                     # C++17 DSA Engine
│       ├── include/             # priority_queue.hpp, graph.hpp, route_optimizer.hpp
│       ├── src/main.cpp         # stdio JSON IPC protocol
│       ├── tests/               # C++ unit test runner
│       └── bin/                 # eco_engine.exe & eco_engine_tests.exe
├── data/samples/                # Nashik wards, bins, facilities, OSM road graph
└── scripts/                     # build-cpp.js and test-cpp.js automation
```

---

## 7. License
Developed for academic demonstration and municipal civic technology coursework under the MIT License.
