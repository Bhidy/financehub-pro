import { createRoot } from "react-dom/client";
// Tailwind CSS utilities for WorldClassMessage, ChatCards, and MobileAiResponse.
// Without this import, all Tailwind classes are absent from the bundle and
// AI response cards render as invisible/unstyled plain HTML.
import "./mobile.css";
// Single source of truth: the SAME component the web /mobile route renders.
import StartaMobileApp from "../app/mobile/StartaMobileApp";

const el = document.getElementById("root");
if (el) {
  createRoot(el).render(<StartaMobileApp />);
}
