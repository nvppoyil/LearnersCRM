const OFF = () => process.env.TZ_OFFSET || '+05:30';

function offsetMs() {
  const m = OFF().match(/([+-])(\d\d):(\d\d)/);
  const sign = m[1] === '-' ? -1 : 1;
  return sign * (Number(m[2]) * 60 + Number(m[3])) * 60000;
}

// "2026-10-30T18:30" typed by the user (local time) -> UTC ISO string
export const toUtc = (v) => new Date(v + OFF()).toISOString();

export function startOfTodayUtc() {
  const o = offsetMs();
  const local = Date.now() + o;
  return new Date(local - (local % 86400000) - o);
}
export const endOfTodayUtc = () => new Date(startOfTodayUtc().getTime() + 86400000);

export const fmt = (d) =>
  d
    ? new Date(d).toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: 'numeric',
        month: 'short',
        hour: 'numeric',
        minute: '2-digit',
      })
    : '';
