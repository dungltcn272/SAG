import React from "react";
import {
  AbsoluteFill,
  Audio,
  Img,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import architectureImage from "../docs/assets/paper-sag-architecture.jpeg";
import benchmarkImage from "../docs/assets/sag-benchmark-simple.png";
import logoImage from "../docs/assets/logo.svg";

type SagExplainerProps = {
  voiceoverDir?: string;
  includeVoiceover?: boolean;
};

const palette = {
  ink: "#17202a",
  text: "#263241",
  muted: "#667085",
  line: "#d7dee9",
  paper: "#f7f8fb",
  white: "#ffffff",
  green: "#14976b",
  teal: "#05889b",
  coral: "#d45d49",
  amber: "#b7791f",
  blue: "#316bff",
  violet: "#6c4bd2",
  slate: "#354052",
};

const FPS = 30;

const scenes = {
  intro: {from: 0, duration: 540},
  question: {from: 540, duration: 600},
  ingestOverview: {from: 1140, duration: 840},
  ingestDetails: {from: 1980, duration: 900},
  searchFast: {from: 2880, duration: 840},
  searchMultiHop: {from: 3720, duration: 900},
  compare: {from: 4620, duration: 780},
  costLatency: {from: 5400, duration: 780},
  dbSchema: {from: 6180, duration: 1080},
  close: {from: 7260, duration: 540},
};

const voiceLines = [
  {
    from: 35,
    to: 360,
    text:
      "SAG là một cách tổ chức retrieval cho agent: vẫn giữ chunk để dẫn nguồn, nhưng thêm event và entity để tìm được đường đi giữa các mảnh thông tin.",
  },
  {
    from: 610,
    to: 1010,
    text:
      "RAG truyền thống thường hỏi: chunk nào giống query nhất? Cách này rẻ và đơn giản, nhưng khi câu trả lời nằm rải ở nhiều đoạn, hệ thống dễ lấy thiếu hoặc phải nhét rất nhiều context vào LLM.",
  },
  {
    from: 1200,
    to: 1700,
    text:
      "Trong ingest, SAG đọc Markdown hoặc TXT, tách section và chunk, embed chunk, rồi dùng LLM để rút ra một event hoàn chỉnh cùng các entity liên quan.",
  },
  {
    from: 2050,
    to: 2620,
    text:
      "Điểm quan trọng là vector không chỉ nằm ở chunk. SAG còn embed event title, event content, entity name và cả mô tả quan hệ event-entity. Vì vậy database vừa là kho quan hệ, vừa là vector store.",
  },
  {
    from: 2940,
    to: 3440,
    text:
      "Khi search ở fast mode, hệ thống không gọi LLM để tách entity trong query. Nó dùng full-text, fuzzy match và BM25-like search trên bảng entities, sau đó recall event liên quan.",
  },
  {
    from: 3780,
    to: 4380,
    text:
      "Với câu hỏi multi-hop, SAG có thể đi từ entity trong query đến event, từ event sang entity chung, rồi qua event khác. Cuối cùng nó rerank event và fetch chunk gốc để tạo citation.",
  },
  {
    from: 4680,
    to: 5200,
    text:
      "So với RAG, SAG tốn ingest hơn nhưng recall tốt hơn cho câu hỏi cần nối nhiều ý. So với Graph RAG nặng, SAG dùng graph nhẹ event-entity, dễ cập nhật hơn trên dữ liệu động.",
  },
  {
    from: 5460,
    to: 5960,
    text:
      "Trade-off thực tế: ingest có thêm LLM extraction và nhiều embedding, nhưng search có thể giảm nhiễu, giảm số chunk phải đưa vào prompt, và trace rõ từng bước latency.",
  },
  {
    from: 6240,
    to: 7040,
    text:
      "Thiết kế database xoay quanh sources, documents, sections, chunks, events, entities và event_entities. PostgreSQL cộng pgvector lưu cả dữ liệu nghiệp vụ, full-text index và vector HNSW trong cùng một nơi.",
  },
  {
    from: 7310,
    to: 7700,
    text:
      "Tóm lại: SAG trả chi phí trước để mua cấu trúc. Khi agent cần tìm bằng chứng chính xác qua nhiều bước, cấu trúc nhẹ này giúp tìm đúng sớm hơn và dễ debug hơn.",
  },
];

const voiceoverFiles = voiceLines.map((line, index) => ({
  from: line.from,
  fileName: `sag-vi-${String(index + 1).padStart(2, "0")}.mp3`,
}));

const titleStyle: React.CSSProperties = {
  margin: 0,
  color: palette.ink,
  fontFamily: "Inter, Arial, sans-serif",
  fontWeight: 840,
  letterSpacing: 0,
  lineHeight: 1.03,
};

const bodyStyle: React.CSSProperties = {
  margin: 0,
  color: palette.muted,
  fontFamily: "Inter, Arial, sans-serif",
  fontWeight: 560,
  letterSpacing: 0,
  lineHeight: 1.34,
};

const fade = (frame: number, start: number, duration = 22) =>
  interpolate(frame, [start, start + duration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

const slideUp = (frame: number, start: number) =>
  interpolate(frame, [start, start + 34], [34, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

const pulse = (frame: number, start: number) =>
  interpolate(Math.sin((frame - start) / 14), [-1, 1], [0.25, 0.82], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

const pop = (frame: number, delay: number) => {
  const {fps} = useVideoConfig();
  return spring({
    frame: frame - delay,
    fps,
    config: {damping: 18, stiffness: 130, mass: 0.82},
  });
};

const Caption: React.FC = () => {
  const frame = useCurrentFrame();
  const line = voiceLines.find((item) => frame >= item.from && frame <= item.to);

  if (!line) {
    return null;
  }

  return (
    <div
      style={{
        position: "absolute",
        left: 170,
        right: 170,
        bottom: 42,
        minHeight: 96,
        padding: "22px 34px",
        borderRadius: 8,
        background: "rgba(23,32,42,0.9)",
        color: palette.white,
        fontFamily: "Inter, Arial, sans-serif",
        fontSize: 31,
        fontWeight: 680,
        lineHeight: 1.28,
        textAlign: "center",
        boxShadow: "0 18px 48px rgba(23,32,42,0.18)",
      }}
    >
      {line.text}
    </div>
  );
};

const SceneShell: React.FC<{
  children: React.ReactNode;
  accent?: string;
  label?: string;
}> = ({children, accent = palette.green, label}) => (
  <AbsoluteFill style={{background: palette.paper}}>
    <div
      style={{
        position: "absolute",
        inset: 0,
        background:
          "linear-gradient(135deg, rgba(255,255,255,0.98), rgba(247,248,251,0.94))",
      }}
    />
    <div style={{position: "absolute", left: 0, top: 0, bottom: 0, width: 18, background: accent}} />
    {label ? (
      <div
        style={{
          position: "absolute",
          right: 62,
          top: 44,
          color: palette.muted,
          fontFamily: "Inter, Arial, sans-serif",
          fontSize: 24,
          fontWeight: 760,
          letterSpacing: 0,
        }}
      >
        {label}
      </div>
    ) : null}
    {children}
    <Caption />
  </AbsoluteFill>
);

const Header: React.FC<{title: string; subtitle: string; width?: number}> = ({title, subtitle, width = 1380}) => {
  const frame = useCurrentFrame();
  return (
    <div
      style={{
        position: "absolute",
        left: 118,
        top: 76,
        width,
        opacity: fade(frame, 0),
        transform: `translateY(${slideUp(frame, 0)}px)`,
      }}
    >
      <h2 style={{...titleStyle, fontSize: 61}}>{title}</h2>
      <p style={{...bodyStyle, marginTop: 18, width, fontSize: 31}}>{subtitle}</p>
    </div>
  );
};

const NodeBox: React.FC<{
  title: string;
  detail?: string;
  x: number;
  y: number;
  w?: number;
  h?: number;
  color: string;
  delay?: number;
  small?: boolean;
}> = ({title, detail, x, y, w = 250, h = 112, color, delay = 0, small = false}) => {
  const frame = useCurrentFrame();
  const scale = pop(frame, delay);

  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        height: h,
        padding: small ? "18px 20px" : "22px 24px",
        borderRadius: 8,
        background: palette.white,
        border: `4px solid ${color}`,
        boxShadow: "0 18px 44px rgba(23,32,42,0.1)",
        transform: `scale(${scale})`,
        transformOrigin: "50% 50%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          color: palette.ink,
          fontFamily: "Inter, Arial, sans-serif",
          fontSize: small ? 24 : 31,
          fontWeight: 820,
          lineHeight: 1.08,
          whiteSpace: "pre-line",
        }}
      >
        {title}
      </div>
      {detail ? (
        <div
          style={{
            marginTop: 10,
            color: palette.muted,
            fontFamily: "Inter, Arial, sans-serif",
            fontSize: small ? 19 : 22,
            fontWeight: 610,
            lineHeight: 1.2,
          }}
        >
          {detail}
        </div>
      ) : null}
    </div>
  );
};

const Arrow: React.FC<{
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color?: string;
  width?: number;
  delay?: number;
}> = ({x1, y1, x2, y2, color = palette.line, width = 5, delay = 0}) => {
  const frame = useCurrentFrame();
  const progress = fade(frame, delay, 26);
  const length = Math.hypot(x2 - x1, y2 - y1) * progress;
  const angle = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;

  return (
    <div
      style={{
        position: "absolute",
        left: x1,
        top: y1,
        width: length,
        height: width,
        background: color,
        transformOrigin: "0 50%",
        transform: `rotate(${angle}deg)`,
        borderRadius: 99,
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
          opacity: progress,
        }}
      />
    </div>
  );
};

const Callout: React.FC<{
  title: string;
  body: string;
  x: number;
  y: number;
  w: number;
  color: string;
  delay: number;
}> = ({title, body, x, y, w, color, delay}) => {
  const frame = useCurrentFrame();
  const opacity = fade(frame, delay);
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        padding: "24px 28px",
        borderRadius: 8,
        background: palette.white,
        borderLeft: `9px solid ${color}`,
        boxShadow: "0 18px 48px rgba(23,32,42,0.11)",
        opacity,
        transform: `translateY(${(1 - opacity) * 26}px)`,
      }}
    >
      <div style={{fontFamily: "Inter, Arial, sans-serif", color: palette.ink, fontSize: 30, fontWeight: 820}}>
        {title}
      </div>
      <div
        style={{
          marginTop: 12,
          fontFamily: "Inter, Arial, sans-serif",
          color: palette.muted,
          fontSize: 24,
          lineHeight: 1.28,
          fontWeight: 610,
        }}
      >
        {body}
      </div>
    </div>
  );
};

