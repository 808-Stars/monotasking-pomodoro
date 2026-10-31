import {createRoot} from "react-dom/client";
import {WikiApp} from "./WikiApp.tsx";
import "./wiki.css";

createRoot(document.getElementById("root")!).render(<WikiApp/>);
