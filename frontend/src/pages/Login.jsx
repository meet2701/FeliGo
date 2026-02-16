import { useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useNavigate, Link } from 'react-router-dom';

const Login = () => {
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });

    const navigate = useNavigate();
    const { email, password } = formData;

    const onChange = (e) => {
        setFormData((prevState) => ({
            ...prevState,
            [e.target.name]: e.target.value,
        }));
    };

    const onSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await axios.post('http://localhost:5000/api/auth/login', formData);

            if (response.data) {
                localStorage.setItem('user', JSON.stringify(response.data));
                toast.success('Login Successful!');
                if (response.data.role === 'admin') {
                    navigate('/admin');
                }
                else {
                    navigate('/dashboard');
                }
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Login Failed');
        }
    };

    return (
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md mx-auto my-12">
            <h1 className="text-2xl font-bold text-center mb-6">Login</h1>
            <p className="text-center mb-6 text-gray-600">Sign in to access Felicity</p>

            <form onSubmit={onSubmit}>
                <div className="mb-4">
                    <input
                        type="email"
                        name="email"
                        value={email}
                        placeholder="Enter your email"
                        onChange={onChange}
                        required
                        className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                <div className="mb-4">
                    <input
                        type="password"
                        name="password"
                        value={password}
                        placeholder="Enter password"
                        onChange={onChange}
                        required
                        className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                <button type="submit" className="w-full bg-blue-600 text-white font-bold py-2 px-4 rounded hover:bg-blue-700 transition duration-300">Login</button>
            </form>

            <p className="text-center mt-4 text-gray-600">
                New here? <Link to="/register" className="text-blue-500 hover:underline">Create an account</Link>
            </p>
        </div>
    );
};

export default Login;