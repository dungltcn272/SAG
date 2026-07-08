import React from "react";
import {
  AbsoluteFill,
  Img,
  Sequence,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import benchmarkImage from "../docs/assets/sag-benchmark-simple.png";
import logoImage from "../docs/assets/logo.svg";
import architectureImage from "../docs/assets/paper-sag-architecture.jpeg";

const palette = {
  ink: "#18202a",
  muted: "#667085",
  line: "#d6dde8",
  paper: "#f7f8fb",
  white: "#ffffff",
  green: "#0f9f6e",
  teal: "#008c9e",
  coral: "#d45d49",
  amber: "#b7791f",
  blue: "#316bff",
};

const scenes = {
  intro: {from: 0, duration: 450},
  ragProblem: {from: 450, duration: 540},
  ingestion: {from: 990, duration: 690},
  search: {from: 1680, duration: 780},
  compare: {from: 2460, duration: 570},
  cost: {from: 3030, duration: 570},
  close: {from: 3600, duration: 600},
};

const scriptLines = [
  {
    from: 40,
    to: 270,
    text: "SAG la mot cach truy hoi cho agent: khong chi tim chunk gan nhat, ma to chuc tri thuc thanh event va entity.",
  },
  {
    from: 520,
    to: 780,
    text: "RAG truyen thong thuong hoi: chunk nao giong query nhat? Cau hoi multi-hop de bi miss vi bang chung nam o nhieu noi.",
  },
  {
    from: 1030,
    to: 1350,
    text: "Khi ingest, SAG tach document thanh chunk, rut ra mot event hoan chinh, lay cac entity, roi luu quan he event-entity.",
  },
  {
    from: 1710,
    to: 2090,
    text: "Khi search, query co the bat dau tu entity, recall event, mo rong qua graph nhe, rerank, roi lay chunk goc lam citation.",
  },
  {
    from: 2480,
    to: 2850,
    text: "Khac Graph RAG nang: SAG khong can ontology phuc tap. No giu cau truc vua du de di multi-hop tren du lieu dong.",
  },
  {
    from: 3070,
    to: 3430,
    text: "Trade-off cot loi: ingest ton hon vi co LLM extraction va nhieu embedding, doi lai search it context rac hon va co trace ro hon.",
  },
  {
    from: 3630,
    to: 4100,
    text: "Trong benchmark doc du an, Recall@2 trung binh tang tu 68.14% len 79.30% so voi HippoRAG 2: agent tim dung bang chung som hon.",
  },
];

const fade = (frame: number, start: number, duration = 24) =>
  interpolate(frame, [start, start + duration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

const sceneProgress = (frame: number, from: number, duration: number) =>
  interpolate(frame, [from, from + duration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

const pop = (frame: number, delay: number) => {
  const {fps} = useVideoConfig();
  return spring({
    frame: frame - delay,
    fps,
    config: {damping: 18, stiffness: 140, mass: 0.8},
  });
};

const titleStyle: React.CSSProperties = {
  margin: 0,
  color: palette.ink,
  fontFamily: "Inter, Arial, sans-serif",
  fontSize: 94,
  fontWeight: 820,
  lineHeight: 1.02,
  letterSpacing: 0,
};

const subtitleStyle: React.CSSProperties = {
  margin: 0,
  color: palette.muted,
  fontFamily: "Inter, Arial, sans-serif",
  fontSize: 34,
  fontWeight: 500,
  lineHeight: 1.35,
  letterSpacing: 0,
};

const Caption: React.FC = () => {
  const frame = useCurrentFrame();
  const line = scriptLines.find((item) => frame >= item.from && frame <= item.to);
  if (!line) {
    return null;
  }

  return (
    <div
      style={{
        position: "absolute",
        left: 220,
        right: 220,
        bottom: 56,
        padding: "24px 34px",
        borderRadius: 8,
        background: "rgba(24,32,42,0.88)",
        color: palette.white,
        fontFamily: "Inter, Arial, sans-serif",
        fontSize: 34,
        lineHeight: 1.28,
        fontWeight: 650,
        textAlign: "center",
      }}
    >
      {line.text}
    </div>
  );
};

const SceneShell: React.FC<{children: React.ReactNode; accent?: string}> = ({
  children,
  accent = palette.green,
}) => (
  <AbsoluteFill style={{background: palette.paper}}>
    <div
      style={{
        position: "absolute",
        inset: 0,
        background:
          "linear-gradient(135deg, rgba(255,255,255,0.96), rgba(247,248,251,0.92))",
      }}
    />
    <div
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        bottom: 0,
        width: 18,
        background: accent,
      }}
    />
    {children}
    <Caption />
  </AbsoluteFill>
);

const Pill: React.FC<{
  label: string;
  color: string;
  x: number;
  y: number;
  scale?: number;
}> = ({label, color, x, y, scale = 1}) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: y,
      minWidth: 210,
      padding: "22px 30px",
      borderRadius: 8,
      background: palette.white,
      border: `4px solid ${color}`,
      boxShadow: "0 18px 44px rgba(24,32,42,0.12)",
      color: palette.ink,
      fontFamily: "Inter, Arial, sans-serif",
      fontSize: 33,
      fontWeight: 780,
      textAlign: "center",
      transform: `scale(${scale})`,
    }}
  >
    {label}
  </div>
);

