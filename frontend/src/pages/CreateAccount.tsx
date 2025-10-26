import { useNavigate } from 'react-router-dom';
import BasicInfoForm from '../components/BasicInfoForm';

function CreateAccount() {
    const navigate = useNavigate();

    const handleAccountCreated = (phoneNumber: string) => {
        // Navigate to home page after account creation
        navigate('/home');
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center p-4">
            <BasicInfoForm onAccountCreated={handleAccountCreated} />
        </div>
    );
}

export default CreateAccount;
