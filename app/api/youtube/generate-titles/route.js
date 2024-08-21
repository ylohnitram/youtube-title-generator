import { Configuration, OpenAIApi } from 'openai';

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

export async function POST(req) {
  const { titles } = await req.json();

  if (!titles) {
    return new Response(JSON.stringify({ error: 'Titles are required' }), {
      status: 400,
    });
  }

  try {
    const prompt = `
      I am a YouTuber who needs to create the catchiest YouTube video-written titles to hook any reader into a viewer.
      Here are some of the most viral YouTube video titles:
      ${titles.map((title) => title.title).join('\n')}
      Now, based on these titles, create 10 catchy titles for my next video about [your topic].
    `;

    const response = await openai.createCompletion({
      model: 'text-davinci-003',
      prompt,
      max_tokens: 150,
    });

    const generatedTitles = response.data.choices[0].text.trim().split('\n');
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
