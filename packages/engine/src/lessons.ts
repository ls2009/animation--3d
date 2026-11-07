/**
 * Three built-in lessons. They are the engine's reference content: each must
 * validate with ZERO repairs (enforced by tests) and exercises every part of
 * the DSL — beats, narration, keyFacts, controls, checks and most step
 * actions. Authored against the schema input type; parsed once at import so
 * downstream code gets fully-defaulted Script objects.
 */
import { ScriptSchema, type Script, type ScriptInput } from "@sinaa/dsl";

const fourStrokeEngine: ScriptInput = {
  version: "1.0",
  title: "The four-stroke engine",
  language: "en",
  camera: { x: 14, y: 10, z: 26, look: { x: 0, y: 4, z: 0 } },
  actors: [
    { id: "cyl", prop: "engine-cylinder", label: "Cylinder", color: "f", x: 0, y: 0, z: 0, size: 8 },
    { id: "pis", prop: "piston", label: "Piston", color: "a", x: 0, y: 1, z: 0, size: 2.5 },
    { id: "vin", prop: "valve", label: "Intake valve", color: "b", x: -1.6, y: 8.4, z: 0, size: 1.6 },
    { id: "vex", prop: "valve", label: "Exhaust valve", color: "d", x: 1.6, y: 8.4, z: 0, size: 1.6 },
    { id: "spk", prop: "spark-plug", label: "Spark plug", color: "c", x: 0, y: 8.6, z: 0, size: 1.4 },
    { id: "crank", prop: "crankshaft", label: "Crankshaft", color: "e", x: 0, y: -1, z: 0, size: 2.2 },
    { id: "fuel", prop: "flask", label: "Fuel mix", color: "o", x: -8, y: 0, z: 2, size: 2.5 },
    { id: "exh", prop: "cloud", label: "Exhaust", color: "f", x: 8, y: 6, z: 1, size: 2, hidden: true },
  ],
  scenes: [
    {
      title: "Meet the engine",
      duration: 10,
      backdrop: "lab",
      beat: "The camera circles the cylinder so the learner sees piston, valves, spark plug and crankshaft as one connected machine",
      narration: [
        { t: 0, text: "This is one cylinder of a car engine. Almost every car on the road breathes through this exact dance." },
        { t: 5, text: "Piston below, two valves and a spark plug on top, crankshaft turning underneath." },
      ],
      keyFact: "One cylinder = piston + intake valve + exhaust valve + spark plug + crankshaft.",
      steps: [
        { action: "camera", t: 1, dur: 7, to: { x: -14, y: 9, z: 24 }, look: { x: 0, y: 4, z: 0 } },
        { action: "highlight", actor: "pis", t: 2, dur: 2 },
        { action: "highlight", actor: "vin", t: 4, dur: 2 },
        { action: "highlight", actor: "spk", t: 6, dur: 2 },
        { action: "rotate", actor: "crank", t: 1, dur: 8, axis: "z", turns: 2 },
      ],
    },
    {
      title: "Stroke 1: Intake",
      duration: 12,
      backdrop: "lab",
      beat: "The intake valve lifts open, the piston slides down, and fuel-air particles stream from the flask into the cylinder",
      narration: [
        { t: 0, text: "Stroke one: intake. The intake valve opens." },
        { t: 3, text: "The piston slides down, and that drop sucks a mist of fuel and air into the cylinder — like pulling back a syringe." },
      ],
      keyFact: "Intake: valve open, piston down, cylinder fills with fuel-air mix.",
      steps: [
        { action: "move", actor: "vin", t: 1, dur: 1.5, to: { x: -1.6, y: 9.4, z: 0 } },
        { action: "move", actor: "pis", t: 3, dur: 5, to: { x: 0, y: 1, z: 0 } },
        { action: "flow", from: "fuel", to: "cyl", t: 3, dur: 7, count: 10, shape: "drop", color: "o" },
        { action: "rotate", actor: "crank", t: 3, dur: 8, axis: "z", turns: 0.5 },
        { action: "move", actor: "vin", t: 10, dur: 1.5, to: { x: -1.6, y: 8.4, z: 0 } },
      ],
    },
    {
      title: "Stroke 2: Compression",
      duration: 10,
      backdrop: "lab",
      beat: "Both valves sit closed while the piston rises and squeezes the mixture into a small, highlighted space at the top",
      narration: [
        { t: 0, text: "Stroke two: compression. Both valves seal shut." },
        { t: 3, text: "The piston rises and squeezes the mixture into a tiny space. Squeezed fuel releases far more energy when it burns." },
      ],
      keyFact: "Compression: valves closed, piston up, mixture squeezed ~10x smaller.",
      steps: [
        { action: "move", actor: "pis", t: 2, dur: 4, to: { x: 0, y: 5.5, z: 0 } },
        { action: "highlight", actor: "cyl", t: 6, dur: 3 },
        { action: "rotate", actor: "crank", t: 2, dur: 6, axis: "z", turns: 0.5 },
        { action: "label", actor: "cyl", t: 6, text: "Mixture squeezed" },
      ],
    },
    {
      title: "Stroke 3: Power",
      duration: 12,
      backdrop: "lab",
      beat: "The spark plug flashes, the piston is driven down hard, and the crankshaft visibly accelerates — the only stroke that makes power",
      narration: [
        { t: 0, text: "Stroke three: power. The spark plug fires." },
        { t: 2, text: "The mixture explodes and slams the piston down. This is the only stroke that actually powers the car." },
        { t: 7, text: "The piston's shove is what spins the crankshaft — and the wheels." },
      ],
      keyFact: "Power: spark ignites the mix; the explosion drives the piston down. The other three strokes exist to serve this one.",
      steps: [
        { action: "pulse", actor: "spk", t: 1, dur: 1.5, scale: 1.8, times: 3 },
        { action: "highlight", actor: "spk", t: 1, dur: 2 },
        { action: "color", actor: "cyl", t: 1.5, dur: 1, to: "o" },
        { action: "move", actor: "pis", t: 2.5, dur: 2, to: { x: 0, y: 1, z: 0 } },
        { action: "rotate", actor: "crank", t: 2.5, dur: 8, axis: "z", turns: 1.5 },
        { action: "color", actor: "cyl", t: 6, dur: 2, to: "f" },
        { action: "shake", actor: "cyl", t: 2.5, dur: 1.5, amplitude: 0.25 },
      ],
    },
    {
      title: "Stroke 4: Exhaust",
      duration: 11,
      backdrop: "lab",
      beat: "The exhaust valve opens and the rising piston pushes a stream of burnt-gas particles out toward the exhaust cloud",
      narration: [
        { t: 0, text: "Stroke four: exhaust. The exhaust valve opens." },
        { t: 3, text: "The piston rises and sweeps the burnt gases out, leaving the cylinder empty and ready to start again." },
      ],
      keyFact: "Exhaust: exhaust valve open, piston up, burnt gas pushed out.",
      steps: [
        { action: "move", actor: "vex", t: 1, dur: 1.5, to: { x: 1.6, y: 9.4, z: 0 } },
        { action: "show", actor: "exh", t: 3, dur: 2 },
        { action: "move", actor: "pis", t: 3, dur: 4, to: { x: 0, y: 5.5, z: 0 } },
        { action: "flow", from: "cyl", to: "exh", t: 3, dur: 6, count: 10, shape: "sphere", color: "f" },
        { action: "rotate", actor: "crank", t: 3, dur: 7, axis: "z", turns: 0.5 },
        { action: "move", actor: "vex", t: 9, dur: 1.5, to: { x: 1.6, y: 8.4, z: 0 } },
      ],
    },
    {
      title: "Why it matters",
      duration: 10,
      backdrop: "lab",
      beat: "The whole cycle repeats quickly with the crankshaft spinning continuously while a counter tallies strokes — suck, squeeze, bang, blow",
      narration: [
        { t: 0, text: "Suck, squeeze, bang, blow — thousands of times a minute, in every cylinder." },
        { t: 5, text: "Slide the engine-speed control and watch the crankshaft respond. That spinning shaft is what your accelerator pedal really controls." },
      ],
      keyFact: "The four strokes repeat continuously; engine speed is just how fast this cycle runs.",
      steps: [
        { action: "camera", t: 1, dur: 5, to: { x: 16, y: 12, z: 30 }, look: { x: 0, y: 3, z: 0 } },
        { action: "rotate", actor: "crank", t: 1, dur: 9, axis: "z", turns: 6 },
        { action: "count", actor: "crank", t: 1, dur: 8, from: 1, to: 4, prefix: "stroke " },
        { action: "pulse", actor: "pis", t: 2, dur: 7, scale: 1.1, times: 6 },
      ],
    },
  ],
  controls: [
    {
      id: "rpm",
      label: "Engine speed",
      min: 500,
      max: 6000,
      default: 3000,
      binds: [{ actor: "crank", property: "speed" }],
    },
  ],
  checks: [
    {
      question: "Which stroke actually produces the power that moves the car?",
      options: ["Intake", "Compression", "Power", "Exhaust"],
      answer: 2,
      explain: "Only the power stroke pushes the piston with burning fuel; the other three prepare for it or clean up after it.",
    },
    {
      question: "Why is the mixture compressed before ignition?",
      options: [
        "To cool the fuel down",
        "Squeezed mixture releases far more energy when it burns",
        "To open the valves",
        "Compression is what ignites it in a petrol engine",
      ],
      answer: 1,
      explain: "Compressing the mix packs the same energy into a smaller space, so the burn pushes much harder on the piston.",
    },
    {
      question: "What is the piston doing during the intake stroke?",
      options: [
        "Moving down, drawing the mixture in",
        "Moving up, pushing exhaust out",
        "Holding still",
        "Moving up, squeezing the mixture",
      ],
      answer: 0,
      explain: "The descending piston grows the space above it, and the pressure drop pulls the fuel-air mix in through the open intake valve.",
    },
  ],
};

