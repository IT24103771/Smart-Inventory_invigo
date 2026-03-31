import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ReportStatusBadge, ReportPriorityBadge } from "./ReportStatusBadge";
import { Eye, Download, Edit2, Trash2, Archive, Star, CheckCircle2, XCircle, RotateCcw, MoreVertical, Search } from "lucide-react";

const ReportsTable = ({ 
    reports, 
    role, 
    onPreview, 
    onEdit, 
    onDelete, 
    onArchive, 
    onRestore, 
    onPublish, 
    onUnpublish, 
    onTogglePin, 
    onDownload 
}) => {
    
    if (reports.length === 0) {
        return (
            <div className="bg-white rounded-3xl p-16 text-center border border-[#0F172A]/5 shadow-sm">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-slate-50 text-slate-400 mb-6">
                    <Search size={32} />
                </div>
                <h3 className="text-xl font-black text-[#0F172A] mb-2">No Reports Found</h3>
                <p className="text-[#0F172A]/50 font-medium">Try adjusting your search criteria or filters.</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-3xl border border-[#0F172A]/5 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50/50 border-b border-slate-100/80">
                            <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-[#0F172A]/40 whitespace-nowrap">Report Details</th>
                            <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-[#0F172A]/40 whitespace-nowrap">Status & Priority</th>
                            <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-[#0F172A]/40 whitespace-nowrap">Visibility Options</th>
                            <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-[#0F172A]/40 whitespace-nowrap text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100/80">
                        <AnimatePresence>
                            {reports.map((report) => (
                                <motion.tr 
                                    key={report.id}
                                    layout
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="group hover:bg-slate-50/30 transition-colors"
                                >
                                    <td className="py-5 px-6">
                                        <div className="flex items-start gap-3">
                                            <button 
                                                onClick={() => role === 'ADMIN' ? onTogglePin(report.id) : null}
                                                className={`mt-1 ${report.favorite ? 'text-yellow-400' : 'text-slate-300 hover:text-yellow-400'} transition-colors ${role !== 'ADMIN' && 'cursor-default'}`}
                                            >
                                                <Star size={16} fill={report.favorite ? "currentColor" : "none"} />
                                            </button>
                                            <div>
                                                <div className="font-bold text-[#0F172A] mb-1 flex items-center gap-2">
                                                    {report.reportTitle}
                                                    {report.status === "Archived" && <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block sm:hidden">(Archived)</span>}
                                                </div>
                                                <div className="text-xs font-semibold text-[#0F172A]/50 flex items-center gap-2">
                                                    <span className="bg-[#0F172A]/5 px-2 py-0.5 rounded-md">{report.reportType}</span>
                                                    <span>•</span>
                                                    <span>By {report.generatedBy}</span>
                                                </div>
                                                <div className="text-[10px] font-bold text-slate-400 mt-1.5 flex gap-3">
                                                    <span>Range: {report.dateRangeStart || "N/A"} to {report.dateRangeEnd || "N/A"}</span>
                                                    <span>Format: {report.format}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    
                                    <td className="py-5 px-6">
                                        <div className="flex flex-col items-start gap-2">
                                            <ReportStatusBadge status={report.status} />
                                            <ReportPriorityBadge priority={report.priority} />
                                        </div>
                                    </td>

                                    <td className="py-5 px-6">
                                        <div className="flex flex-col items-start gap-1 pb-1">
                                            <div className="text-xs font-bold text-[#0F172A]/60">
                                                Audience: <span className="text-[#0F172A]">{report.visibility}</span>
                                            </div>
                                            {report.published ? (
                                                <div className="text-[10px] font-black uppercase tracking-widest text-[#007A5E] flex items-center gap-1 mt-1">
                                                    <CheckCircle2 size={12}/> Published
                                                </div>
                                            ) : (
                                                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1 mt-1">
                                                    <XCircle size={12}/> Unpublished
                                                </div>
                                            )}
                                        </div>
                                    </td>

                                    <td className="py-5 px-6">
                                        <div className="flex items-center justify-end gap-2">
                                            <button 
                                                onClick={() => onPreview(report)} 
                                                className="p-2 rounded-xl text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-colors tooltip-trigger"
                                                title="Preview"
                                            >
                                                <Eye size={18} />
                                            </button>
                                            
                                            {(report.status === "Generated" || report.status === "Published") && (
                                                <button 
                                                    onClick={() => onDownload(report)} 
                                                    className="p-2 rounded-xl text-slate-400 hover:bg-[#007A5E]/10 hover:text-[#007A5E] transition-colors"
                                                    title={`Download ${report.format}`}
                                                >
                                                    <Download size={18} />
                                                </button>
                                            )}

                                            {role === 'ADMIN' && (
                                                <>
                                                    <div className="w-px h-6 bg-slate-200 mx-1"></div>
                                                    
                                                    {report.status !== "Archived" ? (
                                                        <>
                                                            <button 
                                                                onClick={() => onEdit(report)} 
                                                                className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                                                                title="Edit"
                                                            >
                                                                <Edit2 size={16} />
                                                            </button>
                                                            {report.published ? (
                                                                <button onClick={() => onUnpublish(report.id)} className="p-2 rounded-xl text-slate-400 hover:bg-orange-50 hover:text-orange-600 transition-colors" title="Unpublish">
                                                                    <XCircle size={16} />
                                                                </button>
                                                            ) : (
                                                                <button onClick={() => onPublish(report.id)} className="p-2 rounded-xl text-slate-400 hover:bg-[#007A5E]/10 hover:text-[#007A5E] transition-colors" title="Publish">
                                                                    <CheckCircle2 size={16} />
                                                                </button>
                                                            )}
                                                            <button 
                                                                onClick={() => onArchive(report.id)} 
                                                                className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                                                                title="Archive"
                                                            >
                                                                <Archive size={16} />
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <button 
                                                            onClick={() => onRestore(report.id)} 
                                                            className="p-2 rounded-xl text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                                                            title="Restore"
                                                        >
                                                            <RotateCcw size={16} />
                                                        </button>
                                                    )}

                                                    <button 
                                                        onClick={() => onDelete(report.id)} 
                                                        className="p-2 rounded-xl text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                                                        title="Delete permanently"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </motion.tr>
                            ))}
                        </AnimatePresence>
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ReportsTable;
