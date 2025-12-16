import { useState, useEffect } from 'react';
import { X, ChevronDown, ChevronUp, Upload, User, Trash2 } from 'lucide-react';
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

const SectionHeader = ({ title, section, expanded, onToggle }) => (
  <button
    type="button"
    onClick={() => onToggle(section)}
    className="w-full flex items-center justify-between py-3 text-left"
  >
    <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
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

const EditStudentModal = ({ student, onClose, onSuccess }) => {
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [formData, setFormData] = useState({
    // User/account info
    username: '',
    email: '',
    full_name: '',
    phone_number: '',
    // New fields
    registration_number: '',
    national_university_id: '',
    major: '',
    national_id_number: '',
    course: '',
    intake: '',
    // Basic student info
    date_of_birth: '',
    blood_group: '',
    // Academic info
    session: '',
    semester: '',
    admission_date: '',
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

  const [expandedSections, setExpandedSections] = useState({
    account: true,
    personal: true,
    academic: true,
    family: false,
    presentAddress: false,
    permanentAddress: false,
    ssc: false,
    hsc: false,
    other: false,
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (student) {
      // Set photo preview from existing photo
      if (student.photo) {
        setPhotoPreview(student.photo);
      }
      setFormData({
        username: student.user?.username || '',
        email: student.user?.email || '',
        full_name: student.full_name || `${student.user?.first_name || ''} ${student.user?.last_name || ''}`.trim(),
        phone_number: student.user?.phone_number || '',
        registration_number: student.registration_number || '',
        national_university_id: student.national_university_id || '',
        major: student.major ? String(student.major) : '',
        national_id_number: student.national_id_number || '',
        course: student.course || '',
        intake: student.intake || '',
        date_of_birth: student.date_of_birth || '',
        blood_group: student.blood_group || '',
        session: student.session || '',
        semester: student.semester || '',
        admission_date: student.admission_date || '',
        father_name: student.father_name || '',
        father_phone: student.father_phone || '',
        mother_name: student.mother_name || '',
        mother_phone: student.mother_phone || '',
        guardian_name: student.guardian_name || '',
        guardian_phone: student.guardian_phone || '',
        guardian_yearly_income: student.guardian_yearly_income || '',
        guardian_occupation: student.guardian_occupation || '',
        present_house_no: student.present_house_no || '',
        present_road_vill: student.present_road_vill || '',
        present_police_station: student.present_police_station || '',
        present_post_office: student.present_post_office || '',
        present_district: student.present_district || '',
        present_division: student.present_division || '',
        permanent_house_no: student.permanent_house_no || '',
        permanent_road_vill: student.permanent_road_vill || '',
        permanent_police_station: student.permanent_police_station || '',
        permanent_post_office: student.permanent_post_office || '',
        permanent_district: student.permanent_district || '',
        permanent_division: student.permanent_division || '',
        ssc_school: student.ssc_school || '',
        ssc_passing_year: student.ssc_passing_year || '',
        ssc_group: student.ssc_group || '',
        ssc_4th_subject: student.ssc_4th_subject || '',
        ssc_gpa: student.ssc_gpa || '',
        ssc_board: student.ssc_board || '',
        hsc_college: student.hsc_college || '',
        hsc_passing_year: student.hsc_passing_year || '',
        hsc_group: student.hsc_group || '',
        hsc_4th_subject: student.hsc_4th_subject || '',
        hsc_gpa: student.hsc_gpa || '',
        hsc_board: student.hsc_board || '',
        other_info: student.other_info || '',
      });
    }
  }, [student]);

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

  if (!student) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
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
      setRemovePhoto(false);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemovePhoto = () => {
    setPhoto(null);
    setPhotoPreview(null);
    setRemovePhoto(true);
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const validateForm = () => {
    const errors = [];
    if (!formData.username.trim()) errors.push('College ID is required');
    if (!formData.full_name.trim()) errors.push('Full Name is required');
    if (!formData.date_of_birth) errors.push('Date of Birth is required');
    if (!formData.course) errors.push('Course is required');
    if (!formData.intake) errors.push('Intake is required');
    if (!formData.session.trim()) errors.push('Session is required');
    if (!formData.semester) errors.push('Semester is required');
    if (!formData.admission_date) errors.push('Admission Date is required');
    if (shouldShowMajor() && !formData.major) errors.push('Major is required for this course and semester');
    return errors;
  };

  const handleCourseChange = (e) => {
    const { value } = e.target;
    setFormData(prev => ({ ...prev, course: value, intake: '', major: '' }));
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
      // Split payloads between user and student models
      const userPayload = {
        username: formData.username,
        email: formData.email,
        first_name: formData.first_name,
        last_name: formData.last_name,
        phone_number: formData.phone_number,
      };

      // Convert empty strings to null for numeric fields
      const processValue = (value, isNumeric = false) => {
        if (value === '' || value === null || value === undefined) {
          return isNumeric ? null : '';
        }
        return value;
      };

      const studentPayload = {
        date_of_birth: formData.date_of_birth,
        blood_group: processValue(formData.blood_group),
        course: formData.course,
        intake: formData.intake,
        session: formData.session,
        semester: formData.semester,
        admission_date: formData.admission_date,
        // New fields
        registration_number: processValue(formData.registration_number),
        national_university_id: processValue(formData.national_university_id),
        major: processValue(formData.major, true),
        full_name: processValue(formData.full_name),
        national_id_number: processValue(formData.national_id_number),
        // Family info
        father_name: processValue(formData.father_name),
        father_phone: processValue(formData.father_phone),
        mother_name: processValue(formData.mother_name),
        mother_phone: processValue(formData.mother_phone),
        guardian_name: processValue(formData.guardian_name),
        guardian_phone: processValue(formData.guardian_phone),
        guardian_yearly_income: processValue(formData.guardian_yearly_income, true),
        guardian_occupation: processValue(formData.guardian_occupation),
        // Address info
        present_house_no: processValue(formData.present_house_no),
        present_road_vill: processValue(formData.present_road_vill),
        present_police_station: processValue(formData.present_police_station),
        present_post_office: processValue(formData.present_post_office),
        present_district: processValue(formData.present_district),
        present_division: processValue(formData.present_division),
        permanent_house_no: processValue(formData.permanent_house_no),
        permanent_road_vill: processValue(formData.permanent_road_vill),
        permanent_police_station: processValue(formData.permanent_police_station),
        permanent_post_office: processValue(formData.permanent_post_office),
        permanent_district: processValue(formData.permanent_district),
        permanent_division: processValue(formData.permanent_division),
        // SSC info
        ssc_school: processValue(formData.ssc_school),
        ssc_passing_year: processValue(formData.ssc_passing_year, true),
        ssc_group: processValue(formData.ssc_group),
        ssc_4th_subject: processValue(formData.ssc_4th_subject),
        ssc_gpa: processValue(formData.ssc_gpa, true),
        ssc_board: processValue(formData.ssc_board),
        // HSC info
        hsc_college: processValue(formData.hsc_college),
        hsc_passing_year: processValue(formData.hsc_passing_year, true),
        hsc_group: processValue(formData.hsc_group),
        hsc_4th_subject: processValue(formData.hsc_4th_subject),
        hsc_gpa: processValue(formData.hsc_gpa, true),
        hsc_board: processValue(formData.hsc_board),
        other_info: processValue(formData.other_info),
      };

      // Update user first (account info)
      if (student.user?.id) {
        await api.patch(`/accounts/users/${student.user.id}/`, userPayload);
      }

      // Update student profile - use FormData if photo is being uploaded or removed
      if (photo || removePhoto) {
        const formDataToSend = new FormData();
        Object.keys(studentPayload).forEach(key => {
          if (studentPayload[key] !== '' && studentPayload[key] !== null && studentPayload[key] !== undefined) {
            formDataToSend.append(key, studentPayload[key]);
          }
        });
        if (photo) {
          formDataToSend.append('photo', photo);
        } else if (removePhoto) {
          formDataToSend.append('photo', '');  // Send empty to clear the photo
        }
        await api.patch(`/accounts/students/${student.id}/`, formDataToSend, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        await api.patch(`/accounts/students/${student.id}/`, studentPayload);
      }

      toast.success('Student updated successfully');
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      // Handle specific HTTP errors
      if (err.response?.status === 413) {
        toast.error('Image file is too large. Please use an image smaller than 2MB.');
      } else if (err.message?.includes('Network Error') || !err.response) {
        toast.error('Network error. If uploading an image, try a smaller file (under 2MB).');
      } else {
        // Parse and display errors as toast
        const errorData = err.response?.data;
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
          toast.error(err.response?.data?.detail || 'Failed to update student. Please try again.');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full my-8">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Edit Student</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col max-h-[70vh]">
          <div className="p-6 space-y-4 overflow-y-auto flex-1">
            {/* Photo Upload */}
            <div className="flex flex-col items-center pb-4">
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
              {(photoPreview || student.photo) && (
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="mt-2 flex items-center gap-1 text-sm text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                  Remove Photo
                </button>
              )}
            </div>

          {/* Account Information */}
          <div className="border border-gray-200 rounded-lg">
            <SectionHeader
              title="Account Information"
              section="account"
              expanded={expandedSections.account}
              onToggle={toggleSection}
            />
            {expandedSections.account && (
              <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                <InputField label="College ID" name="username" required value={formData.username} onChange={handleChange} />
                <InputField label="Email" name="email" type="email" value={formData.email} onChange={handleChange} />
                <InputField label="Phone (WhatsApp)" name="phone_number" type="tel" value={formData.phone_number} onChange={handleChange} />
              </div>
            )}
          </div>

          {/* Personal Information */}
          <div className="border border-gray-200 rounded-lg">
            <SectionHeader
              title="Personal Information"
              section="personal"
              expanded={expandedSections.personal}
              onToggle={toggleSection}
            />
            {expandedSections.personal && (
              <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                <InputField label="Full Name" name="full_name" required value={formData.full_name} onChange={handleChange} />
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
            <SectionHeader
              title="Other Information"
              section="other"
              expanded={expandedSections.other}
              onToggle={toggleSection}
            />
            {expandedSections.other && (
              <div className="p-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Additional Notes</label>
                <textarea
                  name="other_info"
                  value={formData.other_info}
                  onChange={handleChange}
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Any additional information about the student"
                />
              </div>
            )}
          </div>

          </div>

          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-white sticky bottom-0">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditStudentModal;
