// This module fetches the absolute correct time from the internet
// bypassing the local machine's OS clock, which may be out of sync
// or using a non-Gregorian calendar (e.g. Ethiopian Calendar).

let timeOffset = 0;
let lastSync = 0;
let isSyncing = false;

/**
 * Attempts to sync system time with an external reliable API.
 * This completely ignores the local computer's clock inaccuracies.
 */
export async function syncTime() {
    if (isSyncing) return;
    isSyncing = true;
    try {
        // Primary strategy: WorldTimeAPI EAT time
        const response = await fetch('http://worldtimeapi.org/api/timezone/Africa/Addis_Ababa', { cache: 'no-store' });
        if (response.ok) {
            const data = await response.json();
            const serverDate = new Date(data.utc_datetime).getTime();
            const localDate = Date.now();
            timeOffset = serverDate - localDate;
            lastSync = localDate;
            console.log(`⏱️ Time synced with WorldTimeAPI. Offset: ${timeOffset}ms`);
            isSyncing = false;
            return;
        }
    } catch (err) {
        console.warn("WorldTimeAPI failed, trying fallback time sync...");
    }
    
    // Fallback: Google Time (reading HTTP Date header)
    try {
        const t1 = Date.now();
        const response = await fetch('https://google.com', { method: 'HEAD', cache: 'no-store' });
        const dateHeader = response.headers.get('date');
        if (dateHeader) {
            const serverDate = new Date(dateHeader).getTime();
            const t2 = Date.now();
            const localDate = t1 + (t2 - t1) / 2; // RTT compensation
            timeOffset = serverDate - localDate;
            lastSync = Date.now();
            console.log(`⏱️ Time synced with Google Header. Offset: ${timeOffset}ms`);
        }
    } catch (err) {
         console.warn("Time sync failed entirely. Assuming local time is correct.", err);
    }
    isSyncing = false;
}

/**
 * Gets the current perfectly synchronized Date object.
 */
export function getSyncedTime(): Date {
    // Re-sync purely in background if it's been more than 60 minutes
    if (Date.now() - lastSync > 3600000) {
        syncTime().catch(e => console.error(e));
    }
    return new Date(Date.now() + timeOffset);
}

/**
 * Calculate Start of Today manually mapped to UTC+3 (EAT).
 * Prevents timezone/start of day errors caused by local PC timezone.
 */
export function getStartOfTodayUTC3(): Date {
    const d = getSyncedTime();
    
    // Calculate what time it is in UTC+3 (Ethiopia/East Africa Time)
    // We add 3 hours to actual absolute UTC time
    const ethiopiaTime = new Date(d.getTime() + 3 * 3600 * 1000);
    
    // Get the Year, Month, Day of UTC+3
    const year = ethiopiaTime.getUTCFullYear();
    const month = ethiopiaTime.getUTCMonth();
    const date = ethiopiaTime.getUTCDate();
    
    // Reconstruct the start of day EAT (00:00:00) mapped back to global standard UTC
    // EAT 00:00:00 is technically UTC 21:00:00 of the previous day!
    return new Date(Date.UTC(year, month, date, -3, 0, 0, 0));
}

// Kickoff initial sync immediately upon module load
syncTime().catch(e => console.error(e));
