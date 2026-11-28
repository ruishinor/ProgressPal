export type Tone = 'neutral' | 'blue' | 'amber' | 'green' | 'red';

export type VisualCard = {
  label: string;
  value: string;
  detail: string;
  tone: Tone;
};

export type VisualFrame = {
  label: string;
  caption?: string;
  cards?: VisualCard[];
  links?: string[];
  directions?: ('forward' | 'both' | 'stop')[];
  transcript?: string;
  rows?: { x: string; y: string; file: string; meaning: string }[];
  nodes?: { id: string; x: number; y: number; label: string; tone: Tone }[];
  edges?: { from: string; to: string }[];
  refs?: { name: string; at: string }[];
  reversal?: { from: string; to: string };
  diff?: {
    file: string;
    lines: string[];
    compare?: boolean;
    labels?: [string, string];
  };
  remote?: {
    shared: string;
    tracking: string;
    local: string;
    action?: 'fetch' | 'pull' | 'push';
  };
  pr?: 'pending' | 'failed' | 'review' | 'fix' | 'pass' | 'ready';
  columns?: string[];
  matrix?: string[][];
};

export type GitVisual = {
  lesson: string;
  step: number;
  anchor: string;
  kind: string;
  title: string;
  frames: VisualFrame[];
  short?: string;
};

