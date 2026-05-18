import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged
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
  WifiOff
} from 'lucide-react';

// We have replaced your real credentials with dummy configuration keys so you can run the preview.
const firebaseConfig = {
  apiKey: "demo-api-key",
  authDomain: "your-project-id.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project-id.firebasestorage.app",
  messagingSenderId: "000000000000",
  appId: "1:000000000000:web:000000000000"
};

// Detect if we should run in local simulated preview mode
const isDemoMode = firebaseConfig.apiKey === "demo-api-key" || firebaseConfig.apiKey.startsWith("YOUR_");

let app, auth, db;
if (!isDemoMode) {
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
  } catch (e) {
    console.warn("Firebase initialization failed, running in Preview Mode.", e);
  }
}

// Sample pre-populated reports for the preview environment
const defaultPreviewReports = [
  {
    id: "preview-1",
    name: "John Doe",
    month: 5,
    year: 2026,
    hours: 12.5,
    rv: 8,
    bs: 2,
    createdAt: { toMillis: () => Date.now() - 3600000 }
  },
  {
    id: "preview-2",
    name: "Jane Smith",
    month: 5,
    year: 2026,
    hours: 18.0,
    rv: 12,
    bs: 4,
    createdAt: { toMillis: () => Date.now() - 86400000 }
  },
  {
    id: "preview-3",
    name: "Michael Johnson",
    month: 4,
    year: 2026,
    hours: 8.5,
    rv: 5,
    bs: 1,
    createdAt: { toMillis: () => Date.now() - 172800000 }
  }
];