const photosynthesis: ScriptInput = {
  version: "1.0",
  title: "Photosynthesis: the leaf as a factory",
  language: "en",
  camera: { x: 12, y: 9, z: 26, look: { x: 0, y: 4, z: 0 } },
  actors: [
    { id: "leaf", prop: "leaf", label: "Leaf", color: "b", x: 0, y: 2, z: 0, size: 5 },
    { id: "sun", prop: "sun", label: "Sun", color: "c", x: -10, y: 11, z: -4, size: 3.5 },
    { id: "root", prop: "root", label: "Roots (water)", color: "e", x: -6, y: 0, z: 3, size: 2.5 },
    { id: "air", prop: "cloud", label: "Air (CO2)", color: "f", x: 8, y: 9, z: -2, size: 2.5 },
    { id: "sugar", prop: "apple", label: "Sugar store", color: "d", x: 6, y: 0, z: 4, size: 2, hidden: true },
    { id: "oxy", prop: "cloud", label: "Oxygen out", color: "g", x: 9, y: 4, z: 3, size: 2, hidden: true },
  ],
  scenes: [
    {
      title: "The quietest factory on Earth",
      duration: 10,
      backdrop: "nature",
      beat: "The camera closes in on a single large leaf standing between sun, air and roots, framing it as a factory with supply lines",
      narration: [
        { t: 0, text: "This leaf is a factory. No smoke, no noise — but it manufactures the sugar that feeds almost everything alive." },
        { t: 5, text: "Three supply lines feed it: sunlight, water from the roots, and carbon dioxide from the air." },
      ],
      keyFact: "A leaf is a sugar factory with three inputs: light, water, CO2.",
      steps: [
        { action: "camera", t: 1, dur: 6, to: { x: 6, y: 6, z: 18 }, look: { x: 0, y: 3, z: 0 } },
        { action: "highlight", actor: "leaf", t: 2, dur: 3 },
        { action: "pulse", actor: "sun", t: 5, dur: 3, scale: 1.2, times: 2 },
      ],
    },
    {
      title: "Ingredient 1: water from below",
      duration: 10,
      backdrop: "nature",
      beat: "Blue droplets stream from the roots up into the leaf, showing water arriving through the plant's plumbing",
      narration: [
        { t: 0, text: "First ingredient: water. The roots drink it from the soil." },
        { t: 3, text: "It climbs the stem through tiny pipes — no pump, just physics — and arrives inside the leaf." },
      ],
      keyFact: "Water enters at the roots and travels up to the leaf through xylem pipes.",
      steps: [
        { action: "highlight", actor: "root", t: 1, dur: 2 },
        { action: "flow", from: "root", to: "leaf", t: 2, dur: 7, count: 9, shape: "drop", color: "a" },
        { action: "label", actor: "root", t: 2, text: "Water up" },
      ],
    },
    {
      title: "Ingredient 2: carbon dioxide from the air",
      duration: 10,
      backdrop: "nature",
      beat: "Grey particles drift from the air cloud into the leaf through its pores, while the leaf breathes in",
      narration: [
        { t: 0, text: "Second ingredient: carbon dioxide — the gas we breathe out." },
        { t: 4, text: "It drifts in through thousands of microscopic mouths on the underside of the leaf, called stomata." },
      ],
      keyFact: "CO2 enters through stomata — microscopic pores on the leaf's underside.",
      steps: [
        { action: "highlight", actor: "air", t: 1, dur: 2 },
        { action: "flow", from: "air", to: "leaf", t: 2, dur: 7, count: 9, shape: "sphere", color: "f" },
        { action: "pulse", actor: "leaf", t: 3, dur: 5, scale: 1.08, times: 3 },
      ],
    },
    {
      title: "The power switch: sunlight",
      duration: 11,
      backdrop: "nature",
      beat: "Golden particles pour from the sun onto the leaf and the leaf glows — light is the energy that runs the factory",
      narration: [
        { t: 0, text: "Now the power switch: sunlight." },
        { t: 3, text: "Chlorophyll — the green pigment — captures light energy and uses it to snap water and carbon dioxide apart and rebuild them as sugar." },
        { t: 8, text: "Try the sunlight slider: more light, more energy arriving." },
      ],
      keyFact: "Chlorophyll captures light energy; that energy rebuilds water + CO2 into sugar.",
      steps: [
        { action: "flow", from: "sun", to: "leaf", t: 1, dur: 9, count: 12, shape: "sphere", color: "c" },
        { action: "highlight", actor: "leaf", t: 4, dur: 5 },
        { action: "color", actor: "leaf", t: 4, dur: 3, to: "#58d68d" },
      ],
    },
    {
      title: "What comes out",
      duration: 12,
      backdrop: "nature",
      beat: "Red sugar particles flow from the leaf to the fruit store while green oxygen particles stream out to the air, with a counter tallying sugar made",
      narration: [
        { t: 0, text: "Out of the factory come two products." },
        { t: 3, text: "Sugar — the plant's food and building material — is shipped off and stored, here in the fruit." },
        { t: 7, text: "And oxygen leaves as the exhaust. The plant's waste gas is the air you are breathing right now." },
      ],
      keyFact: "Outputs: sugar (the plant's food) and oxygen (released to the air).",
      steps: [
        { action: "show", actor: "sugar", t: 1, dur: 2 },
        { action: "show", actor: "oxy", t: 6, dur: 2 },
        { action: "flow", from: "leaf", to: "sugar", t: 2, dur: 8, count: 8, shape: "cube", color: "d" },
        { action: "flow", from: "leaf", to: "oxy", t: 6, dur: 6, count: 8, shape: "sphere", color: "g" },
        { action: "count", actor: "sugar", t: 2, dur: 8, from: 0, to: 6, suffix: " sugar" },
        { action: "grow", actor: "sugar", t: 4, dur: 6, to: 3 },
      ],
    },
    {
      title: "Why it matters",
      duration: 10,
      backdrop: "nature",
      beat: "The camera pulls back to show the whole supply chain at once — sun, water and CO2 in, sugar and oxygen out",
      narration: [
        { t: 0, text: "Every meal you have ever eaten started in a leaf like this — as sunlight, water and air, rebuilt into sugar." },
        { t: 5, text: "And the oxygen it exhales is what keeps you alive. The factory never asks for anything back." },
      ],
      keyFact: "Photosynthesis: light + water + CO2 → sugar + oxygen. It feeds nearly all life on Earth.",
      steps: [
        { action: "camera", t: 1, dur: 6, to: { x: 14, y: 10, z: 28 }, look: { x: 0, y: 4, z: 0 } },
        { action: "highlight", actor: "leaf", t: 3, dur: 4 },
        { action: "rotate", actor: "leaf", t: 2, dur: 7, axis: "y", turns: 1 },
      ],
    },
  ],
  controls: [
    {
      id: "light",
      label: "Sunlight",
      min: 0,
      max: 20,
      default: 10,
      binds: [{ actor: "sun", property: "count" }],
    },
  ],
  checks: [
    {
      question: "What does the leaf actually make from water and carbon dioxide?",
      options: ["Oxygen only", "Sugar (with oxygen as a by-product)", "Soil nutrients", "Chlorophyll"],
      answer: 1,
      explain: "The product is sugar — the plant's food. Oxygen is released as the by-product, not the goal.",
    },
    {
      question: "What role does sunlight play?",
      options: [
        "It is an ingredient that becomes part of the sugar",
        "It warms the leaf so water evaporates",
        "It supplies the energy that powers the rebuild of water and CO2 into sugar",
        "It opens the stomata",
      ],
      answer: 2,
      explain: "Light is the energy source, not a material: chlorophyll captures it to drive the chemical rebuild.",
    },
    {
      question: "Where does the oxygen a plant releases come from?",
      options: [
        "It is made fresh inside chlorophyll",
        "It is left over when water and CO2 are rebuilt into sugar",
        "The plant breathes it in at night",
        "It comes up from the roots",
      ],
      answer: 1,
      explain: "Oxygen is the leftover 'exhaust' of photosynthesis — atoms the sugar molecule didn't need.",
    },
  ],
};

