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
import { toast } from "react-hot-toast";
import FolderModal from "./folder-modal";

interface Folder {
  _id: string;
  name: string;
  parentId: string | null;
  icon?: string;
}

interface FileItem {
  _id: string;
  name: string;
  url: string;
  size: number;
  folder_id: string;
}

export default function Files() {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState("");
  const [files, setFiles] = useState<FileItem[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<string[]>([]);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);

  const [preview, setPreview] = useState<{ open: boolean; file: FileItem | null }>({
    open: false,
    file: null,
  });


  const [modal, setModal] = useState<{
    open: boolean;
    type: "create" | "rename" | "delete";
    folderId: string | null;
    oldName: string;
    parentId?: string | null;
  }>({ open: false, type: "create", folderId: null, oldName: "" });

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const BASE_URL = "http://localhost:4001/api";

  const handleGetFolders = async () => {
    try {
      const res: any = await axios.get(`${BASE_URL}/folders`);
      setFolders(res.data);
    } catch {
      toast.error("Lỗi khi lấy danh sách folder");
    }
  };

  const handleCreateFolder = async (
    parentId: string | null = null,
    name?: string,
    icon?: string
  ) => {
    const folderName = name || newFolderName;
    if (!folderName.trim()) return toast.error("Tên folder không được để trống");

    try {
      const res: any = await axios.post(`${BASE_URL}/folders`, {
        name: folderName,
        parentId,
        icon: icon || "default",
      });
      setFolders((prev) => [...prev, res.data]);
      setNewFolderName("");
      toast.success("Tạo folder thành công");
    } catch {
      toast.error("Lỗi khi tạo folder");
    }
  };

  const handleRenameFolder = async (folder_id: string, newName: string, icon?: string) => {
    try {
      const res: any = await axios.put(`${BASE_URL}/folders/${folder_id}`, {
        name: newName.trim(),
        icon: icon || "default",
      });
      setFolders((prev) =>
        prev.map((f) =>
          f._id === folder_id ? { ...f, name: res.data.name, icon: res.data.icon } : f
        )
      );
      toast.success("Đổi tên thành công");
    } catch {
      toast.error("Lỗi khi đổi tên folder");
    }
  };

  const handleDeleteFolder = async (folder_id: string) => {
    try {
      await axios.delete(`${BASE_URL}/folders/${folder_id}`);
      setFolders((prev) => prev.filter((f) => f._id !== folder_id));
      if (selectedFolder === folder_id) {
        setSelectedFolder(null);
        setFiles([]);
      }
      toast.success("Đã xoá folder");
      handleGetFolders();
    } catch {
      toast.error("Lỗi khi xoá folder");
    }
  };

  const fetchFiles = async (folder_id: string) => {
    try {
      const res: any = await axios.get(`${BASE_URL}/files/${folder_id}`);
      setFiles(res.data);
      setSelectedFiles([]);
    } catch {
      toast.error("Lỗi khi lấy danh sách file");
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files;
    if (!selected?.length || !selectedFolder) {
      toast.error("Chưa chọn folder hoặc file!");
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
      toast.success(`${res.data.uploaded} file đã upload thành công`);
      fetchFiles(selectedFolder);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch {
      toast.error("Lỗi khi upload file");
    }
  };

  const handleDeleteSelectedFiles = async () => {
    if (selectedFiles.length === 0)
      return toast.error("Vui lòng chọn ít nhất một file để xoá.");

    try {
      await Promise.all(
        selectedFiles.map((id) => axios.delete(`${BASE_URL}/files/${id}`))
      );
      setFiles((prev) => prev.filter((f) => !selectedFiles.includes(f._id)));
      setSelectedFiles([]);
      toast.success("Đã xoá file");
    } catch {
      toast.error("Lỗi khi xoá file");
    }
  };

  const toggleExpand = (id: string) =>
    setExpandedFolders((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  const renderFolderIcon = (folder: Folder) => {
    if (folder.icon && folder.icon !== "default") {
      if (folder.icon.startsWith("http") || folder.icon.startsWith("data:")) {
        return (
          <img
            src={folder.icon}
            alt={folder.name}
            className="w-4 h-4 object-contain"
          />
        );
      }
      return <span className="text-sm">{folder.icon}</span>;
    }
    return <FolderIcon />;
  };

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
              ? "bg-blue-50 text-blue-700"
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
              {renderFolderIcon(folder)} {folder.name}
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
                      setModal({
                        open: true,
                        type: "create",
                        folderId: null,
                        oldName: "",
                        parentId: folder._id,
                      });
                      setExpandedFolders((prev) => [...prev, folder._id]);
                      setMenuOpenId(null);
                    }}
                    className="text-sm flex items-center gap-2"
                  >
                    <FolderAddIcon /> Tạo folder
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setModal({
                        open: true,
                        type: "rename",
                        folderId: folder._id,
                        oldName: folder.name,
                      });
                      setMenuOpenId(null);
                    }}
                    className="text-sm flex items-center gap-2"
                  >
                    <Rename /> Đổi tên
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setModal({
                        open: true,
                        type: "delete",
                        folderId: folder._id,
                        oldName: folder.name,
                      });
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
    <>
      <div className="flex flex-col md:flex-row h-screen !bg-white dark:!bg-black border border-[#e4e7ec] rounded-2xl">
        <div className="flex flex-col w-full md:w-72 border-r p-4 md:h-screen overflow-hidden">
          <div className="flex justify-end pb-3 gap-2 border-b">
            <button
              onClick={() => setModal({
                open: true,
                type: "create",
                folderId: null,
                oldName: "",
                parentId: null
              })}
              className="px-4 py-2 hover:bg-blue-100 border rounded text-sm text-gray-700 dark:text-white"
            >
              Create Folder
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">{renderFolderTree(null)}</div>
        </div>

        <div className="flex-1 overflow-auto p-2 md:p-4">
          <div className="mb-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3  border-b pb-3">
            <div className="flex items-center gap-2 ">
              <input
                type="checkbox"
                checked={files.length > 0 && selectedFiles.length === files.length}
                onChange={(e) =>
                  e.target.checked
                    ? setSelectedFiles(files.map((f) => f._id))
                    : setSelectedFiles([])
                }
                className="cursor-pointer"
              />
              <span className="text-sm text-gray-600">Chọn tất cả</span>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={!selectedFolder}
                className="px-4 py-2 border hover:bg-blue-100 rounded text-sm text-gray-700 dark:text-white cursor-pointer"
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
                onClick={() =>
                  setSelectedFiles((prev) =>
                    prev.includes(file._id)
                      ? prev.filter((id) => id !== file._id)
                      : [...prev, file._id]
                  )
                }
                className={`flex gap-1 p-3 border border-dashed rounded-xl cursor-pointer transition ${selectedFiles.includes(file._id)
                  ? "bg-blue-50 border-blue-400 shadow-md"
                  : "hover:shadow-md"
                  }`}
              >
                {(() => {
                  const url = file.url.toLowerCase();
                  if (/\.(jpg|jpeg|png|gif|webp)$/i.test(url))
                    return (
                      <img
                        src={file.url}
                        alt={file.name}
                        className="mt-1 w-16 h-16 object-cover rounded shadow border"
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

                  const ext = url.split(".").pop() || "";
                  const typeMap: Record<string, string> = {
                    pdf: "PDF File",
                    xls: "Excel File",
                    xlsx: "Excel File",
                    doc: "Word File",
                    docx: "Word File",
                    zip: "ZIP File",
                    rar: "RAR File",
                  };
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
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setPreview({ open: true, file });
                    }}
                    className="text-blue-600 hover:underline break-all text-left w-full"
                  >
                    {file.name}
                  </button>
                  <p className="text-gray-400 text-xs">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>

              </div>
            ))}
          </div>
        </div>
      </div>
      {preview.open && preview.file && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-xl w-full relative">
            <button
              onClick={() => setPreview({ open: false, file: null })}
              className="absolute top-2 right-2 text-gray-500 hover:text-black"
            >
              ✕
            </button>

            <h2 className="text-lg font-semibold mb-4">{preview.file.name}</h2>

            {(() => {
              const url = preview.file?.url.toLowerCase() || "";
              if (/\.(jpg|jpeg|png|gif|webp)$/i.test(url))
                return (
                  <img
                    src={preview.file.url}
                    alt={preview.file.name}
                    className="w-full rounded-lg shadow mb-4"
                  />
                );
              if (/\.(mp4|webm|ogg)$/i.test(url))
                return (
                  <video
                    src={preview.file.url}
                    controls
                    className="w-full rounded-lg shadow mb-4"
                  />
                );

              const ext = url.split(".").pop() || "";
              const typeMap: Record<string, string> = {
                pdf: "PDF File",
                xls: "Excel File",
                xlsx: "Excel File",
                doc: "Word File",
                docx: "Word File",
                zip: "ZIP File",
                rar: "RAR File",
              };
              const label = typeMap[ext] || "File khác";
              return (
                <div className="text-center text-gray-700 mb-4">
                  <p>{label}</p>
                </div>
              );
            })()}

            <div className="flex justify-end gap-3 mt-2">
              <button
                onClick={async () => {
                  await navigator.clipboard.writeText(preview.file?.url || "");
                  toast.success("Đã copy link file!");
                }}
                className="px-3 py-1 border rounded text-sm hover:bg-gray-100"
              >
                Copy link
              </button>

              <a
                href={preview.file.url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1 border rounded text-sm text-blue-600 hover:bg-blue-50"
              >
                Mở file
              </a>
            </div>
          </div>
        </div>
      )}

      <FolderModal
        open={modal.open}
        type={modal.type}
        oldName={modal.oldName}
        parentId={modal.parentId}
        onClose={() =>
          setModal({
            open: false,
            type: "create",
            folderId: null,
            oldName: "",
          })
        }
        onConfirm={(newName, parentId, icon) => {
          if (modal.type === "create" && parentId !== undefined) {
            handleCreateFolder(parentId, newName || "", icon);
          } else if (modal.type === "rename" && modal.folderId) {
            handleRenameFolder(modal.folderId, newName || "", icon);
          } else if (modal.type === "delete" && modal.folderId) {
            handleDeleteFolder(modal.folderId);
          }
          setModal({ open: false, type: "create", folderId: null, oldName: "" });
        }}
      />
    </>
  );
}