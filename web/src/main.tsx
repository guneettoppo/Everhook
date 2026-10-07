import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "./App";
import "./index.css";
import "./components/StarBorder.css";
import "./bits/SpotlightCard.css";
import "./bits/BorderGlow.css";
import "./bits/AnimatedList.css";
import "./bits/GradientText.css";
import "./bits/StarBorder.css";
import "./bits/SpecularButton.css";
import "./bits/DotGrid.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