export default function App() {
  const [user, setUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [reports, setReports] = useState([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [activeTab, setActiveTab] = useState('submit'); // 'submit' or 'view'
  const [isLocalMode, setIsLocalMode] = useState(isDemoMode);
  
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

  // Handle Authentication Setup (with local fallbacks)
  useEffect(() => {
    if (isLocalMode) {
      setUser({ uid: "preview-user-123", isAnonymous: true });
      setLoadingAuth(false);
      return;
    }

    const initAuth = async () => {
      try {
        await signInAnonymously(auth);
      } catch (error) {
        console.warn("Auth failed or blocked. Activating local preview mode.", error);
        setIsLocalMode(true);
        setUser({ uid: "preview-user-123", isAnonymous: true });
      } finally {
        setLoadingAuth(false);
      }
    };

    initAuth();

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      }
      setLoadingAuth(false);
    });

    return () => unsubscribe();
  }, [isLocalMode]);

  // Handle Real-Time Database Sync / Mock Database Simulation
  useEffect(() => {
    if (!user) {
      setReports([]);
      setLoadingReports(false);
      return;
    }

    setLoadingReports(true);

    if (isLocalMode) {
      // Local Mode: Load from LocalStorage or seed with default mock values
      const localData = localStorage.getItem('dslc_preview_reports');
      if (localData) {
        try {
          const parsed = JSON.parse(localData);
          setReports(parsed);
        } catch (e) {
          setReports(defaultPreviewReports);
        }
      } else {
        setReports(defaultPreviewReports);
        localStorage.setItem('dslc_preview_reports', JSON.stringify(defaultPreviewReports));
      }
      setLoadingReports(false);
      return;
    }

    // Cloud Mode: Live synchronization with Firebase Firestore
    const appId = typeof __app_id !== 'undefined' ? __app_id : 'dslc-report-app';
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
      console.warn("Firestore access error. Falling back to local preview storage.", error);
      setIsLocalMode(true);
    });

    return () => unsubscribe();
  }, [user, isLocalMode]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;

    setSubmitting(true);
    setSubmitStatus(null);

    const hoursNum = parseFloat(formData.hours) || 0;
    const rvNum = parseInt(formData.rv, 10) || 0;
    const bsNum = parseInt(formData.bs, 10) || 0;

    if (isLocalMode) {
      // Local storage implementation for the Preview Sandbox
      setTimeout(() => {
        const newReport = {
          id: `local-${Date.now()}`,
          name: formData.name,
          month: parseInt(formData.month, 10),
          year: parseInt(formData.year, 10),
          hours: hoursNum,
          rv: rvNum,
          bs: bsNum,
          submitterId: user.uid,
          createdAt: { toMillis: () => Date.now() }
        };

        const updatedReports = [newReport, ...reports];
        setReports(updatedReports);
        localStorage.setItem('dslc_preview_reports', JSON.stringify(updatedReports));

        setSubmitStatus({ type: 'success', message: 'Success! Report added to Preview Sandbox.' });
        setFormData(prev => ({ ...prev, hours: '', rv: '', bs: '' }));
        setSubmitting(false);

        setTimeout(() => setSubmitStatus(null), 4000);
      }, 600);
      return;
    }

    try {
      const appId = typeof __app_id !== 'undefined' ? __app_id : 'dslc-report-app';
      const reportsRef = collection(db, 'artifacts', appId, 'public', 'data', 'reports');

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
      setFormData(prev => ({ ...prev, hours: '', rv: '', bs: '' }));
      setTimeout(() => setSubmitStatus(null), 4000);

    } catch (error) {
      console.error("Error submitting report:", error);
      setSubmitStatus({ type: 'error', message: 'Failed to submit report. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  // Filter application
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
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
        <p className="text-slate-600 font-medium mt-4">Setting up database sandbox...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 antialiased">
      
      {/* Clean Solid Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo Area */}
            <div className="flex items-center space-x-2">
              <div className="bg-indigo-600 p-2 rounded-lg text-white shadow-sm">
                <FileText size={20} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 tracking-tight leading-none">
                  DSLC <span className="text-indigo-600 font-medium">Report</span>
                </h1>
                {isLocalMode && (
                  <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 inline-flex items-center mt-1">
                    <WifiOff className="w-3 h-3 mr-1" />
                    Preview Sandbox
                  </span>
                )}
              </div>
            </div>
            
            {/* Tab Navigation */}
            <div className="flex space-x-1 bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setActiveTab('submit')}
                className={`flex items-center px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-150 ${
                  activeTab === 'submit' 
                    ? 'bg-white text-indigo-600 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <FileText className="w-4 h-4 mr-1.5" />
                Submit
              </button>
              <button
                onClick={() => setActiveTab('view')}
                className={`flex items-center px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-150 ${
                  activeTab === 'view' 
                    ? 'bg-white text-indigo-600 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <LayoutDashboard className="w-4 h-4 mr-1.5" />
                Dashboard
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Active Local Preview Indicator */}
        {isLocalMode && (
           <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg mb-6">
             <div className="flex items-start">
               <WifiOff className="h-5 w-5 text-amber-600 mr-2.5 mt-0.5 flex-shrink-0" />
               <div>
                 <p className="text-amber-800 font-semibold text-sm">Running in Local Preview Mode</p>
                 <p className="text-amber-700 text-xs mt-0.5">
                   The app has successfully loaded into a simulation environment using demo API keys. Your submitted data is stored in your web browser's local memory, making it 100% testable right here!
                 </p>
               </div>
             </div>
           </div>
        )}

        {/* Form Submission Tab */}
        {activeTab === 'submit' && (
          <div className="max-w-xl mx-auto">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-6 border-b border-slate-100 bg-slate-50/50">
                <h2 className="text-lg font-bold text-slate-900">
                  Submit Field Service Report
                </h2>
                <p className="text-slate-500 text-sm mt-1">Please enter your activity details for the month below.</p>
              </div>

              {}
              <div className="p-6">
                {submitStatus && (
                  <div className={`mb-6 p-4 rounded-xl flex items-start ${
                    submitStatus.type === 'success' 
                    ? 'bg-emerald-50 border border-emerald-200' 
                    : 'bg-red-50 border border-red-200'
                  }`}>
                    {submitStatus.type === 'success' ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 mr-2.5 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 mr-2.5 flex-shrink-0" />
                    )}
                    <p className={`text-sm font-medium ${
                      submitStatus.type === 'success' ? 'text-emerald-800' : 'text-red-800'
                    }`}>
                      {submitStatus.message}
                    </p>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Name Input */}
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1.5">
                      Full Name
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <User className="h-5 w-5" />
                      </div>
                      <input
                        type="text"
                        name="name"
                        id="name"
                        required
                        value={formData.name}
                        onChange={handleInputChange}
                        className="pl-10 block w-full rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm py-2.5 bg-white transition-all shadow-sm"
                        placeholder="e.g. John Doe"
                      />
                    </div>
                  </div>

                  {/* Month & Year Selection */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="month" className="block text-sm font-medium text-slate-700 mb-1.5">
                        Month
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                          <Calendar className="h-5 w-5" />
                        </div>
                        <select
                          name="month"
                          id="month"
                          value={formData.month}
                          onChange={handleInputChange}
                          className="pl-10 block w-full rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm py-2.5 bg-white transition-all shadow-sm"
                        >
                          {months.map(m => (
                            <option key={m.value} value={m.value}>{m.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label htmlFor="year" className="block text-sm font-medium text-slate-700 mb-1.5">
                        Year
                      </label>
                      <select
                        name="year"
                        id="year"
                        value={formData.year}
                        onChange={handleInputChange}
                        className="block w-full rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm py-2.5 bg-white transition-all shadow-sm"
                      >
                        {years.map(y => (
                          <option key={y} value={y}>{y}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 my-4"></div>

                  {/* Activity Metrics */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    {/* Hours */}
                    <div>
                      <label htmlFor="hours" className="block text-sm font-medium text-slate-700 mb-1.5">
                        Hours
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
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
                          className="pl-10 block w-full rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm py-2.5 bg-white transition-all shadow-sm font-medium"
                          placeholder="0.0"
                        />
                      </div>
                    </div>

                    {/* Return Visits (RV) */}
                    <div>
                      <label htmlFor="rv" className="block text-sm font-medium text-slate-700 mb-1.5">
                        Return Visits
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
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
                          className="pl-10 block w-full rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm py-2.5 bg-white transition-all shadow-sm font-medium"
                          placeholder="0"
                        />
                      </div>
                    </div>

                    {/* Bible Studies (BS) */}
                    <div>
                      <label htmlFor="bs" className="block text-sm font-medium text-slate-700 mb-1.5">
                        Bible Studies
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
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
                          className="pl-10 block w-full rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm py-2.5 bg-white transition-all shadow-sm font-medium"
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
                      className="w-full flex justify-center items-center py-3 px-4 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-70 disabled:cursor-not-allowed transition-all duration-150 shadow-sm"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          <Send className="-ml-1 mr-2 h-4 w-4" />
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

        {/* Dashboard View Tab */}
        {activeTab === 'view' && (
          <div className="space-y-6">
            
            {}
            {/* Filters Bar */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3 items-center">
              <div className="w-full sm:w-auto flex-grow relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Search className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  placeholder="Search by name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 block w-full rounded-lg border border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm py-2 bg-white transition-all"
                />
              </div>
              
              <div className="w-full sm:w-auto flex gap-3">
                <select
                  value={filterMonth}
                  onChange={(e) => setFilterMonth(e.target.value)}
                  className="block w-full sm:w-40 rounded-lg border border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm py-2 px-3 bg-white transition-all font-medium text-slate-700"
                >
                  <option value="">All Months</option>
                  {months.map(m => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>

                <select
                  value={filterYear}
                  onChange={(e) => setFilterYear(e.target.value)}
                  className="block w-full sm:w-32 rounded-lg border border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm py-2 px-3 bg-white transition-all font-medium text-slate-700"
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
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center animate-fade-in">
                   <div className="p-3 rounded-lg bg-indigo-50 text-indigo-600 mr-4">
                     <Clock className="h-6 w-6" />
                   </div>
                   <div>
                     <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Hours</p>
                     <p className="text-2xl font-bold text-slate-900 mt-0.5">
                       {filteredReports.reduce((sum, r) => sum + (parseFloat(r.hours) || 0), 0).toFixed(1)}
                     </p>
                   </div>
                </div>
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center">
                   <div className="p-3 rounded-lg bg-indigo-50 text-indigo-600 mr-4">
                     <Video className="h-6 w-6" />
                   </div>
                   <div>
                     <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Return Visits</p>
                     <p className="text-2xl font-bold text-slate-900 mt-0.5">
                       {filteredReports.reduce((sum, r) => sum + (parseInt(r.rv, 10) || 0), 0)}
                     </p>
                   </div>
                </div>
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center">
                   <div className="p-3 rounded-lg bg-indigo-50 text-indigo-600 mr-4">
                     <BookOpen className="h-6 w-6" />
                   </div>
                   <div>
                     <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Bible Studies</p>
                     <p className="text-2xl font-bold text-slate-900 mt-0.5">
                       {filteredReports.reduce((sum, r) => sum + (parseInt(r.bs, 10) || 0), 0)}
                     </p>
                   </div>
                </div>
              </div>
            )}

            {}
            {/* Data Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              {loadingReports ? (
                 <div className="p-16 flex flex-col items-center justify-center text-slate-500">
                   <Loader2 className="h-8 w-8 animate-spin text-indigo-500 mb-3" />
                   <p className="text-sm font-medium">Fetching reports...</p>
                 </div>
              ) : filteredReports.length === 0 ? (
                <div className="p-16 flex flex-col items-center justify-center text-slate-500 text-center">
                  <Table2 className="h-10 w-10 text-slate-300 mb-3" />
                  <p className="font-bold text-slate-800">No reports found</p>
                  <p className="text-sm text-slate-500 mt-1">Try adjusting your filters or head to the Submit tab to add a report.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left font-semibold text-slate-600 uppercase text-xs tracking-wider">
                          Publisher
                        </th>
                        <th scope="col" className="px-6 py-3 text-left font-semibold text-slate-600 uppercase text-xs tracking-wider">
                          Period
                        </th>
                        <th scope="col" className="px-6 py-3 text-center font-semibold text-slate-600 uppercase text-xs tracking-wider">
                          Hours
                        </th>
                        <th scope="col" className="px-6 py-3 text-center font-semibold text-slate-600 uppercase text-xs tracking-wider">
                          RV
                        </th>
                        <th scope="col" className="px-6 py-3 text-center font-semibold text-slate-600 uppercase text-xs tracking-wider">
                          BS
                        </th>
                        <th scope="col" className="px-6 py-3 text-right font-semibold text-slate-600 uppercase text-xs tracking-wider">
                          Logged On
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-100">
                      {filteredReports.map((report) => (
                        <tr key={report.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 font-bold text-sm mr-3 border border-slate-200">
                                {report.name.charAt(0).toUpperCase()}
                              </div>
                              <div className="font-semibold text-slate-900">{report.name}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-slate-600 bg-slate-100 px-2.5 py-1 rounded text-xs font-medium">
                              {getMonthName(report.month)} {report.year}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center font-semibold text-slate-800">
                             {report.hours}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center font-semibold text-slate-800">
                             {report.rv}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center font-semibold text-slate-800">
                             {report.bs}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-xs font-medium text-slate-400">
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
