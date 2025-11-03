"use client";
import React, { useRef } from "react";

type ModalType = "create" | "rename" | "delete";

interface FolderModalProps {
    open: boolean;
    type: ModalType;
    oldName?: string;
    parentId?: string | null;
    onClose: () => void;
    onConfirm: (value?: string, parentId?: string | null) => void;
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

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[9999]">
            <div className="bg-white rounded-xl shadow-lg p-6 w-80 text-center">
                <h3 className="font-semibold mb-4">{getTitle()}</h3>

                {type !== "delete" ? (
                    <input
                        ref={inputRef}
                        type="text"
                        defaultValue={oldName}
                        placeholder="Nhập tên folder..."
                        className="border p-2 w-full rounded mb-4 text-sm"
                    />
                ) : (
                    <p className="text-gray-600 mb-4 text-sm">
                        Bạn có chắc chắn muốn xoá{" "}
                        <span className="font-semibold text-red-600">
                            {oldName || "folder này"}
                        </span>{" "}
                        cùng toàn bộ folder con và file bên trong không?
                    </p>
                )}

                <div className="flex justify-center gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded border text-gray-600 hover:bg-gray-100"
                    >
                        Hủy
                    </button>

                    <button
                        onClick={() => {
                            const value = inputRef.current?.value.trim() || "";
                            if (type === "delete") onConfirm();
                            else onConfirm(value, parentId || null);
                        }}
                        className={`px-4 py-2 rounded text-white ${type === "delete"
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
