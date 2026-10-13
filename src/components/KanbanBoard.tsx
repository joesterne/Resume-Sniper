import React, { useState } from 'react';
import { 
  Download, 
  Trash2, 
  GripVertical, 
  Search, 
  X, 
  ExternalLink,
  ChevronDown,
  Sparkles,
  FileText,
  Clock,
  ArrowRight,
  Filter
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { DocumentVersion, ApplicationStage } from '../types';

export interface KanbanBoardProps {
  items: DocumentVersion[];
  onStatusChange: (id: string | number, newStatus: ApplicationStage) => Promise<void> | void;
  onDelete?: (id: string | number) => Promise<void> | void;
  isUpdating?: boolean;
}

export interface StageConfig {
  id: ApplicationStage;
  label: string;
  tag: string;
  dotColor: string;
  borderColor: string;
  headerBg: string;
  description: string;
  emptyHint: string;
}

export const APPLICATION_STAGES: StageConfig[] = [
  {
    id: 'draft',
    label: 'Drafted',
    tag: '00 // DRAFT',
    dotColor: 'bg-neutral-500',
    borderColor: 'border-neutral-300',
    headerBg: 'bg-neutral-100',
    description: 'Tailored applications awaiting final submission',
    emptyHint: 'No draft packages. Tailor a resume to save drafts here.'
  },
  {
    id: 'applied',
    label: 'Applied',
    tag: '01 // APPLIED',
    dotColor: 'bg-blue-600',
    borderColor: 'border-blue-300',
    headerBg: 'bg-blue-50/70',
    description: 'Submitted applications under review by recruiters',
    emptyHint: 'No applied positions yet. Drag drafts or apply to jobs.'
  },
  {
    id: 'interviewing',
    label: 'Interviewing',
    tag: '02 // INTERVIEWING',
    dotColor: 'bg-amber-600',
    borderColor: 'border-amber-300',
    headerBg: 'bg-amber-50/70',
    description: 'Phone screens, technical assessments, and finals',
    emptyHint: 'Drag cards here when interview rounds are scheduled.'
  },
  {
    id: 'offer',
    label: 'Offer',
    tag: '03 // OFFER',
    dotColor: 'bg-emerald-600',
    borderColor: 'border-emerald-300',
    headerBg: 'bg-emerald-50/70',
    description: 'Job offers received and negotiation phase',
    emptyHint: 'Drag here when you receive an offer!'
  },
  {
    id: 'rejected',
    label: 'Rejected',
    tag: '04 // REJECTED',
    dotColor: 'bg-rose-600',
    borderColor: 'border-rose-300',
    headerBg: 'bg-rose-50/70',
    description: 'Archived opportunities or closed requisitions',
    emptyHint: 'Drag closed or declined applications here.'
  }
];

export function normalizeApplicationStage(status?: string): ApplicationStage {
  if (!status) return 'draft';
  const s = status.toLowerCase().trim();
  if (s === 'applied' || s === 'submitted') return 'applied';
  if (s === 'interviewing' || s === 'interview' || s === 'screen') return 'interviewing';
  if (s === 'offer' || s === 'offered' || s === 'accepted') return 'offer';
  if (s === 'rejected' || s === 'declined' || s === 'closed') return 'rejected';
  if (s === 'draft' || s === 'drafted' || s === 'saved') return 'draft';
  return 'applied';
}

function formatDate(val: any): string {
  if (!val) return 'RECENT';
  try {
    if (typeof val === 'string') {
      const d = new Date(val);
      if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
    }
    if (typeof val === 'object') {
      const sec = val._seconds || val.seconds;
      if (typeof sec === 'number') {
        return new Date(sec * 1000).toISOString().split('T')[0];
      }
      if (typeof val.toDate === 'function') {
        return val.toDate().toISOString().split('T')[0];
      }
    }
    return String(val).slice(0, 10);
  } catch {
    return 'RECENT';
  }
}

export function KanbanBoard({ items, onStatusChange, onDelete, isUpdating }: KanbanBoardProps) {
  const [draggedId, setDraggedId] = useState<string | number | null>(null);
  const [dragOverStage, setDragOverStage] = useState<ApplicationStage | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCardId, setExpandedCardId] = useState<string | number | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | number | null>(null);

  // Filter items by search query
  const filteredItems = items.filter(item => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const company = (item.company || '').toLowerCase();
    const title = (item.title || '').toLowerCase();
    return company.includes(q) || title.includes(q);
  });

  // Group items by stage
  const stageMap: Record<ApplicationStage, DocumentVersion[]> = {
    draft: [],
    applied: [],
    interviewing: [],
    offer: [],
    rejected: []
  };

  filteredItems.forEach(item => {
    const stage = normalizeApplicationStage(item.status);
    if (stageMap[stage]) {
      stageMap[stage].push(item);
    } else {
      stageMap.applied.push(item);
    }
  });

  const handleDragStart = (e: React.DragEvent, item: DocumentVersion) => {
    e.dataTransfer.setData('text/plain', String(item.id));
    e.dataTransfer.effectAllowed = 'move';
    setDraggedId(item.id);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDragOverStage(null);
  };

  const handleDragOver = (e: React.DragEvent, stageId: ApplicationStage) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverStage !== stageId) {
      setDragOverStage(stageId);
    }
  };

  const handleDragLeave = (e: React.DragEvent, stageId: ApplicationStage) => {
    // Only clear if leaving the column element itself
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    if (dragOverStage === stageId) {
      setDragOverStage(null);
    }
  };

  const handleDrop = async (e: React.DragEvent, targetStage: ApplicationStage) => {
    e.preventDefault();
    setDragOverStage(null);
    const itemId = e.dataTransfer.getData('text/plain') || draggedId;
    setDraggedId(null);

    if (!itemId) return;

    const item = items.find(i => String(i.id) === String(itemId));
    if (!item) return;

    const currentStage = normalizeApplicationStage(item.status);
    if (currentStage === targetStage) return;

    if (targetStage === 'offer') {
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 }
      });
    }

    await onStatusChange(item.id, targetStage);
  };

  const handleManualMove = async (itemId: string | number, targetStage: ApplicationStage) => {
    if (targetStage === 'offer') {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    }
    await onStatusChange(itemId, targetStage);
  };

  // Metrics summary
  const totalCount = items.length;
  const activeCount = stageMap.applied.length + stageMap.interviewing.length;
  const offersCount = stageMap.offer.length;
  const interviewCount = stageMap.interviewing.length;

  return (
    <div className="space-y-6">
      {/* Search and Guidance Bar */}
      <div className="bg-bg border border-grid p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-40 text-ink" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="FILTER_BY_COMPANY_OR_TITLE..."
            className="w-full pl-9 pr-8 py-2 bg-white border border-grid text-xs font-mono text-ink placeholder:text-ink/40 focus:outline-none focus:ring-1 focus:ring-ink"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-ink/50 hover:text-ink transition-colors"
              title="Clear search"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Quick Drag & Drop Instruction Hint */}
        <div className="flex items-center gap-4 text-[10px] font-mono uppercase tracking-wider text-ink/70">
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 bg-ink rounded-full animate-pulse" />
            <span>Drag cards between columns to change application stage</span>
          </div>
          <div className="hidden lg:flex items-center gap-3 border-l border-grid pl-4 opacity-75">
            <span>Total: <strong className="font-mono tabular-nums">{totalCount}</strong></span>
            <span>Active: <strong className="font-mono tabular-nums">{activeCount}</strong></span>
            <span>Interviews: <strong className="font-mono tabular-nums text-amber-700">{interviewCount}</strong></span>
            <span>Offers: <strong className="font-mono tabular-nums text-emerald-700">{offersCount}</strong></span>
          </div>
        </div>
      </div>

      {/* Kanban Columns Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-start min-h-[600px]">
        {APPLICATION_STAGES.map((stage) => {
          const stageItems = stageMap[stage.id];
          const isOver = dragOverStage === stage.id;

          return (
            <div
              key={stage.id}
              onDragOver={(e) => handleDragOver(e, stage.id)}
              onDragLeave={(e) => handleDragLeave(e, stage.id)}
              onDrop={(e) => handleDrop(e, stage.id)}
              className={`flex flex-col border border-grid bg-main transition-all duration-200 min-h-[550px] shadow-[2px_2px_0px_#141414] ${
                isOver ? 'ring-2 ring-ink border-dashed bg-accent/40 scale-[1.01]' : ''
              }`}
            >
              {/* Column Header */}
              <div className={`p-3 border-b border-grid ${stage.headerBg} select-none`}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${stage.dotColor}`} />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-ink">
                      {stage.label}
                    </h3>
                  </div>
                  <span className="font-mono text-xs font-bold px-1.5 py-0.5 bg-ink text-bg tabular-nums">
                    {stageItems.length.toString().padStart(2, '0')}
                  </span>
                </div>
                <p className="text-[9px] font-mono opacity-50 uppercase tracking-tight line-clamp-1">
                  {stage.description}
                </p>
              </div>

              {/* Column Drop Zone / Card List */}
              <div className="flex-1 p-3 space-y-3 overflow-y-auto">
                {stageItems.map((item) => {
                  const isBeingDragged = draggedId === item.id;
                  const isExpanded = expandedCardId === item.id;
                  const isConfirmingDelete = deleteConfirmId === item.id;

                  return (
                    <div
                      key={item.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, item)}
                      onDragEnd={handleDragEnd}
                      className={`group bg-white border border-grid p-3.5 transition-all duration-150 cursor-grab active:cursor-grabbing hover:shadow-[3px_3px_0px_#141414] hover:-translate-y-0.5 ${
                        isBeingDragged ? 'opacity-40 scale-95 border-dashed' : 'opacity-100'
                      }`}
                    >
                      {/* Card Header: Drag Handle & Company */}
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-1.5 flex-1 min-w-0">
                          <GripVertical size={13} className="text-ink/30 shrink-0 group-hover:text-ink transition-colors" />
                          <h4 className="text-xs font-bold uppercase tracking-tight text-ink truncate" title={item.company}>
                            {item.company}
                          </h4>
                        </div>
                        <span className="text-[9px] font-mono opacity-50 shrink-0 tabular-nums">
                          {formatDate(item.created_at)}
                        </span>
                      </div>

                      {/* Job Title */}
                      <p className="text-[11px] font-mono text-ink/80 mb-3 line-clamp-2 leading-tight">
                        {item.title}
                      </p>

                      {/* Metadata Pill / Highlights if available */}
                      {item.metadata?.focusKeywords && Array.isArray(item.metadata.focusKeywords) && item.metadata.focusKeywords.length > 0 && (
                        <div className="mb-3 flex flex-wrap gap-1">
                          {item.metadata.focusKeywords.slice(0, 3).map((kw: string, i: number) => (
                            <span 
                              key={i} 
                              className="px-1.5 py-0.5 border border-grid/20 bg-bg text-[8px] font-mono uppercase tracking-tighter text-ink/70"
                            >
                              {kw}
                            </span>
                          ))}
                          {item.metadata.focusKeywords.length > 3 && (
                            <span className="text-[8px] font-mono opacity-50 self-center">
                              +{item.metadata.focusKeywords.length - 3}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Expandable Preview Details */}
                      {isExpanded && (
                        <div className="mt-2 mb-3 pt-2 border-t border-dashed border-grid/30 text-[10px] font-mono space-y-2 bg-main/50 p-2">
                          {item.metadata?.improvementNotes && (
                            <div>
                              <span className="font-bold opacity-70 block mb-0.5 text-[9px] uppercase">Tailoring Notes:</span>
                              <p className="text-ink/80 leading-relaxed text-[10px]">{item.metadata.improvementNotes}</p>
                            </div>
                          )}
                          {item.cover_letter_text && (
                            <div>
                              <span className="font-bold opacity-70 block mb-0.5 text-[9px] uppercase">Cover Letter Snippet:</span>
                              <p className="text-ink/70 line-clamp-3 text-[9px] italic">"{item.cover_letter_text.slice(0, 140)}..."</p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Quick Stage Mover (Select Dropdown for accessible/touch stage moving) */}
                      <div className="pt-2 border-t border-grid/20 flex items-center justify-between gap-1 text-[9px] font-mono">
                        <div className="flex items-center gap-1">
                          <span className="opacity-40 uppercase">Stage:</span>
                          <select
                            value={stage.id}
                            onChange={(e) => handleManualMove(item.id, e.target.value as ApplicationStage)}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-bg border border-grid/40 px-1 py-0.5 font-mono text-[9px] uppercase font-bold focus:outline-none cursor-pointer"
                          >
                            {APPLICATION_STAGES.map(s => (
                              <option key={s.id} value={s.id}>
                                {s.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-1">
                          {/* Details Toggle */}
                          {(item.metadata?.improvementNotes || item.cover_letter_text) && (
                            <button
                              onClick={() => setExpandedCardId(isExpanded ? null : item.id)}
                              className="p-1 text-ink/60 hover:text-ink hover:bg-bg transition-colors"
                              title={isExpanded ? "Collapse notes" : "View notes"}
                            >
                              <FileText size={12} />
                            </button>
                          )}

                          {/* PDF Download */}
                          <a
                            href={`/api/documents/${item.id}/pdf`}
                            download
                            className="p-1 text-ink hover:bg-ink hover:text-bg transition-colors border border-grid"
                            title="Download tailored resume PDF"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Download size={11} />
                          </a>

                          {/* Delete Application */}
                          {onDelete && (
                            <>
                              {isConfirmingDelete ? (
                                <div className="flex items-center gap-1 bg-rose-50 border border-rose-300 px-1 py-0.5">
                                  <button
                                    onClick={() => onDelete(item.id)}
                                    className="text-[8px] font-bold text-rose-700 hover:underline uppercase"
                                  >
                                    Confirm
                                  </button>
                                  <button
                                    onClick={() => setDeleteConfirmId(null)}
                                    className="text-[8px] text-ink/50 hover:text-ink"
                                  >
                                    <X size={10} />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setDeleteConfirmId(item.id)}
                                  className="p-1 text-ink/40 hover:text-rose-600 transition-colors"
                                  title="Delete from history"
                                >
                                  <Trash2 size={11} />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Drag Placeholder when hovering over column */}
                {isOver && (
                  <div className="p-3 border-2 border-dashed border-ink bg-bg text-center font-mono text-[10px] uppercase font-bold text-ink animate-pulse">
                    Drop to move to {stage.label}
                  </div>
                )}

                {/* Empty State */}
                {stageItems.length === 0 && !isOver && (
                  <div className="p-6 border border-dashed border-grid/30 bg-bg/20 text-center font-mono text-[10px] text-ink/50 flex flex-col items-center justify-center space-y-2 h-36">
                    <p className="leading-relaxed opacity-75">{stage.emptyHint}</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
