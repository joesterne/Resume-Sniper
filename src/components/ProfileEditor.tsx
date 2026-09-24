import React, { useState } from 'react';
import { Plus, Trash2, Save, X } from 'lucide-react';
import { ParsedResume } from '../types';

interface ProfileEditorProps {
  initialData: ParsedResume;
  onSave: (data: ParsedResume) => Promise<void>;
  onCancel: () => void;
}

export function ProfileEditor({ initialData, onSave, onCancel }: ProfileEditorProps) {
  const [formData, setFormData] = useState<ParsedResume>(initialData);
  const [isSaving, setIsSaving] = useState(false);

  const handleAddField = (category: 'skills' | 'experience' | 'education') => {
    const newData = { ...formData };
    if (category === 'skills') newData.skills.push('');
    else if (category === 'experience') {
      newData.experience.push({ title: '', company: '', date: '', bullets: [''] });
    } else if (category === 'education') {
      newData.education.push({ degree: '', school: '', year: '' });
    }
    setFormData(newData);
  };

  const handleRemoveField = (category: 'skills' | 'experience' | 'education', index: number) => {
    const newData = { ...formData };
    if (category === 'skills') newData.skills.splice(index, 1);
    else if (category === 'experience') newData.experience.splice(index, 1);
    else if (category === 'education') newData.education.splice(index, 1);
    setFormData(newData);
  };

  const handleExperienceBulletAction = (expIdx: number, type: 'add' | 'remove', bulletIdx?: number) => {
    const newData = { ...formData };
    const exp = newData.experience[expIdx];
    if (type === 'add') exp.bullets.push('');
    else if (type === 'remove' && bulletIdx !== undefined) exp.bullets.splice(bulletIdx, 1);
    setFormData(newData);
  };

  return (
    <div className="bg-white border border-grid p-8 shadow-[4px_4px_0px_#141414] font-mono text-[11px]">
      <div className="flex justify-between items-center mb-8 border-b border-grid pb-4">
        <h3 className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
          <div className="w-2 h-2 bg-blue-600" />
          Edit Identity Matrix
        </h3>
        <div className="flex gap-4">
          <button 
            onClick={onCancel}
            className="text-[10px] uppercase font-bold text-ink/40 hover:text-ink transition-colors"
          >
            Cancel_Abort
          </button>
          <button 
            onClick={async () => {
              setIsSaving(true);
              await onSave(formData);
              setIsSaving(false);
            }}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-1 bg-ink text-bg uppercase font-bold tracking-widest text-[10px] hover:opacity-90 disabled:opacity-50"
          >
            <Save size={12} />
            {isSaving ? "Syncing..." : "Sync_Changes"}
          </button>
        </div>
      </div>

      <div className="space-y-12">
        {/* Personal Info */}
        <section className="grid grid-cols-2 gap-8">
          <div className="space-y-4">
            <label className="block">
              <span className="text-[10px] uppercase font-bold opacity-40">System_Name</span>
              <input 
                value={formData.name} 
                onChange={e => setFormData({...formData, name: e.target.value})}
                className="w-full bg-accent/20 border-b border-grid p-2 focus:bg-white outline-none" 
              />
            </label>
            <label className="block">
              <span className="text-[10px] uppercase font-bold opacity-40">Contact_Email</span>
              <input 
                value={formData.contact.email} 
                onChange={e => setFormData({...formData, contact: {...formData.contact, email: e.target.value}})}
                className="w-full bg-accent/20 border-b border-grid p-2 focus:bg-white outline-none" 
              />
            </label>
          </div>
          <div className="space-y-4">
            <label className="block">
              <span className="text-[10px] uppercase font-bold opacity-40">Contact_Phone</span>
              <input 
                value={formData.contact.phone} 
                onChange={e => setFormData({...formData, contact: {...formData.contact, phone: e.target.value}})}
                className="w-full bg-accent/20 border-b border-grid p-2 focus:bg-white outline-none" 
              />
            </label>
            <label className="block">
              <span className="text-[10px] uppercase font-bold opacity-40">Profile_LinkedIn</span>
              <input 
                value={formData.contact.linkedin || ''} 
                onChange={e => setFormData({...formData, contact: {...formData.contact, linkedin: e.target.value}})}
                className="w-full bg-accent/20 border-b border-grid p-2 focus:bg-white outline-none" 
              />
            </label>
          </div>
        </section>

        {/* Skills */}
        <section>
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-[10px] uppercase tracking-widest font-bold bg-bg px-2 py-1 border-l-2 border-ink inline-block">Skill_Nodes</h4>
            <button onClick={() => handleAddField('skills')} className="text-ink/40 hover:text-ink"><Plus size={14} /></button>
          </div>
          <div className="flex flex-wrap gap-2">
            {formData.skills.map((skill, idx) => (
              <div key={idx} className="flex border border-grid overflow-hidden">
                <input 
                  value={skill}
                  onChange={e => {
                    const newSkills = [...formData.skills];
                    newSkills[idx] = e.target.value;
                    setFormData({...formData, skills: newSkills});
                  }}
                  className="bg-accent/10 px-2 py-1 text-[9px] font-bold uppercase outline-none focus:bg-white w-24"
                />
                <button onClick={() => handleRemoveField('skills', idx)} className="px-1 border-l border-grid hover:bg-red-50 text-red-700 opacity-60 hover:opacity-100">
                  <X size={10} />
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Experience */}
        <section>
          <div className="flex justify-between items-center mb-6">
            <h4 className="text-[10px] uppercase tracking-widest font-bold bg-bg px-2 py-1 border-l-2 border-ink inline-block">Operation_Logs [Experience]</h4>
            <button onClick={() => handleAddField('experience')} className="flex items-center gap-2 text-[10px] uppercase font-bold border border-grid px-3 py-1 hover:bg-accent/40">
              <Plus size={12} /> Add_Log
            </button>
          </div>
          <div className="space-y-12">
            {formData.experience.map((exp, expIdx) => (
              <div key={expIdx} className="relative pl-6 border-l-2 border-grid pb-2">
                <button 
                  onClick={() => handleRemoveField('experience', expIdx)}
                  className="absolute -left-[14px] top-0 bg-white border border-grid p-1 text-red-700 hover:bg-red-50"
                >
                  <Trash2 size={10} />
                </button>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <input 
                    placeholder="TITLE"
                    value={exp.title}
                    onChange={e => {
                      const newExp = [...formData.experience];
                      newExp[expIdx].title = e.target.value;
                      setFormData({...formData, experience: newExp});
                    }}
                    className="col-span-1 bg-accent/10 border-b border-grid p-1 font-bold uppercase outline-none focus:bg-white"
                  />
                  <input 
                    placeholder="COMPANY"
                    value={exp.company}
                    onChange={e => {
                      const newExp = [...formData.experience];
                      newExp[expIdx].company = e.target.value;
                      setFormData({...formData, experience: newExp});
                    }}
                    className="col-span-1 bg-accent/10 border-b border-grid p-1 italic outline-none focus:bg-white"
                  />
                  <input 
                    placeholder="DATE_RANGE"
                    value={exp.date}
                    onChange={e => {
                      const newExp = [...formData.experience];
                      newExp[expIdx].date = e.target.value;
                      setFormData({...formData, experience: newExp});
                    }}
                    className="col-span-1 bg-accent/10 border-b border-grid p-1 text-right opacity-60 outline-none focus:bg-white"
                  />
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-[8px] uppercase font-bold opacity-30 mb-1">
                    <span>Task_Enumerations</span>
                    <button onClick={() => handleExperienceBulletAction(expIdx, 'add')}><Plus size={10} /></button>
                  </div>
                  {exp.bullets.map((bullet, bIdx) => (
                    <div key={bIdx} className="flex items-start gap-2 group">
                      <div className="mt-1.5 w-1.5 h-1.5 bg-ink/20" />
                      <textarea 
                        value={bullet}
                        onChange={e => {
                          const newExp = [...formData.experience];
                          newExp[expIdx].bullets[bIdx] = e.target.value;
                          setFormData({...formData, experience: newExp});
                        }}
                        rows={1}
                        className="flex-1 bg-transparent border-b border-transparent hover:border-grid/20 focus:border-grid p-1 focus:bg-accent/5 outline-none resize-none leading-relaxed opacity-80"
                      />
                      <button 
                        onClick={() => handleExperienceBulletAction(expIdx, 'remove', bIdx)}
                        className="hidden group-hover:block text-red-700 opacity-40 hover:opacity-100"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Education */}
        <section>
          <div className="flex justify-between items-center mb-6">
            <h4 className="text-[10px] uppercase tracking-widest font-bold bg-bg px-2 py-1 border-l-2 border-ink inline-block">Certification_Records</h4>
            <button onClick={() => handleAddField('education')} className="text-ink/40 hover:text-ink"><Plus size={14} /></button>
          </div>
          <div className="grid grid-cols-2 gap-8">
            {formData.education.map((edu, idx) => (
              <div key={idx} className="p-4 border border-grid bg-accent/5 relative group">
                <button 
                  onClick={() => handleRemoveField('education', idx)}
                  className="absolute top-2 right-2 hidden group-hover:block text-red-700 opacity-40 hover:opacity-100"
                >
                  <Trash2 size={12} />
                </button>
                <input 
                  placeholder="DEGREE"
                  value={edu.degree}
                  onChange={e => {
                    const newEdu = [...formData.education];
                    newEdu[idx].degree = e.target.value;
                    setFormData({...formData, education: newEdu});
                  }}
                  className="w-full bg-transparent border-b border-grid/20 font-bold mb-2 outline-none focus:bg-white px-1"
                />
                <input 
                  placeholder="SCHOOL"
                  value={edu.school}
                  onChange={e => {
                    const newEdu = [...formData.education];
                    newEdu[idx].school = e.target.value;
                    setFormData({...formData, education: newEdu});
                  }}
                  className="w-full bg-transparent border-b border-grid/20 mb-2 underline outline-none focus:bg-white px-1"
                />
                <input 
                   placeholder="YEAR"
                   value={edu.year}
                   onChange={e => {
                     const newEdu = [...formData.education];
                     newEdu[idx].year = e.target.value;
                     setFormData({...formData, education: newEdu});
                   }}
                   className="w-full bg-transparent opacity-60 outline-none focus:bg-white px-1"
                />
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
