/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import {
  ChevronLeftIcon,
  Delete,
  Dots,
  FolderAddIcon,
  FolderIcon,
  Rename,
} from "@/assets";

interface Folder {
  _id: string;
  name: string;
  parentId: string | null;
}

interface FileItem {
  _id: string;
  name: string;
  url: string;
  size: number;
  folderId: string;
}

export default function Files() {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState("");
  const [files, setFiles] = useState<FileItem[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<string[]>([]);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const BASE_URL = "http://localhost:4001/api";

  const handleGetFolders = async () => {
    try {
      const res: any = await axios.get(`${BASE_URL}/folders`);
      setFolders(res.data);
    } catch {
      alert("Lỗi khi lấy danh sách folder");
    }
  };

  const handleCreateFolder = async (
    parentId: string | null = null,
    name?: string
  ) => {
    const folderName = name || newFolderName;
    if (!folderName.trim()) return alert("Tên folder không được rỗng");

    try {
      const res: any = await axios.post(`${BASE_URL}/folders`, {
        name: folderName,
        parentId,
      });
      setFolders((prev) => [...prev, res.data]);
      setNewFolderName("");
    } catch {
      alert("Lỗi khi tạo folder");
    }
  };

  const handleRenameFolder = async (folderId: string, oldName: string) => {
    const newName = prompt(`Đổi tên folder "${oldName}" thành:`, oldName);
    if (!newName?.trim()) return;
    try {
      const res: any = await axios.put(`${BASE_URL}/folders/${folderId}`, {
        name: newName.trim(),
      });
      setFolders((prev) =>
        prev.map((f) => (f._id === folderId ? { ...f, name: res.data.name } : f))
      );
    } catch {
      alert("Lỗi khi đổi tên folder");
    }
  };

  const handleDeleteFolder = async (folderId: string) => {
    if (!confirm("Xác nhận xoá folder này và toàn bộ folder con + file?")) return;
    try {
      await axios.delete(`${BASE_URL}/folders/${folderId}`);
      setFolders((prev) => prev.filter((f) => f._id !== folderId));
      if (selectedFolder === folderId) {
        setSelectedFolder(null);
        setFiles([]);
      }
      handleGetFolders();
    } catch {
      alert("Lỗi khi xoá folder");
    }
  };

  const fetchFiles = async (folderId: string) => {
    try {
      const res: any = await axios.get(`${BASE_URL}/files/${folderId}`);
      setFiles(res.data);
      setSelectedFiles([]);
    } catch {
      alert("Lỗi khi lấy danh sách file");
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files;
    if (!selected?.length || !selectedFolder) {
      alert("Chưa chọn folder hoặc file!");
      return;
    }

    const formData = new FormData();
    Array.from(selected).forEach((f) => formData.append("files", f));

    try {
      const res: any = await axios.post(
        `${BASE_URL}/upload/${selectedFolder}`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      alert(`${res.data.uploaded} file đã upload thành công`);
      fetchFiles(selectedFolder);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch {
      alert("Lỗi khi upload file");
    }
  };

  const handleDeleteSelectedFiles = async () => {
    if (selectedFiles.length === 0) {
      alert("Vui lòng chọn ít nhất một file để xoá.");
      return;
    }
    if (!confirm(`Xác nhận xoá ${selectedFiles.length} file khỏi hệ thống?`)) return;

    try {
      await Promise.all(
        selectedFiles.map((id) => axios.delete(`${BASE_URL}/files/${id}`))
      );
      setFiles((prev) => prev.filter((f) => !selectedFiles.includes(f._id)));
      setSelectedFiles([]);
    } catch {
      alert("Lỗi khi xoá file");
    }
  };

  const toggleExpand = (id: string) =>
    setExpandedFolders((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  useEffect(() => {
    handleGetFolders();
  }, []);

  useEffect(() => {
    if (selectedFolder) fetchFiles(selectedFolder);
  }, [selectedFolder]);

  const renderFolderTree = (parentId: string | null, level = 0) => {
    const subFolders = folders.filter((f) => f.parentId === parentId);
    return subFolders.map((folder) => {
      const hasChildren = folders.some((f) => f.parentId === folder._id);
      const isExpanded = expandedFolders.includes(folder._id);

      return (
        <div key={folder._id} style={{ marginLeft: level * 12 }}>
          <div
            className={`relative flex justify-between items-center cursor-pointer px-2 py-1 rounded mb-1 ${selectedFolder === folder._id
              ? "bg-[#E0EDFE] text-gray-700"
              : "hover:bg-blue-100 text-gray-500"
              }`}
          >
            <div
              onClick={() => {
                setSelectedFolder(folder._id);
                if (hasChildren) toggleExpand(folder._id);
              }}
              className="flex items-center gap-1"
            >
              {hasChildren ? (
                <ChevronLeftIcon
                  className={`w-4 h-4 transform transition-transform duration-300 ${isExpanded ? "rotate-90" : "rotate-0"
                    }`}
                />
              ) : (
                <div className="w-4" />
              )}
              <FolderIcon /> {folder.name}
            </div>

            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpenId(menuOpenId === folder._id ? null : folder._id);
                }}
                className="p-1 hover:bg-gray-200 rounded-full"
              >
                <Dots />
              </button>
              {menuOpenId === folder._id && (
                <div
                  ref={menuRef}
                  className="absolute flex flex-col gap-4 right-3 top-8 w-40 p-4 bg-white rounded-lg shadow-lg border border-gray-200 z-10"
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const child = prompt(`Tên folder con của "${folder.name}":`);
                      if (child) {
                        handleCreateFolder(folder._id, child);
                        setExpandedFolders((prev) => [...prev, folder._id]);
                      }
                      setMenuOpenId(null);
                    }}
                    className="text-sm flex items-center gap-2"
                  >
                    <FolderAddIcon /> Thêm mới
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRenameFolder(folder._id, folder.name);
                      setMenuOpenId(null);
                    }}
                    className="text-sm flex items-center gap-2"
                  >
                    <Rename /> Đổi tên
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteFolder(folder._id);
                      setMenuOpenId(null);
                    }}
                    className="text-sm flex items-center gap-2 text-red-500"
                  >
                    <Delete /> Xóa
                  </button>
                </div>
              )}
            </div>
          </div>
          {isExpanded && renderFolderTree(folder._id, level + 1)}
        </div>
      );
    });
  };

  return (
    <div className="flex flex-col md:flex-row h-screen !bg-white dark:!bg-black border border-[#e4e7ec] rounded-2xl">
      <div
        className="flex flex-col w-full md:w-72 border-r p-4 h-screen md:h-auto md:min-h-screen overflow-hidden"
      >
        <div className="flex mb-3 gap-2">
          <input
            type="text"
            placeholder="Tên folder..."
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            className="border p-2 rounded w-full text-sm"
          />
          <button
            onClick={() => handleCreateFolder(null)}
            className="text-sm flex items-center gap-1 whitespace-nowrap px-3 py-2 rounded text-gray-600"
          >
            <FolderAddIcon />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {renderFolderTree(null)}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 md:p-6">
        <div className="mb-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={files.length > 0 && selectedFiles.length === files.length}
              onChange={(e) =>
                e.target.checked
                  ? setSelectedFiles(files.map((f) => f._id))
                  : setSelectedFiles([])
              }
            />
            <span className="text-sm text-gray-600">Chọn tất cả</span>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={!selectedFolder}
              className="px-4 py-2 border rounded text-sm text-gray-700 dark:text-white"
            >
              Upload Files
            </button>
            {selectedFiles.length > 0 && (
              <button
                onClick={handleDeleteSelectedFiles}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded text-sm"
              >
                Xoá {selectedFiles.length} file
              </button>
            )}
          </div>

          <input
            type="file"
            ref={fileInputRef}
            multiple
            onChange={handleUpload}
            className="hidden"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {files.map((file) => (
            <div
              key={file._id}
              className="flex flex-col gap-1 p-3 border border-dashed rounded-xl hover:shadow-md transition"
            >
              <div className="flex items-center justify-between">
                <input
                  type="checkbox"
                  checked={selectedFiles.includes(file._id)}
                  onChange={(e) =>
                    setSelectedFiles((prev) =>
                      e.target.checked
                        ? [...prev, file._id]
                        : prev.filter((id) => id !== file._id)
                    )
                  }
                />
              </div>

              {(() => {
                const url = file.url.toLowerCase();

                if (/\.(jpg|jpeg|png|gif|webp)$/i.test(url))
                  return (
                    <img
                      src={file.url}
                      alt={file.name}
                      className="mt-1 w-16 h-16  object-cover rounded shadow border"
                    />
                  );

                if (/\.(mp4|webm|ogg)$/i.test(url))
                  return (
                    <video
                      src={file.url}
                      controls
                      className="mt-1 w-16 h-16 rounded shadow border object-cover"
                    />
                  );

                const typeMap: Record<string, string> = {
                  pdf: "PDF File",
                  xls: "Excel File",
                  xlsx: "Excel File",
                  doc: " Word File",
                  docx: "Word File",
                  zip: "ZIP File",
                  rar: "RAR File",
                };

                const ext = url.split(".").pop() || "";
                const label = typeMap[ext] || "📁 File khác";

                return (
                  <a
                    href={file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center text-gray-700 mt-6 hover:underline"
                  >
                    {label}
                  </a>
                );
              })()}

              <div className="mt-2 text-xs">
                <a
                  href={file.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline break-all"
                >
                  {file.name}
                </a>
                <p className="text-gray-400 text-xs">
                  {(file.size / 1024).toFixed(1)} KB
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
