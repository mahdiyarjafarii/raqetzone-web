import React, { useState } from "react";
import { useSetAtom } from "jotai";
import { useNavigate } from "react-router-dom";
import { DownloadIcon, Trash2Icon, SparklesIcon } from "lucide-react";
import toast from "react-hot-toast";

import { CustomDialog } from "./ui/dialog";
import { Spinner } from "./ui/spinner";
import { Button } from "./ui/button";
import downloader from "@/lib/downloader";
import { CustomAlertDialog } from "./ui/alert-dialog";
import apiClient from "@/lib/apiClient";
import { showOverlayLoadingAtom } from "@/config/state";

function VideoDetailDialog({
  open,
  onOpenChange,
  selectedGeneration,
  onDelete,
}) {
  const navigate = useNavigate();

  const setShowOverlayLoading = useSetAtom(showOverlayLoadingAtom);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [generationToDelete, setGenerationToDelete] = useState(null);

  const handleDelete = async (generationId) => {
    setShowOverlayLoading(true);

    const { data, ok } = await apiClient.delete(`/videos/${generationId}`);
    setShowOverlayLoading(false);

    if (!ok) {
      toast.error(data?.message || "خطا در حذف ویدیو");
      return;
    }

    onDelete(generationId);
    toast.success("ویدیو با موفقیت حذف شد");
    setIsDeleteConfirmOpen(false);
  };

  const handleDownload = async (videoS3Url, filename) => {
    downloader(videoS3Url, filename);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("fa-IR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(date);
  };

  return (
    <>
      <CustomDialog
        open={open}
        onOpenChange={onOpenChange}
        className="md:max-w-3xl max-h-[90vh] overflow-y-auto"
      >
        {selectedGeneration && (
          <div className="space-y-6">
            {/* Video Player */}
            <div className="relative rounded-xl overflow-hidden border border-border bg-secondary">
              {selectedGeneration.status === "completed" &&
              selectedGeneration.videoS3Url ? (
                <video
                  controls
                  controlsList="nodownload"
                  className="w-full"
                  src={selectedGeneration.videoS3Url}
                  poster={selectedGeneration.thumbnailS3Url}
                >
                  مرورگر شما از پخش ویدیو پشتیبانی نمی‌کند.
                </video>
              ) : (
                <div className="relative h-64 flex flex-col items-center justify-center gap-3">
                  <Spinner className="w-8 h-8 text-primary" />
                  <span className="text-sm font-semibold">
                    در حال ساختن ویدیو...
                  </span>
                  {selectedGeneration.progress > 0 && (
                    <div className="w-full max-w-[200px] px-4">
                      <div className="w-full bg-white/20 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-primary h-full rounded-full transition-all duration-300"
                          style={{ width: `${selectedGeneration.progress}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground text-center block mt-2">
                        {selectedGeneration.progress}%
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Details */}
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-semibold mb-2">توضیحات:</h4>
                <p className="text-sm text-muted-foreground">
                  {selectedGeneration.prompt}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-semibold mb-1">وضعیت:</h4>
                  <p className="text-sm text-muted-foreground">
                    {selectedGeneration.status === "completed"
                      ? "تکمیل شده"
                      : selectedGeneration.status === "processing"
                      ? "در حال پردازش"
                      : selectedGeneration.status === "queued"
                      ? "در صف"
                      : "نامشخص"}
                  </p>
                </div>
                <div>
                  <h4 className="text-sm font-semibold mb-1">مدل:</h4>
                  <p className="text-sm text-muted-foreground">
                    {selectedGeneration.modelName || "-"}
                  </p>
                </div>
                {selectedGeneration.status === "completed" && (
                  <>
                    <div>
                      <h4 className="text-sm font-semibold mb-1">رزولوشن:</h4>
                      <p className="text-sm text-muted-foreground">
                        {selectedGeneration.config?.resolution || "720p"}
                      </p>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold mb-1">
                        نسبت تصویر:
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {selectedGeneration.config?.aspectRatio || "16:9"}
                      </p>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold mb-1">مدت زمان:</h4>
                      <p className="text-sm text-muted-foreground">
                        {selectedGeneration.config?.duration || 8}s
                      </p>
                    </div>
                  </>
                )}
                <div className="col-span-2">
                  <h4 className="text-sm font-semibold mb-1">تاریخ:</h4>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(selectedGeneration.createdAt)}
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            {selectedGeneration.status === "completed" && (
              <>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() =>
                      handleDownload(
                        selectedGeneration.videoS3Url,
                        `video-${selectedGeneration.id}.mp4`
                      )
                    }
                    className="flex-1 gap-2"
                  >
                    <DownloadIcon className="w-4 h-4" />
                    دانلود
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => {
                      setGenerationToDelete(selectedGeneration);
                      setIsDeleteConfirmOpen(true);
                    }}
                    className="flex-1 gap-2 text-red-500 hover:text-red-600"
                  >
                    <Trash2Icon className="w-4 h-4" />
                    حذف
                  </Button>
                </div>

                <Button
                  onClick={() => {
                    const prompt = selectedGeneration?.prompt;
                    navigate("/video-generate", {
                      state: { initialPrompt: prompt },
                    });
                  }}
                  className="w-full gap-2"
                >
                  <SparklesIcon className="w-4 h-4" />
                  استفاده از این پرامپت
                </Button>
              </>
            )}
          </div>
        )}
      </CustomDialog>

      {/* Delete Confirmation Dialog */}
      <CustomAlertDialog
        open={isDeleteConfirmOpen}
        onOpenChange={setIsDeleteConfirmOpen}
        title="حذف ویدیو"
        description="آیا از حذف این ویدیو اطمینان دارید؟ این عمل قابل بازگشت نیست."
        onConfirm={() => {
          if (generationToDelete) {
            handleDelete(generationToDelete.id);
          }
        }}
        confirmBtnClassName="bg-red-500 hover:bg-red-600"
      />
    </>
  );
}

export default VideoDetailDialog;
