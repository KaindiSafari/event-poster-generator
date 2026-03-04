export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const { eventName, eventDetails } = req.body;
  
  if (!eventName) {
    return res.status(400).json({ error: 'Event name required' });
  }
  
  try {
    // GROQ API CALL (same format as OpenAI!)
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.1-70b-versatile', // Groq's best model
        messages: [{
          role: 'system',
          content: 'You are a professional graphic designer helping choose poster templates. Be brief and confident.'
        }, {
          role: 'user',
          content: `Event: "${eventName}"
${eventDetails ? `Details: "${eventDetails}"` : ''}

Choose ONE template and explain why in 10 words max:

Templates:
- modern: Clean, professional, corporate events, elegant
- bold: Energetic, fun, parties, celebrations, youth events
- minimal: Sophisticated, elegant, formal, high-end
- retro: Vintage, nostalgic, throwback, groovy, 70s vibes

Format: "[template] - [reason]"`
        }],
        max_tokens: 50,
        temperature: 0.7
      })
    });
    
    if (!response.ok) {
      throw new Error(`Groq API error: ${response.status}`);
    }
    
    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    console.error('Groq error:', error);
    res.status(500).json({ error: error.message });
  }
}