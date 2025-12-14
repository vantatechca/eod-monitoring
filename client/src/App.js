import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Users, Clock, FileText, Download, Plus, X, 
  Upload, Calendar, Filter, ChevronDown, Trash2,
  Eye, BarChart3, TrendingUp, CheckSquare, ChevronLeft, ChevronRight, Edit
} from 'lucide-react';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [employees, setEmployees] = useState([]);
  const [reports, setReports] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState([]);
  
  // Modals
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showEditReportModal, setShowEditReportModal] = useState(false);
  const [showQuickAddModal, setShowQuickAddModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [editingReport, setEditingReport] = useState(null);
  const [showGallery, setShowGallery] = useState(false);
  const [galleryImages, setGalleryImages] = useState([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  // Quick Entry
  const [quickForm, setQuickForm] = useState({
    employee_id: '',
    date: new Date().toISOString().split('T')[0],
    hours: '',
    project: ''
  });
  const [lastReport, setLastReport] = useState(null);
  
  // Bulk Operations
  const [selectedReports, setSelectedReports] = useState([]);
  const [showBulkActions, setShowBulkActions] = useState(false);
  
  // List View
  const [viewMode, setViewMode] = useState('cards'); // 'cards' or 'list'
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  
  // Productivity Insights
  const [insights, setInsights] = useState(null);
  
  // Filters
  const [filters, setFilters] = useState({
    employee_id: '',
    start_date: '',
    end_date: '',
    project: ''
  });
  
  // Analytics filters
  const [analyticsFilters, setAnalyticsFilters] = useState({
    selected_employees: [],
    selected_projects: [],
    start_date: '',
    end_date: ''
  });
  const [analyticsData, setAnalyticsData] = useState([]);
  const [projectAnalytics, setProjectAnalytics] = useState([]);
  
  // Forms
  const [employeeForm, setEmployeeForm] = useState({ name: '', email: '', role: '' });
  const [reportForm, setReportForm] = useState({
    employee_id: '',
    date: new Date().toISOString().split('T')[0],
    hours: '',
    project: '',
    description: '',
    screenshots: []
  });
  const [screenshotPreviews, setScreenshotPreviews] = useState([]);

  useEffect(() => {
    fetchEmployees();
    fetchReports();
    fetchStats();
    fetchProjects();
  }, []);

  useEffect(() => {
    fetchReports();
  }, [filters]);

  useEffect(() => {
    if (employees.length > 0) {
      fetchInsights();
    }
  }, [employees, reports]);

  useEffect(() => {
    setShowBulkActions(selectedReports.length > 0);
  }, [selectedReports]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!showGallery) return;
      
      if (e.key === 'ArrowRight') {
        nextImage();
      } else if (e.key === 'ArrowLeft') {
        prevImage();
      } else if (e.key === 'Escape') {
        closeGallery();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showGallery, currentImageIndex, galleryImages]);

  const fetchEmployees = async () => {
    try {
      const response = await axios.get(`${API_URL}/employees`);
      setEmployees(response.data);
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  const fetchProjects = async () => {
    try {
      const response = await axios.get(`${API_URL}/projects`);
      setProjects(response.data);
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const fetchReports = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.employee_id) params.append('employee_id', filters.employee_id);
      if (filters.start_date) params.append('start_date', filters.start_date);
      if (filters.end_date) params.append('end_date', filters.end_date);
      if (filters.project) params.append('project', filters.project);
      
      const response = await axios.get(`${API_URL}/reports?${params}`);
      setReports(response.data);
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API_URL}/stats`);
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleAddEmployee = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/employees`, employeeForm);
      setEmployeeForm({ name: '', email: '', role: '' });
      setShowEmployeeModal(false);
      fetchEmployees();
      fetchStats();
    } catch (error) {
      alert(error.response?.data?.error || 'Error adding employee');
    }
  };

  const handleDeleteEmployee = async (id) => {
    if (!window.confirm('Are you sure you want to delete this employee?')) return;
    try {
      await axios.delete(`${API_URL}/employees/${id}`);
      fetchEmployees();
      fetchStats();
    } catch (error) {
      alert('Error deleting employee');
    }
  };

  const handleAddReport = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('employee_id', reportForm.employee_id);
    formData.append('date', reportForm.date);
    formData.append('hours', reportForm.hours);
    formData.append('project', reportForm.project);
    formData.append('description', reportForm.description);
    
    // Append screenshots and their captions
    reportForm.screenshots.forEach(file => {
      formData.append('screenshots', file);
    });
    
    // Send captions as JSON array
    const captions = screenshotPreviews.map(p => p.caption);
    formData.append('captions', JSON.stringify(captions));

    try {
      await axios.post(`${API_URL}/reports`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setReportForm({
        employee_id: '',
        date: new Date().toISOString().split('T')[0],
        hours: '',
        project: '',
        description: '',
        screenshots: []
      });
      setScreenshotPreviews([]);
      setShowReportModal(false);
      fetchReports();
      fetchStats();
      fetchProjects();
    } catch (error) {
      alert(error.response?.data?.error || 'Error submitting report');
    }
  };

  const handleDeleteReport = async (id) => {
    if (!window.confirm('Are you sure you want to delete this report?')) return;
    try {
      await axios.delete(`${API_URL}/reports/${id}`);
      fetchReports();
      fetchStats();
    } catch (error) {
      alert('Error deleting report');
    }
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setReportForm({ ...reportForm, screenshots: files });
    
    // Create previews
    const previews = files.map((file, index) => ({
      file,
      url: URL.createObjectURL(file),
      caption: '',
      index
    }));
    setScreenshotPreviews(previews);
  };

  const updateScreenshotCaption = (index, caption) => {
    const updated = [...screenshotPreviews];
    updated[index].caption = caption;
    setScreenshotPreviews(updated);
  };

  const removeScreenshot = (index) => {
    const updatedFiles = reportForm.screenshots.filter((_, i) => i !== index);
    const updatedPreviews = screenshotPreviews.filter((_, i) => i !== index);
    setReportForm({ ...reportForm, screenshots: updatedFiles });
    setScreenshotPreviews(updatedPreviews);
  };

  const openGallery = (screenshots, startIndex = 0) => {
    setGalleryImages(screenshots);
    setCurrentImageIndex(startIndex);
    setShowGallery(true);
  };

  const closeGallery = () => {
    setShowGallery(false);
    setGalleryImages([]);
    setCurrentImageIndex(0);
  };

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % galleryImages.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + galleryImages.length) % galleryImages.length);
  };

  const isReportEditable = (report) => {
    const reportDate = new Date(report.created_at);
    const now = new Date();
    const daysDifference = (now - reportDate) / (1000 * 60 * 60 * 24);
    return daysDifference <= 3;
  };

  const handleEditReport = (report) => {
    setEditingReport(report);
    setReportForm({
      employee_id: report.employee_id,
      date: report.date,
      hours: report.hours,
      project: report.project || '',
      description: report.description || '',
      screenshots: []
    });
    setScreenshotPreviews([]);
    setShowEditReportModal(true);
  };

  const handleUpdateReport = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('employee_id', reportForm.employee_id);
    formData.append('date', reportForm.date);
    formData.append('hours', reportForm.hours);
    formData.append('project', reportForm.project);
    formData.append('description', reportForm.description);
    
    // Append new screenshots if any
    reportForm.screenshots.forEach(file => {
      formData.append('screenshots', file);
    });
    
    // Send captions for new screenshots
    const captions = screenshotPreviews.map(p => p.caption);
    formData.append('captions', JSON.stringify(captions));

    try {
      await axios.put(`${API_URL}/reports/${editingReport.id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setReportForm({
        employee_id: '',
        date: new Date().toISOString().split('T')[0],
        hours: '',
        project: '',
        description: '',
        screenshots: []
      });
      setScreenshotPreviews([]);
      setShowEditReportModal(false);
      setEditingReport(null);
      fetchReports();
      fetchStats();
      fetchProjects();
    } catch (error) {
      alert(error.response?.data?.error || 'Error updating report');
    }
  };

  const handleExportCSV = () => {
    const params = new URLSearchParams();
    if (filters.employee_id) params.append('employee_id', filters.employee_id);
    if (filters.start_date) params.append('start_date', filters.start_date);
    if (filters.end_date) params.append('end_date', filters.end_date);
    if (filters.project) params.append('project', filters.project);
    
    window.open(`${API_URL}/reports/export/csv?${params}`, '_blank');
  };

  const clearFilters = () => {
    setFilters({ employee_id: '', start_date: '', end_date: '', project: '' });
  };

  const fetchAnalytics = async () => {
    if (analyticsFilters.selected_employees.length === 0 && analyticsFilters.selected_projects.length === 0) {
      setAnalyticsData([]);
      setProjectAnalytics([]);
      return;
    }

    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (analyticsFilters.start_date) params.append('start_date', analyticsFilters.start_date);
      if (analyticsFilters.end_date) params.append('end_date', analyticsFilters.end_date);
      
      const response = await axios.get(`${API_URL}/reports?${params}`);
      const allReports = response.data;
      
      // Calculate totals for selected employees
      const employeeTotals = analyticsFilters.selected_employees.map(empId => {
        const employee = employees.find(e => e.id === parseInt(empId));
        const employeeReports = allReports.filter(r => r.employee_id === parseInt(empId));
        const totalHours = employeeReports.reduce((sum, r) => sum + parseFloat(r.hours || 0), 0);
        const reportCount = employeeReports.length;
        
        return {
          employee_id: empId,
          employee_name: employee?.name || 'Unknown',
          employee_role: employee?.role || '',
          employee_email: employee?.email || '',
          total_hours: totalHours,
          report_count: reportCount,
          reports: employeeReports
        };
      });
      
      setAnalyticsData(employeeTotals);
      
      // Calculate totals for selected projects
      const projectTotals = analyticsFilters.selected_projects.map(proj => {
        const projectReports = allReports.filter(r => r.project === proj);
        const totalHours = projectReports.reduce((sum, r) => sum + parseFloat(r.hours || 0), 0);
        const reportCount = projectReports.length;
        const uniqueEmployees = [...new Set(projectReports.map(r => r.employee_id))].length;
        
        return {
          project_name: proj,
          total_hours: totalHours,
          report_count: reportCount,
          employee_count: uniqueEmployees,
          reports: projectReports
        };
      });
      
      setProjectAnalytics(projectTotals);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEmployeeToggle = (empId) => {
    const currentSelected = [...analyticsFilters.selected_employees];
    const index = currentSelected.indexOf(empId.toString());
    
    if (index > -1) {
      currentSelected.splice(index, 1);
    } else {
      currentSelected.push(empId.toString());
    }
    
    setAnalyticsFilters({...analyticsFilters, selected_employees: currentSelected});
  };

  const handleProjectToggle = (proj) => {
    const currentSelected = [...analyticsFilters.selected_projects];
    const index = currentSelected.indexOf(proj);
    
    if (index > -1) {
      currentSelected.splice(index, 1);
    } else {
      currentSelected.push(proj);
    }
    
    setAnalyticsFilters({...analyticsFilters, selected_projects: currentSelected});
  };

  const selectAllEmployees = () => {
    const allIds = employees.map(e => e.id.toString());
    setAnalyticsFilters({...analyticsFilters, selected_employees: allIds});
  };

  const clearEmployeeSelection = () => {
    setAnalyticsFilters({...analyticsFilters, selected_employees: []});
  };

  const selectAllProjects = () => {
    setAnalyticsFilters({...analyticsFilters, selected_projects: [...projects]});
  };

  const clearProjectSelection = () => {
    setAnalyticsFilters({...analyticsFilters, selected_projects: []});
  };

  // Quick Entry Functions
  const handleQuickAddClick = () => {
    setQuickForm({
      employee_id: '',
      date: new Date().toISOString().split('T')[0],
      hours: '8',
      project: ''
    });
    setLastReport(null);
    setShowQuickAddModal(true);
  };

  const handleQuickEmployeeSelect = async (employeeId) => {
    setQuickForm({...quickForm, employee_id: employeeId});
    
    // Fetch last report for this employee
    try {
      const response = await axios.get(`${API_URL}/employees/${employeeId}/last-report`);
      if (response.data) {
        setLastReport(response.data);
        setQuickForm({
          employee_id: employeeId,
          date: new Date().toISOString().split('T')[0],
          hours: response.data.hours.toString(),
          project: response.data.project || ''
        });
      } else {
        setLastReport(null);
      }
    } catch (error) {
      console.error('Error fetching last report:', error);
    }
  };

  const handleQuickSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/reports`, {
        employee_id: quickForm.employee_id,
        date: quickForm.date,
        hours: quickForm.hours,
        project: quickForm.project,
        description: ''
      });
      setQuickForm({
        employee_id: '',
        date: new Date().toISOString().split('T')[0],
        hours: '',
        project: ''
      });
      setLastReport(null);
      setShowQuickAddModal(false);
      fetchReports();
      fetchStats();
      fetchProjects();
    } catch (error) {
      alert(error.response?.data?.error || 'Error submitting quick report');
    }
  };

  // Bulk Operations Functions
  const toggleReportSelection = (reportId) => {
    setSelectedReports(prev => 
      prev.includes(reportId) 
        ? prev.filter(id => id !== reportId)
        : [...prev, reportId]
    );
  };

  const selectAllReports = () => {
    setSelectedReports(reports.map(r => r.id));
  };

  const clearSelection = () => {
    setSelectedReports([]);
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`Delete ${selectedReports.length} selected reports?`)) return;
    
    try {
      await axios.post(`${API_URL}/reports/bulk-delete`, {
        report_ids: selectedReports
      });
      setSelectedReports([]);
      fetchReports();
      fetchStats();
    } catch (error) {
      alert('Error deleting reports');
    }
  };

  // List View Sorting
  const sortReports = (reportsToSort) => {
    return [...reportsToSort].sort((a, b) => {
      let aVal, bVal;
      
      switch(sortBy) {
        case 'date':
          aVal = new Date(a.date);
          bVal = new Date(b.date);
          break;
        case 'employee':
          aVal = a.employee_name.toLowerCase();
          bVal = b.employee_name.toLowerCase();
          break;
        case 'project':
          aVal = (a.project || '').toLowerCase();
          bVal = (b.project || '').toLowerCase();
          break;
        case 'hours':
          aVal = parseFloat(a.hours);
          bVal = parseFloat(b.hours);
          break;
        default:
          return 0;
      }
      
      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });
  };

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  // Productivity Insights
  const fetchInsights = async () => {
    try {
      const today = new Date();
      const thisWeekStart = new Date(today);
      thisWeekStart.setDate(today.getDate() - today.getDay());
      const lastWeekStart = new Date(thisWeekStart);
      lastWeekStart.setDate(lastWeekStart.getDate() - 7);
      const lastWeekEnd = new Date(thisWeekStart);
      lastWeekEnd.setDate(lastWeekEnd.getDate() - 1);

      const thisWeekParams = new URLSearchParams({
        start_date: thisWeekStart.toISOString().split('T')[0],
        end_date: today.toISOString().split('T')[0]
      });
      
      const lastWeekParams = new URLSearchParams({
        start_date: lastWeekStart.toISOString().split('T')[0],
        end_date: lastWeekEnd.toISOString().split('T')[0]
      });

      const [thisWeekRes, lastWeekRes] = await Promise.all([
        axios.get(`${API_URL}/reports?${thisWeekParams}`),
        axios.get(`${API_URL}/reports?${lastWeekParams}`)
      ]);

      const thisWeekReports = thisWeekRes.data;
      const lastWeekReports = lastWeekRes.data;

      // Calculate stats
      const thisWeekHours = thisWeekReports.reduce((sum, r) => sum + parseFloat(r.hours || 0), 0);
      const lastWeekHours = lastWeekReports.reduce((sum, r) => sum + parseFloat(r.hours || 0), 0);
      const hoursChange = thisWeekHours - lastWeekHours;
      const hoursChangePercent = lastWeekHours > 0 ? ((hoursChange / lastWeekHours) * 100).toFixed(1) : 0;

      // Average hours per employee
      const thisWeekAvg = employees.length > 0 ? thisWeekHours / employees.length : 0;
      const lastWeekAvg = employees.length > 0 ? lastWeekHours / employees.length : 0;
      const avgChange = thisWeekAvg - lastWeekAvg;
      const avgChangePercent = lastWeekAvg > 0 ? ((avgChange / lastWeekAvg) * 100).toFixed(1) : 0;

      // Most productive day
      const dayHours = {};
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      thisWeekReports.forEach(r => {
        const day = days[new Date(r.date).getDay()];
        dayHours[day] = (dayHours[day] || 0) + parseFloat(r.hours || 0);
      });
      const mostProductiveDay = Object.keys(dayHours).length > 0
        ? Object.entries(dayHours).sort((a, b) => b[1] - a[1])[0][0]
        : 'N/A';
      const leastProductiveDay = Object.keys(dayHours).length > 1
        ? Object.entries(dayHours).sort((a, b) => a[1] - b[1])[0][0]
        : 'N/A';

      // Top performer
      const employeeHours = {};
      thisWeekReports.forEach(r => {
        employeeHours[r.employee_name] = (employeeHours[r.employee_name] || 0) + parseFloat(r.hours || 0);
      });
      const topPerformer = Object.keys(employeeHours).length > 0
        ? Object.entries(employeeHours).sort((a, b) => b[1] - a[1])[0]
        : null;

      // Project focus
      const projectHours = {};
      thisWeekReports.forEach(r => {
        if (r.project) {
          projectHours[r.project] = (projectHours[r.project] || 0) + parseFloat(r.hours || 0);
        }
      });
      const topProject = Object.keys(projectHours).length > 0
        ? Object.entries(projectHours).sort((a, b) => b[1] - a[1])[0]
        : null;
      const topProjectPercent = topProject && thisWeekHours > 0 
        ? ((topProject[1] / thisWeekHours) * 100).toFixed(0)
        : 0;

      setInsights({
        thisWeekHours,
        lastWeekHours,
        hoursChange,
        hoursChangePercent,
        thisWeekAvg: thisWeekAvg.toFixed(1),
        lastWeekAvg: lastWeekAvg.toFixed(1),
        avgChange: avgChange.toFixed(1),
        avgChangePercent,
        mostProductiveDay,
        leastProductiveDay,
        topPerformer,
        topProject,
        topProjectPercent
      });
    } catch (error) {
      console.error('Error fetching insights:', error);
    }
  };

  return (
    <div className="app">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap');
        
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Outfit', sans-serif;
          background: linear-gradient(135deg, #0a0e27 0%, #1a1f3a 100%);
          color: #e8eaf6;
          min-height: 100vh;
        }
        
        .app {
          min-height: 100vh;
          animation: fadeIn 0.6s ease-out;
        }
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        .header {
          background: rgba(15, 20, 40, 0.8);
          backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          padding: 1.5rem 2rem;
          position: sticky;
          top: 0;
          z-index: 100;
          animation: slideDown 0.5s ease-out;
        }
        
        @keyframes slideDown {
          from { transform: translateY(-100%); }
          to { transform: translateY(0); }
        }
        
        .header-content {
          max-width: 1400px;
          margin: 0 auto;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .logo {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-size: 1.75rem;
          font-weight: 800;
          letter-spacing: -0.02em;
        }
        
        .logo-gradient {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        
        .nav-tabs {
          display: flex;
          gap: 0.5rem;
        }
        
        .nav-tab {
          padding: 0.75rem 1.5rem;
          background: transparent;
          border: none;
          color: #a5b4fc;
          cursor: pointer;
          font-size: 0.95rem;
          font-weight: 500;
          border-radius: 12px;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-family: 'Outfit', sans-serif;
        }
        
        .nav-tab:hover {
          background: rgba(102, 126, 234, 0.1);
          color: #c7d2fe;
        }
        
        .nav-tab.active {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          box-shadow: 0 4px 20px rgba(102, 126, 234, 0.3);
        }
        
        .container {
          max-width: 1400px;
          margin: 0 auto;
          padding: 2rem;
        }
        
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1.5rem;
          margin-bottom: 2rem;
          animation: slideUp 0.6s ease-out 0.2s backwards;
        }
        
        @keyframes slideUp {
          from { 
            opacity: 0;
            transform: translateY(30px);
          }
          to { 
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .stat-card {
          background: rgba(30, 35, 60, 0.6);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 20px;
          padding: 1.75rem;
          transition: all 0.3s ease;
        }
        
        .stat-card:hover {
          transform: translateY(-5px);
          border-color: rgba(102, 126, 234, 0.3);
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        }
        
        .stat-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 1rem;
        }
        
        .stat-icon {
          width: 48px;
          height: 48px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        
        .stat-label {
          font-size: 0.9rem;
          color: #a5b4fc;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        
        .stat-value {
          font-size: 2.5rem;
          font-weight: 800;
          color: #fff;
          line-height: 1;
          font-family: 'JetBrains Mono', monospace;
        }
        
        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
          animation: slideUp 0.6s ease-out 0.3s backwards;
        }
        
        .section-title {
          font-size: 1.75rem;
          font-weight: 700;
          color: #fff;
        }
        
        .btn {
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 12px;
          font-weight: 600;
          cursor: pointer;
          font-size: 0.95rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          transition: all 0.3s ease;
          font-family: 'Outfit', sans-serif;
        }
        
        .btn-primary {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
        }
        
        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 25px rgba(102, 126, 234, 0.4);
        }
        
        .btn-secondary {
          background: rgba(255, 255, 255, 0.05);
          color: #a5b4fc;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .btn-secondary:hover {
          background: rgba(255, 255, 255, 0.1);
          color: #c7d2fe;
        }
        
        .btn-danger {
          background: rgba(239, 68, 68, 0.1);
          color: #fca5a5;
          border: 1px solid rgba(239, 68, 68, 0.2);
        }
        
        .btn-danger:hover {
          background: rgba(239, 68, 68, 0.2);
          color: #fecaca;
        }
        
        .filters {
          background: rgba(30, 35, 60, 0.6);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 16px;
          padding: 1.5rem;
          margin-bottom: 1.5rem;
          animation: slideUp 0.6s ease-out 0.4s backwards;
        }
        
        .filters-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
          margin-bottom: 1rem;
        }
        
        .filter-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        
        .filter-label {
          font-size: 0.85rem;
          color: #a5b4fc;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        
        .filter-input, .filter-select {
          padding: 0.75rem 1rem;
          background: rgba(15, 20, 40, 0.8);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 10px;
          color: #e8eaf6;
          font-size: 0.95rem;
          font-family: 'Outfit', sans-serif;
          transition: all 0.3s ease;
        }
        
        .filter-input:focus, .filter-select:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }
        
        .cards-grid {
          display: grid;
          gap: 1.5rem;
          animation: slideUp 0.6s ease-out 0.5s backwards;
        }
        
        .card {
          background: rgba(30, 35, 60, 0.6);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 16px;
          padding: 1.5rem;
          transition: all 0.3s ease;
        }
        
        .card:hover {
          border-color: rgba(102, 126, 234, 0.2);
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        }
        
        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 1rem;
        }
        
        .card-title {
          font-size: 1.25rem;
          font-weight: 700;
          color: #fff;
          margin-bottom: 0.25rem;
        }
        
        .card-subtitle {
          font-size: 0.9rem;
          color: #a5b4fc;
        }
        
        .card-actions {
          display: flex;
          gap: 0.5rem;
        }
        
        .icon-btn {
          width: 36px;
          height: 36px;
          border: none;
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.05);
          color: #a5b4fc;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease;
        }
        
        .icon-btn:hover {
          background: rgba(102, 126, 234, 0.2);
          color: #c7d2fe;
        }
        
        .icon-btn.danger:hover {
          background: rgba(239, 68, 68, 0.2);
          color: #fca5a5;
        }
        
        .report-details {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 1rem;
          margin-bottom: 1rem;
        }
        
        .detail-item {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }
        
        .detail-label {
          font-size: 0.8rem;
          color: #a5b4fc;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        
        .detail-value {
          font-size: 1.1rem;
          color: #fff;
          font-weight: 600;
          font-family: 'JetBrains Mono', monospace;
        }
        
        .screenshots-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
          gap: 0.75rem;
          margin-top: 1rem;
        }
        
        .screenshot-thumb {
          width: 100%;
          height: 100px;
          object-fit: cover;
          border-radius: 10px;
          border: 2px solid rgba(255, 255, 255, 0.1);
          cursor: pointer;
          transition: all 0.3s ease;
        }
        
        .screenshot-thumb:hover {
          border-color: #667eea;
          transform: scale(1.05);
        }
        
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.8);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          animation: fadeIn 0.3s ease-out;
        }
        
        .modal {
          background: rgba(20, 25, 45, 0.95);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 24px;
          padding: 2rem;
          max-width: 600px;
          width: 90%;
          max-height: 90vh;
          overflow-y: auto;
          animation: scaleIn 0.3s ease-out;
        }
        
        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }
        
        .modal-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: #fff;
        }
        
        .close-btn {
          width: 36px;
          height: 36px;
          border: none;
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.05);
          color: #a5b4fc;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease;
        }
        
        .close-btn:hover {
          background: rgba(239, 68, 68, 0.2);
          color: #fca5a5;
        }
        
        .form {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }
        
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        
        .form-label {
          font-size: 0.9rem;
          color: #a5b4fc;
          font-weight: 500;
        }
        
        .form-input, .form-select, .form-textarea {
          padding: 0.875rem 1rem;
          background: rgba(15, 20, 40, 0.8);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          color: #e8eaf6;
          font-size: 1rem;
          font-family: 'Outfit', sans-serif;
          transition: all 0.3s ease;
        }
        
        .form-textarea {
          min-height: 100px;
          resize: vertical;
        }
        
        .form-input:focus, .form-select:focus, .form-textarea:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }
        
        .file-upload {
          padding: 2rem;
          border: 2px dashed rgba(255, 255, 255, 0.2);
          border-radius: 12px;
          text-align: center;
          cursor: pointer;
          transition: all 0.3s ease;
          background: rgba(15, 20, 40, 0.5);
        }
        
        .file-upload:hover {
          border-color: #667eea;
          background: rgba(102, 126, 234, 0.05);
        }
        
        .file-upload-input {
          display: none;
        }
        
        .file-list {
          margin-top: 0.75rem;
          font-size: 0.9rem;
          color: #a5b4fc;
        }
        
        .empty-state {
          text-align: center;
          padding: 4rem 2rem;
          color: #a5b4fc;
        }
        
        .empty-icon {
          width: 64px;
          height: 64px;
          margin: 0 auto 1rem;
          opacity: 0.3;
        }
        
        .loading {
          text-align: center;
          padding: 2rem;
          color: #a5b4fc;
        }
        
        .employees-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 1.5rem;
        }
        
        /* Custom Scrollbar */
        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        
        ::-webkit-scrollbar-track {
          background: rgba(15, 20, 40, 0.5);
          border-radius: 4px;
        }
        
        ::-webkit-scrollbar-thumb {
          background: rgba(102, 126, 234, 0.5);
          border-radius: 4px;
        }
        
        ::-webkit-scrollbar-thumb:hover {
          background: rgba(102, 126, 234, 0.7);
        }
        
        /* Analytics specific */
        input[type="checkbox"] {
          cursor: pointer;
        }
        
        @media (max-width: 768px) {
          .header-content {
            flex-direction: column;
            gap: 1rem;
          }
          
          .nav-tabs {
            width: 100%;
            justify-content: space-between;
          }
          
          .nav-tab {
            flex: 1;
            justify-content: center;
            padding: 0.75rem 0.5rem;
            font-size: 0.85rem;
          }
          
          .stat-value {
            font-size: 2rem;
          }
          
          .filters-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      {/* Header */}
      <header className="header">
        <div className="header-content">
          <div className="logo">
            <BarChart3 size={32} />
            <span className="logo-gradient">EOD Monitor</span>
          </div>
          <nav className="nav-tabs">
            <button 
              className={`nav-tab ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => setActiveTab('dashboard')}
            >
              <BarChart3 size={18} />
              Dashboard
            </button>
            <button 
              className={`nav-tab ${activeTab === 'reports' ? 'active' : ''}`}
              onClick={() => setActiveTab('reports')}
            >
              <FileText size={18} />
              Reports
            </button>
            <button 
              className={`nav-tab ${activeTab === 'analytics' ? 'active' : ''}`}
              onClick={() => setActiveTab('analytics')}
            >
              <TrendingUp size={18} />
              Analytics
            </button>
            <button 
              className={`nav-tab ${activeTab === 'employees' ? 'active' : ''}`}
              onClick={() => setActiveTab('employees')}
            >
              <Users size={18} />
              Employees
            </button>
          </nav>
        </div>
      </header>

      <div className="container">
        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-header">
                  <div>
                    <div className="stat-label">Total Employees</div>
                    <div className="stat-value">{stats.totalEmployees || 0}</div>
                  </div>
                  <div className="stat-icon">
                    <Users size={24} color="white" />
                  </div>
                </div>
              </div>
              
              <div className="stat-card">
                <div className="stat-header">
                  <div>
                    <div className="stat-label">Total Reports</div>
                    <div className="stat-value">{stats.totalReports || 0}</div>
                  </div>
                  <div className="stat-icon">
                    <FileText size={24} color="white" />
                  </div>
                </div>
              </div>
              
              <div className="stat-card">
                <div className="stat-header">
                  <div>
                    <div className="stat-label">Total Hours</div>
                    <div className="stat-value">{stats.totalHours || 0}</div>
                  </div>
                  <div className="stat-icon">
                    <Clock size={24} color="white" />
                  </div>
                </div>
              </div>
              
              <div className="stat-card">
                <div className="stat-header">
                  <div>
                    <div className="stat-label">Today's Reports</div>
                    <div className="stat-value">{stats.reportsToday || 0}</div>
                  </div>
                  <div className="stat-icon">
                    <TrendingUp size={24} color="white" />
                  </div>
                </div>
              </div>
            </div>

            <div className="section-header">
              <h2 className="section-title">Recent EOD Reports</h2>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button className="btn btn-secondary" onClick={handleQuickAddClick}>
                  <Clock size={18} />
                  Quick Add
                </button>
                <button className="btn btn-primary" onClick={() => setShowReportModal(true)}>
                  <Plus size={18} />
                  New Report
                </button>
              </div>
            </div>

            {/* Productivity Insights Widget */}
            {insights && (
              <div className="card" style={{ 
                marginBottom: '2rem',
                background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
                border: '1px solid rgba(102, 126, 234, 0.3)'
              }}>
                <div className="card-header">
                  <div className="card-title">📊 Productivity Insights - This Week</div>
                </div>
                <div style={{ 
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '1.5rem',
                  marginTop: '1.5rem'
                }}>
                  <div>
                    <div className="detail-label">Total Hours</div>
                    <div style={{ 
                      fontSize: '1.5rem',
                      fontWeight: 700,
                      color: '#fff',
                      fontFamily: 'JetBrains Mono, monospace',
                      marginTop: '0.5rem'
                    }}>
                      {insights.thisWeekHours.toFixed(1)}h
                      <span style={{ 
                        fontSize: '0.9rem',
                        color: insights.hoursChange >= 0 ? '#10b981' : '#ef4444',
                        marginLeft: '0.5rem'
                      }}>
                        {insights.hoursChange >= 0 ? '↑' : '↓'} {Math.abs(insights.hoursChangePercent)}%
                      </span>
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#a5b4fc', marginTop: '0.25rem' }}>
                      vs last week: {insights.lastWeekHours.toFixed(1)}h
                    </div>
                  </div>

                  <div>
                    <div className="detail-label">Avg Hours/Employee</div>
                    <div style={{ 
                      fontSize: '1.5rem',
                      fontWeight: 700,
                      color: '#fff',
                      fontFamily: 'JetBrains Mono, monospace',
                      marginTop: '0.5rem'
                    }}>
                      {insights.thisWeekAvg}h
                      <span style={{ 
                        fontSize: '0.9rem',
                        color: insights.avgChange >= 0 ? '#10b981' : '#ef4444',
                        marginLeft: '0.5rem'
                      }}>
                        {insights.avgChange >= 0 ? '↑' : '↓'} {Math.abs(insights.avgChangePercent)}%
                      </span>
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#a5b4fc', marginTop: '0.25rem' }}>
                      vs last week: {insights.lastWeekAvg}h
                    </div>
                  </div>

                  <div>
                    <div className="detail-label">Most Productive Day</div>
                    <div style={{ 
                      fontSize: '1.25rem',
                      fontWeight: 700,
                      color: '#667eea',
                      marginTop: '0.5rem'
                    }}>
                      {insights.mostProductiveDay}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#a5b4fc', marginTop: '0.25rem' }}>
                      Least: {insights.leastProductiveDay}
                    </div>
                  </div>

                  {insights.topPerformer && (
                    <div>
                      <div className="detail-label">Top Performer</div>
                      <div style={{ 
                        fontSize: '1.25rem',
                        fontWeight: 700,
                        color: '#667eea',
                        marginTop: '0.5rem'
                      }}>
                        {insights.topPerformer[0]}
                      </div>
                      <div style={{ fontSize: '0.85rem', color: '#a5b4fc', marginTop: '0.25rem' }}>
                        {insights.topPerformer[1].toFixed(1)}h this week
                      </div>
                    </div>
                  )}

                  {insights.topProject && (
                    <div>
                      <div className="detail-label">Project Focus</div>
                      <div style={{ 
                        fontSize: '1.25rem',
                        fontWeight: 700,
                        color: '#667eea',
                        marginTop: '0.5rem'
                      }}>
                        📱 {insights.topProject[0]}
                      </div>
                      <div style={{ fontSize: '0.85rem', color: '#a5b4fc', marginTop: '0.25rem' }}>
                        {insights.topProjectPercent}% of total hours
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {reports.slice(0, 5).length === 0 ? (
              <div className="empty-state">
                <FileText size={64} className="empty-icon" />
                <p>No reports yet. Create your first report!</p>
              </div>
            ) : (
              <div className="cards-grid">
                {reports.slice(0, 5).map(report => (
                  <div key={report.id} className="card">
                    <div className="card-header">
                      <div>
                        <div className="card-title">{report.employee_name}</div>
                        <div className="card-subtitle">{report.employee_role}</div>
                        {report.project && (
                          <div style={{ 
                            marginTop: '0.5rem',
                            padding: '0.25rem 0.75rem',
                            background: 'rgba(102, 126, 234, 0.2)',
                            borderRadius: '6px',
                            fontSize: '0.85rem',
                            color: '#c7d2fe',
                            display: 'inline-block'
                          }}>
                            📱 {report.project}
                          </div>
                        )}
                      </div>
                      <div className="card-actions">
                        <button 
                          className="icon-btn"
                          onClick={() => setSelectedReport(report)}
                          title="View details"
                        >
                          <Eye size={18} />
                        </button>
                        {isReportEditable(report) && (
                          <button 
                            className="icon-btn"
                            onClick={() => handleEditReport(report)}
                            title="Edit report"
                            style={{ color: '#67e8f9' }}
                          >
                            <Edit size={18} />
                          </button>
                        )}
                        <button 
                          className="icon-btn danger"
                          onClick={() => handleDeleteReport(report.id)}
                          title="Delete report"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                    <div className="report-details">
                      <div className="detail-item">
                        <div className="detail-label">Date</div>
                        <div className="detail-value">{report.date}</div>
                      </div>
                      <div className="detail-item">
                        <div className="detail-label">Hours</div>
                        <div className="detail-value">{report.hours}h</div>
                      </div>
                      <div className="detail-item">
                        <div className="detail-label">Screenshots</div>
                        <div className="detail-value">{report.screenshots?.length || 0}</div>
                      </div>
                    </div>
                    {report.description && (
                      <p style={{ marginTop: '1rem', color: '#a5b4fc', fontSize: '0.95rem' }}>
                        {report.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Reports Tab */}
        {activeTab === 'reports' && (
          <>
            <div className="filters">
              <div className="filters-grid">
                <div className="filter-group">
                  <label className="filter-label">Employee</label>
                  <select 
                    className="filter-select"
                    value={filters.employee_id}
                    onChange={(e) => setFilters({...filters, employee_id: e.target.value})}
                  >
                    <option value="">All Employees</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.name}</option>
                    ))}
                  </select>
                </div>
                
                <div className="filter-group">
                  <label className="filter-label">Project/App</label>
                  <select 
                    className="filter-select"
                    value={filters.project}
                    onChange={(e) => setFilters({...filters, project: e.target.value})}
                  >
                    <option value="">All Projects</option>
                    {projects.map(proj => (
                      <option key={proj} value={proj}>{proj}</option>
                    ))}
                  </select>
                </div>
                
                <div className="filter-group">
                  <label className="filter-label">Start Date</label>
                  <input 
                    type="date"
                    className="filter-input"
                    value={filters.start_date}
                    onChange={(e) => setFilters({...filters, start_date: e.target.value})}
                  />
                </div>
                
                <div className="filter-group">
                  <label className="filter-label">End Date</label>
                  <input 
                    type="date"
                    className="filter-input"
                    value={filters.end_date}
                    onChange={(e) => setFilters({...filters, end_date: e.target.value})}
                  />
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                <button className="btn btn-secondary" onClick={clearFilters}>
                  <X size={18} />
                  Clear Filters
                </button>
                <button className="btn btn-secondary" onClick={handleExportCSV}>
                  <Download size={18} />
                  Export CSV
                </button>
              </div>
            </div>

            <div className="section-header">
              <h2 className="section-title">All Reports ({reports.length})</h2>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                {/* View Mode Toggle */}
                <div style={{ 
                  display: 'flex',
                  background: 'rgba(15, 20, 40, 0.8)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '12px',
                  padding: '0.25rem'
                }}>
                  <button 
                    className={`btn ${viewMode === 'cards' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setViewMode('cards')}
                    style={{ 
                      padding: '0.5rem 1rem',
                      fontSize: '0.85rem'
                    }}
                  >
                    <CheckSquare size={16} />
                    Cards
                  </button>
                  <button 
                    className={`btn ${viewMode === 'list' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setViewMode('list')}
                    style={{ 
                      padding: '0.5rem 1rem',
                      fontSize: '0.85rem'
                    }}
                  >
                    <FileText size={16} />
                    List
                  </button>
                </div>
                
                <button className="btn btn-primary" onClick={() => setShowReportModal(true)}>
                  <Plus size={18} />
                  New Report
                </button>
              </div>
            </div>

            {/* Bulk Actions Bar */}
            {showBulkActions && (
              <div style={{
                background: 'rgba(102, 126, 234, 0.2)',
                border: '1px solid rgba(102, 126, 234, 0.3)',
                borderRadius: '16px',
                padding: '1.25rem',
                marginBottom: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                animation: 'slideDown 0.3s ease-out'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <CheckSquare size={20} color="#667eea" />
                  <span style={{ fontWeight: 600, color: '#fff' }}>
                    {selectedReports.length} item{selectedReports.length > 1 ? 's' : ''} selected
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button className="btn btn-secondary" onClick={selectAllReports}>
                    Select All ({reports.length})
                  </button>
                  <button className="btn btn-secondary" onClick={clearSelection}>
                    <X size={18} />
                    Clear
                  </button>
                  <button className="btn btn-danger" onClick={handleBulkDelete}>
                    <Trash2 size={18} />
                    Delete Selected
                  </button>
                </div>
              </div>
            )}

            {loading ? (
              <div className="loading">Loading reports...</div>
            ) : reports.length === 0 ? (
              <div className="empty-state">
                <FileText size={64} className="empty-icon" />
                <p>No reports found. Adjust filters or create a new report.</p>
              </div>
            ) : (
              viewMode === 'cards' ? (
                <div className="cards-grid">
                  {reports.map(report => (
                    <div key={report.id} className="card" style={{
                      border: selectedReports.includes(report.id) 
                        ? '2px solid #667eea'
                        : '1px solid rgba(255, 255, 255, 0.05)'
                    }}>
                      <div className="card-header">
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                          <input 
                            type="checkbox"
                            checked={selectedReports.includes(report.id)}
                            onChange={() => toggleReportSelection(report.id)}
                            style={{ 
                              width: '20px', 
                              height: '20px',
                              cursor: 'pointer',
                              accentColor: '#667eea',
                              marginTop: '0.25rem'
                            }}
                          />
                          <div style={{ flex: 1 }}>
                            <div className="card-title">{report.employee_name}</div>
                            <div className="card-subtitle">{report.employee_role}</div>
                            {report.project && (
                              <div style={{ 
                                marginTop: '0.5rem',
                                padding: '0.25rem 0.75rem',
                                background: 'rgba(102, 126, 234, 0.2)',
                                borderRadius: '6px',
                                fontSize: '0.85rem',
                                color: '#c7d2fe',
                                display: 'inline-block'
                              }}>
                                📱 {report.project}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="card-actions">
                          <button 
                            className="icon-btn"
                            onClick={() => setSelectedReport(report)}
                            title="View details"
                          >
                            <Eye size={18} />
                          </button>
                          {isReportEditable(report) ? (
                            <button 
                              className="icon-btn"
                              onClick={() => handleEditReport(report)}
                              title="Edit report (within 3 days)"
                              style={{ color: '#67e8f9' }}
                            >
                              <Edit size={18} />
                            </button>
                          ) : (
                            <button 
                              className="icon-btn"
                              disabled
                              title="Report locked (older than 3 days)"
                              style={{ opacity: 0.3, cursor: 'not-allowed' }}
                            >
                              <Edit size={18} />
                            </button>
                          )}
                          <button 
                            className="icon-btn danger"
                            onClick={() => handleDeleteReport(report.id)}
                            title="Delete report"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                      <div className="report-details">
                        <div className="detail-item">
                          <div className="detail-label">Date</div>
                          <div className="detail-value">{report.date}</div>
                        </div>
                        <div className="detail-item">
                          <div className="detail-label">Hours</div>
                          <div className="detail-value">{report.hours}h</div>
                        </div>
                        <div className="detail-item">
                          <div className="detail-label">Screenshots</div>
                          <div className="detail-value">{report.screenshots?.length || 0}</div>
                        </div>
                      </div>
                      {report.description && (
                        <p style={{ marginTop: '1rem', color: '#a5b4fc', fontSize: '0.95rem' }}>
                          {report.description}
                        </p>
                      )}
                      {report.screenshots && report.screenshots.length > 0 && (
                        <div className="screenshots-grid">
                          {report.screenshots.map((screenshot, idx) => (
                            <div key={screenshot.id} style={{ position: 'relative' }}>
                              <img 
                                src={`${API_URL.replace('/api', '')}/uploads/${screenshot.filepath}`}
                                alt={screenshot.filename}
                                className="screenshot-thumb"
                                onClick={() => openGallery(report.screenshots, idx)}
                              />
                              {screenshot.caption && (
                                <div style={{
                                  position: 'absolute',
                                  bottom: 0,
                                  left: 0,
                                  right: 0,
                                  background: 'rgba(0, 0, 0, 0.8)',
                                  color: '#fff',
                                  fontSize: '0.75rem',
                                  padding: '0.25rem 0.5rem',
                                  borderBottomLeftRadius: '10px',
                                  borderBottomRightRadius: '10px',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap'
                                }}>
                                  {screenshot.caption}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      {!isReportEditable(report) && (
                        <div style={{
                          marginTop: '1rem',
                          padding: '0.5rem 0.75rem',
                          background: 'rgba(239, 68, 68, 0.1)',
                          border: '1px solid rgba(239, 68, 68, 0.2)',
                          borderRadius: '8px',
                          fontSize: '0.85rem',
                          color: '#fca5a5',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem'
                        }}>
                          🔒 Report locked (older than 3 days)
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                /* List View */
                <div style={{
                  background: 'rgba(30, 35, 60, 0.6)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                  borderRadius: '16px',
                  overflow: 'hidden'
                }}>
                  <table style={{ 
                    width: '100%', 
                    borderCollapse: 'collapse'
                  }}>
                    <thead style={{ 
                      background: 'rgba(15, 20, 40, 0.8)',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                      position: 'sticky',
                      top: 0,
                      zIndex: 10
                    }}>
                      <tr>
                        <th style={{ 
                          padding: '1rem',
                          textAlign: 'left',
                          width: '40px'
                        }}>
                          <input 
                            type="checkbox"
                            checked={selectedReports.length === reports.length && reports.length > 0}
                            onChange={() => selectedReports.length === reports.length ? clearSelection() : selectAllReports()}
                            style={{ 
                              width: '18px', 
                              height: '18px',
                              cursor: 'pointer',
                              accentColor: '#667eea'
                            }}
                          />
                        </th>
                        <th 
                          onClick={() => handleSort('date')}
                          style={{ 
                            padding: '1rem',
                            textAlign: 'left',
                            color: '#a5b4fc',
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            cursor: 'pointer',
                            userSelect: 'none'
                          }}
                        >
                          Date {sortBy === 'date' && (sortOrder === 'asc' ? '↑' : '↓')}
                        </th>
                        <th 
                          onClick={() => handleSort('employee')}
                          style={{ 
                            padding: '1rem',
                            textAlign: 'left',
                            color: '#a5b4fc',
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            cursor: 'pointer',
                            userSelect: 'none'
                          }}
                        >
                          Employee {sortBy === 'employee' && (sortOrder === 'asc' ? '↑' : '↓')}
                        </th>
                        <th 
                          onClick={() => handleSort('project')}
                          style={{ 
                            padding: '1rem',
                            textAlign: 'left',
                            color: '#a5b4fc',
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            cursor: 'pointer',
                            userSelect: 'none'
                          }}
                        >
                          Project {sortBy === 'project' && (sortOrder === 'asc' ? '↑' : '↓')}
                        </th>
                        <th 
                          onClick={() => handleSort('hours')}
                          style={{ 
                            padding: '1rem',
                            textAlign: 'left',
                            color: '#a5b4fc',
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            cursor: 'pointer',
                            userSelect: 'none'
                          }}
                        >
                          Hours {sortBy === 'hours' && (sortOrder === 'asc' ? '↑' : '↓')}
                        </th>
                        <th style={{ 
                          padding: '1rem',
                          textAlign: 'left',
                          color: '#a5b4fc',
                          fontSize: '0.85rem',
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em'
                        }}>
                          Screenshots
                        </th>
                        <th style={{ 
                          padding: '1rem',
                          textAlign: 'right',
                          color: '#a5b4fc',
                          fontSize: '0.85rem',
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em'
                        }}>
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortReports(reports).map(report => (
                        <tr 
                          key={report.id}
                          style={{
                            borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                            background: selectedReports.includes(report.id) 
                              ? 'rgba(102, 126, 234, 0.1)'
                              : 'transparent',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseEnter={(e) => {
                            if (!selectedReports.includes(report.id)) {
                              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!selectedReports.includes(report.id)) {
                              e.currentTarget.style.background = 'transparent';
                            }
                          }}
                        >
                          <td style={{ padding: '1rem' }}>
                            <input 
                              type="checkbox"
                              checked={selectedReports.includes(report.id)}
                              onChange={() => toggleReportSelection(report.id)}
                              style={{ 
                                width: '18px', 
                                height: '18px',
                                cursor: 'pointer',
                                accentColor: '#667eea'
                              }}
                            />
                          </td>
                          <td style={{ 
                            padding: '1rem',
                            color: '#e8eaf6',
                            fontFamily: 'JetBrains Mono, monospace',
                            fontSize: '0.9rem'
                          }}>
                            {report.date}
                          </td>
                          <td style={{ padding: '1rem' }}>
                            <div style={{ color: '#fff', fontWeight: 600 }}>{report.employee_name}</div>
                            <div style={{ fontSize: '0.85rem', color: '#a5b4fc' }}>{report.employee_role}</div>
                          </td>
                          <td style={{ padding: '1rem' }}>
                            {report.project && (
                              <span style={{
                                padding: '0.25rem 0.75rem',
                                background: 'rgba(102, 126, 234, 0.2)',
                                borderRadius: '6px',
                                fontSize: '0.85rem',
                                color: '#c7d2fe'
                              }}>
                                📱 {report.project}
                              </span>
                            )}
                          </td>
                          <td style={{ 
                            padding: '1rem',
                            color: '#fff',
                            fontWeight: 600,
                            fontFamily: 'JetBrains Mono, monospace',
                            fontSize: '1.1rem'
                          }}>
                            {report.hours}h
                          </td>
                          <td style={{ 
                            padding: '1rem',
                            color: '#a5b4fc',
                            fontFamily: 'JetBrains Mono, monospace'
                          }}>
                            {report.screenshots?.length || 0}
                          </td>
                          <td style={{ padding: '1rem', textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                              <button 
                                className="icon-btn"
                                onClick={() => setSelectedReport(report)}
                                title="View details"
                              >
                                <Eye size={18} />
                              </button>
                              {isReportEditable(report) ? (
                                <button 
                                  className="icon-btn"
                                  onClick={() => handleEditReport(report)}
                                  title="Edit report"
                                  style={{ color: '#67e8f9' }}
                                >
                                  <Edit size={18} />
                                </button>
                              ) : (
                                <button 
                                  className="icon-btn"
                                  disabled
                                  title="Report locked"
                                  style={{ opacity: 0.3, cursor: 'not-allowed' }}
                                >
                                  <Edit size={18} />
                                </button>
                              )}
                              <button 
                                className="icon-btn danger"
                                onClick={() => handleDeleteReport(report.id)}
                                title="Delete report"
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            )}
          </>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <>
            <div className="section-header">
              <h2 className="section-title">Hours Analytics</h2>
              <button className="btn btn-primary" onClick={fetchAnalytics}>
                <TrendingUp size={18} />
                Calculate Hours
              </button>
            </div>

            <div className="filters">
              <div className="filter-group" style={{ marginBottom: '1rem' }}>
                <label className="filter-label">Select Employees</label>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                  <button className="btn btn-secondary" onClick={selectAllEmployees}>
                    Select All
                  </button>
                  <button className="btn btn-secondary" onClick={clearEmployeeSelection}>
                    Clear Selection
                  </button>
                </div>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                  gap: '0.75rem'
                }}>
                  {employees.map(emp => (
                    <label 
                      key={emp.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.75rem',
                        background: analyticsFilters.selected_employees.includes(emp.id.toString()) 
                          ? 'rgba(102, 126, 234, 0.2)' 
                          : 'rgba(15, 20, 40, 0.8)',
                        border: '1px solid',
                        borderColor: analyticsFilters.selected_employees.includes(emp.id.toString())
                          ? '#667eea'
                          : 'rgba(255, 255, 255, 0.1)',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease'
                      }}
                    >
                      <input 
                        type="checkbox"
                        checked={analyticsFilters.selected_employees.includes(emp.id.toString())}
                        onChange={() => handleEmployeeToggle(emp.id)}
                        style={{ 
                          width: '18px', 
                          height: '18px',
                          cursor: 'pointer',
                          accentColor: '#667eea'
                        }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ color: '#fff', fontWeight: 600 }}>{emp.name}</div>
                        <div style={{ fontSize: '0.85rem', color: '#a5b4fc' }}>{emp.role}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="filter-group" style={{ marginBottom: '1rem' }}>
                <label className="filter-label">Select Projects/Apps</label>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                  <button className="btn btn-secondary" onClick={selectAllProjects}>
                    Select All Projects
                  </button>
                  <button className="btn btn-secondary" onClick={clearProjectSelection}>
                    Clear Projects
                  </button>
                </div>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                  gap: '0.75rem'
                }}>
                  {projects.map(proj => (
                    <label 
                      key={proj}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.75rem',
                        background: analyticsFilters.selected_projects.includes(proj) 
                          ? 'rgba(102, 126, 234, 0.2)' 
                          : 'rgba(15, 20, 40, 0.8)',
                        border: '1px solid',
                        borderColor: analyticsFilters.selected_projects.includes(proj)
                          ? '#667eea'
                          : 'rgba(255, 255, 255, 0.1)',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease'
                      }}
                    >
                      <input 
                        type="checkbox"
                        checked={analyticsFilters.selected_projects.includes(proj)}
                        onChange={() => handleProjectToggle(proj)}
                        style={{ 
                          width: '18px', 
                          height: '18px',
                          cursor: 'pointer',
                          accentColor: '#667eea'
                        }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ color: '#fff', fontWeight: 600 }}>📱 {proj}</div>
                      </div>
                    </label>
                  ))}
                  {projects.length === 0 && (
                    <div style={{ color: '#a5b4fc', padding: '1rem', textAlign: 'center' }}>
                      No projects yet. Add reports with project names to see them here.
                    </div>
                  )}
                </div>
              </div>

              <div className="filters-grid">
                <div className="filter-group">
                  <label className="filter-label">Start Date</label>
                  <input 
                    type="date"
                    className="filter-input"
                    value={analyticsFilters.start_date}
                    onChange={(e) => setAnalyticsFilters({...analyticsFilters, start_date: e.target.value})}
                  />
                </div>
                
                <div className="filter-group">
                  <label className="filter-label">End Date</label>
                  <input 
                    type="date"
                    className="filter-input"
                    value={analyticsFilters.end_date}
                    onChange={(e) => setAnalyticsFilters({...analyticsFilters, end_date: e.target.value})}
                  />
                </div>
              </div>

              <div style={{ 
                marginTop: '1rem', 
                padding: '1rem',
                background: 'rgba(102, 126, 234, 0.1)',
                borderRadius: '10px',
                color: '#c7d2fe'
              }}>
                <strong>{analyticsFilters.selected_employees.length}</strong> employee(s) selected
                {analyticsFilters.selected_projects.length > 0 && ` • ${analyticsFilters.selected_projects.length} project(s) selected`}
                {analyticsFilters.start_date && ` • From ${analyticsFilters.start_date}`}
                {analyticsFilters.end_date && ` • To ${analyticsFilters.end_date}`}
              </div>
            </div>

            {loading ? (
              <div className="loading">Calculating hours...</div>
            ) : (analyticsData.length === 0 && projectAnalytics.length === 0) ? (
              <div className="empty-state">
                <Clock size={64} className="empty-icon" />
                <p>Select employees or projects and click "Calculate Hours" to see analytics</p>
              </div>
            ) : (
              <>
                <div className="section-header" style={{ marginTop: '2rem' }}>
                  <h2 className="section-title">Hours Summary</h2>
                  <div style={{ 
                    fontSize: '1.5rem', 
                    fontWeight: 700,
                    color: '#667eea',
                    fontFamily: 'JetBrains Mono, monospace'
                  }}>
                    Total: {analyticsData.reduce((sum, emp) => sum + emp.total_hours, 0).toFixed(1)}h
                  </div>
                </div>

                <div className="cards-grid">
                  {analyticsData.map(empData => (
                    <div key={empData.employee_id} className="card">
                      <div className="card-header">
                        <div>
                          <div className="card-title">{empData.employee_name}</div>
                          <div className="card-subtitle">{empData.employee_role}</div>
                        </div>
                      </div>
                      
                      <div className="report-details" style={{ marginTop: '1.5rem' }}>
                        <div className="detail-item">
                          <div className="detail-label">Total Hours</div>
                          <div className="detail-value" style={{ 
                            fontSize: '2rem',
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text'
                          }}>
                            {empData.total_hours.toFixed(1)}h
                          </div>
                        </div>
                        
                        <div className="detail-item">
                          <div className="detail-label">Reports</div>
                          <div className="detail-value">{empData.report_count}</div>
                        </div>
                        
                        <div className="detail-item">
                          <div className="detail-label">Avg Hours/Report</div>
                          <div className="detail-value">
                            {empData.report_count > 0 
                              ? (empData.total_hours / empData.report_count).toFixed(1)
                              : '0'}h
                          </div>
                        </div>
                      </div>

                      {empData.reports.length > 0 && (
                        <div style={{ marginTop: '1.5rem' }}>
                          <div className="detail-label" style={{ marginBottom: '0.75rem' }}>
                            Report Breakdown
                          </div>
                          <div style={{ 
                            display: 'flex', 
                            flexDirection: 'column', 
                            gap: '0.5rem',
                            maxHeight: '200px',
                            overflowY: 'auto'
                          }}>
                            {empData.reports.map(report => (
                              <div 
                                key={report.id}
                                style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  padding: '0.5rem 0.75rem',
                                  background: 'rgba(15, 20, 40, 0.5)',
                                  borderRadius: '8px',
                                  fontSize: '0.9rem'
                                }}
                              >
                                <span style={{ color: '#a5b4fc' }}>{report.date}</span>
                                <span style={{ 
                                  color: '#fff', 
                                  fontWeight: 600,
                                  fontFamily: 'JetBrains Mono, monospace'
                                }}>
                                  {report.hours}h
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Project Analytics Section */}
            {projectAnalytics.length > 0 && (
              <>
                <div className="section-header" style={{ marginTop: '3rem' }}>
                  <h2 className="section-title">Hours by Project/App</h2>
                  <div style={{ 
                    fontSize: '1.5rem', 
                    fontWeight: 700,
                    color: '#667eea',
                    fontFamily: 'JetBrains Mono, monospace'
                  }}>
                    Total: {projectAnalytics.reduce((sum, proj) => sum + proj.total_hours, 0).toFixed(1)}h
                  </div>
                </div>

                <div className="cards-grid">
                  {projectAnalytics.map(projData => (
                    <div key={projData.project_name} className="card">
                      <div className="card-header">
                        <div>
                          <div className="card-title">📱 {projData.project_name}</div>
                          <div className="card-subtitle">{projData.employee_count} employee(s) working</div>
                        </div>
                      </div>
                      
                      <div className="report-details" style={{ marginTop: '1.5rem' }}>
                        <div className="detail-item">
                          <div className="detail-label">Total Hours</div>
                          <div className="detail-value" style={{ 
                            fontSize: '2rem',
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text'
                          }}>
                            {projData.total_hours.toFixed(1)}h
                          </div>
                        </div>
                        
                        <div className="detail-item">
                          <div className="detail-label">Reports</div>
                          <div className="detail-value">{projData.report_count}</div>
                        </div>
                        
                        <div className="detail-item">
                          <div className="detail-label">Avg Hours/Report</div>
                          <div className="detail-value">
                            {projData.report_count > 0 
                              ? (projData.total_hours / projData.report_count).toFixed(1)
                              : '0'}h
                          </div>
                        </div>
                      </div>

                      {projData.reports.length > 0 && (
                        <div style={{ marginTop: '1.5rem' }}>
                          <div className="detail-label" style={{ marginBottom: '0.75rem' }}>
                            Report Breakdown
                          </div>
                          <div style={{ 
                            display: 'flex', 
                            flexDirection: 'column', 
                            gap: '0.5rem',
                            maxHeight: '200px',
                            overflowY: 'auto'
                          }}>
                            {projData.reports.map(report => (
                              <div 
                                key={report.id}
                                style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  padding: '0.5rem 0.75rem',
                                  background: 'rgba(15, 20, 40, 0.5)',
                                  borderRadius: '8px',
                                  fontSize: '0.9rem'
                                }}
                              >
                                <span style={{ color: '#a5b4fc' }}>
                                  {report.date} - {report.employee_name}
                                </span>
                                <span style={{ 
                                  color: '#fff', 
                                  fontWeight: 600,
                                  fontFamily: 'JetBrains Mono, monospace'
                                }}>
                                  {report.hours}h
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {/* Employees Tab */}
        {activeTab === 'employees' && (
          <>
            <div className="section-header">
              <h2 className="section-title">Team Members ({employees.length})</h2>
              <button className="btn btn-primary" onClick={() => setShowEmployeeModal(true)}>
                <Plus size={18} />
                Add Employee
              </button>
            </div>

            {employees.length === 0 ? (
              <div className="empty-state">
                <Users size={64} className="empty-icon" />
                <p>No employees yet. Add your first team member!</p>
              </div>
            ) : (
              <div className="employees-grid">
                {employees.map(employee => (
                  <div key={employee.id} className="card">
                    <div className="card-header">
                      <div>
                        <div className="card-title">{employee.name}</div>
                        <div className="card-subtitle">{employee.role}</div>
                      </div>
                      <button 
                        className="icon-btn danger"
                        onClick={() => handleDeleteEmployee(employee.id)}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                    <div style={{ marginTop: '1rem' }}>
                      <div className="detail-label">Email</div>
                      <div style={{ color: '#c7d2fe', marginTop: '0.25rem' }}>{employee.email}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Add Employee Modal */}
      {showEmployeeModal && (
        <div className="modal-overlay" onClick={() => setShowEmployeeModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Add New Employee</h3>
              <button className="close-btn" onClick={() => setShowEmployeeModal(false)}>
                <X size={20} />
              </button>
            </div>
            <form className="form" onSubmit={handleAddEmployee}>
              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input 
                  type="text"
                  className="form-input"
                  value={employeeForm.name}
                  onChange={(e) => setEmployeeForm({...employeeForm, name: e.target.value})}
                  required
                  placeholder="John Doe"
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">Email *</label>
                <input 
                  type="email"
                  className="form-input"
                  value={employeeForm.email}
                  onChange={(e) => setEmployeeForm({...employeeForm, email: e.target.value})}
                  required
                  placeholder="john@example.com"
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">Role *</label>
                <input 
                  type="text"
                  className="form-input"
                  value={employeeForm.role}
                  onChange={(e) => setEmployeeForm({...employeeForm, role: e.target.value})}
                  required
                  placeholder="Software Engineer"
                />
              </div>
              
              <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                <Plus size={18} />
                Add Employee
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Add Report Modal */}
      {showReportModal && (
        <div className="modal-overlay" onClick={() => setShowReportModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Submit EOD Report</h3>
              <button className="close-btn" onClick={() => setShowReportModal(false)}>
                <X size={20} />
              </button>
            </div>
            <form className="form" onSubmit={handleAddReport}>
              <div className="form-group">
                <label className="form-label">Employee *</label>
                <select 
                  className="form-select"
                  value={reportForm.employee_id}
                  onChange={(e) => setReportForm({...reportForm, employee_id: e.target.value})}
                  required
                >
                  <option value="">Select Employee</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name} - {emp.role}</option>
                  ))}
                </select>
              </div>
              
              <div className="form-group">
                <label className="form-label">Date *</label>
                <input 
                  type="date"
                  className="form-input"
                  value={reportForm.date}
                  onChange={(e) => setReportForm({...reportForm, date: e.target.value})}
                  required
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">Project/App *</label>
                <input 
                  type="text"
                  list="projects-list"
                  className="form-input"
                  value={reportForm.project}
                  onChange={(e) => setReportForm({...reportForm, project: e.target.value})}
                  required
                  placeholder="e.g., Mobile App, Website Redesign, API Development"
                />
                <datalist id="projects-list">
                  {projects.map(proj => (
                    <option key={proj} value={proj} />
                  ))}
                </datalist>
              </div>
              
              <div className="form-group">
                <label className="form-label">Hours Worked *</label>
                <input 
                  type="number"
                  step="0.5"
                  min="0"
                  max="24"
                  className="form-input"
                  value={reportForm.hours}
                  onChange={(e) => setReportForm({...reportForm, hours: e.target.value})}
                  required
                  placeholder="8"
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea 
                  className="form-textarea"
                  value={reportForm.description}
                  onChange={(e) => setReportForm({...reportForm, description: e.target.value})}
                  placeholder="What did you work on today?"
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">Screenshots</label>
                <label className="file-upload">
                  <input 
                    type="file"
                    className="file-upload-input"
                    accept="image/*"
                    multiple
                    onChange={handleFileChange}
                  />
                  <Upload size={32} style={{ margin: '0 auto 0.5rem', opacity: 0.5 }} />
                  <div style={{ color: '#a5b4fc', marginBottom: '0.25rem' }}>
                    Click to upload screenshots
                  </div>
                  <div style={{ fontSize: '0.85rem', opacity: 0.7 }}>
                    Select multiple files at once - PNG, JPG, GIF up to 10MB each
                  </div>
                  <div style={{ fontSize: '0.8rem', opacity: 0.5, marginTop: '0.25rem' }}>
                    💡 Tip: Hold Ctrl (Windows) or Cmd (Mac) to select multiple files
                  </div>
                </label>
                
                {screenshotPreviews.length > 0 && (
                  <div style={{ marginTop: '1rem' }}>
                    <div className="detail-label" style={{ marginBottom: '0.75rem' }}>
                      {screenshotPreviews.length} Screenshot(s) - Add captions (optional)
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {screenshotPreviews.map((preview, index) => (
                        <div 
                          key={index}
                          style={{
                            display: 'flex',
                            gap: '1rem',
                            padding: '1rem',
                            background: 'rgba(15, 20, 40, 0.5)',
                            borderRadius: '12px',
                            alignItems: 'flex-start'
                          }}
                        >
                          <img 
                            src={preview.url}
                            alt={`Preview ${index + 1}`}
                            style={{
                              width: '100px',
                              height: '100px',
                              objectFit: 'cover',
                              borderRadius: '8px',
                              border: '2px solid rgba(255, 255, 255, 0.1)'
                            }}
                          />
                          <div style={{ flex: 1 }}>
                            <div style={{ 
                              fontSize: '0.85rem', 
                              color: '#a5b4fc',
                              marginBottom: '0.5rem'
                            }}>
                              Screenshot {index + 1}
                            </div>
                            <input 
                              type="text"
                              className="form-input"
                              placeholder="Add a note/caption for this screenshot..."
                              value={preview.caption}
                              onChange={(e) => updateScreenshotCaption(index, e.target.value)}
                              style={{ marginBottom: '0' }}
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => removeScreenshot(index)}
                            className="icon-btn danger"
                            style={{ marginTop: '1.5rem' }}
                          >
                            <X size={18} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                <FileText size={18} />
                Submit Report
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Report Modal */}
      {showEditReportModal && editingReport && (
        <div className="modal-overlay" onClick={() => { setShowEditReportModal(false); setEditingReport(null); }}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Edit EOD Report</h3>
              <button className="close-btn" onClick={() => { setShowEditReportModal(false); setEditingReport(null); }}>
                <X size={20} />
              </button>
            </div>
            
            <div style={{
              marginBottom: '1.5rem',
              padding: '1rem',
              background: 'rgba(103, 232, 249, 0.1)',
              border: '1px solid rgba(103, 232, 249, 0.2)',
              borderRadius: '12px',
              fontSize: '0.9rem',
              color: '#67e8f9'
            }}>
              ℹ️ You can edit report details and add new screenshots. Existing screenshots cannot be removed.
            </div>

            <form className="form" onSubmit={handleUpdateReport}>
              <div className="form-group">
                <label className="form-label">Employee *</label>
                <select 
                  className="form-select"
                  value={reportForm.employee_id}
                  onChange={(e) => setReportForm({...reportForm, employee_id: e.target.value})}
                  required
                >
                  <option value="">Select Employee</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name} - {emp.role}</option>
                  ))}
                </select>
              </div>
              
              <div className="form-group">
                <label className="form-label">Date *</label>
                <input 
                  type="date"
                  className="form-input"
                  value={reportForm.date}
                  onChange={(e) => setReportForm({...reportForm, date: e.target.value})}
                  required
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">Project/App *</label>
                <input 
                  type="text"
                  list="projects-list-edit"
                  className="form-input"
                  value={reportForm.project}
                  onChange={(e) => setReportForm({...reportForm, project: e.target.value})}
                  required
                  placeholder="e.g., Mobile App, Website Redesign"
                />
                <datalist id="projects-list-edit">
                  {projects.map(proj => (
                    <option key={proj} value={proj} />
                  ))}
                </datalist>
              </div>
              
              <div className="form-group">
                <label className="form-label">Hours Worked *</label>
                <input 
                  type="number"
                  step="0.5"
                  min="0"
                  max="24"
                  className="form-input"
                  value={reportForm.hours}
                  onChange={(e) => setReportForm({...reportForm, hours: e.target.value})}
                  required
                  placeholder="8"
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea 
                  className="form-textarea"
                  value={reportForm.description}
                  onChange={(e) => setReportForm({...reportForm, description: e.target.value})}
                  placeholder="What did you work on?"
                />
              </div>

              {/* Existing Screenshots */}
              {editingReport.screenshots && editingReport.screenshots.length > 0 && (
                <div className="form-group">
                  <label className="form-label">Existing Screenshots ({editingReport.screenshots.length})</label>
                  <div className="screenshots-grid">
                    {editingReport.screenshots.map(screenshot => (
                      <div key={screenshot.id} style={{ position: 'relative' }}>
                        <img 
                          src={`${API_URL.replace('/api', '')}/uploads/${screenshot.filepath}`}
                          alt={screenshot.filename}
                          style={{
                            width: '100%',
                            height: '100px',
                            objectFit: 'cover',
                            borderRadius: '10px',
                            border: '2px solid rgba(255, 255, 255, 0.1)'
                          }}
                        />
                        {screenshot.caption && (
                          <div style={{
                            position: 'absolute',
                            bottom: 0,
                            left: 0,
                            right: 0,
                            background: 'rgba(0, 0, 0, 0.8)',
                            color: '#fff',
                            fontSize: '0.75rem',
                            padding: '0.25rem 0.5rem',
                            borderBottomLeftRadius: '10px',
                            borderBottomRightRadius: '10px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {screenshot.caption}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Add New Screenshots */}
              <div className="form-group">
                <label className="form-label">Add New Screenshots (Optional)</label>
                <label className="file-upload">
                  <input 
                    type="file"
                    className="file-upload-input"
                    accept="image/*"
                    multiple
                    onChange={handleFileChange}
                  />
                  <Upload size={32} style={{ margin: '0 auto 0.5rem', opacity: 0.5 }} />
                  <div style={{ color: '#a5b4fc', marginBottom: '0.25rem' }}>
                    Click to add more screenshots
                  </div>
                  <div style={{ fontSize: '0.85rem', opacity: 0.7 }}>
                    Select multiple files at once - PNG, JPG, GIF up to 10MB each
                  </div>
                  <div style={{ fontSize: '0.8rem', opacity: 0.5, marginTop: '0.25rem' }}>
                    💡 Tip: Hold Ctrl (Windows) or Cmd (Mac) to select multiple files
                  </div>
                </label>
                
                {screenshotPreviews.length > 0 && (
                  <div style={{ marginTop: '1rem' }}>
                    <div className="detail-label" style={{ marginBottom: '0.75rem' }}>
                      {screenshotPreviews.length} New Screenshot(s) - Add captions (optional)
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {screenshotPreviews.map((preview, index) => (
                        <div 
                          key={index}
                          style={{
                            display: 'flex',
                            gap: '1rem',
                            padding: '1rem',
                            background: 'rgba(15, 20, 40, 0.5)',
                            borderRadius: '12px',
                            alignItems: 'flex-start'
                          }}
                        >
                          <img 
                            src={preview.url}
                            alt={`New preview ${index + 1}`}
                            style={{
                              width: '100px',
                              height: '100px',
                              objectFit: 'cover',
                              borderRadius: '8px',
                              border: '2px solid rgba(255, 255, 255, 0.1)'
                            }}
                          />
                          <div style={{ flex: 1 }}>
                            <div style={{ 
                              fontSize: '0.85rem', 
                              color: '#a5b4fc',
                              marginBottom: '0.5rem'
                            }}>
                              New Screenshot {index + 1}
                            </div>
                            <input 
                              type="text"
                              className="form-input"
                              placeholder="Add a note/caption..."
                              value={preview.caption}
                              onChange={(e) => updateScreenshotCaption(index, e.target.value)}
                              style={{ marginBottom: '0' }}
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => removeScreenshot(index)}
                            className="icon-btn danger"
                            style={{ marginTop: '1.5rem' }}
                          >
                            <X size={18} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                <Edit size={18} />
                Update Report
              </button>
            </form>
          </div>
        </div>
      )}

      {/* View Report Modal */}
      {selectedReport && (
        <div className="modal-overlay" onClick={() => setSelectedReport(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Report Details</h3>
              <button className="close-btn" onClick={() => setSelectedReport(null)}>
                <X size={20} />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <div className="detail-label">Employee</div>
                <div className="card-title" style={{ marginTop: '0.5rem' }}>
                  {selectedReport.employee_name}
                </div>
                <div className="card-subtitle">{selectedReport.employee_role}</div>
              </div>
              
              <div className="report-details">
                <div className="detail-item">
                  <div className="detail-label">Date</div>
                  <div className="detail-value">{selectedReport.date}</div>
                </div>
                <div className="detail-item">
                  <div className="detail-label">Hours</div>
                  <div className="detail-value">{selectedReport.hours}h</div>
                </div>
                {selectedReport.project && (
                  <div className="detail-item">
                    <div className="detail-label">Project/App</div>
                    <div className="detail-value" style={{ fontSize: '1rem' }}>📱 {selectedReport.project}</div>
                  </div>
                )}
              </div>
              
              {selectedReport.description && (
                <div>
                  <div className="detail-label">Description</div>
                  <p style={{ color: '#c7d2fe', marginTop: '0.5rem', lineHeight: '1.6' }}>
                    {selectedReport.description}
                  </p>
                </div>
              )}
              
              {selectedReport.screenshots && selectedReport.screenshots.length > 0 && (
                <div>
                  <div className="detail-label">Screenshots ({selectedReport.screenshots.length})</div>
                  <div className="screenshots-grid" style={{ marginTop: '0.75rem' }}>
                    {selectedReport.screenshots.map((screenshot, idx) => (
                      <div key={screenshot.id} style={{ position: 'relative' }}>
                        <img 
                          src={`${API_URL.replace('/api', '')}/uploads/${screenshot.filepath}`}
                          alt={screenshot.filename}
                          className="screenshot-thumb"
                          onClick={() => openGallery(selectedReport.screenshots, idx)}
                        />
                        {screenshot.caption && (
                          <div style={{
                            position: 'absolute',
                            bottom: 0,
                            left: 0,
                            right: 0,
                            background: 'rgba(0, 0, 0, 0.8)',
                            color: '#fff',
                            fontSize: '0.75rem',
                            padding: '0.25rem 0.5rem',
                            borderBottomLeftRadius: '10px',
                            borderBottomRightRadius: '10px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {screenshot.caption}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Quick Add Modal */}
      {showQuickAddModal && (
        <div className="modal-overlay" onClick={() => setShowQuickAddModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3 className="modal-title">⚡ Quick EOD Entry</h3>
              <button className="close-btn" onClick={() => setShowQuickAddModal(false)}>
                <X size={20} />
              </button>
            </div>
            
            <form className="form" onSubmit={handleQuickSubmit}>
              <div className="form-group">
                <label className="form-label">Employee *</label>
                <select 
                  className="form-select"
                  value={quickForm.employee_id}
                  onChange={(e) => handleQuickEmployeeSelect(e.target.value)}
                  required
                >
                  <option value="">Select Employee</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name}</option>
                  ))}
                </select>
              </div>

              {lastReport && (
                <div style={{
                  padding: '1rem',
                  background: 'rgba(102, 126, 234, 0.1)',
                  border: '1px solid rgba(102, 126, 234, 0.2)',
                  borderRadius: '12px',
                  marginBottom: '1rem'
                }}>
                  <div style={{ 
                    fontSize: '0.85rem', 
                    color: '#a5b4fc',
                    marginBottom: '0.5rem'
                  }}>
                    Last Report: 📱 {lastReport.project} • {lastReport.hours}h
                  </div>
                  <button 
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setQuickForm({
                      ...quickForm,
                      project: lastReport.project,
                      hours: lastReport.hours.toString()
                    })}
                    style={{ width: '100%', fontSize: '0.9rem' }}
                  >
                    <Clock size={16} />
                    Use Same Project & Hours
                  </button>
                </div>
              )}
              
              <div className="form-group">
                <label className="form-label">Date *</label>
                <input 
                  type="date"
                  className="form-input"
                  value={quickForm.date}
                  onChange={(e) => setQuickForm({...quickForm, date: e.target.value})}
                  required
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">Project/App *</label>
                <input 
                  type="text"
                  list="projects-list-quick"
                  className="form-input"
                  value={quickForm.project}
                  onChange={(e) => setQuickForm({...quickForm, project: e.target.value})}
                  required
                  placeholder="e.g., Mobile App"
                />
                <datalist id="projects-list-quick">
                  {projects.map(proj => (
                    <option key={proj} value={proj} />
                  ))}
                </datalist>
              </div>
              
              <div className="form-group">
                <label className="form-label">Hours Worked *</label>
                <input 
                  type="number"
                  step="0.5"
                  min="0"
                  max="24"
                  className="form-input"
                  value={quickForm.hours}
                  onChange={(e) => setQuickForm({...quickForm, hours: e.target.value})}
                  required
                  placeholder="8"
                />
              </div>
              
              <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                <Clock size={18} />
                Quick Submit
              </button>

              <div style={{ 
                marginTop: '1rem',
                padding: '0.75rem',
                background: 'rgba(103, 232, 249, 0.1)',
                border: '1px solid rgba(103, 232, 249, 0.2)',
                borderRadius: '8px',
                fontSize: '0.85rem',
                color: '#67e8f9',
                textAlign: 'center'
              }}>
                💡 Description & screenshots are optional. Click "New Report" for full form.
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Gallery Modal */}
      {showGallery && galleryImages.length > 0 && (
        <div 
          className="modal-overlay" 
          onClick={closeGallery}
          onKeyDown={(e) => {
            if (e.key === 'ArrowRight') nextImage();
            if (e.key === 'ArrowLeft') prevImage();
            if (e.key === 'Escape') closeGallery();
          }}
          tabIndex={0}
          style={{ cursor: 'zoom-out' }}
        >
          <div 
            style={{ 
              position: 'relative',
              maxWidth: '90vw',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '1rem'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button 
              onClick={closeGallery}
              style={{
                position: 'absolute',
                top: '-60px',
                right: '0',
                width: '48px',
                height: '48px',
                border: 'none',
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(10px)',
                color: '#fff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.3s ease',
                zIndex: 1001
              }}
              onMouseEnter={(e) => e.target.style.background = 'rgba(239, 68, 68, 0.3)'}
              onMouseLeave={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.1)'}
            >
              <X size={24} />
            </button>

            {/* Image Counter */}
            <div style={{
              position: 'absolute',
              top: '-60px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(10px)',
              color: '#fff',
              padding: '0.75rem 1.5rem',
              borderRadius: '24px',
              fontSize: '0.95rem',
              fontWeight: 600,
              fontFamily: 'JetBrains Mono, monospace'
            }}>
              {currentImageIndex + 1} / {galleryImages.length}
            </div>

            {/* Previous Button */}
            {galleryImages.length > 1 && (
              <button 
                onClick={prevImage}
                style={{
                  position: 'absolute',
                  left: '-80px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: '64px',
                  height: '64px',
                  border: 'none',
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(10px)',
                  color: '#fff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.3s ease',
                  fontSize: '2rem',
                  fontWeight: 'bold'
                }}
                onMouseEnter={(e) => e.target.style.background = 'rgba(102, 126, 234, 0.4)'}
                onMouseLeave={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.1)'}
              >
                ‹
              </button>
            )}

            {/* Next Button */}
            {galleryImages.length > 1 && (
              <button 
                onClick={nextImage}
                style={{
                  position: 'absolute',
                  right: '-80px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: '64px',
                  height: '64px',
                  border: 'none',
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(10px)',
                  color: '#fff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.3s ease',
                  fontSize: '2rem',
                  fontWeight: 'bold'
                }}
                onMouseEnter={(e) => e.target.style.background = 'rgba(102, 126, 234, 0.4)'}
                onMouseLeave={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.1)'}
              >
                ›
              </button>
            )}

            {/* Image */}
            <img 
              src={`${API_URL.replace('/api', '')}/uploads/${galleryImages[currentImageIndex].filepath}`}
              alt={galleryImages[currentImageIndex].filename}
              style={{
                maxWidth: '100%',
                maxHeight: '70vh',
                objectFit: 'contain',
                borderRadius: '16px',
                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)'
              }}
            />

            {/* Caption */}
            {galleryImages[currentImageIndex].caption && (
              <div style={{
                background: 'rgba(20, 25, 45, 0.95)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '16px',
                padding: '1.5rem',
                maxWidth: '600px',
                textAlign: 'center',
                color: '#e8eaf6',
                fontSize: '1rem',
                lineHeight: '1.6'
              }}>
                {galleryImages[currentImageIndex].caption}
              </div>
            )}

            {/* Keyboard Hints */}
            {galleryImages.length > 1 && (
              <div style={{
                position: 'absolute',
                bottom: '-50px',
                left: '50%',
                transform: 'translateX(-50%)',
                color: '#a5b4fc',
                fontSize: '0.85rem',
                display: 'flex',
                gap: '1.5rem',
                opacity: 0.7
              }}>
                <span>← Previous</span>
                <span>→ Next</span>
                <span>ESC Close</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;