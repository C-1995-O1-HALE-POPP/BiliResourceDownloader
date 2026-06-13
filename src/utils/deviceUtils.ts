import { downloadDir } from "../runtime/path.ts";
import { isTauriRuntime } from "../runtime/environment.ts";

const isMobileDevice = () => {
  if (isTauriRuntime()) {
    const ua = navigator.userAgent.toLowerCase()
    return ua.includes('android') || /iphone|ipad|ipod/.test(ua)
  }
  return /android|iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase())
};

const getDownloadPath = async (): Promise<string> => {
  if (isMobileDevice()) {
    return '/storage/emulated/0/Download';
  } else {
    return await downloadDir();
  }
};

const resolveContentUri = (uri: string): string => {
  // content://com.miui.gallery.open/raw/%2Fstorage%2Femulated%2F0%2FPictures%2FQQ%2FImage_51506021824607.jpg
  const path = uri.split("/").pop() || "";
  return decodeURIComponent(path);
};

export { isMobileDevice, getDownloadPath, resolveContentUri };
