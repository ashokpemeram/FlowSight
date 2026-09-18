import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { buildPayload, describeVolume, FALLBACK_LOCATION, sessionFor, weatherDetails } from './traffic';

const weatherClient = axios.create({ baseURL: 'https://api.open-meteo.com/v1' });
const predictionClient = axios.create({ baseURL: '/api' });

function formatError(error, fallback) {
  return error.response?.data?.error || fallback;
}

function PredictionCard({ canPredict, isPredicting, note, prediction, onPredict, timestamp }) {
  return (
    <article className="prediction-card">
      <div className="card-heading">
        <div><p className="section-label">Expected road volume</p><p className="timestamp">{timestamp}</p></div>
        <span className="road-icon" aria-hidden="true">⌁</span>
      </div>
      <div className="result" aria-live="polite" aria-atomic="true">
        <span className="result-number">{prediction === null ? '—' : new Intl.NumberFormat().format(prediction)}</span>
        <span className="result-unit">vehicles</span>
      </div>
      <p className="result-summary">{prediction === null ? 'We’ll calculate a forecast as soon as the local conditions arrive.' : describeVolume(prediction)}</p>
      <div className="traffic-meter" aria-hidden="true"><span className="meter-line"></span><span className="meter-line"></span><span className="meter-line"></span><span className="meter-line"></span><span className="meter-line"></span></div>
      <button className="primary-button" type="button" disabled={!canPredict || isPredicting} onClick={onPredict}>
        <span>{isPredicting ? 'Calculating forecast…' : prediction === null ? 'Get traffic forecast' : 'Refresh traffic forecast'}</span><span className="button-arrow" aria-hidden="true">→</span>
      </button>
      <p className="request-note">{note}</p>
    </article>
  );
}

function ConditionsCard({ location, weather, isLoading, onLocate, payload }) {
  const detail = weather ? weatherDetails(weather.weather_code) : null;
  return (
    <article className="conditions-card">
      <div className="card-heading">
        <div><p className="section-label">Conditions used</p><p className="location">{location.label}</p></div>
        <button className="location-button" type="button" onClick={onLocate} title="Use my current location" aria-label="Use my current location">⌖</button>
      </div>
      <div className="weather-main">
        <div className="weather-glyph" aria-hidden="true">{detail?.glyph || '☼'}</div>
        <div><strong>{weather ? `${Math.round(weather.temperature_2m)}°` : '—°'}</strong><span>{isLoading ? 'Loading weather' : detail?.label || 'Weather unavailable'}</span></div>
      </div>
      <dl className="conditions-grid">
        <div><dt>Cloud cover</dt><dd>{weather ? `${Number(weather.cloud_cover || 0).toFixed(0)}%` : '—'}</dd></div>
        <div><dt>Rain, last hour</dt><dd>{weather ? `${Number(weather.rain || 0).toFixed(1)} mm` : '—'}</dd></div>
        <div><dt>Snow, last hour</dt><dd>{weather ? `${Number(weather.snowfall || 0).toFixed(1)} mm` : '—'}</dd></div>
        <div><dt>Day context</dt><dd>{payload ? (payload.holiday ? 'Public holiday' : `${sessionFor(payload.hour)} · weekday ${payload.week + 1}`) : '—'}</dd></div>
      </dl>
      <div className="data-source"><span></span> Weather data supplied by Open-Meteo</div>
    </article>
  );
}

