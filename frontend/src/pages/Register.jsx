import { useState, useEffect } from 'react';
import axios from 'axios'; 
import { toast } from 'react-toastify';
import { useNavigate, Link } from 'react-router-dom';

const Register = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: 'participant',
    participantType: 'IIIT'
  });

  const [isIIIT, setIsIIIT] = useState(true);

  const navigate = useNavigate();

  const { firstName, lastName, email, password, role, participantType } = formData;


  useEffect(() => {
    const iiitRegex = /^[a-zA-Z0-9._%+-]+@([a-zA-Z0-9.-]+\.)?iiit\.ac\.in$/;
    if (participantType === 'IIIT') {
      setIsIIIT(iiitRegex.test(email));
    } else {
      setIsIIIT(true); 
    }
  }, [email, participantType]);

  const onChange = (e) => {
    setFormData((prevState) => ({
      ...prevState,
      [e.target.name]: e.target.value,
    }));
  };

  const onSubmit = async (e) => {
    e.preventDefault(); 

    try {
      const response = await axios.post(import.meta.env.VITE_API_URL + '/api/auth/register', formData);

      if (response.data) {
        toast.success('Registration Successful! Please Login.');
        navigate('/login'); 
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Registration failed';
      toast.error(message);
    }
  };

  return (
    <div className="bg-white p-8 rounded-lg shadow-md max-w-md mx-auto my-12">
      <h1 className="text-2xl font-bold text-center mb-6">Participant Register</h1>
      <p className="text-center mb-6 text-gray-600">
        Create your Felicity account
      </p>

      <form onSubmit={onSubmit}>
        {/* PARTICIPANT TYPE SELECTION */}
        <div className="mb-4 flex justify-center gap-4">
          <label className={`cursor-pointer px-4 py-2 rounded border ${participantType === 'IIIT' ? 'bg-blue-100 border-blue-500 text-blue-700' : 'border-gray-300'}`}>
            <input
              type="radio"
              name="participantType"
              value="IIIT"
              checked={participantType === 'IIIT'}
              onChange={onChange}
              className="hidden"
            />
            IIIT Student
          </label>
          <label className={`cursor-pointer px-4 py-2 rounded border ${participantType === 'Non-IIIT' ? 'bg-blue-100 border-blue-500 text-blue-700' : 'border-gray-300'}`}>
            <input
              type="radio"
              name="participantType"
              value="Non-IIIT"
              checked={participantType === 'Non-IIIT'}
              onChange={onChange}
              className="hidden"
            />
            Non-IIIT
          </label>
        </div>
        <div className="mb-4">
          <input
            type="text"
            name="firstName"
            value={firstName}
            placeholder="First Name"
            onChange={onChange}
            required
            className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="mb-4">
          <input
            type="text"
            name="lastName"
            value={lastName}
            placeholder="Last Name"
            onChange={onChange}
            required
            className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="mb-4">
          <input
            type="email"
            name="email"
            value={email}
            placeholder="Email Address (Use IIIT if applicable)"
            onChange={onChange}
            required
            className={`w-full p-2 border rounded focus:outline-none focus:ring-2 ${isIIIT ? 'border-green-500 focus:ring-green-500' : 'border-gray-300 focus:ring-blue-500'}`}
          />
          {email.length > 0 && participantType === 'IIIT' && (
            <small className={`block mt-1 font-bold text-sm ${isIIIT ? 'text-green-600' : 'text-red-500'}`}>
              {isIIIT ? '✓ Valid IIIT Email' : '⚠ Must be an IIIT email (@*.iiit.ac.in)'}
            </small>
          )}
          {email.length > 0 && participantType === 'Non-IIIT' && (
            <small className={`block mt-1 font-bold text-sm ${/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? 'text-green-600' : 'text-red-500'}`}>
              {/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? '✓ Valid Email' : '⚠ Enter a valid email address'}
            </small>
          )}
        </div>

        <div className="mb-4">
          <input
            type="password"
            name="password"
            value={password}
            placeholder="Password"
            onChange={onChange}
            required
            className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button type="submit" className="w-full bg-blue-600 text-white font-bold py-2 px-4 rounded hover:bg-blue-700 transition duration-300">Register</button>
      </form>

      <p className="text-center mt-4 text-gray-600">
        Already have an account? <Link to="/login" className="text-blue-500 hover:underline">Login</Link>
      </p>
    </div>
  );
};

export default Register;