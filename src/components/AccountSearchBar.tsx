import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import type { Assignment, PublicAccount } from '../types/assignment';
import { UserAvatar } from './UserAvatar';

export interface AccountOption {
  uid: string;
  displayName: string;
  photoURL?: string;
  uploadCount: number;
}

interface AccountSearchBarProps {
  accounts: PublicAccount[];
  assignments: Assignment[];
  selectedAccountId: string | null;
  onSelectAccount: (account: AccountOption) => void;
  onClearAccount: () => void;
}

/**
 * Header search bar allowing users to search accounts by display name and
 * navigate directly to an account's shared assignments and projects.
 */
export function AccountSearchBar({
  accounts,
  assignments,
  selectedAccountId,
  onSelectAccount,
  onClearAccount,
}: AccountSearchBarProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Build unified directory merging publicAccounts with any assignment authors
  const directory = useMemo<AccountOption[]>(() => {
    const countsByUid = new Map<string, number>();
    const authorNamesByUid = new Map<string, string>();

    for (const item of assignments) {
      countsByUid.set(item.authorId, (countsByUid.get(item.authorId) ?? 0) + 1);
      if (!authorNamesByUid.has(item.authorId)) {
        authorNamesByUid.set(item.authorId, item.authorName);
      }
    }

    const merged = new Map<string, AccountOption>();

    for (const account of accounts) {
      merged.set(account.uid, {
        uid: account.uid,
        displayName: account.displayName,
        photoURL: account.photoURL,
        uploadCount: countsByUid.get(account.uid) ?? 0,
      });
    }

    for (const [uid, authorName] of authorNamesByUid.entries()) {
      if (!merged.has(uid)) {
        merged.set(uid, {
          uid,
          displayName: authorName,
          uploadCount: countsByUid.get(uid) ?? 0,
        });
      }
    }

    return Array.from(merged.values()).sort((a, b) =>
      a.displayName.localeCompare(b.displayName),
    );
  }, [accounts, assignments]);

  const filteredAccounts = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return directory.slice(0, 6);
    return directory.filter((acc) => acc.displayName.toLowerCase().includes(q));
  }, [directory, query]);

  // Close dropdown on outside click or Escape key
  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handlePick = (account: AccountOption) => {
    setQuery(account.displayName);
    setIsOpen(false);
    onSelectAccount(account);
  };

  const handleClear = () => {
    setQuery('');
    setIsOpen(false);
    if (selectedAccountId) {
      onClearAccount();
    }
  };

  return (
    <div ref={containerRef} className="relative w-full sm:w-64 md:w-72">
      <Search
        className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
        aria-hidden="true"
      />
      <input
        type="text"
        value={query}
        onFocus={() => setIsOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value);
          setIsOpen(true);
        }}
        placeholder="Search account..."
        aria-label="Search account"
        aria-expanded={isOpen}
        role="combobox"
        aria-controls="account-search-results"
        className="w-full pl-9 pr-8 py-2 text-sm text-slate-900 bg-slate-50/90 hover:bg-white focus:bg-white border border-slate-200 rounded-lg placeholder:text-slate-400 transition-colors focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
      />
      {(query || selectedAccountId) && (
        <button
          type="button"
          onClick={handleClear}
          aria-label="Clear account search"
          className="p-1 text-slate-400 hover:text-slate-700 absolute right-2 top-1/2 -translate-y-1/2 rounded cursor-pointer"
        >
          <X className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      )}

      {isOpen && (
        <div
          id="account-search-results"
          role="listbox"
          className="absolute left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden z-40"
        >
          <div className="px-3 py-2 border-b border-slate-100 bg-slate-50/70">
            <span className="text-xs font-medium text-slate-500">
              {query.trim() ? 'Matching accounts' : 'Accounts'}
            </span>
          </div>

          {filteredAccounts.length === 0 ? (
            <div className="px-4 py-4 text-sm text-slate-500 text-center">
              No matching accounts found.
            </div>
          ) : (
            <ul className="max-h-64 overflow-y-auto divide-y divide-slate-100">
              {filteredAccounts.map((account) => {
                const isSelected = account.uid === selectedAccountId;
                return (
                  <li key={account.uid}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => handlePick(account)}
                      className={`w-full px-3.5 py-2.5 flex items-center justify-between gap-3 text-left transition-colors cursor-pointer ${
                        isSelected ? 'bg-blue-50/70' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <UserAvatar
                          name={account.displayName}
                          photoURL={account.photoURL}
                          size="xs"
                        />
                        <span className="text-sm font-medium text-slate-900 truncate">
                          {account.displayName}
                        </span>
                      </div>
                      <span className="text-xs font-mono tabular-nums text-slate-500 whitespace-nowrap shrink-0">
                        {account.uploadCount}{' '}
                        {account.uploadCount === 1 ? 'upload' : 'uploads'}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
