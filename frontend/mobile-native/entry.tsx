import { createRoot } from "react-dom/client";
// Single source of truth: the SAME component the web /mobile route renders.
import StartaMobileApp from "../app/mobile/StartaMobileApp";

const el = document.getElementById("root");
if (el) {
  createRoot(el).render(<StartaMobileApp />);
}
