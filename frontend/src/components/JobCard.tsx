import React from 'react';
import { Bookmark, X } from 'lucide-react';

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
    onClick
    }) => {
    return (
        <div 
        className=" text-white p-4 border-b-2 border-neutral-700 cursor-pointer hover:bg-gray-200x`  transition-colors"
        onClick={onClick}
        >
        <div className="flex items-start gap-4">
            {/* Company Logo */}
            <div className="flex-shrink-0">
            {companyLogo ? (
                <img 
                src={companyLogo} 
                alt={`${company} logo`}
                className="w-16 h-16 rounded-lg object-cover bg-neutral-800"
                />
            ) : (
                <div className="w-16 h-16 rounded-lg bg-neutral-800 flex items-center justify-center text-2xl font-bold text-white">
                {company.charAt(0)}
                </div>
            )}
            </div>

            {/* Job Details */}
            <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                <h3 className="text-base font-normal text-white mb-1">
                    {company}
                </h3>
                <h2 className="text-xl font-semibold mb-2 ">
                    {title}
                </h2>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 flex-shrink-0">
                {/* <button
                    onClick={(e) => {
                    e.stopPropagation();
                    onBookmark?.();
                    }}
                    className="p-2 hover:bg-neutral-700 rounded transition-colors"
                    aria-label="Bookmark job"
                >
                    <Bookmark className="w-6 h-6" />
                </button> */}
                <button
                    onClick={(e) => {
                    e.stopPropagation();
                    onClose?.();
                    }}
                    className="p-2 hover:bg-neutral-700 rounded transition-colors"
                    aria-label="Close"
                >
                    <X className="w-6 h-6" />
                </button>
                </div>
            </div>

            {/* Rate and Employment Type */}
            <div className="text-black mb-2">
                <span className="font-medium">{rate}</span>
                <span className="mx-2">•</span>
                <span>{employmentType}</span>
            </div>

            {/* Location and New Badge */}
            <div className="flex items-center gap-2 text-black">
                <span>{location}</span>
                {isNew && (
                <>
                    <span>•</span>
                    <span className="text-green-500 font-medium">New</span>
                </>
                )}
            </div>
            </div>
        </div>
        </div>
    );
};