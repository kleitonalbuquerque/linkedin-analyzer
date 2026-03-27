import { beforeEach, describe, expect, it } from "vitest";

import {
  extractLinkedInProfileFromDocument,
  isLikelyExternalHeadline,
  isMetadataHeadline,
} from "./profileExtraction";

describe("extractLinkedInProfileFromDocument", () => {
  beforeEach(() => {
    document.title = "";
    document.body.innerHTML = "";
  });

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

  it("normalizes decomposed unicode from the page into readable text", () => {
    document.body.innerHTML = `
      <main>
        <h1>Kleiton Na&#771;o</h1>
        <div class="text-body-medium break-words">Desenvolvedor com integrac&#807;a&#771;o e ac&#807;a&#771;o</div>
      </main>
    `;

    expect(extractLinkedInProfileFromDocument(document)).toEqual({
      name: "Kleiton Não",
      headline: "Desenvolvedor com integração e ação",
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

  it("ignores numeric-only headline fragments and falls back to the document title", () => {
    document.title = "Kleiton Albuquerque - Frontend Engineer | LinkedIn";
    document.body.innerHTML = `
      <main>
        <section>
          <div>
            <div class="text-body-medium">719</div>
          </div>
        </section>
      </main>
    `;

    expect(extractLinkedInProfileFromDocument(document)).toEqual({
      name: "Kleiton Albuquerque",
      headline: "Frontend Engineer",
      experiences: [],
    });
  });

  it("uses section headings when about and experience ids are absent", () => {
    document.body.innerHTML = `
      <main>
        <section>
          <div>
            <h1>Kleiton Albuquerque</h1>
            <div class="text-body-medium">Backend Engineer</div>
          </div>
        </section>
        <section>
          <h2>About</h2>
          <p>Profissional com foco em Node.js, arquitetura de APIs e integrações complexas.</p>
        </section>
        <section>
          <h2>Experience</h2>
          <ul>
            <li>Desenvolveu integrações e automações para múltiplos clientes enterprise.</li>
          </ul>
        </section>
      </main>
    `;

    expect(extractLinkedInProfileFromDocument(document)).toEqual({
      name: "Kleiton Albuquerque",
      headline: "Backend Engineer",
      experiences: [
        "Profissional com foco em Node.js, arquitetura de APIs e integrações complexas.",
        "Desenvolveu integrações e automações para múltiplos clientes enterprise.",
      ],
    });
  });

  it("returns an empty headline when the title has no usable role fallback", () => {
    document.title = "Kleiton Albuquerque | LinkedIn";
    document.body.innerHTML = `
      <main>
        <section>
          <div>
            <div class="text-body-medium">719</div>
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

  it("treats comment counters as invalid headline metadata", () => {
    expect(isLikelyExternalHeadline("")).toBe(false);
    expect(isMetadataHeadline("LIVE")).toBe(true);
    expect(isMetadataHeadline("1 comentário")).toBe(true);
    expect(isMetadataHeadline("42 comments")).toBe(true);
    expect(isMetadataHeadline("68 compartilhamentos")).toBe(true);
    expect(isMetadataHeadline("99 shares")).toBe(true);
    expect(isMetadataHeadline("Backend Engineer")).toBe(false);
    expect(isLikelyExternalHeadline("SRE Pleno (SP16101308)")).toBe(true);
    expect(isLikelyExternalHeadline("A sociedade do desempenho, o ego e os adultos infantilizados no poder - Migalhas")).toBe(true);
    expect(isLikelyExternalHeadline('Por Que "Soft Skills" Não Significa Nada E O Que Usar no Lugar')).toBe(true);
    expect(isLikelyExternalHeadline("Como escalar plataformas: lições práticas para engenharia moderna")).toBe(true);
    expect(isLikelyExternalHeadline("Full Stack Engineer | React | Node.js | Java")).toBe(false);
  });

  it("ignores comment metadata and falls back to the title headline", () => {
    document.title = "Kleiton Albuquerque - Software Engineer | LinkedIn";
    document.body.innerHTML = `
      <main>
        <section>
          <div>
            <h1>Kleiton Albuquerque</h1>
            <div class="text-body-medium">1 comentário</div>
          </div>
        </section>
      </main>
    `;

    expect(extractLinkedInProfileFromDocument(document)).toEqual({
      name: "Kleiton Albuquerque",
      headline: "Software Engineer",
      experiences: [],
    });
  });

  it("ignores the LinkedIn LIVE badge and falls back to the title headline", () => {
    document.title = "Kleiton Albuquerque - Software Engineer | LinkedIn";
    document.body.innerHTML = `
      <main>
        <section>
          <div>
            <h1>Kleiton Albuquerque</h1>
            <div class="text-body-medium">LIVE</div>
          </div>
        </section>
      </main>
    `;

    expect(extractLinkedInProfileFromDocument(document)).toEqual({
      name: "Kleiton Albuquerque",
      headline: "Software Engineer",
      experiences: [],
    });
  });

  it("ignores job-posting style headlines with reference codes", () => {
    document.title = "Kleiton Albuquerque - Software Engineer | LinkedIn";
    document.body.innerHTML = `
      <main>
        <section>
          <div>
            <h1>Kleiton Albuquerque</h1>
            <div class="text-body-medium">SRE Pleno (SP16101308)</div>
          </div>
        </section>
      </main>
    `;

    expect(extractLinkedInProfileFromDocument(document)).toEqual({
      name: "Kleiton Albuquerque",
      headline: "Software Engineer",
      experiences: [],
    });
  });

  it("ignores external article-like headlines captured from the page", () => {
    document.title = "Kleiton Albuquerque - Software Engineer | LinkedIn";
    document.body.innerHTML = `
      <main>
        <section>
          <div>
            <h1>Kleiton Albuquerque</h1>
            <div class="text-body-medium">A sociedade do desempenho, o ego e os adultos infantilizados no poder - Migalhas</div>
          </div>
        </section>
      </main>
    `;

    expect(extractLinkedInProfileFromDocument(document)).toEqual({
      name: "Kleiton Albuquerque",
      headline: "Software Engineer",
      experiences: [],
    });
  });

  it("ignores editorial headlines that start with 'Por Que'", () => {
    document.title = "Kleiton Albuquerque - Software Engineer | LinkedIn";
    document.body.innerHTML = `
      <main>
        <section>
          <div>
            <h1>Kleiton Albuquerque</h1>
            <div class="text-body-medium">Por Que "Soft Skills" Não Significa Nada E O Que Usar no Lugar</div>
          </div>
        </section>
      </main>
    `;

    expect(extractLinkedInProfileFromDocument(document)).toEqual({
      name: "Kleiton Albuquerque",
      headline: "Software Engineer",
      experiences: [],
    });
  });

  it("does not use non-profile titles as headline fallback", () => {
    document.title = "A sociedade do desempenho, o ego e os adultos infantilizados no poder - Migalhas";
    document.body.innerHTML = `
      <main>
        <section>
          <div>
            <h1>Kleiton Albuquerque</h1>
            <div class="text-body-medium">719</div>
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