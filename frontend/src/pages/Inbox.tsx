import JobListingPage from "../components/JobListingPage";

function Inbox() {
    const description = "This inbox contains job listings that are a good fit for you based on your skills and experience.";
    return <JobListingPage endpoint="/inbox" pageType="Inbox" description={description} />;
}

export default Inbox;
