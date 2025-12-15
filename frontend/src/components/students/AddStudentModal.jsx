import { useState, useEffect } from 'react';
import { X, Upload, User, ChevronDown, ChevronUp } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';

const SEMESTER_OPTIONS = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th'];
const BLOOD_GROUP_OPTIONS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];
const GROUP_OPTIONS = ['Science', 'Commerce', 'Arts'];
const BOARD_OPTIONS = [
  { value: 'dhaka', label: 'Dhaka' },
  { value: 'chittagong', label: 'Chittagong' },
  { value: 'rajshahi', label: 'Rajshahi' },
  { value: 'comilla', label: 'Comilla' },
  { value: 'jessore', label: 'Jessore' },
  { value: 'sylhet', label: 'Sylhet' },
  { value: 'dinajpur', label: 'Dinajpur' },
  { value: 'barishal', label: 'Barishal' },
  { value: 'mymensingh', label: 'Mymensingh' },
  { value: 'technical', label: 'Technical' },
  { value: 'madrasah', label: 'Madrasah' },
];
const COURSE_OPTIONS = [
  { value: 'BBA', label: 'BBA' },
  { value: 'MBA', label: 'MBA' },
  { value: 'CSE', label: 'CSE' },
  { value: 'THM', label: 'THM' },
];
const INTAKE_OPTIONS = {
  BBA: ['15th', '16th', '17th', '18th', '19th', '20th'],
  MBA: ['9th', '10th'],
  CSE: ['1st', '2nd'],
  THM: ['1st'],
};

const SectionHeader = ({ title, section, required = false, expanded, onToggle }) => (
  <button
    type="button"
    onClick={() => onToggle(section)}
    className="w-full flex items-center justify-between py-3 text-left"
  >
    <h3 className="text-lg font-semibold text-gray-900">
      {title} {required && <span className="text-red-500">*</span>}
    </h3>
    {expanded ? (
      <ChevronUp className="w-5 h-5 text-gray-500" />
    ) : (
      <ChevronDown className="w-5 h-5 text-gray-500" />
    )}
  </button>
);

const InputField = ({ label, name, type = 'text', required = false, value, onChange, ...props }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <input
      type={type}
      name={name}
      value={value}
      onChange={onChange}
      required={required}
      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      {...props}
    />
  </div>
);

const SelectField = ({ label, name, options, required = false, placeholder = 'Select...', value, onChange }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <select
      name={name}
      value={value}
      onChange={onChange}
      required={required}
      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
    >
      <option value="">{placeholder}</option>
      {options.map(opt => (
        <option key={opt.value || opt} value={opt.value || opt}>
          {opt.label || opt}
        </option>
      ))}
    </select>
  </div>
);

