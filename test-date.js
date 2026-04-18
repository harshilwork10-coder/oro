const { toZonedTime, format } = require('date-fns-tz');
const timezone = 'America/Chicago';
const dateStrStart = '2026-04-18';
const d = format(new Date(${dateStrStart}T00:00:00), "yyyy-MM-dd'T'HH:mm:ssXXX", { timeZone: timezone });
console.log(d);
const parsed = new Date(d);
console.log(parsed.toISOString());
