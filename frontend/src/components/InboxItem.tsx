import React from 'react';
import { JobCard } from './JobCard';

interface InboxItemProps {
  item: {
    id: string;
    message: string;
    created_at: string;
    job_listings: {
      company: string;
      title: string;
      rate: string;
      employmentType: string;
      location: string;
      isNew?: boolean;
      companyLogo?: string;
    };
  };
}

const InboxItem: React.FC<InboxItemProps> = ({ item }) => {
  const jobCardProps = {
    title: item.job_listings.title,
    company: item.job_listings.company || 'N/A',
    rate: item.job_listings.rate || 'N/A',
    employmentType: item.job_listings.employmentType || 'N/A',
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
