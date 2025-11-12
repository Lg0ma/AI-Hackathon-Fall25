export interface Job {
    employer_id: string;
    title: string;
    description: string;
    expected_skills: string;
    years_of_experience_required: number;
    created_at: string;
    postal_code: string;
}

export interface InboxItem {
    id: string;
    job_listings: Job;
}
