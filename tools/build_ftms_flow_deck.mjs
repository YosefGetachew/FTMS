import fs from "node:fs/promises";
import path from "node:path";
import { Presentation, PresentationFile } from "@oai/artifact-tool";

const OUT = "D:/OneDrive/projects/FTMS/docs/FTMS_Travel_Workflow_Overview.pptx";
const PREVIEW = "C:/Users/yosef/AppData/Local/Temp/codex-presentations/ftms-user-manual-flow/preview";

const W = 1280;
const H = 720;
const ink = "#061A16";
const green = "#0B5D45";
const paleGreen = "#E7F5EF";
const amber = "#F59E0B";
const paleAmber = "#FFF4D6";
const paleRed = "#FCE8E8";
const rule = "#B8BCC4";
const panel = "#F3F6F8";

async function writeBlob(filePath, blob) {
  await fs.writeFile(filePath, new Uint8Array(await blob.arrayBuffer()));
}

function addText(slide, text, x, y, w, h, opts = {}) {
  const shape = slide.shapes.add({
    geometry: "textbox",
    position: { left: x, top: y, width: w, height: h },
    fill: "none",
    line: { style: "solid", fill: "none", width: 0 },
  });
  shape.text = text;
  shape.text.style = {
    fontSize: opts.size || 22,
    bold: Boolean(opts.bold),
    color: opts.color || ink,
    alignment: opts.align || "left",
  };
  return shape;
}

function addTitle(slide, title, kicker = "FTMS WORKFLOW") {
  addText(slide, kicker, 42, 36, 360, 28, { size: 16, bold: true, color: green });
  addText(slide, title, 42, 78, 1050, 92, { size: 48, bold: true });
  slide.shapes.add({
    geometry: "rect",
    position: { left: 42, top: 166, width: 1196, height: 1 },
    fill: rule,
    line: { style: "solid", fill: rule, width: 0 },
  });
}

function box(slide, text, x, y, w, h, opts = {}) {
  const shape = slide.shapes.add({
    geometry: "roundRect",
    position: { left: x, top: y, width: w, height: h },
    fill: opts.fill || "white",
    line: { style: "solid", fill: opts.line || "#D7DEE8", width: opts.width || 1 },
    borderRadius: "rounded-xl",
  });
  shape.text = text;
  shape.text.style = {
    fontSize: opts.size || 20,
    bold: opts.bold !== false,
    color: opts.color || ink,
    alignment: "center",
  };
  return shape;
}

function connect(slide, a, b, opts = {}) {
  slide.shapes.connect(a, b, {
    kind: opts.kind || "straight",
    fromSide: opts.fromSide || "right",
    toSide: opts.toSide || "left",
    line: { style: opts.style || "solid", fill: opts.fill || green, width: opts.width || 2 },
    tail: { type: "arrow", width: "med", length: "med" },
  });
}

function footer(slide, n) {
  addText(slide, `FTMS travel flow | ${n}`, 1080, 666, 160, 26, { size: 14, color: "#555555", align: "right" });
}

