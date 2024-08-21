import { Configuration, OpenAIApi } from 'openai';

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

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

    const messages = [
      { role: 'system', content: 'You are a helpful assistant that specializes in creating catchy YouTube titles.' },
      { role: 'user', content: prompt },
    ];

    const response = await openai.createChatCompletion({
      model: 'gpt-4-turbo',
      messages: messages,
      max_tokens: 150,
    });

    const generatedTitles = response.data.choices[0].message.content.trim().split('\n').map(title => title.trim());
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
