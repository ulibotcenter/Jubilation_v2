import { ImageResponse } from "next/og";

export const alt =
  "Calculadoras públicas Jubilation — independência financeira e simulação educativa de INSS";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#0f172a",
          color: "#f8fafc",
          padding: "72px 80px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            fontSize: 28,
            color: "#94a3b8",
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 12,
              background: "#ea580c",
              color: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 32,
              fontWeight: 700,
            }}
          >
            J
          </div>
          <span>Jubilation</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ fontSize: 64, fontWeight: 700, lineHeight: 1.1 }}>
            Calculadoras públicas
          </div>
          <div style={{ fontSize: 32, color: "#cbd5e1", lineHeight: 1.35 }}>
            Quando fico livre · Quanto vou receber · INSS 2026
          </div>
        </div>
        <div style={{ fontSize: 24, color: "#94a3b8" }}>
          Grátis, sem cadastro. Simulação educativa — não é o Meu INSS.
        </div>
      </div>
    ),
    { ...size }
  );
}
