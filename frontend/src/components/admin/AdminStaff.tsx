import React, { useEffect, useRef, useState } from 'react';
import { CheckCircle, XCircle, Users, Plus, Edit, Trash, RefreshCw, Search } from 'lucide-react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { io, Socket } from 'socket.io-client';

interface Staff {
  id: number;
  username: string;
  email: string;
  role: string;
  first_name: string;
  last_name: string;
  full_name: string;
  age: number;
  phone?: string;
  address?: string;
  position?: string;
  work_schedule?: 'morning' | 'mid' | 'night' | 'flexible';
  date_hired?: string;
  employee_id?: string;
  status?: 'active' | 'inactive' | 'suspended';
  last_login?: string;
  emergency_contact?: string;
  emergency_phone?: string;
  birthday?: string;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  profile_picture?: string;
  created_at?: string;
  password?: string;
  confirmPassword?: string;
}

const AdminStaff: React.FC = () => {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [editForm, setEditForm] = useState<Staff | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [, setStaffCount] = useState(0);
  const [isLoadingStaff, setIsLoadingStaff] = useState(true);

  const [form, setForm] = useState({
    username: '', email: '', password: '', confirmPassword: '', 
    first_name: '', last_name: '', age: '', role: 'staff',
    phone: '', address: '', position: '', work_schedule: 'flexible' as 'morning' | 'mid' | 'night' | 'flexible',
    date_hired: '', employee_id: '', gender: '' as 'male' | 'female' | 'other' | 'prefer_not_to_say' | '',
  });

  // Keep focus on search input to avoid blur on re-renders (mobile tap issue)
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    searchInputRef.current?.focus();
  }, [searchTerm]);

  const passwordChecks = [
    { label: 'At least 8 characters', valid: form.password.length >= 8 },
    { label: 'Contains uppercase letter', valid: /[A-Z]/.test(form.password) },
    { label: 'Contains lowercase letter', valid: /[a-z]/.test(form.password) },
    { label: 'Contains number', valid: /\d/.test(form.password) },
    { label: 'Contains special character', valid: /[!@#$%^&*(),.?":{}|<>]/.test(form.password) }
  ];

  const allValid = passwordChecks.every(c => c.valid);
  const passwordsMatch = form.password === form.confirmPassword && form.password.length > 0;

  const editPasswordChecks = [
    { label: 'At least 8 characters', valid: (editForm?.password || '').length >= 8 },
    { label: 'Contains uppercase letter', valid: /[A-Z]/.test(editForm?.password || '') },
    { label: 'Contains lowercase letter', valid: /[a-z]/.test(editForm?.password || '') },
    { label: 'Contains number', valid: /\d/.test(editForm?.password || '') },
    { label: 'Contains special character', valid: /[!@#$%^&*(),.?":{}|<>]/.test(editForm?.password || '') }
  ];

  const editAllValid = editForm && (editForm.password === '' || editPasswordChecks.every(c => c.valid));
  const editPasswordsMatch = editForm && (editForm.password === editForm.confirmPassword && editForm.password && editForm.password.length > 0);
  const [, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    // Initialize Socket.IO connection
    const newSocket = io();
    setSocket(newSocket);

    // Join admin room for real-time updates
    newSocket.emit('join-admin-room');

    // Listen for real-time updates
    newSocket.on('staff-updated', (data) => {
      console.log('Staff updated in AdminStaff:', data);
      fetchStaff();
      fetchStats();
    });

    fetchStaff();
    fetchStats();

    return () => {
      newSocket.close();
    };
  }, []);

  const fetchStaff = async () => {
    try {
      const response = await fetch('/api/admin/staff');
      if (response.ok) {
        const data = await response.json();
        setStaff(data);
        // Derive active staff count from fetched data to avoid stale/incorrect stats
        try {
          const active = Array.isArray(data)
            ? data.filter((m: any) => (m.status || 'active') === 'active').length
            : 0;
          setStaffCount(active);
        } catch (_) {
          setStaffCount(0);
        }
      } else {
        setError('Failed to fetch staff');
      }
    } catch (err: any) {
      console.error('Error fetching staff:', err);
      setError('Error fetching staff');
    } finally {
      setIsLoadingStaff(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/staff/stats');
      if (response.ok) {
        const data = await response.json();
        setStaffCount(data.totalStaff || 0);
      }
    } catch (err: any) {
      console.error('Error fetching stats:', err);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (editForm) {
      setEditForm(prev => ({ ...prev!, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!allValid) {
      setError('Please meet all password requirements');
      return;
    }

    if (!passwordsMatch) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/admin/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });

      if (response.ok) {
        setMessage('Staff member created successfully!');
        setForm({ 
          username: '', email: '', password: '', confirmPassword: '', 
          first_name: '', last_name: '', age: '', role: 'staff',
          phone: '', address: '', position: '', work_schedule: 'flexible',
          date_hired: '', employee_id: '', gender: ''
        });
        setShowModal(false);
        fetchStaff();
        fetchStats();
      } else {
        const data = await response.json();
        setError(data.message || 'Failed to create staff member');
      }
    } catch (error: any) {
      setError('Error creating staff member');
    } finally {
      setLoading(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editForm?.password && !editPasswordsMatch) {
      setError('Passwords do not match');
      return;
    }

    if (editForm?.password && !editAllValid) {
      setError('Please meet all password requirements');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/admin/staff/${editForm?.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      });

      if (response.ok) {
        setMessage('Staff member updated successfully!');
        setEditModal(false);
        setEditForm(null);
        fetchStaff();
        fetchStats();
      } else {
        const data = await response.json();
        setError(data.message || 'Failed to update staff member');
      }
    } catch (error: any) {
      setError('Error updating staff member');
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (staffMember: Staff) => {
    setEditForm({
      ...staffMember,
      password: '',
      confirmPassword: ''
    });
    setEditModal(true);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this staff member?')) {
      try {
        const response = await fetch(`/api/admin/staff/${id}`, {
          method: 'DELETE'
        });

        if (response.ok) {
          setMessage('Staff member deleted successfully!');
          fetchStaff();
          fetchStats();
        } else {
          setError('Failed to delete staff member');
        }
      } catch (error: any) {
        setError('Error deleting staff member');
      }
    }
  };

  const filteredStaff = staff.filter(s => 
    s.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.position && s.position.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (s.employee_id && s.employee_id.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (s.phone && s.phone.toLowerCase().includes(searchTerm.toLowerCase()))
  );


  if (isLoadingStaff) {
    return (
      <div className="flex justify-center items-center py-8">
        <RefreshCw className="w-8 h-8 animate-spin text-gray-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 mx-2 sm:mx-4 lg:mx-6 p-4">
        {/* Header + Add Button */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Staff Management</h1>
            <p className="text-sm sm:text-base text-gray-600 mt-1">Manage staff accounts, roles, and permissions</p>
          </div>
          <Button 
            onClick={() => setShowModal(true)}
            className="bg-amber-600 hover:bg-amber-700 text-white shadow-lg translate-y-1"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Staff Member
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-4 sm:gap-6">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="flex items-center">
              <div className="p-3 bg-[#a87437] rounded-full">
                <Users className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-[#0f172a]">Staff</h3>
                <p className="text-sm text-gray-600">
                  {(() => {
                    const current = staff && staff.length > 0 ? staff[0] : null;
                    const username = current?.username || current?.email?.split('@')[0] || 'Unknown';
                    const staffId = current?.employee_id || current?.id || 'N/A';
                    return (
                      <span>#{staffId} • {username}</span>
                    );
                  })()}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white rounded-2xl shadow-xl border-2 border-gray-200 p-6">
          <div className="relative">
            <Input
              placeholder="Search staff by name, email, role, position, employee ID, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-10 bg-white border-[#a87437] focus:border-[#8f652f] focus:ring-[#a87437]"
              ref={searchInputRef}
            />
            <Button
              onClick={() => {
                // Search functionality is already handled by the filtered staff
                console.log('Searching for:', searchTerm);
              }}
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-[#a87437]/10"
            >
              <Search className="h-4 w-4 text-[#a87437]" />
            </Button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Success Message */}
        {message && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg">
            <strong>Success:</strong> {message}
          </div>
        )}

        {/* Staff Table */}
        <div className="bg-white rounded-2xl shadow-xl border-2 border-gray-200 p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Staff Accounts</h2>
            <Badge className="bg-blue-100 text-blue-800 border-blue-200">
              {staff.length} staff members
            </Badge>
          </div>

          {filteredStaff.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No staff members found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/20">
                    <th className="px-4 py-3 text-left font-semibold text-gray-900">Employee ID</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-900">Name</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-900">Position</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-900">Contact</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-900">Status</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-900">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStaff.map((s) => (
                    <tr key={s.id} className="border-b border-white/20 hover:bg-white/30 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-medium text-gray-900">{s.employee_id || s.username}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <span className="font-medium text-gray-900">
                            {s.first_name} {s.last_name}
                          </span>
                          <div className="text-sm text-gray-500">{s.email}</div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-gray-700">{s.position || '-'}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm">
                          <div className="text-gray-700">{s.phone || '-'}</div>
                          <div className="text-gray-500">{s.work_schedule || '-'}</div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          s.status === 'active' ? 'bg-green-100 text-green-800' :
                          s.status === 'inactive' ? 'bg-gray-100 text-gray-800' :
                          s.status === 'suspended' ? 'bg-red-100 text-red-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {s.status || 'active'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openEditModal(s)}
                            className="bg-white/50 backdrop-blur-sm border-white/20 hover:bg-white/70"
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(s.id)}
                            className="bg-red-50 border-red-200 text-red-700 hover:bg-red-100"
                          >
                            <Trash className="w-4 h-4 mr-1" />
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal for Add Staff */}
        {showModal && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-50">
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8 w-full max-w-4xl border border-white/20">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Create Staff Account</h2>
                <button
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                  onClick={() => setShowModal(false)}
                  aria-label="Close"
                >
                  &times;
                </button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Account Information - 2 columns */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Input
                      name="username"
                      value={form.username}
                      onChange={handleChange}
                      placeholder="Username"
                      required
                      className="bg-white/50 backdrop-blur-sm border-white/20 focus:bg-white/70"
                    />
                  </div>
                  <div>
                    <Input
                      name="email"
                      type="email"
                      value={form.email}
                      onChange={handleChange}
                      placeholder="Email"
                      required
                      className="bg-white/50 backdrop-blur-sm border-white/20 focus:bg-white/70"
                    />
                  </div>
                </div>

                {/* Role and Age - 2 columns */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                    <select
                      id="role"
                      name="role"
                      value={form.role}
                      onChange={handleChange}
                      className="w-full p-2 border border-white/20 rounded-lg bg-white/50 backdrop-blur-sm focus:bg-white/70"
                      required
                    >
                      <option value="staff">Staff</option>
                    </select>
                  </div>
                  <div>
                    <Input
                      name="age"
                      type="number"
                      value={form.age}
                      onChange={(e) => {
                        const value = parseInt(e.target.value);
                        if (value >= 15 && value <= 100) {
                          setForm(prev => ({ ...prev, age: value.toString() }));
                        }
                      }}
                      placeholder="Age"
                      required
                      min="15"
                      max="100"
                      className="bg-white/50 backdrop-blur-sm border-white/20 focus:bg-white/70"
                    />
                    <div className="text-xs text-gray-500 mt-1">Legal working age: 15+</div>
                  </div>
                </div>

                {/* Contact Information - 2 columns */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Input
                      name="phone"
                      type="tel"
                      value={form.phone}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '');
                        if (value.length <= 11) {
                          setForm(prev => ({ ...prev, phone: value }));
                        }
                      }}
                      placeholder="Phone Number (e.g., 09123456789)"
                      maxLength={11}
                      className="bg-white/50 backdrop-blur-sm border-white/20 focus:bg-white/70"
                    />
                    <div className="text-xs text-gray-500 mt-1">Format: 11 digits</div>
                  </div>
                  <div>
                    <Input
                      name="address"
                      value={form.address}
                      onChange={handleChange}
                      placeholder="Address"
                      className="bg-white/50 backdrop-blur-sm border-white/20 focus:bg-white/70"
                    />
                  </div>
                </div>

                {/* Work Information - 2 columns */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Input
                      name="position"
                      value={form.position}
                      onChange={handleChange}
                      placeholder="Position/Job Title"
                      className="bg-white/50 backdrop-blur-sm border-white/20 focus:bg-white/70"
                    />
                  </div>
                  <div>
                    <label htmlFor="work_schedule" className="block text-sm font-medium text-gray-700 mb-1">Work Schedule</label>
                    <select
                      id="work_schedule"
                      name="work_schedule"
                      value={form.work_schedule}
                      onChange={handleChange}
                      className="w-full p-2 border border-white/20 rounded-lg bg-white/50 backdrop-blur-sm focus:bg-white/70"
                    >
                      <option value="flexible">Flexible</option>
                      <option value="morning">Morning</option>
                      <option value="mid">Mid</option>
                      <option value="night">Night</option>
                    </select>
                  </div>
                </div>

                {/* Date Hired and Employee ID - 2 columns */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Input
                      name="date_hired"
                      type="date"
                      value={form.date_hired}
                      onChange={handleChange}
                      placeholder="Date Hired"
                      className="bg-white/50 backdrop-blur-sm border-white/20 focus:bg-white/70"
                    />
                  </div>
                  <div>
                    <Input
                      name="employee_id"
                      value={form.employee_id}
                      onChange={handleChange}
                      placeholder="Employee ID (e.g., EMP001)"
                      className="bg-white/50 backdrop-blur-sm border-white/20 focus:bg-white/70"
                    />
                    <div className="text-xs text-gray-500 mt-1">Unique identifier</div>
                  </div>
                </div>

                {/* Personal Information */}
                <div>
                  <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                  <select
                    id="gender"
                    name="gender"
                    value={form.gender}
                    onChange={handleChange}
                    className="w-full p-2 border border-white/20 rounded-lg bg-white/50 backdrop-blur-sm focus:bg-white/70"
                  >
                    <option value="">Prefer not to say</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                {/* Password Section - At the end for security */}
                <div className="border-t pt-4 mt-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Account Security</h3>
                  <div>
                    <Input
                      name="password"
                      type="password"
                      value={form.password}
                      onChange={handleChange}
                      placeholder="Password"
                      required
                      className="bg-white/50 backdrop-blur-sm border-white/20 focus:bg-white/70"
                    />
                    {/* Password checklist */}
                    {form.password.length > 0 && (
                      <div className="mt-2 space-y-1 text-sm">
                        {passwordChecks.map((check, idx) => (
                          <div key={idx} className={check.valid ? 'text-green-600 flex items-center' : 'text-red-600 flex items-center'}>
                            {check.valid ? <CheckCircle className="w-4 h-4 mr-1" /> : <XCircle className="w-4 h-4 mr-1" />}
                            {check.label}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="mt-3">
                    <Input
                      name="confirmPassword"
                      type="password"
                      value={form.confirmPassword}
                      onChange={handleChange}
                      placeholder="Confirm Password"
                      required
                      className="bg-white/50 backdrop-blur-sm border-white/20 focus:bg-white/70"
                    />
                    {/* Password match indicator */}
                    {form.confirmPassword.length > 0 && (
                      <div className={passwordsMatch ? 'text-green-600 flex items-center mt-1' : 'text-red-600 flex items-center mt-1'}>
                        {passwordsMatch ? <CheckCircle className="w-4 h-4 mr-1" /> : <XCircle className="w-4 h-4 mr-1" />}
                        {passwordsMatch ? 'Passwords match!' : 'Passwords do not match'}
                      </div>
                    )}
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-amber-600 hover:bg-amber-700 text-white shadow-lg"
                  disabled={loading}
                >
                  {loading ? 'Creating...' : 'Create Staff'}
                </Button>
              </form>
            </div>
          </div>
        )}

        {/* Edit Staff Modal */}
        {editModal && editForm && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-50">
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8 w-full max-w-4xl border border-white/20">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Edit Staff Account</h2>
                <button
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                  onClick={() => setEditModal(false)}
                  aria-label="Close"
                >
                  &times;
                </button>
              </div>
              <form onSubmit={handleEditSubmit} className="space-y-4">
                {/* Account Information - 2 columns */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Input
                      name="username"
                      value={editForm.username}
                      onChange={handleEditChange}
                      placeholder="Username"
                      required
                      className="bg-white/50 backdrop-blur-sm border-white/20 focus:bg-white/70"
                    />
                  </div>
                  <div>
                    <Input
                      name="email"
                      type="email"
                      value={editForm.email}
                      onChange={handleEditChange}
                      placeholder="Email"
                      required
                      className="bg-white/50 backdrop-blur-sm border-white/20 focus:bg-white/70"
                    />
                  </div>
                </div>

                {/* Password Section - 2 columns */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Input
                      name="password"
                      type="password"
                      value={editForm.password}
                      onChange={handleEditChange}
                      placeholder="New Password (leave blank to keep current)"
                      className="bg-white/50 backdrop-blur-sm border-white/20 focus:bg-white/70"
                    />
                    {/* Password checklist for edit */}
                    {editForm.password && editForm.password.length > 0 && (
                      <div className="mt-2 space-y-1 text-sm">
                        {editPasswordChecks.map((check, idx) => (
                          <div key={idx} className={check.valid ? 'text-green-600 flex items-center' : 'text-red-600 flex items-center'}>
                            {check.valid ? <CheckCircle className="w-4 h-4 mr-1" /> : <XCircle className="w-4 h-4 mr-1" />}
                            {check.label}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <Input
                      name="confirmPassword"
                      type="password"
                      value={editForm.confirmPassword}
                      onChange={handleEditChange}
                      placeholder="Confirm Password"
                      className="bg-white/50 backdrop-blur-sm border-white/20 focus:bg-white/70"
                    />
                    {/* Password match indicator for edit */}
                    {editForm.confirmPassword && (
                      <div className={editPasswordsMatch ? 'text-green-600 flex items-center mt-1' : 'text-red-600 flex items-center mt-1'}>
                        {editPasswordsMatch ? <CheckCircle className="w-4 h-4 mr-1" /> : <XCircle className="w-4 h-4 mr-1" />}
                        {editPasswordsMatch ? 'Passwords match!' : 'Passwords do not match'}
                      </div>
                    )}
                  </div>
                </div>

                {/* Role and Status - 2 columns */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="edit-role" className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                    <select
                      id="edit-role"
                      name="role"
                      value={editForm.role}
                      onChange={handleEditChange}
                      className="w-full p-2 pr-12 border border-[#a87437] rounded-lg bg-white focus:border-[#8f652f] focus:ring-[#a87437]"
                      required
                    >
                      <option value="staff">Staff</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="edit-status">Status</label>
                    <select
                      id="edit-status"
                      name="status"
                      value={editForm.status || 'active'}
                      onChange={handleEditChange}
                      className="w-full p-2 pr-12 border border-[#a87437] rounded-lg bg-white focus:border-[#8f652f] focus:ring-[#a87437]"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="suspended">Suspended</option>
                    </select>
                  </div>
                </div>

                {/* Basic Information */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Input
                      name="first_name"
                      value={editForm.first_name || ''}
                      onChange={handleEditChange}
                      placeholder="First Name"
                      required
                      className="bg-white/50 backdrop-blur-sm border-white/20 focus:bg-white/70"
                    />
                  </div>
                  <div>
                    <Input
                      name="last_name"
                      value={editForm.last_name || ''}
                      onChange={handleEditChange}
                      placeholder="Last Name"
                      required
                      className="bg-white/50 backdrop-blur-sm border-white/20 focus:bg-white/70"
                    />
                  </div>
                </div>

                {/* Age and Gender - 2 columns */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Input
                      name="age"
                      type="number"
                      value={editForm.age || ''}
                      onChange={(e) => {
                        const value = parseInt(e.target.value);
                        if (value >= 15 && value <= 100) {
                          setEditForm(prev => prev ? { ...prev, age: value } : null);
                        }
                      }}
                      placeholder="Age"
                      required
                      min="15"
                      max="100"
                      className="bg-white/50 backdrop-blur-sm border-white/20 focus:bg-white/70"
                    />
                    <div className="text-xs text-gray-500 mt-1">Legal working age: 15+</div>
                  </div>
                  <div>
                    <label htmlFor="edit-gender">Gender</label>
                    <select
                      id="edit-gender"
                      name="gender"
                      value={editForm.gender || ''}
                      onChange={handleEditChange}
                      className="w-full p-2 border border-white/20 rounded-lg bg-white/50 backdrop-blur-sm focus:bg-white/70"
                    >
                      <option value="">Prefer not to say</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>

                {/* Contact Information - 2 columns */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Input
                      name="phone"
                      type="tel"
                      value={editForm.phone || ''}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '');
                        if (value.length <= 11) {
                          setEditForm(prev => prev ? { ...prev, phone: value } : null);
                        }
                      }}
                      placeholder="Phone Number (e.g., 09123456789)"
                      maxLength={11}
                      className="bg-white/50 backdrop-blur-sm border-white/20 focus:bg-white/70"
                    />
                    <div className="text-xs text-gray-500 mt-1">Format: 11 digits</div>
                  </div>
                  <div>
                    <Input
                      name="address"
                      value={editForm.address || ''}
                      onChange={handleEditChange}
                      placeholder="Address"
                      className="bg-white/50 backdrop-blur-sm border-white/20 focus:bg-white/70"
                    />
                  </div>
                </div>

                {/* Work Information - 2 columns */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Input
                      name="position"
                      value={editForm.position || ''}
                      onChange={handleEditChange}
                      placeholder="Position/Job Title"
                      className="bg-white/50 backdrop-blur-sm border-white/20 focus:bg-white/70"
                    />
                  </div>
                  <div>
                    <label htmlFor="edit-work_schedule">Work Schedule</label>
                    <select
                      id="edit-work_schedule"
                      name="work_schedule"
                      value={editForm.work_schedule || 'flexible'}
                      onChange={handleEditChange}
                      className="w-full p-2 border border-white/20 rounded-lg bg-white/50 backdrop-blur-sm focus:bg-white/70"
                    >
                      <option value="flexible">Flexible</option>
                      <option value="morning">Morning</option>
                      <option value="mid">Mid</option>
                      <option value="night">Night</option>
                    </select>
                  </div>
                </div>

                {/* Date Hired and Employee ID - 2 columns */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Input
                      name="date_hired"
                      type="date"
                      value={editForm.date_hired || ''}
                      onChange={handleEditChange}
                      placeholder="Date Hired"
                      className="bg-white/50 backdrop-blur-sm border-white/20 focus:bg-white/70"
                    />
                  </div>
                  <div>
                    <Input
                      name="employee_id"
                      value={editForm.employee_id || ''}
                      onChange={handleEditChange}
                      placeholder="Employee ID (e.g., EMP001)"
                      className="bg-white/50 backdrop-blur-sm border-white/20 focus:bg-white/70"
                    />
                    <div className="text-xs text-gray-500 mt-1">Unique identifier</div>
                  </div>
                </div>

                {/* Removed emergency contact/phone and birthday fields */}

                <Button
                  type="submit"
                  className="w-full bg-amber-600 hover:bg-amber-700 text-white shadow-lg"
                  disabled={loading}
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </Button>
              </form>
            </div>
          </div>
        )}
    </div>
  );
};

export default AdminStaff; 