export type IpfsFileMeta = {
  cid: string;
  name: string;
  mimeType: string;
  size: number;
};

export const MAX_IPFS_FILE_BYTES = 32 * 1024 * 1024;
