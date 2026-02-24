import { useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';

const interestOptions = [
    "Coding", "Hackathons", "Robotics", "AI/ML", "Music", "Dance", "Drama", "Art", "Adventure",
    "Debate", "Literature", "Gaming", "Sports", "Photography", "Business", "Social Service"
];

const CreateEvent = () => {
    const navigate = useNavigate();

    const user = JSON.parse(localStorage.getItem('user'));
    const token = user ? user.token : null;

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        type: 'normal',
        startDate: '',
        endDate: '',
        registrationDeadline: '',
        registrationLimit: 100,
        price: 0,
        location: 'TBA',
        tags: '',
        eligibility: 'Open to All',
        stock: 0,
        purchaseLimit: 1
    });

    const [formFields, setFormFields] = useState([]);
    const [newQuestion, setNewQuestion] = useState({ label: '', fieldType: 'text', options: '', required: true });
    const [itemDetailsList, setItemDetailsList] = useState([{ key: '', options: [], newOption: '' }]);

    const { name, description, type, startDate, endDate, registrationDeadline, registrationLimit, price, location, tags, eligibility, stock, purchaseLimit } = formData;

    const addItemDetail = () => setItemDetailsList([...itemDetailsList, { key: '', options: [], newOption: '' }]);
    const removeItemDetail = (i) => setItemDetailsList(itemDetailsList.filter((_, idx) => idx !== i));
    const updateItemDetail = (i, field, val) => {
        const updated = [...itemDetailsList];
        updated[i][field] = val;
        setItemDetailsList(updated);
    };
    const addOptionToVariant = (i) => {
        const val = itemDetailsList[i].newOption.trim();
        if (!val) return;
        const updated = [...itemDetailsList];
        if (!updated[i].options.includes(val)) updated[i].options = [...updated[i].options, val];
        updated[i].newOption = '';
        setItemDetailsList(updated);
    };
    const removeOptionFromVariant = (i, opt) => {
        const updated = [...itemDetailsList];
        updated[i].options = updated[i].options.filter(o => o !== opt);
        setItemDetailsList(updated);
    };

    const onChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    const toggleTag = (tag) => {
        const current = tags.split(',').map(t => t.trim()).filter(t => t);
        if (current.includes(tag)) {
            setFormData({ ...formData, tags: current.filter(t => t !== tag).join(', ') });
        } else {
            setFormData({ ...formData, tags: [...current, tag].join(', ') });
        }
    };

    const addField = () => {
        if (!newQuestion.label) return toast.error("Question label is required");
        const field = {
            label: newQuestion.label,
            fieldType: newQuestion.fieldType,
            options: newQuestion.fieldType === 'dropdown' ? newQuestion.options.split(',').map(o => o.trim()).filter(o => o) : [],
            required: newQuestion.required
        };
        setFormFields([...formFields, field]);
        setNewQuestion({ label: '', fieldType: 'text', options: '', required: true });
    };

    const removeField = (index) => setFormFields(formFields.filter((_, i) => i !== index));

    const moveField = (index, direction) => {
        const updated = [...formFields];
        const targetIndex = index + direction;
        if (targetIndex < 0 || targetIndex >= updated.length) return;
        [updated[index], updated[targetIndex]] = [updated[targetIndex], updated[index]];
        setFormFields(updated);
    };

    const onSubmit = async (e, status) => {
        e.preventDefault();
        if (!token) return toast.error("You must be logged in.");

        if (status === 'Published') {
            if (!name || !description || !startDate || !endDate || !registrationDeadline || !eligibility) {
                return toast.error("Please fill in all required fields before publishing.");
            }
        } else {
            if (!name) return toast.error("Event name is required.");
        }

        const eventData = {
            ...formData,
            tags: tags.split(',').map(tag => tag.trim()),
            status
        };

        if (type === 'normal') eventData.formFields = formFields;

        if (type === 'merchandise') {
            const validVariants = itemDetailsList.filter(d => d.key.trim() && d.options.length > 0);
            if (validVariants.length === 0) return toast.error("Add at least one variant with options (e.g. Size: S, M, L).");
            const detailsMap = {};
            validVariants.forEach(d => { detailsMap[d.key.trim()] = d.options; });
            eventData.itemDetails = detailsMap;
        }

        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            await axios.post(import.meta.env.VITE_API_URL + '/api/events', eventData, config);
            toast.success(status === 'Published' ? 'Event published!' : 'Draft saved!');
            navigate('/dashboard');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Event creation failed');
        }
    };

    return (
        <div className="container mx-auto p-6">
            <button onClick={() => navigate(-1)} className="mb-4 flex items-center gap-1 text-blue-600 hover:underline text-sm font-semibold">
                Back
            </button>
            <div className="bg-white p-8 rounded-lg shadow-md max-w-3xl mx-auto">
                <h1 className="text-2xl font-bold mb-2 text-center">Create New Event</h1>
                <p className="text-center text-gray-500 text-sm mb-6">Save as <span className="font-bold text-yellow-600">Draft</span> to continue editing, or <span className="font-bold text-green-600">Publish</span> to make it live.</p>

                <form>
                    <div className="mb-4">
                        <label className="block text-gray-700 font-bold mb-2">Event Name</label>
                        <input type="text" name="name" value={name} onChange={onChange} className="w-full p-2 border rounded" />
                    </div>

                    <div className="mb-4">
                        <label className="block text-gray-700 font-bold mb-2">Description</label>
                        <textarea name="description" value={description} onChange={onChange} className="w-full p-2 border rounded h-24"></textarea>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="block text-gray-700 font-bold mb-2">Type</label>
                            <select name="type" value={type} onChange={onChange} className="w-full p-2 border rounded">
                                <option value="normal">Standard Event</option>
                                <option value="merchandise">Merchandise Sale</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-gray-700 font-bold mb-2">Price (INR)</label>
                            <input type="number" name="price" value={price} onChange={onChange} className="w-full p-2 border rounded" min="0" />
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 mb-4">
                        <div>
                            <label className="block text-gray-700 font-bold mb-2">Start Date</label>
                            <input type="datetime-local" name="startDate" value={startDate} onChange={onChange} className="w-full p-2 border rounded" />
                        </div>
                        <div>
                            <label className="block text-gray-700 font-bold mb-2">End Date</label>
                            <input type="datetime-local" name="endDate" value={endDate} onChange={onChange} className="w-full p-2 border rounded" />
                        </div>
                        <div>
                            <label className="block text-gray-700 font-bold mb-2">Reg. Deadline</label>
                            <input type="datetime-local" name="registrationDeadline" value={registrationDeadline} onChange={onChange} max={startDate} className="w-full p-2 border rounded" />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="block text-gray-700 font-bold mb-2">Location</label>
                            <input type="text" name="location" value={location} onChange={onChange} className="w-full p-2 border rounded" />
                        </div>
                        <div>
                            <label className="block text-gray-700 font-bold mb-2">Participant Limit</label>
                            <input type="number" name="registrationLimit" value={registrationLimit} onChange={onChange} className="w-full p-2 border rounded" />
                        </div>
                    </div>

                    <div className="mb-4">
                        <label className="block text-gray-700 font-bold mb-2">Eligibility</label>
                        <select name="eligibility" value={eligibility} onChange={onChange} className="w-full p-2 border rounded bg-white">
                            <option value="Open to All">Open to All</option>
                            <option value="IIIT Only">IIIT Students Only</option>
                        </select>
                    </div>

                    <div className="mb-6">
                        <label className="block text-gray-700 font-bold mb-2">Tags (comma separated)</label>
                        <div className="flex flex-wrap gap-2 mb-2">
                            {interestOptions.map(opt => {
                                const current = tags.split(',').map(t => t.trim()).filter(t => t);
                                const active = current.includes(opt);
                                return (
                                    <button key={opt} type="button" onClick={() => toggleTag(opt)}
                                        className={`px-3 py-1 rounded-full text-xs font-semibold border transition ${
                                            active ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'
                                        }`}>
                                        {opt}
                                    </button>
                                );
                            })}
                        </div>
                        <input type="text" name="tags" value={tags} onChange={onChange} className="w-full p-2 border rounded" placeholder="coding, fun, music" />
                    </div>

                    {type === 'merchandise' && (
                        <div className="border-t pt-6 mt-2 mb-6">
                            <h2 className="text-xl font-bold mb-4">Merchandise Details</h2>
                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label className="block text-gray-700 font-bold mb-2">Stock Quantity</label>
                                    <input type="number" name="stock" value={stock} onChange={onChange} className="w-full p-2 border rounded" min="0" />
                                </div>
                                <div>
                                    <label className="block text-gray-700 font-bold mb-2">Purchase Limit (per person)</label>
                                    <input type="number" name="purchaseLimit" value={purchaseLimit} onChange={onChange} className="w-full p-2 border rounded" min="1" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-gray-700 font-bold mb-1">Item Variants <span className="text-red-500">*</span></label>
                                <p className="text-xs text-gray-500 mb-2">Each variant becomes a required dropdown during registration.</p>
                                {itemDetailsList.map((item, i) => (
                                    <div key={i} className="mb-3 p-3 border rounded bg-gray-50">
                                        <div className="flex gap-2 mb-2">
                                            <input type="text" value={item.key} onChange={(e) => updateItemDetail(i, 'key', e.target.value)}
                                                placeholder="Variant name (e.g. Size, Color)" className="flex-1 p-2 border rounded text-sm" />
                                            {itemDetailsList.length > 1 && (
                                                <button type="button" onClick={() => removeItemDetail(i)} className="text-red-500 text-sm px-2 hover:underline">Remove</button>
                                            )}
                                        </div>
                                        <div className="flex flex-wrap gap-1 mb-2">
                                            {item.options.map(opt => (
                                                <span key={opt} className="flex items-center gap-1 bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full">
                                                    {opt}
                                                    <button type="button" onClick={() => removeOptionFromVariant(i, opt)} className="text-blue-500 hover:text-red-500 font-bold leading-none">×</button>
                                                </span>
                                            ))}
                                        </div>
                                        <div className="flex gap-2">
                                            <input type="text" value={item.newOption}
                                                onChange={(e) => updateItemDetail(i, 'newOption', e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addOptionToVariant(i))}
                                                placeholder="Add option (e.g. S, M, L) — press Enter" className="flex-1 p-1.5 border rounded text-sm" />
                                            <button type="button" onClick={() => addOptionToVariant(i)} className="bg-blue-600 text-white text-xs px-3 py-1 rounded hover:bg-blue-700">Add</button>
                                        </div>
                                    </div>
                                ))}
                                <button type="button" onClick={addItemDetail} className="text-blue-600 hover:underline text-sm mt-1">+ Add Variant</button>
                            </div>
                        </div>
                    )}

                    {type === 'normal' && (
                        <div className="border-t pt-6 mt-2">
                            <h2 className="text-xl font-bold mb-1">Custom Registration Form</h2>
                            <p className="text-sm text-gray-500 mb-4">Optional: add custom questions for participants (e.g., T-Shirt Size, GitHub ID).</p>

                            {formFields.length > 0 && (
                                <div className="mb-4 space-y-2">
                                    {formFields.map((field, index) => (
                                        <div key={index} className="flex justify-between items-center bg-gray-50 p-3 rounded border">
                                            <div className="flex items-center gap-2">
                                                <div className="flex flex-col">
                                                    <button type="button" onClick={() => moveField(index, -1)} disabled={index === 0} className={`text-xs px-1 ${index === 0 ? 'text-gray-300' : 'text-gray-500 hover:text-blue-600'}`}>▲</button>
                                                    <button type="button" onClick={() => moveField(index, 1)} disabled={index === formFields.length - 1} className={`text-xs px-1 ${index === formFields.length - 1 ? 'text-gray-300' : 'text-gray-500 hover:text-blue-600'}`}>▼</button>
                                                </div>
                                                <div>
                                                    <span className="font-bold">{field.label}</span>
                                                    <span className="text-xs text-gray-500 ml-2">({field.fieldType})</span>
                                                    {field.required ? <span className="text-red-500 text-xs ml-1">*required</span> : <span className="text-gray-400 text-xs ml-1">optional</span>}
                                                    {field.fieldType === 'dropdown' && field.options.length > 0 && (
                                                        <span className="text-xs text-gray-400 ml-2">[{field.options.join(', ')}]</span>
                                                    )}
                                                </div>
                                            </div>
                                            <button type="button" onClick={() => removeField(index)} className="text-red-500 text-sm hover:underline">Remove</button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="bg-gray-50 p-4 rounded space-y-3 border">
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="text-xs font-bold">Question</label>
                                        <input type="text" value={newQuestion.label} onChange={(e) => setNewQuestion({...newQuestion, label: e.target.value})} className="w-full p-2 border rounded" placeholder="e.g. Diet Preference" />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold">Type</label>
                                        <select value={newQuestion.fieldType} onChange={(e) => setNewQuestion({...newQuestion, fieldType: e.target.value})} className="w-full p-2 border rounded">
                                            <option value="text">Text</option>
                                            <option value="number">Number</option>
                                            <option value="dropdown">Dropdown</option>
                                            <option value="checkbox">Checkbox</option>
                                            <option value="file">File Upload</option>
                                        </select>
                                    </div>
                                </div>
                                {newQuestion.fieldType === 'dropdown' && (
                                    <div>
                                        <label className="text-xs font-bold">Options (comma separated)</label>
                                        <input type="text" value={newQuestion.options} onChange={(e) => setNewQuestion({...newQuestion, options: e.target.value})} className="w-full p-2 border rounded" placeholder="Veg, Non-Veg, Jain" />
                                    </div>
                                )}
                                <div className="flex items-center justify-between">
                                    <label className="flex items-center gap-2 text-sm">
                                        <input type="checkbox" checked={newQuestion.required} onChange={(e) => setNewQuestion({...newQuestion, required: e.target.checked})} className="rounded" />
                                        <span className="font-bold text-gray-700">Required field</span>
                                    </label>
                                    <button type="button" onClick={addField} className="bg-blue-600 text-white px-4 py-2 rounded font-bold hover:bg-blue-700">+ Add Question</button>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="mt-8 flex gap-3">
                        <button
                            type="button"
                            onClick={(e) => onSubmit(e, 'Draft')}
                            className="flex-1 bg-yellow-500 text-white font-bold py-3 rounded hover:bg-yellow-600 transition"
                        >
                            Save as Draft
                        </button>
                        <button
                            type="button"
                            onClick={(e) => onSubmit(e, 'Published')}
                            className="flex-1 bg-green-600 text-white font-bold py-3 rounded hover:bg-green-700 transition"
                        >
                            Save &amp; Publish
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateEvent;