export default function App() {
  const [location, setLocation] = useState(FALLBACK_LOCATION);
  const [weather, setWeather] = useState(null);
  const [isLoadingWeather, setIsLoadingWeather] = useState(true);
  const [isPredicting, setIsPredicting] = useState(false);
  const [prediction, setPrediction] = useState(null);
  const [note, setNote] = useState('Fetching current weather…');

  const loadWeather = useCallback(async (targetLocation, announceReady = true) => {
    setIsLoadingWeather(true);
    try {
      const { data } = await weatherClient.get('/forecast', {
        params: { latitude: targetLocation.latitude, longitude: targetLocation.longitude, current: 'temperature_2m,rain,snowfall,cloud_cover,weather_code', timezone: 'auto' }
      });
      if (!data.current) throw new Error('Weather data was unavailable.');
      setWeather(data.current);
      if (announceReady) setNote('Conditions ready — forecast is one click away.');
      return data.current;
    } catch (error) {
      setWeather(null);
      setNote(formatError(error, 'Unable to load weather. Check your connection and try again.'));
      return null;
    } finally {
      setIsLoadingWeather(false);
    }
  }, []);

  useEffect(() => { loadWeather(FALLBACK_LOCATION); }, [loadWeather]);

  const payload = useMemo(() => weather ? buildPayload(weather) : null, [weather]);
  const timestamp = useMemo(() => {
    if (!weather) return 'Preparing live data…';
    return `Updated ${new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date())}`;
  }, [weather]);

  async function predict() {
    setIsPredicting(true);
    setNote('Weather refreshed. Asking the traffic model…');
    const freshWeather = await loadWeather(location, false);
    if (!freshWeather) { setIsPredicting(false); return; }
    try {
      const sentPayload = buildPayload(freshWeather);
      const { data } = await predictionClient.post('/predict', sentPayload);
      if (typeof data.prediction !== 'number') throw new Error('The traffic model did not return a prediction.');
      setPrediction(Math.round(data.prediction));
      console.log('Traffic prediction input attributes:', sentPayload);
      setNote(`Live model response · ${data.unit || 'Vehicles'}`);
    } catch (error) {
      setNote(formatError(error, 'The forecast could not be generated. Please try again.'));
    } finally {
      setIsPredicting(false);
    }
  }

  function useCurrentLocation() {
    if (!navigator.geolocation) { setLocation(FALLBACK_LOCATION); loadWeather(FALLBACK_LOCATION); return; }
    setLocation((current) => ({ ...current, label: 'Requesting location permission…' }));
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const nextLocation = { latitude: coords.latitude, longitude: coords.longitude, label: 'Your current location' };
        console.log('Location being used:', nextLocation);
        setLocation(nextLocation);
        loadWeather(nextLocation);
      },
      () => { setLocation(FALLBACK_LOCATION); loadWeather(FALLBACK_LOCATION); },
      { enableHighAccuracy: false, maximumAge: 300_000, timeout: 10_000 }
    );
  }

  return (
    <main className="shell">
      <nav className="topbar" aria-label="Main navigation"><a className="brand" href="#top" aria-label="FlowSight home"><span className="brand-mark" aria-hidden="true"><i></i><i></i><i></i></span><span>Flow<span>Sight</span></span></a><div className="live-status"><span></span> Live conditions</div></nav>
      <section className="hero" id="top" aria-labelledby="page-title"><p className="eyebrow">Traffic intelligence / live forecast</p><h1 id="page-title">Know the road<br /><em>before</em> you’re on it.</h1><p className="intro">A real-time estimate of traffic volume, shaped by current local weather and the exact moment you check.</p></section>
      <section className="dashboard" aria-label="Traffic prediction dashboard"><PredictionCard canPredict={Boolean(weather)} isPredicting={isPredicting} note={note} prediction={prediction} onPredict={predict} timestamp={timestamp} /><ConditionsCard location={location} weather={weather} isLoading={isLoadingWeather} onLocate={useCurrentLocation} payload={payload} /></section>
      <section className="details" aria-label="Forecast details"><div className="detail-item"><span>Model inputs</span><strong>25 signals</strong></div><div className="detail-item"><span>Time source</span><strong>Your device</strong></div><div className="detail-item"><span>Forecast unit</span><strong>Vehicles</strong></div></section>
      <p className="footer-note">Weather is refreshed whenever you request a forecast. Your location stays in your browser.</p>
    </main>
  );
}
