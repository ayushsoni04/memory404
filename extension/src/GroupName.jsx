import React from "react";

/** Group name that stays inside the save panel. The full name is on hover. */
export function GroupOptionName({ name }) {
  return (
    <span className="group-option-name" title={name}>
      {name}
    </span>
  );
}

/**
 * @param {{
 *   name: string,
 *   onMouseDown?: (event: { preventDefault: () => void }) => void,
 *   onClick: () => void,
 * }} props
 */
export function CreateGroupOption({ name, onMouseDown = () => {}, onClick }) {
  return (
    <button
      type="button"
      className="create-option"
      title={name}
      tabIndex={-1}
      onMouseDown={onMouseDown}
      onClick={onClick}
    >
      <span className="group-option-name">Create “{name}”</span>
    </button>
  );
}

export function CurrentGroupLine({ name }) {
  return (
    <p className="current-group" title={name}>
      In {name}
    </p>
  );
}