// Authored visual teaching data. Keep the lesson slot and exact prefix together.
// prettier-ignore
export const gitVisuals: readonly GitVisual[] = [
  {
    "lesson": "git-m01-o01",
    "step": 3,
    "anchor": "Git hjelper deg å holde orden på endringer i et prosjekt. Når du vil lagre et be",
    "kind": "flow",
    "title": "Tre forskjellige handlinger",
    "frames": [
      {
        "label": "",
        "cards": [
          {
            "label": "Lagre fil",
            "value": "På maskinen din",
            "detail": "Ctrl+S",
            "tone": "neutral"
          },
          {
            "label": "Commit",
            "value": "Git-historikken",
            "detail": "git commit",
            "tone": "blue"
          },
          {
            "label": "Push",
            "value": "Delt repo",
            "detail": "git push",
            "tone": "green"
          }
        ],
        "caption": "En commit trenger ikke GitHub.",
        "links": [
          "git add + git commit",
          "git push"
        ]
      }
    ]
  },
  {
    "lesson": "git-m01-o02",
    "step": 3,
    "anchor": "### Hva skal du skrive i PowerShell?\n\nTerminalen viser for eksempel `PS C:\\Users",
    "kind": "terminal",
    "title": "Hva skriver du i PowerShell?",
    "frames": [
      {
        "label": "",
        "cards": [
          {
            "label": "Teksten som står der",
            "value": "PS C:\\Users\\navn>",
            "detail": "Ikke kopier denne delen.",
            "tone": "neutral"
          },
          {
            "label": "Kommando",
            "value": "git --version",
            "detail": "Skriv eller lim inn, trykk Enter.",
            "tone": "blue"
          },
          {
            "label": "Utskrift",
            "value": "git version 2.x.x",
            "detail": "Les resultatet; ikke kjør det.",
            "tone": "neutral"
          }
        ],
        "caption": "Dette er et eksempel. Versjonen din kan være en annen.",
        "links": []
      }
    ],
    "short": "### Hva skal du skrive i PowerShell?\n\nTeksten før markøren viser mappen du står i. Kopier bare kommandoboksen og trykk Enter. Ikke kopier teksten foran markøren eller den forventede utskriften."
  },
  {
    "lesson": "git-m01-o02",
    "step": 7,
    "anchor": "Utskriften har en Path med en sti, for eksempel C:\\Users\\navn. En sti er adresse",
    "kind": "tree",
    "title": "Hvilken mappe står du i?",
    "frames": [
      {
        "label": "",
        "cards": [
          {
            "label": "Mappe",
            "value": "C:\\Users\\navn",
            "detail": "",
            "tone": "neutral"
          },
          {
            "label": "Undermappe",
            "value": "Dokumenter",
            "detail": "",
            "tone": "neutral"
          },
          {
            "label": "Øvingsmappe",
            "value": "ProgressPal Git oving",
            "detail": "Get-Location viser stien til mappen.",
            "tone": "blue"
          }
        ],
        "caption": "Stien på maskinen din kan se annerledes ut.",
        "links": []
      }
    ]
  },
  {
    "lesson": "git-m01-o03",
    "step": 2,
    "anchor": "Før Git kan følge endringene dine, må du gjøre prosjektmappen til et repo. **git",
    "kind": "files",
    "title": "Før og etter git init",
    "frames": [
      {
        "label": "",
        "cards": [
          {
            "label": "Før git init",
            "value": "Prosjektmappe",
            "detail": "Vanlige filer",
            "tone": "neutral"
          },
          {
            "label": "Etter git init",
            "value": "Prosjektmappe\n└─ .git",
            "detail": "Skjult mappe med Git-data.",
            "tone": "blue"
          }
        ],
        "caption": "Git init oppretter repoet. Det lager ingen commit.",
        "links": []
      }
    ]
  },
  {
    "lesson": "git-m01-o03",
    "step": 14,
    "anchor": "En **.gitignore** er en vanlig tekstfil med navn eller mønstre Git normalt skal ",
    "kind": "files",
    "title": "Hva Git følger",
    "frames": [
      {
        "label": "",
        "cards": [
          {
            "label": "README.txt",
            "value": "Med i øvingen",
            "detail": "",
            "tone": "neutral"
          },
          {
            "label": "plan.txt",
            "value": "Med i øvingen",
            "detail": "",
            "tone": "neutral"
          },
          {
            "label": ".gitignore",
            "value": "Regler for nye filer",
            "detail": "",
            "tone": "neutral"
          },
          {
            "label": "kladde.txt",
            "value": "Ignorert",
            "detail": "Passer med regelen i .gitignore.",
            "tone": "amber"
          }
        ],
        "caption": "En fil som allerede er sporet, blir ikke automatisk fjernet fra Git av .gitignore.",
        "links": []
      }
    ]
  },
  {
    "lesson": "git-m01-o03",
    "step": 20,
    "anchor": "### Fra en redigert fil til en commit\n\nDu kan rette en feil i én fil og prøve no",
    "kind": "flow",
    "title": "Følg en fil gjennom Git",
    "frames": [
      {
        "label": "Lagre fil",
        "cards": [
          {
            "label": "Working tree",
            "value": "Notat\nMøtested: biblioteket",
            "detail": "Filen på disken.",
            "tone": "amber"
          },
          {
            "label": "Staging area",
            "value": "Notat",
            "detail": "Innhold valgt til neste commit.",
            "tone": "blue"
          },
          {
            "label": "Siste commit",
            "value": "Notat",
            "detail": "Versjonen i historikken.",
            "tone": "green"
          }
        ],
        "caption": "Lagring endrer bare arbeidsfilen. I dette eksemplet finnes allerede en commit.",
        "transcript": " M notat.txt"
      },
      {
        "label": "git add",
        "cards": [
          {
            "label": "Working tree",
            "value": "Notat\nMøtested: biblioteket",
            "detail": "Filen på disken.",
            "tone": "amber"
          },
          {
            "label": "Staging area",
            "value": "Notat\nMøtested: biblioteket",
            "detail": "Innhold valgt til neste commit.",
            "tone": "blue"
          },
          {
            "label": "Siste commit",
            "value": "Notat",
            "detail": "Versjonen i historikken.",
            "tone": "green"
          }
        ],
        "caption": "Git velger innholdet slik det er akkurat nå.",
        "transcript": "M  notat.txt"
      },
      {
        "label": "Rediger igjen",
        "cards": [
          {
            "label": "Working tree",
            "value": "Notat\nMøtested: biblioteket\nTa med lader.",
            "detail": "Filen på disken.",
            "tone": "amber"
          },
          {
            "label": "Staging area",
            "value": "Notat\nMøtested: biblioteket",
            "detail": "Innhold valgt til neste commit.",
            "tone": "blue"
          },
          {
            "label": "Siste commit",
            "value": "Notat",
            "detail": "Versjonen i historikken.",
            "tone": "green"
          }
        ],
        "caption": "Den nye linjen blir ikke staged automatisk.",
        "transcript": "MM notat.txt"
      },
      {
        "label": "git commit",
        "cards": [
          {
            "label": "Working tree",
            "value": "Notat\nMøtested: biblioteket\nTa med lader.",
            "detail": "Filen på disken.",
            "tone": "amber"
          },
          {
            "label": "Staging area",
            "value": "Notat\nMøtested: biblioteket",
            "detail": "Innhold valgt til neste commit.",
            "tone": "blue"
          },
          {
            "label": "Siste commit",
            "value": "Notat\nMøtested: biblioteket",
            "detail": "Versjonen i historikken.",
            "tone": "green"
          }
        ],
        "caption": "Bare møtestedet blir med. Den nye linjen ligger fortsatt i arbeidsfilen.",
        "transcript": " M notat.txt"
      }
    ],
    "short": "### Fra en redigert fil til en commit\n\nWorking tree er filene på disken. **Staging** betyr å klargjøre innhold til neste commit med `git add`. **Staging area (index)** holder på innholdet du har valgt. Historikken inneholder versjonene du har committet. Velg et trinn for å se forskjellen. Her bruker vi en egen eksempelfil, `notat.txt`. Du trenger ikke lage den."
  },
  {
    "lesson": "git-m01-o04",
    "step": 6,
    "anchor": "### Slik leser du `git status --short`\n\nDe to første plassene før filnavnet bety",
    "kind": "status",
    "title": "Les de to plassene i git status --short",
    "frames": [
      {
        "label": "",
        "rows": [
          {
            "x": " ",
            "y": "M",
            "file": "README.txt",
            "meaning": "Endringen er ikke staged."
          },
          {
            "x": "M",
            "y": " ",
            "file": "README.txt",
            "meaning": "Endringen er staged."
          },
          {
            "x": "M",
            "y": "M",
            "file": "README.txt",
            "meaning": "Både staged og unstaged endringer."
          },
          {
            "x": "?",
            "y": "?",
            "file": "plan.txt",
            "meaning": "Ny fil Git ikke følger ennå."
          }
        ]
      }
    ],
    "short": "### Slik leser du `git status --short`\n\nM betyr modified (endret). **Staged** betyr valgt til neste commit, **unstaged** betyr endret i arbeidsfilen, men ikke valgt. Første plass sammenligner staging med siste commit. Andre plass sammenligner arbeidsfilen med staging. `??` betyr at Git ikke følger filen ennå. Dette er utskrift, ikke kommandoer."
  },
  {
    "lesson": "git-m01-o04",
    "step": 3,
    "anchor": "### Endre de to filene i Notisblokk\n\n1. I `README.txt`: behold `Turplan` og `Dag",
    "kind": "diff",
    "title": "Teksten du skal endre",
    "frames": [
      {
        "label": "",
        "cards": [
          {
            "label": "plan.txt etter",
            "value": "Husk vann og mat.",
            "detail": "",
            "tone": "blue"
          }
        ],
        "caption": "Lagre begge filer før du går tilbake til PowerShell.",
        "links": [],
        "diff": {
          "file": "README.txt",
          "lines": [
            " Turplan",
            " Dagstur langs elva.",
            "+Starttid: 10:00"
          ],
          "compare": true
        }
      }
    ],
    "short": "### Endre de to filene i Notisblokk\n\nLegg til `Starttid: 10:00` på en egen linje i `README.txt`. Bytt innholdet i `plan.txt` til `Husk vann og mat.`. Lagre begge med `Ctrl+S`. Hvis Git ikke viser endring, sjekk at riktig fil er lagret."
  },
  {
    "lesson": "git-m01-o04",
    "step": 9,
    "anchor": "**Se etter:** `git diff --cached` viser `Starttid: 10:00` i `README.txt`, men ik",
    "kind": "diff",
    "title": "To forskjellige sammenligninger",
    "frames": [
      {
        "label": "",
        "cards": [
          {
            "label": "git diff --cached",
            "value": "Siste commit → staging",
            "detail": "Viser den valgte starttiden.",
            "tone": "blue"
          },
          {
            "label": "git diff",
            "value": "Staging → arbeidsfil",
            "detail": "Viser endringer som ennå ikke er valgt.",
            "tone": "amber"
          }
        ],
        "caption": "Staging area husker innholdet, ikke bare filnavnet.",
        "links": []
      }
    ],
    "short": "**Se etter:** `git diff --cached` viser starttiden i `README.txt`, men ingen endring i `plan.txt`. Staging area husker innholdet du valgte, ikke bare filnavnet."
  },
  {
    "lesson": "git-m01-o04",
    "step": 10,
    "anchor": "### Endre en fil som allerede er staged\n\nÅpne `README.txt` igjen. Legg til `Ta m",
    "kind": "files",
    "title": "Legg til kartlinjen",
    "frames": [
      {
        "label": "",
        "cards": [
          {
            "label": "README.txt",
            "value": "Turplan\nDagstur langs elva.\nStarttid: 10:00\nTa med kart.",
            "detail": "Legg til kartlinjen nederst.",
            "tone": "amber"
          }
        ],
        "caption": "Lagre med Ctrl+S. Ikke kjør git add igjen.",
        "links": []
      }
    ],
    "short": "### Endre en fil som allerede er staged\n\nÅpne `README.txt`. Legg til `Ta med kart.` nederst. Lagre med `Ctrl+S`, men ikke kjør `git add` igjen."
  },
  {
    "lesson": "git-m01-o04",
    "step": 14,
    "anchor": "### Hva betyr `MM`?\n\nI denne øvingen er den første endringen staged, mens den an",
    "kind": "status",
    "title": "Hva betyr MM?",
    "frames": [
      {
        "label": "Status",
        "rows": [
          {
            "x": "M",
            "y": "M",
            "file": "README.txt",
            "meaning": "Første M: starttiden er staged (git diff --cached). Andre M: kartlinjen er unstaged (git diff)."
          }
        ],
        "caption": "Første M sammenligner staging med siste commit. Andre M sammenligner arbeidsfilen med staging."
      },
      {
        "label": "Filversjoner",
        "cards": [
          {
            "label": "Siste commit",
            "value": "Turplan\nDagstur langs elva.",
            "detail": "Lagret før starttiden.",
            "tone": "neutral"
          },
          {
            "label": "Staging area",
            "value": "Turplan\nDagstur langs elva.\nStarttid: 10:00",
            "detail": "Valgt for neste commit.",
            "tone": "blue"
          },
          {
            "label": "Arbeidsfil",
            "value": "Turplan\nDagstur langs elva.\nStarttid: 10:00\nTa med kart.",
            "detail": "Kartlinjen er ennå ikke staged.",
            "tone": "amber"
          }
        ],
        "caption": "Her sammenlignes innholdet, ikke bare filnavnet. Har du brukt den gamle starttidsteksten, er forskjellen den samme."
      }
    ],
    "short": "### Hva betyr `MM`?\n\n`git add` velger innholdet slik det er når du kjører kommandoen. Kartlinjen og huskelisten skal vente."
  },
  {
    "lesson": "git-m01-o04",
    "step": 19,
    "anchor": "Du har klargjort `plan.txt` ved en feil. `git restore --staged -- plan.txt` tar ",
    "kind": "flow",
    "title": "Ta en fil ut av staging area",
    "frames": [
      {
        "label": "",
        "cards": [
          {
            "label": "Før",
            "value": "README.txt + plan.txt",
            "detail": "Begge er staged.",
            "tone": "blue"
          },
          {
            "label": "Etter",
            "value": "README.txt",
            "detail": "Bare denne endringen er staged.",
            "tone": "blue"
          },
          {
            "label": "Arbeidsfil",
            "value": "plan.txt",
            "detail": "Husk vann og mat. er beholdt.",
            "tone": "amber"
          }
        ],
        "caption": "Behold --staged. Vanlig restore kan overskrive arbeidsfilen.",
        "links": [
          "git restore --staged"
        ]
      }
    ],
    "short": "`git restore --staged -- plan.txt` tar bare endringen ut av staging area. **Viktig:** Behold `--staged`."
  },
  {
    "lesson": "git-m01-o04",
    "step": 27,
    "anchor": "Begge viser `Turplan`, `Dagstur langs elva.` og `Starttid: 10:00`. Bare `Get-Con",
    "kind": "diff",
    "title": "Siste commit og arbeidsfil",
    "frames": [
      {
        "label": "",
        "caption": "Her ser du det samme som i git show HEAD:README.txt og Get-Content README.txt. Brukte du «Start klokken 10.» tidligere, kan den teksten stå.",
        "links": [],
        "diff": {
          "file": "README.txt",
          "lines": [
            " Turplan",
            " Dagstur langs elva.",
            " Starttid: 10:00",
            "+Ta med kart."
          ],
          "compare": true,
          "labels": [
            "Siste commit",
            "Arbeidsfil"
          ]
        }
      }
    ],
    "short": "Bare `Get-Content` skal vise kartlinjen. Hvis den også vises i `git show`, ble den staged før commit. Behold arbeidet og undersøk forskjellen. Tilpass neste oppgave til det som faktisk gjenstår, eller bruk en ny øvingsmappe."
  },
  {
    "lesson": "git-m01-o05",
    "step": 1,
    "anchor": "Det nye målet er motsatt av forrige commit: **registrer bare huskelisten i plan.",
    "kind": "files",
    "title": "Nytt mål for neste commit",
    "frames": [
      {
        "label": "",
        "cards": [
          {
            "label": "README.txt",
            "value": "Ta med kart.",
            "detail": "Skal vente.",
            "tone": "amber"
          },
          {
            "label": "plan.txt",
            "value": "Husk vann og mat. Sjekk vaeret.",
            "detail": "Skal med i neste commit.",
            "tone": "blue"
          }
        ],
        "caption": "Velg selv hvordan du kommer fram til målet.",
        "links": []
      }
    ]
  },
  {
    "lesson": "git-m01-o05",
    "step": 10,
    "anchor": "### Dette skal du se\n\n- Historikken har tre commits.\n- `HEAD:plan.txt` viser `Hu",
    "kind": "files",
    "title": "Forventet status etter commit",
    "frames": [
      {
        "label": "",
        "cards": [
          {
            "label": "README.txt",
            "value": " M README.txt",
            "detail": "Kartlinjen er fortsatt unstaged.",
            "tone": "amber"
          },
          {
            "label": "plan.txt",
            "value": "Ingen statuslinje",
            "detail": "Huskelisten er committet.",
            "tone": "green"
          }
        ],
        "caption": "Undersøk med status og diff dersom resultatet er annerledes.",
        "links": []
      }
    ]
  },
  {
    "lesson": "git-m02-o01",
    "step": 2,
    "anchor": "Tenk deg en enkel påmeldingsløsning. Den har en innstillingsfil som begrenser an",
    "kind": "diff",
    "title": "Hva skjedde med grensen?",
    "frames": [
      {
        "label": "",
        "caption": "Finn ut når grensen ble endret før du retter noe.",
        "links": [],
        "diff": {
          "file": "settings.json",
          "lines": [
            " {",
            "-  \"maxRegistrations\": 20,",
            "+  \"maxRegistrations\": 200,",
            "   \"sendConfirmation\": true",
            " }"
          ]
        }
      }
    ]
  },
  {
    "lesson": "git-m02-o02",
    "step": 2,
    "anchor": "Oppsettet lager tre commits: **A** oppretter `settings.json` med grense 20, **B*",
    "kind": "graph",
    "title": "Tre commits i øvingen",
    "frames": [
      {
        "label": "",
        "nodes": [
          {
            "id": "A",
            "x": 45,
            "y": 84,
            "label": "Grense 20",
            "tone": "neutral"
          },
          {
            "id": "B",
            "x": 180,
            "y": 84,
            "label": "Grense 200",
            "tone": "amber"
          },
          {
            "id": "C",
            "x": 315,
            "y": 84,
            "label": "Ny kontaktinfo",
            "tone": "blue"
          }
        ],
        "edges": [
          {
            "from": "A",
            "to": "B"
          },
          {
            "from": "B",
            "to": "C"
          }
        ],
        "caption": "C beholder grensen 200. Hjelpetekst og kontaktinfo er nye."
      }
    ],
    "short": "Oppsettet lager A, B og C i et eget, lokalt repo. Ingen GitHub-konto trengs. De lokale navn- og e-postinnstillingene gjelder bare øvingsrepoet. Ikke bruk M01-mappen eller andre prosjekter."
  },
  {
    "lesson": "git-m02-o03",
    "step": 4,
    "anchor": "**HEAD** viser normalt til gjeldende commit via den aktive branchen. I øvingen, ",
    "kind": "graph",
    "title": "HEAD og tidligere commits",
    "frames": [
      {
        "label": "HEAD",
        "nodes": [
          {
            "id": "A",
            "x": 45,
            "y": 84,
            "label": "HEAD~2",
            "tone": "neutral"
          },
          {
            "id": "B",
            "x": 180,
            "y": 84,
            "label": "HEAD~1",
            "tone": "amber"
          },
          {
            "id": "C",
            "x": 315,
            "y": 84,
            "label": "HEAD / main (valgt)",
            "tone": "blue"
          }
        ],
        "edges": [
          {
            "from": "A",
            "to": "B"
          },
          {
            "from": "B",
            "to": "C"
          }
        ],
        "caption": "HEAD viser til C. git show HEAD leser den nyeste commiten."
      },
      {
        "label": "HEAD~1",
        "nodes": [
          {
            "id": "A",
            "x": 45,
            "y": 84,
            "label": "HEAD~2",
            "tone": "neutral"
          },
          {
            "id": "B",
            "x": 180,
            "y": 84,
            "label": "HEAD~1 (valgt)",
            "tone": "blue"
          },
          {
            "id": "C",
            "x": 315,
            "y": 84,
            "label": "HEAD / main",
            "tone": "neutral"
          }
        ],
        "edges": [
          {
            "from": "A",
            "to": "B"
          },
          {
            "from": "B",
            "to": "C"
          }
        ],
        "caption": "HEAD~1 viser til B, ett steg bakover langs første forelder. Å lese den flytter ikke HEAD."
      },
      {
        "label": "HEAD~2",
        "nodes": [
          {
            "id": "A",
            "x": 45,
            "y": 84,
            "label": "HEAD~2 (valgt)",
            "tone": "blue"
          },
          {
            "id": "B",
            "x": 180,
            "y": 84,
            "label": "HEAD~1",
            "tone": "neutral"
          },
          {
            "id": "C",
            "x": 315,
            "y": 84,
            "label": "HEAD / main",
            "tone": "neutral"
          }
        ],
        "edges": [
          {
            "from": "A",
            "to": "B"
          },
          {
            "from": "B",
            "to": "C"
          }
        ],
        "caption": "HEAD~2 viser til A. Arbeidsfilene og HEAD blir stående der de var."
      }
    ],
    "short": "`HEAD` viser normalt til gjeldende commit via branchen du står på. I denne historikken er `HEAD` C, `HEAD~1` B og `HEAD~2` A. `~1` betyr første forelder."
  },
  {
    "lesson": "git-m02-o04",
    "step": 3,
    "anchor": "Dette viser forskjellen mellom A og C, men ikke alene hvem som innførte avviket.",
    "kind": "diff",
    "title": "Les hva som ble endret",
    "frames": [
      {
        "label": "",
        "caption": "Diff viser forskjellen. Bruk git show HEAD~1 for å finne endringen i commit B.",
        "links": [],
        "diff": {
          "file": "settings.json",
          "lines": [
            " {",
            "-  \"maxRegistrations\": 20,",
            "+  \"maxRegistrations\": 200,",
            "   \"sendConfirmation\": true",
            " }"
          ]
        }
      }
    ],
    "short": "A og C har ulike verdier. Det forteller ikke alene hvilken commit som endret tallet. Undersøk B med `git show HEAD~1` og C med `git show HEAD`."
  },
  {
    "lesson": "git-m02-o05",
    "step": 7,
    "anchor": "**Viktig forskjell:** Dette er ikke en tilbakeføring av hele prosjektet. Du har ",
    "kind": "graph",
    "title": "Rett bare verdien",
    "frames": [
      {
        "label": "Finn feilen",
        "nodes": [
          {
            "id": "A",
            "x": 35,
            "y": 84,
            "label": "Grense 20",
            "tone": "neutral"
          },
          {
            "id": "B",
            "x": 130,
            "y": 84,
            "label": "Grense 200",
            "tone": "amber"
          },
          {
            "id": "C",
            "x": 225,
            "y": 84,
            "label": "Kontaktinfo · 200",
            "tone": "blue"
          }
        ],
        "edges": [
          {
            "from": "A",
            "to": "B"
          },
          {
            "from": "B",
            "to": "C"
          }
        ],
        "caption": "HEAD står på C. Kontaktinfoen kom i C, men grensen ble endret fra 20 til 200 allerede i B.",
        "refs": [
          {
            "name": "HEAD → main",
            "at": "C"
          }
        ]
      },
      {
        "label": "Rett grensen",
        "nodes": [
          {
            "id": "A",
            "x": 35,
            "y": 84,
            "label": "Grense 20",
            "tone": "neutral"
          },
          {
            "id": "B",
            "x": 130,
            "y": 84,
            "label": "Grense 200",
            "tone": "amber"
          },
          {
            "id": "C",
            "x": 225,
            "y": 84,
            "label": "Kontaktinfo · 200",
            "tone": "blue"
          },
          {
            "id": "D",
            "x": 325,
            "y": 84,
            "label": "Grense 20",
            "tone": "green"
          }
        ],
        "edges": [
          {
            "from": "A",
            "to": "B"
          },
          {
            "from": "B",
            "to": "C"
          },
          {
            "from": "C",
            "to": "D"
          }
        ],
        "caption": "Ny commit D retter tallet og beholder forbedringene fra C.",
        "refs": [
          {
            "name": "HEAD → main",
            "at": "D"
          }
        ],
        "diff": {
          "file": "settings.json",
          "lines": [
            " {",
            "-  \"maxRegistrations\": 200,",
            "+  \"maxRegistrations\": 20,",
            "   \"sendConfirmation\": true",
            " }"
          ]
        }
      }
    ],
    "short": "Rettelsen blir en ny commit. Du beholder dagens dokumentasjon og supporttekst."
  },
  {
    "lesson": "git-m02-o06",
    "step": 0,
    "anchor": "### Et annet utviklingsproblem\n\nEt prosjekt sender normalt en automatisk bekreft",
    "kind": "decision",
    "title": "Hva må avklares?",
    "frames": [
      {
        "label": "",
        "cards": [
          {
            "label": "Melding",
            "value": "Bekreftelser kommer ikke fram.",
            "detail": "",
            "tone": "neutral"
          },
          {
            "label": "Historikk",
            "value": "true → false",
            "detail": "sendConfirmation",
            "tone": "neutral"
          },
          {
            "label": "Gjeldende krav",
            "value": "Manuell bekreftelse",
            "detail": "Undersøk hvilken bestilling som gjelder.",
            "tone": "blue"
          }
        ],
        "caption": "Hva ville du undersøkt før du endrer koden?",
        "links": []
      }
    ]
  },
  {
    "lesson": "git-m03-o01",
    "step": 2,
    "anchor": "En **branch** (gren) er et bevegelig navn som peker på en commit. Når du gjør en",
    "kind": "graph",
    "title": "En branch er et navn som flyttes",
    "frames": [
      {
        "label": "Opprett",
        "nodes": [
          {
            "id": "A",
            "x": 45,
            "y": 104,
            "label": "Felles",
            "tone": "neutral"
          }
        ],
        "edges": [],
        "caption": "Begge brancher starter på A. HEAD peker på main, branchen du står på.",
        "refs": [
          {
            "name": "HEAD → main",
            "at": "A"
          },
          {
            "name": "feature",
            "at": "A"
          }
        ]
      },
      {
        "label": "Bytt branch",
        "nodes": [
          {
            "id": "A",
            "x": 45,
            "y": 104,
            "label": "Felles",
            "tone": "neutral"
          }
        ],
        "edges": [],
        "caption": "git switch feature flytter HEAD til feature. Begge brancher peker fortsatt på A.",
        "refs": [
          {
            "name": "main",
            "at": "A"
          },
          {
            "name": "HEAD → feature",
            "at": "A"
          }
        ]
      },
      {
        "label": "Endre",
        "nodes": [
          {
            "id": "A",
            "x": 45,
            "y": 104,
            "label": "Felles",
            "tone": "neutral"
          },
          {
            "id": "C",
            "x": 170,
            "y": 156,
            "label": "Påmeldingsskjema",
            "tone": "amber"
          }
        ],
        "edges": [
          {
            "from": "A",
            "to": "C"
          }
        ],
        "caption": "Feature har fått en ny commit. Main står stille.",
        "refs": [
          {
            "name": "main",
            "at": "A"
          },
          {
            "name": "HEAD → feature",
            "at": "C"
          }
        ]
      },
      {
        "label": "Merge commit",
        "nodes": [
          {
            "id": "A",
            "x": 45,
            "y": 104,
            "label": "Felles",
            "tone": "neutral"
          },
          {
            "id": "B",
            "x": 170,
            "y": 52,
            "label": "README",
            "tone": "blue"
          },
          {
            "id": "C",
            "x": 170,
            "y": 156,
            "label": "Skjema",
            "tone": "amber"
          },
          {
            "id": "D",
            "x": 315,
            "y": 104,
            "label": "main etter merge",
            "tone": "green"
          }
        ],
        "edges": [
          {
            "from": "A",
            "to": "B"
          },
          {
            "from": "A",
            "to": "C"
          },
          {
            "from": "B",
            "to": "D"
          },
          {
            "from": "C",
            "to": "D"
          }
        ],
        "caption": "D har to foreldre, B og C. Main flyttes til D mens feature fortsatt peker på C.",
        "refs": [
          {
            "name": "HEAD → main",
            "at": "D"
          },
          {
            "name": "feature",
            "at": "C"
          }
        ]
      }
    ],
    "short": "En **branch** er et navn som peker på en commit. Når du lager en ny commit, flyttes branchen du står på. HEAD viser normalt den aktive branchen. Andre branches og commits blir værende når du bytter."
  },
  {
    "lesson": "git-m03-o02",
    "step": 8,
    "anchor": "På dette tidspunktet peker både `main` og `feature/kvittering` på samme start-co",
    "kind": "graph",
    "title": "To branches, samme commit",
    "frames": [
      {
        "label": "Opprett",
        "nodes": [
          {
            "id": "A",
            "x": 45,
            "y": 104,
            "label": "Felles",
            "tone": "neutral"
          }
        ],
        "edges": [],
        "caption": "Begge brancher starter på A. HEAD peker på main, branchen du står på.",
        "refs": [
          {
            "name": "HEAD → main",
            "at": "A"
          },
          {
            "name": "feature",
            "at": "A"
          }
        ]
      }
    ],
    "short": "Du har opprettet en branch. Ingen ny commit er laget ennå."
  },
  {
    "lesson": "git-m03-o03",
    "step": 1,
    "anchor": "Du skal legge til en tydelig bekreftelse på påmeldingssiden. Fordi du står på `f",
    "kind": "graph",
    "title": "Arbeid på feature-branchen",
    "frames": [
      {
        "label": "Endre",
        "nodes": [
          {
            "id": "A",
            "x": 45,
            "y": 104,
            "label": "Felles",
            "tone": "neutral"
          },
          {
            "id": "C",
            "x": 170,
            "y": 156,
            "label": "Påmeldingsskjema",
            "tone": "amber"
          }
        ],
        "edges": [
          {
            "from": "A",
            "to": "C"
          }
        ],
        "caption": "Feature har fått en ny commit. Main står stille.",
        "refs": [
          {
            "name": "main",
            "at": "A"
          },
          {
            "name": "HEAD → feature",
            "at": "C"
          }
        ]
      }
    ]
  },
  {
    "lesson": "git-m03-o04",
    "step": 0,
    "anchor": "`main` skal nå få en nyttig oppdatering av prosjektbeskrivelsen, mens den separa",
    "kind": "graph",
    "title": "Fra to branches til merge",
    "frames": [
      {
        "label": "Før merge",
        "nodes": [
          {
            "id": "A",
            "x": 45,
            "y": 104,
            "label": "Felles",
            "tone": "neutral"
          },
          {
            "id": "B",
            "x": 170,
            "y": 52,
            "label": "README",
            "tone": "blue"
          },
          {
            "id": "C",
            "x": 170,
            "y": 156,
            "label": "Skjema",
            "tone": "amber"
          }
        ],
        "edges": [
          {
            "from": "A",
            "to": "B"
          },
          {
            "from": "A",
            "to": "C"
          }
        ],
        "caption": "Begge branches har egne commits etter A.",
        "refs": [
          {
            "name": "HEAD → main",
            "at": "B"
          },
          {
            "name": "feature",
            "at": "C"
          }
        ]
      },
      {
        "label": "Etter merge",
        "nodes": [
          {
            "id": "A",
            "x": 45,
            "y": 104,
            "label": "Felles",
            "tone": "neutral"
          },
          {
            "id": "B",
            "x": 170,
            "y": 52,
            "label": "README",
            "tone": "blue"
          },
          {
            "id": "C",
            "x": 170,
            "y": 156,
            "label": "Skjema",
            "tone": "amber"
          },
          {
            "id": "D",
            "x": 315,
            "y": 104,
            "label": "Main etter merge",
            "tone": "green"
          }
        ],
        "edges": [
          {
            "from": "A",
            "to": "B"
          },
          {
            "from": "A",
            "to": "C"
          },
          {
            "from": "B",
            "to": "D"
          },
          {
            "from": "C",
            "to": "D"
          }
        ],
        "caption": "Når begge branches har egne commits, kan en merge commit samle dem.",
        "refs": [
          {
            "name": "main",
            "at": "D"
          },
          {
            "name": "feature",
            "at": "C"
          }
        ]
      }
    ],
    "short": "`main` får en README-endring. Feature-branchen har en HTML-endring. Når begge har fått nye commits, har historikkene skilt lag."
  },
  {
    "lesson": "git-m03-o04",
    "step": 8,
    "anchor": "En **fast-forward** skjer når main ikke har fått noen nye commits siden feature-",
    "kind": "graph",
    "title": "Fast-forward eller merge commit?",
    "frames": [
      {
        "label": "Fast-forward",
        "nodes": [
          {
            "id": "A",
            "x": 45,
            "y": 84,
            "label": "Tidligere main",
            "tone": "blue"
          },
          {
            "id": "B",
            "x": 180,
            "y": 84,
            "label": "",
            "tone": "amber"
          },
          {
            "id": "C",
            "x": 315,
            "y": 84,
            "label": "Siste commit",
            "tone": "green"
          }
        ],
        "edges": [
          {
            "from": "A",
            "to": "B"
          },
          {
            "from": "B",
            "to": "C"
          }
        ],
        "caption": "Main flyttes fram. Ingen ny merge commit.",
        "refs": [
          {
            "name": "HEAD → main",
            "at": "C"
          },
          {
            "name": "feature",
            "at": "C"
          }
        ]
      },
      {
        "label": "Merge commit",
        "nodes": [
          {
            "id": "A",
            "x": 45,
            "y": 104,
            "label": "Felles",
            "tone": "neutral"
          },
          {
            "id": "B",
            "x": 170,
            "y": 52,
            "label": "README",
            "tone": "blue"
          },
          {
            "id": "C",
            "x": 170,
            "y": 156,
            "label": "Skjema",
            "tone": "amber"
          },
          {
            "id": "D",
            "x": 315,
            "y": 104,
            "label": "Main etter merge",
            "tone": "green"
          }
        ],
        "edges": [
          {
            "from": "A",
            "to": "B"
          },
          {
            "from": "A",
            "to": "C"
          },
          {
            "from": "B",
            "to": "D"
          },
          {
            "from": "C",
            "to": "D"
          }
        ],
        "caption": "Når begge branches har egne commits, kan en merge commit samle dem.",
        "refs": [
          {
            "name": "main",
            "at": "D"
          },
          {
            "name": "feature",
            "at": "C"
          }
        ]
      }
    ],
    "short": "Når begge branches har egne commits, er en vanlig merge ikke en fast-forward. Du trenger ikke tvinge fram en merge commit med `--no-ff` bare for utseendets skyld."
  },
  {
    "lesson": "git-m03-o05",
    "step": 9,
    "anchor": "Mellom `<<<<<<< HEAD` og `=======` står forslaget i **main**. Mellom `=======` o",
    "kind": "conflict",
    "title": "Les konfliktmarkørene",
    "frames": [
      {
        "label": "",
        "cards": [
          {
            "label": "<<<<<<< HEAD",
            "value": "Bekreftelse: Paameldingen er registrert.",
            "detail": "Forslaget på main.",
            "tone": "blue"
          },
          {
            "label": "=======",
            "value": "Skiller forslagene",
            "detail": "",
            "tone": "neutral"
          },
          {
            "label": ">>>>>>> feature/melding",
            "value": "Bekreftelse: Takk! Praktisk informasjon sendes senere.",
            "detail": "Forslaget fra feature.",
            "tone": "amber"
          }
        ],
        "caption": "Velg sluttinnholdet og fjern alle tre konfliktmarkørene.",
        "links": []
      }
    ],
    "short": "Les begge forslagene. Velg hva sluttfilen skal si."
  },
  {
    "lesson": "git-m03-o05",
    "step": 7,
    "anchor": "### Forsøk å merge, og undersøk konflikten\n\nDenne gangen **forventer** vi at mer",
    "kind": "status",
    "title": "Når merge stopper",
    "frames": [
      {
        "label": "",
        "rows": [
          {
            "x": "U",
            "y": "U",
            "file": "messages.txt",
            "meaning": "Begge sider har endret filen, og konflikten er ikke løst."
          }
        ]
      }
    ]
  },
  {
    "lesson": "git-m03-o06",
    "step": 0,
    "anchor": "### Et nytt scenario\n\nDere lager en enkel påmeldingstjeneste. Én branch oppdater",
    "kind": "files",
    "title": "Merge lyktes, men tallene er forskjellige",
    "frames": [
      {
        "label": "",
        "cards": [
          {
            "label": "settings.json",
            "value": "30",
            "detail": "Maks antall påmeldinger.",
            "tone": "blue"
          },
          {
            "label": "index.html",
            "value": "Kun 20 plasser",
            "detail": "Teksten brukeren ser.",
            "tone": "amber"
          }
        ],
        "caption": "Git kunne samle filene. Hva bør teamet undersøke?",
        "links": []
      }
    ]
  },
  {
    "lesson": "git-m04-o01",
    "step": 4,
    "anchor": "I M04 bruker vi først en lokal, delt Git-mappe og to uavhengige arbeidskopier, *",
    "kind": "remote",
    "title": "Lokalt samarbeid",
    "frames": [
      {
        "label": "",
        "cards": [
          {
            "label": "Arbeidskopi A",
            "value": "Filer + historikk",
            "detail": "",
            "tone": "neutral"
          },
          {
            "label": "Delt repo",
            "value": "Historikk og branches",
            "detail": "Ingen vanlig arbeidsmappe.",
            "tone": "blue"
          },
          {
            "label": "Arbeidskopi B",
            "value": "Filer + historikk",
            "detail": "",
            "tone": "neutral"
          }
        ],
        "caption": "I øvingen ligger alle tre på samme maskin.",
        "links": [
          "push / fetch",
          "clone / fetch"
        ],
        "directions": [
          "both",
          "both"
        ]
      }
    ]
  },
  {
    "lesson": "git-m04-o02",
    "step": 1,
    "anchor": "### Tre mapper med hver sin rolle\n\nVi lager et nytt eksempel på kurssiden fra M0",
    "kind": "files",
    "title": "Tre mapper med hver sin rolle",
    "frames": [
      {
        "label": "",
        "cards": [
          {
            "label": "arbeidskopi-A",
            "value": "Rediger filer",
            "detail": "",
            "tone": "neutral"
          },
          {
            "label": "delt-repo.git",
            "value": "Delt Git-historikk",
            "detail": "Bare repo.",
            "tone": "blue"
          },
          {
            "label": "arbeidskopi-B",
            "value": "Opprettes med clone",
            "detail": "",
            "tone": "neutral"
          }
        ],
        "caption": "Alle ligger under ProgressPal-Git-M04.",
        "links": []
      }
    ],
    "short": "### Tre mapper med hver sin rolle\n\nVi lager en ny øving, ikke en kopi av de gamle øvingsfilene. `delt-repo.git` er et **bare repository**: det lagrer Git-historikk og referanser, men har ingen vanlig arbeidsmappe. B opprettes senere med `git clone`."
  },
  {
    "lesson": "git-m04-o03",
    "step": 1,
    "anchor": "### Først sende, så hente en ny arbeidskopi\n\nA har en lokal commit. Den delte ma",
    "kind": "remote",
    "title": "Send, og lag en arbeidskopi",
    "frames": [
      {
        "label": "Push",
        "cards": [
          {
            "label": "A: main",
            "value": "Startcommit",
            "detail": "",
            "tone": "neutral"
          },
          {
            "label": "Delt repo: main",
            "value": "Startcommit",
            "detail": "Etter push.",
            "tone": "green"
          }
        ],
        "caption": "Push sender commits og ber remote oppdatere branchen.",
        "links": [
          "git push -u origin main"
        ],
        "directions": [
          "forward"
        ]
      },
      {
        "label": "Clone",
        "cards": [
          {
            "label": "Delt repo",
            "value": "Startcommit",
            "detail": "",
            "tone": "neutral"
          },
          {
            "label": "B: main",
            "value": "Startcommit",
            "detail": "Ny arbeidskopi.",
            "tone": "blue"
          }
        ],
        "caption": "Clone lager en ny lokal kopi.",
        "links": [
          "git clone"
        ],
        "directions": [
          "forward"
        ]
      }
    ],
    "short": "Ved første push setter `-u` upstream: Git husker hvilken branch på remote den lokale branchen hører sammen med. Det betyr ikke at Git synkroniserer automatisk. En vanlig push krever skrivetilgang og at historikken kan oppdateres uten å overskrive andres arbeid."
  },
  {
    "lesson": "git-m04-o03",
    "step": 4,
    "anchor": "Nå finnes samme start-commit både i A og i det delte repositoryet. `main` i A er",
    "kind": "files",
    "title": "Lokale og eksterne navn",
    "frames": [
      {
        "label": "",
        "cards": [
          {
            "label": "main i A",
            "value": "Lokal branch",
            "detail": "",
            "tone": "neutral"
          },
          {
            "label": "origin/main i A",
            "value": "Sist kjente remote-main",
            "detail": "Oppdateres ved blant annet fetch.",
            "tone": "blue"
          },
          {
            "label": "main på remote",
            "value": "Delt branch",
            "detail": "",
            "tone": "neutral"
          }
        ],
        "caption": "Navnene kan peke på samme commit, men er forskjellige referanser.",
        "links": []
      }
    ]
  },
  {
    "lesson": "git-m04-o04",
    "step": 6,
    "anchor": "### Fetch: hent historikken uten å endre filene\n\nKjør `git fetch origin` i A.\n\n-",
    "kind": "remote",
    "title": "Hva flyttes ved fetch?",
    "frames": [
      {
        "label": "Før fetch",
        "remote": {
          "shared": "B",
          "tracking": "A",
          "local": "A"
        },
        "caption": "En kollega har pushet B. På maskinen din peker både main og origin/main fortsatt på A."
      },
      {
        "label": "Fetch",
        "remote": {
          "shared": "B",
          "tracking": "B",
          "local": "A",
          "action": "fetch"
        },
        "caption": "git fetch origin henter B og oppdaterer origin/main. Lokal main og arbeidsfilen blir på A."
      }
    ],
    "short": "### Fetch: hent historikken uten å endre filene\n\n`git fetch origin` oppdaterer blant annet `origin/main`. A sin lokale `main` og `messages.txt` blir stående. Nå kan du undersøke endringen før du tar den inn."
  },
  {
    "lesson": "git-m04-o05",
    "step": 0,
    "anchor": "### Pull: få endringen inn i arbeidsfilene\n\nA har hentet historikken, men har ik",
    "kind": "remote",
    "title": "Fetch, pull og push",
    "frames": [
      {
        "label": "Før fetch",
        "remote": {
          "shared": "B",
          "tracking": "A",
          "local": "A"
        },
        "caption": "En kollega har pushet B. På maskinen din peker både main og origin/main fortsatt på A."
      },
      {
        "label": "Fetch",
        "remote": {
          "shared": "B",
          "tracking": "B",
          "local": "A",
          "action": "fetch"
        },
        "caption": "git fetch origin henter B og oppdaterer origin/main. Lokal main og arbeidsfilen blir på A."
      },
      {
        "label": "Pull",
        "remote": {
          "shared": "B",
          "tracking": "B",
          "local": "B",
          "action": "pull"
        },
        "caption": "git pull henter og tar inn endringer etter oppsettet ditt. Her kan main flyttes rett fram til B fordi du ikke har egne nye commits."
      },
      {
        "label": "Push",
        "remote": {
          "shared": "C",
          "tracking": "C",
          "local": "C",
          "action": "push"
        },
        "caption": "Du lager C lokalt. git push sender C og ber remote flytte main til C. Ved vellykket push oppdateres også origin/main i dette oppsettet. Kollegaens arbeidsfiler endres først når kollegaen selv tar inn endringene."
      }
    ],
    "short": "### Pull: få endringen inn i arbeidsfilene\n\nA har ingen egne nye commits. Git kan derfor flytte `main` fram til den nye commiten uten å lage en merge commit. Dette kalles fast-forward. Velg mellom tilstandene under."
  },
  {
    "lesson": "git-m04-o06",
    "step": 8,
    "anchor": "B har nå en commit som mottakeren ikke har, og mottakeren har en commit som B ma",
    "kind": "graph",
    "title": "Ahead 1, behind 1",
    "frames": [
      {
        "label": "",
        "nodes": [
          {
            "id": "A",
            "x": 50,
            "y": 108,
            "label": "Felles",
            "tone": "neutral"
          },
          {
            "id": "B",
            "x": 245,
            "y": 52,
            "label": "origin/main",
            "tone": "blue"
          },
          {
            "id": "C",
            "x": 245,
            "y": 164,
            "label": "main",
            "tone": "amber"
          }
        ],
        "edges": [
          {
            "from": "A",
            "to": "B"
          },
          {
            "from": "A",
            "to": "C"
          }
        ],
        "caption": "Lokal main har én egen commit (C) og mangler én fra remote (B). Fast-forward alene kan ikke samle dem."
      }
    ],
    "short": "`ahead 1, behind 1` betyr at hver side har en commit den andre mangler. Det sier ikke hvilke filer som er riktige. Begge endringene kan være nyttige."
  },
  {
    "lesson": "git-m04-o07",
    "step": 2,
    "anchor": "### Forfatteridentitet er ikke innlogging\n\n`git config user.name` og `user.email",
    "kind": "decision",
    "title": "Commit-navn er ikke innlogging",
    "frames": [
      {
        "label": "",
        "cards": [
          {
            "label": "git config",
            "value": "Navn og e-post",
            "detail": "Følger med commits.",
            "tone": "neutral"
          },
          {
            "label": "GitHub-konto",
            "value": "Tilgang til repoet",
            "detail": "Logg inn med støttet metode.",
            "tone": "blue"
          },
          {
            "label": "SSH",
            "value": "Offentlig / privat nøkkel",
            "detail": "Del aldri den private nøkkelen.",
            "tone": "amber"
          }
        ],
        "caption": "Sjekk adressen, rettighetene og synligheten før du sender noe.",
        "links": []
      }
    ]
  },
  {
    "lesson": "git-m05-o01",
    "step": 3,
    "anchor": "### Hva er et issue?\n\nEn bruker melder: «Jeg får bekreftelse hvis jeg skriver ba",
    "kind": "pr",
    "title": "Fra issue til pull request",
    "frames": [
      {
        "label": "",
        "cards": [
          {
            "label": "Issue",
            "value": "Ugyldig navn blir godtatt",
            "detail": "Beskriver problemet.",
            "tone": "neutral"
          },
          {
            "label": "Pull request",
            "value": "Avvis tomt navn og mellomrom",
            "detail": "Avvis tomt navn og bare mellomrom. Vanlige navn skal fortsatt godtas.",
            "tone": "blue"
          }
        ],
        "caption": "Et issue beskriver oppgaven. En PR viser et forslag.",
        "links": [
          "Utvikle på en branch"
        ]
      }
    ]
  },
  {
    "lesson": "git-m05-o02",
    "step": 1,
    "anchor": "### Her skal du faktisk bruke Git\n\nVi fortsetter med en ufarlig påmeldingsløsnin",
    "kind": "remote",
    "title": "To arbeidskopier",
    "frames": [
      {
        "label": "",
        "cards": [
          {
            "label": "utvikler",
            "value": "Gjør endringen",
            "detail": "",
            "tone": "neutral"
          },
          {
            "label": "delt repo",
            "value": "Deler commits",
            "detail": "Lokal øving.",
            "tone": "blue"
          },
          {
            "label": "gjennomgang",
            "value": "Leser diffen",
            "detail": "",
            "tone": "neutral"
          }
        ],
        "caption": "En lokal remote har ingen GitHub-PR eller formelle approvals.",
        "links": [
          "push",
          "fetch"
        ],
        "directions": [
          "forward",
          "forward"
        ]
      }
    ]
  },
  {
    "lesson": "git-m05-o03",
    "step": 6,
    "anchor": "### En PR-visning på GitHub (undervisningseksempel, ikke faktisk Git-output)\n\n- ",
    "kind": "pr",
    "title": "Avvis ugyldig navn i påmelding",
    "frames": [
      {
        "label": "Forslag",
        "pr": "pending",
        "caption": "PR-en åpnes med én commit. Sjekkene har ikke kjørt ennå."
      },
      {
        "label": "Test feiler",
        "pr": "failed",
        "caption": "Testen viser at tre mellomrom passerer kontrollen for tom streng."
      },
      {
        "label": "Review",
        "pr": "review",
        "caption": "En kollega ber deg sjekke navnet etter at mellomrom rundt teksten er fjernet."
      },
      {
        "label": "Ny commit",
        "pr": "fix",
        "caption": "Du legger til trim() i samme branch. Sjekkene kjører på nytt."
      },
      {
        "label": "Sjekker består",
        "pr": "pass",
        "caption": "Begge testene består. I dette repoet må en kollega også godkjenne rettelsen."
      },
      {
        "label": "Klar for merge",
        "pr": "ready",
        "caption": "Kollegaen har godkjent rettelsen og de påkrevde sjekkene har bestått."
      }
    ],
    "short": "### En PR på GitHub\n\nSe på base, head, endrede filer og hva som er sjekket."
  },
  {
    "lesson": "git-m05-o04",
    "step": 1,
    "anchor": "### To review-kommentarer\n\n**Lite nyttig:** «Dette er feil.» Kommentaren sier ik",
    "kind": "pr",
    "title": "To typer tilbakemelding",
    "frames": [
      {
        "label": "",
        "cards": [
          {
            "label": "Feil",
            "value": "Hva skjer med bare mellomrom?",
            "detail": "Knyttet til kravet.",
            "tone": "amber"
          },
          {
            "label": "Skrivemåte",
            "value": "Jeg foretrekker et annet variabelnavn.",
            "detail": "Vurder lesbarhet og prosjektstandard.",
            "tone": "neutral"
          }
        ],
        "caption": "Undersøk feilen. Ikke alle forslag til skrivemåte krever en endring.",
        "links": []
      }
    ]
  },
  {
    "lesson": "git-m05-o05",
    "step": 3,
    "anchor": "På GitHub vil en eksisterende pull request som følger denne branchen normalt få ",
    "kind": "graph",
    "title": "En PR kan oppdateres",
    "frames": [
      {
        "label": "",
        "nodes": [
          {
            "id": "A",
            "x": 45,
            "y": 84,
            "label": "main",
            "tone": "neutral"
          },
          {
            "id": "B",
            "x": 180,
            "y": 84,
            "label": "Første forslag",
            "tone": "amber"
          },
          {
            "id": "C",
            "x": 315,
            "y": 84,
            "label": "feature/valider-navn",
            "tone": "green"
          }
        ],
        "edges": [
          {
            "from": "A",
            "to": "B"
          },
          {
            "from": "B",
            "to": "C"
          }
        ],
        "caption": "En ny push til samme head branch oppdaterer normalt den eksisterende PR-en."
      }
    ],
    "short": "Push en ny commit til samme head branch. PR-en viser den oppdaterte diffen; du trenger ikke en ny PR. Svar på review-kommentaren og fortell hva du har sjekket. Tidligere approvals kan måtte fornyes, avhengig av reglene i repoet."
  },
  {
    "lesson": "git-m05-o06",
    "step": 0,
    "anchor": "### Status checks: hva betyr resultatet?\n\nEn PR kan ha automatiske kontroller so",
    "kind": "matrix",
    "title": "Status checks",
    "frames": [
      {
        "label": "",
        "cards": [
          {
            "label": "Passed",
            "value": "Bygg",
            "detail": "Denne kontrollen bestod.",
            "tone": "green"
          },
          {
            "label": "Failed",
            "value": "Test",
            "detail": "Les årsaken.",
            "tone": "red"
          },
          {
            "label": "Pending",
            "value": "Nettlesertest",
            "detail": "Ikke ferdig ennå.",
            "tone": "amber"
          }
        ],
        "caption": "Noen repoer krever bestemte checks før merge. En grønn test betyr ikke at hele programmet virker.",
        "links": []
      }
    ]
  },
  {
    "lesson": "git-m05-o06",
    "step": 2,
    "anchor": "### Hva skjer med commit-historikken ved merge?\n\n- **Merge commit** beholder fea",
    "kind": "graph",
    "title": "Tre måter å merge på",
    "frames": [
      {
        "label": "Før merge",
        "nodes": [
          {
            "id": "A",
            "x": 35,
            "y": 95,
            "label": "Felles",
            "tone": "neutral"
          },
          {
            "id": "B",
            "x": 130,
            "y": 45,
            "label": "Siste commit på main",
            "tone": "blue"
          },
          {
            "id": "C1",
            "x": 130,
            "y": 145,
            "label": "",
            "tone": "amber"
          },
          {
            "id": "C2",
            "x": 230,
            "y": 145,
            "label": "Skjema",
            "tone": "amber"
          }
        ],
        "edges": [
          {
            "from": "A",
            "to": "B"
          },
          {
            "from": "A",
            "to": "C1"
          },
          {
            "from": "C1",
            "to": "C2"
          }
        ],
        "caption": "Main har B. Feature har to egne commits, C1 og C2. Alle tre alternativene starter her.",
        "refs": [
          {
            "name": "main",
            "at": "B"
          },
          {
            "name": "feature",
            "at": "C2"
          }
        ]
      },
      {
        "label": "Merge commit",
        "nodes": [
          {
            "id": "A",
            "x": 35,
            "y": 95,
            "label": "Felles",
            "tone": "neutral"
          },
          {
            "id": "B",
            "x": 130,
            "y": 45,
            "label": "Tidligere main",
            "tone": "blue"
          },
          {
            "id": "C1",
            "x": 130,
            "y": 145,
            "label": "",
            "tone": "amber"
          },
          {
            "id": "C2",
            "x": 230,
            "y": 145,
            "label": "Skjema",
            "tone": "amber"
          },
          {
            "id": "D",
            "x": 325,
            "y": 45,
            "label": "Siste commit på main",
            "tone": "green"
          }
        ],
        "edges": [
          {
            "from": "A",
            "to": "B"
          },
          {
            "from": "A",
            "to": "C1"
          },
          {
            "from": "C1",
            "to": "C2"
          },
          {
            "from": "B",
            "to": "D"
          },
          {
            "from": "C2",
            "to": "D"
          }
        ],
        "caption": "D har to foreldre: B og C2. C1 og C2 blir en del av main sin historikk.",
        "refs": [
          {
            "name": "main",
            "at": "D"
          },
          {
            "name": "feature",
            "at": "C2"
          }
        ]
      },
      {
        "label": "Squash",
        "nodes": [
          {
            "id": "A",
            "x": 35,
            "y": 95,
            "label": "Felles",
            "tone": "neutral"
          },
          {
            "id": "B",
            "x": 130,
            "y": 45,
            "label": "Tidligere main",
            "tone": "blue"
          },
          {
            "id": "C1",
            "x": 130,
            "y": 145,
            "label": "",
            "tone": "amber"
          },
          {
            "id": "C2",
            "x": 230,
            "y": 145,
            "label": "Skjema",
            "tone": "amber"
          },
          {
            "id": "S",
            "x": 325,
            "y": 45,
            "label": "Siste commit på main",
            "tone": "green"
          }
        ],
        "edges": [
          {
            "from": "A",
            "to": "B"
          },
          {
            "from": "A",
            "to": "C1"
          },
          {
            "from": "C1",
            "to": "C2"
          },
          {
            "from": "B",
            "to": "S"
          }
        ],
        "caption": "S samler endringene fra C1 og C2. De opprinnelige commitene blir ikke med som egne commits på main.",
        "refs": [
          {
            "name": "main",
            "at": "S"
          },
          {
            "name": "feature",
            "at": "C2"
          }
        ]
      },
      {
        "label": "Rebase",
        "nodes": [
          {
            "id": "A",
            "x": 35,
            "y": 95,
            "label": "Felles",
            "tone": "neutral"
          },
          {
            "id": "B",
            "x": 130,
            "y": 45,
            "label": "Tidligere main",
            "tone": "blue"
          },
          {
            "id": "C1",
            "x": 130,
            "y": 145,
            "label": "",
            "tone": "amber"
          },
          {
            "id": "C2",
            "x": 230,
            "y": 145,
            "label": "Skjema",
            "tone": "amber"
          },
          {
            "id": "C1′",
            "x": 225,
            "y": 45,
            "label": "",
            "tone": "blue"
          },
          {
            "id": "C2′",
            "x": 325,
            "y": 45,
            "label": "Siste commit på main",
            "tone": "green"
          }
        ],
        "edges": [
          {
            "from": "A",
            "to": "B"
          },
          {
            "from": "A",
            "to": "C1"
          },
          {
            "from": "C1",
            "to": "C2"
          },
          {
            "from": "B",
            "to": "C1′"
          },
          {
            "from": "C1′",
            "to": "C2′"
          }
        ],
        "caption": "Endringene fra C1 og C2 legges på nytt oppå B, normalt med nye hasher. Ingen merge commit.",
        "refs": [
          {
            "name": "main",
            "at": "C2′"
          },
          {
            "name": "feature",
            "at": "C2"
          }
        ]
      }
    ],
    "short": "De tre metodene gir forskjellige historikker. Ingen av dem tester programmet."
  },
  {
    "lesson": "git-m05-o07",
    "step": 0,
    "anchor": "### Branch i felles repo eller fork?\n\nHar du skriverettigheter til et felles rep",
    "kind": "remote",
    "title": "Branch eller fork?",
    "frames": [
      {
        "label": "",
        "cards": [
          {
            "label": "Felles repo",
            "value": "main + feature",
            "detail": "Branches i samme repo.",
            "tone": "neutral"
          },
          {
            "label": "Fork",
            "value": "Eget repo",
            "detail": "En kopi under en annen konto.",
            "tone": "blue"
          },
          {
            "label": "Pull request",
            "value": "Fork → original",
            "detail": "Foreslå endringer.",
            "tone": "neutral"
          }
        ],
        "caption": "Hvilken arbeidsmåte du bruker, avhenger av tilgangen din.",
        "links": []
      }
    ]
  },
  {
    "lesson": "git-m05-o08",
    "step": 0,
    "anchor": "### Et nytt problem\n\nTeamet arbeider nå med kursplasser. Et issue sier: «Når kur",
    "kind": "pr",
    "title": "Les forslaget før du bestemmer deg",
    "frames": [
      {
        "label": "",
        "cards": [
          {
            "label": "Bygg",
            "value": "Bestått",
            "detail": "",
            "tone": "green"
          },
          {
            "label": "Nettleserkontroll",
            "value": "Timeout",
            "detail": "",
            "tone": "red"
          },
          {
            "label": "Side",
            "value": "Viser riktig kapasitet",
            "detail": "",
            "tone": "neutral"
          },
          {
            "label": "Review",
            "value": "Påmelding kan fortsatt registreres når kurset er fullt.",
            "detail": "",
            "tone": "amber"
          }
        ],
        "caption": "Hvilke forhold må du undersøke før du velger om PR-en kan merges?",
        "links": []
      }
    ]
  },
  {
    "lesson": "git-m06-o01",
    "step": 2,
    "anchor": "### Hvor ligger endringen?\n\n- **Working tree:** Filene du redigerer. Se unstaged",
    "kind": "flow",
    "title": "Hvor ligger endringen?",
    "frames": [
      {
        "label": "",
        "cards": [
          {
            "label": "Arbeidsfil",
            "value": "git diff",
            "detail": "Endring utenfor staging.",
            "tone": "amber"
          },
          {
            "label": "Staging area",
            "value": "git diff --staged",
            "detail": "Valgt innhold.",
            "tone": "blue"
          },
          {
            "label": "Historikk",
            "value": "git log / git show",
            "detail": "Tidligere commits.",
            "tone": "green"
          }
        ],
        "caption": "Begynn med git status. Kommandoene over endrer ikke filene.",
        "links": []
      }
    ]
  },
  {
    "lesson": "git-m06-o02",
    "step": 1,
    "anchor": "### «Angre» er to forskjellige oppgaver\n\nTenk at du retter teksten i `melding.tx",
    "kind": "flow",
    "title": "To forskjellige måter å angre på",
    "frames": [
      {
        "label": "Unstage",
        "cards": [
          {
            "label": "Før",
            "value": "Endring staged",
            "detail": "",
            "tone": "neutral"
          },
          {
            "label": "Etter",
            "value": "Arbeidsfilen beholdes",
            "detail": "Endringen er ikke staged.",
            "tone": "amber"
          }
        ],
        "caption": "git restore --staged endrer staging area, ikke arbeidsfilen.",
        "links": [
          "git restore --staged"
        ]
      },
      {
        "label": "Forkast",
        "cards": [
          {
            "label": "Før",
            "value": "Uferdig endring",
            "detail": "Arbeidsfilen.",
            "tone": "amber"
          },
          {
            "label": "Etter",
            "value": "Innhold fra staging",
            "detail": "Uferdig endring kan gå tapt.",
            "tone": "red"
          }
        ],
        "caption": "Vanlig git restore kan overskrive arbeidsfilen.",
        "links": [
          "git restore"
        ]
      }
    ],
    "short": "Vil du ta endringen ut av staging, eller fjerne den fra filen? Det er to forskjellige handlinger."
  },
  {
    "lesson": "git-m06-o03",
    "step": 1,
    "anchor": "### En commit er registrert, men ennå ikke delt\n\nDu har laget en lokal commit so",
    "kind": "effects",
    "title": "Hva påvirker restore og reset?",
    "frames": [
      {
        "label": "Sammenlign",
        "columns": [
          "Kommando",
          "Working tree",
          "Staging area",
          "HEAD / branch"
        ],
        "matrix": [
          [
            "git restore <fil>",
            "Kan erstattes",
            "Beholdes",
            "Beholdes"
          ],
          [
            "git restore --staged <fil>",
            "Beholdes",
            "Kan endres",
            "Beholdes"
          ],
          [
            "git reset --soft <commit>",
            "Beholdes",
            "Beholdes",
            "Flyttes"
          ],
          [
            "git reset --mixed <commit>",
            "Beholdes",
            "Kan endres",
            "Flyttes"
          ],
          [
            "git reset --hard <commit>",
            "Kan erstattes",
            "Kan endres",
            "Flyttes"
          ]
        ],
        "caption": "Her står du på en branch. Vanlig restore henter filinnholdet fra staging. Med --staged hentes det fra HEAD til staging. Reset-variantene bruker en commit som mål og gjelder hele repoet. Sjekk git status før du bruker restore på arbeidsfilen eller reset --hard: endringer kan gå tapt."
      },
      {
        "label": "Soft",
        "cards": [
          {
            "label": "Working tree",
            "value": "Ny tekst",
            "detail": "Filen på disken.",
            "tone": "amber"
          },
          {
            "label": "Staging area",
            "value": "Ny tekst",
            "detail": "Innhold valgt til neste commit.",
            "tone": "blue"
          },
          {
            "label": "Siste commit",
            "value": "Gammel tekst",
            "detail": "Versjonen i historikken.",
            "tone": "green"
          }
        ],
        "caption": "Soft flytter main bakover. Arbeidsfilen og staging beholder den nye teksten.",
        "transcript": "M  notat.txt"
      },
      {
        "label": "Mixed",
        "cards": [
          {
            "label": "Working tree",
            "value": "Ny tekst",
            "detail": "Filen på disken.",
            "tone": "amber"
          },
          {
            "label": "Staging area",
            "value": "Gammel tekst",
            "detail": "Innhold valgt til neste commit.",
            "tone": "blue"
          },
          {
            "label": "Siste commit",
            "value": "Gammel tekst",
            "detail": "Versjonen i historikken.",
            "tone": "green"
          }
        ],
        "caption": "Mixed flytter main og tilpasser staging. Arbeidsfilen beholder den nye teksten.",
        "transcript": " M notat.txt"
      },
      {
        "label": "Hard",
        "cards": [
          {
            "label": "Working tree",
            "value": "Gammel tekst",
            "detail": "Filen på disken.",
            "tone": "amber"
          },
          {
            "label": "Staging area",
            "value": "Gammel tekst",
            "detail": "Innhold valgt til neste commit.",
            "tone": "blue"
          },
          {
            "label": "Siste commit",
            "value": "Gammel tekst",
            "detail": "Versjonen i historikken.",
            "tone": "green"
          }
        ],
        "caption": "Hard flytter main og erstatter staging og den sporede arbeidsfilen. Ikke bruk dette for å prøve deg fram.",
        "transcript": ""
      }
    ],
    "short": "`git reset` til en tidligere commit flytter branchen du står på. Her sammenligner vi `git reset --soft HEAD~1` med mixed og hard til samme mål. Eksemplet starter med en ren arbeidskopi. `--hard` kan overskrive arbeid."
  },
  {
    "lesson": "git-m06-o04",
    "step": 0,
    "anchor": "### Arbeidet er uferdig, men noe annet haster\n\nDu er halvveis i telefonfeltet på",
    "kind": "flow",
    "title": "Legg arbeid til side",
    "frames": [
      {
        "label": "Før stash",
        "cards": [
          {
            "label": "Arbeidsfil",
            "value": "Uferdig tekst",
            "detail": "En sporet fil er endret.",
            "tone": "amber"
          },
          {
            "label": "Stash",
            "value": "Ingen ny oppføring",
            "detail": "",
            "tone": "neutral"
          }
        ],
        "caption": "Du har ikke laget en ny commit."
      },
      {
        "label": "git stash push",
        "cards": [
          {
            "label": "Arbeidsfil",
            "value": "Siste commit",
            "detail": "I dette enkle eksemplet er filen ren.",
            "tone": "green"
          },
          {
            "label": "Stash",
            "value": "Uferdig tekst",
            "detail": "Midlertidig lagret lokalt.",
            "tone": "blue"
          }
        ],
        "caption": "Vanlig stash tar normalt ikke med nye, usporede filer."
      },
      {
        "label": "git stash apply",
        "cards": [
          {
            "label": "Arbeidsfil",
            "value": "Uferdig tekst",
            "detail": "Endringen er tilbake.",
            "tone": "amber"
          },
          {
            "label": "Stash",
            "value": "Uferdig tekst",
            "detail": "Oppføringen beholdes.",
            "tone": "blue"
          }
        ],
        "caption": "Apply kan gi konflikter hvis filene har endret seg i mellomtiden."
      }
    ]
  },
  {
    "lesson": "git-m06-o05",
    "step": 0,
    "anchor": "### En commit ser ut til å ha forsvunnet\n\nEtter en kontrollert flytting av en lo",
    "kind": "graph",
    "title": "Finn en tidligere commit",
    "frames": [
      {
        "label": "",
        "nodes": [
          {
            "id": "A",
            "x": 70,
            "y": 84,
            "label": "main / HEAD",
            "tone": "blue"
          },
          {
            "id": "B",
            "x": 260,
            "y": 84,
            "label": "recovery-m06",
            "tone": "green"
          }
        ],
        "edges": [
          {
            "from": "A",
            "to": "B"
          }
        ],
        "caption": "Før reset stod HEAD på B. Reflog kan hjelpe deg å finne B igjen. En recovery-branch kan peke på B uten å lage en ny commit."
      }
    ],
    "short": "Reflog viser hvor HEAD og andre lokale referanser har pekt tidligere. En commit som ikke lenger vises i vanlig `git log`, kan fortsatt finnes. Sjekk innholdet med `git show` før du gjør mer."
  },
  {
    "lesson": "git-m06-o06",
    "step": 0,
    "anchor": "### Feilen er allerede en del av felles historie\n\nEtter en gjennomgått PR blir e",
    "kind": "graph",
    "title": "Revert lager en ny commit",
    "frames": [
      {
        "label": "",
        "nodes": [
          {
            "id": "A",
            "x": 35,
            "y": 84,
            "label": "Fungerer",
            "tone": "blue"
          },
          {
            "id": "B",
            "x": 130,
            "y": 84,
            "label": "Feil",
            "tone": "red"
          },
          {
            "id": "C",
            "x": 225,
            "y": 84,
            "label": "Annet arbeid",
            "tone": "blue"
          },
          {
            "id": "D",
            "x": 325,
            "y": 84,
            "label": "Revert B",
            "tone": "green"
          }
        ],
        "edges": [
          {
            "from": "A",
            "to": "B"
          },
          {
            "from": "B",
            "to": "C"
          },
          {
            "from": "C",
            "to": "D"
          }
        ],
        "caption": "Den stiplede linjen viser hvilken endring D gjør om. D er en ny commit etter C. B blir i historikken, og Git beholder arbeidet fra C når endringene lar seg kombinere. HEAD går fram til D.",
        "reversal": {
          "from": "D",
          "to": "B"
        },
        "refs": [
          {
            "name": "HEAD → main",
            "at": "D"
          }
        ]
      }
    ],
    "short": "Når andre har hentet historikken, er det ofte bedre å lage en ny rettelse enn å flytte main bakover. `git revert` lager normalt en ny commit som reverserer endringen fra den commiten du velger."
  },
  {
    "lesson": "git-m06-o07",
    "step": 1,
    "anchor": "### Nytt prosjekt: registrering til et arrangement\n\nTo utviklere vedlikeholder e",
    "kind": "decision",
    "title": "Hva må du bevare?",
    "frames": [
      {
        "label": "",
        "cards": [
          {
            "label": "Lokal fil",
            "value": "bekreftelse.txt",
            "detail": "Uferdig nyttig melding.",
            "tone": "amber"
          },
          {
            "label": "Delt main",
            "value": "E-post er blitt obligatorisk",
            "detail": "Feil som begge har hentet.",
            "tone": "red"
          },
          {
            "label": "Ny funksjon",
            "value": "Bruker samme validering",
            "detail": "Kan avhenge av tidligere kode.",
            "tone": "neutral"
          }
        ],
        "caption": "Undersøk først hvor endringene ligger. Hva må beholdes?",
        "links": []
      }
    ]
  },
  {
    "lesson": "git-m07-o01",
    "step": 3,
    "anchor": "Prosjektet består av `index.html` (skjemaet brukeren ser), `app.js` (kobler skje",
    "kind": "files",
    "title": "Hva gjør prosjektfilene?",
    "frames": [
      {
        "label": "",
        "cards": [
          {
            "label": "index.html",
            "value": "Skjemaet",
            "detail": "",
            "tone": "neutral"
          },
          {
            "label": "app.js",
            "value": "Kobler skjema og resultat",
            "detail": "",
            "tone": "neutral"
          },
          {
            "label": "valider.js",
            "value": "Sjekker inndata",
            "detail": "",
            "tone": "blue"
          },
          {
            "label": "kontroller.cjs",
            "value": "Tester validering",
            "detail": "",
            "tone": "neutral"
          },
          {
            "label": "oppgave.md",
            "value": "Bestillingen",
            "detail": "",
            "tone": "neutral"
          },
          {
            "label": "README.md",
            "value": "Hvordan prosjektet brukes",
            "detail": "",
            "tone": "neutral"
          }
        ],
        "caption": "A arbeider med valideringen. B forbedrer hjelpeteksten.",
        "links": []
      }
    ],
    "short": "Her er filene du kommer til å bruke. `main` er felles branch."
  },
  {
    "lesson": "git-m07-o01",
    "step": 2,
    "anchor": "En utviklingsoppgave handler ikke først og fremst om å få noe nytt inn i en comm",
    "kind": "matrix",
    "title": "Krav til skjemaet",
    "frames": [
      {
        "label": "",
        "cards": [
          {
            "label": "Tom telefon",
            "value": "Godtas",
            "detail": "",
            "tone": "green"
          },
          {
            "label": "12345678",
            "value": "Godtas",
            "detail": "",
            "tone": "green"
          },
          {
            "label": "1234567",
            "value": "Avvises",
            "detail": "",
            "tone": "red"
          },
          {
            "label": "abcdefgh",
            "value": "Avvises",
            "detail": "",
            "tone": "red"
          }
        ],
        "caption": "Navn er påkrevd. Ingen påmeldinger skal lagres.",
        "links": []
      }
    ]
  },
  {
    "lesson": "git-m07-o02",
    "step": 1,
    "anchor": "### Tre mapper, to utviklere, ett felles Git-repository\n\nDu skal arbeide i `Prog",
    "kind": "remote",
    "title": "To utviklere, ett delt repo",
    "frames": [
      {
        "label": "",
        "cards": [
          {
            "label": "utvikler-A",
            "value": "Arbeidsfiler + Git",
            "detail": "",
            "tone": "neutral"
          },
          {
            "label": "felles.git",
            "value": "Delt historikk",
            "detail": "Bare repo.",
            "tone": "blue"
          },
          {
            "label": "utvikler-B",
            "value": "Arbeidsfiler + Git",
            "detail": "",
            "tone": "neutral"
          }
        ],
        "caption": "Alt er lokalt i ProgressPal-Git-M07. Kommandoene bruker separate øvingsmapper.",
        "links": [
          "push / fetch",
          "push / fetch"
        ],
        "directions": [
          "both",
          "both"
        ]
      }
    ]
  },
  {
    "lesson": "git-m07-o03",
    "step": 4,
    "anchor": "### Hvorfor er det ikke ferdig?\n\nKoden avviser `1234567` fordi lengden er sju, m",
    "kind": "test",
    "title": "Lengde er ikke det samme som siffer",
    "frames": [
      {
        "label": "",
        "caption": "Prøv eksempelverdiene. Dette er en illustrasjon, ikke kjøring av prosjektkoden."
      }
    ],
    "short": "### Hvorfor er det ikke ferdig?\n\nDen første løsningen sjekker bare lengden. Den opprinnelige testen dekker ikke bokstavtilfellet. Prøv ulike verdier. En grønn test sier bare noe om tilfellene den faktisk sjekker."
  },
  {
    "lesson": "git-m07-o04",
    "step": 4,
    "anchor": "En ny kontroll bør først vise at den konkrete mangelen finnes. Deretter kan kode",
    "kind": "flow",
    "title": "Fra feilende test til rettelse",
    "frames": [
      {
        "label": "",
        "cards": [
          {
            "label": "Før",
            "value": "abcdefgh godtas",
            "detail": "Ny test feiler.",
            "tone": "red"
          },
          {
            "label": "Rettelse",
            "value": "Krev åtte siffer",
            "detail": "Endre valideringen.",
            "tone": "blue"
          },
          {
            "label": "Etter",
            "value": "abcdefgh avvises",
            "detail": "Ny test består.",
            "tone": "green"
          }
        ],
        "caption": "Kjør også testene for sju og åtte siffer.",
        "links": [
          "Rett koden",
          "Kjør testene igjen"
        ]
      }
    ]
  },
  {
    "lesson": "git-m07-o05",
    "step": 0,
    "anchor": "### Mens A retter koden, arbeider B videre\n\nUtvikler B har sin egen oppgave. I `",
    "kind": "graph",
    "title": "To endringer som skal fungere sammen",
    "frames": [
      {
        "label": "",
        "nodes": [
          {
            "id": "A",
            "x": 45,
            "y": 108,
            "label": "main",
            "tone": "blue"
          },
          {
            "id": "B",
            "x": 180,
            "y": 52,
            "label": "Telefon",
            "tone": "blue"
          },
          {
            "id": "C",
            "x": 180,
            "y": 164,
            "label": "Hjelpetekst",
            "tone": "amber"
          },
          {
            "id": "D",
            "x": 315,
            "y": 108,
            "label": "Samlet",
            "tone": "green"
          }
        ],
        "edges": [
          {
            "from": "A",
            "to": "B"
          },
          {
            "from": "A",
            "to": "C"
          },
          {
            "from": "B",
            "to": "D"
          },
          {
            "from": "C",
            "to": "D"
          }
        ],
        "caption": "Forenklet graf. I øvingen brukes to mergehendelser."
      }
    ],
    "short": "A endrer `valider.js`. B legger til hjelpetekst i `index.html`: «Hvis du skriver inn telefon, bruk åtte siffer». `aria-describedby` kobler hjelpeteksten til feltet, også for skjermlesere. Begge endringene skal beholdes."
  },
  {
    "lesson": "git-m07-o06",
    "step": 6,
    "anchor": "### Hvorfor ikke bare flytte main bakover?\n\nDen problematiske commiten finnes nå",
    "kind": "graph",
    "title": "Rett feilen framover",
    "frames": [
      {
        "label": "",
        "nodes": [
          {
            "id": "A",
            "x": 45,
            "y": 84,
            "label": "Fungerer",
            "tone": "blue"
          },
          {
            "id": "B",
            "x": 180,
            "y": 84,
            "label": "Regresjon",
            "tone": "red"
          },
          {
            "id": "C",
            "x": 315,
            "y": 84,
            "label": "Rettelse",
            "tone": "green"
          }
        ],
        "edges": [
          {
            "from": "A",
            "to": "B"
          },
          {
            "from": "B",
            "to": "C"
          }
        ],
        "caption": "Ny commit retter problemet uten å skrive om delt historikk."
      }
    ],
    "short": "Lokal reset reparerer ikke historikken hos andre. En **force-push** kan tvinge en remote branch til å peke på en annen historikk, selv når en vanlig push blir avvist. Det kan overskrive delt historikk. Her er fix forward en liten rettelse i en ny commit. Revert kan også være et alternativ hvis nyere arbeid ikke blir ødelagt."
  },
  {
    "lesson": "git-m07-o07",
    "step": 3,
    "anchor": "### En overlevering andre faktisk kan bruke\n\nTenk at du skal forklare den ferdig",
    "kind": "pr",
    "title": "En nyttig overlevering",
    "frames": [
      {
        "label": "",
        "cards": [
          {
            "label": "Endring",
            "value": "Telefonkontroll og hjelpetekst",
            "detail": "",
            "tone": "neutral"
          },
          {
            "label": "Tester",
            "value": "Tomt felt, åtte siffer, bokstaver",
            "detail": "",
            "tone": "neutral"
          },
          {
            "label": "Historikk",
            "value": "Oppgi hva som er delt",
            "detail": "",
            "tone": "neutral"
          },
          {
            "label": "Gjenstår",
            "value": "Nettlesersjekk hvis ikke gjort",
            "detail": "Skjemaet lagrer ingen data.",
            "tone": "neutral"
          }
        ],
        "caption": "Fortell hva du har gjort, hva du har sjekket og hva som gjenstår.",
        "links": []
      }
    ]
  },
  {
    "lesson": "git-m07-o08",
    "step": 0,
    "anchor": "### Den avsluttende oppgaven\n\nPåmeldingssiden har fått en ny bestilling: Navn på",
    "kind": "matrix",
    "title": "Ny oppgave: navnelengde",
    "frames": [
      {
        "label": "",
        "cards": [
          {
            "label": "40 tegn",
            "value": "Godtas",
            "detail": "",
            "tone": "green"
          },
          {
            "label": "41 tegn",
            "value": "Navn er for langt.",
            "detail": "",
            "tone": "red"
          },
          {
            "label": "Tomt navn",
            "value": "Avvises",
            "detail": "Behold eksisterende regel.",
            "tone": "red"
          },
          {
            "label": "Telefon",
            "value": "Samme regler som før",
            "detail": "",
            "tone": "neutral"
          }
        ],
        "caption": "Kollegaens overskriftsendring er ikke delt ennå. Du skal jobbe i det eksisterende M07-prosjektet.",
        "links": []
      }
    ]
  }
];

export function gitVisualFor(lesson: string, step: number, text: string) {
  return gitVisuals.find(
    (visual) =>
      visual.lesson === lesson &&
      visual.step === step &&
      text.startsWith(visual.anchor),
  );
}
