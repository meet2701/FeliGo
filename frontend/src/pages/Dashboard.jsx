import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);

    useEffect(() => {
        // Check if user is logged in
        const storedUser = localStorage.getItem('user');
        if (!storedUser) {
            navigate('/login'); // Kick them out if no token
        } else {
            setUser(JSON.parse(storedUser));
        }
    }, [navigate]);

    const logout = () => {
        localStorage.removeItem('user');
        navigate('/login');
    };

    if (!user) return <div>Loading...</div>;

    if (user.role === 'organizer') {
        return (
            <div>
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold">Welcome, {user.name}!</h1>
                    <button onClick={logout} className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition">
                        Logout
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition cursor-pointer text-center"
                        onClick={() => alert("We will build 'Create Event' next!")}>
                        <h2 className="text-xl font-bold text-blue-500 mb-2">📅 Create New Event</h2>
                        <p className="text-gray-600">Launch a new event for students.</p>
                    </div>

                    <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition cursor-pointer text-center"
                        onClick={() => alert("Analytics coming soon!")}>
                        <h2 className="text-xl font-bold text-green-500 mb-2">📊 View Analytics</h2>
                        <p className="text-gray-600">Track registrations and revenue.</p>
                    </div>
                </div>

                <h3 className="text-2xl font-bold mt-10 mb-4">Your Upcoming Events</h3>
                <p className="text-gray-600">No events created yet.</p>
            </div>
        );
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold">Welcome, {user.name}!</h1>
                <button onClick={logout} className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition">
                    Logout
                </button>
            </div>

            <p className="mb-4"><strong>Role:</strong> Participant</p>

            <div className="bg-white p-6 rounded-lg shadow-md my-6">
                <h3 className="text-xl font-bold mb-2">My Events</h3>
                <p className="text-gray-600">You haven't registered for any events yet.</p>
            </div>
        </div>
    );
};

export default Dashboard;