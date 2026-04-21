/**
 * 前端调用「图片上传」接口示例（本仓库不参与编译，可复制到前端工程使用）。
 *
 * 后端约定：
 * - POST `{apiBase}/storage/upload`
 * - Header: `Authorization: Bearer <accessToken>`
 * - Body: `multipart/form-data`，字段名 **`file`**（与后端 `FileInterceptor` 一致）
 * - 成功时 HTTP 200，JSON 包一层 `{ code, message, data }`，`code === 0` 表示成功
 */

/** 与后端 `UploadStorageDataDto` 对齐 */
export interface UploadStorageData {
  url: string;
  storedName: string;
  originalName: string;
  mimeType: string;
  size: number;
}

/** 与后端 `Response<T>` / `ErrorCode.SUCCESS` 对齐 */
export interface ApiEnvelope<T> {
  code: number;
  message: string;
  data: T;
}

export const API_SUCCESS_CODE = 0;

export type UploadImageOptions = {
  /** 已含版本前缀的 API 根，如 `https://host/api/v1`（不要末尾斜杠） */
  apiBase: string;
  accessToken: string;
  /** 来自 `<input type="file">` 或拖拽得到的 `File` */
  file: File;
  /** 可选：`fetch` 的 `signal`（AbortController） */
  signal?: AbortSignal;
};

/**
 * 上传单张图片，返回 `data`（含可给 `<img src>` 使用的 `url`）。
 *
 * @example
 * ```ts
 * const { url } = await uploadStorageImage({
 *   apiBase: import.meta.env.VITE_API_BASE, // 如 https://api.example.com/api/v1
 *   accessToken: useAuthStore().token,
 *   file: input.files![0],
 * });
 * ```
 */
export async function uploadStorageImage(
  options: UploadImageOptions,
): Promise<UploadStorageData> {
  const { apiBase, accessToken, file, signal } = options;

  const form = new FormData();
  form.append('file', file, file.name);

  const res = await fetch(`${apiBase}/storage/upload`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: form,
    signal,
  });

  const json = (await res.json()) as ApiEnvelope<UploadStorageData>;

  if (!res.ok) {
    throw new Error(json?.message || `HTTP ${res.status}`);
  }
  if (json.code !== API_SUCCESS_CODE) {
    throw new Error(json.message || '上传失败');
  }

  return json.data;
}