const AddStudentModal = ({ onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    // Account info
    username: '',
    email: '',
    password: '',
    full_name: '',
    phone_number: '',
    // New fields
    registration_number: '',
    major: '',
    national_university_id: '',
    national_id_number: '',
    course: '',
    intake: '',
    // Basic student info
    date_of_birth: '',
    blood_group: '',
    // Academic info
    session: '',
    semester: '',
    admission_date: new Date().toISOString().split('T')[0],
    // Family info
    father_name: '',
    father_phone: '',
    mother_name: '',
    mother_phone: '',
    guardian_name: '',
    guardian_phone: '',
    guardian_yearly_income: '',
    guardian_occupation: '',
    // Present address
    present_house_no: '',
    present_road_vill: '',
    present_police_station: '',
    present_post_office: '',
    present_district: '',
    present_division: '',
    // Permanent address
    permanent_house_no: '',
    permanent_road_vill: '',
    permanent_police_station: '',
    permanent_post_office: '',
    permanent_district: '',
    permanent_division: '',
    // SSC info
    ssc_school: '',
    ssc_passing_year: '',
    ssc_group: '',
    ssc_4th_subject: '',
    ssc_gpa: '',
    ssc_board: '',
    // HSC info
    hsc_college: '',
    hsc_passing_year: '',
    hsc_group: '',
    hsc_4th_subject: '',
    hsc_gpa: '',
    hsc_board: '',
    // Other
    other_info: '',
  });
  const [majorOptions, setMajorOptions] = useState([]);
  const [loadingMajors, setLoadingMajors] = useState(false);
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    account: true,
    personal: true,
    academic: true,
    family: true,
    presentAddress: false,
    permanentAddress: false,
    ssc: false,
    hsc: false,
    other: false,
  });

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Check if major selection should be shown
  const shouldShowMajor = () => {
    const { course, semester } = formData;
    if (course === 'BBA' && ['7th', '8th'].includes(semester)) return true;
    if (course === 'MBA' && semester === '2nd') return true;
    return false;
  };

  // Fetch major options when course changes or becomes eligible
  useEffect(() => {
    const { course, semester } = formData;
    const needsMajor = (course === 'BBA' && ['7th', '8th'].includes(semester)) ||
                       (course === 'MBA' && semester === '2nd');
    
    const fetchMajors = async () => {
      if (!needsMajor) {
        setMajorOptions([]);
        return;
      }
      
      setLoadingMajors(true);
      try {
        const response = await api.get('/academics/majors/by_course/', {
          params: { course }
        });
        setMajorOptions(response.data || []);
      } catch (error) {
        console.error('Error fetching majors:', error);
        setMajorOptions([]);
      } finally {
        setLoadingMajors(false);
      }
    };
    
    fetchMajors();
    
    // Clear major if no longer eligible
    if (!needsMajor && formData.major) {
      setFormData(prev => ({ ...prev, major: '' }));
    }
  }, [formData.course, formData.semester]); // eslint-disable-line react-hooks/exhaustive-deps
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Check file size (max 2MB for Vercel serverless)
      const maxSize = 2 * 1024 * 1024; // 2MB
      if (file.size > maxSize) {
        toast.error(`Image too large (${(file.size / 1024 / 1024).toFixed(2)}MB). Maximum size is 2MB.`);
        e.target.value = ''; // Reset input
        return;
      }
      
      setPhoto(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const validateForm = () => {
    const errors = [];
    if (!formData.username.trim()) errors.push('College ID is required');
    if (!formData.password.trim()) errors.push('Password is required');
    if (!formData.full_name.trim()) errors.push('Full Name is required');
    if (!formData.date_of_birth) errors.push('Date of Birth is required');
    if (!formData.course) errors.push('Course is required');
    if (!formData.intake) errors.push('Intake is required');
    if (!formData.session.trim()) errors.push('Session is required');
    if (!formData.semester) errors.push('Semester is required');
    if (!formData.admission_date) errors.push('Admission Date is required');
    return errors;
  };

  const handleCourseChange = (e) => {
    const { value } = e.target;
    setFormData(prev => ({ ...prev, course: value, intake: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form and show errors as toast
    const validationErrors = validateForm();
    if (validationErrors.length > 0) {
      validationErrors.forEach(err => toast.error(err));
      return;
    }
    
    setLoading(true);

    try {
      const formDataToSend = new FormData();
      
      // Numeric fields that should be sent as null if empty
      const numericFields = ['ssc_passing_year', 'hsc_passing_year', 'guardian_yearly_income', 'ssc_gpa', 'hsc_gpa'];
      
      // Add all form fields (skip empty optional fields, but handle numeric fields specially)
      Object.keys(formData).forEach(key => {
        const value = formData[key];
        if (numericFields.includes(key)) {
          // For numeric fields, only append if there's a value
          if (value !== '' && value !== null && value !== undefined) {
            formDataToSend.append(key, value);
          }
        } else if (value !== '' && value !== null) {
          formDataToSend.append(key, value);
        }
      });
      
      if (photo) {
        formDataToSend.append('photo', photo);
      }

      await api.post('/accounts/students/', formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      toast.success('Student added successfully!');
      onSuccess();
    } catch (error) {
      console.error('Error adding student:', error);
      // Handle specific HTTP errors
      if (error.response?.status === 413) {
        toast.error('Image file is too large. Please use an image smaller than 2MB.');
      } else if (error.message?.includes('Network Error') || !error.response) {
        toast.error('Network error. If uploading an image, try a smaller file (under 2MB).');
      } else {
        // Parse and display errors as toast
        const errorData = error.response?.data;
        if (errorData && typeof errorData === 'object') {
          // Handle field-specific errors
          Object.entries(errorData).forEach(([field, messages]) => {
            const fieldName = field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            if (Array.isArray(messages)) {
              messages.forEach(msg => toast.error(`${fieldName}: ${msg}`));
            } else {
              toast.error(`${fieldName}: ${messages}`);
            }
          });
        } else {
          toast.error(error.response?.data?.detail || 'Failed to add student. Please try again.');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Add New Student</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Photo Upload */}
          <div className="flex justify-center pb-4">
            <div className="relative">
              {photoPreview ? (
                <img src={photoPreview} alt="Preview" className="w-24 h-24 rounded-full object-cover border-4 border-blue-500" />
              ) : (
                <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center border-4 border-gray-300">
                  <User className="w-12 h-12 text-gray-400" />
                </div>
              )}
              <label className="absolute bottom-0 right-0 p-2 bg-blue-600 text-white rounded-full cursor-pointer hover:bg-blue-700">
                <Upload className="w-4 h-4" />
                <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
              </label>
            </div>
          </div>

          {/* Account Information */}
          <div className="border border-gray-200 rounded-lg">
            <SectionHeader
              title="Account Information"
              section="account"
              required
              expanded={expandedSections.account}
              onToggle={toggleSection}
            />
            {expandedSections.account && (
              <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                <InputField label="College ID" name="username" required value={formData.username} onChange={handleChange} />
                <InputField label="Email" name="email" type="email" value={formData.email} onChange={handleChange} />
                <InputField label="Password" name="password" type="password" required value={formData.password} onChange={handleChange} />
              </div>
            )}
          </div>

          {/* Personal Information */}
          <div className="border border-gray-200 rounded-lg">
            <SectionHeader
              title="Personal Information"
              section="personal"
              required
              expanded={expandedSections.personal}
              onToggle={toggleSection}
            />
            {expandedSections.personal && (
              <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                <InputField label="Full Name" name="full_name" required value={formData.full_name} onChange={handleChange} />
                <InputField label="Phone (WhatsApp)" name="phone_number" type="tel" value={formData.phone_number} onChange={handleChange} />
                <InputField label="Date of Birth" name="date_of_birth" type="date" required value={formData.date_of_birth} onChange={handleChange} />
                <SelectField label="Blood Group" name="blood_group" options={BLOOD_GROUP_OPTIONS} value={formData.blood_group} onChange={handleChange} />
                <InputField label="National ID Number" name="national_id_number" value={formData.national_id_number} onChange={handleChange} placeholder="Optional" />
              </div>
            )}
          </div>

          {/* Academic Information */}
          <div className="border border-gray-200 rounded-lg">
            <SectionHeader
              title="Academic Information"
              section="academic"
              required
              expanded={expandedSections.academic}
              onToggle={toggleSection}
            />
            {expandedSections.academic && (
              <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                <SelectField 
                  label="Course" 
                  name="course" 
                  required
                  options={COURSE_OPTIONS}
                  value={formData.course}
                  onChange={handleCourseChange}
                  placeholder="Select Course"
                />
                <SelectField 
                  label="Intake" 
                  name="intake" 
                  required
                  options={formData.course ? INTAKE_OPTIONS[formData.course] || [] : []}
                  value={formData.intake}
                  onChange={handleChange}
                  placeholder="Select Intake"
                />
                <InputField label="Session" name="session" required placeholder="e.g., 2024-2025" value={formData.session} onChange={handleChange} />
                <SelectField label="Semester" name="semester" required options={SEMESTER_OPTIONS} value={formData.semester} onChange={handleChange} placeholder="Select Semester" />
                <InputField label="Admission Date" name="admission_date" type="date" required value={formData.admission_date} onChange={handleChange} />
                <InputField label="Registration Number" name="registration_number" value={formData.registration_number} onChange={handleChange} />
                <InputField label="National University ID" name="national_university_id" value={formData.national_university_id} onChange={handleChange} />
                
                {/* Major Selection - Only for BBA (7th/8th sem) and MBA (2nd sem) */}
                {shouldShowMajor() && (
                  <div className="md:col-span-3">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <label className="block text-sm font-medium text-blue-800 mb-2">
                        Major Specialization <span className="text-red-500">*</span>
                        <span className="text-xs font-normal text-blue-600 ml-2">
                          (Required for {formData.course} students in {formData.semester} semester)
                        </span>
                      </label>
                      {loadingMajors ? (
                        <div className="text-sm text-gray-500">Loading majors...</div>
                      ) : (
                        <select
                          name="major"
                          value={formData.major}
                          onChange={handleChange}
                          required
                          className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                        >
                          <option value="">Select Major Specialization</option>
                          {majorOptions.map(major => (
                            <option key={major.id} value={major.id}>
                              {major.name}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Family Information */}
          <div className="border border-gray-200 rounded-lg">
            <SectionHeader
              title="Family Information"
              section="family"
              expanded={expandedSections.family}
              onToggle={toggleSection}
            />
            {expandedSections.family && (
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <InputField label="Father's Name" name="father_name" value={formData.father_name} onChange={handleChange} />
                <InputField label="Father's Phone (WhatsApp)" name="father_phone" type="tel" value={formData.father_phone} onChange={handleChange} />
                <InputField label="Mother's Name" name="mother_name" value={formData.mother_name} onChange={handleChange} />
                <InputField label="Mother's Phone (WhatsApp)" name="mother_phone" type="tel" value={formData.mother_phone} onChange={handleChange} />
                <InputField label="Guardian's Name" name="guardian_name" value={formData.guardian_name} onChange={handleChange} />
                <InputField label="Guardian's Phone (WhatsApp)" name="guardian_phone" type="tel" value={formData.guardian_phone} onChange={handleChange} />
                <InputField label="Guardian's Yearly Income" name="guardian_yearly_income" type="number" value={formData.guardian_yearly_income} onChange={handleChange} />
                <InputField label="Guardian's Occupation" name="guardian_occupation" value={formData.guardian_occupation} onChange={handleChange} />
              </div>
            )}
          </div>

          {/* Present Address */}
          <div className="border border-gray-200 rounded-lg">
            <SectionHeader
              title="Present Address"
              section="presentAddress"
              expanded={expandedSections.presentAddress}
              onToggle={toggleSection}
            />
            {expandedSections.presentAddress && (
              <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                <InputField label="House No" name="present_house_no" value={formData.present_house_no} onChange={handleChange} />
                <InputField label="Road / Village" name="present_road_vill" value={formData.present_road_vill} onChange={handleChange} />
                <InputField label="Police Station" name="present_police_station" value={formData.present_police_station} onChange={handleChange} />
                <InputField label="Post Office" name="present_post_office" value={formData.present_post_office} onChange={handleChange} />
                <InputField label="District" name="present_district" value={formData.present_district} onChange={handleChange} />
                <InputField label="Division" name="present_division" value={formData.present_division} onChange={handleChange} />
              </div>
            )}
          </div>

          {/* Permanent Address */}
          <div className="border border-gray-200 rounded-lg">
            <SectionHeader
              title="Permanent Address"
              section="permanentAddress"
              expanded={expandedSections.permanentAddress}
              onToggle={toggleSection}
            />
            {expandedSections.permanentAddress && (
              <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                <InputField label="House No" name="permanent_house_no" value={formData.permanent_house_no} onChange={handleChange} />
                <InputField label="Road / Village" name="permanent_road_vill" value={formData.permanent_road_vill} onChange={handleChange} />
                <InputField label="Police Station" name="permanent_police_station" value={formData.permanent_police_station} onChange={handleChange} />
                <InputField label="Post Office" name="permanent_post_office" value={formData.permanent_post_office} onChange={handleChange} />
                <InputField label="District" name="permanent_district" value={formData.permanent_district} onChange={handleChange} />
                <InputField label="Division" name="permanent_division" value={formData.permanent_division} onChange={handleChange} />
              </div>
            )}
          </div>

          {/* SSC Information */}
          <div className="border border-gray-200 rounded-lg">
            <SectionHeader
              title="SSC Information"
              section="ssc"
              expanded={expandedSections.ssc}
              onToggle={toggleSection}
            />
            {expandedSections.ssc && (
              <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                <InputField label="School Name" name="ssc_school" value={formData.ssc_school} onChange={handleChange} />
                <InputField label="Passing Year" name="ssc_passing_year" type="number" min="1990" max="2030" value={formData.ssc_passing_year} onChange={handleChange} />
                <SelectField label="Board" name="ssc_board" options={BOARD_OPTIONS} value={formData.ssc_board} onChange={handleChange} placeholder="Select Board" />
                <SelectField label="Group" name="ssc_group" options={GROUP_OPTIONS} value={formData.ssc_group} onChange={handleChange} />
                <InputField label="4th Subject" name="ssc_4th_subject" value={formData.ssc_4th_subject} onChange={handleChange} />
                <InputField label="GPA" name="ssc_gpa" type="number" step="0.01" min="0" max="5" value={formData.ssc_gpa} onChange={handleChange} />
              </div>
            )}
          </div>

          {/* HSC Information */}
          <div className="border border-gray-200 rounded-lg">
            <SectionHeader
              title="HSC Information"
              section="hsc"
              expanded={expandedSections.hsc}
              onToggle={toggleSection}
            />
            {expandedSections.hsc && (
              <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                <InputField label="College Name" name="hsc_college" value={formData.hsc_college} onChange={handleChange} />
                <InputField label="Passing Year" name="hsc_passing_year" type="number" min="1990" max="2030" value={formData.hsc_passing_year} onChange={handleChange} />
                <SelectField label="Board" name="hsc_board" options={BOARD_OPTIONS} value={formData.hsc_board} onChange={handleChange} placeholder="Select Board" />
                <SelectField label="Group" name="hsc_group" options={GROUP_OPTIONS} value={formData.hsc_group} onChange={handleChange} />
                <InputField label="4th Subject" name="hsc_4th_subject" value={formData.hsc_4th_subject} onChange={handleChange} />
                <InputField label="GPA" name="hsc_gpa" type="number" step="0.01" min="0" max="5" value={formData.hsc_gpa} onChange={handleChange} />
              </div>
            )}
          </div>

          {/* Other Information */}
          <div className="border border-gray-200 rounded-lg">
            <SectionHeader title="Other Information" section="other" />
            {expandedSections.other && (
              <div className="p-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Additional Notes</label>
                <textarea
                  name="other_info"
                  value={formData.other_info}
                  onChange={handleChange}
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Any additional information..."
                />
              </div>
            )}
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Adding...' : 'Add Student'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddStudentModal;

