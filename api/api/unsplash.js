export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  const { query } = req.query;
  
  if (!query) {
    return res.status(400).json({ error: 'Query parameter required' });
  }
  
  try {
    const response = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=3&orientation=squarish`,
      {
        headers: {
          'Authorization': `Client-ID ${process.env.UNSPLASH_KEY}`
        }
      }
    );
    
    if (!response.ok) {
      throw new Error(`Unsplash API error: ${response.status}`);
    }
    
    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    console.error('Unsplash error:', error);
    res.status(500).json({ error: error.message });
  }
}