import React, { useState, useMemo } from "react";
import { getCurrentUser } from "@/lib/auth";
import ReportsStats from "@/components/reports/ReportsStats";
import ReportsFilters from "@/components/reports/ReportsFilters";
import ReportsTable from "@/components/reports/ReportsTable";
import ReportsForm from "@/components/reports/ReportsForm";
import ReportPreviewModal from "@/components/reports/ReportPreviewModal";
import { Plus } from "lucide-react";
import { toast } from "sonner"; // Using 'sonner' which is imported in App.jsx

const initialMockReports = [
    {
        id: "RPT-001",
        reportTitle: "March Expired Items Loss Report",
        reportType: "Expired Items Report",
        description: "Analysis of all stock that expired across shelves during the previous month.",
        generatedBy: "Admin User",
        generatedDate: "2026-03-01",
        dateRangeStart: "2026-03-01",
        dateRangeEnd: "2026-03-31",
        status: "Published",
        visibility: "All",
        format: "PDF",
        priority: "High",
        notes: "Requested by regional manager.",
        published: true,
        archived: false,
        favorite: true
    },
    {
        id: "RPT-002",
        reportTitle: "AI High Risk Inventory Prediction",
        reportType: "AI Risk Prediction Report",
        description: "Predictive model output flagging incoming batches likely to go to waste.",
        generatedBy: "System AI",
        generatedDate: "2026-04-01",
        dateRangeStart: "2026-04-01",
        dateRangeEnd: "2026-04-14",
        status: "Generated",
        visibility: "Admin Only",
        format: "Dashboard View",
        priority: "Critical",
        notes: "",
        published: false,
        archived: false,
        favorite: true
    },
    {
        id: "RPT-003",
        reportTitle: "Q1 Discount Performance Review",
        reportType: "Discount Report",
        description: "Assessing the monetary recovery generated via dynamic discounting.",
        generatedBy: "Store Manager",
        generatedDate: "",
        dateRangeStart: "2026-01-01",
        dateRangeEnd: "2026-03-31",
        status: "Pending",
        visibility: "Staff",
        format: "Excel",
        priority: "Medium",
        notes: "Awaiting final batch data.",
        published: false,
        archived: false,
        favorite: false
    },
    {
        id: "RPT-004",
        reportTitle: "Dairy Batch Expiry Monitoring",
        reportType: "Near Expiry Report",
        description: "",
        generatedBy: "Staff Member",
        generatedDate: "2026-04-02",
        dateRangeStart: "2026-04-02",
        dateRangeEnd: "2026-04-09",
        status: "Archived",
        visibility: "All",
        format: "CSV",
        priority: "Low",
        notes: "",
        published: false,
        archived: true,
        favorite: false
    }
];

