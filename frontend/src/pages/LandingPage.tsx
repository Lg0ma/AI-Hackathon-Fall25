import React from "react";

function LandingPage() {
    const createAccount = () => {
        console.log("Selected Create Account");
    };

    const loginAccount = () => {
        console.log("Selected Login Account");
    }

    return (
        <>
            <h1>Landing Page</h1>
            <button onClick={createAccount}>
                Create Account
            </button>
            <button onClick={loginAccount}>
                Login Account
            </button>
        </>
    );
}
export default LandingPage;