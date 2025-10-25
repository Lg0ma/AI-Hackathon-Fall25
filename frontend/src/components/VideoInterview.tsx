import { useEffect, useRef } from "react";

interface VideoInterviewProps {
    roomName: string;
    displayName: string;
    }

    const VideoInterview = ({ roomName, displayName }: VideoInterviewProps) => {
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (!containerRef.current) return;

        // @ts-ignore
        const domain = "meet.jit.si";
        const options = {
        roomName,
        parentNode: containerRef.current,
        width: "100%",
        height: "100%",
        userInfo: {
            displayName,
        },
        configOverwrite: {},
        interfaceConfigOverwrite: {},
        };

        // @ts-ignore
        const api = new JitsiMeetExternalAPI(domain, options);

        return () => api?.dispose();
    }, [roomName, displayName]);

    return (
        <div
        ref={containerRef}
        style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            backgroundColor: "black",
            overflow: "hidden",
            zIndex: 9999,
        }}
        />
    );
};

export default VideoInterview;
