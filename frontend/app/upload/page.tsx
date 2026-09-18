import React from "react";
import FileUpload from "@/components/upload/FileUpload";

export const metadata = {
  title: "Upload Dataset - Ocean Digital Twin",
  description: "Upload and harmonize custom NetCDF files.",
};

export default function UploadPage() {
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background gradients for premium feel */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-600/10 rounded-full blur-[120px] pointer-events-none" />
      
      <div className="z-10 w-full">
        <FileUpload />
      </div>
    </div>
  );
}