const Arrow: React.FC<{x1: number; y1: number; x2: number; y2: number; color?: string}> = ({
  x1,
  y1,
  x2,
  y2,
  color = palette.line,
}) => {
  const length = Math.hypot(x2 - x1, y2 - y1);
  const angle = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
  return (
    <div
      style={{
        position: "absolute",
        left: x1,
        top: y1,
        width: length,
        height: 5,
        background: color,
        transformOrigin: "0 50%",
        transform: `rotate(${angle}deg)`,
      }}
    >
      <div
        style={{
          position: "absolute",
          right: -2,
          top: -8,
          width: 0,
          height: 0,
          borderTop: "10px solid transparent",
          borderBottom: "10px solid transparent",
          borderLeft: `18px solid ${color}`,
        }}
      />
    </div>
  );
};

const Intro: React.FC = () => {
  const frame = useCurrentFrame();
  const entrance = pop(frame, 20);
  return (
    <SceneShell accent={palette.green}>
      <Img
        src={logoImage}
        style={{
          position: "absolute",
          left: 128,
          top: 90,
          width: 230,
          opacity: fade(frame, 10),
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 130,
          top: 270,
          width: 920,
          transform: `translateY(${(1 - entrance) * 38}px)`,
          opacity: entrance,
        }}
      >
        <h1 style={titleStyle}>SAG</h1>
        <p style={{...titleStyle, fontSize: 74, marginTop: 14}}>
          Retrieval graph nhe cho agent
        </p>
        <p style={{...subtitleStyle, marginTop: 34, width: 840}}>
          Tu document thanh chunk, event, entity va relation de tim bang chung
          multi-hop nhanh hon, gon hon, de debug hon.
        </p>
      </div>
      <Img
        src={architectureImage}
        style={{
          position: "absolute",
          right: 104,
          top: 188,
          width: 690,
          height: 610,
          objectFit: "cover",
          borderRadius: 8,
          boxShadow: "0 34px 90px rgba(24,32,42,0.18)",
          opacity: fade(frame, 80),
          transform: `translateX(${(1 - fade(frame, 80)) * 42}px)`,
          scale: 1.228
        }}
      />
    </SceneShell>
  );
};

