"use client";

import React, { useState, useRef } from "react";
import { Upload, File, CheckCircle, AlertCircle, X, Loader2, Activity, Database, Target, Map, Calendar, Maximize, FileText, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function FileUpload() {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [report, setReport] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      validateAndSetFile(droppedFile);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (selectedFile: File) => {
    if (!selectedFile.name.endsWith('.nc') && !selectedFile.name.endsWith('.nc4') && !selectedFile.name.endsWith('.netcdf')) {
      setStatus("error");
      setErrorMessage("Please select a valid NetCDF file (.nc, .nc4)");
      return;
    }
    setFile(selectedFile);
    setStatus("idle");
    setErrorMessage("");
    setReport(null);
  };

  const handleUpload = async () => {
    if (!file) return;

    setStatus("uploading");
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("http://localhost:8000/api/dataset/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || "Upload failed");
      }

      setReport(data);
      setStatus("success");
    } catch (err: any) {
      console.error(err);
      setStatus("error");
      setErrorMessage(err.message || "An unexpected error occurred during upload.");
    }
  };

  const reset = () => {
    setFile(null);
    setStatus("idle");
    setReport(null);
    setErrorMessage("");
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-6 rounded-2xl bg-black/40 backdrop-blur-md border border-white/10 shadow-2xl">
      <div className="mb-8 text-center">
        <h2 className="text-2xl font-semibold text-white tracking-tight">Upload Dataset</h2>
        <p className="text-gray-400 mt-2 text-sm">Harmonize your own NetCDF files for analysis and visualization</p>
      </div>

      <AnimatePresence mode="wait">
        {status !== "success" ? (
          <motion.div 
            key="upload-box"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex flex-col items-center"
          >
            {/* Dropzone */}
            <div 
              className={`relative w-full h-64 rounded-xl border-2 border-dashed flex flex-col items-center justify-center transition-colors duration-200 cursor-pointer overflow-hidden ${
                dragActive 
                  ? "border-blue-500 bg-blue-500/10" 
                  : file 
                    ? "border-green-500/50 bg-green-500/5" 
                    : "border-white/20 bg-white/5 hover:border-white/40 hover:bg-white/10"
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
            >
              <input
                ref={inputRef}
                type="file"
                accept=".nc,.nc4,.netcdf"
                onChange={handleChange}
                className="hidden"
              />
              
              {file ? (
                <div className="flex flex-col items-center space-y-4">
                  <div className="p-4 bg-green-500/20 rounded-full">
                    <File className="w-8 h-8 text-green-400" />
                  </div>
                  <div className="text-center">
                    <p className="text-white font-medium text-lg">{file.name}</p>
                    <p className="text-gray-400 text-sm">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center space-y-4 pointer-events-none">
                  <div className="p-4 bg-blue-500/20 rounded-full">
                    <Upload className="w-8 h-8 text-blue-400" />
                  </div>
                  <div className="text-center">
                    <p className="text-white font-medium text-lg">Drag & Drop your .nc file</p>
                    <p className="text-gray-400 text-sm mt-1">or click to browse</p>
                  </div>
                </div>
              )}
            </div>

            {/* Error Message */}
            {status === "error" && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }} 
                animate={{ opacity: 1, y: 0 }}
                className="w-full mt-4 p-4 rounded-lg bg-red-500/10 border border-red-500/30 flex items-start space-x-3 text-red-400"
              >
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <p className="text-sm">{errorMessage}</p>
              </motion.div>
            )}

            {/* Action Buttons */}
            <div className="w-full mt-6 flex gap-4">
              {file && (
                <button 
                  onClick={(e) => { e.stopPropagation(); reset(); }}
                  className="px-6 py-3 rounded-lg font-medium bg-white/5 hover:bg-white/10 text-white transition-colors flex-1"
                  disabled={status === "uploading"}
                >
                  Cancel
                </button>
              )}
              <button 
                onClick={handleUpload}
                disabled={!file || status === "uploading"}
                className={`flex-1 flex items-center justify-center px-6 py-3 rounded-lg font-medium transition-all duration-300 ${
                  !file || status === "uploading"
                    ? "bg-white/10 text-white/40 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)]"
                }`}
              >
                {status === "uploading" ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Harmonizing...
                  </>
                ) : (
                  "Upload & Process"
                )}
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="success-box"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center py-6"
          >
            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mb-6">
              <CheckCircle className="w-10 h-10 text-green-400" />
            </div>
            <h3 className="text-xl font-medium text-white mb-2">Harmonization Complete</h3>
            <p className="text-gray-400 text-center mb-8">
              Your dataset has been successfully processed into the canonical format.
            </p>

            {/* Report Details */}
            {report && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="w-full mb-8"
              >
                <div className="flex items-center space-x-2 mb-4 px-1">
                  <Database className="w-5 h-5 text-blue-400" />
                  <h4 className="text-white font-medium">Dataset Summary</h4>
                  <span className="ml-auto text-xs font-mono px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                    {report.type}
                  </span>
                </div>

                {report.type === "Observations" ? (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex flex-col">
                      <span className="flex items-center text-gray-400 text-xs mb-1"><FileText className="w-3.5 h-3.5 mr-1.5" /> Filename</span>
                      <span className="text-white text-sm font-medium truncate" title={report.filename}>{report.filename}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex flex-col">
                      <span className="flex items-center text-gray-400 text-xs mb-1"><Target className="w-3.5 h-3.5 mr-1.5" /> Platform ID</span>
                      <span className="text-blue-400 text-sm font-medium truncate" title={report.platform_id || 'Unknown'}>{report.platform_id || 'Unknown'}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex flex-col">
                      <span className="flex items-center text-gray-400 text-xs mb-1"><Database className="w-3.5 h-3.5 mr-1.5" /> Platforms</span>
                      <span className="text-white text-lg font-semibold">{report.platforms_count || 0} <span className="text-xs text-gray-500 font-normal">unique</span></span>
                    </div>
                    <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex flex-col">
                      <span className="flex items-center text-gray-400 text-xs mb-1"><Activity className="w-3.5 h-3.5 mr-1.5" /> Total Profiles</span>
                      <span className="text-green-400 text-lg font-semibold">{report.total_profiles || 0} <span className="text-xs text-green-500/50 font-normal">cycles</span></span>
                    </div>
                    <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex flex-col">
                      <span className="flex items-center text-gray-400 text-xs mb-1"><Calendar className="w-3.5 h-3.5 mr-1.5" /> Time Range</span>
                      {report.time_range ? (
                        <div className="flex flex-col text-xs text-white">
                          <span>{new Date(report.time_range[0]).toLocaleDateString()} - </span>
                          <span>{new Date(report.time_range[1]).toLocaleDateString()}</span>
                        </div>
                      ) : (
                        <span className="text-white text-sm font-medium">N/A</span>
                      )}
                    </div>
                    <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex flex-col">
                      <span className="flex items-center text-gray-400 text-xs mb-1"><Maximize className="w-3.5 h-3.5 mr-1.5" /> Depth Range</span>
                      {report.depth_range_m ? (
                        <span className="text-white text-sm font-medium">{Math.min(...report.depth_range_m).toFixed(0)}m to {Math.max(...report.depth_range_m).toFixed(0)}m</span>
                      ) : (
                        <span className="text-white text-sm font-medium">Surface Only</span>
                      )}
                    </div>
                    {report.bbox && (
                      <div className="col-span-2 p-3 rounded-xl bg-white/5 border border-white/10 flex flex-col">
                        <span className="flex items-center text-gray-400 text-xs mb-1"><Map className="w-3.5 h-3.5 mr-1.5" /> Geographic Bounding Box</span>
                        <div className="flex justify-between items-center mt-1">
                          <span className="text-xs font-mono text-blue-300/70 bg-blue-900/20 px-1.5 py-0.5 rounded">W: {report.bbox[0].toFixed(2)}°</span>
                          <span className="text-xs font-mono text-blue-300/70 bg-blue-900/20 px-1.5 py-0.5 rounded">S: {report.bbox[1].toFixed(2)}°</span>
                          <span className="text-xs font-mono text-blue-300/70 bg-blue-900/20 px-1.5 py-0.5 rounded">E: {report.bbox[2].toFixed(2)}°</span>
                          <span className="text-xs font-mono text-blue-300/70 bg-blue-900/20 px-1.5 py-0.5 rounded">N: {report.bbox[3].toFixed(2)}°</span>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2 p-3 rounded-xl bg-white/5 border border-white/10 flex flex-col">
                      <span className="flex items-center text-gray-400 text-xs mb-1"><FileText className="w-3.5 h-3.5 mr-1.5" /> Source</span>
                      <div className="flex justify-between items-center">
                        <span className="text-white text-sm font-medium truncate max-w-[70%]" title={report.filename}>{report.filename}</span>
                        <span className="text-xs text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded">{report.adapter}</span>
                      </div>
                    </div>
                    <div className="col-span-2 p-3 rounded-xl bg-white/5 border border-white/10 flex flex-col">
                      <span className="flex items-center text-gray-400 text-xs mb-1"><Activity className="w-3.5 h-3.5 mr-1.5" /> Variables</span>
                      <span className="text-white text-sm font-medium">{report.variables?.join(", ") || "None"}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex flex-col">
                      <span className="flex items-center text-gray-400 text-xs mb-1"><Calendar className="w-3.5 h-3.5 mr-1.5" /> Time Range</span>
                      {report.time_range ? (
                        <div className="flex flex-col text-xs text-white">
                          <span>{new Date(report.time_range[0]).toLocaleDateString()} - </span>
                          <span>{new Date(report.time_range[1]).toLocaleDateString()}</span>
                        </div>
                      ) : (
                        <span className="text-white text-sm font-medium">N/A</span>
                      )}
                    </div>
                    <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex flex-col">
                      <span className="flex items-center text-gray-400 text-xs mb-1"><Maximize className="w-3.5 h-3.5 mr-1.5" /> Depth Range</span>
                      {report.depth_range_m ? (
                        <span className="text-white text-sm font-medium">{Math.min(...report.depth_range_m).toFixed(0)}m to {Math.max(...report.depth_range_m).toFixed(0)}m</span>
                      ) : (
                        <span className="text-white text-sm font-medium">Surface Only</span>
                      )}
                    </div>
                    {report.bbox && (
                      <div className="col-span-2 p-3 rounded-xl bg-white/5 border border-white/10 flex flex-col">
                        <span className="flex items-center text-gray-400 text-xs mb-1"><Map className="w-3.5 h-3.5 mr-1.5" /> Bounding Box</span>
                        <div className="flex justify-between items-center mt-1">
                          <span className="text-xs font-mono text-blue-300/70 bg-blue-900/20 px-1.5 py-0.5 rounded">W: {report.bbox[0].toFixed(1)}</span>
                          <span className="text-xs font-mono text-blue-300/70 bg-blue-900/20 px-1.5 py-0.5 rounded">S: {report.bbox[1].toFixed(1)}</span>
                          <span className="text-xs font-mono text-blue-300/70 bg-blue-900/20 px-1.5 py-0.5 rounded">E: {report.bbox[2].toFixed(1)}</span>
                          <span className="text-xs font-mono text-blue-300/70 bg-blue-900/20 px-1.5 py-0.5 rounded">N: {report.bbox[3].toFixed(1)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {report.warnings && report.warnings.length > 0 && (
                  <div className="mt-3 p-3 rounded-xl bg-yellow-500/5 border border-yellow-500/20 flex flex-col">
                    <span className="text-yellow-500/80 text-sm font-medium flex items-center mb-2">
                      <AlertTriangle className="w-4 h-4 mr-1.5" /> Warnings ({report.warnings.length})
                    </span>
                    <ul className="list-disc list-inside text-xs text-gray-400 space-y-1">
                      {report.warnings.map((w: string, i: number) => (
                        <li key={i}>{w}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </motion.div>
            )}

            <div className="flex gap-4">
              <button 
                onClick={reset}
                className="px-8 py-3 rounded-lg font-medium bg-white/10 hover:bg-white/20 text-white transition-colors"
              >
                Upload Another
              </button>
              <a 
                href={report?.platform_id ? `/explore?focus_platform=${encodeURIComponent(report.platform_id)}` : '/explore'}
                className="px-8 py-3 rounded-lg font-medium bg-blue-600 hover:bg-blue-500 text-white transition-colors shadow-[0_0_20px_rgba(37,99,235,0.4)]"
              >
                View on Globe
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
