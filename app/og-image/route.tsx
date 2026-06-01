import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get("title") || "imaposla.me";
  const subtitle = searchParams.get("subtitle") || "Poslovi u Crnoj Gori";

  const safeTitle = title.length > 50 ? title.slice(0, 50) + "\u2026" : title;
  const safeSubtitle = subtitle.length > 90 ? subtitle.slice(0, 90) + "\u2026" : subtitle;

  // FIX P2: Updated to imaposla.me brandbook colours (navy + red, not lime)
  return new ImageResponse(
    <div
      style={{
        width: "1200px",
        height: "630px",
        background: "#00182A",
        display: "flex",
        alignItems: "stretch",
        justifyContent: "stretch",
      }}
    >
      <div
        style={{
          margin: "40px",
          flex: 1,
          background: "#001f35",
          borderRadius: "28px",
          border: "1.5px solid rgba(255,255,255,0.08)",
          display: "flex",
          flexDirection: "column",
          padding: "50px 60px",
        }}
      >
        {/* Logo mark */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            marginBottom: "48px",
          }}
        >
          <div
            style={{
              width: "68px",
              height: "68px",
              background: "#00182A",
              borderRadius: "16px",
              border: "1.5px solid rgba(255,255,255,0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "24px",
              fontWeight: 900,
              color: "#fff",
              position: "relative",
            }}
          >
            ip
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: "0px" }}>
            <span style={{ fontSize: "26px", fontWeight: 700, color: "#ffffff" }}>
              imaposla
            </span>
            <span style={{ fontSize: "26px", fontWeight: 700, color: "#FF282B" }}>
              .me
            </span>
          </div>
        </div>

        {/* Main title */}
        <div
          style={{
            fontSize: "58px",
            fontWeight: 900,
            color: "#ffffff",
            lineHeight: 1.1,
            flex: 1,
            display: "flex",
            alignItems: "flex-start",
          }}
        >
          {safeTitle}
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: "24px",
            color: "rgba(255,255,255,0.55)",
            marginBottom: "16px",
            marginTop: "24px",
          }}
        >
          {safeSubtitle}
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: "16px",
            color: "#FF282B",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
          }}
        >
          PRAVI LJUDI. PRAVE PRILIKE.
        </div>
      </div>
    </div>,
    { width: 1200, height: 630 }
  );
}