const Intro: React.FC = () => {
  const frame = useCurrentFrame();
  const start = scenes.intro.from;
  const entrance = pop(frame, start + 28);

  return (
    <SceneShell accent={palette.green} label="SAG explainer">
      <Img src={logoImage} style={{position: "absolute", left: 118, top: 86, width: 238, opacity: fade(frame, start + 10)}} />
      <div
        style={{
          position: "absolute",
          left: 120,
          top: 282,
          width: 850,
          opacity: entrance,
          transform: `translateY(${(1 - entrance) * 38}px)`,
        }}
      >
        <h1 style={{...titleStyle, fontSize: 102}}>SAG</h1>
        <h2 style={{...titleStyle, marginTop: 18, fontSize: 70}}>Graph retrieval nhẹ cho agent</h2>
        <p style={{...bodyStyle, marginTop: 30, width: 800, fontSize: 32}}>
          Không thay chunk bằng graph. SAG giữ chunk làm bằng chứng, rồi thêm event và entity để agent đi được qua nhiều bước suy luận.
        </p>
      </div>
      <div
        style={{
          position: "absolute",
          right: 100,
          top: 156,
          width: 770,
          height: 620,
          borderRadius: 8,
          overflow: "hidden",
          background: palette.white,
          boxShadow: "0 32px 88px rgba(23,32,42,0.18)",
          opacity: fade(frame, start + 90),
        }}
      >
        <Img src={architectureImage} style={{width: "100%", height: "100%", objectFit: "cover", transform: "scale(1.08)"}} />
      </div>
      <Callout
        title="Ý chính"
        body="document -> chunk -> event <-> entity -> multi-hop retrieval -> source chunk"
        x={120}
        y={778}
        w={980}
        color={palette.green}
        delay={start + 170}
      />
    </SceneShell>
  );
};

