import type { LessonBlock } from '@/lib/domain';

type TextRevision = {
  readonly path: readonly (string | number)[];
  readonly before: string;
  readonly after: string;
};

// Product presentation revisions bound to the current authored fields.
// Never used by the evaluator, reward planner or persisted content identity.
// prettier-ignore
export const campaignM02Revisions: Readonly<Record<string, readonly TextRevision[]>> = {
  "S1-M02-L01:1": [
    {
      "path": [
        "nb"
      ],
      "before": "## Verdi og variabel\n\nEn **verdi** (value) er data, for eksempel tallet `3` eller teksten `\"Kari\"`. En **variabel** (variable) er et navn du gir en verdi, slik at du kan bruke verdien senere. Du lager en variabel med tegnet `=`:",
      "after": "## Verdi og variabel\n\nEn **verdi** (value) er data, for eksempel tallet `3` eller teksten `\"Kari\"`. En **variabel** (variable) er et navn som viser til en verdi, slik at du kan bruke den senere."
    }
  ],
  "S1-M02-L01:2": [
    {
      "path": [
        "nb"
      ],
      "before": "Uten anførselstegn henter Python verdien som ligger under navnet. Med anførselstegn skriver den ut selve ordet, slik du gjorde i forrige modul.",
      "after": "`print(antall)` henter verdien som navnet viser til. `print(\"antall\")` skriver ut teksten antall."
    }
  ],
  "S1-M02-L01:3": [
    {
      "path": [
        "nb"
      ],
      "before": "## `=` betyr «lagre», ikke «er lik»\n\nTegnet `=` er en **tilordning** (assignment): «regn ut høyresiden, og lagre resultatet under navnet til venstre». Det er ikke et likhetstegn slik som i matematikken. Python regner ut høyresiden først. Derfor er dette helt lovlig:",
      "after": "## Tilordning med `=`\n\nPython regner ut høyresiden først og knytter navnet til venstre til resultatet. Slik kan en variabel få en ny verdi:"
    }
  ],
  "S1-M02-L01:5": [
    {
      "path": [
        "nb"
      ],
      "before": "Tabellen under viser hva variabelen inneholder etter hver linje. Et slikt skjema kalles en **verditabell**, og du kommer til å lage mange.",
      "after": "Tabellen viser hva variabelen inneholder etter hver linje. Dette kalles en **verditabell**."
    }
  ],
  "S1-M02-L01:7": [
    {
      "path": [
        "nb"
      ],
      "before": "## Variabler oppdateres ikke av seg selv\n\nDette er den vanligste misforståelsen. Når du bruker en variabel i en utregning, bruker Python verdien den har *akkurat da*. Endrer du variabelen senere, endres ikke det som ble regnet ut tidligere:",
      "after": "## Variabler oppdateres ikke av seg selv\n\nPython bruker verdiene variablene har akkurat når uttrykket kjøres. Uttrykket regnes ikke ut på nytt bare fordi en variabel får en ny verdi senere."
    }
  ],
  "S1-M02-P01-E04": [
    {
      "path": [
        "hints",
        0
      ],
      "before": "Linje 2 kopierer verdien til `b`. Er `a` og `b` knyttet sammen etterpå?",
      "after": "Etter linje 2 viser både `a` og `b` til tallet 4. Hvilket navn får en ny verdi på linje 3?"
    },
    {
      "path": [
        "feedback",
        "incorrect"
      ],
      "before": "Linje 2 kopierer verdien. Etterpå er `a` og `b` hver sine variabler.",
      "after": "Begge navn viser først til tallet 4. Linje 3 gir bare `b` en ny verdi."
    }
  ],
  "S1-M02-P01-E08": [
    {
      "path": [
        "hints",
        0
      ],
      "before": "Er `a` og `b` knyttet sammen etter at `b = a` er kjørt?",
      "after": "Hvilket navn får en ny verdi på linje 3?"
    },
    {
      "path": [
        "feedback",
        "incorrect"
      ],
      "before": "Variabler er uavhengige etter en kopiering.",
      "after": "Linje 3 gir `b` en ny heltallsverdi. `a` viser fortsatt til 4."
    },
    {
      "path": [
        "traps",
        0,
        "feedback"
      ],
      "before": "Linje 2 kopierer verdien. `a` er ikke knyttet til `b` etterpå.",
      "after": "Linje 2 gir `b` samme verdi som `a`. Linje 3 gir bare `b` en ny verdi."
    }
  ],
  "S1-M02-P01-E11": [
    {
      "path": [
        "feedback",
        "correct"
      ],
      "before": "Riktig.",
      "after": "Python regner ut summen ved hjelp av de to variablene. Derfor kan du endre tallene uten å endre regnestykket."
    }
  ],
  "S1-M02-P01-E12": [
    {
      "path": [
        "feedback",
        "correct"
      ],
      "before": "Riktig.",
      "after": "Navnet må være opprettet før `print()` prøver å hente verdien."
    }
  ],
  "S1-M02-L02:2": [
    {
      "path": [
        "rows",
        3,
        1
      ],
      "before": "deling, gir alltid et desimaltall",
      "after": "deling av heltall, gir float"
    },
    {
      "path": [
        "rows",
        4,
        1
      ],
      "before": "heltallsdeling: hvor mange hele ganger",
      "after": "gulvdeling: runder kvotienten ned"
    }
  ],
  "S1-M02-L02:3": [
    {
      "path": [
        "nb"
      ],
      "before": "## Desimaltall\n\nTall med desimaler kalles **desimaltall** (float). I Python skriver du desimalpunktum, ikke komma: `2.5`, ikke `2,5`. Operatoren `/` gir alltid et desimaltall, også når svaret går opp:",
      "after": "## Desimaltall\n\nTall med desimaler kalles **desimaltall** (float). I Python skriver du desimalpunktum, ikke komma: `2.5`, ikke `2,5`. Når du deler heltall med `/`, får du en float, også når svaret går opp."
    }
  ],
  "S1-M02-L02:4": [
    {
      "path": [
        "nb"
      ],
      "before": "6 / 2 gir 3.0 (desimaltall) og ikke 3. Bruk // når du vil ha et helt tall. % gir resten som blir til overs.",
      "after": "`6 / 2` gir `3.0` (float). Med `//` rundes kvotienten ned; to heltall gir et heltallsresultat. Med en float kan resultatet også være en float. `%` gir resten etter delingen."
    }
  ],
  "S1-M02-L02-E01": [
    {
      "path": [
        "feedback",
        "correct"
      ],
      "before": "Riktig.",
      "after": "`8 / 2` gir 4.0, mens `8 // 3` gir 2 og `8 % 3` gir resten 2."
    }
  ],
  "S1-M02-L02-E02": [
    {
      "path": [
        "feedback",
        "correct"
      ],
      "before": "Riktig.",
      "after": "Gange regnes ut før pluss: 3 * 4 er 12, og 2 + 12 er 14."
    }
  ],
  "S1-M02-L02:13": [
    {
      "path": [
        "can",
        1
      ],
      "before": "forklare at / gir et desimaltall og // et helt tall",
      "after": "forklare forskjellen på / og // når du deler heltall"
    }
  ],
  "S1-M02-P02:0": [
    {
      "path": [
        "nb"
      ],
      "before": "Forutsi først, kjør etterpå. Legg merke til at resultatet av `/` alltid er et desimaltall.",
      "after": "Forutsi først, kjør etterpå. Husk at `/` gir en float når du deler heltall, selv når delingen går opp."
    }
  ],
  "S1-M02-P02-E01": [
    {
      "path": [
        "feedback",
        "correct"
      ],
      "before": "Riktig.",
      "after": "Første linje trekker 4 fra 10. Den andre ganger 10 med 4."
    }
  ],
  "S1-M02-P02-E02": [
    {
      "path": [
        "feedback",
        "correct"
      ],
      "before": "Riktig.",
      "after": "`/` gir float når du deler heltall: 9 / 3 gir 3.0, og 10 / 4 gir 2.5."
    }
  ],
  "S1-M02-P02-E03": [
    {
      "path": [
        "feedback",
        "correct"
      ],
      "before": "Riktig.",
      "after": "4 går opp to ganger i 10, med 2 til overs. Derfor blir begge svarene 2."
    }
  ],
  "S1-M02-P02-E04": [
    {
      "path": [
        "feedback",
        "correct"
      ],
      "before": "Riktig.",
      "after": "Uten parentes regnes gangingen først. Med parentes regnes 2 + 3 først. På siste linje blir produktene 6 og 20 lagt sammen."
    }
  ],
  "S1-M02-P02-E05": [
    {
      "path": [
        "feedback",
        "correct"
      ],
      "before": "Riktig.",
      "after": "`**` betyr potens, ikke gange. `7 % 7` gir 0 fordi delingen går opp."
    }
  ],
  "S1-M02-P02-E06": [
    {
      "path": [
        "feedback",
        "correct"
      ],
      "before": "Riktig.",
      "after": "Python henter 4 og 25 fra variablene, ganger dem og skriver ut totalen 100."
    }
  ],
  "S1-M02-P02-E07": [
    {
      "path": [
        "feedback",
        "correct"
      ],
      "before": "Riktig.",
      "after": "23 kopper fordelt på 4 bord gir 5 per bord og 3 til overs."
    }
  ],
  "S1-M02-P02-E08": [
    {
      "path": [
        "feedback",
        "correct"
      ],
      "before": "Riktig.",
      "after": "Kommaet skiller to argumenter til `print()`. Punktumet i 3.5 er en del av tallet."
    }
  ],
  "S1-M02-P02-E09": [
    {
      "path": [
        "feedback",
        "correct"
      ],
      "before": "Riktig.",
      "after": "Når pris eller antall endres, kan du bruke samme utregning for å få en ny total."
    }
  ],
  "S1-M02-P02-E10": [
    {
      "path": [
        "feedback",
        "correct"
      ],
      "before": "Riktig.",
      "after": "17 = 3 * 5 + 2. `//` finner antallet hele grupper, `%` finner resten."
    }
  ],
  "S1-M02-L03:0": [
    {
      "path": [
        "nb"
      ],
      "before": "Python bryr seg ikke om hva du kaller variablene dine, men mennesker gjør det. Kode leses mye oftere enn den skrives, og den viktigste leseren er deg selv om en uke. I denne leksjonen lærer du reglene for variabelnavn og en fast måte å velge gode navn på.",
      "after": "Python har regler for hvilke navn du kan bruke. Innenfor de reglene velger du navn som gjør koden lett å lese, også når du åpner den igjen om en uke."
    }
  ],
  "S1-M02-L03:5": [
    {
      "path": [
        "nb"
      ],
      "before": "Bruker du et navn Python allerede bruker, overskriver du det. Etter den første linjen under er `print` ikke lenger en utskriftsfunksjon, men tallet 5. Feilmeldingen sier at tallet ikke kan brukes som en funksjon:",
      "after": "`print` er et navn Python allerede kjenner. Hvis du bruker `print = 5`, viser navnet til tallet 5 i stedet for den innebygde funksjonen. Da kan du ikke lenger kalle `print()` på samme måte."
    }
  ],
  "S1-M02-L03-E01": [
    {
      "path": [
        "feedback",
        "correct"
      ],
      "before": "Riktig.",
      "after": "De nye navnene gjør koden lettere å lese. Utregningen er fortsatt 4 * 20 = 80."
    }
  ],
  "S1-M02-L04-E01": [
    {
      "path": [
        "feedback",
        "correct"
      ],
      "before": "Riktig.",
      "after": "`\"kaffe\"` er en tekststreng (str), så `type()` viser typen str."
    }
  ],
  "S1-M02-P03-E02": [
    {
      "path": [
        "feedback",
        "correct"
      ],
      "before": "Riktig.",
      "after": "Tallet 45 er et heltall (int), mens `\"45\"` er tekst (str)."
    }
  ],
  "S1-M02-P03-E03": [
    {
      "path": [
        "feedback",
        "correct"
      ],
      "before": "Riktig.",
      "after": "Summen av to heltall blir int. Vanlig deling gir float, mens gulvdeling av to heltall gir int."
    }
  ],
  "S1-M02-P03-E04": [
    {
      "path": [
        "feedback",
        "correct"
      ],
      "before": "Riktig.",
      "after": "Begge verdier vises som 45, men 45 + 1 gir 46, mens tekstene settes sammen til 451."
    }
  ],
  "S1-M02-P03-E05": [
    {
      "path": [
        "feedback",
        "correct"
      ],
      "before": "Riktig.",
      "after": "`+` summerer tall eller setter sammen tekst. `*` gjentar tekst når den andre verdien er et heltall."
    }
  ],
  "S1-M02-P03-E08": [
    {
      "path": [
        "feedback",
        "correct"
      ],
      "before": "Riktig.",
      "after": "Du kan endre navn uten å endre utregningen, så lenge du oppdaterer alle steder der navnene brukes."
    }
  ],
  "S1-M02-P03-E09": [
    {
      "path": [
        "feedback",
        "correct"
      ],
      "before": "Riktig.",
      "after": "Tre ulike verdier har hver sin type: tekst, heltall og boolean. `print()` kan vise dem sammen."
    }
  ],
  "S1-M02-L05:12": [
    {
      "path": [
        "nb"
      ],
      "before": "Dette er den lumske feilen: programmet kjører uten feilmelding og gir feil svar. Å se at programmet ikke kræsjer, er ikke nok. Du må sammenligne med det du forventet. Mer om det i «Forventet oppførsel: skriv eksemplene først».",
      "after": "Programmet kjører uten feilmelding, men svaret er feil. Sammenlign utskriften med det du forventet. Mer om det i «Forventet oppførsel: skriv eksemplene først»."
    }
  ],
  "S1-M02-L05:13": [
    {
      "path": [
        "nb"
      ],
      "before": "Hva om brukeren skriver noe som ikke kan gjøres om til et tall, for eksempel «hei»? Da kræsjer `int()`. Du ser hvordan i «Når typene ikke stemmer: TypeError og ValueError». Å sjekke inndata og fange feil lærer du i modul 4 og modul 9.",
      "after": "Skriver brukeren noe som ikke kan gjøres om til et heltall, for eksempel «hei», får du en `ValueError`. Se «Når typene ikke stemmer: TypeError og ValueError». Senere lærer du å håndtere slike inndata."
    }
  ],
  "S1-M02-L05-E01": [
    {
      "path": [
        "feedback",
        "correct"
      ],
      "before": "Riktig.",
      "after": "`input()` gir teksten 4. `int()` konverterer den til heltallet 4 før programmet legger til 1."
    }
  ],
  "S1-M02-P04-E01": [
    {
      "path": [
        "feedback",
        "correct"
      ],
      "before": "Riktig.",
      "after": "Etter konvertering med `int()` er 5 et heltall. Da gir 5 + 2 svaret 7."
    }
  ],
  "S1-M02-L06:0": [
    {
      "path": [
        "nb"
      ],
      "before": "Feilmeldinger er informasjon, ikke straff. I denne leksjonen ser du to typiske feil når du leser inn tall, bruker rutinen fra forrige modul og retter dem. Målet er at du kan finne **hvilken linje** feilen kom på, **hva** den betyr, og **hvorfor**, uten å gjette.",
      "after": "To vanlige feil ved innlesing av tall er `TypeError` og `ValueError`. Bruk fremgangsmåten fra «Din første feilmelding» i M01: les meldingen, finn linjen, undersøk årsaken, rett feilen og kjør på nytt."
    }
  ],
  "S1-M02-L06:4": [
    {
      "path": [
        "nb"
      ],
      "before": "## Feil 2: riktig type, feil innhold (ValueError)\n\nNå har vi `int()`, men brukeren skriver prisen 12.5. `int()` kan ikke gjøre «12.5» om til et heltall. Typen er riktig (tekst), men **innholdet** passer ikke:",
      "after": "## Feil 2: verdien kan ikke konverteres (ValueError)\n\n`int()` kan ta imot tekst, men teksten må beskrive et heltall. Her skriver brukeren 12.5. Da passer `float()` bedre."
    }
  ],
  "S1-M02-L06:10": [
    {
      "path": [
        "nb"
      ],
      "before": "Hva om brukeren skriver «hei» der du ber om et tall? Da kræsjer `int()` også. Å sjekke inndata før du bruker dem lærer du i modul 4, og å fange feilene lærer du i modul 9. Nå skal du bare kunne **lese** feilen. Meldingene kan se litt annerledes ut i andre Python-versjoner; siste linje er den viktigste.",
      "after": "Skriver brukeren «hei» når programmet forventer et tall, gir `int()` også en `ValueError`. Nå øver du på å lese feilmeldingen. Detaljene kan se litt forskjellige ut i ulike Python-versjoner; begynn med den siste linjen."
    }
  ],
  "S1-M02-W01:0": [
    {
      "path": [
        "nb"
      ],
      "before": "Kaffekassa skal lese inn antall og pris og skrive ut totalen. Følg rutinen: les, finn linjen, gjett, endre én ting, kjør igjen. Legg merke til at jeg bare endrer én ting om gangen.",
      "after": "Kaffekassa skal lese inn antall og pris og skrive ut totalen. Følg feilsøkingen: les meldingen, finn linjen, undersøk årsaken, rett problemet og kjør igjen."
    }
  ],
  "S1-M02-W01:1": [
    {
      "path": [
        "steps",
        1,
        "say"
      ],
      "before": "**Endre én ting:** jeg gjør begge om til heltall med `int()`. **Kjør igjen** med 3 og 45. Nå virker det.",
      "after": "**Rett årsaken:** Jeg konverterer begge svarene til heltall med `int()`. Jeg kjører med 3 og 45. For disse verdiene blir totalen 135."
    }
  ],
  "S1-M02-W01:2": [
    {
      "path": [
        "nb"
      ],
      "before": "Rettelsen av den første feilen avslørte ikke bare at programmet virket, men også at jeg hadde testet for snevert. Å prøve flere verdier, også litt uvanlige, er en del av jobben. Det utvikler vi i «Forventet oppførsel: skriv eksemplene først».",
      "after": "Den første rettelsen virker med heltall. Prisen 12.5 avslører et nytt problem. Prøv flere forskjellige verdier, ikke bare den første. Se «Forventet oppførsel: skriv eksemplene først»."
    }
  ],
  "S1-M02-P05:0": [
    {
      "path": [
        "nb"
      ],
      "before": "Her er åtte ødelagte programmer. I noen får du en feilmelding. I ett av dem får du ingen feilmelding, men feil svar. Bruk rutinen: les, finn linjen, gjett, endre én ting, kjør igjen. Oppgavene der du skal rette koden, evalueres med flere sett inndata. Noen av dem ser du først etter at du har levert.",
      "after": "Her er åtte ødelagte programmer. Noen gir en feilmelding. Ett kjører, men gir feil svar. Les meldingen, finn linjen, undersøk årsaken og prøv en rettelse. Når du sjekker koden, prøver appen den med flere sett inndata."
    }
  ],
  "S1-M02-P05-E07": [
    {
      "path": [
        "feedback",
        "correct"
      ],
      "before": "Riktig.",
      "after": "`int()` kan ikke konvertere teksten tre til et heltall. Derfor får du ValueError på linjen med innlesingen."
    }
  ],
  "S1-M02-P05-E08": [
    {
      "path": [
        "feedback",
        "correct"
      ],
      "before": "Riktig.",
      "after": "`float()` kan lese desimalpunktum, men ikke desimalkomma direkte. Derfor stopper konverteringen med ValueError."
    }
  ],
  "S1-M02-L07:7": [
    {
      "path": [
        "nb"
      ],
      "before": "I modul 3 bruker du `==` til å la programmet velge hva det skal gjøre. Da er forskjellen på lagre og sammenligne helt avgjørende.",
      "after": "I neste modul, «Valg og betingelser», bruker du `==` til å la programmet velge hva det skal gjøre."
    }
  ],
  "S1-M02-L07-E01": [
    {
      "path": [
        "feedback",
        "correct"
      ],
      "before": "Riktig.",
      "after": "`==` sammenligner verdien til antall med 3. De er like, så resultatet er True."
    }
  ],
  "S1-M02-L08-E01": [
    {
      "path": [
        "feedback",
        "correct"
      ],
      "before": "Riktig.",
      "after": "F-strengen setter inn verdien 4 der `{kopper}` står."
    }
  ],
  "S1-M02-P06-E02": [
    {
      "path": [
        "feedback",
        "correct"
      ],
      "before": "Riktig.",
      "after": "3 er lik 3, men ikke 4. Teksten `\"3\"` er heller ikke lik heltallet 3."
    }
  ],
  "S1-M02-P06-E03": [
    {
      "path": [
        "feedback",
        "correct"
      ],
      "before": "Riktig.",
      "after": "Sammenligningen på linje 2 gir False, men endrer ikke x. Derfor skriver programmet ut 1."
    }
  ],
  "S1-M02-P06-E04": [
    {
      "path": [
        "feedback",
        "correct"
      ],
      "before": "Riktig.",
      "after": "`print(antall = 3)` blir tolket som et navngitt argument til print. Bruk `==` for å sammenligne."
    }
  ],
  "S1-M02-P06-E06": [
    {
      "path": [
        "feedback",
        "correct"
      ],
      "before": "Riktig.",
      "after": "F-strengen setter inn både variablene og resultatet av uttrykket a + b."
    }
  ],
  "S1-M02-P06-E07": [
    {
      "path": [
        "feedback",
        "correct"
      ],
      "before": "Riktig.",
      "after": "`:.2f` gir to desimaler i utskriften, også når verdien er et heltall. Den opprinnelige verdien endres ikke."
    }
  ],
  "S1-M02-L09:0": [
    {
      "path": [
        "nb"
      ],
      "before": "Hvordan vet du at kaffekassa er ferdig? Ikke fordi den «ser ut til å virke», men fordi du kan vise at den gir riktig svar for eksempler du valgte på forhånd. I denne leksjonen lærer du å skrive ned forventet oppførsel før du kjører, og bruke den til å oppdage feil.",
      "after": "Når kaffekassa er ferdig, skal du kunne bruke den med forskjellige verdier. Lag eksempler før du skriver koden, og sammenlign det programmet gjør med det du forventet."
    }
  ],
  "S1-M02-L09:1": [
    {
      "path": [
        "nb"
      ],
      "before": "## Testtabellen\n\nEn **testtabell** har tre kolonner: hva brukeren skriver inn (**inndata**), hva du **forventer** at programmet gir, og hva det **faktisk** ga. Du fyller ut de to første **før** du kjører, ved å regne ut svaret selv. Dette kalles å skrive ned **forventet oppførsel** (expected behaviour). Kjører du først og skriver ned det du ser, har du bare skrevet av programmet, og da ser du aldri en feil.",
      "after": "## Testtabellen\n\nEn **testtabell** viser inndata, forventet utskrift og faktisk utskrift. Regn ut hva du forventer før du kjører. Etter kjøringen fyller du inn hva programmet faktisk skrev ut. Dette kalles **forventet oppførsel** (expected behaviour) og hjelper deg å oppdage forskjeller."
    }
  ],
  "S1-M02-L09:6": [
    {
      "path": [
        "nb"
      ],
      "before": "Ikke skriv forventet etter at du har kjørt. Da velger du ubevisst det programmet gir. Regn ut svaret selv først, fra oppgaven.",
      "after": "Regn ut forventet svar fra oppgaven før du kjører programmet. Ellers kan du komme til å godta et feil resultat bare fordi programmet skrev det ut."
    }
  ],
  "S1-M02-P07:0": [
    {
      "path": [
        "nb"
      ],
      "before": "Først ser du på hva som gjør en testtabell god. Deretter får du tre små oppgaver der du skriver **tabellen først** og programmet etterpå. Evaluatoren regner ut riktig svar for hver rad du skriver, og sjekker at tabellen din har det den skal: minst fire rader og variasjon. Du får ikke se løsningen før du har levert.",
      "after": "Først ser du på hva som gjør en testtabell god. Deretter får du tre små oppgaver der du skriver **tabellen først** og programmet etterpå. Appen sjekker svarene i tabellen og om du har nok forskjellige testverdier."
    }
  ],
  "S1-M02-P08:0": [
    {
      "path": [
        "nb"
      ],
      "before": "Valgfri ekstra øving: forutsi hva programmene gjør. Skriv det som vises på skjermen, inkludert det brukeren skriver. Her er alle oppgavene uten hint. Det er en øvelse i å lese kode du ikke har skrevet selv.",
      "after": "Valgfri øving i å lese kode du ikke har skrevet selv. Skriv det som vises på skjermen, inkludert det brukeren skriver. Prøv uten hint."
    }
  ],
  "S1-M02-P08-E01": [
    {
      "path": [
        "feedback",
        "correct"
      ],
      "before": "Riktig.",
      "after": "Navnet blir beholdt som tekst, mens alderen konverteres til heltall. `print()` skiller argumentene med mellomrom."
    }
  ],
  "S1-M02-P08-E03": [
    {
      "path": [
        "feedback",
        "correct"
      ],
      "before": "Riktig.",
      "after": "Begge svar konverteres til heltall, så 3 + 4 gir 7 i stedet for teksten 34."
    }
  ],
  "S1-M02-P08-E04": [
    {
      "path": [
        "feedback",
        "correct"
      ],
      "before": "Riktig.",
      "after": "2.25 * 2 gir 4.5. Formatet `:.1f` viser én desimal."
    }
  ],
  "S1-M02-P08-E05": [
    {
      "path": [
        "feedback",
        "correct"
      ],
      "before": "Riktig.",
      "after": "`int()` gir heltallet 10. Det er lik tallet 10, men ikke teksten `\"10\"`."
    }
  ],
  "S1-M02-P08-E06": [
    {
      "path": [
        "feedback",
        "correct"
      ],
      "before": "Riktig.",
      "after": "x starter på 2, blir 4 etter multiplikasjonen og 8 etter addisjonen."
    }
  ],
  "S1-M02-P08-E07": [
    {
      "path": [
        "feedback",
        "correct"
      ],
      "before": "Riktig.",
      "after": "`int()` kan ikke lese teksten 3.5 som et heltall. Feilen oppstår før multiplikasjonen."
    }
  ],
  "S1-M02-P09:0": [
    {
      "path": [
        "nb"
      ],
      "before": "Valgfri ekstra øving i navn. Du bytter navn i små programmer og ser at de fortsatt gjør det samme. Nye navn skal aldri endre hva programmet gjør. Kjør derfor alltid programmet på nytt etterpå.",
      "after": "Valgfri øving i variabelnavn. Gi navn som forteller hva verdiene brukes til. Kjør programmet før og etter endringen, og sammenlign utskriftene."
    }
  ],
  "S1-M02-LAB:0": [
    {
      "path": [
        "nb"
      ],
      "before": "Kontoret trenger kaffekassa. Programmet skal spørre etter antall kopper (heltall) og pris per kopp (desimaltall, kan ha desimaler), og skrive ut totalen med to desimaler. Du jobber lokalt på din egen maskin, med editor og terminal fra forrige modul. Rekkefølgen er viktig: **tabellen først**, så koden.",
      "after": "Kontoret trenger kaffekassa. Brukeren skal skrive antall kopper og pris per kopp. Programmet skal skrive ut totalen med to desimaler. Bruk editoren og terminalen på maskinen din. Lag testtabellen først, og skriv deretter koden."
    }
  ],
  "S1-M02-LAB-E04": [
    {
      "path": [
        "feedback",
        "correct"
      ],
      "before": "Riktig.",
      "after": "Prisen leses med `float()`. Tekst med desimalkomma kan ikke konverteres direkte, og derfor oppstår ValueError."
    }
  ],
  "S1-M02-LAB2:0": [
    {
      "path": [
        "nb"
      ],
      "before": "Denne labben er lengre og gir mindre hjelp. Du får en spesifikasjon, og du bestemmer rekkefølgen selv innenfor en fast ramme: gjenfortell oppgaven, lag testtabell, bygg første trinn, bygg andre trinn, og lag en commit etter hvert trinn.",
      "after": "I denne labben får du mindre hjelp. Start med å forklare hva programmet skal gjøre. Lag testeksemplene, bygg programmet i to trinn og lag en commit etter hvert trinn."
    }
  ],
  "S1-M02-LAB2:8": [
    {
      "path": [
        "nb"
      ],
      "before": "## Trinn 2: Fordel vekslen\n\nNå legger du til fordelingen. Tenk: hvor mange 50-lapper går opp i vekslen, og hva er igjen? Bruk `//` og `%`, slik du gjorde med koppene på bordene. Fortsett så med 20, 10, 5 og 1.",
      "after": "## Trinn 2: Fordel vekslen\n\nFinn først hvor mange 50-lapper som går opp i vekslen, og hva som er igjen. Se eksemplet «kopper på bord» i «Regne med verdier» for bruk av `//` og `%`. Fortsett med 20, 10, 5 og 1."
    }
  ],
  "S1-M02-LAB2-E07": [
    {
      "path": [
        "feedback",
        "correct"
      ],
      "before": "Riktig.",
      "after": "`//` finner antall hele sedler eller mynter, og `%` finner beløpet som gjenstår."
    },
    {
      "path": [
        "options",
        0,
        "feedback"
      ],
      "before": "Riktig.",
      "after": "`//` finner antall hele sedler eller mynter, og `%` finner beløpet som gjenstår."
    }
  ],
  "S1-M02-Q01:0": [
    {
      "path": [
        "nb"
      ],
      "before": "Kaffekassa skal bli bedre: den skal også ta imot betalingen og vise hvor mye kunden får tilbake. Du velger selv arbeidsmåten, men du skal lage tabellen først, bygge programmet og lagre en commit. Underveis kommer en liten endringsforespørsel, slik virkelige oppdrag ofte gjør.",
      "after": "Kaffekassa skal nå ta imot betaling og vise hvor mye kunden får tilbake. Velg arbeidsmåten selv, men lag testtabellen før du bygger programmet. Underveis får du en ny bestilling fra kontoret."
    }
  ],
  "S1-M02-RET:0": [
    {
      "path": [
        "nb"
      ],
      "before": "Repetisjon uten oppslag: hent frem det du lærte i forrige modul. Prøv først å svare fra hukommelsen. Oppgavene er nye varianter.",
      "after": "Her repeterer du utskrift, feilmeldinger, terminal og Git fra M01. Prøv å svare uten å åpne leksjonene."
    }
  ],
  "S1-M02-RET-E04": [
    {
      "path": [
        "feedback",
        "correct"
      ],
      "before": "Riktig.",
      "after": "Kommentaren kjøres ikke. `print()` uten argumenter gir en tom linje. Uttrykket 3 + 4 regnes ut, mens teksten i anførselstegn skrives ut ordrett."
    }
  ],
  "S1-M02-RET-E05": [
    {
      "path": [
        "feedback",
        "correct"
      ],
      "before": "Riktig.",
      "after": "Den andre strengen mangler avsluttende anførselstegn. Python kan derfor ikke lese hele programmet."
    }
  ],
  "S1-M02-RET-E06": [
    {
      "path": [
        "feedback",
        "correct"
      ],
      "before": "Riktig.",
      "after": "`git add kaffe.py` legger den gjeldende versjonen av filen i staging area, klar til neste commit."
    }
  ],
  "S1-M02-RET-E07": [
    {
      "path": [
        "feedback",
        "correct"
      ],
      "before": "Riktig.",
      "after": "`cd ..` flytter terminalen til mappen ett nivå over den du står i."
    }
  ],
  "S1-M02-CHK:0": [
    {
      "path": [
        "nb"
      ],
      "before": "Modulsjekken har fire deler: **bygge og endre** (c), **lese og rette** (d), **hente frem fra tidligere** (r) og **resonnere** (x). Oppgavene er nye. Du kan bruke editor og terminal, men ikke leksjonene. Svarene rettes automatisk, og programmene dine kjøres også på inndata du ikke har sett. Fritekst brukes aldri til å godkjenne eller underkjenne.",
      "after": "Modulsjekken har fire deler: **bygge og endre**, **lese og rette**, **repetere** og **resonnere**. Oppgavene er nye. Du kan bruke editor og terminal, men ikke leksjonene. Appen sjekker svarene og prøver programmene dine med flere sett inndata."
    }
  ]
};

function readAt(value: unknown, path: readonly (string | number)[]): unknown {
  for (const key of path) {
    if (value === null || typeof value !== 'object') return undefined;
    value = (value as Record<string | number, unknown>)[key];
  }
  return value;
}

/** Exact source match: if a later export changes a field, use its own text. */
export function campaignM02Copy<T extends LessonBlock>(
  key: string,
  block: T,
): T {
  const revisions = campaignM02Revisions[key];
  if (!revisions?.some((r) => readAt(block, r.path) === r.before)) return block;

  const presentation = JSON.parse(JSON.stringify(block)) as T;
  for (const revision of revisions) {
    if (readAt(block, revision.path) !== revision.before) continue;
    const parent = readAt(presentation, revision.path.slice(0, -1)) as Record<
      string | number,
      unknown
    >;
    parent[revision.path.at(-1)!] = revision.after;
  }
  return presentation;
}
