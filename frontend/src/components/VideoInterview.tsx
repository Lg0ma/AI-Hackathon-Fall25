import { useEffect, useRef } from "react";

interface VideoInterviewProps {
    roomName?: string;
    displayName?: string;
}

declare global {
    interface Window {
        JitsiMeetExternalAPI?: any;
    }
}

const VideoInterview: React.FC<VideoInterviewProps> = ({ roomName, displayName }) => {
    const jitsiContainerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (!window.JitsiMeetExternalAPI) {
        console.error("Jitsi Meet API not loaded. Make sure external_api.js is included in index.html");
        return;
        }

        const domain = "meet.jit.si";
        const options = {
        roomName: roomName || "InterviewRoom123",
        parentNode: jitsiContainerRef.current,
        width: "100%",
        height: 600,
        userInfo: {
            displayName: displayName || "Interviewer",
        },
        configOverwrite: {
            prejoinPageEnabled: false,
        },
        interfaceConfigOverwrite: {
            TOOLBAR_BUTTONS: [
            "microphone",
            "camera",
            "hangup",
            "chat",
            "fullscreen",
            "tileview",
            ],
        },
        };

        const api = new window.JitsiMeetExternalAPI(domain, options);

        api.addEventListener("participantJoined", (event: any) => {
        console.log("Participant joined:", event.displayName);
        });

        api.addEventListener("participantLeft", (event: any) => {
        console.log("Participant left:", event.id);
        });

        return () => api.dispose();
    }, [roomName, displayName]);

    return (
        <div className="video-interview">
            <div ref={jitsiContainerRef} style={{ width: "100%", height: "600px" }} />
        </div>
    );
    };

export default VideoInterview;
