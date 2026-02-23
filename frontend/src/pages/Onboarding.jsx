import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

const Onboarding = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState(1); 
    const [organizers, setOrganizers] = useState([]);

    const [selectedInterests, setSelectedInterests] = useState([]);
    const [selectedClubs, setSelectedClubs] = useState([]);

    const interestOptions = [
        "Coding", "Hackathons", "Robotics", "AI/ML", "Music", "Dance", "Drama", "Art", "Adventure",
        "Debate", "Literature", "Gaming", "Sports", "Photography", "Business", "Social Service"
    ];

    useEffect(() => {
        const fetchOrganizers = async () => {
            try {
                const res = await axios.get(import.meta.env.VITE_API_URL + '/api/auth/organizers');
                setOrganizers(res.data);
            } catch (err) {
                console.error(err);
            }
        };
        fetchOrganizers();
    }, []);

    const toggleInterest = (interest) => {
        if (selectedInterests.includes(interest)) {
            setSelectedInterests(selectedInterests.filter(i => i !== interest));
        } else {
            setSelectedInterests([...selectedInterests, interest]);
        }
    };

    const toggleClub = (clubId) => {
        if (selectedClubs.includes(clubId)) {
            setSelectedClubs(selectedClubs.filter(id => id !== clubId));
        } else {
            setSelectedClubs([...selectedClubs, clubId]);
        }
    };

    const handleFinish = async (skipped = false) => {
        const user = JSON.parse(localStorage.getItem('user'));
        if (!user) return navigate('/login');

        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            
            const payload = {
                hasCompletedOnboarding: true, 
                interests: skipped ? [] : selectedInterests,
                followedClubs: skipped ? [] : selectedClubs
            };

            const res = await axios.put(import.meta.env.VITE_API_URL + '/api/auth/profile', payload, config);
            
            // Update LocalStorage with new user data
            const updatedUser = { ...user, ...res.data }; 
            localStorage.setItem('user', JSON.stringify(updatedUser));

            toast.success("All set! Welcome to the dashboard.");
            navigate('/dashboard');
        } catch (error) {
            console.error(error);
            toast.error("Something went wrong saving your preferences.");
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
            <div className="bg-white p-8 rounded-xl shadow-2xl max-w-3xl w-full transition-all">
                
                {/* Progress Bar */}
                <div className="w-full bg-gray-200 rounded-full h-2.5 mb-8">
                    <div className="bg-blue-600 h-2.5 rounded-full transition-all duration-500" style={{ width: step === 1 ? '50%' : '100%' }}></div>
                </div>

                <h1 className="text-3xl font-extrabold text-center mb-2 text-gray-800">
                    {step === 1 ? " SELECT YOUR INTERESTS " : "CLUBS/ORGS to FOLLOW"}
                </h1>
                <p className="text-gray-500 text-center mb-8">
                    {step === 1 ? "Select topics to get personalized event recommendations." : "Follow clubs to never miss their updates."}
                </p>

                {/* --- INTERESTS --- */}
                {step === 1 && (
                    <div className="animate-fade-in">
                        <div className="flex flex-wrap gap-3 justify-center mb-10">
                            {interestOptions.map(interest => (
                                <button 
                                    key={interest}
                                    onClick={() => toggleInterest(interest)}
                                    className={`px-6 py-3 rounded-full border text-sm font-bold transition-all transform hover:scale-105
                                        ${selectedInterests.includes(interest) 
                                            ? 'bg-blue-600 border-blue-600 text-white shadow-lg' 
                                            : 'bg-white border-gray-300 text-gray-600 hover:border-blue-400 hover:text-blue-500'}`}
                                >
                                    {interest} {selectedInterests.includes(interest) && "✓"}
                                </button>
                            ))}
                        </div>
                        <div className="flex justify-between items-center border-t pt-6">
                            <button onClick={() => setStep(2)} className="text-gray-400 font-semibold hover:text-gray-600 transition">Skip for now</button>
                            <button onClick={() => setStep(2)} className="bg-blue-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-blue-700 shadow-md transition">Next Step </button>
                        </div>
                    </div>
                )}

                {/* --- CLUBS --- */}
                {step === 2 && (
                    <div className="animate-fade-in">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10 max-h-80 overflow-y-auto p-2">
                            {organizers.map(org => (
                                <div 
                                    key={org._id}
                                    onClick={() => toggleClub(org._id)}
                                    className={`p-4 rounded-xl border-2 cursor-pointer flex justify-between items-center transition-all hover:shadow-md
                                        ${selectedClubs.includes(org._id) ? 'border-green-500 bg-green-50' : 'border-gray-100 bg-white hover:border-blue-200'}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${selectedClubs.includes(org._id) ? 'bg-green-500' : 'bg-gray-300'}`}>
                                            {org.organizerName.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="font-bold text-gray-800">{org.organizerName}</p>
                                            <p className="text-xs text-gray-500 uppercase tracking-wide">{org.category}</p>
                                        </div>
                                    </div>
                                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${selectedClubs.includes(org._id) ? 'border-green-500 bg-green-500 text-white' : 'border-gray-300'}`}>
                                        {selectedClubs.includes(org._id) && "✓"}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="flex justify-between items-center border-t pt-6">
                            <button onClick={() => handleFinish(true)} className="text-gray-400 font-semibold hover:text-gray-600 transition">Skip All</button>
                            <div className="flex gap-4">
                                <button onClick={() => setStep(1)} className="text-gray-500 font-bold hover:text-gray-800">Back</button>
                                <button onClick={() => handleFinish(false)} className="bg-green-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-green-700 shadow-md transition">Finish Setup </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Onboarding;