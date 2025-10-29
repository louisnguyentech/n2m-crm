/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import React, { useState, useRef, useEffect } from "react";
import axios from "axios";

interface Folder {
  _id: string;
  name: string;
  parentId: string | null;
}

export default function Files() {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState("");
  const [files, setFiles] = useState<any[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const BASE_URL = "http://localhost:4001/api";

  const handleGetFolders = async () => {
    try {
      const response:any = await axios.get(`${BASE_URL}/folders`);
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
      const response:any = await axios.post(`${BASE_URL}/folders`, {
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

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !files.length || !selectedFolder)
      return alert("Chưa chọn folder hoặc file");

    const formData = new FormData();
    for (const file of files) {
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
    } catch (error) {
      console.error(error);
      alert("Lỗi khi upload file");
    }
  };

  const fetchFiles = async (folderId: string) => {
    try {
      const response:any = await axios.get(`${BASE_URL}/files/${folderId}`);
      setFiles(response.data);
    } catch (error) {
      console.error(error);
      alert("Lỗi khi lấy danh sách file");
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedFolders((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  useEffect(() => {
    handleGetFolders();
  }, []);

  useEffect(() => {
    if (selectedFolder) fetchFiles(selectedFolder);
  }, [selectedFolder]);

  const renderFolderTree = (parentId: string | null, level = 0) => {
    const subFolders = folders.filter((f) => f.parentId === parentId);

    return subFolders.map((folder) => (
      <div key={folder._id} style={{ marginLeft: level * 12 }}>
        <div
          onClick={() => {
            setSelectedFolder(folder._id);
            toggleExpand(folder._id);
          }}
          className={`flex justify-between items-center cursor-pointer px-2 py-1 rounded mb-1 ${
            selectedFolder === folder._id
              ? "bg-blue-500 text-white"
              : "hover:bg-blue-100"
          }`}
        >
          <div
            
            className="flex items-center gap-1"
          >
            {expandedFolders.includes(folder._id) ? "📂" : "📁"} {folder.name}
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              const childName = prompt(`Tên folder con của "${folder.name}":`);
              if (childName) {
                handleCreateFolder(folder._id, childName);
                setExpandedFolders((prev) => [...prev, folder._id]);
              }
            }}
            className="text-sm bg-blue-400 hover:bg-blue-500 text-white px-2 py-0.5 rounded"
          >
            +
          </button>
        </div>

        {expandedFolders.includes(folder._id) &&
          renderFolderTree(folder._id, level + 1)}
      </div>
    ));
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <div className="w-80 bg-white border-r p-4 flex flex-col">
        <h2 className="text-lg font-bold mb-3">📁 Folder Tree</h2>

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
            className="bg-blue-500 text-white px-3 rounded"
          >
            +
          </button>
        </div>

        <div className="overflow-y-auto flex-1">{renderFolderTree(null)}</div>
      </div>

      <div className="flex-1 p-6">
        <h2 className="text-2xl font-semibold mb-4">
          Folder đang chọn:{" "}
          <span className="text-blue-600">
            {folders.find((f) => f._id === selectedFolder)?.name ||
              "Chưa chọn folder"}
          </span>
        </h2>

        <div className="mb-4 flex gap-2">
          <input
            type="file"
            ref={fileInputRef}
            multiple
            onChange={handleUpload}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="bg-green-500 text-white px-3 py-1 rounded"
            disabled={!selectedFolder}
          >
            Upload Files
          </button>
        </div>

        <ul>
          {files.map((file) => (
            <li
              key={file._id}
              className="flex flex-col gap-1 mb-3 border-b border-gray-200 pb-2"
            >
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

              {file.url?.match(/\.(jpg|jpeg|png|gif|webp)$/i) && (
                <img
                  src={file.url}
                  alt={file.name}
                  className="mt-1 w-32 h-32 object-cover rounded shadow border"
                />
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
