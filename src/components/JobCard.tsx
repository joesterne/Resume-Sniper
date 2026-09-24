import React, { useState } from 'react';
import { ExternalLink, ChevronRight, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Job } from '../types';

interface JobCardProps {
  key?: React.Key;
  job: Job;
  userSkills?: string[];
  onApply: () => void | Promise<void>;
  onDelete?: () => void | Promise<void>;
}

function HighlightedDescription({ text, keywords }: { text: string, keywords?: string[] }) {
  if (!text) return null;
  
  if (!keywords || keywords.length === 0) {
    return <div className="text-[12px] leading-relaxed opacity-70 whitespace-pre-wrap font-sans max-h-60 overflow-y-auto pr-4 scrollbar-thin">{text}</div>;
  }

  // Filter out tiny generic words, map to lowercase, escape regex characters
  const validKeywords = keywords
    .filter(k => k.trim().length > 2)
    .sort((a, b) => b.length - a.length) // Sort longest first to avoid partial matches
    .map(k => k.trim().replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&'));

  if (validKeywords.length === 0) {
    return <div className="text-[12px] leading-relaxed opacity-70 whitespace-pre-wrap font-sans max-h-60 overflow-y-auto pr-4 scrollbar-thin">{text}</div>;
  }

  const regex = new RegExp(`\\b(${validKeywords.join('|')})\\b`, 'gi');
  
  const paragraphs = text.split('\n');

  return (
    <div className="text-[12px] leading-relaxed text-ink/80 font-sans max-h-60 overflow-y-auto pr-4 scrollbar-thin space-y-3">
      {paragraphs.map((p, pIndex) => {
        if (!p.trim()) return null;
        
        const isListItem = p.trim().startsWith('- ') || p.trim().startsWith('• ') || p.trim().startsWith('* ');
        const content = p.replace(/^[-•*]\s*/, '');
        
        const parts = content.split(regex);
        
        const formattedContent = parts.map((part, i) => {
          // If regex matched, it will be at odd indices because of capture groups
          const isMatch = validKeywords.some(k => new RegExp(`^${k}$`, 'i').test(part));
          return isMatch ? (
            <mark key={i} className="bg-yellow-200 text-yellow-900 font-bold px-1 rounded-sm">{part}</mark>
          ) : (
            <span key={i}>{part}</span>
          );
        });

        if (isListItem) {
          return (
            <div key={pIndex} className="flex gap-2">
              <span className="text-ink/40 mt-0.5">•</span>
              <div>{formattedContent}</div>
            </div>
          );
        }

        return <p key={pIndex} className="opacity-90">{formattedContent}</p>;
      })}
    </div>
  );
}

function formatJobDate(dateVal?: any): string | null {
  if (!dateVal) return null;
  try {
    let date: Date;
    if (typeof dateVal === 'object') {
      const sec = dateVal._seconds || dateVal.seconds;
      if (typeof sec === 'number') {
        date = new Date(sec * 1000);
      } else if (typeof dateVal.toDate === 'function') {
        date = dateVal.toDate();
      } else {
        return null;
      }
    } else if (typeof dateVal === 'number') {
      date = new Date(dateVal);
    } else {
      date = new Date(dateVal);
    }
    if (isNaN(date.getTime())) return null;
    return date.toISOString().split('T')[0];
  } catch {
    return null;
  }
}

export function JobCard({ job, userSkills, onApply, onDelete }: JobCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const formattedDate = formatJobDate(job.created_at);

  return (
    <div 
      className={`bg-white border-b border-grid p-6 row-hover relative overflow-hidden transition-all duration-300 ${isExpanded ? 'bg-accent/10 shadow-inner' : ''}`}
    >
      <div 
        className="flex items-start gap-8 font-mono text-[11px] cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="w-16 shrink-0 text-center border-r border-grid pr-4">
          {job.score !== undefined ? (
            <>
              <div className={`text-xl font-bold leading-none ${job.score > 90 ? 'text-green-600' : 'text-orange-600'}`}>
                  {job.score}
              </div>
              <div className="text-[8px] uppercase font-bold opacity-40 mt-1">Match</div>
            </>
          ) : (
            <div className="text-[10px] opacity-20 italic">WAITING</div>
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-3 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-widest px-1 bg-ink/5 border border-grid/10">{job.source}</span>
            {job.is_remote && (
              <span className="text-green-600 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1">
                <div className="w-1 h-1 bg-green-600" /> Remote
              </span>
            )}
            {formattedDate && (
              <span className="text-[9px] uppercase tracking-wider opacity-40 font-mono">
                Added: {formattedDate}
              </span>
            )}
            <div className="ml-auto text-ink/30 transition-transform duration-300" style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0)' }}>
              <ChevronRight size={14} />
            </div>
          </div>
          <h3 className="text-sm font-bold uppercase tracking-tight truncate">{job.title}</h3>
          <p className="text-[10px] font-serif-italic mb-3 opacity-60">{job.company}</p>
          
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="overflow-hidden"
              >
                <div className="pt-4 pb-6 space-y-6">
                  {job.reasoning && (
                     <div className="text-[10px] leading-relaxed opacity-80 bg-accent/20 p-3 border-l-2 border-grid italic">
                       <div className="text-[8px] uppercase font-bold opacity-40 mb-1 not-italic">AI Analyst Reasoning:</div>
                       "{job.reasoning}"
                     </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    {job.matchedSkills && job.matchedSkills.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-[8px] uppercase font-bold text-green-700">Strong Alignment:</div>
                        <div className="flex flex-wrap gap-1">
                          {job.matchedSkills.map(s => (
                            <span key={s} className="px-1.5 py-0.5 bg-green-100 text-green-800 text-[8px] font-bold uppercase border border-green-200">{s}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {job.missingSkills && job.missingSkills.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-[8px] uppercase font-bold text-red-700">Skill Gaps:</div>
                        <div className="flex flex-wrap gap-1">
                          {job.missingSkills.map(s => (
                            <span key={s} className="px-1.5 py-0.5 bg-red-100 text-red-800 text-[8px] font-bold uppercase border border-red-200">{s}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="text-[8px] uppercase font-bold opacity-40">Job Specification:</div>
                    <div className="bg-accent/5 p-4 rounded-sm border border-grid/10">
                      <HighlightedDescription 
                        text={job.description} 
                        keywords={[
                          ...(userSkills || []), 
                          ...(job.matchedSkills || [])
                        ]} 
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex items-center space-x-4 mt-2">
            <button 
              onClick={(e) => { e.stopPropagation(); onApply(); }}
              className="border border-current px-4 py-1 font-bold uppercase tracking-widest hover:bg-current hover:text-white transition-all text-[9px]"
            >
              Tailor Application
            </button>
            <a 
              href={job.url} 
              target="_blank" 
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center space-x-1 opacity-40 hover:opacity-100 transition-opacity"
            >
              <span className="uppercase tracking-widest text-[9px] font-bold">Inspect Source</span>
              <ExternalLink size={10} />
            </a>
            
            {onDelete && (
              <div className="ml-auto flex items-center">
                {showConfirmDelete ? (
                  <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
                    <span className="text-[9px] uppercase font-bold text-red-600">Delete?</span>
                    <button 
                      onClick={(e) => { e.stopPropagation(); onDelete(); }} 
                      className="border border-red-600 text-red-600 px-3 py-1 font-bold uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all text-[9px]"
                    >
                      Yes
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setShowConfirmDelete(false); }} 
                      className="border border-grid px-3 py-1 font-bold uppercase tracking-widest hover:bg-ink hover:text-bg transition-all text-[9px]"
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={(e) => { e.stopPropagation(); setShowConfirmDelete(true); }}
                    className="flex items-center space-x-1 opacity-20 hover:text-red-600 hover:opacity-100 transition-colors ml-4"
                    title="Remove Job"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