const Question: React.FC = () => {
  const frame = useCurrentFrame();
  const start = scenes.question.from;

  return (
    <SceneShell accent={palette.coral} label="1. Vì sao RAG dễ hụt?">
      <Header
        title="RAG truyền thống: mạnh nhưng dễ hụt multi-hop"
        subtitle="Nếu câu trả lời nằm ở nhiều chunk khác nhau, vector similarity phải may mắn kéo đủ bằng chứng về trong top-k."
      />
      <NodeBox title="Query" detail="Gói nào cho phép Cursor gọi search?" x={118} y={390} w={315} h={148} color={palette.blue} delay={start + 70} />
      <NodeBox title="Chunk 1" detail="SAG Pro có graph search và MCP integration" x={605} y={235} w={390} h={150} color={palette.line} delay={start + 125} />
      <NodeBox title="Chunk 2" detail="MCP integration cho phép Cursor gọi sag_search" x={605} y={495} w={390} h={150} color={palette.line} delay={start + 160} />
      <NodeBox title="Chunk 3" detail="Thông tin gần query nhưng không trả lời đủ" x={605} y={755} w={390} h={150} color={palette.line} delay={start + 195} />
      <NodeBox title="LLM context" detail="Top-k có thể thiếu một mắt xích" x={1280} y={500} w={390} h={150} color={palette.coral} delay={start + 250} />
      <Arrow x1={440} y1={462} x2={592} y2={308} color={palette.line} delay={start + 150} />
      <Arrow x1={440} y1={462} x2={592} y2={568} color={palette.line} delay={start + 180} />
      <Arrow x1={440} y1={462} x2={592} y2={828} color={palette.line} delay={start + 210} />
      <Arrow x1={1010} y1={570} x2={1268} y2={570} color={palette.coral} delay={start + 290} />
      <Callout
        title="Vấn đề"
        body="Tăng top-k giúp giảm miss, nhưng cũng tăng token, tăng độ trễ và đưa thêm nhiễu vào prompt."
        x={1168}
        y={236}
        w={560}
        color={palette.coral}
        delay={start + 320}
      />
    </SceneShell>
  );
};

