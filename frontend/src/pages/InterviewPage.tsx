import VideoInterview from "../components/VideoInterview";
import { useParams } from "react-router-dom";


const InterviewPage = () => {
    const { roomName } = useParams<{ roomName: string }>();

    return (
        <div className="w-screen h-screen m-0 p-0">
                <VideoInterview roomName={roomName || "DefaultRoom"} displayName="Ivan Armenta" />
        </div>
    );
};

export default InterviewPage;
