/**
 * Visual Analysis Upload - Drag-and-drop diagram analysis with Nova Pro
 */
import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Upload, Image, X, CheckCircle2, AlertCircle, Loader2, Eye } from 'lucide-react';

interface VisualAnalysisUploadProps {
  onUpload: (file: File) => Promise<void>;
  analysisResult?: any;
  loading?: boolean;
}

const VisualAnalysisUpload: React.FC<VisualAnalysisUploadProps> = ({
  onUpload, analysisResult, loading = false,
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === 'dragenter' || e.type === 'dragover');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
  };

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) { alert('Please upload an image file'); return; }
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-card overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-900">Visual Architecture Analysis</h3>
          <p className="text-xs text-slate-500 mt-0.5">Upload a diagram to detect security misconfigurations</p>
        </div>
        <span className="px-2.5 py-1 bg-blue-50 text-blue-700 text-[10px] font-bold rounded-full border border-blue-200">
          Nova Pro
        </span>
      </div>

      <div className="p-6">
        {!selectedFile && !analysisResult && (
          <div
            className={`border-2 border-dashed rounded-xl p-10 text-center transition-all ${
              dragActive ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 bg-slate-50'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input ref={fileInputRef} type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} className="hidden" />
            <Upload className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-700 mb-1">Drop a diagram here</p>
            <p className="text-xs text-slate-400 mb-4">or</p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="btn-nova px-5 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold"
            >
              Browse Files
            </button>
            <p className="text-[10px] text-slate-400 mt-3">PNG, JPG, WebP supported</p>
          </div>
        )}

        {selectedFile && !analysisResult && (
          <div className="space-y-4">
            {preview && (
              <div className="relative rounded-xl overflow-hidden border border-slate-200">
                <img src={preview} alt="Preview" className="w-full h-auto max-h-80 object-contain bg-slate-50" />
                <button onClick={() => { setSelectedFile(null); setPreview(null); }} className="absolute top-2 right-2 p-1.5 bg-white rounded-full shadow-lg hover:bg-slate-50">
                  <X className="w-4 h-4 text-slate-600" />
                </button>
              </div>
            )}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Image className="w-4 h-4" />
                <span>{selectedFile.name}</span>
                <span className="text-slate-400">({(selectedFile.size / 1024).toFixed(1)} KB)</span>
              </div>
              <button
                onClick={() => selectedFile && onUpload(selectedFile)}
                disabled={loading}
                className="btn-nova px-5 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold disabled:opacity-50 flex items-center gap-2"
              >
                {loading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Analyzing...</> : <><Eye className="w-3.5 h-3.5" /> Analyze</>}
              </button>
            </div>
          </div>
        )}

        {analysisResult && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-bold text-emerald-700">
                Analysis complete • {analysisResult.model_used || 'Nova Pro'}
              </span>
            </div>

            {analysisResult.analysis && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4 max-h-96 overflow-y-auto">
                {typeof analysisResult.analysis === 'string' ? (
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{analysisResult.analysis}</p>
                ) : (
                  <>
                    {analysisResult.analysis.summary && (
                      <div>
                        <h5 className="text-xs font-bold text-slate-900 mb-1">Summary</h5>
                        <p className="text-xs text-slate-600">{analysisResult.analysis.summary}</p>
                      </div>
                    )}
                    {analysisResult.analysis.security_findings && (
                      <div>
                        <h5 className="text-xs font-bold text-slate-900 mb-2 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 text-red-500" /> Security Findings
                        </h5>
                        <ul className="space-y-1.5">
                          {(Array.isArray(analysisResult.analysis.security_findings)
                            ? analysisResult.analysis.security_findings
                            : Object.values(analysisResult.analysis.security_findings)
                          ).map((finding: any, i: number) => (
                            <li key={i} className="text-xs text-slate-600 flex items-start gap-2">
                              <span className="text-red-400 mt-0.5">•</span>
                              <span>{String(finding)}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {analysisResult.analysis.recommendations && (
                      <div>
                        <h5 className="text-xs font-bold text-slate-900 mb-2">Recommendations</h5>
                        <ul className="space-y-1.5">
                          {(Array.isArray(analysisResult.analysis.recommendations)
                            ? analysisResult.analysis.recommendations
                            : Object.values(analysisResult.analysis.recommendations)
                          ).map((rec: any, i: number) => (
                            <li key={i} className="text-xs text-slate-600 flex items-start gap-2">
                              <span className="text-blue-400 mt-0.5">•</span>
                              <span>{String(rec)}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default VisualAnalysisUpload;
