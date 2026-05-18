import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#0a3a1c",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 28,
          border: "8px solid #ffffff",
          color: "#ffffff",
          fontSize: 96,
          fontWeight: 900,
          fontFamily: "Arial, Helvetica, sans-serif",
          letterSpacing: -3,
          boxSizing: "border-box",
        }}
      >
        DS
      </div>
    ),
    { ...size }
  );
}
