import { beforeEach, describe, expect, it } from "vitest";

import {
  extractLinkedInProfileFromDocument,
  isLikelyExternalHeadline,
  isMetadataHeadline,
} from "./profileExtraction";

describe("extractLinkedInProfileFromDocument", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", "/");
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

  it("captures headline when LinkedIn nests the name inside the top card", () => {
    document.body.innerHTML = `
      <main>
        <section class="pv-top-card">
          <div>
            <div>
              <h1>Kleiton Albuquerque</h1>
            </div>
          </div>
          <div class="mt2">
            <div class="text-body-medium break-words">Software Developer | Java | React | Node.js</div>
          </div>
        </section>
      </main>
    `;

    expect(extractLinkedInProfileFromDocument(document)).toEqual({
      name: "Kleiton Albuquerque",
      headline: "Software Developer | Java | React | Node.js",
      experiences: [],
    });
  });

  it("captures a classless headline immediately below the profile name", () => {
    document.body.innerHTML = `
      <main>
        <section class="artdeco-card">
          <div class="pv-text-details__left-panel">
            <div>
              <h1 class="text-heading-xlarge break-words">Kleiton Albuquerque</h1>
            </div>
            <button><p>Software Developer</p></button>
            <div>Software Developer | Java, Spring Boot | React, React Native, Vue, Node.js | Performance, UX, Testes e CI/CD</div>
            <div>Rio de Janeiro, Rio de Janeiro, Brasil · Dados de contato</div>
            <span>Mais de 500 conexões</span>
          </div>
          <aside>
            <div>Mirante Tecnologia</div>
            <div>Centro Universitário IBMR</div>
          </aside>
        </section>
      </main>
    `;

    expect(extractLinkedInProfileFromDocument(document)).toEqual({
      name: "Kleiton Albuquerque",
      headline: "Software Developer | Java, Spring Boot | React, React Native, Vue, Node.js | Performance, UX, Testes e CI/CD",
      experiences: [],
    });
  });

  it("captures the current LinkedIn top card structure with h2 name and p headline", () => {
    window.history.replaceState(null, "", "/in/kleiton-albuquerque/");
    document.title = "Kleiton Albuquerque | LinkedIn";
    document.body.innerHTML = `
      <h2>0 notificação</h2>
      <main>
        <div componentkey="com.linkedin.sdui.profile.card.refTopcard">
          <section>
            <div>
              <a href="https://www.linkedin.com/in/kleiton-albuquerque/">
                <div>
                  <h2 class="_946213aa d9b09257 _0f86e326">Kleiton Albuquerque</h2>
                  <svg aria-label="Ver verificações de Kleiton"></svg>
                </div>
              </a>
            </div>
            <p class="_946213aa _8bce2fa5 _9fd89c5c">
              Software Developer | Java, Spring Boot | React, React Native, Vue, Node.js | Performance, UX, Testes e CI/CD
            </p>
            <p>Mirante Tecnologia · Centro Universitário IBMR</p>
            <div>
              <p>Rio de Janeiro, Rio de Janeiro, Brasil</p>
              <p>·</p>
              <p><a href="#">Dados de contato</a></p>
            </div>
            <div style="min-width: 24rem;">
              <div>
                <p><span>Mirante Tecnologia</span></p>
                <p><span>Centro Universitário IBMR</span></p>
              </div>
            </div>
            <a href="https://www.linkedin.com/mynetwork/invite-connect/connections/">
              <p>Mais de 500 conexões</p>
            </a>
          </section>
        </div>
      </main>
    `;

    expect(extractLinkedInProfileFromDocument(document)).toEqual({
      name: "Kleiton Albuquerque",
      headline: "Software Developer | Java, Spring Boot | React, React Native, Vue, Node.js | Performance, UX, Testes e CI/CD",
      experiences: [],
    });
  });

  it("does not use the full Sobre content as headline when no dedicated headline is available", () => {
    document.body.innerHTML = `
      <main>
        <section>
          <div>
            <h1>Kleiton Albuquerque</h1>
          </div>
        </section>
        <section id="about">
          <h2>Sobre</h2>
          <p>Sou desenvolvedor de software com foco em front-end com React e Next.js, além de atuação em back-end com Node.js e Java, participando da construção de aplicações escaláveis.</p>
          <p>Ao longo da minha trajetória, venho atuando em produtos digitais.</p>
        </section>
        <section id="experience">
          <h2>Experiencia</h2>
          <ul>
            <li>Analista de sistemas com foco em desenvolvimento e manutenção de aplicações web de grande escala.</li>
          </ul>
        </section>
      </main>
    `;

    expect(extractLinkedInProfileFromDocument(document)).toEqual({
      name: "Kleiton Albuquerque",
      headline: "",
      experiences: [
        "Analista de sistemas com foco em desenvolvimento e manutenção de aplicações web de grande escala.",
      ],
    });
  });

  it("captures experience entries from LinkedIn-style containers when list items are absent", () => {
    document.body.innerHTML = `
      <main>
        <section>
          <div>
            <h1>Kleiton Albuquerque</h1>
            <div class="text-body-medium">Backend Engineer</div>
          </div>
        </section>
        <section id="experience">
          <h2>Experiencia</h2>
          <div class="pvs-list__paged-list-item">Analista de sistemas com foco em desenvolvimento e manutenção de aplicações web de grande escala.</div>
          <div class="pvs-list__paged-list-item">Desenvolveu integrações e automações para múltiplos clientes enterprise.</div>
        </section>
      </main>
    `;

    expect(extractLinkedInProfileFromDocument(document)).toEqual({
      name: "Kleiton Albuquerque",
      headline: "Backend Engineer",
      experiences: [
        "Analista de sistemas com foco em desenvolvimento e manutenção de aplicações web de grande escala.",
        "Desenvolveu integrações e automações para múltiplos clientes enterprise.",
      ],
    });
  });

  it("splits grouped experience list items into individual captured experiences", () => {
    document.body.innerHTML = `
      <main>
        <section id="about">
          <h2>Sobre</h2>
          <p>Sou desenvolvedor full-stack com foco em produtos digitais e arquitetura escalavel.</p>
        </section>
        <section id="experience">
          <h2>Experiencia</h2>
          <ul>
            <li>
              <div class="pvs-entity">Frontend Engineer na Empresa X com foco em React, Next.js e acessibilidade.</div>
              <div class="pvs-entity">Backend Engineer na Empresa X com foco em Node.js, APIs e observabilidade.</div>
            </li>
          </ul>
        </section>
      </main>
    `;

    expect(extractLinkedInProfileFromDocument(document)).toEqual({
      name: "",
      headline: "",
      experiences: [
        "Frontend Engineer na Empresa X com foco em React, Next.js e acessibilidade.",
        "Backend Engineer na Empresa X com foco em Node.js, APIs e observabilidade.",
      ],
    });
  });

  it("captures all nested role entries from a grouped experience section", () => {
    document.body.innerHTML = `
      <main>
        <section id="about">
          <h2>Sobre</h2>
          <p>Sou desenvolvedor full-stack com foco em produtos digitais e arquitetura escalavel.</p>
        </section>
        <section id="experience">
          <h2>Experiencia</h2>
          <ul>
            <li>
              <div class="pvs-entity">Experiencia 1 com foco em React e acessibilidade.</div>
              <div class="pvs-entity">Experiencia 2 com foco em Next.js e SSR.</div>
              <div class="pvs-entity">Experiencia 3 com foco em Node.js e APIs.</div>
              <div class="pvs-entity">Experiencia 4 com foco em Java e Spring Boot.</div>
              <div class="pvs-entity">Experiencia 5 com foco em Docker e CI/CD.</div>
            </li>
          </ul>
        </section>
      </main>
    `;

    expect(extractLinkedInProfileFromDocument(document)).toEqual({
      name: "",
      headline: "",
      experiences: [
        "Experiencia 1 com foco em React e acessibilidade.",
        "Experiencia 2 com foco em Next.js e SSR.",
        "Experiencia 3 com foco em Node.js e APIs.",
        "Experiencia 4 com foco em Java e Spring Boot.",
        "Experiencia 5 com foco em Docker e CI/CD.",
      ],
    });
  });

  it("captures more than ten loaded experiences from the experience details page", () => {
    window.history.replaceState(null, "", "/in/kleiton-albuquerque/details/experience/");
    document.title = "Kleiton Albuquerque - Experiência | LinkedIn";
    const experienceItems = Array.from(
      { length: 12 },
      (_, index) => `<li>Experiência ${index + 1} com atuação relevante em produtos digitais e APIs.</li>`,
    ).join("");

    document.body.innerHTML = `
      <main>
        <h1>Experiência</h1>
        <section id="experience">
          <h2>Experiência</h2>
          <ul>${experienceItems}</ul>
        </section>
      </main>
    `;

    const result = extractLinkedInProfileFromDocument(document);

    expect(result.name).toBe("Kleiton Albuquerque");
    expect(result.headline).toBe("");
    expect(result.experiences).toHaveLength(12);
    expect(result.experiences?.[11]).toBe("Experiência 12 com atuação relevante em produtos digitais e APIs.");
  });

  it("uses the full details page as experience source when the experience anchor is separate", () => {
    window.history.replaceState(null, "", "/in/kleiton-albuquerque/details/experience/");
    document.title = "Kleiton Albuquerque - Experiência | LinkedIn";

    document.body.innerHTML = `
      <div id="experience"></div>
      <main>
        <h1>Experiência</h1>
        <ul>
          <li>Fullstack Developer com React, Java e integração backend em produto corporativo.</li>
          <li>Analista de sistemas com Next.js, SEO técnico e APIs RESTful no setor educacional.</li>
          <li>Software Developer com Node.js para serviços transacionais de alta disponibilidade.</li>
          <li>Web Developer com Vue.js, PHP, WordPress e sustentação de aplicações para clientes.</li>
        </ul>
      </main>
    `;

    const result = extractLinkedInProfileFromDocument(document);

    expect(result.name).toBe("Kleiton Albuquerque");
    expect(result.experiences).toEqual([
      "Fullstack Developer com React, Java e integração backend em produto corporativo.",
      "Analista de sistemas com Next.js, SEO técnico e APIs RESTful no setor educacional.",
      "Software Developer com Node.js para serviços transacionais de alta disponibilidade.",
      "Web Developer com Vue.js, PHP, WordPress e sustentação de aplicações para clientes.",
    ]);
  });

  it("captures SDUI experience cards without legacy LinkedIn classes", () => {
    window.history.replaceState(null, "", "/in/kleiton-albuquerque/details/experience/");
    document.title = "Kleiton Albuquerque - Experiência | LinkedIn";

    document.body.innerHTML = `
      <main>
        <h1>Experiência</h1>
        <section componentkey="com.linkedin.sdui.profile.card.Experience">
          <div role="button">
            <p>Analista de sistemas</p>
            <p>YDUQS · Tempo integral</p>
            <p>jun de 2022 - set de 2024 · 2 anos 4 meses</p>
            <p>Atuei no desenvolvimento e manutenção de aplicações web de grande escala com React, Next.js, Node.js, NestJS e Strapi.</p>
          </div>
          <div role="button">
            <p>Software Developer</p>
            <p>Qualicorp</p>
            <p>jan de 2021 - mai de 2022 · 1 ano 5 meses</p>
            <p>Desenvolvi APIs RESTful e integrações críticas com Node.js, Java e bancos relacionais.</p>
          </div>
          <div role="button">
            <p>Web Developer</p>
            <p>Freelancer</p>
            <p>jan de 2019 - dez de 2020 · 2 anos</p>
            <p>Criei interfaces em Vue.js e React para produtos digitais com foco em performance e UX.</p>
          </div>
        </section>
      </main>
    `;

    const result = extractLinkedInProfileFromDocument(document);

    expect(result.name).toBe("Kleiton Albuquerque");
    expect(result.experiences).toEqual([
      "Analista de sistemas | YDUQS · Tempo integral | jun de 2022 - set de 2024 · 2 anos 4 meses | Atuei no desenvolvimento e manutenção de aplicações web de grande escala com React, Next.js, Node.js, NestJS e Strapi.",
      "Software Developer | Qualicorp | jan de 2021 - mai de 2022 · 1 ano 5 meses | Desenvolvi APIs RESTful e integrações críticas com Node.js, Java e bancos relacionais.",
      "Web Developer | Freelancer | jan de 2019 - dez de 2020 · 2 anos | Criei interfaces em Vue.js e React para produtos digitais com foco em performance e UX.",
    ]);
  });

  it("groups paragraph-only experience details when LinkedIn omits card selectors", () => {
    window.history.replaceState(null, "", "/in/kleiton-albuquerque/details/experience/");
    document.title = "Kleiton Albuquerque - Experiência | LinkedIn";

    document.body.innerHTML = `
      <main>
        <h1>Experiência</h1>
        <section>
          <h2>Experiência</h2>
          <p>Analista de sistemas</p>
          <p>jun de 2022 - set de 2024 · 2 anos 4 meses</p>
          <p>Atuei no desenvolvimento e manutenção de aplicações web com React, Next.js e Node.js.</p>
          <p>Software Developer</p>
          <p>jan de 2021 - mai de 2022 · 1 ano 5 meses</p>
          <p>Desenvolvi APIs RESTful e integrações críticas para sistemas transacionais.</p>
        </section>
      </main>
    `;

    const result = extractLinkedInProfileFromDocument(document);

    expect(result.experiences).toEqual([
      "Analista de sistemas | jun de 2022 - set de 2024 · 2 anos 4 meses | Atuei no desenvolvimento e manutenção de aplicações web com React, Next.js e Node.js.",
      "Software Developer | jan de 2021 - mai de 2022 · 1 ano 5 meses | Desenvolvi APIs RESTful e integrações críticas para sistemas transacionais.",
    ]);
  });

  it("marks the profile when LinkedIn exposes a full experience details link", () => {
    document.body.innerHTML = `
      <main>
        <h1>Kleiton Albuquerque</h1>
        <div class="text-body-medium">Software Developer</div>
        <section id="experience">
          <h2>Experiência</h2>
          <ul>
            <li>Experiência resumida exibida na página principal.</li>
          </ul>
          <a href="/in/kleiton/details/experience/">Mostrar todas as experiências</a>
        </section>
      </main>
    `;

    expect(extractLinkedInProfileFromDocument(document)).toEqual({
      name: "Kleiton Albuquerque",
      headline: "Software Developer",
      experiences: ["Experiência resumida exibida na página principal."],
      hasMoreExperienceDetails: true,
    });
  });

  it("keeps visible experience fragments separated instead of concatenating dates with descriptions", () => {
    document.body.innerHTML = `
      <main>
        <section id="experience">
          <h2>Experiência</h2>
          <ul>
            <li>
              <span aria-hidden="true">Analista de sistemas</span>
              <span aria-hidden="true">jun de 2022 - set de 2024</span>
              <span aria-hidden="true">2 anos 4 meses</span>
              <span aria-hidden="true">Atuei no desenvolvimento e manutenção de aplicações web.</span>
            </li>
          </ul>
        </section>
      </main>
    `;

    expect(extractLinkedInProfileFromDocument(document)).toEqual({
      name: "",
      headline: "",
      experiences: [
        "Analista de sistemas | jun de 2022 - set de 2024 | 2 anos 4 meses | Atuei no desenvolvimento e manutenção de aplicações web.",
      ],
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

  it("strips zero-width and bidi control characters from captured profile text", () => {
    document.body.innerHTML = `
      <main>
        <section id="about">
          <h2>Sobre</h2>
          <p>Sou\u0007\u200B desenvolvedor com integra\u202Ação\u202C e ação\uFEFF prática.</p>
        </section>
        <div id="profile-experience">
          <h2>Experiência</h2>
          <div class="pvs-list__paged-list-item">Atuação\u200B com APIs críticas e observabilidade.</div>
        </div>
      </main>
    `;

    expect(extractLinkedInProfileFromDocument(document)).toEqual({
      name: "",
      headline: "",
      experiences: ["Atuação com APIs críticas e observabilidade."],
    });
  });

  it("combines pipe-separated professional title segments from LinkedIn titles", () => {
    document.title = "Kleiton Albuquerque | Fullstack Developer | UX Especialist | LinkedIn";
    document.body.innerHTML = `
      <main>
        <h1>Kleiton Albuquerque</h1>
      </main>
    `;

    expect(extractLinkedInProfileFromDocument(document)).toEqual({
      name: "Kleiton Albuquerque",
      headline: "Fullstack Developer | UX Especialist",
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
    const longText = "Senior Backend Engineer ".repeat(60);

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

  it("does not use loose main content as headline when there is no h1 container", () => {
    document.body.innerHTML = `
      <main>
        <div class="text-body-medium">Especialista em dados</div>
      </main>
    `;

    expect(extractLinkedInProfileFromDocument(document)).toEqual({
      name: "",
      headline: "",
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
        "Desenvolveu integrações e automações para múltiplos clientes enterprise.",
      ],
    });
  });

  it("captures experience entries from div containers identified by experience id", () => {
    document.body.innerHTML = `
      <main>
        <section>
          <div>
            <h1>Kleiton Albuquerque</h1>
          </div>
        </section>
        <div id="profile-about">
          <h2>Sobre</h2>
          <p>Profissional com foco em Node.js, arquitetura de APIs e integrações complexas.</p>
        </div>
        <div id="profile-experience">
          <h2>Experiência</h2>
          <div class="pvs-list__paged-list-item">Desenvolveu integrações e automações para múltiplos clientes enterprise.</div>
          <div class="pvs-list__paged-list-item">Liderou evolução de APIs críticas e observabilidade em produção.</div>
        </div>
      </main>
    `;

    expect(extractLinkedInProfileFromDocument(document)).toEqual({
      name: "Kleiton Albuquerque",
      headline: "",
      experiences: [
        "Desenvolveu integrações e automações para múltiplos clientes enterprise.",
        "Liderou evolução de APIs críticas e observabilidade em produção.",
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
    expect(isMetadataHeadline("me ajudou a conseguir este emprego")).toBe(true);
    expect(isMetadataHeadline("1 comentário")).toBe(true);
    expect(isMetadataHeadline("42 comments")).toBe(true);
    expect(isMetadataHeadline("68 compartilhamentos")).toBe(true);
    expect(isMetadataHeadline("99 shares")).toBe(true);
    expect(isMetadataHeadline("Backend Engineer")).toBe(false);
    expect(isLikelyExternalHeadline("me ajudou a conseguir este emprego")).toBe(true);
    expect(isLikelyExternalHeadline("Gabriel Andrade e mais 2 pessoas")).toBe(true);
    expect(isLikelyExternalHeadline("Eduardo Sabino e mais 1.078 pessoas")).toBe(true);
    expect(isLikelyExternalHeadline("Eduardo Sabino e mais 1,078 pessoas")).toBe(true);
    expect(isLikelyExternalHeadline("2 mutual connections")).toBe(true);
    expect(isLikelyExternalHeadline("SRE Pleno (SP16101308)")).toBe(true);
    expect(isLikelyExternalHeadline("A sociedade do desempenho, o ego e os adultos infantilizados no poder - Migalhas")).toBe(true);
    expect(isLikelyExternalHeadline('Por Que "Soft Skills" Não Significa Nada E O Que Usar no Lugar')).toBe(true);
    expect(isLikelyExternalHeadline("Como escalar plataformas: lições práticas para engenharia moderna")).toBe(true);
    expect(isLikelyExternalHeadline("Full Stack Engineer | React | Node.js | Java")).toBe(false);
  });

  it("ignores social sidebar text that references other people", () => {
    document.title = "Kleiton Albuquerque - Software Engineer | LinkedIn";
    document.body.innerHTML = `
      <main>
        <section>
          <div>
            <h1>Kleiton Albuquerque</h1>
            <div class="text-body-medium">Gabriel Andrade e mais 2 pessoas</div>
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

  it("ignores social sidebar text with thousands separators and falls back to the title headline", () => {
    document.title = "Kleiton Albuquerque - Software Engineer | LinkedIn";
    document.body.innerHTML = `
      <main>
        <section>
          <div>
            <h1>Kleiton Albuquerque</h1>
            <div class="text-body-medium">Eduardo Sabino e mais 1.078 pessoas</div>
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

  it("ignores LinkedIn social-proof job badges", () => {
    document.title = "Kleiton Albuquerque - Software Engineer | LinkedIn";
    document.body.innerHTML = `
      <main>
        <section>
          <div>
            <h1>Kleiton Albuquerque</h1>
            <div class="text-body-medium">me ajudou a conseguir este emprego</div>
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
