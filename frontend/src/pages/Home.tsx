import JobListingPage from "../components/JobListingPage";

function Home() {
    return <JobListingPage endpoint="/api/jobs" pageType="Home" />;
}

export default Home;
