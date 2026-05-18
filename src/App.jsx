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
  Search,
  LayoutDashboard,
  Sparkles
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
  const [submitStatus, setSubmitStatus] = useState(null); 

  // View Reports State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterYear, setFilterYear] = useState('');

  const months = [
    { value: 1, label: 'January' }, { value: 2, label: 'February' },
    { value: 3, label: 'March' }, { value: 4, label: 'April' },
    { value: 5, label: 'May' }, { value: 6, label: 'June' },
    { value: 7, label: 'July' }, { value: 8, label: 'August' },
    { value: 9, label: 'September' }, { value: 10, label: 'October' },
    { value: 11, label: 'November' }, { value: 12, label: 'December' }
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
    const reportsRef = collection(db, 'artifacts', appId, 'public', 'data', 'reports');
    const q = query(reportsRef);

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const reportsData = [];
      snapshot.forEach((doc) => {
        reportsData.push({ id: doc.id, ...doc.data() });
      });
      
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

      setSubmitStatus({ type: 'success', message: 'Report submitted brilliantly!' });
      
      setFormData(prev => ({
        ...prev,
        hours: '',
        rv: '',
        bs: ''
      }));

      setTimeout(() => {
        setSubmitStatus(null);
      }, 4000);

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
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-blue-50 flex flex-col items-center justify-center">
        <div className="relative">
          <div className="absolute inset-0 bg-indigo-500 rounded-full blur-xl opacity-20 animate-pulse"></div>
          <Loader2 className="w-14 h-14 text-indigo-600 animate-spin relative z-10" />
        </div>
        <p className="text-indigo-900 font-medium mt-6 tracking-wide text-lg">Waking up the system...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50/50 via-slate-50 to-blue-50/50 font-sans text-slate-800 selection:bg-indigo-100">
      
      {/* Sleek Glassmorphism Header */}
      <header className="sticky top-0 z-50 bg-white/70 backdrop-blur-lg border-b border-white shadow-sm shadow-indigo-100/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* Logo Area */}
            <div className="flex items-center space-x-3 group cursor-pointer">
              <div className="bg-gradient-to-tr from-indigo-600 to-blue-500 p-2.5 rounded-xl text-white shadow-lg shadow-indigo-200 group-hover:scale-105 transition-transform duration-300">
                <Sparkles size={22} className="text-white" />
              </div>
              <h1 className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-indigo-950 to-slate-700 hidden sm:block tracking-tight">
                DSLC <span className="font-medium text-indigo-600">Report</span>
              </h1>
            </div>
            
            {/* Elegant Tab Navigation */}
            <div className="flex bg-slate-100/80 backdrop-blur-md p-1.5 rounded-2xl border border-slate-200/50 shadow-inner">
              <button
                onClick={() => setActiveTab('submit')}
                className={`flex items-center px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${
                  activeTab === 'submit' 
                    ? 'bg-white text-indigo-700 shadow-md shadow-slate-200/50 scale-100' 
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50 scale-95'
                }`}
              >
                <FileText className="w-4 h-4 mr-2" />
                Submit
              </button>
              <button
                onClick={() => setActiveTab('view')}
                className={`flex items-center px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${
                  activeTab === 'view' 
                    ? 'bg-white text-indigo-700 shadow-md shadow-slate-200/50 scale-100' 
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50 scale-95'
                }`}
              >
                <LayoutDashboard className="w-4 h-4 mr-2" />
                Dashboard
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        
        {/* Error State if not authenticated */}
        {!user && (
           <div className="bg-red-50/80 backdrop-blur-sm border-l-4 border-red-500 p-5 rounded-2xl shadow-sm mb-8">
             <div className="flex items-center">
               <AlertCircle className="h-6 w-6 text-red-500 mr-3" />
               <p className="text-red-800 font-medium">Connection required. Please check your network.</p>
             </div>
           </div>
        )}

        {/* Tab Content: Submit */}
        {activeTab === 'submit' && user && (
          <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl shadow-indigo-100/50 border border-white overflow-hidden relative">
              {/* Decorative top border */}
              <div className="h-1.5 w-full bg-gradient-to-r from-indigo-500 via-blue-500 to-purple-500"></div>
              
              <div className="px-8 py-8 border-b border-slate-100">
                <h2 className="text-2xl font-bold text-slate-800 flex items-center tracking-tight">
                  Field Service Report
                </h2>
                <p className="text-slate-500 mt-2 font-medium">Log your activity details for the month below.</p>
              </div>

              <div className="p-8">
                {submitStatus && (
                  <div className={`mb-8 p-4 rounded-2xl flex items-start transform transition-all animate-in fade-in slide-in-from-top-2 ${
                    submitStatus.type === 'success' 
                    ? 'bg-emerald-50 border border-emerald-100 shadow-sm shadow-emerald-100/50' 
                    : 'bg-red-50 border border-red-100 shadow-sm shadow-red-100/50'
                  }`}>
                    {submitStatus.type === 'success' ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 mr-3 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
                    )}
                    <p className={`text-sm font-semibold ${
                      submitStatus.type === 'success' ? 'text-emerald-800' : 'text-red-800'
                    }`}>
                      {submitStatus.message}
                    </p>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-7">
                  {/* Name Input */}
                  <div>
                    <label htmlFor="name" className="block text-sm font-semibold text-slate-700 mb-2 ml-1">
                      Full Name
                    </label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors group-focus-within:text-indigo-600 text-slate-400">
                        <User className="h-5 w-5" />
                      </div>
                      <input
                        type="text"
                        name="name"
                        id="name"
                        required
                        value={formData.name}
                        onChange={handleInputChange}
                        className="pl-11 block w-full rounded-2xl border-slate-200 bg-slate-50/50 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 focus:bg-white text-base py-3 transition-all duration-200"
                        placeholder="e.g. John Doe"
                      />
                    </div>
                  </div>

                  {/* Month & Year Selection */}
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div>
                      <label htmlFor="month" className="block text-sm font-semibold text-slate-700 mb-2 ml-1">
                        Month
                      </label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors group-focus-within:text-indigo-600 text-slate-400">
                          <Calendar className="h-5 w-5" />
                        </div>
                        <select
                          name="month"
                          id="month"
                          value={formData.month}
                          onChange={handleInputChange}
                          className="pl-11 block w-full rounded-2xl border-slate-200 bg-slate-50/50 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 focus:bg-white text-base py-3 transition-all duration-200 appearance-none"
                        >
                          {months.map(m => (
                            <option key={m.value} value={m.value}>{m.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label htmlFor="year" className="block text-sm font-semibold text-slate-700 mb-2 ml-1">
                        Year
                      </label>
                      <select
                        name="year"
                        id="year"
                        value={formData.year}
                        onChange={handleInputChange}
                        className="block w-full rounded-2xl border-slate-200 bg-slate-50/50 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 focus:bg-white text-base py-3 px-4 transition-all duration-200 appearance-none"
                      >
                        {years.map(y => (
                          <option key={y} value={y}>{y}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="my-8 flex items-center">
                     <div className="flex-grow h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent"></div>
                     <span className="px-4 text-xs font-semibold text-slate-400 uppercase tracking-widest">Metrics</span>
                     <div className="flex-grow h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent"></div>
                  </div>

                  {/* Activity Metrics */}
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                    {/* Hours */}
                    <div className="relative group">
                      <label htmlFor="hours" className="block text-sm font-semibold text-slate-700 mb-2 ml-1 text-center sm:text-left">
                        Hours
                      </label>
                      <div className="relative">
                         <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors group-focus-within:text-blue-500 text-slate-400">
                          <Clock className="h-5 w-5" />
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
                          className="pl-11 block w-full rounded-2xl border-slate-200 bg-slate-50/50 shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:bg-white text-base py-3 transition-all duration-200 font-medium"
                          placeholder="0.0"
                        />
                      </div>
                    </div>

                    {/* Return Visits (RV) */}
                    <div className="relative group">
                      <label htmlFor="rv" className="block text-sm font-semibold text-slate-700 mb-2 ml-1 text-center sm:text-left whitespace-nowrap">
                        Return Visits
                      </label>
                       <div className="relative">
                         <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors group-focus-within:text-indigo-500 text-slate-400">
                          <Video className="h-5 w-5" />
                        </div>
                        <input
                          type="number"
                          min="0"
                          name="rv"
                          id="rv"
                          required
                          value={formData.rv}
                          onChange={handleInputChange}
                          className="pl-11 block w-full rounded-2xl border-slate-200 bg-slate-50/50 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 focus:bg-white text-base py-3 transition-all duration-200 font-medium"
                          placeholder="0"
                        />
                      </div>
                    </div>

                    {/* Bible Studies (BS) */}
                    <div className="relative group">
                      <label htmlFor="bs" className="block text-sm font-semibold text-slate-700 mb-2 ml-1 text-center sm:text-left whitespace-nowrap">
                        Bible Studies
                      </label>
                      <div className="relative">
                         <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors group-focus-within:text-purple-500 text-slate-400">
                          <BookOpen className="h-5 w-5" />
                        </div>
                        <input
                          type="number"
                          min="0"
                          name="bs"
                          id="bs"
                          required
                          value={formData.bs}
                          onChange={handleInputChange}
                          className="pl-11 block w-full rounded-2xl border-slate-200 bg-slate-50/50 shadow-sm focus:border-purple-500 focus:ring-purple-500 focus:bg-white text-base py-3 transition-all duration-200 font-medium"
                          placeholder="0"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="pt-6 mt-8">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full flex justify-center items-center py-4 px-4 rounded-2xl shadow-lg shadow-indigo-200 text-base font-bold text-white bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-70 disabled:cursor-not-allowed transform hover:-translate-y-0.5 transition-all duration-200"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="animate-spin -ml-1 mr-3 h-5 w-5 text-indigo-100" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Send className="-ml-1 mr-3 h-5 w-5" />
                          Submit Final Report
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
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* Filters Bar */}
            <div className="bg-white/80 backdrop-blur-xl p-5 rounded-3xl shadow-lg shadow-indigo-100/40 border border-white flex flex-col sm:flex-row gap-4 items-center">
              <div className="w-full sm:w-auto flex-grow relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors group-focus-within:text-indigo-600 text-slate-400">
                  <Search className="h-5 w-5" />
                </div>
                <input
                  type="text"
                  placeholder="Search by name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-11 block w-full rounded-2xl border-slate-200 bg-slate-50/50 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 focus:bg-white sm:text-sm py-3 transition-all duration-200"
                />
              </div>
              
              <div className="w-full sm:w-auto flex gap-4">
                <select
                  value={filterMonth}
                  onChange={(e) => setFilterMonth(e.target.value)}
                  className="block w-full sm:w-44 rounded-2xl border-slate-200 bg-slate-50/50 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 focus:bg-white sm:text-sm py-3 px-4 transition-all duration-200 appearance-none font-medium"
                >
                  <option value="">All Months</option>
                  {months.map(m => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>

                <select
                  value={filterYear}
                  onChange={(e) => setFilterYear(e.target.value)}
                  className="block w-full sm:w-36 rounded-2xl border-slate-200 bg-slate-50/50 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 focus:bg-white sm:text-sm py-3 px-4 transition-all duration-200 appearance-none font-medium"
                >
                  <option value="">All Years</option>
                  {years.map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Summary Cards */}
            {!loadingReports && filteredReports.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <div className="bg-white/90 backdrop-blur-md p-6 rounded-3xl shadow-lg shadow-indigo-100/30 border border-white flex items-center transform transition-transform hover:-translate-y-1">
                   <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100/50 text-blue-600 mr-5 border border-blue-100">
                     <Clock className="h-7 w-7" />
                   </div>
                   <div>
                     <p className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Total Hours</p>
                     <p className="text-3xl font-black text-slate-800 tracking-tight mt-1">
                       {filteredReports.reduce((sum, r) => sum + (parseFloat(r.hours) || 0), 0).toFixed(1)}
                     </p>
                   </div>
                </div>
                <div className="bg-white/90 backdrop-blur-md p-6 rounded-3xl shadow-lg shadow-indigo-100/30 border border-white flex items-center transform transition-transform hover:-translate-y-1">
                   <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50 to-indigo-100/50 text-indigo-600 mr-5 border border-indigo-100">
                     <Video className="h-7 w-7" />
                   </div>
                   <div>
                     <p className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Return Visits</p>
                     <p className="text-3xl font-black text-slate-800 tracking-tight mt-1">
                       {filteredReports.reduce((sum, r) => sum + (parseInt(r.rv, 10) || 0), 0)}
                     </p>
                   </div>
                </div>
                <div className="bg-white/90 backdrop-blur-md p-6 rounded-3xl shadow-lg shadow-indigo-100/30 border border-white flex items-center transform transition-transform hover:-translate-y-1">
                   <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-50 to-purple-100/50 text-purple-600 mr-5 border border-purple-100">
                     <BookOpen className="h-7 w-7" />
                   </div>
                   <div>
                     <p className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Bible Studies</p>
                     <p className="text-3xl font-black text-slate-800 tracking-tight mt-1">
                       {filteredReports.reduce((sum, r) => sum + (parseInt(r.bs, 10) || 0), 0)}
                     </p>
                   </div>
                </div>
              </div>
            )}

            {/* Data Table */}
            <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-xl shadow-indigo-100/40 border border-white overflow-hidden">
              {loadingReports ? (
                 <div className="p-20 flex flex-col items-center justify-center text-slate-500">
                   <div className="relative mb-6">
                      <div className="absolute inset-0 bg-indigo-500 rounded-full blur-md opacity-20 animate-pulse"></div>
                      <Loader2 className="h-10 w-10 animate-spin text-indigo-500 relative z-10" />
                   </div>
                   <p className="font-medium">Fetching reports database...</p>
                 </div>
              ) : filteredReports.length === 0 ? (
                <div className="p-20 flex flex-col items-center justify-center text-slate-500 text-center">
                  <div className="bg-slate-50 p-6 rounded-full mb-6">
                    <Table2 className="h-12 w-12 text-slate-300" />
                  </div>
                  <p className="text-xl font-bold text-slate-800">No reports found</p>
                  <p className="text-base text-slate-500 mt-2 max-w-sm">Try adjusting your filters or head over to the Submit tab to log a new report.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-100">
                    <thead className="bg-slate-50/50">
                      <tr>
                        <th scope="col" className="px-8 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-widest">
                          Publisher
                        </th>
                        <th scope="col" className="px-8 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-widest">
                          Period
                        </th>
                        <th scope="col" className="px-8 py-4 text-center text-xs font-bold text-slate-400 uppercase tracking-widest">
                          Hours
                        </th>
                        <th scope="col" className="px-8 py-4 text-center text-xs font-bold text-slate-400 uppercase tracking-widest">
                          RV
                        </th>
                        <th scope="col" className="px-8 py-4 text-center text-xs font-bold text-slate-400 uppercase tracking-widest">
                          BS
                        </th>
                        <th scope="col" className="px-8 py-4 text-right text-xs font-bold text-slate-400 uppercase tracking-widest">
                          Logged On
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-50">
                      {filteredReports.map((report) => (
                        <tr key={report.id} className="hover:bg-indigo-50/30 transition-colors group">
                          <td className="px-8 py-5 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-100 to-blue-50 flex items-center justify-center text-indigo-700 font-bold text-lg mr-4 border border-indigo-100/50 shadow-sm">
                                {report.name.charAt(0).toUpperCase()}
                              </div>
                              <div className="text-sm font-bold text-slate-800">{report.name}</div>
                            </div>
                          </td>
                          <td className="px-8 py-5 whitespace-nowrap">
                            <div className="text-sm font-medium text-slate-600 bg-slate-100/80 inline-flex px-3 py-1 rounded-lg">
                              {getMonthName(report.month)} {report.year}
                            </div>
                          </td>
                          <td className="px-8 py-5 whitespace-nowrap text-center">
                             <div className="text-sm font-bold text-blue-600 bg-blue-50/50 inline-flex px-3 py-1 rounded-lg min-w-[3rem] justify-center">
                               {report.hours}
                             </div>
                          </td>
                          <td className="px-8 py-5 whitespace-nowrap text-center">
                            <div className="text-sm font-bold text-indigo-600 bg-indigo-50/50 inline-flex px-3 py-1 rounded-lg min-w-[3rem] justify-center">
                               {report.rv}
                             </div>
                          </td>
                          <td className="px-8 py-5 whitespace-nowrap text-center">
                            <div className="text-sm font-bold text-purple-600 bg-purple-50/50 inline-flex px-3 py-1 rounded-lg min-w-[3rem] justify-center">
                               {report.bs}
                             </div>
                          </td>
                          <td className="px-8 py-5 whitespace-nowrap text-right text-sm font-medium text-slate-400 group-hover:text-slate-500 transition-colors">
                            {report.createdAt ? new Date(report.createdAt.toMillis()).toLocaleDateString() : 'Just now'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
