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
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const BASE_URL = "http://localhost:4001/api";

  const handleRenameFolder = async (folderId: string, oldName: string) => {
    const newName = prompt(`Đổi tên folder "${oldName}" thành:`, oldName);
    if (!newName || !newName.trim()) return;

    try {
      const res: any = await axios.put(`${BASE_URL}/folders/${folderId}`, {
        name: newName.trim(),
      });

      setFolders((prev) =>
        prev.map((f) =>
          f._id === folderId ? { ...f, name: res.data.name } : f
        )
      );
    } catch (error) {
      console.error(error);
      alert("Lỗi khi đổi tên folder");
    }
  };

  const handleGetFolders = async () => {
    try {
      const response: any = await axios.get(`${BASE_URL}/folders`);
      setFolders(response.data);
    } catch (error) {
      console.error(error);
      alert("Lỗi khi lấy danh sách folder từ server");
    }
  };

  const handleCreateFolder = async (
    parentId: string | null = null,
    name?: string
  ) => {
    const folderName = name || newFolderName;
    if (!folderName.trim()) return alert("Tên folder không được rỗng");

    try {
      const response: any = await axios.post(`${BASE_URL}/folders`, {
        name: folderName,
        parentId,
      });
      setFolders((prev) => [...prev, response.data]);
      setNewFolderName("");
    } catch (error) {
      console.error(error);
      alert("Lỗi khi tạo folder trên server");
    }
  };

  const handleDeleteFolder = async (folderId: string) => {
    if (
      !confirm("Xác nhận xoá folder này và toàn bộ folder con + file?")
    )
      return;
    try {
      await axios.delete(`${BASE_URL}/folders/${folderId}`);
      setFolders((prev) => prev.filter((f) => f._id !== folderId));
      if (selectedFolder === folderId) {
        setSelectedFolder(null);
        setFiles([]);
      }
      await handleGetFolders();
    } catch (error) {
      console.error(error);
      alert("Lỗi khi xoá folder");
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles?.length || !selectedFolder) {
      alert("Chưa chọn folder hoặc file!");
      return;
    }

    const formData = new FormData();
    for (const file of Array.from(selectedFiles)) {
      formData.append("files", file);
    }

    try {
      const response: any = await axios.post(
        `${BASE_URL}/upload/${selectedFolder}`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      alert(`${response.data.uploaded} file đã upload thành công`);
      fetchFiles(selectedFolder);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (error) {
      console.error(error);
      alert("Lỗi khi upload file");
    }
  };

  const fetchFiles = async (folderId: string) => {
    try {
      const response: any = await axios.get(`${BASE_URL}/files/${folderId}`);
      setFiles(response.data);
    } catch (error) {
      console.error(error);
      alert("Lỗi khi lấy danh sách file");
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    if (!confirm("Xác nhận xoá file này khỏi hệ thống?")) return;
    try {
      await axios.delete(`${BASE_URL}/files/${fileId}`);
      setFiles((prev) => prev.filter((f) => f._id !== fileId));
    } catch (error) {
      console.error(error);
      alert("Lỗi khi xoá file");
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedFolders((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : [...prev, id]
    );
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node)
      ) {
        setMenuOpenId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

            <div className="flex items-center gap-1">
              <div className="flex items-center justify-between relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpenId(
                      menuOpenId === folder._id ? null : folder._id
                    );
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
                        const childName = prompt(
                          `Tên folder con của "${folder.name}":`
                        );
                        if (childName) {
                          handleCreateFolder(folder._id, childName);
                          setExpandedFolders((prev) => [
                            ...prev,
                            folder._id,
                          ]);
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
                      className="text-sm flex items-center gap-2"
                    >
                      <Delete /> Xóa
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {isExpanded && renderFolderTree(folder._id, level + 1)}
        </div>
      );
    });
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-72 bg-white border-r p-4 flex flex-col">
        <div className="flex mb-3 gap-2">
          <input
            type="text"
            placeholder="Tên folder..."
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            className="border p-2 rounded w-full"
          />
          <button
            onClick={() => handleCreateFolder(null)}
            className="text-sm flex items-center gap-1 whitespace-nowrap px-4 rounded bg-gray-100 text-gray-600"
          >
            <FolderAddIcon />
          </button>
        </div>
        <div className="overflow-y-auto flex-1">
          {renderFolderTree(null)}
        </div>
      </div>

      {/* Main area */}
      <div className="flex-1 overflow-auto p-6">
        <div className="mb-4 flex gap-2 justify-end">
          <input
            type="file"
            ref={fileInputRef}
            multiple
            onChange={handleUpload}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={!selectedFolder}
            className="px-4 py-2 bg-white border rounded text-sm text-gray-700"
          >
            Upload Files
          </button>
        </div>

        <div>
          {files.map((file) => (
            <div
              key={file._id}
              className="flex flex-col gap-1 mb-3 pb-2 border-2 border-dotted p-4 rounded-xl"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <a
                    href={file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    {file.name}
                  </a>
                  <span className="text-gray-400 text-xs">
                    ({(file.size / 1024).toFixed(1)} KB)
                  </span>
                </div>

                <button
                  onClick={() => handleDeleteFile(file._id)}
                  className="text-xs px-2 py-0.5 rounded"
                >
                  <Delete />
                </button>
              </div>
              {file.url?.match(/\.(jpg|jpeg|png|gif|webp)$/i) && (
                <img
                  src={file.url}
                  alt={file.name}
                  className="mt-1 w-32 h-32 object-cover rounded shadow border"
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
