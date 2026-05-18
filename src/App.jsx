import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInAnonymously,
  signInWithCustomToken,
  onAuthStateChanged,
  signOut
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp
} from 'firebase/firestore';
import {
  FileText,
  User,
  Calendar,
  Clock,
  BookOpen,
  Video,
  Send,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Table2,
  Trash2,
  LogOut,
  RefreshCw,
  Search
} from 'lucide-react';

// Initialize Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDUetKP1vUm_ofu8hbMq9YSj9T9Tc2vECA",
  authDomain: "dslc-report.firebaseapp.com",
  projectId: "dslc-report",
  storageBucket: "dslc-report.firebasestorage.app",
  messagingSenderId: "184508511081",
  appId: "1:184508511081:web:b6fbee6d6aa151146503f8"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'dslc-report-app';

export default function App() {
  const [user, setUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [reports, setReports] = useState([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [activeTab, setActiveTab] = useState('submit'); // 'submit' or 'view'
  
  // Form State
  const [formData, setFormData] = useState({
    name: '',
    month: new Date().getMonth() + 1, // 1-12
    year: new Date().getFullYear(),
    hours: '',
    rv: '',
    bs: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null); // { type: 'success' | 'error', message: '' }

  // View Reports State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterYear, setFilterYear] = useState('');

  const months = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' }
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) {
        console.error("Auth error:", error);
      } finally {
        setLoadingAuth(false);
      }
    };

    initAuth();

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoadingAuth(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setReports([]);
      setLoadingReports(false);
      return;
    }

    setLoadingReports(true);
    // Use public collection for shared reports
    const reportsRef = collection(db, 'artifacts', appId, 'public', 'data', 'reports');
    
    // Note: To comply with RULE 2 (No Complex Queries), we fetch all and filter/sort in memory
    const q = query(reportsRef);

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const reportsData = [];
      snapshot.forEach((doc) => {
        reportsData.push({ id: doc.id, ...doc.data() });
      });
      
      // Sort by creation time descending in memory
      reportsData.sort((a, b) => {
        const timeA = a.createdAt?.toMillis() || 0;
        const timeB = b.createdAt?.toMillis() || 0;
        return timeB - timeA;
      });
      
      setReports(reportsData);
      setLoadingReports(false);
    }, (error) => {
      console.error("Error fetching reports:", error);
      setLoadingReports(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;

    setSubmitting(true);
    setSubmitStatus(null);

    try {
      const reportsRef = collection(db, 'artifacts', appId, 'public', 'data', 'reports');
      
      // Validate numbers
      const hoursNum = parseFloat(formData.hours) || 0;
      const rvNum = parseInt(formData.rv, 10) || 0;
      const bsNum = parseInt(formData.bs, 10) || 0;

      await addDoc(reportsRef, {
        name: formData.name,
        month: parseInt(formData.month, 10),
        year: parseInt(formData.year, 10),
        hours: hoursNum,
        rv: rvNum,
        bs: bsNum,
        submitterId: user.uid,
        createdAt: serverTimestamp(),
      });

      setSubmitStatus({ type: 'success', message: 'Report submitted successfully!' });
      
      // Reset numeric fields, keep name, month, year
      setFormData(prev => ({
        ...prev,
        hours: '',
        rv: '',
        bs: ''
      }));

      // Clear success message after 3 seconds
      setTimeout(() => {
        setSubmitStatus(null);
      }, 3000);

    } catch (error) {
      console.error("Error submitting report:", error);
      setSubmitStatus({ type: 'error', message: 'Failed to submit report. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  const filteredReports = reports.filter(report => {
    const matchesSearch = report.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesMonth = filterMonth ? report.month === parseInt(filterMonth, 10) : true;
    const matchesYear = filterYear ? report.year === parseInt(filterYear, 10) : true;
    return matchesSearch && matchesMonth && matchesYear;
  });

  const getMonthName = (monthNumber) => {
    const month = months.find(m => m.value === monthNumber);
    return month ? month.label : '';
  };

  if (loadingAuth) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
        <p className="text-slate-600 font-medium">Initializing DSLC Report System...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-600 p-2 rounded-lg text-white">
                <FileText size={24} />
              </div>
              <h1 className="text-xl font-bold text-slate-900 hidden sm:block">DSLC Report</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex bg-slate-100 p-1 rounded-lg">
                <button
                  onClick={() => setActiveTab('submit')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === 'submit' 
                      ? 'bg-white text-blue-700 shadow-sm' 
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                  }`}
                >
                  Submit
                </button>
                <button
                  onClick={() => setActiveTab('view')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === 'view' 
                      ? 'bg-white text-blue-700 shadow-sm' 
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                  }`}
                >
                  View Reports
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error State if not authenticated */}
        {!user && (
           <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md mb-6">
           <div className="flex items-center">
             <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
             <p className="text-red-700 font-medium">Authentication required. Please check your connection.</p>
           </div>
         </div>
        )}

        {/* Tab Content: Submit */}
        {activeTab === 'submit' && user && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-200 bg-slate-50/50">
                <h2 className="text-lg font-semibold text-slate-900 flex items-center">
                  <FileText className="w-5 h-5 mr-2 text-blue-600" />
                  New Field Service Report
                </h2>
                <p className="text-sm text-slate-500 mt-1">Enter your activity details for the month.</p>
              </div>

              <div className="p-6">
                {submitStatus && (
                  <div className={`mb-6 p-4 rounded-lg flex items-start ${
                    submitStatus.type === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                  }`}>
                    {submitStatus.type === 'success' ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 mr-3 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
                    )}
                    <p className={`text-sm font-medium ${
                      submitStatus.type === 'success' ? 'text-green-800' : 'text-red-800'
                    }`}>
                      {submitStatus.message}
                    </p>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Name Input */}
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1">
                      Full Name
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <User className="h-5 w-5 text-slate-400" />
                      </div>
                      <input
                        type="text"
                        name="name"
                        id="name"
                        required
                        value={formData.name}
                        onChange={handleInputChange}
                        className="pl-10 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2.5 transition-colors"
                        placeholder="John Doe"
                      />
                    </div>
                  </div>

                  {/* Month & Year Selection */}
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div>
                      <label htmlFor="month" className="block text-sm font-medium text-slate-700 mb-1">
                        Month
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Calendar className="h-5 w-5 text-slate-400" />
                        </div>
                        <select
                          name="month"
                          id="month"
                          value={formData.month}
                          onChange={handleInputChange}
                          className="pl-10 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2.5 bg-white transition-colors"
                        >
                          {months.map(m => (
                            <option key={m.value} value={m.value}>{m.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label htmlFor="year" className="block text-sm font-medium text-slate-700 mb-1">
                        Year
                      </label>
                      <select
                        name="year"
                        id="year"
                        value={formData.year}
                        onChange={handleInputChange}
                        className="block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2.5 bg-white transition-colors"
                      >
                        {years.map(y => (
                          <option key={y} value={y}>{y}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 my-6"></div>

                  {/* Activity Metrics */}
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                    {/* Hours */}
                    <div>
                      <label htmlFor="hours" className="block text-sm font-medium text-slate-700 mb-1">
                        Hours
                      </label>
                      <div className="relative">
                         <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Clock className="h-5 w-5 text-slate-400" />
                        </div>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          name="hours"
                          id="hours"
                          required
                          value={formData.hours}
                          onChange={handleInputChange}
                          className="pl-10 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2.5 transition-colors"
                          placeholder="0.0"
                        />
                      </div>
                    </div>

                    {/* Return Visits (RV) */}
                    <div>
                      <label htmlFor="rv" className="block text-sm font-medium text-slate-700 mb-1">
                        Return Visits (RV)
                      </label>
                       <div className="relative">
                         <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Video className="h-5 w-5 text-slate-400" />
                        </div>
                        <input
                          type="number"
                          min="0"
                          name="rv"
                          id="rv"
                          required
                          value={formData.rv}
                          onChange={handleInputChange}
                          className="pl-10 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2.5 transition-colors"
                          placeholder="0"
                        />
                      </div>
                    </div>

                    {/* Bible Studies (BS) */}
                    <div>
                      <label htmlFor="bs" className="block text-sm font-medium text-slate-700 mb-1">
                        Bible Studies (BS)
                      </label>
                      <div className="relative">
                         <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <BookOpen className="h-5 w-5 text-slate-400" />
                        </div>
                        <input
                          type="number"
                          min="0"
                          name="bs"
                          id="bs"
                          required
                          value={formData.bs}
                          onChange={handleInputChange}
                          className="pl-10 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2.5 transition-colors"
                          placeholder="0"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="pt-4">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-70 disabled:cursor-not-allowed transition-all"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          <Send className="-ml-1 mr-2 h-5 w-5 text-white" />
                          Submit Report
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Tab Content: View Reports */}
        {activeTab === 'view' && user && (
          <div className="space-y-6">
            
            {/* Filters */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col sm:flex-row gap-4 items-center">
              <div className="w-full sm:w-auto flex-grow relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search by name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                />
              </div>
              
              <div className="w-full sm:w-auto flex gap-4">
                <select
                  value={filterMonth}
                  onChange={(e) => setFilterMonth(e.target.value)}
                  className="block w-full sm:w-40 rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2 bg-white"
                >
                  <option value="">All Months</option>
                  {months.map(m => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>

                <select
                  value={filterYear}
                  onChange={(e) => setFilterYear(e.target.value)}
                  className="block w-full sm:w-32 rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2 bg-white"
                >
                  <option value="">All Years</option>
                  {years.map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Data Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              {loadingReports ? (
                 <div className="p-12 flex flex-col items-center justify-center text-slate-500">
                   <Loader2 className="h-8 w-8 animate-spin mb-4 text-blue-500" />
                   <p>Loading reports data...</p>
                 </div>
              ) : filteredReports.length === 0 ? (
                <div className="p-12 flex flex-col items-center justify-center text-slate-500">
                  <Table2 className="h-12 w-12 text-slate-300 mb-4" />
                  <p className="text-lg font-medium text-slate-900">No reports found</p>
                  <p className="text-sm mt-1">Try adjusting your filters or submit a new report.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                          Name
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                          Period
                        </th>
                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                          Hours
                        </th>
                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                          Return Visits
                        </th>
                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                          Bible Studies
                        </th>
                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                          Submitted
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                      {filteredReports.map((report) => (
                        <tr key={report.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm mr-3">
                                {report.name.charAt(0).toUpperCase()}
                              </div>
                              <div className="text-sm font-medium text-slate-900">{report.name}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-slate-900">{getMonthName(report.month)} {report.year}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-slate-900">
                            {report.hours}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-slate-500">
                            {report.rv}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-slate-500">
                            {report.bs}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-slate-400">
                            {report.createdAt ? new Date(report.createdAt.toMillis()).toLocaleDateString() : 'Just now'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            
            {/* Summary Cards */}
            {!loadingReports && filteredReports.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center">
                   <div className="p-3 rounded-lg bg-blue-50 text-blue-600 mr-4">
                     <Clock className="h-6 w-6" />
                   </div>
                   <div>
                     <p className="text-sm font-medium text-slate-500">Total Hours</p>
                     <p className="text-2xl font-bold text-slate-900">
                       {filteredReports.reduce((sum, r) => sum + (parseFloat(r.hours) || 0), 0).toFixed(1)}
                     </p>
                   </div>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center">
                   <div className="p-3 rounded-lg bg-indigo-50 text-indigo-600 mr-4">
                     <Video className="h-6 w-6" />
                   </div>
                   <div>
                     <p className="text-sm font-medium text-slate-500">Total Return Visits</p>
                     <p className="text-2xl font-bold text-slate-900">
                       {filteredReports.reduce((sum, r) => sum + (parseInt(r.rv, 10) || 0), 0)}
                     </p>
                   </div>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center">
                   <div className="p-3 rounded-lg bg-purple-50 text-purple-600 mr-4">
                     <BookOpen className="h-6 w-6" />
                   </div>
                   <div>
                     <p className="text-sm font-medium text-slate-500">Total Bible Studies</p>
                     <p className="text-2xl font-bold text-slate-900">
                       {filteredReports.reduce((sum, r) => sum + (parseInt(r.bs, 10) || 0), 0)}
                     </p>
                   </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
