// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import PasswordField from "../extension/src/PasswordField.jsx";

afterEach(() => {
  cleanup();
});

describe("extension password field", () => {
  it("shows and hides the password without submitting the form", () => {
    const onSubmit = vi.fn((event: { preventDefault: () => void }) => event.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <label htmlFor="m404-password">Password</label>
        <PasswordField
          id="m404-password"
          value="secret"
          onChange={() => {}}
        />
      </form>,
    );

    const input = screen.getByLabelText("Password");
    expect(input).toHaveAttribute("type", "password");
    const show = screen.getByRole("button", { name: "Show password" });
    expect(show).toHaveAttribute("type", "button");
    expect(show).toHaveAttribute("aria-pressed", "false");
    expect(show).toHaveTextContent("Show");

    fireEvent.click(show);
    expect(onSubmit).not.toHaveBeenCalled();
    expect(input).toHaveAttribute("type", "text");
    const hide = screen.getByRole("button", { name: "Hide password" });
    expect(hide).toHaveAttribute("aria-pressed", "true");
    expect(hide).toHaveTextContent("Hide");

    fireEvent.click(hide);
    expect(screen.getByLabelText("Password")).toHaveAttribute("type", "password");
  });

  it("is what the overlay sign-in form uses", () => {
    const overlay = readFileSync("extension/src/overlay.jsx", "utf8");
    expect(overlay).toContain("<PasswordField");
    expect(overlay).toContain('id="m404-password"');
    expect(overlay).not.toContain('id="m404-password"\n                  className="settings-input"');
    expect(readFileSync("extension/src/overlay-styles.css", "utf8")).toContain(".password-reveal");
  });

  it("ships the reveal control in the downloadable extension", () => {
    const zip = "public/downloads/memory404-extension.zip";
    const names = execFileSync("unzip", ["-Z1", zip], { encoding: "utf8" })
      .trim()
      .split("\n")
      .filter(Boolean);
    expect(names).toContain("overlay.js");
    expect(names).toContain("manifest.json");
    for (const name of names) {
      const packed = execFileSync("unzip", ["-p", zip, name]);
      expect(Buffer.compare(packed, readFileSync(`extension/dist/${name}`))).toBe(0);
    }
    const overlay = readFileSync("extension/dist/overlay.js", "utf8");
    expect(overlay).toContain("Show password");
    expect(overlay).toContain("Hide password");
    expect(readFileSync("extension/dist/manifest.json", "utf8")).toContain('"version": "0.2.22"');
  });
});
