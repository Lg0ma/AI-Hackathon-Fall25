import React from 'react';
import InboxList from '../components/InboxList';

const Inbox: React.FC = () => {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Inbox</h1>
      <InboxList />
    </div>
  );
};

export default Inbox;