const ReportsManagement = ({ role }) => {
    const [reports, setReports] = useState(initialMockReports);
    const [filters, setFilters] = useState({ search: '', type: '', status: '', priority: '', visibility: '' });
    
    // Modal state
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingReport, setEditingReport] = useState(null);
    const [previewReport, setPreviewReport] = useState(null);

    // Filter Logic
    const filteredReports = useMemo(() => {
        let result = [...reports];

        // 1. Role-based Visibility Pre-filter
        if (role !== "ADMIN") {
            // Staff can only see 'Staff' or 'All' visibility. (Hide Admin Only and Archived)
            result = result.filter(r => (r.visibility === "Staff" || r.visibility === "All") && !r.archived);
        }

        // 2. Search
        if (filters.search) {
            const q = filters.search.toLowerCase();
            result = result.filter(r => 
                r.reportTitle.toLowerCase().includes(q) || 
                r.reportType.toLowerCase().includes(q) ||
                r.generatedBy.toLowerCase().includes(q)
            );
        }

        // 3. Dropdowns
        if (filters.type) result = result.filter(r => r.reportType === filters.type);
        if (filters.status) result = result.filter(r => r.status === filters.status);
        if (filters.priority) result = result.filter(r => r.priority === filters.priority);
        if (filters.visibility) result = result.filter(r => r.visibility === filters.visibility);

        // Sort: Favorites first, then newest based on generatedDate (or just ID)
        return result.sort((a, b) => {
            if (a.favorite === b.favorite) {
                return b.id.localeCompare(a.id);
            }
            return a.favorite ? -1 : 1;
        });
    }, [reports, filters, role]);

    // Handlers
    const handleSaveReport = (data) => {
        const user = getCurrentUser();
        const generatedBy = user ? user.name || user.username : "Unknown User";

        const now = new Date().toISOString().split('T')[0];
        
        let finalData = { ...data };
        
        // Auto generation logic
        if ((finalData.status === "Generated" || finalData.status === "Published") && !finalData.generatedDate) {
            finalData.generatedDate = now;
        }

        if (editingReport) {
            setReports(prev => prev.map(r => r.id === editingReport.id ? { ...r, ...finalData } : r));
            toast.success("Report updated successfully");
        } else {
            const newId = `RPT-${String(reports.length + 1).padStart(3, '0')}`;
            setReports(prev => [{ ...finalData, id: newId, generatedBy, favorite: false, archived: false }, ...prev]);
            toast.success("New report created successfully");
        }
        setIsFormOpen(false);
        setEditingReport(null);
    };

    const handleDelete = (id) => {
        if (window.confirm("Are you sure you want to permanently delete this report?")) {
            setReports(prev => prev.filter(r => r.id !== id));
            toast.error("Report deleted");
        }
    };

    const handleArchive = (id) => {
        setReports(prev => prev.map(r => r.id === id ? { ...r, status: "Archived", archived: true, published: false } : r));
        toast.info("Report archived");
    };

    const handleRestore = (id) => {
        setReports(prev => prev.map(r => r.id === id ? { ...r, status: "Draft", archived: false } : r));
        toast.success("Report restored to Draft");
    };

    const handlePublish = (id) => {
        setReports(prev => prev.map(r => r.id === id ? { 
            ...r, 
            status: "Published", 
            published: true, 
            generatedDate: r.generatedDate || new Date().toISOString().split('T')[0] 
        } : r));
        toast.success("Report published");
    };

    const handleUnpublish = (id) => {
        setReports(prev => prev.map(r => r.id === id ? { ...r, status: "Generated", published: false } : r));
        toast.info("Report unpublished");
    };

    const handleTogglePin = (id) => {
        setReports(prev => prev.map(r => r.id === id ? { ...r, favorite: !r.favorite } : r));
    };

    const handleDownload = (report) => {
        // Simulate download
        toast.success(`Exporting ${report.reportTitle} as ${report.format}...`);
    };

    return (
        <div className="flex flex-col gap-6 animate-fade-in">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between pb-6 border-b border-[#0F172A]/5 gap-4">
                <div>
                    <h1 className="text-3xl font-black text-[#0F172A]">Reports Management</h1>
                    <p className="text-[#0F172A]/50 font-medium mt-1">Analytics, performance summaries, and predictive intelligence exports.</p>
                </div>
                {role === "ADMIN" && (
                    <button 
                        onClick={() => { setEditingReport(null); setIsFormOpen(true); }}
                        className="px-6 py-3 rounded-2xl bg-[#0F172A] text-white font-black hover:scale-105 active:scale-95 transition-all shadow-xl flex items-center gap-2"
                    >
                        <Plus size={18} /> New Report
                    </button>
                )}
            </div>

            <ReportsStats reports={reports} />
            <ReportsFilters filters={filters} setFilters={setFilters} />
            
            <ReportsTable 
                reports={filteredReports} 
                role={role}
                onPreview={setPreviewReport}
                onEdit={(report) => { setEditingReport(report); setIsFormOpen(true); }}
                onDelete={handleDelete}
                onArchive={handleArchive}
                onRestore={handleRestore}
                onPublish={handlePublish}
                onUnpublish={handleUnpublish}
                onTogglePin={handleTogglePin}
                onDownload={handleDownload}
            />

            <ReportsForm 
                open={isFormOpen} 
                setOpen={setIsFormOpen} 
                report={editingReport} 
                onSave={handleSaveReport}
            />

            <ReportPreviewModal 
                report={previewReport} 
                onClose={() => setPreviewReport(null)} 
                onDownload={handleDownload}
            />
        </div>
    );
};

export default ReportsManagement;
