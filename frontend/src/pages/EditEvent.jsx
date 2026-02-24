import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';

const EditEvent = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [participantCount, setParticipantCount] = useState(0);
    const [originalLimit, setOriginalLimit] = useState(null);
    const [originalDeadline, setOriginalDeadline] = useState(null);

    const [formData, setFormData] = useState({
        name: '', description: '', type: 'normal',
        startDate: '', endDate: '', registrationDeadline: '',
        registrationLimit: '', price: 0, location: '',
        eligibility: '', status: 'Draft', tags: '',
        stock: 0, purchaseLimit: 1
    });

    const [formFields, setFormFields] = useState([]);
    const [newQuestion, setNewQuestion] = useState({ label: '', fieldType: 'text', options: '', required: true });
    const [itemDetailsList, setItemDetailsList] = useState([{ key: '', options: [], newOption: '' }]);

    useEffect(() => { fetchEvent(); }, [id]);

    const fetchEvent = async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/events/${id}`);
            const e = res.data;
            const fmt = (d) => d ? new Date(d).toISOString().slice(0, 16) : '';
            setFormData({
                name: e.name, description: e.description, type: e.type,
                startDate: fmt(e.startDate), endDate: fmt(e.endDate),
                registrationDeadline: fmt(e.registrationDeadline),
                registrationLimit: e.registrationLimit || '',
                price: e.price, location: e.location,
                eligibility: e.eligibility, status: e.status || 'Draft',
                tags: e.tags ? e.tags.join(', ') : '',
                stock: e.stock || 0, purchaseLimit: e.purchaseLimit || 1
            });
            if (e.formFields) setFormFields(e.formFields);
            if (e.itemDetails && typeof e.itemDetails === 'object') {
                const entries = Object.entries(e.itemDetails);
                if (entries.length > 0) {
                    setItemDetailsList(entries.map(([key, value]) => ({
                        key,
                        options: Array.isArray(value) ? value : (value ? value.toString().split(',').map(o => o.trim()).filter(o => o) : []),
                        newOption: ''
                    })));
                }
            }
            setParticipantCount(e.participants ? e.participants.length : 0);
            setOriginalLimit(e.registrationLimit || null);
            setOriginalDeadline(e.registrationDeadline ? new Date(e.registrationDeadline).toISOString().slice(0, 16) : null);
            setLoading(false);
        } catch {
            toast.error("Error fetching event");
            navigate('/dashboard');
        }
    };

    const onChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    const isDraft = formData.status === 'Draft';
    const isPublished = formData.status === 'Published';
    const isLocked = ['Ongoing', 'Completed', 'Cancelled'].includes(formData.status);
    const isRegClosed = isPublished && formData.registrationDeadline && new Date(formData.registrationDeadline) < new Date();
    const formLocked = participantCount > 0;

    const addItemDetail = () => setItemDetailsList([...itemDetailsList, { key: '', options: [], newOption: '' }]);
    const removeItemDetail = (i) => setItemDetailsList(itemDetailsList.filter((_, idx) => idx !== i));
    const updateItemDetail = (i, field, val) => {
        const updated = [...itemDetailsList];
        updated[i][field] = val;
        setItemDetailsList(updated);
    };
    const addOptionToVariant = (i) => {
        const opt = itemDetailsList[i].newOption.trim();
        if (!opt || itemDetailsList[i].options.includes(opt)) return;
        const updated = [...itemDetailsList];
        updated[i].options = [...updated[i].options, opt];
        updated[i].newOption = '';
        setItemDetailsList(updated);
    };
    const removeOptionFromVariant = (i, opt) => {
        const updated = [...itemDetailsList];
        updated[i].options = updated[i].options.filter(o => o !== opt);
        setItemDetailsList(updated);
    };

    const addField = () => {
        if (formLocked) return toast.error("Form is locked — participants have already registered.");
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

    const removeField = (index) => {
        if (formLocked) return toast.error("Form is locked.");
        setFormFields(formFields.filter((_, i) => i !== index));
    };

    const moveField = (index, direction) => {
        if (formLocked) return;
        const updated = [...formFields];
        const targetIndex = index + direction;
        if (targetIndex < 0 || targetIndex >= updated.length) return;
        [updated[index], updated[targetIndex]] = [updated[targetIndex], updated[index]];
        setFormFields(updated);
    };

    const onSubmit = async (e, overrideStatus = null, action = null) => {
        e.preventDefault();
        try {
            const user = JSON.parse(localStorage.getItem('user'));
            const config = { headers: { Authorization: `Bearer ${user.token}` } };

            const payload = { ...formData, tags: formData.tags.split(',').map(t => t.trim()) };
            if (overrideStatus) payload.status = overrideStatus;
            if (action) payload.action = action;
            if (formData.type === 'normal') payload.formFields = formFields;
            if (formData.type === 'merchandise') {
                const validVariants = itemDetailsList.filter(d => d.key.trim() && d.options.length > 0);
                if (validVariants.length === 0) return toast.error("Add at least one variant with options.");
                const detailsMap = {};
                validVariants.forEach(d => { detailsMap[d.key.trim()] = d.options; });
                payload.itemDetails = detailsMap;
            }

            if (overrideStatus === 'Published') {
                if (!formData.name || !formData.description || !formData.startDate || !formData.endDate || !formData.registrationDeadline || !formData.eligibility) {
                    return toast.error("Please fill in all required fields before publishing.");
                }
            }

            if (isPublished) {
                if (originalLimit !== null && Number(formData.registrationLimit) < originalLimit) {
                    return toast.error(`Participant limit can only be increased. Current limit is ${originalLimit}.`);
                }
                if (originalDeadline !== null && formData.registrationDeadline < originalDeadline) {
                    return toast.error(`Registration deadline can only be extended, not shortened.`);
                }
            }

            await axios.put(`${import.meta.env.VITE_API_URL}/api/events/${id}`, payload, config);
            toast.success('Event updated!');
            navigate('/dashboard');
        } catch (error) {
            toast.error(error.response?.data?.message || "Update failed");
        }
    };

    const handleAction = async (action) => {
        try {
            const user = JSON.parse(localStorage.getItem('user'));
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            await axios.put(`${import.meta.env.VITE_API_URL}/api/events/${id}`, { action }, config);
            toast.success(action === 'cancel' ? 'Event cancelled.' : 'Registrations closed.');
            navigate('/dashboard');
        } catch (error) {
            toast.error(error.response?.data?.message || "Action failed");
        }
    };

    if (loading) return <div className="text-center mt-10">Loading...</div>;

    return (
        <div className="max-w-4xl mx-auto p-6 bg-white rounded shadow-md my-10">
            <button onClick={() => navigate(-1)} className="mb-4 text-blue-600 hover:underline text-sm font-semibold">
                Back
            </button>
            <h1 className="text-3xl font-bold mb-6">Edit Event</h1>

            {isPublished && !isRegClosed && (
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
                    <strong>Published Event:</strong> You can update the description, extend the deadline, or increase the participant limit.
                </div>
            )}
            {isRegClosed && (
                <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded text-sm text-orange-800">
                    <strong>Registrations Closed:</strong> The registration deadline has passed. No further edits are allowed. You may still cancel the event.
                </div>
            )}
            {isLocked && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded text-sm text-red-800">
                    <strong>{formData.status} Event:</strong> This event cannot be edited.
                </div>
            )}
            {formLocked && isDraft && (
                <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
                    <strong>{participantCount} participant(s) registered.</strong> The custom registration form is locked.
                </div>
            )}

            <form onSubmit={onSubmit}>
                {/* Current Status Display */}
                <div className="mb-6 p-3 bg-gray-100 rounded flex items-center justify-between">
                    <span className="font-bold text-gray-700">Status: <span className="ml-1 font-normal">{formData.status}</span></span>
                    {isPublished && (
                        <div className="flex gap-2">
                            {!isRegClosed && (
                                <button
                                    type="button"
                                    onClick={() => handleAction('closeRegistrations')}
                                    className="bg-yellow-500 text-white text-sm px-3 py-1 rounded hover:bg-yellow-600"
                                >
                                    Close Registrations
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={() => handleAction('cancel')}
                                className="bg-red-600 text-white text-sm px-3 py-1 rounded hover:bg-red-700"
                            >
                                Cancel Event
                            </button>
                        </div>
                    )}
                    {(formData.status === 'Ongoing') && (
                        <button
                            type="button"
                            onClick={() => handleAction('cancel')}
                            className="bg-red-600 text-white text-sm px-3 py-1 rounded hover:bg-red-700"
                        >
                            Cancel Event
                        </button>
                    )}
                </div>

                {/* Basic Details */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                        <label className="block font-bold">Event Name</label>
                        <input type="text" name="name" value={formData.name} onChange={onChange} className="w-full p-2 border rounded" disabled={isPublished || isLocked} />
                    </div>
                    <div>
                        <label className="block font-bold">Location</label>
                        <input type="text" name="location" value={formData.location} onChange={onChange} className="w-full p-2 border rounded" disabled={isPublished || isLocked} />
                    </div>
                </div>

                <div className="mb-4">
                    <label className="block font-bold">Description</label>
                    <textarea name="description" value={formData.description} onChange={onChange} className="w-full p-2 border rounded h-24" disabled={isLocked || isRegClosed}></textarea>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                        <label className="block font-bold">Type</label>
                        <select name="type" value={formData.type} onChange={onChange} className="w-full p-2 border rounded" disabled={isPublished || isLocked}>
                            <option value="normal">Standard Event</option>
                            <option value="merchandise">Merchandise Sale</option>
                        </select>
                    </div>
                    <div>
                        <label className="block font-bold">Price (INR)</label>
                        <input type="number" name="price" value={formData.price} onChange={onChange} className="w-full p-2 border rounded" min="0" disabled={isPublished || isLocked} />
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-4">
                    <div>
                        <label className="block font-bold">Start Date</label>
                        <input type="datetime-local" name="startDate" value={formData.startDate} onChange={onChange} className="w-full p-2 border rounded" disabled={isPublished || isLocked} />
                    </div>
                    <div>
                        <label className="block font-bold">End Date</label>
                        <input type="datetime-local" name="endDate" value={formData.endDate} onChange={onChange} className="w-full p-2 border rounded" disabled={isPublished || isLocked} />
                    </div>
                    <div>
                        <label className="block font-bold">
                            Reg. Deadline {isPublished && !isRegClosed && <span className="text-xs text-blue-600">(extend only)</span>}
                        </label>
                        <input type="datetime-local" name="registrationDeadline" value={formData.registrationDeadline} onChange={onChange} max={formData.startDate} className="w-full p-2 border rounded" disabled={isLocked || isRegClosed} />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                        <label className="block font-bold">Eligibility</label>
                        <select name="eligibility" value={formData.eligibility} onChange={onChange} className="w-full p-2 border rounded bg-white" disabled={isPublished || isLocked}>
                            <option value="Open to All">Open to All</option>
                            <option value="IIIT Only">IIIT Students Only</option>
                        </select>
                    </div>
                    <div>
                        <label className="block font-bold">
                            Participant Limit {isPublished && !isRegClosed && <span className="text-xs text-blue-600">(increase only)</span>}
                        </label>
                        <input type="number" name="registrationLimit" value={formData.registrationLimit} onChange={onChange} className="w-full p-2 border rounded" disabled={isLocked || isRegClosed} />
                    </div>
                </div>

                <div className="mb-6">
                    <label className="block font-bold">Tags (comma separated)</label>
                    <input type="text" name="tags" value={formData.tags} onChange={onChange} className="w-full p-2 border rounded" placeholder="coding, fun, music" disabled={isPublished || isLocked} />
                </div>

                {/* Merchandise Details */}
                {formData.type === 'merchandise' && !isLocked && (
                    <div className="mt-6 border-t pt-6">
                        <h2 className="text-xl font-bold mb-4">Merchandise Details</h2>
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block font-bold mb-1">Stock Quantity</label>
                                <input type="number" name="stock" value={formData.stock} onChange={onChange} className="w-full p-2 border rounded" min="0" disabled={isPublished} />
                            </div>
                            <div>
                                <label className="block font-bold mb-1">Purchase Limit (per person)</label>
                                <input type="number" name="purchaseLimit" value={formData.purchaseLimit} onChange={onChange} className="w-full p-2 border rounded" min="1" disabled={isPublished} />
                            </div>
                        </div>
                        <div>
                            <label className="block font-bold mb-1">Item Variants <span className="text-red-500">*</span></label>
                            <p className="text-xs text-gray-500 mb-2">Each variant becomes a required dropdown during registration.</p>
                            {itemDetailsList.map((item, i) => (
                                <div key={i} className="mb-3 border rounded p-3 bg-gray-50">
                                    <div className="flex gap-2 mb-2">
                                        <input type="text" value={item.key} onChange={(e) => updateItemDetail(i, 'key', e.target.value)} placeholder="Variant name (e.g. Size)" className="flex-1 p-2 border rounded" disabled={isPublished} />
                                        {!isPublished && itemDetailsList.length > 1 && (
                                            <button type="button" onClick={() => removeItemDetail(i)} className="text-red-500 text-sm px-2">Remove</button>
                                        )}
                                    </div>
                                    <div className="flex flex-wrap gap-1 mb-2">
                                        {item.options.map(opt => (
                                            <span key={opt} className="flex items-center gap-1 bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                                                {opt}
                                                {!isPublished && <button type="button" onClick={() => removeOptionFromVariant(i, opt)} className="text-blue-600 hover:text-red-500 font-bold leading-none">×</button>}
                                            </span>
                                        ))}
                                    </div>
                                    {!isPublished && (
                                        <div className="flex gap-2">
                                            <input type="text" value={item.newOption} onChange={(e) => updateItemDetail(i, 'newOption', e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addOptionToVariant(i); } }} placeholder="Add option, press Enter" className="flex-1 p-2 border rounded text-sm" />
                                            <button type="button" onClick={() => addOptionToVariant(i)} className="px-3 py-1 bg-blue-600 text-white rounded text-sm">Add</button>
                                        </div>
                                    )}
                                </div>
                            ))}
                            {!isPublished && (
                                <button type="button" onClick={addItemDetail} className="text-blue-600 hover:underline text-sm mt-1">+ Add Variant</button>
                            )}
                        </div>
                    </div>
                )}

                {/* Custom Form Builder */}
                {formData.type === 'normal' && !isLocked && (
                    <div className="mt-6 border-t pt-6">
                        <div className="flex justify-between items-center mb-4">
                            <div>
                                <h2 className="text-xl font-bold">Custom Registration Form</h2>
                                <p className="text-sm text-gray-500">Add questions for participants (e.g., T-Shirt Size, GitHub ID).</p>
                            </div>
                            {formLocked && (
                                <span className="text-xs bg-red-100 text-red-700 px-3 py-1 rounded-full font-bold border border-red-200">Locked</span>
                            )}
                        </div>

                        {formFields.length > 0 && (
                            <div className="mb-4 space-y-2">
                                {formFields.map((field, index) => (
                                    <div key={index} className="flex justify-between items-center bg-gray-50 p-3 rounded border">
                                        <div className="flex items-center gap-2">
                                            {!formLocked && (
                                                <div className="flex flex-col">
                                                    <button type="button" onClick={() => moveField(index, -1)} disabled={index === 0} className={`text-xs px-1 ${index === 0 ? 'text-gray-300' : 'text-gray-500 hover:text-blue-600'}`}>▲</button>
                                                    <button type="button" onClick={() => moveField(index, 1)} disabled={index === formFields.length - 1} className={`text-xs px-1 ${index === formFields.length - 1 ? 'text-gray-300' : 'text-gray-500 hover:text-blue-600'}`}>▼</button>
                                                </div>
                                            )}
                                            <div>
                                                <span className="font-bold">{field.label}</span>
                                                <span className="text-xs text-gray-500 ml-2">({field.fieldType})</span>
                                                {field.required ? <span className="text-red-500 text-xs ml-1">*required</span> : <span className="text-gray-400 text-xs ml-1">optional</span>}
                                                {field.fieldType === 'dropdown' && field.options && field.options.length > 0 && (
                                                    <span className="text-xs text-gray-400 ml-2">[{field.options.join(', ')}]</span>
                                                )}
                                            </div>
                                        </div>
                                        {!formLocked && (
                                            <button type="button" onClick={() => removeField(index)} className="text-red-500 text-sm hover:underline">Remove</button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        {!formLocked && (
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
                        )}
                    </div>
                )}

                {/* Submit Buttons */}
                {!isLocked && !isRegClosed && (
                    <div className="mt-8 flex gap-3">
                        {isDraft && (
                            <>
                                <button type="submit" className="flex-1 bg-yellow-500 text-white font-bold py-3 rounded hover:bg-yellow-600 transition">
                                    Save Draft
                                </button>
                                <button type="button" onClick={(e) => onSubmit(e, 'Published')} className="flex-1 bg-green-600 text-white font-bold py-3 rounded hover:bg-green-700 transition">
                                    Save &amp; Publish
                                </button>
                            </>
                        )}
                        {isPublished && (
                            <button type="submit" className="flex-1 bg-blue-600 text-white font-bold py-3 rounded hover:bg-blue-700 transition">
                                Update Event
                            </button>
                        )}
                    </div>
                )}
            </form>
        </div>
    );
};

export default EditEvent;
