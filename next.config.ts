import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@huggingface/transformers", "onnxruntime-node"],
  transpilePackages: ["@axols/webai-js"],
  turbopack: {},
};

export default nextConfig;
