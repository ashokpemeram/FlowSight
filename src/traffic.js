export const FALLBACK_LOCATION = {
  latitude: 44.9778,
  longitude: -93.265,
  label: 'Minneapolis, MN (default)'
};

const weatherFeatureNames = ['Clear', 'Clouds', 'Drizzle', 'Fog', 'Haze', 'Mist', 'Rain', 'Smoke', 'Snow', 'Squall', 'Thunderstorm'];
const sessionFeatureNames = ['Afternoon', 'Evening', 'Morning', 'Night'];

export function weatherDetails(code) {
  if (code === 0) return { label: 'Clear skies', glyph: '☼', feature: 'Clear' };
  if ([1, 2, 3].includes(code)) return { label: 'Cloudy', glyph: '☁', feature: 'Clouds' };
  if ([45, 48].includes(code)) return { label: 'Fog', glyph: '≋', feature: 'Fog' };
  if ([51, 53, 55, 56, 57].includes(code)) return { label: 'Drizzle', glyph: '⋰', feature: 'Drizzle' };
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return { label: 'Rain', glyph: '☂', feature: 'Rain' };
  if ([71, 73, 75, 77, 85, 86].includes(code)) return { label: 'Snow', glyph: '❄', feature: 'Snow' };
  if ([95, 96, 99].includes(code)) return { label: 'Thunderstorm', glyph: 'ϟ', feature: 'Thunderstorm' };
  return { label: 'Mixed conditions', glyph: '◌', feature: 'Clouds' };
}

export function sessionFor(hour) {
  if (hour >= 5 && hour < 12) return 'Morning';
  if (hour >= 12 && hour < 17) return 'Afternoon';
  if (hour >= 17 && hour < 21) return 'Evening';
  return 'Night';
}

function isHoliday(date) {
  const year = date.getFullYear();
  const observed = (month, day) => {
    const holiday = new Date(year, month, day);
    if (holiday.getDay() === 6) holiday.setDate(day - 1);
    if (holiday.getDay() === 0) holiday.setDate(day + 1);
    return holiday;
  };
  const nthWeekday = (month, weekday, occurrence) => {
    const holiday = new Date(year, month, 1);
    holiday.setDate(1 + ((weekday - holiday.getDay() + 7) % 7) + 7 * (occurrence - 1));
    return holiday;
  };
  const lastWeekday = (month, weekday) => {
    const holiday = new Date(year, month + 1, 0);
    holiday.setDate(holiday.getDate() - ((holiday.getDay() - weekday + 7) % 7));
    return holiday;
  };
  const sameDate = (first, second) => first.toDateString() === second.toDateString();
  const holidays = [
    observed(0, 1), observed(5, 19), observed(6, 4), observed(10, 11), observed(11, 25),
    nthWeekday(0, 1, 3), nthWeekday(1, 1, 3), lastWeekday(4, 1), nthWeekday(8, 1, 1), nthWeekday(9, 1, 2), nthWeekday(10, 4, 4)
  ];
  return holidays.some((holiday) => sameDate(date, holiday));
}

export function buildPayload(weather, now = new Date()) {
  const condition = weatherDetails(weather.weather_code);
  const session = sessionFor(now.getHours());
  const payload = {
    holiday: Number(isHoliday(now)),
    rain_1h: Number(weather.rain || 0),
    snow_1h: Number(weather.snowfall || 0),
    clouds_all: Number(weather.cloud_cover || 0),
    week: (now.getDay() + 6) % 7,
    hour: now.getHours(),
    temp_celsius: Number(weather.temperature_2m || 0),
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    day: now.getDate()
  };
  weatherFeatureNames.forEach((name) => { payload[`weather_main_${name}`] = Number(name === condition.feature); });
  sessionFeatureNames.forEach((name) => { payload[`session_${name}`] = Number(name === session); });
  return payload;
}

export function describeVolume(volume) {
  if (volume < 1200) return 'Lighter conditions expected. A good window for a smoother drive.';
  if (volume < 3000) return 'Moderate traffic expected. Allow a little extra time for your trip.';
  if (volume < 5000) return 'Busy roads ahead. Leaving early could make the journey easier.';
  return 'Heavy traffic expected. Consider an alternate route or extra travel time.';
}
