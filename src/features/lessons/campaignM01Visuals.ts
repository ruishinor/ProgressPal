import type { GitVisual } from './gitVisuals';

// Unit IDs and text prefixes bind visuals to existing authored blocks.
// No lesson positions, exercise hashes or saved answers change.
// prettier-ignore
export const campaignM01Visuals: readonly GitVisual[] = [
  {
    "lesson": "S1-M01-L01",
    "step": 0,
    "anchor": "I dag gjør du klart arbeidsstedet ditt og kjører ditt første Python-program. Når du er ferdig har du tre ting:",
    "kind": "flow",
    "title": "Tre ting du trenger",
    "frames": [
      {
        "label": "",
        "cards": [
          {
            "label": "Editor",
            "value": "VS Code",
            "detail": "Her skriver og lagrer du koden.",
            "tone": "blue"
          },
          {
            "label": "Fil",
            "value": "hei.py",
            "detail": "Ligger i mappen kode.",
            "tone": "neutral"
          },
          {
            "label": "Python",
            "value": "py hei.py",
            "detail": "Leser og kjører den lagrede filen.",
            "tone": "green"
          }
        ],
        "caption": "VS Code og Python har forskjellige jobber. Terminalen er stedet du skriver kommandoen.",
        "links": [
          "Ctrl+S",
          "Kjør i terminalen"
        ]
      }
    ],
    "short": "I dag setter du opp arbeidsstedet ditt og kjører ditt første Python-program. Du trenger en editor, en mappe og Python.\n\nHvis noe ikke virker, se tabellen «Når noe går galt» nederst eller delen «Feilsøking av oppsett» senere i M01."
  },
  {
    "lesson": "S1-M01-L01",
    "step": 2,
    "anchor": "## Først: hva er en terminal?\n\nEn **terminal** (terminal) er et tekstvindu der du gir datamaskinen beskjeder v",
    "kind": "terminal",
    "title": "Hva skriver du i terminalen?",
    "frames": [
      {
        "label": "",
        "cards": [
          {
            "label": "Teksten før kommandoen",
            "value": "PS C:\\Users\\ola>",
            "detail": "Dette står der allerede.",
            "tone": "neutral"
          },
          {
            "label": "Kommando",
            "value": "py --version",
            "detail": "Skriv dette og trykk Enter.",
            "tone": "blue"
          },
          {
            "label": "Utskrift",
            "value": "Python 3.14.4",
            "detail": "Les svaret. Versjonen din kan være en annen.",
            "tone": "green"
          }
        ],
        "caption": "Dette er en eksempelvisning, ikke en sjekk av maskinen din."
      }
    ],
    "short": "## Først: hva er en terminal?\n\nEn **terminal** er et vindu der du skriver beskjeder til datamaskinen. Hver beskjed kalles en **kommando**. PowerShell er skallet vi bruker i Windows-terminalen. Hvis en kommando ikke virker, kan du få en feilmelding. Du lærer å lese slike meldinger i «Din første feilmelding»."
  },
  {
    "lesson": "S1-M01-L01",
    "step": 12,
    "anchor": "4. Lagre filen med `Ctrl+S`. Hvis det står en liten prikk ved filnavnet i fanen øverst, er endringene dine **i",
    "kind": "comparison",
    "title": "Det du ser er ikke alltid det som er lagret",
    "frames": [
      {
        "label": "Før lagring",
        "cards": [
          {
            "label": "Editor · hei.py ●",
            "value": "print(\"Hei, Ola!\")",
            "detail": "Endringen er ikke lagret.",
            "tone": "amber"
          },
          {
            "label": "Lagret fil",
            "value": "print(\"Hei, verden!\")",
            "detail": "",
            "tone": "neutral"
          },
          {
            "label": "Terminal",
            "value": "Hei, verden!",
            "detail": "Python leser filen på disken.",
            "tone": "neutral"
          }
        ],
        "caption": "Når du kjører py hei.py, leser Python den lagrede filen."
      },
      {
        "label": "Etter Ctrl+S",
        "cards": [
          {
            "label": "Editor · hei.py",
            "value": "print(\"Hei, Ola!\")",
            "detail": "Endringen er lagret.",
            "tone": "green"
          },
          {
            "label": "Lagret fil",
            "value": "print(\"Hei, Ola!\")",
            "detail": "",
            "tone": "neutral"
          },
          {
            "label": "Neste kjøring",
            "value": "Hei, Ola!",
            "detail": "Kjør py hei.py på nytt.",
            "tone": "green"
          }
        ],
        "caption": "Lagring endrer filen, men starter ikke automatisk en ny kjøring."
      }
    ],
    "short": "4. Lagre filen med `Ctrl+S`. En prikk ved filnavnet betyr at endringene ikke er lagret."
  },
  {
    "lesson": "S1-M01-L02",
    "step": 1,
    "anchor": "## Terminalen står alltid i én mappe\n\nDet viktigste å forstå: terminalen står til enhver tid i **én mappe** («",
    "kind": "comparison",
    "title": "Hvor leter Python etter hei.py?",
    "frames": [
      {
        "label": "Hjemmemappen",
        "cards": [
          {
            "label": "Terminalen står i",
            "value": "C:\\Users\\ola",
            "detail": "pwd viser denne stien.",
            "tone": "blue"
          },
          {
            "label": "Filen ligger i",
            "value": "C:\\Users\\ola\\kode\\hei.py",
            "detail": "",
            "tone": "neutral"
          },
          {
            "label": "py hei.py",
            "value": "Filen finnes ikke her.",
            "detail": "Forutsetter at det ikke ligger en annen hei.py i hjemmemappen.",
            "tone": "red"
          }
        ],
        "caption": "Python leter etter det relative filnavnet fra gjeldende mappe."
      },
      {
        "label": "Etter cd kode",
        "cards": [
          {
            "label": "Terminalen står i",
            "value": "C:\\Users\\ola\\kode",
            "detail": "Nå er du i riktig mappe.",
            "tone": "blue"
          },
          {
            "label": "Filen ligger her",
            "value": "hei.py",
            "detail": "",
            "tone": "neutral"
          },
          {
            "label": "py hei.py",
            "value": "Hei, verden!",
            "detail": "Hvis filen inneholder det første programmet.",
            "tone": "green"
          }
        ],
        "caption": "Det er terminalen som bytter gjeldende mappe. Filen flyttes ikke."
      }
    ],
    "short": "## Terminalen står alltid i én mappe\n\nDen **gjeldende mappen** er utgangspunktet for relative filnavn. Se på stien foran kommandoen, eller bruk `pwd`."
  },
  {
    "lesson": "S1-M01-L02",
    "step": 3,
    "anchor": "PowerShell godtar også `dir` for det samme som `ls`. I dette programmet bruker vi `ls`, men begge virker.\n\n**E",
    "kind": "flow",
    "title": "Gå opp ett mappenivå",
    "frames": [
      {
        "label": "",
        "cards": [
          {
            "label": "Før",
            "value": "C:\\Users\\ola\\kode",
            "detail": "Du står i kode.",
            "tone": "blue"
          },
          {
            "label": "Etter",
            "value": "C:\\Users\\ola",
            "detail": "Du står i mappen over.",
            "tone": "green"
          }
        ],
        "caption": "cd .. flytter ikke filer.",
        "links": [
          "cd .."
        ]
      }
    ],
    "short": "PowerShell godtar både `dir` og `ls`. I dette kurset bruker vi `ls`.\n\n**Ett nivå opp: `cd ..`.** To punktum betyr mappen over."
  },
  {
    "lesson": "S1-M01-L03",
    "step": 3,
    "anchor": "`print` er en **funksjon** (function): en ferdig liten jobb som Python kan gjøre for deg. Du ber Python gjøre ",
    "kind": "flow",
    "title": "En funksjon og det du gir den",
    "frames": [
      {
        "label": "",
        "cards": [
          {
            "label": "Funksjonsnavn",
            "value": "print",
            "detail": "Funksjonen skriver ut det du gir den.",
            "tone": "blue"
          },
          {
            "label": "Argument",
            "value": "\"Hei, verden!\"",
            "detail": "Teksten mellom anførselstegnene.",
            "tone": "neutral"
          },
          {
            "label": "Utskrift",
            "value": "Hei, verden!",
            "detail": "Anførselstegnene er ikke med.",
            "tone": "green"
          }
        ],
        "caption": "Parentesene hører til funksjonskallet. Anførselstegnene avgrenser teksten."
      }
    ],
    "short": "`print` er en **funksjon** (function). Du kaller den ved å skrive navnet og parentesene. Verdien du gir funksjonen, kalles et argument."
  },
  {
    "lesson": "S1-M01-L03",
    "step": 6,
    "anchor": "## Tomme linjer og flere deler i én linje\n\n`print()` uten noe i parentesen skriver ut en tom linje.\n\nDu kan og",
    "kind": "comparison",
    "title": "Tre måter å bruke print",
    "frames": [
      {
        "label": "Én tekst",
        "cards": [
          {
            "label": "Kode",
            "value": "print(\"Hei\")",
            "detail": "Ett argument.",
            "tone": "blue"
          },
          {
            "label": "Utskrift",
            "value": "Hei",
            "detail": "",
            "tone": "green"
          }
        ],
        "caption": "Utskriften avsluttes med et linjeskift."
      },
      {
        "label": "Flere argumenter",
        "cards": [
          {
            "label": "Kode",
            "value": "print(\"Hei\", \"Kari\")",
            "detail": "To argumenter.",
            "tone": "blue"
          },
          {
            "label": "Utskrift",
            "value": "Hei Kari",
            "detail": "Standard: ett mellomrom mellom argumentene.",
            "tone": "green"
          }
        ],
        "caption": "Kommaet skiller argumentene i koden. Det blir ikke skrevet ut."
      },
      {
        "label": "Ingen argumenter",
        "cards": [
          {
            "label": "Kode",
            "value": "print()",
            "detail": "Ingen argumenter.",
            "tone": "blue"
          },
          {
            "label": "Utskrift",
            "value": "[tom linje]",
            "detail": "Bare et linjeskift, ikke teksten i klammene.",
            "tone": "green"
          }
        ],
        "caption": "Du kan bruke print() for å lage avstand mellom linjene."
      }
    ],
    "short": "## Tomme linjer og flere deler i én linje\n\n`print()` kan få ingen, ett eller flere argumenter. Se hvordan det påvirker utskriften."
  },
  {
    "lesson": "S1-M01-L03",
    "step": 8,
    "anchor": "## En tekst eller flere deler?\n\nDisse to linjene ser nesten like ut, men de er ikke det samme:\n\n- `print(\"Hei,",
    "kind": "comparison",
    "title": "Komma inni eller utenfor teksten",
    "frames": [
      {
        "label": "",
        "cards": [
          {
            "label": "Ett argument",
            "value": "print(\"Hei, Kari\")",
            "detail": "Utskrift: Hei, Kari",
            "tone": "blue"
          },
          {
            "label": "To argumenter",
            "value": "print(\"Hei\", \"Kari\")",
            "detail": "Utskrift: Hei Kari",
            "tone": "green"
          }
        ],
        "caption": "Komma inni anførselstegn er en del av teksten. Komma utenfor skiller argumenter."
      }
    ],
    "short": "## En tekst eller flere deler?\n\nFor fast tekst kan én tekststreng være enklest. Flere argumenter er nyttig når du vil kombinere tekst med for eksempel et regnestykke."
  },
  {
    "lesson": "S1-M01-L03",
    "step": 10,
    "anchor": "## Tekst eller regnestykke?\n\nTekst står mellom anførselstegn (\"), for eksempel `\"Hei\"`. Da vet Python at dette",
    "kind": "comparison",
    "title": "Samme tegn, forskjellig betydning",
    "frames": [
      {
        "label": "Tekst",
        "cards": [
          {
            "label": "Kode",
            "value": "print(\"2 + 3\")",
            "detail": "Anførselstegn avgrenser en tekststreng.",
            "tone": "blue"
          },
          {
            "label": "Utskrift",
            "value": "2 + 3",
            "detail": "",
            "tone": "green"
          }
        ],
        "caption": "Python regner ikke ut innholdet i en tekststreng."
      },
      {
        "label": "Regnestykke",
        "cards": [
          {
            "label": "Kode",
            "value": "print(2 + 3)",
            "detail": "To heltall og en operator.",
            "tone": "blue"
          },
          {
            "label": "Utskrift",
            "value": "5",
            "detail": "",
            "tone": "green"
          }
        ],
        "caption": "Python regner ut uttrykket før print skriver ut resultatet."
      }
    ],
    "short": "## Tekst eller regnestykke?\n\nPython skiller mellom **tekststreng** (string, `str`), **heltall** (integer, `int`) og **desimaltall** (`float`). `\"2\"` er tekst, `2` er et heltall, og `2.5` er et desimaltall. I Python skrives desimaltall med punktum. I M01 bruker vi bare `+` mellom heltall; i M02 lærer du mer om typer og regning."
  },
  {
    "lesson": "S1-M01-L04",
    "step": 1,
    "anchor": "## Fire ting å skrive ned\n\n- **Inndata** (input): det programmet må få vite eller få tilgang til for å gjøre j",
    "kind": "flow",
    "title": "Fra navn til hilsen",
    "frames": [
      {
        "label": "",
        "cards": [
          {
            "label": "Input · inndata",
            "value": "Kari",
            "detail": "Navnet programmet får.",
            "tone": "blue"
          },
          {
            "label": "Processing · behandling",
            "value": "Sett sammen \"Hei, \" + navn + \"!\"",
            "detail": "Dette er en plan for jobben, ikke et ferdig program.",
            "tone": "neutral"
          },
          {
            "label": "Output · utdata",
            "value": "Hei, Kari!",
            "detail": "Det programmet skal skrive ut.",
            "tone": "green"
          }
        ],
        "caption": "Begrensning: Hilsenen skal være på norsk og slutte med !. Uklart punkt: Hva skjer hvis navnet er tomt?",
        "links": [
          "Sett sammen",
          "Vis resultat"
        ]
      }
    ],
    "short": "## Fire ting å skrive ned\n\nInndata er det programmet får, behandling er det programmet gjør, og utdata er det du får tilbake. **Begrensninger** (constraints) er krav løsningen alltid må følge.\n\nI oppgavene skal du også finne minst ett uklart punkt du må spørre om."
  },
  {
    "lesson": "S1-M01-L04",
    "step": 4,
    "anchor": "## Når oppgaven kommer fra en person\n\nEr oppgaven gitt av en person (en kunde, lærer eller kollega), er den of",
    "kind": "comparison",
    "title": "Fire spørsmål før du skriver kode",
    "frames": [
      {
        "label": "",
        "cards": [
          {
            "label": "Hvem?",
            "value": "Kollegaene",
            "detail": "Hvem skal bruke løsningen?",
            "tone": "neutral"
          },
          {
            "label": "Hva?",
            "value": "En hilsen på skjermen",
            "detail": "Hva skal programmet gjøre?",
            "tone": "blue"
          },
          {
            "label": "Hvorfor?",
            "value": "Ønske nye ansatte velkommen",
            "detail": "Hvilket behov løser det?",
            "tone": "neutral"
          },
          {
            "label": "Hvordan?",
            "value": "Skriv inn navn",
            "detail": "Hvordan brukes løsningen?",
            "tone": "green"
          }
        ],
        "caption": "Dette er et lite eksempel på å avklare en bestilling."
      }
    ],
    "short": "## Når oppgaven kommer fra en person\n\nKunder, lærere og kollegaer har ikke alltid beskrevet alt du trenger å vite. Still disse spørsmålene før du bestemmer hvordan løsningen skal fungere."
  },
  {
    "lesson": "S1-M01-L05",
    "step": 1,
    "anchor": "## Ti steg\n\nKjeden under er en forenklet modell. I virkeligheten hopper man frem og tilbake: når du tester, op",
    "kind": "flow",
    "title": "Testing kan sende deg tilbake",
    "frames": [
      {
        "label": "",
        "cards": [
          {
            "label": "Krav",
            "value": "Vis en hilsen med navn",
            "detail": "Hva løsningen må gjøre.",
            "tone": "neutral"
          },
          {
            "label": "Kode",
            "value": "Programmet bygges",
            "detail": "Du prøver en løsning.",
            "tone": "blue"
          },
          {
            "label": "Test",
            "value": "Hva hvis navnet er tomt?",
            "detail": "Du oppdager et uklart krav.",
            "tone": "amber"
          },
          {
            "label": "Tilbake til krav",
            "value": "Avklar tomt navn",
            "detail": "Endre planen og test igjen.",
            "tone": "green"
          }
        ],
        "caption": "Du trenger ikke følge de ti stegene én gang hver. Det er vanlig å gå tilbake når du oppdager noe nytt.",
        "links": [
          "Planlegg og bygg",
          "Prøv",
          "Avklar"
        ]
      }
    ],
    "short": "## Ti steg\n\nTabellen viser en vanlig arbeidsflyt fra problem til presentasjon. Et **krav** (requirement) sier hva løsningen må gjøre eller tåle. Du kan gå tilbake til et tidligere steg når du lærer noe nytt."
  },
  {
    "lesson": "S1-M01-L06",
    "step": 1,
    "anchor": "## Fire steg\n\n1. **Les** programmet linje for linje, ovenfra og ned. Ikke hopp.\n2. **Skriv ned** hva hver linj",
    "kind": "flow",
    "title": "Les koden én linje om gangen",
    "frames": [
      {
        "label": "Linje 1",
        "cards": [
          {
            "label": "Aktiv linje",
            "value": "print(\"A\")",
            "detail": "Første linje kjøres.",
            "tone": "blue"
          },
          {
            "label": "Utskrift",
            "value": "A",
            "detail": "",
            "tone": "green"
          }
        ],
        "caption": "Forenklet eksempel: programmet består av print(\"A\"), print() og print(\"B\")."
      },
      {
        "label": "Linje 2",
        "cards": [
          {
            "label": "Aktiv linje",
            "value": "print()",
            "detail": "Legger til en tom linje.",
            "tone": "blue"
          },
          {
            "label": "Utskrift",
            "value": "A\n[tom linje]",
            "detail": "Klammene viser hvor linjen er, ikke tekst fra Python.",
            "tone": "green"
          }
        ],
        "caption": "Den første linjen er fortsatt skrevet ut."
      },
      {
        "label": "Linje 3",
        "cards": [
          {
            "label": "Aktiv linje",
            "value": "print(\"B\")",
            "detail": "Siste linje kjøres.",
            "tone": "blue"
          },
          {
            "label": "Utskrift",
            "value": "A\n\nB",
            "detail": "",
            "tone": "green"
          }
        ],
        "caption": "Nå kan du sammenligne hele utskriften med forutsigelsen din."
      }
    ],
    "short": "## Fire steg\n\nLes koden ovenfra og ned. Skriv ned hva hver linje vil skrive ut, også tomme linjer. Kjør programmet og sammenlign. Hvis utskriften er annerledes, finn den første linjen du misforsto."
  },
  {
    "lesson": "S1-M01-L07",
    "step": 4,
    "anchor": "Hele meldingen kalles en **traceback** (traceback). Les den **nedenfra og opp**:\n\n- **Siste linje** er den vik",
    "kind": "flow",
    "title": "Les feilmeldingen nedenfra og opp",
    "frames": [
      {
        "label": "",
        "cards": [
          {
            "label": "1 · Feiltype og forklaring",
            "value": "NameError: name 'pritn' is not defined",
            "detail": "Python kjenner ikke navnet pritn.",
            "tone": "red"
          },
          {
            "label": "2 · Koden som feilet",
            "value": "pritn(\"Hei\")\n^^^^^",
            "detail": "Se på navnet pilene peker mot.",
            "tone": "amber"
          },
          {
            "label": "3 · Fil og linje",
            "value": "File \"…hei.py\", line 1",
            "detail": "Åpne hei.py og se på linje 1.",
            "tone": "blue"
          }
        ],
        "caption": "Hele meldingen kalles en traceback. Nyere Python kan foreslå print.",
        "links": [
          "Finn koden",
          "Finn stedet"
        ]
      }
    ],
    "short": "Hele meldingen kalles en **traceback**. Start med siste linje og les deg oppover til koden og filnavnet. Eksemplet over har en skrivefeil i `pritn`."
  },
  {
    "lesson": "S1-M01-L07",
    "step": 11,
    "anchor": "## Når oppdages feilen?\n\nPython leser **hele filen** først. Er det en `SyntaxError` (eller `IndentationError`)",
    "kind": "comparison",
    "title": "Når stopper Python?",
    "frames": [
      {
        "label": "SyntaxError",
        "cards": [
          {
            "label": "Linje 1",
            "value": "print(\"A\")",
            "detail": "Gyldig kode.",
            "tone": "neutral"
          },
          {
            "label": "Linje 2",
            "value": "print(\"B)",
            "detail": "Mangler et avsluttende anførselstegn.",
            "tone": "red"
          },
          {
            "label": "Utskrift",
            "value": "Ingen programutskrift",
            "detail": "Filen kan ikke tolkes som gyldig Python-kode.",
            "tone": "red"
          }
        ],
        "caption": "For en vanlig Python-fil oppdages syntaksfeilen før filen begynner å kjøre."
      },
      {
        "label": "NameError",
        "cards": [
          {
            "label": "Linje 1",
            "value": "print(\"A\")",
            "detail": "Kjøres.",
            "tone": "green"
          },
          {
            "label": "Linje 2",
            "value": "print(B)",
            "detail": "Navnet B finnes ikke i dette eksemplet.",
            "tone": "red"
          },
          {
            "label": "Utskrift",
            "value": "A",
            "detail": "Deretter kommer feilmeldingen.",
            "tone": "amber"
          }
        ],
        "caption": "Ved NameError kan tidligere linjer allerede ha kjørt."
      }
    ],
    "short": "## Når oppdages feilen?\n\nNår du kjører en vanlig Python-fil, blir syntaksen sjekket før programmet begynner å kjøre. En `SyntaxError` eller `IndentationError` kan derfor stoppe alt. En `NameError` oppstår når Python kommer til et navn som ikke finnes."
  },
  {
    "lesson": "S1-M01-L07",
    "step": 14,
    "anchor": "## Rutinen\n\nBruk den samme rutinen hver gang:\n\n1. **Les** siste linje: feiltype og forklaring.\n2. **Finn linje",
    "kind": "flow",
    "title": "Endre én ting og prøv igjen",
    "frames": [
      {
        "label": "",
        "cards": [
          {
            "label": "Les feilen",
            "value": "NameError",
            "detail": "Finn forklaringen og linjen.",
            "tone": "red"
          },
          {
            "label": "Undersøk",
            "value": "pritn → print",
            "detail": "Finn en mulig årsak og rett bare den.",
            "tone": "amber"
          },
          {
            "label": "Kjør igjen",
            "value": "Hei",
            "detail": "Se om feilen er borte eller om du får en ny melding.",
            "tone": "green"
          }
        ],
        "caption": "Når du endrer én ting om gangen, er det lettere å se hva som hjalp.",
        "links": [
          "Finn årsak",
          "Kjør på nytt"
        ]
      }
    ],
    "short": "## Rutinen\n\nLes siste linje i feilmeldingen, finn stedet i koden og tenk gjennom årsaken. Endre én ting. Kjør på nytt og se hva som skjer."
  },
  {
    "lesson": "S1-M01-L08",
    "step": 7,
    "anchor": "Gå gjennom det som skjedde:\n\n- `git init` gjør mappen til et lokalt *repository* (Git-prosjekt) og oppretter d",
    "kind": "flow",
    "title": "Arbeidsmappe, staging area og commit",
    "frames": [
      {
        "label": "Etter lagring",
        "cards": [
          {
            "label": "Arbeidsmappe",
            "value": "hei.py",
            "detail": "Filen er lagret i editoren.",
            "tone": "blue"
          },
          {
            "label": "Staging area",
            "value": "Tom",
            "detail": "Ingenting er valgt ennå.",
            "tone": "neutral"
          },
          {
            "label": "Historikk",
            "value": "Ingen commit",
            "detail": "I dette nye repoet.",
            "tone": "neutral"
          }
        ],
        "caption": "git init oppretter repoet, men lager ingen commit."
      },
      {
        "label": "Etter git add",
        "cards": [
          {
            "label": "Arbeidsmappe",
            "value": "hei.py",
            "detail": "",
            "tone": "neutral"
          },
          {
            "label": "Staging area",
            "value": "hei.py",
            "detail": "Valgt til neste commit.",
            "tone": "blue"
          },
          {
            "label": "Historikk",
            "value": "Ingen commit",
            "detail": "",
            "tone": "neutral"
          }
        ],
        "caption": "git add velger filens innhold slik det er akkurat nå."
      },
      {
        "label": "Etter git commit",
        "cards": [
          {
            "label": "Arbeidsmappe",
            "value": "hei.py",
            "detail": "",
            "tone": "neutral"
          },
          {
            "label": "Staging area",
            "value": "hei.py",
            "detail": "Innholdet samsvarer med siste commit.",
            "tone": "neutral"
          },
          {
            "label": "Historikk",
            "value": "Legg til hei-program",
            "detail": "En lagret versjon.",
            "tone": "green"
          }
        ],
        "caption": "git log --oneline viser commit-historikken."
      }
    ],
    "short": "`git init` gjør mappen til et lokalt **repository** og oppretter den skjulte `.git`-mappen. Ikke slett den. Bruk `git status` for å se endringer, `git add hei.py` for å velge innholdet, og `git commit -m \"Legg til hei-program\"` for å lagre en versjon. `git log --oneline` viser tidligere commits, med nyeste først. Den korte koden er en forkortet commit-hash."
  },
  {
    "lesson": "S1-M01-L08",
    "step": 9,
    "anchor": "## Den andre *commiten*: les kort status\n\nEtter at du har endret og lagret `hei.py`, viser `git status --short",
    "kind": "status",
    "title": "Les de to statusplassene",
    "frames": [
      {
        "label": "",
        "rows": [
          {
            "x": "?",
            "y": "?",
            "file": "hei.py",
            "meaning": "Ny fil Git ikke følger."
          },
          {
            "x": "A",
            "y": " ",
            "file": "hei.py",
            "meaning": "Ny fil valgt til neste commit."
          },
          {
            "x": " ",
            "y": "M",
            "file": "hei.py",
            "meaning": "Endret i arbeidsmappen, ikke staged."
          },
          {
            "x": "M",
            "y": " ",
            "file": "hei.py",
            "meaning": "Endringen er staged."
          },
          {
            "x": "M",
            "y": "M",
            "file": "hei.py",
            "meaning": "En versjon er staged, men filen er også endret etterpå."
          }
        ],
        "caption": "Første plass gjelder staging area. Andre plass gjelder arbeidsmappen."
      }
    ],
    "short": "## Den andre commiten: les kort status\n\n`git status --short` viser to statusplasser før filnavnet."
  },
  {
    "lesson": "S1-M01-L09",
    "step": 2,
    "anchor": "## Slik spør du: fire deler\n\n1. **Mål:** hva prøver du å få til?\n2. **Forsøk:** hva har du prøvd? Lim inn kode",
    "kind": "flow",
    "title": "Bygg et spørsmål til KI",
    "frames": [
      {
        "label": "",
        "cards": [
          {
            "label": "Mål",
            "value": "Jeg vil skrive ut Hei!",
            "detail": "",
            "tone": "neutral"
          },
          {
            "label": "Forsøk",
            "value": "pritn(\"Hei!\")",
            "detail": "Del bare ufarlig øvingskode.",
            "tone": "neutral"
          },
          {
            "label": "Hva skjedde?",
            "value": "NameError: name 'pritn' is not defined",
            "detail": "Bruk den relevante feilmeldingen.",
            "tone": "red"
          },
          {
            "label": "Hva slags hjelp?",
            "value": "Gi meg et hint.",
            "detail": "Be om forklaring, ikke en ferdig løsning.",
            "tone": "blue"
          }
        ],
        "caption": "Fjern passord, nøkler og personopplysninger før du deler noe."
      }
    ],
    "short": "## Slik spør du: fire deler\n\nForklar målet, hva du har prøvd, hva som skjedde, og hva slags hjelp du trenger. Bruk et konkret eksempel i stedet for bare å skrive «det virker ikke»."
  },
  {
    "lesson": "S1-M01-L09",
    "step": 4,
    "anchor": "## Sjekk svaret før du bruker det\n\n1. **Les** svaret. Forstår du hver linje?\n2. **Kjør** koden selv. KI kan fi",
    "kind": "flow",
    "title": "Fra KI-forslag til egen forståelse",
    "frames": [
      {
        "label": "",
        "cards": [
          {
            "label": "Forslag",
            "value": "Les koden",
            "detail": "Hva gjør hver linje?",
            "tone": "blue"
          },
          {
            "label": "Prøv selv",
            "value": "Kjør koden",
            "detail": "Sammenlign med forventet utskrift.",
            "tone": "neutral"
          },
          {
            "label": "Forklar",
            "value": "Hva skjedde?",
            "detail": "Kan du forklare resultatet med egne ord?",
            "tone": "green"
          }
        ],
        "caption": "Hvis du ikke forstår svaret, be om en enklere forklaring.",
        "links": [
          "Kjør",
          "Sammenlign"
        ]
      }
    ],
    "short": "## Sjekk svaret før du bruker det\n\nKI kan foreslå kode som ikke virker. Les, kjør, forklar og test. Under er et laget eksempel på et KI-svar, ikke en ekte samtale. Prøv det selv."
  },
  {
    "lesson": "S1-M01-LAB",
    "step": 0,
    "anchor": "I denne labben gjør du hele sløyfen fra denne modulen, med en liten plan: du skriver et program, kjører det, ø",
    "kind": "flow",
    "title": "Arbeidsflyten i labben",
    "frames": [
      {
        "label": "",
        "cards": [
          {
            "label": "Skriv og lagre",
            "value": "hei.py",
            "detail": "Lag programmet.",
            "tone": "blue"
          },
          {
            "label": "Kjør og undersøk",
            "value": "Endre med vilje",
            "detail": "Les feilmeldingen.",
            "tone": "amber"
          },
          {
            "label": "Rett og kjør igjen",
            "value": "Forventet utskrift",
            "detail": "Sjekk resultatet.",
            "tone": "green"
          },
          {
            "label": "Lagre en versjon",
            "value": "Commit",
            "detail": "Avslutt med å prøve og sjekke et KI-hint.",
            "tone": "neutral"
          }
        ],
        "caption": "Bruk prosjektet ditt i mappen kode. Du følger de konkrete stegene under.",
        "links": [
          "Kjør",
          "Rett",
          "Commit"
        ]
      }
    ],
    "short": "I denne labben setter du sammen det du har lært i M01. Bruk maskinen din og prosjektet ditt i mappen `kode`."
  }
];

export function campaignM01VisualFor(unitId: string, text: string) {
  return campaignM01Visuals.find(
    (visual) => visual.lesson === unitId && text.startsWith(visual.anchor),
  );
}
