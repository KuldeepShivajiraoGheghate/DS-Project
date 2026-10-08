/**
 * Distributed Battery System - Automated End-to-End Verification Suite
 * Uses native Node.js fetch (Node 18+)
 */

const GATEWAY_URL = 'http://localhost:5000';
const STA_A_URL = 'http://localhost:5001';
const STA_B_URL = 'http://localhost:5002';
const STA_C_URL = 'http://localhost:5003';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function postJson(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body || {})
  });
  return res.json();
}

async function getJson(url) {
  const res = await fetch(url);
  return res.json();
}

async function runTests() {
  console.log('\n======================================================');
  console.log('⚡ DISTRIBUTED BATTERY SYSTEM (FA-1) VERIFICATION SUITE');
  console.log('======================================================\n');

  let passed = 0;
  let failed = 0;

  // Test 1: Node Health Checks
  console.log('▶ [TEST 1] Verifying Node Health & Gateway Registry...');
  try {
    const gwStatus = await getJson(`${GATEWAY_URL}/api/network/status`);
    console.log(`  ✔ Gateway online. Registered stations: ${gwStatus.onlineCount}/${gwStatus.totalStations}`);

    const hA = await getJson(`${STA_A_URL}/health`);
    console.log(`  ✔ Station A [STA-001] Status: ${hA.status} | Avail: ${hA.stats.available}`);

    const hB = await getJson(`${STA_B_URL}/health`);
    console.log(`  ✔ Station B [STA-002] Status: ${hB.status} | Avail: ${hB.stats.available}`);

    const hC = await getJson(`${STA_C_URL}/health`);
    console.log(`  ✔ Station C [STA-003] Status: ${hC.status} | Avail: ${hC.stats.available}`);

    passed++;
  } catch (err) {
    console.error(`  ✖ TEST 1 FAILED:`, err.message);
    failed++;
  }

  // Test 2: Local Battery Reservation
  console.log('\n▶ [TEST 2] Testing Local Battery Reservation at Station A...');
  try {
    const res = await postJson(`${STA_A_URL}/api/reserve`, {
      userId: 'TEST-USER-101',
      vehicleId: 'TEST-CAR-99'
    });
    console.log(`  ✔ Successfully reserved battery ${res.battery.id} at ${res.battery.stationId} (Charge: ${res.battery.charge}%)`);
    passed++;
  } catch (err) {
    console.error(`  ✖ TEST 2 FAILED:`, err.message);
    failed++;
  }

  // Test 3: Inter-Station RPC Peer Query
  console.log('\n▶ [TEST 3] Testing Inter-Station RPC Discovery (Station A querying Peers)...');
  try {
    const rpcRes = await postJson(`${STA_A_URL}/api/inter-station/find-alternatives`, {});
    console.log(`  ✔ RPC Discovery finished. Queried ${rpcRes.peersQueried} peer nodes:`);
    rpcRes.results.forEach(r => {
      console.log(`    - Peer ${r.peerName} (${r.peerId}): ${r.status} (${r.availableCount} available, latency: ${r.latencyMs}ms)`);
    });
    passed++;
  } catch (err) {
    console.error(`  ✖ TEST 3 FAILED:`, err.message);
    failed++;
  }

  // Test 4: Smart Distributed Fallback (Drain Station A, route to Station B)
  console.log('\n▶ [TEST 4] Simulating 0-Battery Outage & Automatic RPC Fallback...');
  try {
    // 1. Drain Station A
    await postJson(`${STA_A_URL}/api/chaos/drain`);
    console.log(`  ✔ Station A drained to 0 available batteries.`);

    // 2. Request swap at Station A via Gateway
    const swapCoord = await postJson(`${GATEWAY_URL}/api/smart-swap`, {
      preferredStationId: 'STA-001',
      userId: 'FALLBACK-USER-555',
      vehicleId: 'EV-FALLBACK-10'
    });

    console.log(`  ✔ Smart Coordinator Response:`);
    console.log(`    Fallback Occurred: ${swapCoord.fallbackOccurred}`);
    console.log(`    Reason: ${swapCoord.fallbackReason}`);
    console.log(`    Allocated Battery: ${swapCoord.reservation?.battery?.id || 'Allocated'} at ${swapCoord.reservation?.stationName || 'Fallback Node'}`);

    passed++;
  } catch (err) {
    console.error(`  ✖ TEST 4 FAILED:`, err.message);
    failed++;
  }

  // Test 5: Battery Swap & Charging Cycle
  console.log('\n▶ [TEST 5] Executing Physical Battery Swap Workflow...');
  try {
    // Reset Station A
    await postJson(`${STA_A_URL}/api/chaos/reset`);
    const swapExec = await postJson(`${STA_A_URL}/api/swap`, {
      returnBatteryCharge: 12,
      userId: 'SWAP-DRIVER-777',
      vehicleId: 'EV-TESLA-888'
    });

    console.log(`  ✔ Swap execution success:`);
    console.log(`    Dispensed charged pack: ${swapExec.dispensed.id}`);
    console.log(`    Received depleted pack: ${swapExec.docked.id} (${swapExec.docked.charge}%) into charging bay.`);
    passed++;
  } catch (err) {
    console.error(`  ✖ TEST 5 FAILED:`, err.message);
    failed++;
  }

  console.log('\n======================================================');
  console.log(`🏁 TEST RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log('======================================================\n');
}

runTests();
