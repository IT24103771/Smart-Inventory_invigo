import React from "react";
import { Search, Filter } from "lucide-react";

export const reportTypes = [
    "Expired Items Report", "Near Expiry Report", "Sales Report", 
    "Inventory Summary", "Low Stock Report", "Discount Report", 
    "AI Risk Prediction Report", "Loss Analysis Report", 
    "Monthly Summary", "Weekly Summary", "Custom Report"
];

const ReportsFilters = ({ filters, setFilters }) => {
    return (
        <div className="bg-white p-6 rounded-3xl border border-[#0F172A]/5 shadow-sm mb-8 flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:w-96">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#0F172A]/40" />
                <input 
                    type="text" 
                    placeholder="Search reports by title, type, or author..." 
                    className="w-full pl-12 pr-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#007A5E]/20 focus:border-[#007A5E] text-sm font-medium transition-all"
                    value={filters.search}
                    onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                />
            </div>
            
            <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
                <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-xl border border-slate-200">
                    <Filter size={14} className="text-slate-400"/>
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Filters</span>
                </div>

                <select 
                    className="py-2.5 pl-4 pr-8 rounded-xl bg-white border border-slate-200 text-sm font-medium focus:outline-none focus:border-[#007A5E] cursor-pointer"
                    value={filters.type}
                    onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
                >
                    <option value="">All Types</option>
                    {reportTypes.map(t => <option key={t} value={t}>{t}</option>)}
                </select>

                <select 
                    className="py-2.5 pl-4 pr-8 rounded-xl bg-white border border-slate-200 text-sm font-medium focus:outline-none focus:border-[#007A5E] cursor-pointer"
                    value={filters.status}
                    onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                >
                    <option value="">All Statuses</option>
                    <option value="Draft">Draft</option>
                    <option value="Pending">Pending</option>
                    <option value="Generated">Generated</option>
                    <option value="Published">Published</option>
                    <option value="Archived">Archived</option>
                </select>

                <select 
                    className="py-2.5 pl-4 pr-8 rounded-xl bg-white border border-slate-200 text-sm font-medium focus:outline-none focus:border-[#007A5E] cursor-pointer"
                    value={filters.priority}
                    onChange={(e) => setFilters(prev => ({ ...prev, priority: e.target.value }))}
                >
                    <option value="">All Priorities</option>
                    <option value="Critical">Critical</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                </select>
                
                <select 
                    className="py-2.5 pl-4 pr-8 rounded-xl bg-white border border-slate-200 text-sm font-medium focus:outline-none focus:border-[#007A5E] cursor-pointer"
                    value={filters.visibility}
                    onChange={(e) => setFilters(prev => ({ ...prev, visibility: e.target.value }))}
                >
                    <option value="">Any Visibility</option>
                    <option value="Admin Only">Admin Only</option>
                    <option value="Staff">Staff</option>
                    <option value="All">All</option>
                </select>
            </div>
        </div>
    );
};

export default ReportsFilters;
