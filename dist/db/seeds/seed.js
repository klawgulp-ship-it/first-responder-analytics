"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const connection_1 = require("../connection");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const uuid_1 = require("uuid");
// Deterministic IDs for cross-references
const districtIds = Array.from({ length: 6 }, () => (0, uuid_1.v4)());
const stationIds = Array.from({ length: 12 }, () => (0, uuid_1.v4)());
const unitIds = Array.from({ length: 30 }, () => (0, uuid_1.v4)());
const personnelIds = Array.from({ length: 60 }, () => (0, uuid_1.v4)());
const shiftIds = Array.from({ length: 3 }, () => (0, uuid_1.v4)());
async function seed() {
    const client = await connection_1.pool.connect();
    try {
        await client.query('BEGIN');
        // ============================================================
        // DISTRICTS
        // ============================================================
        const districts = [
            { id: districtIds[0], name: 'Downtown Pensacola', num: 1, pop: 28000, area: 3.8, risk: 'high' },
            { id: districtIds[1], name: 'East Hill', num: 2, pop: 35000, area: 6.2, risk: 'moderate' },
            { id: districtIds[2], name: 'West Pensacola', num: 3, pop: 42000, area: 8.5, risk: 'moderate' },
            { id: districtIds[3], name: 'Cordova Park', num: 4, pop: 31000, area: 7.1, risk: 'low' },
            { id: districtIds[4], name: 'Warrington', num: 5, pop: 24000, area: 9.3, risk: 'high' },
            { id: districtIds[5], name: 'Perdido / Ferry Pass', num: 6, pop: 38000, area: 14.6, risk: 'moderate' },
        ];
        for (const d of districts) {
            await client.query(`INSERT INTO districts (id, name, district_number, population, area_sq_miles, risk_level)
         VALUES ($1, $2, $3, $4, $5, $6::risk_level)`, [d.id, d.name, d.num, d.pop, d.area, d.risk]);
        }
        // ============================================================
        // STATIONS
        // ============================================================
        const stations = [
            { id: stationIds[0], num: 1, name: 'Station 1 - Palafox', addr: '110 S Palafox St', lat: 30.4113, lng: -87.2169, dist: 0, hq: true, cap: 6 },
            { id: stationIds[1], num: 2, name: 'Station 2 - East Hill', addr: '1900 E Cervantes St', lat: 30.4250, lng: -87.1980, dist: 1, hq: false, cap: 4 },
            { id: stationIds[2], num: 3, name: 'Station 3 - West Pensacola', addr: '5100 Mobile Hwy', lat: 30.4350, lng: -87.2650, dist: 2, hq: false, cap: 4 },
            { id: stationIds[3], num: 4, name: 'Station 4 - Cordova', addr: '2900 N 12th Ave', lat: 30.4480, lng: -87.2050, dist: 3, hq: false, cap: 4 },
            { id: stationIds[4], num: 5, name: 'Station 5 - Warrington', addr: '401 Navy Blvd', lat: 30.3880, lng: -87.2500, dist: 4, hq: false, cap: 4 },
            { id: stationIds[5], num: 6, name: 'Station 6 - Perdido', addr: '7200 Pine Forest Rd', lat: 30.4600, lng: -87.3100, dist: 5, hq: false, cap: 5 },
            { id: stationIds[6], num: 7, name: 'Station 7 - Scenic Heights', addr: '3300 Scenic Hwy', lat: 30.4400, lng: -87.1900, dist: 1, hq: false, cap: 3 },
            { id: stationIds[7], num: 8, name: 'Station 8 - Bayou Chico', addr: '2850 Barrancas Ave', lat: 30.3950, lng: -87.2350, dist: 4, hq: false, cap: 3 },
            { id: stationIds[8], num: 9, name: 'Station 9 - Downtown South', addr: '500 S Baylen St', lat: 30.4050, lng: -87.2200, dist: 0, hq: false, cap: 4 },
            { id: stationIds[9], num: 10, name: 'Station 10 - Ensley', addr: '600 N Highway 29', lat: 30.4550, lng: -87.2700, dist: 2, hq: false, cap: 3 },
            { id: stationIds[10], num: 11, name: 'Station 11 - Airport', addr: '2430 Airport Blvd', lat: 30.4730, lng: -87.1870, dist: 3, hq: false, cap: 4 },
            { id: stationIds[11], num: 12, name: 'Station 12 - Ferry Pass', addr: '8800 N Davis Hwy', lat: 30.4800, lng: -87.2200, dist: 5, hq: false, cap: 3 },
        ];
        for (const s of stations) {
            await client.query(`INSERT INTO stations (id, station_number, name, address, location_lat, location_lng, district_id, is_headquarters, capacity_units)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`, [s.id, s.num, s.name, s.addr, s.lat, s.lng, districtIds[s.dist], s.hq, s.cap]);
        }
        // ============================================================
        // UNITS
        // ============================================================
        const units = [
            // Fire
            { id: unitIds[0], num: 'E1', type: 'engine', station: 0 },
            { id: unitIds[1], num: 'E2', type: 'engine', station: 1 },
            { id: unitIds[2], num: 'E3', type: 'engine', station: 2 },
            { id: unitIds[3], num: 'E4', type: 'engine', station: 3 },
            { id: unitIds[4], num: 'E5', type: 'engine', station: 4 },
            { id: unitIds[5], num: 'E6', type: 'engine', station: 5 },
            { id: unitIds[6], num: 'L1', type: 'ladder', station: 0 },
            { id: unitIds[7], num: 'L2', type: 'ladder', station: 2 },
            { id: unitIds[8], num: 'L3', type: 'ladder', station: 5 },
            { id: unitIds[9], num: 'R1', type: 'rescue', station: 0 },
            { id: unitIds[10], num: 'HZ1', type: 'hazmat', station: 5 },
            { id: unitIds[11], num: 'BC1', type: 'battalion_chief', station: 0 },
            // EMS
            { id: unitIds[12], num: 'M1', type: 'medic', station: 0 },
            { id: unitIds[13], num: 'M2', type: 'medic', station: 1 },
            { id: unitIds[14], num: 'M3', type: 'medic', station: 2 },
            { id: unitIds[15], num: 'M4', type: 'medic', station: 3 },
            { id: unitIds[16], num: 'M5', type: 'medic', station: 4 },
            { id: unitIds[17], num: 'A1', type: 'ambulance', station: 6 },
            { id: unitIds[18], num: 'A2', type: 'ambulance', station: 7 },
            { id: unitIds[19], num: 'A3', type: 'ambulance', station: 8 },
            // Police
            { id: unitIds[20], num: 'P101', type: 'patrol', station: 8 },
            { id: unitIds[21], num: 'P102', type: 'patrol', station: 8 },
            { id: unitIds[22], num: 'P201', type: 'patrol', station: 9 },
            { id: unitIds[23], num: 'P202', type: 'patrol', station: 9 },
            { id: unitIds[24], num: 'P301', type: 'patrol', station: 7 },
            { id: unitIds[25], num: 'P302', type: 'patrol', station: 7 },
            { id: unitIds[26], num: 'D1', type: 'detective', station: 8 },
            { id: unitIds[27], num: 'SWAT1', type: 'swat', station: 0 },
            { id: unitIds[28], num: 'CMD1', type: 'command', station: 0 },
            { id: unitIds[29], num: 'AIR1', type: 'helicopter', station: 10 },
        ];
        const statuses = ['available', 'available', 'available', 'available', 'dispatched', 'on_scene', 'out_of_service'];
        for (const u of units) {
            const status = statuses[Math.floor(Math.random() * statuses.length)];
            await client.query(`INSERT INTO units (id, unit_number, unit_type, station_id, status, current_location_lat, current_location_lng, in_service_date)
         VALUES ($1, $2, $3::unit_type, $4, $5::unit_status, $6, $7, $8)`, [u.id, u.num, u.type, stationIds[u.station],
                status,
                stations[u.station].lat + (Math.random() - 0.5) * 0.01,
                stations[u.station].lng + (Math.random() - 0.5) * 0.01,
                '2020-01-15']);
        }
        // ============================================================
        // SHIFTS
        // ============================================================
        const shifts = [
            { id: shiftIds[0], name: 'A Shift (Day)', pattern: 'day', start: '06:00', end: '18:00' },
            { id: shiftIds[1], name: 'B Shift (Night)', pattern: 'night', start: '18:00', end: '06:00' },
            { id: shiftIds[2], name: 'C Shift (Swing)', pattern: 'swing', start: '14:00', end: '02:00' },
        ];
        for (const s of shifts) {
            await client.query(`INSERT INTO shifts (id, shift_name, shift_pattern, start_time, end_time)
         VALUES ($1, $2, $3::shift_pattern, $4, $5)`, [s.id, s.name, s.pattern, s.start, s.end]);
        }
        // ============================================================
        // PERSONNEL
        // ============================================================
        const firstNames = ['James', 'Maria', 'Robert', 'Sarah', 'Michael', 'Jennifer', 'David', 'Lisa', 'John', 'Emily',
            'Chris', 'Angela', 'Daniel', 'Rachel', 'Marcus', 'Nicole', 'Kevin', 'Amanda', 'Brian', 'Stephanie',
            'Alex', 'Patricia', 'Thomas', 'Michelle', 'Jason', 'Laura', 'Anthony', 'Karen', 'Matthew', 'Jessica',
            'William', 'Diana', 'Steven', 'Cynthia', 'Andrew', 'Rebecca', 'Ryan', 'Melissa', 'Joshua', 'Ashley',
            'Brandon', 'Kimberly', 'Timothy', 'Sandra', 'Jonathan', 'Catherine', 'Jeffrey', 'Heather', 'Gregory', 'Tiffany',
            'Eric', 'Crystal', 'Derek', 'Natasha', 'Carlos', 'Monique', 'Nathan', 'Brenda', 'Tyler', 'Valerie'];
        const lastNames = ['Martinez', 'Johnson', 'Williams', 'Chen', 'Patel', 'Thompson', 'Rodriguez', 'Kim',
            'Anderson', 'Jackson', 'O\'Brien', 'Nguyen', 'Garcia', 'Miller', 'Davis', 'Wilson', 'Taylor', 'Moore',
            'White', 'Harris', 'Clark', 'Lewis', 'Robinson', 'Walker', 'Young', 'Hall', 'Allen', 'Wright',
            'King', 'Scott', 'Adams', 'Baker', 'Carter', 'Mitchell', 'Perez', 'Roberts', 'Turner', 'Phillips',
            'Campbell', 'Parker', 'Evans', 'Edwards', 'Collins', 'Stewart', 'Sanchez', 'Morris', 'Reed', 'Cook',
            'Bell', 'Murphy', 'Bailey', 'Rivera', 'Cooper', 'Richardson', 'Cox', 'Howard', 'Ward', 'Torres', 'Peterson', 'Gray'];
        const ranks = [
            { rank: 'firefighter', certs: ['FF-I', 'FF-II', 'Hazmat Awareness'] },
            { rank: 'engineer', certs: ['FF-I', 'FF-II', 'Driver/Operator'] },
            { rank: 'lieutenant', certs: ['FF-I', 'FF-II', 'Fire Officer I'] },
            { rank: 'captain', certs: ['FF-I', 'FF-II', 'Fire Officer II', 'Incident Command'] },
            { rank: 'paramedic', certs: ['EMT-P', 'ACLS', 'PALS', 'PHTLS'] },
            { rank: 'emt', certs: ['EMT-B', 'CPR'] },
            { rank: 'officer', certs: ['POST Basic', 'Defensive Tactics'] },
            { rank: 'sergeant', certs: ['POST Intermediate', 'Supervision'] },
            { rank: 'dispatcher', certs: ['EMD', 'CPR', 'APCO'] },
        ];
        for (let i = 0; i < 60; i++) {
            const rank = ranks[i % ranks.length];
            const unitIdx = i % 30;
            const hireYear = 2005 + Math.floor(Math.random() * 18);
            const hireMonth = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0');
            await client.query(`INSERT INTO personnel (id, badge_number, first_name, last_name, rank, unit_id, email, hire_date, certifications, status)
         VALUES ($1, $2, $3, $4, $5::personnel_rank, $6, $7, $8, $9, 'active'::personnel_status)`, [
                personnelIds[i],
                `B${String(1000 + i).padStart(4, '0')}`,
                firstNames[i],
                lastNames[i],
                rank.rank,
                unitIds[unitIdx],
                `${firstNames[i].toLowerCase()}.${lastNames[i].toLowerCase().replace("'", '')}@city.gov`,
                `${hireYear}-${hireMonth}-15`,
                `{${rank.certs.map(c => `"${c}"`).join(',')}}`,
            ]);
        }
        // ============================================================
        // HAZARD LOCATIONS
        // ============================================================
        const hazards = [
            { name: 'NAS Pensacola', type: 'government_building', addr: '190 Radford Blvd', lat: 30.3500, lng: -87.2750, dist: 4, risk: 'critical', instr: 'Military installation. Coordinate with base fire dept. Gate access required. Contact base emergency dispatch.' },
            { name: 'A.K. Suter Elementary School', type: 'school', addr: '32 W Blount St', lat: 30.4200, lng: -87.2180, dist: 0, risk: 'high', instr: 'Capacity 650 students. Reunification at Bartram Park across the street.' },
            { name: 'Baptist Hospital', type: 'hospital', addr: '1000 W Moreno St', lat: 30.4080, lng: -87.2280, dist: 0, risk: 'high', instr: 'Level II Trauma Center. ER entrance on Moreno St. Helipad on roof.' },
            { name: 'Azalea Trace Nursing Facility', type: 'nursing_home', addr: '10100 Hillview Dr', lat: 30.4700, lng: -87.2500, dist: 5, risk: 'high', instr: '280 residents, many non-ambulatory. Full evacuation requires 8+ units and buses.' },
            { name: 'I-110 / I-10 Interchange', type: 'highway', addr: 'I-110 at I-10', lat: 30.4350, lng: -87.2150, dist: 1, risk: 'moderate', instr: 'High traffic interchange. Coordinate with FDOT and FHP for lane closures.' },
            { name: 'Pensacola International Airport', type: 'airport', addr: '2430 Airport Blvd', lat: 30.4734, lng: -87.1866, dist: 3, risk: 'critical', instr: 'ARFF on-site. Coordinate with airport fire rescue and FAA tower. Runway 17/35 primary.' },
            { name: 'Port of Pensacola', type: 'warehouse', addr: '700 S Barracks St', lat: 30.4020, lng: -87.2100, dist: 0, risk: 'moderate', instr: 'Commercial port facility. Cargo containers, fuel storage. Marine unit access from Bayfront.' },
            { name: 'Ascension Sacred Heart Hospital', type: 'hospital', addr: '5151 N 9th Ave', lat: 30.4600, lng: -87.2050, dist: 3, risk: 'high', instr: 'Level I Trauma Center. ER on east side. Helipad active 24/7. Pediatric unit on 3rd floor.' },
        ];
        for (const h of hazards) {
            await client.query(`INSERT INTO hazard_locations (name, hazard_type, address, location_lat, location_lng, district_id, risk_level, special_instructions)
         VALUES ($1, $2::hazard_type, $3, $4, $5, $6, $7::risk_level, $8)`, [h.name, h.type, h.addr, h.lat, h.lng, districtIds[h.dist], h.risk, h.instr]);
        }
        // ============================================================
        // RESPONSE ZONES
        // ============================================================
        for (let d = 0; d < 6; d++) {
            const zones = [
                { name: `Zone ${d * 3 + 1}A - Primary`, type: 'primary', target: 240 },
                { name: `Zone ${d * 3 + 2}B - Secondary`, type: 'secondary', target: 360 },
                { name: `Zone ${d * 3 + 3}C - Rural`, type: 'extended', target: 480 },
            ];
            for (const z of zones) {
                await client.query(`INSERT INTO response_zones (district_id, zone_name, zone_type, target_response_time_seconds, avg_response_time_seconds)
           VALUES ($1, $2, $3, $4, $5)`, [districtIds[d], z.name, z.type, z.target, z.target + Math.floor(Math.random() * 60) - 20]);
            }
        }
        // ============================================================
        // INCIDENTS (90 days of realistic data)
        // ============================================================
        const incidentTypes = [
            { type: 'ems', weight: 45 },
            { type: 'fire', weight: 15 },
            { type: 'police', weight: 25 },
            { type: 'traffic', weight: 10 },
            { type: 'multi_agency', weight: 3 },
            { type: 'hazmat', weight: 1 },
            { type: 'rescue', weight: 1 },
        ];
        const addresses = [
            '220 S Palafox St', '1400 E Cervantes St', '3100 W Navy Blvd', '801 N Pace Blvd', '2500 N 12th Ave',
            '710 E Gregory St', '4500 Mobile Hwy', '1200 Bayfront Pkwy', '600 S Baylen St', '3400 Scenic Hwy',
            '900 E Garden St', '5200 N W St', '1800 Creighton Rd', '2100 Airport Blvd', '430 Barrancas Ave',
            '7500 Pine Forest Rd', '1050 N 9th Ave', '3600 Brent Ln', '2800 N Davis Hwy', '150 E Intendencia St',
        ];
        const descriptions = {
            ems: ['Chest pain, 65yo male near Palafox', 'Fall injury, elderly female at residence', 'Difficulty breathing, possible heat exhaustion', 'Unresponsive person on Bayfront Pkwy', 'Allergic reaction, bee sting at park', 'Seizure activity at Cordova Mall', 'MVA with injuries on I-110', 'Overdose reported near downtown', 'Abdominal pain, pregnant female', 'Laceration with heavy bleeding at construction site'],
            fire: ['Structure fire, single story residential on Cervantes', 'Kitchen fire, 2-story apartment on Garden St', 'Smoke investigation near Bayou Texar', 'Vehicle fire on Pensacola Bay Bridge', 'Dumpster fire near Palafox commercial district', 'Electrical fire in warehouse at Port of Pensacola', 'Brush fire near NAS Pensacola perimeter', 'Fire alarm activation, Ascension Sacred Heart'],
            police: ['Burglary in progress on E Gregory St', 'Domestic disturbance, Warrington area', 'Suspicious person near Seville Quarter', 'Traffic stop on Navy Blvd', 'Shoplifting at Cordova Mall', 'Assault reported on S Palafox', 'Noise complaint, East Hill residential', 'Welfare check requested, elderly resident', 'Vandalism at Pensacola Bay Center', 'Trespassing at Port facility'],
            traffic: ['Two-vehicle collision on Pace Blvd, injuries unknown', 'Single vehicle vs pole on Mobile Hwy', 'Multi-vehicle pileup on I-10 at Pensacola exit', 'Pedestrian struck on N Davis Hwy', 'Hit and run reported on Airport Blvd'],
            multi_agency: ['Structure fire with entrapment on W Cervantes', 'Hazmat spill at Port of Pensacola', 'Active threat reported near government complex', 'Major MVA with multiple casualties on I-110', 'Water rescue, boat capsized in Pensacola Bay'],
            hazmat: ['Chemical spill at industrial facility on Fairfield', 'Gas leak reported on W Garden St', 'Unknown substance in package at federal courthouse'],
            rescue: ['Water rescue, swimmer in distress at Pensacola Beach', 'Person trapped in elevator at Baptist Hospital', 'Confined space rescue at port facility'],
        };
        function weightedRandom(items) {
            const total = items.reduce((sum, i) => sum + i.weight, 0);
            let r = Math.random() * total;
            for (const item of items) {
                r -= item.weight;
                if (r <= 0)
                    return item.type;
            }
            return items[0].type;
        }
        // Generate 90 days of incidents
        const now = new Date();
        const incidentRecords = [];
        let incidentNum = 20260001;
        for (let daysAgo = 90; daysAgo >= 0; daysAgo--) {
            // More incidents on weekends, vary by time of day
            const date = new Date(now.getTime() - daysAgo * 86400000);
            const dayOfWeek = date.getDay();
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
            const baseCount = isWeekend ? 18 : 14;
            const dailyCount = baseCount + Math.floor(Math.random() * 8);
            for (let j = 0; j < dailyCount; j++) {
                const iType = weightedRandom(incidentTypes);
                const priority = String(Math.min(5, Math.max(1, Math.floor(Math.random() * 5) + 1)));
                const distIdx = Math.floor(Math.random() * 6);
                const stationRef = stations.find((s) => s.dist === distIdx) || stations[0];
                // Time distribution: more incidents during afternoon/evening
                const hourWeights = [2, 1, 1, 1, 1, 2, 3, 4, 5, 5, 6, 7, 8, 8, 9, 9, 10, 10, 9, 8, 7, 6, 4, 3];
                let hour = 0;
                const totalW = hourWeights.reduce((a, b) => a + b, 0);
                let rr = Math.random() * totalW;
                for (let h = 0; h < 24; h++) {
                    rr -= hourWeights[h];
                    if (rr <= 0) {
                        hour = h;
                        break;
                    }
                }
                const minute = Math.floor(Math.random() * 60);
                const createdAt = new Date(date);
                createdAt.setHours(hour, minute, Math.floor(Math.random() * 60));
                // Response time varies by priority and type
                const baseResponse = priority === '1' ? 180 : priority === '2' ? 240 : priority === '3' ? 360 : 480;
                const responseTime = baseResponse + Math.floor(Math.random() * 180) - 60;
                const sceneTime = 600 + Math.floor(Math.random() * 2400);
                const totalTime = responseTime + sceneTime;
                const isClosed = daysAgo > 0;
                const resolvedAt = isClosed ? new Date(createdAt.getTime() + totalTime * 1000) : null;
                const lat = stationRef.lat + (Math.random() - 0.5) * 0.03;
                const lng = stationRef.lng + (Math.random() - 0.5) * 0.03;
                const addr = addresses[Math.floor(Math.random() * addresses.length)];
                const desc = descriptions[iType]?.[Math.floor(Math.random() * (descriptions[iType]?.length || 1))] || 'Incident reported';
                const incId = (0, uuid_1.v4)();
                incidentRecords.push({ id: incId, type: iType, createdAt, distIdx });
                const status = isClosed ? 'closed' : (Math.random() > 0.5 ? 'on_scene' : 'dispatched');
                await client.query(`INSERT INTO incidents (id, incident_number, incident_type, priority, status, location_lat, location_lng, address, district_id, description, response_time_seconds, scene_time_seconds, total_time_seconds, created_at, dispatched_at, resolved_at, closed_at, weather_conditions)
           VALUES ($1, $2, $3::incident_type, $4::incident_priority, $5::incident_status, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)`, [
                    incId,
                    `INC-${incidentNum++}`,
                    iType, priority, status,
                    lat, lng, addr, districtIds[distIdx], desc,
                    responseTime, sceneTime, totalTime,
                    createdAt,
                    new Date(createdAt.getTime() + 45000), // dispatched 45s after creation
                    resolvedAt,
                    isClosed ? resolvedAt : null,
                    JSON.stringify({ temp_f: 55 + Math.floor(Math.random() * 40), humidity_pct: 60 + Math.floor(Math.random() * 35), conditions: ['clear', 'partly_cloudy', 'humid', 'thunderstorm', 'rain', 'tropical_storm'][Math.floor(Math.random() * 6)] }),
                ]);
                // Add unit assignments (1-3 units per incident)
                const numUnits = iType === 'multi_agency' ? 3 + Math.floor(Math.random() * 3) :
                    iType === 'fire' ? 2 + Math.floor(Math.random() * 2) : 1 + Math.floor(Math.random() * 2);
                const usedUnits = new Set();
                for (let u = 0; u < Math.min(numUnits, 30); u++) {
                    let unitIdx = Math.floor(Math.random() * 30);
                    while (usedUnits.has(unitIdx))
                        unitIdx = (unitIdx + 1) % 30;
                    usedUnits.add(unitIdx);
                    const dispAt = new Date(createdAt.getTime() + 45000 + u * 30000);
                    const enRouteAt = new Date(dispAt.getTime() + 60000);
                    const onSceneAt = new Date(enRouteAt.getTime() + (responseTime - 60) * 1000);
                    const clearedAt = isClosed ? new Date(onSceneAt.getTime() + sceneTime * 1000) : null;
                    await client.query(`INSERT INTO incident_units (incident_id, unit_id, is_primary, dispatched_at, en_route_at, on_scene_at, cleared_at, response_time_seconds)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`, [incId, unitIds[unitIdx], u === 0, dispAt, enRouteAt, onSceneAt, clearedAt, responseTime + u * 30]);
                    // Dispatch log entry
                    await client.query(`INSERT INTO dispatch_log (incident_id, unit_id, action, dispatcher_id, notes, timestamp)
             VALUES ($1, $2, 'dispatched'::dispatch_action, $3, $4, $5)`, [incId, unitIds[unitIdx], personnelIds[Math.floor(Math.random() * 60)],
                        `Unit ${units[unitIdx].num} dispatched to ${addr}`, dispAt]);
                }
                // Add outcome for closed incidents
                if (isClosed) {
                    const outcomeTypes = {
                        ems: ['transport_hospital', 'resolved', 'patient_refused'],
                        fire: ['fire_extinguished', 'false_alarm', 'resolved'],
                        police: ['resolved', 'arrest', 'no_action_needed', 'ongoing_investigation'],
                        traffic: ['resolved', 'transport_hospital'],
                        multi_agency: ['resolved', 'mutual_aid'],
                        hazmat: ['resolved'],
                        rescue: ['resolved', 'transport_hospital'],
                    };
                    const outcomes = outcomeTypes[iType] || ['resolved'];
                    const outcome = outcomes[Math.floor(Math.random() * outcomes.length)];
                    await client.query(`INSERT INTO incident_outcomes (incident_id, outcome_type, injuries_civilian, injuries_responder, fatalities, property_damage_estimate, narrative, follow_up_required, reporting_officer_id)
             VALUES ($1, $2::outcome_type, $3, $4, $5, $6, $7, $8, $9)`, [
                        incId, outcome,
                        Math.random() > 0.85 ? Math.floor(Math.random() * 3) + 1 : 0,
                        Math.random() > 0.95 ? 1 : 0,
                        Math.random() > 0.99 ? 1 : 0,
                        iType === 'fire' ? Math.floor(Math.random() * 500000) : (Math.random() > 0.7 ? Math.floor(Math.random() * 50000) : 0),
                        `${desc}. Units responded and ${outcome.replace('_', ' ')}.`,
                        Math.random() > 0.8,
                        personnelIds[Math.floor(Math.random() * 60)],
                    ]);
                }
            }
        }
        // ============================================================
        // DAILY STATS (aggregate the incident data)
        // ============================================================
        for (let daysAgo = 90; daysAgo >= 1; daysAgo--) {
            const date = new Date(now.getTime() - daysAgo * 86400000);
            const dateStr = date.toISOString().split('T')[0];
            for (let d = 0; d < 6; d++) {
                const distIncidents = incidentRecords.filter((inc) => {
                    const incDate = inc.createdAt.toISOString().split('T')[0];
                    return incDate === dateStr && inc.distIdx === d;
                });
                if (distIncidents.length === 0)
                    continue;
                const counts = { fire: 0, ems: 0, police: 0, multi_agency: 0, other: 0 };
                for (const inc of distIncidents) {
                    if (inc.type in counts)
                        counts[inc.type]++;
                    else
                        counts.other++;
                }
                await client.query(`INSERT INTO daily_stats (stat_date, district_id, fire_count, ems_count, police_count, multi_agency_count, other_count, total_incidents, avg_response_time_seconds, units_utilized_pct, personnel_on_duty)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`, [
                    dateStr, districtIds[d],
                    counts.fire, counts.ems, counts.police, counts.multi_agency, counts.other,
                    distIncidents.length,
                    240 + Math.floor(Math.random() * 120),
                    30 + Math.floor(Math.random() * 40),
                    8 + Math.floor(Math.random() * 4),
                ]);
            }
        }
        // ============================================================
        // USERS (demo accounts)
        // ============================================================
        const passwordHash = await bcryptjs_1.default.hash('demo2026!', 12);
        const demoUsers = [
            { username: 'chief_williams', email: 'chief@city.gov', role: 'chief' },
            { username: 'capt_martinez', email: 'captain@city.gov', role: 'captain' },
            { username: 'dispatch_chen', email: 'dispatch@city.gov', role: 'dispatcher' },
            { username: 'analyst_patel', email: 'analyst@city.gov', role: 'analyst' },
            { username: 'admin', email: 'admin@city.gov', role: 'admin' },
        ];
        for (const u of demoUsers) {
            await client.query(`INSERT INTO users (username, email, password_hash, role, is_active)
         VALUES ($1, $2, $3, $4::user_role, true)`, [u.username, u.email, passwordHash, u.role]);
        }
        await client.query('COMMIT');
        // Print summary
        const tables = ['districts', 'stations', 'units', 'personnel', 'shifts', 'hazard_locations',
            'response_zones', 'incidents', 'incident_units', 'incident_outcomes', 'dispatch_log', 'daily_stats', 'users'];
        console.log('\n=== SEED COMPLETE ===');
        for (const t of tables) {
            const { rows } = await client.query(`SELECT COUNT(*) FROM ${t}`);
            console.log(`  ${t}: ${rows[0].count} records`);
        }
        console.log('\nDemo accounts (password: demo2026!):');
        for (const u of demoUsers)
            console.log(`  ${u.username} (${u.role})`);
    }
    catch (err) {
        await client.query('ROLLBACK');
        throw err;
    }
    finally {
        client.release();
        await connection_1.pool.end();
    }
}
seed().catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
});
//# sourceMappingURL=seed.js.map