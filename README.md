# ⚡ Distributed Battery-Swapping Coordination System (FA-1)

A complete, production-ready distributed system where multiple independent battery-swapping stations coordinate inventory, reserve batteries, perform inter-station Remote Procedure Calls (RPC), detect node crashes, and stream real-time updates via WebSockets to an interactive React dashboard.

---

## 🏗️ 1. Architecture Overview

```
                          ┌──────────────────────────┐
                          │   React Web Dashboard    │
                          │ (Port 3000 / Vite + WS)  │
                          └─────────────┬────────────┘
                                        │ (HTTP / WebSocket)
                                        ▼
                       ┌─────────────────────────────────┐
                       │     API Gateway & Middleware    │
                       │     (Port 5000 / WebSocket)     │
                       │  - Heartbeat Failure Detector   │
                       │  - Live Telemetry Broadcaster   │
                       │  - Smart Distributed Router     │
                       └────────────────┬────────────────┘
                                        │
             ┌──────────────────────────┼──────────────────────────┐
             │ (HTTP / RPC)             │ (HTTP / RPC)             │ (HTTP / RPC)
             ▼                          ▼                          ▼
      ┌──────────────┐           ┌──────────────┐           ┌──────────────┐
      │  Station A   │◄─────────►│  Station B   │◄─────────►│  Station C   │
      │  (Port 5001) │    RPC    │  (Port 5002) │    RPC    │  (Port 5003) │
      │  STA-001     │           │  STA-002     │           │  STA-003     │
      ├──────────────┤           ├──────────────┤           ├──────────────┤
      │ Batteries DB │           │ Batteries DB │           │ Batteries DB │
      │ Local State  │           │ Local State  │           │ Local State  │
      └──────────────┘           └──────────────┘           └──────────────┘
```

> **Key Distributed Principle**: Station A, B, and C run as completely distinct processes with their own local databases (`batteries.json`). There is **no single centralized database bottleneck**.

---

## 🎓 2. Distributed Systems Syllabus Mapping

| Syllabus Topic | How it is Implemented in this Project |
|---|---|
| **Distributed Systems** | Station A (`:5001`), Station B (`:5002`), Station C (`:5003`) operate as independent autonomous Node.js processes. |
| **Types of Distributed Systems** | Distributed Client-Server & Peer-to-Peer Hybrid Mesh. |
| **Multi-Node Architecture** | Multi-tiered architecture: React Client $\leftrightarrow$ Middleware Gateway $\leftrightarrow$ Station Node Mesh. |
| **Design Issues & Autonomy** | Local state autonomy prevents cascading failures. State synchronization occurs via distributed RPC. |
| **Middleware Layer** | Gateway service registry, reverse proxy, failure detector, and message dispatcher on port 5000. |
| **Remote Procedure Calls (RPC)** | When Station A is depleted, it executes `POST /api/rpc/query-available` to Station B and C to discover battery availability and reserve remotely. |
| **Message-Oriented Comms** | Event-driven messages (`BATTERY_RESERVED`, `BATTERY_SWAPPED`, `RPC_PACKET_SENT`) logged and transmitted across the mesh. |
| **Stream-Oriented Comms** | WebSocket (Socket.IO) streams live battery charge percentages and node status without page reloads. |
| **Fault Tolerance & Health Checks**| Gateway continually polls `GET /health`. When Station B crashes, it is flagged `OFFLINE`; Station A & C continue processing swaps normally. |

---

## 🚀 3. Quick Start & Setup

### Prerequisites
- Node.js (v18+)
- npm (v9+)

### Installation
Run the root install script to setup all packages (Gateway, Stations, Frontend):
```bash
npm run install:all
```

### Running All Nodes with One Command
```bash
npm run start:all
```
This concurrently boots:
1. **Gateway & WebSocket Hub** $\rightarrow$ `http://localhost:5000`
2. **Station A (Downtown)** $\rightarrow$ `http://localhost:5001`
3. **Station B (Tech Park)** $\rightarrow$ `http://localhost:5002`
4. **Station C (Airport Link)** $\rightarrow$ `http://localhost:5003`
5. **React Dashboard** $\rightarrow$ `http://localhost:3000`

---

## 🧪 4. Automated Verification Test
To run the automated test suite verifying health checks, local reservations, inter-station RPC queries, and 0-battery fallback:
```bash
npm run test:flow
```

---

## 🎬 5. Step-by-Step Faculty Demonstration Flow

### Demo 1 — Network Topology & Independent Nodes
1. Open `http://localhost:3000`.
2. Notice all three stations show **🟢 ONLINE** status with active ping latency (< 5ms).
3. Point out that each station displays its isolated battery inventory.

### Demo 2 — Real-Time Local Battery Reservation
1. Click **Reserve Battery** on Station A (or use the **Swap Terminal** button in the header).
2. Observe Battery `B001` immediately switch from `AVAILABLE` to `RESERVED`.
3. Notice the fleet counter in the header instantly updates (**7 $\rightarrow$ 6 Available**) via WebSockets without refreshing the page!

### Demo 3 — Inter-Station RPC Discovery (0-Battery Outage Fallback)
1. On **Station A**, click **Drain (Test 0)** to simulate 0 available batteries at Downtown Hub.
2. Open **Swap Terminal**, select **Station A**, and click **Request Battery Swap**.
3. **Observe the magic**: Station A detects 0 batteries, automatically queries Station B and Station C over RPC, finds available packs at Station B, and reserves one seamlessly.
4. Check the **Inter-Station RPC & Stream Telemetry Logs** panel at the bottom to see the exact packet trace:
   - `[RPC PACKET] STA-001 -> STA-002: query_available`
   - `[RPC RESPONSE] STA-002 -> STA-001: 5 available`

### Demo 4 — Fault Tolerance & Node Crash Simulation
1. Stop Station B (in terminal, press `Ctrl+C` on Station B or kill port 5002).
2. Within 2 seconds, the Gateway Heartbeat Detector marks Station B **🔴 OFFLINE**.
3. Station A and Station C **continue functioning normally**, demonstrating that single node failures do not crash the entire distributed system.

### Demo 5 — Recovery & Re-Registration
1. Restart Station B (`npm run station:b`).
2. The Gateway immediately detects the heartbeat and restores Station B to **🟢 ONLINE** without requiring any restart of the Gateway or other nodes.

### Demo 6 — Physical Battery Swap Cycle
1. In the Swap Terminal, click **Complete Physical Swap**.
2. The system dispenses the fully charged pack to the driver and docks a depleted 15% battery pack into the charging bay.
3. The background charging simulator slowly trickle-charges the battery pack back to 100%.

---

## 📡 6. Key API Endpoints & RPC Interfaces

### Station Node (`:5001`, `:5002`, `:5003`)
- `GET /health` : Heartbeat telemetry & node state.
- `GET /api/batteries` : Local battery inventory.
- `POST /api/reserve` : Reserve a local battery pack.
- `POST /api/release` : Cancel a reservation.
- `POST /api/swap` : Execute physical battery exchange.
- `POST /api/rpc/query-available` : Peer RPC endpoint for battery availability queries.
- `POST /api/rpc/reserve-forward` : Peer RPC endpoint to reserve on behalf of another station.
- `POST /api/inter-station/find-alternatives` : Broadcasts RPC requests to all peer nodes.

### Gateway (`:5000`)
- `GET /api/network/status` : Snapshot of all nodes and latency.
- `GET /api/network/batteries` : Aggregated battery fleet data.
- `POST /api/smart-swap` : Distributed swap coordinator with RPC failover routing.
- `POST /api/station-event` : Webhook dispatcher for real-time WebSocket broadcasting.
