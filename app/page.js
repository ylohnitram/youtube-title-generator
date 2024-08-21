'use client';

import { useState } from 'react';
import VideoList from './components/VideoList'; // Ujisti se, že máš komponentu VideoList

export default function Home() {
  const [channelUrl, setChannelUrl] = useState('');
  const [topic, setTopic] = useState(''); // Nový stav pro téma
  const [titles, setTitles] = useState([]);
  const [generatedTitles, setGeneratedTitles] = useState([]);
  const [loading, setLoading] = useState(false);

  const scrapeTitles = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/youtube/scrape?channelUrl=${channelUrl}`);
      const data = await response.json();
      if (Array.isArray(data)) {
        setTitles(data);
      } else {
        setTitles([]);
      }
    } catch (error) {
      console.error('Error scraping titles:', error);
      setTitles([]);
    } finally {
      setLoading(false);
    }
  };

  const generateTitles = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/youtube/generate-titles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ titles, topic }), // Odesílání tématu s tituly
      });
      const data = await response.json();
      setGeneratedTitles(data);
    } catch (error) {
      console.error('Error generating titles:', error);
      setGeneratedTitles([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center py-10">
      <h1 className="text-4xl font-bold mb-6">YouTube Title Generator</h1>
      <div className="card w-full max-w-xl bg-white shadow-lg p-6">
        <div className="form-control mb-4">
          <label className="label">
            <span className="label-text">Enter YouTube Channel URL</span>
          </label>
          <input
            type="text"
            placeholder="https://www.youtube.com/@channelName"
            className="input input-bordered w-full"
            value={channelUrl}
            onChange={(e) => setChannelUrl(e.target.value)}
          />
        </div>
        
        <div className="form-control mb-4"> {/* Nové pole pro zadání tématu */}
          <label className="label">
            <span className="label-text">Enter Topic for the Video</span>
          </label>
          <input
            type="text"
            placeholder="e.g., How to increase sales"
            className="input input-bordered w-full"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
          />
        </div>

        <div className="flex space-x-4">
          <button
            className={`btn btn-primary ${loading ? 'loading' : ''}`}
            onClick={scrapeTitles}
            disabled={loading}
          >
            Scrape Titles
          </button>
          <button
            className={`btn btn-secondary ${loading ? 'loading' : ''}`}
            onClick={generateTitles}
            disabled={loading || titles.length === 0 || topic.trim() === ''} // Disabled pokud chybí téma nebo tituly
          >
            Generate New Titles
          </button>
        </div>
      </div>

      <div className="w-full max-w-xl mt-10">
        <h2 className="text-2xl font-bold mb-4">Scraped Titles:</h2>
        {Array.isArray(titles) && titles.length > 0 ? (
          <VideoList videos={titles} />
        ) : (
          <p>No titles available.</p>
        )}
      </div>

      <div className="w-full max-w-xl mt-10">
        <h2 className="text-2xl font-bold mb-4">Generated Titles:</h2>
        {Array.isArray(generatedTitles) && generatedTitles.length > 0 ? (
          <ul className="list-disc list-inside">
            {generatedTitles.map((title, index) => (
              <li key={index}>{title}</li>
            ))}
          </ul>
        ) : (
          <p>No titles generated.</p>
        )}
      </div>
    </div>
  );
}
