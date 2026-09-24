import React from 'react';
import { Search, ArrowUpDown, ArrowDown, ArrowUp, X, Filter, Calendar, Award, Building2 } from 'lucide-react';

export type SortByOption = 'date' | 'score';
export type SortOrderOption = 'desc' | 'asc';

interface JobFilterBarProps {
  companyFilter: string;
  onCompanyFilterChange: (company: string) => void;
  sortBy: SortByOption;
  onSortByChange: (sort: SortByOption) => void;
  sortOrder: SortOrderOption;
  onSortOrderChange: (order: SortOrderOption) => void;
  totalJobs: number;
  filteredJobsCount: number;
  availableCompanies: string[];
  onResetFilters: () => void;
}

export function JobFilterBar({
  companyFilter,
  onCompanyFilterChange,
  sortBy,
  onSortByChange,
  sortOrder,
  onSortOrderChange,
  totalJobs,
  filteredJobsCount,
  availableCompanies,
  onResetFilters,
}: JobFilterBarProps) {
  const isFiltered = companyFilter.trim().length > 0;
  const toggleOrder = () => {
    onSortOrderChange(sortOrder === 'desc' ? 'asc' : 'desc');
  };

  return (
    <div className="bg-white border border-grid p-4 shadow-[3px_3px_0px_#141414] space-y-3 font-mono text-[11px]">
      {/* Top row: Filter & Sort Controls */}
      <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
        {/* Company Name Filter Input */}
        <div className="relative flex-1 max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none opacity-40">
            <Search size={13} />
          </div>
          <input
            type="text"
            value={companyFilter}
            onChange={(e) => onCompanyFilterChange(e.target.value)}
            placeholder="FILTER BY COMPANY NAME..."
            aria-label="Filter by company name"
            className="w-full pl-8 pr-8 py-2 border border-grid bg-bg/20 uppercase text-[11px] font-mono tracking-wider focus:outline-none focus:bg-white focus:ring-1 focus:ring-ink transition-colors placeholder:text-ink/40"
          />
          {companyFilter && (
            <button
              onClick={() => onCompanyFilterChange('')}
              title="Clear company filter"
              className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-ink/40 hover:text-ink transition-colors"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Sort Controls */}
        <div className="flex items-center flex-wrap gap-2">
          <div className="flex items-center gap-1.5 opacity-50 uppercase text-[10px] tracking-widest font-bold shrink-0">
            <ArrowUpDown size={11} />
            <span>Sort:</span>
          </div>

          {/* Sort By Toggle Buttons */}
          <div className="inline-flex border border-grid">
            <button
              onClick={() => onSortByChange('date')}
              className={`px-3 py-1.5 uppercase font-bold text-[10px] tracking-wider transition-colors flex items-center gap-1.5 ${
                sortBy === 'date'
                  ? 'bg-ink text-bg'
                  : 'bg-white text-ink hover:bg-accent/40'
              }`}
            >
              <Calendar size={11} />
              <span>Date Added</span>
            </button>
            <button
              onClick={() => onSortByChange('score')}
              className={`px-3 py-1.5 uppercase font-bold text-[10px] tracking-wider transition-colors border-l border-grid flex items-center gap-1.5 ${
                sortBy === 'score'
                  ? 'bg-ink text-bg'
                  : 'bg-white text-ink hover:bg-accent/40'
              }`}
            >
              <Award size={11} />
              <span>Match Score</span>
            </button>
          </div>

          {/* Direction toggle button */}
          <button
            onClick={toggleOrder}
            title={`Toggle sort order (current: ${sortOrder === 'desc' ? 'Descending' : 'Ascending'})`}
            className="px-3 py-1.5 border border-grid bg-white uppercase font-bold text-[10px] tracking-wider hover:bg-ink hover:text-bg transition-colors flex items-center gap-1.5"
          >
            {sortOrder === 'desc' ? (
              <>
                <ArrowDown size={11} className="text-blue-700" />
                <span>
                  {sortBy === 'date' ? 'Newest First' : 'Highest First'}
                </span>
              </>
            ) : (
              <>
                <ArrowUp size={11} className="text-blue-700" />
                <span>
                  {sortBy === 'date' ? 'Oldest First' : 'Lowest First'}
                </span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Bottom row: Counts, Active filters, and Quick Company suggestions */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-grid/20 text-[10px]">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="uppercase font-bold tracking-wider opacity-60">
            Results:
          </span>
          <span className="px-2 py-0.5 bg-ink/5 border border-grid/20 font-bold">
            {filteredJobsCount} / {totalJobs} {totalJobs === 1 ? 'JOB' : 'JOBS'}
          </span>

          {isFiltered && (
            <div className="flex items-center gap-1 bg-accent/40 border border-grid/30 px-2 py-0.5 font-bold">
              <Building2 size={10} className="opacity-50" />
              <span>COMPANY: "{companyFilter.trim().toUpperCase()}"</span>
              <button
                onClick={() => onCompanyFilterChange('')}
                className="ml-1 text-ink/60 hover:text-red-600 transition-colors"
              >
                <X size={10} />
              </button>
            </div>
          )}

          {isFiltered && (
            <button
              onClick={onResetFilters}
              className="text-red-700 underline uppercase tracking-widest font-bold hover:text-red-900 transition-colors ml-1"
            >
              Reset Filters
            </button>
          )}
        </div>

        {/* Quick company pills (first 5 unique companies) */}
        {availableCompanies.length > 0 && (
          <div className="hidden lg:flex items-center gap-1.5">
            <span className="opacity-40 uppercase text-[9px]">Top Companies:</span>
            <div className="flex items-center gap-1 flex-wrap">
              {availableCompanies.slice(0, 4).map((comp) => {
                const isActive = companyFilter.toLowerCase() === comp.toLowerCase();
                return (
                  <button
                    key={comp}
                    onClick={() => onCompanyFilterChange(isActive ? '' : comp)}
                    className={`px-1.5 py-0.5 border text-[9px] uppercase tracking-wider font-semibold transition-colors ${
                      isActive
                        ? 'bg-ink text-bg border-ink'
                        : 'border-grid/20 bg-bg/20 text-ink/70 hover:border-grid hover:text-ink'
                    }`}
                  >
                    {comp}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
