import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Briefcase, Loader2, AlertCircle, CheckCircle2, Send } from 'lucide-react';
import { Job, TailoredResult } from '../types';

interface TailoringModalProps {
  job: Job | null;
  result: TailoredResult | null;
  isLoading: boolean;
  onClose: () => void;
  onSave: (doc: { resume: string, coverLetter: string }) => void;
  onSubmit: (doc: { resume: string, coverLetter: string }) => void;
}

export function TailoringModal({ job, result, isLoading, onClose, onSave, onSubmit }: TailoringModalProps) {
  const [editedResume, setEditedResume] = React.useState('');
  const [editedCoverLetter, setEditedCoverLetter] = React.useState('');

  React.useEffect(() => {
    if (result) {
      setEditedResume(result.tailoredResume);
      setEditedCoverLetter(result.coverLetter);
    }
  }, [result]);

  return (
    <AnimatePresence>
      {job && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-bg flex flex-col"
        >
          <header className="px-12 py-6 border-b border-grid flex justify-between items-center bg-bg shrink-0">
            <div>
              <h3 className="text-xl font-bold uppercase tracking-tighter">Application Tailoring</h3>
              <div className="flex items-center gap-2 text-xs font-mono opacity-60">
                  <Briefcase size={12} />
                  <span>ID_{job.id} // {job.title.toUpperCase()} @ {job.company.toUpperCase()}</span>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="text-[10px] font-bold uppercase tracking-widest border border-grid px-4 py-2 hover:bg-ink hover:text-bg transition-colors"
            >
              Abort Tailoring
            </button>
          </header>

          <div className="flex-1 overflow-hidden flex bg-main">
            <div className="w-1/4 border-r border-grid p-8 overflow-y-auto bg-accent/20">
              <h4 className="text-[10px] uppercase tracking-widest font-bold mb-6 bg-ink text-bg px-2 py-0.5 inline-block">Ref_Job Description</h4>
              <div className="text-[11px] font-mono text-ink/80 whitespace-pre-wrap leading-relaxed selection:bg-ink selection:text-bg">{job.description}</div>
            </div>
            
            <div className="flex-1 p-8 overflow-y-auto flex flex-col space-y-8">
              {!result ? (
                <div className="flex-1 flex flex-col items-center justify-center space-y-6">
                  <Loader2 className="animate-spin text-ink" size={32} />
                  <div className="text-center">
                      <p className="text-[11px] uppercase font-bold tracking-widest animate-pulse">Running tailoring engine...</p>
                      <p className="text-[10px] font-mono opacity-40 mt-2">{" "}&gt; Committing diff to memory</p>
                      <p className="text-[10px] font-mono opacity-40">&gt; Generative AI Constructing Cover Letter</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-8 flex-1">
                  <section className="flex flex-col h-full">
                    <h4 className="text-[10px] uppercase tracking-widest font-bold mb-4 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full" />
                        <span>Res_v4.2_Tailored.md</span>
                      </div>
                      <span className="opacity-40 font-mono">[EDITABLE_STREAM]</span>
                    </h4>
                    <textarea
                      value={editedResume}
                      onChange={(e) => setEditedResume(e.target.value)}
                      className="flex-1 p-6 border border-grid bg-white shadow-[4px_4px_0px_#141414] font-mono text-[11px] leading-relaxed resize-none focus:outline-none focus:ring-1 focus:ring-ink/20"
                    />
                  </section>
                  
                  <section className="flex flex-col h-full">
                    <h4 className="text-[10px] uppercase tracking-widest font-bold mb-4 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full" />
                        <span>CL_v1_Tailored.md</span>
                      </div>
                      <span className="opacity-40 font-mono">[EDITABLE_STREAM]</span>
                    </h4>
                    <textarea
                      value={editedCoverLetter}
                      onChange={(e) => setEditedCoverLetter(e.target.value)}
                      className="flex-1 p-6 border border-grid bg-[#F9F8F6] shadow-[4px_4px_0px_#141414] text-[11px] font-serif-italic leading-relaxed resize-none focus:outline-none focus:ring-1 focus:ring-ink/20 opacity-90"
                    />
                  </section>
                </div>
              )}

              {result?.metadata && (
                <section className="p-4 border border-grid bg-accent/30 font-mono">
                  <h4 className="text-[10px] uppercase tracking-widest font-bold mb-2 opacity-100 flex items-center gap-2">
                      <AlertCircle size={10} />
                      <span>AI Optimization Report</span>
                  </h4>
                  <p className="text-[10px] leading-relaxed mb-3 opacity-80">{result.metadata.improvementNotes}</p>
                  <div className="flex flex-wrap gap-1">
                    {result.metadata.focusKeywords?.map((k: string) => (
                      <span key={k} className="px-2 py-0.5 bg-ink text-bg text-[8px] font-bold uppercase">{k}</span>
                    ))}
                  </div>
                </section>
              )}
            </div>
          </div>

          <footer className="p-6 border-t border-grid bg-bg flex justify-between items-center shrink-0">
             <div className="text-[9px] font-mono opacity-40 uppercase tracking-widest">
                STATUS: WAITING_FOR_OPERATOR_COMMIT
             </div>
             <div className="flex gap-4">
                <button 
                  disabled={!result || isLoading}
                  onClick={() => onSave({ resume: editedResume, coverLetter: editedCoverLetter })}
                  className="flex items-center space-x-2 px-6 py-3 border border-grid text-ink text-[10px] uppercase font-bold hover:bg-black/5 active:scale-[0.98] transition-all disabled:opacity-20"
                >
                  <CheckCircle2 size={14} />
                  <span>Save Draft</span>
                </button>
                <button 
                  disabled={!result || isLoading}
                  onClick={() => onSubmit({ resume: editedResume, coverLetter: editedCoverLetter })}
                  className="flex items-center space-x-2 px-8 py-3 bg-ink text-bg text-[10px] uppercase font-bold hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-20"
                >
                  <Send size={14} />
                  <span>Submit Application</span>
                </button>
             </div>
          </footer>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
