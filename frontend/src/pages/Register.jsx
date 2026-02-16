import { useState, useEffect } from 'react';
import axios from 'axios'; // The courier
import { toast } from 'react-toastify'; // The popup alerts
import { useNavigate, Link } from 'react-router-dom'; // For redirecting pages

const Register = () => {
  // 1. STATE: This holds what the user types in real-time
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: 'participant', // Default role
  });

  const [isIIIT, setIsIIIT] = useState(false);

  const navigate = useNavigate();

  // Destructure for easier access
  const { firstName, lastName, email, password, role } = formData;


  useEffect(() => {
    const iiitRegex = /^[a-zA-Z0-9._%+-]+@(students\.)?iiit\.ac\.in$/;
    setIsIIIT(iiitRegex.test(email));
  }, [email]);

  // 2. ON CHANGE: Updates the state whenever a user types
  const onChange = (e) => {
    setFormData((prevState) => ({
      ...prevState,
      [e.target.name]: e.target.value,
    }));
  };

  // 3. ON SUBMIT: The Logic Function
  const onSubmit = async (e) => {
    e.preventDefault(); // Stop the page from reloading

    try {
      // CONNECTION: This line hits your Backend Route!
      // Matches backend/routes/authRoutes.js -> router.post('/register')
      const response = await axios.post('http://localhost:5000/api/auth/register', formData);

      // If successful:
      if (response.data) {
        toast.success('Registration Successful! Please Login.');
        navigate('/login'); // Move user to Login page
      }
    } catch (error) {
      // If error (e.g., Email already exists):
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
            // style={{borderColor: isIIIT ? 'green' : '#ccc' }} 
            className={`w-full p-2 border rounded focus:outline-none focus:ring-2 ${isIIIT ? 'border-green-500 focus:ring-green-500' : 'border-gray-300 focus:ring-blue-500'}`}
          />
          {email.length > 5 && (
            <small className={`block mt-1 font-bold text-sm ${isIIIT ? 'text-green-600' : 'text-gray-500'}`}>
              {isIIIT ? '✓ IIIT Student Detected' : '• Non-IIIT Participant'}
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