const IngestOverview: React.FC = () => {
  const frame = useCurrentFrame();
  const start = scenes.ingestOverview.from;

  return (
    <SceneShell accent={palette.teal} label="2. Ingestion pipeline">
      <Header
        title="Ingest: biến tài liệu thành graph nhẹ"
        subtitle="Luồng đúng theo pipeline của repo: upload, chunk, embed, LLM extract event/entity, embed tiếp, rồi ghi PostgreSQL + pgvector."
      />
      <NodeBox title="Upload" detail="Markdown / TXT" x={76} y={395} w={230} color={palette.blue} delay={start + 70} />
      <NodeBox title="Chunking" detail="heading_strict hoặc token overlap" x={380} y={395} w={280} color={palette.amber} delay={start + 130} />
      <NodeBox title="Embed chunks" detail="source_chunks.embedding" x={736} y={250} w={310} color={palette.violet} delay={start + 190} />
      <NodeBox title="LLM extract" detail="1 event + nhiều entity mỗi chunk" x={736} y={540} w={310} color={palette.green} delay={start + 230} />
      <NodeBox title="Embed event" detail="title + content" x={1120} y={300} w={270} color={palette.green} delay={start + 290} />
      <NodeBox title="Embed entity" detail="entity.name" x={1120} y={500} w={270} color={palette.teal} delay={start + 330} />
      <NodeBox title="Embed relation" detail="event-entity edge" x={1120} y={700} w={270} color={palette.coral} delay={start + 370} />
      <NodeBox title={"PostgreSQL\n+ pgvector"} detail="tables + HNSW + full-text index" x={1460} y={500} w={355} color={palette.ink} delay={start + 430} />
      <Arrow x1={312} y1={450} x2={368} y2={450} delay={start + 120} />
      <Arrow x1={670} y1={450} x2={728} y2={322} delay={start + 200} />
      <Arrow x1={670} y1={450} x2={728} y2={612} delay={start + 240} />
      <Arrow x1={1056} y1={612} x2={1110} y2={370} delay={start + 310} />
      <Arrow x1={1056} y1={612} x2={1110} y2={570} delay={start + 350} />
      <Arrow x1={1056} y1={612} x2={1110} y2={770} delay={start + 390} />
      <Arrow x1={1404} y1={370} x2={1450} y2={553} delay={start + 450} />
      <Arrow x1={1404} y1={570} x2={1450} y2={570} delay={start + 450} />
      <Arrow x1={1404} y1={770} x2={1450} y2={595} delay={start + 450} />
      <Callout
        title="Không ném cả tài liệu vào một LLM call"
        body="Tài liệu dài được chia thành nhiều chunk nhỏ, có thể retry/cache/chạy song song theo concurrency."
        x={240}
        y={835}
        w={1340}
        color={palette.teal}
        delay={start + 520}
      />
    </SceneShell>
  );
};

