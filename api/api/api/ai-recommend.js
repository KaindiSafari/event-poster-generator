export default async function handler(req, res) {
  const { eventName, eventDetails } = req.body;
  
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENAI_KEY}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
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
  
  const data = await response.json();
  res.status(200).json(data);
}