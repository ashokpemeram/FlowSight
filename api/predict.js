const predictionUrl = 'https://traffic-volume-prediction.onrender.com/predict';

module.exports = async function predict(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    response.status(405).json({ error: 'Only POST requests are allowed.' });
    return;
  }

  if (!request.body || typeof request.body !== 'object') {
    response.status(400).json({ error: 'A JSON prediction payload is required.' });
    return;
  }

  try {
    const predictionResponse = await fetch(predictionUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request.body),
      signal: AbortSignal.timeout(45_000)
    });
    const responseBody = await predictionResponse.text();

    response.setHeader(
      'Content-Type',
      predictionResponse.headers.get('content-type') || 'application/json; charset=utf-8'
    );
    response.status(predictionResponse.status).send(responseBody);
  } catch {
    response.status(502).json({
      error: 'The prediction service could not be reached. Please try again in a moment.'
    });
  }
};
