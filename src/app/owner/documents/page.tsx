'use client';

import { useState } from 'react';
import {
    FileText, Upload, Download, Search, Folder, File,
    MoreHorizontal, Eye, Trash2, Plus, Calendar
} from 'lucide-react';

const MOCK_FOLDERS = ['Licenses & Permits', 'Tax Documents', 'Insurance', 'Employee Docs', 'Contracts'];

const MOCK_DOCUMENTS = [
    { id: 1, name: 'Business License 2026.pdf', folder: 'Licenses & Permits', size: '2.4 MB', uploaded: '2026-01-15', type: 'pdf' },
    { id: 2, name: 'Fire Safety Certificate.pdf', folder: 'Licenses & Permits', size: '1.1 MB', uploaded: '2025-11-20', type: 'pdf' },
    { id: 3, name: 'Q4 2025 Tax Filing.pdf', folder: 'Tax Documents', size: '3.8 MB', uploaded: '2026-01-30', type: 'pdf' },
    { id: 4, name: 'W-9 Form.pdf', folder: 'Tax Documents', size: '512 KB', uploaded: '2025-12-01', type: 'pdf' },
    { id: 5, name: 'Liability Insurance Policy.pdf', folder: 'Insurance', size: '5.2 MB', uploaded: '2026-01-05', type: 'pdf' },
    { id: 6, name: 'Workers Comp Certificate.pdf', folder: 'Insurance', size: '1.8 MB', uploaded: '2025-10-15', type: 'pdf' },
    { id: 7, name: 'Emma Wilson - Application.pdf', folder: 'Employee Docs', size: '890 KB', uploaded: '2025-09-01', type: 'pdf' },
    { id: 8, name: 'Lease Agreement.pdf', folder: 'Contracts', size: '4.5 MB', uploaded: '2025-06-01', type: 'pdf' },
];

export default function DocumentsPage() {
    const [selectedFolder, setSelectedFolder] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');

    const filtered = MOCK_DOCUMENTS.filter(d => {
        const matchFolder = selectedFolder === 'All' || d.folder === selectedFolder;
        const matchSearch = d.name.toLowerCase().includes(searchQuery.toLowerCase());
        return matchFolder && matchSearch;
    });

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text-primary)]">Documents</h1>
                    <p className="text-sm text-[var(--text-muted)] mt-1">{MOCK_DOCUMENTS.length} files</p>
                </div>
                <button className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white rounded-lg text-sm font-medium transition-colors">
                    <Upload size={16} />
                    Upload Document
                </button>
            </div>

            <div className="flex gap-6">
                {/* Sidebar Folders */}
                <div className="w-56 shrink-0">
                    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-3">
                        <h3 className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-2 mb-2">Folders</h3>
                        <button
                            onClick={() => setSelectedFolder('All')}
                            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${selectedFolder === 'All'
                                ? 'bg-[var(--primary)]/10 text-[var(--primary)]'
                                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]'
                                }`}
                        >
                            <Folder size={16} />
                            All Documents
                        </button>
                        {MOCK_FOLDERS.map((folder) => (
                            <button
                                key={folder}
                                onClick={() => setSelectedFolder(folder)}
                                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${selectedFolder === folder
                                    ? 'bg-[var(--primary)]/10 text-[var(--primary)]'
                                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]'
                                    }`}
                            >
                                <Folder size={16} />
                                {folder}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Document List */}
                <div className="flex-1">
                    <div className="relative mb-4">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={16} />
                        <input
                            type="text"
                            placeholder="Search documents..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg py-2 pl-9 pr-4 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                        />
                    </div>

                    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-[var(--border)] bg-[var(--surface-hover)]">
                                    <th className="px-4 py-3 text-left text-[var(--text-muted)] font-medium">Name</th>
                                    <th className="px-4 py-3 text-left text-[var(--text-muted)] font-medium">Folder</th>
                                    <th className="px-4 py-3 text-center text-[var(--text-muted)] font-medium">Size</th>
                                    <th className="px-4 py-3 text-center text-[var(--text-muted)] font-medium">Uploaded</th>
                                    <th className="px-4 py-3"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((doc) => (
                                    <tr key={doc.id} className="border-b border-[var(--border)] hover:bg-[var(--surface-hover)]">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <File size={16} className="text-red-400" />
                                                <span className="font-medium text-[var(--text-primary)]">{doc.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-[var(--text-muted)]">{doc.folder}</td>
                                        <td className="px-4 py-3 text-center text-[var(--text-muted)]">{doc.size}</td>
                                        <td className="px-4 py-3 text-center text-[var(--text-muted)]">{doc.uploaded}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-1 justify-end">
                                                <button className="p-1.5 hover:bg-[var(--surface-active)] rounded" title="View">
                                                    <Eye size={14} className="text-[var(--text-muted)]" />
                                                </button>
                                                <button className="p-1.5 hover:bg-[var(--surface-active)] rounded" title="Download">
                                                    <Download size={14} className="text-[var(--text-muted)]" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
