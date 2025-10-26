import React from 'react';
import { X } from 'lucide-react';

interface JobCardProps {
    company: string;
    title: string;
    rate: string;
    employmentType: string;
    location: string;
    isNew?: boolean;
    companyLogo?: string;
    onBookmark?: () => void;
    onClose?: () => void;
    onClick?: () => void;
}

export const JobCard: React.FC<JobCardProps> = ({
    company,
    title,
    rate,
    employmentType,
    location,
    isNew = false,
    companyLogo,
    onBookmark,
    onClose,
    onClick,
}) => {
    return (
    <div
      onClick={onClick}
      className="bg-white text-black p-4 border-b-2 border-neutral-700 cursor-pointer hover:bg-gray-200x transition-colors"
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
        {/* Company Logo */}
        <div className="flex-shrink-0">
          {companyLogo ? (
            <img
              src={companyLogo}
              alt={`${company} logo`}
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-lg object-cover bg-neutral-800"
            />
          ) : (
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-lg bg-neutral-800 flex items-center justify-center text-xl sm:text-2xl font-bold text-white">
              {company.charAt(0)}
            </div>
          )}
        </div>

        {/* Job Details */}
        <div className="flex-1 min-w-0 w-full">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-normal text-white mb-1 truncate">
                {company}
              </h3>
              <h2 className="text-lg sm:text-xl font-semibold mb-2 truncate">
                {title}
              </h2>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Bookmark button can go here later */}
                <button
                    onClick={(e) => {
                    e.stopPropagation();
                    onClose?.();
                    }}
                    className="p-2 hover:bg-neutral-700 rounded transition-colors"
                    aria-label="Close"
                >
                    <X className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
            </div>
        </div>

          {/* Rate and Employment Type */}
          <div className="text-black text-sm sm:text-base mb-1 sm:mb-2 flex flex-wrap items-center gap-1">
            <span className="font-medium">{rate}</span>
            <span className="hidden sm:inline mx-1">•</span>
            <span>{employmentType}</span>
          </div>

          {/* Location and New Badge */}
          <div className="flex flex-wrap items-center gap-2 text-gray-400 text-sm sm:text-base">
            <span>{location}</span>
            {isNew && (
              <>
                <span className="hidden sm:inline">•</span>
                <span className="text-green-400 font-medium">New</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
