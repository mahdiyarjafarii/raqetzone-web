import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import {
  Search,
  MessageSquare,
  Trash2,
  Edit2,
  Check,
  X as XIcon,
  Loader2,
} from "lucide-react";
import { BottomSheet } from "react-spring-bottom-sheet";

import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import apiClient from "@/lib/apiClient";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import "react-spring-bottom-sheet/dist/style.css";

function ChatHistoryDialog({ open, onOpenChange }) {
  const navigate = useNavigate();
  const [chats, setChats] = useState([]);
  const [filteredChats, setFilteredChats] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [editingChatId, setEditingChatId] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [deletingChatId, setDeletingChatId] = useState(null);
  const [chatToDelete, setChatToDelete] = useState(null);
  const [wasBottomSheetOpen, setWasBottomSheetOpen] = useState(false);

  useEffect(() => {
    if (open) {
      loadChats();
    }
  }, [open]);

  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = chats.filter((chat) =>
        chat.title.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredChats(filtered);
    } else {
      setFilteredChats(chats);
    }
  }, [searchQuery, chats]);

  const loadChats = async () => {
    setIsLoading(true);
    const { data, ok } = await apiClient.get("/chats");
    setIsLoading(false);

    if (!ok) {
      toast.error(data?.message || "خطا در بارگذاری تاریخچه");
      return;
    }

    setChats(data.chats || []);
    setFilteredChats(data.chats || []);
  };

  const handleChatClick = (chatId) => {
    onOpenChange(false);
    navigate(`/chat/${chatId}`);
  };

  const handleEditClick = (e, chat) => {
    e.stopPropagation();
    setEditingChatId(chat.id);
    setEditTitle(chat.title);
  };

  const handleCancelEdit = (e) => {
    e?.stopPropagation();
    setEditingChatId(null);
    setEditTitle("");
  };

  const handleSaveEdit = async (e, chatId) => {
    e.stopPropagation();

    if (!editTitle.trim()) {
      toast.error("عنوان نمی‌تواند خالی باشد");
      return;
    }

    setIsUpdating(true);

    const { data, ok } = await apiClient.patch(`/chats/${chatId}/title`, {
      title: editTitle.trim(),
    });

    setIsUpdating(false);

    if (!ok) {
      toast.error(data?.message || "خطا در ویرایش عنوان");
      return;
    }

    setChats((prev) =>
      prev.map((chat) =>
        chat.id === chatId ? { ...chat, title: data.chat.title } : chat
      )
    );

    setEditingChatId(null);
    setEditTitle("");
    toast.success("عنوان با موفقیت ویرایش شد");
  };

  const handleDeleteClick = (e, chat) => {
    e.stopPropagation();
    // Remember if BottomSheet was open before opening AlertDialog
    if (open) {
      setWasBottomSheetOpen(true);
    }
    setChatToDelete(chat);
  };

  const handleConfirmDelete = async () => {
    if (!chatToDelete) return;

    setDeletingChatId(chatToDelete.id);

    const { data, ok } = await apiClient.delete(`/chats/${chatToDelete.id}`);

    setDeletingChatId(null);

    if (!ok) {
      toast.error(data?.message || "خطا در حذف چت");
      setChatToDelete(null);
      return;
    }

    setChats((prev) => prev.filter((chat) => chat.id !== chatToDelete.id));
    // Reset state - don't reopen BottomSheet after successful delete
    setChatToDelete(null);
    setWasBottomSheetOpen(false);
    toast.success("چت با موفقیت حذف شد");
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      const hours = Math.floor(diff / (1000 * 60 * 60));
      if (hours === 0) {
        const minutes = Math.floor(diff / (1000 * 60));
        return minutes === 0 ? "همین الان" : `${minutes} دقیقه پیش`;
      }
      return `${hours} ساعت پیش`;
    } else if (days === 1) {
      return "دیروز";
    } else if (days < 7) {
      return `${days} روز پیش`;
    } else {
      return date.toLocaleDateString("fa-IR", { timeZone: "Asia/Tehran" });
    }
  };

  // Close BottomSheet when AlertDialog opens to prevent aria-hidden conflicts
  const isBottomSheetOpen = open && !chatToDelete;

  return (
    <>
      <BottomSheet
        open={isBottomSheetOpen}
        onDismiss={() => onOpenChange(false)}
        defaultSnap={({ maxHeight }) => maxHeight * 0.9}
        snapPoints={({ maxHeight }) => [maxHeight * 0.9]}
        blocking={true}
        scrollLocking={true}
        className="bottom-sheet"
      >
        <div className="flex flex-col gap-4 px-4 pb-8">
          {/* Header */}
          <div className="flex items-center justify-between pt-2 sticky top-0 bg-background z-20">
            <h2 className="text-lg font-bold">تاریخچه گفتگوها</h2>
            <button
              onClick={() => onOpenChange(false)}
              className="p-2 rounded-lg hover:bg-accent transition-colors"
            >
              <XIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="جستجوی گفتگو..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-10"
            />
          </div>

          {/* Chat List */}
          <div className="space-y-2">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Spinner />
              </div>
            ) : filteredChats.length === 0 ? (
              <div className="text-center py-12">
                <MessageSquare className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                <p className="text-muted-foreground text-sm">
                  {searchQuery ? "نتیجه‌ای یافت نشد" : "تاریخچه‌ای وجود ندارد"}
                </p>
              </div>
            ) : (
              filteredChats.map((chat) => (
                <div
                  key={chat.id}
                  onClick={() => handleChatClick(chat.id)}
                  className={cn(
                    "group relative flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent transition-colors cursor-pointer",
                    deletingChatId === chat.id &&
                      "opacity-50 pointer-events-none"
                  )}
                >
                  {/* Icon */}
                  <div className="shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <MessageSquare className="w-5 h-5 text-primary" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    {editingChatId === chat.id ? (
                      <div
                        className="flex items-center gap-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              handleSaveEdit(e, chat.id);
                            } else if (e.key === "Escape") {
                              handleCancelEdit();
                            }
                          }}
                          disabled={isUpdating}
                          autoFocus
                          className="h-8 text-sm"
                        />

                        <button
                          onClick={(e) => handleSaveEdit(e, chat.id)}
                          disabled={isUpdating}
                          className="shrink-0 w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary/90 transition-colors disabled:opacity-50"
                        >
                          {isUpdating ? (
                            <Spinner className="w-4 h-4" />
                          ) : (
                            <Check className="w-4 h-4" />
                          )}
                        </button>

                        <button
                          onClick={handleCancelEdit}
                          disabled={isUpdating}
                          className="shrink-0 w-8 h-8 rounded-full bg-secondary text-foreground flex items-center justify-center hover:bg-secondary/80 transition-colors disabled:opacity-50"
                        >
                          <XIcon className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <h3 className="font-medium text-sm truncate">
                          {chat.title}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(chat.updatedAt)}
                        </p>
                      </>
                    )}
                  </div>

                  {/* Actions */}
                  {editingChatId !== chat.id && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => handleEditClick(e, chat)}
                        className="p-2 rounded-full hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={(e) => handleDeleteClick(e, chat)}
                        className="p-2 rounded-full hover:bg-destructive/10 text-red-500 hover:text-destructive transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {deletingChatId === chat.id && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-lg">
                      <Loader2 className="w-5 h-5 animate-spin text-primary" />
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </BottomSheet>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!chatToDelete}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setChatToDelete(null);
            // Reopen BottomSheet if it was open before
            if (wasBottomSheetOpen) {
              setWasBottomSheetOpen(false);
              // Small delay to ensure AlertDialog closes first
              setTimeout(() => {
                onOpenChange(true);
              }, 100);
            }
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف گفتگو</AlertDialogTitle>
            <AlertDialogDescription>
              آیا از حذف گفتگو "{chatToDelete?.title}" اطمینان دارید؟ این عملیات
              قابل بازگشت نیست.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>انصراف</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default ChatHistoryDialog;
