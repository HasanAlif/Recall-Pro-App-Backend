import cron from "node-cron";
import { ClientVisit } from "../app/modules/clientVisit/clientVisit.model";
import { fileUploader } from "../helpars/fileUploader";

const isGCSUrl = (url: string): boolean => {
  const bucket = process.env.GCS_BUCKET_NAME;
  return (
    !!bucket && url.startsWith(`https://storage.googleapis.com/${bucket}/`)
  );
};

const refreshVideoSignedUrls = async (): Promise<void> => {
  console.log("[VideoRefresh] Starting signed URL refresh job...");

  // Find visits whose cached signed URLs expire within the next 2 days (or were never signed)
  const twoDaysFromNow = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);

  const visits = await ClientVisit.find({
    videos: { $exists: true, $not: { $size: 0 } },
    $or: [
      { videoUrlsExpiry: { $exists: false } },
      { videoUrlsExpiry: { $lt: twoDaysFromNow } },
    ],
  })
    .select("_id videos")
    .lean();

  let successCount = 0;
  let errorCount = 0;

  for (const visit of visits) {
    if (!visit.videos?.length) continue;

    const gcsVideos = visit.videos.filter(isGCSUrl);
    if (gcsVideos.length === 0) {
      successCount++;
      continue;
    }

    try {
      const signed = await Promise.all(
        visit.videos.map(async (v) => {
          if (!isGCSUrl(v)) return v;
          try {
            const url = await fileUploader.refreshGCSSignedUrl(v, 10080);
            if (!url) {
              console.warn(
                `[VideoRefresh] File not found in GCS, skipping: ${v}`,
              );
              return v;
            }
            return url;
          } catch (err: any) {
            console.warn(`[VideoRefresh] Failed to sign ${v}: ${err?.message}`);
            return v;
          }
        }),
      );

      await ClientVisit.findByIdAndUpdate(visit._id, {
        signedVideos: signed,
        videoUrlsExpiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      successCount++;
    } catch (err: any) {
      console.error(
        `[VideoRefresh] Failed for visit ${visit._id}: ${err?.message}`,
      );
      errorCount++;
    }
  }

  console.log(
    `[VideoRefresh] Done: ${successCount} refreshed, ${errorCount} failed`,
  );
};

const scheduleVideoUrlRefresh = (): void => {
  // Run every 6 days at 01:00 AM — URLs expire in 7 days, so this refreshes 1 day early
  cron.schedule("0 1 */6 * *", async () => {
    try {
      await refreshVideoSignedUrls();
    } catch (err: any) {
      console.error("[VideoRefresh] Cron error:", err?.message);
    }
  });

  console.log(
    "[Cron] Video signed URL refresh scheduled (every 6 days at 01:00)",
  );
};

export default scheduleVideoUrlRefresh;