const RagProblem: React.FC = () => {
  const frame = useCurrentFrame();
  const p = sceneProgress(frame, scenes.ragProblem.from, scenes.ragProblem.duration);
  return (
    <SceneShell accent={palette.coral}>
      <div style={{position: "absolute", left: 120, top: 94, width: 1200}}>
        <h2 style={{...titleStyle, fontSize: 66}}>Van de cua RAG truyen thong</h2>
        <p style={{...subtitleStyle, marginTop: 22}}>
          Vector similarity tot cho fact gan, nhung yeu khi cau tra loi can noi 2-3 manh thong tin.
        </p>
      </div>
      <Pill label="Query" color={palette.blue} x={132} y={380} scale={pop(frame, scenes.ragProblem.from + 40)} />
      <Pill label="Chunk A" color={palette.line} x={620} y={250} scale={pop(frame, scenes.ragProblem.from + 95)} />
      <Pill label="Chunk B" color={palette.line} x={620} y={520} scale={pop(frame, scenes.ragProblem.from + 120)} />
      <Pill label="Chunk C" color={palette.line} x={620} y={790} scale={pop(frame, scenes.ragProblem.from + 145)} />
      <Pill label="LLM context" color={palette.coral} x={1260} y={520} scale={pop(frame, scenes.ragProblem.from + 200)} />
      <Arrow x1={374} y1={430} x2={610} y2={306} color={palette.line} />
      <Arrow x1={374} y1={430} x2={610} y2={576} color={palette.line} />
      <Arrow x1={374} y1={430} x2={610} y2={846} color={palette.line} />
      <Arrow x1={865} y1={579} x2={1250} y2={579} color={palette.coral} />
      <div
        style={{
          position: "absolute",
          right: 130,
          top: 245,
          width: 520,
          color: palette.ink,
          fontFamily: "Inter, Arial, sans-serif",
          fontSize: 38,
          lineHeight: 1.32,
          fontWeight: 760,
          opacity: interpolate(p, [0.46, 0.62], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp"}),
        }}
      >
        Nhieu chunk hon khong dong nghia dung hon. Nhieu khi chi lam context nhieu nhieu hon.
      </div>
    </SceneShell>
  );
};

const Ingestion: React.FC = () => {
  const frame = useCurrentFrame();
  const start = scenes.ingestion.from;
  return (
    <SceneShell accent={palette.teal}>
      <div style={{position: "absolute", left: 120, top: 82}}>
        <h2 style={{...titleStyle, fontSize: 64}}>Ingest: tra chi phi de mua cau truc</h2>
        <p style={{...subtitleStyle, marginTop: 20, width: 1280}}>
          Moi chunk tao mot event day du y nghia, entity lam diem neo, relation tao duong di.
        </p>
      </div>
      <Pill label="Document" color={palette.blue} x={110} y={425} scale={pop(frame, start + 30)} />
      <Pill label="Chunks" color={palette.amber} x={430} y={425} scale={pop(frame, start + 90)} />
      <Pill label="Event" color={palette.green} x={790} y={425} scale={pop(frame, start + 150)} />
      <Pill label="Entities" color={palette.teal} x={1140} y={300} scale={pop(frame, start + 210)} />
      <Pill label="Relations" color={palette.coral} x={1140} y={560} scale={pop(frame, start + 240)} />
      <Pill label="Postgres + pgvector" color={palette.ink} x={1510} y={425} scale={pop(frame, start + 300)} />
      <Arrow x1={348} y1={480} x2={418} y2={480} color={palette.line} />
      <Arrow x1={675} y1={480} x2={780} y2={480} color={palette.line} />
      <Arrow x1={1018} y1={470} x2={1130} y2={366} color={palette.line} />
      <Arrow x1={1018} y1={500} x2={1130} y2={626} color={palette.line} />
      <Arrow x1={1390} y1={366} x2={1500} y2={467} color={palette.line} />
      <Arrow x1={1390} y1={626} x2={1500} y2={500} color={palette.line} />
      <div
        style={{
          position: "absolute",
          left: 268,
          bottom: 185,
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          gap: 18,
          width: 1380,
        }}
      >
        {[
          "source_chunks.embedding",
          "events.title_embedding",
          "events.content_embedding",
          "entities.embedding",
          "event_entities.embedding",
        ].map((item, index) => (
          <div
            key={item}
            style={{
              padding: "20px 18px",
              borderRadius: 8,
              border: `3px solid ${palette.line}`,
              background: palette.white,
              color: palette.ink,
              fontFamily: "Consolas, monospace",
              fontSize: 24,
              fontWeight: 700,
              opacity: fade(frame, start + 330 + index * 18),
            }}
          >
            {item}
          </div>
        ))}
      </div>
    </SceneShell>
  );
};

const Search: React.FC = () => {
  const frame = useCurrentFrame();
  const start = scenes.search.from;
  const glow = interpolate(Math.sin((frame - start) / 18), [-1, 1], [0.25, 0.72]);
  return (
    <SceneShell accent={palette.blue}>
      <div style={{position: "absolute", left: 120, top: 82}}>
        <h2 style={{...titleStyle, fontSize: 64}}>Search: di theo duong entity-event</h2>
        <p style={{...subtitleStyle, marginTop: 20, width: 1350}}>
          Fast mode dung full-text/BM25 entity recall; standard mode them LLM de tach entity trong query.
        </p>
      </div>
      <Pill label="Query" color={palette.blue} x={130} y={472} scale={pop(frame, start + 40)} />
      <Pill label="Entity" color={palette.teal} x={486} y={318} scale={pop(frame, start + 100)} />
      <Pill label="Event B" color={palette.green} x={838} y={318} scale={pop(frame, start + 160)} />
      <Pill label="Entity chung" color={palette.teal} x={838} y={610} scale={pop(frame, start + 220)} />
      <Pill label="Event A" color={palette.green} x={1190} y={318} scale={pop(frame, start + 280)} />
      <Pill label="Chunks + citations" color={palette.ink} x={1455} y={472} scale={pop(frame, start + 340)} />
      <Arrow x1={370} y1={520} x2={476} y2={385} color={palette.blue} />
      <Arrow x1={730} y1={374} x2={828} y2={374} color={palette.green} />
      <Arrow x1={968} y1={434} x2={966} y2={600} color={palette.teal} />
      <Arrow x1={1088} y1={664} x2={1210} y2={434} color={palette.teal} />
      <Arrow x1={1435} y1={374} x2={1446} y2={520} color={palette.green} />
      <div
        style={{
          position: "absolute",
          left: 468,
          top: 300,
          width: 1000,
          height: 430,
          borderRadius: 8,
          border: `6px solid rgba(15,159,110,${glow})`,
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 190,
          bottom: 152,
          width: 1540,
          padding: "28px 34px",
          borderRadius: 8,
          background: palette.white,
          border: `3px solid ${palette.line}`,
          fontFamily: "Inter, Arial, sans-serif",
          color: palette.ink,
          fontSize: 34,
          lineHeight: 1.3,
          fontWeight: 700,
          opacity: fade(frame, start + 390),
        }}
      >
        Vi du: Cursor -&gt; Event MCP -&gt; MCP integration -&gt; Event SAG Pro -&gt; "goi nao cho phep Cursor goi search?"
      </div>
    </SceneShell>
  );
};

const Compare: React.FC = () => {
  const frame = useCurrentFrame();
  const rows = [
    ["RAG", "Re hon khi ingest", "De miss multi-hop", palette.coral],
    ["Graph RAG", "Quan he sau hon", "Nang, kho cap nhat", palette.amber],
    ["SAG", "Graph nhe event-entity", "Hop du lieu dong", palette.green],
  ];
  return (
    <SceneShell accent={palette.amber}>
      <div style={{position: "absolute", left: 120, top: 82}}>
        <h2 style={{...titleStyle, fontSize: 64}}>SAG dung o giua</h2>
        <p style={{...subtitleStyle, marginTop: 20, width: 1250}}>
          Khong phai chi vector search, cung khong can knowledge graph nang.
        </p>
      </div>
      <div style={{position: "absolute", left: 160, top: 270, width: 1600}}>
        {rows.map(([name, good, trade, color], index) => (
          <div
            key={name}
            style={{
              display: "grid",
              gridTemplateColumns: "300px 1fr 1fr",
              alignItems: "center",
              gap: 24,
              marginBottom: 28,
              padding: "34px 38px",
              borderRadius: 8,
              background: palette.white,
              border: `4px solid ${color}`,
              boxShadow: "0 18px 42px rgba(24,32,42,0.09)",
              opacity: fade(frame, scenes.compare.from + 80 + index * 70),
              transform: `translateY(${(1 - fade(frame, scenes.compare.from + 80 + index * 70)) * 30}px)`,
            }}
          >
            <div style={{fontFamily: "Inter, Arial, sans-serif", fontSize: 48, fontWeight: 840, color}}>
              {name}
            </div>
            <div style={{fontFamily: "Inter, Arial, sans-serif", fontSize: 34, fontWeight: 730, color: palette.ink}}>
              {good}
            </div>
            <div style={{fontFamily: "Inter, Arial, sans-serif", fontSize: 34, fontWeight: 650, color: palette.muted}}>
              {trade}
            </div>
          </div>
        ))}
      </div>
    </SceneShell>
  );
};

const Cost: React.FC = () => {
  const frame = useCurrentFrame();
  const start = scenes.cost.from;
  return (
    <SceneShell accent={palette.coral}>
      <div style={{position: "absolute", left: 120, top: 82}}>
        <h2 style={{...titleStyle, fontSize: 64}}>Chi phi va do tre</h2>
        <p style={{...subtitleStyle, marginTop: 20, width: 1280}}>
          SAG khong mien phi. No doi chi phi ingest cao hon de search co cau truc hon.
        </p>
      </div>
      <div style={{position: "absolute", left: 165, top: 292, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 36, width: 1580}}>
        {[
          ["Ingest tang", "LLM extract event/entity + embedding chunk/event/entity/relation.", palette.coral],
          ["Search giam nhieu", "Fast mode tranh LLM tach query, dung BM25 + graph expansion + rerank.", palette.green],
          ["Latency ro rang", "Trace ghi entity recall, event recall, expansion, coarse rank, rerank.", palette.blue],
          ["Khi nao dang tien", "Du lieu nhieu quan he cheo, ingest mot lan, search nhieu lan.", palette.teal],
        ].map(([head, body, color], index) => (
          <div
            key={head}
            style={{
              height: 230,
              padding: "34px 38px",
              borderRadius: 8,
              background: palette.white,
              borderTop: `9px solid ${color}`,
              boxShadow: "0 18px 44px rgba(24,32,42,0.1)",
              opacity: fade(frame, start + 60 + index * 50),
            }}
          >
            <div style={{fontFamily: "Inter, Arial, sans-serif", fontSize: 42, fontWeight: 820, color: palette.ink}}>
              {head}
            </div>
            <div style={{fontFamily: "Inter, Arial, sans-serif", fontSize: 31, lineHeight: 1.28, fontWeight: 610, color: palette.muted, marginTop: 18}}>
              {body}
            </div>
          </div>
        ))}
      </div>
    </SceneShell>
  );
};

const Close: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <SceneShell accent={palette.green}>
      <Img
        src={benchmarkImage}
        style={{
          position: "absolute",
          left: 110,
          top: 150,
          width: 760,
          height: 640,
          objectFit: "contain",
          borderRadius: 8,
          background: palette.white,
          boxShadow: "0 28px 70px rgba(24,32,42,0.14)",
          opacity: fade(frame, scenes.close.from + 40),
        }}
      />
      <div
        style={{
          position: "absolute",
          right: 120,
          top: 180,
          width: 850,
          opacity: fade(frame, scenes.close.from + 110),
        }}
      >
        <h2 style={{...titleStyle, fontSize: 72}}>Ket luan</h2>
        <p style={{...subtitleStyle, marginTop: 28, fontSize: 38}}>
          SAG giu chunk lam bang chung, dung event/entity de tim duong. Khi cau hoi can noi nhieu mau thong tin, cau truc nhe nay giup agent recall dung som hon.
        </p>
        <div
          style={{
            marginTop: 52,
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 26,
          }}
        >
          <div style={{padding: 32, borderRadius: 8, background: palette.white, border: `4px solid ${palette.green}`}}>
            <div style={{fontFamily: "Inter, Arial, sans-serif", fontSize: 30, fontWeight: 700, color: palette.muted}}>HippoRAG 2 Recall@2</div>
            <div style={{fontFamily: "Inter, Arial, sans-serif", fontSize: 64, fontWeight: 860, color: palette.ink}}>68.14%</div>
          </div>
          <div style={{padding: 32, borderRadius: 8, background: palette.white, border: `4px solid ${palette.blue}`}}>
            <div style={{fontFamily: "Inter, Arial, sans-serif", fontSize: 30, fontWeight: 700, color: palette.muted}}>SAG Recall@2</div>
            <div style={{fontFamily: "Inter, Arial, sans-serif", fontSize: 64, fontWeight: 860, color: palette.blue}}>79.30%</div>
          </div>
        </div>
      </div>
    </SceneShell>
  );
};

export const SagExplainer: React.FC = () => {
  return (
    <AbsoluteFill style={{fontFamily: "Inter, Arial, sans-serif"}}>
      <Sequence from={scenes.intro.from} durationInFrames={scenes.intro.duration}>
        <Intro />
      </Sequence>
      <Sequence from={scenes.ragProblem.from} durationInFrames={scenes.ragProblem.duration}>
        <RagProblem />
      </Sequence>
      <Sequence from={scenes.ingestion.from} durationInFrames={scenes.ingestion.duration}>
        <Ingestion />
      </Sequence>
      <Sequence from={scenes.search.from} durationInFrames={scenes.search.duration}>
        <Search />
      </Sequence>
      <Sequence from={scenes.compare.from} durationInFrames={scenes.compare.duration}>
        <Compare />
      </Sequence>
      <Sequence from={scenes.cost.from} durationInFrames={scenes.cost.duration}>
        <Cost />
      </Sequence>
      <Sequence from={scenes.close.from} durationInFrames={scenes.close.duration}>
        <Close />
      </Sequence>
    </AbsoluteFill>
  );
};
