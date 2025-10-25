import { useNavigate } from "react-router-dom";

function Home() {
    const navigate = useNavigate();

    const goProfile = () => {
        console.log("Hello");
    }

    return (
        <>
        <nav className="flex justify-between bg-blue-800 py-5 text-white px-15">
            <div className="flex items-center text-5xl">
                Home
            </div>
            <div>
                <img 
                    onClick={goProfile}
                    src="/professional_pic.jpeg" 
                    alt="User Profile" 
                    className="w-16 h-16 rounded-full object-cover shadow-lg border-2 border-white"
                />

            </div>
        </nav>
        <div className="min-h-screen flex">
            {/* Jobs on the left side */}
            <div className="border-r-2 border-black grow-2 p-4">
                hob
            </div>
            {/* Single job page on the right */}
            <div className="grow-4">
                job
            </div>
        </div>
        </>
    );
}

export default Home;