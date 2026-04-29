import { useEffect, useRef, useState, useCallback } from "react";
import {
  PoseLandmarker,
  ImageSegmenter,
  FilesetResolver,
  type NormalizedLandmark,
} from "@mediapipe/tasks-vision";

const BASE = import.meta.env.BASE_URL;

type FabricKey = "black" | "navy" | "burgundy";
type GarmentKey = "suit" | "shirt" | "thobe" | "pants";

interface Fabric {
  label: string;
  src: string;
  swatchTint: string;
}

const FABRICS: Record<FabricKey, Fabric> = {
  black: {
    label: "أسود ملكي",
    src: `${BASE}images/fabric-classic-black.png`,
    swatchTint: "#1a1a1a",
  },
  navy: {
    label: "كحلي مخطط",
    src: `${BASE}images/fabric-navy-herringbone.png`,
    swatchTint: "#1a2540",
  },
  burgundy: {
    label: "خمري ملكي",
    src: `${BASE}images/fabric-burgundy-silk.png`,
    swatchTint: "#3d1820",
  },
};

const GARMENTS: Record<GarmentKey, { label: string; emoji: string }> = {
  suit: { label: "بدلة", emoji: "🤵" },
  shirt: { label: "قميص", emoji: "👔" },
  thobe: { label: "جلابية", emoji: "🧕" },
  pants: { label: "بنطلون", emoji: "👖" },
};

type Status =
  | { kind: "idle" }
  | { kind: "loading"; msg: string }
  | { kind: "needsCamera" }
  | { kind: "live" }
  | { kind: "error"; msg: string };

