import { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';

const AdminDashboard = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);

    const [organizerData, setOrganizerData] = useState({
        organizerName: '',
        email: '',
        category: 'Technical',
        contactNumber: '',
        description: '',
        website: ''
    });

    const [generatedCreds, setGeneratedCreds] = useState(null);

    useEffect(() => {
        const storedUser = JSON.parse(localStorage.getItem('user'));

        if (!storedUser || !storedUser.token) {
            navigate('/login');
        }
        else if (storedUser.role != 'admin') {
            toast.error("Access Denied : Admins Only");
            navigate('/dashboard');
        }
        else {
            setUser(storedUser);
        }
    }, [navigate]);

    const { organizerName, email, category, contactNumber, description, website } = organizerData;

    const onChange = (e) => {
        setOrganizerData({ ...organizerData, [e.target.name]: e.target.value });
    };

    const onCreateOrganizer = async (e) => {
        e.preventDefault();
        try {
            const config = {
                headers: {
                    Authorization: `Bearer ${user.token}`,
                },
            };

            const response = await axios.post(
                'http://localhost:5000/api/admin/create-organizer',
                organizerData,
                config
            );

            if (response.data) {
                toast.success('Organizer Created!');
                setGeneratedCreds(response.data.organizer);

                setOrganizerData({
                    organizerName: '',
                    email: '',
                    category: 'Technical',
                    contactNumber: '',
                    description: '',
                    website: ''
                });
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to create organizer');
        }
    };

    const logout = () => {
        localStorage.removeItem('user');
        navigate('/login');
    }

    if (!user) return <div>Loading Admin Panel...</div>

    return (
        <div className="max-w-6xl mx-auto p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">Admin Dashboard</h1>
                <button onClick={logout} className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition">
                    Logout
                </button>
            </div>

            {/* --- SECTION: CREATE ORGANIZER --- */}
            <div className="bg-white p-8 rounded-lg shadow-md max-w-2xl mx-auto my-8">
                <h2 className="text-2xl font-bold mb-2">Add New Organizer / Club</h2>
                <p className="text-gray-600 mb-6">System will auto-generate their password.</p>

                <form onSubmit={onCreateOrganizer}>
                    <div className="mb-4">
                        <label className="block mb-1 font-semibold">Organizer/Club Name</label>
                        <input type="text" name="organizerName" value={organizerName} onChange={onChange} required
                            className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div className="mb-4">
                        <label className="block mb-1 font-semibold">Category</label>
                        <select name="category" value={category} onChange={onChange}
                            className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="Technical">Technical</option>
                            <option value="Cultural">Cultural</option>
                            <option value="Sports">Sports</option>
                            <option value="Arts">Arts</option>
                        </select>
                    </div>

                    <div className="mb-4">
                        <label className="block mb-1 font-semibold">Official Email</label>
                        <input type="email" name="email" value={email} onChange={onChange} required
                            className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div className="mb-4">
                        <label className="block mb-1 font-semibold">Contact Number</label>
                        <input type="text" name="contactNumber" value={contactNumber} onChange={onChange}
                            className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div className="mb-4">
                        <label className="block mb-1 font-semibold">Description</label>
                        <textarea
                            name="description"
                            value={description}
                            onChange={onChange}
                            rows="3"
                            className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        ></textarea>
                    </div>

                    <button type="submit" className="w-full bg-green-600 text-white font-bold py-2 px-4 rounded hover:bg-green-700 transition duration-300">Create Organizer</button>
                </form>
            </div>

            {/* --- SUCCESS POPUP AREA --- */}
            {generatedCreds && (
                <div className="mt-6 p-6 bg-green-100 border border-green-200 rounded-lg text-green-800">
                    <h3 className="text-xl font-bold mb-2">✅ Success! Share these credentials with the Club:</h3>
                    <p><strong>Email:</strong> {generatedCreds.email}</p>
                    <p><strong>Password:</strong> {generatedCreds.password}</p>
                    <p className="text-sm text-gray-600 mt-2">*Admin must securely send this to the organizer.*</p>
                    <button onClick={() => setGeneratedCreds(null)} className="mt-3 px-3 py-1 bg-white border border-green-300 rounded hover:bg-green-50 text-sm">Close</button>
                </div>
            )}
        </div>
    );
};
export default AdminDashboard;