const IngestDetails: React.FC = () => {
  const frame = useCurrentFrame();
  const start = scenes.ingestDetails.from;
  const rows = [
    ["source_chunks.embedding", "heading + content", "fallback vector search, citation context", palette.blue],
    ["events.title_embedding", "event.title", "recall event theo ý định query", palette.green],
    ["events.content_embedding", "event.title + content", "coarse rank event candidate", palette.green],
    ["entities.embedding", "entity.name", "match entity trong standard mode", palette.teal],
    ["event_entities.embedding", "relation description", "biểu diễn sắc thái event-entity", palette.coral],
  ];

  return (
    <SceneShell accent={palette.violet} label="3. Vector được lưu ở đâu?">
      <Header
        title="SAG không chỉ embed chunk"
        subtitle="Đây là phần làm SAG khác RAG thường: nhiều lớp vector phục vụ nhiều bước recall/rank khác nhau."
      />
      <div style={{position: "absolute", left: 120, top: 260, width: 1680}}>
        {rows.map(([name, source, use, color], index) => {
          const opacity = fade(frame, start + 90 + index * 72);
          return (
            <div
              key={name}
              style={{
                display: "grid",
                gridTemplateColumns: "455px 405px 1fr",
                alignItems: "center",
                gap: 24,
                marginBottom: 22,
                padding: "24px 28px",
                borderRadius: 8,
                background: palette.white,
                borderLeft: `10px solid ${color}`,
                boxShadow: "0 16px 38px rgba(23,32,42,0.09)",
                opacity,
                transform: `translateX(${(1 - opacity) * 36}px)`,
              }}
            >
              <div style={{fontFamily: "Consolas, monospace", fontSize: 26, fontWeight: 800, color: palette.ink}}>{name}</div>
              <div style={{fontFamily: "Inter, Arial, sans-serif", fontSize: 27, fontWeight: 740, color: palette.text}}>{source}</div>
              <div style={{fontFamily: "Inter, Arial, sans-serif", fontSize: 27, fontWeight: 620, color: palette.muted}}>{use}</div>
            </div>
          );
        })}
      </div>
      <Callout
        title="Công thức chi phí ingest"
        body="N chunks x (prompt extraction + token chunk + output event/entity) + embedding batches. Đắt hơn RAG thường, nhưng trả một lần cho dữ liệu được search nhiều lần."
        x={268}
        y={850}
        w={1380}
        color={palette.violet}
        delay={start + 520}
      />
    </SceneShell>
  );
};

const SearchFast: React.FC = () => {
  const frame = useCurrentFrame();
  const start = scenes.searchFast.from;

  return (
    <SceneShell accent={palette.blue} label="4. Search fast mode">
      <Header
        title="Fast mode: ít LLM hơn, nhanh hơn"
        subtitle="Fast mode không dùng LLM để tách entity từ query. Nó tận dụng full-text, trigram/fuzzy match và rerank model."
      />
      <NodeBox title="User query" detail="text gốc" x={92} y={420} w={250} color={palette.blue} delay={start + 70} />
      <NodeBox title="Query embedding" detail="phục vụ title/content vector" x={425} y={250} w={300} color={palette.violet} delay={start + 130} />
      <NodeBox title="Entity recall" detail="entities.search_text + trigram" x={425} y={570} w={300} color={palette.teal} delay={start + 170} />
      <NodeBox title="Seed events" detail="event_entities + title embedding" x={830} y={420} w={300} color={palette.green} delay={start + 230} />
      <NodeBox title="Expand graph" detail="event -> entity -> event" x={1215} y={420} w={300} color={palette.amber} delay={start + 290} />
      <NodeBox title="Rerank" detail="qwen3-rerank hoặc LLM fallback" x={1590} y={420} w={250} color={palette.coral} delay={start + 350} />
      <Arrow x1={352} y1={472} x2={415} y2={322} delay={start + 140} color={palette.blue} />
      <Arrow x1={352} y1={472} x2={415} y2={642} delay={start + 180} color={palette.blue} />
      <Arrow x1={738} y1={322} x2={820} y2={472} delay={start + 240} color={palette.violet} />
      <Arrow x1={738} y1={642} x2={820} y2={492} delay={start + 245} color={palette.teal} />
      <Arrow x1={1140} y1={480} x2={1204} y2={480} delay={start + 300} color={palette.green} />
      <Arrow x1={1528} y1={480} x2={1578} y2={480} delay={start + 360} color={palette.coral} />
      <Callout
        title="Fallback an toàn"
        body="Nếu không có seed event, SAG quay về vector search trên source_chunks.embedding để vẫn trả được context gần query."
        x={300}
        y={795}
        w={1320}
        color={palette.blue}
        delay={start + 440}
      />
    </SceneShell>
  );
};

