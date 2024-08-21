'use client';

import { useState, useEffect } from 'react';

export default function VideoList({ videos }) {
  const [isOpen, setIsOpen] = useState(false);
  const [sortedVideos, setSortedVideos] = useState([]);
  const [sortOrder, setSortOrder] = useState('desc'); // Defaultně sestupně
  const [sortDirection, setSortDirection] = useState('desc');

  // Nastavení sortedVideos, když se změní videos
  useEffect(() => {
    setSortedVideos(videos);
  }, [videos]);

  // Toggle visibility of the list
  const toggleList = () => {
    setIsOpen(!isOpen);
  };

  // Sort videos by views
  const sortByViews = () => {
    const sorted = [...sortedVideos].sort((a, b) => {
      const viewsA = parseInt(a.views.replace(/,/g, '').replace(' views', ''), 10);
      const viewsB = parseInt(b.views.replace(/,/g, '').replace(' views', ''), 10);

      if (sortOrder === 'desc') {
        return viewsB - viewsA;
      } else {
        return viewsA - viewsB;
      }
    });

    setSortedVideos(sorted);
    setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc'); // Přepínání řazení
    setSortDirection(sortOrder === 'desc' ? '↑' : '↓');
  };

  return (
    <div className="container mx-auto px-4">
      <button
        className="btn btn-primary mt-4"
        onClick={toggleList}
      >
        {isOpen ? 'Hide Video List' : 'Show Video List'}
      </button>

      {isOpen && (
        <ul className="mt-4">
          {sortedVideos.map((video, index) => (
            <li key={index} className="mb-2">
              <a href={video.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                {video.title}
              </a>
              <span className="text-gray-600"> - {video.views}</span>
            </li>
          ))}
        </ul>
      )}

      <h2 className="text-xl mt-8">Video List (Sortable by Views)</h2>
      <table className="table table-zebra w-full mt-4">
        <thead>
          <tr>
            <th>Title</th>
            <th className="cursor-pointer" onClick={sortByViews}>
              Views {sortDirection}
            </th>
            <th>URL</th>
          </tr>
        </thead>
        <tbody>
          {sortedVideos.length > 0 ? (
            sortedVideos.map((video, index) => (
              <tr key={index}>
                <td>{video.title}</td>
                <td>{video.views}</td>
                <td>
                  <a href={video.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    Link
                  </a>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="3" className="text-center">No videos available</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
