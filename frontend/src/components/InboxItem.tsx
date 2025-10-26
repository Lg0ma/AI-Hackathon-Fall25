import React from 'react';
import { JobCard } from './JobCard';

interface InboxItemProps {
  item: {
    id: string;
    message: string;
    created_at: string;
    job_listings: {
      title: string;
      location: string;
      isNew?: boolean;
      companyLogo?: string;
      employer: {
        name: string;
      };
    };
  };
}

const InboxItem: React.FC<InboxItemProps> = ({ item }) => {
  const jobCardProps = {
    title: item.job_listings.title,
    company: item.job_listings.employer.name || 'N/A',
    location: item.job_listings.location || 'N/A',
  };

  return (
    <div className="p-4 border rounded-lg shadow-sm hover:shadow-md transition-shadow">
      <JobCard {...jobCardProps} />
      <div className="p-4">
        <h3 className="text-lg font-semibold mb-2">Message from the recruiter:</h3>
        <p className="text-gray-600">{item.message}</p>
      </div>
    </div>
  );
};

export default InboxItem;
