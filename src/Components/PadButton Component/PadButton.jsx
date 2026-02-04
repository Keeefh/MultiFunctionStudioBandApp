import React from "react";
import "./PadButton.css"; 

export default function PadButton({keyChar, audioSrc, buttName, onClick}) {

  return (
    <button  onClick={onClick} className="pad-btn">
      <p>{buttName || "Empty"}</p>
      <p>{keyChar}</p>
    </button>
  )
}