const SearchMultiHop: React.FC = () => {
  const frame = useCurrentFrame();
  const start = scenes.searchMultiHop.from;
  const ring = pulse(frame, start);

  return (
    <SceneShell accent={palette.green} label="5. Ví dụ multi-hop">
      <Header
        title="Đi qua graph để nối hai mảnh thông tin"
        subtitle="Chunk gốc vẫn là bằng chứng cuối cùng, nhưng event/entity giúp hệ thống tìm đúng đường trước khi fetch chunk."
      />
      <NodeBox title="Entity: Cursor" x={120} y={430} w={245} color={palette.teal} delay={start + 90} />
      <NodeBox title="Event B" detail="MCP integration cho Cursor gọi sag_search" x={500} y={280} w={365} h={150} color={palette.green} delay={start + 150} />
      <NodeBox title="Entity: MCP integration" x={870} y={575} w={335} color={palette.teal} delay={start + 230} />
      <NodeBox title="Event A" detail="SAG Pro bao gồm MCP integration" x={1210} y={280} w={365} h={150} color={palette.green} delay={start + 310} />
      <NodeBox title="Answer" detail="Gói liên quan là SAG Pro" x={1500} y={575} w={285} color={palette.blue} delay={start + 410} />
      <Arrow x1={372} y1={482} x2={490} y2={360} delay={start + 170} color={palette.teal} />
      <Arrow x1={700} y1={440} x2={866} y2={620} delay={start + 250} color={palette.green} />
      <Arrow x1={1196} y1={620} x2={1212} y2={368} delay={start + 330} color={palette.teal} />
      <Arrow x1={1570} y1={440} x2={1570} y2={570} delay={start + 420} color={palette.green} />
      <div
        style={{
          position: "absolute",
          left: 470,
          top: 245,
          width: 1135,
          height: 500,
          borderRadius: 8,
          border: `7px solid rgba(20,151,107,${ring})`,
          pointerEvents: "none",
        }}
      />
      <Callout
        title="Trace sẽ cho thấy đường đi"
        body="queryEntities -> recalledEntities -> entityEventIds -> expandedEventIds -> coarseRankedEventIds -> rerankedEventIds -> source chunks"
        x={205}
        y={800}
        w={1510}
        color={palette.green}
        delay={start + 500}
      />
    </SceneShell>
  );
};

const Compare: React.FC = () => {
  const frame = useCurrentFrame();
  const start = scenes.compare.from;
  const rows = [
    ["RAG", "document -> chunks -> chunk vector", "Ingest rẻ, đơn giản", "Dễ miss khi cần nối nhiều chunk", palette.coral],
    ["Graph RAG", "ontology / graph nặng / relation sâu", "Có quan hệ rõ", "Tốn công xây graph, khó cập nhật dữ liệu động", palette.amber],
    ["SAG", "chunk -> event <-> entity", "Graph nhẹ, đủ cho retrieval multi-hop", "Ingest tốn hơn RAG do extraction", palette.green],
  ];

  return (
    <SceneShell accent={palette.amber} label="6. So sánh">
      <Header title="SAG nằm giữa RAG và Graph RAG nặng" subtitle="Mục tiêu không phải graph hoàn hảo, mà là cấu trúc vừa đủ để retrieval tốt hơn." />
      <div style={{position: "absolute", left: 115, top: 270, width: 1690}}>
        {rows.map(([name, shape, good, trade, color], index) => {
          const opacity = fade(frame, start + 90 + index * 80);
          return (
            <div
              key={name}
              style={{
                display: "grid",
                gridTemplateColumns: "235px 465px 415px 1fr",
                alignItems: "center",
                gap: 22,
                marginBottom: 28,
                padding: "30px 34px",
                borderRadius: 8,
                background: palette.white,
                border: `4px solid ${color}`,
                boxShadow: "0 18px 44px rgba(23,32,42,0.09)",
                opacity,
                transform: `translateY(${(1 - opacity) * 30}px)`,
              }}
            >
              <div style={{fontFamily: "Inter, Arial, sans-serif", color, fontSize: 47, fontWeight: 860}}>{name}</div>
              <div style={{fontFamily: "Consolas, monospace", color: palette.ink, fontSize: 25, fontWeight: 780}}>{shape}</div>
              <div style={{fontFamily: "Inter, Arial, sans-serif", color: palette.text, fontSize: 28, fontWeight: 730}}>{good}</div>
              <div style={{fontFamily: "Inter, Arial, sans-serif", color: palette.muted, fontSize: 27, fontWeight: 620}}>{trade}</div>
            </div>
          );
        })}
      </div>
    </SceneShell>
  );
};