export default function App() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const poseLandmarkerRef = useRef<PoseLandmarker | null>(null);
  const segmenterRef = useRef<ImageSegmenter | null>(null);
  const fabricImgRef = useRef<HTMLImageElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastVideoTimeRef = useRef<number>(-1);
  const offCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [fabric, setFabric] = useState<FabricKey>("black");
  const [garment, setGarment] = useState<GarmentKey>("suit");
  const [showHelp, setShowHelp] = useState(true);
  const [snapshot, setSnapshot] = useState<string | null>(null);

  // Load chosen fabric image into ref
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = FABRICS[fabric].src;
    img.onload = () => {
      fabricImgRef.current = img;
    };
  }, [fabric]);

  // Initialize MediaPipe + camera
  const start = useCallback(async () => {
    try {
      setStatus({ kind: "loading", msg: "جارٍ تحميل محرك الذكاء الاصطناعي..." });

      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm",
      );

      const [poseLandmarker, segmenter] = await Promise.all([
        PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task",
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          numPoses: 1,
          minPoseDetectionConfidence: 0.5,
          minPosePresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
        }),
        ImageSegmenter.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite",
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          outputCategoryMask: true,
          outputConfidenceMasks: false,
        }),
      ]);

      poseLandmarkerRef.current = poseLandmarker;
      segmenterRef.current = segmenter;

      setStatus({ kind: "loading", msg: "جارٍ فتح الكاميرا..." });

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 720 },
          height: { ideal: 1280 },
        },
        audio: false,
      });

      const video = videoRef.current!;
      video.srcObject = stream;
      await new Promise<void>((res) => {
        video.onloadedmetadata = () => {
          video.play();
          res();
        };
      });

      setStatus({ kind: "live" });
      requestAnimationFrame(loop);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      const isPermission =
        msg.toLowerCase().includes("permission") ||
        msg.toLowerCase().includes("notallowed");
      setStatus({
        kind: "error",
        msg: isPermission
          ? "فضلاً اسمح للموقع باستخدام الكاميرا من إعدادات المتصفح ثم أعد المحاولة"
          : `حدث خطأ: ${msg}`,
      });
    }
  }, []);

  // Render loop: pose detect + segment + draw fabric overlay
  const loop = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const pose = poseLandmarkerRef.current;
    const segmenter = segmenterRef.current;

    if (!video || !canvas || !pose || !segmenter || video.readyState < 2) {
      rafRef.current = requestAnimationFrame(loop);
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Match canvas to video aspect
    if (
      canvas.width !== video.videoWidth ||
      canvas.height !== video.videoHeight
    ) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    }

    if (lastVideoTimeRef.current !== video.currentTime) {
      lastVideoTimeRef.current = video.currentTime;
      const ts = performance.now();

      const poseResult = pose.detectForVideo(video, ts);
      const segResult = segmenter.segmentForVideo(video, ts);

      // Draw mirrored video first
      ctx.save();
      ctx.scale(-1, 1);
      ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
      ctx.restore();

      const landmarks = poseResult.landmarks?.[0];
      const mask = segResult.categoryMask;

      if (landmarks && fabricImgRef.current) {
        drawGarment(
          ctx,
          canvas.width,
          canvas.height,
          landmarks,
          fabricImgRef.current,
          garment,
          mask ? maskToImageData(mask, canvas.width, canvas.height) : null,
        );
      }

      if (mask) {
        mask.close();
      }
    }

    rafRef.current = requestAnimationFrame(loop);
  }, [garment]);

  // Helper: convert MP mask to ImageData (person pixels = alpha 255)
  function maskToImageData(
    mask: { getAsUint8Array: () => Uint8Array },
    w: number,
    h: number,
  ): ImageData | null {
    try {
      const arr = mask.getAsUint8Array();
      if (arr.length !== w * h) return null;
      const data = new Uint8ClampedArray(w * h * 4);
      for (let i = 0; i < arr.length; i++) {
        // MediaPipe selfie segmenter: 0 = person, 255 = background
        const isPerson = arr[i] === 0 ? 255 : 0;
        const j = i * 4;
        data[j] = data[j + 1] = data[j + 2] = isPerson;
        data[j + 3] = isPerson;
      }
      return new ImageData(data, w, h);
    } catch {
      return null;
    }
  }

  // Mirror x because video is mirrored (selfie view)
  function mx(x: number, w: number) {
    return w - x * w;
  }
  function my(y: number, h: number) {
    return y * h;
  }

  function drawGarment(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    lm: NormalizedLandmark[],
    fabricImg: HTMLImageElement,
    garmentKey: GarmentKey,
    personMask: ImageData | null,
  ) {
    // MediaPipe Pose landmark indices
    const LSHOULDER = 11;
    const RSHOULDER = 12;
    const LHIP = 23;
    const RHIP = 24;
    const LKNEE = 25;
    const RKNEE = 26;
    const LANKLE = 27;
    const RANKLE = 28;

    // Build off-screen canvas where we paint the garment shape filled with fabric
    if (!offCanvasRef.current) {
      offCanvasRef.current = document.createElement("canvas");
    }
    const off = offCanvasRef.current;
    off.width = w;
    off.height = h;
    const octx = off.getContext("2d");
    if (!octx) return;
    octx.clearRect(0, 0, w, h);

    // Build pattern from fabric texture
    const pattern = octx.createPattern(fabricImg, "repeat");
    if (!pattern) return;

    // Scale pattern so it tiles nicely
    const matrix = new DOMMatrix();
    matrix.scaleSelf(0.45, 0.45);
    pattern.setTransform(matrix);
    octx.fillStyle = pattern;

    // Helpers to get mirrored landmark coords in canvas pixels
    const p = (i: number) => ({ x: mx(lm[i].x, w), y: my(lm[i].y, h) });

    const ls = p(LSHOULDER);
    const rs = p(RSHOULDER);
    const lh = p(LHIP);
    const rh = p(RHIP);
    const lk = p(LKNEE);
    const rk = p(RKNEE);
    const la = p(LANKLE);
    const ra = p(RANKLE);

    // Pad outward so garment looks "loose"
    const shoulderPad = Math.abs(ls.x - rs.x) * 0.18;
    const hipPad = Math.abs(lh.x - rh.x) * 0.18;

    const TOP_NECK_OFFSET = -Math.abs(ls.y - lh.y) * 0.04;
    const COLLAR_HEIGHT = Math.abs(ls.y - lh.y) * 0.05;

    const drawTorso = (extendBelow: number) => {
      // Polygon: shoulders → expanded hips → expanded shoulders
      const slx = ls.x + shoulderPad;
      const srx = rs.x - shoulderPad;
      const sy = ls.y + TOP_NECK_OFFSET;
      const hlx = lh.x + hipPad;
      const hrx = rh.x - hipPad;
      const hy = (lh.y + rh.y) / 2 + extendBelow;

      octx.beginPath();
      // Start at top-left shoulder
      octx.moveTo(slx, sy);
      // Top: subtle V-neck
      octx.quadraticCurveTo(
        (slx + srx) / 2,
        sy + COLLAR_HEIGHT * 2,
        srx,
        sy,
      );
      // Right side down
      octx.quadraticCurveTo(srx + 5, (sy + hy) / 2, hrx, hy);
      // Bottom hem
      octx.lineTo(hlx, hy);
      // Left side up
      octx.quadraticCurveTo(slx - 5, (sy + hy) / 2, slx, sy);
      octx.closePath();
      octx.fill();
    };

    const drawSleeves = (sleeveLengthFrac: number) => {
      // Approx upper-arm via shoulder anchor; we don't have elbow points reliably so use shoulder + hip
      const armLen = Math.hypot(ls.x - lh.x, ls.y - lh.y) * sleeveLengthFrac;
      // Left sleeve
      drawSleeve(octx, ls.x + shoulderPad * 0.3, ls.y, armLen, "left");
      // Right sleeve
      drawSleeve(octx, rs.x - shoulderPad * 0.3, rs.y, armLen, "right");
    };

    function drawSleeve(
      c: CanvasRenderingContext2D,
      sx: number,
      sy: number,
      len: number,
      side: "left" | "right",
    ) {
      const dirX = side === "left" ? 1 : -1;
      const topW = Math.abs(ls.x - rs.x) * 0.18;
      const wristW = topW * 0.7;
      const tx = sx + dirX * len * 0.2;
      const ty = sy + len;
      c.beginPath();
      c.moveTo(sx - topW / 2, sy);
      c.lineTo(sx + topW / 2, sy);
      c.lineTo(tx + (dirX * wristW) / 2, ty);
      c.lineTo(tx - (dirX * wristW) / 2, ty);
      c.closePath();
      c.fill();
    }

    const drawPantsLegs = () => {
      const drawLeg = (
        hipP: { x: number; y: number },
        kneeP: { x: number; y: number },
        ankleP: { x: number; y: number },
      ) => {
        const upperW = Math.abs(lh.x - rh.x) * 0.42;
        const ankleW = upperW * 0.6;
        octx.beginPath();
        octx.moveTo(hipP.x - upperW / 2, hipP.y);
        octx.lineTo(hipP.x + upperW / 2, hipP.y);
        octx.quadraticCurveTo(
          kneeP.x + ankleW / 2,
          kneeP.y,
          ankleP.x + ankleW / 2,
          ankleP.y,
        );
        octx.lineTo(ankleP.x - ankleW / 2, ankleP.y);
        octx.quadraticCurveTo(
          kneeP.x - ankleW / 2,
          kneeP.y,
          hipP.x - upperW / 2,
          hipP.y,
        );
        octx.closePath();
        octx.fill();
      };
      drawLeg(lh, lk, la);
      drawLeg(rh, rk, ra);
    };

    // Compose by garment type
    if (garmentKey === "suit") {
      const hipMid = (lh.y + rh.y) / 2;
      const shoulderMid = (ls.y + rs.y) / 2;
      drawTorso((hipMid - shoulderMid) * 0.15);
      drawSleeves(1.0);
    } else if (garmentKey === "shirt") {
      drawTorso(0);
      drawSleeves(0.55);
    } else if (garmentKey === "thobe") {
      // Long flowing robe — extends down to ankles
      const ankleMid = (la.y + ra.y) / 2;
      const hipMid = (lh.y + rh.y) / 2;
      drawTorso(ankleMid - hipMid);
      drawSleeves(1.1);
    } else if (garmentKey === "pants") {
      drawPantsLegs();
    }

    // Now mask the garment by the person silhouette so it doesn't bleed onto background
    if (personMask) {
      const tmp = document.createElement("canvas");
      tmp.width = w;
      tmp.height = h;
      const tctx = tmp.getContext("2d");
      if (tctx) {
        tctx.putImageData(personMask, 0, 0);
        // Mirror the mask to match mirrored video
        const flipped = document.createElement("canvas");
        flipped.width = w;
        flipped.height = h;
        const fctx = flipped.getContext("2d");
        if (fctx) {
          fctx.translate(w, 0);
          fctx.scale(-1, 1);
          fctx.drawImage(tmp, 0, 0);
          octx.globalCompositeOperation = "destination-in";
          octx.drawImage(flipped, 0, 0);
          octx.globalCompositeOperation = "source-over";
        }
      }
    }

    // Composite garment onto main canvas with multiply for natural shading
    ctx.save();
    ctx.globalAlpha = 0.92;
    ctx.drawImage(off, 0, 0);
    ctx.restore();

    // Add subtle gold trim/highlights for premium look
    if (garmentKey === "suit") {
      ctx.strokeStyle = "rgba(212, 175, 55, 0.45)";
      ctx.lineWidth = 2;
      // Lapel V-line
      ctx.beginPath();
      const slx = ls.x + shoulderPad;
      const srx = rs.x - shoulderPad;
      const cx = (slx + srx) / 2;
      const sy = ls.y + TOP_NECK_OFFSET;
      const hipMid = (lh.y + rh.y) / 2;
      ctx.moveTo(slx, sy);
      ctx.quadraticCurveTo(cx, sy + 35, cx, hipMid);
      ctx.moveTo(srx, sy);
      ctx.quadraticCurveTo(cx, sy + 35, cx, hipMid);
      ctx.stroke();
    }
  }

  const takeSnapshot = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    setSnapshot(url);
  }, []);

  const downloadSnapshot = useCallback(() => {
    if (!snapshot) return;
    const a = document.createElement("a");
    a.href = snapshot;
    a.download = `shams-tex-${Date.now()}.png`;
    a.click();
  }, [snapshot]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      const v = videoRef.current;
      if (v?.srcObject) {
        (v.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
      }
      poseLandmarkerRef.current?.close();
      segmenterRef.current?.close();
    };
  }, []);

  return (
    <div
      dir="rtl"
      className="fixed inset-0 flex flex-col"
      style={{
        background: "#000",
      }}
    >
      {/* Header */}
      <header
        className="flex items-center justify-between px-4 pt-4 pb-2"
        style={{ zIndex: 30, position: "relative" }}
      >
        <div>
          <div
            className="text-[9px] tracking-[0.3em]"
            style={{ color: "#d4af37" }}
          >
            SHAMS TEX • شمس تكس
          </div>
          <h1
            className="text-xl font-bold leading-tight"
            style={{
              background:
                "linear-gradient(135deg, #f4d27a 0%, #d4af37 50%, #b8941f 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            تجربة القماش بالكاميرا
          </h1>
        </div>
        {status.kind === "live" && (
          <button
            onClick={() => setShowHelp((s) => !s)}
            className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{
              border: "1px solid #2a2418",
              background: "rgba(20, 16, 10, 0.7)",
              color: "#d4af37",
            }}
          >
            ?
          </button>
        )}
      </header>

      {/* Main view */}
      <div className="flex-1 relative overflow-hidden mx-3 rounded-2xl"
        style={{
          border: "1px solid #2a2418",
          background: "linear-gradient(180deg, #0a0806 0%, #050402 100%)",
        }}
      >
        <video
          ref={videoRef}
          playsInline
          muted
          style={{ display: "none" }}
        />
        <canvas
          ref={canvasRef}
          className="w-full h-full object-cover"
          style={{ display: status.kind === "live" ? "block" : "none" }}
        />

        {/* Idle / loading / error overlays */}
        {status.kind === "idle" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
            <div
              className="w-24 h-24 rounded-full flex items-center justify-center mb-6 text-5xl"
              style={{
                background:
                  "radial-gradient(circle, rgba(212,175,55,0.2) 0%, transparent 70%)",
                border: "2px solid #d4af37",
              }}
            >
              📸
            </div>
            <h2
              className="text-2xl font-bold mb-3"
              style={{ color: "#f4d27a" }}
            >
              جربها على نفسك
            </h2>
            <p className="text-sm mb-8" style={{ color: "#8a7a5c" }}>
              افتح الكاميرا، قف قدامها، واختار القماش<br />
              هتشوف القماشة على جسمك مباشرة
            </p>
            <button
              onClick={start}
              className="px-8 py-4 rounded-xl font-bold text-base"
              style={{
                background:
                  "linear-gradient(135deg, #d4af37 0%, #b8941f 100%)",
                color: "#0a0806",
                boxShadow: "0 8px 30px rgba(212, 175, 55, 0.4)",
              }}
            >
              📷 ابدأ التجربة
            </button>
            <p className="text-[10px] mt-6" style={{ color: "#5a4d35" }}>
              يحتاج إذن للكاميرا • يشتغل أوفلاين بعد التحميل
            </p>
          </div>
        )}

        {status.kind === "loading" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
            <div
              className="w-16 h-16 rounded-full mb-6 animate-spin"
              style={{
                border: "3px solid #2a2418",
                borderTopColor: "#d4af37",
              }}
            />
            <p style={{ color: "#d4af37" }}>{status.msg}</p>
            <p className="text-[10px] mt-2" style={{ color: "#5a4d35" }}>
              قد يأخذ 10-30 ثانية في أول مرة
            </p>
          </div>
        )}

        {status.kind === "error" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
            <div className="text-5xl mb-4">⚠️</div>
            <p className="text-sm mb-6" style={{ color: "#f4d27a" }}>
              {status.msg}
            </p>
            <button
              onClick={() => setStatus({ kind: "idle" })}
              className="px-6 py-3 rounded-xl font-bold"
              style={{
                background: "rgba(212, 175, 55, 0.15)",
                border: "1px solid #d4af37",
                color: "#d4af37",
              }}
            >
              إعادة المحاولة
            </button>
          </div>
        )}

        {/* Live: hint badge */}
        {status.kind === "live" && showHelp && (
          <div
            onClick={() => setShowHelp(false)}
            className="absolute top-3 left-3 right-3 px-4 py-2.5 rounded-xl text-xs text-center"
            style={{
              background: "rgba(10, 8, 4, 0.85)",
              border: "1px solid rgba(212, 175, 55, 0.4)",
              color: "#f4d27a",
              backdropFilter: "blur(10px)",
            }}
          >
            ✋ قف على بُعد متر تقريباً • اختر القماش والموديل من تحت
          </div>
        )}

        {/* Snapshot preview */}
        {snapshot && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.92)" }}
          >
            <img
              src={snapshot}
              alt="snapshot"
              className="max-h-[70%] rounded-xl"
              style={{ border: "1px solid #d4af37" }}
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={downloadSnapshot}
                className="px-5 py-3 rounded-xl font-bold"
                style={{
                  background:
                    "linear-gradient(135deg, #d4af37 0%, #b8941f 100%)",
                  color: "#0a0806",
                }}
              >
                💾 احفظ الصورة
              </button>
              <button
                onClick={() => setSnapshot(null)}
                className="px-5 py-3 rounded-xl font-bold"
                style={{
                  background: "rgba(212, 175, 55, 0.1)",
                  border: "1px solid #d4af37",
                  color: "#d4af37",
                }}
              >
                ✕ رجوع
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom controls (only when live) */}
      {status.kind === "live" && !snapshot && (
        <div className="px-3 pt-3 pb-4">
          {/* Fabric row */}
          <div className="flex gap-2 mb-3">
            {(Object.keys(FABRICS) as FabricKey[]).map((k) => {
              const f = FABRICS[k];
              const active = k === fabric;
              return (
                <button
                  key={k}
                  onClick={() => setFabric(k)}
                  className="flex-1 rounded-xl py-2 flex flex-col items-center transition-all"
                  style={{
                    border: `2px solid ${active ? "#d4af37" : "#2a2418"}`,
                    background: active
                      ? "rgba(212, 175, 55, 0.1)"
                      : "rgba(20, 16, 10, 0.5)",
                  }}
                >
                  <div
                    className="w-10 h-10 rounded-md mb-1"
                    style={{
                      backgroundImage: `url(${f.src})`,
                      backgroundSize: "cover",
                      boxShadow: active
                        ? "0 2px 10px rgba(212,175,55,0.4)"
                        : "none",
                    }}
                  />
                  <span
                    className="text-[10px]"
                    style={{ color: active ? "#d4af37" : "#7a6a4c" }}
                  >
                    {f.label}
                  </span>
                </button>
              );
            })}
          </div>
          {/* Garment row + snapshot */}
          <div className="flex gap-2 items-stretch">
            {(Object.keys(GARMENTS) as GarmentKey[]).map((k) => {
              const g = GARMENTS[k];
              const active = k === garment;
              return (
                <button
                  key={k}
                  onClick={() => setGarment(k)}
                  className="flex-1 rounded-xl py-2 flex flex-col items-center"
                  style={{
                    border: `1.5px solid ${active ? "#d4af37" : "#2a2418"}`,
                    background: active
                      ? "linear-gradient(180deg, rgba(212,175,55,0.15) 0%, rgba(212,175,55,0.03) 100%)"
                      : "rgba(20, 16, 10, 0.5)",
                  }}
                >
                  <span className="text-xl">{g.emoji}</span>
                  <span
                    className="text-[10px] mt-0.5"
                    style={{ color: active ? "#f4d27a" : "#7a6a4c" }}
                  >
                    {g.label}
                  </span>
                </button>
              );
            })}
            <button
              onClick={takeSnapshot}
              className="rounded-xl px-4 flex items-center justify-center"
              style={{
                background:
                  "linear-gradient(135deg, #d4af37 0%, #b8941f 100%)",
                color: "#0a0806",
                fontWeight: "bold",
                boxShadow: "0 4px 16px rgba(212, 175, 55, 0.35)",
              }}
            >
              📸
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
