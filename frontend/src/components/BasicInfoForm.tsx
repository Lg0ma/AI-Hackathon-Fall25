import React, { useState } from 'react';

interface BasicInfoFormProps {
  onAccountCreated: (phoneNumber: string) => void;
}

const BasicInfoForm: React.FC<BasicInfoFormProps> = ({ onAccountCreated }) => {
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      const response = await fetch('http://127.0.0.1:8000/create-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          full_name: fullName, 
          phone_number: phoneNumber, 
          postal_code: postalCode, 
          password 
        }),
      });

      const data = await response.json();

      if (response.ok) {
        onAccountCreated(data.phone_number);
      } else {
        setError(data.error || 'An unexpected error occurred.');
      }
    } catch (err) {
      setError('Failed to connect to the server.');
    }
  };

  return (
    <div className='flex justify-center items-center min-h-screen'>
      <div className="bg-white p-8 rounded-2xl shadow-xl w-[90%] max-w-[500px] text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Create Your Account</h1>
        <form onSubmit={handleSubmit}>
          <div className="mb-6 text-left">
            <label 
              htmlFor="fullName" 
              className="block mb-2 font-medium text-gray-800"
              >
              Full Name
            </label>
            <input 
              type="text" 
              id="fullName" 
              value={fullName} 
              onChange={(e) => setFullName(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required 
              />
          </div>
          <div className="mb-6 text-left">
            <label 
              htmlFor="phoneNumber" 
              className="block mb-2 font-medium text-gray-800"
              >
              Phone Number
            </label>
            <input 
              type="tel" 
              id="phoneNumber" 
              value={phoneNumber} 
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required 
              />
          </div>
          <div className="mb-6 text-left">
            <label 
              htmlFor="postalCode" 
              className="block mb-2 font-medium text-gray-800"
              >
              Postal Code
            </label>
            <input 
              type="text" 
              id="postalCode" 
              value={postalCode} 
              onChange={(e) => setPostalCode(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required 
              />
          </div>
          <div className="mb-6 text-left">
            <label 
              htmlFor="password" 
              className="block mb-2 font-medium text-gray-800"
              >
              Password
            </label>
            <input 
              type="password" 
              id="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required 
              />
          </div>
          {error && (
            <p className="text-red-600 mb-4 text-sm">{error}</p>
          )}
          <button 
            type="submit"
            className="w-full py-3 px-6 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors duration-200 focus:outline-none focus:ring-4 focus:ring-blue-300"
            >
            Create Account
          </button>
        </form>
      </div>
    </div>
  );
};

export default BasicInfoForm;