import { useRef, useState, type ChangeEvent, type DragEvent, type FormEvent } from 'react';
import type { User } from 'firebase/auth';
import { FileText, Upload, X } from 'lucide-react';
import { formatFileSize } from '../lib/fileUtils';
import { uploadAssignment } from '../services/assignmentService';
import { VALIDATION_LIMITS } from '../types/assignment';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  onSuccess: () => void;
}

/**
 * Upload modal strictly accepting ONLY a title and a file, per user specification.
 */
export function UploadModal({ isOpen, onClose, user, onSuccess }: UploadModalProps) {
  const [title, setTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const resetAndClose = () => {
    if (isSubmitting) return;
    setTitle('');
    setFile(null);
    setError(null);
    setIsDragging(false);
    onClose();
  };

  const handleSelectFile = (selected: File | null) => {
    setError(null);
    if (!selected) return;

    if (selected.size <= 0) {
      setError('The selected file is empty.');
      return;
    }

    if (selected.size > VALIDATION_LIMITS.MAX_FILE_SIZE_BYTES) {
      setError(
        `File exceeds the ${formatFileSize(VALIDATION_LIMITS.MAX_FILE_SIZE_BYTES)} limit (${formatFileSize(selected.size)}).`,
      );
      return;
    }

    setFile(selected);
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    handleSelectFile(event.target.files?.[0] ?? null);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    handleSelectFile(event.dataTransfer.files?.[0] ?? null);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError('Please enter a title.');
      return;
    }
    if (!file) {
      setError('Please attach a file.');
      return;
    }

    setIsSubmitting(true);
    try {
      await uploadAssignment({
        title: trimmedTitle,
        file,
        user,
      });
      setTitle('');
      setFile(null);
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload assignment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="upload-modal-title"
    >
      <div className="w-full max-w-lg bg-white border border-slate-200/90 rounded-2xl shadow-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 id="upload-modal-title" className="font-display text-lg font-semibold text-slate-900">
            Upload assignment or project
          </h2>
          <button
            type="button"
            onClick={resetAndClose}
            disabled={isSubmitting}
            aria-label="Close upload dialog"
            className="p-2 -mr-2 text-slate-500 hover:text-slate-900 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Field 1: Title */}
          <div className="space-y-1.5">
            <label htmlFor="assignment-title" className="block text-sm font-medium text-slate-800">
              Title
            </label>
            <input
              id="assignment-title"
              type="text"
              required
              maxLength={VALIDATION_LIMITS.TITLE_MAX_LENGTH}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isSubmitting}
              placeholder="e.g., Biology Lab Report or History Essay"
              className="w-full px-3.5 py-2.5 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
            />
          </div>

          {/* Field 2: File */}
          <div className="space-y-1.5">
            <label htmlFor="assignment-file" className="block text-sm font-medium text-slate-800">
              File
            </label>

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={`border border-dashed rounded-lg p-6 text-center transition-colors ${
                isDragging
                  ? 'border-blue-600 bg-blue-50/50'
                  : 'border-slate-300 bg-slate-50/60 hover:border-slate-400'
              }`}
            >
              <input
                ref={fileInputRef}
                id="assignment-file"
                type="file"
                onChange={handleFileChange}
                disabled={isSubmitting}
                className="sr-only"
              />

              {file ? (
                <div className="flex items-center justify-between gap-3 text-left bg-white border border-slate-200 rounded-lg px-3.5 py-2.5">
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText className="w-5 h-5 text-blue-600 shrink-0" aria-hidden="true" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{file.name}</p>
                      <p className="text-xs font-mono tabular-nums text-slate-500">
                        {formatFileSize(file.size)}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    disabled={isSubmitting}
                    className="text-xs font-medium text-slate-600 hover:text-slate-900 px-2.5 py-1.5 rounded-md hover:bg-slate-100 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Change
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="w-6 h-6 text-slate-400 mx-auto" aria-hidden="true" />
                  <div className="text-sm text-slate-600">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="font-semibold text-blue-600 hover:text-blue-700 focus-visible:outline-2 focus-visible:outline-blue-600 rounded cursor-pointer"
                    >
                      Choose a file
                    </button>{' '}
                    <span>or drag and drop here</span>
                  </div>
                  <p className="text-xs text-slate-500">
                    PDF, documents, slides, images, or archives up to{' '}
                    {formatFileSize(VALIDATION_LIMITS.MAX_FILE_SIZE_BYTES)}
                  </p>
                </div>
              )}
            </div>
          </div>

          {error && (
            <div
              role="alert"
              className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700"
            >
              {error}
            </div>
          )}

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={resetAndClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl transition-colors whitespace-nowrap cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 active:scale-[0.98] disabled:opacity-60 rounded-xl transition-all duration-150 whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 cursor-pointer"
            >
              {isSubmitting ? 'Uploading...' : 'Upload'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
