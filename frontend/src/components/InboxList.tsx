import React, { useState, useEffect } from 'react';
import InboxItem from './InboxItem';

const InboxList: React.FC = () => {
  const [inboxData, setInboxData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInboxData = async () => {
      try {
        const response = await fetch('http://localhost:8000/inbox');
        if (!response.ok) {
          throw new Error('Failed to fetch inbox data');
        }
        const data = await response.json();
        setInboxData(data);
      } catch (error) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchInboxData();
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div className="space-y-4">
      {inboxData.map((item) => (
        <InboxItem key={item.id} item={item} />
      ))}
    </div>
  );
};

export default InboxList;
