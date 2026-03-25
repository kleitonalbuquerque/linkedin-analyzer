import { describe, expect, it } from "vitest";

import { extractLinkedInProfileFromDocument } from "./profileExtraction";

describe("extractLinkedInProfileFromDocument", () => {
  it("captures headline, about and experience items from profile sections", () => {
    document.body.innerHTML = `
      <main>
        <h1>Kleiton Albuquerque</h1>
        <div class="text-body-medium break-words">Backend Engineer | Node.js | APIs</div>
        <ul>
          <li>Inicio</li>
          <li>Conexoes</li>
        </ul>
        <section id="about">
          <h2>Sobre</h2>
          <p>Engenheiro de software com foco em APIs, arquitetura backend e melhoria de performance.</p>
        </section>
        <section id="experience">
          <h2>Experiencia</h2>
          <ul>
            <li>Senior Backend Engineer na Empresa X liderando APIs e integracoes para 120 clientes.</li>
            <li>Software Engineer na Empresa Y com foco em Node.js, SQL e observabilidade.</li>
          </ul>
        </section>
      </main>
    `;

    expect(extractLinkedInProfileFromDocument(document)).toEqual({
      name: "Kleiton Albuquerque",
      headline: "Backend Engineer | Node.js | APIs",
      experiences: [
        "Engenheiro de software com foco em APIs, arquitetura backend e melhoria de performance.",
        "Senior Backend Engineer na Empresa X liderando APIs e integracoes para 120 clientes.",
        "Software Engineer na Empresa Y com foco em Node.js, SQL e observabilidade.",
      ],
    });
  });

  it("falls back gracefully when only the main identity is available", () => {
    document.body.innerHTML = `
      <main>
        <h1>Kleiton Albuquerque</h1>
        <div class="text-body-medium">Especialista em produto</div>
      </main>
    `;

    expect(extractLinkedInProfileFromDocument(document)).toEqual({
      name: "Kleiton Albuquerque",
      headline: "Especialista em produto",
      experiences: [],
    });
  });

  it("reads name and headline from the top card when the headline is split across hidden spans", () => {
    document.body.innerHTML = `
      <main>
        <section>
          <div class="pv-text-details__left-panel">
            <h1>Kleiton Albuquerque</h1>
            <div class="text-body-medium">
              <span aria-hidden="true">Staff Backend Engineer</span>
            </div>
            <div class="text-body-small">
              <span aria-hidden="true">500+ conexoes</span>
            </div>
          </div>
        </section>
      </main>
    `;

    expect(extractLinkedInProfileFromDocument(document)).toEqual({
      name: "Kleiton Albuquerque",
      headline: "Staff Backend Engineer",
      experiences: [],
    });
  });

  it("truncates oversized experience items to preserve layout quality", () => {
    const longText = "Senior Backend Engineer ".repeat(30);

    document.body.innerHTML = `
      <main>
        <h1>Kleiton Albuquerque</h1>
        <div class="text-body-medium break-words">Backend Engineer</div>
        <section id="experience">
          <h2>Experiencia</h2>
          <ul>
            <li>${longText}</li>
          </ul>
        </section>
      </main>
    `;

    const result = extractLinkedInProfileFromDocument(document);

    expect(result.experiences).toHaveLength(1);
    expect(result.experiences?.[0]?.endsWith("...")).toBe(true);
  });

  it("falls back to main content when there is no h1 container", () => {
    document.body.innerHTML = `
      <main>
        <div class="text-body-medium">Especialista em dados</div>
      </main>
    `;

    expect(extractLinkedInProfileFromDocument(document)).toEqual({
      name: "",
      headline: "Especialista em dados",
      experiences: [],
    });
  });

  it("returns an empty headline when the available text only repeats the name or follower metadata", () => {
    document.body.innerHTML = `
      <main>
        <section>
          <div>
            <h1>Kleiton Albuquerque</h1>
            <div class="text-body-medium">Kleiton Albuquerque · 500+ followers</div>
          </div>
        </section>
      </main>
    `;

    expect(extractLinkedInProfileFromDocument(document)).toEqual({
      name: "Kleiton Albuquerque",
      headline: "",
      experiences: [],
    });
  });

  it("returns an empty headline when the profile has no headline text at all", () => {
    document.body.innerHTML = `
      <main>
        <section>
          <div>
            <h1>Kleiton Albuquerque</h1>
          </div>
        </section>
      </main>
    `;

    expect(extractLinkedInProfileFromDocument(document)).toEqual({
      name: "Kleiton Albuquerque",
      headline: "",
      experiences: [],
    });
  });
});