const tcpHandshake: ScriptInput = {
  version: "1.0",
  title: "The TCP three-way handshake",
  language: "en",
  camera: { x: 0, y: 10, z: 30, look: { x: 0, y: 2, z: 0 } },
  actors: [
    { id: "client", prop: "laptop", label: "Client", color: "a", x: -10, y: 0, z: 0, size: 3 },
    { id: "server", prop: "server", label: "Server", color: "e", x: 10, y: 0, z: 0, size: 4 },
    { id: "syn", prop: "packet", label: "SYN", color: "c", x: -10, y: 0, z: 2, size: 1.4, hidden: true },
    { id: "synack", prop: "packet", label: "SYN-ACK", color: "b", x: 10, y: 0, z: 2, size: 1.4, hidden: true },
    { id: "ack", prop: "packet", label: "ACK", color: "g", x: -10, y: 0, z: 2, size: 1.4, hidden: true },
  ],
  scenes: [
    {
      title: "Two machines, no trust yet",
      duration: 10,
      backdrop: "space",
      beat: "A laptop and a server face each other across empty space; both are highlighted but nothing travels yet — no connection exists",
      narration: [
        { t: 0, text: "Before any web page loads, two machines that have never met must agree to talk." },
        { t: 5, text: "The internet loses and delays packets all the time, so they can't just assume the other side is listening." },
      ],
      keyFact: "TCP must establish a reliable connection over an unreliable network.",
      steps: [
        { action: "highlight", actor: "client", t: 1, dur: 2 },
        { action: "highlight", actor: "server", t: 4, dur: 2 },
        { action: "camera", t: 1, dur: 6, to: { x: 0, y: 7, z: 26 }, look: { x: 0, y: 2, z: 0 } },
      ],
    },
    {
      title: "Step 1: SYN",
      duration: 10,
      backdrop: "space",
      beat: "A single SYN packet appears at the laptop and travels all the way across to the server, which lights up on arrival",
      narration: [
        { t: 0, text: "Step one. The client sends a SYN — 'synchronize' — packet. It means: I want to talk, and here is my starting sequence number." },
        { t: 6, text: "The server now knows someone is calling." },
      ],
      keyFact: "SYN = the client asks to connect and shares its sequence number.",
      steps: [
        { action: "show", actor: "syn", t: 1, dur: 1 },
        { action: "move", actor: "syn", t: 2, dur: 5, to: { x: 10, y: 0, z: 2 } },
        { action: "highlight", actor: "server", t: 7, dur: 2 },
        { action: "hide", actor: "syn", t: 8, dur: 1.5 },
      ],
    },
    {
      title: "Step 2: SYN-ACK",
      duration: 10,
      backdrop: "space",
      beat: "A SYN-ACK packet travels back from the server to the laptop, which lights up on arrival — the server both answers and asks",
      narration: [
        { t: 0, text: "Step two. The server replies with a SYN-ACK: 'I hear you' — the ACK — 'and I want to talk too' — its own SYN." },
        { t: 6, text: "Now the client knows the server is real and listening." },
      ],
      keyFact: "SYN-ACK = the server confirms the client's request AND makes its own.",
      steps: [
        { action: "show", actor: "synack", t: 1, dur: 1 },
        { action: "move", actor: "synack", t: 2, dur: 5, to: { x: -10, y: 0, z: 2 } },
        { action: "highlight", actor: "client", t: 7, dur: 2 },
        { action: "hide", actor: "synack", t: 8, dur: 1.5 },
      ],
    },
    {
      title: "Step 3: ACK",
      duration: 10,
      backdrop: "space",
      beat: "A final ACK packet crosses from laptop to server and both machines glow together — the connection now exists on both sides",
      narration: [
        { t: 0, text: "Step three. The client sends a final ACK: 'I heard your answer.'" },
        { t: 4, text: "Why is this needed? Because until the server hears back, it can't know its reply ever arrived." },
        { t: 7, text: "Three messages, and now both sides KNOW the other can send and receive." },
      ],
      keyFact: "ACK = the client confirms the server's reply; both sides have now proven they can send AND receive.",
      steps: [
        { action: "show", actor: "ack", t: 1, dur: 1 },
        { action: "move", actor: "ack", t: 2, dur: 4, to: { x: 10, y: 0, z: 2 } },
        { action: "highlight", actor: "client", t: 6, dur: 3 },
        { action: "highlight", actor: "server", t: 6, dur: 3 },
        { action: "hide", actor: "ack", t: 7, dur: 1.5 },
      ],
    },
    {
      title: "Connected: data flows",
      duration: 11,
      backdrop: "space",
      beat: "A continuous stream of data packets flows between laptop and server in both directions — the payoff of the handshake",
      narration: [
        { t: 0, text: "Handshake done. Now — and only now — the real data flows: web pages, video, this very lesson." },
        { t: 5, text: "Slide the data-rate control to pump more packets through the open connection." },
      ],
      keyFact: "Only after the handshake does application data flow on the connection.",
      steps: [
        { action: "flow", from: "client", to: "server", t: 1, dur: 9, count: 10, shape: "cube", color: "a" },
        { action: "flow", from: "server", to: "client", t: 2, dur: 9, count: 10, shape: "cube", color: "e" },
        { action: "label", actor: "client", t: 1, text: "Client — connected" },
        { action: "label", actor: "server", t: 1, text: "Server — connected" },
      ],
    },
    {
      title: "Why three and not two?",
      duration: 12,
      backdrop: "space",
      beat: "The scene replays a two-message attempt: the server's reply is shaken and the server left dim and waiting, showing why the third message exists",
      narration: [
        { t: 0, text: "Could two messages be enough? Imagine the server's reply gets lost." },
        { t: 4, text: "With only two messages, the server would open a connection and wait forever for a client that never heard it." },
        { t: 8, text: "The third message protects the server. Each side only commits after hearing the other — that's the whole trick." },
      ],
      keyFact: "The third message exists so the SERVER gets proof its reply arrived; with two messages it could wait forever.",
      steps: [
        { action: "show", actor: "synack", t: 1, dur: 1 },
        { action: "move", actor: "synack", t: 2, dur: 3, to: { x: 0, y: 0, z: 2 } },
        { action: "shake", actor: "synack", t: 5, dur: 1.5, amplitude: 0.8 },
        { action: "hide", actor: "synack", t: 6.5, dur: 1 },
        { action: "color", actor: "server", t: 7, dur: 2, to: "f" },
        { action: "pulse", actor: "server", t: 9, dur: 2.5, scale: 1.12, times: 2 },
      ],
    },
  ],
  controls: [
    {
      id: "rate",
      label: "Data rate",
      min: 1,
      max: 30,
      default: 10,
      binds: [
        { actor: "client", property: "count" },
        { actor: "server", property: "count" },
      ],
    },
  ],
  checks: [
    {
      question: "What does the server's SYN-ACK accomplish?",
      options: [
        "It closes the connection",
        "It confirms the client's request and makes the server's own request in one message",
        "It sends the first web page data",
        "It asks the client to slow down",
      ],
      answer: 1,
      explain: "SYN-ACK does double duty: ACK answers the client's SYN, and the SYN half is the server's own request to talk.",
    },
    {
      question: "Why isn't a two-message handshake enough?",
      options: [
        "Two messages would be too slow",
        "The client would never learn the server's address",
        "The server would never get proof that its reply reached the client",
        "Packets can only travel in one direction at a time",
      ],
      answer: 2,
      explain: "Without the final ACK, a server whose reply was lost would hold a half-open connection forever.",
    },
    {
      question: "When can real application data start to flow?",
      options: [
        "Immediately with the first SYN",
        "After the SYN-ACK",
        "Only after all three handshake messages complete",
        "Whenever the router allows it",
      ],
      answer: 2,
      explain: "Both sides must have proof the other can send and receive — which takes all three messages.",
    },
  ],
};

export const BUILTIN_LESSONS: Script[] = [
  fourStrokeEngine,
  photosynthesis,
  tcpHandshake,
].map((lesson) => ScriptSchema.parse(lesson));
