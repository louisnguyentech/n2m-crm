"use client";
import React, { useRef, useState } from "react";
import toast from "react-hot-toast";

type ModalType = "create" | "rename" | "delete";

interface FolderModalProps {
    open: boolean;
    type: ModalType;
    oldName?: string;
    parentId?: string | null;
    onClose: () => void;
    onConfirm: (value?: string, parentId?: string | null, icon?: string) => void;
}

export default function FolderModal({
    open,
    type,
    oldName = "",
    parentId,
    onClose,
    onConfirm,
}: FolderModalProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [selectedIcon, setSelectedIcon] = useState<string>("default");
    const [iconType, setIconType] = useState<"emoji" | "custom">("emoji");

    if (!open) return null;

    const getTitle = () => {
        switch (type) {
            case "rename":
                return "Đổi tên folder";
            case "create":
                return "Tạo folder con mới";
            case "delete":
                return "Xác nhận xoá folder";
            default:
                return "";
        }
    };

    const getConfirmLabel = () => {
        switch (type) {
            case "delete":
                return "Xoá";
            default:
                return "Xác nhận";
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 1024 * 1024) {
                toast.success("Kích thước icon không được vượt quá 1MB");
                return;
            }

            if (!file.type.startsWith('image/')) {
                toast.success("Vui lòng chọn file ảnh");
                return;
            }

            const reader = new FileReader();
            reader.onload = (event) => {
                if (event.target?.result) {
                    setSelectedIcon(event.target.result as string);
                    setIconType("custom");
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const handleConfirm = () => {
        if (type === "delete") {
            onConfirm();
            return;
        }

        const value = inputRef.current?.value.trim() || "";
        if (!value) {
            toast.success("Vui lòng nhập tên folder");
            return;
        }

        const iconToSend = selectedIcon === "default" ? "📁" : selectedIcon;
        onConfirm(value, parentId || null, iconToSend);

        setSelectedIcon("default");
        setIconType("emoji");
    };

    const handleClose = () => {
        setSelectedIcon("default");
        setIconType("emoji");
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[9999]">
            <div className="bg-white rounded-xl shadow-lg p-6 w-96 max-h-[90vh] overflow-y-auto">
                <h3 className="font-semibold mb-4 text-lg">{getTitle()}</h3>

                {type !== "delete" ? (
                    <>
                        <div className="mb-4">
                            <label className="block text-sm font-medium mb-2 text-left">
                                Tên folder:
                            </label>
                            <input
                                ref={inputRef}
                                type="text"
                                defaultValue={oldName}
                                placeholder="Nhập tên folder..."
                                className="border p-2 w-full rounded text-sm"
                            />
                        </div>

                        <div className="mb-4">
                            <div className=" mb-3 text-sm">
                                Upload Icon
                            </div>
                            <div className="space-y-3">
                                <input
                                    id="fileInput"
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileUpload}
                                    accept="image/*"
                                    className="hidden"
                                />

                                <label
                                    htmlFor="fileInput"
                                    className="w-16 h-16 border-2 border-dashed rounded-lg flex items-center justify-center text-gray-400 cursor-pointer hover:bg-gray-50 transition"
                                >
                                    <span className="text-3xl font-bold">+</span>
                                </label>

                                <p className="text-xs text-gray-500 text-left">
                                    Chấp nhận: JPG, PNG, GIF, SVG (tối đa 1MB)
                                </p>

                                {selectedIcon && selectedIcon !== "default" && iconType === "custom" && (
                                    <div className="p-3 border rounded bg-gray-50">
                                        <p className="text-xs font-medium mb-2 text-left">Preview:</p>
                                        <div className="flex items-center gap-3">
                                            <img
                                                src={selectedIcon}
                                                alt="Icon preview"
                                                className="w-8 h-8 object-contain"
                                            />
                                            <span className="text-sm text-gray-600">
                                                {inputRef.current?.value || "Tên folder"}
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {selectedIcon && selectedIcon !== "default" && iconType === "emoji" && (
                                <div className="mt-3 p-3 border rounded bg-gray-50">
                                    <p className="text-xs font-medium mb-2 text-left">Preview:</p>
                                    <div className="flex items-center gap-3">
                                        <span className="text-lg">{selectedIcon}</span>
                                        <span className="text-sm text-gray-600">
                                            {inputRef.current?.value || "Tên folder"}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    <p className="text-gray-600 mb-4 text-sm text-left">
                        Bạn có chắc chắn muốn xoá
                        <span className="font-semibold text-red-600">
                            {oldName || "folder này"}
                        </span>
                        cùng toàn bộ folder con và file bên trong không?
                    </p>
                )}

                <div className="flex justify-center gap-3 pt-2">
                    <button
                        onClick={handleClose}
                        className="px-4 py-2 rounded border text-gray-600 hover:bg-gray-100 text-sm font-medium"
                    >
                        Hủy
                    </button>

                    <button
                        onClick={handleConfirm}
                        className={`px-4 py-2 rounded text-white text-sm font-medium ${type === "delete"
                            ? "bg-red-500 hover:bg-red-600"
                            : "bg-blue-500 hover:bg-blue-600"
                            }`}
                    >
                        {getConfirmLabel()}
                    </button>
                </div>
            </div>
        </div>
    );
}