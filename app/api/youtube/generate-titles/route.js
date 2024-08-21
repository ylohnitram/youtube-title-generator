import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req) {
  const { titles, topic } = await req.json();

  if (!titles || !topic) {
    return new Response(JSON.stringify({ error: 'Titles and topic are required' }), {
      status: 400,
    });
  }

  try {
    const prompt = `
      I am a YouTuber who needs to create the catchiest YouTube video-written titles to hook any reader into a viewer.
      Here are some of the most viral YouTube video titles:
      ${titles.map((title) => title.title).join('\n')}
      Now, based on these titles, create 10 catchy titles for my next video about "${topic}".
    `;

    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo',
      messages: [
        { role: 'system', content: 'You are a helpful assistant that specializes in creating catchy YouTube titles.' },
        { role: 'user', content: prompt },
      ],
      max_tokens: 150,
    });

    const generatedTitles = response.choices[0].message.content.trim().split('\n').map(title => title.trim());
    return new Response(JSON.stringify(generatedTitles), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: 'Failed to generate titles' }), {
      status: 500,
    });
  }
}
