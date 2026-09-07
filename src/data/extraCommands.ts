import type { Category, CommandDef } from "./commands";

const c = (name: string, fn: string, en: string, r: string): CommandDef => ({ name, fn, en, r });

/* فئة أضيفت حديثاً: الحركة والفيديو (Motion & Video) */
export const EXTRA_CATEGORIES: Category[] = [
  {
    id: "motion",
    en: "Motion / Video / Animation",
    title: "حركة وفيديو",
    icon: "film",
    kind: "visual",
    keywords: ["فيديو", "حركه", "انيميشن", "مشهد", "storyboard", "motion", "video", "animation", "clip"],
    top: ["motiongraphics", "keyvisual", "loop", "videostill", "kinetic", "frame"],
    commands: [
      c("motiongraphics", "رسم حركي (موشن جرافيك)", "Motion-graphics still / keyframe", "33332323"),
      c("keyvisual", "تصميم كي فيجوال رئيسي", "Key visual design", "33333333"),
      c("loop", "إطار حلقي قابل للتكرار", "Seamless loop frame", "33332323"),
      c("videostill", "لقطة ثابتة من فيديو", "Still frame from a video", "33333333"),
      c("kinetic", "تصميم حركي للنص", "Kinetic typography still", "33323323"),
      c("frame", "تأطير مشهد مخصص", "Custom scene framing", "33333333"),
      c("transition", "مفهوم انتقال بصري", "Visual transition concept", "33332323"),
      c("particle", "جزيئات وتأثيرات", "Particle effects frame", "33333233"),
    ],
  },
  {
    id: "immersive",
    en: "Immersive / 3D / AR",
    title: "تجارب غامرة وثلاثية الأبعاد",
    icon: "cube",
    kind: "visual",
    keywords: ["واقع معزز", "واقع افتراضي", "ثلاثي", "مجسم", "ar", "vr", "3d", "hologram", "immersive"],
    top: ["hologram", "vrscene", "aroverlay", "stereoscopic", "depthmap"],
    commands: [
      c("hologram", "هولوجرام ثلاثي الأبعاد", "Holographic 3D display", "33333223"),
      c("vrscene", "مشهد واقع افتراضي", "VR scene visualization", "33332223"),
      c("aroverlay", "تراكب واقع معزز", "AR overlay mockup", "33332323"),
      c("stereoscopic", "منظر مجسم (عينان)", "Stereoscopic view", "33332323"),
      c("depthmap", "خريطة عمق", "Depth map visualization", "33332323"),
      c("digitaltwin", "توأم رقمي للنظام", "Digital-twin system view", "33332323"),
    ],
  },
];
