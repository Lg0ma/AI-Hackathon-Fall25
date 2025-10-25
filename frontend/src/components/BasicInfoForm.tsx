import React, { useState } from 'react';
import './BasicInfoForm.css';

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
    <div className="form-card">
      <h1>Create Your Account</h1>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="fullName">Full Name</label>
          <input 
            type="text" 
            id="fullName" 
            value={fullName} 
            onChange={(e) => setFullName(e.target.value)} 
            required 
          />
        </div>
        <div className="form-group">
          <label htmlFor="phoneNumber">Phone Number</label>
          <input 
            type="tel" 
            id="phoneNumber" 
            value={phoneNumber} 
            onChange={(e) => setPhoneNumber(e.target.value)} 
            required 
          />
        </div>
        <div className="form-group">
          <label htmlFor="postalCode">Postal Code</label>
          <input 
            type="text" 
            id="postalCode" 
            value={postalCode} 
            onChange={(e) => setPostalCode(e.target.value)} 
            required 
          />
        </div>
        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input 
            type="password" 
            id="password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            required 
          />
        </div>
        {error && <p className="error-message">{error}</p>}
        <button type="submit">Create Account</button>
      </form>
    </div>
  );
};

export default BasicInfoForm;