const CostLatency: React.FC = () => {
  const frame = useCurrentFrame();
  const start = scenes.costLatency.from;
  const cards = [
    ["Chi phí ingest", "N * (prompt + chunk tokens + output) + nhiều batch embedding", palette.coral],
    ["Độ trễ ingest", "Phụ thuộc số chunk, latency model, concurrency và retry/rate limit", palette.amber],
    ["Chi phí search", "Fast mode giảm LLM call, rerank top candidates thay vì nhét quá nhiều chunk", palette.green],
    ["Quan sát được", "Trace từng bước giúp biết miss ở entity recall, expansion hay rerank", palette.blue],
  ];

  return (
    <SceneShell accent={palette.coral} label="7. Chi phí và latency">
      <Header
        title="Trade-off: đắt hơn lúc ingest, sạch hơn lúc search"
        subtitle="SAG đáng tiền khi dữ liệu có nhiều quan hệ chéo, được ingest một lần nhưng search nhiều lần."
      />
      <div style={{position: "absolute", left: 150, top: 275, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 34, width: 1620}}>
        {cards.map(([title, body, color], index) => {
          const opacity = fade(frame, start + 90 + index * 65);
          return (
            <div
              key={title}
              style={{
                height: 220,
                padding: "34px 38px",
                borderRadius: 8,
                background: palette.white,
                borderTop: `10px solid ${color}`,
                boxShadow: "0 18px 46px rgba(23,32,42,0.1)",
                opacity,
                transform: `translateY(${(1 - opacity) * 28}px)`,
              }}
            >
              <div style={{fontFamily: "Inter, Arial, sans-serif", color: palette.ink, fontSize: 40, fontWeight: 850}}>{title}</div>
              <div style={{marginTop: 18, fontFamily: "Inter, Arial, sans-serif", color: palette.muted, fontSize: 28, lineHeight: 1.28, fontWeight: 620}}>
                {body}
              </div>
            </div>
          );
        })}
      </div>
      <Callout
        title="Benchmark trong README"
        body="Average Recall@2: HippoRAG 2 = 68.14%, SAG = 79.30%. Nghĩa là agent có cơ hội chạm bằng chứng đúng sớm hơn."
        x={285}
        y={835}
        w={1350}
        color={palette.green}
        delay={start + 390}
      />
    </SceneShell>
  );
};

const TableCard: React.FC<{
  name: string;
  fields: string[];
  x: number;
  y: number;
  w: number;
  color: string;
  delay: number;
}> = ({name, fields, x, y, w, color, delay}) => {
  const frame = useCurrentFrame();
  const opacity = fade(frame, delay);
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        borderRadius: 8,
        background: palette.white,
        border: `3px solid ${color}`,
        boxShadow: "0 14px 34px rgba(23,32,42,0.1)",
        overflow: "hidden",
        opacity,
        transform: `translateY(${(1 - opacity) * 22}px)`,
      }}
    >
      <div
        style={{
          padding: "13px 18px",
          background: color,
          color: palette.white,
          fontFamily: "Consolas, monospace",
          fontSize: 23,
          fontWeight: 850,
        }}
      >
        {name}
      </div>
      <div style={{padding: "14px 18px"}}>
        {fields.map((field) => (
          <div key={field} style={{fontFamily: "Consolas, monospace", fontSize: 19, color: palette.text, lineHeight: 1.42, fontWeight: 650}}>
            {field}
          </div>
        ))}
      </div>
    </div>
  );
};

const DbSchema: React.FC = () => {
  const start = scenes.dbSchema.from;

  return (
    <SceneShell accent={palette.slate} label="8. DB schema">
      <Header
        title="Thiết kế DB: relational + vector trong PostgreSQL"
        subtitle="Không cần vector database riêng. PostgreSQL lưu project, document, graph nhẹ, full-text index và pgvector."
      />
      <TableCard name="sources" fields={["id PK", "tenant_id", "name", "metadata", "archived_at"]} x={90} y={305} w={260} color={palette.slate} delay={start + 80} />
      <TableCard name="documents" fields={["id PK", "source_id FK", "title", "status", "content"]} x={410} y={305} w={285} color={palette.blue} delay={start + 130} />
      <TableCard name="document_sections" fields={["id PK", "document_id FK", "heading", "raw_content", "token_count"]} x={755} y={305} w={330} color={palette.amber} delay={start + 180} />
      <TableCard name="source_chunks" fields={["id PK", "source_id FK", "document_id FK", "content", "embedding vector(1024)", "search_text tsvector"]} x={1145} y={305} w={345} color={palette.violet} delay={start + 230} />
      <TableCard name="events" fields={["id PK", "chunk_id FK", "title", "content", "title_embedding", "content_embedding"]} x={1145} y={585} w={345} color={palette.green} delay={start + 280} />
      <TableCard name="event_entities" fields={["id PK", "event_id FK", "entity_id FK", "weight", "embedding"]} x={755} y={600} w={330} color={palette.coral} delay={start + 330} />
      <TableCard name="entities" fields={["id PK", "source_id FK", "type", "normalized_name", "embedding", "search_text"]} x={410} y={575} w={285} color={palette.teal} delay={start + 380} />
      <TableCard name="ai_provider_settings" fields={["id = global", "embedding_model", "llm_model", "rerank config"]} x={1535} y={590} w={300} color={palette.ink} delay={start + 430} />
      <Arrow x1={350} y1={400} x2={398} y2={400} delay={start + 160} color={palette.line} width={4} />
      <Arrow x1={698} y1={400} x2={744} y2={400} delay={start + 210} color={palette.line} width={4} />
      <Arrow x1={1090} y1={400} x2={1134} y2={400} delay={start + 260} color={palette.line} width={4} />
      <Arrow x1={1320} y1={555} x2={1320} y2={575} delay={start + 310} color={palette.green} width={4} />
      <Arrow x1={1140} y1={682} x2={1095} y2={682} delay={start + 360} color={palette.coral} width={4} />
      <Arrow x1={744} y1={682} x2={706} y2={682} delay={start + 410} color={palette.teal} width={4} />
    </SceneShell>
  );
};