function buildDeck() {
  const presentation = Presentation.create({ slideSize: { width: W, height: H } });

  let slide = presentation.slides.add();
  slide.background.fill = "white";
  addText(slide, "Ministry of Agriculture", 42, 46, 560, 32, { size: 22, bold: true, color: green });
  addText(slide, "FTMS Travel Request Workflow", 42, 148, 940, 128, { size: 58, bold: true });
  addText(slide, "High-level flow for traveler submission, approval routing, protocol clearance, PM Office decision, and completion.", 44, 304, 730, 96, { size: 25, color: "#333333" });
  box(slide, "One system\nMultiple routes\nOne auditable decision path", 858, 214, 320, 210, { fill: paleGreen, line: "#B6E2CF", size: 25 });
  addText(slide, "Prepared as a working overview for FTMS users and decision makers.", 44, 594, 820, 42, { size: 19, color: "#555555" });
  footer(slide, 1);

  slide = presentation.slides.add();
  slide.background.fill = "white";
  addTitle(slide, "What FTMS Controls");
  const controls = [
    ["Users", "Traveler, approver, protocol, PM Office, admin"],
    ["Structures", "Sector, CEO, Office Head, Minister, projects, affiliates"],
    ["Requests", "Draft, submit, review, approve, reject, return"],
    ["Evidence", "Status timeline, notifications, reports, audit trail"],
  ];
  controls.forEach(([h, b], i) => {
    const x = 72 + i * 294;
    box(slide, h, x, 244, 244, 78, { fill: i % 2 ? panel : paleGreen, size: 28 });
    addText(slide, b, x + 16, 350, 212, 120, { size: 20, color: "#333333", align: "center" });
  });
  footer(slide, 2);

  slide = presentation.slides.add();
  slide.background.fill = "white";
  addTitle(slide, "Traveler Entry Paths");
  const entry = [
    ["Staff under Lead Executive", "Select sector/CEO/office and lead executive office"],
    ["Advisor", "Select advisor under Minister, CEO, Office Head, or Sector"],
    ["Project Staff", "Select project; parent structure is linked behind the scenes"],
    ["Affiliate Institute", "Select affiliate institution; DG is default approver"],
  ];
  entry.forEach(([h, b], i) => {
    const y = 220 + Math.floor(i / 2) * 180;
    const x = 92 + (i % 2) * 570;
    box(slide, h, x, y, 470, 62, { fill: paleGreen, line: "#B6E2CF", size: 23 });
    addText(slide, b, x + 18, y + 84, 434, 62, { size: 20, color: "#333333", align: "center" });
  });
  footer(slide, 3);

  slide = presentation.slides.add();
  slide.background.fill = "white";
  addTitle(slide, "Core MoA Staff Route");
  const a = box(slide, "Traveler\nsubmits", 72, 284, 146, 96, { fill: paleGreen });
  const b = box(slide, "Lead Executive\nreview", 268, 284, 168, 96, { fill: paleGreen });
  const c = box(slide, "State Minister\nor CEO", 486, 284, 168, 96, { fill: paleGreen });
  const d = box(slide, "Protocol\nclearance", 704, 284, 168, 96, { fill: paleAmber, line: "#F4C96B" });
  const e = box(slide, "Office Head\nfinal decision", 922, 284, 182, 96, { fill: paleGreen });
  const f = box(slide, "Completed\nor PM route", 1140, 284, 110, 96, { fill: panel, size: 18 });
  [a,b,c,d,e].forEach((node, i) => connect(slide, node, [b,c,d,e,f][i]));
  addText(slide, "When the traveler is also an approver, FTMS skips that user's own approval step and routes to the next valid approver.", 110, 468, 980, 52, { size: 22, color: "#333333", align: "center" });
  footer(slide, 4);

  slide = presentation.slides.add();
  slide.background.fill = "white";
  addTitle(slide, "Advisor and Project Routes");
  const adv = box(slide, "Advisor", 96, 258, 180, 78, { fill: paleGreen });
  const target = box(slide, "Parent approver\nState Minister / CEO\nor Protocol", 406, 226, 260, 140, { fill: paleGreen, size: 21 });
  const project = box(slide, "Project Staff", 96, 436, 180, 78, { fill: paleGreen });
  const coord = box(slide, "Project Coordinator", 406, 436, 260, 78, { fill: paleGreen, size: 21 });
  const protocol = box(slide, "Protocol\nclearance", 798, 314, 210, 94, { fill: paleAmber, line: "#F4C96B" });
  const final = box(slide, "Office Head\nfinal decision", 1084, 314, 154, 94, { fill: panel, size: 19 });
  connect(slide, adv, target);
  connect(slide, project, coord);
  connect(slide, target, protocol);
  connect(slide, coord, protocol);
  connect(slide, protocol, final);
  addText(slide, "Project coordinators do not approve their own travel. If they submit a request, FTMS forwards it to the next stage.", 96, 574, 990, 48, { size: 21, color: "#333333" });
  footer(slide, 5);

  slide = presentation.slides.add();
  slide.background.fill = "white";
  addTitle(slide, "Affiliate Institute Route");
  const af1 = box(slide, "Affiliate\nTraveler", 108, 292, 170, 94, { fill: paleGreen });
  const af2 = box(slide, "Director General\nreview", 384, 292, 206, 94, { fill: paleGreen });
  const af3 = box(slide, "Protocol\nclearance", 696, 292, 206, 94, { fill: paleAmber, line: "#F4C96B" });
  const af4 = box(slide, "Office Head\nfinal decision", 1008, 292, 206, 94, { fill: panel });
  connect(slide, af1, af2);
  connect(slide, af2, af3);
  connect(slide, af3, af4);
  addText(slide, "The Director General is the default approver for travelers under the affiliate institute. If the Director General is the traveler, the request moves forward and avoids self-approval.", 128, 470, 1020, 72, { size: 23, color: "#333333", align: "center" });
  footer(slide, 6);

  slide = presentation.slides.add();
  slide.background.fill = "white";
  addTitle(slide, "Protocol PM Decision Gate");
  const p1 = box(slide, "Protocol reviews\nall travelers", 96, 290, 230, 96, { fill: paleAmber, line: "#F4C96B" });
  const p2 = box(slide, "No PM approval\nrequired", 470, 218, 250, 88, { fill: paleGreen });
  const p3 = box(slide, "PM approval\nrequired", 470, 414, 250, 88, { fill: paleRed, line: "#F3B7B7" });
  const p4 = box(slide, "Office Head\nor Minister", 860, 218, 250, 88, { fill: panel });
  const p5 = box(slide, "PM Office\nsubmission/follow-up", 860, 414, 250, 88, { fill: panel, size: 21 });
  connect(slide, p1, p2, { fromSide: "right", toSide: "left" });
  connect(slide, p1, p3, { fromSide: "right", toSide: "left" });
  connect(slide, p2, p4);
  connect(slide, p3, p5);
  footer(slide, 7);

  slide = presentation.slides.add();
  slide.background.fill = "white";
  addTitle(slide, "Office Head Final Options");
  const oh = box(slide, "Head of the\nMinister's Office", 110, 312, 250, 96, { fill: paleGreen });
  const approve = box(slide, "Approve", 510, 210, 180, 70, { fill: paleGreen });
  const reject = box(slide, "Reject", 510, 330, 180, 70, { fill: paleRed, line: "#F3B7B7" });
  const minister = box(slide, "Forward to\nMinister with note", 510, 450, 220, 80, { fill: panel, size: 21 });
  const done = box(slide, "Completed\nor PM route", 890, 210, 220, 70, { fill: panel, size: 21 });
  const decision = box(slide, "Minister\ndecision", 890, 450, 220, 80, { fill: panel });
  connect(slide, oh, approve);
  connect(slide, oh, reject);
  connect(slide, oh, minister);
  connect(slide, approve, done);
  connect(slide, minister, decision);
  footer(slide, 8);

  slide = presentation.slides.add();
  slide.background.fill = "white";
  addTitle(slide, "Status, Notifications, and Reports");
  const status1 = box(slide, "Green\ncompleted", 92, 250, 220, 96, { fill: paleGreen });
  const status2 = box(slide, "Amber\ncurrent", 390, 250, 220, 96, { fill: paleAmber, line: "#F4C96B" });
  const status3 = box(slide, "Light red\nupcoming", 688, 250, 220, 96, { fill: paleRed, line: "#F3B7B7" });
  const status4 = box(slide, "Dotted\noptional path", 986, 250, 220, 96, { fill: panel });
  addText(slide, "Timeline shows approver names, approval dates, current-stage reached date, and pending days.", 112, 426, 1000, 42, { size: 23, color: "#333333", align: "center" });
  addText(slide, "Reports show monthly approved travel, MoA vs Affiliate travel, MoA sectors, Affiliate organizations, and funding patterns.", 112, 510, 1000, 58, { size: 23, color: "#333333", align: "center" });
  footer(slide, 9);

  return presentation;
}

async function main() {
  await fs.mkdir(path.dirname(OUT), { recursive: true });
  await fs.mkdir(PREVIEW, { recursive: true });
  const presentation = buildDeck();
  for (const [index, slide] of presentation.slides.items.entries()) {
    const stem = `slide-${String(index + 1).padStart(2, "0")}`;
    await writeBlob(path.join(PREVIEW, `${stem}.png`), await presentation.export({ slide, format: "png", scale: 1 }));
    const layout = await slide.export({ format: "layout" });
    await fs.writeFile(path.join(PREVIEW, `${stem}.layout.json`), await layout.text());
  }
  await writeBlob(path.join(PREVIEW, "deck-montage.webp"), await presentation.export({ format: "webp", montage: true, scale: 1 }));
  const pptx = await PresentationFile.exportPptx(presentation);
  await pptx.save(OUT);
  console.log(OUT);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