const Close: React.FC = () => {
  const frame = useCurrentFrame();
  const start = scenes.close.from;

  return (
    <SceneShell accent={palette.green} label="9. Kết luận">
      <Img
        src={benchmarkImage}
        style={{
          position: "absolute",
          left: 105,
          top: 155,
          width: 770,
          height: 625,
          objectFit: "contain",
          borderRadius: 8,
          background: palette.white,
          boxShadow: "0 28px 72px rgba(23,32,42,0.14)",
          opacity: fade(frame, start + 40),
        }}
      />
      <div style={{position: "absolute", right: 116, top: 170, width: 865, opacity: fade(frame, start + 90)}}>
        <h2 style={{...titleStyle, fontSize: 72}}>SAG = trả chi phí trước để mua đường đi</h2>
        <p style={{...bodyStyle, marginTop: 28, fontSize: 36}}>
          RAG hỏi chunk nào giống query. SAG hỏi thêm: entity nào liên quan, event nào nối với entity đó, và event nào khác có thể mở rộng qua entity chung.
        </p>
        <div style={{display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginTop: 44}}>
          <div style={{padding: 30, borderRadius: 8, background: palette.white, border: `4px solid ${palette.coral}`}}>
            <div style={{fontFamily: "Inter, Arial, sans-serif", color: palette.muted, fontSize: 28, fontWeight: 720}}>HippoRAG 2 Recall@2</div>
            <div style={{fontFamily: "Inter, Arial, sans-serif", color: palette.ink, fontSize: 60, fontWeight: 860}}>68.14%</div>
          </div>
          <div style={{padding: 30, borderRadius: 8, background: palette.white, border: `4px solid ${palette.green}`}}>
            <div style={{fontFamily: "Inter, Arial, sans-serif", color: palette.muted, fontSize: 28, fontWeight: 720}}>SAG Recall@2</div>
            <div style={{fontFamily: "Inter, Arial, sans-serif", color: palette.green, fontSize: 60, fontWeight: 860}}>79.30%</div>
          </div>
        </div>
      </div>
    </SceneShell>
  );
};

const SceneAt: React.FC<{
  from: number;
  duration: number;
  children: React.ReactNode;
}> = ({from, duration, children}) => {
  const frame = useCurrentFrame();
  if (frame < from || frame >= from + duration) {
    return null;
  }

  return <>{children}</>;
};

export const SagExplainer: React.FC<SagExplainerProps> = ({
  voiceoverDir = "voiceover",
  includeVoiceover = false,
}) => (
  <AbsoluteFill style={{fontFamily: "Inter, Arial, sans-serif"}}>
    {includeVoiceover
      ? voiceoverFiles.map((item) => (
          <Sequence from={item.from} key={item.fileName}>
            <Audio src={staticFile(`${voiceoverDir}/${item.fileName}`)} />
          </Sequence>
        ))
      : null}
    <SceneAt from={scenes.intro.from} duration={scenes.intro.duration}>
      <Intro />
    </SceneAt>
    <SceneAt from={scenes.question.from} duration={scenes.question.duration}>
      <Question />
    </SceneAt>
    <SceneAt from={scenes.ingestOverview.from} duration={scenes.ingestOverview.duration}>
      <IngestOverview />
    </SceneAt>
    <SceneAt from={scenes.ingestDetails.from} duration={scenes.ingestDetails.duration}>
      <IngestDetails />
    </SceneAt>
    <SceneAt from={scenes.searchFast.from} duration={scenes.searchFast.duration}>
      <SearchFast />
    </SceneAt>
    <SceneAt from={scenes.searchMultiHop.from} duration={scenes.searchMultiHop.duration}>
      <SearchMultiHop />
    </SceneAt>
    <SceneAt from={scenes.compare.from} duration={scenes.compare.duration}>
      <Compare />
    </SceneAt>
    <SceneAt from={scenes.costLatency.from} duration={scenes.costLatency.duration}>
      <CostLatency />
    </SceneAt>
    <SceneAt from={scenes.dbSchema.from} duration={scenes.dbSchema.duration}>
      <DbSchema />
    </SceneAt>
    <SceneAt from={scenes.close.from} duration={scenes.close.duration}>
      <Close />
    </SceneAt>
  </AbsoluteFill>
);
